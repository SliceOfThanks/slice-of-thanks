-- Box presets (saved box setups) and a role for each contact, used by [role] in notes. Additive only.
-- Preset limits per plan live in app_settings preset_limits: A Slice 1, The Whole Pie 10, Pizza Party 20.

alter table public.contacts add column if not exists role text;

create table if not exists public.box_presets (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id),
  name text not null,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  removed_at timestamptz
);
create index if not exists box_presets_member on public.box_presets(member_id);
alter table public.box_presets enable row level security;
revoke all on table public.box_presets from anon, authenticated;

insert into app_settings(env, key, value) values
  ('live', 'preset_limits', '{"free":1,"pro":10,"team":20}'::jsonb),
  ('staging', 'preset_limits', '{"free":1,"pro":10,"team":20}'::jsonb)
on conflict (env, key) do nothing;

create or replace function public.sot_presets(p_member uuid) returns jsonb
language sql security definer set search_path = public as $$
  select jsonb_build_object(
    'limit', coalesce((sot_setting('live','preset_limits')->>sot_effective_plan(p_member))::int, 1),
    'presets', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'name', name, 'data', data) order by lower(name))
      from box_presets where member_id = p_member and removed_at is null), '[]'::jsonb))
$$;

-- Only the box choices are kept: style, sticker, confetti, tone, note, sign-off, button and gift
create or replace function public.sot_save_preset(p_member uuid, p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_limit int; v_count int; v_name text := left(nullif(trim(p->>'name'), ''), 60);
  v_data jsonb := jsonb_strip_nulls(jsonb_build_object(
    'style', left(p->'data'->>'style', 40), 'sticker', left(p->'data'->>'sticker', 60), 'confetti', left(p->'data'->>'confetti', 40),
    'tone', left(p->'data'->>'tone', 20), 'note', left(p->'data'->>'note', 280), 'sign', left(p->'data'->>'sign', 40),
    'linkLabel', left(p->'data'->>'linkLabel', 30), 'link', left(p->'data'->>'link', 300),
    'reward', case when jsonb_typeof(p->'data'->'reward') = 'object' then jsonb_build_object(
      'text', left(p->'data'->'reward'->>'text', 60), 'code', left(p->'data'->'reward'->>'code', 30),
      'link', left(p->'data'->'reward'->>'link', 300), 'exp', left(p->'data'->'reward'->>'exp', 20)) end));
begin
  if v_name is null then return jsonb_build_object('ok', false, 'code', 'needs_name'); end if;
  if nullif(p->>'id','') is not null then
    update box_presets set name = v_name, data = case when p ? 'data' then v_data else data end, updated_at = now()
    where id = (p->>'id')::uuid and member_id = p_member and removed_at is null returning id into v_id;
    if v_id is null then return jsonb_build_object('ok', false, 'code', 'not_found'); end if;
  else
    v_limit := coalesce((sot_setting('live','preset_limits')->>sot_effective_plan(p_member))::int, 1);
    select count(*) into v_count from box_presets where member_id = p_member and removed_at is null;
    if v_count >= v_limit then return jsonb_build_object('ok', false, 'code', 'preset_limit', 'limit', v_limit); end if;
    insert into box_presets(member_id, name, data) values (p_member, v_name, v_data) returning id into v_id;
  end if;
  return jsonb_build_object('ok', true, 'id', v_id);
end $$;

-- Removing a preset marks it removed; it no longer shows or counts toward the plan limit
create or replace function public.sot_remove_preset(p_member uuid, p_id uuid) returns jsonb
language sql security definer set search_path = public as $$
  with d as (update box_presets set removed_at = now() where id = p_id and member_id = p_member and removed_at is null returning 1)
  select jsonb_build_object('ok', exists (select 1 from d))
$$;

revoke all on function public.sot_presets(uuid) from public, anon, authenticated;
revoke all on function public.sot_save_preset(uuid, jsonb) from public, anon, authenticated;
revoke all on function public.sot_remove_preset(uuid, uuid) from public, anon, authenticated;
grant execute on function public.sot_presets(uuid), public.sot_save_preset(uuid, jsonb), public.sot_remove_preset(uuid, uuid) to service_role;

create or replace function public.sot_people(p_member uuid) returns jsonb
language sql security definer set search_path = public as $$
  select coalesce(jsonb_agg(x order by x.last_at desc nulls last, x.name), '[]'::jsonb) from (
    select c.id, c.name, c.email, c.company, c.role, c.country, c.vegan, coalesce(c.notes, '') notes,
      exists (select 1 from consent_records r where r.contact_id = c.id and r.channel = 'email') has_consent,
      (select max(s.created_at) from sends s where s.contact_id = c.id) last_at,
      coalesce((select jsonb_agg(h order by h.at desc) from (
        select s.id, s.created_at at, s.status, s.scheduled_for, s.is_test,
          exists (select 1 from recipient_events e where e.send_id = s.id and e.type = 'box_opened') opened,
          pz.snapshot->'pizza' pizza, pz.snapshot->'box' box, pz.snapshot->>'label' label
        from sends s left join pizzas pz on pz.id = s.pizza_id
        where s.contact_id = c.id and s.status not in ('skipped')
        order by s.created_at desc limit 10) h), '[]'::jsonb) history
    from contacts c where c.member_id = p_member
    order by c.updated_at desc limit 1000) x
$$;

create or replace function public.sot_save_contact(p_member uuid, p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_email text := lower(nullif(trim(p->>'email'), ''));
begin
  if v_email is not null and (position('@' in v_email) < 2 or position('.' in split_part(v_email, '@', 2)) < 2) then
    return jsonb_build_object('ok', false, 'code', 'bad_email'); end if;
  if nullif(p->>'id','') is not null then
    update contacts set
      name = coalesce(left(nullif(trim(p->>'name'),''), 120), name),
      email = coalesce(v_email, email),
      company = case when p ? 'company' then left(nullif(trim(p->>'company'),''), 120) else company end,
      role = case when p ? 'role' then left(nullif(trim(p->>'role'),''), 80) else role end,
      country = case when p ? 'country' then upper(nullif(trim(p->>'country'),'')) else country end,
      vegan = case when p ? 'vegan' then coalesce((p->>'vegan')::boolean, false) else vegan end,
      notes = case when p ? 'notes' then left(p->>'notes', 2000) else notes end,
      updated_at = now()
    where id = (p->>'id')::uuid and member_id = p_member and removed_at is null returning id into v_id;
    if v_id is null then return jsonb_build_object('ok', false, 'code', 'not_found'); end if;
  else
    if nullif(trim(p->>'name'),'') is null then return jsonb_build_object('ok', false, 'code', 'needs_name'); end if;
    if v_email is null then return jsonb_build_object('ok', false, 'code', 'bad_email'); end if;
    insert into contacts(member_id, name, email, company, role, country, vegan, notes, source)
    values (p_member, left(trim(p->>'name'), 120), v_email, left(nullif(trim(p->>'company'),''), 120), left(nullif(trim(p->>'role'),''), 80),
      upper(nullif(trim(p->>'country'),'')), coalesce((p->>'vegan')::boolean, false), left(p->>'notes', 2000), 'manual')
    on conflict (member_id, lower(email)) where email is not null do update set
      name = excluded.name, company = coalesce(excluded.company, contacts.company), role = coalesce(excluded.role, contacts.role), country = coalesce(excluded.country, contacts.country),
      vegan = contacts.vegan or excluded.vegan, updated_at = now()
    returning id into v_id;
  end if;
  if p->>'basis' in ('permission','relationship','one_to_one') then
    insert into consent_records(contact_id, channel, basis, obtained_at, method, note, recorded_by)
    values (v_id, 'email', p->>'basis', now(), 'Selected in People', null, p_member);
  end if;
  return jsonb_build_object('ok', true, 'id', v_id);
end $$;

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

  insert into contacts(member_id, name, email, country, locale, source, company, vegan, role)
  values (p_member, left(v_r->>'name', 120), v_email, v_country, nullif(v_r->>'locale',''), coalesce(p->>'source','manual'),
    left(nullif(trim(v_r->>'company'),''), 120), coalesce((v_r->>'vegan')::boolean, false), left(nullif(trim(v_r->>'role'),''), 80))
  on conflict (member_id, lower(email)) where email is not null do update set
    name = coalesce(excluded.name, contacts.name), country = coalesce(excluded.country, contacts.country),
    locale = coalesce(excluded.locale, contacts.locale), company = coalesce(excluded.company, contacts.company), role = coalesce(excluded.role, contacts.role),
    vegan = contacts.vegan or excluded.vegan, updated_at = now()
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
    'pizza', p->'pizza', 'box', v_box, 'label', left(p->>'label', 120),
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
