-- Analytics totals every 8 hours instead of every 2 (Stacey, 2026-10-27).
-- Runs at 7 minutes past 00:00, 08:00 and 16:00 UTC (5:07 pm, 1:07 am and 9:07 am Pacific in daylight time).
-- Refresh now on the dashboard still works any time, once every 5 minutes.
select cron.unschedule('sot-metrics') where exists (select 1 from cron.job where jobname = 'sot-metrics');
select cron.schedule('sot-metrics', '7 */8 * * *', 'select public.sot_metrics_refresh(''auto'')');

-- When the totals last ran, when Refresh can be pressed again, and the next automatic run (every 8 hours now)
create or replace function public.sot_metrics_status()
returns table(last_at timestamptz, last_trigger text, last_ok boolean, last_error text, last_good_at timestamptz, last_good_trigger text, refresh_ready_at timestamptz, next_auto_at timestamptz, tz text)
language sql stable security definer set search_path = public as $$
  with l as (select * from metrics_runs where finished_at is not null order by finished_at desc limit 1),
       g as (select * from metrics_runs where ok order by finished_at desc limit 1),
       m as (select max(started_at) + make_interval(secs => coalesce((sot_setting('live', 'analytics')->>'refresh_cooldown_s')::int, 300)) r from metrics_runs where trigger = 'manual')
  select l.finished_at, l.trigger, l.ok, l.error, g.finished_at, g.trigger, greatest(m.r, now()),
    (select min(h) + interval '7 minutes' from generate_series(date_trunc('hour', now()) - interval '1 hour', date_trunc('hour', now()) + interval '9 hours', interval '1 hour') h
      where extract(hour from h at time zone 'UTC')::int % 8 = 0 and h + interval '7 minutes' > now()),
    coalesce(sot_setting('live', 'analytics')->>'tz', 'America/Los_Angeles')
  from m left join l on true left join g on true;
$$;

revoke all on function public.sot_metrics_status() from public, anon, authenticated;
grant execute on function public.sot_metrics_status() to service_role;

do $$ begin
  if (select schedule from cron.job where jobname = 'sot-metrics') <> '7 */8 * * *' then raise exception 'metrics job not every 8 hours'; end if;
  if (select next_auto_at from public.sot_metrics_status()) is null then raise exception 'next automatic run missing'; end if;
  if (select next_auto_at from public.sot_metrics_status()) > now() + interval '8 hours' then raise exception 'next automatic run too far out'; end if;
end $$;
