// Hire Gerald against a mocked API. Usage: node hire-test.js /path/to/app.js
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
  const st = { calls: [], visited: [], bodies: {} };
  st.handler = (path, req) => {
    let b = null; try { b = JSON.parse(req.postData() || 'null'); } catch (e) {}
    if (b) (st.bodies[path] = st.bodies[path] || []).push(b);
    if (path === '/session') { const s = session('pro', { monthly: 50 }, {}); s.features = { automations: true }; return s; }
    if (path === '/people') return { ok: true, people: [
      { id: 'p1', name: 'Rebecca Jones', email: 'rebecca@x.test', company: 'Jones Law', vegan: false, history: [] },
      { id: 'p2', name: 'Ana Ruiz', email: 'ana@x.test', company: '', vegan: true, history: [] }] };
    if (path === '/presets') return { ok: true, limit: 10, presets: [] };
    if (path === '/calendar') return { ok: true, integrations: [{ provider: 'tidycal', status: 'connected' }], meetings: [
      { id: 'mt1', provider: 'tidycal', title: 'Intro call', starts_at: new Date(Date.now() + 3600e3).toISOString(), ends_at: new Date(Date.now() + 5400e3).toISOString(), name: 'Marcus Lee', email: 'marcus@x.test', state: 'upcoming' }] };
    if (path === '/send') return { ok: true, send_id: 'x', bucket: 'monthly', due_now: true, delivered: true };
    return { ok: true };
  };
  const { page } = await setup(browser, st);
  await page.setViewportSize({ width: 420, height: 900 });
  await page.goto(ORIGIN + '/kitchen'); await wait(1500);
  const top = await inRoot(page, "return [R.querySelector('#signLogo').src.indexOf('data:image/png')===0, R.querySelector('#signLogo').alt, R.querySelector('#signEnv').naturalWidth>0, R.querySelector('#spBody').hidden, R.querySelector('#spNameS').textContent.length>0]");
  check(top.join() === 'true,Slice of Thanks,true,true,true', 'header has the white logo and envelope; Pizza of the Month starts folded: ' + top);
  await page.screenshot({ path: '../home-top.png' });
  await inRoot(page, "R.querySelector('#spHead').click()"); await wait(200);
  check(await inRoot(page, "return !R.querySelector('#spBody').hidden"), 'tapping Pizza of the Month opens it');
  await inRoot(page, "R.querySelector('#spHead').click()"); await wait(100);
  await inRoot(page, "R.querySelector('#homeHire').click()"); await wait(400);
  const opts = await inRoot(page, "const s=R.querySelector('#hireFor');return [...s.querySelectorAll('optgroup')].map(g=>g.label+': '+[...g.children].map(o=>o.textContent).join(', ')).join(' | ')+' || first: '+s.options[0].textContent+' || last: '+s.options[s.options.length-1].textContent");
  check(opts === 'This week: Marcus Lee · Intro call | People: Ana Ruiz \u00b7 \ud83c\udf31 Vegan, Rebecca Jones · Jones Law || first: Pick someone || last: + Add someone new', 'Who it\'s for lists this week and People, plus add new: ' + opts);
  const lab = await inRoot(page, "return [R.querySelector('label[for=hireTopic]').textContent, R.querySelector('#hireTopic').maxLength, R.querySelector('#hireCount').textContent]");
  check(lab.join('|') === 'What message do you want on the pizza?|16|0 of 16 letters.', 'message field asks for the pizza message with a limit: ' + lab);
  await inRoot(page, "const t=R.querySelector('#hireTopic');t.value='Happy Retirement';t.dispatchEvent(new Event('input',{bubbles:true}))");
  check(await inRoot(page, "return R.querySelector('#hireCount').textContent") === '16 of 16 letters.', 'counter counts the letters');
  await inRoot(page, "R.querySelector('#hireBtn').click()"); await wait(200);
  check((await toastText(page)).indexOf('Pick who the pizza is for') === 0, 'asks to pick someone first');
  await inRoot(page, "const s=R.querySelector('#hireFor');s.value='c:p2';s.dispatchEvent(new Event('change'))"); await wait(100);
  check(await inRoot(page, "return R.querySelector('#hireVegan').checked && R.querySelector('#hireNew').hidden"), 'picking a vegan person from People turns on vegan');
  await inRoot(page, "const s=R.querySelector('#hireFor');s.value='new';s.dispatchEvent(new Event('change'))"); await wait(100);
  check(await inRoot(page, "return !R.querySelector('#hireNew').hidden"), 'Add someone new shows name and email');
  await inRoot(page, "R.querySelector('#hireNewFirst').value='Rebecca';R.querySelector('#hireNewLast').value='Stone';R.querySelector('#hireNewEmail').value='rstone@x.test';R.querySelector('#hireBtn').click()"); await wait(500); await page.screenshot({ path: '../gerald-confetti.png' });
  const made = await inRoot(page, "return [R.querySelector('.panel[data-step=\"4\"]').hidden, R.querySelector('#confettiChips .chip.on, #confettiChips [aria-pressed=true]') ? R.querySelector('#confettiChips .chip.on, #confettiChips [aria-pressed=true]').textContent : '', [...R.querySelectorAll('#confettiChips .chip')].some(c=>c.textContent.indexOf('chef hats')>=0)]");
  check(made[0] === false && made[1].indexOf("Gerald's chef hats") === 0 && made[2], 'Gerald opens the box step with his chef hat confetti picked: ' + made);
  await inRoot(page, "R.querySelector('#next').click()"); await wait(300);
  const to = await inRoot(page, "return [R.querySelector('#toName').value, R.querySelector('#toContact').value]");
  check(to.join() === 'Rebecca Stone,rstone@x.test', 'the new person fills the send step: ' + to);
  await inRoot(page, "R.querySelector('#previewR').click()"); await wait(400);
  const rv = await inRoot(page, "return [R.querySelector('#rReview').textContent, R.querySelector('#rRating').textContent]");
  check(rv[0].indexOf('meeting') < 0, 'a retirement message never talks about a meeting: ' + rv[0]);
  const ex = await inRoot(page, "return [R.querySelector('#rSticker').textContent, R.querySelector('#rScootLogo').textContent]");
  check(ex[0] === 'Happy Retirement', 'Gerald picks the Happy Retirement sticker from the message: ' + ex[0]);
  check(rv[0].indexOf('I made this one myself') === 0 && rv[1].indexOf('5 of 5') > 0, 'Gerald gives his own pizza five slices: ' + rv.join(' / '));
  await page.evaluate(() => { const ov = window.__SOT_ROOT.querySelector('#recipient'); if (ov) ov.hidden = true; });
  await inRoot(page, "R.querySelector('#sendNow').click()"); await wait(900);
  const sb = (st.bodies['/send'] || [])[0] || {};
  check(sb.pizza && sb.pizza.toppings.length >= 40, 'Gerald loads the pizza: ' + (sb.pizza && sb.pizza.toppings.length) + ' toppings');
  check(sb.box && sb.box.confetti === 'gerald' && sb.pizza && sb.pizza.byGerald === true && sb.pizza.bakeLevel === 3 && sb.recipient.email === 'rstone@x.test', 'send carries Gerald confetti, his perfect bake and the new person: ' + JSON.stringify({ c: sb.box && sb.box.confetti, g: sb.pizza && sb.pizza.byGerald, l: sb.pizza && sb.pizza.bakeLevel }));
  // a normal pizza never offers Gerald's confetti
  await inRoot(page, "R.querySelector('#tab-make').click()"); await wait(200);
  await page.evaluate(() => window.__SOT_DEBUG.goSend()); await wait(200);
  await inRoot(page, "R.querySelector('#back').click()"); await wait(200);
  check(await inRoot(page, "return ![...R.querySelectorAll('#confettiChips .chip')].some(c=>c.textContent.indexOf('chef hats')>=0)"), 'pizzas you make yourself do not offer the chef hats');
  check(await inRoot(page, "return [...R.querySelectorAll('#confettiChips .chip')].some(c=>c.textContent==='Pizza envelopes')"), 'Pizza envelopes confetti is offered on every pizza');
  await inRoot(page, "[...R.querySelectorAll('#kindChips .chip')].find(c=>c.textContent.trim()==='Personal').click()"); await wait(100);
  await inRoot(page, "R.querySelector('#next').click()"); await wait(200);
  await inRoot(page, "R.querySelector('#previewR').click()"); await wait(400);
  check(await inRoot(page, "const i=R.querySelector('#rScootLogo img');return !!i&&i.alt==='Slice of Thanks'"), 'a personal pizza rides under the Slice of Thanks logo');
  await page.evaluate(() => { const ov = window.__SOT_ROOT.querySelector('#recipient'); if (ov) ov.hidden = true; });
  await inRoot(page, "R.querySelector('#tab-people').click()"); await wait(300);
  const pe = await inRoot(page, "const v=[...R.querySelectorAll('#peopleList .person')].find(li=>li.textContent.indexOf('Ana Ruiz')>=0);R.querySelector('#addPersonBtn').click();return [!!(v&&v.querySelector('.vegan-tag')), !!R.querySelector('#npFirst'), !!R.querySelector('#npLast')]");
  check(pe.join() === 'true,true,true', 'People shows a vegan tag and Add person asks for first and last name: ' + pe);
  await inRoot(page, "R.querySelector('#tab-today').click()"); await wait(200);
  await page.evaluate(() => { window.__SOT_ROOT.querySelector('#homeHire').scrollIntoView(); }); await page.screenshot({ path: '../hire.png' });
  await browser.close();
  console.log(failures ? failures + ' FAILED' : 'ALL PASSED');
  process.exit(failures ? 1 : 0);
})();
