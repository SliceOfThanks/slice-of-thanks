-- Analytics dashboard (Stacey, 2026-10-27). Totals are worked out every 2 hours and on demand (Refresh, once every 5 minutes).
-- Goals are scored Met, On track, Behind or Missed. Only counts are kept here: no recipient name or email.
-- Stacey's own and test accounts are left out of "real" numbers (testers table, exclude lists in app_settings analytics).
insert into public.app_settings(env, key, value)
select e, 'analytics', '{"tz": "America/Los_Angeles", "exclude_domains": ["lawfecta.com", "legalstacey.com"], "exclude_bd_user_ids": [], "refresh_cooldown_s": 300, "window_days": 45, "brevo_budget": 10000}'::jsonb
from (values ('live'), ('staging')) v(e)
on conflict do nothing;

create table if not exists metrics_daily (
  day date not null,
  scope text not null check (scope in ('real', 'all')),
  metric text not null,
  value numeric not null default 0,
  updated_at timestamptz not null default now(),
  primary key (scope, metric, day)
);
create table if not exists metric_targets (
  id uuid primary key default gen_random_uuid(),
  metric text not null,
  period text not null check (period in ('week', 'month', 'quarter')),
  target numeric not null check (target >= 0),
  better text not null default 'higher' check (better in ('higher', 'lower')),
  starts_on date not null,
  ended_on date,
  nonce text unique,
  created_at timestamptz not null default now()
);
create table if not exists metrics_runs (
  id bigserial primary key,
  trigger text not null check (trigger in ('auto', 'manual', 'backfill')),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  ok boolean,
  from_day date,
  to_day date,
  rows_written int,
  error text
);
alter table metrics_daily enable row level security;
alter table metric_targets enable row level security;
alter table metrics_runs enable row level security;
revoke all on metrics_daily, metric_targets, metrics_runs from public, anon, authenticated;
revoke all on sequence metrics_runs_id_seq from public, anon, authenticated;

-- The pizza's source (kitchen, people, csv, dates, ...) is kept on its send_accepted event from now on
do $$
declare d text;
begin
  select pg_get_functiondef('public.sot_create_send(uuid, text, uuid, text, text, jsonb)'::regprocedure) into d;
  if position('insert into events(type, member_id, send_id, is_test) values (''send_accepted'', p_member, p_send_id, v_test);' in d) = 0 then raise exception 'create_send anchor not found'; end if;
  execute replace(d, 'insert into events(type, member_id, send_id, is_test) values (''send_accepted'', p_member, p_send_id, v_test);',
    'insert into events(type, member_id, send_id, is_test, props) values (''send_accepted'', p_member, p_send_id, v_test, jsonb_strip_nulls(jsonb_build_object(''source'', p->>''source'')));');
  if position('jsonb_build_object(''source'', p->>''source'')' in pg_get_functiondef('public.sot_create_send(uuid, text, uuid, text, text, jsonb)'::regprocedure)) = 0 then raise exception 'create_send not updated'; end if;
end $$;

-- Members counted by the dashboard; is_real = not Stacey's own or a test account
create or replace function public.sot_metrics_members() returns table(id uuid, created_at timestamptz, is_real boolean)
language sql stable security definer set search_path = public as $$
  with c as (select coalesce(sot_setting('live', 'analytics'), '{}'::jsonb) v),
       doms as (select x from c, jsonb_array_elements_text(coalesce(c.v->'exclude_domains', '[]'::jsonb)) x),
       ids as (select x::bigint x from c, jsonb_array_elements_text(coalesce(c.v->'exclude_bd_user_ids', '[]'::jsonb)) x)
  select m.id, m.created_at,
    not coalesce(m.bd_user_id in (select t.bd_user_id from testers t)
      or m.bd_user_id in (select x from ids)
      or split_part(lower(coalesce(m.reply_to, '')), '@', 2) in (select x from doms)
      or split_part(lower(coalesce(m.reply_verified, '')), '@', 2) in (select x from doms), false)
  from members m where m.bd_user_id >= 0;
$$;

