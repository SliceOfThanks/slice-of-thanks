-- AppSumo code redemption (Stacey, 2026-10-26). Codes stack up to 3 per account on the hidden Lifetime (AppSumo) plan:
-- 1 code = 100 emails a month, 2 codes = 300, 3 codes = 750, for life, with every Whole Pie feature.
-- A code is checked against the SHA-256 hashes in appsumo_codes and marked redeemed by the member.
insert into public.app_settings(env, key, value)
select e, 'appsumo', '{"enabled": true, "max_codes": 3, "plan": "pro", "tiers": {"1": 100, "2": 300, "3": 750}}'::jsonb
from (values ('live'), ('staging')) v(e)
on conflict do nothing;

-- Codes on the account and the monthly emails they give
create or replace function public.sot_appsumo_state(p_member uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  with c as (select count(*)::int n from appsumo_codes where redeemed_by = p_member and deactivated_at is null),
       s as (select sot_setting('live', 'appsumo') v)
  select jsonb_build_object(
    'codes', c.n,
    'max', coalesce((s.v->>'max_codes')::int, 3),
    'emails', coalesce((s.v->'tiers'->>least(c.n, coalesce((s.v->>'max_codes')::int, 3))::text)::int, 0),
    'tiers', coalesce(s.v->'tiers', '{}'::jsonb),
    'enabled', coalesce((s.v->>'enabled')::boolean, false))
  from c, s;
$$;

create or replace function public.sot_appsumo_emails(p_member uuid) returns int
language sql stable security definer set search_path = public as $$
  select coalesce((sot_appsumo_state(p_member)->>'emails')::int, 0);
$$;

-- Redeem one code. Friendly codes back: off, too_many, max_codes, unknown, used, already_yours.
create or replace function public.sot_appsumo_redeem(p_member uuid, p_hash text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_cfg jsonb := sot_setting('live', 'appsumo'); v_max int; v_n int; v_c appsumo_codes; v_fails int; v_plan text;
begin
  if not coalesce((v_cfg->>'enabled')::boolean, false) then return jsonb_build_object('ok', false, 'code', 'off'); end if;
  if not exists (select 1 from members where id = p_member) then return jsonb_build_object('ok', false, 'code', 'not_found'); end if;
  perform pg_advisory_xact_lock(hashtext('appsumo' || p_member::text));
  -- Guessing is not practical (codes are random), but wrong tries are still capped at 10 an hour
  select count(*) into v_fails from events where member_id = p_member and type = 'appsumo_failed' and created_at > now() - interval '1 hour';
  if v_fails >= 10 then return jsonb_build_object('ok', false, 'code', 'too_many'); end if;
  v_max := coalesce((v_cfg->>'max_codes')::int, 3);
  select count(*) into v_n from appsumo_codes where redeemed_by = p_member and deactivated_at is null;
  select * into v_c from appsumo_codes where code_hash = lower(trim(coalesce(p_hash, ''))) for update;
  if v_c.code_hash is not null and v_c.redeemed_by = p_member then
    return jsonb_build_object('ok', false, 'code', 'already_yours', 'state', sot_appsumo_state(p_member));
  end if;
  if v_n >= v_max then return jsonb_build_object('ok', false, 'code', 'max_codes', 'state', sot_appsumo_state(p_member)); end if;
  if v_c.code_hash is null or v_c.deactivated_at is not null then
    insert into events(type, member_id, props) values ('appsumo_failed', p_member, jsonb_build_object('why', 'unknown'));
    return jsonb_build_object('ok', false, 'code', 'unknown');
  end if;
  if v_c.redeemed_by is not null then
    insert into events(type, member_id, props) values ('appsumo_failed', p_member, jsonb_build_object('why', 'used'));
    return jsonb_build_object('ok', false, 'code', 'used');
  end if;
  update appsumo_codes set redeemed_by = p_member, redeemed_at = now() where code_hash = v_c.code_hash;
  v_n := v_n + 1;
  -- Lifetime: every Whole Pie feature, for good
  if not exists (select 1 from plan_grants where member_id = p_member and reason = 'appsumo') then
    insert into plan_grants(member_id, plan_key, reason, starts_at, ends_at, bonus_emails)
    values (p_member, coalesce(v_cfg->>'plan', 'pro'), 'appsumo', now(), '9999-12-31'::timestamptz, 0);
  end if;
  -- The 14 day trial is replaced: no trial card or trial emails. Its bonus emails stay until their own end date.
  update plan_grants set reason = 'trial_appsumo', ends_at = least(ends_at, now()), bonus_closed = true
  where member_id = p_member and reason = 'trial';
  -- This month's emails move up to the new tier right away
  select plan_key into v_plan from members where id = p_member;
  perform sot_ensure_monthly(wallet_for(p_member), v_plan);
  insert into events(type, member_id, props) values ('appsumo_redeemed', p_member, jsonb_build_object('codes', v_n));
  return jsonb_build_object('ok', true, 'codes', v_n, 'state', sot_appsumo_state(p_member));
end $$;

revoke all on function public.sot_appsumo_state(uuid) from public, anon, authenticated;
revoke all on function public.sot_appsumo_emails(uuid) from public, anon, authenticated;
revoke all on function public.sot_appsumo_redeem(uuid, text) from public, anon, authenticated;
grant execute on function public.sot_appsumo_state(uuid) to service_role;
grant execute on function public.sot_appsumo_emails(uuid) to service_role;
grant execute on function public.sot_appsumo_redeem(uuid, text) to service_role;

-- Monthly emails: AppSumo members get their tier's amount, or their paid plan's if that is higher
do $$
declare d text;
begin
  select pg_get_functiondef('public.sot_ensure_monthly(uuid, text)'::regprocedure) into d;
  if position('v_amt := coalesce(v_amt, 0);' in d) = 0 then raise exception 'ensure_monthly anchor not found'; end if;
  execute replace(d, 'v_amt := coalesce(v_amt, 0);', 'v_amt := greatest(coalesce(v_amt, 0), sot_appsumo_emails(p_wallet));');
  if position('sot_appsumo_emails' in pg_get_functiondef('public.sot_ensure_monthly(uuid, text)'::regprocedure)) = 0 then raise exception 'ensure_monthly not updated'; end if;
  if (select count(*) from app_settings where key = 'appsumo') < 2 then raise exception 'appsumo setting missing'; end if;
  if to_regprocedure('public.sot_appsumo_redeem(uuid, text)') is null then raise exception 'redeem function missing'; end if;
end $$;

-- (follow-up) plan_grants.reason allows the AppSumo lifetime grant and a trial replaced by it
alter table plan_grants drop constraint if exists plan_grants_reason_check;
alter table plan_grants add constraint plan_grants_reason_check check (reason = any (array['trial', 'birthday', 'treat_jar', 'admin', 'appsumo', 'trial_appsumo']));
