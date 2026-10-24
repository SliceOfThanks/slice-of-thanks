-- Delete my account and data (Stacey, 2026-10-24). Additive.
-- Removes everything the member made or stored: People, pizzas, sends and their pages, calendars, presets, automations and settings.
-- Kept: payment records (purchases, credit ledger) and the terms acceptance record, which we must keep for tax and legal reasons.
-- The members row stays as an empty shell marked closed so those records still point somewhere.
create table if not exists account_deletions (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null,
  bd_user_id bigint not null,
  plan_key text,
  image_urls jsonb not null default '[]'::jsonb,
  counts jsonb not null default '{}'::jsonb,
  bd_deleted boolean not null default false,
  bd_error text,
  created_at timestamptz not null default now()
);
alter table account_deletions enable row level security;
revoke all on account_deletions from public, anon, authenticated;

create or replace function sot_delete_member(p_member uuid) returns jsonb
language plpgsql security definer set search_path = public, vault as $$
declare v_m members; v_imgs jsonb; v_counts jsonb := '{}'::jsonb; v_n int; v_id uuid;
begin
  select * into v_m from members where id = p_member for update;
  if not found then return jsonb_build_object('ok', false, 'code', 'not_found'); end if;
  if v_m.status = 'closed' then return jsonb_build_object('ok', true, 'already', true); end if;
  -- A paid plan is cancelled first on our checkout, so nobody is billed for an account that is gone
  if v_m.plan_key <> 'free' then return jsonb_build_object('ok', false, 'code', 'cancel_plan_first', 'plan', v_m.plan_key); end if;

  -- Images on Publitio: listed so the admin can remove them there
  select coalesce(jsonb_agg(distinct u) filter (where u is not null and u <> ''), '[]'::jsonb) into v_imgs from (
    select v_m.logo_url u
    union all select p.snapshot->>'image_url' from pizzas p where p.member_id = p_member
    union all select p.snapshot->'box'->>'photo_url' from pizzas p where p.member_id = p_member
    union all select p.snapshot->'sender'->>'logo_url' from pizzas p where p.member_id = p_member
  ) x;

  -- Calendar tokens in the vault
  delete from vault.secrets where id in (select token_vault_id from integrations where member_id = p_member and token_vault_id is not null);
  delete from integrations where member_id = p_member;
  delete from oauth_states where member_id = p_member;
  delete from meetings where member_id = p_member;
  get diagnostics v_n = row_count; v_counts := v_counts || jsonb_build_object('meetings', v_n);

  -- Sends: the payment ledger keeps its lines but lets go of the send
  update credit_ledger set send_id = null where send_id in (select id from sends where member_id = p_member);
  delete from sends where member_id = p_member;
  get diagnostics v_n = row_count; v_counts := v_counts || jsonb_build_object('sends', v_n);
  delete from pizzas where member_id = p_member;
  delete from box_presets where member_id = p_member;
  delete from automations where member_id = p_member;
  delete from webhook_endpoints where member_id = p_member;
  delete from consent_records where recorded_by = p_member;
  delete from contacts where member_id = p_member;
  get diagnostics v_n = row_count; v_counts := v_counts || jsonb_build_object('contacts', v_n);
  delete from events where member_id = p_member;
  -- Unsubscribes stay so nobody who opted out gets mail again; they no longer point to this member
  update suppressions set member_id = null where member_id = p_member;

  update members set display_name = null, business_name = null, mailing_address = null, reply_to = null, logo_url = null,
    brand_color_1 = null, brand_color_2 = null, prefs = '{}'::jsonb, team_id = null, status = 'closed', updated_at = now()
  where id = p_member;

  insert into account_deletions(member_id, bd_user_id, plan_key, image_urls, counts)
  values (p_member, v_m.bd_user_id, v_m.plan_key, v_imgs, v_counts) returning id into v_id;
  return jsonb_build_object('ok', true, 'deletion_id', v_id, 'counts', v_counts, 'images', jsonb_array_length(v_imgs));
end $$;

-- Someone who signs in again after closing their account starts fresh
do $$ declare d text := pg_get_functiondef('sot_session(jsonb)'::regprocedure); begin
  if position('members.status = ''closed''' in d) = 0 then
    d := replace(d, 'display_name = coalesce(members.display_name, excluded.display_name), updated_at = now()',
      'display_name = coalesce(members.display_name, excluded.display_name), status = case when members.status = ''closed'' then ''active'' else members.status end, updated_at = now()');
    execute d;
  end if;
end $$;

create or replace function sot_deletion_bd(p_id uuid, p_ok boolean, p_error text) returns void
language sql security definer set search_path = public as $$
  update account_deletions set bd_deleted = p_ok, bd_error = left(p_error, 300) where id = p_id;
$$;

revoke all on function sot_delete_member(uuid) from public, anon, authenticated;
grant execute on function sot_delete_member(uuid) to service_role;
revoke all on function sot_deletion_bd(uuid, boolean, text) from public, anon, authenticated;
grant execute on function sot_deletion_bd(uuid, boolean, text) to service_role;
