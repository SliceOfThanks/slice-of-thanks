-- The plan switch and the 14 day Pro trial (docs/ONBOARDING_PLAN.md, approved 2026-10-25). Additive.
-- plan_grants lifts a member to a higher plan for a while, without touching BD, so nobody is billed.
-- The trial, Gerald's Birthday Special and the Treat Jar prize all use it.
-- Trial: a brand new A Slice member gets The Whole Pie for 14 days on their first sign in, no card.
-- They get 50 emails in total: A Slice's 10 a month plus 40 trial emails that end with the trial.
-- Meeting and date pizzas that send on their own check the plan when they fire, so after the trial they wait for the member.

create table if not exists public.plan_grants (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id),
  plan_key text not null check (plan_key in ('pro', 'team')),
  reason text not null check (reason in ('trial', 'birthday', 'treat_jar', 'admin')),
  starts_at timestamptz not null default now(),
  ends_at timestamptz not null,
  bonus_emails int not null default 0,
  bonus_closed boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists plan_grants_member on public.plan_grants(member_id, ends_at);
create unique index if not exists plan_grants_one_trial on public.plan_grants(member_id) where reason = 'trial';
alter table public.plan_grants enable row level security;
revoke all on public.plan_grants from anon, authenticated;

insert into app_settings(env, key, value) values
  ('live', 'trial', '{"enabled":true,"days":14,"plan":"pro","emails":50}'::jsonb),
  ('staging', 'trial', '{"enabled":true,"days":14,"plan":"pro","emails":50}'::jsonb)
on conflict (env, key) do nothing;

-- The plan a member has right now: Pizza Party seat, tester override, or the higher of their BD plan and any active grant
create or replace function public.sot_effective_plan(p_member uuid) returns text
language sql stable security definer set search_path = public as $$
  select case when m.team_id is not null then 'team'
    when t.test_plan_key is not null then t.test_plan_key
    when m.plan_key = 'team' or g.plan_key = 'team' then 'team'
    when m.plan_key = 'pro' or g.plan_key = 'pro' then 'pro'
    else m.plan_key end
  from members m
  left join testers t on t.bd_user_id = m.bd_user_id
  left join lateral (select x.plan_key from plan_grants x where x.member_id = m.id and x.starts_at <= now() and x.ends_at > now()
                     order by case x.plan_key when 'team' then 2 else 1 end desc limit 1) g on true
  where m.id = p_member
$$;

