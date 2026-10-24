// Gerald full box, note styles and Reserve vibes. Usage: node gerald-test.js /path/to/app.js
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
      return { ok: true };
    };
    const { page } = await setup(browser, st);
    await page.setViewportSize({ width: 420, height: 900 });
    await page.goto(ORIGIN + '/kitchen'); await wait(1500);
    await inRoot(page, "R.querySelector('#homeHire').click()"); await wait(300);
    const tag = await inRoot(page, "return !!R.querySelector('#kxHireWrap .tag')");
    check(!tag, plan + ': Hire Gerald has no Pro feature tag');
    const biz = await inRoot(page, "[...R.querySelectorAll('#hireKind .chip')].find(c=>c.textContent==='Business').click();return [...R.querySelectorAll('#hireReserve .chip')].map(c=>c.textContent.trim().replace(/Pro$/,'')).join('|')");
    check(biz === 'Holiday Feast|Cheers to You|Big Win|New Client Welcome|Referral Thanks|Year-End Thanks', plan + ': business Reserve vibes: ' + biz);
    await wait(100);
    const per = await inRoot(page, "[...R.querySelectorAll('#hireKind .chip')].find(c=>c.textContent==='Personal').click();return [...R.querySelectorAll('#hireReserve .chip')].map(c=>c.textContent.trim().replace(/Pro$/,'')).join('|')");
    check(per === 'Birthday Bash|Retirement Party|Love Notes|Holiday Feast|Cheers to You', plan + ': personal Reserve vibes: ' + per);
    const ns = await inRoot(page, "return [...R.querySelectorAll('#hireNote .chip')].map(c=>c.textContent.trim().replace(/Pro$/,'')).join('|')");
    check(ns === 'Heartfelt|Funny|Snarky|Polished|Short and sweet', plan + ': note styles: ' + ns);
    await inRoot(page, "const s=R.querySelector('#hireFor');s.value='c:p1';s.dispatchEvent(new Event('change'))");
    if (plan === 'free') {
      await inRoot(page, "[...R.querySelectorAll('#hireReserve .chip')].find(c=>c.textContent.trim().replace(/Pro$/,'')==='Retirement Party').click()"); await wait(200);
      const up = await inRoot(page, "const u=R.querySelector('#upTitle');return u?u.textContent:''");
      check(up === "Gerald's Reserve", 'free: Reserve vibes open the upgrade: ' + up);
      await inRoot(page, "const c=R.querySelector('#upClose')||[...R.querySelectorAll('button')].find(b=>b.textContent==='Not now');c&&c.click()"); await wait(100);
      await inRoot(page, "const t=R.querySelector('#hireTopic');t.value='Happy Retirement';t.dispatchEvent(new Event('input'));R.querySelector('#hireBtn').click()"); await wait(400);
      const fb = await inRoot(page, "return [R.querySelector('#geraldNoteLine').hidden, R.querySelector('#stickerSel').value]");
      check(fb[0] === true && fb[1] === 'Happy Retirement', 'free: Gerald makes the pizza and sticker, the note stays yours: ' + fb);
    } else {
      await inRoot(page, "[...R.querySelectorAll('#hireReserve .chip')].find(c=>c.textContent.trim().replace(/Pro$/,'')==='Retirement Party').click()"); await wait(100);
      await inRoot(page, "[...R.querySelectorAll('#hireNote .chip')].find(c=>c.textContent.trim()==='Snarky').click()"); await wait(100);
      await inRoot(page, "const t=R.querySelector('#hireTopic');t.value='';t.dispatchEvent(new Event('input'));R.querySelector('#hireBtn').click()"); await wait(400);
      const fb = await inRoot(page, "return [R.querySelector('#geraldNoteLine').hidden, R.querySelector('#stickerSel').value, R.querySelector('#noteText').value, R.querySelector('#lidPreview').dataset.style, [...R.querySelectorAll('#confettiChips .chip')].find(c=>c.classList.contains('on')||c.getAttribute('aria-pressed')==='true').textContent]");
      check(fb[0] === false && fb[1] === 'Happy Retirement' && fb[3] === 'midnight' && fb[4].indexOf('Gold') === 0, 'pro: Retirement Party fills the box: ' + fb.join(' | '));
      check(['the suffering has come to an end', 'the coffee machine will not'].some(x => fb[2].toLowerCase().indexOf(x) >= 0) && fb[2].indexOf('[first name]') >= 0, 'pro: Gerald writes a snarky retirement note with [first name]: ' + fb[2]);
      await page.screenshot({ path: '../gerald-fullbox.png' });
      // business Big Win, polished
      await inRoot(page, "R.querySelector('#tab-today').click()"); await wait(100);
      await inRoot(page, "R.querySelector('#homeHire').click()"); await wait(200);
      await inRoot(page, "[...R.querySelectorAll('#hireKind .chip')].find(c=>c.textContent==='Business').click()"); await wait(100);
      await inRoot(page, "[...R.querySelectorAll('#hireReserve .chip')].find(c=>c.textContent.trim()==='Big Win').click();[...R.querySelectorAll('#hireNote .chip')].find(c=>c.textContent.trim()==='Polished').click()"); await wait(100);
      await inRoot(page, "const s=R.querySelector('#hireFor');s.value='c:p1';s.dispatchEvent(new Event('change'));R.querySelector('#hireBtn').click()"); await wait(400);
      const bw = await inRoot(page, "return [R.querySelector('#stickerSel').value, R.querySelector('#lidPreview').dataset.style, R.querySelector('#noteText').value]");
      check(bw[0] === 'Congratulations' && bw[1] === 'gold' && (bw[2].indexOf('win') > 0 || bw[2].indexOf('making this happen') > 0), 'pro: Big Win gets Fancy gold, Congratulations and a polished win note: ' + bw.join(' | '));
    }
    await page.close();
  }
  await browser.close();
  console.log(failures ? failures + ' FAILED' : 'ALL PASSED');
  process.exit(failures ? 1 : 0);
})();
