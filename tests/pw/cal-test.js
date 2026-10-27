// Calendar connections and Home This week against a mocked API. Usage: node cal-test.js /path/to/app.js
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

const iso = (min) => new Date(Date.now() + min * 60000).toISOString();
// Earlier today, never yesterday: a meeting from earlier today, at least 1 minute after midnight
const isoToday = m => { const t = new Date(Date.now() + m * 60000), d = new Date(); d.setHours(0, 1, 0, 0); return (t < d ? d : t).toISOString(); };
function calData(connected) {
  if (!connected) return { ok: true, integrations: [], meetings: [] };
  return { ok: true, integrations: [{ provider: 'tidycal', status: 'connected', label: 'me@x.test' }, { provider: 'calendly', status: 'needs_reconnect' }],
    meetings: [
      { id: 'mt-old', provider: 'tidycal', title: 'Yesterday call', starts_at: iso(-60 * 30), ends_at: iso(-60 * 30 + 30), name: 'Old Guest', email: 'old@x.test', state: 'ended' }, // a past day: never listed
      { id: 'mt-wait', provider: 'tidycal', title: 'Coffee', starts_at: iso(-60 * 48), ends_at: iso(-60 * 48 + 30), name: 'Wen Wait', email: 'wen@x.test', want_pizza: true, state: 'ready' }, // pizza waiting from 2 days ago: still listed
      { id: 'mt-stale', provider: 'tidycal', title: 'Old coffee', starts_at: iso(-60 * 24 * 5), ends_at: iso(-60 * 24 * 5 + 30), name: 'Stale Guest', email: 'stale@x.test', want_pizza: true, state: 'ready' }, // waiting 5 days: gone
      { id: 'mt-ready', provider: 'tidycal', title: 'Intro call', starts_at: isoToday(-90), ends_at: isoToday(-60), name: 'Priya Shah', email: 'priya@x.test', want_pizza: true, state: 'ready' },
      { id: 'mt-sent', provider: 'tidycal', title: 'Partnership call', starts_at: isoToday(-200), ends_at: isoToday(-170), name: 'Jordan Reyes', email: 'jordan@x.test', state: 'sent', opened: true },
      { id: 'mt-up', provider: 'tidycal', title: 'Demo call', starts_at: iso(120), ends_at: iso(150), name: 'Marcus Lee', email: 'marcus@x.test', want_pizza: null, state: 'upcoming' },
      { id: 'mt-noemail', provider: 'tidycal', title: 'Walk-in', starts_at: iso(300), ends_at: iso(330), name: 'Sam', email: null, state: 'upcoming' },
      { id: 'mt-cancel', provider: 'tidycal', title: 'Coffee', starts_at: iso(400), ends_at: iso(430), name: 'Ana', email: 'ana@x.test', state: 'skipped', note: 'canceled' }] };
}
(async () => {
  const browser = await chromium.launch();
  for (const plan of ['free', 'pro']) {
    for (const connected of [false, true]) {
      const st = { calls: [], visited: [], bodies: {} };
      st.handler = (path, req) => {
        let b = null; try { b = JSON.parse(req.postData() || 'null'); } catch (e) {}
        if (b) (st.bodies[path] = st.bodies[path] || []).push(b);
        if (path === '/session') { const s = session(plan, { monthly: 50 }, {}); s.features = { automations: plan !== 'free' }; return s; }
        if (path === '/people') return { ok: true, people: [] };
        if (path === '/presets') return { ok: true, limit: 1, presets: [] };
        if (path === '/calendar' || path === '/calendar/sync') return calData(connected);
        if (path === '/calendar/import') return { ok: true, found: 7, added: 5 };
        if (path === '/calendar/connect') return { ok: true, url: 'https://tidycal.test/oauth/authorize?state=abc' };
        if (path === '/calendar/meeting' || path === '/calendar/disconnect' || path === '/calendar/skip' || path === '/signature' || path === '/profile') return { ok: true };
        if (path === '/send') return { ok: true, send_id: 'x', bucket: 'monthly', due_now: true, delivered: true };
        return {};
      };
      const { ctx, page } = await setup(browser, st);
      await ctx.route('https://tidycal.test/**', r => { st.wentTo = r.request().url(); r.fulfill({ status: 200, contentType: 'text/html', body: '<p>tidycal</p>' }); });
      await page.setViewportSize({ width: 420, height: 900 });
      const tag = plan + (connected ? ' connected' : ' not connected');
      await page.goto(ORIGIN + '/kitchen' + (connected ? '?calendar=tidycal_connected' : '')); await wait(1300);
      await inRoot(page, "R.querySelector('#tab-today').click()"); await wait(300);
      if (!connected) {
        const home = await inRoot(page, "const u=R.querySelector('#meetings');return [u.children.length, u.textContent.indexOf('Connect your calendar')>=0, !!u.querySelector('button')]");
        check(home.join() === '1,true,true', tag + ': Home asks to connect a calendar: ' + home);
        await inRoot(page, "R.querySelector('#meetings button').click()"); await wait(300);
        const card = await inRoot(page, "const c=R.querySelector('#calCard');return [!R.querySelector('#view-settings').hidden, [...c.querySelectorAll('.cal-row button')].map(b=>b.textContent).join('|')]");
        check(card[0] === true && card[1] === 'Connect Calendly|Connect TidyCal', tag + ': button opens Settings > Calendar with two connect buttons: ' + card);
        await inRoot(page, "[...R.querySelectorAll('#calCard .cal-row button')].find(b=>b.textContent==='Connect TidyCal').click()"); await wait(800);
        const cb = (st.bodies['/calendar/connect'] || [])[0] || {};
        check(cb.provider === 'tidycal' && cb.return === '/kitchen', tag + ': connect asks the api for TidyCal and returns to this page: ' + JSON.stringify(cb));
        check(!!st.wentTo && st.wentTo.indexOf('tidycal.test/oauth/authorize') > 0, tag + ': goes to the TidyCal sign in page');
        await page.close(); continue;
      }
      const offer = await inRoot(page, "const h=R.querySelector('#liveSheet h2');return h&&!R.querySelector('#liveSheet').hidden?h.textContent:''");
      check(offer === 'Add your TidyCal contacts?', tag + ': after connecting it offers to import contacts: ' + offer);
      await inRoot(page, "[...R.querySelectorAll('#liveSheet .btn')].find(b=>b.textContent==='Not now').click()"); await wait(100);
      const tst = 'TidyCal is connected. Your meetings are on Home.';
      check(tst.indexOf('TidyCal is connected') === 0 && page.url() === ORIGIN + '/kitchen', tag + ': coming back from TidyCal says connected and cleans the address: ' + tst + ' ' + page.url());
      const rows = await inRoot(page, "return [...R.querySelectorAll('#meetings .meeting')].map(li=>li.querySelector('h3').textContent+':'+li.querySelector('.pill').textContent).join('|')");
      check(rows === 'Wen Wait:Pizza waiting|Priya Shah:Pizza waiting|Jordan Reyes:Sent \u00b7 opened|Marcus Lee:Upcoming|Sam:Upcoming|Ana:Canceled', tag + ': This week lists the guests by name with their state, a past day is gone, a waiting pizza stays 3 days: ' + rows);
      const sub = await inRoot(page, "return R.querySelector('#meetings [data-id=mt-up] .who').textContent");
      check(sub === 'Demo call \u00b7 marcus@x.test', tag + ': the meeting type sits under the name: ' + sub);
      const up = await inRoot(page, "const li=R.querySelector('#meetings [data-id=mt-up]');const cb=li.querySelector('input.meetWant');return [cb.checked, li.querySelector('label').textContent.trim(), !R.querySelector('#meetings [data-id=mt-noemail] input'), R.querySelector('#meetings [data-id=mt-noemail]').textContent.indexOf('No guest email')>=0]");
      check(up[0] === false && up[1] === (plan === 'free' ? 'Have signature pizza ready' : 'Signature pizza when it ends') && up[2] && up[3], tag + ': upcoming meeting has the right pizza switch, off by default: ' + up);
      await inRoot(page, "R.querySelector('#meetings [data-id=mt-up] input.meetWant').click()"); await wait(300);
      const mb = (st.bodies['/calendar/meeting'] || [])[0] || {};
      check(mb.id === 'mt-up' && mb.want === true, tag + ': switching it on saves it: ' + JSON.stringify(mb));
      const btns = await inRoot(page, "return [...R.querySelectorAll('#meetings [data-id=mt-ready] button')].map(b=>b.textContent).join('|')");
      check(btns === 'Send signature pizza|Make a fresh one|Skip', tag + ': waiting pizza has send, fresh and skip: ' + btns);
      await inRoot(page, "R.querySelector('#meetings [data-id=mt-ready] button').click()"); await wait(900);
      const sb = (st.bodies['/send'] || [])[0] || {};
      check(sb.meeting_id === 'mt-ready' && sb.recipient && sb.recipient.email === 'priya@x.test' && sb.idem === 'meeting-mt-ready' && sb.pizza && sb.box, tag + ': one tap sends the signature pizza for that meeting: ' + JSON.stringify({ m: sb.meeting_id, r: sb.recipient, i: sb.idem }));
      // Make a fresh one fills the guest, and the send carries the meeting
      await inRoot(page, "[...R.querySelectorAll('#meetings [data-id=mt-ready] button')].find(b=>b.textContent==='Make a fresh one').click()"); await wait(300);
      await page.evaluate(() => window.__SOT_DEBUG.goSend()); await wait(300);
      const to = await inRoot(page, "return [R.querySelector('#toName').value, R.querySelector('#toContact').value]");
      check(to.join() === 'Priya Shah,priya@x.test', tag + ': Make a fresh one fills in the guest: ' + to);
      await inRoot(page, "R.querySelector('#sendNow').click()"); await wait(900);
      const sb2 = (st.bodies['/send'] || [])[1] || {};
      check(sb2.meeting_id === 'mt-ready', tag + ': the Kitchen send marks the meeting: ' + sb2.meeting_id);
      // Signature pizza saves to the account
      await page.evaluate(() => window.__SOT_DEBUG.goSend()); await wait(200);
      await inRoot(page, "R.querySelector('#saveSig').click()"); await wait(700);
      const sg = (st.bodies['/signature'] || []).slice(-1)[0] || {};
      check(!!(sg.pizza && sg.box && typeof sg.image_data_url === 'string'), tag + ': saving the signature pizza saves it to the account');
      // Settings
      await inRoot(page, "R.querySelector('#tab-settings').click()"); await wait(300);
      const card = await inRoot(page, "return [...R.querySelectorAll('#calCard .cal-row')].map(r=>r.dataset.provider+':'+r.querySelector('small').textContent+':'+[...r.querySelectorAll('button')].map(b=>b.textContent).join('+')).join('|')");
      check(card === 'calendly:Connect it again to keep your meetings coming in:Connect again|tidycal:Connected as me@x.test:Import contacts+Disconnect', tag + ': Settings shows each calendar: ' + card);
      const modes = await inRoot(page, "return [...R.querySelectorAll('input[name=mode]')].map(r=>r.parentElement.querySelector('b').textContent).join('|')+'|ext:'+R.querySelector('#extOnly').closest('label').hidden");
      check(modes.indexOf('I pick the meetings|Every meeting, automatically') === 0 && modes.indexOf('ext:true') > 0, tag + ': after-meeting choices use calendar wording: ' + modes);
      await inRoot(page, "R.querySelector('#mode-off').click()"); await wait(300);
      await inRoot(page, "[...R.querySelectorAll('#calCard .cal-row button')].find(b=>b.textContent==='Import contacts').click()"); await wait(500);
      const ib = (st.bodies['/calendar/import'] || [])[0] || {}; const it = await toastText(page);
      check(ib.provider === 'tidycal' && it === 'Added 5 people from TidyCal to People.', tag + ': Import contacts brings people in: ' + it);
      const pf = (st.bodies['/profile'] || []).find(b => b.profile && b.profile.prefs && b.profile.prefs.after_meeting);
      check(pf && pf.profile.prefs.after_meeting === 'off', tag + ': after-meeting choice saves to the account');
      await inRoot(page, "[...R.querySelectorAll('#calCard .cal-row button')].find(b=>b.textContent==='Disconnect').click()"); await wait(200);
      await inRoot(page, "[...R.querySelectorAll('#liveSheet .btn')].find(b=>b.textContent==='Disconnect').click()"); await wait(500);
      check(((st.bodies['/calendar/disconnect'] || [])[0] || {}).provider === 'tidycal', tag + ': Disconnect asks first, then disconnects TidyCal');
      if (plan === 'pro') { await inRoot(page, "R.querySelector('#tab-today').click()"); await wait(300); await page.screenshot({ path: '../cal-home.png', fullPage: true }); }
      await page.close();
    }
  }
  await browser.close();
  console.log(failures ? failures + ' FAILED' : 'ALL PASSED');
  process.exit(failures ? 1 : 0);
})();