-- Trial state for the app: running (with days left), or ended in the last 30 days and not upgraded
create or replace function public.sot_trial_state(p_member uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select case when g.id is null then null else jsonb_build_object(
    'plan', g.plan_key, 'starts_at', g.starts_at, 'ends_at', g.ends_at,
    'active', g.ends_at > now(),
    'days_left', greatest(ceil(extract(epoch from (g.ends_at - now())) / 86400.0), 0)::int,
    'emails', g.bonus_emails) end
  from (select 1) one
  left join lateral (select * from plan_grants x where x.member_id = p_member and x.reason = 'trial'
                     and x.ends_at > now() - interval '30 days' limit 1) g on true
$$;

-- Start the trial once per account. Returns true when it started.
create or replace function public.sot_start_trial(p_member uuid) returns boolean
language plpgsql security definer set search_path = public as $$
declare v_cfg jsonb := sot_setting('live', 'trial'); v_days int; v_bonus int; v_end timestamptz; v_wallet uuid;
begin
  if not coalesce((v_cfg->>'enabled')::boolean, false) then return false; end if;
  if exists (select 1 from plan_grants where member_id = p_member and reason = 'trial') then return false; end if;
  v_days := coalesce((v_cfg->>'days')::int, 14);
  v_bonus := greatest(coalesce((v_cfg->>'emails')::int, 50) - coalesce((select monthly_emails from plans where key = 'free'), 10), 0);
  v_end := now() + make_interval(days => v_days);
  insert into plan_grants(member_id, plan_key, reason, ends_at, bonus_emails)
  values (p_member, coalesce(v_cfg->>'plan', 'pro'), 'trial', v_end, v_bonus)
  on conflict do nothing;
  if not found then return false; end if;
  v_wallet := wallet_for(p_member);
  if v_bonus > 0 then
    insert into credit_ledger(wallet_member_id, bucket, entry, delta, expires_at, reason)
    values (v_wallet, 'bonus', 'bonus', v_bonus, v_end, 'trial emails');
  end if;
  insert into events(type, member_id, props) values ('trial_started', p_member, jsonb_build_object('ends_at', v_end, 'emails', v_bonus));
  return true;
end $$;

-- When a grant ends, its unused bonus emails end with it
create or replace function public.sot_close_grants(p_member uuid) returns void
language plpgsql security definer set search_path = public as $$
declare r record; v_wallet uuid := wallet_for(p_member); v_left int;
begin
  for r in select * from plan_grants where member_id = p_member and ends_at <= now() and not bonus_closed for update loop
    v_left := least(bucket_balance(v_wallet, 'bonus'), r.bonus_emails);
    if v_left > 0 then
      insert into credit_ledger(wallet_member_id, bucket, entry, delta, reason)
      values (v_wallet, 'bonus', 'expire', -v_left, r.reason || ' ended');
    end if;
    update plan_grants set bonus_closed = true where id = r.id;
    if r.reason = 'trial' then insert into events(type, member_id, props) values ('trial_ended', p_member, jsonb_build_object('unused', v_left)); end if;
  end loop;
end $$;

-- Session: same as before, plus the trial. The monthly allowance comes from the plan the member pays for,
-- so a trial does not hand out The Whole Pie's 250 emails.
create or replace function public.sot_session(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_uid bigint := (p->>'bd_user_id')::bigint;
  v_plan text; v_env text := 'live'; v_is_tester boolean; v_m members; v_eff_plan text; v_wallet uuid; v_feat jsonb; v_legal jsonb;
  v_joined timestamptz; v_next timestamptz; v_new boolean; v_allow text;
begin
  if v_uid is null or v_uid <= 0 then raise exception 'bad user'; end if;
  v_plan := coalesce(sot_setting('live','bd_plan_map')->>(p->>'bd_sub_id'), 'free');
  v_new := not exists (select 1 from members where bd_user_id = v_uid);
  insert into members(bd_user_id, plan_key, display_name)
  values (v_uid, v_plan, nullif(p->>'name',''))
  on conflict (bd_user_id) do update set plan_key = excluded.plan_key,
    display_name = coalesce(members.display_name, excluded.display_name), status = case when members.status = 'closed' then 'active' else members.status end, updated_at = now()
  returning * into v_m;
  v_legal := sot_setting('live','legal_versions');
  if coalesce((p->>'legal_signup')::boolean, false)
     and not exists (select 1 from legal_acceptances where member_id = v_m.id) then
    begin v_joined := nullif(p->>'joined','')::timestamptz; exception when others then v_joined := null; end;
    perform sot_accept_terms(v_m.id, 'bd_signup_form', coalesce(v_joined, now()), null, null);
    select * into v_m from members where id = v_m.id;
  end if;
  v_is_tester := exists (select 1 from testers where bd_user_id = v_uid);
  if v_is_tester then v_env := 'staging'; end if;
  if v_new and v_plan = 'free' and not v_is_tester then perform sot_start_trial(v_m.id); end if;
  perform sot_close_grants(v_m.id);
  v_eff_plan := sot_effective_plan(v_m.id);
  v_wallet := wallet_for(v_m.id);
  v_allow := case when v_m.team_id is not null or v_is_tester then v_eff_plan else v_m.plan_key end;
  perform sot_ensure_monthly(v_wallet, v_allow);
  perform sot_expire_lots(v_wallet);
  select min(x.expires_at) into v_next from sot_lots(v_wallet, 'pack') x where x.remaining > 0;
  select coalesce(jsonb_object_agg(feature_key, enabled), '{}') into v_feat from plan_features where env = v_env and plan_key = v_eff_plan;
  return jsonb_build_object(
    'member_id', v_m.id, 'env', v_env, 'is_tester', v_is_tester, 'plan', v_eff_plan, 'paid_plan', v_m.plan_key, 'features', v_feat,
    'trial', case when v_m.plan_key = 'free' then sot_trial_state(v_m.id) end,
    'credits', jsonb_build_object('monthly', bucket_balance(v_wallet,'monthly'), 'bonus', bucket_balance(v_wallet,'bonus'),
      'pack', bucket_balance(v_wallet,'pack'), 'special_delivery', bucket_balance(v_wallet,'special_delivery')),
    'pack_next_expiry', v_next,
    'prefs', coalesce(v_m.prefs, '{}'::jsonb),
    'packs', sot_setting(v_env,'packs'),
    'checkout', coalesce(sot_setting(v_env,'checkout_urls'), '{}'::jsonb),
    'code', sot_setting(v_env,'code_version'),
    'profile', jsonb_build_object('display_name', v_m.display_name, 'business_name', v_m.business_name, 'send_as', v_m.send_as,
       'mailing_address', v_m.mailing_address, 'reply_to', v_m.reply_to, 'country', v_m.country, 'locale', v_m.locale,
       'logo_url', v_m.logo_url, 'brand_color_1', v_m.brand_color_1, 'brand_color_2', v_m.brand_color_2),
    'needs_terms', v_m.legal_versions is distinct from v_legal,
    'terms_updated', v_m.legal_versions is not null and v_m.legal_versions is distinct from v_legal,
    'legal_versions', v_legal);
end $$;

revoke execute on function public.sot_effective_plan(uuid), public.sot_trial_state(uuid), public.sot_start_trial(uuid), public.sot_close_grants(uuid), public.sot_session(jsonb) from anon, authenticated, public;
notify pgrst, 'reload schema';
