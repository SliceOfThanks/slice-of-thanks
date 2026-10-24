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

Each release is a git tag (v0.1.0, v0.2.0 and so on). jsDelivr serves each tag at
cdn.jsdelivr.net/gh/SliceOfThanks/slice-of-thanks@TAG/...

The Releases screen in the admin decides which tag is live and which is staging.
Publishing switches the live tag. Rolling back switches it back.

Nothing secret is stored here. API keys live in Supabase secrets.
