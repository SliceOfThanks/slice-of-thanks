// BD plan switch for AppSumo buyers. npx esbuild supabase/functions/api/lib/billing.ts --bundle --format=esm --platform=neutral --outfile=tests/bd/billing.mjs && node tests/bd/setplan-test.mjs
import { setBdPlan } from './billing.mjs';
let f = 0; const check = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) f++; };
const fake = (answers) => { const calls = []; const fn = async (url, init) => { calls.push({ url, method: init.method, body: String(init.body), key: init.headers['X-Api-Key'] }); const a = answers.shift(); if (a === 'throw') throw new Error('timeout'); return { ok: a.status < 300, status: a.status, json: async () => a.body }; }; fn.calls = calls; return fn; };
let fn = fake([{ status: 200, body: { status: 'success' } }]);
let r = await setBdPlan({ site: 'https://x.test/', key: 'k', bdUserId: 25, planId: 13, fetchFn: fn });
check(r.ok && fn.calls.length === 1 && fn.calls[0].method === 'PUT' && fn.calls[0].url === 'https://x.test/api/v2/user/update', 'PUT to /api/v2/user/update');
check(fn.calls[0].body === 'user_id=25&subscription_id=13' && fn.calls[0].key === 'k', 'Sends user_id and subscription_id with the API key');
fn = fake([{ status: 405, body: null }, { status: 200, body: { status: 'success' } }]);
r = await setBdPlan({ site: 'https://x.test', key: 'k', bdUserId: 25, planId: 13, fetchFn: fn });
check(r.ok && fn.calls.map(c => c.method).join() === 'PUT,POST', 'Falls back to POST when PUT is not allowed');
fn = fake([{ status: 200, body: { status: 'error', message: 'user not found' } }]);
r = await setBdPlan({ site: 'https://x.test', key: 'k', bdUserId: 25, planId: 13, fetchFn: fn });
check(!r.ok && fn.calls.length === 1 && r.error.indexOf('user not found') > 0, 'A BD error is reported, not retried');
fn = fake(['throw']);
r = await setBdPlan({ site: 'https://x.test', key: 'k', bdUserId: 25, planId: 13, fetchFn: fn });
check(!r.ok && r.error.indexOf('network') > 0, 'A network error is reported without crashing');
console.log(f ? f + ' FAILED' : 'ALL PASSED');
