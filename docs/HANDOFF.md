# Handoff: start here in a new session

Last updated: 2026-10-27. Read this file, then STATUS.md (full release history), then docs/STACEY_CHECKLIST.md and docs/ROADMAP.md.
CLAUDE.md has the standing rules. The blueprint (docs/Slice_of_Thanks_Build_Blueprint_v7.docx) is the original source of truth; where later work changed it, STATUS.md wins.

## Where things stand
- App v0.23.2 live. Edge function `api` is api-0.24.0 (version 44). Partnero: refer-a-friend program, PartneroJS universal integration in BD HEAD records sign-ups; our server reports with email as customer key. Unbox v0.5.0.
- Live version is whatever `app_settings.code_version` says (live and staging rows). Every release is a row in `releases` and an entry in releases.json.
- Launch work is done except the open items below. Everything not launch-critical goes to docs/ROADMAP.md (and Userback) only with Stacey's approval.

## Working with Stacey
- She is not technical. She installs code in BD, changes settings and pastes secrets into Supabase. She does not run tests.
- Writing style: plain and direct. No em dashes. No "it's not X, it's Y". No punchy negation strings.
- Every update ends with three headings, in this order: "What you need to do next" (numbered steps, or "Nothing right now"), "Next steps in general", "What I'll build next".
- Every request to her gets its own heading with numbered steps, Why, What changes, Goal, and "Send me:" saying exactly what to send back.
- Never ask her to paste secrets in chat. Keys go into Supabase Edge Function secrets only.
- No real payments for tests: test purchases are manual BD invoices marked Paid.
- When she says evaluate or "do not build", evaluate only and wait for approval (roadmap additions need approval too).
- Live testing goes to ChatGPT (agent mode) through one ready-to-paste prompt per release (see docs/CHATGPT_TEST_v0.18.md for the format).

