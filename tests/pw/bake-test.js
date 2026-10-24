// Bake levels and personal pizzas against a mocked API. Usage: node bake-test.js /path/to/app.js
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
  for (const plan of ['pro', 'free']) {
    const st = { calls: [], visited: [], bodies: {} };
    st.handler = (path, req) => {
      let b = null; try { b = JSON.parse(req.postData() || 'null'); } catch (e) {}
      if (b) (st.bodies[path] = st.bodies[path] || []).push(b);
      if (path === '/session') return session(plan, { monthly: 50 }, {});
      if (path === '/people') return { ok: true, people: [] };
      if (path === '/presets') return { ok: true, limit: 1, presets: [] };
      if (path === '/photo') return { ok: true, photo_url: 'https://media.test/photo.jpg' };
      if (path === '/send') return { ok: true, send_id: 'x', bucket: 'monthly', due_now: true, delivered: true };
      return {};
    };
    const { page } = await setup(browser, st);
    await page.setViewportSize({ width: 420, height: 900 });
    await page.clock.install();
    await page.goto(ORIGIN + '/kitchen'); await wait(1200);
    await page.evaluate(() => window.__SOT_DEBUG.goSend()); await wait(200);
    await inRoot(page, "R.querySelector('#back').click()"); await wait(100);
    await inRoot(page, "R.querySelector('#back').click()"); await wait(200);
    const chips = await inRoot(page, "return [...R.querySelectorAll('#bakeChips .chip')].map(c=>c.textContent.trim()).join('|')");
    check(chips === '10 sec|1 min|3 min|5 min', plan + ': bake times: ' + chips);
    const bake = async (label, ms) => {
      await inRoot(page, "[...R.querySelectorAll('#bakeChips .chip')].find(c=>c.textContent.trim()===a).click();R.querySelector('#bakeStart').click()", label);
      await page.clock.fastForward(ms); await page.clock.runFor(300); await wait(150);
      return inRoot(page, "const d=R.querySelector('#bakeDone');return d.hidden?'(hidden)':d.textContent");
    };
    let t = await bake('10 sec', 10500); check(t.indexOf('Quick bake') === 0, plan + ': 10 sec is a quick bake: ' + t);
    if (plan === 'pro') await page.locator('#stage canvas').first().screenshot({ path: '../bake-0.png' }).catch(() => {});
    t = await bake('1 min', 61000); check(t.indexOf('Golden and bubbly') === 0, plan + ': 1 min is golden and bubbly: ' + t);
    t = await bake('3 min', 181000); check(t.indexOf('Stone-fired') === 0, plan + ': 3 min is stone-fired: ' + t);
    if (plan === 'pro') await page.locator('#stage canvas').first().screenshot({ path: '../bake-2.png' }).catch(() => {});
    // taken out early from a 5 min bake at 70 seconds counts as 1 min
    await inRoot(page, "[...R.querySelectorAll('#bakeChips .chip')].find(c=>c.textContent.trim()==='5 min').click();R.querySelector('#bakeStart').click()");
    await page.clock.fastForward(70000); await page.clock.runFor(100); await inRoot(page, "R.querySelector('#bakeEarly').click()"); await wait(100);
    t = await inRoot(page, "return R.querySelector('#bakeDone').textContent"); check(t.indexOf('Golden and bubbly') === 0, plan + ': early out at 70 seconds counts as 1 min: ' + t);
    t = await bake('5 min', 301000); check(t.indexOf("Gerald's perfect bake") === 0, plan + ': 5 min is the perfect bake: ' + t);
    await page.clock.runFor(1500); await wait(100);
    const toast = await toastText(page); check(toast.indexOf("Gerald's perfect bake") >= 0, plan + ': perfect bake finds a Treat Jar egg: ' + toast);
    if (plan === 'pro') await page.locator('#stage canvas').first().screenshot({ path: '../bake-3.png' }).catch(() => {});
    // box step: personal
    await inRoot(page, "R.querySelector('#next').click()"); await wait(200);
    const kinds = await inRoot(page, "return [...R.querySelectorAll('#kindChips .chip')].map(c=>c.textContent.trim()+(c.classList.contains('on')||c.getAttribute('aria-pressed')==='true'?'*':'')).join('|')");
    check(kinds.replace('*', '') === 'Business|Personal', plan + ': kind switch shows: ' + kinds);
    const bizShown = await inRoot(page, "return [R.querySelector('#bizName').closest('.field').hidden, R.querySelector('#photoFile').closest('.field').hidden]");
    check(bizShown.join() === 'false,true', plan + ': business starts on, photo hidden: ' + bizShown);
    await inRoot(page, "[...R.querySelectorAll('#kindChips .chip')].find(c=>c.textContent.trim()==='Personal').click()"); await wait(150);
    const pers = await inRoot(page, "const h=s=>R.querySelector(s).closest('[data-biz],[data-personal]').hidden;return [h('#bizName'),h('#logoFile'),h('#linkLabel'),h('#rwText'),h('#photoFile'),R.querySelector('#lidBiz').textContent]");
    check(pers.slice(0, 5).join() === 'true,true,true,true,false', plan + ': personal hides logo, business name, button and gift and shows photo: ' + pers);
    check(pers[5] === 'Test Member', plan + ': lid shows the member name: ' + pers[5]);
    await inRoot(page, "const t=R.querySelector('#lidText');t.value='Happy Retirement, Rebecca!';t.dispatchEvent(new Event('input',{bubbles:true}));const s=R.querySelector('#stickerSel');s.value='Happy Retirement';s.dispatchEvent(new Event('change',{bubbles:true}))"); await wait(150);
    const lid2 = await inRoot(page, "return R.querySelector('#lidBiz').textContent");
    check(lid2 === 'Happy Retirement, Rebecca!', plan + ': Message on the lid replaces the name: ' + lid2);
    const img = await page.screenshot({ clip: { x: 0, y: 0, width: 200, height: 160 } });
    if (plan === 'pro') {
      await page.locator('#photoFile').setInputFiles({ name: 'me.png', mimeType: 'image/png', buffer: img }); await wait(600);
      const lid = await inRoot(page, "const l=R.querySelector('#lidLogo');return [l.classList.contains('photo'), !!l.querySelector('img'), !!R.querySelector('#photoThumb img')]");
      check(lid.join() === 'true,true,true', 'pro: photo shows round on the lid and in the thumb: ' + lid);
      await inRoot(page, "R.querySelector('#lidPreview').scrollIntoView({block:'center'})"); await page.screenshot({ path: '../personal-box.png' });
    } else {
      await inRoot(page, "R.querySelector('#photoFile').click()"); await wait(200);
      const up = await inRoot(page, "const s=R.querySelector('#liveSheet')||R.querySelector('#upgrade');return !!document.querySelector('*') && (R.textContent.indexOf('The Whole Pie')>=0)");
      check(up, 'free: tapping Upload photo offers the upgrade');
      await inRoot(page, "const c=R.querySelector('.ov:not([hidden]) .close, #upgradeClose');c&&c.click()");
    }
    // send step and preview
    await inRoot(page, "R.querySelector('#next').click()"); await wait(200);
    await inRoot(page, "const n=R.querySelector('#toName');n.value='Jordan Reyes';n.dispatchEvent(new Event('input',{bubbles:true}));const c=R.querySelector('#toContact');c.value='jordan@b.test';c.dispatchEvent(new Event('input',{bubbles:true}))");
    const fn = await inRoot(page, "const f=R.querySelector('#fromName');const v=f.value;f.value='Stacey Lake';f.dispatchEvent(new Event('input',{bubbles:true}));const m=R.querySelector('#msgSubj').textContent+' '+R.querySelector('#msgBody').textContent;f.value=v;f.dispatchEvent(new Event('input',{bubbles:true}));return [v, !f.closest('.field').hidden, m.indexOf('Stacey Lake')>=0]");
    const subj = await inRoot(page, "return [R.querySelector('#msgSubj').textContent, R.querySelector('#msgBody').textContent]");
    check(subj[0] === 'A special pizza delivery for you from Test Member' && subj[1].indexOf('meeting') < 0 && subj[1].indexOf('Happy Retirement') > 0, plan + ': retirement pizza email preview uses the special delivery subject and no meeting talk: ' + subj.join(' / '));
    check(fn.join() === 'Test Member,true,true', plan + ': From field on the send step shows and changes the name in the email: ' + fn);
    const before = (st.bodies['/profile'] || []).length;
    await inRoot(page, "const f=R.querySelector('#fromName');f.value='Kevin & Stacey';f.dispatchEvent(new Event('input',{bubbles:true}))");
    await page.evaluate(() => dispatchEvent(new Event('pagehide'))); await wait(150);
    const pb = (st.bodies['/profile'] || []).slice(before).find(b => b.profile && b.profile.display_name === 'Kevin & Stacey');
    check(!!pb, plan + ': a name typed just before the page closes is saved right away');
    await inRoot(page, "const f=R.querySelector('#fromName');f.value='Test Member';f.dispatchEvent(new Event('input',{bubbles:true}))");
    await inRoot(page, "R.querySelector('#previewR').click()"); await wait(300);
    if (plan === 'pro') await page.screenshot({ path: '../personal-preview.png' });
    const pv = await inRoot(page, "return [R.querySelector('#rFrom').textContent, R.querySelector('#rReview').textContent, R.querySelector('#rRating').textContent, R.querySelector('#rLink').hidden]");
    check(pv[0] === 'Test Member sent you a pizza', plan + ': preview leaves the business off: ' + pv[0]);
    check(pv[1].indexOf('Five full minutes') === 0 && pv[2].indexOf('5 of 5') > 0, plan + ': Gerald gives the perfect bake 5 slices: ' + pv[1] + ' / ' + pv[2]);
    check(pv[3] === true, plan + ': no business button on a personal pizza');
    check(pv[1].indexOf('feeling very special') > 0, plan + ': Gerald skips meeting talk on a personal pizza');
    await inRoot(page, "R.querySelector('#closeR')?R.querySelector('#closeR').click():0"); await wait(100);
    await page.evaluate(() => { const r = window.__SOT_ROOT; const ov = r.querySelector('#recipient'); if (ov) ov.hidden = true; });
    await inRoot(page, "R.querySelector('#sendNow').click()"); await wait(800);
    const sb = (st.bodies['/send'] || [])[0] || {};
    const bx = sb.box || {};
    check(bx.personal === true && !bx.logo_url && !bx.cta_url && !bx.gift, plan + ': send is marked personal with no business parts: ' + JSON.stringify(bx).slice(0, 160));
    check(plan === 'pro' ? bx.photo_url === 'https://media.test/photo.jpg' && (st.bodies['/photo'] || []).length === 1 : !bx.photo_url && !(st.bodies['/photo'] || []).length, plan + ': photo uploaded and sent only on Pro: ' + bx.photo_url);
    check(bx.lid_text === 'Happy Retirement, Rebecca!', plan + ': the lid message is sent: ' + bx.lid_text);
    check(sb.pizza && sb.pizza.bakeLevel === 3, plan + ': bake level travels with the pizza: ' + (sb.pizza && sb.pizza.bakeLevel));
    await page.close();
  }
  await browser.close();
  console.log(failures ? failures + ' FAILED' : 'ALL PASSED');
  process.exit(failures ? 1 : 0);
})();
