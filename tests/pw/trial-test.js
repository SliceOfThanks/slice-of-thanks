// Free trial: welcome sheet, Home card, Get set up checklist, plan card, end of trial. Usage: node trial-test.js /path/to/app.js
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


async function run(browser, trial, prefsIn) {
  const st = { calls: [], visited: [], bodies: {}, prefs: [] };
  st.handler = (path, req) => {
    let b = null; try { b = JSON.parse(req.postData() || 'null'); } catch (e) {}
    if (path === '/session') { const s = session(trial && trial.active ? 'pro' : 'free', { monthly: 10, bonus: trial && trial.active ? 40 : 0 }, {}); s.trial = trial; s.prefs = prefsIn || {}; return s; }
    if (path === '/people') return { ok: true, people: [] };
    if (path === '/dates') return { ok: false, error: 'not ready' };
    if (path === '/profile' && b && b.profile && b.profile.prefs) st.prefs.push(b.profile.prefs);
    return { ok: true };
  };
  const { page, ctx } = await setup(browser, st);
  await page.setViewportSize({ width: 402, height: 874 });
  await page.goto(ORIGIN + '/kitchen'); await wait(1800);
  return { page, ctx, st };
}
(async () => {
  const browser = await chromium.launch();
  // 1. A new member on day one of the trial
  let r = await run(browser, { plan: 'pro', active: true, days_left: 14, emails: 40 }, {});
  let p = r.page;
  check(await inRoot(p, "const b=R.querySelector('#liveSheet');return !!b&&!b.hidden&&b.textContent.indexOf('14 days of The Whole Pie start now. No card needed.')>=0"), 'Welcome sheet says the 14 days start now, no card');
  if (process.env.SHOT) await p.screenshot({ path: process.env.SHOT });
  await inRoot(p, "[...R.querySelectorAll('#liveSheet .btn')].find(b=>b.textContent==='Get set up').click()"); await wait(300);
  check(r.st.prefs.some(x => x.trial_welcome === true), 'Welcome is remembered on the account');
  check(await inRoot(p, "const c=R.querySelector('#trialCard');return !!c&&c.textContent.indexOf('You are on The Whole Pie for 14 days')>=0&&c===R.querySelector('#view-today').firstElementChild"), 'Trial card is first on Home with days left');
  const prog = await inRoot(p, "return R.querySelector('#setupCard p.muted').textContent");
  check(prog === '0 of 8 done', 'Pro checklist has 8 steps: ' + prog);
  await inRoot(p, "[...R.querySelectorAll('#setupCard li')].find(l=>l.textContent.indexOf('Where replies go')>=0).querySelector('.linkish').click()"); await wait(200);
  check(r.st.prefs.some(x => x.setup && x.setup.skip.indexOf('reply') >= 0), 'Skip is saved to the account');
  check(await inRoot(p, "return [...R.querySelectorAll('#setupCard li')].find(l=>l.textContent.indexOf('Where replies go')>=0).classList.contains('skip')"), 'Skipped step shows as skipped');
  await inRoot(p, "[...R.querySelectorAll('#setupCard li')].find(l=>l.textContent.indexOf('test pizza')>=0).querySelector('.btn').click()"); await wait(300);
  check(await inRoot(p, "return !R.querySelector('#view-make').hidden"), 'Send a test pizza opens the Kitchen');
  await inRoot(p, "R.querySelector('#tab-today').click()"); await wait(300);
  check((await inRoot(p, "return R.querySelector('#setupCard p.muted').textContent")) === '1 of 8 done', 'Test step counts as done');
  if (process.env.SHOT2) { await inRoot(p, "window.scrollTo(0,0)"); await p.screenshot({ path: process.env.SHOT2, fullPage: true }); }
  await inRoot(p, "R.querySelector('#tab-settings').click()"); await wait(400);
  const pc = await inRoot(p, "return R.querySelector('#planCard h2').textContent+' | '+R.querySelector('#planCard p.muted').textContent");
  check(pc.indexOf('The Whole Pie, free trial') >= 0 && pc.indexOf('10 plus 40 trial emails') >= 0 && pc.indexOf('ends in 14 days') >= 0, 'Plan card shows the trial: ' + pc);
  await r.ctx.close();
  // 2. Three days left: upgrade card with what they keep
  r = await run(browser, { plan: 'pro', active: true, days_left: 3, emails: 40 }, { trial_welcome: true });
  p = r.page;
  check(await inRoot(p, "const b=R.querySelector('#liveSheet');return !b||b.hidden"), 'No welcome sheet the second time');
  check(await inRoot(p, "const c=R.querySelector('#trialCard');return c.textContent.indexOf('3 days left of The Whole Pie')>=0&&c.querySelectorAll('li').length===5&&!!c.querySelector('.btn.primary')"), 'Three days left card lists what they keep and has Upgrade');
  await r.ctx.close();
  // 3. Trial over
  r = await run(browser, { plan: 'pro', active: false, days_left: 0, emails: 40 }, { trial_welcome: true, setup: { done: ['test'], skip: [] } });
  p = r.page;
  check(await inRoot(p, "const c=R.querySelector('#trialCard');return c.textContent.indexOf('You are on A Slice now')>=0&&c.textContent.indexOf('wait for you to send')>=0"), 'Trial over card says what changed');
  check((await inRoot(p, "return R.querySelector('#setupCard p.muted').textContent")) === '1 of 7 done', 'After the trial the A Slice checklist has 7 steps');
  await inRoot(p, "[...R.querySelectorAll('#trialCard .btn')].find(b=>b.textContent==='Got it').click()"); await wait(200);
  check(await inRoot(p, "return !R.querySelector('#trialCard')") && r.st.prefs.some(x => x.trial_end_seen), 'Got it hides the card for good');
  await r.ctx.close();
  // 4. Existing members with no trial see neither
  r = await run(browser, null, {});
  p = r.page;
  check(await inRoot(p, "return !R.querySelector('#trialCard')&&!R.querySelector('#setupCard')&&(!R.querySelector('#liveSheet')||R.querySelector('#liveSheet').hidden)"), 'Members without a trial see no trial card, checklist or welcome');
  await browser.close();
  console.log(failures ? failures + ' FAILED' : 'ALL PASSED');
  process.exit(failures ? 1 : 0);
})();
