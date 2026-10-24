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
  for (const plan of ['free', 'pro']) {
    const st = { calls: [], visited: [] };
    st.handler = (path) => path === '/session' ? session(plan, { monthly: 5 }, {}) : path === '/people' ? { ok: true, people: [] } : path === '/presets' ? { ok: true, limit: 1, presets: [] } : {};
    const { page } = await setup(browser, st);
    await page.goto(ORIGIN + '/kitchen'); await wait(1200);
    await inRoot(page, "R.querySelector('#tab-make').click()"); await wait(300);
    const pms = await inRoot(page, "R.querySelector('#premadeBox').open=true;return [...R.querySelectorAll('#premades .pm')].map(b=>b.querySelector('b').textContent+(b.classList.contains('locked')?':locked':''))");
    const hm = pms.find(x => x.indexOf('Hot Mess Express') === 0), ha = pms.find(x => x.indexOf('Heart Attack Express') === 0);
    check(hm === 'Hot Mess Express', plan + ': Hot Mess Express is open to everyone: ' + hm);
    check(plan === 'free' ? ha === 'Heart Attack Express:locked' : ha === 'Heart Attack Express', plan + ': Heart Attack Express is Pro only: ' + ha);
    await inRoot(page, "[...R.querySelectorAll('#premades .pm')].find(b=>b.querySelector('b').textContent==='Hot Mess Express').click()"); await wait(300);
    const layout = await inRoot(page, "const p=R.querySelector('.panel[data-step=\"2\"]');const kids=[...p.children].map(c=>c.id||c.className||c.tagName);return [kids.indexOf('btn-row')<kids.indexOf('tgroup'), [...p.querySelectorAll('.tgroup')].map(d=>d.dataset.g+(d.open?':open':'')).join(','), R.querySelector('#tgOn-veg').textContent]");
    check(layout[0] === true, plan + ': Sprinkle a handful row sits above the topping sections');
    check(layout[1] === 'food:open,meat,veg,meeting,silly,pro', plan + ': only Classic starts open: ' + layout[1]);
    check(layout[2] === '· 24 on the pizza' || layout[2].indexOf('on the pizza') > 0, plan + ': closed sections count their toppings: ' + layout[2]);
    if (plan === 'free') { await page.setViewportSize({ width: 420, height: 900 }); await inRoot(page, "R.querySelector('#handful').scrollIntoView({block:'start'})"); await wait(200); await page.screenshot({ path: '../tgroups.png' }); }
    const meat = await inRoot(page, "return [...R.querySelectorAll('#chips-meat .chip')].map(c=>c.textContent.trim()+(c.classList.contains('locked')?':locked':'')).join('|')");
    const veg = await inRoot(page, "return [...R.querySelectorAll('#chips-veg .chip')].map(c=>c.textContent.trim()+(c.classList.contains('locked')?':locked':'')).join('|')");
    const silly = await inRoot(page, "return [...R.querySelectorAll('#chips-silly .chip')].map(c=>c.textContent.trim()).join('|')");
    console.log('  meat:', meat); console.log('  veg:', veg); console.log('  silly:', silly);
    check(plan === 'free' ? (meat.match(/:locked/g) || []).length === 3 && (veg.match(/:locked/g) || []).length === 2 : meat.indexOf(':locked') < 0 && veg.indexOf(':locked') < 0, plan + ': paid toppings locked only on A Slice');
    check(silly.indexOf('sock') < 0 && silly.indexOf('hat') < 0, plan + ': sock and tiny hat removed from Silly');
    await inRoot(page, "const q=R.querySelector('#quickLabel');q.value='Thanks!';q.dispatchEvent(new Event('change'))"); await wait(200);
    await inRoot(page, "R.querySelector('#chips-food .chip').click()"); await wait(100);
    const picked = await inRoot(page, "return [R.querySelector('#quickLabel').value, R.querySelector('#labelText').value]");
    check(picked[0] === 'Thanks!' && picked[1] === 'Thanks!', plan + ': picked message stays showing in the dropdown and the box: ' + picked);
    const name = await inRoot(page, "return R.querySelector('#makeFor') && R.querySelector('#pizzaName') ? R.querySelector('#pizzaName').value : ''");
    if (plan === 'pro') {
      await inRoot(page, "R.querySelector('#veganChip').click()"); await wait(100);
      const vm = await inRoot(page, "return [...R.querySelectorAll('#chips-meat .chip')].map(c=>c.textContent.trim()).join('|')");
      check(vm.indexOf('Plant sausage') >= 0 && vm.indexOf('BBQ plant chicken') >= 0, 'pro: vegan pizzas get plant meats: ' + vm);
    }
  }
  await browser.close();
  console.log(failures ? failures + ' FAILED' : 'ALL PASSED');
})();
