-- email_provider: which service sent each email, and a setting that picks the service.
-- Switching providers: add an adapter in supabase/functions/api/lib/mail, save its API key
-- as a Supabase secret, then change app_settings email_provider (both envs).
alter table public.sends add column if not exists provider text;
update public.sends set provider = 'brevo' where provider is null and provider_message_id is not null;

insert into public.app_settings(env, key, value)
select e, 'email_provider', '{"pizza": "brevo"}'::jsonb from unnest(array['live','staging']) e
on conflict (env, key) do nothing;

drop function if exists public.sot_mark_sent(uuid, text);
create function public.sot_mark_sent(p_send uuid, p_provider_id text, p_provider text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  update sends set status = 'sent', sent_at = now(), provider_message_id = p_provider_id, provider = coalesce(p_provider, provider), updated_at = now()
   where id = p_send and status = 'sending';
  perform settle_credit(p_send);
  insert into events(type, send_id, member_id, props, is_test)
  select 'email_sent', id, member_id, jsonb_build_object('provider', p_provider), is_test from sends where id = p_send;
end $$;
revoke all on function public.sot_mark_sent(uuid, text, text) from public, anon, authenticated;
grant execute on function public.sot_mark_sent(uuid, text, text) to service_role;
