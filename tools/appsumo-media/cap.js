// Marketing captures of the live app with sample data. Usage: node cap.js <app.js> <outdir> <script.json>
const { chromium } = require('playwright'); const fs = require('fs');
let APP = fs.readFileSync(process.argv[2], 'utf8');
APP = APP.replace("goSend() {", "run(s) { return eval(s); }, goSend() {");
const OUT = process.argv[3];
const ORIGIN = 'https://www.sliceofthanks.app', API = 'https://api.test/fn';
const wait = ms => new Promise(r => setTimeout(r, ms));
const iso = m => new Date(Date.now() + m * 60000).toISOString();
const PEOPLE = [
  { id: 'p1', name: 'Priya Shah', email: 'priya@x.test', company: 'Northwind Legal', tags: ['client', 'holiday list'], birthday: '0000-11-02', has_consent: true, history: [{ status: 'opened', opened: true, at: iso(-60 * 24 * 2), label: 'After strategy call', pizza: null }] },
  { id: 'p2', name: 'Marcus Lee', email: 'marcus@x.test', company: 'Lee & Co Realty', tags: ['client'], has_consent: true, history: [] },
  { id: 'p3', name: 'Ana Torres', email: 'ana@x.test', company: 'Bright Path Coaching', tags: ['referral partner'], anniversary: '2021-11-01', has_consent: true, history: [] },
  { id: 'p4', name: 'Jordan Reyes', email: 'jordan@x.test', company: 'Summit Advisors', tags: ['client', 'holiday list'], has_consent: true, history: [] },
  { id: 'p5', name: 'Sam Patel', email: 'sam@x.test', company: 'Patel Dental', tags: ['vendor'], has_consent: true, history: [] },
];
function session() {
  return { member_id: 'm1', env: 'live', is_tester: false, plan: 'pro', paid_plan: 'pro', features: { automations: true, csv_import: true },
    credits: { monthly: 212, bonus: 0, pack: 0, special_delivery: 0 }, packs: [], checkout: {}, code: {},
    profile: { display_name: 'Stacey', business_name: 'Mountain Studio', mailing_address: '1 Main St', send_as: 'person', reply_to: 'stacey@mountainstudio.test', brand_color_1: '#1F6F8B', brand_color_2: '#F2C14E' },
    needs_terms: false, terms_updated: false, prefs: { trial_welcome: true, met_gerald: true, bday_ask_done: true, setup: { dismissed: true, done: [], skip: [] }, after_meeting: 'auto', dates: { mode: 'auto', birthdays: true, anniversaries: true, style: 'heartfelt' } },
    self_tests_left: 5, reply: { verified: true, replies: 'me' }, birthday: { md: null, on: true, toppers: [] } };
}
const MEET = [
  { id: 'a', provider: 'calendly', title: 'Strategy call', starts_at: iso(-120), ends_at: iso(-90), name: 'Priya Shah', email: 'priya@x.test', state: 'sent', opened: true },
  { id: 'b', provider: 'calendly', title: 'Kickoff meeting', starts_at: iso(-40), ends_at: iso(-10), name: 'Marcus Lee', email: 'marcus@x.test', want_pizza: true, state: 'ready' },
  { id: 'c', provider: 'tidycal', title: 'Discovery call', starts_at: iso(90), ends_at: iso(120), name: 'Ana Torres', email: 'ana@x.test', want_pizza: true, state: 'upcoming' },
  { id: 'd', provider: 'tidycal', title: 'Quarterly review', starts_at: iso(240), ends_at: iso(300), name: 'Jordan Reyes', email: 'jordan@x.test', want_pizza: null, state: 'upcoming' },
];
function handler(path) {
  if (path === '/session') return session();
  if (path === '/people') return { ok: true, people: PEOPLE };
  if (path === '/calendar') return { ok: true, integrations: [{ provider: 'calendly', label: 'stacey@mountainstudio.test' }], meetings: MEET };
  if (path === '/dates') return { ok: true, upcoming: [{ contact_id: 'p3', name: 'Ana Torres', kind: 'anniversary', on_day: '2026-11-01', days_away: 6, years: 5 }, { contact_id: 'p1', name: 'Priya Shah', kind: 'birthday', on_day: '2026-11-02', days_away: 7 }], waiting: [], sent: [], settings: { mode: 'auto' } };
  if (path === '/presets') return { ok: true, limit: 10, presets: [] };
  if (path === '/referral') return { ok: true, code: 'JORDAN', link: 'sliceofthanks.app/kitchen?ref=JORDAN', joined: 3, rewarded: 2, emails_earned: 40, friend_emails: 20, referrer_emails: 20 };
  return { ok: true };
}
(async () => {
  const steps = JSON.parse(fs.readFileSync(process.argv[4], 'utf8'));
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 402, height: 874 }, deviceScaleFactor: 3 });
  const page = await ctx.newPage();
  page.on('pageerror', e => console.log('PAGE ERROR', e.message));
  await ctx.route(API + '/**', r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(handler(new URL(r.request().url()).pathname.replace('/fn', ''))) }));
  await ctx.route(ORIGIN + '/**', r => r.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head><body style="margin:0"><div id="sot-app" data-debug data-api="' + API + '" data-token="tok"></div><script>' + APP.replace(/<\/script>/g, '<\\/script>') + '</script></body></html>' }));
  await page.goto(ORIGIN + '/kitchen'); await wait(2500);
  for (const s of steps) {
    if (s.js) { try { await page.evaluate(js => window.__SOT_DEBUG.run(js), s.js); } catch (e) { console.log('JS ERR', s.name || '', e.message); } }
    if (s.root) { try { await page.evaluate(js => (new Function('R', js))(window.__SOT_ROOT), s.root); } catch (e) { console.log('ROOT ERR', s.name || '', e.message); } }
    await wait(s.wait || 600);
    if (s.name) await page.screenshot({ path: OUT + '/' + s.name + '.png', fullPage: !!s.full });
  }
  await b.close();
})();
