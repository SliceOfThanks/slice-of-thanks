// Owner dashboard (SOT-Admin): loads the report, Refresh now with its 5 minute wait, goals panel on top (add / open / change / end goals),
// sections that fold open and closed (remembered), email services card, CSV download, PDF report, date choices, test accounts box,
// owner-only and timed-out notices, phone width. Usage: node admin-test.js /path/to/admin/admin.js
const { chromium } = require('playwright');
const fs = require('fs');
const JS = fs.readFileSync(process.argv[2], 'utf8');
const ORIGIN = 'https://www.sliceofthanks.app';
const API = 'https://api.test/fn';
const wait = ms => new Promise(r => setTimeout(r, ms));
let failures = 0;
const check = (ok, msg) => { console.log((ok ? 'PASS ' : 'FAIL ') + msg); if (!ok) failures++; };

const iso = (ms) => new Date(Date.now() + ms).toISOString();
function report(st, q) {
  const m = (metric, label, area, kind, value, prev, better = 'higher') => ({ metric, label, area, sort: 0, kind, better, definition: label + ' definition.', value, prev, prev_from: '2026-08-29', prev_to: '2026-09-27' });
  return {
    ok: true,
    range: { from: q.get('from') || '2026-09-28', to: q.get('to') || '2026-10-27', prev_from: '2026-08-29', prev_to: '2026-09-27', today: '2026-10-27', real: q.get('all') !== '1', tz: 'America/Los_Angeles' },
    summary: [
      m('new_members', 'New members', 'growth', 'count', q.get('all') === '1' ? 9 : 8, 3), m('src_partner', 'From partners', 'source', 'count', 3, 0), m('src_direct', 'Direct and other', 'source', 'count', 5, 3),
      m('rate_activation', 'Sent a pizza within 7 days', 'activation', 'rate', 25, 10), m('pizzas_sent', 'Pizzas delivered', 'usage', 'count', 22, 30), m('active_senders', 'Active senders', 'usage', 'live', 2, 1),
      m('r_box_opened', 'Boxes opened', 'recipients', 'count', 12, 4), m('rate_open', 'Open rate', 'recipients', 'rate', 54.5, 40), m('r_send_back', 'Pizzas sent back', 'virality', 'count', 1, 0),
      m('revenue_cents', 'Add-on sales', 'money', 'money', 4.99, 0), m('emails_sent', 'Emails sent', 'health', 'count', 24, 2, 'lower'), m('f_gerald', 'Made by Gerald', 'feature', 'count', 2, 0),
      m('f_logo', 'Logo', 'feature', 'count', 14, 0), m('members_paid', 'Paid plan members', 'now', 'now', 1, null), m('members_appsumo', 'AppSumo lifetime members', 'now', 'now', 2, null),
    ],
    days: Array.from({ length: 30 }, (_, i) => ({ day: '2026-10-' + String(i < 2 ? 28 + i - 31 + 31 : i - 1).padStart(2, '0'), new_members: i % 5, pizzas_sent: i % 3, boxes_opened: 0, emails_sent: 1 })).map((d, i) => ({ ...d, day: new Date(Date.UTC(2026, 8, 28 + i)).toISOString().slice(0, 10) })),
    funnel: [
      { funnel: 'sender', step: 1, metric: 'new_members', label: 'Signed up', n: 8 }, { funnel: 'sender', step: 2, metric: 'activated_7d', label: 'Sent a real pizza within 7 days', n: 2 },
      { funnel: 'recipient', step: 1, metric: 'pizzas_sent', label: 'Pizza delivered', n: 22 }, { funnel: 'recipient', step: 2, metric: 'r_box_opened', label: 'Opened the box', n: 12 },
      { funnel: 'recipient', step: 3, metric: 'r_pizza_completed', label: 'Ate all six slices', n: 6 },
    ],
    goals: st.goals,
    history: st.goals.length ? [{ id: st.goals[0].id, metric: st.goals[0].metric, label: st.goals[0].label, period: 'month', target: 100, better: 'higher', period_start: '2026-09-01', period_end: '2026-09-30', value: 40, status: 'missed', ended_on: null }] : [],
    status: { last_at: iso(-60000), last_trigger: st.lastTrigger, last_ok: true, last_error: null, last_good_at: iso(-60000), last_good_trigger: st.lastTrigger, refresh_ready_at: st.readyAt, next_auto_at: iso(3600000), tz: 'America/Los_Angeles' },
    budget: { month_start: '2026-10-01', emails: 24, budget: 10000 },
    heard: [{ answer: 'Product Hunt', n: 4 }, { answer: 'Not answered yet', n: 3 }, { answer: 'A friend', n: 1 }],
    email_services: [{ key: 'brevo', name: 'Brevo', connected: true, ok: true, remaining: 4275, resets: '2026-10-30', shared_with: 'Lawfecta' }, { key: 'sendfox', name: 'SendFox', connected: false, remaining: null }],
  };
}

