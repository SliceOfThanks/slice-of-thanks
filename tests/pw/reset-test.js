// Kitchen Start over: two taps give a fresh pizza back on step 1. Also: Use my signature pizza, and the Dates card hides when /dates is not ready. Usage: node reset-test.js /path/to/app.js
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
  // Gerald's tips (Crew tab) are this month's set
  await inRoot(page, "R.querySelector('#tab-gerald').click()"); await wait(300);
  const month = new Date().toLocaleString('en-US', { month: 'long' });
  const tc = await inRoot(page, "return R.querySelector('#tipCount').textContent");
  check(tc === month + ' tip 1 of 8', "Gerald's tips are this month's: " + tc);
  await inRoot(page, "R.querySelector('#tab-make').click()"); await wait(400);
  check(await inRoot(page, "const b=R.querySelector('#kxReset');return !!b&&b.offsetParent!==null"), 'Start over shows in the Kitchen');
  check(await inRoot(page, "const r=R.querySelector('.kx-reset'),n=R.querySelector('.nav-row');return r.previousElementSibling===n&&R.querySelector('#kxSig').classList.contains('btn')&&R.querySelector('#kxReset').classList.contains('btn')&&R.querySelector('#makeFor').hidden"), 'Signature and Start over are buttons under Back and Next, and the A pizza for anyone line is gone');
  if (process.env.SHOT2) { const r = await inRoot(page, "const b=R.querySelector('.kx-reset').getBoundingClientRect();return {y:b.top+scrollY}"); await page.screenshot({ path: process.env.SHOT2, fullPage: true, clip: { x: 0, y: Math.max(0, r.y - 320), width: 402, height: 420 } }); }
  await page.evaluate(() => window.__SOT_DEBUG.goSend()); await wait(200);
  await inRoot(page, "R.querySelector('#back').click()"); await wait(300);
  const before = await inRoot(page, "return R.querySelector('#steps li.on').textContent");
  // Box step: long option lists are folded, each row shows its current choice
  const folds = await inRoot(page, "return [...R.querySelectorAll('.panel[data-step=\"4\"] .cfold')].map(f=>f.querySelector('.cf-head').textContent.replace('▾','').trim()+'='+f.classList.contains('open')).join('|')");
  check(folds.split('|').length === 5 && folds.indexOf('=true') < 0 && folds.indexOf('Box style') === 0, 'Box options start folded: ' + folds);
  check(await inRoot(page, "const c=R.querySelector('#confettiChips');return c.offsetParent===null"), 'Folded confetti chips are hidden');
  await inRoot(page, "R.querySelector('#confettiChips').closest('.field').querySelector('.cf-head').click()"); await wait(100);
  check(await inRoot(page, "return R.querySelector('#confettiChips').offsetParent!==null"), 'Tapping Confetti opens it');
  await inRoot(page, "[...R.querySelectorAll('#confettiChips .chip')].find(c=>c.textContent.indexOf('Pizza slices')===0).click()"); await wait(100);
  const cv = await inRoot(page, "return R.querySelector('#confettiChips').closest('.field').querySelector('.cf-val').textContent");
  // Confetti always clears: draw some, then check the canvas is empty once the burst is over
  const painted = () => inRoot(page, "const c=R.querySelector('#confetti');const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let n=0;for(let i=3;i<d.length;i+=40)if(d[i])n++;return n");
  await inRoot(page, "[...R.querySelectorAll('#confettiChips .chip')].find(c=>c.textContent.indexOf('Stars')===0).click()"); await wait(300);
  check((await painted()) > 0, 'Stars confetti draws on screen');
  await wait(9500);
  check((await painted()) === 0, 'Confetti is gone after the burst, nothing left on screen');
  check(cv === 'Pizza slices', 'The row shows the new choice: ' + cv);
  if (process.env.SHOT) { await inRoot(page, "const r=R.querySelector('#styleChips').closest('.field').getBoundingClientRect();window.scrollTo(0,scrollY+r.top-300)"); await wait(200); await page.screenshot({ path: process.env.SHOT }); }
  await inRoot(page, "R.querySelector('#confettiChips').closest('.field').querySelector('.cf-head').click()"); await wait(100);
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
  // Use my signature pizza: straight to Send with the signature pizza baked
  await inRoot(page, "R.querySelector('#kxSig').click()"); await wait(400);
  check((await inRoot(page, "return R.querySelector('#steps li.on').textContent")).indexOf('Send') !== -1, 'Use my signature pizza goes to the Send step');
  check((await toastText(page)).indexOf('signature pizza is ready') !== -1, 'Toast says the signature pizza is ready');
  await inRoot(page, "R.querySelector('#tab-settings').click()"); await wait(300);
  await inRoot(page, "const t=R.querySelector('#toName');t.value='Old';t.dispatchEvent(new Event('input',{bubbles:true}))");
  await inRoot(page, "R.querySelector('#sendSig').click()"); await wait(400);
  const ss = await inRoot(page, "return [R.querySelector('#steps li.on').textContent, R.querySelector('#toName').value, !R.querySelector('#view-make').hidden].join(',')");
  check(ss === '6Send,,true', 'Settings Send it to someone opens the Kitchen on Send with an empty name: ' + ss);
  // the server has no date pizzas yet: the Dates card stays hidden
  await inRoot(page, "R.querySelector('#tab-settings').click()"); await wait(500);
  check(await inRoot(page, "const c=R.querySelector('#datesCard');return !!c&&c.hidden"), 'Dates card hidden while the server has no date pizzas');
  await browser.close();
  console.log(failures ? failures + ' FAILED' : 'ALL PASSED');
  process.exit(failures ? 1 : 0);
})();
