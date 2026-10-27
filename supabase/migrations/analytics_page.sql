-- Analytics dashboard page helpers (2026-10-27). The page reads Supabase through Stacey's own Supabase connection with one SELECT per source.
-- These two run the page's actions inside those reads: Refresh (only when the page sends a new nonce) and saving a goal.
create or replace function public.sot_metrics_status_refresh(p_nonce text)
returns table(nonce text, result jsonb, last_at text, last_trigger text, last_ok boolean, last_error text, last_good_at text, last_good_trigger text, refresh_ready_at text, next_auto_at text, tz text)
language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
declare r jsonb;
begin
  if coalesce(p_nonce, '') <> '' then r := sot_metrics_refresh('manual'); end if;
  return query
  select p_nonce, r,
    to_char(s.last_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'), s.last_trigger, s.last_ok, s.last_error,
    to_char(s.last_good_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'), s.last_good_trigger,
    to_char(s.refresh_ready_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
    to_char(s.next_auto_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'), s.tz
  from sot_metrics_status() s;
end $$;

create or replace function public.sot_metrics_goals_apply(p_real boolean, p_action text, p_id uuid, p_metric text, p_period text, p_target numeric, p_better text, p_nonce text)
returns table(nonce text, result jsonb, id uuid, metric text, label text, kind text, period text, better text, target numeric, period_start date, period_end date,
  share_done numeric, value numeric, pace numeric, status text, prev_value numeric, prev_status text, starts_on date)
language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
declare r jsonb;
begin
  if coalesce(p_nonce, '') <> '' then r := sot_metric_target_apply(p_action, p_id, p_metric, p_period, p_target, p_better, p_nonce); end if;
  return query select p_nonce, r, g.* from sot_metrics_goals(p_real) g;
end $$;

revoke all on function public.sot_metrics_status_refresh(text) from public, anon, authenticated;
revoke all on function public.sot_metrics_goals_apply(boolean, text, uuid, text, text, numeric, text, text) from public, anon, authenticated;
grant execute on function public.sot_metrics_status_refresh(text) to service_role;
grant execute on function public.sot_metrics_goals_apply(boolean, text, uuid, text, text, numeric, text, text) to service_role;
