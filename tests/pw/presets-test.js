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
  for (const plan of ['pro', 'free']) {
    const st = { calls: [], visited: [], bodies: {}, presets: [] };
    const limit = plan === 'pro' ? 10 : 1;
    st.handler = (path, req) => {
      let b = null; try { b = JSON.parse(req.postData() || 'null'); } catch (e) {}
      if (b) (st.bodies[path] = st.bodies[path] || []).push(b);
      if (path === '/session') return session(plan, { monthly: 50 }, {});
      if (path === '/people') return { ok: true, people: [] };
      if (path === '/presets') return { ok: true, limit, presets: st.presets };
      if (path === '/presets/save') {
        if (b.preset.id) { const p = st.presets.find(x => x.id === b.preset.id); p.name = b.preset.name; if (b.preset.data) p.data = b.preset.data; return { ok: true, id: p.id }; }
        if (st.presets.length >= limit) return { ok: false, code: 'preset_limit', limit };
        const p = { id: 'pr' + (st.presets.length + 1), name: b.preset.name, data: b.preset.data }; st.presets.push(p); return { ok: true, id: p.id };
      }
      if (path === '/presets/remove') { st.presets = st.presets.filter(x => x.id !== b.id); return { ok: true }; }
      if (path === '/send') return { ok: true, send_id: 'x', bucket: 'monthly', due_now: true, delivered: true };
      return {};
    };
    const { page } = await setup(browser, st);
    await page.setViewportSize({ width: 400, height: 760 });
    await page.goto(ORIGIN + '/kitchen'); await wait(1200);
    await page.evaluate(() => window.__SOT_DEBUG.goSend()); await wait(200);
    await inRoot(page, "R.querySelector('#back').click()"); await wait(300); // step 4: box
    const onBox = await inRoot(page, "return !R.querySelector('.panel[data-step=\"4\"]').hidden");
    check(onBox, plan + ': on the box step');
    // 1. floating preview
    const pinned = await inRoot(page, "return R.querySelector('#boxFloat').classList.contains('pinned') && R.querySelector('#boxPin').textContent");
    check(pinned === String.fromCharCode(0x2715), plan + ': preview is pinned by default with an X: ' + pinned);
    await inRoot(page, "R.querySelector('#noteText').scrollIntoView({block:'center'})"); await wait(200);
    const vis = await inRoot(page, "const r=R.querySelector('#boxFloat').getBoundingClientRect();return [Math.round(r.top),Math.round(r.bottom)]");
    check(vis[0] >= -2 && vis[0] < 40 && vis[1] < 400, plan + ': preview stays on screen while editing the note: ' + vis);
    await page.screenshot({ path: 'box-float-' + plan + '.png' });
    await inRoot(page, "R.querySelector('#boxPin').click()"); await wait(200);
    const unpinned = await inRoot(page, "const r=R.querySelector('#boxFloat').getBoundingClientRect();return [R.querySelector('#boxPin').textContent, Math.round(r.bottom)]");
    check(unpinned[0] === 'Pin' && unpinned[1] < 0, plan + ': X unpins and the preview scrolls away: ' + unpinned);
    await inRoot(page, "R.querySelector('#boxPin').scrollIntoView(); R.querySelector('#boxPin').click()"); await wait(100);
    // 2. note details
    const chips = await inRoot(page, "return [...R.querySelectorAll('.tokens[data-for=noteText] .chip')].map(b=>b.textContent).join('|')");
    check(chips === '+ First name|+ Last name|+ Role|+ Company', plan + ': note detail buttons: ' + chips);
    await inRoot(page, "const t=R.querySelector('#noteText');t.value='Hi';t.setSelectionRange(2,2);R.querySelectorAll('.tokens[data-for=noteText] .chip')[0].click()");
    const nv = await inRoot(page, "return R.querySelector('#noteText').value");
    check(nv === 'Hi [first name]', plan + ': tapping First name adds the tag: ' + nv);
    await inRoot(page, "const t=R.querySelector('#noteText');t.value='Hi [first name], thanks to the [company] team.';t.dispatchEvent(new Event('input',{bubbles:true}))");
    const bottomBtn = await inRoot(page, "const b=R.querySelector('#presetSave2');const p=R.querySelector('.panel[data-step=\"4\"]');return !!b && !R.querySelector('#presetSaveRow').hidden && p.lastElementChild.id==='presetSaveRow'");
    check(bottomBtn, plan + ': Save as preset button also at the bottom of the box step');
    // 3. presets
    const row = await inRoot(page, "const r=R.querySelector('#presetRow');return r&&!r.hidden&&R.querySelector('#presetSel').disabled");
    check(row === true, plan + ': preset picker shows, empty at first');
    await inRoot(page, "R.querySelector('#presetSave').click()"); await wait(100);
    await inRoot(page, "R.querySelector('#presetName').value='Client thanks'; [...R.querySelectorAll('#liveSheet .btn')].find(b=>b.textContent==='Save').click()"); await wait(400);
    const saved = (st.bodies['/presets/save'] || [])[0];
    check(saved && saved.preset.name === 'Client thanks' && saved.preset.data.note === 'Hi [first name], thanks to the [company] team.', plan + ': Save as preset sends the box choices');
    await inRoot(page, "R.querySelector('#presetSave').click()"); await wait(100);
    if (plan === 'free') {
      const full = await inRoot(page, "return R.querySelector('#liveSheet h2').textContent");
      check(full === 'Your presets are full', plan + ': second preset on A Slice says full: ' + full);
      await inRoot(page, "[...R.querySelectorAll('#liveSheet .btn')].find(b=>b.textContent==='Cancel').click()");
    } else {
      await inRoot(page, "R.querySelector('#presetName').value='Holiday'; [...R.querySelectorAll('#liveSheet .btn')].find(b=>b.textContent==='Save').click()"); await wait(400);
      check(st.presets.length === 2, plan + ': Pro can save a second preset');
    }
    await inRoot(page, "const t=R.querySelector('#noteText');t.value='Changed';t.dispatchEvent(new Event('input',{bubbles:true}))");
    await inRoot(page, "const s=R.querySelector('#presetSel');s.value='pr1';s.dispatchEvent(new Event('change'))"); await wait(200);
    const loaded = await inRoot(page, "return R.querySelector('#noteText').value");
    check(loaded === 'Hi [first name], thanks to the [company] team.', plan + ': loading a preset fills the note back in');
    // send step: company field appears because the note uses [company]
    await inRoot(page, "R.querySelector('#next').click()"); await wait(300);
    const cr = await inRoot(page, "const c=R.querySelector('#liveCoRole');return [c.hidden,c.children[0].hidden,c.children[1].hidden]");
    check(cr.join() === 'false,false,true', plan + ': send step asks for company only: ' + cr);
    await inRoot(page, "const n=R.querySelector('#toName');n.value='Jordan Reyes';n.dispatchEvent(new Event('input',{bubbles:true}));const c=R.querySelector('#toContact');c.value='jordan@b.test';c.dispatchEvent(new Event('input',{bubbles:true}));const k=R.querySelector('#liveCompany');k.value='Brightline';k.dispatchEvent(new Event('input',{bubbles:true}));R.querySelector('#sendNow').click()"); await wait(700);
    const sb = (st.bodies['/send'] || [])[0] || {};
    check(sb.recipient && sb.recipient.company === 'Brightline' && sb.box.note.indexOf('[company]') >= 0, plan + ': send carries company; the server fills the note');
    // settings card
    await inRoot(page, "R.querySelector('#tab-settings').click()"); await wait(400);
    const card = await inRoot(page, "return R.querySelector('#presetCount') && R.querySelector('#presetCount').textContent");
    check(card === st.presets.length + ' of ' + limit + ' used.', plan + ': Settings shows presets used: ' + card);
    await inRoot(page, "[...R.querySelectorAll('#presetList .btn')].find(b=>b.textContent==='Edit').click()"); await wait(400);
    const editing = await inRoot(page, "return [R.querySelector('#makeFor').textContent, R.querySelector('#presetBanner').hidden, R.querySelector('#next').hidden, R.querySelector('#presetRow').hidden]");
    check(editing[0] === 'Editing preset: Client thanks' && editing[1] === false && editing[2] === true && editing[3] === true, plan + ': Edit opens the box step in preset mode: ' + editing);
    await inRoot(page, "const t=R.querySelector('#noteText');t.value='Edited note';t.dispatchEvent(new Event('input',{bubbles:true}));R.querySelector('#presetDone').click()"); await wait(500);
    check(st.presets[0].data.note === 'Edited note', plan + ': Save preset stores the edit');
    check(await inRoot(page, "return !R.querySelector('#view-settings').hidden"), plan + ': back in Settings after saving');
  }
  await browser.close();
  console.log(failures ? failures + ' FAILED' : 'ALL PASSED');
})();
