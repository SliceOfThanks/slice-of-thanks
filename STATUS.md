# Build status (read this first in a new session)

Last updated: 2026-10-24. Live code version: v0.4.3 (see releases.json and app_settings.code_version).

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
- v0.4.1: the prototype demo sign in is gone; "I already have an account" goes to /login.
- First ChatGPT test (v0.4.0) was not signed in to BD, so it proved only that the Special Delivery link opens the BD product page. Needs a real signed-in test.
- Sign in was never working: SOT-Auth line 12 still had no valid secret (SOT-App 1.2.0 report: secret_not_set), so every member looked logged out and the members table stayed empty. Fix: a new shared secret goes in SOT-Auth line 12 and in Supabase BD_SHARED_SECRET (same value). To diagnose sign in again, read function logs for auth_why (sent by SOT-App 1.2.0 with /bootstrap).
- Sign in fixed 2026-10-24 (Stacey set a letters-and-numbers secret; symbols like quotes break SOT-Auth line 12). Never put secrets in chat; Stacey generates them.
- BD API must be called on sliceofthanks.app (www redirects and the POST becomes a GET, 405). api-0.4.2.
- Dark mode text softened to #E3D0B8 / muted #BBA088 (prototype and unbox.css). Crew What's new shows 5; See all updates opens view-news.
- Payments verified 2026-10-24: Whole Pie test member (BD 20) got Special Delivery from BD invoice 3702000002 line i2, credited once; A Slice test member (BD 19) refunded pack never credited.
- Email provider layer (api-0.5.0, in repo, NOT deployed yet): all sending goes through lib/mail (types.ts, brevo.ts, index.ts). Provider chosen by app_settings email_provider. Waiting on migration email_provider (Stacey must approve in the Supabase prompt), then deploy api with lib/mail files. To add a provider: new lib/mail/<name>.ts, add to PROVIDERS, Supabase secret for its key, change the setting.
- Test purchases are made as manual BD invoices marked Paid in BD admin (free). Never ask Stacey to pay real money for tests.
- Test members: the Whole Pie one has a paid Special Delivery invoice; the A Slice one has a 100 Email Pack invoice that was refunded before any sync (should never be credited).
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
