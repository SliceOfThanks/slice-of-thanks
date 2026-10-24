# Build status (read this first in a new session)

Last updated: 2026-10-23. Live code version: v0.3.3 (see releases.json and app_settings.code_version).

## Done and live
- Supabase project cmnclubiarmthibqibuj. Edge Function `api` (api-0.3.0, verify_jwt false, own auth). Tables have RLS with no policies.
- BD widgets installed by Stacey: SOT-Auth (v1.1.0, holds her secret on line 12), SOT-Unbox (/p page), SOT-App (/kitchen page).
- Kitchen (app/app.js, built by `python3 tools/build_app.py` from prototype/ + app/live.js), shadow DOM, light and dark mode in brand colors.
- Recipient page (unbox/), six slices, gift reveal, Spanish, unsubscribe.
- Plans mapped: BD plan 10 = free (A Slice), 12 = pro (The Whole Pie), 11 = team (Pizza Party). Mid-month upgrade tops up monthly emails.
- Legal: BD sign up forms have a required checkbox, system name sot_legal_agree. SOT-Auth passes lg and jn claims. sot_session records it in legal_acceptances (method bd_signup_form). Kitchen asks anyone else (method kitchen_checkbox, with IP and browser). Version bumps in app_settings.legal_versions trigger re-accept. Pages /terms /privacy /acceptable-use /dpa /report exist on BD.
- Special Delivery UI is in the Kitchen. The send path supports special_delivery. Buying it is NOT wired: no data-special-url on the SOT-App widget, so the button shows "checkout opens soon".

## Release routine
1. Build, test with Playwright (block fonts.googleapis.com, it hangs), commit, push.
2. Set app_settings code_version (live and staging) to the commit, insert into releases, append releases.json, push.
Git tags cannot be pushed. Use commit IDs.

## Next, in order
1. Payments: find how BD reports Digital Product purchases (webhook or data check). Grant credits: email packs (100/$5, 500/$15, 1,000/$25, Pro and Team only, 12 months, refundable 14 days unused) and Special Delivery ($2.99, A Slice only) into credit_ledger buckets pack and special_delivery. Then set data-special-url on SOT-App and give Stacey BD Digital Product steps.
2. Scheduled-send worker and retries (pg_cron + pg_net calling the api).
3. People tab: CSV import with country and consent per contact, list sends.
4. Spanish in the Kitchen UI.
5. SOT-Admin widget: Releases, Subscription Plans, Pizza of the Month.
Then Phase 2 per the blueprint (webhooks, Calendly, TidyCal, birthdays).

## Working with Stacey
Follow CLAUDE.md: full code per changed tab, numbered BD steps, no tests for her, no em dashes, decide instead of offering options.
