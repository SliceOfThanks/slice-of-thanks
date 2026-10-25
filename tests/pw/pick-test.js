// People filter by last pizza (opened, not opened, none). Send step Pick from People: search by name, filter by tag, pick fills the send fields, send to everyone tagged. Usage: node pick-test.js /path/to/app.js
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
const PEOPLE = [
  { id: 'p1', name: 'Ann Lee', email: 'ann@x.test', company: 'Acme', country: 'CA', tags: ['client', 'holiday list'], has_consent: true, history: [{ pizza: { size: 1, toppings: [] }, at: '2026-10-24T10:00:00Z', status: 'delivered', opened: true, label: 'Pizza' }] },
  { id: 'p2', name: 'Bo Diaz', email: 'bo@x.test', company: 'Beta', tags: ['client'], vegan: true, has_consent: false, history: [{ pizza: { size: 1, toppings: [] }, at: '2026-10-24T10:00:00Z', status: 'delivered', opened: false, label: 'Pizza' }] },
  { id: 'p3', name: 'Cy Park', email: 'cy@x.test', company: 'Cora', tags: [], has_consent: false, history: [] },
];
(async () => {
  const browser = await chromium.launch();
  for (const plan of ['pro', 'free']) {
    const st = { calls: [], visited: [], bodies: {} };
    st.handler = (path) => {
      if (path === '/session') return session(plan, { monthly: 10 }, {});
      if (path === '/people') return { ok: true, people: PEOPLE };
      return { ok: true };
    };
    const { page, ctx } = await setup(browser, st);
    await page.setViewportSize({ width: 402, height: 874 });
    await page.goto(ORIGIN + '/kitchen'); await wait(1500);
    await inRoot(page, "R.querySelector('#tab-people').click()"); await wait(500);
    const of = await inRoot(page, "return [...R.querySelectorAll('#openFilter .chip')].map(c=>c.textContent).join('|')");
    check(of === 'Everyone|Opened (1)|Not opened (1)|No pizza yet (1)', plan + ': last pizza filter shows counts: ' + of);
    const pick = async lab => { await inRoot(page, "[...R.querySelectorAll('#openFilter .chip')].find(c=>c.textContent.indexOf(a)===0).click()".replace('a)', JSON.stringify(lab) + ')')); await wait(150); return inRoot(page, "return [...R.querySelectorAll('#peopleList li.person')].map(li=>li.textContent.indexOf('Ann Lee')>=0?'Ann':li.textContent.indexOf('Bo Diaz')>=0?'Bo':li.textContent.indexOf('Cy Park')>=0?'Cy':'?').join('|')"); };
    check((await pick('Opened')) === 'Ann', plan + ': Opened shows Ann');
    check((await pick('Not opened')) === 'Bo', plan + ': Not opened shows Bo');
    check((await pick('No pizza yet')) === 'Cy', plan + ': No pizza yet shows Cy');
    await inRoot(page, "const s=[...R.querySelectorAll('#tagFilter .chip')].find(c=>c.textContent.indexOf('client')===0);s.click()"); await wait(150);
    check((await inRoot(page, "return R.querySelector('#peopleList').textContent")).indexOf('No one matches these filters') >= 0, plan + ': tag and last pizza filters combine');
    check((await pick('Not opened')) === 'Bo', plan + ': client and Not opened shows Bo');
    await pick('Everyone'); await inRoot(page, "[...R.querySelectorAll('#tagFilter .chip')].find(c=>c.textContent==='Everyone').click()"); await wait(150);
    await page.evaluate(() => window.__SOT_DEBUG.goSend()); await wait(300);
    check(await inRoot(page, "const w=R.querySelector('#pickWrap');return !!w&&!w.hidden&&w.offsetParent!==null"), plan + ': Pick from People shows on the Send step');
    const tags = await inRoot(page, "return [...R.querySelectorAll('#pickTag option')].map(o=>o.textContent).join('|')");
    check(tags === 'All tags|client|holiday list', plan + ': tag dropdown lists tags: ' + tags);
    check((await inRoot(page, "return R.querySelectorAll('#pickList button').length")) === 0, plan + ': no list until they type or pick a tag');
    await inRoot(page, "const i=R.querySelector('#pickSearch');i.value='bet';i.dispatchEvent(new Event('input'))"); await wait(100);
    const byCo = await inRoot(page, "return [...R.querySelectorAll('#pickList button')].map(b=>b.textContent).join('|')");
    check(byCo.indexOf('Bo Diaz') === 0 && byCo.indexOf('Ann') < 0, plan + ': search finds by company: ' + byCo);
    await inRoot(page, "const i=R.querySelector('#pickSearch');i.value='';i.dispatchEvent(new Event('input'));const s=R.querySelector('#pickTag');s.value='client';s.dispatchEvent(new Event('change'))"); await wait(100);
    const byTag = await inRoot(page, "return [...R.querySelectorAll('#pickList button')].map(b=>b.textContent.split(' · ')[0]).join('|')");
    check(byTag === 'Ann Lee|Bo Diaz', plan + ': tag filter lists the tagged people: ' + byTag);
    if (process.env.SHOT) { await inRoot(page, "R.querySelector('#pickWrap').scrollIntoView()"); await page.screenshot({ path: process.env.SHOT }); }
    const all = await inRoot(page, "const b=R.querySelector('#pickAll');return b.hidden?'':b.textContent");
    check(all === 'Send to all 2 tagged client' + (plan === 'pro' ? '' : ' (Pro)'), plan + ': send to everyone tagged button: ' + all);
    await inRoot(page, "[...R.querySelectorAll('#pickList button')].find(b=>b.textContent.indexOf('Ann Lee')===0).click()"); await wait(200);
    const f = await inRoot(page, "return [R.querySelector('#toName').value,R.querySelector('#toContact').value,R.querySelector('#liveCountry').value,R.querySelector('#liveBasis').value].join(',')");
    check(f === 'Ann Lee,ann@x.test,CA,relationship', plan + ': picking fills name, email, country and how you know them: ' + f);
    check((await inRoot(page, "return R.querySelectorAll('#pickList button').length+'/'+R.querySelector('#pickTag').value")) === '0/', plan + ': the list closes after picking');
    await inRoot(page, "const s=R.querySelector('#pickTag');s.value='client';s.dispatchEvent(new Event('change'))"); await wait(100);
    await inRoot(page, "R.querySelector('#pickAll').click()"); await wait(400);
    if (plan === 'pro') {
      const g = await inRoot(page, "const v=R.querySelector('#view-bulk');return v&&!v.hidden?R.querySelector('#listFrom').textContent:''");
      check(g.indexOf('everyone tagged client') >= 0, plan + ': send to all opens Send to a group: ' + g);
    } else {
      const up = await inRoot(page, "const o=R.querySelector('#upTitle');return o?o.textContent:''");
      check(up.length > 0, plan + ': send to all on A Slice shows the upgrade: ' + up);
    }
    await ctx.close();
  }
  await browser.close();
  console.log(failures ? failures + ' FAILED' : 'ALL PASSED');
  process.exit(failures ? 1 : 0);
})();
