// Every topping draws on a pizza: each one changes the pizza where it sits, emoji toppings show in color,
// and googly eyes have white eyeballs and black pupils. Saves a sheet of all toppings when SHOT is set.
// Usage: node toppings-test.js [path/to/pizza-core.js]
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
const CORE = fs.readFileSync(process.argv[2] || path.resolve(__dirname, '../../shared/pizza-core.js'), 'utf8');
let failures = 0; const check = (ok, m) => { console.log((ok ? 'PASS ' : 'FAIL ') + m); if (!ok) failures++; };
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  p.on('pageerror', e => { console.log('PAGE ERROR', e.message); failures++; });
  await p.route('https://x.test/**', r => r.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><html><head><meta charset="utf-8"></head><body><script>' + CORE + '</script></body></html>' }));
  await p.goto('https://x.test/');
  const res = await p.evaluate(() => {
    const P = window.SOTPizza, keys = Object.keys(P.TOPS), S = 300, out = [];
    const base = { size: 0.9, seed: 3, sauce: 'red', cheese: 'mozz', vegan: false, bake: 1, baked: true, bakeLevel: 1 };
    const draw = (tops) => { const cv = document.createElement('canvas'); P.drawPizza(cv, Object.assign({}, base, { toppings: tops }), S); return cv; };
    // A tinted topping first (mushrooms), the way a real pizza has them, then the topping being checked
    const before = [{ k: 'mushroom', x: -0.5, y: -0.5, rot: 0.3 }, { k: 'olive', x: 0.5, y: 0.5, rot: 0.2 }];
    const pc = draw(before), W = pc.width, H = pc.height, plain = pc.getContext('2d').getImageData(0, 0, W, H).data;
    const r0 = Math.round(W * 0.42), r1 = Math.round(W * 0.58), cell = (r1 - r0) / 60; // the middle of the pizza, where the topping sits
    const sheet = document.createElement('canvas'); const cols = 8; sheet.width = cols * 110; sheet.height = Math.ceil(keys.length / cols) * 130; const sc = sheet.getContext('2d');
    sc.fillStyle = '#FFF3E0'; sc.fillRect(0, 0, sheet.width, sheet.height);
    keys.forEach((k, i) => {
      const cv = draw(before.concat([{ k, x: 0, y: 0, rot: 0.4, label: k === 'label' ? 'A' : undefined }]));
      const d = cv.getContext('2d').getImageData(0, 0, W, H).data;
      let changed = 0, colorful = 0, white = 0, black = 0;
      for (let yy = 0; yy < 60; yy++) for (let xx = 0; xx < 60; xx++) {
        const x = Math.round(r0 + xx * cell), y = Math.round(r0 + yy * cell), o = (y * W + x) * 4, dr = Math.abs(d[o] - plain[o]) + Math.abs(d[o + 1] - plain[o + 1]) + Math.abs(d[o + 2] - plain[o + 2]);
        if (dr > 40) changed++;
        const mx = Math.max(d[o], d[o + 1], d[o + 2]), mn = Math.min(d[o], d[o + 1], d[o + 2]);
        if (mx - mn > 60) colorful++; if (mn > 225) white++; if (mx < 50) black++;
      }
      out.push({ k, emoji: !!P.TOPS[k].e, changed, colorful, white, black });
      const col = i % cols, row = Math.floor(i / cols);
      sc.drawImage(cv, W * 0.36, H * 0.36, W * 0.28, H * 0.28, col * 110 + 5, row * 130 + 5, 100, 100);
      sc.fillStyle = '#3E2416'; sc.font = '11px sans-serif'; sc.textAlign = 'center'; sc.fillText(k, col * 110 + 55, row * 130 + 122);
    });
    return { out, sheet: sheet.toDataURL('image/png') };
  });
  for (const r of res.out) {
    check(r.changed > 25, `${r.k} draws on the pizza (${r.changed} pixels changed)`);
    if (r.emoji && r.k !== 'eyes') check(r.colorful > 20 || r.black > 20 || r.white > 20, `${r.k} emoji shows in full color`);
  }
  const eyes = res.out.find(r => r.k === 'eyes');
  check(eyes && eyes.white > 60 && eyes.black > 15, `Googly eyes have white eyeballs (${eyes && eyes.white}) and black pupils (${eyes && eyes.black})`);
  check(res.out.length >= 40, res.out.length + ' toppings checked');
  if (process.env.SHOT) fs.writeFileSync(process.env.SHOT, Buffer.from(res.sheet.split(',')[1], 'base64'));
  await b.close(); console.log(failures ? failures + ' FAILED' : 'ALL PASSED'); process.exit(failures ? 1 : 0);
})();
