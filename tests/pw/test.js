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

  // 1. Pro member buys a 100 pack from the plan card, comes back, credits show up
  {
    const st = { calls: [], visited: [], paid: false };
    st.handler = (path) => {
      if (path === '/session') return session('pro', { monthly: 3, pack: 0 }, {});
      if (path === '/purchases/check') { st.checks = (st.checks || 0) + 1; return session('pro', { monthly: 3, pack: st.checks >= 2 ? 100 : 0 }, {}); }
      return {};
    };
    const { ctx, page } = await setup(browser, st);
    await page.goto(ORIGIN + '/kitchen');
    await wait(1200);
    await inRoot(page, "R.querySelector('#tab-settings').click()");
    await wait(300);
    const hasBtn = await inRoot(page, "return !!R.querySelector('#planPacks')");
    check(hasBtn, 'Pro plan card shows Buy more emails');
    await inRoot(page, "R.querySelector('#planPacks').click()");
    await wait(200);
    const labels = await inRoot(page, "return [...R.querySelectorAll('#liveSheet .btn')].map(b=>b.textContent)");
    check(labels.join('|') === '100 emails, $5|500 emails, $15|1,000 emails, $25|Cancel', 'Pack sheet lists three packs: ' + labels.join('|'));
    await inRoot(page, "[...R.querySelectorAll('#liveSheet .btn')][1].click()");
    await wait(200);
    check((await toastText(page)) === 'Email packs open soon.', '500 pack without a link says it opens soon');
    await Promise.all([page.waitForNavigation(), inRoot(page, "[...R.querySelectorAll('#liveSheet .btn')][0].click()")]);
    check(st.visited.includes('/buy/pack100'), 'Goes to the 100 pack checkout link from the widget');
    await page.goto(ORIGIN + '/kitchen');
    await wait(8500);
    check(st.checks >= 2, 'Checks for the payment again after returning (' + st.checks + ' checks)');
    const t = await toastText(page);
    check(t.indexOf('100 more emails are ready') >= 0, 'Toast confirms the pack: ' + t);
    const pending = await page.evaluate(() => localStorage.getItem('sot_checkoutPending'));
    check(pending === 'null' || pending === null, 'Pending checkout cleared');
    await inRoot(page, "R.querySelector('#tab-settings').click()");
    await wait(200);
    const card = await inRoot(page, "return R.querySelector('#planCard p.muted').textContent");
    check(card.indexOf('plus 100 from email packs') >= 0, 'Plan card shows pack emails: ' + card);
    await ctx.close();
  }

  // 2. Pro member out of emails on send gets the pack sheet
  {
    const st = { calls: [], visited: [] };
    st.handler = (path) => {
      if (path === '/session') return session('pro', { monthly: 0 });
      if (path === '/send') return { ok: false, code: 'no_credits' };
      return session('pro', { monthly: 0 });
    };
    const { ctx, page } = await setup(browser, st);
    await page.goto(ORIGIN + '/kitchen');
    await wait(1200);
    await page.evaluate(() => window.__SOT_DEBUG.goSend());
    await wait(300);
    await inRoot(page, "const n=R.querySelector('#toName');n.value='Pat';n.dispatchEvent(new Event('input',{bubbles:true}));const c=R.querySelector('#toContact');c.value='pat@example.com';c.dispatchEvent(new Event('input',{bubbles:true}));R.querySelector('#sendNow').click()");
    await wait(800);
    const title = await inRoot(page, "const s=R.querySelector('#liveSheet');return s&&!s.hidden?s.querySelector('h2').textContent:''");
    check(title === 'Buy more emails', 'No credits on Pro opens Buy more emails: ' + title);
    await ctx.close();
  }

  // 3. Free member buys Special Delivery (link from Supabase settings), returns, Special Delivery turns on for the saved pizza
  {
    const st = { calls: [], visited: [] };
    st.handler = (path) => {
      const co = { special_delivery: ORIGIN + '/buy/special' };
      if (path === '/session') return session('free', { monthly: 2 }, co);
      if (path === '/purchases/check') return session('free', { monthly: 2, special_delivery: 1 }, co);
      return {};
    };
    const { ctx, page } = await setup(browser, st);
    await page.goto(ORIGIN + '/kitchen');
    await wait(1200);
    await page.evaluate(() => window.__SOT_DEBUG.goSend());
    await wait(300);
    await inRoot(page, "R.querySelector('#upYearly').click()");
    await wait(200);
    const title = await inRoot(page, "return R.querySelector('#liveSheet h2').textContent");
    check(title === 'Special Delivery', 'Free member sees the Special Delivery sheet');
    await Promise.all([page.waitForNavigation(), inRoot(page, "R.querySelector('#liveSheet .btn.primary').click()")]);
    check(st.visited.includes('/buy/special'), 'Goes to the Special Delivery link from session settings');
    await page.goto(ORIGIN + '/kitchen');
    await wait(1500);
    const t = await toastText(page);
    check(t.indexOf('Special Delivery is on') >= 0, 'Special Delivery turns on after payment: ' + t);
    const pro = await inRoot(page, "return !R.host.classList.contains('is-free')");
    check(pro, 'Pro features unlocked for the pizza');
    const onSend = await inRoot(page, "return !R.querySelector('#view-make').hidden");
    check(onSend, 'Saved pizza is back on the Kitchen send step');
    await ctx.close();
  }

  // 4. Logged out: "I already have an account" goes to the BD login page, no demo sign in
  {
    const st = { calls: [], visited: [], token: '' };
    st.handler = () => ({});
    const { ctx, page } = await setup(browser, st);
    await page.goto(ORIGIN + '/kitchen');
    await wait(1000);
    await inRoot(page, "R.querySelector('#tab-settings').click()");
    await wait(200);
    const gate = await inRoot(page, "return !R.querySelector('#view-gate').hidden");
    check(gate, 'Logged out visitor sees the account gate on Settings');
    await Promise.all([page.waitForNavigation(), inRoot(page, "R.querySelector('#gateSignin').click()")]);
    check((st.visitedFull || []).includes('/login?loc=%2Fkitchen'), 'I already have an account goes to /login and back to the Kitchen: ' + st.visitedFull);
    await ctx.close();
  }

  // 5. Dark mode text is softer; What's new shows five, with a page for all
  {
    const st = { calls: [], visited: [] };
    st.handler = (path) => session('pro', { monthly: 250 });
    const { ctx, page } = await setup(browser, st);
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.setViewportSize({ width: 430, height: 900 });
    await page.goto(ORIGIN + '/kitchen');
    await wait(1200);
    await inRoot(page, "R.querySelector('#tab-gerald').click()");
    await wait(300);
    const ink = await inRoot(page, "return getComputedStyle(R.querySelector('#feed b')).color");
    check(ink === 'rgb(227, 208, 184)', 'Dark mode text is the softer cream: ' + ink);
    const n = await inRoot(page, "return R.querySelectorAll('#feed > li').length");
    check(n === 5, 'Crew shows the five newest updates: ' + n);
    const more = await inRoot(page, "return !R.querySelector('#feedMore').hidden");
    check(more, 'See all updates button shows');
    await inRoot(page, "R.querySelector('#feed').closest('.card').scrollIntoView()");
    await page.screenshot({ path: 'crew-dark.png' });
    await inRoot(page, "R.querySelector('#feedMore').click()");
    await wait(300);
    const all = await inRoot(page, "return [!R.querySelector('#view-news').hidden, R.querySelectorAll('#feedAll > li').length, R.querySelector('#tab-gerald').getAttribute('aria-selected')]");
    check(all[0] && all[1] === 9 && all[2] === 'true', 'What\'s new page shows all 9 updates with Crew tab selected: ' + all);
    await page.screenshot({ path: 'news-dark.png', fullPage: true });
    await inRoot(page, "R.querySelector('#newsBack').click()");
    await wait(200);
    check(await inRoot(page, "return !R.querySelector('#view-gerald').hidden"), 'Back to Crew works');
    await inRoot(page, "R.querySelector('#tab-settings').click()");
    await wait(200);
    await Promise.all([page.waitForNavigation(), inRoot(page, "R.querySelector('#liveLogout').click()")]);
    check(st.visited.includes('/logout'), 'Log out in Settings goes to BD logout');
    await ctx.close();
  }

  // 6. Home: Pizza of the Month and quick starts; Kitchen keeps Hire Gerald; Gerald intro remembered on the account
  {
    const st = { calls: [], visited: [], bodies: [] };
    st.handler = (path, req) => { if (path === '/profile') st.bodies.push(req.postData()); const x = session('pro', { monthly: 250 }); x.prefs = st.met ? { met_gerald: true } : {}; return x; };
    const { ctx, page } = await setup(browser, st);
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.setViewportSize({ width: 430, height: 1300 });
    await page.goto(ORIGIN + '/kitchen');
    await wait(1200);
    const h = await inRoot(page, "return [R.querySelector('#tab-today').textContent, !R.querySelector('#view-today').hidden, !!R.querySelector('#view-today #specialCard'), !R.querySelector('#specialCard').hidden, !R.querySelector('#meetGerald').hidden]");
    check(h[0] === 'Home' && h[1] && h[2] && h[3], 'Home tab shows Pizza of the Month: ' + h);
    check(h[4], 'New member sees Gerald intro');
    await page.screenshot({ path: 'home.png', fullPage: true });
    await inRoot(page, "R.querySelector('#geraldOk').click()");
    await wait(300);
    check(st.bodies.some(b => b && b.indexOf('met_gerald') > 0), 'Nice to meet you saves to the account');
    // a fresh browser (private window) for a member who already met Gerald
    st.met = true;
    await page.evaluate(() => localStorage.clear());
    await page.goto(ORIGIN + '/kitchen');
    await wait(1200);
    check(await inRoot(page, "return R.querySelector('#meetGerald').hidden"), 'Gerald intro stays hidden in a private window');
    check(await inRoot(page, "return !R.querySelector('#view-make #specialCard') && !R.querySelector('#view-gerald #specialCard') && !R.querySelector('#view-gerald #hireBtn')"), 'Pizza of the Month only on Home; nothing left in Crew');
    await inRoot(page, "R.querySelector('#homeHire').click()");
    await wait(300);
    const k = await inRoot(page, "return [!R.querySelector('#view-make').hidden, !R.querySelector('#kitchenExtras').hidden, !R.querySelector('#kxHireWrap').hidden]");
    check(k[0] && k[1] && k[2], 'Hire Gerald on Home opens the Kitchen with Gerald ready: ' + k);
    await inRoot(page, "R.querySelector('#tab-today').click()");
    await wait(200);
    await inRoot(page, "R.querySelector('#homeNew').click()");
    await wait(300);
    const n = await inRoot(page, "return [!R.querySelector('#view-make').hidden, R.querySelector('#kxHireWrap').hidden, R.querySelector('#steps li') ? R.querySelector('#steps').textContent.slice(0,20) : '']");
    check(n[0] && n[1], 'Make a new pizza opens the Kitchen at the start: ' + n);
    await inRoot(page, "R.querySelector('#tab-today').click()");
    await wait(200);
    await inRoot(page, "R.querySelector('#spSend').click()");
    await wait(300);
    check(await inRoot(page, "return !R.querySelector('#view-make').hidden && R.querySelector('#kitchenExtras').hidden"), 'Send this pizza (Pizza of the Month) goes to the Kitchen send steps');
    await ctx.close();
  }

  // 7. Billing inside the app
  {
    const st = { calls: [], visited: [] };
    st.handler = (path) => {
      if (path === '/billing') return { ok: true, links: { change_plan: '/account/upgrade', billing: '/account/billing', checkout_pro: '/checkout/12', checkout_team: '/checkout/11', checkout_free: '/checkout/10' }, invoices: [
        { id: '3702000002', number: '3702000002', date: '2026-10-23T00:00:00.000Z', paidAt: '2026-10-23T00:00:00.000Z', status: 'Paid', totalCents: 299, items: [{ description: 'Special Delivery', amountCents: 299 }] }] };
      return session('pro', { monthly: 250, special_delivery: 1 });
    };
    const { ctx, page } = await setup(browser, st);
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.setViewportSize({ width: 430, height: 1400 });
    await page.goto(ORIGIN + '/kitchen');
    await wait(1200);
    await inRoot(page, "R.querySelector('#tab-settings').click()");
    await wait(600);
    const folded = await inRoot(page, "const c=R.querySelector('#liveBilling');return [c.classList.contains('afold'), c.classList.contains('open'), c.querySelector('.afold-sum').textContent]");
    check(folded[0] && !folded[1] && folded[2].indexOf('Last payment') === 0, 'Billing card starts folded with a summary: ' + folded[2]);
    await inRoot(page, "R.querySelector('#liveBilling > h2').click()"); await wait(100);
    const t = await inRoot(page, "const c=R.querySelector('#liveBilling');return c?c.innerText:''");
    check(t.indexOf('Special Delivery') >= 0 && t.indexOf('$2.99') >= 0 && t.indexOf('Invoice 3702000002') >= 0, 'Billing card lists the paid invoice');
    await inRoot(page, "R.querySelector('#liveBilling').scrollIntoView()");
    await page.screenshot({ path: 'billing.png' });
    await inRoot(page, "[...R.querySelectorAll('#liveBilling button')].find(b=>b.textContent==='Change plan').click()");
    await wait(200);
    const labels = await inRoot(page, "return [...R.querySelectorAll('#liveSheet .btn')].map(b=>b.textContent).join('|')");
    check(labels === 'Continue to change plan|Cancel', 'Change plan sheet: ' + labels);
    await Promise.all([page.waitForNavigation(), inRoot(page, "[...R.querySelectorAll('#liveSheet .btn')][0].click()")]);
    check(st.visited.includes('/account/upgrade'), 'Change plan goes to BD upgrade page');
    await page.goto(ORIGIN + '/kitchen'); await wait(1200);
    await inRoot(page, "R.querySelector('#tab-settings').click()"); await wait(600);
    await page.evaluate(() => { window.__opened = []; window.open = (u) => { window.__opened.push(u); return {}; }; });
    await inRoot(page, "R.querySelector('#liveBilling > h2').click()"); await wait(100);
    await inRoot(page, "[...R.querySelectorAll('#liveBilling button')].find(b=>b.textContent.indexOf('Update card')===0).click()"); await wait(300);
    check((await inRoot(page, "return R.querySelector('#liveSheet h2').textContent")) === 'Card and billing address', 'Update card explains the secure billing page');
    await inRoot(page, "[...R.querySelectorAll('#liveSheet .btn')].find(b=>b.textContent==='Open secure billing').click()"); await wait(300);
    const opened = await page.evaluate(() => window.__opened);
    check(opened.length === 1 && opened[0].indexOf('/account/billing') >= 0 && new URL(page.url()).pathname === '/kitchen', 'BD billing opens in a new tab and the app stays open: ' + opened);
    await ctx.close();
  }

  // 8. A visitor who is not logged in builds a pizza, is asked to sign up at send, and gets the pizza back after
  {
    const st = { calls: [], visited: [], token: '' };
    st.handler = () => session('free', { monthly: 10 });
    const { ctx, page } = await setup(browser, st);
    await page.goto(ORIGIN + '/kitchen');
    await wait(1000);
    await inRoot(page, "R.querySelector('#tab-make').click()");
    await wait(300);
    check(await inRoot(page, "return !R.querySelector('#view-make').hidden && R.querySelector('#view-gate').hidden"), 'Visitor can open the Kitchen and build a pizza');
    await page.evaluate(() => window.__SOT_DEBUG.goSend());
    await wait(300);
    await inRoot(page, "const n=R.querySelector('#toName');n.value='Pat';n.dispatchEvent(new Event('input',{bubbles:true}));const c=R.querySelector('#toContact');c.value='pat@example.com';c.dispatchEvent(new Event('input',{bubbles:true}));R.querySelector('#sendNow').click()");
    await wait(300);
    const t = await inRoot(page, "return R.querySelector('#liveSheet h2').textContent");
    check(t === 'Your pizza is ready to send', 'At send, visitor is asked to make a free account: ' + t);
    await Promise.all([page.waitForNavigation(), inRoot(page, "R.querySelector('#liveSheet .btn.primary').click()")]);
    check(st.visited.includes('/checkout/10'), 'Create free account opens the A Slice sign up form');
    const saved = await page.evaluate(() => !!localStorage.getItem('sot_draft'));
    check(saved, 'The pizza is saved while they sign up');
    st.token = undefined;
    await page.goto(ORIGIN + '/kitchen');
    await wait(1300);
    check(await inRoot(page, "return !R.querySelector('#view-make').hidden && R.querySelector('#toName').value === 'Pat'"), 'After signing up, their pizza is back on the send step');
    await ctx.close();
  }

  await browser.close();
  console.log(failures ? failures + ' FAILED' : 'ALL PASSED');
  process.exit(failures ? 1 : 0);
})();
