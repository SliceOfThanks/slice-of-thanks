-- Calendar connections (Stacey, 2026-10-24): each member connects their own Calendly or TidyCal account.
-- Meetings for the week show on Home. When a meeting the member picked ends:
--   The Whole Pie and Pizza Party (automations on): their signature pizza is sent to the guest.
--   A Slice: their signature pizza is made and waits on Home for them to send. Free sends are never automatic.
-- Tokens live in the vault, never in a table. Additive only.

-- One-time sign in handshakes. A state is good for 15 minutes and works once.
create table if not exists oauth_states (
  state text primary key,
  member_id uuid not null references members(id),
  provider text not null check (provider in ('calendly', 'tidycal')),
  return_path text,
  created_at timestamptz not null default now(),
  used_at timestamptz
);
alter table oauth_states enable row level security;

create table if not exists meetings (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references members(id),
  provider text not null check (provider in ('calendly', 'tidycal')),
  external_id text not null,
  title text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  invitee_name text,
  invitee_email text,
  canceled boolean not null default false,
  want_pizza boolean,                -- null means the member's default
  state text not null default 'upcoming' check (state in ('upcoming', 'ended', 'ready', 'sent', 'skipped')),
  note text,                         -- why a pizza did not go out, e.g. no_signature, no_email, no_credits
  send_id uuid references sends(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (member_id, provider, external_id)
);
alter table meetings enable row level security;
create index if not exists meetings_member_time on meetings (member_id, starts_at);
create index if not exists meetings_due on meetings (ends_at) where state = 'upcoming';

-- Start a connection: a random state tied to the member
create or replace function sot_oauth_start(p_member uuid, p_provider text, p_return text) returns text
language plpgsql security definer set search_path = public as $$
declare v_state text := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
begin
  if p_provider not in ('calendly', 'tidycal') then raise exception 'bad provider'; end if;
  insert into oauth_states(state, member_id, provider, return_path)
  values (v_state, p_member, p_provider,
    case when p_return like '/%' and p_return not like '//%' and length(p_return) < 200 then p_return end);
  return v_state;
end $$;

-- Finish a connection: returns the member and where to send them back, once
create or replace function sot_oauth_finish(p_state text, p_provider text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v oauth_states;
begin
  update oauth_states set used_at = now()
  where state = p_state and provider = p_provider and used_at is null and created_at > now() - interval '15 minutes'
  returning * into v;
  if v.state is null then return null; end if;
  return jsonb_build_object('member_id', v.member_id, 'return_path', v.return_path);
end $$;

-- Save a member's tokens in the vault and mark the calendar connected
create or replace function sot_integration_save(p_member uuid, p_provider text, p_account text, p_label text, p_tokens jsonb, p_return text)
returns void language plpgsql security definer set search_path = public as $$
declare v integrations; v_vault uuid;
begin
  select * into v from integrations where member_id = p_member and provider = p_provider;
  if v.token_vault_id is not null then
    perform vault.update_secret(v.token_vault_id, p_tokens::text);
    v_vault := v.token_vault_id;
  else
    v_vault := vault.create_secret(p_tokens::text, 'sot_int_' || p_provider || '_' || p_member::text, 'Calendar tokens for one member');
  end if;
  insert into integrations(member_id, provider, status, external_account_id, token_vault_id, settings, last_sync_at)
  values (p_member, p_provider, 'connected', left(p_account, 300), v_vault,
    jsonb_strip_nulls(jsonb_build_object('label', left(p_label, 120), 'return_path', p_return)), null)
  on conflict (member_id, provider) do update set status = 'connected', external_account_id = excluded.external_account_id,
    token_vault_id = excluded.token_vault_id, settings = integrations.settings || excluded.settings, last_sync_at = null;
end $$;

-- Tokens for the sync (service role only)
create or replace function sot_integration_tokens(p_member uuid, p_provider text) returns jsonb
language sql security definer set search_path = public as $$
  select jsonb_build_object('account', i.external_account_id, 'status', i.status,
    'tokens', (select decrypted_secret::jsonb from vault.decrypted_secrets where id = i.token_vault_id))
  from integrations i where i.member_id = p_member and i.provider = p_provider
$$;

create or replace function sot_integration_tokens_update(p_member uuid, p_provider text, p_tokens jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  select token_vault_id into v_id from integrations where member_id = p_member and provider = p_provider;
  if v_id is not null then perform vault.update_secret(v_id, p_tokens::text); end if;
end $$;

-- After a sync: record the time, or flag that the member needs to connect again
create or replace function sot_integration_synced(p_member uuid, p_provider text, p_ok boolean) returns void
language sql security definer set search_path = public as $$
  update integrations set last_sync_at = now(), status = case when p_ok then 'connected' else 'needs_reconnect' end
  where member_id = p_member and provider = p_provider and status <> 'disconnected'
$$;

-- Disconnect: the tokens are blanked in the vault and meetings stop syncing
create or replace function sot_integration_disconnect(p_member uuid, p_provider text) returns void
language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  select token_vault_id into v_id from integrations where member_id = p_member and provider = p_provider;
  if v_id is not null then perform vault.update_secret(v_id, '{}'); end if;
  update integrations set status = 'disconnected' where member_id = p_member and provider = p_provider;
  update meetings set state = 'skipped', note = 'disconnected', updated_at = now()
  where member_id = p_member and provider = p_provider and state = 'upcoming';
end $$;

-- Calendars to sync this minute
create or replace function sot_integrations_due(p_limit int) returns jsonb
language sql security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('member_id', member_id, 'provider', provider)), '[]'::jsonb) from (
    select member_id, provider from integrations
    where status = 'connected' and (last_sync_at is null or last_sync_at < now() - interval '10 minutes')
    order by last_sync_at nulls first limit p_limit) x
$$;

-- Save what the calendar returned. A meeting the member already set keeps their choice.
create or replace function sot_meetings_upsert(p_member uuid, p_provider text, p_items jsonb) returns integer
language plpgsql security definer set search_path = public as $$
declare r jsonb; n integer := 0;
begin
  for r in select * from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) loop
    insert into meetings(member_id, provider, external_id, title, starts_at, ends_at, invitee_name, invitee_email, canceled)
    values (p_member, p_provider, left(r->>'id', 300), left(r->>'title', 200), (r->>'starts_at')::timestamptz, (r->>'ends_at')::timestamptz,
      left(nullif(r->>'name', ''), 120), lower(left(nullif(trim(r->>'email'), ''), 200)), coalesce((r->>'canceled')::boolean, false))
    on conflict (member_id, provider, external_id) do update set title = excluded.title, starts_at = excluded.starts_at,
      ends_at = excluded.ends_at, invitee_name = coalesce(excluded.invitee_name, meetings.invitee_name),
      invitee_email = coalesce(excluded.invitee_email, meetings.invitee_email), canceled = excluded.canceled,
      state = case when excluded.canceled and meetings.state = 'upcoming' then 'skipped' else meetings.state end,
      note = case when excluded.canceled and meetings.state = 'upcoming' then 'canceled' else meetings.note end,
      updated_at = now();
    n := n + 1;
  end loop;
  return n;
