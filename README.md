# Slice of Thanks

Send a little appreciation. Branded, interactive thank-you pizzas with automated follow-ups.

Live site: sliceofthanks.app

## What lives where

| Folder | Contents |
|---|---|
| app/ | Member app code (Today, Kitchen, People, Crew, Settings). Loaded by the SOT-App widget. |
| unbox/ | Recipient page code (delivery, six slices, gift reveal). Loaded by the SOT-Unbox widget. |
| admin/ | Owner back end code. Loaded by the SOT-Admin widget inside BD /admin. |
| widgets/ | The four small Brilliant Directories widgets, pasted once at setup. |
| supabase/ | Database migrations and Edge Functions. |
| brand/ | Logos and character art. |
| prototype/ | The approved prototype. The design authority for every screen. |
| docs/ | Build Blueprint v7, the source of truth. |

## How releases work

Each release has a version name (v0.1.0, v0.2.0 and so on) pinned to an exact commit.
releases.json lists them. jsDelivr serves each commit at
cdn.jsdelivr.net/gh/SliceOfThanks/slice-of-thanks@COMMIT/...
A commit never changes, so a published version never changes.

The Releases screen in the admin decides which version is live and which is staging.
Publishing switches the live version. Rolling back switches it back.

Nothing secret is stored here. API keys live in Supabase secrets.
