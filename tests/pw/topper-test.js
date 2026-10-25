// Box toppers, box patterns and the in-app card sheet. Usage: node topper-test.js /path/to/app.js
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
    if (u.pathname === '/account/billing') return r.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><html><head></head><body><header id="bdHead">Site header</header><aside id="bdSide">Billing Information</aside><main><div class="wrapx"><h2>Manage Billing Information</h2><a href="#" id="addCard">Add New Credit Card</a><a href="#">Billing Address</a><div>Payment History</div></div></main><footer>Footer</footer><div class=\"bd-modal-x\" id=\"cardPop\" style=\"display:none\">Card form</div></body></html>' });
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
  for (const plan of ['pro', 'free']) {
    const st = { calls: [], visited: [], bodies: {} };
    st.handler = (path, req) => {
      let b = null; try { b = JSON.parse(req.postData() || 'null'); } catch (e) {}
      if (b) (st.bodies[path] = st.bodies[path] || []).push(b);
      if (path === '/session') { const s = session(plan, { monthly: 50 }, {}); s.features = { automations: plan !== 'free' }; return s; }
      if (path === '/people') return { ok: true, people: [{ id: 'p1', name: 'Rebecca Jones', email: 'rebecca@x.test', company: '', history: [] }] };
      if (path === '/presets') return { ok: true, limit: 10, presets: [] };
      if (path === '/calendar') return { ok: true, integrations: [], meetings: [] };
      if (path === '/billing') return { ok: true, invoices: [], links: { billing: '/account/billing' } };
      return { ok: true };
    };
    const { ctx, page } = await setup(browser, st);
    await page.clock.install({ time: new Date('2026-12-05T10:00:00') });
    await page.setViewportSize({ width: 420, height: 900 });
    await page.goto(ORIGIN + '/kitchen'); await page.clock.runFor(1500); await wait(300);
    await inRoot(page, "R.querySelector('#homeHire').click()"); await wait(200);
    await inRoot(page, "const s=R.querySelector('#hireFor');s.value='c:p1';s.dispatchEvent(new Event('change'));R.querySelector('#hireBtn').click()"); await wait(400);
    const chips = await inRoot(page, "return [...R.querySelectorAll('#topperChips .chip')].map(c=>c.textContent.trim().replace(/Pro$/,''))");
    check(chips[0] === 'None' && chips.includes('Christmas tree (in season)') && chips.includes('String lights (in season)') && chips.includes('Ornament (in season)') && !chips.some(c => c.indexOf('Pumpkin') === 0) && chips.includes('Gift bow'), plan + ': December toppers: ' + chips.join('|'));
    await inRoot(page, "[...R.querySelectorAll('#topperChips .chip')].find(c=>c.textContent.indexOf('Christmas tree')===0).click()"); await wait(200);
    if (plan === 'free') {
      const up = await inRoot(page, "const u=R.querySelector('#upTitle');return u&&!R.querySelector('#upSheet').hidden?u.textContent:''");
      check(up === 'Top the box', 'free: toppers open the upgrade: ' + up);
      check(!(await inRoot(page, "return !!R.querySelector('#lidPreview .lid-topper')")), 'free: no topper on the lid');
    } else {
      check(await inRoot(page, "return !!R.querySelector('#lidPreview .lid-topper svg')"), 'pro: tree shows on the lid');
      const shots = [];
      for (const [style, name] of [['hearts', 'Hearts'], ['floral', 'Floral'], ['garden', 'Spring garden'], ['midnight', 'Midnight gold']]) {
        await inRoot(page, "[...R.querySelectorAll('#styleChips .chip')].find(c=>c.textContent.trim()===a).click()", name); await wait(100);
        const lid = await page.evaluateHandle(() => window.__SOT_ROOT.querySelector('#lidPreview'));
        await lid.asElement().screenshot({ path: '../lid-' + style + '.png' });
      }
      await inRoot(page, "[...R.querySelectorAll('#topperChips .chip')].find(c=>c.textContent.indexOf('String lights')===0).click()"); await wait(100);
      check(await inRoot(page, "return !!R.querySelector('#lidPreview .lid-topper.band')"), 'pro: string lights run along the top');
      const lid = await page.evaluateHandle(() => window.__SOT_ROOT.querySelector('#lidPreview'));
      await lid.asElement().screenshot({ path: '../lid-lights.png' });
    }
    // Card and billing address opens inside the app
    await inRoot(page, "R.querySelector('#tab-settings')&&R.querySelector('#tab-settings').click()"); await wait(300);
    await page.clock.runFor(500); await wait(300);
    await page.evaluate(() => { window.__opened = []; window.open = (u) => { window.__opened.push(u); return {}; }; });
    const clicked = await inRoot(page, "const b=[...R.querySelectorAll('button')].find(x=>x.textContent==='Update card or billing address');if(b)b.click();return !!b");
    check(clicked, plan + ': card button is there');
    await wait(300);
    await inRoot(page, "[...R.querySelectorAll('#liveSheet .btn')].find(b=>b.textContent==='Open secure billing').click()"); await wait(300);
    check((await page.evaluate(() => window.__opened)).length === 1 && await inRoot(page, "return R.querySelector('#liveSheet').hidden"), plan + ': secure billing opens in a new tab');
    check(await page.evaluate(() => location.pathname) === '/kitchen', plan + ': still on the app page');
    if (plan === 'pro') await page.screenshot({ path: '../card-sheet.png' });
    // Account card: Log out and Delete my account sit together at the bottom of Settings
    await inRoot(page, "const b=R.querySelector('#liveSheet');if(b)b.hidden=true"); 
    const acc = await inRoot(page, "const c=R.querySelector('#liveAccount');const v=R.querySelector('#view-settings');return [!!c, c&&!!c.querySelector('#liveLogout'), c&&!!c.querySelector('#liveDelete'), c===v.lastElementChild||[...v.querySelectorAll(':scope > .card')].filter(x=>!x.hidden).pop()===c]");
    check(acc.every(Boolean), plan + ': Account card holds Log out and Delete, at the bottom: ' + acc);
    await inRoot(page, "R.querySelector('#liveDelete').click()"); await wait(200);
    const title = await inRoot(page, "return R.querySelector('#liveSheet h2').textContent");
    if (plan === 'pro') check(title === 'Cancel your plan first', 'pro: asked to cancel the plan first: ' + title);
    else {
      check(title === 'Delete my account and data', 'free: delete sheet opens: ' + title);
      await inRoot(page, "R.querySelector('#liveSheet .btn.primary').click()"); await wait(200);
      check(!(st.calls || []).includes('/account/delete'), 'free: nothing happens until DELETE is typed');
      await inRoot(page, "R.querySelector('#liveDelConfirm').value='delete';R.querySelector('#liveSheet .btn.primary').click()"); await wait(400);
      check(st.calls.includes('/account/delete') && st.bodies['/account/delete'][0].confirm === 'DELETE', 'free: delete is sent with the confirm word');
      const done = await inRoot(page, "return R.querySelector('#liveSheet h2').textContent");
      check(done === 'Account deleted', 'free: shows Account deleted: ' + done);
      check(!(await inRoot(page, "return [...R.querySelectorAll('#liveSheet .btn')].some(b=>b.textContent==='Cancel')")), 'free: Account deleted has no Cancel button');
    }
    await page.close();
  }
  await browser.close();
  console.log(failures ? failures + ' FAILED' : 'ALL PASSED');
  process.exit(failures ? 1 : 0);
})();
