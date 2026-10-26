// Crew tab FAQs: 6 shown, See more opens the rest, help email. Usage: node faq-test.js /path/to/app.js
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
  const st = { calls: [], visited: [], bodies: {} };
  st.handler = (path) => path === '/session' ? Object.assign(session('free', { monthly: 10 }, {}), { prefs: { trial_welcome: true, met_gerald: true } }) : path === '/people' ? { ok: true, people: [] } : { ok: true };
  const { page } = await setup(browser, st);
  await page.setViewportSize({ width: 402, height: 874 });
  await page.goto(ORIGIN + '/kitchen'); await wait(1500);
  await inRoot(page, "R.querySelector('#tab-gerald').click()"); await wait(300);
  check((await inRoot(page, "return R.querySelectorAll('#faqList .faq').length")) === 6, 'Crew shows 6 FAQs');
  check((await inRoot(page, "return R.querySelector('#faqMore').textContent")) === 'See more questions (19)', 'See more says 19 more');
  check((await inRoot(page, "return R.querySelector('#faqList .faq-cat').textContent")) === 'Start here', 'First group is Start here');
  check((await inRoot(page, "return R.querySelectorAll('#faqList .faq')[1].querySelector('summary').textContent")) === 'Who are Gerald and Potato?', 'Gerald and Potato are introduced second');
  check(await inRoot(page, "return R.querySelector('.faq-help a').getAttribute('href')==='mailto:pizza@sliceofthanks.app'"), 'Help email link');
  await inRoot(page, "R.querySelectorAll('#faqList .faq')[2].querySelector('summary').click()"); await wait(150);
  check(await inRoot(page, "return R.querySelectorAll('#faqList .faq')[2].open"), 'A question opens');
  if (process.env.SHOT) { await inRoot(page, "R.querySelector('#faqCard').scrollIntoView()"); await wait(200); await page.screenshot({ path: process.env.SHOT }); }
  await inRoot(page, "R.querySelector('#faqMore').click()"); await wait(150);
  check((await inRoot(page, "return R.querySelectorAll('#faqList .faq').length")) === 25 && (await inRoot(page, "return R.querySelector('#faqMore').textContent")) === 'Show fewer questions', 'See more shows all 25');
  check((await inRoot(page, "return R.querySelectorAll('#faqList .faq-cat').length")) === 3, 'Three groups');
  const sig = "return [...R.querySelectorAll('#faqList .faq')].find(d=>d.querySelector('summary').textContent.startsWith('What is a signature pizza'))";
  const labels = await inRoot(page, sig + ".querySelector('.faq-body').textContent");
  check(['What it is:', 'Why use it:', 'How to set it up:', 'What you get:'].every(x => labels.includes(x)), 'Feature answer has what, why, how and value');
  check((await inRoot(page, sig + ".querySelectorAll('ol li').length")) === 3, 'Setup steps are a numbered list');
  check((await inRoot(page, "return [...R.querySelectorAll('#faqList .faq summary .tag')].length")) >= 4, 'Whole Pie features are tagged');
  await inRoot(page, "const d=" + sig.slice(7) + ";d.open=true;d.querySelector('.faq-body .btn').click()"); await wait(400);
  check(await inRoot(page, "return !R.querySelector('#view-settings').hidden"), 'Take me there opens Settings for the signature pizza');
  await inRoot(page, "R.querySelector('#tab-gerald').click()"); await wait(300);
  check((await inRoot(page, "return R.querySelectorAll('#faqList .faq').length")) === 25, 'List stays open after coming back');
  await inRoot(page, "const e=R.querySelector('#faqList .faq-egg');e.open=true"); await wait(400);
  const t = await toastText(page);
  check(t.includes('Read the whole menu') && t.includes('+10 Treats'), 'Last question is an easter egg: ' + t);
  check((await inRoot(page, "return R.querySelector('#treatBal').textContent")) === '10', 'Treat Jar shows 10 Treats');
  await inRoot(page, "R.querySelector('#faqMore').click()"); await wait(150);
  check((await inRoot(page, "return R.querySelectorAll('#faqList .faq').length")) === 6, 'Show fewer goes back to 6');
  await browser.close();
  console.log(failures ? failures + ' FAILED' : 'ALL PASSED');
  process.exit(failures ? 1 : 0);
})();
