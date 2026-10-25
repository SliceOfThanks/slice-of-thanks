// Settings folds, preset Preview and Use, and sheets that fit the screen. Usage: node fold-test.js /path/to/app.js
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
  const st = { calls: [], visited: [], bodies: {}, transform: true };
  st.handler = (path, req) => {
    if (path === '/session') { const s = session('pro', { monthly: 50 }, {}); s.features = { automations: true }; return s; }
    if (path === '/billing') return { ok: true, invoices: [{ id: '1', number: '37', date: '2026-10-22T10:00:00Z', paidAt: '2026-10-22T10:00:00Z', status: 'Paid', totalCents: 299, items: [{ description: 'Special Delivery', amountCents: 299 }] }], links: {} };
    if (path === '/people') return { ok: true, people: [] };
    if (path === '/presets') return { ok: true, limit: 10, presets: [{ id: 'pr1', name: 'Client thanks', data: { style: 'hearts', sticker: 'Thank You', confetti: 'classic', note: 'Hi [first name], thanks to everyone at [company].', sign: 'Warmly, Stacey' } }] };
    if (path === '/calendar') return { ok: true, integrations: [{ provider: 'tidycal', status: 'connected', label: 'me' }], meetings: [] };
    return { ok: true };
  };
  const { page } = await setup(browser, st);
  await page.setViewportSize({ width: 402, height: 874 });
  await page.goto(ORIGIN + '/kitchen'); await wait(1500);
  await inRoot(page, "R.querySelector('#tab-settings').click()"); await wait(800);
  const sums = await inRoot(page, "return ['#meetCard','#sigCard','#dietCard','#presetCard','#calCard','#liveBilling'].map(q=>{const c=R.querySelector(q);return c?(c.classList.contains('afold')&&!c.classList.contains('open')?'':'OPEN ')+q+': '+c.querySelector('.afold-sum').textContent:q+' missing'})");
  console.log(sums.join('\n'));
  check(sums.every(x => x.indexOf('OPEN') < 0 && x.indexOf('missing') < 0), 'Six Settings cards start folded with a summary');
  check(sums[0].indexOf('I pick the meetings') >= 0 && sums[3].indexOf('Client thanks') >= 0 && sums[4].indexOf('TidyCal connected') >= 0, 'Summaries say what is set');
  check(await inRoot(page, "return !!R.querySelector('#youCard:not(.afold)') && !!R.querySelector('#liveAccount:not(.afold)')"), 'You and Account stay open');
  check(await inRoot(page, "return R.querySelector('#planCols').hidden && R.querySelector('#planCompare').textContent==='Compare plans'"), 'Plan comparison is behind Compare plans');
  await inRoot(page, "R.querySelector('#dietCard > h2').click()"); await wait(100);
  check(await inRoot(page, "return R.querySelector('#dietCard').classList.contains('open') && getComputedStyle(R.querySelector('#veganDefault')).display!=='none'"), 'Tapping a heading opens the card');
  await inRoot(page, "R.querySelector('#veganDefault').click()"); await wait(100);
  check((await inRoot(page, "return R.querySelector('#dietCard .afold-sum').textContent")) === 'Every new pizza starts vegan', 'Summary follows the setting');
  await inRoot(page, "R.querySelector('#veganDefault').click()"); await wait(100);
  // Preset Preview and Use it
  await inRoot(page, "R.querySelector('#presetCard > h2').click()"); await wait(100);
  const btns = await inRoot(page, "return [...R.querySelectorAll('#presetList .btn')].map(b=>b.textContent).join('|')");
  check(btns === 'Use it|Preview|Edit|Rename|Remove', 'Preset buttons: ' + btns);
  await inRoot(page, "[...R.querySelectorAll('#presetList .btn')].find(b=>b.textContent==='Preview').click()"); await wait(300);
  const pv = await inRoot(page, "const s=R.querySelector('#liveSheet');return [s.querySelector('h2').textContent, s.querySelector('.lid').dataset.style, s.querySelector('.lid-sticker').textContent, s.querySelector('.hand').textContent]");
  check(pv[0] === 'Client thanks' && pv[1] === 'hearts' && pv[2] === 'Thank You' && pv[3] === 'Hi Jordan, thanks to everyone at Acme.', 'Preview shows the lid and note: ' + pv.join(' | '));
  await page.screenshot({ path: '../preset-preview.png' });
  await inRoot(page, "[...R.querySelectorAll('#liveSheet .btn')].find(b=>b.textContent==='Use it').click()"); await wait(400);
  const use = await inRoot(page, "return [!R.querySelector('#view-make').hidden, R.querySelector('#liveSheet').hidden]");
  check(use[0] && use[1], 'Use it opens the Kitchen');
  const bx = await page.evaluate(() => window.__SOT_DEBUG.box());
  check(bx.style === 'hearts' && bx.sticker === 'Thank You' && bx.note.indexOf('thanks to everyone') >= 0, 'The new pizza uses the preset box: ' + JSON.stringify(bx));
  // Sheets fit the screen even inside a transformed page
  await inRoot(page, "R.querySelector('#tab-settings').click()"); await wait(400);
  await page.evaluate(() => window.scrollTo(0, 900)); await wait(200);
  await inRoot(page, "R.querySelector('#planPacks').click()"); await wait(400);
  const fit = await inRoot(page, "const r=R.querySelector('#liveSheet .sheet').getBoundingClientRect();return [Math.round(r.top), Math.round(r.bottom), innerHeight, R.querySelector('#liveSheet').style.transform]");
  check(fit[0] >= 0 && fit[1] <= fit[2], 'Buy more emails sheet is fully on screen: ' + fit.join(','));
  await page.screenshot({ path: '../packs-sheet.png' });
  // A different member signs in on the same browser: the last member's name and box are cleared
  await page.evaluate(() => { const p = JSON.parse(localStorage.getItem('sot_profile') || '{}'); p.name = 'Old Member'; p.business = 'Old Biz'; localStorage.setItem('sot_profile', JSON.stringify(p)); localStorage.setItem('sot_owner', JSON.stringify('someone-else')); });
  await page.reload(); await wait(3500);
  const after = await page.evaluate(() => [JSON.parse(localStorage.getItem('sot_owner')), (JSON.parse(localStorage.getItem('sot_profile') || '{}')).name || '']);
  check(after[0] === 'm1' && after[1] !== 'Old Member', 'New member on the same browser does not see the last member: ' + after.join(' | '));
  // Same member again: nothing is cleared
  await page.evaluate(() => { const p = JSON.parse(localStorage.getItem('sot_profile') || '{}'); p.business = 'Keep Me'; localStorage.setItem('sot_profile', JSON.stringify(p)); });
  await page.reload(); await wait(2000);
  check(await page.evaluate(() => (JSON.parse(localStorage.getItem('sot_profile') || '{}')).business === 'Keep Me'), 'Same member keeps their saved settings');
  await browser.close();
  console.log(failures ? failures + ' FAILED' : 'ALL PASSED');
  process.exit(failures ? 1 : 0);
})();
