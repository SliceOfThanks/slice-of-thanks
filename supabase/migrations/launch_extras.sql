-- Free test sends to yourself, trial reminder emails, Gerald's Birthday Special (Stacey, 2026-10-26). Additive.
-- Also saves the trial and checklist settings (trial_welcome, trial_end_seen, setup), which the profile save did not keep before.
-- Plans: docs/ONBOARDING_PLAN.md and docs/MEMBER_BIRTHDAY_PLAN.md.

insert into app_settings(env, key, value) values
  ('live', 'self_test_limit', '5'::jsonb), ('staging', 'self_test_limit', '5'::jsonb)
on conflict (env, key) do nothing;

-- ---------- Settings the app saves on the account ----------
create or replace function public.sot_short_list(p jsonb) returns text[]
language sql immutable set search_path = public as $$
  select coalesce(array_agg(distinct v) filter (where v ~ '^[a-z0-9_]{1,20}$'), '{}')
  from (select x #>> '{}' v from jsonb_array_elements(case when jsonb_typeof(p) = 'array' then p else '[]'::jsonb end) x limit 30) s
$$;

do $mig$
declare d text := pg_get_functiondef('public.sot_update_profile(uuid,jsonb)'::regprocedure); a text := $a$  update members set
    display_name$a$;
begin
  if position('trial_welcome' in d) > 0 then return; end if;
  if position(a in d) = 0 then raise exception 'sot_update_profile changed'; end if;
  d := replace(d, a, $b$  if jsonb_typeof(p->'prefs') = 'object' then
    if jsonb_typeof(p->'prefs'->'trial_welcome') = 'boolean' then v_prefs := v_prefs || jsonb_build_object('trial_welcome', p->'prefs'->'trial_welcome'); end if;
    if jsonb_typeof(p->'prefs'->'trial_end_seen') = 'boolean' then v_prefs := v_prefs || jsonb_build_object('trial_end_seen', p->'prefs'->'trial_end_seen'); end if;
    if jsonb_typeof(p->'prefs'->'bday_ask_done') = 'boolean' then v_prefs := v_prefs || jsonb_build_object('bday_ask_done', p->'prefs'->'bday_ask_done'); end if;
    if jsonb_typeof(p->'prefs'->'birthday_pizza') = 'boolean' then v_prefs := v_prefs || jsonb_build_object('birthday_pizza', p->'prefs'->'birthday_pizza'); end if;
    if jsonb_typeof(p->'prefs'->'setup') = 'object' then
      v_prefs := v_prefs || jsonb_build_object('setup', jsonb_build_object(
        'done', to_jsonb(sot_short_list(p->'prefs'->'setup'->'done')),
        'skip', to_jsonb(sot_short_list(p->'prefs'->'setup'->'skip')),
        'dismissed', coalesce(p->'prefs'->'setup'->'dismissed' = 'true'::jsonb, false),
        'rewarded', coalesce(p->'prefs'->'setup'->'rewarded' = 'true'::jsonb, false)));
    end if;
  end if;
$b$ || a);
  execute d;
end $mig$;

-- ---------- Free test sends to yourself ----------
-- A member can send up to 5 test pizzas to their own reply email. They use no emails and are marked TEST SEND.
create or replace function public.sot_self_tests_used(p_member uuid) returns int
language sql stable security definer set search_path = public as $$
  select count(*)::int from sends s join contacts c on c.id = s.contact_id join members m on m.id = s.member_id
  where s.member_id = p_member and s.is_test and s.status not in ('failed', 'skipped')
    and lower(c.email) = lower(coalesce(m.reply_to, ''))
$$;

do $mig$
declare d text := pg_get_functiondef('public.sot_create_send(uuid,text,uuid,text,text,jsonb)'::regprocedure);
  a1 text := $a$  v_when timestamptz := coalesce((p->>'scheduled_for')::timestamptz, now());
begin$a$;
  a2 text := $a$  if v_test and not (sot_setting('live','test_inboxes') ? v_email) then
    return jsonb_build_object('ok', false, 'code', 'test_inbox_only'); end if;$a$;
  a3 text := $a$  returning id, country into v_contact, v_country;
$a$;
  a4 text := $a$  if v_box ? 'gift' then v_type := 'marketing'; end if;
$a$;
  a5 text := $a$    if coalesce((v_box->>'pro_style')::boolean, false) and not coalesce((v_feat->>'pro_styles')::boolean, false)$a$;
begin
  if position('v_self' in d) > 0 then return; end if;
  if position(a1 in d) = 0 or position(a2 in d) = 0 or position(a3 in d) = 0 or position(a4 in d) = 0 or position(a5 in d) = 0 then raise exception 'sot_create_send changed'; end if;
  d := replace(d, a1, $b$  v_when timestamptz := coalesce((p->>'scheduled_for')::timestamptz, now());
  v_self boolean := false;
begin$b$);
  d := replace(d, a2, $b$  if v_test and not (sot_setting('live','test_inboxes') ? v_email) then
    if lower(coalesce(v_m.reply_to, '')) <> v_email then
      return jsonb_build_object('ok', false, 'code', 'test_inbox_only'); end if;
    if sot_self_tests_used(p_member) >= coalesce((sot_setting('live','self_test_limit') #>> '{}')::int, 5) then
      return jsonb_build_object('ok', false, 'code', 'test_limit'); end if;
    v_self := true;
  end if;$b$);
  d := replace(d, a3, a3 || $b$  if v_self and not exists (select 1 from consent_records where contact_id = v_contact and channel = 'email') then
    insert into consent_records(contact_id, channel, basis, obtained_at, method, note, recorded_by)
    values (v_contact, 'email', 'permission', now(), 'Test send to myself', null, p_member);
  end if;
$b$);
  -- The Birthday Special box can be shared for 30 days after a member's birthday, on any plan
  d := replace(d, a4, a4 || $b$  if coalesce((v_box->>'birthday_special')::boolean, false)
     and not exists (select 1 from member_birthdays b where b.member_id = p_member and b.share_until > now()) then
    v_box := v_box - 'birthday_special'; end if;
$b$);
  d := replace(d, a5, a5 || $b$ and not coalesce((v_box->>'birthday_special')::boolean, false)$b$);
  execute d;
end $mig$;

-- People does not list the member's own email (where test pizzas go)
do $mig$
declare d text := pg_get_functiondef('public.sot_people(uuid)'::regprocedure);
  a text := $a$    from contacts c where c.member_id = p_member
$a$;
begin
  if position('test pizzas' in d) > 0 or position('reply_to' in d) > 0 then return; end if;
  if position(a in d) = 0 then raise exception 'sot_people changed'; end if;
  d := replace(d, a, $b$    from contacts c where c.member_id = p_member
      and lower(coalesce(c.email, '')) <> (select lower(coalesce(nullif(m.reply_to, ''), '-')) from members m where m.id = p_member)
$b$);
  execute d;
end $mig$;

-- ---------- Trial reminder emails ----------
alter table public.plan_grants add column if not exists notice_3d_at timestamptz, add column if not exists notice_end_at timestamptz;

-- Trial members due a reminder: 3 days left, or the last day. Between 9 AM and 7 PM their time, once each.
create or replace function public.sot_trial_notices_due(p_limit int) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v jsonb;
begin
  with due as (
    select g.id, case when g.ends_at - now() <= interval '24 hours' then 'end' else '3d' end kind
    from plan_grants g join members m on m.id = g.member_id
    where g.reason = 'trial' and g.ends_at > now() and m.status = 'active' and m.plan_key = 'free'
      and position('@' in coalesce(m.reply_to, '')) > 1
      and extract(hour from now() at time zone coalesce(m.prefs->>'tz', 'America/New_York')) between 9 and 18
      and ((g.ends_at - now() <= interval '24 hours' and g.notice_end_at is null)
        or (g.ends_at - now() <= interval '3 days' and g.ends_at - now() > interval '24 hours' and g.notice_3d_at is null))
    limit p_limit for update of g skip locked
  ), upd as (
    update plan_grants g set notice_3d_at = case when d.kind = '3d' then now() else g.notice_3d_at end,
      notice_end_at = case when d.kind = 'end' then now() else g.notice_end_at end
    from due d where g.id = d.id
    returning g.member_id, g.ends_at, d.kind
  )
  select coalesce(jsonb_agg(jsonb_build_object('kind', u.kind, 'member_id', u.member_id, 'ends_at', u.ends_at,
    'email', m.reply_to, 'name', m.display_name, 'tz', coalesce(m.prefs->>'tz', 'America/New_York'),
    'days', greatest(ceil(extract(epoch from (u.ends_at - now())) / 86400.0), 1)::int)), '[]'::jsonb)
  into v from upd u join members m on m.id = u.member_id;
  return v;
end $$;

-- ---------- Gerald's Birthday Special ----------
alter table public.members add column if not exists birthday_md text, add column if not exists birthday_set_at timestamptz;
do $mig$ begin
  alter table public.members add constraint members_birthday_md_check check (birthday_md ~ '^(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$');
exception when duplicate_object then null; end $mig$;

create table if not exists public.member_birthdays (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id),
  year int not null,
  send_id uuid,
  gift_kind text not null check (gift_kind in ('trial', 'emails')),
  claim_by timestamptz,
  claimed_at timestamptz,
  share_until timestamptz not null,
  created_at timestamptz not null default now(),
  unique (member_id, year)
);
alter table public.member_birthdays enable row level security;
revoke all on public.member_birthdays from anon, authenticated;

-- Gerald and Potato send the Birthday Special from this house account. It can never sign in (BD user IDs are positive).
insert into members(bd_user_id, plan_key, display_name, business_name, send_as, status, legal_versions, prefs)
values (-1, 'free', 'Gerald and Potato', 'Gerald and Potato', 'business', 'active', sot_setting('live', 'legal_versions'), '{"house": true}'::jsonb)
on conflict (bd_user_id) do nothing;

-- Month and day only. It can be changed within a day of setting it (typos), then once every 12 months.
create or replace function public.sot_set_member_birthday(p_member uuid, p_md text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_m members; v text := nullif(trim(coalesce(p_md, '')), '');
begin
  select * into v_m from members where id = p_member for update;
  if v_m.id is null then return jsonb_build_object('ok', false, 'code', 'not_found'); end if;
  if v is not null and v !~ '^(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$' then return jsonb_build_object('ok', false, 'code', 'bad_date'); end if;
  if v is not distinct from v_m.birthday_md then return jsonb_build_object('ok', true, 'birthday', v); end if;
  if v is null then update members set birthday_md = null, updated_at = now() where id = p_member; return jsonb_build_object('ok', true, 'birthday', null); end if;
  if v_m.birthday_set_at is not null and v_m.birthday_set_at < now() - interval '1 day' and v_m.birthday_set_at > now() - interval '365 days' then
    return jsonb_build_object('ok', false, 'code', 'birthday_locked', 'until', v_m.birthday_set_at + interval '365 days');
  end if;
  update members set birthday_md = v, birthday_set_at = case when birthday_set_at is null or birthday_set_at < now() - interval '1 day' then now() else birthday_set_at end, updated_at = now()
  where id = p_member;
  return jsonb_build_object('ok', true, 'birthday', v);
end $$;

-- What the app shows: the birthday, if it can be changed, and this year's Birthday Special (gift, unlock, sharing)
create or replace function public.sot_birthday_state(p_member uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'md', m.birthday_md,
    'on', coalesce(m.prefs->'birthday_pizza' <> 'false'::jsonb, true),
    'locked_until', case when m.birthday_set_at < now() - interval '1 day' and m.birthday_set_at > now() - interval '365 days' then m.birthday_set_at + interval '365 days' end,
    'special', (select jsonb_build_object('year', b.year, 'gift', b.gift_kind, 'claim_by', b.claim_by, 'claimed', b.claimed_at is not null, 'share_until', b.share_until)
                from member_birthdays b where b.member_id = m.id and b.share_until > now() order by b.year desc limit 1),
    'toppers', coalesce((select jsonb_agg('bday' || b.year order by b.year) from member_birthdays b where b.member_id = m.id and b.gift_kind = 'emails'), '[]'::jsonb))
  from members m where m.id = p_member
$$;

-- Claims today's birthdays at 8 AM in each member's time zone. One per account every 12 months; accounts at least 14 days old.
-- The gift is decided here: A Slice gets 14 days of The Whole Pie to unlock within 30 days;
-- The Whole Pie and Pizza Party get 100 bonus emails for 30 days and this year's birthday topper.
create or replace function public.sot_member_birthdays_due(p_limit int) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v jsonb; r record; v_wallet uuid;
begin
  create temp table if not exists _bday(id uuid, member_id uuid, year int, gift text) on commit drop;
  truncate _bday;
  for r in
    select m.id, m.plan_key, m.team_id, extract(year from now() at time zone coalesce(m.prefs->>'tz', 'America/New_York'))::int yr
    from members m
    where m.status = 'active' and m.bd_user_id > 0 and m.birthday_md is not null
      and coalesce(m.prefs->'birthday_pizza' <> 'false'::jsonb, true)
      and m.created_at <= now() - interval '14 days'
      and position('@' in coalesce(m.reply_to, '')) > 1
      and extract(hour from now() at time zone coalesce(m.prefs->>'tz', 'America/New_York')) >= 8
      and sot_date_this_year('2000-' || m.birthday_md, extract(year from now() at time zone coalesce(m.prefs->>'tz', 'America/New_York'))::int)
          = (now() at time zone coalesce(m.prefs->>'tz', 'America/New_York'))::date
      and not exists (select 1 from member_birthdays b where b.member_id = m.id and b.created_at > now() - interval '300 days')
    limit p_limit
  loop
    if r.plan_key = 'free' and r.team_id is null then
      insert into member_birthdays(member_id, year, gift_kind, claim_by, share_until)
      values (r.id, r.yr, 'trial', now() + interval '30 days', now() + interval '30 days') on conflict do nothing;
    else
      insert into member_birthdays(member_id, year, gift_kind, claimed_at, share_until)
      values (r.id, r.yr, 'emails', now(), now() + interval '30 days') on conflict do nothing;
      if found then
        v_wallet := wallet_for(r.id);
        insert into plan_grants(member_id, plan_key, reason, ends_at, bonus_emails)
        values (r.id, case when r.plan_key = 'team' or r.team_id is not null then 'team' else 'pro' end, 'birthday', now() + interval '30 days', 100);
        insert into credit_ledger(wallet_member_id, bucket, entry, delta, expires_at, reason)
        values (v_wallet, 'bonus', 'bonus', 100, now() + interval '30 days', 'birthday gift');
      end if;
    end if;
    if found then insert into _bday select b.id, b.member_id, b.year, b.gift_kind from member_birthdays b where b.member_id = r.id and b.year = r.yr; end if;
  end loop;
  select coalesce(jsonb_agg(jsonb_build_object('id', x.id, 'member_id', x.member_id, 'year', x.year, 'gift', x.gift,
    'name', m.display_name, 'email', m.reply_to, 'locale', m.locale)), '[]'::jsonb)
  into v from _bday x join members m on m.id = x.member_id;
  return v;
end $$;

-- The Birthday Special send, from the house account to the member. Uses none of the member's emails.
create or replace function public.sot_create_birthday_send(p_birthday uuid, p_send_id uuid, p_token_hash text, p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare b member_birthdays; v_m members; v_house uuid; v_contact uuid; v_pizza uuid; v_email text;
begin
  select * into b from member_birthdays where id = p_birthday for update;
  if b.id is null then return jsonb_build_object('ok', false, 'code', 'not_found'); end if;
  if b.send_id is not null then return jsonb_build_object('ok', true, 'send_id', b.send_id, 'duplicate', true); end if;
  select * into v_m from members where id = b.member_id;
  v_email := lower(trim(coalesce(v_m.reply_to, '')));
  if position('@' in v_email) < 2 then return jsonb_build_object('ok', false, 'code', 'bad_email'); end if;
  if exists (select 1 from suppressions where lower(email) = v_email and channel = 'email' and scope = 'global') then
    return jsonb_build_object('ok', false, 'code', 'suppressed'); end if;
  select id into v_house from members where bd_user_id = -1;
  insert into contacts(member_id, name, email, source)
  values (v_house, left(coalesce(v_m.display_name, ''), 120), v_email, 'member_birthday')
  on conflict (member_id, lower(email)) where email is not null do update set name = coalesce(excluded.name, contacts.name), updated_at = now()
  returning id into v_contact;
  if not exists (select 1 from consent_records where contact_id = v_contact and channel = 'email') then
    insert into consent_records(contact_id, channel, basis, obtained_at, method, note, recorded_by)
    values (v_contact, 'email', 'relationship', now(), 'Slice of Thanks member', 'Birthday Special for our own member', v_house);
  end if;
  insert into pizzas(member_id, snapshot) values (v_house, jsonb_build_object(
    'pizza', p->'pizza', 'box', p->'box', 'label', 'Gerald''s Birthday Special',
    'sender', jsonb_build_object('name', '', 'business', 'Gerald and Potato', 'send_as', 'business', 'personal', false,
      'platform_address', sot_setting('live','platform_address') #>> '{}', 'show_made_with', false)))
  returning id into v_pizza;
  insert into sends(id, member_id, contact_id, pizza_id, send_type, status, recipient_token_hash, recipient_locale, scheduled_for, gift, special_delivery, is_test, idempotency_key)
  values (p_send_id, v_house, v_contact, v_pizza, 'one_to_one', 'queued', p_token_hash, coalesce(v_m.locale, 'en'), now(), p->'box'->'gift', false, false, 'birthday:' || b.id);
  update member_birthdays set send_id = p_send_id where id = b.id;
  insert into events(type, member_id, send_id, props) values ('birthday_special', b.member_id, p_send_id, jsonb_build_object('gift', b.gift_kind, 'year', b.year));
  return jsonb_build_object('ok', true, 'send_id', p_send_id);
end $$;

-- A Slice members tap "Unlock my 14 days" on their Birthday Special. The 14 days start now, after any trial they are on.
create or replace function public.sot_birthday_claim(p_member uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare b member_birthdays; v_start timestamptz; v_end timestamptz;
begin
  select * into b from member_birthdays where member_id = p_member and gift_kind = 'trial' and claim_by > now() order by year desc limit 1 for update;
  if b.id is null then return jsonb_build_object('ok', false, 'code', 'no_gift'); end if;
  if b.claimed_at is not null then return jsonb_build_object('ok', true, 'already', true); end if;
  select greatest(now(), coalesce(max(ends_at), now())) into v_start from plan_grants where member_id = p_member and ends_at > now();
  v_end := v_start + interval '14 days';
  insert into plan_grants(member_id, plan_key, reason, starts_at, ends_at, bonus_emails) values (p_member, 'pro', 'birthday', v_start, v_end, 40);
  insert into credit_ledger(wallet_member_id, bucket, entry, delta, expires_at, reason) values (wallet_for(p_member), 'bonus', 'bonus', 40, v_end, 'birthday gift');
  update member_birthdays set claimed_at = now() where id = b.id;
  insert into events(type, member_id, props) values ('birthday_claimed', p_member, jsonb_build_object('ends_at', v_end));
  return jsonb_build_object('ok', true, 'starts_at', v_start, 'ends_at', v_end);
end $$;

-- Session: adds the free tests left and the birthday
do $mig$
declare d text := pg_get_functiondef('public.sot_session(jsonb)'::regprocedure);
  a text := $a$'paid_plan', v_m.plan_key,$a$;
begin
  if position('self_tests_left' in d) > 0 then return; end if;
  if position(a in d) = 0 then raise exception 'sot_session changed'; end if;
  d := replace(d, a, a || $b$ 'self_tests_left', greatest(coalesce((sot_setting('live','self_test_limit') #>> '{}')::int, 5) - sot_self_tests_used(v_m.id), 0), 'birthday', sot_birthday_state(v_m.id),$b$);
  execute d;
end $mig$;

revoke execute on function public.sot_short_list(jsonb), public.sot_self_tests_used(uuid), public.sot_trial_notices_due(int),
  public.sot_set_member_birthday(uuid, text), public.sot_birthday_state(uuid), public.sot_member_birthdays_due(int),
  public.sot_create_birthday_send(uuid, uuid, text, jsonb), public.sot_birthday_claim(uuid),
  public.sot_update_profile(uuid, jsonb), public.sot_create_send(uuid, text, uuid, text, text, jsonb), public.sot_people(uuid), public.sot_session(jsonb)
  from anon, authenticated, public;
notify pgrst, 'reload schema';
