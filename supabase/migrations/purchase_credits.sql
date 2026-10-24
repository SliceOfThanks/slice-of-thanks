-- purchase_credits: email packs and Special Delivery bought through BD Digital Products.
-- Each paid BD invoice line becomes one purchase (bd_order_ref = invoiceId:lineIndex) and one
-- 'purchase' ledger lot that expires 12 months after payment. Lots are used oldest first,
-- so whatever is left sits in the newest lots. Credits without a purchase (bonus, adjust) are never expired.

alter table public.members add column if not exists bd_billing_checked_at timestamptz;

insert into public.app_settings(env, key, value)
select e, 'bd_products', '[
  {"match": "1,000 email pack", "product": "pack_1000"},
  {"match": "1000 email pack", "product": "pack_1000"},
  {"match": "500 email pack", "product": "pack_500"},
  {"match": "100 email pack", "product": "pack_100"},
  {"match": "special delivery", "product": "special_delivery"}
]'::jsonb from unnest(array['live','staging']) e
on conflict (env, key) do nothing;

insert into public.app_settings(env, key, value)
select e, 'checkout_urls', '{"special_delivery": "", "pack_100": "", "pack_500": "", "pack_1000": ""}'::jsonb
from unnest(array['live','staging']) e
on conflict (env, key) do nothing;

-- Open lots in a bucket and how much of each is left (remaining sits in the newest lots).
create or replace function public.sot_lots(p_wallet uuid, p_bucket text)
returns table(purchase_id uuid, expires_at timestamptz, remaining int)
language plpgsql stable security definer set search_path = public as $$
declare v_left int; v_protected int; r record; v_take int;
begin
  v_left := bucket_balance(p_wallet, p_bucket);
  select coalesce(sum(delta), 0) into v_protected from credit_ledger
   where wallet_member_id = p_wallet and bucket = p_bucket and is_test = false
     and purchase_id is null and delta > 0 and entry in ('grant', 'bonus', 'adjust');
  v_left := greatest(v_left - least(v_left, v_protected), 0);
  for r in
    select l.purchase_id, l.expires_at, l.delta from credit_ledger l
     where l.wallet_member_id = p_wallet and l.bucket = p_bucket and l.entry = 'purchase' and l.is_test = false
       and not exists (select 1 from credit_ledger c where c.purchase_id = l.purchase_id and c.entry in ('expire', 'refund'))
     order by l.expires_at desc nulls first, l.id desc
  loop
    v_take := least(v_left, r.delta);
    v_left := v_left - v_take;
    purchase_id := r.purchase_id; expires_at := r.expires_at; remaining := v_take;
    return next;
  end loop;
end $$;

-- Close lots past their expiry date. Called under the wallet lock.
create or replace function public.sot_expire_lots(p_wallet uuid)
returns void language plpgsql security definer set search_path = public as $$
declare b text; r record;
begin
  perform pg_advisory_xact_lock(hashtext(p_wallet::text));
  foreach b in array array['pack', 'special_delivery'] loop
    for r in select * from sot_lots(p_wallet, b) where expires_at <= now() loop
      insert into credit_ledger(wallet_member_id, bucket, entry, delta, purchase_id, reason)
      values (p_wallet, b, 'expire', -r.remaining, r.purchase_id, '12 months passed')
      on conflict do nothing;
    end loop;
  end loop;
end $$;

-- Credit one paid BD invoice line. Safe to call again for the same ref.
create or replace function public.sot_grant_purchase(p_member uuid, p_ref text, p_product text, p_amount_cents int, p_paid_at timestamptz)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_wallet uuid; v_id uuid; v_emails int; v_bucket text; v_months int; v_exp timestamptz;
begin
  if p_ref is null or p_ref = '' then raise exception 'missing ref'; end if;
  v_wallet := wallet_for(p_member);
  if v_wallet is null then raise exception 'member not found'; end if;
  perform pg_advisory_xact_lock(hashtext(v_wallet::text));
  if p_product = 'special_delivery' then
    v_bucket := 'special_delivery'; v_emails := 1;
  else
    v_bucket := 'pack';
    select (x->>'emails')::int into v_emails from jsonb_array_elements(sot_setting('live', 'packs')) x where x->>'key' = p_product;
  end if;
  if coalesce(v_emails, 0) <= 0 then raise exception 'unknown product %', p_product; end if;
  insert into purchases(member_id, bd_order_ref, product_key, amount_cents)
  values (p_member, p_ref, p_product, p_amount_cents)
  on conflict (bd_order_ref) do nothing
  returning id into v_id;
  if v_id is null then return jsonb_build_object('ok', true, 'duplicate', true); end if;
  v_months := coalesce((sot_setting('live', 'special_delivery')->>'valid_months')::int, 12);
  v_exp := coalesce(p_paid_at, now()) + make_interval(months => v_months);
  insert into credit_ledger(wallet_member_id, bucket, entry, delta, purchase_id, expires_at, reason)
  values (v_wallet, v_bucket, 'purchase', v_emails, v_id, v_exp, 'BD ' || p_ref);
  insert into events(type, member_id, props)
  values (case when v_bucket = 'pack' then 'pack_purchased' else 'special_delivery_purchased' end, p_member,
          jsonb_build_object('product', p_product, 'emails', v_emails, 'amount_cents', p_amount_cents, 'ref', p_ref));
  return jsonb_build_object('ok', true, 'granted', v_emails, 'bucket', v_bucket, 'expires_at', v_exp);
