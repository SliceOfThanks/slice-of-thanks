// Tags, birthdays, select and send to a group, CSV save to People, preview the first 3. Usage: node group-test.js /path/to/app.js
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

const PEOPLE = [
  { id: 'p1', name: 'Ann Lee', email: 'ann@x.test', company: 'Acme', tags: ['client', 'holiday list'], birthday: '0000-03-14', anniversary: '2019-06-01', has_consent: true, history: [] },
  { id: 'p2', name: 'Bo Diaz', email: 'bo@x.test', company: 'Beta', tags: ['client'], has_consent: false, history: [] },
  { id: 'p3', name: 'Cy Park', email: 'cy@x.test', company: 'Cora', tags: [], has_consent: false, history: [] },
];
(async () => {
  const browser = await chromium.launch();
  const st = { calls: [], visited: [], bodies: {} };
  st.handler = (path, req) => {
    let b = null; try { b = JSON.parse(req.postData() || 'null'); } catch (e) {}
    if (b) (st.bodies[path] = st.bodies[path] || []).push(b);
    if (path === '/session') { const s = session('pro', { monthly: 200 }, {}); s.features = { automations: true, csv_import: true }; return s; }
    if (path === '/people') return { ok: true, people: PEOPLE };
    if (path === '/presets') return { ok: true, limit: 10, presets: [] };
    if (path === '/calendar') return { ok: true, integrations: [], meetings: [] };
    if (path === '/people/import') return { ok: true, added: 1, updated: 1, skipped: 0 };
    if (path === '/send/bulk') return { ok: true, results: (b.rows || []).map(r => ({ i: r.i, ok: true })) };
    return { ok: true };
  };
  const { page } = await setup(browser, st);
  await page.setViewportSize({ width: 420, height: 900 });
  await page.goto(ORIGIN + '/kitchen'); await wait(1500);
  await inRoot(page, "R.querySelector('#tab-people').click()"); await wait(400);
  // Tags show on people and as filters
  const chips = await inRoot(page, "return [...R.querySelectorAll('#tagFilter .chip')].map(c=>c.textContent.trim())");
  check(chips.join('|') === 'Everyone|client (2)|holiday list (1)', 'Tag filters: ' + chips.join('|'));
  const annLine = await inRoot(page, "return R.querySelector('#peopleList .person').innerText");
  check(annLine.indexOf('client') >= 0 && annLine.indexOf('Birthday Mar 14') >= 0 && annLine.indexOf('Work anniversary Jun 1, 2019') >= 0, 'Person shows tags and dates');
  await inRoot(page, "[...R.querySelectorAll('#tagFilter .chip')].find(c=>c.textContent.indexOf('client')===0).click()"); await wait(200);
  const shown = await inRoot(page, "return [...R.querySelectorAll('#peopleList .person h3')].map(h=>h.textContent).join('|')");
  const st1 = await inRoot(page, "const b=R.querySelector('#sendTagged');return b.hidden?'':b.textContent");
  check(shown === 'Ann Lee|Bo Diaz' && st1 === 'Send to everyone tagged client (2)', 'Filter by tag and send to everyone tagged: ' + shown + ' / ' + st1);
  // Send to everyone tagged client: the group screen gets them
  await inRoot(page, "R.querySelector('#sendTagged').click()"); await wait(400);
  const g = await inRoot(page, "return [!R.querySelector('#view-bulk').hidden, R.querySelector('#listFrom').textContent, R.querySelector('#listSummary').textContent, R.querySelector('#saveListRow').hidden]");
  check(g[0] && g[1].indexOf('everyone tagged client') >= 0 && g[2] === '2 people loaded. 2 getting a pizza.' && g[3], 'Group screen loads the tagged people: ' + g.slice(1, 3).join(' / '));
  // Leave one out with the checkbox
  await inRoot(page, "R.querySelectorAll('#listTable input[type=checkbox]')[1].click()"); await wait(150);
  check((await inRoot(page, "return R.querySelector('#listSummary').textContent")) === '2 people loaded. 1 getting a pizza, 1 left out.', 'A checkbox leaves someone out');
  await inRoot(page, "R.querySelectorAll('#listTable input[type=checkbox]')[1].click()"); await wait(150);
  // Gerald options
  const vibes = await inRoot(page, "return [...R.querySelectorAll('#bulkVibe .chip')].map(c=>c.textContent.trim())");
  check(vibes[0] === 'Mix it up' && vibes.includes('Big Win') && vibes.includes('Birthday Bash'), 'Vibes: Mix it up plus Reserve vibes');
  await inRoot(page, "[...R.querySelectorAll('#bulkMsg .chip')].find(c=>c.textContent==='Same for everyone').click()"); await wait(100);
  await inRoot(page, "const t=R.querySelector('#bulkMsgText');t.value='HAPPY HOLIDAYS';t.dispatchEvent(new Event('input'));t.dispatchEvent(new Event('change'))"); await wait(150);
  // Preview the first 3 (two here), then send: each person gets the pizza from the preview, with its own picture
  await inRoot(page, "R.querySelector('#bulkPreview').click()"); await wait(400);
  const pv = await inRoot(page, "const s=R.querySelector('#prev3Sheet');return [s&&!s.hidden, s.querySelectorAll('canvas').length, s.querySelector('h2').textContent, [...s.querySelectorAll('.prev3 b')].map(b=>b.textContent).join('|'), s.querySelector('.prev3 small').textContent]");
  check(pv[0] && pv[1] === 2 && pv[2] === 'The first 2 pizzas' && pv[4] === '"HAPPY HOLIDAYS" in pepperoni', 'Preview shows the first pizzas: ' + pv.slice(2).join(' / '));
  await page.screenshot({ path: '../group-preview.png' });
  const names = pv[3];
  await inRoot(page, "R.querySelector('#prev3Close').click()"); await wait(100);
  await inRoot(page, "R.querySelector('#bulkSend').click()"); for (let t = 0; t < 40 && await inRoot(page, "return R.querySelector('#bulkResult').hidden"); t++) await wait(250);
  const sent = (st.bodies['/send/bulk'] || [])[0] || { rows: [] };
  check(sent.rows.length === 2 && sent.rows.every(r => (r.image_data_url || '').indexOf('data:image') === 0), 'Each Gerald pizza goes with its own picture');
  check(sent.rows.every(r => r.pizza.sign && r.pizza.sign.text === 'HAPPY HOLIDAYS') && names.indexOf(sent.rows[0].pizza.name) >= 0, 'Sent pizzas match the preview: ' + sent.rows.map(r => r.pizza.name).join('|'));
  check(sent.rows[0].consent === undefined && sent.rows[1].consent && sent.rows[1].consent.method === 'Picked in People for a group send', 'Permission on file is kept; others use the choice on the screen');
  // Tapping a tag on a card filters to that tag; tapping it again clears the filter
  await inRoot(page, "[...R.querySelectorAll('#tagFilter .chip')].find(c=>c.textContent==='Everyone').click()"); await wait(100);
  await inRoot(page, "[...R.querySelectorAll('#peopleList .p-tag')].find(b=>b.textContent==='holiday list').click()"); await wait(200);
  const f1 = await inRoot(page, "return [[...R.querySelectorAll('#peopleList .person h3')].map(h=>h.textContent).join('|'), R.querySelector('#tagFilter .chip[aria-pressed=true]').textContent]");
  check(f1[0] === 'Ann Lee' && f1[1].indexOf('holiday list') === 0, 'Tapping a tag on a card filters: ' + f1.join(' / '));
  await inRoot(page, "[...R.querySelectorAll('#peopleList .p-tag')].find(b=>b.textContent==='holiday list').click()"); await wait(200);
  check((await inRoot(page, "return R.querySelectorAll('#peopleList .person').length")) === 3, 'Tapping it again shows everyone');
  // Quick tags right on a card: add an existing tag, add a new one, remove one
  await inRoot(page, "[...R.querySelectorAll('#tagFilter .chip')].find(c=>c.textContent==='Everyone').click()"); await wait(100);
  const cy = "[...R.querySelectorAll('#peopleList .person')].find(li=>li.querySelector('h3').textContent==='Cy Park')";
  await inRoot(page, "(" + cy + ").querySelector('[data-act=tag]').click()"); await wait(150);
  const qt = await inRoot(page, "const li=" + cy + ";return [...li.querySelectorAll('.quick-tags .chip')].map(c=>c.textContent+':'+c.getAttribute('aria-pressed')).join('|')");
  check(qt === 'client:false|holiday list:false', 'Quick tags list the existing tags: ' + qt);
  await inRoot(page, "[...(" + cy + ").querySelectorAll('.quick-tags .chip')].find(c=>c.textContent==='client').click()"); await wait(150);
  await inRoot(page, "const i=R.querySelector('#qtNew');i.value='golf buddies';i.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter'}))"); await wait(150);
  await inRoot(page, "[...(" + cy + ").querySelectorAll('.quick-tags .chip')].find(c=>c.textContent==='client').click()"); await wait(150);
  const qs = (st.bodies['/people/save'] || []).map(x => x.person).filter(p => p.id === 'p3').map(p => (p.tags || []).join(','));
  check(qs.join('|') === 'client|client,golf buddies|golf buddies', 'Tap to add, type to add new, tap to remove: ' + qs.join('|'));
  await inRoot(page, "(" + cy + ").querySelector('[data-act=tag]').click()"); await wait(100);
  st.bodies['/people/save'] = [];
  // Select mode and tagging
  await inRoot(page, "R.querySelector('#bulkBack').click()"); await wait(200);
  await inRoot(page, "[...R.querySelectorAll('#tagFilter .chip')].find(c=>c.textContent==='Everyone').click()"); await wait(100);
  await inRoot(page, "R.querySelector('#selectMode').click()"); await wait(150);
  await inRoot(page, "R.querySelector('#selectAll').click()"); await wait(150);
  check((await inRoot(page, "return R.querySelector('#selCount').textContent")) === '3 selected' && await inRoot(page, "return !R.querySelector('#selBar').hidden"), 'Select all shown picks everyone');
  await inRoot(page, "R.querySelectorAll('#peopleList .person')[2].click()"); await wait(100);
  check((await inRoot(page, "return R.querySelector('#selCount').textContent")) === '2 selected', 'Tapping a person unpicks them');
  await inRoot(page, "R.querySelector('#selTag').click()"); await wait(200);
  await inRoot(page, "R.querySelector('#selTagIn').value='VIP';[...R.querySelectorAll('#liveSheet .btn')].find(b=>b.textContent==='Add tag').click()"); await wait(400);
  const tg = (st.bodies['/people/import'] || [])[0] || { people: [] };
  check(tg.people.length === 2 && tg.people.every(p => p.tags[0] === 'VIP'), 'Add a tag to everyone picked');
  await inRoot(page, "R.querySelector('#selDone').click()"); await wait(100);
  // Edit tags and birthday on one person
  await inRoot(page, "[...R.querySelectorAll('#peopleList .person')].find(li=>li.querySelector('h3').textContent==='Cy Park').querySelector('[data-act=toggle]').click()"); await wait(200);
  await inRoot(page, "const t=R.querySelector('#pTags');t.value='friend, golf';t.dispatchEvent(new Event('change'))"); await wait(200);
  await inRoot(page, "const s=R.querySelectorAll('#pBday select');s[0].value='7';s[1].value='4';s[0].dispatchEvent(new Event('change',{bubbles:true}))"); await wait(200);
  const saves = (st.bodies['/people/save'] || []).map(x => x.person);
  check(saves.some(p => p.id === 'p3' && JSON.stringify(p.tags) === '["friend","golf"]') && saves.some(p => p.id === 'p3' && p.birthday === '0000-07-04'), 'Tags and birthday save for one person: ' + JSON.stringify(saves));
  // CSV with the new columns, then save to People
  const csv = ['First,Last,Email,Company,Role,Country,Consent,Vegan,Birthday,Anniversary,Tags,Message',
    'Dee,Ray,dee@x.test,Delta,CEO,US,yes,no,03/14/1985,6/1,"client, gala",WELCOME DEE', 'Eli,Fox,eli@x.test,Echo,,US,,no,March 3,,gala,'].join('\n');
  await inRoot(page, "R.querySelector('#openBulk').click()"); await wait(300);
  await page.evaluate(([c]) => { const R = window.__SOT_ROOT; const inp = R.querySelector('#csvFile'); const dt = new DataTransfer(); dt.items.add(new File([c], 'l.csv', { type: 'text/csv' })); inp.files = dt.files; inp.dispatchEvent(new Event('change')); }, [csv]); await wait(500);
  check(await inRoot(page, "return !R.querySelector('#saveListRow').hidden && R.querySelector('#listFrom').hidden"), 'A CSV list offers Save these people to People');
  await inRoot(page, "R.querySelector('#saveList').click()"); await wait(400);
  const imp = (st.bodies['/people/import'] || [])[1] || { people: [] };
  const dee = imp.people[0] || {}, eli = imp.people[1] || {};
  check(dee.birthday === '1985-03-14' && dee.anniversary === '0000-06-01' && JSON.stringify(dee.tags) === '["client","gala"]' && dee.basis === 'permission' && eli.birthday === '0000-03-03', 'CSV dates, tags and consent go to People: ' + JSON.stringify(imp.people));
  await inRoot(page, "[...R.querySelectorAll('#bulkMsg .chip')].find(c=>c.textContent==='The Message column').click()"); await wait(150);
  const help = await inRoot(page, "return R.querySelector('#bulkMsgHelp').textContent");
  check(help.indexOf('1 without one get their first name') >= 0, 'Message column help counts rows without one: ' + help);
  await browser.close();
  console.log(failures ? failures + ' FAILED' : 'ALL PASSED');
  process.exit(failures ? 1 : 0);
})();