end $$;

-- Home > This week, plus the connection status for Settings
create or replace function sot_calendar(p_member uuid) returns jsonb
language sql security definer set search_path = public as $$
  select jsonb_build_object(
    'integrations', coalesce((select jsonb_agg(jsonb_build_object('provider', provider, 'status', status, 'label', settings->>'label', 'last_sync_at', last_sync_at))
      from integrations where member_id = p_member and provider in ('calendly', 'tidycal')), '[]'::jsonb),
    'meetings', coalesce((select jsonb_agg(jsonb_build_object('id', m.id, 'provider', m.provider, 'title', m.title, 'starts_at', m.starts_at, 'ends_at', m.ends_at,
        'name', m.invitee_name, 'email', m.invitee_email, 'canceled', m.canceled, 'want_pizza', m.want_pizza, 'state', m.state, 'note', m.note,
        'send_id', m.send_id, 'opened', m.send_id is not null and exists (select 1 from events e where e.send_id = m.send_id and e.type like '%open%')) order by m.starts_at)
      from meetings m where m.member_id = p_member and m.starts_at > now() - interval '2 days' and m.starts_at < now() + interval '8 days'
        and exists (select 1 from integrations i where i.member_id = p_member and i.provider = m.provider and i.status <> 'disconnected')), '[]'::jsonb))
$$;

-- The member's pizza choice for one meeting
create or replace function sot_meeting_set(p_member uuid, p_id uuid, p_want boolean) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  update meetings set want_pizza = p_want, updated_at = now() where id = p_id and member_id = p_member and state = 'upcoming';
  if not found then return jsonb_build_object('ok', false, 'code', 'not_upcoming'); end if;
  return jsonb_build_object('ok', true);
end $$;

