// Recipient page fun receipt: above Gerald's review, live slice count, Share my receipt saves an image. Usage: node receipt-test.js /out/dir [1|birthday] [es]
const { chromium } = require('playwright'); const fs = require('fs');
const root = require('path').resolve(__dirname, '../..'), OUT = process.argv[2], DEMO = process.argv[3] || '1';
const wait = ms => new Promise(r => setTimeout(r, ms));
let fails = 0; const check = (ok, m) => { console.log((ok ? 'PASS ' : 'FAIL ') + m); if (!ok) fails++; };
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, acceptDownloads: true });
  const u = await ctx.newPage(); u.on('pageerror', e => { console.log('ERR', e.message); fails++; });
  await u.route('https://x.test/x/**', r => { const f = root + new URL(r.request().url()).pathname.slice(2); const t = f.endsWith('.svg') ? 'image/svg+xml' : 'image/png'; return fs.existsSync(f) ? r.fulfill({ status: 200, contentType: t, body: fs.readFileSync(f) }) : r.fulfill({ status: 404, body: '' }); });
  await u.route('**/fonts.googleapis.com/**', r => r.abort());
  await u.route('https://x.test/p**', r => r.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Shrikhand&family=Yellowtail&family=Work+Sans:wght@400;500;600;700&family=Caveat:wght@500;700&family=Courier+Prime:wght@400;700&display=swap"><style>' + fs.readFileSync(root + '/unbox/unbox.css', 'utf8') + '</style></head><body style="margin:0"><div id="sot-unbox" class="sot-u" data-base="https://x.test/x"></div><script>' + fs.readFileSync(root + '/shared/pizza-core.js', 'utf8') + '</script><script>' + fs.readFileSync(root + '/unbox/unbox.js', 'utf8') + '</script></body></html>' }));
  await u.goto('https://x.test/p?demo=' + DEMO + (process.argv[4] ? '&lang=' + process.argv[4] : '')); await wait(2500);
  await u.click('.u-btn.primary'); await wait(1500); await u.click('.u-btn.primary'); await wait(600);
  check(await u.evaluate(() => { const f = document.querySelector('.fun-receipt'), r = document.querySelector('.receipt'); return !!f && !!r && (f.compareDocumentPosition(r) & 4) > 0 && f !== r; }), 'Fun receipt sits above Gerald\'s review, as its own card');
  for (let i = 0; i < 6; i++) { await u.click('.u-eat'); await wait(200); }
  await wait(1500);
  const txt = await u.evaluate(() => document.querySelector('.fun-receipt').textContent);
  check(txt.includes('6/6'), 'Slices devoured shows 6/6');
  check(txt.includes('$0.00'), 'Total $0.00');
  await u.evaluate(() => { const o = document.querySelector('.fun-receipt'); window.scrollTo(0, o.getBoundingClientRect().top + scrollY - 10); }); await wait(400);
  await u.screenshot({ path: OUT + '/rcpt-' + DEMO + '.png' });
  const [dl] = await Promise.all([u.waitForEvent('download'), u.click('.fun-receipt .u-btn')]);
  await dl.saveAs(OUT + '/share-' + DEMO + '.png');
  check(fs.statSync(OUT + '/share-' + DEMO + '.png').size > 20000, 'Share image saved');
  check((await u.evaluate(() => document.querySelector('.fr-status').textContent)).length > 5, 'Saved message shows');
  await b.close(); console.log(fails ? fails + ' FAILED' : 'ALL PASSED');
})();
