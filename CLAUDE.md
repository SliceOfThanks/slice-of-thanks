# Working on Slice of Thanks

Read docs/Slice_of_Thanks_Build_Blueprint_v7.docx before building. It is the source of truth.

## Owner
Stacey (MiniBoss). Not technical with GitHub. She installs code and changes settings; she does not run tests.
Live testing goes to ChatGPT through one ready-to-paste prompt per release.
Writing style for anything she reads: plain, direct, no em dashes, no "it's not X, it's Y", no punchy negation strings.
End every update to Stacey with three clear headings, in this order: "What you need to do next" (numbered steps, or "Nothing right now"), "Next steps in general" (where things stand), and "What I'll build next".

## Architecture
- Brilliant Directories (sliceofthanks.app): member accounts, logins, plans, BD payments and Digital Products, admin area.
- Supabase project ref cmnclubiarmthibqibuj: all app data and secure work. Tables have RLS with no public policies; reach them only through Edge Functions with the service role.
- GitHub commits served by jsDelivr: app, unbox and admin code. Versions are pinned to commit IDs in releases.json (this session cannot push git tags).
- Publitio: images and logos, uploaded through Supabase.
- Brevo: email, called only from Supabase.

## BD widgets (four)
SOT-App, SOT-Unbox, SOT-Admin, SOT-Auth. Keep them tiny. BD widget rules: no backslashes, no regex functions, no example URLs with https://, no literal widget shortcodes in widget code, helper widgets start with <?php and end with ?>.

## Design lock
The prototype in prototype/ is the visual source of truth: warm cream, dark brown heavy outlines, playful serif headings, red and yellow controls, rounded bordered cards, flat vector art, mobile first. Gerald is the raccoon Head Chef: he runs the kitchen, makes pizzas on request (Hire Gerald, free for everyone) and always writes the receipt. Potato is the bulldog Head of Delivery. Six interactive slices, Gerald receipt and the sender's button stay on the same eating screen, with the gift revealed only after the sixth slice.

## Plans
free = A Slice, pro = The Whole Pie, team = Pizza Party. Limits are emails sent, never automation counts.
