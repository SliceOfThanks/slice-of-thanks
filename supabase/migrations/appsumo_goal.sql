-- AppSumo goal that turns itself on (Stacey, 2026-10-27): when the first real customer redeems an AppSumo code,
-- add a monthly goal for AppSumo codes redeemed, starting that day. Real means the same as the dashboard:
-- testers, excluded BD ids and Stacey's own domains do not count. It fires once ever (fixed nonce), and if the goal
-- was already added by hand it does nothing. The target lives in app_settings analytics appsumo_goal (default 50).
-- A problem here never blocks a redemption.
update public.app_settings set value = value || '{"appsumo_goal": {"metric": "appsumo_codes", "period": "month", "target": 50, "better": "higher"}}'::jsonb, updated_at = now()
where key = 'analytics' and not (value ? 'appsumo_goal');

create or replace function public.sot_appsumo_goal_on() returns trigger
language plpgsql security definer set search_path = public as $$
declare g jsonb; v_today date;
begin
  if new.type <> 'appsumo_redeemed' or new.member_id is null then return new; end if;
  begin
    if exists (select 1 from metric_targets where nonce = 'appsumo-first-customer') then return new; end if;
    if not exists (select 1 from sot_metrics_members() mm where mm.id = new.member_id and mm.is_real) then return new; end if;
    g := coalesce(sot_setting('live', 'analytics')->'appsumo_goal', '{}'::jsonb);
    if exists (select 1 from metric_targets where metric = coalesce(g->>'metric', 'appsumo_codes') and ended_on is null) then return new; end if;
    v_today := (now() at time zone coalesce(sot_setting('live', 'analytics')->>'tz', 'America/Los_Angeles'))::date;
    insert into metric_targets(metric, period, target, better, starts_on, nonce)
    values (coalesce(g->>'metric', 'appsumo_codes'), coalesce(g->>'period', 'month'), coalesce((g->>'target')::numeric, 50),
            case when g->>'better' = 'lower' then 'lower' else 'higher' end, v_today, 'appsumo-first-customer')
    on conflict (nonce) do nothing;
  exception when others then
    raise warning 'appsumo goal: %', sqlerrm;
  end;
  return new;
end $$;

revoke all on function public.sot_appsumo_goal_on() from public, anon, authenticated;

drop trigger if exists sot_appsumo_goal_on on public.events;
create trigger sot_appsumo_goal_on after insert on public.events
for each row when (new.type = 'appsumo_redeemed') execute function public.sot_appsumo_goal_on();

do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'sot_appsumo_goal_on') then raise exception 'trigger missing'; end if;
  if (select value->'appsumo_goal'->>'target' from app_settings where env = 'live' and key = 'analytics') is null then raise exception 'appsumo_goal setting missing'; end if;
  if exists (select 1 from metric_targets where metric = 'appsumo_codes' and ended_on is null) then raise exception 'an AppSumo goal already exists'; end if;
end $$;
