-- Referrals and Partnero (2026-10-26).
-- Every member gets an invite code. A friend who signs up through it (or by sending a pizza back) is recorded here.
-- The friend gets bonus emails when they join; the member who invited them gets bonus emails when the friend sends a first real pizza.
-- Partnero gets every member as a customer and every paid BD invoice of a referred member as a sale, through an outbox the worker sends.
-- Tables hold ids and codes only (no names or emails), and have RLS with no policies, like every other table.

alter table public.members add column if not exists ref_code text;
create unique index if not exists members_ref_code on public.members (lower(ref_code)) where ref_code is not null;

create table if not exists public.referrals (
  member_id uuid primary key,             -- the new member
  referred_by uuid,                       -- the member who invited them (null for a partner-only referral)
  partner_key text,                       -- a Partnero partner (affiliate) key from the partnero_partner cookie
  source text not null,                   -- link | sendback | partner
  created_at timestamptz not null default now(),
  friend_rewarded_at timestamptz,
  referrer_rewarded_at timestamptz,
  billing_checked_at timestamptz
);
alter table public.referrals enable row level security;
create index if not exists referrals_by on public.referrals (referred_by);

create table if not exists public.partnero_outbox (
  id bigserial primary key,
  member_id uuid not null,
  kind text not null check (kind in ('customer', 'sale')),
  ref text not null unique,               -- cust:<member> or sale:<bd invoice id>
  payload jsonb not null default '{}',
  status text not null default 'pending', -- pending | sent | failed
  attempts int not null default 0,
  last_error text,
  next_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  sent_at timestamptz
);
alter table public.partnero_outbox enable row level security;
create index if not exists partnero_outbox_due on public.partnero_outbox (next_at) where status = 'pending';

insert into public.app_settings(env, key, value)
select e, 'referrals', '{"enabled": true, "referrer_emails": 20, "friend_emails": 20, "max_rewards_per_year": 25, "join_window_days": 3}'::jsonb
from (values ('live'), ('staging')) v(e)
on conflict do nothing;

-- The member's invite code, made the first time it is needed
create or replace function public.sot_ref_code(p_member uuid) returns text
language plpgsql security definer set search_path = public as $$
declare v text; i int := 0;
begin
  select ref_code into v from members where id = p_member;
  if v is not null then return v; end if;
  loop
    i := i + 1;
    v := upper(substr(md5(random()::text || clock_timestamp()::text || p_member::text), 1, 7));
    begin
      update members set ref_code = v where id = p_member and ref_code is null;
      return (select ref_code from members where id = p_member);
    exception when unique_violation then
      if i > 5 then raise; end if;
    end;
  end loop;
end $$;

create or replace function public.sot_partnero_customer(p_member uuid) returns void
language sql security definer set search_path = public as $$
  insert into partnero_outbox(member_id, kind, ref) values (p_member, 'customer', 'cust:' || p_member) on conflict (ref) do nothing;
$$;

