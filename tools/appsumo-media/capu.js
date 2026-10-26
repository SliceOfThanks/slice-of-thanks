const { chromium } = require('playwright'); const fs = require('fs');
const root = '/home/user/slice-of-thanks', OUT = process.argv[2];
const wait = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 402, height: 874 }, deviceScaleFactor: 3 });
  const u = await ctx.newPage(); u.on('pageerror', e => console.log('ERR', e.message));
  await u.route('https://x.test/x/**', r => { const f = root + new URL(r.request().url()).pathname.slice(2); const t = f.endsWith('.svg') ? 'image/svg+xml' : 'image/png'; return fs.existsSync(f) ? r.fulfill({ status: 200, contentType: t, body: fs.readFileSync(f) }) : r.fulfill({ status: 404, body: '' }); });
  await u.route('https://x.test/p**', r => r.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Shrikhand&family=Yellowtail&family=Work+Sans:wght@400;500;600;700&family=Caveat:wght@500;700&family=Courier+Prime:wght@400;700&display=swap"><style>' + fs.readFileSync(root + '/unbox/unbox.css', 'utf8') + '</style></head><body style="margin:0"><div id="sot-unbox" class="sot-u" data-base="https://x.test/x"></div><script>' + fs.readFileSync(root + '/shared/pizza-core.js', 'utf8') + '</script><script>' + fs.readFileSync(root + '/unbox/unbox.js', 'utf8') + '</script></body></html>' }));
  await u.goto('https://x.test/p?demo=1'); await wait(3000);
  await u.screenshot({ path: OUT + '/u0-closed.png' });
  await u.click('.u-btn.primary'); await wait(1800);
  await u.screenshot({ path: OUT + '/u1-open.png' });
  await u.click('.u-btn.primary'); await wait(900);
  await u.screenshot({ path: OUT + '/u2-eat.png', fullPage: true });
  for (let i = 0; i < 3; i++) { await u.click('.u-eat'); await wait(250); }
  await wait(600);
  await u.evaluate(() => { const o = document.querySelector('.u-eat'); window.scrollTo(0, o.getBoundingClientRect().top + scrollY - 140); }); await wait(300);
  await u.screenshot({ path: OUT + '/u3-half.png' });
  for (let i = 0; i < 3; i++) { await u.click('.u-eat'); await wait(250); }
  await wait(1800);
  await u.evaluate(() => { const o = document.querySelector('.u-gift'); window.scrollTo(0, o.getBoundingClientRect().top + scrollY - 60); }); await wait(400);
  await u.screenshot({ path: OUT + '/u4-gift.png' });
  await u.screenshot({ path: OUT + '/u5-full.png', fullPage: true });
  await b.close();
})();
