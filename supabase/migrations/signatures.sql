-- More signature pizzas (Stacey, 2026-10-25). Additive.
-- Members keep a list of signature pizzas, business or personal, in members.prefs.signatures.
-- One of them is the main signature (prefs.signature, with item_id), the pizza that goes out after meetings.
-- Limits per plan in app_settings signature_limits: A Slice 1, The Whole Pie 10, Pizza Party 20.
-- Closing an account sets prefs to {}, so the list goes with it.

insert into app_settings(env, key, value) values
  ('live', 'signature_limits', '{"free":1,"pro":10,"team":20}'::jsonb),
  ('staging', 'signature_limits', '{"free":1,"pro":10,"team":20}'::jsonb)
on conflict (env, key) do nothing;

create or replace function public.sot_signatures(p_member uuid) returns jsonb
language sql security definer set search_path = public as $$
  select jsonb_build_object(
    'limit', coalesce((sot_setting('live', 'signature_limits')->>sot_effective_plan(p_member))::int, 1),
    'main_id', m.prefs->'signature'->>'item_id',
    'items', coalesce(case when jsonb_typeof(m.prefs->'signatures') = 'array' then m.prefs->'signatures' end, '[]'::jsonb))
  from members m where m.id = p_member
$$;

-- Add or change one signature pizza. p = { id?, name, kind, pizza, box, main?, image_url? }
create or replace function public.sot_save_signature_item(p_member uuid, p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_list jsonb; v_id text := nullif(p->>'id', ''); v_name text := left(nullif(trim(p->>'name'), ''), 60);
  v_kind text := case when p->>'kind' = 'personal' then 'personal' else 'business' end;
  v_item jsonb; v_limit int; v_found boolean := false;
begin
  if v_name is null then return jsonb_build_object('ok', false, 'code', 'needs_name'); end if;
  if jsonb_typeof(p->'pizza') <> 'object' or length((p->'pizza')::text) > 60000 or length(coalesce(p->'box', '{}')::text) > 6000 then
    return jsonb_build_object('ok', false, 'code', 'too_big'); end if;
  select coalesce(case when jsonb_typeof(prefs->'signatures') = 'array' then prefs->'signatures' end, '[]'::jsonb) into v_list from members where id = p_member;
  if v_id is not null then
    v_found := exists (select 1 from jsonb_array_elements(v_list) x where x->>'id' = v_id);
    if not v_found then return jsonb_build_object('ok', false, 'code', 'not_found'); end if;
  else
    v_limit := coalesce((sot_setting('live', 'signature_limits')->>sot_effective_plan(p_member))::int, 1);
    if jsonb_array_length(v_list) >= v_limit then return jsonb_build_object('ok', false, 'code', 'signature_limit', 'limit', v_limit); end if;
    v_id := gen_random_uuid()::text;
  end if;
  v_item := jsonb_build_object('id', v_id, 'name', v_name, 'kind', v_kind, 'pizza', p->'pizza', 'box', coalesce(p->'box', '{}'::jsonb), 'saved_at', now());
  if v_found then
    select coalesce(jsonb_agg(case when x->>'id' = v_id then v_item else x end order by n), '[]'::jsonb) into v_list
    from jsonb_array_elements(v_list) with ordinality a(x, n);
  else
    v_list := v_list || jsonb_build_array(v_item);
  end if;
  update members set prefs = prefs || jsonb_build_object('signatures', v_list)
    || case when coalesce((p->>'main')::boolean, false) or (prefs->'signature'->>'item_id') = v_id then jsonb_build_object('signature', jsonb_strip_nulls(jsonb_build_object(
      'pizza', p->'pizza', 'box', coalesce(p->'box', '{}'::jsonb), 'image_url', left(p->>'image_url', 500), 'item_id', v_id, 'saved_at', now()))) else '{}'::jsonb end,
    updated_at = now()
  where id = p_member;
  return jsonb_build_object('ok', true, 'id', v_id);
end $$;

-- Take one signature pizza off the list. The main signature stays as it is until another one is made main.
create or replace function public.sot_remove_signature_item(p_member uuid, p_id text) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  update members set prefs = prefs || jsonb_build_object('signatures', coalesce((
      select jsonb_agg(x order by n) from jsonb_array_elements(case when jsonb_typeof(prefs->'signatures') = 'array' then prefs->'signatures' else '[]'::jsonb end) with ordinality a(x, n)
      where x->>'id' <> p_id), '[]'::jsonb)),
    updated_at = now()
  where id = p_member;
  return jsonb_build_object('ok', true);
end $$;

revoke all on function public.sot_signatures(uuid) from public, anon, authenticated;
revoke all on function public.sot_save_signature_item(uuid, jsonb) from public, anon, authenticated;
revoke all on function public.sot_remove_signature_item(uuid, text) from public, anon, authenticated;
grant execute on function public.sot_signatures(uuid), public.sot_save_signature_item(uuid, jsonb), public.sot_remove_signature_item(uuid, text) to service_role;
