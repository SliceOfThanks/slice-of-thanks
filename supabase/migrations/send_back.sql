-- Send one back (Stacey, 2026-10-26). Additive.
-- The Send one back button on a pizza carries the pizza's link token. When the person who got the pizza
-- opens the Kitchen signed in, the server looks up who sent it and adds that sender to their People
-- (name, business and reply email), so they never have to know or type the email.
-- A sender with no reply email gets their login email from BD filled in first (Edge Function), so this always works.
-- They are replying to someone who emailed them, so the email permission is recorded as an existing relationship.

create or replace function public.sot_send_back(p_member uuid, p_hash text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v sends; v_snap jsonb; v_sm members; v_name text; v_biz text; v_email text; v_id uuid; v_new boolean;
begin
  if p_hash is null or p_hash = '' then return jsonb_build_object('ok', false, 'code', 'not_found'); end if;
  select * into v from sends where recipient_token_hash = p_hash;
  if v.id is null or v.status in ('queued','sending','cancelled','skipped','failed','awaiting_approval') then
    return jsonb_build_object('ok', false, 'code', 'not_found'); end if;
  select snapshot into v_snap from pizzas where id = v.pizza_id;
  select * into v_sm from members where id = v.member_id;
  v_name := left(coalesce(nullif(trim(v_snap->'sender'->>'name'), ''), nullif(trim(v_sm.display_name), ''), 'Your pizza friend'), 120);
  v_biz := left(coalesce(nullif(trim(v_snap->'sender'->>'business'), ''), nullif(trim(v_sm.business_name), '')), 120);
  v_email := lower(coalesce(nullif(trim(v_sm.reply_to), ''), nullif(trim(v_snap->'sender'->>'reply_to'), '')));
  if v_email is null or position('@' in v_email) < 2 then
    return jsonb_build_object('ok', true, 'added', false, 'name', v_name, 'company', v_biz, 'email', null, 'sender_member_id', v.member_id, 'sender_bd_user_id', v_sm.bd_user_id);
  end if;
  v_new := not exists (select 1 from contacts where member_id = p_member and lower(email) = v_email);
  insert into contacts(member_id, name, email, company, source, tags)
  values (p_member, v_name, v_email, v_biz, 'send_back', array['Sent me a pizza'])
  on conflict (member_id, lower(email)) where email is not null do update set
    company = coalesce(contacts.company, excluded.company),
    tags = case when 'Sent me a pizza' = any(coalesce(contacts.tags, '{}')) then contacts.tags else coalesce(contacts.tags, '{}') || array['Sent me a pizza'] end,
    updated_at = now()
  returning id into v_id;
  if not exists (select 1 from consent_records where contact_id = v_id and channel = 'email') then
    insert into consent_records(contact_id, channel, basis, obtained_at, method, note, recorded_by)
    values (v_id, 'email', 'relationship', now(), 'Sent a pizza back', 'They sent this member a pizza first', p_member);
  end if;
  insert into events(type, member_id, props) values ('send_back_contact', p_member, jsonb_build_object('new', v_new, 'from_member', v.member_id));
  return jsonb_build_object('ok', true, 'added', v_new, 'id', v_id, 'name', (select name from contacts where id = v_id), 'company', v_biz, 'email', v_email);
end $$;

-- Where replies go starts as the member's login email when they have not set one
create or replace function public.sot_fill_reply_to(p_member uuid, p_email text) returns boolean
language plpgsql security definer set search_path = public as $$
declare v text := lower(nullif(trim(p_email), ''));
begin
  if v is null or position('@' in v) < 2 or position('.' in split_part(v, '@', 2)) < 2 or length(v) > 200 then return false; end if;
  update members set reply_to = v, updated_at = now() where id = p_member and (reply_to is null or reply_to = '');
  return found;
end $$;

revoke execute on function public.sot_send_back(uuid, text), public.sot_fill_reply_to(uuid, text) from anon, authenticated, public;
notify pgrst, 'reload schema';
