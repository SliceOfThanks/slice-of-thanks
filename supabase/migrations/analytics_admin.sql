-- Analytics in Brilliant Directories (Stacey, 2026-10-27): the SOT-Admin widget shows the dashboard to the owner's BD account only.
-- The Edge Function checks sot_metrics_is_admin, then reads everything in one call to sot_metrics_report.
update public.app_settings set value = value || '{"admin_bd_user_ids": [20]}'::jsonb, updated_at = now()
where key = 'analytics' and not (value ? 'admin_bd_user_ids');

create or replace function public.sot_metrics_is_admin(p_bd_user_id bigint) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(p_bd_user_id::text in (select jsonb_array_elements_text(coalesce(sot_setting('live', 'analytics')->'admin_bd_user_ids', '[]'::jsonb))), false);
$$;

-- Everything the dashboard shows for a range of days (last 30 days when not given), in one answer
create or replace function public.sot_metrics_report(p_from date, p_to date, p_real boolean) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare v_cfg jsonb := coalesce(sot_setting('live', 'analytics'), '{}'::jsonb);
  v_today date := (now() at time zone coalesce(v_cfg->>'tz', 'America/Los_Angeles'))::date;
  f date := coalesce(p_from, v_today - 29);
  t date := coalesce(p_to, v_today);
  v_scope text := case when p_real then 'real' else 'all' end;
  v_month date;
begin
  if t < f then t := f; end if;
  if t - f > 731 then f := t - 731; end if;
  v_month := date_trunc('month', v_today::timestamp)::date;
  return jsonb_build_object(
    'range', jsonb_build_object('from', f, 'to', t, 'prev_from', f - (t - f + 1), 'prev_to', f - 1, 'today', v_today, 'real', p_real, 'tz', coalesce(v_cfg->>'tz', 'America/Los_Angeles')),
    'summary', (select coalesce(jsonb_agg(to_jsonb(s) order by s.sort), '[]'::jsonb) from sot_metrics_summary(f, t, p_real) s),
    'days', (select coalesce(jsonb_agg(to_jsonb(d) order by d.day), '[]'::jsonb) from sot_metrics_days(f, t, p_real) d),
    'funnel', (select coalesce(jsonb_agg(jsonb_build_object('funnel', s.funnel, 'step', s.step, 'metric', s.metric, 'label', s.label,
        'n', coalesce((select sum(m.value) from metrics_daily m where m.metric = s.metric and m.scope = v_scope and m.day between f and t), 0)) order by s.funnel desc, s.step), '[]'::jsonb)
      from (values ('sender', 1, 'new_members', 'Signed up'), ('sender', 2, 'activated_7d', 'Sent a real pizza within 7 days'),
        ('recipient', 1, 'pizzas_sent', 'Pizza delivered'), ('recipient', 2, 'r_link_opened', 'Opened the email link'),
        ('recipient', 3, 'r_box_opened', 'Opened the box'), ('recipient', 4, 'r_pizza_completed', 'Ate all six slices'),
        ('recipient', 5, 'r_send_back_started', 'Started a pizza back'), ('recipient', 6, 'r_send_back', 'Sent a pizza back')) s(funnel, step, metric, label)),
    'goals', (select coalesce(jsonb_agg(to_jsonb(g)), '[]'::jsonb) from sot_metrics_goals(p_real) g),
    'history', (select coalesce(jsonb_agg(to_jsonb(h)), '[]'::jsonb) from sot_metrics_goal_history(p_real) h),
    'status', (select to_jsonb(s) from sot_metrics_status() s),
    'budget', jsonb_build_object('month_start', v_month,
      'emails', coalesce((select sum(value) from metrics_daily where scope = 'all' and metric = 'emails_sent' and day >= v_month), 0),
      'budget', coalesce((v_cfg->>'brevo_budget')::int, 10000)));
end $$;

revoke all on function public.sot_metrics_is_admin(bigint) from public, anon, authenticated;
revoke all on function public.sot_metrics_report(date, date, boolean) from public, anon, authenticated;
grant execute on function public.sot_metrics_is_admin(bigint) to service_role;
grant execute on function public.sot_metrics_report(date, date, boolean) to service_role;

do $$ begin
  if not public.sot_metrics_is_admin(20) then raise exception 'owner account 20 is not an admin'; end if;
  if public.sot_metrics_is_admin(19) then raise exception 'account 19 should not be an admin'; end if;
  if jsonb_typeof(public.sot_metrics_report(null, null, true)->'summary') <> 'array' then raise exception 'report has no summary'; end if;
end $$;
