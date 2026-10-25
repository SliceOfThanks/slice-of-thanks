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


const PEOPLE = [{ id: 'p1', name: 'Jordan Reyes', email: 'jordan@brightline.test', company: 'Brightline', country: 'US', vegan: false, notes: 'Met at expo', has_consent: true,
  history: [{ id: 's1', at: '2026-10-20T10:00:00Z', status: 'sent', opened: true, label: 'After intro call', pizza: { name: 'The Intro Classic', size: .58, seed: 2, toppings: [], sauceDabs: [], cheeseDabs: [], tosses: 1, baked: true, bake: 1 }, box: { note: 'Hi' } }] },
  { id: 'p2', name: 'Priya Shah', email: 'priya@shah.test', company: '', country: '', vegan: true, notes: '', has_consent: false, history: [] }];
(async () => {
  const browser = await chromium.launch();
  {
    const st = { calls: [], visited: [], bodies: {} };
    st.handler = (path, req) => {
      let b = null; try { b = JSON.parse(req.postData() || 'null'); } catch (e) {}
      if (b) (st.bodies[path] = st.bodies[path] || []).push(b);
      if (path === '/session') return session('pro', { monthly: 50 }, {});
      if (path === '/people') return { ok: true, people: PEOPLE };
      if (path === '/people/save') return { ok: true, id: b.person.id || 'p3' };
      if (path === '/send') return { ok: true, send_id: 'x', bucket: 'monthly', due_now: true, delivered: true };
      if (path === '/send/bulk') return { ok: true, results: b.rows.map(r => r.recipient.email.indexOf('bad') >= 0 ? { i: r.i, ok: false, code: 'needs_permission' } : { i: r.i, ok: true }) };
      return {};
    };
    const { page } = await setup(browser, st);
    await page.goto(ORIGIN + '/kitchen'); await wait(1200);
    await inRoot(page, "R.querySelector('#tab-people').click()"); await wait(300);
    const names = await inRoot(page, "return [...R.querySelectorAll('#peopleList .person h3')].map(h=>h.textContent)");
    check(names.join('|') === 'Jordan Reyes|Priya Shah', 'People come from the server, no sample people: ' + names.join('|'));
    const pill = await inRoot(page, "return R.querySelector('#peopleList .person .pill').textContent");
    check(pill === 'Opened', 'Opened status shows: ' + pill);
    // Priya has no permission on file: country and permission fields appear, and the send carries them
    await inRoot(page, "R.querySelectorAll('#peopleList .person [data-act=send]')[1].click()"); await wait(200);
    const hasBasis = await inRoot(page, "return !!R.querySelector('#qsBasis') && !!R.querySelector('#qsCountry')");
    check(hasBasis, 'Person without permission gets country and How you know them');
    await inRoot(page, "R.querySelector('#qsBasis').value='relationship'; R.querySelector('#qsCountry').value='CA'; R.querySelector('#qsSend').click()"); await wait(600);
    const sb = (st.bodies['/send'] || [])[0] || {};
    check(sb.recipient && sb.recipient.email === 'priya@shah.test' && sb.recipient.country === 'CA' && sb.consent && sb.consent.basis === 'relationship' && sb.source === 'people', 'People send goes to /send with email, country and permission');
    check(!!sb.pizza && Array.isArray(sb.pizza.toppings) && !!sb.box && typeof sb.box.note === 'string', 'People send carries the pizza and box');
    const t = await toastText(page);
    check(t.indexOf('Potato is on her way to Priya') === 0, 'Toast confirms a real send: ' + t);
    check(st.calls.filter(c => c === '/people').length >= 2, 'People list reloads after the send');
    // Jordan has permission: no extra fields
    await inRoot(page, "R.querySelectorAll('#peopleList .person [data-act=send]')[0].click()"); await wait(200);
    check(!(await inRoot(page, "return !!R.querySelector('#qsBasis')")), 'Person with permission on file is not asked again');
    // Add a person
    await inRoot(page, "R.querySelector('#addPersonBtn').click(); const f=R.querySelector('#npFirst');f.value='Sam';f.dispatchEvent(new Event('input'));const l=R.querySelector('#npLast');l.value='Lee';l.dispatchEvent(new Event('input')); R.querySelector('#npContact').value='sam@lee.test'; R.querySelector('#npCompany').value='Lee Co'; R.querySelector('#savePerson').click()"); await wait(500);
    const sv = (st.bodies['/people/save'] || []).find(x => x.person && x.person.name === 'Sam Lee');
    check(!!sv && sv.person.email === 'sam@lee.test' && sv.person.company === 'Lee Co', 'Add person saves to the server');
    // CSV list
    await inRoot(page, "R.querySelector('#openBulk').click()"); await wait(300);
    check(!(await inRoot(page, "return !R.querySelector('#view-bulk').hidden")) === false, 'Upload a CSV opens the list page for Pro');
    check(await inRoot(page, "return R.querySelector('#sampleCsv').hidden"), 'Sample list button is hidden in the live app');
    const proto = await inRoot(page, "return R.querySelector('#view-bulk').textContent.indexOf('Prototype')");
    check(proto < 0, 'No Prototype wording on the list page');
    const rows = ['Name,Email,Company,Country,Permission,Vegan'];
    for (let i = 0; i < 60; i++) rows.push('Person ' + i + ',p' + i + '@list.test,Co ' + i + ',' + (i === 3 ? 'GB' : '') + ',' + (i === 4 ? 'permission' : '') + ',' + (i === 5 ? 'yes' : 'no'));
    rows.push('No Email,,Nope,,,no'); rows.push('Bad Perm,bad@list.test,X,DE,,no'); rows[7] = 'Person 6,p6@list.test,Co 6,,yes,no';
    await inRoot(page, "loadList(a)", rows.join('\n')).catch(async () => { await page.evaluate(t => window.__SOT_DEBUG && 0, 0); });
    // loadList is inside the app scope: use the file input instead
    await page.evaluate(([csv]) => { const R = window.__SOT_ROOT; const inp = R.querySelector('#csvFile'); const dt = new DataTransfer(); dt.items.add(new File([csv], 'list.csv', { type: 'text/csv' })); inp.files = dt.files; inp.dispatchEvent(new Event('change')); }, [rows.join('\n')]);
    await wait(500);
    const summary = await inRoot(page, "return R.querySelector('#listSummary').textContent");
    check(summary === '62 people loaded. 61 getting a pizza, 1 missing an email or still sample rows.', 'List loads and needs an email: ' + summary);
    await inRoot(page, "R.querySelector('#bulkSend').click()"); for (let t = 0; t < 60 && await inRoot(page, "return R.querySelector('#bulkResult').hidden || R.querySelector('#bulkSend').disabled"); t++) await wait(500);
    const batches = st.bodies['/send/bulk'] || [];
    check(batches.length === 7 && batches[0].rows.length === 10 && batches[6].rows.length === 1 && batches.every(b => b.rows.every(r => (r.image_data_url || '').indexOf('data:image') === 0)), 'Gerald pizzas go up 10 at a time, each with its own picture: ' + batches.map(b => b.rows.length).join(','));
    const all = batches.flatMap(b => b.rows);
    const r3 = all.find(r => r.recipient.email === 'p3@list.test'), r4 = all.find(r => r.recipient.email === 'p4@list.test'), r0 = all.find(r => r.recipient.email === 'p0@list.test'), r5 = all.find(r => r.recipient.email === 'p5@list.test');
    check(r3.recipient.country === 'GB' && r0.recipient.country === 'US', 'Country column wins, default fills the rest');
    check(r4.consent.basis === 'permission' && r0.consent.basis === 'relationship', 'Permission column wins, default fills the rest');
    check(r5.recipient.vegan === true && r0.recipient.company === 'Co 0', 'Vegan and company carried');
    check(batches[0].batch && batches[0].batch === batches[1].batch && batches[0].scheduled_for === null, 'Same batch id, sent now');
    const res = await inRoot(page, "return R.querySelector('#bulkResult').textContent");
    check(res.indexOf('Sent 60 pizzas') === 0 && res.indexOf('1 need a different permission') > 0, 'Result counts sent and skipped: ' + res);
    const r6 = all.find(r => r.recipient.email === 'p6@list.test');
    check(r6.consent.basis === 'permission', 'Consent yes counts as permission');
    // Sample CSV download: every column, and its example rows never send
    const [dl] = await Promise.all([page.waitForEvent('download'), inRoot(page, "R.querySelector('#copyHeader').click()")]);
    const sample = require('fs').readFileSync(await dl.path(), 'utf8');
    check(dl.suggestedFilename() === 'slice-of-thanks-list.csv' && sample.indexOf('First,Last,Email,Company,Role,Country,Consent,Vegan,Birthday,Anniversary,Tags,Message') === 0, 'Sample CSV downloads with every column');
    await page.evaluate(([csv]) => { const R = window.__SOT_ROOT; const inp = R.querySelector('#csvFile'); const dt = new DataTransfer(); dt.items.add(new File([csv], 'list.csv', { type: 'text/csv' })); inp.files = dt.files; inp.dispatchEvent(new Event('change')); }, [sample]);
    await wait(400);
    const s2 = await inRoot(page, "return R.querySelector('#listSummary').textContent");
    check(s2 === '2 people loaded. 0 getting a pizza, 2 missing an email or still sample rows.', 'Unchanged sample rows are not sent: ' + s2);
    await inRoot(page, "R.querySelector('#bulkBack').click()"); await wait(200);
    const ppl = await inRoot(page, "return R.querySelectorAll('#peopleList .person').length");
    await inRoot(page, "R.querySelector('#openBulk').click()"); await wait(200);
    check(ppl === 2, 'Uploading a list does not add people to People before sending: ' + ppl);
    await page.evaluate(([csv]) => { const R = window.__SOT_ROOT; const inp = R.querySelector('#csvFile'); const dt = new DataTransfer(); dt.items.add(new File([csv], 'list.csv', { type: 'text/csv' })); inp.files = dt.files; inp.dispatchEvent(new Event('change')); }, [rows.join('\n')]);
    await wait(400);
    // Scheduled
    await inRoot(page, "[...R.querySelectorAll('#bulkWhen .chip, #bulkWhen button')].find(b=>b.textContent==='Schedule it').click()"); await wait(200);
    const dtype = await inRoot(page, "return R.querySelector('#bulkDate').type");
    check(dtype === 'datetime-local', 'Schedule uses a date and time picker');
    await inRoot(page, "R.querySelector('#bulkSend').click()"); for (let t = 0; t < 60 && await inRoot(page, "return R.querySelector('#bulkResult').hidden || R.querySelector('#bulkSend').disabled"); t++) await wait(500);
    const later = (st.bodies['/send/bulk'] || []).slice(7);
    check(later.length === 7 && !!later[0].scheduled_for && new Date(later[0].scheduled_for) > Date.now(), 'Scheduled list sends a future time');
  }
  await browser.close();
  console.log(failures ? failures + ' FAILED' : 'ALL PASSED');
})();
