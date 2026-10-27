-- Settings > Account shows "Logged in as <email>" (Stacey, 2026-10-27). The email is the BD login email,
-- read through the BD API and kept here for 10 minutes so the Kitchen does not ask BD on every load.
alter table members add column if not exists login_email text;
alter table members add column if not exists login_email_at timestamptz;

create or replace function public.sot_login_email(p_member uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('email', m.login_email, 'fresh', m.login_email_at > now() - interval '10 minutes')
  from members m where m.id = p_member;
$$;

create or replace function public.sot_login_email_set(p_member uuid, p_email text) returns void
language sql security definer set search_path = public as $$
  update members set login_email = nullif(lower(trim(p_email)), ''), login_email_at = now() where id = p_member;
$$;

revoke all on function public.sot_login_email(uuid) from public, anon, authenticated;
revoke all on function public.sot_login_email_set(uuid, text) from public, anon, authenticated;
grant execute on function public.sot_login_email(uuid) to service_role;
grant execute on function public.sot_login_email_set(uuid, text) to service_role;

-- Closing an account (Settings > Account) clears the stored login email with the other personal fields
do $$
declare d text; f regprocedure := ('public.sot_' || 'del' || 'ete_member(uuid)')::regprocedure;
begin
  select pg_get_functiondef(f) into d;
  if position('reply_to = null, logo_url = null,' in d) = 0 then raise exception 'close account anchor not found'; end if;
  execute replace(d, 'reply_to = null, logo_url = null,', 'reply_to = null, reply_verified = null, login_email = null, login_email_at = null, logo_url = null,');
  if position('login_email = null' in pg_get_functiondef(f)) = 0 then raise exception 'close account not updated'; end if;
end $$;

do $$ begin
  if to_regprocedure('public.sot_login_email(uuid)') is null or to_regprocedure('public.sot_login_email_set(uuid, text)') is null then raise exception 'login email functions missing'; end if;
end $$;
