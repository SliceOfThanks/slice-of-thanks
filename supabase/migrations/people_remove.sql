-- Remove people from People (Stacey, 2026-10-26). One person or many at once from the selection bar.
-- Their date pizza plans and consent notes go with them (foreign keys cascade). Past sends stay, with no person attached, so email counts and history totals do not change.
-- People with a scheduled pizza still waiting to go out are kept and counted in "kept", so nothing already paid for is lost.
create or replace function public.sot_remove_people(p_member uuid, p_ids uuid[]) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_ids uuid[]; v_kept int; v_n int;
begin
  select coalesce(array_agg(c.id), '{}') into v_ids from contacts c
  where c.member_id = p_member and c.id = any(coalesce(p_ids, '{}'))
    and not exists (select 1 from sends s where s.contact_id = c.id and s.status in ('awaiting_approval', 'queued', 'sending'));
  select count(*) into v_kept from contacts c where c.member_id = p_member and c.id = any(coalesce(p_ids, '{}')) and not (c.id = any(v_ids));
  delete from contacts where member_id = p_member and id = any(v_ids);
  get diagnostics v_n = row_count;
  insert into events(type, member_id, props) values ('people_removed', p_member, jsonb_build_object('removed', v_n, 'kept', v_kept));
  return jsonb_build_object('ok', true, 'removed', v_n, 'kept', v_kept);
end $$;
revoke all on function public.sot_remove_people(uuid, uuid[]) from public, anon, authenticated;
grant execute on function public.sot_remove_people(uuid, uuid[]) to service_role;
do $$ begin
  if to_regprocedure('public.sot_remove_people(uuid, uuid[])') is null then raise exception 'sot_remove_people missing'; end if;
end $$;
