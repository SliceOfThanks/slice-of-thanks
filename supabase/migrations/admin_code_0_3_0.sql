-- Owner dashboard admin-0.3.0 (goals panel, fold-up sections, Brevo emails left, CSV and PDF report)
insert into public.app_settings(env, key, value)
values ('live', 'admin_code', '{"version": "admin-0.3.0", "commit": "8dd5b90d7a46e186847b0fa9dba2b147efd38590"}'::jsonb)
on conflict (env, key) do update set value = excluded.value, updated_at = now();
do $$ begin
  if (select value->>'commit' from public.app_settings where env = 'live' and key = 'admin_code') <> '8dd5b90d7a46e186847b0fa9dba2b147efd38590' then raise exception 'admin_code not set'; end if;
end $$;
