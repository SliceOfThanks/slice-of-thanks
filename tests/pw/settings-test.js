// Kitchen purchase flows against a mocked API. Usage: node test.js /path/to/app.js
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
    if (u.pathname === '/kitchen') {
      return r.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><html><body><div id="sot-app" data-debug data-api="' + API + '" data-token="' + (state.token === undefined ? 'tok' : state.token) + '" data-pack100-url="/buy/pack100"></div><script>' + APP.replace(/<\/script>/g, '<\\/script>') + '</script></body></html>' });
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
  st.handler = (path, req) => { let b = null; try { b = JSON.parse(req.postData() || 'null'); } catch (e) {} if (b) (st.bodies[path] = st.bodies[path] || []).push(b);
    return path === '/session' ? session('pro', { monthly: 5 }, {}) : path === '/people' ? { ok: true, people: [] } : path === '/presets' ? { ok: true, limit: 10, presets: [] } : path === '/billing' ? { ok: true, invoices: [], links: {} } : { ok: true }; };
  const { page } = await setup(browser, st);
  await page.goto(ORIGIN + '/kitchen'); await wait(1200);
  await inRoot(page, "R.querySelector('#tab-settings').click()"); await wait(300);
  const closed = await inRoot(page, "return [R.querySelector('#boxCardBody').hidden, R.querySelector('#boxCardSum').textContent]");
  check(closed[0] === true && closed[1].length > 0, 'Your box starts folded with a summary: ' + closed[1]);
  await inRoot(page, "R.querySelector('#boxCardHead').click()"); await wait(100);
  const open = await inRoot(page, "return [R.querySelector('#boxCardBody').hidden, R.querySelector('#boxCardHead').getAttribute('aria-expanded'), !!R.querySelector('#youCard #liveReply') && !R.querySelector('#liveAddrS'), !!R.querySelector('#youCard #pName')]");
  check(open[0] === false && open[1] === 'true' && open[2] && open[3], 'Tapping Your box opens it; name and reply-to sit in the open You card, no mailing address field: ' + open);
  // Save button in the You card saves name, business and reply-to right away
  await inRoot(page, "const n=R.querySelector('#pName');n.value='Kevin & Stacey';n.dispatchEvent(new Event('input'));const b=R.querySelector('#pBiz');b.value='Lawfecta';b.dispatchEvent(new Event('input'));const r=R.querySelector('#liveReply');r.value='hello@lawfecta.test';r.dispatchEvent(new Event('input'))");
  st.bodies['/profile'] = [];
  await inRoot(page, "R.querySelector('#liveYouSave').click()"); await wait(300);
  const sv = (st.bodies['/profile'] || []).map(x => x.profile).find(p => p.reply_to !== undefined && p.display_name !== undefined) || {};
  check(sv.display_name === 'Kevin & Stacey' && sv.business_name === 'Lawfecta' && sv.reply_to === 'hello@lawfecta.test', 'Save sends name, business and reply-to at once: ' + JSON.stringify(sv));
  check((await inRoot(page, "return R.querySelector('#liveYouStatus').textContent")) === 'Saved.' && (await toastText(page)) === 'Saved. Check hello@lawfecta.test for a link to confirm it.', 'Save says Saved, and a new email gets a confirm link');
  await wait(1000);
  check((st.bodies['/profile'] || []).length === 1, 'No extra save fires after the Save button: ' + (st.bodies['/profile'] || []).length);
  await inRoot(page, "const r=R.querySelector('#liveReply');r.value='nope';r.dispatchEvent(new Event('input'))"); await wait(50);
  await inRoot(page, "R.querySelector('#liveYouSave').click()"); await wait(200);
  check((await toastText(page)).indexOf('does not look right') >= 0, 'A bad reply-to email is caught');
  await inRoot(page, "const r=R.querySelector('#liveReply');r.value='hello@lawfecta.test';r.dispatchEvent(new Event('input'))"); await wait(900);
  const sw = await inRoot(page, "return ['#brand1','#brand2'].map(id=>{const r=R.querySelector(id).getBoundingClientRect();return Math.round(r.width)+'x'+Math.round(r.height)}).join(',')");
  check(sw.split(',').every(x => parseInt(x) >= 40), 'Brand color pickers show as swatches: ' + sw);
  if (process.env.SHOT) { await inRoot(page, "const r=R.querySelector('#brand1').getBoundingClientRect();window.scrollTo(0,scrollY+r.top-200)"); await wait(200); await page.screenshot({ path: process.env.SHOT }); }
  const cal = await inRoot(page, "return [...R.querySelectorAll('#view-settings p.muted')].map(p=>p.textContent).join('|')");
  check(cal.indexOf('prototype') < 0 && cal.indexOf('Connect the calendar you book meetings with') >= 0, 'Calendar card has live wording');
  await inRoot(page, "const v=R.querySelector('#veganDefault');v.checked=true;v.dispatchEvent(new Event('change'))"); await wait(300);
  const pr = (st.bodies['/profile'] || []).find(b => b.profile && b.profile.prefs && 'vegan_default' in b.profile.prefs);
  check(pr && pr.profile.prefs.vegan_default === true, 'Vegan by default is saved to the account');
  await inRoot(page, "R.querySelector('#tab-make').click()"); await wait(200);
  await inRoot(page, "R.querySelector('#premadeBox').open=true;[...R.querySelectorAll('#premades .pm')].find(b=>b.querySelector('b').textContent==='Classic Pepperoni').click()"); await wait(300);
  const vg = await inRoot(page, "return [R.querySelector('#veganChip').getAttribute('aria-pressed'), [...R.querySelectorAll('#chips-meat .chip')].map(c=>c.textContent.trim())[0]]");
  check(vg[0] === 'true' && vg[1] === 'Plant sausage', 'New pizzas start vegan with plant meats: ' + vg);
  await browser.close();
  console.log(failures ? failures + ' FAILED' : 'ALL PASSED');
})();
