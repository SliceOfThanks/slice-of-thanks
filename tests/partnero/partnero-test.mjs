// Partnero client test. Run from the repo root:
// npx esbuild supabase/functions/api/lib/partnero.ts --bundle --format=esm --platform=neutral --outfile=tests/partnero/partnero.mjs && node tests/partnero/partnero-test.mjs
import { sendCustomer, sendSale } from './partnero.mjs';
let fails = 0; const check = (ok, m) => { console.log((ok ? 'PASS ' : 'FAIL ') + m); if (!ok) fails++; };
const fake = (status, data) => { const calls = []; const f = async (url, init) => { calls.push({ url, method: init.method, body: init.body ? JSON.parse(init.body) : null, headers: init.headers }); if (status === 'throw') throw new Error('timeout'); return { ok: status < 300, status, json: async () => data }; }; f.calls = calls; return f; };

let f = fake(201, { data: { key: 'm1' } });
let r = await sendCustomer('k', { key: 'm1', email: 'a@b.co', name: 'Jordan Lee', referrerKey: 'm0', partnerKey: 'lawfecta' }, f);
const c = f.calls[0];
check(r.ok && c.url === 'https://api.partnero.com/v1/customers' && c.method === 'POST', 'Customer goes to POST /v1/customers');
check(c.headers.authorization === 'Bearer k', 'API key as Bearer token');
check(c.body.key === 'm1' && c.body.email === 'a@b.co' && c.body.name === 'Jordan' && c.body.surname === 'Lee', 'Key, email, first and last name');
check(c.body.referring_customer.key === 'm0' && c.body.partner.key === 'lawfecta', 'Who referred them and the partner');

f = fake(201, {}); await sendCustomer('k', { key: 'm2', email: '', name: '' }, f);
check(!('referring_customer' in f.calls[0].body) && !('partner' in f.calls[0].body), 'Nobody referred: no referral fields');

r = await sendCustomer('k', { key: 'm1', email: 'a@b.co', name: 'J' }, fake(422, { message: 'The key has already been taken.' }));
check(r.ok, 'A customer already in Partnero counts as done');
r = await sendCustomer('k', { key: 'm1', email: 'a@b.co', name: 'J' }, fake(409, {}));
check(r.ok, '409 counts as done');
r = await sendCustomer('k', { key: 'm1', email: 'bad', name: 'J' }, fake(422, { message: 'The email must be a valid email address.' }));
check(!r.ok && r.error.includes('422'), 'A real validation error is reported');
r = await sendCustomer('k', { key: 'm1', email: 'a@b.co', name: 'J' }, fake('throw'));
check(!r.ok && r.status === 0, 'Network failure is reported for a retry');

f = fake(201, {});
r = await sendSale('k', { customerKey: 'm1', key: 'bd-3702', amountCents: 900 }, f);
const t = f.calls[0];
check(r.ok && t.url === 'https://api.partnero.com/v1/transactions', 'Sale goes to POST /v1/transactions');
check(t.body.customer.key === 'm1' && t.body.key === 'bd-3702' && t.body.amount === 9 && t.body.action === 'sale' && t.body.amount_units === 'usd', 'Sale: customer, invoice key, $9.00, action sale');
r = await sendSale('k', { customerKey: 'm1', key: 'bd-3702', amountCents: 900 }, fake(422, { message: 'Transaction key already exists' }));
check(r.ok, 'A sale already recorded counts as done');
r = await sendSale('k', { customerKey: 'm1', key: 'bd-1', amountCents: 900 }, fake(401, { message: 'Unauthenticated.' }));
check(!r.ok && r.error.includes('401'), 'A wrong API key is reported');

console.log(fails ? fails + ' FAILED' : 'ALL PASSED'); process.exit(fails ? 1 : 0);
