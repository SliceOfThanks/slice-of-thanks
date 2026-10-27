// AppSumo redemption: /redeem for guests and members, stacking up to 3 codes, friendly errors, Settings > Plan button. Usage: node redeem-test.js /path/to/app.js
const { chromium } = require('playwright');
const fs = require('fs');
const APP = fs.readFileSync(process.argv[2], 'utf8');
const ORIGIN = 'https://www.sliceofthanks.app';
const API = 'https://api.test/fn';
const wait = ms => new Promise(r => setTimeout(r, ms));
let failures = 0;
const check = (ok, msg) => { console.log((ok ? 'PASS ' : 'FAIL ') + msg); if (!ok) failures++; };
const TIERS = { 1: 100, 2: 300, 3: 750 };
function session(codes) {
  return {
    member_id: 'm1', env: 'live', is_tester: false, plan: codes ? 'pro' : 'free', paid_plan: 'free', features: {}, credits: { monthly: codes ? TIERS[codes] : 10, bonus: 0, pack: 0, special_delivery: 0 },
    packs: [], checkout: {}, code: {}, profile: { display_name: 'Sumo Buyer', mailing_address: '1 Main', send_as: 'person', reply_to: 'buyer@test.com' },
    needs_terms: false, terms_updated: false, prefs: { trial_welcome: true, met_gerald: true, bday_ask_done: true, setup: { dismissed: true } }, self_tests_left: 5,
    reply: { verified: true, replies: 'me' }, birthday: { md: null, on: true, toppers: [] },
    appsumo: { codes, max: 3, emails: codes ? TIERS[codes] : 0, tiers: TIERS, enabled: true },
  };
}
async function run(browser, path, opts) {
  const st = { codes: opts.codes || 0, posts: [], visited: [], redeem: opts.redeem || [] };
  const ctx = await browser.newContext({ viewport: { width: 402, height: 874 } });
  const page = await ctx.newPage();
  page.on('pageerror', e => { console.log('PAGE ERROR', e.message); failures++; });
  await ctx.route('**/fonts.googleapis.com/**', r => r.abort());
  await ctx.route('**/fonts.gstatic.com/**', r => r.abort());
  await ctx.route(API + '/**', async r => {
    const p = new URL(r.request().url()).pathname.replace('/fn', '');
    let b = null; try { b = JSON.parse(r.request().postData() || 'null'); } catch (e) {}
    let out = { ok: true };
    if (p === '/session') out = session(st.codes);
    else if (p === '/people') out = { ok: true, people: [] };
    else if (p === '/appsumo/redeem') { st.posts.push(b); const next = st.redeem.shift() || { ok: true }; if (next.ok) st.codes++; out = next.ok ? { ok: true, codes: st.codes, state: session(st.codes).appsumo } : next; }
    await r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(out) });
  });
  await ctx.route(ORIGIN + '/**', async r => {
    const u = new URL(r.request().url());
    if (u.pathname === '/kitchen' || u.pathname === '/redeem') return r.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><html><head><meta charset="utf-8"></head><body><div id="sot-app" data-debug data-api="' + API + '" data-token="' + (opts.guest ? '' : 'tok') + '"></div><script>' + APP.replace(/<\/script>/g, '<\\/script>') + '</script></body></html>' });
    st.visited.push(u.pathname + u.search);
    return r.fulfill({ status: 200, contentType: 'text/html', body: '<p>bd page</p>' });
  });
  await page.goto(ORIGIN + path); await wait(1600);
  return { ctx, page, st };
}
const inRoot = (page, fn) => page.evaluate(f => (new Function('R', f))(window.__SOT_ROOT), fn);
const vis = (page, sel) => inRoot(page, "const e=R.querySelector('" + sel + "');return !!e&&!e.hidden&&!e.closest('[hidden]')");
const txt = (page, sel) => inRoot(page, "const e=R.querySelector('" + sel + "');return e?e.textContent:''");
async function redeem(page, code) { await inRoot(page, "const i=R.querySelector('#rdCode');i.value=" + JSON.stringify(code) + ";R.querySelector('#rdGo').click()"); await wait(500); }
(async () => {
  const browser = await chromium.launch();
  // 1. A signed-out buyer on /redeem: create an account or log in, then come back
  let r = await run(browser, '/redeem', { guest: true });
  check(await vis(r.page, '#view-redeem') && await vis(r.page, '#rdGuest') && !(await vis(r.page, '#rdForm')), 'Guest on /redeem sees the redeem page with Create my account and Log in');
  check((await txt(r.page, '#rdTiers')).replace(/\s+/g, ' ') === '1 code100 emails a month2 codes300 emails a month3 codes750 emails a month', 'The ladder shows 1, 2 and 3 codes at 100, 300 and 750: ' + await txt(r.page, '#rdTiers'));
  await inRoot(r.page, "R.querySelector('#rdLogin').click()"); await wait(400);
  check(r.st.visited.some(v => v === '/login?loc=%2Fredeem'), 'Log in comes back to /redeem: ' + r.st.visited.join(' '));
  await r.ctx.close();
  r = await run(browser, '/redeem', { guest: true });
  await inRoot(r.page, "R.querySelector('#rdSignup').click()"); await wait(400);
  check(r.st.visited.some(v => v.indexOf('/checkout/') === 0), 'Create my account goes to the free sign up');
  await r.ctx.close();
  // 2. Back in the Kitchen after signing up: the redeem page opens by itself
  r = await run(browser, '/kitchen', { codes: 0 });
  await r.page.evaluate(() => localStorage.setItem('sot_goRedeem', JSON.stringify(Date.now())));
  await r.page.reload(); await wait(1600);
  check(await vis(r.page, '#view-redeem') && await vis(r.page, '#rdForm'), 'After signing up, the Kitchen opens the redeem page by itself');
  await redeem(r.page, 'SOT-1111-1111-1111');
  check(await r.page.evaluate(() => localStorage.getItem('sot_goRedeem')) === 'null', 'Once redeemed, the Kitchen goes back to normal');
  await r.ctx.close();
  // 3. A member on /redeem: first code, then a second, then errors
  r = await run(browser, '/redeem', { codes: 0, redeem: [{ ok: true }, { ok: false, code: 'used' }, { ok: false, code: 'unknown' }, { ok: true }, { ok: true }] });
  check(await vis(r.page, '#rdForm') && !(await vis(r.page, '#rdGuest')), 'Signed in on /redeem: the code box shows');
  await inRoot(r.page, "R.querySelector('#rdGo').click()"); await wait(200);
  check((await txt(r.page, '#rdMsg')) === 'Paste your AppSumo code first.', 'An empty code asks for the code');
  await redeem(r.page, 'sot-7kq2-m9xd-4htp');
  check(r.st.posts[0] && r.st.posts[0].code === 'sot-7kq2-m9xd-4htp', 'The code goes to the server as typed (the server tidies it)');
  check((await txt(r.page, '#rdMsg')) === 'Code redeemed. You now have 1 code: 100 emails a month for life, with every Whole Pie feature.', 'First code: 100 emails: ' + await txt(r.page, '#rdMsg'));
  check(await inRoot(r.page, "const l=R.querySelectorAll('#rdTiers li');return l[0].classList.contains('on')&&l[1].classList.contains('next')&&!l[2].classList.contains('on')"), 'Ladder marks code 1 as yours and code 2 as next');
  check((await txt(r.page, '#rdHelp')).indexOf('Add another code to move up to 300 right away.') >= 0, 'Help says the next code moves up to 300');
  await redeem(r.page, 'SOT-USED-USED-USED');
  check((await txt(r.page, '#rdMsg')).indexOf('That code has already been redeemed.') === 0, 'A used code gets a friendly message');
  await redeem(r.page, 'SOT-NOPE-NOPE-NOPE');
  check((await txt(r.page, '#rdMsg')).indexOf('We could not find that code.') === 0, 'An unknown code gets a friendly message');
  await redeem(r.page, 'SOT-2222-2222-2222');
  check((await txt(r.page, '#rdMsg')).indexOf('You now have 2 codes: 300 emails a month') >= 0, 'Second code: 300 emails right away');
  await redeem(r.page, 'SOT-3333-3333-3333');
  check((await txt(r.page, '#rdMsg')).indexOf('You now have 3 codes: 750 emails a month') >= 0 && !(await vis(r.page, '#rdForm')), 'Third code: 750 emails, and the code box closes');
  await r.ctx.close();
  // 4. A 4th code is refused (server says max_codes)
  r = await run(browser, '/redeem', { codes: 2, redeem: [{ ok: false, code: 'max_codes', state: session(3).appsumo }] });
  await redeem(r.page, 'SOT-4444-4444-4444');
  check((await txt(r.page, '#rdMsg')).indexOf('Your account already has 3 codes, the most one account can hold.') === 0, 'A 4th code gets a friendly message');
  await r.ctx.close();
  // 5. Settings > Plan: the Lifetime plan and the Redeem AppSumo code button
  r = await run(browser, '/kitchen', { codes: 2 });
  await inRoot(r.page, "R.querySelector('#tab-settings').click()"); await wait(300);
  check((await txt(r.page, '#planCard h2')) === 'Your plan: Lifetime (AppSumo)', 'Plan card says Lifetime (AppSumo)');
  check((await txt(r.page, '#planCard p.muted')).indexOf('2 of 3 codes: 300 emails a month for life') === 0, 'Plan card shows the codes and emails: ' + await txt(r.page, '#planCard p.muted'));
  await inRoot(r.page, "R.querySelector('#planRedeem').click()"); await wait(300);
  check(await vis(r.page, '#view-redeem') && await vis(r.page, '#rdForm'), 'Redeem AppSumo code opens the redeem page');
  await r.ctx.close();
  // 6. Members without codes see the button too, and the free plan name
  r = await run(browser, '/kitchen', { codes: 0 });
  await inRoot(r.page, "R.querySelector('#tab-settings').click()"); await wait(300);
  check(await vis(r.page, '#planRedeem') && (await txt(r.page, '#planCard h2')) === 'Your plan: A Slice', 'A Slice members see Redeem AppSumo code in Plan');
  check(await vis(r.page, '#view-settings') && !(await vis(r.page, '#view-redeem')), 'The Kitchen does not open the redeem page by itself');
  await r.ctx.close();
  await browser.close();
  console.log(failures ? failures + ' FAILED' : 'ALL PASSED');
  process.exit(failures ? 1 : 0);
})();