-- Records who invited a new member. Only for members who joined in the last few days, once, and never themselves.
-- p_code: an invite code from a link. p_referrer: a member found another way (Send one back). p_partner: a Partnero partner key.
create or replace function public.sot_referral_capture(p_member uuid, p_code text, p_referrer uuid, p_partner text, p_source text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_cfg jsonb := sot_setting('live', 'referrals'); v_m members; v_by uuid := p_referrer; v_n int; v_trial plan_grants; v_partner text;
begin
  if not coalesce((v_cfg->>'enabled')::boolean, false) then return jsonb_build_object('ok', false, 'code', 'off'); end if;
  select * into v_m from members where id = p_member;
  if v_m.id is null then return jsonb_build_object('ok', false, 'code', 'not_found'); end if;
  if exists (select 1 from referrals where member_id = p_member) then return jsonb_build_object('ok', false, 'code', 'already'); end if;
  if v_m.created_at < now() - make_interval(days => coalesce((v_cfg->>'join_window_days')::int, 3)) then
    return jsonb_build_object('ok', false, 'code', 'too_late'); end if;
  if v_by is null and nullif(trim(coalesce(p_code, '')), '') is not null then
    select id into v_by from members where lower(ref_code) = lower(trim(p_code));
  end if;
  if v_by = p_member then v_by := null; end if;
  if v_by is not null and not exists (select 1 from members where id = v_by and bd_user_id > 0) then v_by := null; end if;
  v_partner := nullif(left(regexp_replace(coalesce(p_partner, ''), '[^A-Za-z0-9_.-]', '', 'g'), 80), '');
  if v_by is null and v_partner is null then return jsonb_build_object('ok', false, 'code', 'no_referrer'); end if;
  insert into referrals(member_id, referred_by, partner_key, source)
  values (p_member, v_by, v_partner, case when v_by is null then 'partner' else coalesce(nullif(p_source, ''), 'link') end)
  on conflict do nothing;
  if not found then return jsonb_build_object('ok', false, 'code', 'already'); end if;
  -- The friend's welcome: extra trial emails when on the trial (they end with it), otherwise bonus emails that stay
  v_n := coalesce((v_cfg->>'friend_emails')::int, 0);
  if v_by is not null and v_n > 0 then
    select * into v_trial from plan_grants where member_id = p_member and reason = 'trial' and ends_at > now() and not bonus_closed order by ends_at desc limit 1;
    if v_trial.id is not null then
      update plan_grants set bonus_emails = bonus_emails + v_n where id = v_trial.id;
      insert into credit_ledger(wallet_member_id, bucket, entry, delta, expires_at, reason) values (wallet_for(p_member), 'bonus', 'bonus', v_n, v_trial.ends_at, 'referral welcome');
    else
      insert into credit_ledger(wallet_member_id, bucket, entry, delta, reason) values (wallet_for(p_member), 'bonus', 'bonus', v_n, 'referral welcome');
    end if;
    update referrals set friend_rewarded_at = now() where member_id = p_member;
  end if;
  perform sot_partnero_customer(p_member);
  if v_by is not null then perform sot_partnero_customer(v_by); end if;
  insert into events(type, member_id, props) values ('referral_joined', p_member, jsonb_build_object('by', v_by, 'partner', v_partner, 'source', p_source, 'emails', case when v_by is null then 0 else v_n end));
  return jsonb_build_object('ok', true, 'emails', case when v_by is null then 0 else v_n end, 'referred', v_by is not null);
end $$;

-- What the Invite friends card shows
create or replace function public.sot_referral_state(p_member uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_cfg jsonb := sot_setting('live', 'referrals');
begin
  if not coalesce((v_cfg->>'enabled')::boolean, false) then return jsonb_build_object('enabled', false); end if;
  perform sot_partnero_customer(p_member);
  return jsonb_build_object('enabled', true, 'code', sot_ref_code(p_member),
    'referrer_emails', coalesce((v_cfg->>'referrer_emails')::int, 0), 'friend_emails', coalesce((v_cfg->>'friend_emails')::int, 0),
    'joined', (select count(*) from referrals where referred_by = p_member),
    'rewarded', (select count(*) from referrals where referred_by = p_member and referrer_rewarded_at is not null),
    'emails_earned', coalesce((select sum(delta) from credit_ledger where wallet_member_id = wallet_for(p_member) and reason = 'referral reward' and delta > 0), 0));
end $$;

-- The inviter's reward: when the friend has sent a first real pizza. Capped per year.
create or replace function public.sot_referral_rewards_due(p_limit int) returns int
language plpgsql security definer set search_path = public as $$
declare v_cfg jsonb := sot_setting('live', 'referrals'); r record; v_n int; v_cap int; c int := 0;
begin
  if not coalesce((v_cfg->>'enabled')::boolean, false) then return 0; end if;
  v_n := coalesce((v_cfg->>'referrer_emails')::int, 0);
  v_cap := coalesce((v_cfg->>'max_rewards_per_year')::int, 25);
  for r in
    select f.member_id, f.referred_by from referrals f
    where f.referred_by is not null and f.referrer_rewarded_at is null
      and exists (select 1 from sends s where s.member_id = f.member_id and not s.is_test and s.status in ('sent', 'delivered', 'opened', 'completed'))
    order by f.created_at limit p_limit for update of f skip locked
  loop
    if v_n > 0 and (select count(*) from referrals x where x.referred_by = r.referred_by and x.referrer_rewarded_at > now() - interval '365 days') < v_cap then
      insert into credit_ledger(wallet_member_id, bucket, entry, delta, reason) values (wallet_for(r.referred_by), 'bonus', 'bonus', v_n, 'referral reward');
      insert into events(type, member_id, props) values ('referral_rewarded', r.referred_by, jsonb_build_object('friend', r.member_id, 'emails', v_n));
    end if;
    update referrals set referrer_rewarded_at = now() where member_id = r.member_id;
    c := c + 1;
  end loop;
  return c;
end $$;

-- A paid BD invoice of a referred member goes to Partnero as a sale (once per invoice)
create or replace function public.sot_partnero_sale(p_member uuid, p_invoice text, p_amount_cents int, p_paid_at timestamptz) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if p_amount_cents is null or p_amount_cents <= 0 or nullif(p_invoice, '') is null then return false; end if;
  if not exists (select 1 from referrals where member_id = p_member) then return false; end if;
  perform sot_partnero_customer(p_member);
  insert into partnero_outbox(member_id, kind, ref, payload)
  values (p_member, 'sale', 'sale:' || left(p_invoice, 80), jsonb_build_object('invoice', left(p_invoice, 80), 'amount_cents', p_amount_cents, 'paid_at', p_paid_at))
  on conflict (ref) do nothing;
  return found;
end $$;

-- Referred members whose BD invoices are due a daily check (so renewals reach Partnero even when they do not open the app)
create or replace function public.sot_referral_billing_due(p_limit int) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v jsonb;
begin
  with due as (
    select f.member_id from referrals f
    where f.billing_checked_at is null or f.billing_checked_at < now() - interval '1 day'
    order by f.billing_checked_at nulls first limit p_limit for update skip locked
  ), upd as (
    update referrals f set billing_checked_at = now() from due where f.member_id = due.member_id returning f.member_id
  )
  select coalesce(jsonb_agg(jsonb_build_object('member_id', m.id, 'bd_user_id', m.bd_user_id)), '[]'::jsonb) into v
  from upd join members m on m.id = upd.member_id where m.bd_user_id > 0;
  return v;
end $$;

-- The worker's list: customers first, then sales whose customer is already in Partnero
create or replace function public.sot_partnero_due(p_limit int) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v jsonb;
begin
  select coalesce(jsonb_agg(x order by x->>'kind', (x->>'id')::bigint), '[]'::jsonb) into v from (
    select jsonb_build_object('id', o.id, 'kind', o.kind, 'member_id', o.member_id, 'payload', o.payload,
      'email', lower(trim(coalesce(m.reply_to, ''))), 'name', coalesce(m.display_name, ''),
      'referred_by', f.referred_by, 'partner_key', f.partner_key) x
    from partnero_outbox o
    join members m on m.id = o.member_id
    left join referrals f on f.member_id = o.member_id
    where o.status = 'pending' and o.next_at <= now()
      and (o.kind = 'customer' or exists (select 1 from partnero_outbox c where c.ref = 'cust:' || o.member_id and c.status = 'sent'))
    order by o.kind, o.id limit p_limit
  ) t;
  return v;
end $$;

create or replace function public.sot_partnero_done(p_id bigint, p_ok boolean, p_error text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_ok then
    update partnero_outbox set status = 'sent', sent_at = now(), last_error = null where id = p_id;
  else
    update partnero_outbox set attempts = attempts + 1, last_error = left(p_error, 300),
      status = case when attempts + 1 >= 8 then 'failed' else 'pending' end,
      next_at = now() + make_interval(mins => least(power(2, attempts + 1)::int, 720))
    where id = p_id;
  end if;
end $$;

-- The invite code of the member who sent a pizza, for the recipient page (the receipt QR code and the Make your own link)
create or replace function public.sot_recipient_ref(p_hash text) returns text
language plpgsql security definer set search_path = public as $$
declare v_member uuid;
begin
  if not coalesce((sot_setting('live', 'referrals')->>'enabled')::boolean, false) then return null; end if;
  select member_id into v_member from sends where recipient_token_hash = p_hash;
  if v_member is null or exists (select 1 from members where id = v_member and bd_user_id <= 0) then return null; end if;
  return sot_ref_code(v_member);
end $$;

do $$
declare v_code text; v_state jsonb; v_m uuid;
begin
  if (select count(*) from app_settings where key = 'referrals') < 2 then raise exception 'referrals setting missing'; end if;
  select id into v_m from members where bd_user_id = 20;
  if v_m is not null then
    v_state := sot_referral_state(v_m);
    if coalesce(v_state->>'code', '') = '' then raise exception 'no code: %', v_state; end if;
    if sot_ref_code(v_m) <> v_state->>'code' then raise exception 'code not stable'; end if;
    if (sot_referral_capture(v_m, v_state->>'code', null, null, 'link')->>'ok')::boolean then raise exception 'self or old member was captured'; end if;
  end if;
  if (select jsonb_typeof(sot_partnero_due(5))) <> 'array' then raise exception 'due list broken'; end if;
end $$;

-- Send one back: a new member who joined to send a pizza back was brought in by its sender (found from the pizza link)
create or replace function public.sot_referral_sendback(p_member uuid, p_hash text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_sender uuid;
begin
  select s.member_id into v_sender from sends s join members m on m.id = s.member_id
   where s.recipient_token_hash = p_hash and m.bd_user_id > 0 and not s.is_test;
  if v_sender is null then return jsonb_build_object('ok', false, 'code', 'no_sender'); end if;
  return sot_referral_capture(p_member, null, v_sender, null, 'sendback');
end $$;
