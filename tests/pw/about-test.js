// About us: footer under every tab opens the About screen with Stacey, the real Potato and the Hire Stacey link. Usage: node about-test.js /path/to/app.js
const { chromium } = require('playwright'); const fs = require('fs');
const APP = fs.readFileSync(process.argv[2], 'utf8'); const API = 'https://api.test/fn', ORIGIN = 'https://www.sliceofthanks.app';
let failures = 0; const check = (ok, m) => { console.log((ok ? 'PASS ' : 'FAIL ') + m); if (!ok) failures++; };
const wait = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 }); const p = await ctx.newPage();
  p.on('pageerror', e => { console.log('PAGE ERROR', e.message); failures++; });
  await ctx.route('**/fonts.googleapis.com/**', r => r.abort());
  await ctx.route(API + '/**', r => { const path = new URL(r.request().url()).pathname.replace('/fn', ''); const body = path === '/session' ? { member_id: 'm1', env: 'live', plan: 'pro', paid_plan: 'pro', features: {}, credits: { monthly: 200 }, packs: [], checkout: {}, code: {}, profile: { display_name: 'Stacey' }, prefs: { met_gerald: true, trial_welcome: true } } : { ok: true, people: [] }; return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) }); });
  await ctx.route('https://cdn.jsdelivr.net/gh/**', r => { const f = '/home/user/slice-of-thanks/' + new URL(r.request().url()).pathname.split('/').slice(4).join('/'); return fs.existsSync(f) ? r.fulfill({ status: 200, contentType: 'image/jpeg', body: fs.readFileSync(f) }) : r.abort(); });
  await ctx.route(ORIGIN + '/**', r => r.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head><body style="margin:0"><div id="sot-app" data-api="' + API + '" data-token="tok"></div><script>' + APP.replace(/<\/script>/g, '<\\/script>') + '</script></body></html>' }));
  await p.goto(ORIGIN + '/kitchen'); await wait(2500);
  const R = f => p.evaluate(f2 => (new Function('R', f2))(window.__SOT_ROOT), f);
  for (const tab of ['today', 'make', 'people', 'gerald', 'settings']) {
    await R("R.querySelector('#tab-" + tab + "').click()"); await wait(250);
    check(await R("const f=R.querySelector('#appFoot');return !!f&&f.offsetParent!==null&&f.textContent.indexOf('About us')>=0"), 'Footer with About us shows on ' + tab);
  }
  check(await R("const a=R.querySelector('#appFoot a.ph-badge'),i=a&&a.querySelector('img');return !!a&&a.target==='_blank'&&a.href.indexOf('producthunt.com/products/slice-of-thanks')>0&&!!i&&i.src.indexOf('post_id=1293952')>0&&i.alt.indexOf('Product Hunt')>0"), 'Product Hunt badge in the footer, opening in a new tab');
  check(await R("const f=R.querySelector('#appFoot'),s=f.querySelector('a.made-by'),p=f.querySelector('a.ph-badge');return !!s&&s.textContent==='Stacey'&&s.href.indexOf('legalstacey.com')>0&&s.target==='_blank'&&f.lastElementChild===p&&f.querySelector('small').textContent==='Slice of Thanks. Made by Stacey and Potato.'"), 'Stacey links to legalstacey.com and Product Hunt sits at the very bottom');
  await R("[...R.querySelectorAll('#appFoot .linkish')].find(x=>x.textContent==='About us').click()"); await wait(800);
  check(await R("return !R.querySelector('#view-about').hidden && R.querySelector('#view-today').hidden"), 'About us opens its own screen');
  const t = await R("return R.querySelector('#view-about').textContent");
  check(t.includes("Hi, I'm Stacey.") && t.includes('Yes, Potato is real.'), 'Shows Stacey and the real Potato');
  check((await R("return R.querySelector('#aboutHire').getAttribute('href')")) === 'https://legalstacey.com', 'Hire Stacey goes to legalstacey.com');
  check(await R("return [...R.querySelectorAll('#view-about .about-photo')].every(i=>i.complete&&i.naturalWidth>0)"), 'Both photos load');
  if (process.env.SHOT) { await p.screenshot({ path: process.env.SHOT, fullPage: true }); }
  await R("R.querySelector('#aboutBack').click()"); await wait(300);
  check(await R("return !R.querySelector('#view-today').hidden"), 'Back to the Kitchen returns to Home');
  await b.close(); console.log(failures ? failures + ' FAILED' : 'ALL PASSED'); process.exit(failures ? 1 : 0);
})();