end $$;

-- BD marked the invoice Refunded: remove what is left of that purchase.
create or replace function public.sot_refund_purchase(p_ref text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_p purchases; v_wallet uuid; v_bucket text; v_left int;
begin
  select * into v_p from purchases where bd_order_ref = p_ref;
  if v_p.id is null or v_p.refunded_at is not null then return jsonb_build_object('ok', true, 'changed', false); end if;
  v_wallet := wallet_for(v_p.member_id);
  perform pg_advisory_xact_lock(hashtext(v_wallet::text));
  v_bucket := case when v_p.product_key = 'special_delivery' then 'special_delivery' else 'pack' end;
  select remaining into v_left from sot_lots(v_wallet, v_bucket) where purchase_id = v_p.id;
  insert into credit_ledger(wallet_member_id, bucket, entry, delta, purchase_id, reason)
  values (v_wallet, v_bucket, 'refund', -coalesce(v_left, 0), v_p.id, 'refunded in BD')
  on conflict do nothing;
  update purchases set refunded_at = now() where id = v_p.id;
  insert into events(type, member_id, props) values ('purchase_refunded', v_p.member_id, jsonb_build_object('ref', p_ref, 'removed', coalesce(v_left, 0)));
  return jsonb_build_object('ok', true, 'changed', true, 'removed', coalesce(v_left, 0));
end $$;

-- True (and stamps the time) when this member's BD billing has not been checked in p_seconds.
create or replace function public.sot_billing_claim(p_member uuid, p_seconds int)
returns boolean language sql security definer set search_path = public as $$
  update members set bd_billing_checked_at = now()
   where id = p_member and (bd_billing_checked_at is null or bd_billing_checked_at < now() - make_interval(secs => p_seconds))
  returning true
$$;

-- reserve_credit: expire old lots first, under the same wallet lock
create or replace function public.reserve_credit(p_send uuid)
returns text language plpgsql security definer set search_path = public as $$
declare
  v_member uuid; v_wallet uuid; v_special boolean; v_test boolean; v_bucket text; b text;
begin
  select member_id, special_delivery, is_test into v_member, v_special, v_test from public.sends where id = p_send;
  if v_member is null then raise exception 'send not found'; end if;
  if exists (select 1 from public.credit_ledger where send_id = p_send and entry = 'reserve') then
    select bucket into v_bucket from public.credit_ledger where send_id = p_send and entry = 'reserve';
    return v_bucket;
  end if;
  v_wallet := public.wallet_for(v_member);
  perform pg_advisory_xact_lock(hashtext(v_wallet::text));
  if v_test then
    insert into public.credit_ledger(wallet_member_id, bucket, entry, delta, send_id, is_test, reason)
    values (v_wallet, 'monthly', 'reserve', 0, p_send, true, 'test send');
    return 'test';
  end if;
  perform public.sot_expire_lots(v_wallet);
  foreach b in array case when v_special then array['special_delivery'] else array['monthly','bonus','pack'] end loop
    if public.bucket_balance(v_wallet, b) > 0 then
      insert into public.credit_ledger(wallet_member_id, bucket, entry, delta, send_id)
      values (v_wallet, b, 'reserve', -1, p_send);
      return b;
    end if;
  end loop;
  return null;
end $$;

-- sot_session: expire old lots, and return checkout links and pack prices
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
  -- The member ticked the required legal checkbox on the BD sign up form: record it once, dated to their sign up
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
  select min(expires_at) into v_next from sot_lots(v_wallet, 'pack') where remaining > 0;
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

revoke all on function public.sot_lots(uuid, text) from public, anon, authenticated;
revoke all on function public.sot_expire_lots(uuid) from public, anon, authenticated;
revoke all on function public.sot_grant_purchase(uuid, text, text, int, timestamptz) from public, anon, authenticated;
revoke all on function public.sot_refund_purchase(text) from public, anon, authenticated;
revoke all on function public.sot_billing_claim(uuid, int) from public, anon, authenticated;
grant execute on function public.sot_lots(uuid, text) to service_role;
grant execute on function public.sot_expire_lots(uuid) to service_role;
grant execute on function public.sot_grant_purchase(uuid, text, text, int, timestamptz) to service_role;
grant execute on function public.sot_refund_purchase(text) to service_role;
grant execute on function public.sot_billing_claim(uuid, int) to service_role;
