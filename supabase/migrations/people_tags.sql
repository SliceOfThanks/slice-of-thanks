-- Tags, birthdays and work anniversaries in People, and saving a CSV list to People (Stacey, 2026-10-25). Additive.
-- contacts.tags already exists (text[]). Dates are text YYYY-MM-DD, with 0000 as the year when it is not known.
alter table contacts add column if not exists birthday text;
alter table contacts add column if not exists anniversary text;

-- Up to 20 tags, each trimmed to 30 characters, no duplicates (ignoring case)
create or replace function sot_clean_tags(p jsonb) returns text[]
language sql immutable set search_path = public as $$
  select coalesce(array_agg(t order by n), '{}'::text[]) from (
    select t, n from (
      select distinct on (lower(t)) t, n from (
        select left(trim(x), 30) t, n from jsonb_array_elements_text(case when jsonb_typeof(p) = 'array' then p else '[]'::jsonb end) with ordinality a(x, n)
      ) y where t <> '' order by lower(t), n
    ) z order by n limit 20
  ) w
$$;

-- A month and day, with an optional year: YYYY-MM-DD or 0000-MM-DD. Anything else is dropped.
create or replace function sot_clean_date(p text) returns text
language plpgsql immutable set search_path = public as $$
declare m int; d int;
begin
  if p is null or p !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then return null; end if;
  m := substr(p, 6, 2)::int; d := substr(p, 9, 2)::int;
  if m < 1 or m > 12 or d < 1 or d > (array[31,29,31,30,31,30,31,31,30,31,30,31])[m] then return null; end if;
  return p;
end $$;

-- sot_people: return tags and dates
do $$ declare d text := pg_get_functiondef('sot_people(uuid)'::regprocedure); begin
  if position('c.birthday' in d) = 0 then
    execute replace(d, 'c.vegan, coalesce(c.notes', 'c.vegan, coalesce(c.tags, ''{}'') tags, c.birthday, c.anniversary, coalesce(c.notes');
  end if;
end $$;

-- sot_save_contact: tags (replace, or add when tags_mode is add), birthday and anniversary, for new and existing people
do $$ declare d text := pg_get_functiondef('sot_save_contact(uuid,jsonb)'::regprocedure); begin
  if position('sot_clean_tags' in d) = 0 then
    execute replace(d, '  if p->>''basis'' in (''permission'',''relationship'',''one_to_one'') then',
      '  update contacts set
    tags = case when not (p ? ''tags'') then tags
      when p->>''tags_mode'' = ''add'' then sot_clean_tags(to_jsonb(coalesce(tags, ''{}''::text[])) || coalesce(p->''tags'', ''[]''::jsonb))
      else sot_clean_tags(p->''tags'') end,
    birthday = case when p ? ''birthday'' then coalesce(sot_clean_date(p->>''birthday''), case when p->>''tags_mode'' = ''add'' then birthday end) else birthday end,
    anniversary = case when p ? ''anniversary'' then coalesce(sot_clean_date(p->>''anniversary''), case when p->>''tags_mode'' = ''add'' then anniversary end) else anniversary end
  where id = v_id and (p ? ''tags'' or p ? ''birthday'' or p ? ''anniversary'');
  if p->>''basis'' in (''permission'',''relationship'',''one_to_one'') then');
  end if;
end $$;

-- Save a CSV list to People: new people are added, people already there get the new tags added and empty details filled
create or replace function sot_import_people(p_member uuid, p_items jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare r jsonb; v jsonb; v_added int := 0; v_updated int := 0; v_skipped int := 0; v_had boolean;
begin
  for r in select * from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) limit 500 loop
    if nullif(trim(r->>'name'), '') is null or position('@' in coalesce(r->>'email', '')) < 2 then v_skipped := v_skipped + 1; continue; end if;
    v_had := exists (select 1 from contacts where member_id = p_member and lower(email) = lower(trim(r->>'email')));
    v := sot_save_contact(p_member, (r - 'id') || jsonb_build_object('tags_mode', 'add'));
    if coalesce((v->>'ok')::boolean, false) then
      if v_had then v_updated := v_updated + 1; else v_added := v_added + 1; end if;
    else v_skipped := v_skipped + 1; end if;
  end loop;
  return jsonb_build_object('ok', true, 'added', v_added, 'updated', v_updated, 'skipped', v_skipped);
end $$;

revoke all on function sot_clean_tags(jsonb) from public, anon, authenticated;
grant execute on function sot_clean_tags(jsonb) to service_role;
revoke all on function sot_clean_date(text) from public, anon, authenticated;
grant execute on function sot_clean_date(text) to service_role;
revoke all on function sot_import_people(uuid, jsonb) from public, anon, authenticated;
grant execute on function sot_import_people(uuid, jsonb) to service_role;
