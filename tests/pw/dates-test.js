// Gerald never forgets a date: Settings card, Home rows, send, see and skip. Usage: node dates-test.js /path/to/app.js
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
      return r.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><html><head><meta charset="utf-8"></head><body><div id="sot-app" data-debug data-api="' + API + '" data-token="' + (state.token === undefined ? 'tok' : state.token) + '" data-pack100-url="/buy/pack100"></div><script>' + APP.replace(/<\/script>/g, '<\\/script>') + '</script></body></html>' });
    }
    state.visited.push(u.pathname); state.visitedFull = (state.visitedFull || []).concat(u.pathname + u.search);
    return r.fulfill({ status: 200, contentType: 'text/html', body: '<p>checkout</p>' });
  });
  return { ctx, page };
}
const inRoot = (page, fn, arg) => page.evaluate(([f, a]) => (new Function('R', 'a', f))(window.__SOT_ROOT, a), [fn, arg]);
const toastText = page => inRoot(page, "const t=R.querySelector('#toast');return t&&!t.hidden?t.textContent:''");
const wait = ms => new Promise(r => setTimeout(r, ms));

const today = new Date().toISOString().slice(0, 10);
const inDays = n => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);
const PIZZA = { size: .92, seed: 3, sauce: 'red', cheese: 'mozz', vegan: false, toppings: [{ k: 'pepperoni', x: .1, y: .2, rot: 1 }], bake: 1, baked: true, byGerald: true, bakeLevel: 3, sign: { text: 'Ann' }, name: 'The Ann Reserve' };
(async () => {
  const browser = await chromium.launch();
  for (const plan of ['pro', 'free']) {
    const st = { calls: [], visited: [], bodies: {} };
    let settings = { mode: 'wait', birthdays: true, anniversaries: true, style: 'heartfelt' };
    st.handler = (path, req) => {
      let b = null; try { b = JSON.parse(req.postData() || 'null'); } catch (e) {}
      if (b) (st.bodies[path] = st.bodies[path] || []).push(b);
      if (path === '/session') { const s = session(plan, { monthly: 50 }, {}); s.features = { automations: plan !== 'free' }; return s; }
      if (path === '/people') return { ok: true, people: [] };
      if (path === '/presets') return { ok: true, limit: 10, presets: [] };
      if (path === '/calendar') return { ok: true, integrations: [], meetings: [] };
      if (path === '/dates') return { ok: true, settings, tz: 'America/Chicago', today,
        waiting: [{ id: 'd1', kind: 'birthday', occurs_on: today, note: 'needs_permission', payload: { pizza: PIZZA, box: { style: 'hearts', sticker: 'Happy Birthday', confetti: 'stars', note: 'Happy birthday, [first name]!', sign: 'Warmly, Stacey' } },
          contact: { id: 'c1', name: 'Ann Lee', email: 'ann@x.test', has_consent: false } }],
        upcoming: [{ contact_id: 'c1', name: 'Ann Lee', kind: 'birthday', on_day: today, days_away: 0 }, { contact_id: 'c2', name: 'Bo Diaz', kind: 'anniversary', on_day: inDays(3), days_away: 3, years: 5 }],
        sent: [] };
      if (path === '/dates/send') return { ok: true, due_now: false, bucket: 'monthly' };
      if (path === '/profile') { if (b && b.profile && b.profile.prefs && b.profile.prefs.dates) settings = b.profile.prefs.dates; return { ok: true }; }
      return { ok: true };
    };
    const { page } = await setup(browser, st);
    await page.setViewportSize({ width: 420, height: 900 });
    await page.goto(ORIGIN + '/kitchen'); await wait(1800);
    // Home > This week
    const rows = await inRoot(page, "return [...R.querySelectorAll('#meetings li b')].map(b=>b.textContent)");
    check(rows[0] === "Today: Ann Lee's birthday" && rows.some(t => t.indexOf("Bo Diaz's work anniversary (5 years)") > 0) && !rows.some(t => t.indexOf("Ann Lee's birthday") > 0 && t.indexOf('Today:') < 0), plan + ': This week shows the waiting pizza and the coming anniversary: ' + rows.join(' | '));
    const why = await inRoot(page, "return R.querySelector('#meetings li .muted').textContent");
    check(why.indexOf('The Ann Reserve') > 0 && why.indexOf('no permission on file') > 0, plan + ': waiting row says why: ' + why);
    if (plan === 'pro') {
      await inRoot(page, "[...R.querySelectorAll('#meetings li .btn')].find(b=>b.textContent==='See it').click()"); await wait(500);
      check(await inRoot(page, "const o=R.querySelector('#recipient');return !!o&&!o.hidden"), 'pro: See it opens the pizza as Ann sees it');
      await inRoot(page, "const c=R.querySelector('#closeRecipient')||R.querySelector('#recipient .close')||[...R.querySelectorAll('#recipient button')].find(b=>/close|back/i.test(b.textContent));if(c)c.click()"); await wait(300);
      await inRoot(page, "[...R.querySelectorAll('#meetings li .btn')].find(b=>b.textContent==='Send it').click()"); await wait(300);
      check((await inRoot(page, "return R.querySelector('#liveSheet h2').textContent")) === "Send Ann's pizza", 'pro: no permission on file, so it asks how you know Ann');
      await inRoot(page, "R.querySelector('#dateBasis').value='relationship';[...R.querySelectorAll('#liveSheet .btn')].find(b=>b.textContent==='Send it').click()"); await wait(1200);
      const sb = (st.bodies['/dates/send'] || [])[0] || {};
      check(sb.id === 'd1' && sb.basis === 'relationship' && (sb.image_data_url || '').indexOf('data:image') === 0, 'pro: sends with the picture and the chosen permission');
    } else {
      await inRoot(page, "[...R.querySelectorAll('#meetings li .btn')].find(b=>b.textContent==='Skip').click()"); await wait(400);
      check(((st.bodies['/dates/skip'] || [])[0] || {}).id === 'd1', 'free: Skip tells the server');
    }
    // Settings card
    await inRoot(page, "R.querySelector('#tab-settings').click()"); await wait(500);
    const sum = await inRoot(page, "return R.querySelector('#datesCard .afold-sum').textContent");
    check(sum === 'Waiting for you at 8 AM, birthdays and work anniversaries', plan + ': Dates card summary: ' + sum);
    await inRoot(page, "R.querySelector('#datesCard > h2').click()"); await wait(100);
    await inRoot(page, "R.querySelector('#dates-auto').click()"); await wait(300);
    if (plan === 'free') {
      const up = await inRoot(page, "return R.querySelector('#upSheet').hidden?'':R.querySelector('#upTitle').textContent");
      check(up === 'Send date pizzas on their own' && await inRoot(page, "return R.querySelector('#dates-wait').checked"), 'free: Send automatically opens the upgrade and stays on waiting');
    } else {
      await inRoot(page, "R.querySelector('#datesAnniv').click()"); await wait(200);
      await inRoot(page, "[...R.querySelectorAll('#datesStyle .chip')].find(c=>c.textContent.trim()==='Snarky').click()"); await wait(300);
      const saves = (st.bodies['/profile'] || []).map(x => x.profile.prefs).filter(p => p && p.dates);
      const last = saves[saves.length - 1] || {};
      check(last.dates && last.dates.mode === 'auto' && last.dates.anniversaries === false && last.dates.style === 'snarky' && typeof last.tz === 'string' && last.tz.length > 2, 'pro: saves mode, kinds, note style and time zone: ' + JSON.stringify(last));
      check((await inRoot(page, "return R.querySelector('#datesCard .afold-sum').textContent")) === 'Sends on its own at 8 AM, birthdays', 'pro: summary follows');
    }
    await page.close();
  }
  await browser.close();
  console.log(failures ? failures + ' FAILED' : 'ALL PASSED');
  process.exit(failures ? 1 : 0);
})();
