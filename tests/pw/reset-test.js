// Kitchen Start over: two taps give a fresh pizza back on step 1. Also: the Dates card hides when /dates is not ready. Usage: node reset-test.js /path/to/app.js
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
    needs_terms: false, terms_updated: false,
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
  const st = { calls: [], visited: [], bodies: {} };
  st.handler = (path) => {
    if (path === '/session') return session('free', { monthly: 10 }, {});
    if (path === '/people') return { ok: true, people: [] };
    if (path === '/dates') return { ok: false, error: 'not ready' };
    return { ok: true };
  };
  const { page } = await setup(browser, st);
  await page.setViewportSize({ width: 402, height: 874 });
  await page.goto(ORIGIN + '/kitchen'); await wait(1500);
  await inRoot(page, "R.querySelector('#tab-make').click()"); await wait(400);
  check(await inRoot(page, "const b=R.querySelector('#kxReset');return !!b&&b.offsetParent!==null"), 'Start over shows in the Kitchen');
  await page.evaluate(() => window.__SOT_DEBUG.goSend()); await wait(200);
  await inRoot(page, "R.querySelector('#back').click()"); await wait(300);
  const before = await inRoot(page, "return R.querySelector('#steps li.on').textContent");
  check(before.indexOf('Box') !== -1, 'Moved ahead to Box: ' + before);
  await inRoot(page, "R.querySelector('#kxReset').click()"); await wait(200);
  check((await inRoot(page, "return R.querySelector('#kxReset').textContent")) === 'Tap again to start over', 'First tap asks for a second tap');
  check((await inRoot(page, "return R.querySelector('#steps li.on').textContent")) === before, 'First tap keeps the pizza');
  await wait(3200);
  check((await inRoot(page, "return R.querySelector('#kxReset').textContent")) === 'Start over', 'The ask times out after 3 seconds');
  await inRoot(page, "R.querySelector('#kxReset').click()"); await wait(200);
  await inRoot(page, "R.querySelector('#kxReset').click()"); await wait(400);
  const now = await inRoot(page, "return R.querySelector('#steps li.on').textContent");
  check(now.indexOf('Dough') !== -1, 'Two taps go back to Dough: ' + now);
  check((await toastText(page)).indexOf('Fresh dough') !== -1, 'Toast says fresh dough');
  // the server has no date pizzas yet: the Dates card stays hidden
  await inRoot(page, "R.querySelector('#tab-settings').click()"); await wait(500);
  check(await inRoot(page, "const c=R.querySelector('#datesCard');return !!c&&c.hidden"), 'Dates card hidden while the server has no date pizzas');
  await browser.close();
  console.log(failures ? failures + ' FAILED' : 'ALL PASSED');
  process.exit(failures ? 1 : 0);
})();
