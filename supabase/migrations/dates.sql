-- Gerald never forgets a date (Stacey, 2026-10-25). Additive.
-- Members pick in Settings: off, have it waiting (every plan), or send it automatically (plans with automations).
-- At 8 AM in the member's time zone, on a person's birthday or work anniversary, the worker makes a Gerald pizza.
-- prefs.dates = { mode: off|wait|auto, birthdays: bool, anniversaries: bool, style: note style }, prefs.tz = IANA time zone.

create table if not exists date_pizzas (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references members(id) on delete cascade,
  contact_id uuid not null references contacts(id) on delete cascade,
  kind text not null check (kind in ('birthday', 'anniversary')),
  occurs_on date not null,
  state text not null default 'pending' check (state in ('pending', 'waiting', 'sent', 'skipped')),
  note text,
  payload jsonb,
  send_id uuid references sends(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (member_id, contact_id, kind, occurs_on)
);
create index if not exists date_pizzas_member on date_pizzas(member_id, state);
alter table date_pizzas enable row level security;
revoke all on date_pizzas from public, anon, authenticated;

-- Settings: the Dates card and the member's time zone
do $$ declare d text := pg_get_functiondef('sot_update_profile(uuid,jsonb)'::regprocedure); begin
  if position('''dates''' in d) = 0 then
    execute replace(d, '  update members set
    display_name', '  if jsonb_typeof(p->''prefs'') = ''object'' and jsonb_typeof(p->''prefs''->''dates'') = ''object'' then
    v_prefs := v_prefs || jsonb_build_object(''dates'', jsonb_build_object(
      ''mode'', case when p->''prefs''->''dates''->>''mode'' in (''off'',''wait'',''auto'') then p->''prefs''->''dates''->>''mode'' else ''off'' end,
      ''birthdays'', coalesce((p->''prefs''->''dates''->>''birthdays'')::boolean, true),
      ''anniversaries'', coalesce((p->''prefs''->''dates''->>''anniversaries'')::boolean, true),
      ''style'', case when p->''prefs''->''dates''->>''style'' in (''heartfelt'',''funny'',''snarky'',''polished'',''short'') then p->''prefs''->''dates''->>''style'' else ''heartfelt'' end));
  end if;
  if jsonb_typeof(p->''prefs'') = ''object'' and exists (select 1 from pg_timezone_names where name = p->''prefs''->>''tz'') then
    v_prefs := v_prefs || jsonb_build_object(''tz'', p->''prefs''->>''tz'');
  end if;
  update members set
    display_name');
  end if;
end $$;

-- This year's date for a stored YYYY-MM-DD (or 0000-MM-DD). February 29 falls on February 28 in other years.
create or replace function sot_date_this_year(p text, p_year int) returns date
language sql immutable set search_path = public as $$
  select case when p is null or p !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then null
    when substr(p, 6, 5) = '02-29' and not (p_year % 4 = 0 and (p_year % 100 <> 0 or p_year % 400 = 0)) then make_date(p_year, 2, 28)
    else make_date(p_year, substr(p, 6, 2)::int, substr(p, 9, 2)::int) end
$$;

-- Dates due now: members whose local time is 8 AM or later today, people whose birthday or anniversary is today,
-- not yet handled. Claims them by inserting a pending row, so a date is only ever handled once.
create or replace function sot_dates_due(p_limit int) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v jsonb;
begin
  with mem as (
    select m.id, m.prefs, m.reply_to, m.display_name, m.business_name, m.send_as,
      coalesce(m.prefs->>'tz', 'America/New_York') tz,
      (now() at time zone coalesce(m.prefs->>'tz', 'America/New_York')) local_now
    from members m
    where m.status = 'active' and m.prefs->'dates'->>'mode' in ('wait', 'auto')
  ), cand as (
    select mem.id member_id, c.id contact_id, k.kind, mem.local_now::date occurs_on
    from mem join contacts c on c.member_id = mem.id and c.email is not null
    cross join lateral (values ('birthday', c.birthday, coalesce((mem.prefs->'dates'->>'birthdays')::boolean, true)),
                               ('anniversary', c.anniversary, coalesce((mem.prefs->'dates'->>'anniversaries')::boolean, true))) k(kind, d, on_)
    where k.on_ and extract(hour from mem.local_now) >= 8
      and sot_date_this_year(k.d, extract(year from mem.local_now)::int) = mem.local_now::date
    limit p_limit
  ), claimed as (
    insert into date_pizzas(member_id, contact_id, kind, occurs_on)
    select member_id, contact_id, kind, occurs_on from cand
    on conflict (member_id, contact_id, kind, occurs_on) do nothing
    returning *
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', d.id, 'member_id', d.member_id, 'kind', d.kind, 'occurs_on', d.occurs_on,
    'contact', jsonb_build_object('id', c.id, 'name', c.name, 'email', c.email, 'company', c.company, 'role', c.role, 'vegan', c.vegan, 'country', c.country,
      'years', case when d.kind = 'anniversary' and substr(c.anniversary, 1, 4) <> '0000' then extract(year from d.occurs_on)::int - substr(c.anniversary, 1, 4)::int end),
    'has_consent', exists (select 1 from consent_records r where r.contact_id = c.id and r.channel = 'email'),
    'mode', mb.prefs->'dates'->>'mode', 'style', coalesce(mb.prefs->'dates'->>'style', 'heartfelt'),
    'auto', coalesce((select pf.enabled from plan_features pf where pf.env = 'live' and pf.plan_key = sot_effective_plan(d.member_id) and pf.feature_key = 'automations'), false),
    'signature_box', mb.prefs->'signature'->'box', 'member_name', mb.display_name, 'reply_to', mb.reply_to,
    'vegan_default', coalesce((mb.prefs->>'vegan_default')::boolean, false))), '[]'::jsonb)
  into v
  from claimed d join contacts c on c.id = d.contact_id join members mb on mb.id = d.member_id;
  return v;
