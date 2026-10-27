// AppSumo welcome and moved-up emails. npx esbuild supabase/functions/api/lib/email.ts --bundle --format=esm --platform=neutral --outfile=tests/mail/email.mjs && node tests/mail/appsumo-test.mjs
import { buildAppsumoEmail } from './email.mjs';
let f = 0; const check = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) f++; };
const base = { name: 'Jordan Reyes', max: 3, kitchenLink: 'https://www.sliceofthanks.app/kitchen', settingsLink: 'https://www.sliceofthanks.app/kitchen' };
let e = buildAppsumoEmail({ ...base, codes: 1, emails: 100, nextEmails: 300 });
check(e.subject === 'Welcome to Slice of Thanks, lifetime member', 'First code: welcome subject');
check(e.text.includes('Hi Jordan,') && e.text.includes('1 of 3 codes. 100 emails a month, for life, with every Whole Pie feature.'), 'Says the plan, codes and emails');
check(e.text.includes('Send your first pizza in 3 steps:') && e.text.includes('Connect Calendly or TidyCal'), 'First-pizza steps and automations');
check(e.text.includes('Your next code takes you to 300 emails a month.'), 'Explains stacking');
check(!/—/.test(e.html + e.text), 'No em dashes');
e = buildAppsumoEmail({ ...base, codes: 2, emails: 300, nextEmails: 750 });
check(e.subject === 'You moved up: 300 emails a month for life' && !e.text.includes('3 steps') && e.text.includes('750 emails a month'), 'Second code: moved-up email');
e = buildAppsumoEmail({ ...base, codes: 3, emails: 750, nextEmails: 0 });
check(e.subject === 'You moved up: 750 emails a month for life' && !e.text.includes('Got another code'), 'Third code: no stacking line');
console.log(f ? f + ' FAILED' : 'ALL PASSED');
