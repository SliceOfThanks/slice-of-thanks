// Email fallback test. Run from the repo root:
// npx esbuild supabase/functions/api/lib/mail/index.ts --bundle --format=esm --platform=neutral --outfile=tests/mail/mail.mjs && node tests/mail/fallback-test.mjs
import { sendWithFallback, providerOrder } from './mail.mjs';
let fails = 0; const check = (ok, m) => { console.log((ok ? 'PASS ' : 'FAIL ') + m); if (!ok) fails++; };
const msg = { from: { name: 'Jordan "J" Lee via Slice of Thanks', email: 'pizza@sliceofthanks.app' }, to: { email: 'ana@test.com', name: 'Ana' }, replyTo: 'jordan@studio.com', subject: 'Hi', html: '<b>x</b>', text: 'x', headers: { 'List-Unsubscribe': '<https://x/u>' }, tags: ['live', 'one_to_one', 'trial 3d!'] };
const env = (keys) => (k) => keys[k] || '';
const fake = (plan) => { const calls = []; const f = async (url, init) => { calls.push({ url, body: JSON.parse(init.body), headers: init.headers }); const step = plan[calls.length - 1] || plan[plan.length - 1];
  if (step === 'throw') throw new Error('timeout'); return { ok: step < 300, status: step, json: async () => (step < 300 ? (url.includes('brevo') ? { messageId: 'b-1' } : { id: 'sf-1' }) : { message: 'nope' }) }; }; f.calls = calls; return f; };
const set = { pizza: 'brevo', fallback: ['sendfox'] };
// 1. Brevo works: SendFox never called
let f = fake([201]); let r = await sendWithFallback(msg, set, env({ BREVO_API_KEY: 'b', SENDFOX_API_KEY: 's' }), f);
check(r.ok && r.provider === 'brevo' && f.calls.length === 1, 'Brevo sends it; SendFox not used');
// 2. Brevo refuses (out of credits): SendFox sends
f = fake([402, 200]); r = await sendWithFallback(msg, set, env({ BREVO_API_KEY: 'b', SENDFOX_API_KEY: 's' }), f);
check(r.ok && r.provider === 'sendfox' && r.messageId === 'sf-1' && r.tried.join() === 'brevo,sendfox', 'Brevo out of credits: SendFox sends it');
const sf = f.calls[1];
check(sf.url === 'https://api.sendfox.com/transactional/resend/emails' && sf.headers.authorization === 'Bearer s', 'SendFox address and key');
check(sf.body.from === 'Jordan J Lee via Slice of Thanks <pizza@sliceofthanks.app>' && sf.body.to[0] === 'Ana <ana@test.com>' && sf.body.reply_to === 'jordan@studio.com', 'From, to and reply-to in SendFox format');
check(sf.body.headers['List-Unsubscribe'] === '<https://x/u>' && sf.body.html === '<b>x</b>' && sf.body.text === 'x', 'Unsubscribe header, HTML and text kept');
check(sf.body.tags.length === 3 && sf.body.tags[2].value === 'trial_3d_', 'Tags cleaned for SendFox');
// 3. Brevo rate limited 429: SendFox sends
f = fake([429, 200]); r = await sendWithFallback(msg, set, env({ BREVO_API_KEY: 'b', SENDFOX_API_KEY: 's' }), f);
check(r.ok && r.provider === 'sendfox', 'Brevo busy: SendFox sends it');
// 4. Brevo times out: no second service, retried later (never sent twice)
f = fake(['throw']); r = await sendWithFallback(msg, set, env({ BREVO_API_KEY: 'b', SENDFOX_API_KEY: 's' }), f);
check(!r.ok && r.retry && f.calls.length === 1 && r.provider === 'brevo', 'Brevo timeout: not handed to SendFox, retried later');
// 5. No SendFox key yet: behaves exactly like today
f = fake([402]); r = await sendWithFallback(msg, set, env({ BREVO_API_KEY: 'b' }), f);
check(!r.ok && f.calls.length === 1 && r.tried.join() === 'brevo', 'No SendFox key: skipped, same as today');
// 6. Both refuse: failure reported
f = fake([402, 401]); r = await sendWithFallback(msg, set, env({ BREVO_API_KEY: 'b', SENDFOX_API_KEY: 's' }), f);
check(!r.ok && r.provider === 'sendfox' && /sendfox 401/.test(r.error), 'Both refuse: the last error is reported');
// 7. Old setting with no fallback, and SendFox as main
check(providerOrder({ pizza: 'brevo' }).map(p => p.key).join() === 'brevo', 'Old setting: Brevo only');
check(providerOrder({ pizza: 'sendfox', fallback: ['brevo', 'sendfox', 'nope'] }).map(p => p.key).join() === 'sendfox,brevo', 'SendFox first, Brevo backup, no repeats');
// 8. Custom SendFox address from the secret
f = fake([500, 200]); r = await sendWithFallback(msg, set, env({ BREVO_API_KEY: 'b', SENDFOX_API_KEY: 's', SENDFOX_API_URL: 'https://example.test/send' }), f);
check(r.ok && f.calls[1].url === 'https://example.test/send', 'SENDFOX_API_URL can change the address');
console.log(fails ? fails + ' FAILED' : 'ALL PASSED'); process.exit(fails ? 1 : 0);
