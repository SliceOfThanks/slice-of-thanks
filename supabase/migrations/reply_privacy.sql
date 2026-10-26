-- Replies to pizza emails (Stacey, 2026-10-26, option A, optional).
-- A member's "Replies go to" address is used as the Reply-To only when it is confirmed and they chose "Replies come to me" (prefs.replies = 'me', the default).
-- Otherwise the email has no Reply-To and replies go to pizza@sliceofthanks.app.
-- Confirmed means: it is the BD login email (filled in automatically), or the member clicked the confirm link we emailed to it.
alter table members add column if not exists reply_verified text;
-- Addresses already in use were filled from the BD login email or typed by the member before launch: they keep working.
update members set reply_verified = lower(trim(reply_to)) where coalesce(trim(reply_to), '') <> '' and reply_verified is null;

create or replace function public.sot_reply_state(p_member uuid) returns jsonb
language sql security definer set search_path = public as $$
  select jsonb_build_object(
    'verified', coalesce(trim(m.reply_to), '') <> '' and lower(trim(m.reply_to)) = m.reply_verified,
    'replies', case when m.prefs->>'replies' = 'us' then 'us' else 'me' end)
  from members m where m.id = p_member;
$$;

-- Marks the address confirmed, only if it is still the member's "Replies go to" address
create or replace function public.sot_reply_verify(p_member uuid, p_email text) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  update members set reply_verified = lower(trim(p_email)), updated_at = now()
  where id = p_member and lower(trim(reply_to)) = lower(trim(p_email));
  return found;
end $$;

revoke all on function public.sot_reply_state(uuid) from public, anon, authenticated;
revoke all on function public.sot_reply_verify(uuid, text) from public, anon, authenticated;
grant execute on function public.sot_reply_state(uuid) to service_role;
grant execute on function public.sot_reply_verify(uuid, text) to service_role;

do $$
declare d text;
begin
  -- The login email filled in automatically is confirmed
  select pg_get_functiondef('public.sot_fill_reply_to(uuid, text)'::regprocedure) into d;
  if position('set reply_to = v, updated_at = now()' in d) = 0 then raise exception 'fill_reply_to anchor not found'; end if;
  execute replace(d, 'set reply_to = v, updated_at = now()', 'set reply_to = v, reply_verified = v, updated_at = now()');

  -- prefs.replies: 'me' (replies come to the member) or 'us' (replies go to Slice of Thanks)
  select pg_get_functiondef('public.sot_update_profile(uuid, jsonb)'::regprocedure) into d;
  if position('if jsonb_typeof(p->''prefs''->''birthday_pizza'') = ''boolean''' in d) = 0 then raise exception 'update_profile anchor not found'; end if;
  execute replace(d, 'if jsonb_typeof(p->''prefs''->''birthday_pizza'') = ''boolean''',
    'if p->''prefs''->>''replies'' in (''me'',''us'') then v_prefs := v_prefs || jsonb_build_object(''replies'', p->''prefs''->>''replies''); end if;
    if jsonb_typeof(p->''prefs''->''birthday_pizza'') = ''boolean''');

  -- The pizza email's Reply-To: only a confirmed address, and only when the member wants replies
  select pg_get_functiondef('public.sot_claim_send(uuid)'::regprocedure) into d;
  if position('''reply_to'', v_m.reply_to,' in d) = 0 then raise exception 'claim_send anchor not found'; end if;
  execute replace(d, '''reply_to'', v_m.reply_to,',
    '''reply_to'', case when coalesce(v_m.prefs->>''replies'', ''me'') <> ''us'' and lower(trim(v_m.reply_to)) = v_m.reply_verified then v_m.reply_to end,');

  if position('reply_verified = v' in pg_get_functiondef('public.sot_fill_reply_to(uuid, text)'::regprocedure)) = 0 then raise exception 'fill_reply_to not updated'; end if;
  if position('''replies''' in pg_get_functiondef('public.sot_update_profile(uuid, jsonb)'::regprocedure)) = 0 then raise exception 'update_profile not updated'; end if;
  if position('reply_verified' in pg_get_functiondef('public.sot_claim_send(uuid)'::regprocedure)) = 0 then raise exception 'claim_send not updated'; end if;
  if to_regprocedure('public.sot_reply_state(uuid)') is null or to_regprocedure('public.sot_reply_verify(uuid, text)') is null then raise exception 'reply functions missing'; end if;
end $$;

-- (follow-up) the state also carries the address, for the server's confirm email; the app never gets it from here
create or replace function public.sot_reply_state(p_member uuid) returns jsonb
language sql security definer set search_path = public as $$
  select jsonb_build_object(
    'verified', coalesce(trim(m.reply_to), '') <> '' and lower(trim(m.reply_to)) = m.reply_verified,
    'replies', case when m.prefs->>'replies' = 'us' then 'us' else 'me' end,
    'email', lower(trim(coalesce(m.reply_to, ''))))
  from members m where m.id = p_member;
$$;
