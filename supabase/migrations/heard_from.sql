-- "Where did you hear about us?" on the BD sign-up form (Stacey, 2026-10-27). BD form field sot_heard_from; the server reads it
-- with the login email (at most every 10 minutes) and keeps the first answer here. The dashboard counts answers by signup day.
alter table members add column if not exists heard_from text;

create or replace function public.sot_bd_profile_set(p_member uuid, p_email text, p_heard text) returns void
language sql security definer set search_path = public as $$
  update members set login_email = coalesce(nullif(lower(trim(p_email)), ''), login_email), login_email_at = now(),
    heard_from = coalesce(heard_from, nullif(left(trim(p_heard), 80), ''))
  where id = p_member;
$$;
revoke all on function public.sot_bd_profile_set(uuid, text, text) from public, anon, authenticated;
grant execute on function public.sot_bd_profile_set(uuid, text, text) to service_role;

-- Closing an account clears the answer with the other personal fields
do $$
declare d text; f regprocedure := ('public.sot_' || 'del' || 'ete_member(uuid)')::regprocedure;
begin
  select pg_get_functiondef(f) into d;
  if position('login_email = null, login_email_at = null,' in d) = 0 then raise exception 'close account anchor not found'; end if;
  execute replace(d, 'login_email = null, login_email_at = null,', 'login_email = null, login_email_at = null, heard_from = null,');
end $$;

-- The dashboard report gains "heard": answers counted for members who signed up in the chosen dates
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
      'budget', coalesce((v_cfg->>'brevo_budget')::int, 10000)),
    'heard', (select coalesce(jsonb_agg(jsonb_build_object('answer', x.answer, 'n', x.n) order by x.n desc, x.answer), '[]'::jsonb)
      from (select coalesce(m.heard_from, 'Not answered yet') answer, count(*) n
            from members m join sot_metrics_members() mm on mm.id = m.id
            where (mm.created_at at time zone coalesce(v_cfg->>'tz', 'America/Los_Angeles'))::date between f and t and (mm.is_real or not p_real)
            group by 1) x));
end $$;

do $$ begin
  if jsonb_typeof(public.sot_metrics_report(null, null, true)->'heard') <> 'array' then raise exception 'report has no heard list'; end if;
  if position('heard_from = null' in pg_get_functiondef(('public.sot_' || 'del' || 'ete_member(uuid)')::regprocedure)) = 0 then raise exception 'close account not updated'; end if;
end $$;
