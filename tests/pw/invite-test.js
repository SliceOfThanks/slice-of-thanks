// Invite friends: the Crew card shows the invite link and counts; an invite link (?ref=) is sent once after sign in. Usage: node invite-test.js /path/to/app.js
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





(async () => {
  const browser = await chromium.launch();
  const st = { calls: [], visited: [], bodies: {}, captures: [] };
  st.handler = (path, req) => {
    if (path === '/session') return Object.assign(session('free', { monthly: 10 }, {}), { prefs: { trial_welcome: true, met_gerald: true } });
    if (path === '/people') return { ok: true, people: [] };
    if (path === '/referral') return { ok: true, enabled: true, code: 'K7Q2ABC', link: 'https://www.sliceofthanks.app/kitchen?ref=K7Q2ABC', joined: 2, rewarded: 1, emails_earned: 20, referrer_emails: 20, friend_emails: 20 };
    if (path === '/referral/capture') { st.captures.push(JSON.parse(req.postData() || '{}')); return { ok: true, emails: 20, referred: true }; }
    return { ok: true };
  };
  const { page } = await setup(browser, st);
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write'], { origin: ORIGIN }).catch(() => {});
  await page.route('https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js', r => process.env.QR_LIB ? r.fulfill({ status: 200, contentType: 'application/javascript', body: fs.readFileSync(process.env.QR_LIB) }) : r.abort());
  await page.setViewportSize({ width: 402, height: 874 });
  await page.goto(ORIGIN + '/kitchen?ref=K7Q2ABC'); await wait(3200);
  check(st.captures.length === 1 && st.captures[0].code === 'K7Q2ABC', 'The invite code is sent once after sign in: ' + JSON.stringify(st.captures));
  check((await toastText(page)).includes('20 bonus emails'), 'Welcome message names the bonus emails');
  check(!page.url().includes('ref='), 'The invite code is taken off the address');
  await page.goto(ORIGIN + '/kitchen'); await wait(3000);
  check(st.captures.length === 1, 'Not sent again on the next visit');
  await inRoot(page, "R.querySelector('#tab-gerald').click()"); await wait(600);
  check(await inRoot(page, "const c=R.querySelector('#inviteCard');return !!c&&!c.hidden"), 'Invite friends card on Crew');
  check((await inRoot(page, "return R.querySelector('#inviteLink').value")) === 'https://www.sliceofthanks.app/kitchen?ref=K7Q2ABC', 'Shows the invite link');
  const stats = await inRoot(page, "return R.querySelector('.invite-stats').textContent");
  check(stats.includes('2friends joined') && stats.includes('1sent their first pizza') && stats.includes('20emails earned'), 'Shows friends joined, first pizzas and emails earned: ' + stats);
  check(await inRoot(page, "const c=R.querySelector('#inviteCard'),f=R.querySelector('#faqCard');return !!(c.compareDocumentPosition(f)&4)"), 'Card sits above the FAQs');
  check(await inRoot(page, "const c=R.querySelector('#inviteCard'),n=R.querySelector('#feed').closest('.card');return !!(c.compareDocumentPosition(n)&4)"), 'Card sits above What\'s new');
  await wait(800);
  const dark = await inRoot(page, "const c=R.querySelector('#inviteQr');if(!c)return -1;const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let n=0;for(let i=0;i<d.length;i+=4)if(d[i]<80)n++;return n");
  check(dark > 2000, 'QR code is drawn on the card (' + dark + ' dark pixels)');
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 8000 }).catch(() => null), inRoot(page, "R.querySelector('#inviteQrDl').click()")]);
  check(!!dl && dl.suggestedFilename() === 'slice-of-thanks-invite-qr.png', 'Download QR code saves slice-of-thanks-invite-qr.png');
  if (dl && process.env.SHOT) await dl.saveAs(process.env.SHOT.replace('.png', '-qr.png'));
  await inRoot(page, "R.querySelector('#inviteCopy').click()"); await wait(300);
  const copied = (await inRoot(page, "return R.querySelector('#inviteCopy').textContent")) === 'Copied!' || (await toastText(page)).includes('copy');
  check(copied, 'Copy link copies the link (or asks to copy it)');
  if (process.env.SHOT) { await inRoot(page, "R.querySelector('#inviteCard').scrollIntoView()"); await wait(200); await page.screenshot({ path: process.env.SHOT }); }
  await browser.close();
  console.log(failures ? failures + ' FAILED' : 'ALL PASSED');
  process.exit(failures ? 1 : 0);
})();
