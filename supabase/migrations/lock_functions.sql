-- Launch check (2026-10-27): every app function runs only through the Edge Function (service role).
-- Supabase's security scan found 11 referral and Partnero functions that the public anon key could call through /rest/v1/rpc.
do $$
declare f record;
begin
  for f in select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and p.prokind = 'f' and (p.proname like 'sot\_%' or p.proname in ('wallet_for', 'bucket_balance'))
  loop
    execute format('revoke all on function %s from public, anon, authenticated', f.sig);
    execute format('grant execute on function %s to service_role', f.sig);
  end loop;
end $$;
-- New functions start locked too
alter default privileges in schema public revoke execute on functions from public, anon, authenticated;
alter function public.sot_region set search_path = public;
do $$ begin
  if exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
             where n.nspname = 'public' and p.prokind = 'f' and p.proname like 'sot\_%'
               and (has_function_privilege('anon', p.oid, 'execute') or has_function_privilege('authenticated', p.oid, 'execute'))) then
    raise exception 'some sot_ functions are still callable by anon or authenticated';
  end if;
  if exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
             where n.nspname = 'public' and p.prokind = 'f' and p.proname like 'sot\_%' and not has_function_privilege('service_role', p.oid, 'execute')) then
    raise exception 'service_role lost access to a sot_ function';
  end if;
end $$;
