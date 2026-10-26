# Handoff: start here in a new session

Last updated: 2026-10-26. Read this file, then STATUS.md (full release history), then docs/STACEY_CHECKLIST.md and docs/ROADMAP.md.
CLAUDE.md has the standing rules. The blueprint (docs/Slice_of_Thanks_Build_Blueprint_v7.docx) is the original source of truth; where later work changed it, STATUS.md wins.

## Where things stand
- App v0.22.0 live (commit 36df286). Edge function `api` is api-0.22.0 (version 40). Partnero: refer-a-friend program, PartneroJS universal integration in BD HEAD records sign-ups; our server reports with email as customer key. Unbox v0.5.0.
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

## Waiting on Stacey (open items)
1. Done: widgets and home page re-pasted (2026-10-26).
2. Re-paste bd/home-page.html again (v0.20.1 spacing fix on the last Bake them a pizza button).
3. Partnero: create a Partner program, paste PartneroJS into BD HEAD code only (skip Partnero's conversion widget and Stripe steps), add secret PARTNERO_API_KEY, add a first partner, then say "Partnero done" so we test a real partner sign-up. Steps are in docs/STACEY_CHECKLIST.md item 8.
4. AppSumo (Radar lifetime deal): evaluated, not built. Needs her tier answers (automations now for Tiers 1 and 2, Tier 3 option A/B/C, one hidden BD "Lifetime (AppSumo)" plan, email budget plan) and "Approved".
5. Userback cleanup done (SOT-1, 2, 4, 7 rewritten; SOT-3 and SOT-5 blanked, Stacey to hide them from the public board; SOT-6 Resolved).
6. Done: the app calls Userback.identify with member id, name, email and plan (v0.21.0).
7. About us text approved as is.
8. Checks she was asked to do: googly eyes and other emoji toppings on iPhone, Home meetings list (past days hidden), Box step redesign, gift card, invite card with QR code.
9. Launch checks: guest Kitchen, privacy birthday line and the ChatGPT test are done (test passed; the missed free-test confirmation was fixed in v0.20.1). Still to do: delete the test people.
10. Decided 2026-10-26: A Slice birthday gift 25 emails, waiting meeting pizzas stay 3 days, referral rewards kept at 20 and 20, cap 25. AppSumo approved: Tiers 1 and 2 get automations now, Tier 3 option A (Whole Pie, 1,000 emails, no team promise), one hidden BD plan Lifetime (AppSumo) with tiers and limits in Supabase, built so a tier can map to Pizza Party later; wait for SendFox for email budget.
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