async function run(browser, opts) {
  const st = { goals: opts.goals || [], posts: [], gets: [], readyAt: iso(-1000), lastTrigger: 'auto', refresh: opts.refresh || [] };
  const ctx = await browser.newContext({ viewport: opts.viewport || { width: 1200, height: 900 }, colorScheme: opts.dark ? 'dark' : 'light' });
  const page = await ctx.newPage();
  page.on('pageerror', e => { console.log('PAGE ERROR', e.message); failures++; });
  await ctx.route('**/fonts.googleapis.com/**', r => r.abort());
  await ctx.route('**/fonts.gstatic.com/**', r => r.abort());
  await ctx.route(API + '/**', async r => {
    const u = new URL(r.request().url());
    const p = u.pathname.replace('/fn', '');
    let b = null; try { b = JSON.parse(r.request().postData() || 'null'); } catch (e) {}
    let status = 200, out = { ok: true };
    if (opts.status) { status = opts.status; out = { error: 'x' }; }
    else if (p === '/admin/metrics') { st.gets.push(u.search); out = report(st, u.searchParams); }
    else if (p === '/admin/metrics/refresh') {
      st.posts.push({ p, b });
      const next = st.refresh.shift() || { ok: true };
      if (next.ok) { st.readyAt = iso(300000); st.lastTrigger = 'manual'; }
      out = next;
    } else if (p === '/admin/goals') {
      st.posts.push({ p, b });
      if (b.action === 'add' || b.action === 'change') {
        if (b.action === 'change') st.goals = st.goals.filter(g => g.id !== b.id);
        st.n = (st.n || 0) + 1;
        st.goals.push({ id: '00000000-0000-0000-0000-00000000000' + st.n, metric: b.metric, label: b.metric === 'pizzas_sent' ? 'Pizzas delivered' : 'New members', kind: 'count', period: b.period, better: b.better, target: b.target, period_start: '2026-10-01', period_end: '2026-10-31', share_done: 0.871, value: 22, pace: b.target * 0.871, status: 22 >= b.target ? 'met' : 22 >= b.target * 0.871 ? 'on_track' : 'behind', prev_value: null, prev_status: null, starts_on: '2026-10-27' });
        out = { ok: true, code: 'saved', id: st.goals[st.goals.length - 1].id };
      } else { st.goals = st.goals.filter(g => g.id !== b.id); out = { ok: true, code: 'ended' }; }
    }
    await r.fulfill({ status, contentType: 'application/json', body: JSON.stringify(out) });
  });
  await ctx.route(ORIGIN + '/**', r => r.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0"><header id="bd-head">BD header</header><main id="bd-main"><div id="sot-admin" data-api="' + API + '" data-token="tok"></div></main><script>' + JS.replace(/<\/script>/g, '<\\/script>') + '</script></body></html>' }));
  await page.addInitScript(() => {
    window.print = () => {
      const d = [...document.querySelectorAll('#sot-admin details')];
      window.__printed = { open: d.length > 0 && d.every(x => x.open), moved: document.getElementById('sot-admin').parentNode === document.body, cls: document.documentElement.classList.contains('sa-print'), head: getComputedStyle(document.getElementById('bd-head')).display };
      window.dispatchEvent(new Event('afterprint'));
    };
  });
  await page.goto(ORIGIN + '/sot-analytics');
  await wait(400);
  return { ctx, page, st };
}

(async () => {
  const browser = await chromium.launch();

  // 1. Loads the report
  let { ctx, page, st } = await run(browser, {});
  const txt = () => page.textContent('#sot-admin');
  let t = await txt();
  check(t.includes('Slice of Thanks Analytics'), 'title shows');
  check(/Last updated .* PT \(automatic\)/.test(t), 'last updated time and automatic label show');
  check(t.includes('Next automatic update'), 'next automatic update shows');
  check(t.includes('No goals set yet'), 'takeaway says no goals yet');
  check(t.includes('New members') && t.includes('54.5%') && t.includes('+14.5 pts vs the days before'), 'headline numbers and rate change show');
  check(t.includes('Plus 2 AppSumo lifetime'), 'paid tile adds AppSumo lifetime members');
  check(t.includes('Opened the box (54.5%)') && t.includes('Biggest drop'), 'funnel shows shares and the biggest drop');
  check((await page.$$('#sa-trends svg rect')).length === 60, 'two day charts with 30 bars each');
  check(t.includes('24') && t.includes('of the 10,000 monthly budget'), 'Brevo budget meter shows');
  check(t.includes('Made by Gerald') && t.includes('63.6%'), 'feature shares of pizzas delivered (Logo 14 of 22)');
  check(t.includes('Where new members came from') && t.includes('From partners'), 'signup sources show');
  check(t.includes('How they heard about us') && (await page.textContent('#sa-heard')).includes('Product Hunt4'), 'sign-up question answers show with counts');
  check(t.includes('Every number') && t.includes('Before means'), 'full table shows with the comparison dates');
  check(t.includes('$4.99'), 'money formats as dollars');
  check(!(await page.$('#sa-ended-goals')), 'no Ended goals box when nothing has ended');
  check(t.includes('every 8 hours'), 'update bar says automatic updates run every 8 hours');
  check(await page.$eval('#sa-headline', d => d.open) && !(await page.$eval('#sa-trends', d => d.open)), 'Headline numbers start open, the other sections start folded');
  check(t.includes('Brevo: 4,275 emails left until Oct 30'), 'Email sending fold shows Brevo emails left even when folded');
  check(t.includes('shared with Lawfecta') && t.includes('Shows here once SendFox is set up.'), 'email card notes the shared Brevo account and the SendFox slot');
  const order = await page.$$eval('#sot-admin .sa > *', els => els.map(e => e.id || e.className));
  check(order.indexOf('sa-goals') > -1 && order.indexOf('sa-goals') < order.indexOf('sa-headline'), 'goals sit above every other section');
  check(!!(await page.$('#sa-goals #sa-save')), 'with no goals the Add a goal form shows in the goals box');
  check(st.gets[0] === '', 'first load asks for the default last 30 days');

  // 2. Refresh now
  await page.click('#sa-refresh');
  await wait(400);
  t = await txt();
  check(st.posts.some(p => p.p === '/admin/metrics/refresh'), 'Refresh now posts to the server');
  check(st.gets.length === 2, 'numbers reload after the refresh');
  check(t.includes('(manual)'), 'last updated now says manual');
  check(await page.$eval('#sa-refresh', b => b.disabled), 'Refresh is disabled during its 5 minute wait');

  // 2b. Folding: open stays open through redraws and reloads, Open all opens every section
  await page.click('#sa-sum-trends');
  await wait(100);
  await page.selectOption('#sa-range', 'week');
  await wait(300);
  check(await page.$eval('#sa-trends', d => d.open), 'an opened section stays open when the numbers reload');
  await page.reload(); await wait(400);
  check(await page.$eval('#sa-trends', d => d.open), 'an opened section is remembered after the page reloads');
  await page.click('#sa-foldall'); await wait(150);
  check(await page.$$eval('#sot-admin details.sec:not(.sub)', ds => ds.every(d => d.open)) && (await page.textContent('#sa-foldall')) === 'Close all sections', 'Open all sections opens every section');
  await page.click('#sa-foldall'); await wait(150);
  check(await page.$$eval('#sot-admin details.sec:not(.sub)', ds => ds.every(d => !d.open)), 'Close all sections folds every section');

  // 3. Date choices and test accounts box
  await page.selectOption('#sa-range', 'month');
  await wait(300);
  check(/from=\d{4}-\d{2}-01&to=\d{4}-\d{2}-\d{2}/.test(st.gets[st.gets.length - 1]), 'This month asks for the first of the month to today');
  await page.selectOption('#sa-range', 'last30');
  await wait(300);
  await page.check('#sa-all');
  await wait(300);
  check(st.gets[st.gets.length - 1] === '?all=1', 'test accounts box asks for all accounts');
  check((await txt()).includes('test accounts included'), 'range line says test accounts are included');
  await page.fill('#sa-from', '2026-10-01');
  await page.dispatchEvent('#sa-from', 'change');
  await wait(300);
  check(st.gets[st.gets.length - 1].includes('from=2026-10-01') && await page.$eval('#sa-range', s => s.value) === 'custom', 'typing a date switches to Custom');

  // 4. Goals: add, change, end
  await page.click('#sa-save');
  await wait(150);
  check((await txt()).includes('Pick a metric first.'), 'saving with no metric asks for one');
  await page.selectOption('#sa-metric', 'pizzas_sent');
  await page.fill('#sa-target', '100');
  await page.click('#sa-save');
  await wait(400);
  let post = st.posts.filter(p => p.p === '/admin/goals').pop();
  check(post && post.b.action === 'add' && post.b.metric === 'pizzas_sent' && post.b.target === 100 && post.b.period === 'month' && post.b.better === 'higher' && post.b.nonce, 'Add goal posts metric, monthly period, target, better and a nonce');
  t = await txt();
  check(t.includes('Goal saved.') && t.includes('22 of 100 this month') && t.includes('Behind'), 'goal row shows value, target and status');
  check(!(await page.$('#sa-save')), 'the Add a goal form closes after saving');
  const gid = st.goals[0].id;
  check(!(await page.$eval('#sa-goal-' + gid, s => s.parentNode.open)), 'a goal row starts folded with its progress bar showing');
  check(!!(await page.$('#sa-goal-' + gid + ' .track .fill.st-behind')) && !!(await page.$('#sa-goal-' + gid + ' .pace')), 'folded row has the progress bar with the pace line');
  check(t.includes('Needs attention: Pizzas delivered'), 'takeaway names the goal that is behind');
  check(t.includes('Pace for today'), 'goal card shows the pace for today');
  await page.click('#sa-goal-' + gid);
  await wait(100);
  check(await page.$eval('#sa-goal-' + gid, s => s.parentNode.open), 'tapping a goal opens it');
  check((await txt()).includes('This month so far'), 'open goal shows the period-by-period results');
  await page.click('text=Change target');
  await wait(150);
  check(await page.$eval('#sa-metric', s => s.disabled) && await page.$eval('#sa-target', i => i.value) === '100', 'Change target fills the form and locks the metric');
  await page.fill('#sa-target', '20');
  await page.click('#sa-save');
  await wait(400);
  post = st.posts.filter(p => p.p === '/admin/goals').pop();
  check(post.b.action === 'change' && post.b.id && post.b.target === 20, 'Save new target posts a change with the goal id');
  t = await txt();
  const gid2 = st.goals[0].id;
  check(gid2 !== gid && await page.$eval('#sa-goal-' + gid2, s => s.parentNode.open), 'the changed goal stays open under its new id');
  check(t.includes('Met') && t.includes('Past goal results') && t.includes('Sep 2026') && t.includes('40 / 100'), 'changed goal is met and its past months show with their targets');
  check(!!(await page.$('#sa-goal-' + gid2 + ' ~ .gbody .hb .tgt')), 'past result bars mark the target');
  const before = st.posts.length;
  await page.click('text=End goal');
  await wait(150);
  check(st.posts.length === before && (await txt()).includes('Tap again to end'), 'End goal asks for a second tap');
  await page.click('text=Tap again to end');
  await wait(400);
  post = st.posts.filter(p => p.p === '/admin/goals').pop();
  check(post.b.action === 'end' && (await txt()).includes('Goal ended.'), 'second tap ends the goal');
  await ctx.close();

  // 4b. CSV download and PDF report
  ({ ctx, page, st } = await run(browser, { goals: [{ id: '00000000-0000-0000-0000-000000000009', metric: 'pizzas_sent', label: 'Pizzas delivered', kind: 'count', period: 'month', better: 'higher', target: 100, period_start: '2026-10-01', period_end: '2026-10-31', share_done: 0.871, value: 22, pace: 87.1, status: 'behind', prev_value: 40, prev_status: 'missed', starts_on: '2026-09-01' }] }));
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#sa-csv')]);
  check(/^slice-of-thanks-analytics-2026-09-28-to-2026-10-27\.csv$/.test(dl.suggestedFilename()), 'CSV file is named for its dates (' + dl.suggestedFilename() + ')');
  const csv = await page.evaluate(() => window.SOT_ADMIN.csv());
  check(csv.includes('GOALS') && csv.includes('Pizzas delivered,Each month,higher,100,22,87.1,Behind'), 'CSV has the goals with target, value, pace and status');
  check(csv.includes('PAST GOAL RESULTS') && csv.includes('EVERY NUMBER') && csv.includes('DAY BY DAY') && csv.includes('FUNNELS') && csv.includes('Product Hunt,4') && csv.includes('Brevo,Connected,4275,2026-10-30'), 'CSV has every part of the report');
  check(csv.includes('"Opened the box"') === false && csv.split('\r\n').filter(l => l.startsWith('2026-')).length >= 30, 'CSV has one line per day');
  await page.click('#sa-pdf');
  await wait(300);
  const pr = await page.evaluate(() => window.__printed);
  check(pr && pr.open && pr.moved && pr.cls && pr.head === 'none', 'PDF report opens every section and hides the rest of the BD page while printing');
  check(await page.$eval('#sot-admin', e => e.parentNode.id) === 'bd-main' && !(await page.evaluate(() => document.documentElement.classList.contains('sa-print'))), 'after printing the dashboard goes back where it was');
  check(!(await page.$eval('#sa-trends', d => d.open)) && (await txt()).includes('Save as PDF'), 'sections fold back and the page says to pick Save as PDF');
  await ctx.close();

  // 5. Refresh cooldown answer
  ({ ctx, page, st } = await run(browser, { refresh: [{ ok: false, code: 'cooldown', ready_at: new Date(Date.now() + 120000).toISOString() }] }));
  await page.click('#sa-refresh');
  await wait(300);
  check((await txt()).includes('Refresh can be used again at'), 'cooldown answer says when Refresh works again');
  await ctx.close();

  // 6. Not the owner, timed out
  ({ ctx, page } = await run(browser, { status: 403 }));
  check((await txt()).includes('only for the Slice of Thanks owner'), 'other accounts see the owner-only notice');
  await ctx.close();
  ({ ctx, page } = await run(browser, { status: 401 }));
  check((await txt()).includes('Reload the page'), 'a timed-out sign in asks to reload');
  await ctx.close();

  // 7. Phone width, dark mode
  ({ ctx, page } = await run(browser, { viewport: { width: 375, height: 800 }, dark: true }));
  const wide = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  check(wide <= 0, 'no sideways scrolling at phone width (' + wide + ')');
  const bg = await page.$eval('#sot-admin', e => getComputedStyle(e).backgroundColor);
  check(bg === 'rgb(36, 22, 15)', 'dark mode uses the dark cream palette');
  if (process.env.SHOT) await page.screenshot({ path: process.env.SHOT + '/admin-phone-dark.png', fullPage: true });
  await ctx.close();
  if (process.env.SHOT) {
    ({ ctx, page } = await run(browser, { goals: [] }));
    await page.selectOption('#sa-metric', 'pizzas_sent'); await page.fill('#sa-target', '30'); await page.click('#sa-save'); await wait(400);
    await page.click('#sot-admin details.goal > summary'); await page.click('#sa-sum-email'); await wait(200);
    await page.screenshot({ path: process.env.SHOT + '/admin-desktop.png', fullPage: true });
    await page.evaluate(() => { window.print = () => {}; }); await page.click('#sa-pdf'); await wait(200); await page.emulateMedia({ media: 'print' });
    await page.pdf({ path: process.env.SHOT + '/admin-report.pdf', format: 'Letter', printBackground: true });
    await page.evaluate(() => window.dispatchEvent(new Event('afterprint')));
    await ctx.close();
  }

  await browser.close();
  console.log(failures ? failures + ' FAILED' : 'ALL PASSED');
  process.exit(failures ? 1 : 0);
})();
