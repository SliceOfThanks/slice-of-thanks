-- Send worker: every minute pg_cron calls the api's /worker route, which delivers queued sends that are due
-- (scheduled sends and provider retries). Additive only.

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- The worker secret is made inside the database and only travels from the cron job to the api.
-- Nobody types or sees it. The api checks it with sot_worker_ok.
do $$
begin
  if not exists (select 1 from vault.secrets where name = 'sot_worker_secret') then
    perform vault.create_secret(replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''), 'sot_worker_secret',
      'Shared by the sot-send-worker cron job and the api /worker route');
  end if;
end $$;

create or replace function sot_worker_ok(p_secret text) returns boolean
language sql security definer set search_path = public as $$
  select coalesce(length(p_secret) >= 32 and p_secret = (select decrypted_secret from vault.decrypted_secrets where name = 'sot_worker_secret' limit 1), false)
$$;

-- A send stuck in 'sending' for 15 minutes means the api stopped mid-send. The provider may or may not have
-- sent it, so it is never retried (no double emails): it is marked failed and its credit is given back.
create or replace function sot_recover_stuck() returns integer
language plpgsql security definer set search_path = public as $$
declare r record; n integer := 0;
begin
  for r in select id from sends where status = 'sending' and updated_at < now() - interval '15 minutes' for update skip locked loop
    update sends set status = 'failed', skip_reason = 'stuck_while_sending', updated_at = now() where id = r.id;
    perform release_credit(r.id);
    n := n + 1;
  end loop;
  return n;
end $$;

-- The pizza picture is uploaded when the send is created, so a send delivered later still has it
create or replace function sot_set_send_image(p_send uuid, p_url text) returns void
language sql security definer set search_path = public as $$
  update pizzas set snapshot = snapshot || jsonb_build_object('image_url', left(p_url, 500))
  where id = (select pizza_id from sends where id = p_send)
$$;

revoke all on function sot_worker_ok(text) from public, anon, authenticated;
revoke all on function sot_recover_stuck() from public, anon, authenticated;
revoke all on function sot_set_send_image(uuid, text) from public, anon, authenticated;
grant execute on function sot_worker_ok(text), sot_recover_stuck(), sot_set_send_image(uuid, text) to service_role;

-- Every minute. The job reads the secret from the vault at run time.
select cron.schedule('sot-send-worker', '* * * * *', $job$
  select net.http_post(
    url := 'https://cmnclubiarmthibqibuj.supabase.co/functions/v1/api/worker',
    headers := jsonb_build_object('content-type', 'application/json',
      'x-sot-worker', (select decrypted_secret from vault.decrypted_secrets where name = 'sot_worker_secret' limit 1)),
    body := '{}'::jsonb,
    timeout_milliseconds := 55000
  )
$job$);
