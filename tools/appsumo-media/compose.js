const { chromium } = require('playwright'); const fs = require('fs');
const R = '/home/user/slice-of-thanks/brand', M = process.cwd();
const img = p => 'data:image/png;base64,' + fs.readFileSync(p).toString('base64');
const svg = p => 'data:image/svg+xml;base64,' + fs.readFileSync(p).toString('base64');
const A = { logo: img(R + '/logos/wordmark-color.png'), potato: img(R + '/characters/potato-delivery-side.png'), celebrate: img(R + '/characters/potato-celebrate.png'), gerald: svg(R + '/characters/gerald-avatar.svg') };
const shot = k => img(M + '/crops/' + k + '.png');
const PAGES = [
 { file: 'hero', eyebrow: 'Thank-you notes, upgraded', title: 'Send a thank-you pizza they\'ll actually open.', sub: 'A digital pizza with your logo, your note and a gift under the last slice. Delivered by Potato, reviewed by Gerald.', bullets: ['Built in a minute, opened in seconds', 'Your brand on the box and the scooter', 'Sends itself after meetings and on birthdays'], phones: ['box', 'kitchen', 'gift'], art: 'potato' },
 { file: 'story-1', eyebrow: 'Build it in a minute', title: 'A follow-up that doesn\'t feel like a follow-up', sub: 'Build a pizza, spell a word in pepperoni, and box it with your note. They open the box and eat it one slice at a time.', bullets: ['Six playful steps: dough, sauce, toppings, bake, box, send', 'Spell THANK YOU (or their name) in pepperoni', 'Your note waits inside the lid'], phones: ['kitchen', 'note', 'half'], art: 'potato' },
 { file: 'story-2', eyebrow: 'Gifts that start conversations', title: 'Turn a thank-you into your next conversation', sub: 'Every pizza ends with a reason to reply, book or buy.', bullets: ['A gift or coupon code revealed after the sixth slice', 'Your own button, like Book a follow-up or Leave a review', 'Replies come straight to your inbox, and People shows who opened'], phones: ['gift', 'send', 'people'], art: 'celebrate' },
 { file: 'story-3', eyebrow: 'Automations', title: 'Thoughtful follow-ups, minus the remembering', sub: 'Connect Calendly or TidyCal once. Slice of Thanks remembers the rest.', bullets: ['A pizza goes out when each meeting ends', 'Birthday and work anniversary pizzas send at 8 AM', 'Send to a whole list, each person gets their own pizza'], phones: ['home', 'meet', 'dates'], art: 'gerald' },
 { file: 'story-4', eyebrow: 'Hire Gerald', title: 'Meet Gerald, your Head Chef', sub: 'Short on time? Tell Gerald who it\'s for and why. He builds the pizza, boxes it and writes the note.', bullets: ['Pick the vibe: classic, fancy, fun or over the top', 'Notes in your style: heartfelt, funny, polished and more', 'He reviews every pizza. He takes appreciation seriously.'], phones: ['hire', 'boxstep', 'review'], art: 'gerald' },
];
const html = p => `<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Shrikhand&family=Work+Sans:wght@400;500;600;700;800&display=swap"><style>
*{box-sizing:border-box;margin:0;padding:0}
body{width:1920px;height:1080px;overflow:hidden;background:#FFF3E0;font-family:'Work Sans',sans-serif;color:#3E2416;position:relative}
.chk{position:absolute;left:0;right:0;height:30px;background:repeating-conic-gradient(#D62828 0 25%,#FFF3E0 0 50%) 0 0/30px 30px}
.top{top:0}.bot{bottom:0}
.left{position:absolute;left:100px;top:96px;width:720px}
.logo{height:64px;margin-bottom:34px}
.eyebrow{display:inline-block;font-weight:800;letter-spacing:.14em;text-transform:uppercase;font-size:20px;color:#fff;background:#D62828;border:3px solid #3E2416;border-radius:999px;padding:8px 20px;box-shadow:4px 4px 0 #3E2416}
h1{font-family:'Shrikhand',serif;font-size:62px;line-height:1.08;margin:24px 0 20px;letter-spacing:-.5px}
.sub{font-size:26px;line-height:1.4;color:#5a3a28;margin-bottom:30px}
ul{list-style:none}
li{display:flex;gap:16px;align-items:flex-start;font-size:24px;font-weight:600;line-height:1.3;margin:0 0 18px}
li i{flex:none;width:38px;height:38px;border-radius:50%;background:#F2C14E;border:3px solid #3E2416;display:grid;place-items:center;font-style:normal;font-weight:800;font-size:20px;margin-top:-2px}
.phones{position:absolute;right:30px;top:90px;width:1000px;height:920px}
.ph{position:absolute;width:336px;height:694px;border:9px solid #3E2416;border-radius:46px;background:#3E2416;box-shadow:14px 16px 0 rgba(62,36,22,.9);overflow:hidden}
.ph img{width:100%;height:100%;object-fit:cover;object-position:top;border-radius:36px;display:block}
.p0{left:0;top:120px;transform:rotate(-5deg)}
.p1{left:330px;top:40px;z-index:2;transform:scale(1.07)}
.p2{left:660px;top:130px;transform:rotate(5deg)}
.art{position:absolute;z-index:3}
.art.potato{width:250px;left:560px;bottom:44px}
.art.celebrate{width:200px;left:610px;bottom:44px}
.art.gerald{width:150px;left:660px;bottom:60px;border:6px solid #3E2416;border-radius:50%;background:#F2C14E;box-shadow:6px 6px 0 #3E2416}
</style></head><body><div class="chk top"></div><div class="chk bot"></div>
<div class="left"><img class="logo" src="${A.logo}"><br><span class="eyebrow">${p.eyebrow}</span><h1>${p.title}</h1><p class="sub">${p.sub}</p><ul>${p.bullets.map(b => `<li><i>&#10003;</i><span>${b}</span></li>`).join('')}</ul></div>
<div class="phones">${p.phones.map((k, i) => `<div class="ph p${i}"><img src="${shot(k)}"></div>`).join('')}</div>
<img class="art ${p.art}" src="${A[p.art]}">
</body></html>`;
(async () => {
  const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  fs.mkdirSync('out', { recursive: true });
  for (const p of PAGES) {
    await pg.setContent(html(p), { waitUntil: 'networkidle' }); await pg.waitForTimeout(500);
    await pg.screenshot({ path: 'out/slice-of-thanks-' + p.file + '.png' });
  }
  await b.close();
})();
