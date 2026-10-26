// Free test to yourself, birthday ask, Birthday Special unlock and share, owned topper. Usage: node extras-test.js /path/to/app.js
const { chromium } = require('playwright');
const fs = require('fs');
const APP = fs.readFileSync(process.argv[2], 'utf8');
const ORIGIN = 'https://www.sliceofthanks.app';
const API = 'https://api.test/fn';

function session(plan, credits, checkout) {
  return {
    member_id: 'm1', env: 'live', is_tester: false, plan, features: {}, credits: Object.assign({ monthly: 0, bonus: 0, pack: 0, special_delivery: 0 }, credits),
    packs: [{ key: 'pack_100', emails: 100, price_cents: 500 }, { key: 'pack_500', emails: 500, price_cents: 1500 }, { key: 'pack_1000', emails: 1000, price_cents: 2500 }],
    checkout: checkout || {}, code: {}, profile: { display_name: 'Test Member', mailing_address: '1 Main St, Town', send_as: 'person' },
    needs_terms: false, terms_updated: false, paid_plan: 'free', prefs: {},
  };
}

let failures = 0;
const check = (ok, msg) => { console.log((ok ? 'PASS ' : 'FAIL ') + msg); if (!ok) failures++; };

async function setup(browser, state) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  page.on('pageerror', e => { console.log('PAGE ERROR', e.message); failures++; });
  await ctx.route('**/fonts.googleapis.com/**', r => r.abort());
  await ctx.route('**/fonts.gstatic.com/**', r => r.abort());
  await ctx.route(API + '/**', async r => {
    const path = new URL(r.request().url()).pathname.replace('/fn', '');
    state.calls.push(path);
    const body = state.handler(path, r.request());
    await r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  });
  await ctx.route(ORIGIN + '/**', async r => {
    const u = new URL(r.request().url());
    if (u.pathname === '/kitchen') { state.kitchenLoads = (state.kitchenLoads || 0) + 1;
      return r.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><html><head><meta charset="utf-8"></head><body>' + (state.transform ? '<div style="transform:translateZ(0)"><div style="height:600px">Site header</div>' : '<div>') + '<div id="sot-app" data-debug data-api="' + API + '" data-token="' + (state.token === undefined ? 'tok' : state.token) + '" data-pack100-url="/buy/pack100"></div><script>' + APP.replace(/<\/script>/g, '<\\/script>') + '</script></div></body></html>' });
    }
    state.visited.push(u.pathname); state.visitedFull = (state.visitedFull || []).concat(u.pathname + u.search);
    return r.fulfill({ status: 200, contentType: 'text/html', body: '<p>checkout</p>' });
  });
  return { ctx, page };
}
const inRoot = (page, fn, arg) => page.evaluate(([f, a]) => (new Function('R', 'a', f))(window.__SOT_ROOT, a), [fn, arg]);
const toastText = page => inRoot(page, "const t=R.querySelector('#toast');return t&&!t.hidden?t.textContent:''");
const wait = ms => new Promise(r => setTimeout(r, ms));



