/* Slice of Thanks owner dashboard (SOT-Admin widget). Loaded from jsDelivr at the commit in app_settings admin_code.
   Reads /admin/metrics (one report from Supabase), runs Refresh now and saves goals. Only the owner's BD account gets data. */
(function () {
  'use strict';
  var VERSION = 'admin-0.2.0';
  var root = document.getElementById('sot-admin');
  if (!root) return;
  var API = root.getAttribute('data-api') || '';
  var TOKEN = root.getAttribute('data-token') || '';
  var TZ = 'America/Los_Angeles';

  var STATUS = { met: 'Met', on_track: 'On track', behind: 'Behind', missed: 'Missed', no_data: 'No data yet' };
  var PERIOD_NOW = { week: 'this week', month: 'this month', quarter: 'this quarter' };
  var PERIOD_EACH = { week: 'Each week', month: 'Each month', quarter: 'Each quarter' };
  var GROUPS = [['growth', 'Growth'], ['source', 'Where members come from'], ['activation', 'First pizza'], ['usage', 'Pizzas'], ['recipients', 'Recipients'],
    ['virality', 'Sending back and referrals'], ['money', 'Money and AppSumo'], ['health', 'Email and health'], ['feature', 'Features used'], ['now', 'Today']];
  var HEADLINE = [['new_members', 'New members'], ['active_senders', 'Active senders'], ['pizzas_sent', 'Pizzas delivered'], ['rate_open', 'Open rate'], ['r_send_back', 'Pizzas sent back'], ['members_paid', 'Paid plan members today']];

  var state = { range: 'last30', from: null, to: null, all: false, report: null, loading: false, error: '', refreshing: false, refMsg: '', editing: null, endArmed: null, goalMsg: '' };

  // ---------- helpers ----------
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function svgEl(tag, attrs) { var e = document.createElementNS('http://www.w3.org/2000/svg', tag); for (var k in attrs) e.setAttribute(k, attrs[k]); return e; }
  function num(v) { return v == null || v === '' ? null : Number(v); }
  function fmtInt(v) { return Math.round(v).toLocaleString('en-US'); }
  function fmtVal(kind, v) {
    v = num(v);
    if (v == null || isNaN(v)) return '—';
    if (kind === 'rate') return (Math.round(v * 10) / 10) + '%';
    if (kind === 'money') return '$' + v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return (Math.round(v * 10) / 10).toLocaleString('en-US');
  }
  function parseDay(d) { return new Date(String(d).slice(0, 10) + 'T12:00:00Z'); }
  function dayShort(d) { return parseDay(d).toLocaleDateString('en-US', { timeZone: 'UTC', month: 'short', day: 'numeric' }); }
  function dayLong(d) { return parseDay(d).toLocaleDateString('en-US', { timeZone: 'UTC', month: 'short', day: 'numeric', year: 'numeric' }); }
  function when(iso) { return iso ? new Date(iso).toLocaleString('en-US', { timeZone: TZ, month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) + ' PT' : ''; }
  function clock(iso) { return iso ? new Date(iso).toLocaleTimeString('en-US', { timeZone: TZ, hour: 'numeric', minute: '2-digit' }) + ' PT' : ''; }
  function todayPT() { return new Date().toLocaleDateString('en-CA', { timeZone: TZ }); }
  function isoDay(d) { return d.toISOString().slice(0, 10); }
  function addDays(s, n) { var d = parseDay(s); d.setUTCDate(d.getUTCDate() + n); return isoDay(d); }
  function nonce() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
  function daysIn(a, b) { return Math.round((parseDay(b) - parseDay(a)) / 86400000) + 1; }

  function rangeFor(key) {
    var t = todayPT();
    if (key === 'week') { var dow = (parseDay(t).getUTCDay() + 6) % 7; return { from: addDays(t, -dow), to: t }; }
    if (key === 'month') return { from: t.slice(0, 8) + '01', to: t };
    if (key === 'lastmonth') { var first = t.slice(0, 8) + '01'; var end = addDays(first, -1); return { from: end.slice(0, 8) + '01', to: end }; }
    if (key === 'quarter') { var m = Number(t.slice(5, 7)); var qm = m - ((m - 1) % 3); return { from: t.slice(0, 5) + (qm < 10 ? '0' : '') + qm + '-01', to: t }; }
    return { from: null, to: null };
  }

  function call(path, opts) {
    opts = opts || {};
    var init = { method: opts.method || 'GET', headers: { 'x-sot-auth': TOKEN } };
    if (opts.body) { init.headers['content-type'] = 'application/json'; init.body = JSON.stringify(opts.body); }
    return fetch(API + path, init).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (b) { b.httpStatus = r.status; return b; });
    });
  }

  // ---------- styles (the app's look: cream, dark brown outlines, red and yellow controls) ----------
  function addStyles() {
    if (document.getElementById('sot-admin-style')) return;
    var fonts = document.createElement('link');
    fonts.rel = 'stylesheet';
    fonts.href = 'https://fonts.googleapis.com/css2?family=Shrikhand&family=Work+Sans:wght@400;500;600;700&display=swap';
    document.head.appendChild(fonts);
    var css = [
      '#sot-admin{--bg:#FFF3E0;--surface:#FFFAF2;--sunk:#F7E4C6;--ink:#3E2416;--muted:#7A5641;--line:#EBCFA8;--tomato:#D62828;--tomato-ink:#FFF3E0;--mustard:#F5C04E;--basil:#4c6b28;--edge:#3E2416;--shade:#3E2416;',
      '--ok-bg:#E0EACB;--ok-ink:#3c581b;--warn-bg:#FBE3A8;--warn-ink:#744600;--bad-bg:#FCE1E1;--bad-ink:#C21F1F;--display:"Shrikhand","Cooper Black",Georgia,serif;--body:"Work Sans",system-ui,-apple-system,"Segoe UI",sans-serif;',
      'background:var(--bg);color:var(--ink);font-family:var(--body);font-size:15px;line-height:1.45;padding:20px 16px 40px;border-radius:22px;font-variant-numeric:tabular-nums}',
      '@media (prefers-color-scheme:dark){#sot-admin{--bg:#24160F;--surface:#3E2416;--sunk:#4A2D1D;--ink:#E3D0B8;--muted:#BBA088;--line:#634433;--tomato:#D93A30;--edge:#17110E;--shade:#120A07;--ok-bg:#263618;--ok-ink:#b6d88a;--warn-bg:#4a3510;--warn-ink:#f6cf72;--bad-bg:#5A2E2A;--bad-ink:#FF8A7A;--basil:#9cc265}}',
      '#sot-admin *{box-sizing:border-box}',
      '#sot-admin .sa{max-width:1180px;margin:0 auto;display:flex;flex-direction:column;gap:26px}',
      '#sot-admin h1{font-family:var(--display);font-weight:400;font-size:clamp(28px,5vw,40px);line-height:1.1;margin:0;color:var(--tomato)}',
      '#sot-admin h2{font-family:var(--display);font-weight:400;font-size:24px;margin:0}',
      '#sot-admin section{display:flex;flex-direction:column;gap:14px}',
      '#sot-admin h3{font-size:16px;font-weight:700;margin:0}',
      '#sot-admin p{margin:0}',
      '#sot-admin .muted{color:var(--muted);font-size:13px}',
      '#sot-admin .take{margin-top:6px;font-size:16px}',
      '#sot-admin .card{background:var(--surface);border:3px solid var(--edge);border-radius:18px;box-shadow:4px 4px 0 var(--shade);padding:16px;display:flex;flex-direction:column;gap:10px;min-width:0}',
      '#sot-admin .card.bar{flex-direction:row;flex-wrap:wrap;gap:10px 18px;align-items:center;justify-content:space-between}',
      '#sot-admin .row{display:flex;flex-wrap:wrap;gap:10px;align-items:center}',
      '#sot-admin .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr));gap:18px}',
      '#sot-admin .tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,160px),1fr));gap:14px}',
      '#sot-admin .big{font-family:var(--display);font-size:32px;line-height:1.1}',
      '#sot-admin .good{color:var(--ok-ink)}#sot-admin .badc{color:var(--bad-ink)}',
      '#sot-admin button,#sot-admin select,#sot-admin input{font:inherit;color:var(--ink);background:var(--surface);border:2px solid var(--edge);border-radius:12px;padding:6px 10px;min-height:38px}',
      '#sot-admin button{cursor:pointer;font-weight:600}',
      '#sot-admin button.red{background:var(--tomato);color:var(--tomato-ink);box-shadow:3px 3px 0 var(--shade)}',
      '#sot-admin button.yellow{background:var(--mustard);color:#3E2416;box-shadow:3px 3px 0 var(--shade)}',
      '#sot-admin button:disabled{opacity:.55;cursor:default;box-shadow:none}',
      '#sot-admin button:focus-visible,#sot-admin select:focus-visible,#sot-admin input:focus-visible{outline:3px solid var(--mustard);outline-offset:2px}',
      '#sot-admin label{display:flex;flex-direction:column;gap:4px;font-size:13px;font-weight:600;color:var(--muted)}',
      '#sot-admin label.check{flex-direction:row;align-items:center;gap:8px;color:var(--ink);font-size:14px}',
      '#sot-admin label.check input{min-height:auto;width:18px;height:18px}',
      '#sot-admin .pill{display:inline-flex;align-items:center;gap:6px;font-size:12px;font-weight:700;border-radius:999px;padding:2px 10px;border:2px solid currentColor;white-space:nowrap}',
      '#sot-admin .st-met,#sot-admin .st-on_track{color:var(--ok-ink);background:var(--ok-bg)}',
      '#sot-admin .st-behind{color:var(--warn-ink);background:var(--warn-bg)}',
      '#sot-admin .st-missed{color:var(--bad-ink);background:var(--bad-bg)}',
      '#sot-admin .st-no_data{color:var(--muted);background:var(--sunk)}',
      '#sot-admin .goal-top{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}',
      '#sot-admin .track{position:relative;height:14px;border-radius:999px;background:var(--sunk);border:2px solid var(--edge)}',
      '#sot-admin .fill{position:absolute;left:0;top:0;bottom:0;border-radius:999px;background:var(--muted)}',
      '#sot-admin .fill.st-met,#sot-admin .fill.st-on_track{background:var(--basil)}#sot-admin .fill.st-behind{background:var(--mustard)}#sot-admin .fill.st-missed{background:var(--tomato)}',
      '#sot-admin .pace{position:absolute;top:-6px;bottom:-6px;width:3px;background:var(--ink);border-radius:2px}',
      '#sot-admin .acts{display:flex;gap:8px;flex-wrap:wrap}#sot-admin .acts button{font-size:13px;min-height:32px;padding:3px 10px}',
      '#sot-admin .bars{display:flex;flex-direction:column;gap:8px}',
      '#sot-admin .brow{display:grid;grid-template-columns:minmax(0,12rem) minmax(0,1fr) 4.5rem;gap:10px;align-items:center;font-size:14px}',
      '#sot-admin .brow .n{text-align:right;font-weight:600}',
      '#sot-admin .hbar{height:14px;border-radius:6px;background:var(--sunk);position:relative;overflow:hidden}',
      '#sot-admin .hbar span{position:absolute;left:0;top:0;bottom:0;border-radius:6px}',
      '#sot-admin .chart{position:relative;min-height:190px}#sot-admin .chart svg{display:block;width:100%;height:auto}',
      '#sot-admin .tip{position:absolute;pointer-events:none;background:var(--surface);border:2px solid var(--edge);border-radius:10px;padding:4px 8px;font-size:12px;white-space:nowrap;box-shadow:2px 2px 0 var(--shade)}',
      '#sot-admin .meter{height:16px;border-radius:999px;background:var(--sunk);border:2px solid var(--edge);position:relative;overflow:hidden}#sot-admin .meter span{position:absolute;left:0;top:0;bottom:0}',
      '#sot-admin .tablewrap{overflow-x:auto}',
      '#sot-admin table{width:100%;border-collapse:collapse;font-size:14px}',
      '#sot-admin th{text-align:left;font-size:12px;color:var(--muted);font-weight:700;padding:6px 8px;border-bottom:2px solid var(--edge)}',
      '#sot-admin td{padding:6px 8px;border-bottom:1px solid var(--line);vertical-align:top}',
      '#sot-admin .num{text-align:right;white-space:nowrap}#sot-admin .def{color:var(--muted);font-size:13px;min-width:14rem}',
      '#sot-admin .group td{font-weight:700;background:var(--sunk)}',
      '#sot-admin .warn{color:var(--bad-ink);font-weight:600}',
      '#sot-admin .edit{display:flex;flex-wrap:wrap;gap:12px;align-items:flex-end}#sot-admin .edit label{flex:1 1 10rem;min-width:9rem}',
      '#sot-admin .notice{background:var(--surface);border:3px solid var(--edge);border-radius:18px;padding:24px;text-align:center;max-width:560px;margin:30px auto}',
      '@media (max-width:560px){#sot-admin .brow{grid-template-columns:minmax(0,8rem) minmax(0,1fr) 3.5rem}#sot-admin .big{font-size:26px}}'
    ].join('\n');
    var st = document.createElement('style');
    st.id = 'sot-admin-style';
    st.textContent = css;
    document.head.appendChild(st);
  }

  // ---------- data ----------
  function load() {
    state.loading = true;
    render();
    var q = [];
    if (state.from) q.push('from=' + state.from);
    if (state.to) q.push('to=' + state.to);
    if (state.all) q.push('all=1');
    return call('/admin/metrics' + (q.length ? '?' + q.join('&') : '')).then(function (r) {
      state.loading = false;
      if (r.httpStatus === 401) { state.error = 'Your sign in timed out. Reload the page to see the numbers again.'; }
      else if (r.httpStatus === 403) { state.error = 'This page is only for the Slice of Thanks owner account.'; }
      else if (!r.ok) { state.error = 'The numbers did not load. Reload the page to try again.'; }
      else { state.error = ''; state.report = r; }
      render();
    }).catch(function () { state.loading = false; state.error = 'The numbers did not load. Check your connection and reload the page.'; render(); });
  }

  function refreshNow() {
    if (state.refreshing) return;
    state.refreshing = true;
    state.refMsg = 'Working out the latest numbers...';
    render();
    call('/admin/metrics/refresh', { method: 'POST', body: {} }).then(function (r) {
      state.refreshing = false;
      if (r && r.ok) { state.refMsg = 'Updated.'; return load(); }
      if (r && r.code === 'cooldown') state.refMsg = 'Refresh can be used again at ' + clock(r.ready_at) + '.';
      else state.refMsg = 'The update did not finish. Try again in a few minutes.';
      render();
    }).catch(function () { state.refreshing = false; state.refMsg = 'The update did not reach the server. Try again.'; render(); });
  }

  function saveGoal(action, g) {
    state.goalMsg = action === 'end' ? 'Ending the goal...' : 'Saving...';
    render();
    call('/admin/goals', { method: 'POST', body: { action: action, id: g.id || null, metric: g.metric || null, period: g.period || null, target: g.target == null ? null : g.target, better: g.better || null, nonce: nonce() } }).then(function (r) {
      var words = { saved: 'Goal saved.', ended: 'Goal ended. Its past results stay in the list below.', bad_metric: 'Pick a metric from the list.', bad_period: 'Pick week, month or quarter.', bad_target: 'Type a target of 0 or more.', bad_action: 'That did not save. Try again.' };
      state.goalMsg = (r && words[r.code]) || (r && r.ok ? 'Saved.' : 'That did not save. Try again.');
      if (r && r.ok) state.editing = null;
      return load();
    }).catch(function () { state.goalMsg = 'That did not reach the server. Try again.'; render(); });
  }

  // ---------- drawing ----------
  function sum() { return (state.report && state.report.summary) || []; }
  function metric(k) { var s = sum(); for (var i = 0; i < s.length; i++) if (s[i].metric === k) return s[i]; return null; }

  function changeText(m) {
    var v = num(m.value), p = num(m.prev);
    if (m.kind === 'now' || v == null || p == null) return null;
    var c = Math.round((v - p) * 10) / 10;
    if (c === 0) return { text: 'No change vs the days before', cls: '' };
    var good = m.better === 'lower' ? c < 0 : c > 0;
    var abs = Math.abs(c);
    return { text: (c > 0 ? '+' : '−') + (m.kind === 'rate' ? abs + ' pts' : fmtVal(m.kind, abs)) + ' vs the days before', cls: good ? 'good' : 'badc' };
  }

  function header() {
    var h = el('header');
    h.appendChild(el('h1', null, 'Slice of Thanks Analytics'));
    var goals = (state.report && state.report.goals) || [];
    var take = 'Loading your goals and numbers.';
    if (state.report) {
      if (!goals.length) take = 'No goals set yet. Add your first goal at the bottom of the page.';
      else {
        var c = {}; goals.forEach(function (g) { c[g.status] = (c[g.status] || 0) + 1; });
        var parts = [];
        if (c.met) parts.push(c.met + ' met'); if (c.on_track) parts.push(c.on_track + ' on track'); if (c.behind) parts.push(c.behind + ' behind'); if (c.missed) parts.push(c.missed + ' missed'); if (c.no_data) parts.push(c.no_data + ' with no data yet');
        var need = goals.filter(function (g) { return g.status === 'behind' || g.status === 'missed'; }).map(function (g) { return g.label; });
        take = 'Goals: ' + parts.join(', ') + '.' + (need.length ? ' Needs attention: ' + need.join(', ') + '.' : ' Everything is where it should be.');
      }
    }
    h.appendChild(el('p', 'take', take));
    return h;
  }

  function updateBar() {
    var c = el('div', 'card bar');
    var left = el('div', 'row');
    var s = state.report && state.report.status;
    if (s) {
      left.appendChild(el('strong', null, s.last_good_at ? 'Last updated ' + when(s.last_good_at) + ' (' + (s.last_good_trigger === 'manual' ? 'manual' : 'automatic') + ')' : 'Not updated yet'));
      if (s.next_auto_at) left.appendChild(el('span', 'muted', 'Next automatic update ' + clock(s.next_auto_at)));
      if (s.last_ok === false) left.appendChild(el('span', 'warn', 'The last update at ' + when(s.last_at) + ' did not finish. These numbers are from the one before.'));
    } else left.appendChild(el('strong', null, state.loading ? 'Loading...' : ''));
    var right = el('div', 'row');
    var ready = s && s.refresh_ready_at ? Date.parse(s.refresh_ready_at) : 0;
    var waiting = ready > Date.now();
    var msg = state.refMsg || (waiting ? 'Refresh can be used again at ' + clock(s.refresh_ready_at) + '.' : '');
    if (msg) right.appendChild(el('span', 'muted', msg));
    var b = el('button', 'red', state.refreshing ? 'Refreshing...' : 'Refresh now');
    b.type = 'button'; b.id = 'sa-refresh';
    b.disabled = state.refreshing || waiting || !state.report;
    b.addEventListener('click', refreshNow);
    right.appendChild(b);
    c.appendChild(left); c.appendChild(right);
    return c;
  }

  function filters() {
    var r = state.report && state.report.range;
    var c = el('div', 'row');
    var lab = el('label', null, 'Dates');
    var sel = el('select'); sel.id = 'sa-range';
    [['last30', 'Last 30 days'], ['week', 'This week'], ['month', 'This month'], ['lastmonth', 'Last month'], ['quarter', 'This quarter'], ['custom', 'Custom']].forEach(function (o) { var op = el('option', null, o[1]); op.value = o[0]; sel.appendChild(op); });
    sel.value = state.range;
    sel.addEventListener('change', function () {
      state.range = sel.value;
      if (sel.value !== 'custom') { var rr = rangeFor(sel.value); state.from = rr.from; state.to = rr.to; load(); }
    });
    lab.appendChild(sel); c.appendChild(lab);
    function dateBox(id, name, value) {
      var l = el('label', null, name === 'from' ? 'From' : 'To');
      var i = el('input'); i.type = 'date'; i.id = id; i.min = '2026-01-01'; i.max = '2099-12-31'; i.value = value || '';
      i.addEventListener('change', function () {
        if (!i.value || !i.validity.valid) return;
        state.range = 'custom'; state[name] = i.value;
        if (name === 'from' && !state.to && r) state.to = r.to;
        if (name === 'to' && !state.from && r) state.from = r.from;
        load();
      });
      l.appendChild(i); return l;
    }
    c.appendChild(dateBox('sa-from', 'from', state.from || (r && r.from)));
    c.appendChild(dateBox('sa-to', 'to', state.to || (r && r.to)));
    var ck = el('label', 'check'); var cb = el('input'); cb.type = 'checkbox'; cb.id = 'sa-all'; cb.checked = state.all;
    cb.addEventListener('change', function () { state.all = cb.checked; load(); });
    ck.appendChild(cb); ck.appendChild(document.createTextNode('Include my own and test accounts'));
    c.appendChild(ck);
    if (r) c.appendChild(el('span', 'muted', 'Showing ' + dayLong(r.from) + ' to ' + dayLong(r.to) + (r.real ? '' : ', test accounts included')));
    return c;
  }

  function section(id, title) { var s = el('section'); s.id = id; s.appendChild(el('h2', null, title)); return s; }

  function goalCards() {
    var s = section('sa-goals', 'Goals');
    var goals = (state.report && state.report.goals) || [];
    if (!goals.length) { s.appendChild(el('p', 'muted', 'No goals yet. Add one at the bottom of the page, for example 100 new members each month.')); return s; }
    var g2 = el('div', 'grid');
    goals.forEach(function (g) {
      var c = el('div', 'card');
      var top = el('div', 'goal-top');
      var h = el('div'); h.appendChild(el('h3', null, g.label)); h.appendChild(el('span', 'muted', PERIOD_EACH[g.period] + ', ' + (g.better === 'lower' ? 'lower is better' : 'higher is better')));
      top.appendChild(h); top.appendChild(el('span', 'pill st-' + g.status, STATUS[g.status] || g.status));
      c.appendChild(top);
      var v = el('p'); v.appendChild(el('span', 'big', fmtVal(g.kind, g.value))); v.appendChild(el('span', 'muted', ' of ' + fmtVal(g.kind, g.target) + ' ' + PERIOD_NOW[g.period]));
      c.appendChild(v);
      var tr = el('div', 'track');
      var val = num(g.value), tgt = num(g.target);
      var share = val == null ? 0 : (tgt > 0 ? Math.min(1, val / tgt) : 1);
      var f = el('span', 'fill st-' + g.status); f.style.width = (share * 100) + '%'; tr.appendChild(f);
      var countish = g.kind !== 'rate' && g.better === 'higher';
      if (countish) { var p = el('span', 'pace'); p.style.left = 'calc(' + Math.min(100, num(g.share_done) * 100) + '% - 1px)'; p.title = 'Where you need to be today'; tr.appendChild(p); }
      c.appendChild(tr);
      var left = Math.max(0, Math.round((1 - num(g.share_done)) * daysIn(g.period_start, g.period_end)));
      var dl = left + (left === 1 ? ' day' : ' days') + ' left.';
      c.appendChild(el('p', 'muted', countish && g.status !== 'met' && val != null ? 'Pace for today: ' + fmtVal(g.kind, g.pace) + '. ' + dl : dayLong(g.period_start) + ' to ' + dayLong(g.period_end) + '. ' + dl));
      c.appendChild(el('p', 'muted', g.prev_status ? 'Last ' + g.period + ': ' + fmtVal(g.kind, g.prev_value) + ', ' + (STATUS[g.prev_status] || g.prev_status).toLowerCase() + '.' : 'Started ' + dayLong(g.starts_on) + '.'));
      var acts = el('div', 'acts');
      var ch = el('button', null, 'Change target'); ch.type = 'button';
      ch.addEventListener('click', function () { state.editing = g; state.goalMsg = ''; render(); var t = document.getElementById('sa-target'); if (t) { t.focus(); t.scrollIntoView({ behavior: 'smooth', block: 'center' }); } });
      var en = el('button', null, state.endArmed === g.id ? 'Tap again to end' : 'End goal'); en.type = 'button';
      en.addEventListener('click', function () {
        if (state.endArmed !== g.id) { state.endArmed = g.id; render(); setTimeout(function () { if (state.endArmed === g.id) { state.endArmed = null; render(); } }, 4000); return; }
        state.endArmed = null; saveGoal('end', { id: g.id });
      });
      acts.appendChild(ch); acts.appendChild(en); c.appendChild(acts);
      g2.appendChild(c);
    });
    s.appendChild(g2);
    return s;
  }

  function headline() {
    var s = section('sa-headline', 'Headline numbers');
    var t = el('div', 'tiles');
    HEADLINE.forEach(function (h) {
      var m = metric(h[0]);
      var c = el('div', 'card');
      c.appendChild(el('span', 'muted', h[1]));
      c.appendChild(el('span', 'big', m ? fmtVal(m.kind, m.value) : '—'));
      if (h[0] === 'members_paid') { var a = metric('members_appsumo'); c.appendChild(el('span', 'muted', 'Plus ' + (a ? fmtVal('count', a.value) : '0') + ' AppSumo lifetime')); }
      else if (m) { var ct = changeText(m); if (ct) c.appendChild(el('span', 'muted ' + ct.cls, ct.text)); }
      t.appendChild(c);
    });
    s.appendChild(t);
    return s;
  }

  function barRows(rows, max, colorFor) {
    var box = el('div', 'bars');
    rows.forEach(function (r, i) {
      var row = el('div', 'brow');
      row.appendChild(el('span', null, r.label));
      var b = el('div', 'hbar'); var f = el('span'); f.style.width = (max > 0 ? Math.max(0, Math.min(1, r.size / max)) * 100 : 0) + '%'; f.style.background = colorFor(r, i); b.appendChild(f);
      row.appendChild(b);
      row.appendChild(el('span', 'n', r.text));
      box.appendChild(row);
    });
    return box;
  }

  function funnels() {
    var s = section('sa-funnels', 'Where people drop off');
    var g = el('div', 'grid');
    var all = (state.report && state.report.funnel) || [];
    [['sender', 'New members to first pizza', 'Counted on the signup day. A real pizza means not a test send.'], ['recipient', 'Recipients, from delivery to sending one back', 'Each step counts pizzas delivered in these dates.']].forEach(function (f) {
      var rows = all.filter(function (r) { return r.funnel === f[0]; });
      var c = el('div', 'card'); c.appendChild(el('h3', null, f[1])); c.appendChild(el('p', 'muted', f[2]));
      var first = rows.length ? num(rows[0].n) : 0;
      var worst = -1, worstLoss = 0;
      rows.forEach(function (r, i) { if (i > 0) { var prev = num(rows[i - 1].n); if (prev > 0) { var loss = (prev - num(r.n)) / prev; if (loss > worstLoss) { worstLoss = loss; worst = i; } } } });
      c.appendChild(barRows(rows.map(function (r) {
        var n = num(r.n);
        return { label: r.label + (r.step > 1 && first > 0 ? ' (' + Math.round(n / first * 1000) / 10 + '%)' : ''), size: n, text: fmtInt(n) };
      }), first, function (r, i) { return i === worst && worstLoss > 0 ? 'var(--tomato)' : 'var(--mustard)'; }));
      if (worst > 0) c.appendChild(el('p', 'muted', 'Biggest drop: before "' + rows[worst].label + '" (red).'));
      g.appendChild(c);
    });
    s.appendChild(g);
    return s;
  }

  function dayChart(key, label) {
    var c = el('div', 'card'); c.appendChild(el('h3', null, label));
    var box = el('div', 'chart'); c.appendChild(box);
    var rows = (state.report && state.report.days) || [];
    if (!rows.length) { box.appendChild(el('p', 'muted', 'No days to show.')); return c; }
    var w = 560, h = 190, ml = 34, mr = 8, mt = 12, mb = 28;
    var top = 1; rows.forEach(function (r) { top = Math.max(top, num(r[key]) || 0); });
    var step = top <= 5 ? 1 : Math.ceil(top / 4);
    var ymax = Math.ceil(top / step) * step;
    var y = function (v) { return h - mb - (v / ymax) * (h - mt - mb); };
    var band = (w - ml - mr) / rows.length, bw = Math.max(2, band * 0.72);
    var svg = svgEl('svg', { viewBox: '0 0 ' + w + ' ' + h, role: 'img', 'aria-label': label + ' by day' });
    for (var t = 0; t <= ymax; t += step) {
      svg.appendChild(svgEl('line', { x1: ml, x2: w - mr, y1: y(t), y2: y(t), stroke: 'var(--line)', 'stroke-width': 1 }));
      var tx = svgEl('text', { x: ml - 6, y: y(t) + 4, 'text-anchor': 'end', 'font-size': 11, fill: 'var(--muted)' }); tx.textContent = fmtInt(t); svg.appendChild(tx);
    }
    var every = Math.max(1, Math.ceil(rows.length / 7));
    var tip = el('div', 'tip'); tip.hidden = true;
    rows.forEach(function (r, i) {
      var x = ml + i * band + (band - bw) / 2, v = num(r[key]) || 0;
      var rect = svgEl('rect', { x: x, width: bw, y: y(v), height: Math.max(0, y(0) - y(v)), rx: Math.min(4, bw / 2), fill: 'var(--tomato)' });
      rect.addEventListener('pointerenter', function () { tip.hidden = false; tip.textContent = dayLong(r.day) + ': ' + fmtInt(v); });
      rect.addEventListener('pointermove', function (e) { var b = box.getBoundingClientRect(); var lx = e.clientX - b.left + 12; if (lx > b.width - 150) lx = e.clientX - b.left - 150; tip.style.left = Math.max(0, lx) + 'px'; tip.style.top = Math.max(0, e.clientY - b.top - 34) + 'px'; });
      rect.addEventListener('pointerleave', function () { tip.hidden = true; });
      svg.appendChild(rect);
      if (i % every === 0) { var lt = svgEl('text', { x: ml + i * band + band / 2, y: h - 8, 'text-anchor': 'middle', 'font-size': 11, fill: 'var(--muted)' }); lt.textContent = dayShort(r.day); svg.appendChild(lt); }
    });
    box.appendChild(svg); box.appendChild(tip);
    return c;
  }

  function trends() {
    var s = section('sa-trends', 'Day by day');
    var g = el('div', 'grid');
    g.appendChild(dayChart('pizzas_sent', 'Pizzas delivered'));
    g.appendChild(dayChart('new_members', 'New members'));
    s.appendChild(g);
    var b = state.report && state.report.budget;
    var c = el('div', 'card');
    c.appendChild(el('h3', null, 'Emails this month against the Brevo budget'));
    if (b) {
      var used = num(b.emails) || 0, budget = num(b.budget) || 10000, share = Math.round(used / budget * 1000) / 10;
      var p = el('p'); p.appendChild(el('span', 'big', fmtInt(used))); p.appendChild(el('span', 'muted', ' of ' + fmtInt(budget) + ' (' + share + '%) since ' + dayLong(b.month_start)));
      c.appendChild(p);
      var m = el('div', 'meter'); var f = el('span'); f.style.width = Math.min(100, share) + '%'; f.style.background = share >= 90 ? 'var(--tomato)' : share >= 70 ? 'var(--mustard)' : 'var(--basil)'; m.appendChild(f); c.appendChild(m);
    }
    c.appendChild(el('p', 'muted', 'Every email counts here, test accounts included, because Brevo counts them all.'));
    s.appendChild(c);
    return s;
  }

  function features() {
    var s = section('sa-features', 'What senders use');
    var g = el('div', 'grid');
    var total = metric('pizzas_sent'); total = total ? num(total.value) : 0;
    var feats = sum().filter(function (r) { return r.area === 'feature'; }).sort(function (a, b) { return (num(b.value) || 0) - (num(a.value) || 0); });
    var c1 = el('div', 'card'); c1.appendChild(el('h3', null, 'Features on delivered pizzas')); c1.appendChild(el('p', 'muted', 'Share of pizzas delivered in these dates that used each feature.'));
    c1.appendChild(barRows(feats.map(function (r) { var sh = total ? Math.round((num(r.value) || 0) / total * 1000) / 10 : null; return { label: r.label, size: sh || 0, text: sh == null ? '—' : sh + '%' }; }), 100,
      function (r, i) { return i < 3 ? 'var(--tomato)' : 'var(--muted)'; }));
    g.appendChild(c1);
    var src = sum().filter(function (r) { return r.area === 'source'; }).sort(function (a, b) { return (num(b.value) || 0) - (num(a.value) || 0); });
    var top = 0; src.forEach(function (r) { top = Math.max(top, num(r.value) || 0); });
    var c2 = el('div', 'card'); c2.appendChild(el('h3', null, 'Where new members came from')); c2.appendChild(el('p', 'muted', 'Product Hunt visitors show under Direct and other for now.'));
    c2.appendChild(barRows(src.map(function (r) { return { label: r.label, size: num(r.value) || 0, text: fmtInt(num(r.value) || 0) }; }), top, function () { return 'var(--mustard)'; }));
    g.appendChild(c2);
    var heard = (state.report && state.report.heard) || [];
    var hTop = 0; heard.forEach(function (r) { hTop = Math.max(hTop, num(r.n) || 0); });
    var c3 = el('div', 'card'); c3.id = 'sa-heard'; c3.appendChild(el('h3', null, 'How they heard about us'));
    c3.appendChild(el('p', 'muted', 'Answers to the sign-up question, for members who joined in these dates.'));
    if (heard.length) c3.appendChild(barRows(heard.map(function (r) { return { label: r.answer, size: num(r.n) || 0, text: fmtInt(num(r.n) || 0) }; }), hTop,
      function (r) { return r.label === 'Not answered yet' ? 'var(--muted)' : 'var(--basil)'; }));
    else c3.appendChild(el('p', 'muted', 'No sign-ups in these dates.'));
    g.appendChild(c3);
    s.appendChild(g);
    return s;
  }

  function table() {
    var s = section('sa-all-metrics', 'Every number');
    var c = el('div', 'card');
    var r = state.report && state.report.range;
    if (r) c.appendChild(el('p', 'muted', 'Before means ' + dayLong(r.prev_from) + ' to ' + dayLong(r.prev_to) + ', the same number of days just before.'));
    var wrap = el('div', 'tablewrap'); var t = el('table');
    var hr = el('tr'); ['Metric', 'These dates', 'Before', 'Change', 'What it counts'].forEach(function (x, i) { hr.appendChild(el('th', i > 0 && i < 4 ? 'num' : null, x)); });
    var th = el('thead'); th.appendChild(hr); t.appendChild(th);
    var tb = el('tbody');
    GROUPS.forEach(function (gr) {
      var rows = sum().filter(function (m) { return m.area === gr[0]; });
      if (!rows.length) return;
      var g = el('tr', 'group'); var gd = el('td', null, gr[1]); gd.colSpan = 5; g.appendChild(gd); tb.appendChild(g);
      rows.forEach(function (m) {
        var tr = el('tr'); var ct = changeText(m);
        tr.appendChild(el('td', null, m.label));
        tr.appendChild(el('td', 'num', fmtVal(m.kind, m.value)));
        tr.appendChild(el('td', 'num', m.kind === 'now' ? '' : fmtVal(m.kind, m.prev)));
        var cd = el('td', 'num ' + (ct ? ct.cls : ''), ct ? ct.text.replace(' vs the days before', '').replace('No change', '0') : ''); tr.appendChild(cd);
        tr.appendChild(el('td', 'def', m.definition));
        tb.appendChild(tr);
      });
    });
    t.appendChild(tb); wrap.appendChild(t); c.appendChild(wrap); s.appendChild(c);
    return s;
  }

  function history() {
    var s = section('sa-history', 'Past goal results');
    var c = el('div', 'card');
    var rows = (state.report && state.report.history) || [];
    c.appendChild(el('p', 'muted', 'Up to 6 finished periods for each goal, ended goals included.'));
    if (!rows.length) { c.appendChild(el('p', 'muted', 'No finished periods yet. Results show here once a goal’s first week, month or quarter ends.')); s.appendChild(c); return s; }
    var kinds = {}; sum().forEach(function (m) { kinds[m.metric] = m.kind; });
    var wrap = el('div', 'tablewrap'); var t = el('table');
    var hr = el('tr'); ['Goal', 'Period', 'Target', 'Result', 'Status'].forEach(function (x, i) { hr.appendChild(el('th', i === 2 || i === 3 ? 'num' : null, x)); });
    var th = el('thead'); th.appendChild(hr); t.appendChild(th);
    var tb = el('tbody');
    rows.forEach(function (h) {
      var k = kinds[h.metric] || 'count';
      var tr = el('tr');
      tr.appendChild(el('td', null, h.label + (h.ended_on ? ' (ended)' : '')));
      tr.appendChild(el('td', null, (h.period === 'week' ? 'Week of ' : h.period === 'month' ? 'Month of ' : 'Quarter from ') + dayLong(h.period_start)));
      tr.appendChild(el('td', 'num', fmtVal(k, h.target)));
      tr.appendChild(el('td', 'num', fmtVal(k, h.value)));
      var sd = el('td'); sd.appendChild(el('span', 'pill st-' + h.status, STATUS[h.status] || h.status)); tr.appendChild(sd);
      tb.appendChild(tr);
    });
    t.appendChild(tb); wrap.appendChild(t); c.appendChild(wrap); s.appendChild(c);
    return s;
  }

  function editor() {
    var g = state.editing;
    var s = section('sa-edit-goals', g ? 'Change goal: ' + g.label : 'Add a goal');
    var c = el('div', 'card');
    var row = el('div', 'edit');
    var l1 = el('label', null, 'Metric'); var ms = el('select'); ms.id = 'sa-metric';
    ms.appendChild(new Option('Pick a metric', ''));
    GROUPS.forEach(function (gr) {
      if (gr[0] === 'now') return;
      var og = document.createElement('optgroup'); og.label = gr[1];
      sum().filter(function (m) { return m.area === gr[0]; }).forEach(function (m) { og.appendChild(new Option(m.label + (m.kind === 'rate' ? ' (%)' : m.kind === 'money' ? ' ($)' : ''), m.metric)); });
      if (og.children.length) ms.appendChild(og);
    });
    l1.appendChild(ms);
    var l2 = el('label', null, 'Period'); var ps = el('select'); ps.id = 'sa-period';
    [['week', 'Each week'], ['month', 'Each month'], ['quarter', 'Each quarter']].forEach(function (o) { ps.appendChild(new Option(o[1], o[0])); });
    ps.value = 'month'; l2.appendChild(ps);
    var l3 = el('label', null, 'Target'); var ti = el('input'); ti.id = 'sa-target'; ti.type = 'number'; ti.min = '0'; ti.step = 'any'; ti.inputMode = 'decimal'; l3.appendChild(ti);
    var l4 = el('label', null, 'Better when'); var bs = el('select'); bs.id = 'sa-better'; bs.appendChild(new Option('Higher', 'higher')); bs.appendChild(new Option('Lower', 'lower')); l4.appendChild(bs);
    ms.addEventListener('change', function () { var m = metric(ms.value); if (m) bs.value = m.better; });
    if (g) { ms.value = g.metric; ms.disabled = true; ps.value = g.period; bs.value = g.better; ti.value = g.target; }
    var save = el('button', 'red', g ? 'Save new target' : 'Add goal'); save.type = 'button'; save.id = 'sa-save';
    save.addEventListener('click', function () {
      var target = Number(ti.value);
      if (!ms.value) { state.goalMsg = 'Pick a metric first.'; render(); return; }
      if (ti.value === '' || !(target >= 0)) { state.goalMsg = 'Type a target of 0 or more.'; render(); return; }
      saveGoal(g ? 'change' : 'add', { id: g ? g.id : null, metric: ms.value, period: ps.value, target: target, better: bs.value });
    });
    [l1, l2, l3, l4, save].forEach(function (x) { row.appendChild(x); });
    if (g) { var cancel = el('button', 'yellow', 'Cancel'); cancel.type = 'button'; cancel.addEventListener('click', function () { state.editing = null; state.goalMsg = ''; render(); }); row.appendChild(cancel); }
    c.appendChild(row);
    c.appendChild(el('p', 'muted', 'Rates are percents: type 40 for 40%. A goal repeats each period. Changing a goal starts a new one so past results keep the old target.'));
    var msg = el('p', null, state.goalMsg); msg.id = 'sa-goal-msg'; msg.setAttribute('aria-live', 'polite'); c.appendChild(msg);
    s.appendChild(c);
    return s;
  }

  function render() {
    // keep what is typed in the goal form while the page redraws
    var keep = {};
    ['sa-metric', 'sa-period', 'sa-target', 'sa-better'].forEach(function (id) { var e = document.getElementById(id); if (e && !e.disabled) keep[id] = e.value; });
    var focus = document.activeElement && document.activeElement.id;
    root.replaceChildren();
    var wrap = el('div', 'sa');
    wrap.appendChild(header());
    if (state.error) {
      var n = el('div', 'notice'); n.appendChild(el('p', null, state.error)); wrap.appendChild(n);
      root.appendChild(wrap); return;
    }
    wrap.appendChild(updateBar());
    wrap.appendChild(filters());
    if (state.report) {
      [goalCards(), headline(), funnels(), trends(), features(), table(), history(), editor()].forEach(function (x) { wrap.appendChild(x); });
      wrap.appendChild(el('p', 'muted', 'Slice of Thanks owner dashboard ' + VERSION + '. Numbers leave out test pizzas. Only this account can open this page.'));
    }
    root.appendChild(wrap);
    if (!state.editing) Object.keys(keep).forEach(function (id) { var e = document.getElementById(id); if (e && keep[id] !== undefined && !e.disabled) e.value = keep[id]; });
    if (focus) { var f = document.getElementById(focus); if (f) f.focus(); }
  }

  addStyles();
  // the Refresh button wakes up when its 5 minute wait is over
  setInterval(function () {
    var s = state.report && state.report.status;
    if (s && s.refresh_ready_at && Date.parse(s.refresh_ready_at) <= Date.now() && !state.refreshing) {
      var b = document.getElementById('sa-refresh');
      if (b && b.disabled) { state.refMsg = ''; render(); }
    }
  }, 15000);
  window.SOT_ADMIN = { version: VERSION, state: state, reload: load };
  load();
})();
