-- AppSumo redemption codes (Stacey, 2026-10-26). The listing sells codes; a buyer redeems them in the app.
-- Only a SHA-256 hash of each code is kept here, so the codes themselves never sit in the database or in the public GitHub project.
-- The plain codes exist only in the CSV uploaded to AppSumo.
create table if not exists appsumo_codes (
  code_hash text primary key,
  batch text not null,
  created_at timestamptz not null default now(),
  redeemed_by uuid references members(id) on delete set null,
  redeemed_at timestamptz,
  deactivated_at timestamptz,
  deactivated_reason text
);
create index if not exists appsumo_codes_member on appsumo_codes(redeemed_by);
alter table appsumo_codes enable row level security;
revoke all on appsumo_codes from public, anon, authenticated;
do $$ begin
  if to_regclass('public.appsumo_codes') is null then raise exception 'appsumo_codes missing'; end if;
end $$;
