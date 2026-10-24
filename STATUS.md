# Build status (read this first in a new session)

Last updated: 2026-10-24. Live code version: v0.4.0 (see releases.json and app_settings.code_version).

## Done and live
- Supabase project cmnclubiarmthibqibuj. Edge Function `api` (api-0.4.0, verify_jwt false, own auth). Tables have RLS with no policies.
- BD widgets installed by Stacey: SOT-Auth (v1.1.0, holds her secret on line 12), SOT-Unbox (/p page), SOT-App (/kitchen page).
- Kitchen (app/app.js, built by `python3 tools/build_app.py` from prototype/ + app/live.js), shadow DOM, light and dark mode in brand colors.
- Recipient page (unbox/), six slices, gift reveal, Spanish, unsubscribe.
- Plans mapped: BD plan 10 = free (A Slice), 12 = pro (The Whole Pie), 11 = team (Pizza Party). Mid-month upgrade tops up monthly emails.
- Legal: BD sign up forms have a required checkbox, system name sot_legal_agree. SOT-Auth passes lg and jn claims. sot_session records it in legal_acceptances (method bd_signup_form). Kitchen asks anyone else (method kitchen_checkbox, with IP and browser). Version bumps in app_settings.legal_versions trigger re-accept. Pages /terms /privacy /acceptable-use /dpa /report exist on BD.
- Payments (v0.4.0): email packs (Pro and Team) and Special Delivery (A Slice) are BD Digital Products. BD has no purchase webhook we can trust, so Supabase reads the member's BD invoices with the BD API (POST /api/v2/user/transactions, secret BD_API_KEY, site BD_SITE_URL or www.sliceofthanks.app). It checks when the Kitchen opens (at most every 10 minutes, /session) and every 6 seconds for 36 seconds after a member comes back from checkout (/purchases/check). Paid invoice lines whose name contains a bd_products match (app_settings) are credited once (purchases.bd_order_ref = invoiceId:line) into bucket pack or special_delivery, expiring 12 months after payment, oldest used first. Refunded invoices remove what is left. Only invoices from the last 12 months are read.
- Checkout links: data-special-url, data-pack100-url, data-pack500-url, data-pack1000-url on SOT-App (widget 1.1.0), or app_settings checkout_urls. Empty means the button says it opens soon.
- Waiting on Stacey: BD_API_KEY secret in Supabase, the four BD Digital Products named exactly "Special Delivery", "100 Email Pack", "500 Email Pack", "1,000 Email Pack", and their links in SOT-App 1.1.0. Until BD_API_KEY is set, nothing is checked and nothing breaks.
- Not verified against a real BD invoice yet. When the first test purchase is made, check purchases and credit_ledger. If BD names the invoice line differently, add a match to app_settings bd_products (both envs).

## Release routine
1. Build, test with Playwright (block fonts.googleapis.com, it hangs), commit, push. API tests: deno test supabase/functions/api/lib/lib_test.ts. Deploy the api function with every file in lib/.
2. Set app_settings code_version (live and staging) to the commit, insert into releases, append releases.json, push.
Git tags cannot be pushed. Use commit IDs.

## Next, in order
1. Scheduled-send worker and retries (pg_cron + pg_net calling the api).
2. People tab: CSV import with country and consent per contact, list sends.
3. Spanish in the Kitchen UI.
4. SOT-Admin widget: Releases, Subscription Plans, Pizza of the Month. Include a purchases list.
5. "Manage billing" on the Pro plan card still shows the prototype message; point it at the BD billing page.
Then Phase 2 per the blueprint (webhooks, Calendly, TidyCal, birthdays).

## Working with Stacey
Follow CLAUDE.md: full code per changed tab, numbered BD steps, no tests for her, no em dashes, decide instead of offering options.