-- What each metric is. kind: count, money, rate (num / den as a percent), live (worked out from the app tables), now (today's state)
create or replace function public.sot_metrics_catalog()
returns table(metric text, label text, area text, sort int, kind text, num text, den text, better text, definition text)
language sql immutable as $$
  select * from (values
    ('new_members', 'New members', 'growth', 10, 'count', null, null, 'higher', 'Accounts created.'),
    ('src_partner', 'From partners', 'source', 11, 'count', null, null, 'higher', 'New members who came through a Partnero partner link.'),
    ('src_referral', 'From referral links', 'source', 12, 'count', null, null, 'higher', 'New members who came through a member''s referral link.'),
    ('src_appsumo', 'From AppSumo', 'source', 13, 'count', null, null, 'higher', 'New members who have redeemed an AppSumo code.'),
    ('src_direct', 'Direct and other', 'source', 14, 'count', null, null, 'higher', 'Everyone else, including Product Hunt for now.'),
    ('first_pizza', 'First pizzas', 'activation', 20, 'count', null, null, 'higher', 'Members who sent their first real pizza (test sends do not count).'),
    ('rate_activation', 'Sent a pizza within 7 days', 'activation', 21, 'rate', 'activated_7d', 'new_members', 'higher', 'Share of new members who sent a real pizza within 7 days of signing up. Counted on the signup day.'),
    ('pizzas_sent', 'Pizzas delivered', 'usage', 30, 'count', null, null, 'higher', 'Real pizzas that reached the recipient''s inbox. Test sends are left out.'),
    ('active_senders', 'Active senders', 'usage', 31, 'live', null, null, 'higher', 'Members who delivered at least one real pizza in the period.'),
    ('pizzas_per_sender', 'Pizzas per active sender', 'usage', 32, 'live', null, null, 'higher', 'Pizzas delivered divided by active senders.'),
    ('test_sends', 'Test sends', 'usage', 33, 'count', null, null, 'higher', 'Free tests members sent to themselves.'),
    ('sends_failed', 'Failed sends', 'health', 34, 'count', null, null, 'lower', 'Pizzas that could not be delivered.'),
    ('r_box_opened', 'Boxes opened', 'recipients', 40, 'count', null, null, 'higher', 'Delivered pizzas whose box was opened. Counted on the day the pizza was delivered.'),
    ('rate_open', 'Open rate', 'recipients', 41, 'rate', 'r_box_opened', 'pizzas_sent', 'higher', 'Share of delivered pizzas whose box was opened.'),
    ('rate_six', 'Ate all six slices', 'recipients', 42, 'rate', 'r_pizza_completed', 'r_box_opened', 'higher', 'Share of opened boxes where all six slices were eaten.'),
    ('rate_gift', 'Gift revealed', 'recipients', 43, 'rate', 'r_gift_revealed', 'f_gift', 'higher', 'Share of pizzas with a gift where the gift was revealed.'),
    ('rate_gift_click', 'Gift clicked', 'recipients', 44, 'rate', 'r_gift_clicked', 'f_gift', 'higher', 'Share of pizzas with a gift where the gift link was clicked.'),
    ('rate_cta', 'Sender button clicked', 'recipients', 45, 'rate', 'r_cta_clicked', 'f_button', 'higher', 'Share of pizzas with a button where the button was clicked.'),
    ('rate_receipt', 'Receipt shared', 'recipients', 46, 'rate', 'r_receipt_shared', 'r_box_opened', 'higher', 'Share of opened boxes where Gerald''s receipt was shared.'),
    ('rate_send_back', 'Sent a pizza back', 'virality', 50, 'rate', 'r_send_back', 'r_box_opened', 'higher', 'Share of opened boxes where the recipient sent a pizza back.'),
    ('r_send_back', 'Pizzas sent back', 'virality', 51, 'count', null, null, 'higher', 'Recipients who sent a pizza back.'),
    ('referral_joined', 'Referral sign-ups', 'virality', 52, 'count', null, null, 'higher', 'Members who joined through a referral or partner link.'),
    ('referral_rewarded', 'Referral rewards given', 'virality', 53, 'count', null, null, 'higher', 'Referral rewards paid out.'),
    ('trials_started', 'Trials started', 'money', 60, 'count', null, null, 'higher', 'The Whole Pie 14 day trials started.'),
    ('packs_sold', 'Email packs sold', 'money', 61, 'count', null, null, 'higher', 'Email packs bought.'),
    ('special_sold', 'Special Delivery sold', 'money', 62, 'count', null, null, 'higher', 'Special Delivery upgrades bought.'),
    ('revenue_cents', 'Add-on sales', 'money', 63, 'money', null, null, 'higher', 'Money from packs and Special Delivery recorded in Supabase. Plan payments are in Brilliant Directories.'),
    ('refunds', 'Refunds', 'money', 64, 'count', null, null, 'lower', 'Purchases refunded.'),
    ('appsumo_codes', 'AppSumo codes redeemed', 'money', 65, 'count', null, null, 'higher', 'AppSumo codes redeemed.'),
    ('appsumo_tier_1', 'AppSumo: first code', 'money', 66, 'count', null, null, 'higher', 'Members who redeemed their first code (100 emails a month).'),
    ('appsumo_tier_2', 'AppSumo: second code', 'money', 67, 'count', null, null, 'higher', 'Members who stacked a second code (300 emails a month).'),
    ('appsumo_tier_3', 'AppSumo: third code', 'money', 68, 'count', null, null, 'higher', 'Members who stacked a third code (750 emails a month).'),
    ('appsumo_failed', 'AppSumo code errors', 'health', 69, 'count', null, null, 'lower', 'Codes typed wrong or already used.'),
    ('emails_sent', 'Emails sent', 'health', 70, 'count', null, null, 'lower', 'All emails sent, pizzas and account emails. Brevo budget is 10,000 a month.'),
    ('email_fallback', 'Backup email provider used', 'health', 71, 'count', null, null, 'lower', 'Emails that went out through the backup provider.'),
    ('f_gerald', 'Made by Gerald', 'feature', 80, 'count', null, null, 'higher', 'Pizzas Gerald made (Hire Gerald).'),
    ('f_gift', 'Gift', 'feature', 81, 'count', null, null, 'higher', 'Pizzas with a gift.'),
    ('f_button', 'Sender button', 'feature', 82, 'count', null, null, 'higher', 'Pizzas with the sender''s button.'),
    ('f_logo', 'Logo', 'feature', 83, 'count', null, null, 'higher', 'Pizzas with a business logo.'),
    ('f_personal', 'Personal box', 'feature', 84, 'count', null, null, 'higher', 'Personal pizzas.'),
    ('f_photo', 'Photo', 'feature', 85, 'count', null, null, 'higher', 'Personal pizzas with a photo.'),
    ('f_pro_style', 'Pro box style', 'feature', 86, 'count', null, null, 'higher', 'Pizzas with a Pro box style or confetti.'),
    ('f_topper', 'Box topper', 'feature', 87, 'count', null, null, 'higher', 'Pizzas with a seasonal box topper.'),
    ('f_special', 'Special Delivery', 'feature', 88, 'count', null, null, 'higher', 'Pizzas sent with Special Delivery.'),
    ('f_meeting', 'After a meeting', 'feature', 89, 'count', null, null, 'higher', 'Pizzas sent for a calendar meeting.'),
    ('f_date', 'Birthday or anniversary', 'feature', 90, 'count', null, null, 'higher', 'Pizzas Gerald sent for a date.'),
    ('f_people', 'From People', 'feature', 91, 'count', null, null, 'higher', 'Pizzas sent from the People tab (counted from 2026-10-27).'),
    ('f_list', 'From a list', 'feature', 92, 'count', null, null, 'higher', 'Pizzas sent from a CSV or group list (counted from 2026-10-27).'),
    ('f_automation', 'Automation', 'feature', 93, 'count', null, null, 'higher', 'Pizzas sent by an automation.'),
    ('members_total', 'Members', 'now', 100, 'now', null, null, 'higher', 'Open accounts today.'),
    ('members_paid', 'Paid plan members', 'now', 101, 'now', null, null, 'higher', 'Members on The Whole Pie or Pizza Party today.'),
    ('members_appsumo', 'AppSumo lifetime members', 'now', 102, 'now', null, null, 'higher', 'Members with an AppSumo lifetime plan today.'),
    ('trials_active', 'Trials running', 'now', 103, 'now', null, null, 'higher', 'Trials running today.')
  ) t(metric, label, area, sort, kind, num, den, better, definition);
$$;

-- Works out the daily totals for a range of days (Pacific time), for both real and all members
create or replace function public.sot_metrics_compute(p_from date, p_to date) returns int
language plpgsql security definer set search_path = public as $$
declare v_tz text := coalesce(sot_setting('live', 'analytics')->>'tz', 'America/Los_Angeles'); v_n int;
begin
  update metrics_daily set value = 0, updated_at = now() where day between p_from and p_to;
  with mm as (select * from sot_metrics_members()),
  sd as (
    select s.id, s.member_id, mm.is_real, (s.sent_at at time zone v_tz)::date d, s.special_delivery, s.gift, s.automation_run_id, p.snapshot sn, a.source
    from sends s join mm on mm.id = s.member_id
    left join pizzas p on p.id = s.pizza_id
    left join lateral (select e.props->>'source' source from events e where e.send_id = s.id and e.type = 'send_accepted' limit 1) a on true
    where not s.is_test and s.sent_at is not null and s.status in ('sent', 'opened', 'completed')),
  re as (select r.send_id, array_agg(distinct r.type) t from recipient_events r group by r.send_id),
  sumo as (select redeemed_by id from appsumo_codes where redeemed_by is not null group by 1),
  firsts as (select member_id, bool_or(is_real) is_real, min(d) d from sd group by 1),
  items(d, metric, is_real, n) as (
    select (mm.created_at at time zone v_tz)::date, 'new_members', mm.is_real, 1::numeric from mm
    union all
    select (mm.created_at at time zone v_tz)::date,
      case when rf.partner_key is not null or rf.source = 'partner' then 'src_partner'
           when rf.referred_by is not null then 'src_referral'
           when su.id is not null then 'src_appsumo' else 'src_direct' end, mm.is_real, 1
    from mm left join referrals rf on rf.member_id = mm.id left join sumo su on su.id = mm.id
    union all
    select (mm.created_at at time zone v_tz)::date, 'activated_7d', mm.is_real, 1 from mm
    where exists (select 1 from sd where sd.member_id = mm.id and sd.d <= (mm.created_at at time zone v_tz)::date + 7)
    union all
    select f.d, 'first_pizza', f.is_real, 1 from firsts f
    union all
    select sd.d, 'pizzas_sent', sd.is_real, 1 from sd
    union all
    select (s.created_at at time zone v_tz)::date, case when s.is_test then 'test_sends' else 'sends_failed' end, mm.is_real, 1
    from sends s join mm on mm.id = s.member_id where s.is_test or s.status = 'failed'
    union all
    select sd.d, f.k, sd.is_real, 1 from sd cross join lateral (values
      ('f_gerald', sd.sn->'pizza'->>'byGerald' = 'true'),
      ('f_gift', jsonb_typeof(sd.gift) = 'object' and sd.gift <> '{}'::jsonb),
      ('f_button', coalesce(sd.sn->'box'->>'cta_url', '') <> ''),
      ('f_logo', coalesce(sd.sn->'box'->>'logo_url', '') <> ''),
      ('f_personal', sd.sn->'box'->>'personal' = 'true'),
      ('f_photo', coalesce(sd.sn->'box'->>'photo_url', '') <> ''),
      ('f_pro_style', sd.sn->'box'->>'pro_style' = 'true'),
      ('f_topper', coalesce(sd.sn->'box'->>'topper', '') <> ''),
      ('f_special', coalesce(sd.special_delivery, false)),
      ('f_meeting', exists (select 1 from meetings m where m.send_id = sd.id)),
      ('f_date', exists (select 1 from date_pizzas dp where dp.send_id = sd.id)),
      ('f_people', sd.source = 'people'),
      ('f_list', sd.source = 'csv'),
      ('f_automation', sd.automation_run_id is not null)) f(k, on_)
    where f.on_
    union all
    select sd.d, 'r_' || x, sd.is_real, 1 from sd join re on re.send_id = sd.id cross join lateral unnest(re.t) x
    where x in ('link_opened', 'box_opened', 'pizza_completed', 'gift_revealed', 'gift_clicked', 'cta_clicked', 'receipt_shared', 'send_back_started', 'send_back')
    union all
    select (e.created_at at time zone v_tz)::date,
      case e.type when 'trial_started' then 'trials_started' when 'appsumo_redeemed' then 'appsumo_codes' else e.type end, mm.is_real, 1
    from events e join mm on mm.id = e.member_id
    where e.type in ('trial_started', 'referral_joined', 'referral_rewarded', 'appsumo_redeemed', 'appsumo_failed')
    union all
    select (e.created_at at time zone v_tz)::date, 'appsumo_tier_' || (e.props->>'codes'), mm.is_real, 1
    from events e join mm on mm.id = e.member_id
    where e.type = 'appsumo_redeemed' and e.props->>'codes' in ('1', '2', '3')
    union all
    select (pu.created_at at time zone v_tz)::date, k.metric, mm.is_real, k.n
    from purchases pu join mm on mm.id = pu.member_id
    cross join lateral (values
      (case when pu.product_key like 'pack%' then 'packs_sold' when pu.product_key = 'special_delivery' then 'special_sold' else 'other_sold' end, 1::numeric),
      ('revenue_cents', coalesce(pu.amount_cents, 0)::numeric)) k(metric, n)
    union all
    select (pu.refunded_at at time zone v_tz)::date, 'refunds', mm.is_real, 1
    from purchases pu join mm on mm.id = pu.member_id where pu.refunded_at is not null
    union all
    -- Emails count against the Brevo budget whoever they went to
    select (e.created_at at time zone v_tz)::date, e.type, true, 1 from events e where e.type in ('email_sent', 'email_fallback')
  ),
  agg as (
    select d, 'all'::text scope, case metric when 'email_sent' then 'emails_sent' else metric end metric, sum(n) v
    from items where d between p_from and p_to group by 1, 3
    union all
    select d, 'real'::text, case metric when 'email_sent' then 'emails_sent' else metric end, sum(n)
    from items where is_real and d between p_from and p_to group by 1, 3
  )
  insert into metrics_daily(day, scope, metric, value, updated_at)
  select d, scope, metric, v, now() from agg
  on conflict (scope, metric, day) do update set value = excluded.value, updated_at = now();
  get diagnostics v_n = row_count;
  return v_n;
end $$;

-- Runs the totals: auto (every 2 hours), manual (Refresh, once every 5 minutes), backfill (everything since launch)
create or replace function public.sot_metrics_refresh(p_trigger text default 'auto') returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_cfg jsonb := coalesce(sot_setting('live', 'analytics'), '{}'::jsonb);
  v_tz text := coalesce(v_cfg->>'tz', 'America/Los_Angeles');
  v_today date := (now() at time zone coalesce(v_cfg->>'tz', 'America/Los_Angeles'))::date;
  v_cool int := coalesce((v_cfg->>'refresh_cooldown_s')::int, 300);
  v_trigger text := case when p_trigger in ('auto', 'manual', 'backfill') then p_trigger else 'manual' end;
  v_from date; v_last timestamptz; v_id bigint; v_n int;
begin
  perform pg_advisory_xact_lock(hashtext('sot_metrics_refresh'));
  if v_trigger = 'manual' then
    select max(started_at) into v_last from metrics_runs where trigger = 'manual';
    if v_last > now() - make_interval(secs => v_cool) then
      return jsonb_build_object('ok', false, 'code', 'cooldown', 'ready_at', v_last + make_interval(secs => v_cool));
    end if;
  end if;
  v_from := case when v_trigger = 'backfill'
    then coalesce((select min((created_at at time zone v_tz)::date) from members), v_today)
    else v_today - coalesce((v_cfg->>'window_days')::int, 45) end;
  insert into metrics_runs(trigger, from_day, to_day) values (v_trigger, v_from, v_today) returning id into v_id;
  begin
    v_n := sot_metrics_compute(v_from, v_today);
    update metrics_runs set finished_at = clock_timestamp(), ok = true, rows_written = v_n where id = v_id;
  exception when others then
    update metrics_runs set finished_at = clock_timestamp(), ok = false, error = left(sqlerrm, 300) where id = v_id;
  end;
  return (select jsonb_build_object('ok', r.ok, 'trigger', r.trigger, 'finished_at', r.finished_at, 'error', r.error) from metrics_runs r where r.id = v_id);
end $$;

-- One metric over a range of days
create or replace function public.sot_metrics_value(p_metric text, p_from date, p_to date, p_real boolean) returns numeric
language plpgsql stable security definer set search_path = public as $$
declare c record; v_scope text := case when p_real then 'real' else 'all' end; v_tz text := coalesce(sot_setting('live', 'analytics')->>'tz', 'America/Los_Angeles'); a numeric; b numeric;
begin
  select * into c from sot_metrics_catalog() k where k.metric = p_metric;
  if c.metric is null then return null; end if;
  if c.kind = 'rate' then
    select sum(value) filter (where metric = c.num), sum(value) filter (where metric = c.den) into a, b
    from metrics_daily where scope = v_scope and metric in (c.num, c.den) and day between p_from and p_to;
    return case when coalesce(b, 0) = 0 then null else round(100 * coalesce(a, 0) / b, 1) end;
  elsif c.kind in ('count', 'money') then
    select coalesce(sum(value), 0) into a from metrics_daily where scope = v_scope and metric = p_metric and day between p_from and p_to;
    return case when c.kind = 'money' then round(a / 100, 2) else a end;
  elsif p_metric in ('active_senders', 'pizzas_per_sender') then
    select count(distinct s.member_id), count(*) into a, b
    from sends s join sot_metrics_members() mm on mm.id = s.member_id
    where not s.is_test and s.sent_at is not null and s.status in ('sent', 'opened', 'completed')
      and (s.sent_at at time zone v_tz)::date between p_from and p_to and (mm.is_real or not p_real);
    return case when p_metric = 'active_senders' then a when a = 0 then null else round(b / a, 1) end;
  elsif p_metric = 'members_total' then
    return (select count(*) from members m join sot_metrics_members() mm on mm.id = m.id where m.status = 'active' and (mm.is_real or not p_real));
  elsif p_metric = 'members_paid' then
    return (select count(*) from members m join sot_metrics_members() mm on mm.id = m.id where m.status = 'active' and m.plan_key in ('pro', 'team') and (mm.is_real or not p_real)
      and not exists (select 1 from plan_grants g where g.member_id = m.id and g.reason = 'appsumo'));
  elsif p_metric = 'members_appsumo' then
    return (select count(distinct g.member_id) from plan_grants g join sot_metrics_members() mm on mm.id = g.member_id where g.reason = 'appsumo' and (mm.is_real or not p_real));
  elsif p_metric = 'trials_active' then
    return (select count(distinct g.member_id) from plan_grants g join sot_metrics_members() mm on mm.id = g.member_id where g.reason = 'trial' and now() between g.starts_at and g.ends_at and (mm.is_real or not p_real));
  end if;
  return null;
end $$;

-- Every metric for the chosen days, with the same number of days just before for comparison
create or replace function public.sot_metrics_summary(p_from date, p_to date, p_real boolean)
returns table(metric text, label text, area text, sort int, kind text, better text, definition text, value numeric, prev numeric, prev_from date, prev_to date)
language sql stable security definer set search_path = public as $$
  select k.metric, k.label, k.area, k.sort, k.kind, k.better, k.definition,
    sot_metrics_value(k.metric, p_from, p_to, p_real),
    case when k.kind = 'now' then null else sot_metrics_value(k.metric, p_from - (p_to - p_from + 1), p_from - 1, p_real) end,
    p_from - (p_to - p_from + 1), p_from - 1
  from sot_metrics_catalog() k order by k.sort;
$$;

-- Day by day, for the trend charts
create or replace function public.sot_metrics_days(p_from date, p_to date, p_real boolean)
returns table(day date, new_members numeric, pizzas_sent numeric, boxes_opened numeric, emails_sent numeric)
language sql stable security definer set search_path = public as $$
  select g::date,
    coalesce(sum(m.value) filter (where m.metric = 'new_members'), 0),
    coalesce(sum(m.value) filter (where m.metric = 'pizzas_sent'), 0),
    coalesce(sum(m.value) filter (where m.metric = 'r_box_opened'), 0),
    coalesce(sum(m.value) filter (where m.metric = 'emails_sent'), 0)
  from generate_series(p_from, p_to, interval '1 day') g
  left join metrics_daily m on m.day = g::date and m.scope = case when p_real then 'real' else 'all' end
    and m.metric in ('new_members', 'pizzas_sent', 'r_box_opened', 'emails_sent')
  group by g order by g;
$$;

-- A goal's period that holds a day
create or replace function public.sot_metrics_period(p_period text, p_day date) returns table(p_start date, p_end date)
language sql immutable as $$
  select date_trunc(p_period, p_day::timestamp)::date,
    (date_trunc(p_period, p_day::timestamp) + case p_period when 'week' then interval '1 week' when 'month' then interval '1 month' else interval '3 months' end - interval '1 day')::date;
$$;

-- Met (reached, or ended at or past the target), On track, Behind, Missed, No data
create or replace function public.sot_metrics_score(p_kind text, p_better text, p_target numeric, p_value numeric, p_frac numeric, p_ended boolean) returns text
language sql immutable as $$
  select case
    when p_value is null then 'no_data'
    when p_ended then case when (p_better = 'higher' and p_value >= p_target) or (p_better = 'lower' and p_value <= p_target) then 'met' else 'missed' end
    when p_better = 'higher' and p_kind in ('count', 'money', 'live') and p_value >= p_target then 'met'
    when p_better = 'higher' and p_kind in ('count', 'money', 'live') then case when p_value >= p_target * p_frac then 'on_track' else 'behind' end
    when p_better = 'higher' then case when p_value >= p_target then 'on_track' else 'behind' end
    when p_kind in ('count', 'money') and p_value > p_target then 'missed'
    when p_value <= p_target then 'on_track'
    else 'behind' end;
$$;

-- Goals now: this period, last period and the share of the period gone
create or replace function public.sot_metrics_goals(p_real boolean)
returns table(id uuid, metric text, label text, kind text, period text, better text, target numeric, period_start date, period_end date,
  share_done numeric, value numeric, pace numeric, status text, prev_value numeric, prev_status text, starts_on date)
language sql stable security definer set search_path = public as $$
  with t as (select (now() at time zone coalesce(sot_setting('live', 'analytics')->>'tz', 'America/Los_Angeles'))::date today)
  select g.id, g.metric, k.label, k.kind, g.period, g.better, g.target, p.p_start, p.p_end,
    round((t.today - p.p_start + 1)::numeric / (p.p_end - p.p_start + 1), 3),
    v.value, round(g.target * (t.today - p.p_start + 1)::numeric / (p.p_end - p.p_start + 1), 1),
    sot_metrics_score(k.kind, g.better, g.target, v.value, (t.today - p.p_start + 1)::numeric / (p.p_end - p.p_start + 1), false),
    pv.value, case when pp.p_start < date_trunc(g.period, g.starts_on::timestamp)::date then null
      else sot_metrics_score(k.kind, g.better, g.target, pv.value, 1, true) end,
    g.starts_on
  from metric_targets g join sot_metrics_catalog() k on k.metric = g.metric cross join t
  cross join lateral sot_metrics_period(g.period, t.today) p
  cross join lateral sot_metrics_period(g.period, p.p_start - 1) pp
  cross join lateral (select sot_metrics_value(g.metric, p.p_start, least(p.p_end, t.today), p_real) value) v
  cross join lateral (select sot_metrics_value(g.metric, pp.p_start, pp.p_end, p_real) value) pv
  where g.ended_on is null
  order by k.sort, g.period;
$$;

-- Past results for every goal, ended goals included: up to 6 finished periods each
create or replace function public.sot_metrics_goal_history(p_real boolean)
returns table(id uuid, metric text, label text, period text, target numeric, better text, period_start date, period_end date, value numeric, status text, ended_on date)
language sql stable security definer set search_path = public as $$
  with t as (select (now() at time zone coalesce(sot_setting('live', 'analytics')->>'tz', 'America/Los_Angeles'))::date today)
  select g.id, g.metric, k.label, g.period, g.target, g.better, p.p_start, p.p_end, v.value,
    sot_metrics_score(k.kind, g.better, g.target, v.value, 1, true), g.ended_on
  from metric_targets g join sot_metrics_catalog() k on k.metric = g.metric cross join t
  cross join lateral generate_series(1, 6) n
  cross join lateral sot_metrics_period(g.period, (date_trunc(g.period, t.today::timestamp) - (n * case g.period when 'week' then interval '1 week' when 'month' then interval '1 month' else interval '3 months' end))::date) p
  cross join lateral (select sot_metrics_value(g.metric, p.p_start, p.p_end, p_real) value) v
  where p.p_start >= date_trunc(g.period, g.starts_on::timestamp)::date
    and (g.ended_on is null or p.p_start <= g.ended_on)
  order by k.sort, g.period, p.p_start desc;
$$;

-- Add or end a goal from the dashboard. Changing a goal ends the old one and adds a new one, so past results keep their target.
-- The nonce makes a repeated click save once.
create or replace function public.sot_metric_target_apply(p_action text, p_id uuid, p_metric text, p_period text, p_target numeric, p_better text, p_nonce text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_today date := (now() at time zone coalesce(sot_setting('live', 'analytics')->>'tz', 'America/Los_Angeles'))::date; v_id uuid;
begin
  if coalesce(p_action, '') = '' or coalesce(p_nonce, '') = '' then return jsonb_build_object('ok', true, 'code', 'nothing'); end if;
  if exists (select 1 from metric_targets where nonce = p_nonce) then return jsonb_build_object('ok', true, 'code', 'saved'); end if;
  if p_action in ('end', 'change') then
    update metric_targets set ended_on = v_today where id = p_id and ended_on is null;
    if p_action = 'end' then return jsonb_build_object('ok', true, 'code', 'ended'); end if;
  end if;
  if p_action not in ('add', 'change') then return jsonb_build_object('ok', false, 'code', 'bad_action'); end if;
  if not exists (select 1 from sot_metrics_catalog() k where k.metric = p_metric) then return jsonb_build_object('ok', false, 'code', 'bad_metric'); end if;
  if p_period not in ('week', 'month', 'quarter') then return jsonb_build_object('ok', false, 'code', 'bad_period'); end if;
  if p_target is null or p_target < 0 then return jsonb_build_object('ok', false, 'code', 'bad_target'); end if;
  insert into metric_targets(metric, period, target, better, starts_on, nonce)
  values (p_metric, p_period, p_target, case when p_better = 'lower' then 'lower' else 'higher' end, v_today, p_nonce)
  on conflict (nonce) do nothing returning id into v_id;
  return jsonb_build_object('ok', true, 'code', 'saved', 'id', v_id);
end $$;

-- When the totals last ran and when Refresh can be pressed again
create or replace function public.sot_metrics_status()
returns table(last_at timestamptz, last_trigger text, last_ok boolean, last_error text, last_good_at timestamptz, last_good_trigger text, refresh_ready_at timestamptz, next_auto_at timestamptz, tz text)
language sql stable security definer set search_path = public as $$
  with l as (select * from metrics_runs where finished_at is not null order by finished_at desc limit 1),
       g as (select * from metrics_runs where ok order by finished_at desc limit 1),
       m as (select max(started_at) + make_interval(secs => coalesce((sot_setting('live', 'analytics')->>'refresh_cooldown_s')::int, 300)) r from metrics_runs where trigger = 'manual')
  select l.finished_at, l.trigger, l.ok, l.error, g.finished_at, g.trigger, greatest(m.r, now()),
    (select min(h) + interval '7 minutes' from generate_series(date_trunc('hour', now()) - interval '1 hour', date_trunc('hour', now()) + interval '3 hours', interval '1 hour') h
      where extract(hour from h at time zone 'UTC')::int % 2 = 0 and h + interval '7 minutes' > now()),
    coalesce(sot_setting('live', 'analytics')->>'tz', 'America/Los_Angeles')
  from m left join l on true left join g on true;
$$;

do $$
declare f text;
begin
  foreach f in array array['sot_metrics_members()', 'sot_metrics_catalog()', 'sot_metrics_compute(date, date)', 'sot_metrics_refresh(text)',
    'sot_metrics_value(text, date, date, boolean)', 'sot_metrics_summary(date, date, boolean)', 'sot_metrics_days(date, date, boolean)',
    'sot_metrics_period(text, date)', 'sot_metrics_score(text, text, numeric, numeric, numeric, boolean)', 'sot_metrics_goals(boolean)',
    'sot_metrics_goal_history(boolean)', 'sot_metric_target_apply(text, uuid, text, text, numeric, text, text)', 'sot_metrics_status()'] loop
    execute format('revoke all on function public.%s from public, anon, authenticated', f);
    execute format('grant execute on function public.%s to service_role', f);
  end loop;
end $$;

-- Every 2 hours (7 minutes past even hours, UTC), then fill in everything since launch once
select cron.schedule('sot-metrics', '7 */2 * * *', 'select public.sot_metrics_refresh(''auto'')');
select public.sot_metrics_refresh('backfill');

do $$ begin
  if not exists (select 1 from cron.job where jobname = 'sot-metrics') then raise exception 'metrics job missing'; end if;
  if not exists (select 1 from metrics_runs where trigger = 'backfill' and ok) then raise exception 'backfill did not finish: %', (select error from metrics_runs order by id desc limit 1); end if;
end $$;