-- The member sent (or skipped) a waiting pizza from Home
create or replace function sot_meeting_done(p_member uuid, p_id uuid, p_send uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  update meetings set state = case when p_send is null then 'skipped' else 'sent' end, send_id = coalesce(p_send, send_id),
    note = case when p_send is null then 'skipped_by_member' else null end, updated_at = now()
  where id = p_id and member_id = p_member and state in ('ready', 'ended', 'upcoming');
  return jsonb_build_object('ok', found);
end $$;

-- Meetings that just ended, with what the worker needs to decide. Claimed by moving them out of upcoming.
create or replace function sot_meetings_ended(p_limit int) returns jsonb
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
    'want', coalesce(u.want_pizza, case when x.plan <> 'free' and coalesce(mb.prefs->>'after_meeting', 'ask') = 'auto' then true else false end),
    'auto', coalesce((select pf.enabled from plan_features pf where pf.env = 'live' and pf.plan_key = x.plan and pf.feature_key = 'automations'), false),
    'signature', mb.prefs->'signature', 'reply_to', mb.reply_to,
    'return_path', (select i.settings->>'return_path' from integrations i where i.member_id = u.member_id and i.provider = u.provider))), '[]'::jsonb)
  into v
  from upd u join members mb on mb.id = u.member_id cross join lateral (select sot_effective_plan(u.member_id) as plan) x;
  return v;
end $$;

create or replace function sot_meeting_result(p_id uuid, p_state text, p_note text, p_send uuid) returns void
language sql security definer set search_path = public as $$
  update meetings set state = p_state, note = left(p_note, 60), send_id = coalesce(p_send, send_id), updated_at = now()
  where id = p_id and p_state in ('ended', 'ready', 'sent', 'skipped')
$$;

-- The signature pizza lives on the account too, so it can go out when a meeting ends
create or replace function sot_save_signature(p_member uuid, p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if jsonb_typeof(p->'pizza') <> 'object' or length((p->'pizza')::text) > 60000 or length(coalesce(p->'box', '{}')::text) > 6000 then
    return jsonb_build_object('ok', false, 'code', 'too_big'); end if;
  update members set prefs = prefs || jsonb_build_object('signature', jsonb_strip_nulls(jsonb_build_object(
    'pizza', p->'pizza', 'box', p->'box', 'image_url', left(p->>'image_url', 500), 'saved_at', now()))), updated_at = now()
  where id = p_member;
  return jsonb_build_object('ok', true);
end $$;

-- Settings: After a meeting ends (ask, auto, off)
do $$
declare d text;
begin
  d := pg_get_functiondef('public.sot_update_profile(uuid,jsonb)'::regprocedure);
  if position('after_meeting' in d) = 0 then
    d := replace(d, $a$  update members set$a$, $a$  if jsonb_typeof(p->'prefs') = 'object' and p->'prefs'->>'after_meeting' in ('ask','auto','off') then
    v_prefs := v_prefs || jsonb_build_object('after_meeting', p->'prefs'->>'after_meeting');
  end if;
  update members set$a$);
    if position('after_meeting' in d) = 0 then raise exception 'sot_update_profile patch did not apply'; end if;
    execute d;
  end if;
end $$;

revoke all on function sot_oauth_start(uuid, text, text), sot_oauth_finish(text, text), sot_integration_save(uuid, text, text, text, jsonb, text),
  sot_integration_tokens(uuid, text), sot_integration_tokens_update(uuid, text, jsonb), sot_integration_synced(uuid, text, boolean),
  sot_integration_disconnect(uuid, text), sot_integrations_due(int), sot_meetings_upsert(uuid, text, jsonb), sot_calendar(uuid),
  sot_meeting_set(uuid, uuid, boolean), sot_meeting_done(uuid, uuid, uuid), sot_meetings_ended(int), sot_meeting_result(uuid, text, text, uuid),
  sot_save_signature(uuid, jsonb) from public, anon, authenticated;
grant execute on function sot_oauth_start(uuid, text, text), sot_oauth_finish(text, text), sot_integration_save(uuid, text, text, text, jsonb, text),
  sot_integration_tokens(uuid, text), sot_integration_tokens_update(uuid, text, jsonb), sot_integration_synced(uuid, text, boolean),
  sot_integration_disconnect(uuid, text), sot_integrations_due(int), sot_meetings_upsert(uuid, text, jsonb), sot_calendar(uuid),
  sot_meeting_set(uuid, uuid, boolean), sot_meeting_done(uuid, uuid, uuid), sot_meetings_ended(int), sot_meeting_result(uuid, text, text, uuid),
  sot_save_signature(uuid, jsonb) to service_role;
