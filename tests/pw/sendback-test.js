// Send one back: the pizza token fills in the sender on the Send step and adds them to People. Usage: node sendback-test.js /path/to/app.js
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
  for (const withEmail of [true, false]) {
    const st = { calls: [], visited: [], bodies: {}, sb: [] };
    st.handler = (path, req) => {
      let b = null; try { b = JSON.parse(req.postData() || 'null'); } catch (e) {}
      if (path === '/session') return session('free', { monthly: 10 }, {});
      if (path === '/people') return { ok: true, people: [] };
      if (path === '/dates') return { ok: false, error: 'not ready' };
      if (path === '/sendback') { st.sb.push(b); return { ok: true, added: true, person: { id: 'c9', name: 'Kevin Smith', company: 'Lawfecta', email: withEmail ? 'kevin@lawfecta.com' : '' } }; }
      return { ok: true };
    };
    const { page, ctx } = await setup(browser, st);
    await page.setViewportSize({ width: 402, height: 874 });
    await page.route(ORIGIN + '/kitchen?**', r => r.fallback());
    await ctx.unroute(ORIGIN + '/**');
    await ctx.route(ORIGIN + '/**', async r => r.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><html><head><meta charset="utf-8"></head><body><div id="sot-app" data-debug data-api="' + API + '" data-token="tok"></div><script>' + APP.replace(/<\/script>/g, '<\\/script>') + '</script></body></html>' }));
    await page.goto(ORIGIN + '/kitchen?from=pizza&back=TOKEN123'); await wait(2200);
    check(st.sb.length === 1 && st.sb[0].t === 'TOKEN123', 'The pizza token goes to the server once');
    check(page.url() === ORIGIN + '/kitchen', 'The token is taken out of the address: ' + page.url());
    const f = await inRoot(page, "return [R.querySelector('#toName').value, R.querySelector('#toContact').value, !R.querySelector('#view-make').hidden].join('|')");
    check(f === 'Kevin Smith|' + (withEmail ? 'kevin@lawfecta.com' : '') + '|true', 'Kitchen opens with the sender filled in: ' + f);
    const t = await toastText(page);
    check(withEmail ? t.indexOf('They are in your People now') >= 0 : t.indexOf('Add their email') >= 0, 'Toast: ' + t);
    await ctx.close();
  }
  await browser.close();
  console.log(failures ? failures + ' FAILED' : 'ALL PASSED');
  process.exit(failures ? 1 : 0);
})();
