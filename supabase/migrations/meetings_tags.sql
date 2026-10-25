-- After a meeting: two weeks on Home, pizzas planned ahead, and "only people with these tags" (Stacey, 2026-10-25). Additive.
-- prefs.after_meeting adds 'tags'; prefs.after_meeting_tags is the list of tags. A meeting gets the signature pizza
-- when its guest's email is a person in People with one of those tags. The member can still untick any one meeting on Home.

-- Settings: save the tags mode and the tags
do $$ declare d text := pg_get_functiondef('sot_update_profile(uuid,jsonb)'::regprocedure); begin
  if position('after_meeting_tags' in d) = 0 then
    d := replace(d, $a$p->'prefs'->>'after_meeting' in ('ask','auto','off') then$a$, $a$p->'prefs'->>'after_meeting' in ('ask','auto','off','tags') then$a$);
    d := replace(d, $a$v_prefs := v_prefs || jsonb_build_object('after_meeting', p->'prefs'->>'after_meeting');$a$,
      $a$v_prefs := v_prefs || jsonb_build_object('after_meeting', p->'prefs'->>'after_meeting');
  end if;
  if jsonb_typeof(p->'prefs') = 'object' and jsonb_typeof(p->'prefs'->'after_meeting_tags') = 'array' then
    v_prefs := v_prefs || jsonb_build_object('after_meeting_tags', to_jsonb(sot_clean_tags(p->'prefs'->'after_meeting_tags')));$a$);
    execute d;
  end if;
end $$;

-- Does this meeting get a pizza on its own? Every meeting (auto), or only guests with one of the tags (tags)
create or replace function public.sot_meeting_auto(p_member uuid, p_email text) returns boolean
language sql stable security definer set search_path = public as $$
  select case coalesce(m.prefs->>'after_meeting', 'ask')
    when 'auto' then true
    when 'tags' then p_email is not null and exists (
      select 1 from contacts c where c.member_id = p_member and lower(c.email) = lower(p_email)
        and c.tags && array(select jsonb_array_elements_text(case when jsonb_typeof(m.prefs->'after_meeting_tags') = 'array' then m.prefs->'after_meeting_tags' else '[]'::jsonb end)))
    else false end
  from members m where m.id = p_member
$$;

-- Home: this week and next week, whether each meeting gets a pizza on its own, and a pizza planned ahead
create or replace function public.sot_calendar(p_member uuid) returns jsonb
language sql security definer set search_path = public as $$
  select jsonb_build_object(
    'integrations', coalesce((select jsonb_agg(jsonb_build_object('provider', provider, 'status', status, 'label', settings->>'label', 'last_sync_at', last_sync_at))
      from integrations where member_id = p_member and provider in ('calendly', 'tidycal')), '[]'::jsonb),
    'meetings', coalesce((select jsonb_agg(jsonb_build_object('id', m.id, 'provider', m.provider, 'title', m.title, 'starts_at', m.starts_at, 'ends_at', m.ends_at,
        'name', m.invitee_name, 'email', m.invitee_email, 'canceled', m.canceled, 'want_pizza', m.want_pizza, 'state', m.state, 'note', m.note,
        'auto_want', sot_meeting_auto(p_member, m.invitee_email),
        'send_id', m.send_id, 'send_status', s.status, 'send_at', s.scheduled_for,
        'opened', m.send_id is not null and exists (select 1 from events e where e.send_id = m.send_id and e.type like '%open%')) order by m.starts_at)
      from meetings m left join sends s on s.id = m.send_id
      where m.member_id = p_member and m.starts_at > now() - interval '2 days' and m.starts_at < now() + interval '15 days'
        and exists (select 1 from integrations i where i.member_id = p_member and i.provider = m.provider and i.status <> 'disconnected')), '[]'::jsonb))
$$;

-- Meetings that just ended: the tags mode joins every-meeting mode
create or replace function public.sot_meetings_ended(p_limit integer) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v jsonb;
begin
  with due as (
    select m.id from meetings m
    where m.state = 'upcoming' and not m.canceled and m.ends_at <= now() and m.ends_at > now() - interval '2 days'
    order by m.ends_at limit p_limit for update skip locked
  ), upd as (
    update meetings m set state = 'ended', updated_at = now() from due where m.id = due.id returning m.*
  )
  select coalesce(jsonb_agg(jsonb_build_object('id', u.id, 'member_id', u.member_id, 'title', u.title, 'name', u.invitee_name, 'email', u.invitee_email,
    'want', coalesce(u.want_pizza, x.plan <> 'free' and sot_meeting_auto(u.member_id, u.invitee_email)),
    'auto', coalesce((select pf.enabled from plan_features pf where pf.env = 'live' and pf.plan_key = x.plan and pf.feature_key = 'automations'), false),
    'signature', mb.prefs->'signature', 'reply_to', mb.reply_to,
    'return_path', (select i.settings->>'return_path' from integrations i where i.member_id = u.member_id and i.provider = u.provider))), '[]'::jsonb)
  into v
  from upd u join members mb on mb.id = u.member_id cross join lateral (select sot_effective_plan(u.member_id) as plan) x;
  return v;
end $$;

revoke all on function public.sot_meeting_auto(uuid, text) from public, anon, authenticated;
grant execute on function public.sot_meeting_auto(uuid, text) to service_role;
