-- Owner dashboard code the SOT-Admin widget loads from jsDelivr (admin/admin.js at this commit)
insert into public.app_settings(env, key, value)
values ('live', 'admin_code', '{"version": "admin-0.1.0", "commit": "69c243fc0c72276acaab9bae9f7874af3cdb13cb"}'::jsonb)
on conflict (env, key) do update set value = excluded.value, updated_at = now();
do $$ begin
  if (select value->>'commit' from public.app_settings where env = 'live' and key = 'admin_code') <> '69c243fc0c72276acaab9bae9f7874af3cdb13cb' then raise exception 'admin_code not set'; end if;
end $$;
