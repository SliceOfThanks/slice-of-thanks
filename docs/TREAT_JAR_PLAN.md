# Potato's Treat Jar: monthly plan (draft, 2026-10-25)

Status: draft for Stacey to approve. Nothing here is built yet.

## Where it stands today
- 9 easter eggs and 4 Secret Menu items (Potato confetti, Gold Bow Tie box, Potato's Secret Sauce, early Holiday boxes).
- The same eggs every month.
- Treats are saved only in the member's browser. They are lost on a new phone or after clearing the browser, and they are easy to fake.

## 1. Move Treats to the account (do this first)
- Every Treat, egg and unlock is saved on the server, so it follows the member to any device.
- Each egg pays once per time it is live, and the server refuses a second payout.
- Earning cap: 100 Treats a month from eggs (the blueprint's suggested cap).
- Balances and unlocks never reset (blueprint rule).

## 2. Eggs that change every month
Each month has 8 eggs:
- 4 core eggs that are always there: Pet Potato five times, Catch Potato peeking (daily), Spell her name, Gerald's perfect bake.
- 3 rotating eggs from a pool split into three groups (A, B, C). Group A runs in month 1, B in month 2, C in month 3, then A comes back. Each rotating egg returns every 3 months.
- 1 holiday egg for that month.

Rotating eggs, A, B or C:
- Ten tosses (A)
- The duck pizza (A)
- Bother Gerald, tap his bow tie (A)
- Tap Gerald's chef hat three times (B)
- Make a pizza with every sauce in one week (B)
- Spell GERALD in pepperoni (B)
- Find Potato's bone hidden in Settings (C)
- Bake a pizza with no toppings, Potato is horrified (C)
- Open Pizza of the Month three days in a row (C)

Holiday eggs, one each month:
- January: spell 2027 in pepperoni.
- February: 14 heart pepperoni on one pizza.
- March: an all-green pizza.
- April: tap the April Fools' Gerald.
- May: send a thank-you to a teacher or nurse.
- June: bake on the longest day.
- July: fireworks confetti.
- August: a pizza with only pineapple.
- September: fall leaves confetti.
- October: spell BOO.
- November: send a pizza the week of Thanksgiving.
- December: snow confetti on the Holiday Feast.

A rotating or holiday egg pays again when it comes back. Core eggs pay once, except the daily peek.

## 3. Secret Menu: what Treats buy
- Unlocks are forever. Once a member buys something, it stays in their account even after it leaves the menu.
- One new item every month, for that month only. After its month it goes into the Vault and comes back about 3 months later.
- The 4 items members have today stay on the menu all the time.

Ideas for new items (new effects):
- Gerald's chef hat confetti.
- Potato zoomies: Potato drives a lap around the pizza before the box opens.
- Bone topper on the lid.
- A "Good Dog" sticker.
- Paw print box style.
- Sprinkles topping (pizza dessert, Gerald protests).
- Midnight snack box style, dark with stars.
- Rainbow confetti.
- A Potato bark sound on the box opening.
- A Gerald "chef's kiss" stamp inside the lid.
- A seasonal box topper a month early.

## 4. The full jar: a bigger prize
- The jar fills at 150 Treats. When it is full, the member can cash it in. Cashing in empties the jar.
- A Slice members get 7 days of The Whole Pie, with no card needed. It uses the same switch as the birthday gift. The birthday gift stays bigger at 14 days.
- Whole Pie members get 25 bonus emails, good for 30 days.
- Pizza Party members: once team seats are built, a Pizza Party extra such as a shared confetti pack for the team.
- Limits: the full-jar prize once every 90 days per account, and only for accounts at least 14 days old.

## 5. How the monthly content changes
- Everything lives in one file, shared/treat-jar.json: the egg pool, the A, B and C groups, the holiday eggs and the Secret Menu schedule.
- The app picks the current month automatically. Stacey or Claude can change a month by editing that file. Later, the admin widget gets an editor for it.

## 6. Build order (after launch)
1. Treats on the server, monthly eggs and the monthly Secret Menu item. About half a day.
2. The full-jar prize. About half a day. It shares the plan switch with the birthday gift, so build them together.

## Decisions needed
1. Unlocks forever? Recommended: yes.
2. Monthly mix of 4 core, 3 rotating and 1 holiday egg, with rotating eggs back every 3 months? Recommended: yes.
3. Full-jar prize:
   - A Slice: 7 days of The Whole Pie (recommended) or 14 days?
   - Whole Pie: 25 bonus emails?
   - Jar size: 150 Treats?
4. How often the full-jar prize can be won: every 90 days?
