# Potato's Treat Jar: monthly plan (draft, 2026-10-25)

Status: approved by Stacey 2026-10-25, with the changes below. Not built yet.

## Where it stands today
- 9 easter eggs and 4 Secret Menu items (Potato confetti, Gold Bow Tie box, Potato's Secret Sauce, early Holiday boxes).
- The same eggs every month.
- Treats are saved only in the member's browser. They are lost on a new phone or after clearing the browser, and they are easy to fake.

## 1. Move Treats to the account (do this first)
- Every Treat, egg and unlock is saved on the server, so it follows the member to any device.
- Each egg pays once per time it is live, and the server refuses a second payout.
- Earning cap: 150 Treats a month from eggs, so a full jar is possible every month (the blueprint suggested 100; Stacey chose a monthly jar).
- Balances and unlocks never reset (blueprint rule).

## 2. Eggs that change every month
Each month has 8 eggs:
- 4 core eggs that are always there: Pet Potato five times, Catch Potato peeking (daily), Spell her name, Gerald's perfect bake.
- 3 rotating eggs from a pool split into three groups (A, B, C). Group A runs in month 1, B in month 2, C in month 3, then A comes back. Each rotating egg returns every 3 months.
- 1 holiday egg for that month. Potato pops up dressed for the holiday (a pumpkin on her head for Halloween, a Santa hat in December, a shamrock bow in March, bunny ears at Easter, a heart collar for Valentine's Day). Tapping her bursts matching confetti (pumpkins, snowflakes, shamrocks, eggs, hearts) and pays the Treats.

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

Approved new items (Stacey's picks), one a month: Potato zoomies, Rainbow confetti, Bone topper, Paw print box, Sprinkles topping and Chocolate sauce. Other ideas held for later:
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
- A Slice members get Pro toppings and Pro box styles for 14 days. Other Pro features stay locked.
- Whole Pie members get 100 bonus emails, good for 30 days.
- Pizza Party members: a team extra once seats are built.
- It can be won once a month. This is the game: come back each month and fill the jar again.
- To make a monthly jar possible, members can earn up to 150 Treats a month instead of 100.
- Only for accounts at least 14 days old.

## 5. How the monthly content changes
- Everything lives in one file, shared/treat-jar.json: the egg pool, the A, B and C groups, the holiday eggs and the Secret Menu schedule.
- The app picks the current month automatically. Stacey or Claude can change a month by editing that file. Later, the admin widget gets an editor for it.

## 6. Build order (after launch)
1. Treats on the server, monthly eggs and the monthly Secret Menu item. About half a day.
2. The full-jar prize. About half a day. It shares the plan switch with the birthday gift, so build them together.

## Decisions (Stacey, 2026-10-25)
1. Unlocks are forever.
2. Each month: 4 core eggs, 3 rotating (back every 3 months), 1 holiday egg with Potato dressed up and themed confetti.
3. Full jar at 150 Treats. A Slice: Pro toppings and boxes for 14 days. Whole Pie: 100 bonus emails.
4. The full-jar prize can be won every month.
5. New Secret Menu items: Potato zoomies, Rainbow confetti, Bone topper, Paw print box, Sprinkles topping, Chocolate sauce.