end $$;

create or replace function sot_date_result(p_id uuid, p_state text, p_note text, p_payload jsonb, p_send uuid) returns void
language sql security definer set search_path = public as $$
  update date_pizzas set state = p_state, note = left(p_note, 60), payload = coalesce(p_payload, payload), send_id = coalesce(p_send, send_id), updated_at = now()
  where id = p_id and p_state in ('waiting', 'sent', 'skipped')
$$;

-- Home: dates in the next 7 days and pizzas waiting to be sent
create or replace function sot_dates(p_member uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_today date; v_prefs jsonb;
begin
  select prefs, (now() at time zone coalesce(prefs->>'tz', 'America/New_York'))::date into v_prefs, v_today from members where id = p_member;
  return jsonb_build_object(
    'settings', coalesce(v_prefs->'dates', '{}'::jsonb), 'tz', v_prefs->>'tz', 'today', v_today,
    'upcoming', coalesce((select jsonb_agg(x order by x.on_day, x.name) from (
      select c.id contact_id, c.name, k.kind, n.on_day, (n.on_day - v_today) days_away,
        case when k.kind = 'anniversary' and substr(c.anniversary, 1, 4) <> '0000' then extract(year from n.on_day)::int - substr(c.anniversary, 1, 4)::int end years
      from contacts c
      cross join lateral (values ('birthday', c.birthday), ('anniversary', c.anniversary)) k(kind, d)
      cross join lateral (select coalesce(case when sot_date_this_year(k.d, extract(year from v_today)::int) >= v_today
        then sot_date_this_year(k.d, extract(year from v_today)::int) else sot_date_this_year(k.d, extract(year from v_today)::int + 1) end, null) on_day) n
      where c.member_id = p_member and k.d is not null and n.on_day between v_today and v_today + 7
      limit 50) x), '[]'::jsonb),
    'waiting', coalesce((select jsonb_agg(jsonb_build_object('id', d.id, 'kind', d.kind, 'occurs_on', d.occurs_on, 'note', d.note, 'payload', d.payload,
        'contact', jsonb_build_object('id', c.id, 'name', c.name, 'email', c.email, 'has_consent', exists (select 1 from consent_records r where r.contact_id = c.id and r.channel = 'email')))
        order by d.occurs_on desc)
      from date_pizzas d join contacts c on c.id = d.contact_id
      where d.member_id = p_member and d.state = 'waiting' and d.occurs_on > v_today - 14), '[]'::jsonb),
    'sent', coalesce((select jsonb_agg(jsonb_build_object('id', d.id, 'kind', d.kind, 'occurs_on', d.occurs_on, 'name', c.name))
      from date_pizzas d join contacts c on c.id = d.contact_id
      where d.member_id = p_member and d.state = 'sent' and d.occurs_on > v_today - 7), '[]'::jsonb));
end $$;

-- The member sent or skipped a waiting date pizza from Home
create or replace function sot_date_done(p_member uuid, p_id uuid, p_send uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  update date_pizzas set state = case when p_send is null then 'skipped' else 'sent' end, send_id = coalesce(p_send, send_id), updated_at = now()
  where id = p_id and member_id = p_member and state in ('waiting', 'pending');
  return jsonb_build_object('ok', found);
end $$;

create or replace function sot_date_get(p_member uuid, p_id uuid) returns jsonb
language sql security definer set search_path = public as $$
  select jsonb_build_object('id', d.id, 'kind', d.kind, 'state', d.state, 'payload', d.payload,
    'contact', jsonb_build_object('id', c.id, 'name', c.name, 'email', c.email, 'company', c.company, 'role', c.role, 'vegan', c.vegan, 'country', c.country))
  from date_pizzas d join contacts c on c.id = d.contact_id where d.id = p_id and d.member_id = p_member
$$;

-- Deleting an account removes its people, and their date pizzas go with them (on delete cascade)

revoke all on function sot_date_this_year(text, int) from public, anon, authenticated;
grant execute on function sot_date_this_year(text, int) to service_role;
revoke all on function sot_dates_due(int) from public, anon, authenticated;
grant execute on function sot_dates_due(int) to service_role;
revoke all on function sot_date_result(uuid, text, text, jsonb, uuid) from public, anon, authenticated;
grant execute on function sot_date_result(uuid, text, text, jsonb, uuid) to service_role;
revoke all on function sot_dates(uuid) from public, anon, authenticated;
grant execute on function sot_dates(uuid) to service_role;
revoke all on function sot_date_done(uuid, uuid, uuid) from public, anon, authenticated;
grant execute on function sot_date_done(uuid, uuid, uuid) to service_role;
revoke all on function sot_date_get(uuid, uuid) from public, anon, authenticated;
grant execute on function sot_date_get(uuid, uuid) to service_role;
