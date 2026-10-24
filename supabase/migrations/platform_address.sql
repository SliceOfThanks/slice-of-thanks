-- Slice of Thanks's own mailing address goes on every email unless the member adds theirs (Stacey, 2026-10-24).
-- Slice of Thanks acts as the designated sender: From line "Name via Slice of Thanks", and it runs every unsubscribe.
-- Also: sending the same pizza again after a failed or skipped send makes a new send instead of returning the old one.

insert into app_settings(env, key, value) values
  ('live', 'platform_address', to_jsonb('967 Kendall Dr, Ste A, #271, San Bernardino, CA 92407'::text)),
  ('staging', 'platform_address', to_jsonb('967 Kendall Dr, Ste A, #271, San Bernardino, CA 92407'::text))
on conflict (env, key) do update set value = excluded.value, updated_at = now();

create or replace function public.sot_create_send(p_member uuid, p_env text, p_send_id uuid, p_token_hash text, p_idem text, p jsonb)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_m members; v_plan text; v_feat jsonb; v_r jsonb := p->'recipient'; v_box jsonb := coalesce(p->'box','{}');
  v_email text := lower(trim(p->'recipient'->>'email')); v_country text := upper(nullif(trim(p->'recipient'->>'country'),''));
  v_type text := coalesce(p->>'send_type','one_to_one'); v_special boolean := coalesce((p->>'special_delivery')::boolean, false);
  v_test boolean := coalesce((p->>'is_test')::boolean, false);
  v_contact uuid; v_rule jsonb; v_basis text; v_pizza uuid; v_bucket text; v_existing sends; v_missing text[] := '{}';
  v_when timestamptz := coalesce((p->>'scheduled_for')::timestamptz, now());
