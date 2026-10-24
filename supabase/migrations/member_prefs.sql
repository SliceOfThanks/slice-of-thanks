-- member_prefs: small per-member settings kept on the account, not in the browser,
-- so one-time notices (like meeting Gerald) stay dismissed on every device and in private windows.
-- Only listed keys are stored: met_gerald (boolean).
alter table public.members add column if not exists prefs jsonb not null default '{}'::jsonb;

create or replace function public.sot_update_profile(p_member uuid, p jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare v_prefs jsonb := '{}'::jsonb;
begin
  if jsonb_typeof(p->'prefs') = 'object' and jsonb_typeof(p->'prefs'->'met_gerald') = 'boolean' then
    v_prefs := v_prefs || jsonb_build_object('met_gerald', p->'prefs'->'met_gerald');
  end if;
  update members set
    display_name = case when p ? 'display_name' then left(p->>'display_name', 80) else display_name end,
    business_name = case when p ? 'business_name' then left(p->>'business_name', 80) else business_name end,
    send_as = case when p->>'send_as' in ('person','business') then p->>'send_as' else send_as end,
    mailing_address = case when p ? 'mailing_address' then left(p->>'mailing_address', 300) else mailing_address end,
    reply_to = case when p ? 'reply_to' then left(p->>'reply_to', 200) else reply_to end,
    country = case when p ? 'country' then upper(left(p->>'country', 2)) else country end,
    locale = case when p->>'locale' in ('en','es') then p->>'locale' else locale end,
    logo_url = case when p ? 'logo_url' then left(p->>'logo_url', 500) else logo_url end,
    brand_color_1 = case when p ? 'brand_color_1' then left(p->>'brand_color_1', 9) else brand_color_1 end,
    brand_color_2 = case when p ? 'brand_color_2' then left(p->>'brand_color_2', 9) else brand_color_2 end,
    prefs = prefs || v_prefs,
    updated_at = now()
  where id = p_member;
end $$;

-- sot_session returns prefs
create or replace function public.sot_session(p jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid bigint := (p->>'bd_user_id')::bigint;
  v_plan text; v_env text := 'live'; v_is_tester boolean; v_m members; v_eff_plan text; v_wallet uuid; v_feat jsonb; v_legal jsonb;
  v_joined timestamptz; v_next timestamptz;
begin
  if v_uid is null or v_uid <= 0 then raise exception 'bad user'; end if;
  v_plan := coalesce(sot_setting('live','bd_plan_map')->>(p->>'bd_sub_id'), 'free');
  insert into members(bd_user_id, plan_key, display_name)
  values (v_uid, v_plan, nullif(p->>'name',''))
  on conflict (bd_user_id) do update set plan_key = excluded.plan_key,
    display_name = coalesce(members.display_name, excluded.display_name), updated_at = now()
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
  v_eff_plan := sot_effective_plan(v_m.id);
  v_wallet := wallet_for(v_m.id);
  perform sot_ensure_monthly(v_wallet, v_eff_plan);
  perform sot_expire_lots(v_wallet);
  select min(x.expires_at) into v_next from sot_lots(v_wallet, 'pack') x where x.remaining > 0;
  select coalesce(jsonb_object_agg(feature_key, enabled), '{}') into v_feat from plan_features where env = v_env and plan_key = v_eff_plan;
  return jsonb_build_object(
    'member_id', v_m.id, 'env', v_env, 'is_tester', v_is_tester, 'plan', v_eff_plan, 'features', v_feat,
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