async function run(browser, sess, extra) {
  const st = { calls: [], visited: [], bodies: {}, sends: [], posts: {} };
  st.handler = (path, req) => {
    let b = null; try { b = JSON.parse(req.postData() || 'null'); } catch (e) {}
    if (b) st.posts[path] = (st.posts[path] || []).concat([b]);
    if (path === '/session') return Object.assign(session(sess.plan || 'free', { monthly: 10 }, {}), { prefs: { trial_welcome: true, met_gerald: true }, self_tests_left: 5 }, sess);
    if (path === '/people') return { ok: true, people: [] };
    if (path === '/dates') return { ok: false };
    if (path === '/send') { st.sends.push(b); return { ok: true, send_id: 's1', bucket: 'monthly', due_now: true, delivered: true }; }
    if (path === '/birthday') return { ok: true, birthday: b.md };
    if (path === '/birthday/claim') return { ok: true, starts_at: new Date().toISOString(), ends_at: new Date(Date.now() + 14 * 864e5).toISOString() };
    return { ok: true };
  };
  const { page, ctx } = await setup(browser, Object.assign(st, extra || {}));
  await page.setViewportSize({ width: 402, height: 874 });
  await page.addInitScript(() => { window.Userback = { identify: (id, d) => { window.__ub = { id, d }; } }; });
  await page.goto(ORIGIN + '/kitchen' + ((extra && extra.qs) || '')); await wait(1800);
  return { page, ctx, st };
}
(async () => {
  const browser = await chromium.launch();
  // 1. Free test to yourself
  let r = await run(browser, { profile: { display_name: 'Test Member', reply_to: 'me@test.com', mailing_address: '1 Main', send_as: 'person' }, birthday: { md: null, on: true, toppers: [] } });
  let p = r.page;
  await p.evaluate(() => window.__SOT_DEBUG.goSend()); await wait(400);
  check((await inRoot(p, "const b=R.querySelector('#liveTestSend');return b&&!b.hidden?b.textContent:''")) === 'Send a test to myself (5 free left)', 'Send step has the free test button');
  await inRoot(p, "R.querySelector('#liveTestSend').click()"); await wait(800);
  const sd = r.st.sends[0] || {};
  const ub = await p.evaluate(() => window.__ub || null);
  check(!!ub && ub.id === 'm1' && ub.d.email === 'me@test.com' && ub.d.name === 'Test Member', 'Userback knows who the member is: ' + JSON.stringify(ub));
  check(sd.is_test === true && sd.recipient.email === 'me@test.com' && sd.consent.basis === 'permission', 'Test goes to my own email as a test');
  check((await inRoot(p, "return R.querySelector('#liveTestSend').textContent")) === 'Send a test to myself (4 free left)', 'Count goes down to 4');
  check((await toastText(p)).indexOf('used no emails') >= 0, 'Toast says it used no emails');
  check(await inRoot(p, "const n=R.querySelector('#liveTestNote');return !!n&&!n.hidden&&n.textContent==='Test sent to me@test.com. It used no emails. 4 free tests left.'"), 'Confirmation stays under the button');
  // What you are thanking them for: a full sentence is not wrapped twice, and the tip shows the finished line
  await inRoot(p, "const i=R.querySelector('#mtgTitle');i.value='Thanks for the call today.';i.dispatchEvent(new Event('input'))"); await wait(150);
  const mb = await inRoot(p, "return R.querySelector('#msgBody').textContent");
  check(mb.indexOf('Thanks for the call today. I made you') >= 0 && mb.indexOf('today. today') < 0, 'A full sentence is used as typed: ' + mb.slice(0, 80));
  await inRoot(p, "const i=R.querySelector('#mtgTitle');i.value='Strategy call';i.dispatchEvent(new Event('input'))"); await wait(150);
  check((await inRoot(p, "const e=R.querySelector('#mtgSay');return e&&!e.hidden?e.textContent:''")) === 'Their email will say: Thanks for the strategy call today.', 'Tip shows the finished sentence');
  check((await inRoot(p, "return R.querySelector('#mtgTitle').closest('.field').querySelector('small').textContent")).indexOf('Thanks for the ___ today.') >= 0, 'Tip shows what comes before and after');
  await inRoot(p, "const i=R.querySelector('#mtgTitle');i.value='';i.dispatchEvent(new Event('input'))"); await wait(100);
  // birthday ask card on Home (not on a trial)
  await inRoot(p, "R.querySelector('#tab-today').click()"); await wait(300);
  check(await inRoot(p, "const c=R.querySelector('#bdayCard');return !!c&&c.textContent.indexOf('When is your birthday?')>=0"), 'Home asks for the birthday once');
  await inRoot(p, "R.querySelector('#homeBdayM').value='03';R.querySelector('#homeBdayD').value='14';[...R.querySelectorAll('#bdayCard .btn')].find(b=>b.textContent==='Save').click()"); await wait(500);
  check((r.st.posts['/birthday'] || [])[0] && r.st.posts['/birthday'][0].md === '03-14', 'Birthday saved as month and day');
  check(await inRoot(p, "return !R.querySelector('#bdayCard')"), 'Ask card goes away after saving');
  await inRoot(p, "R.querySelector('#tab-settings').click()"); await wait(400);
  check(await inRoot(p, "const f=R.querySelector('#liveBday');return !!f&&R.querySelector('#liveBdayPickM').value==='03'&&R.querySelector('#liveBdayPickD').value==='14'"), 'Settings shows the birthday');
  await r.ctx.close();
  // 2. Birthday Special: unlock and share
  const until = new Date(Date.now() + 20 * 864e5).toISOString();
  r = await run(browser, { profile: { display_name: 'Test Member', reply_to: 'me@test.com', mailing_address: '1 Main', send_as: 'person' }, birthday: { md: '10-26', on: true, toppers: [], special: { year: 2026, gift: 'trial', claim_by: until, claimed: false, share_until: until } } });
  p = r.page;
  check(await inRoot(p, "const c=R.querySelector('#bdayCard');return !!c&&c.textContent.indexOf('Happy birthday from the kitchen')>=0"), 'Birthday card on Home');
  await inRoot(p, "[...R.querySelectorAll('#bdayCard .btn')].find(b=>b.textContent==='Unlock my 14 days').click()"); await wait(900);
  check((r.st.posts['/birthday/claim'] || []).length === 1 && (await toastText(p)).indexOf('Unlocked') >= 0, 'Unlock my 14 days claims the gift');
  await inRoot(p, "[...R.querySelectorAll('#bdayCard .btn')].find(b=>b.textContent==='Send the Birthday Special').click()"); await wait(500);
  check(await inRoot(p, "return !R.querySelector('#view-make').hidden&&R.querySelector('#steps li.on').textContent.indexOf('Send')>=0"), 'Share opens the Send step');
  await inRoot(p, "const t=R.querySelector('#toName');t.value='Ana Ruiz';t.dispatchEvent(new Event('input',{bubbles:true}));const c=R.querySelector('#toContact');c.value='ana@test.com';c.dispatchEvent(new Event('input',{bubbles:true}))");
  await inRoot(p, "R.querySelector('#sendNow').click()"); await wait(900);
  const bs = r.st.sends[r.st.sends.length - 1] || {};
  check(bs.box && bs.box.birthday_special === true && bs.box.pro_style === false && bs.box.confetti === 'party' && bs.box.style === 'hearts', 'Shared Birthday Special is sent with its box');
  check((bs.pizza.toppings || []).some(t => t.k === 'candle') && (bs.pizza.toppings || []).some(t => t.k === 'sprinkle'), 'It has candles and sprinkles');
  await r.ctx.close();
  // 3. The unlock link from the pizza
  r = await run(browser, { profile: { display_name: 'T', reply_to: 'me@test.com', mailing_address: '1', send_as: 'person' }, birthday: { md: '10-26', on: true, toppers: ['bday2026'], special: { year: 2026, gift: 'trial', claim_by: until, claimed: false, share_until: until } } }, { qs: '?birthday=unlock' });
  p = r.page; await wait(800);
  check((r.st.posts['/birthday/claim'] || []).length === 1, 'The pizza link unlocks the 14 days');
  check(p.url() === ORIGIN + '/kitchen', 'The link is cleaned from the address');
  await r.ctx.close();
  // 4. Owned topper shows for Pro
  r = await run(browser, { plan: 'pro', paid_plan: 'pro', profile: { display_name: 'T', reply_to: 'me@test.com', mailing_address: '1', send_as: 'person' }, birthday: { md: '10-26', on: true, toppers: ['bday2026'], special: null } });
  p = r.page;
  await p.evaluate(() => window.__SOT_DEBUG.goSend()); await wait(300);
  await inRoot(p, "R.querySelector('#back').click()"); await wait(400);
  check(await inRoot(p, "return [...R.querySelectorAll('#topperChips .chip')].some(c=>c.textContent.indexOf('2026 birthday topper')>=0)"), 'The 2026 birthday topper is in the topper list');
  await r.ctx.close();
  await browser.close();
  console.log(failures ? failures + ' FAILED' : 'ALL PASSED');
  process.exit(failures ? 1 : 0);
})();
