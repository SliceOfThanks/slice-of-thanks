// Home meetings: this week and next week, Plan a pizza (goes out when the meeting ends), untick to skip, and the tags setting. Usage: node meet-test.js /path/to/app.js
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
const iso = (min) => new Date(Date.now() + min * 60000).toISOString();
const now = new Date(), ws = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
const nextWeek = new Date(ws.getTime() + 8 * 86400000 + 10 * 3600000); // next Monday 10 AM
const MEETINGS = [
  { id: 'm-this', provider: 'tidycal', title: 'Demo call', starts_at: iso(90), ends_at: iso(120), name: 'Ann Lee', email: 'ann@x.test', want_pizza: null, auto_want: true, state: 'upcoming' },
  { id: 'm-next', provider: 'tidycal', title: 'Partner Connect', starts_at: nextWeek.toISOString(), ends_at: new Date(nextWeek.getTime() + 1800000).toISOString(), name: 'Bo Diaz', email: 'bo@x.test', want_pizza: null, auto_want: false, state: 'upcoming' },
  { id: 'm-plan', provider: 'tidycal', title: 'Strategy', starts_at: iso(200), ends_at: iso(230), name: 'Cy Park', email: 'cy@x.test', state: 'sent', send_id: 's1', send_status: 'queued', send_at: iso(230) }].sort((x, y) => x.starts_at < y.starts_at ? -1 : 1);
(async () => {
  const browser = await chromium.launch();
  for (const plan of ['pro', 'free']) {
    const st = { calls: [], visited: [], bodies: {} };
    st.handler = (path, req) => {
      let b = null; try { b = JSON.parse(req.postData() || 'null'); } catch (e) {}
      if (b) (st.bodies[path] = st.bodies[path] || []).push(b);
      if (path === '/session') { const s = session(plan, { monthly: 50 }, {}); s.features = plan === 'pro' ? { automations: true, scheduling: true } : {}; s.prefs = { after_meeting: plan === 'pro' ? 'tags' : 'ask', after_meeting_tags: ['client'] }; return s; }
      if (path === '/people') return { ok: true, people: [{ id: 'p1', name: 'Ann Lee', email: 'ann@x.test', tags: ['client'], history: [] }, { id: 'p2', name: 'Bo Diaz', email: 'bo@x.test', tags: ['vip'], history: [] }] };
      if (path === '/calendar' || path === '/calendar/sync') return { ok: true, integrations: [{ provider: 'tidycal', status: 'connected', label: 'me' }], meetings: MEETINGS };
      if (path === '/send') return { ok: true, send_id: 'x', bucket: 'monthly', due_now: false };
      return { ok: true };
    };
    const { page, ctx } = await setup(browser, st);
    await page.setViewportSize({ width: 402, height: 874 });
    await page.goto(ORIGIN + '/kitchen'); await wait(1600);
    await inRoot(page, "R.querySelector('#tab-today').click()"); await wait(400);
    const order = await inRoot(page, "return [...R.querySelectorAll('#meetings > li')].map(li=>li.classList.contains('week-head')?'HEAD:'+li.querySelector('h3').textContent:li.dataset.id).filter(Boolean).join('|')");
    check(order.indexOf('m-this') >= 0 && order.indexOf('HEAD:Next week') > order.indexOf('m-this') && order.indexOf('m-next') > order.indexOf('HEAD:Next week'), plan + ': this week, then a Next week heading: ' + order);
    const planned = await inRoot(page, "return R.querySelector('#meetings [data-id=m-plan]').textContent");
    check(planned.indexOf('Pizza planned') >= 0 && planned.indexOf('Goes out when it ends') >= 0, plan + ': a planned pizza shows as planned');
    if (plan === 'pro') {
      const t = await inRoot(page, "const x1=R.querySelector('#meetings [data-id=m-this]'),x2=R.querySelector('#meetings [data-id=m-next]');return [x1.querySelector('input.meetWant').checked,x1.textContent.indexOf('Untick to skip')>=0,x2.querySelector('input.meetWant').checked].join(',')");
      check(t === 'true,true,false', 'pro: tagged guest is ticked with an untick hint, untagged is not: ' + t);
      await inRoot(page, "[...R.querySelectorAll('#meetings [data-id=m-this] button')].find(b=>b.textContent==='Plan a pizza now').click()"); await wait(300);
      await page.evaluate(() => window.__SOT_DEBUG.goSend()); await wait(300);
      const s1 = await inRoot(page, "return [R.querySelector('#toName').value, R.querySelector('#sendNow').textContent]");
      check(s1[0] === 'Ann Lee' && s1[1].indexOf('Send when the meeting ends') === 0, 'pro: Plan a pizza fills the guest and the send button says when: ' + s1.join(' / '));
      await inRoot(page, "R.querySelector('#sendNow').click()"); await wait(900);
      const sb = (st.bodies['/send'] || [])[0] || {};
      check(sb.meeting_id === 'm-this' && sb.scheduled_for === MEETINGS[0].ends_at, 'pro: the send is scheduled for the end of the meeting: ' + JSON.stringify({ m: sb.meeting_id, at: sb.scheduled_for }));
      check((await toastText(page)).indexOf('Planned.') === 0, 'pro: toast says planned');
      // Settings: tags mode shows the tags, tapping one saves
      await inRoot(page, "R.querySelector('#tab-settings').click()"); await wait(300);
      const mt = await inRoot(page, "const e=R.querySelector('#modeTags');return [R.querySelector('#mode-tags').checked, e.hidden, [...e.querySelectorAll('.chip')].map(c=>c.textContent+'='+c.getAttribute('aria-pressed')).join('|')].join(' / ')");
      check(mt === 'true / false / client=true|vip=false', 'pro: tags mode is picked with its tags: ' + mt);
      st.bodies['/profile'] = [];
      await inRoot(page, "[...R.querySelectorAll('#modeTags .chip')].find(c=>c.textContent==='vip').click()"); await wait(300);
      const pb = ((st.bodies['/profile'] || []).find(x => x.profile && x.profile.prefs && x.profile.prefs.after_meeting_tags) || {}).profile || {};
      check(JSON.stringify(pb.prefs) === JSON.stringify({ after_meeting: 'tags', after_meeting_tags: ['client', 'vip'] }), 'pro: tapping a tag saves it: ' + JSON.stringify(pb.prefs));
      await inRoot(page, "const r=R.querySelector('#mode-ask');r.checked=true;r.dispatchEvent(new Event('change'))"); await wait(200);
      check(await inRoot(page, "return R.querySelector('#modeTags').hidden"), 'pro: other modes hide the tags');
    } else {
      await inRoot(page, "[...R.querySelectorAll('#meetings [data-id=m-this] button')].find(b=>b.textContent==='Plan a pizza now').click()"); await wait(300);
      check((await inRoot(page, "const o=R.querySelector('#upTitle');return o?o.textContent:''")) === 'Plan pizzas ahead', 'free: Plan a pizza shows the upgrade');
      await inRoot(page, "R.querySelector('#tab-settings').click()"); await wait(300);
      await inRoot(page, "const r=R.querySelector('#mode-tags');r.click()"); await wait(300);
      check(await inRoot(page, "return !R.querySelector('#mode-tags').checked"), 'free: the tags mode needs The Whole Pie');
    }
    await ctx.close();
  }
  await browser.close();
  console.log(failures ? failures + ' FAILED' : 'ALL PASSED');
  process.exit(failures ? 1 : 0);
})();