begin
  select * into v_existing from sends where idempotency_key = p_idem;
  if found then
    -- A failed or skipped send is finished: sending the same pizza again is a new try with its own key
    if v_existing.status in ('failed', 'skipped') then
      p_idem := p_idem || ':' || p_send_id::text;
    else
      return jsonb_build_object('ok', true, 'send_id', v_existing.id, 'status', v_existing.status, 'duplicate', true);
    end if;
  end if;
  select * into v_m from members where id = p_member;
  if v_m.id is null or v_m.status <> 'active' then return jsonb_build_object('ok', false, 'code', 'account_inactive'); end if;
  if coalesce((sot_setting('live','sending_paused'))::text, 'false') = 'true' then return jsonb_build_object('ok', false, 'code', 'sending_paused'); end if;
  if v_m.legal_versions is distinct from sot_setting('live','legal_versions') then return jsonb_build_object('ok', false, 'code', 'needs_terms'); end if;
  if v_email is null or position('@' in v_email) < 2 or position('.' in split_part(v_email, '@', 2)) < 2 then
    return jsonb_build_object('ok', false, 'code', 'bad_email'); end if;
  if v_type not in ('one_to_one','marketing') then v_type := 'one_to_one'; end if;
  if v_box ? 'gift' then v_type := 'marketing'; end if;

  v_plan := sot_effective_plan(p_member);
  select coalesce(jsonb_object_agg(feature_key, enabled), '{}') into v_feat from plan_features where env = p_env and plan_key = v_plan;
  if not v_special then
    if v_box ? 'logo_url' and not coalesce((v_feat->>'logo')::boolean, false) then v_missing := array_append(v_missing, 'logo'); end if;
    if v_box ? 'cta_url' and not coalesce((v_feat->>'cta_button')::boolean, false) then v_missing := array_append(v_missing, 'cta_button'); end if;
    if v_box ? 'gift' and not coalesce((v_feat->>'gift')::boolean, false) then v_missing := array_append(v_missing, 'gift'); end if;
    if coalesce((v_box->>'pro_style')::boolean, false) and not coalesce((v_feat->>'pro_styles')::boolean, false) then v_missing := array_append(v_missing, 'pro_styles'); end if;
    if p->>'scheduled_for' is not null and not coalesce((v_feat->>'scheduling')::boolean, false) then v_missing := array_append(v_missing, 'scheduling'); end if;
    if array_length(v_missing, 1) > 0 then return jsonb_build_object('ok', false, 'code', 'needs_upgrade', 'features', to_jsonb(v_missing)); end if;
  end if;

  if v_test and not (sot_setting('live','test_inboxes') ? v_email) then
    return jsonb_build_object('ok', false, 'code', 'test_inbox_only'); end if;

  if exists (select 1 from suppressions where lower(email) = v_email and channel = 'email' and (scope = 'global' or member_id = p_member)) then
    return jsonb_build_object('ok', false, 'code', 'suppressed'); end if;

  insert into contacts(member_id, name, email, country, locale, source)
  values (p_member, left(v_r->>'name', 120), v_email, v_country, nullif(v_r->>'locale',''), coalesce(p->>'source','manual'))
  on conflict (member_id, lower(email)) where email is not null do update set
    name = coalesce(excluded.name, contacts.name), country = coalesce(excluded.country, contacts.country),
    locale = coalesce(excluded.locale, contacts.locale), updated_at = now()
  returning id, country into v_contact, v_country;

  if p->'consent'->>'basis' in ('permission','relationship','one_to_one') then
    insert into consent_records(contact_id, channel, basis, obtained_at, method, note, recorded_by)
    values (v_contact, 'email', p->'consent'->>'basis', coalesce((p->'consent'->>'obtained_at')::timestamptz, now()), left(p->'consent'->>'method', 200), left(p->'consent'->>'note', 500), p_member);
  end if;
  select basis into v_basis from consent_records where contact_id = v_contact and channel = 'email' order by created_at desc limit 1;
  select data into v_rule from content_items where kind = 'consent_rule' and env = 'live' and slug = sot_region(v_country);
  if v_rule is null then select data into v_rule from content_items where kind = 'consent_rule' and env = 'live' and slug = 'DEFAULT'; end if;
  if v_basis is null or not (v_rule->v_type ? v_basis) then
    return jsonb_build_object('ok', false, 'code', 'needs_permission', 'region', sot_region(v_country), 'allowed', v_rule->v_type, 'contact_id', v_contact);
  end if;

  insert into pizzas(member_id, snapshot) values (p_member, jsonb_build_object(
    'pizza', p->'pizza', 'box', v_box,
    'sender', jsonb_build_object('name', v_m.display_name, 'business', v_m.business_name, 'send_as', v_m.send_as,
       'logo_url', case when v_special or coalesce((v_feat->>'logo')::boolean,false) then v_m.logo_url end,
       'brand_color_1', v_m.brand_color_1, 'brand_color_2', v_m.brand_color_2,
       'mailing_address', nullif(trim(coalesce(v_m.mailing_address, '')), ''),
       'platform_address', sot_setting('live','platform_address') #>> '{}',
       'show_made_with', not (v_special or coalesce((v_feat->>'hide_made_with')::boolean,false)))
  )) returning id into v_pizza;

  insert into sends(id, member_id, contact_id, pizza_id, send_type, status, recipient_token_hash, recipient_locale, scheduled_for, gift, special_delivery, is_test, idempotency_key)
  values (p_send_id, p_member, v_contact, v_pizza, v_type, 'queued', p_token_hash, coalesce(nullif(v_r->>'locale',''), v_m.locale), v_when, v_box->'gift', v_special, v_test, p_idem);

  v_bucket := reserve_credit(p_send_id);
  if v_bucket is null then
    update sends set status = 'skipped', skip_reason = 'no_credits', updated_at = now() where id = p_send_id;
    return jsonb_build_object('ok', false, 'code', 'no_credits', 'send_id', p_send_id);
  end if;
  insert into events(type, member_id, send_id, is_test) values ('send_accepted', p_member, p_send_id, v_test);
  return jsonb_build_object('ok', true, 'send_id', p_send_id, 'status', 'queued', 'bucket', v_bucket, 'due_now', v_when <= now());
end $function$;
