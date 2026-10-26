# Handoff: start here in a new session

Last updated: 2026-10-26. Read this file, then STATUS.md (full release history), then docs/STACEY_CHECKLIST.md and docs/ROADMAP.md.
CLAUDE.md has the standing rules. The blueprint (docs/Slice_of_Thanks_Build_Blueprint_v7.docx) is the original source of truth; where later work changed it, STATUS.md wins.

## Where things stand
- App v0.20.1 live (commit 3a2bdfe). Edge function `api` is api-0.20.0 (Supabase version 34). Unbox v0.5.0.
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
1. Re-paste widgets/SOT-App.php (1.3.0) and widgets/SOT-Unbox.html in BD for the animated pizza clock loader.
2. Re-paste bd/home-page.html again (v0.20.1 spacing fix on the last Bake them a pizza button).
3. Partnero: create a Partner program, paste PartneroJS into BD HEAD code only (skip Partnero's conversion widget and Stripe steps), add secret PARTNERO_API_KEY, add a first partner, then say "Partnero done" so we test a real partner sign-up. Steps are in docs/STACEY_CHECKLIST.md item 8.
4. AppSumo (Radar lifetime deal): evaluated, not built. Needs her tier answers (automations now for Tiers 1 and 2, Tier 3 option A/B/C, one hidden BD "Lifetime (AppSumo)" plan, email budget plan) and "Approved".
5. Userback public board cleanup: posts SOT-1 to SOT-7 contain internal details. Proposed rewrites and removals are waiting for "Go ahead with Userback".
6. Userback widget greets everyone as "John Doe" (members are not identified). Offer to pass name and email: waiting for yes or no.
7. Founder text on the About us screen is a first draft. Waiting for her 2 or 3 lines of real experience, and her OK on the Potato lines.
8. Checks she was asked to do: googly eyes and other emoji toppings on iPhone, Home meetings list (past days hidden), Box step redesign, gift card, invite card with QR code.
9. Launch checks: guest Kitchen, privacy birthday line and the ChatGPT test are done (test passed; the missed free-test confirmation was fixed in v0.20.1). Still to do: delete the test people.
10. Decisions still open: A Slice birthday gift 40 or 25 emails (comment in the features doc), whether waiting meeting pizzas should stay on Home for 3 days, referral reward amounts (now 20 and 20, cap 25 a year, app_settings referrals).
11. SendFox backup: built and switched off (api-0.19.0). On hold until SendFox approves transactional email. Do not raise it again until she asks.

## Things built but not verified against the real service
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
