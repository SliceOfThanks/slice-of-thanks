/* Slice of Thanks owner dashboard (SOT-Admin widget). Loaded from jsDelivr at the commit in app_settings admin_code.
   Reads /admin/metrics (one report from Supabase, plus what the email services report), runs Refresh now and saves goals.
   Only the owner's BD account gets data.
   Layout: goals panel on top (one row per goal with a progress bar; open a row for past periods and to change it),
   then sections that fold open and closed (remembered in this browser), CSV download and a printable PDF report. */
(function () {
  'use strict';
  var VERSION = 'admin-0.3.0';
  var root = document.getElementById('sot-admin');
  if (!root) return;
  var API = root.getAttribute('data-api') || '';
  var TOKEN = root.getAttribute('data-token') || '';
  var TZ = 'America/Los_Angeles';
  var OPEN_KEY = 'sot-admin-open-v1';

  var STATUS = { met: 'Met', on_track: 'On track', behind: 'Behind', missed: 'Missed', no_data: 'No data yet' };
  var PERIOD_NOW = { week: 'this week', month: 'this month', quarter: 'this quarter' };
  var PERIOD_EACH = { week: 'Each week', month: 'Each month', quarter: 'Each quarter' };
  var PERIOD_WORD = { week: 'week', month: 'month', quarter: 'quarter' };
  var GROUPS = [['growth', 'Growth'], ['source', 'Where members come from'], ['activation', 'First pizza'], ['usage', 'Pizzas'], ['recipients', 'Recipients'],
    ['virality', 'Sending back and referrals'], ['money', 'Money and AppSumo'], ['health', 'Email and health'], ['feature', 'Features used'], ['now', 'Today']];
  var HEADLINE = [['new_members', 'New members'], ['active_senders', 'Active senders'], ['pizzas_sent', 'Pizzas delivered'], ['rate_open', 'Open rate'], ['r_send_back', 'Pizzas sent back'], ['members_paid', 'Paid plan members today']];
  // The sections below the goals, in page order
  var FOLDS = ['headline', 'email', 'funnels', 'trends', 'features', 'table'];

  var state = { range: 'last30', from: null, to: null, all: false, report: null, loading: false, error: '', refreshing: false, refMsg: '',
    editing: null, adding: false, endArmed: null, goalMsg: '', open: { headline: true }, goalOpen: {}, printing: false, exportMsg: '' };
  try { var saved = JSON.parse(window.localStorage.getItem(OPEN_KEY) || 'null'); if (saved && typeof saved === 'object') state.open = saved; } catch (e) { /* storage blocked: use the defaults */ }
  function saveOpen() { try { window.localStorage.setItem(OPEN_KEY, JSON.stringify(state.open)); } catch (e) { /* storage blocked */ } }

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
  function monthYear(d) { return parseDay(d).toLocaleDateString('en-US', { timeZone: 'UTC', month: 'short', year: 'numeric' }); }
  function when(iso) { return iso ? new Date(iso).toLocaleString('en-US', { timeZone: TZ, month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) + ' PT' : ''; }
  function clock(iso) { return iso ? new Date(iso).toLocaleTimeString('en-US', { timeZone: TZ, hour: 'numeric', minute: '2-digit' }) + ' PT' : ''; }
  function todayPT() { return new Date().toLocaleDateString('en-CA', { timeZone: TZ }); }
  function isoDay(d) { return d.toISOString().slice(0, 10); }
  function addDays(s, n) { var d = parseDay(s); d.setUTCDate(d.getUTCDate() + n); return isoDay(d); }
  function nonce() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
  function daysIn(a, b) { return Math.round((parseDay(b) - parseDay(a)) / 86400000) + 1; }
  function periodName(period, start) {
    if (period === 'week') return 'Week of ' + dayShort(start);
    if (period === 'month') return monthYear(start);
    return 'Quarter from ' + dayShort(start);
  }

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
      '#sot-admin .sa{max-width:1180px;margin:0 auto;display:flex;flex-direction:column;gap:20px}',
      '#sot-admin h1{font-family:var(--display);font-weight:400;font-size:clamp(28px,5vw,40px);line-height:1.1;margin:0;color:var(--tomato)}',
      '#sot-admin h2{font-family:var(--display);font-weight:400;font-size:22px;line-height:1.2;margin:0}',
      '#sot-admin section{display:flex;flex-direction:column;gap:12px}',
      '#sot-admin h3{font-size:16px;font-weight:700;margin:0}',
      '#sot-admin h4{font-size:14px;font-weight:700;margin:0}',
      '#sot-admin p{margin:0}',
      '#sot-admin .muted{color:var(--muted);font-size:13px}',
      '#sot-admin .take{margin-top:6px;font-size:16px}',
      '#sot-admin .card{background:var(--surface);border:3px solid var(--edge);border-radius:18px;box-shadow:4px 4px 0 var(--shade);padding:16px;display:flex;flex-direction:column;gap:10px;min-width:0}',
      '#sot-admin .card.bar{flex-direction:row;flex-wrap:wrap;gap:10px 18px;align-items:center;justify-content:space-between}',
      '#sot-admin .row{display:flex;flex-wrap:wrap;gap:10px;align-items:center}',
      '#sot-admin .row.end{justify-content:flex-end}',
      '#sot-admin .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr));gap:18px}',
      '#sot-admin .tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,160px),1fr));gap:14px}',
      '#sot-admin .big{font-family:var(--display);font-size:32px;line-height:1.1}',
      '#sot-admin .good{color:var(--ok-ink)}#sot-admin .badc{color:var(--bad-ink)}',
      '#sot-admin button,#sot-admin select,#sot-admin input{font:inherit;color:var(--ink);background:var(--surface);border:2px solid var(--edge);border-radius:12px;padding:6px 10px;min-height:38px}',
      '#sot-admin button{cursor:pointer;font-weight:600}',
      '#sot-admin button.red{background:var(--tomato);color:var(--tomato-ink);box-shadow:3px 3px 0 var(--shade)}',
      '#sot-admin button.yellow{background:var(--mustard);color:#3E2416;box-shadow:3px 3px 0 var(--shade)}',
      '#sot-admin button:disabled{opacity:.55;cursor:default;box-shadow:none}',
      '#sot-admin button:focus-visible,#sot-admin select:focus-visible,#sot-admin input:focus-visible,#sot-admin summary:focus-visible{outline:3px solid var(--mustard);outline-offset:2px}',
      '#sot-admin label{display:flex;flex-direction:column;gap:4px;font-size:13px;font-weight:600;color:var(--muted)}',
      '#sot-admin label.check{flex-direction:row;align-items:center;gap:8px;color:var(--ink);font-size:14px}',
      '#sot-admin label.check input{min-height:auto;width:18px;height:18px}',
      '#sot-admin .pill{display:inline-flex;align-items:center;gap:6px;font-size:12px;font-weight:700;border-radius:999px;padding:2px 10px;border:2px solid currentColor;white-space:nowrap}',
      '#sot-admin .st-met,#sot-admin .st-on_track{color:var(--ok-ink);background:var(--ok-bg)}',
      '#sot-admin .st-behind{color:var(--warn-ink);background:var(--warn-bg)}',
      '#sot-admin .st-missed{color:var(--bad-ink);background:var(--bad-bg)}',
      '#sot-admin .st-no_data{color:var(--muted);background:var(--sunk)}',
      '#sot-admin .track{position:relative;height:14px;border-radius:999px;background:var(--sunk);border:2px solid var(--edge)}',
      '#sot-admin .fill{position:absolute;left:0;top:0;bottom:0;border-radius:999px;background:var(--muted)}',
      '#sot-admin .fill.st-met,#sot-admin .fill.st-on_track{background:var(--basil)}#sot-admin .fill.st-behind{background:var(--mustard)}#sot-admin .fill.st-missed{background:var(--tomato)}',
      '#sot-admin .pace{position:absolute;top:-6px;bottom:-6px;width:3px;background:var(--ink);border-radius:2px}',
      '#sot-admin .tgt{position:absolute;top:-5px;bottom:-5px;width:0;border-left:3px dotted var(--ink)}',
      '#sot-admin .acts{display:flex;gap:8px;flex-wrap:wrap}#sot-admin .acts button{font-size:13px;min-height:32px;padding:3px 10px}',
      /* fold-up sections */
      '#sot-admin details.sec{display:flex;flex-direction:column}',
      '#sot-admin details>summary{list-style:none;cursor:pointer}',
      '#sot-admin details>summary::-webkit-details-marker{display:none}',
      '#sot-admin details.sec>summary{display:flex;align-items:center;justify-content:space-between;gap:12px;background:var(--surface);border:3px solid var(--edge);border-radius:18px;box-shadow:4px 4px 0 var(--shade);padding:12px 16px}',
      '#sot-admin details.sec[open]>summary{background:var(--sunk)}',
      '#sot-admin .sum-t{display:flex;flex-direction:column;gap:2px;min-width:0}',
      '#sot-admin details.sec>.body{display:flex;flex-direction:column;gap:14px;padding:16px 2px 6px}',
      '#sot-admin .chev{flex:none;width:30px;height:30px;border:2px solid var(--edge);border-radius:999px;display:inline-flex;align-items:center;justify-content:center;background:var(--mustard);color:#3E2416;transition:transform .15s}',
      '#sot-admin .chev::before{content:"";width:8px;height:8px;border-right:3px solid currentColor;border-bottom:3px solid currentColor;transform:translateY(-2px) rotate(45deg)}',
      '#sot-admin details[open]>summary .chev{transform:rotate(180deg)}',
      /* goals panel */
      '#sot-admin .goal-head{display:flex;flex-wrap:wrap;gap:10px;align-items:flex-end;justify-content:space-between}',
      '#sot-admin .goals{display:flex;flex-direction:column;gap:10px}',
      '#sot-admin details.goal{border:2px solid var(--edge);border-radius:14px;background:var(--bg)}',
      '#sot-admin details.goal>summary{display:grid;grid-template-columns:minmax(0,15rem) minmax(0,1fr) minmax(6.5rem,auto) 6.5rem 30px;grid-template-areas:"name track val pill chev";gap:12px;align-items:center;padding:10px 12px}',
      '#sot-admin .g-name{grid-area:name;display:flex;flex-direction:column;min-width:0}#sot-admin .g-track{grid-area:track}#sot-admin .g-val{grid-area:val;text-align:right;font-weight:700;white-space:nowrap}',
      '#sot-admin .g-pill{grid-area:pill;display:flex;justify-content:flex-start}#sot-admin details.goal>summary .chev{grid-area:chev}',
      '#sot-admin .gbody{padding:12px 12px 14px;display:flex;flex-direction:column;gap:12px;border-top:2px dashed var(--line)}',
      '#sot-admin .gsplit{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,260px),1fr));gap:16px}',
      '#sot-admin .hist{display:flex;flex-direction:column;gap:7px}',
      '#sot-admin .hrow{display:grid;grid-template-columns:minmax(0,9rem) minmax(0,1fr) minmax(5.5rem,auto) 6.5rem;gap:10px;align-items:center;font-size:14px}',
      '#sot-admin .hrow .n{text-align:right;font-weight:600;white-space:nowrap}',
      '#sot-admin .hb{position:relative;height:14px;border-radius:6px;background:var(--sunk)}',
      '#sot-admin .hb>span.f{position:absolute;left:0;top:0;bottom:0;border-radius:6px;background:var(--muted)}',
      '#sot-admin .hb>span.f.st-met,#sot-admin .hb>span.f.st-on_track{background:var(--basil)}#sot-admin .hb>span.f.st-behind{background:var(--mustard)}#sot-admin .hb>span.f.st-missed{background:var(--tomato)}',
      '#sot-admin .legend{display:flex;flex-wrap:wrap;gap:6px 14px;font-size:12px;color:var(--muted);align-items:center}',
      '#sot-admin .legend i{display:inline-block;width:14px;height:0;border-left:3px dotted var(--ink);height:12px;vertical-align:middle;margin-right:4px}',
      /* other parts */
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
      '#sot-admin .editbox{background:var(--sunk);border-radius:14px;padding:14px;display:flex;flex-direction:column;gap:10px}',
      '#sot-admin .notice{background:var(--surface);border:3px solid var(--edge);border-radius:18px;padding:24px;text-align:center;max-width:560px;margin:30px auto}',
      '#sot-admin .svc{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:4px 12px;align-items:baseline;padding:10px 0;border-bottom:1px solid var(--line)}#sot-admin .svc:last-child{border-bottom:0}',
      '#sot-admin .print-only{display:none}',
      '@media (max-width:760px){#sot-admin details.goal>summary{grid-template-columns:minmax(0,1fr) auto 30px;grid-template-areas:"name pill chev" "track val val";gap:8px 10px}',
      '#sot-admin .hrow{grid-template-columns:minmax(0,6.5rem) minmax(0,1fr) auto;}#sot-admin .hrow .pill{display:none}}',
      '@media (max-width:560px){#sot-admin .brow{grid-template-columns:minmax(0,8rem) minmax(0,1fr) 3.5rem}#sot-admin .big{font-size:26px}}',
      /* PDF report: only the dashboard prints, every section open, light colors, no buttons */
      'html.sa-print body>*:not(#sot-admin){display:none!important}',
      '@media print{@page{margin:14mm}',
      'html.sa-print body{margin:0;background:#fff}',
      '#sot-admin{--bg:#fff;--surface:#fff;--sunk:#F7EDE0;--ink:#2a1a10;--muted:#5e4535;--line:#e2cfb6;--edge:#3E2416;--shade:transparent;--tomato:#C42222;--mustard:#E9B23C;--basil:#4c6b28;--ok-bg:#E0EACB;--ok-ink:#3c581b;--warn-bg:#FBE3A8;--warn-ink:#744600;--bad-bg:#FCE1E1;--bad-ink:#C21F1F;',
      'padding:0;border-radius:0;font-size:12px;-webkit-print-color-adjust:exact;print-color-adjust:exact}',
      '#sot-admin .noprint,#sot-admin button,#sot-admin .chev,#sot-admin .filters{display:none!important}',
      '#sot-admin .print-only{display:block}',
      '#sot-admin .card,#sot-admin details.sec>summary{box-shadow:none;border-width:2px}',
      '#sot-admin .card,#sot-admin details.goal,#sot-admin .tiles>*,#sot-admin tr{break-inside:avoid}',
      '#sot-admin details.sec{break-before:auto}#sot-admin details.sec>summary{background:#fff;padding:6px 0;border:0;border-bottom:2px solid var(--edge);border-radius:0}',
      '#sot-admin details.sec>summary{break-after:avoid;page-break-after:avoid}#sot-admin details.sec>.body{break-before:avoid;page-break-before:avoid}',
      '#sot-admin .tablewrap{overflow:visible}}'
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
      var words = { saved: 'Goal saved.', ended: 'Goal ended. Its past results stay under Ended goals.', bad_metric: 'Pick a metric from the list.', bad_period: 'Pick week, month or quarter.', bad_target: 'Type a target of 0 or more.', bad_action: 'That did not save. Try again.' };
      state.goalMsg = (r && words[r.code]) || (r && r.ok ? 'Saved.' : 'That did not save. Try again.');
      if (r && r.ok) {
        // a changed goal comes back with a new id: keep its row open
        if (action === 'change' && r.id) state.goalOpen[r.id] = true;
        state.editing = null; state.adding = false;
      }
      return load();
    }).catch(function () { state.goalMsg = 'That did not reach the server. Try again.'; render(); });
  }

  // ---------- report data ----------
  function sum() { return (state.report && state.report.summary) || []; }
  function metric(k) { var s = sum(); for (var i = 0; i < s.length; i++) if (s[i].metric === k) return s[i]; return null; }
  function goalsList() { return (state.report && state.report.goals) || []; }
  function historyList() { return (state.report && state.report.history) || []; }
  function services() { return (state.report && state.report.email_services) || []; }

  function changeText(m) {
    var v = num(m.value), p = num(m.prev);
    if (m.kind === 'now' || v == null || p == null) return null;
    var c = Math.round((v - p) * 10) / 10;
    if (c === 0) return { text: 'No change vs the days before', cls: '' };
    var good = m.better === 'lower' ? c < 0 : c > 0;
    var abs = Math.abs(c);
    return { text: (c > 0 ? '+' : '−') + (m.kind === 'rate' ? abs + ' pts' : fmtVal(m.kind, abs)) + ' vs the days before', cls: good ? 'good' : 'badc' };
  }

  // ---------- top of the page ----------
  function header() {
    var h = el('header');
    h.appendChild(el('h1', null, 'Slice of Thanks Analytics'));
    var goals = goalsList();
    var take = 'Loading your goals and numbers.';
    if (state.report) {
      if (!goals.length) take = 'No goals set yet. Add your first goal in the Goals box below.';
      else {
        var c = {}; goals.forEach(function (g) { c[g.status] = (c[g.status] || 0) + 1; });
        var parts = [];
        if (c.met) parts.push(c.met + ' met'); if (c.on_track) parts.push(c.on_track + ' on track'); if (c.behind) parts.push(c.behind + ' behind'); if (c.missed) parts.push(c.missed + ' missed'); if (c.no_data) parts.push(c.no_data + ' with no data yet');
        var need = goals.filter(function (g) { return g.status === 'behind' || g.status === 'missed'; }).map(function (g) { return g.label; });
        take = 'Goals: ' + parts.join(', ') + '.' + (need.length ? ' Needs attention: ' + need.join(', ') + '.' : ' Everything is where it should be.');
      }
    }
    h.appendChild(el('p', 'take', take));
    var r = state.report && state.report.range;
    if (r) h.appendChild(el('p', 'muted print-only', 'Report for ' + dayLong(r.from) + ' to ' + dayLong(r.to) + (r.real ? '' : ', test accounts included') + '. Made ' + when(new Date().toISOString()) + '.'));
    return h;
  }

  function updateBar() {
    var c = el('div', 'card bar noprint');
    var left = el('div', 'row');
    var s = state.report && state.report.status;
    if (s) {
      left.appendChild(el('strong', null, s.last_good_at ? 'Last updated ' + when(s.last_good_at) + ' (' + (s.last_good_trigger === 'manual' ? 'manual' : 'automatic') + ')' : 'Not updated yet'));
      if (s.next_auto_at) left.appendChild(el('span', 'muted', 'Next automatic update ' + when(s.next_auto_at) + '. Automatic updates run every 8 hours.'));
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

  // ---------- goals panel ----------
  function goalTrack(g, cls) {
    var tr = el('div', 'track' + (cls ? ' ' + cls : ''));
    var val = num(g.value), tgt = num(g.target);
    var share = val == null ? 0 : (tgt > 0 ? Math.min(1, val / tgt) : 1);
    var f = el('span', 'fill st-' + g.status); f.style.width = (share * 100) + '%'; tr.appendChild(f);
    if (isCountish(g)) { var p = el('span', 'pace'); p.style.left = 'calc(' + Math.min(100, num(g.share_done) * 100) + '% - 1px)'; p.title = 'Where you need to be today'; tr.appendChild(p); }
    tr.setAttribute('role', 'img');
    tr.setAttribute('aria-label', fmtVal(g.kind, g.value) + ' of ' + fmtVal(g.kind, g.target) + ' ' + PERIOD_NOW[g.period]);
    return tr;
  }
  function isCountish(g) { return g.kind !== 'rate' && g.better === 'higher'; }

  // Past periods of the same metric and period, the current one first, so it is easy to see if the target is being met
  function goalHistory(g) {
    var rows = historyList().filter(function (h) { return h.metric === g.metric && h.period === g.period; })
      .sort(function (a, b) { return String(b.period_start).localeCompare(String(a.period_start)); }).slice(0, 6);
    var all = [{ name: 'This ' + PERIOD_WORD[g.period] + ' so far', value: g.value, target: g.target, status: g.status }].concat(rows.map(function (h) {
      return { name: periodName(h.period, h.period_start) + (h.ended_on ? ' (older target)' : ''), value: h.value, target: h.target, status: h.status };
    }));
    var top = 0; all.forEach(function (r) { top = Math.max(top, num(r.value) || 0, num(r.target) || 0); });
    top = top > 0 ? top * 1.08 : 1;
    var box = el('div', 'hist');
    all.forEach(function (r) {
      var row = el('div', 'hrow');
      row.appendChild(el('span', null, r.name));
      var b = el('div', 'hb'); var f = el('span', 'f st-' + r.status); f.style.width = Math.min(100, (num(r.value) || 0) / top * 100) + '%'; b.appendChild(f);
      if (num(r.target) != null) { var t = el('span', 'tgt'); t.style.left = 'calc(' + Math.min(100, num(r.target) / top * 100) + '% - 1px)'; b.appendChild(t); }
      row.appendChild(b);
      row.appendChild(el('span', 'n', fmtVal(g.kind, r.value) + ' / ' + fmtVal(g.kind, r.target)));
      row.appendChild(el('span', 'pill st-' + r.status, STATUS[r.status] || r.status));
      box.appendChild(row);
    });
    var wrap = el('div');
    wrap.appendChild(box);
    var lg = el('div', 'legend'); var li = el('span'); li.appendChild(el('i')); li.appendChild(document.createTextNode('Target')); lg.appendChild(li);
    lg.appendChild(el('span', null, rows.length ? 'Up to 6 finished ' + PERIOD_WORD[g.period] + 's.' : 'Finished ' + PERIOD_WORD[g.period] + 's show here once this one ends.'));
    wrap.appendChild(lg);
    return wrap;
  }

  function goalRow(g) {
    var d = el('details', 'goal');
    var editingThis = state.editing && state.editing.id === g.id;
    d.open = state.printing || editingThis || !!state.goalOpen[g.id];
    d.addEventListener('toggle', function () { if (!state.printing) state.goalOpen[g.id] = d.open; });
    var sm = el('summary'); sm.id = 'sa-goal-' + g.id;
    var nm = el('div', 'g-name'); nm.appendChild(el('h3', null, g.label)); nm.appendChild(el('span', 'muted', PERIOD_EACH[g.period] + ', ' + (g.better === 'lower' ? 'lower is better' : 'higher is better')));
    sm.appendChild(nm);
    var tw = el('div', 'g-track'); tw.appendChild(goalTrack(g)); sm.appendChild(tw);
    sm.appendChild(el('span', 'g-val', fmtVal(g.kind, g.value) + ' of ' + fmtVal(g.kind, g.target)));
    var pw = el('span', 'g-pill'); pw.appendChild(el('span', 'pill st-' + g.status, STATUS[g.status] || g.status)); sm.appendChild(pw);
    sm.appendChild(el('span', 'chev'));
    d.appendChild(sm);

    var body = el('div', 'gbody');
    var split = el('div', 'gsplit');
    var now = el('div', 'hist');
    var v = el('p'); v.appendChild(el('span', 'big', fmtVal(g.kind, g.value))); v.appendChild(el('span', 'muted', ' of ' + fmtVal(g.kind, g.target) + ' ' + PERIOD_NOW[g.period]));
    now.appendChild(v);
    var val = num(g.value);
    var left = Math.max(0, Math.round((1 - num(g.share_done)) * daysIn(g.period_start, g.period_end)));
    var dl = left + (left === 1 ? ' day' : ' days') + ' left.';
    now.appendChild(el('p', 'muted', isCountish(g) && g.status !== 'met' && val != null ? 'Pace for today: ' + fmtVal(g.kind, g.pace) + '. ' + dl : dayLong(g.period_start) + ' to ' + dayLong(g.period_end) + '. ' + dl));
    if (isCountish(g)) now.appendChild(el('p', 'muted', 'The black line on the bar is where you need to be today to hit the target.'));
    now.appendChild(el('p', 'muted', g.prev_status ? 'Last ' + g.period + ': ' + fmtVal(g.kind, g.prev_value) + ', ' + (STATUS[g.prev_status] || g.prev_status).toLowerCase() + '.' : 'Started ' + dayLong(g.starts_on) + '.'));
    split.appendChild(now);
    var hw = el('div', 'hist'); hw.appendChild(el('h4', null, 'Past goal results')); hw.appendChild(goalHistory(g));
    split.appendChild(hw);
    body.appendChild(split);
    if (editingThis) body.appendChild(editor(g));
    else {
      var acts = el('div', 'acts noprint');
      var ch = el('button', null, 'Change target'); ch.type = 'button';
      ch.addEventListener('click', function () { state.editing = g; state.adding = false; state.goalMsg = ''; render(); var t = document.getElementById('sa-target'); if (t) { t.focus(); t.select(); } });
      var en = el('button', null, state.endArmed === g.id ? 'Tap again to end' : 'End goal'); en.type = 'button';
      en.addEventListener('click', function () {
        if (state.endArmed !== g.id) { state.endArmed = g.id; render(); setTimeout(function () { if (state.endArmed === g.id) { state.endArmed = null; render(); } }, 4000); return; }
        state.endArmed = null; saveGoal('end', { id: g.id });
      });
      acts.appendChild(ch); acts.appendChild(en); body.appendChild(acts);
    }
    d.appendChild(body);
    return d;
  }

  // Results of goals that were ended, so nothing is lost
  function endedGoals() {
    var active = {}; goalsList().forEach(function (g) { active[g.metric + '|' + g.period] = true; });
    var rows = historyList().filter(function (h) { return !active[h.metric + '|' + h.period]; });
    if (!rows.length) return null;
    var kinds = {}; sum().forEach(function (m) { kinds[m.metric] = m.kind; });
    var wrap = el('div', 'tablewrap'); var t = el('table');
    var hr = el('tr'); ['Goal', 'Period', 'Target', 'Result', 'Status'].forEach(function (x, i) { hr.appendChild(el('th', i === 2 || i === 3 ? 'num' : null, x)); });
    var th = el('thead'); th.appendChild(hr); t.appendChild(th);
    var tb = el('tbody');
    rows.forEach(function (h) {
      var k = kinds[h.metric] || 'count';
      var tr = el('tr');
      tr.appendChild(el('td', null, h.label));
      tr.appendChild(el('td', null, periodName(h.period, h.period_start)));
      tr.appendChild(el('td', 'num', fmtVal(k, h.target)));
      tr.appendChild(el('td', 'num', fmtVal(k, h.value)));
      var sd = el('td'); sd.appendChild(el('span', 'pill st-' + h.status, STATUS[h.status] || h.status)); tr.appendChild(sd);
      tb.appendChild(tr);
    });
    t.appendChild(tb); wrap.appendChild(t);
    return fold('ended', 'sa-ended-goals', 'Ended goals', rows.length + (rows.length === 1 ? ' finished period' : ' finished periods') + ' from goals you ended', [wrap], 'sub');
  }

  function goalsPanel() {
    var s = el('section'); s.id = 'sa-goals';
    var goals = goalsList();
    var adding = state.adding || (!goals.length && !state.editing);
    var head = el('div', 'goal-head');
    var hh = el('div'); hh.appendChild(el('h2', null, 'Goals'));
    hh.appendChild(el('p', 'muted', goals.length ? 'Open a goal to see how each ' + 'period went and to change its target.' : 'Set a target and see each period whether you hit it.'));
    head.appendChild(hh);
    if (!adding) {
      var add = el('button', 'yellow noprint', 'Add a goal'); add.type = 'button'; add.id = 'sa-add';
      add.addEventListener('click', function () { state.adding = true; state.editing = null; state.goalMsg = ''; render(); var m = document.getElementById('sa-metric'); if (m) m.focus(); });
      head.appendChild(add);
    }
    s.appendChild(head);
    var c = el('div', 'card');
    if (!goals.length) c.appendChild(el('p', 'muted', 'No goals yet. For example: 100 new members each month.'));
    else { var list = el('div', 'goals'); goals.forEach(function (g) { list.appendChild(goalRow(g)); }); c.appendChild(list); }
    if (adding && !state.printing) c.appendChild(editor(null));
    if (!adding && !state.editing && state.goalMsg) { var msg = el('p', null, state.goalMsg); msg.id = 'sa-goal-msg'; msg.setAttribute('aria-live', 'polite'); c.appendChild(msg); }
    var ended = endedGoals(); if (ended) c.appendChild(ended);
    s.appendChild(c);
    return s;
  }

  function editor(g) {
    var box = el('div', 'editbox noprint'); box.id = 'sa-edit-goals';
    box.appendChild(el('h4', null, g ? 'Change the target for ' + g.label : 'Add a goal'));
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
    if (g || goalsList().length) {
      var cancel = el('button', 'yellow', 'Cancel'); cancel.type = 'button';
      cancel.addEventListener('click', function () { state.editing = null; state.adding = false; state.goalMsg = ''; render(); });
      row.appendChild(cancel);
    }
    box.appendChild(row);
    box.appendChild(el('p', 'muted', 'Rates are percents: type 40 for 40%. A goal repeats each period. Changing a target starts a new goal, so past results keep the old target.'));
    var msg = el('p', null, state.goalMsg); msg.id = 'sa-goal-msg'; msg.setAttribute('aria-live', 'polite'); box.appendChild(msg);
    return box;
  }

  // ---------- date choices, folding and export ----------
  function filters() {
    var r = state.report && state.report.range;
    var c = el('div', 'row filters');
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
    if (r) c.appendChild(el('span', 'muted', 'Showing ' + dayLong(r.from) + ' to ' + dayLong(r.to) + (r.real ? '' : ', test accounts included') + '. Goals always use their own week, month or quarter.'));
    return c;
  }

  function tools() {
    var c = el('div', 'row end noprint');
    if (state.exportMsg) c.appendChild(el('span', 'muted', state.exportMsg));
    var allOpen = FOLDS.every(function (k) { return state.open[k]; });
    var f = el('button', null, allOpen ? 'Close all sections' : 'Open all sections'); f.type = 'button'; f.id = 'sa-foldall';
    f.addEventListener('click', function () { FOLDS.forEach(function (k) { state.open[k] = !allOpen; }); saveOpen(); render(); });
    var csv = el('button', null, 'Download CSV'); csv.type = 'button'; csv.id = 'sa-csv'; csv.disabled = !state.report;
    csv.addEventListener('click', downloadCsv);
    var pdf = el('button', 'red', 'PDF report'); pdf.type = 'button'; pdf.id = 'sa-pdf'; pdf.disabled = !state.report;
    pdf.addEventListener('click', printReport);
    [f, csv, pdf].forEach(function (x) { c.appendChild(x); });
    return c;
  }

  // A section that folds open and closed. kind 'sub' is a smaller fold inside a card.
  function fold(key, id, title, preview, nodes, kind) {
    var d = el('details', 'sec' + (kind ? ' ' + kind : '')); d.id = id;
    d.open = state.printing || !!state.open[key];
    d.addEventListener('toggle', function () { if (state.printing || state.open[key] === d.open) return; state.open[key] = d.open; saveOpen(); var b = document.getElementById('sa-foldall'); if (b) b.textContent = FOLDS.every(function (k) { return state.open[k]; }) ? 'Close all sections' : 'Open all sections'; });
    var sm = el('summary'); sm.id = 'sa-sum-' + key;
    var t = el('div', 'sum-t'); t.appendChild(el(kind === 'sub' ? 'h3' : 'h2', null, title)); if (preview) t.appendChild(el('span', 'muted', preview));
    sm.appendChild(t); sm.appendChild(el('span', 'chev'));
    d.appendChild(sm);
    var b = el('div', 'body'); nodes.forEach(function (x) { if (x) b.appendChild(x); }); d.appendChild(b);
    return d;
  }

  // ---------- sections ----------
  function headline() {
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
    var nm = metric('new_members'), ps = metric('pizzas_sent');
    var pv = (nm ? fmtVal(nm.kind, nm.value) + ' new members' : '') + (ps ? ', ' + fmtVal(ps.kind, ps.value) + ' pizzas delivered' : '');
    return fold('headline', 'sa-headline', 'Headline numbers', pv, [t]);
  }

  // What each email service has left. Brevo reports its remaining sends; SendFox shows once it is connected.
  function emailSection() {
    var svc = services();
    var c = el('div', 'card');
    var preview = '';
    svc.forEach(function (s) {
      var row = el('div', 'svc');
      var l = el('div'); l.appendChild(el('h3', null, s.name));
      var r = el('div');
      if (s.key === 'brevo' && s.ok && s.remaining != null) {
        r.appendChild(el('span', 'big', fmtInt(s.remaining)));
        l.appendChild(el('p', 'muted', 'Emails left to send' + (s.resets ? ' until the plan renews on ' + dayLong(s.resets) : '') + '.' + (s.shared_with ? ' This Brevo account is shared with ' + s.shared_with + ', so its emails use these too.' : '')));
        preview = 'Brevo: ' + fmtInt(s.remaining) + ' emails left' + (s.resets ? ' until ' + dayShort(s.resets) : '');
      } else if (!s.connected) {
        r.appendChild(el('span', 'pill st-no_data', 'Not connected'));
        l.appendChild(el('p', 'muted', s.key === 'sendfox' ? 'Shows here once SendFox is set up.' : 'No key saved for this service.'));
      } else if (s.ok === false) {
        r.appendChild(el('span', 'pill st-missed', 'Not reported'));
        l.appendChild(el('p', 'muted', s.name + ' did not answer just now. Reload the page to try again.'));
      } else {
        r.appendChild(el('span', 'pill st-on_track', 'Connected'));
        l.appendChild(el('p', 'muted', s.name + ' does not report how many emails are left.'));
      }
      row.appendChild(l); row.appendChild(r); c.appendChild(row);
    });
    if (!svc.length) c.appendChild(el('p', 'muted', 'The email services did not answer. Reload the page to try again.'));
    var b = state.report && state.report.budget;
    var c2 = el('div', 'card');
    c2.appendChild(el('h3', null, 'Slice of Thanks emails this month'));
    if (b) {
      var used = num(b.emails) || 0, budget = num(b.budget) || 10000, share = Math.round(used / budget * 1000) / 10;
      var p = el('p'); p.appendChild(el('span', 'big', fmtInt(used))); p.appendChild(el('span', 'muted', ' of the ' + fmtInt(budget) + ' monthly budget (' + share + '%) since ' + dayLong(b.month_start)));
      c2.appendChild(p);
      var m = el('div', 'meter'); var f = el('span'); f.style.width = Math.min(100, share) + '%'; f.style.background = share >= 90 ? 'var(--tomato)' : share >= 70 ? 'var(--mustard)' : 'var(--basil)'; m.appendChild(f); c2.appendChild(m);
      if (!preview) preview = fmtInt(used) + ' emails sent this month';
    }
    c2.appendChild(el('p', 'muted', 'Every email Slice of Thanks sends counts here, test accounts included.'));
    var g = el('div', 'grid'); g.appendChild(c); g.appendChild(c2);
    return fold('email', 'sa-email', 'Email sending', preview, [g]);
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
    var g = el('div', 'grid');
    var all = (state.report && state.report.funnel) || [];
    var preview = '';
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
      if (worst > 0) {
        c.appendChild(el('p', 'muted', 'Biggest drop: before "' + rows[worst].label + '" (red).'));
        if (f[0] === 'recipient') preview = 'Recipients drop off most before "' + rows[worst].label + '"';
      }
      g.appendChild(c);
    });
    return fold('funnels', 'sa-funnels', 'Where people drop off', preview, [g]);
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
    var g = el('div', 'grid');
    g.appendChild(dayChart('pizzas_sent', 'Pizzas delivered'));
    g.appendChild(dayChart('new_members', 'New members'));
    var days = (state.report && state.report.days) || [];
    return fold('trends', 'sa-trends', 'Day by day', days.length ? days.length + ' days of pizzas delivered and new members' : '', [g]);
  }

  function features() {
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
    var pv = feats.length && total ? 'Most used: ' + feats[0].label : '';
    return fold('features', 'sa-features', 'What senders use', pv, [g]);
  }

  function table() {
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
    t.appendChild(tb); wrap.appendChild(t); c.appendChild(wrap);
    return fold('table', 'sa-all-metrics', 'Every number', sum().length + ' numbers, each with what it counts', [c]);
  }

  // ---------- CSV download ----------
  function cell(v) { var s = v == null ? '' : String(v); return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }
  function csvLine(arr) { return arr.map(cell).join(','); }
  function plain(kind, v) { v = num(v); return v == null || isNaN(v) ? '' : Math.round(v * 100) / 100; }

  function buildCsv() {
    var rep = state.report, r = rep.range, out = [];
    out.push(csvLine(['Slice of Thanks Analytics']));
    out.push(csvLine(['Dates', r.from + ' to ' + r.to, r.real ? 'Real accounts only' : 'Test accounts included']));
    out.push(csvLine(['Before means', r.prev_from + ' to ' + r.prev_to]));
    out.push(csvLine(['Downloaded', when(new Date().toISOString())]));
    out.push('');
    out.push(csvLine(['GOALS']));
    out.push(csvLine(['Goal', 'Period', 'Better when', 'Target', 'So far', 'Pace for today', 'Status', 'Period start', 'Period end', 'Last period result', 'Last period status']));
    goalsList().forEach(function (g) {
      out.push(csvLine([g.label, PERIOD_EACH[g.period], g.better, plain(g.kind, g.target), plain(g.kind, g.value), isCountish(g) ? plain(g.kind, g.pace) : '', STATUS[g.status] || g.status, g.period_start, g.period_end, plain(g.kind, g.prev_value), g.prev_status ? STATUS[g.prev_status] || g.prev_status : '']));
    });
    out.push('');
    out.push(csvLine(['PAST GOAL RESULTS']));
    out.push(csvLine(['Goal', 'Period', 'Period start', 'Period end', 'Target', 'Result', 'Status', 'Ended on']));
    var kinds = {}; sum().forEach(function (m) { kinds[m.metric] = m.kind; });
    historyList().forEach(function (h) { var k = kinds[h.metric] || 'count'; out.push(csvLine([h.label, h.period, h.period_start, h.period_end, plain(k, h.target), plain(k, h.value), STATUS[h.status] || h.status, h.ended_on || ''])); });
    out.push('');
    out.push(csvLine(['EVERY NUMBER']));
    out.push(csvLine(['Group', 'Metric', 'Kind', 'These dates', 'Before', 'What it counts']));
    var gname = {}; GROUPS.forEach(function (g) { gname[g[0]] = g[1]; });
    sum().forEach(function (m) { out.push(csvLine([gname[m.area] || m.area, m.label, m.kind === 'rate' ? 'percent' : m.kind === 'money' ? 'dollars' : 'count', plain(m.kind, m.value), m.kind === 'now' ? '' : plain(m.kind, m.prev), m.definition])); });
    out.push('');
    out.push(csvLine(['DAY BY DAY']));
    var days = rep.days || [];
    var cols = days.length ? Object.keys(days[0]).filter(function (k) { return k !== 'day'; }) : [];
    out.push(csvLine(['Day'].concat(cols.map(function (k) { return k.replace(/_/g, ' '); }))));
    days.forEach(function (d) { out.push(csvLine([d.day].concat(cols.map(function (k) { return d[k]; })))); });
    out.push('');
    out.push(csvLine(['HOW THEY HEARD ABOUT US']));
    out.push(csvLine(['Answer', 'Members']));
    (rep.heard || []).forEach(function (h) { out.push(csvLine([h.answer, h.n])); });
    out.push('');
    out.push(csvLine(['FUNNELS']));
    out.push(csvLine(['Funnel', 'Step', 'Label', 'Count']));
    (rep.funnel || []).forEach(function (f) { out.push(csvLine([f.funnel, f.step, f.label, f.n])); });
    out.push('');
    out.push(csvLine(['EMAIL SENDING']));
    out.push(csvLine(['Service', 'Status', 'Emails left', 'Renews on']));
    services().forEach(function (s) { out.push(csvLine([s.name, !s.connected ? 'Not connected' : s.ok === false ? 'Not reported' : 'Connected', s.remaining == null ? '' : s.remaining, s.resets || ''])); });
    if (rep.budget) out.push(csvLine(['Slice of Thanks emails this month', '', rep.budget.emails, 'Budget ' + rep.budget.budget]));
    return '﻿' + out.join('\r\n') + '\r\n';
  }

  function downloadCsv() {
    if (!state.report) return;
    try {
      var r = state.report.range;
      var blob = new Blob([buildCsv()], { type: 'text/csv;charset=utf-8' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url; a.download = 'slice-of-thanks-analytics-' + r.from + '-to-' + r.to + '.csv';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
      state.exportMsg = 'CSV downloaded.';
    } catch (e) { state.exportMsg = 'The CSV did not download. Try again.'; }
    render();
  }

  // ---------- PDF report: every section open, then the browser's print window (choose Save as PDF) ----------
  function printReport() {
    if (!state.report || state.printing) return;
    state.printing = true;
    render();
    var spot = document.createComment('sot-admin');
    var home = root.parentNode;
    home.insertBefore(spot, root);
    document.body.appendChild(root);
    document.documentElement.classList.add('sa-print');
    var y = window.scrollY;
    window.scrollTo(0, 0);
    var done = false;
    function back() {
      if (done) return; done = true;
      window.removeEventListener('afterprint', back);
      document.documentElement.classList.remove('sa-print');
      if (spot.parentNode) { spot.parentNode.insertBefore(root, spot); spot.parentNode.removeChild(spot); }
      state.printing = false;
      state.exportMsg = 'In the print window, pick Save as PDF to keep the report.';
      render();
      window.scrollTo(0, y);
    }
    window.addEventListener('afterprint', back);
    setTimeout(function () { try { window.print(); } catch (e) { back(); } }, 60);
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
    if (state.report) {
      wrap.appendChild(goalsPanel());
      wrap.appendChild(filters());
      wrap.appendChild(tools());
      [headline(), emailSection(), funnels(), trends(), features(), table()].forEach(function (x) { wrap.appendChild(x); });
      wrap.appendChild(el('p', 'muted', 'Slice of Thanks owner dashboard ' + VERSION + '. Numbers leave out test pizzas unless the box above is ticked. Only this account can open this page.'));
    }
    root.appendChild(wrap);
    if (!state.editing) Object.keys(keep).forEach(function (id) { var e = document.getElementById(id); if (e && keep[id] !== undefined && !e.disabled) e.value = keep[id]; });
    if (focus) { var f = document.getElementById(focus); if (f) f.focus({ preventScroll: true }); }
  }

  addStyles();
  // the Refresh button wakes up when its 5 minute wait is over
  setInterval(function () {
    var s = state.report && state.report.status;
    if (s && s.refresh_ready_at && Date.parse(s.refresh_ready_at) <= Date.now() && !state.refreshing && !state.printing) {
      var b = document.getElementById('sa-refresh');
      if (b && b.disabled) { state.refMsg = ''; render(); }
    }
  }, 15000);
  window.SOT_ADMIN = { version: VERSION, state: state, reload: load, csv: function () { return state.report ? buildCsv() : ''; } };
  load();
})();
