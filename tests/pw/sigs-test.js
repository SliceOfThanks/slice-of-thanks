// More signature pizzas: list, premades (business and personal), picker in the Kitchen, make main, remove, plan limits. Usage: node sigs-test.js /path/to/app.js
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
  for (const plan of ['pro', 'free']) {
    const limit = plan === 'pro' ? 10 : 1;
    const st = { calls: [], visited: [], bodies: {}, items: [], main: null, saves: [] };
    st.handler = (path, req) => {
      let b = null; try { b = JSON.parse(req.postData() || 'null'); } catch (e) {}
      if (path === '/session') return session(plan, { monthly: 10 }, {});
      if (path === '/people') return { ok: true, people: [] };
      if (path === '/signatures') return { ok: true, limit, main_id: st.main, items: st.items };
      if (path === '/signatures/save') {
        const it = b.item; st.saves.push(b);
        if (!it.id && st.items.length >= limit) return { ok: false, code: 'signature_limit', limit };
        const id = it.id || 's' + (st.items.length + 1) + '-' + st.saves.length;
        const row = { id, name: it.name, kind: it.kind, pizza: it.pizza, box: it.box };
        const i = st.items.findIndex(x => x.id === id); if (i >= 0) st.items[i] = row; else st.items.push(row);
        if (it.main) st.main = id; return { ok: true, id };
      }
      if (path === '/signatures/remove') { st.items = st.items.filter(x => x.id !== b.id); return { ok: true }; }
      return { ok: true };
    };
    const { page, ctx } = await setup(browser, st);
    await page.setViewportSize({ width: 402, height: 874 });
    await page.goto(ORIGIN + '/kitchen'); await wait(1800);
    check(st.items.length === 1 && st.main === st.items[0].id && st.saves[0].item.main === true && !!st.saves[0].image_data_url, plan + ': the signature pizza they had becomes the first on the list, as main');
    await inRoot(page, "R.querySelector('#tab-settings').click()"); await wait(400);
    const head = await inRoot(page, "const w=R.querySelector('#sigList');return w?w.querySelector('b').textContent:''");
    check(head === 'Your signature pizzas (1 of ' + limit + ')', plan + ': list header: ' + head);
    await inRoot(page, "R.querySelector('#sigPremades').click()"); await wait(300);
    const biz = await inRoot(page, "return [...R.querySelectorAll('#liveSheet .sig-pm b')].map(b=>b.textContent).join('|')");
    check(biz.indexOf('Great Meeting') >= 0 && biz.indexOf('The Welcome Aboard') >= 0, plan + ': business premades: ' + biz);
    await inRoot(page, "[...R.querySelectorAll('#liveSheet .chip')].find(c=>c.textContent==='Personal').click()"); await wait(200);
    const per = await inRoot(page, "return [...R.querySelectorAll('#liveSheet .sig-pm b')].map(b=>b.textContent).join('|')");
    check(per.indexOf('Birthday Bash') >= 0 && per.indexOf('Thank You So Much') >= 0, plan + ': personal premades: ' + per);
    const locked = await inRoot(page, "const r=[...R.querySelectorAll('#liveSheet .sig-pm')].find(r=>r.textContent.indexOf('Birthday Bash')===0);return !!r.querySelector('.pro-tag')");
    check(locked === (plan === 'free'), plan + ': Birthday Bash shows Pro only on A Slice');
    if (plan === 'pro') {
      await inRoot(page, "[...R.querySelectorAll('#liveSheet .sig-pm')].find(r=>r.textContent.indexOf('Birthday Bash')===0).querySelector('button').click()"); await wait(500);
      check(st.items.length === 2 && st.items[1].kind === 'personal' && st.items[1].box.sticker === 'Happy Birthday', 'pro: Birthday Bash added as personal with its sticker');
      await inRoot(page, "R.querySelector('#sigPremades').click()"); await wait(300);
      await inRoot(page, "[...R.querySelectorAll('#liveSheet .sig-pm')].find(r=>r.textContent.indexOf('Great Meeting')===0).querySelector('button').click()"); await wait(500);
      check(st.items.length === 3 && st.main === st.items[0].id, 'pro: Great Meeting added and the main one stays');
      const rows = await inRoot(page, "return [...R.querySelectorAll('#sigList .sig-row')].map(r=>r.querySelector('b').textContent).join('|')");
      check(rows.split('|').length === 3, 'pro: three rows in Settings: ' + rows);
      const sum = await inRoot(page, "return R.querySelector('#sigCard > .afold-sum').textContent");
      check(sum === '3 signature pizzas. After meetings: The Thank-You Special', 'pro: folded summary: ' + sum);
      if (process.env.SHOT) { await inRoot(page, "const h=R.querySelector('#sigCard > h2');if(h&&h.getAttribute('aria-expanded')!=='true')h.click();const r=R.querySelector('#sigCard').getBoundingClientRect();window.scrollTo(0,scrollY+r.top-10)"); await wait(300); await page.screenshot({ path: process.env.SHOT + '-list.png' }); await inRoot(page, "R.querySelector('#sigPremades').click()"); await wait(300); await page.screenshot({ path: process.env.SHOT + '-pm.png' }); await inRoot(page, "[...R.querySelectorAll('#liveSheet .btn')].find(b=>b.textContent==='Close').click()"); }
      await inRoot(page, "[...[...R.querySelectorAll('#sigList .sig-row')].find(r=>r.textContent.indexOf('Great Meeting')===0).querySelectorAll('button')].find(b=>b.textContent==='Make main').click()"); await wait(500);
      check(st.main === st.items[2].id && st.saves[st.saves.length - 1].image_data_url, 'pro: Make main switches the meeting pizza and sends its picture');
      // Kitchen picker
      await inRoot(page, "R.querySelector('#tab-make').click()"); await wait(300);
      await inRoot(page, "R.querySelector('#kxSig').click()"); await wait(300);
      const opts = await inRoot(page, "return [...R.querySelectorAll('#liveSheet .btn.small')].map(b=>b.textContent).join('|')");
      check(opts.split('|').length === 3 && opts.indexOf('Great Meeting · Main') >= 0, 'pro: Kitchen picker lists all three: ' + opts);
      await inRoot(page, "[...R.querySelectorAll('#liveSheet .btn.small')].find(b=>b.textContent.indexOf('Birthday Bash')===0).click()"); await wait(400);
      const on = await inRoot(page, "return R.querySelector('#steps li.on').textContent");
      check(on.indexOf('Send') >= 0 && (await toastText(page)).indexOf('Birthday Bash is ready') === 0, 'pro: picking one opens Send with it ready');
      // save the Kitchen pizza as a new signature
      await inRoot(page, "R.querySelector('#saveSig').click()"); await wait(500);
      check(st.items.length === 4 && st.saves[st.saves.length - 1].item.main === false, 'pro: Save as my signature pizza adds a new one');
      // remove
      await inRoot(page, "R.querySelector('#tab-settings').click()"); await wait(300);
      await inRoot(page, "[...[...R.querySelectorAll('#sigList .sig-row')].find(r=>r.textContent.indexOf('Birthday Bash')===0).querySelectorAll('button')].find(b=>b.textContent==='Remove').click()"); await wait(200);
      await inRoot(page, "[...R.querySelectorAll('#liveSheet .btn')].find(b=>b.textContent==='Remove').click()"); await wait(500);
      check(st.items.length === 3 && !st.items.some(x => x.name === 'Birthday Bash' && x.kind === 'personal' && x.box.sticker === 'Happy Birthday' && x.id.indexOf('s2') === 0), 'pro: Remove takes one off: ' + st.items.map(x => x.name).join('|'));
    } else {
      await inRoot(page, "[...R.querySelectorAll('#liveSheet .sig-pm')].find(r=>r.textContent.indexOf('Birthday Bash')===0).querySelector('button').click()"); await wait(300);
      check((await inRoot(page, "const o=R.querySelector('#upTitle');return o?o.textContent:''")).length > 0, 'free: a Pro premade shows the upgrade');
      await inRoot(page, "const u=R.querySelector('#upClose')||[...R.querySelectorAll('button')].find(b=>b.textContent==='Not now');if(u)u.click()"); await wait(200);
      await inRoot(page, "R.querySelector('#sigPremades').click()"); await wait(300);
      await inRoot(page, "[...R.querySelectorAll('#liveSheet .sig-pm')].find(r=>r.textContent.indexOf('Great Meeting')===0).querySelector('button').click()"); await wait(500);
      check(st.items.length === 1 && st.items[0].name === 'Great Meeting' && st.main === st.items[0].id, 'free: adding a premade replaces the one signature pizza');
      check((await inRoot(page, "const w=R.querySelector('#sigList');return w.textContent")).indexOf('Keep up to 10 signature pizzas') >= 0, 'free: shows the upgrade line');
      await inRoot(page, "R.querySelector('#tab-make').click()"); await wait(300);
      await inRoot(page, "R.querySelector('#kxSig').click()"); await wait(300);
      check((await toastText(page)).indexOf('Great Meeting is ready') === 0, 'free: Use my signature pizza goes straight to it');
    }
    await ctx.close();
  }
  await browser.close();
  console.log(failures ? failures + ' FAILED' : 'ALL PASSED');
  process.exit(failures ? 1 : 0);
})();
