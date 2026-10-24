-- email_provider: which service sent each email, and a setting that picks the service.
-- Additive only: sot_mark_sent(uuid, text) stays for older code; api-0.5.0 calls sot_mark_sent_via.
-- Switching providers: add an adapter in supabase/functions/api/lib/mail, save its API key
-- as a Supabase secret, then change app_settings email_provider (both envs).
alter table public.sends add column if not exists provider text;

insert into public.app_settings(env, key, value)
select e, 'email_provider', '{"pizza": "brevo"}'::jsonb from unnest(array['live','staging']) e
on conflict (env, key) do nothing;

create or replace function public.sot_mark_sent_via(p_send uuid, p_provider_id text, p_provider text)
returns void language plpgsql security definer set search_path = public as $$
begin
  update sends set provider = p_provider where id = p_send and status = 'sending';
  perform sot_mark_sent(p_send, p_provider_id);
end $$;
revoke all on function public.sot_mark_sent_via(uuid, text, text) from public, anon, authenticated;
grant execute on function public.sot_mark_sent_via(uuid, text, text) to service_role;
