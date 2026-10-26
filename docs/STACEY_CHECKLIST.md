# Stacey's checklist (2026-10-25)

## A. Do these now, in this order

1. DONE: Run the date pizzas database change in Supabase
   1. Open github.com/SliceOfThanks/slice-of-thanks/blob/main/supabase/migrations/dates.sql
   2. Click Raw. Select all and copy.
   3. In Supabase, open SQL Editor and click New query.
   4. Paste and click Run. If it warns about "destructive" steps, run it anyway. It only adds a new table and new functions.
   5. Tell Claude "done".

2. DONE (SOT-Back 1.3.0, checked 2026-10-26): Paste the Back to the Kitchen bar and plan details into BD
   1. Open github.com/SliceOfThanks/slice-of-thanks/blob/main/widgets/SOT-Back.html
   2. Click Raw. Select all and copy.
   3. In BD admin, open the widgets list and edit the widget called Footer - Scripts.
   4. If you pasted an older SOT-Back there before, delete it first.
   5. Paste at the very end, below everything else, and save.

3. DONE: Re-paste the Join widget in BD (Pizza Party now says Coming soon)
   1. Open github.com/SliceOfThanks/slice-of-thanks/blob/main/widgets/SOT-Join.html
   2. Click Raw. Select all and copy.
   3. In BD admin, edit the SOT-Join widget. Replace everything in it with the copy and save.

3b. DONE (SOT-Login 1.8.0 with the real logo): Re-paste the Login widget in BD
   1. Open github.com/SliceOfThanks/slice-of-thanks/blob/main/widgets/SOT-Login.html
   2. Click Raw. Select all and copy.
   3. In BD admin, edit the SOT-Login widget. Replace everything in it with the copy and save.

4. DONE: Hide the Pizza Party plan in BD
   1. In BD admin, open Membership Plans and edit Pizza Party.
   2. Turn off the settings that show it on the sign up page and the upgrade page, and save.

5. Replace the "Launching Soon / My New Website" home page in BD
   1. In BD admin, open the home page in the Web Page Builder.
   2. Replace the Launching Soon content with the SOT-Join widget, or point the home page to the Join page. Save.
   3. Open sliceofthanks.app logged out and check that the plans show.

6. DONE (14 days): Make the free trial length match
   1. Pick 7 or 14 days.
   2. In BD admin, Membership Plans, set that number on The Whole Pie and Pizza Party.
   3. Tell Claude the number so the Join page says the same thing.

## B. Decisions to send Claude

1. Free trial: 7 days or 14 days.
2. Birthday gift for Whole Pie members: Option A (100 bonus emails for 30 days and a birthday box topper they keep) or Option B (14 days of Pizza Party once team seats are built).
3. Birthday gift for A Slice members: 14 days of The Whole Pie. Is 25 bonus emails with it the right amount?
4. Lawfecta: a screenshot of Lawfecta's BD admin, Developer Hub, Webhooks (the list of events), and the discount code you want to send.

## C. Quick checks on your phone (refresh the app first)

1. Kitchen: tap Start over twice. You should be back on Dough.
2. Kitchen: tap Use my signature pizza, pick one, and send it to your test inbox.
3. Send step: use Pick from People. Try the search box and the tag menu.
4. People: tap a tag filter and a last pizza filter. The one you pick should highlight. Tap it again to turn it off.
5. Settings, Your signature pizzas: tap Add a premade. Add one business and one personal pizza. Try Make main and Rename.
6. People, Send to a group: pick a box preset under Dress the box and send to your test inbox.
7. Settings, Billing: open secure billing. The red Back to the Kitchen button should be at the top. Tap it.
8. Change Membership Plan page in BD: you should see Your plan now, a feature list under each plan, and Pizza Party greyed out. Send Claude a screenshot.

## D. Before launch tonight

1. Paste docs/CHATGPT_LAUNCH_TEST.md into ChatGPT (agent mode) about 2 hours before 11 PM. Send Claude the results.
2. Delete the test people from People.
3. DONE (2026-10-26): Email packs and Special Delivery checked with manual invoices in BD.
4. NOW (birthday gift is live): add one line to the privacy policy saying Slice of Thanks keeps a member's birthday (month and day only) to send a birthday gift.
