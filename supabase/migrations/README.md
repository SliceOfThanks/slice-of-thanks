# Database migrations

Applied to Supabase project `slice-of-thanks` (ref cmnclubiarmthibqibuj, region us-west-1).

| Order | Name | What it does |
|---|---|---|
| 1 | core_schema_v1 | All tables: plans, features, members, teams, testers, versioned content, settings, releases, contacts, consent, suppressions, pizzas, sends, recipient events, purchases, credit ledger, automations, webhooks, integrations, analytics events, audit log. Row level security on every table with no public policies. |
| 2 | seed_plans_features_settings | A Slice, The Whole Pie, Pizza Party. Feature list and plan grid for staging and live. Code versions, legal versions, email packs, Special Delivery, languages. Starting consent rules (pending counsel). |
| 3 | credit_functions | wallet_for, bucket_balance, reserve_credit, release_credit, settle_credit. Service role only. |

Rules:
- Every change goes in a new numbered migration. Never edit an applied one.
- Changes must be backward compatible with the live app version.
- Tables are reached only through Edge Functions with the service role.

Live schema is the source of truth. List it with the Supabase list_tables tool before changing anything.
- monthly_upgrade_topup: tops up monthly emails when a member upgrades mid-month.
- legal_acceptances: audit table of every legal acceptance (versions of all four documents, method, time, IP, browser). sot_accept_terms records a row.
- session_records_signup_legal: sot_session records the BD sign up checkbox once (dated to sign up); needs_terms compares all four document versions; sot_create_send requires the current versions.
