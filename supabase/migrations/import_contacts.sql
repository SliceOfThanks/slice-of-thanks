-- Import calendar contacts into People (Stacey, 2026-10-24). Additive.
-- People already there keep their details; a new person gets the name and email from the calendar.
-- Importing does not record permission to email: the member picks how they know each person when they send.
create or replace function sot_import_contacts(p_member uuid, p_source text, p_items jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare r jsonb; v_email text; v_added int := 0; v_found int := 0; v_new boolean;
begin
  for r in select * from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) limit 2000 loop
    v_email := lower(trim(r->>'email'));
    if v_email is null or position('@' in v_email) < 2 or position('.' in split_part(v_email, '@', 2)) < 2 then continue; end if;
    v_found := v_found + 1;
    insert into contacts(member_id, name, email, source)
    values (p_member, left(nullif(trim(r->>'name'), ''), 120), left(v_email, 200), left(coalesce(p_source, 'calendar'), 30))
    on conflict (member_id, lower(email)) where email is not null do update set name = coalesce(contacts.name, excluded.name)
    returning (xmax = 0) into v_new;
    if v_new then v_added := v_added + 1; end if;
  end loop;
  return jsonb_build_object('ok', true, 'found', v_found, 'added', v_added);
end $$;

revoke all on function sot_import_contacts(uuid, text, jsonb) from public, anon, authenticated;
grant execute on function sot_import_contacts(uuid, text, jsonb) to service_role;