## How releases work (short version; details in STATUS.md)
1. App: bump the version on line 1 of app/live.js, run `python3 tools/build_app.py`, run the Playwright suites in tests/pw (24 suites, each `node tests/pw/<name>-test.js app/app.js`; the main one is tests/pw/test.js). invite-test and receipt-test need `QR_LIB=<path to qrcode-generator 1.4.4 qrcode.js>` (get it with `npm pack qrcode-generator@1.4.4`). The suites write stray screenshots in the repo root (billing.png, crew-dark.png, home.png, news-dark.png, box-float-*.png): restore or delete them before committing.
2. Commit and push to main (git tags cannot be pushed; versions are pinned to commit IDs).
3. Check jsDelivr serves the commit (Supabase `select net.http_get(...)`, then read `net._http_response`).
4. Update `app_settings` code_version (both envs) and insert into `releases` with previous_release_id, using `apply_migration` with a DO block self-check.
5. Append releases.json and a line in STATUS.md, push.
- Edge deploys must send every file in supabase/functions/api (index.ts and all of lib/, including lib/mail/* and lib/partnero.ts), verify_jwt false. Check /health after.
- Database changes: `apply_migration` with a DO-block self-check that raises. Avoid the words delete and truncate in migration text. Large `execute_sql` calls can hang on approval. Function edits go through pg_get_functiondef + replace() + execute, guarded by anchor checks. Save each change as a file in supabase/migrations.
- BD widgets: no backslashes, no regex functions, no full web addresses in examples, no literal widget shortcodes, PHP helpers start with <?php and end with ?>.
- This session's network blocks some sites (partnero.com, sendfox.com, vbout.com, sliceofthanks.app itself). Use web search, and say when something could not be verified.

## Building is paused (2026-10-27)
Stacey asked to hold all new building until SendFox is approved. Do not start roadmap items (SOT-1 to SOT-7) until she says so. Launch-critical fixes only. Exception she asked for: the analytics dashboard (below).

## Analytics dashboard (built 2026-10-27)
- Page: Claude Dashboard artifact "Slice of Thanks Analytics", https://claude.ai/artifact/U212iAhYWW3erQMSt67iNo. Each source is a live `execute_sql` call on Stacey's own Supabase connector (project cmnclubiarmthibqibuj); only people with that Supabase access see numbers. Plan doc: https://claude.ai/artifact/L2foyHZoYd67YuJBvYYJFD.
- Database (migrations analytics.sql, analytics_page.sql): metrics_daily (day, scope real/all, metric, value; counts only, no recipient data), metric_targets (goals: metric, week/month/quarter, target, higher/lower, starts_on, ended_on, nonce), metrics_runs (run log). sot_metrics_catalog lists every metric with its definition; sot_metrics_compute fills a day range; sot_metrics_refresh('auto'|'manual'|'backfill') recomputes the last 45 days (manual limited to once every 5 minutes); cron job sot-metrics runs it every 2 hours at :07 past even UTC hours.
- Real vs all: real leaves out testers, app_settings analytics exclude_bd_user_ids and emails on lawfecta.com / legalstacey.com. The page's "Include my own and test accounts" box shows all. Closed accounts BD 21 and 22 have no email, so they still count as real until added to exclude_bd_user_ids.
- Page actions run inside SELECTs: sot_metrics_status_refresh(nonce) runs a manual refresh when the page sends a new nonce; sot_metrics_goals_apply(...) saves, changes (ends old, adds new) or ends a goal. Goals are scored by sot_metrics_score: Met, On track (counts by pace through the period, rates against the target), Behind, Missed (period ended short), No data.
- sot_create_send now stores the send source on its send_accepted event (props.source), so From People and From a list count from 2026-10-27. Not tracked yet: Product Hunt as a signup source, Brevo opens and bounces, Userback counts, plan upgrades paid in BD.

## Waiting on Stacey (open items)
1. Done: widgets and home page re-pasted (2026-10-26).
2. Re-paste bd/home-page.html again (v0.20.1 spacing fix on the last Bake them a pizza button).
3. Partnero: create a Partner program, paste PartneroJS into BD HEAD code only (skip Partnero's conversion widget and Stripe steps), add secret PARTNERO_API_KEY, add a first partner, then say "Partnero done" so we test a real partner sign-up. Steps are in docs/STACEY_CHECKLIST.md item 8.
4. AppSumo (Radar lifetime deal, codes, submission 233398, redemption link https://www.sliceofthanks.app/redeem): code redemption built in v0.23.0 / api-0.23.0. Codes stack up to 3 per account on the hidden Lifetime (AppSumo) plan: 1 code = 100 emails a month, 2 codes = 300, 3 codes = 750 (not 1,000), for life, every Whole Pie feature (app_settings appsumo tiers). 3,000 codes, batch appsumo-1: only SHA-256 hashes are in appsumo_codes; the plain CSV was given to Stacey and uploaded to AppSumo, never committed. Redeem = sot_appsumo_redeem (lifetime plan_grants reason appsumo, trial replaced as trial_appsumo, sot_ensure_monthly gives the tier's emails or the paid plan's if higher, 10 wrong tries an hour). Decided 2026-10-27: AppSumo buyers sign up on the free A Slice plan (BD plan 10, verify email, redirect /kitchen) and stay on it in BD; the codes give the features and emails. BD plan 13 Lifetime (AppSumo) is free with public sign ups disabled; the first code on a free account moves the member there through the BD API (confirmed by the ChatGPT test 2026-10-27); bd_plan_map 13 = free. The BD /redeem page is live. AppSumo codes file is batch1-v2 (2,999 codes); SOT-9M7E-GD4M-YJ2J was redeemed by Stacey (BD 20) as a test and kept. Redemption steps on the draft were written to match the app (6 steps, including verify email). AppSumo welcome email built (api-0.24.0). SendFox: approved by SendFox but tabled by Stacey until she approves; do not raise it.
5. Userback cleanup done (SOT-1, 2, 4, 7 rewritten; SOT-3 and SOT-5 blanked, Stacey to hide them from the public board; SOT-6 Resolved).
6. Done: the app calls Userback.identify with member id, name, email and plan (v0.21.0).
7. About us text approved as is.
8. Checks she was asked to do: googly eyes and other emoji toppings on iPhone, Home meetings list (past days hidden), Box step redesign, gift card, invite card with QR code.
9. Launch checks: guest Kitchen, privacy birthday line and the ChatGPT test are done (test passed; the missed free-test confirmation was fixed in v0.20.1). Still to do: delete the test people.
10. Decided 2026-10-26: A Slice birthday gift 25 emails, waiting meeting pizzas stay 3 days, referral rewards kept at 20 and 20, cap 25. AppSumo approved: Tiers 1 and 2 get automations now, Tier 3 option A (Whole Pie, 750 emails, no team promise; changed from 1,000 to 750 on 2026-10-27), one hidden BD plan Lifetime (AppSumo) with tiers and limits in Supabase, built so a tier can map to Pizza Party later; wait for SendFox for email budget.
11. SendFox backup: built and switched off (api-0.19.0). On hold until SendFox approves transactional email. Do not raise it again until she asks.

12. Privacy policy line about replies (given 2026-10-26), hide SOT-3 and SOT-5 in Userback, delete test people, AppSumo: hidden BD plan Lifetime (AppSumo) id and Partner Portal screenshot.

## Things built but not verified against the real service
- The reply confirm email and link (built 2026-10-26; a bad link was checked to redirect to ?reply=expired).
- Partnero API calls (customer and transaction formats taken from search results of their docs; partnero.com is blocked here).
- SendFox transactional endpoint.
- Userback.open() from the FAQ and footer Help button (only the fallback message is tested).
- iPhone Safari rendering of emoji toppings (no WebKit in this container; fixed by drawing emoji on their own canvas).

## Useful places
- App: prototype/slice-of-thanks-prototype.html (UI and pizza engine) + app/live.js (live layer) -> app/app.js (built).
- Recipient page: unbox/unbox.js, unbox/unbox.css, engine shared/pizza-core.js (keep its engine in step with the prototype's).
- Server: supabase/functions/api (index.ts, lib/*). Migrations: supabase/migrations.
- BD pieces: widgets/*, bd/home-page.html.
- Feature list for people: the Claude doc "Slice of Thanks: Everything Live at Launch" (claude.ai/artifact/EUQd31jxvLhsKUf5VVqVbR).
