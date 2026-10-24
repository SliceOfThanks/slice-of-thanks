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
- purchase_credits (file purchase_credits.sql): BD Digital Product purchases. sot_grant_purchase credits one paid invoice line once (bd_order_ref = invoiceId:line) into the pack or special_delivery bucket, expiring 12 months after payment. sot_refund_purchase removes what is left when BD shows the invoice as Refunded. sot_lots and sot_expire_lots use lots oldest first and expire leftovers (bonus and adjust credits never expire); reserve_credit and sot_session expire first. sot_billing_claim throttles BD checks. Settings bd_products (invoice line name to product) and checkout_urls. sot_session returns packs, checkout and pack_next_expiry.
- purchase_credits_fix (file purchase_credits_fix.sql): fixes an ambiguous column name in sot_lots and its callers.
- email_provider (file email_provider.sql): sends.provider records which service sent each email; app_settings email_provider ({"pizza": "brevo"}) picks the service; sot_mark_sent takes p_provider. Apply BEFORE deploying api-0.5.0 (that code passes p_provider).
