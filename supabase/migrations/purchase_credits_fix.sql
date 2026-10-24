-- purchase_credits_fix: sot_lots column names clashed with its output names.
create or replace function public.sot_lots(p_wallet uuid, p_bucket text)
returns table(purchase_id uuid, expires_at timestamptz, remaining int)
language plpgsql stable security definer set search_path = public as $$
declare v_left int; v_protected int; r record; v_take int;
begin
  v_left := bucket_balance(p_wallet, p_bucket);
  select coalesce(sum(k.delta), 0) into v_protected from credit_ledger k
   where k.wallet_member_id = p_wallet and k.bucket = p_bucket and k.is_test = false
     and k.purchase_id is null and k.delta > 0 and k.entry in ('grant', 'bonus', 'adjust');
  v_left := greatest(v_left - least(v_left, v_protected), 0);
  for r in
    select l.purchase_id as pid, l.expires_at as exp, l.delta from credit_ledger l
     where l.wallet_member_id = p_wallet and l.bucket = p_bucket and l.entry = 'purchase' and l.is_test = false
       and not exists (select 1 from credit_ledger c where c.purchase_id = l.purchase_id and c.entry in ('expire', 'refund'))
     order by l.expires_at desc nulls first, l.id desc
  loop
    v_take := least(v_left, r.delta);
    v_left := v_left - v_take;
    purchase_id := r.pid; expires_at := r.exp; remaining := v_take;
    return next;
  end loop;
end $$;

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

create or replace function public.sot_refund_purchase(p_ref text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_p purchases; v_wallet uuid; v_bucket text; v_left int;
begin
  select * into v_p from purchases where bd_order_ref = p_ref;
  if v_p.id is null or v_p.refunded_at is not null then return jsonb_build_object('ok', true, 'changed', false); end if;
  v_wallet := wallet_for(v_p.member_id);
  perform pg_advisory_xact_lock(hashtext(v_wallet::text));
  v_bucket := case when v_p.product_key = 'special_delivery' then 'special_delivery' else 'pack' end;
  select x.remaining into v_left from sot_lots(v_wallet, v_bucket) x where x.purchase_id = v_p.id;
  insert into credit_ledger(wallet_member_id, bucket, entry, delta, purchase_id, reason)
  values (v_wallet, v_bucket, 'refund', -coalesce(v_left, 0), v_p.id, 'refunded in BD')
  on conflict do nothing;
  update purchases set refunded_at = now() where id = v_p.id;
  insert into events(type, member_id, props) values ('purchase_refunded', v_p.member_id, jsonb_build_object('ref', p_ref, 'removed', coalesce(v_left, 0)));
  return jsonb_build_object('ok', true, 'changed', true, 'removed', coalesce(v_left, 0));
end $$;

create or replace function public.sot_expire_lots(p_wallet uuid)
returns void language plpgsql security definer set search_path = public as $$
declare b text; r record;
begin
  perform pg_advisory_xact_lock(hashtext(p_wallet::text));
  foreach b in array array['pack', 'special_delivery'] loop
    for r in select x.purchase_id as pid, x.remaining as rem from sot_lots(p_wallet, b) x where x.expires_at <= now() loop
      insert into credit_ledger(wallet_member_id, bucket, entry, delta, purchase_id, reason)
      values (p_wallet, b, 'expire', -r.rem, r.pid, '12 months passed')
      on conflict do nothing;
    end loop;
  end loop;
end $$;
