/* ===== Slice of Thanks live layer v0.19.4 =====
   Inserted at the end of the prototype's main scope by tools/build_app.py.
   Connects the approved prototype screens to Supabase: session, plan, credits, profile, logo, terms, address, consent, real sends and BD checkout. */
const LIVE = (function () {
  const host = SOTR.host;
  const API = host.getAttribute('data-api') || 'https://cmnclubiarmthibqibuj.supabase.co/functions/v1/api';
  const TOKEN = host.getAttribute('data-token') || '';
  const SIGNUP = host.getAttribute('data-signup-url') || '/join';
  /* BD's login page sends the member back to loc after logging in */
  const LOGIN = (host.getAttribute('data-login-url') || '/login') + '?loc=' + encodeURIComponent(location.pathname || '/kitchen');
  const UPGRADE = host.getAttribute('data-upgrade-url') || '/join';
  const ATTR_URL = { special_delivery: 'data-special-url', pack_100: 'data-pack100-url', pack_500: 'data-pack500-url', pack_1000: 'data-pack1000-url' };
  const SITE = 'https://www.sliceofthanks.app';
  let session = null;

  async function call(path, body) {
    const opt = { method: body ? 'POST' : 'GET', headers: { 'x-sot-auth': TOKEN } };
    if (body) { opt.headers['content-type'] = 'application/json'; opt.body = JSON.stringify(body); }
    const r = await fetch(API + path, opt);
    const j = await r.json().catch(() => ({}));
    if (r.status === 401) j.code = 'not_signed_in';
    return j;
  }
  /* BD Digital Product checkout link: set on the SOT-App widget, or in Supabase app_settings checkout_urls */
  function checkoutUrl(key) { return host.getAttribute(ATTR_URL[key] || '') || (session && session.checkout && session.checkout[key]) || ''; }
  return { API, TOKEN, SIGNUP, LOGIN, UPGRADE, SITE, call, checkoutUrl, get session() { return session; }, set session(s) { session = s; } };
})();

/* --- Remove prototype-only sample data and controls --- */
meetings = [];
contacts.length = 0;
['name', 'business', 'link', 'note', 'sign'].forEach(k => { if (!store.get('profile', null)) profile[k] = ''; });
profile.linkLabel = profile.linkLabel || 'Book a follow-up';
$('#veganDefault').addEventListener('change', e => { if (LIVE.TOKEN) LIVE.call('/profile', { profile: { prefs: { vegan_default: e.target.checked } } }); });
(function hideProtoBits() {
  const rg = $('#resetGuest'); if (rg) { const c = rg.closest('.card'); if (c) c.hidden = true; }
  const ac = $('#adminCard'); if (ac) ac.hidden = true;
  SOTR.querySelectorAll('.signboard .tag').forEach(t => { t.hidden = true; });
  SOTR.querySelectorAll('p.muted').forEach(p => {
    if (p.textContent.indexOf('The link is a sample') === 0) p.hidden = true;
    if (p.textContent.indexOf('The prototype uses a sample calendar') === 0) {
      p.textContent = 'Calendly and TidyCal connections arrive in the next update. Your meetings will show on Home, and you choose which ones get a pizza.';
      const row = p.nextElementSibling; if (row && row.classList.contains('btn-row')) row.hidden = true;
    }
  });
})();

/* --- Real sign in only: the prototype's demo sign in goes to the BD login page --- */
store.set('account', null);
$('#gateSignin').onclick = () => {
  store.set('draft', { pizza: cleanPizza(pizza), box: JSON.parse(JSON.stringify(box)), at: Date.now() });
  location.href = LIVE.LOGIN;
};

/* --- Email only for now (text messages are built in but switched off) --- */
const _renderSend = renderSend;
renderSend = function () {
  box.method = 'email';
  _renderSend();
  const gb = $('#guestBox'); if (gb) gb.hidden = true;
  if (!account && !editingSignature) $('#sendNow').textContent = 'Send pizza';
  const mc = $('#methodChips'); if (mc) { const f = mc.closest('.field'); if (f) f.hidden = true; }
  const lab = SOTR.querySelector('label[for="toContact"]'); if (lab) lab.textContent = 'Their email';
  liveSendExtras();
};

/* Country and permission fields on the Send step, in People and on CSV lists */
const COUNTRIES = [['US', 'United States'], ['CA', 'Canada'], ['GB', 'United Kingdom'], ['AU', 'Australia'], ['MX', 'Mexico'], ['ES', 'Spain'], ['DE', 'Germany'], ['FR', 'France'], ['IE', 'Ireland'], ['NL', 'Netherlands'], ['OTHER', 'Another country']];
const BASIS_OPTIONS = '<option value="one_to_one">We just met (a one-to-one thank-you)</option>' +
  '<option value="relationship">We work together now</option>' +
  '<option value="permission">They said I can message them</option>';
function countryOptions(sel, value) {
  COUNTRIES.forEach(([v, l]) => { const o = document.createElement('option'); o.value = v; o.textContent = l; sel.appendChild(o); });
  sel.value = COUNTRIES.some(x => x[0] === value) ? value : 'US';
}
function liveSendExtras() {
  if ($('#liveCountry')) return;
  const sf = $('#sendFields'); if (!sf) return;
  const wrap = document.createElement('div'); wrap.className = 'two';
  const c = document.createElement('div'); c.className = 'field';
  c.innerHTML = '<label for="liveCountry">Their country</label><select id="liveCountry"></select>';
  countryOptions(c.querySelector('select'), store.get('lastCountry', 'US'));
  const b = document.createElement('div'); b.className = 'field';
  b.innerHTML = '<label for="liveBasis">How you know them</label><select id="liveBasis">' + BASIS_OPTIONS + '</select>';
  wrap.append(c, b);
  const lang = document.createElement('div'); lang.className = 'field';
  lang.innerHTML = '<label for="liveLang">Their language</label><select id="liveLang"><option value="en">English</option><option value="es">Español</option></select>';
  sf.insertBefore(wrap, sf.children[1] || null);
  sf.insertBefore(lang, wrap.nextSibling);
  const cr = document.createElement('div'); cr.className = 'two'; cr.id = 'liveCoRole';
  cr.innerHTML = '<div class="field"><label for="liveCompany">Their company</label><input type="text" id="liveCompany" maxlength="120"></div>' +
    '<div class="field"><label for="liveRole">Their role</label><input type="text" id="liveRole" maxlength="80"></div>';
  sf.insertBefore(cr, wrap);
  cr.querySelector('#liveCompany').addEventListener('input', e => { box.company = e.target.value; });
  cr.querySelector('#liveRole').addEventListener('input', e => { box.role = e.target.value; });
}
/* Their company and role only matter when the note uses [company] or [role] */
function showCoRole() {
  const cr = $('#liveCoRole'); if (!cr) return;
  const n = (box.note || '').toLowerCase(), co = n.indexOf('[company]') >= 0 || n.indexOf('{company}') >= 0, ro = n.indexOf('[role]') >= 0;
  cr.hidden = !co && !ro; cr.children[0].hidden = !co; cr.children[1].hidden = !ro;
  $('#liveCompany').value = box.company || ''; $('#liveRole').value = box.role || '';
}

/* --- A small sheet for terms, address and other prompts --- */
function liveSheet(title, bodyEl, actions) {
  let back = $('#liveSheet');
  if (!back) { back = document.createElement('div'); back.id = 'liveSheet'; back.className = 'sheet-back'; back.setAttribute('role', 'dialog'); back.setAttribute('aria-modal', 'true'); SOTR.querySelector('.wrap').appendChild(back); }
  back.innerHTML = '';
  const sh = document.createElement('div'); sh.className = 'sheet';
  const h = document.createElement('h2'); h.textContent = title; sh.appendChild(h);
  if (bodyEl) sh.appendChild(bodyEl);
  const row = document.createElement('div'); row.className = 'btn-row';
  actions.forEach(a => { const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'btn' + (a.primary ? ' primary' : ''); btn.textContent = a.label; btn.onclick = a.run; row.appendChild(btn); });
  const cancel = document.createElement('button'); cancel.type = 'button'; cancel.className = 'btn ghost'; cancel.textContent = 'Cancel'; cancel.onclick = () => { back.hidden = true; };
  if (actions.length) row.appendChild(cancel); sh.appendChild(row); back.appendChild(sh); back.hidden = false;
  return back;
}
/* Sheets fit the visible screen. On some phones and site layouts a fixed overlay is measured from the page
   instead of the screen, which pushed the bottom of a sheet out of view. This measures and corrects it. */
function fitSheet(back) {
  if (!back || back.hidden) return;
  back.style.transform = ''; back.style.height = ''; back.style.width = '';
  const vv = window.visualViewport, r = back.getBoundingClientRect();
  const top = vv ? vv.offsetTop : 0, left = vv ? vv.offsetLeft : 0, h = vv ? vv.height : innerHeight, w = vv ? vv.width : innerWidth;
  const dx = left - r.left, dy = top - r.top;
  if (Math.abs(dx) > 1 || Math.abs(dy) > 1 || Math.abs(r.height - h) > 1) {
    back.style.transform = 'translate(' + dx + 'px,' + dy + 'px)'; back.style.height = h + 'px'; back.style.width = w + 'px'; back.style.bottom = 'auto'; back.style.right = 'auto';
  }
  back.querySelectorAll(':scope > .sheet').forEach(sh => { sh.style.maxHeight = Math.max(240, h - 32) + 'px'; });
}
function fitOpenSheets() { SOTR.querySelectorAll('.sheet-back').forEach(b => { if (!b.hidden) fitSheet(b); }); }
new MutationObserver(() => fitOpenSheets()).observe(SOTR, { subtree: true, attributes: true, attributeFilter: ['hidden'], childList: true });
window.addEventListener('scroll', fitOpenSheets, { passive: true });
window.addEventListener('resize', fitOpenSheets);
if (window.visualViewport) { window.visualViewport.addEventListener('resize', fitOpenSheets); window.visualViewport.addEventListener('scroll', fitOpenSheets); }
/* Everything this app keeps in the browser: sot_ in the live app (build_app.py renames zabreak_), zabreak_ in the prototype */
function clearLocal() { try { Object.keys(localStorage).filter(k => k.indexOf('sot_') === 0 || k.indexOf('zabreak_') === 0).forEach(k => localStorage.removeItem(k)); } catch (e) {} }
function closeLiveSheet() { const b = $('#liveSheet'); if (b) b.hidden = true; }

function askTerms(then) {
  const upd = !!(LIVE.session && LIVE.session.terms_updated);
  const a = (path, label) => '<a href="' + LIVE.SITE + path + '" target="_blank" rel="noopener">' + label + '</a>';
  const p = document.createElement('div');
  p.innerHTML = (upd ? '<p class="muted" style="margin:0 0 10px">We updated our legal documents. Please review and agree to keep sending.</p>' : '') +
    '<label class="check" style="display:flex;gap:8px;align-items:flex-start"><input type="checkbox" id="liveTermsBox"> <span>I agree to the ' +
    a('/terms', 'Terms of Service') + ', ' + a('/privacy', 'Privacy Policy') + ', ' + a('/acceptable-use', 'Acceptable Use Policy') + ' and ' + a('/dpa', 'Data Processing Agreement') +
    '. I will only send pizzas to people I have permission to contact.</span></label>';
  liveSheet(upd ? 'We updated our terms' : 'One quick thing', p, [{ label: 'Agree and continue', primary: true, run: async () => {
    if (!$('#liveTermsBox').checked) { toast('Check the box to continue.'); return; }
    const r = await LIVE.call('/terms/accept', {});
    if (!r || !r.ok) { toast(MSG.server_error); return; }
    if (LIVE.session) { LIVE.session.needs_terms = false; LIVE.session.terms_updated = false; }
    closeLiveSheet(); then();
  } }]);
}
function askAddress(then) {
  const p = document.createElement('div');
  p.innerHTML = '<p class="muted">Anti-spam laws require your business mailing address in every email. A PO box or virtual mailbox works. It shows in small print at the bottom of the email.</p><div class="field"><label for="liveAddr">Business mailing address</label><textarea id="liveAddr" maxlength="300" rows="3"></textarea></div>';
  liveSheet('Add your mailing address', p, [{ label: 'Save and continue', primary: true, run: async () => {
    const v = $('#liveAddr').value.trim(); if (v.length < 8) { toast('Add your full mailing address.'); return; }
    await LIVE.call('/profile', { profile: { mailing_address: v } }); if (LIVE.session) LIVE.session.profile.mailing_address = v; closeLiveSheet(); then();
  } }]);
}

/* --- Plan, credits and upgrade --- */
function applySession(s) {
  LIVE.session = s;
  account = { name: s.profile.display_name || 'You', email: '' };
  viewAs = s.plan === 'free' ? 'free' : 'pro';
  const pr = s.profile;
  if (pr.display_name) profile.name = pr.display_name;
  if (pr.business_name) profile.business = pr.business_name;
  if (pr.logo_url) profile.logo = pr.logo_url;
  if (pr.brand_color_1) profile.brand1 = pr.brand_color_1;
  if (pr.brand_color_2) profile.brand2 = pr.brand_color_2;
  if (!profile.sign && pr.display_name) profile.sign = 'Warmly, ' + first(pr.display_name);
  /* Gerald's intro shows once per member, on every device: the account remembers it */
  const prefs = s.prefs || {};
  if (prefs.met_gerald) store.set('metGerald', true);
  /* Vegan by default lives on the account, so it follows the member to every device */
  if (typeof prefs.vegan_default === 'boolean' && prefs.vegan_default !== !!settings.veganDefault) { settings.veganDefault = prefs.vegan_default; store.set('settings', settings); if (!pizza.toppings.length) { pizza.vegan = settings.veganDefault; pizza.cheese = swapCheese(cheeseKey(pizza), pizza.vegan); } }
  else if (store.get('metGerald', false)) LIVE.call('/profile', { profile: { prefs: { met_gerald: true } } });
  refreshPlan(true);
}
const _renderPlanCard = renderPlanCard;
renderPlanCard = function () {
  _renderPlanCard();
  const s = LIVE.session; const el = $('#planCard'); if (!s || !el) return;
  const names = { free: 'A Slice', pro: 'The Whole Pie', team: 'Pizza Party' };
  const h = el.querySelector('h2'); if (h) h.textContent = 'Your plan: ' + (names[s.plan] || s.plan);
  const c = s.credits || {}; const p = el.querySelector('p.muted');
  if (p) p.textContent = 'Emails left this month: ' + (c.monthly || 0) + (c.pack ? ' plus ' + c.pack + ' from email packs' : '') + (c.special_delivery ? '. Special Deliveries: ' + c.special_delivery : '') + '.';
  const bar = el.querySelector('.usage'); if (bar) bar.hidden = true;
  if (p && c.pack && s.pack_next_expiry) p.textContent += ' Pack emails are used after your monthly ones and last 12 months from purchase.';
  const row = el.querySelector('.btn-row');
  if (row && s.plan !== 'free' && !$('#planPacks')) {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'btn small'; b.id = 'planPacks'; b.textContent = 'Buy more emails'; b.onclick = openPacks;
    row.insertBefore(b, row.firstChild);
  }
};

/* --- Email packs: Pro and Team only. Bought as BD Digital Products, credited by Supabase. --- */
function goCheckout(key, url) {
  const c = (LIVE.session && LIVE.session.credits) || {};
  store.set('checkoutPending', { key, at: Date.now(), pack: c.pack || 0, special: c.special_delivery || 0 });
  location.href = url;
}
function openPacks() {
  closeUp();
  const packs = (LIVE.session && LIVE.session.packs) || [];
  const p = document.createElement('div');
  p.innerHTML = '<p class="muted" style="margin:0 0 12px">Out of monthly emails or sending a big batch? Packs are used after your monthly emails, last 12 months, and can be refunded within 14 days if you have not used them.</p>';
  liveSheet('Buy more emails', p, packs.map((k, i) => ({
    label: Number(k.emails).toLocaleString('en-US') + ' emails, $' + (k.price_cents / 100).toFixed(0), primary: i === 0,
    run: () => { const u = LIVE.checkoutUrl(k.key); if (!u) { toast('Email packs open soon.'); return; } goCheckout(k.key, u); }
  })));
}

/* Back from checkout: ask Supabase to check BD for the payment, a few times while BD finishes */
let wantSpecial = false;
let checkTries = 0;
async function checkPurchases() {
  const pend = store.get('checkoutPending', null);
  if (!pend || !LIVE.session) return;
  if (Date.now() - (pend.at || 0) > 2 * 3600e3) { store.set('checkoutPending', null); return; }
  const s = await LIVE.call('/purchases/check', {});
  if (!s || !s.member_id) return;
  const c = s.credits || {};
  const gotPack = (c.pack || 0) > (pend.pack || 0);
  const gotSpecial = (c.special_delivery || 0) > (pend.special || 0);
  LIVE.session = s; renderPlanCard();
  if (gotPack || gotSpecial) {
    store.set('checkoutPending', null); checkTries = 0;
    if (gotSpecial && (wantSpecial || pend.key === 'special_delivery') && !specialOn) { wantSpecial = false; startSpecial(true); toast('Payment received. Special Delivery is on for this pizza.'); }
    else toast(gotPack ? 'Payment received. ' + ((c.pack || 0) - (pend.pack || 0)).toLocaleString('en-US') + ' more emails are ready.' : 'Payment received. Your Special Delivery is ready.');
    burst('gold');
    return;
  }
  if (++checkTries < 6) setTimeout(checkPurchases, 6000);
  else { checkTries = 0; toast('We have not seen the payment yet. It will show up here as soon as it clears.'); }
}
document.addEventListener('visibilitychange', () => { if (!document.hidden && checkTries === 0) checkPurchases(); });
/* Logged-in members change plans on BD's upgrade page, so they keep one account */
goPro = function () { closeUp(); location.href = bdLink('change_plan', '/account/upgrade'); };

/* --- Special Delivery: $2.99 one time, A Slice only. Unlocks Pro features for one pizza and includes its send. --- */
let specialOn = false;
function planView() { return LIVE.session && LIVE.session.plan !== 'free' ? 'pro' : 'free'; }
function startSpecial(quiet) {
  specialOn = true; viewAs = 'pro'; refreshPlan();
  if (!quiet) toast('Special Delivery is on. Pro features are unlocked for this pizza.');
}
function endSpecial() { if (!specialOn) return; specialOn = false; viewAs = planView(); refreshPlan(); }
function offerSpecial() {
  closeUp();
  if (!account) { $('#sendNow').onclick(); return; }
  const have = (LIVE.session && LIVE.session.credits && LIVE.session.credits.special_delivery) || 0;
  if (have > 0) { startSpecial(); return; }
  const p = document.createElement('p'); p.className = 'muted';
  p.textContent = 'For a one-time $2.99, this pizza gets everything in The Whole Pie: your logo, brand colors, all box styles, Pro confetti and toppings, a gift code, and your own button. The send is included, so it does not use one of your 10 monthly emails.';
  liveSheet('Special Delivery', p, [
    { label: 'Get Special Delivery for $2.99', primary: true, run: () => {
      const u = LIVE.checkoutUrl('special_delivery');
      if (!u) { toast('Special Delivery checkout opens soon.'); return; }
      store.set('draft', { pizza: cleanPizza(pizza), box: JSON.parse(JSON.stringify(box)), at: Date.now(), special: true });
      goCheckout('special_delivery', u);
    } },
    { label: 'Not now', run: closeLiveSheet }
  ]);
}
$('#upYearly').onclick = offerSpecial;
const _upgrade = upgrade;
upgrade = function (key) {
  _upgrade(key);
  const free = !LIVE.session || LIVE.session.plan === 'free';
  $('#upYearly').hidden = !free;
  $('#upNote').textContent = free
    ? 'The Whole Pie is $9 a month or $90 a year, with 250 emails a month. Cancel anytime. Special Delivery is a one-time $2.99 that unlocks these features for one pizza and includes its send.'
    : 'The Whole Pie is $9 a month or $90 a year, with 250 emails a month. Cancel anytime.';
};
const _renderPlanCard2 = renderPlanCard;
renderPlanCard = function () {
  _renderPlanCard2();
  const t = $('#planTeam'); if (t) t.onclick = openPlans;
  const b = $('#planBilling'); if (b) b.onclick = () => { const c = $('#liveBilling'); if (c) { openFold(c); c.scrollIntoView({ behavior: 'smooth', block: 'start' }); } };
};

/* --- Billing inside the app: plan, payment history, change plan. Card details stay on BD's secure page. --- */
let billing = null; let billingAt = 0;
const PLAN_NAMES = { free: 'A Slice', pro: 'The Whole Pie', team: 'Pizza Party' };
function money(c) { return '$' + (c / 100).toFixed(2); }
function shortDate(iso) { return iso ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''; }
function bdLink(k, fallback) { return (billing && billing.links && billing.links[k]) || fallback; }
function billingCard() {
  let c = $('#liveBilling');
  if (!c) {
    const plan = $('#planCard'); if (!plan) return null;
    c = document.createElement('div'); c.className = 'card'; c.id = 'liveBilling';
    plan.after(c);
  }
  return c;
}
function renderBilling() {
  const c = billingCard(); const s = LIVE.session; if (!c || !s) return;
  c.innerHTML = '';
  const h = document.createElement('h2'); h.textContent = 'Billing'; c.appendChild(h);
  const lead = document.createElement('p'); lead.className = 'muted'; lead.style.margin = '4px 0 10px';
  lead.textContent = 'Your plan: ' + (PLAN_NAMES[s.plan] || s.plan) + '. Payments are handled securely by our checkout; we never see your card number.';
  c.appendChild(lead);
  const list = document.createElement('ul'); list.className = 'feed'; list.id = 'liveInvoices';
  if (!billing) { const li = document.createElement('li'); li.innerHTML = '<span class="muted">Loading your payment history...</span>'; list.appendChild(li); }
  else if (!billing.invoices || !billing.invoices.length) { const li = document.createElement('li'); li.innerHTML = '<span class="muted">No payments yet.</span>'; list.appendChild(li); }
  else billing.invoices.slice(0, 12).forEach(inv => {
    const li = document.createElement('li');
    const st = (inv.status || '').toLowerCase();
    const row = document.createElement('div'); row.className = 'row-h';
    const d = document.createElement('span'); d.className = 'feed-date'; d.textContent = shortDate(inv.date) + ' · Invoice ' + inv.number;
    const pill = document.createElement('span'); pill.className = 'pill' + (st === 'paid' ? ' ok' : st === 'unpaid' ? ' wait' : ''); pill.textContent = inv.status || '';
    row.append(d, pill);
    const what = document.createElement('b'); what.textContent = (inv.items || []).map(i => i.description).filter(Boolean).join(', ') || 'Payment';
    const amt = document.createElement('span'); amt.textContent = money(inv.totalCents) + (inv.paidAt ? ' · paid ' + shortDate(inv.paidAt) : '');
    li.append(row, what, amt); list.appendChild(li);
  });
  c.appendChild(list);
  const btns = document.createElement('div'); btns.className = 'btn-row';
  const cp = document.createElement('button'); cp.type = 'button'; cp.className = 'btn small primary'; cp.textContent = 'Change plan'; cp.onclick = openPlans;
  const card = document.createElement('button'); card.type = 'button'; card.className = 'btn small'; card.textContent = 'Update card or billing address';
  card.onclick = openCardSheet;
  btns.append(cp, card);
  if (s.plan !== 'free') { const pk = document.createElement('button'); pk.type = 'button'; pk.className = 'btn small'; pk.textContent = 'Buy more emails'; pk.onclick = openPacks; btns.appendChild(pk); }
  c.appendChild(btns);
  const cu = $('#liveContact'); if (cu) cu.hidden = !bdLink('contact', '');
  const last = billing && billing.invoices && billing.invoices[0];
  autoFold(c, 'billing', last ? 'Last payment ' + shortDate(last.paidAt || last.date) + ', ' + money(last.totalCents) + '. Invoices, card and billing address.' : 'Invoices, card and billing address');
}
/* Card and billing address: BD's secure billing page opens in a new tab, where its card form works as BD built it.
   The app stays open in this tab and refreshes the Billing card when the member comes back.
   (v0.13.0 to v0.13.2 showed the page inside the app; BD's add-card form would not open there.) */
let cardTabOpen = false;
function openCardSheet() {
  const url = bdLink('billing', '/account/billing');
  const p = document.createElement('div');
  p.innerHTML = '<p style="margin:0 0 8px">Your card and billing address are kept on our secure checkout, so your card number never touches the app.</p>' +
    '<ol class="muted" style="margin:0 0 4px 18px;padding:0;font-size:.92rem"><li>Tap Open secure billing. It opens in a new tab.</li><li>Use Add New Credit Card or Billing Address there.</li><li>Tap Back to the Kitchen at the top when you are done. Your Billing card updates on its own.</li></ol>';
  liveSheet('Card and billing address', p, [{ label: 'Open secure billing', primary: true, run: () => {
    const w = window.open(url, '_blank');
    if (!w) { location.href = url; return; }
    try { w.opener = null; } catch (e) {}
    cardTabOpen = true; closeLiveSheet(); toast('Billing opened in a new tab. Come back here when you are done.');
  } }]);
}
/* Open one of BD's pages in a new tab (same tab if pop-ups are blocked) */
function openBdTab(url) {
  if (!url) return;
  const w = window.open(url, '_blank');
  if (!w) { location.href = url; return; }
  try { w.opener = null; } catch (e) {}
}
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && cardTabOpen) { cardTabOpen = false; loadBilling(true); }
});
async function loadBilling(force) {
  if (!LIVE.session) return;
  if (!force && billing && Date.now() - billingAt < 60000) { renderBilling(); return; }
  renderBilling();
  const r = await LIVE.call('/billing');
  billing = r && r.ok ? r : { invoices: [], links: {} }; billingAt = Date.now();
  renderBilling();
}
/* Plan picker: the three plans, each to BD's checkout for that plan */
function openPlans() {
  closeUp();
  const s = LIVE.session; const cur = s ? s.plan : 'free';
  const plans = [
    ['free', 'A Slice', 'Free. 10 emails a month, Kraft and Classic boxes.', 'checkout_free', '/checkout/10'],
    ['pro', 'The Whole Pie', '$9 a month or $90 a year. 250 emails a month, your logo, gift codes and your own button.', 'checkout_pro', '/checkout/12'],
    /* Pizza Party (team seats) opens after launch: it is listed, without a checkout */
    ['team', 'Pizza Party', 'Team plan with shared seats. Coming soon.', '', '']
  ];
  const p = document.createElement('div');
  plans.forEach(([k, name, desc]) => {
    const d = document.createElement('div'); d.className = 'field';
    d.innerHTML = '<b>' + name + (k === cur ? ' (your plan)' : '') + '</b><br><span class="muted">' + desc + '</span>';
    p.appendChild(d);
  });
  const note = document.createElement('p'); note.className = 'muted'; note.style.fontSize = '.88rem';
  note.textContent = 'Next you pick the plan and confirm on our secure checkout. Your pizzas, contacts and settings stay the same.';
  p.appendChild(note);
  liveSheet('Change plan', p, [{ label: 'Continue to change plan', primary: true, run: () => { location.href = bdLink('change_plan', '/account/upgrade'); } }]);
}

/* Delete my account and data. A paid plan is cancelled first so nobody keeps paying for an account that is gone. */
function openDeleteSheet() {
  const s = LIVE.session; if (!s) return;
  const p = document.createElement('div');
  if (s.plan !== 'free') {
    p.innerHTML = '<p>You are on ' + (PLAN_NAMES[s.plan] || s.plan) + '. Cancel your plan first, so you are not billed again. Then come back here to delete your account.</p>' +
      '<p class="muted">In the billing page, open Subscriptions and cancel. If you do not see a way to cancel, use Contact Us and we cancel it for you.</p>';
    liveSheet('Cancel your plan first', p, [{ label: 'Cancel my plan', primary: true, run: openCardSheet }]);
    return;
  }
  p.innerHTML = '<p>This deletes your account and everything in it:</p><ul class="muted" style="margin:0 0 8px 18px;padding:0">' +
    '<li>Your People list and tags</li><li>Every pizza you made or sent, and their pizza pages (links stop working)</li>' +
    '<li>Your calendar connections, presets, box and settings</li><li>Your login</li></ul>' +
    '<p class="muted">We keep payment records and your terms acceptance because the law asks us to. People who unsubscribed stay unsubscribed. This cannot be undone.</p>' +
    '<div class="field"><label for="liveDelConfirm">Type DELETE to confirm</label><input type="text" id="liveDelConfirm" autocomplete="off" maxlength="10"></div>';
  const back = liveSheet('Delete my account and data', p, [{ label: 'Delete everything', primary: true, run: async () => {
    const v = ($('#liveDelConfirm').value || '').trim().toUpperCase();
    if (v !== 'DELETE') { toast('Type DELETE to confirm.'); return; }
    const btn = back.querySelector('.btn.primary'); btn.disabled = true; btn.textContent = 'Deleting...';
    const r = await LIVE.call('/account/delete', { confirm: 'DELETE' });
    if (r && r.ok) {
      clearLocal();
      const done = document.createElement('p'); done.textContent = 'Your account and data are deleted. Thank you for every pizza. Gerald and Potato will miss you.';
      liveSheet('Account deleted', done, []);
      setTimeout(() => { location.href = '/logout'; }, 4000);
      return;
    }
    btn.disabled = false; btn.textContent = 'Delete everything';
    toast(r && r.code === 'cancel_plan_first' ? 'Cancel your plan first, then try again.' : 'That did not go through. Try again in a minute.');
  } }]);
}

/* --- Profile and logo save to Supabase --- */
let profTimer = 0;
const _saveProfile = saveProfile;
saveProfile = function () {
  _saveProfile();
  if (!LIVE.session) return;
  clearTimeout(profTimer);
  pendingProfile = { display_name: profile.name, business_name: profile.business, brand_color_1: profile.brand1 || null, brand_color_2: profile.brand2 || null };
  profTimer = setTimeout(flushProfile, 800);
};
/* Saves right away when the page closes or reloads, so a change typed just before is not lost */
let pendingProfile = null;
function flushProfile(closing) {
  clearTimeout(profTimer);
  const p = pendingProfile; pendingProfile = null;
  if (!p || !LIVE.TOKEN) return;
  if (!closing) { LIVE.call('/profile', { profile: p }); return; }
  try { fetch(LIVE.API + '/profile', { method: 'POST', keepalive: true, headers: { 'x-sot-auth': LIVE.TOKEN, 'content-type': 'application/json' }, body: JSON.stringify({ profile: p }) }); } catch (e) { /* ignore */ }
}
addEventListener('pagehide', () => flushProfile(true));
document.addEventListener('visibilitychange', () => { if (document.hidden) flushProfile(true); });
const _handleLogo = handleLogo;
handleLogo = function (file) {
  _handleLogo(file);
  if (!LIVE.session || !file) return;
  setTimeout(async () => {
    if (!profile.logo || profile.logo.indexOf('data:image') !== 0) return;
    const r = await LIVE.call('/logo', { data_url: profile.logo });
    if (r.logo_url) { profile.logo = r.logo_url; _saveProfile(); }
  }, 600);
};

/* Reply-to in Settings. Every email carries the Slice of Thanks mailing address, so members never enter one (Stacey, 2026-10-24). */
(function settingsExtras() {
  const pb = $('#pBiz'); if (!pb) return;
  const r = document.createElement('div'); r.className = 'field';
  r.innerHTML = '<label for="liveReply">Replies go to</label><input type="text" id="liveReply" maxlength="200" inputmode="email" autocomplete="email"><small class="muted">Your email. When a guest replies, it comes here. We also tell you here when a meeting pizza is waiting.</small>';
  pb.closest('.field').after(r);
  /* Account card at the bottom of Settings: Log out (BD's /logout ends the session) and Delete my account */
  if (LIVE.TOKEN) {
    const ac = document.createElement('div'); ac.className = 'card'; ac.id = 'liveAccount';
    ac.innerHTML = '<h2>Account</h2><p class="muted" style="margin:4px 0 10px">Your login details live on our secure account pages. They open in a new tab.</p>' +
      '<div class="btn-row" style="margin-bottom:10px"><button class="btn small" type="button" id="liveAcctInfo">Name and email</button><button class="btn small" type="button" id="livePassword">Change password</button><button class="btn small" type="button" id="liveContact" hidden>Contact us</button></div>' +
      '<div class="btn-row"><button class="btn small" type="button" id="liveLogout">Log out</button><button class="btn small ghost" type="button" id="liveDelete" style="color:#b3261e">Delete my account and data</button></div>';
    $('#view-settings').appendChild(ac);
    $('#liveLogout').onclick = () => { clearLocal(); location.href = '/logout'; };
    /* BD's own account pages. Addresses can be changed in app_settings bd_links (manage_account, password, contact). */
    $('#liveAcctInfo').onclick = () => openBdTab(bdLink('manage_account', '/account/changelisting'));
    $('#livePassword').onclick = () => openBdTab(bdLink('password', '/account/password'));
    $('#liveContact').onclick = () => openBdTab(bdLink('contact', ''));
    $('#liveDelete').onclick = openDeleteSheet;
  }
  let t = 0;
  const save = () => { clearTimeout(t); t = setTimeout(() => LIVE.call('/profile', { profile: { reply_to: $('#liveReply').value.trim() } }), 800); };
  $('#liveReply').addEventListener('input', save);
  /* Changes save as they type; the Save button saves right away and says so */
  const row = document.createElement('div'); row.className = 'btn-row'; row.style.alignItems = 'center';
  row.innerHTML = '<button class="btn small primary" type="button" id="liveYouSave">Save</button><small class="muted" id="liveYouStatus">Changes save as you type.</small>';
  r.after(row);
  $('#liveYouSave').onclick = async () => {
    const rt = $('#liveReply').value.trim();
    if (rt && rt.indexOf('@') < 1) { toast('That email address does not look right.'); $('#liveReply').focus(); return; }
    clearTimeout(t); clearTimeout(profTimer); pendingProfile = null;
    const b = $('#liveYouSave'); b.disabled = true; b.textContent = 'Saving...';
    const res = await LIVE.call('/profile', { profile: { display_name: profile.name, business_name: profile.business, brand_color_1: profile.brand1 || null, brand_color_2: profile.brand2 || null, reply_to: rt } }).catch(() => null);
    b.disabled = false; b.textContent = 'Save';
    if (res && res.ok) { $('#liveYouStatus').textContent = 'Saved.'; toast('Saved.'); } else toast(MSG.server_error);
  };
})();
const _renderSettings = renderSettings;
renderSettings = function () {
  _renderSettings();
  try { if ($('#datesCard') && !dates.loaded) $('#datesCard').hidden = true; } catch (e) {}
  const s = LIVE.session; if (!s) return;
  loadBilling();
  if ($('#liveReply') && document.activeElement !== host) $('#liveReply').value = s.profile.reply_to || '';
};

const _geraldOk = $('#geraldOk').onclick;
$('#geraldOk').onclick = function () {
  _geraldOk();
  if (LIVE.session) { LIVE.session.prefs = Object.assign({}, LIVE.session.prefs, { met_gerald: true }); LIVE.call('/profile', { profile: { prefs: { met_gerald: true } } }); }
};

/* --- Features not switched on yet --- */

/* --- Sending for real --- */
function cleanPizza(p) { const c = JSON.parse(JSON.stringify(p)); Object.keys(c).forEach(k => { if (k.charAt(0) === '_') delete c[k]; }); return c; }
function boxPayload(bx) {
  const rw = bx.reward || {};
  const b = { style: bx.style, sticker: bx.sticker, confetti: bx.confetti, tone: bx.tone, note: bx.note, sign: bx.sign, meeting: bx.meeting,
    pro_style: PRO_STYLES.includes(bx.style) || PRO_CONF.includes(bx.confetti) };
  if (bx.topper && isPro()) { b.topper = bx.topper; b.pro_style = true; }
  /* Personal pizzas leave off the business name, logo, button and gift; the photo goes up before the send */
  if (bx.kind === 'personal') { b.personal = true; if ((bx.lidText || '').trim()) b.lid_text = bx.lidText.trim().slice(0, 40); if (isPro() && bx.photo && bx.photo.indexOf('http') === 0) b.photo_url = bx.photo; return b; }
  if (isPro() && bx.link) { b.cta_label = bx.linkLabel || 'Book a follow-up'; b.cta_url = bx.link; }
  if (isPro() && rw.code) b.gift = { text: rw.text || '', code: rw.code, url: rw.link || '', expires: rw.exp || '' };
  if (isPro() && profile.logo) b.logo_url = profile.logo;
  return b;
}
function buildPayload() {
  const b = boxPayload(box);
  let img = '';
  try { img = pizzaImage(pizza, false); } catch (e) { img = ''; }
  return {
    idem: (pizza.seed + '-' + box.contact + '-' + (box.to || '')).slice(0, 90),
    pizza: cleanPizza(pizza), box: b,
    recipient: { name: box.to.trim(), email: box.contact.trim(), company: (box.company || '').trim(), role: (box.role || '').trim(), country: $('#liveCountry') ? $('#liveCountry').value.replace('OTHER', '') : '', locale: $('#liveLang') ? $('#liveLang').value : 'en' },
    consent: { basis: $('#liveBasis') ? $('#liveBasis').value : 'one_to_one', method: 'Selected in the Kitchen at send', note: box.meeting || '' },
    send_type: 'one_to_one', special_delivery: specialOn, image_data_url: img.length < 1900000 ? img : '',
    label: box.meeting ? 'After ' + box.meeting.toLowerCase() : 'Fresh pizza'
  };
}
const MSG = {
  bad_email: 'That email address does not look right.',
  suppressed: 'This person asked not to get pizzas, so we can not send to them.',
  sending_paused: 'Sending is paused for a few minutes. Try again soon.',
  account_inactive: 'Your account is not active. Contact support.',
  no_credits: 'You are out of emails for this month.',
  test_inbox_only: 'Test pizzas only go to your own email, the one in Settings under Replies go to.',
  test_limit: 'You have used your 5 free test pizzas. Send it to them for real, or to yourself as a normal pizza.',
  not_signed_in: 'Your session timed out. Reload the page and sign in again.',
  server_error: 'Something went wrong on our side. Your pizza was not sent. Try again in a minute.'
};
async function liveSend() {
  if (!box.to.trim()) { $('#toName').focus(); toast('Add who the pizza is for.'); return; }
  if (!box.contact.trim() || box.contact.indexOf('@') < 1) { $('#toContact').focus(); toast('Add their email address.'); return; }
  if ($('#liveCountry')) store.set('lastCountry', $('#liveCountry').value);
  const btn = $('#sendNow'); btn.disabled = true; const label = btn.textContent; btn.textContent = 'Sending...';
  let r;
  if (box.kind === 'personal' && isPro() && box.photo && box.photo.indexOf('data:image') === 0) {
    let u = {}; try { u = await LIVE.call('/photo', { data_url: box.photo }); } catch (e) { u = {}; }
    if (!u.photo_url) { btn.disabled = false; btn.textContent = label; toast('The photo did not upload. Try again, or remove the photo.'); return; }
    box.photo = u.photo_url;
  }
  try { r = await LIVE.call('/send', buildPayload()); } catch (e) { r = { code: 'server_error' }; }
  btn.disabled = false; btn.textContent = label;
  if (r.ok && r.delivered === false && r.reason === 'provider_error') {
    toast('Potato could not deliver this one, and it did not use an email. Try again in a few minutes.'); return;
  }
  if (r.ok) {
    logSend({ who: box.to, org: '', contact: box.contact, vegan: pizza.vegan }, pizza, box, box.meeting ? 'After ' + box.meeting.toLowerCase() : 'Fresh pizza');
    if (LIVE.session && r.bucket && LIVE.session.credits[r.bucket] !== undefined) LIVE.session.credits[r.bucket]--;
    toast(r.due_now === false && box.sendAt ? 'Planned. Potato takes it to ' + first(box.to) + ' when the meeting ends.' : r.delivered === false && r.reason !== 'not_due' ? 'Saved. Delivery is retrying and should arrive shortly.' : 'Potato is on her way to ' + first(box.to) + '.');
    if (box.sendAt) loadCalendar();
    burst('envelopes'); store.set('draft', null); endSpecial(); show('today'); loadPeople(); return;
  }
  sendProblem(r, liveSend);
}
/* What to tell the member when a send is refused; retry runs the same send again after a fix */
function sendProblem(r, retry) {
  if (r.code === 'needs_terms') return askTerms(retry);
  if (r.code === 'needs_address') return askAddress(retry);
  if (r.code === 'needs_upgrade') { const f = (r.features || [])[0]; upgrade({ cta_button: 'button', gift: 'reward', logo: 'logo', pro_styles: 'style', scheduling: 'general' }[f] || 'general'); return; }
  if (r.code === 'needs_permission') {
    const p = document.createElement('p'); p.className = 'muted';
    p.textContent = 'Their country (' + r.region + ') needs a different kind of permission for this pizza. Change "How you know them" to the option that is true for this person. If none is true, ask them in person or by phone first.';
    liveSheet('Permission needed', p, [{ label: 'Got it', primary: true, run: closeLiveSheet }]); return;
  }
  if (r.code === 'no_credits') {
    if (specialOn) { toast('Your Special Delivery was already used. Get another to send this pizza.'); offerSpecial(); return; }
    toast(MSG.no_credits);
    if (LIVE.session && LIVE.session.plan !== 'free') openPacks(); else upgrade('general');
    return;
  }
  toast(MSG[r.code] || MSG.server_error);
}

$('#sendNow').onclick = () => {
  if (!account) {
    store.set('draft', { pizza: cleanPizza(pizza), box: JSON.parse(JSON.stringify(box)), at: Date.now() });
    liveSheet('Your pizza is ready to send', (() => { const p = document.createElement('div'); p.innerHTML = '<p>Potato has her helmet on. Make your free account and she delivers it.</p><p class="muted">It takes a minute. Your pizza is saved, and you come right back here to send it. Your first 14 days of The Whole Pie are free, no card needed.</p>'; return p; })(),
      [{ label: 'Create my free account', primary: true, run: () => { location.href = bdLink('checkout_free', '/checkout/10'); } }, { label: 'I already have an account', run: () => { location.href = LIVE.LOGIN; } }]);
    return;
  }
  liveSend();
};

/* --- People on real data: everyone the member has sent a pizza to, from Supabase --- */
function personFromServer(x) {
  return { id: x.id, name: x.name || x.email || 'No name', company: x.company || '', contact: x.email || '', vegan: !!x.vegan, notes: x.notes || '',
    country: x.country || '', hasConsent: !!x.has_consent, tags: Array.isArray(x.tags) ? x.tags : [], birthday: x.birthday || '', anniversary: x.anniversary || '',
    history: (x.history || []).filter(h => h.pizza).map(h => ({ date: shortDate(h.status === 'queued' && h.scheduled_for ? h.scheduled_for : h.at),
      label: h.status === 'queued' ? 'Scheduled' + (h.label ? ': ' + h.label : '') : (h.status === 'failed' ? 'Not delivered' : (h.label || 'Pizza')),
      pizza: h.pizza, box: h.box || {}, opened: !!h.opened, status: h.status })) };
}
async function loadPeople() {
  if (!account || !LIVE.TOKEN) return;
  const r = await LIVE.call('/people').catch(() => null);
  if (!r || !r.ok) return;
  contacts.length = 0;
  r.people.forEach(x => contacts.push(personFromServer(x)));
  if (!$('#view-people').hidden) renderPeople();
}
hintFor = function (c) {
  const l = c.history[0];
  if (!l) return 'No pizzas yet. Send a first one to start the conversation.';
  if (l.status === 'queued') return 'Your last pizza is scheduled and has not gone out yet.';
  if (l.status === 'failed') return 'Your last pizza could not be delivered. Check their email address and try again.';
  return l.opened ? 'They opened your last pizza. Good time for a follow-up pizza.' : 'Your last pizza has not been opened yet. Give it a few days before sending another.';
};
const _detailEl = detailEl;
detailEl = function (c) {
  const d = _detailEl(c);
  const q = sel => d.querySelector(sel);
  /* People added by hand have no permission on file yet: ask once, at their first pizza */
  if (!c.hasConsent) {
    const f = document.createElement('div'); f.className = 'two';
    f.innerHTML = '<div class="field"><label for="qsCountry">Their country</label><select id="qsCountry"></select></div>' +
      '<div class="field"><label for="qsBasis">How you know them</label><select id="qsBasis">' + BASIS_OPTIONS + '</select></div>';
    countryOptions(f.querySelector('#qsCountry'), c.country || store.get('lastCountry', 'US'));
    const row = q('#qsSend').closest('.btn-row'); row.parentNode.insertBefore(f, row);
  }
  q('#qsSend').onclick = () => peopleSend(c, q('#qsSend'));
  const notes = q('#pNotes'); let t = 0;
  notes.addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => LIVE.call('/people/save', { person: { id: c.id, notes: notes.value } }), 800); });
  return d;
};
async function peopleSend(c, btn) {
  if (!c.contact || c.contact.indexOf('@') < 1) { toast('Add an email address for ' + first(c.name) + ' first.'); return; }
  const { p, b } = qsBuild(c);
  const consent = $('#qsBasis') ? { basis: $('#qsBasis').value, method: 'Selected in People at send' } : null;
  const country = $('#qsCountry') ? $('#qsCountry').value.replace('OTHER', '') : c.country;
  let img = ''; try { img = pizzaImage(p, false); } catch (e) { img = ''; }
  const label = btn.textContent; btn.disabled = true; btn.textContent = 'Sending...';
  let r;
  try {
    r = await LIVE.call('/send', { idem: 'people-' + c.id + '-' + Date.now(), source: 'people', pizza: cleanPizza(p), box: boxPayload(b),
      recipient: { name: c.name, email: c.contact, company: c.company, role: c.role || '', vegan: c.vegan, country, locale: 'en' }, consent, send_type: 'one_to_one',
      label: qs.topic ? 'Follow-up: ' + qs.topic : 'Follow-up pizza', image_data_url: img.length < 1900000 ? img : '' });
  } catch (e) { r = { code: 'server_error' }; }
  btn.disabled = false; btn.textContent = label;
  if (r.ok && r.delivered === false && r.reason === 'provider_error') { toast('Potato could not deliver this one, and it did not use an email. Try again in a few minutes.'); return; }
  if (r.ok) {
    if (LIVE.session && r.bucket && LIVE.session.credits[r.bucket] !== undefined) LIVE.session.credits[r.bucket]--;
    toast('Potato is on her way to ' + first(c.name) + '.'); burst('envelopes'); resetQs(c); loadPeople(); return;
  }
  sendProblem(r, () => peopleSend(c, btn));
}
(function peopleForm() {
  const lab = SOTR.querySelector('label[for="npContact"]'); if (lab) lab.textContent = 'Email';
  $('#savePerson').onclick = async () => {
    const n = $('#npName').value.trim(), em = $('#npContact').value.trim();
    if (!n) { $('#npName').focus(); toast('Add a name first.'); return; }
    if (em.indexOf('@') < 1) { $('#npContact').focus(); toast('Add their email address.'); return; }
    const r = await LIVE.call('/people/save', { person: { name: n, email: em, company: $('#npCompany').value.trim(), role: $('#npRole') ? $('#npRole').value.trim() : '', vegan: $('#npVegan').checked,
      tags: splitTags($('#npTags').value), birthday: readDate($('#npBday')), anniversary: readDate($('#npAnniv')) } }).catch(() => null);
    if (!r || !r.ok) { toast(r && r.code === 'bad_email' ? MSG.bad_email : MSG.server_error); return; }
    ['#npName', '#npFirst', '#npLast', '#npContact', '#npCompany', '#npRole', '#npTags'].forEach(sel => { if ($(sel)) $(sel).value = ''; }); $('#npVegan').checked = false; $('#addPerson').hidden = true;
    await loadPeople();
    const c = contacts.find(x => x.id === r.id); selContact = r.id; resetQs(c); renderPeople(); toast(n + ' added.');
  };
})();

/* --- Tags, birthdays and work anniversaries: saved to the server as they change --- */
savePersonFields = function (c, patch) {
  Object.assign(c, patch);
  LIVE.call('/people/save', { person: Object.assign({ id: c.id }, patch) }).then(r => { if (!r || !r.ok) toast(MSG.server_error); }).catch(() => toast(MSG.server_error));
};
$('#selTag').onclick = () => {
  if (!peopleSel || !peopleSel.size) return;
  const n = peopleSel.size, p = document.createElement('div'); p.className = 'field';
  p.innerHTML = '<label for="selTagIn">Tag</label><input type="text" id="selTagIn" maxlength="30" placeholder="Like holiday list">' + (allTags().length ? '<small>Or tap one: </small><div class="chips" id="selTagPick"></div>' : '');
  const pick = p.querySelector('#selTagPick');
  if (pick) allTags().slice(0, 12).forEach(x => { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip'; b.textContent = x.t; b.onclick = () => { $('#selTagIn').value = x.t; }; pick.appendChild(b); });
  liveSheet('Tag ' + n + ' ' + (n === 1 ? 'person' : 'people'), p, [{ label: 'Add tag', primary: true, run: async () => {
    const tags = splitTags($('#selTagIn').value); if (!tags.length) { toast('Type a tag first.'); return; }
    closeLiveSheet();
    const rows = contacts.filter(c => peopleSel && peopleSel.has(c.id));
    const r = await LIVE.call('/people/import', { people: rows.filter(c => c.contact).map(c => ({ name: c.name, email: c.contact, tags })) }).catch(() => null);
    if (!r || !r.ok) { toast(MSG.server_error); return; }
    rows.forEach(c => { c.tags = splitTags((c.tags || []).concat(tags).join(',')); });
    toast('Tagged ' + rows.length + ' "' + tags.join(', ') + '".'); renderPeople();
  } }]);
  setTimeout(() => { const i = $('#selTagIn'); if (i) i.focus(); }, 50);
};
/* Save a CSV list to People: new people are added, people already there get the new tags and dates */
saveListToPeople = async function () {
  const rows = bulk.rows.filter(r => r.ok && !r.sample);
  if (!rows.length) { toast('There is no one on this list to save yet.'); return; }
  const btn = $('#saveList'); btn.disabled = true; btn.textContent = 'Saving...';
  const r = await LIVE.call('/people/import', { people: rows.map(x => ({ name: x.name, email: x.contact, company: x.company || '', role: x.role || '', vegan: !!x.vegan,
    country: x.country || '', tags: x.tags || [], birthday: x.birthday || '', anniversary: x.anniversary || '', basis: x.basis || undefined })) }).catch(() => null);
  btn.disabled = false; btn.textContent = 'Save these people to People';
  if (!r || !r.ok) { toast(MSG.server_error); return; }
  toast('Saved to People: ' + r.added + ' new' + (r.updated ? ', ' + r.updated + ' updated' : '') + (r.skipped ? ', ' + r.skipped + ' skipped' : '') + '.');
  loadPeople();
};

/* --- Send to a list (CSV): Pro and Team. Rows go up 50 at a time; the send worker delivers them. --- */
(function bulkExtras() {
  const sample = $('#sampleCsv'); if (sample) sample.hidden = true; /* sample addresses are not real inboxes */
  const card = $('#csvFile') && $('#csvFile').closest('.card');
  if (card) {
    const help = card.querySelector('small.muted');
    if (help) help.innerHTML = '<b>Columns:</b> First, Last (or one Name column), Email, Company, Role, Country (two letters, like US or CA), Consent, Vegan (yes or no), Birthday, Anniversary, Tags and Message. Only a name and Email are required. Extra columns are ignored. Up to 500 people per list.<br>' +
      '<b>Birthday</b> and <b>Anniversary</b> can be like 03/14 or 03/14/1985. <b>Tags</b> are separated by commas, like client, holiday list. <b>Message</b> is what Gerald spells in pepperoni, up to 16 letters.<br>' +
      '<b>Consent</b> is how you know each person: <b>yes</b> or <b>permission</b> (they agreed to get emails from you), <b>relationship</b> (current client or business contact) or <b>one_to_one</b> (you just met). Rows without it use your choice below. ' +
      'First, Last, Role and Company fill the matching details in your note.';
    const f = document.createElement('div'); f.className = 'two';
    f.innerHTML = '<div class="field"><label for="bulkCountry">Country for rows without one</label><select id="bulkCountry"></select></div>' +
      '<div class="field"><label for="bulkBasis">How you know them, for rows without a Permission column</label><select id="bulkBasis">' + BASIS_OPTIONS.replace('We just met and this is a one-to-one thank-you', 'We met one to one and this is a thank-you') + '</select></div>';
    countryOptions(f.querySelector('#bulkCountry'), store.get('lastCountry', 'US'));
    f.querySelector('#bulkBasis').value = 'relationship';
    card.insertBefore(f, $('#listSummary'));
  }
  SOTR.querySelectorAll('#view-bulk small.muted').forEach(sm => { if (sm.textContent.indexOf('Prototype only') === 0) sm.textContent = 'Each pizza uses one email from your plan. Up to 500 people per list. Potato delivers them over the next few minutes.'; });
  const d = $('#bulkDate');
  if (d) { d.type = 'datetime-local'; const t = new Date(Date.now() + 864e5); t.setHours(9, 0, 0, 0); d.value = new Date(t.getTime() - t.getTimezoneOffset() * 6e4).toISOString().slice(0, 16); }
  /* A sample file with every column the list understands. Its example.com rows are always skipped, so it can never send by accident. */
  const ch = $('#copyHeader');
  if (ch) {
    ch.textContent = 'Download a sample CSV';
    ch.onclick = () => {
      const csv = ['First,Last,Email,Company,Role,Country,Consent,Vegan,Birthday,Anniversary,Tags,Message',
        'Jordan,Reyes,jordan@example.com,Brightline Legal,Managing Partner,US,relationship,no,03/14,06/01/2019,"client, holiday list",THANK YOU',
        'Priya,Shah,priya@example.com,Shah & Ortiz LLP,Paralegal,CA,yes,yes,11/02/1988,,client,CHEERS PRIYA'].join(String.fromCharCode(13, 10)) + String.fromCharCode(13, 10);
      const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = 'slice-of-thanks-list.csv';
      SOTR.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
      toast('Sample downloaded. Replace the two example rows with your people, keep row 1, and upload it here.');
    };
  }
})();
function prettyWhen(v) { const d = new Date(v); return isNaN(d) ? v : d.toLocaleString('en-US', { month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' }); }
const _renderBulk = renderBulk;
renderBulk = function () {
  _renderBulk();
  const d = $('#bulkDate'), rv = $('#bulkReview');
  if (d && rv && d.value) rv.textContent = rv.textContent.replace(d.value, prettyWhen(d.value));
  const ls = $('#listSummary'); if (ls) ls.textContent = ls.textContent.replace('missing an email or phone', 'missing an email or still sample rows');
  SOTR.querySelectorAll('#listTable th').forEach(th => { if (th.textContent === 'Email or phone') th.textContent = 'Email'; });
};
const _loadList = loadList;
loadList = function (txt) {
  /* The prototype adds list rows to People on upload. Live, People only holds people who were actually sent a pizza. */
  const keep = contacts.slice();
  _loadList(txt);
  contacts.length = 0; keep.forEach(c => contacts.push(c));
  const data = parseCSV(txt); if (data.length < 2) return;
  const h = data[0].map(x => x.trim().toLowerCase());
  const iC = h.findIndex(x => x.includes('country')), iP = h.findIndex(x => x.includes('permission') || x.includes('consent') || x === 'basis');
  const iR = h.findIndex(x => x === 'role' || x.includes('title') || x.includes('position')), iF = h.findIndex(x => x.includes('first')), iL = h.findIndex(x => x.includes('last'));
  bulk.rows.forEach((r, i) => {
    const row = data[i + 1] || [];
    r.country = iC >= 0 ? (row[iC] || '').trim().toUpperCase().slice(0, 2) : '';
    const pv = iP >= 0 ? (row[iP] || '').trim().toLowerCase().split(' ').join('_').split('-').join('_') : '';
    const alias = { yes: 'permission', y: 'permission', opted_in: 'permission', opt_in: 'permission', consent: 'permission', true: 'permission', client: 'relationship', just_met: 'one_to_one' };
    r.basis = ['one_to_one', 'relationship', 'permission'].includes(pv) ? pv : (alias[pv] || '');
    r.role = iR >= 0 ? (row[iR] || '').trim() : '';
    if (iF >= 0) r.first = (row[iF] || '').trim();
    if (iL >= 0) r.last = (row[iL] || '').trim();
    r.sample = r.contact.toLowerCase().indexOf('@example.') > 0;
    r.ok = !!r.name && !r.sample && r.contact.indexOf('@') > 0 && r.contact.indexOf('.', r.contact.indexOf('@')) > 0;
  });
  if (bulk.rows.length > 500) { bulk.rows = bulk.rows.slice(0, 500); toast('Lists can have up to 500 people. The first 500 were loaded.'); }
  else toast('Loaded ' + bulk.rows.length + ' people. Tap Save these people to People to keep them, or go ahead and send.');
  renderBulk();
};
$('#openBulk').onclick = () => { if (!isPro()) { upgrade('bulk'); return; } show('bulk'); };
$('#bulkSend').onclick = async () => {
  const good = bulkGood(); if (!good.length || bulk.sending) return;
  let when = null;
  if (bulk.when === 'later') {
    const v = $('#bulkDate').value, d = v ? new Date(v) : null;
    if (!d || isNaN(d) || d.getTime() < Date.now() + 60000) { toast('Pick a date and time in the future.'); return; }
    when = d.toISOString();
  }
  bulk.sending = true; $('#bulkSend').disabled = true; $('#bulkProgress').hidden = false; $('#bulkResult').hidden = true; $('#bulkBar').style.width = '4%';
  const batch = 'b' + Date.now().toString(36);
  const country = $('#bulkCountry').value.replace('OTHER', ''), basis = $('#bulkBasis').value;
  store.set('lastCountry', $('#bulkCountry').value);
  /* A signature list shares one picture (vegan rows go without). Gerald makes each person their own pizza, so each gets its own picture. */
  let img = '';
  const own = bulk.mode !== 'signature', step = own ? 10 : 50;
  if (!own) { try { img = pizzaImage(clonePizza(signature), false); } catch (e) { img = ''; } }
  const picture = p => { try { const u = pizzaImage(p, false); return u.length < 1900000 ? u : ''; } catch (e) { return ''; } };
  const tally = { ok: 0 }; let stop = '';
  for (let i = 0; i < good.length && !stop; i += step) {
    const rows = good.slice(i, i + step).map((r, k) => { const pz = bulkPizza(r); return { i: i + k, pizza: cleanPizza(pz), box: boxPayload(bulkBox(r)),
      recipient: { name: r.name, email: r.contact, company: r.company, role: r.role || '', first_name: r.first || undefined, last_name: r.last || undefined, vegan: r.vegan, country: r.country || country, locale: 'en' },
      /* People already in People keep the permission on file; everyone else uses the choice above */
      consent: r.fromPeople && r.hasConsent && !r.basis ? undefined : { basis: r.basis || basis, method: r.fromPeople ? 'Picked in People for a group send' : 'CSV list upload' },
      send_type: 'one_to_one', image: !own && !!img && !r.vegan, image_data_url: own ? picture(pz) : undefined }; });
    let res;
    try { res = await LIVE.call('/send/bulk', { batch, rows, scheduled_for: when, label: bulk.sticker + ' list', image_data_url: img.length < 1900000 ? img : '' }); } catch (e) { res = { code: 'server_error' }; }
    if (!res || !res.ok) { stop = (res && res.code) || 'server_error'; break; }
    res.results.forEach(x => { if (x.ok) tally.ok++; else tally[x.code] = (tally[x.code] || 0) + 1; });
    if (res.results.some(x => x.code === 'needs_terms')) stop = 'needs_terms';
    $('#bulkBar').style.width = Math.min(100, (i + step) / good.length * 100) + '%';
  }
  bulk.sending = false; $('#bulkSend').disabled = false;
  const why = { no_credits: 'out of emails', needs_permission: 'need a different permission for their country', suppressed: 'asked not to get pizzas', bad_email: 'email does not look right', needs_upgrade: 'needs a Pro feature', test_inbox_only: 'not a test inbox', server_error: 'error on our side' };
  const skipped = Object.keys(tally).filter(k => k !== 'ok').map(k => tally[k] + ' ' + (why[k] || k)).join(', ');
  $('#bulkResult').hidden = false;
  $('#bulkResult').textContent = (when ? 'Scheduled ' : 'Sent ') + tally.ok + ' pizza' + (tally.ok === 1 ? '' : 's') +
    (when ? ' for ' + prettyWhen(when) : '. Potato delivers them over the next few minutes') + '.' + (skipped ? ' Skipped: ' + skipped + '.' : '');
  if (stop === 'needs_terms') askTerms(() => {}); else if (stop === 'needs_upgrade') upgrade('bulk'); else if (stop) toast(MSG[stop] || MSG.server_error);
  if (tally.ok) {
    burst('envelopes'); toast(when ? 'Your list is scheduled.' : 'Your pizzas are in the oven.');
    const s = await LIVE.call('/session').catch(() => null); if (s && s.credits && LIVE.session) { LIVE.session.credits = s.credits; renderPlanCard(); }
    loadPeople();
  }
};

/* --- Role and first/last name for notes: People and CSV lists --- */
const _personFromServer = personFromServer;
personFromServer = function (x) { const c = _personFromServer(x); c.role = x.role || ''; return c; };
const _qsBuild = qsBuild;
qsBuild = function (c) { const r = _qsBuild(c); r.b.company = c.company; r.b.role = c.role; return r; };
(function roleInPeople() {
  const co = $('#npCompany'); if (!co || $('#npRole')) return;
  const f = document.createElement('div'); f.className = 'field';
  f.innerHTML = '<label for="npRole">Role</label><input type="text" id="npRole" maxlength="80" placeholder="Like Managing Partner">';
  co.closest('.field').after(f);
})();

/* --- Box presets: saved box setups. A Slice 1, The Whole Pie 10, Pizza Party 20 (app_settings preset_limits). --- */
let presets = [], presetLimit = 1, editingPreset = null;
const PRESET_KEYS = ['style', 'sticker', 'confetti', 'tone', 'note', 'sign', 'linkLabel', 'link', 'kind'];
function presetData(bx) {
  const d = {}; PRESET_KEYS.forEach(k => { if (bx[k] !== undefined && bx[k] !== null) d[k] = bx[k]; });
  const rw = bx.reward || {}; if (rw.text || rw.code || rw.link) d.reward = { text: rw.text || '', code: rw.code || '', link: rw.link || '', exp: rw.exp || '' };
  return d;
}
function applyPreset(pr) {
  const d = pr.data || {};
  PRESET_KEYS.forEach(k => { if (d[k] !== undefined) box[k] = d[k]; });
  box.reward = Object.assign({ text: '', code: '', link: '', exp: '' }, d.reward || {});
  renderBox(); showCoRole();
}
async function loadPresets() {
  if (!account || !LIVE.TOKEN) return;
  const r = await LIVE.call('/presets').catch(() => null);
  if (!r || !r.ok) return;
  presets = r.presets || []; presetLimit = r.limit || 1;
  renderPresetPicker();
  if (!$('#view-settings').hidden) renderPresetCard();
}
function presetSummary(pr) {
  const d = pr.data || {}; const st = (typeof STYLES !== 'undefined' && STYLES[d.style]) || d.style || 'Box';
  return [st, d.sticker, d.note ? '"' + d.note.slice(0, 40) + (d.note.length > 40 ? '..."' : '"') : ''].filter(Boolean).join(' · ');
}
function askPresetName(title, value, then) {
  const p = document.createElement('div'); p.className = 'field';
  p.innerHTML = '<label for="presetName">Preset name</label><input type="text" id="presetName" maxlength="60" placeholder="Like Client thank-you">';
  p.querySelector('input').value = value || '';
  liveSheet(title, p, [{ label: 'Save', primary: true, run: () => { const v = $('#presetName').value.trim(); if (!v) { toast('Give the preset a name.'); return; } closeLiveSheet(); then(v); } }]);
  setTimeout(() => { const i = $('#presetName'); if (i) i.focus(); }, 50);
}
function presetFull() {
  const names = { free: 'A Slice', pro: 'The Whole Pie', team: 'Pizza Party' }, plan = (LIVE.session && LIVE.session.plan) || 'free';
  const p = document.createElement('p'); p.className = 'muted';
  p.textContent = names[plan] + ' holds ' + presetLimit + ' preset' + (presetLimit === 1 ? '' : 's') + ', and they are all in use. Change or remove one in Settings' + (plan === 'free' ? ', or upgrade to The Whole Pie for 10.' : plan === 'pro' ? ', or move to Pizza Party for 20.' : '.');
  liveSheet('Your presets are full', p, [{ label: 'Open Settings', primary: true, run: () => { closeLiveSheet(); show('settings'); } }].concat(plan === 'free' ? [{ label: 'See plans', run: () => { closeLiveSheet(); upgrade('general'); } }] : []));
}
async function savePreset(id, name, data) {
  const r = await LIVE.call('/presets/save', { preset: { id: id || undefined, name, data } }).catch(() => null);
  if (r && r.code === 'preset_limit') { presetLimit = r.limit || presetLimit; presetFull(); return false; }
  if (!r || !r.ok) { toast(MSG.server_error); return false; }
  await loadPresets(); return true;
}
/* Picker at the top of the box step */
function renderPresetPicker() {
  const panel = SOTR.querySelector('.panel[data-step="4"]'); if (!panel) return;
  let row = $('#presetRow');
  if (!row) {
    row = document.createElement('div'); row.id = 'presetRow'; row.className = 'field';
    /* Presets show as cards with a mini lid. Tap one to fill the whole box. The hidden select keeps one code path for loading. */
    row.innerHTML = '<label>Your box presets</label><small id="presetHelp">Tap a preset to fill the whole box in one go. Save any box you like to reuse it.</small>' +
      '<div class="preset-cards" id="presetCards"><button class="preset-card add" type="button" id="presetSave"><span class="plus">+</span><b>Save this box</b><small>as a new preset</small></button></div>' +
      '<select id="presetSel" hidden aria-hidden="true" tabindex="-1"></select>';
    (panel.querySelector('#boxLede') || panel.querySelector('h2')).after(row);
    row.querySelector('#presetSel').addEventListener('change', e => {
      const pr = presets.find(x => x.id === e.target.value); if (!pr) return;
      applyPreset(pr); lastPresetId = pr.id; toast('Loaded "' + pr.name + '". Change anything you like.'); e.target.value = ''; renderPresetCards();
    });
    const saveNew = () => {
      if (presets.length >= presetLimit) { presetFull(); return; }
      askPresetName('Save these box choices', '', async name => { if (await savePreset(null, name, presetData(box))) toast('Saved "' + name + '". Load it any time from the top of this step.'); });
    };
    row.querySelector('#presetSave').onclick = saveNew;
    /* The same button at the bottom of the step, where people finish setting up the box */
    const bottom = document.createElement('div'); bottom.className = 'btn-row'; bottom.id = 'presetSaveRow';
    bottom.innerHTML = '<button class="btn small" type="button" id="presetSave2">Save these box choices as a preset</button>';
    bottom.querySelector('button').onclick = saveNew;
    panel.appendChild(bottom);
    const ban = document.createElement('div'); ban.id = 'presetBanner'; ban.className = 'card'; ban.hidden = true;
    ban.innerHTML = '<p class="eyebrow">Editing a preset</p><h3 id="presetBannerName"></h3><p class="muted" style="font-size:.9rem">Set the box the way you want it, then save. Your pizza and recipient are not part of a preset.</p>' +
      '<div class="btn-row"><button class="btn primary small" type="button" id="presetDone">Save preset</button><button class="btn ghost small" type="button" id="presetCancel">Cancel</button></div>';
    panel.querySelector('h2').after(ban);
    ban.querySelector('#presetDone').onclick = async () => {
      const ep = editingPreset; if (!ep) return;
      if (await savePreset(ep.id, ep.name, presetData(box))) { editingPreset = null; toast('Saved "' + ep.name + '".'); show('settings'); }
    };
    ban.querySelector('#presetCancel').onclick = () => { editingPreset = null; show('settings'); };
  }
  const sel = row.querySelector('#presetSel');
  sel.innerHTML = '<option value="">' + (presets.length ? 'Choose a preset' : 'No presets yet') + '</option>';
  presets.forEach(pr => { const o = document.createElement('option'); o.value = pr.id; o.textContent = pr.name; sel.appendChild(o); });
  sel.disabled = !presets.length;
  renderPresetCards();
  row.hidden = !account || !!editingPreset;
  $('#presetSaveRow').hidden = !account || !!editingPreset;
  $('#presetBanner').hidden = !editingPreset;
  if (editingPreset) $('#presetBannerName').textContent = editingPreset.name;
}
let lastPresetId = null;
function renderPresetCards() {
  const wrap = $('#presetCards'); if (!wrap) return;
  wrap.querySelectorAll('.preset-card:not(.add)').forEach(x => x.remove());
  const add = $('#presetSave');
  presets.forEach(pr => {
    const d = pr.data || {};
    const b = mk('button', 'preset-card'); b.type = 'button'; b.setAttribute('aria-pressed', String(pr.id === lastPresetId));
    const lid = mk('div', 'lid mini'); lid.dataset.style = d.style || 'kraft';
    if (d.sticker) lid.appendChild(mk('span', 'mini-st', String(d.sticker).slice(0, 18)));
    b.appendChild(lid); b.appendChild(mk('b', '', pr.name));
    b.appendChild(mk('small', '', d.note ? d.note.slice(0, 60) : ((typeof STYLES !== 'undefined' && STYLES[d.style]) || 'Box')));
    b.onclick = () => { const sel = $('#presetSel'); sel.value = pr.id; sel.dispatchEvent(new Event('change')); };
    wrap.insertBefore(b, add);
  });
  const help = $('#presetHelp');
  if (help) help.textContent = presets.length ? 'Tap a preset to fill the whole box in one go. Save any box you like to reuse it.' : 'No presets yet. Set up a box you love, then tap Save this box to reuse it in one tap.';
}
function editPreset(pr) {
  editingPreset = pr ? { id: pr.id, name: pr.name } : null;
  currentMeetingId = null; editingSignature = false;
  box = boxFromProfile(null);
  if (pr) PRESET_KEYS.forEach(k => { if (pr.data && pr.data[k] !== undefined) box[k] = pr.data[k]; });
  if (pr && pr.data && pr.data.reward) box.reward = Object.assign({ text: '', code: '', link: '', exp: '' }, pr.data.reward);
  step = 4; saidStep = 4; show('make'); renderStep();
}
const _renderStep = renderStep;
renderStep = function () {
  _renderStep();
  const ep = !!editingPreset && step === 4;
  if (ep) { $('#makeFor').textContent = 'Editing preset: ' + editingPreset.name; $('#makeFor').hidden = false; $('#next').hidden = true; $('#back').style.visibility = 'hidden'; }
  renderPresetPicker();
  if (step === 5) showCoRole();
};
const _show = show;
show = function (v) { if (v !== 'make') editingPreset = null; _show(v); };
/* Settings: manage presets */
function renderPresetCard() {
  if (!account) return;
  let card = $('#presetCard');
  if (!card) {
    const sigCard = $('#editSig') && $('#editSig').closest('.card'); if (!sigCard) return;
    card = document.createElement('div'); card.className = 'card'; card.id = 'presetCard';
    card.innerHTML = '<h2>Box presets</h2><p class="muted" style="font-size:.9rem">Save box choices you use often: style, sticker, confetti, note, sign-off, button and gift. Load one at the top of the box step instead of setting everything again.</p><p class="muted" id="presetCount"></p><ul class="feed" id="presetList"></ul><div class="btn-row"><button class="btn small primary" type="button" id="presetNew">New preset</button></div>';
    sigCard.after(card);
    card.querySelector('#presetNew').onclick = () => {
      if (presets.length >= presetLimit) { presetFull(); return; }
      askPresetName('Name your new preset', '', async name => {
        if (await savePreset(null, name, presetData(boxFromProfile(null)))) { const pr = presets.find(x => x.name === name); editPreset(pr || { id: null, name, data: {} }); }
      });
    };
  }
  $('#presetCount').textContent = presets.length + ' of ' + presetLimit + ' used.';
  const ul = $('#presetList'); ul.innerHTML = '';
  if (!presets.length) { const li = document.createElement('li'); li.className = 'muted'; li.textContent = 'No presets yet.'; ul.appendChild(li); }
  presets.forEach(pr => {
    const li = document.createElement('li'); li.style.cssText = 'display:flex;flex-direction:column;gap:6px';
    const t = document.createElement('div'); t.innerHTML = '<b></b><br><span class="muted" style="font-size:.85rem"></span>';
    t.querySelector('b').textContent = pr.name; t.querySelector('span').textContent = presetSummary(pr);
    const row = document.createElement('div'); row.className = 'btn-row';
    [['Use it', () => usePreset(pr)], ['Preview', () => previewPreset(pr)], ['Edit', () => editPreset(pr)], ['Rename', () => askPresetName('Rename preset', pr.name, async name => { if (await savePreset(pr.id, name)) toast('Renamed.'); })],
      ['Remove', () => liveSheet('Remove "' + pr.name + '"?', null, [{ label: 'Remove', primary: true, run: async () => { closeLiveSheet(); const r = await LIVE.call('/presets/remove', { id: pr.id }).catch(() => null); if (r && r.ok) { toast('Removed.'); loadPresets(); } else toast(MSG.server_error); } }])]]
      .forEach(([l, fn]) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'btn small' + (l === 'Remove' ? ' ghost' : l === 'Use it' ? ' primary' : ''); b.textContent = l; b.onclick = fn; row.appendChild(b); });
    li.append(t, row); ul.appendChild(li);
  });
  autoFold(card, 'presets', presets.length ? presets.length + ' saved: ' + presets.map(x => x.name).join(', ') : 'Save box choices you use often');
}
/* A preset's box as the recipient sees it: the lid, then the note inside with a sample name */
function presetBox(pr) {
  const b = boxFromProfile(null);
  PRESET_KEYS.forEach(k => { if (pr.data && pr.data[k] !== undefined) b[k] = pr.data[k]; });
  b.reward = Object.assign({ text: '', code: '', link: '', exp: '' }, (pr.data && pr.data.reward) || {});
  return b;
}
function previewPreset(pr) {
  const b = presetBox(pr);
  const w = document.createElement('div'); w.style.cssText = 'display:flex;flex-direction:column;gap:10px';
  w.innerHTML = '<div class="lid"><div class="lid-logo"></div><div class="lid-biz"></div><div class="lid-sticker"></div><div class="lid-vegan" hidden>Vegan</div></div>' +
    '<div class="card" style="margin:0"><p class="eyebrow" style="margin:0">Inside the lid</p><p class="hand" style="margin:6px 0 0"></p><p class="hand sign" style="margin:6px 0 0"></p></div>' +
    '<p class="muted" style="font-size:.85rem;margin:0"></p>';
  renderLid(w.querySelector('.lid'), w.querySelector('.lid-logo'), w.querySelector('.lid-biz'), w.querySelector('.lid-sticker'), b, false);
  w.querySelector('.hand').textContent = fillNote(b.note || '', { name: 'Jordan Reyes', company: 'Acme' });
  w.querySelector('.sign').textContent = b.sign || '';
  const extra = [b.confetti && b.confetti !== 'none' ? 'Confetti: ' + confName(b.confetti) : '', b.link && isPro() ? 'Button: ' + (b.linkLabel || 'Book a follow-up') : '', b.reward && b.reward.code ? 'Gift under the pizza' : ''].filter(Boolean).join(' · ');
  w.querySelector('p.muted').textContent = 'Shown with a sample name, Jordan. ' + extra;
  liveSheet(pr.name, w, [{ label: 'Use it', primary: true, run: () => { closeLiveSheet(); usePreset(pr); } }, { label: 'Show the confetti', run: () => burst(b.confetti) }]);
}
/* Start a new pizza with this box already set: make the pizza, and the box step is done */
function usePreset(pr) {
  startFresh(null);
  box = presetBox(pr);
  renderStep();
  toast('Your box is set from "' + pr.name + '". Make the pizza, then check the box step before you send.');
}
const _renderSettingsP = renderSettings;
renderSettings = function () { _renderSettingsP(); renderPresetCard(); foldSettings(); };

/* --- Start: sign in with the BD pass, restore a guest draft --- */
(async function liveStart() {
  if (!LIVE.TOKEN) { account = null; refreshPlan(true); return; }
  const s = await LIVE.call('/session');
  if (!s || !s.member_id) { account = null; refreshPlan(true); return; }
  /* This browser was last used by a different member: start clean so nobody sees someone else's name, box or draft.
     A pizza made as a guest just before signing up is kept, without the old box. */
  const owner = store.get('owner', null);
  if (owner && owner !== s.member_id) {
    const d = store.get('draft', null); clearLocal();
    if (d && d.pizza) store.set('draft', { pizza: d.pizza, at: d.at, special: d.special });
    store.set('owner', s.member_id); location.reload(); return;
  }
  store.set('owner', s.member_id);
  applySession(s);
  loadPeople(); loadPresets(); calStart(s); loadDates(); loadSigs();
  if (s.needs_terms) setTimeout(() => askTerms(() => {}), 600);
  const d = store.get('draft', null);
  if (d && d.pizza && Date.now() - (d.at || 0) < 7 * 864e5) {
    pizza = d.pizza; box = Object.assign(boxFromProfile(null), d.box); store.set('draft', null);
    if (d.special && s.credits && s.credits.special_delivery > 0) startSpecial(true); else if (d.special) wantSpecial = true;
    step = 5; saidStep = 5; show('make'); renderStep(); toast(specialOn ? 'Special Delivery is on. Your pizza is ready to send.' : 'Welcome. Your pizza is ready to send.');
  } else { show('today'); }
  checkPurchases();
})();

/* --- Gerald never forgets a date: Settings card saved to the account, and date pizzas on Home > This week --- */
let dates = { upcoming: [], waiting: [], sent: [], settings: {}, loaded: false };
saveDatesPrefs = function () {
  store.set('datesPrefs', datesPrefs);
  if (LIVE.TOKEN) LIVE.call('/profile', { profile: { prefs: { dates: datesPrefs, tz: myTz() } } }).then(() => loadDates()).catch(() => toast(MSG.server_error));
};
async function loadDates() {
  if (!LIVE.TOKEN) return;
  const r = await LIVE.call('/dates').catch(() => null);
  /* Until the server has date pizzas, the Dates card stays hidden so nobody sets up something that cannot run */
  const dc = $('#datesCard');
  if (!r || !r.ok) { if (dc) dc.hidden = true; return; }
  if (dc) dc.hidden = false;
  dates = { upcoming: Array.isArray(r.upcoming) ? r.upcoming : [], waiting: Array.isArray(r.waiting) ? r.waiting : [], sent: Array.isArray(r.sent) ? r.sent : [],
    settings: r.settings || {}, tz: r.tz || null, today: r.today || new Date().toISOString().slice(0, 10), loaded: true };
  if (r.settings && r.settings.mode) { datesPrefs = Object.assign(datesPrefs, r.settings); store.set('datesPrefs', datesPrefs); }
  /* The 8 AM time follows the member: save their time zone the first time, and when it changes */
  const tz = myTz(); if (tz && r.tz !== tz) LIVE.call('/profile', { profile: { prefs: { tz } } });
  if (!$('#view-settings').hidden) foldSettings();
  if (!views.today.hidden) renderToday();
}
const KIND_WORD = { birthday: 'birthday', anniversary: 'work anniversary' };
function dateWhen(iso) { const d = new Date(iso + 'T12:00:00'); return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); }
const DATE_WHY = { needs_permission: 'It did not go out on its own: there is no permission on file to email them.', needs_upgrade: 'Sending on its own is part of The Whole Pie.',
  no_credits: 'You were out of emails this morning.', suppressed: 'They asked not to get pizzas.', server_error: 'Something went wrong on our side this morning.' };
function datePreview(w) { const p = w.payload || {}; const b = Object.assign(boxFromProfile(null), p.box || {}); b.note = fillNote(b.note || '', { name: w.contact.name }); b.to = w.contact.name; return { p: p.pizza, b }; }
function dateRow(w) {
  const li = mk('li', 'meeting'); li.style.gridTemplateColumns = '1fr';
  const info = mk('div', 'info'), name = w.contact.name || 'Someone', today = w.occurs_on === dates.today;
  info.append(mk('b', '', (today ? 'Today: ' : dateWhen(w.occurs_on) + ': ') + name + "'s " + KIND_WORD[w.kind]),
    mk('span', 'muted', 'Gerald made ' + ((w.payload && w.payload.pizza && w.payload.pizza.name) || 'a pizza') + '. It is waiting for you to send.' + (w.note && DATE_WHY[w.note] ? ' ' + DATE_WHY[w.note] : '')));
  const row = mk('div', 'row');
  const send = mk('button', 'btn small primary', 'Send it'); send.type = 'button'; send.onclick = () => dateSend(w, send);
  const see = mk('button', 'btn small', 'See it'); see.type = 'button'; see.onclick = () => { const { p, b } = datePreview(w); if (p) openRecipient(p, b); };
  const skip = mk('button', 'btn small ghost', 'Skip'); skip.type = 'button';
  skip.onclick = async () => { await LIVE.call('/dates/skip', { id: w.id }).catch(() => null); toast('Skipped. Gerald will try again next year.'); loadDates(); };
  row.append(send, see, skip); info.appendChild(row); li.appendChild(info); return li;
}
async function dateSend(w, btn, basis) {
  if (!w.contact.has_consent && !basis) {
    const p = document.createElement('div'); p.className = 'field';
    p.innerHTML = '<label for="dateBasis">How you know ' + esc(first(w.contact.name)) + '</label><select id="dateBasis">' + BASIS_OPTIONS + '</select>';
    liveSheet('Send ' + first(w.contact.name) + "'s pizza", p, [{ label: 'Send it', primary: true, run: () => { const v = $('#dateBasis').value; closeLiveSheet(); dateSend(w, btn, v); } }]);
    return;
  }
  let img = ''; try { img = pizzaImage(w.payload.pizza, false); } catch (e) { img = ''; }
  const label = btn.textContent; btn.disabled = true; btn.textContent = 'Sending...';
  let r; try { r = await LIVE.call('/dates/send', { id: w.id, basis: basis || undefined, image_data_url: img.length < 1900000 ? img : '' }); } catch (e) { r = { code: 'server_error' }; }
  btn.disabled = false; btn.textContent = label;
  if (r && r.ok) {
    if (LIVE.session && r.bucket && LIVE.session.credits[r.bucket] !== undefined) LIVE.session.credits[r.bucket]--;
    toast('Potato is on her way to ' + first(w.contact.name) + '.'); burst('envelopes'); loadDates(); loadPeople(); return;
  }
  sendProblem(r || {}, () => dateSend(w, btn, basis));
}
function upcomingRow(u) {
  const li = mk('li', 'meeting'); li.style.gridTemplateColumns = '1fr';
  const info = mk('div', 'info');
  const yrs = u.years ? ' (' + u.years + (u.years === 1 ? ' year)' : ' years)') : '';
  info.append(mk('b', '', dateWhen(u.on_day) + ': ' + u.name + "'s " + KIND_WORD[u.kind] + yrs),
    mk('span', 'muted', (u.days_away === 0 ? 'Today. ' : u.days_away === 1 ? 'Tomorrow. ' : 'In ' + u.days_away + ' days. ') +
      (datesPrefs.mode === 'off' ? 'Turn on Gerald never forgets a date in Settings and he will have a pizza ready.' : datesPrefs.mode === 'auto' ? 'Gerald sends a pizza at 8 AM that day.' : 'Gerald has a pizza waiting for you at 8 AM that day.')));
  if (datesPrefs.mode === 'off') {
    const row = mk('div', 'row'), b = mk('button', 'btn small', 'Turn it on'); b.type = 'button';
    b.onclick = () => { show('settings'); const c = $('#datesCard'); if (c) { openFold(c); c.scrollIntoView({ block: 'start' }); } };
    row.appendChild(b); info.appendChild(row);
  }
  li.appendChild(info); return li;
}
const _show2 = show;
show = function (v) { _show2(v); if (v === 'today' && dates.loaded) loadDates(); };

/* --- Calendars: each member connects their own Calendly or TidyCal. Meetings show on Home > This week. ---
   The Whole Pie and Pizza Party: a picked meeting gets the signature pizza sent when it ends.
   A Slice: a picked meeting gets the signature pizza made and waiting on Home; the member sends it. */
const CAL_NAMES = { calendly: 'Calendly', tidycal: 'TidyCal' };
let cal = { integrations: [], meetings: [], loaded: false };
function calAuto() { return !!(LIVE.session && LIVE.session.features && LIVE.session.features.automations); }
function calOn() { return cal.integrations.some(i => i.status === 'connected'); }
function meetingTime(m) {
  const d = new Date(m.starts_at);
  return d.toLocaleDateString('en-US', { weekday: 'short' }) + ' ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}
/* The prototype's meeting shape, so Make one (startFresh) fills in the guest */
function calProto(m) { return { id: m.id, time: meetingTime(m), title: m.title || 'Meeting', who: m.name || m.email || 'Your guest', org: '', contact: m.email || '', status: m.state }; }
async function loadCalendar(sync) {
  if (!LIVE.TOKEN || !account) return;
  let r; try { r = sync ? await LIVE.call('/calendar/sync', {}) : await LIVE.call('/calendar'); } catch (e) { return; }
  if (!r || !r.ok) return;
  cal = { integrations: r.integrations || [], meetings: r.meetings || [], loaded: true };
  meetings = cal.meetings.map(calProto);
  if (!views.today.hidden) renderToday();
  renderCalendarCard();
}
function wantsPizza(m) { return m.want_pizza === null || m.want_pizza === undefined ? (calAuto() && (m.auto_want !== undefined ? !!m.auto_want : settings.mode === 'auto')) : !!m.want_pizza; }
function mk(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; }
function meetingRow(m) {
  /* Compact card: the guest's name, the meeting type under it, the status on the right, then the pizza controls */
  const li = mk('li', 'meeting'), info = mk('div', 'info'), row = mk('div', 'row'), head = mk('div', 'mhead');
  li.dataset.id = m.id;
  const pill = mk('span', 'pill');
  head.append(mk('h3', '', m.name || m.email || 'Guest'), pill);
  info.append(head, mk('span', 'who', (m.title || 'Meeting') + (m.name && m.email ? ' · ' + m.email : '')));
  const btn = (label, fn, primary) => { const b = mk('button', 'btn small' + (primary ? ' primary' : ''), label); b.type = 'button'; b.onclick = () => fn(b); row.appendChild(b); return b; };
  if (m.state === 'upcoming') {
    pill.textContent = 'Upcoming';
    if (!m.email) row.appendChild(mk('small', 'muted', 'No guest email on this booking'));
    else {
      const lab = mk('label', 'meet-sw'), cb = document.createElement('input'); cb.type = 'checkbox'; cb.checked = wantsPizza(m); cb.className = 'meetWant';
      cb.setAttribute('role', 'switch');
      lab.append(cb, mk('span', '', calAuto() ? 'Signature pizza when it ends' : 'Have signature pizza ready'));
      cb.onchange = async () => {
        m.want_pizza = cb.checked;
        const r = await LIVE.call('/calendar/meeting', { id: m.id, want: cb.checked }).catch(() => ({}));
        if (!r.ok) { cb.checked = !cb.checked; m.want_pizza = cb.checked; toast('That did not save. Try again.'); return; }
        toast(cb.checked ? (calAuto() ? 'Your signature pizza goes to ' + first(m.name || 'them') + ' when it ends.' : 'Your signature pizza will be waiting here when it ends.') : 'No pizza for this one.');
      };
      row.appendChild(lab);
      btn('Plan a pizza', () => planMeeting(m));
    }
  } else if (m.state === 'sent' && m.send_status === 'queued') {
    pill.classList.add('ok'); pill.textContent = 'Pizza planned';
    row.appendChild(mk('small', 'muted', 'Goes out when it ends, ' + new Date(m.send_at || m.ends_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) + '.'));
  } else if (m.state === 'ready') {
    pill.classList.add('wait'); pill.textContent = m.note === 'no_credits' ? 'Out of emails' : 'Pizza waiting';
    btn('Send signature pizza', b => sendMeetingSignature(m, b), true);
    btn('Make a fresh one', () => startFresh(m.id));
    btn('Skip', async () => { await LIVE.call('/calendar/skip', { id: m.id }).catch(() => null); loadCalendar(); });
  } else if (m.state === 'sent') {
    pill.classList.add('ok'); pill.textContent = 'Sent' + (m.opened ? ' · opened' : '');
  } else if (m.state === 'ended') {
    pill.textContent = 'Ended';
    if (m.email) btn('Make one', () => startFresh(m.id));
  } else {
    pill.textContent = m.note === 'canceled' ? 'Canceled' : 'Skipped';
  }
  if (row.childElementCount) info.appendChild(row);
  li.append(mk('span', 'time', meetingTime(m)), info);
  return li;
}
/* One tap from Home: the signature pizza goes to the guest */
async function sendMeetingSignature(m, btn) {
  const p = clonePizza(signature); p.baked = true; p.bake = Math.max(p.bake || 0, .6);
  const b = Object.assign(boxFromProfile(calProto(m)), { kind: 'business' });
  let img = ''; try { img = pizzaImage(p, false); } catch (e) { img = ''; }
  const label = btn.textContent; btn.disabled = true; btn.textContent = 'Sending...';
  let r;
  try {
    r = await LIVE.call('/send', { idem: 'meeting-' + m.id, source: 'kitchen', pizza: cleanPizza(p), box: boxPayload(b), meeting_id: m.id,
      recipient: { name: m.name || '', email: m.email, locale: 'en' }, consent: { basis: 'one_to_one', method: 'Calendar meeting', note: m.title || '' },
      send_type: 'one_to_one', label: 'After ' + (m.title || 'a meeting').toLowerCase(), image_data_url: img.length < 1900000 ? img : '' });
  } catch (e) { r = { code: 'server_error' }; }
  btn.disabled = false; btn.textContent = label;
  if (r.ok) {
    if (LIVE.session && r.bucket && LIVE.session.credits[r.bucket] !== undefined) LIVE.session.credits[r.bucket]--;
    toast('Potato is on her way to ' + first(m.name || 'them') + '.'); burst('envelopes'); loadCalendar(); loadPeople(); return;
  }
  sendProblem(r, () => sendMeetingSignature(m, btn));
}
const _renderToday = renderToday;
renderToday = function () {
  _renderToday();
  const se = $('#simEnd'); if (se) se.hidden = true;
  const pc = $('#promptCard'); if (pc) pc.hidden = true;
  SOTR.querySelectorAll('.tag').forEach(t => { if (t.textContent.trim() === 'Sample calendar') t.hidden = true; });
  const ul = $('#meetings'); if (!ul) return;
  ul.innerHTML = '';
  if (cal.meetings.length) {
    /* This week, then next week */
    const now = new Date(), ws = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay()), nx = new Date(ws.getTime() + 7 * 86400000);
    let headed = false;
    cal.meetings.forEach(m => {
      if (!headed && new Date(m.starts_at) >= nx) {
        headed = true;
        const h = mk('li', 'week-head'); h.style.cssText = 'list-style:none;margin:14px 0 2px';
        h.append(mk('h3', '', 'Next week'), mk('span', 'muted', 'Week of ' + nx.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })));
        h.querySelector('h3').style.margin = '0';
        ul.appendChild(h);
      }
      ul.appendChild(meetingRow(m));
    });
    return;
  }
  const li = mk('li', 'meeting'); li.style.gridTemplateColumns = '1fr';
  const info = mk('div', 'info');
  if (calOn()) {
    info.append(mk('b', '', 'No meetings this week yet'), mk('span', 'muted', 'New bookings show up here within a few minutes. Until then, use Make a new pizza above.'));
  } else {
    info.append(mk('b', '', 'Connect your calendar'), mk('span', 'muted', 'Connect Calendly or TidyCal and your meetings for the week show here. ' +
      (calAuto() ? 'Pick the ones that get a pizza, and it goes out when each one ends.' : 'Pick the ones you want a pizza for. When each one ends, your signature pizza is waiting here for you to send.')));
    const b = mk('button', 'btn small primary', 'Connect a calendar'); b.type = 'button';
    b.onclick = () => { show('settings'); const c = calCardEl(); if (c) c.scrollIntoView({ block: 'start' }); };
    const r = mk('div', 'row'); r.appendChild(b); info.appendChild(r);
  }
  li.appendChild(info); ul.appendChild(li);
};
/* After calendar sends, the Kitchen send for a meeting marks it done */
const _buildPayload = buildPayload;
buildPayload = function () {
  const p = _buildPayload();
  if (currentMeetingId && cal.meetings.some(x => x.id === currentMeetingId)) p.meeting_id = currentMeetingId;
  return p;
};
/* Settings > Calendar */
function calCardEl() {
  let c = $('#calCard'); if (c) return c;
  SOTR.querySelectorAll('#view-settings .card h2').forEach(h => { if (h.textContent.trim() === 'Calendar') c = h.closest('.card'); });
  if (c) c.id = 'calCard';
  return c;
}
function renderCalendarCard() {
  const c = calCardEl(); if (!c) return;
  c.innerHTML = '';
  c.append(mk('h2', '', 'Calendar'), mk('p', 'muted', 'Connect the calendar you book meetings with. Your meetings for the week show on Home, and you pick which ones get a pizza. We only read your bookings.'));
  ['calendly', 'tidycal'].forEach(p => {
    const i = cal.integrations.find(x => x.provider === p);
    const on = i && i.status === 'connected', again = i && i.status === 'needs_reconnect';
    const row = mk('div', 'cal-row'); row.dataset.provider = p;
    row.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;padding:8px 0;border-top:1px dashed var(--line, #d8c4a4)';
    const t = mk('div'); t.append(mk('b', '', CAL_NAMES[p]), document.createElement('br'),
      mk('small', 'muted', on ? 'Connected' + (i.label ? ' as ' + i.label : '') : again ? 'Connect it again to keep your meetings coming in' : 'Not connected'));
    const b = mk('button', 'btn small' + (on ? ' ghost' : ' primary'), on ? 'Disconnect' : (again ? 'Connect again' : 'Connect ' + CAL_NAMES[p])); b.type = 'button';
    b.onclick = () => on ? disconnectCal(p) : connectCal(p, b);
    const btns = mk('div', 'btn-row'); btns.style.margin = '0';
    if (on) { const im = mk('button', 'btn small', 'Import contacts'); im.type = 'button'; im.onclick = () => importCal(p, im); btns.appendChild(im); }
    btns.appendChild(b);
    row.append(t, btns); c.appendChild(row);
  });
  if (calOn()) {
    const r = mk('div', 'btn-row'); const b = mk('button', 'btn small', 'Check for new meetings'); b.type = 'button';
    b.onclick = async () => { b.disabled = true; b.textContent = 'Checking...'; await loadCalendar(true); toast('Your meetings are up to date.'); };
    r.appendChild(b); c.appendChild(r);
  }
  const conn = (cal.integrations || []).filter(x => x.status === 'connected').map(x => CAL_NAMES[x.provider] || x.provider);
  autoFold(c, 'cal', conn.length ? conn.join(' and ') + ' connected' : 'Connect Calendly or TidyCal');
}
async function connectCal(p, b) {
  if (!account) { toast('Sign in first.'); return; }
  b.disabled = true;
  const r = await LIVE.call('/calendar/connect', { provider: p, return: location.pathname || '/' }).catch(() => ({}));
  b.disabled = false;
  if (r.url) { location.href = r.url; return; }
  toast(CAL_NAMES[p] + ' is not ready yet. Try again soon.');
}
/* Everyone from the calendar goes into People, ready to pick in Hire Gerald and the send step */
async function importCal(p, btn) {
  const label = btn ? btn.textContent : '';
  if (btn) { btn.disabled = true; btn.textContent = 'Importing...'; }
  const r = await LIVE.call('/calendar/import', { provider: p }).catch(() => ({}));
  if (btn) { btn.disabled = false; btn.textContent = label; }
  if (!r.ok) { toast(r.code === 'needs_reconnect' ? 'Connect ' + CAL_NAMES[p] + ' again, then import.' : 'That import did not finish. Try again in a minute.'); if (r.code === 'needs_reconnect') loadCalendar(); return; }
  toast(r.added ? 'Added ' + r.added + (r.added === 1 ? ' person' : ' people') + ' from ' + CAL_NAMES[p] + ' to People.' : 'Everyone from ' + CAL_NAMES[p] + ' is already in People.');
  loadPeople();
}
function offerImport(p) {
  const body = mk('p', 'muted', 'Bring everyone from ' + CAL_NAMES[p] + ' into People, so you can pick them when you or Gerald make a pizza. You choose how you know each person when you send.');
  liveSheet('Add your ' + CAL_NAMES[p] + ' contacts?', body, [
    { label: 'Import contacts', primary: true, run: () => { closeLiveSheet(); importCal(p); } },
    { label: 'Not now', run: closeLiveSheet }]);
}
function disconnectCal(p) {
  const body = mk('p', 'muted', 'Your meetings from ' + CAL_NAMES[p] + ' stop showing on Home and no more pizzas go out for them. You can connect again anytime.');
  liveSheet('Disconnect ' + CAL_NAMES[p] + '?', body, [
    { label: 'Disconnect', primary: true, run: async () => { await LIVE.call('/calendar/disconnect', { provider: p }).catch(() => null); closeLiveSheet(); toast(CAL_NAMES[p] + ' is disconnected.'); loadCalendar(); } },
    { label: 'Keep it', run: closeLiveSheet }]);
}
/* After a meeting ends: Ask (picked meetings wait on Home), Auto (Pro: picked meetings send), Off. Saved on the account. */
(function afterMeetingSetting() {
  const txt = { ask: 'Pick meetings on Home. When one ends, your signature pizza waits there for you to send.', auto: 'Every meeting gets your signature pizza when it ends, unless you turn it off on Home.', off: 'No pizzas for meetings. Make pizzas only when you open the app.' };
  ['ask', 'auto', 'off'].forEach(k => { const r = $('#mode-' + k); const sm = r && r.parentElement.querySelector('small'); if (sm) sm.textContent = txt[k]; });
  const ask = $('#mode-ask'); const ab = ask && ask.parentElement.querySelector('b'); if (ab) ab.textContent = 'I pick the meetings';
  const auto = $('#mode-auto'); const xb = auto && auto.parentElement.querySelector('b'); if (xb && xb.firstChild) xb.firstChild.textContent = 'Every meeting, automatically';
  const ext = $('#extOnly'); if (ext) { const l = ext.closest('label'); if (l) l.hidden = true; }
  SOTR.querySelectorAll('input[name=mode]').forEach(r => r.addEventListener('change', e => {
    if (settings.mode !== e.target.value || !LIVE.TOKEN) return;
    LIVE.call('/profile', { profile: { prefs: { after_meeting: settings.mode } } });
    if (!views.today.hidden) renderToday();
  }));
})();
/* The signature pizza is kept on the account too, so it can go out when a meeting ends */
function syncSignature() {
  if (!LIVE.TOKEN || !account) return;
  let img = ''; try { img = pizzaImage(clonePizza(signature), false); } catch (e) { img = ''; }
  LIVE.call('/signature', { pizza: cleanPizza(signature), box: boxPayload(Object.assign(boxFromProfile(null), { kind: 'business' })), image_data_url: img.length < 1900000 ? img : '' }).catch(() => null);
}
const _saveSig = $('#saveSig').onclick;
$('#saveSig').onclick = function () { _saveSig.apply(this, arguments); syncSignature(); };
function calStart(s) {
  const prefs = s.prefs || {};
  if (prefs.after_meeting && prefs.after_meeting !== settings.mode && ((prefs.after_meeting !== 'auto' && prefs.after_meeting !== 'tags') || calAuto())) { settings.mode = prefs.after_meeting; store.set('settings', settings); }
  if (prefs.signature && prefs.signature.pizza && !store.get('signature', null)) { signature = prefs.signature.pizza; store.set('signature', signature); }
  else if (!prefs.signature && store.get('signature', null)) syncSignature();
  const q = new URLSearchParams(location.search).get('calendar');
  if (q) {
    const p = q.split('_')[0], ok = q.slice(-10) === '_connected';
    try { history.replaceState(null, '', location.pathname); } catch (e) { /* ignore */ }
    toast(ok ? (CAL_NAMES[p] || 'Your calendar') + ' is connected. Your meetings are on Home.' : 'That did not connect. Try again from Settings > Calendar.');
    setTimeout(() => { show(ok ? 'today' : 'settings'); if (ok && CAL_NAMES[p]) setTimeout(() => offerImport(p), 600); }, 50);
  }
  renderCalendarCard();
  loadCalendar();
  setInterval(() => { if (!document.hidden && !views.today.hidden) loadCalendar(); }, 90000);
}
renderCalendarCard();

/* Test hook, only when the widget sets data-debug */
if (host_isDebug()) { window.__SOT_DEBUG = { toppings() { return pizza.toppings.length; }, box() { return { style: box.style, note: box.note, sticker: box.sticker }; }, goSend() { pizza = P_demo(); step = 5; saidStep = 5; show('make'); renderStep(); } }; }
function host_isDebug() { return SOTR.host.hasAttribute('data-debug'); }
function P_demo() { const p = clonePizza(signature); p.baked = true; p.bake = 1; p.tosses = 3; return p; }

/* Date pizzas go at the top of Home > This week. Runs after the calendar's version, which rebuilds the list. */
const _renderTodayD = renderToday;
renderToday = function () {
  _renderTodayD();
  const ul = $('#meetings'); if (!ul || !dates.loaded) return;
  const done = new Set(dates.waiting.map(w => w.contact.id + w.kind).concat(dates.sent.map(x => x.name + x.kind)));
  const rows = dates.waiting.map(dateRow)
    .concat(dates.sent.filter(x => x.occurs_on === dates.today).map(x => { const li = mk('li', 'meeting'); li.style.gridTemplateColumns = '1fr'; const i = mk('div', 'info');
      i.append(mk('b', '', 'Sent today: ' + x.name + "'s " + KIND_WORD[x.kind] + ' pizza'), mk('span', 'muted', 'Gerald made it and Potato delivered it this morning.')); li.appendChild(i); return li; }))
    .concat(dates.upcoming.filter(u => !(u.days_away === 0 && (done.has(u.contact_id + u.kind) || done.has(u.name + u.kind)))).map(upcomingRow));
  rows.slice().reverse().forEach(li => ul.insertBefore(li, ul.firstChild));
};

/* --- Send step: pick someone from People, by name or by tag, or send to everyone with a tag --- */
let pickQ = '', pickTag = '', pickOn = false;
function pickMatches() {
  const q = pickQ.trim().toLowerCase(), t = pickTag.toLowerCase();
  return contacts.filter(c => (!t || (c.tags || []).some(x => x.toLowerCase() === t)) &&
    (!q || [c.name, c.contact, c.company].concat(c.tags || []).some(v => String(v || '').toLowerCase().indexOf(q) >= 0)));
}
function pickPerson(c) {
  box.to = c.name; box.contact = c.contact || ''; box.company = c.company || ''; box.role = c.role || '';
  $('#toName').value = box.to; $('#toContact').value = box.contact;
  const ctry = $('#liveCountry'); if (ctry && c.country) { ctry.value = [...ctry.options].some(o => o.value === c.country) ? c.country : 'OTHER'; }
  const bs = $('#liveBasis'); if (bs && c.hasConsent) bs.value = 'relationship';
  if (c.vegan && !pizza.vegan) toast('Heads up: ' + first(c.name) + ' is marked vegan. You can turn on vegan on the Dough step.');
  pickQ = ''; pickTag = ''; const ps = $('#pickSearch'); if (ps) ps.value = '';
  renderPicker(); showCoRole(); renderSend();
}
function renderPicker() {
  const sf = $('#sendFields'); if (!sf) return;
  let w = $('#pickWrap');
  if (!contacts.length) { if (w) w.hidden = true; return; }
  if (!w) {
    w = document.createElement('div'); w.className = 'field'; w.id = 'pickWrap';
    w.innerHTML = '<label>Send to</label><div class="chips" id="pickMode"></div><div id="pickBody" style="display:flex;flex-direction:column;gap:6px">' +
      '<div class="two"><input type="text" id="pickSearch" inputmode="search" placeholder="Name, email, company or tag" autocomplete="off">' +
      '<select id="pickTag" aria-label="Filter by tag"></select></div>' +
      '<ul class="pick-list" id="pickList" style="list-style:none;margin:6px 0 0;padding:0;display:flex;flex-direction:column;gap:6px"></ul>' +
      '<button class="btn small" type="button" id="pickAll" hidden></button></div>';
    sf.insertBefore(w, sf.firstChild);
    $('#pickSearch').addEventListener('input', e => { pickQ = e.target.value; renderPicker(); });
    $('#pickTag').addEventListener('change', e => { pickTag = e.target.value; renderPicker(); });
    $('#pickAll').onclick = () => { if (pickTag) groupSend(pickMatches(), 'everyone tagged ' + pickTag); };
  }
  w.hidden = false;
  /* Someone new types the name and email below; Someone in People shows the search */
  makeChips($('#pickMode'), [['new', 'Someone new'], ['people', 'Someone in People']], () => pickOn ? 'people' : 'new', v => {
    const on = v === 'people'; if (on === pickOn) return;
    pickOn = on; pickQ = ''; pickTag = ''; $('#pickSearch').value = '';
    if (!on) { box.to = ''; box.contact = ''; box.company = ''; box.role = ''; $('#toName').value = ''; $('#toContact').value = ''; renderSend(); }
    renderPicker(); if (on) $('#pickSearch').focus();
  });
  $('#pickBody').hidden = !pickOn;
  if (!pickOn) return;
  const sel = $('#pickTag'), tags = allTags();
  sel.innerHTML = '<option value="">All tags</option>' + tags.map(x => '<option>' + esc(x.t) + '</option>').join('');
  if (pickTag && !tags.some(x => x.t === pickTag)) pickTag = '';
  sel.value = pickTag; sel.hidden = !tags.length;
  const list = $('#pickList'); list.innerHTML = '';
  const m = (pickQ.trim() || pickTag) ? pickMatches() : [];
  m.slice(0, 6).forEach(c => {
    const li = document.createElement('li'), b = document.createElement('button');
    b.type = 'button'; b.className = 'btn small'; b.style.cssText = 'width:100%;justify-content:flex-start;text-align:left;font-weight:600';
    b.textContent = c.name + (c.contact ? ' · ' + c.contact : '') + ((c.tags || []).length ? ' · ' + c.tags.join(', ') : '');
    b.onclick = () => pickPerson(c); li.appendChild(b); list.appendChild(li);
  });
  if ((pickQ.trim() || pickTag) && !m.length) list.appendChild(mk('li', 'muted', 'No one matches. Type their name and email below.'));
  if (m.length > 6) list.appendChild(mk('li', 'muted', (m.length - 6) + ' more. Type more of the name to narrow it down.'));
  const all = $('#pickAll'); all.hidden = !pickTag || m.length < 2;
  all.textContent = 'Send to all ' + m.length + ' tagged ' + pickTag + (isPro() ? '' : ' (Pro)');
}
const _renderSendPick = renderSend;
renderSend = function () { _renderSendPick(); renderPicker(); };

/* --- More signature pizzas: a list per member (A Slice 1, The Whole Pie 10, Pizza Party 20), business or personal,
   plus premade ones to add. The main one is the pizza that goes out after meetings. --- */
let sigs = { items: [], limit: 1, main_id: null, loaded: false }, editingSigId = null;
const SIG_PREMADES = [
  { id: 'thanks', kind: 'business', name: 'The Thank-You Special', desc: 'Pepperoni, basil and a handshake in a Kraft box.', make: () => defaultSignature(), box: { style: 'kraft', sticker: 'Thank You', confetti: 'classic', note: 'Thanks for your time today, [first name]. This one is on me.' } },
  { id: 'meeting', kind: 'business', name: 'Great Meeting', desc: 'Classic Pepperoni in a Classic box.', pm: 'pep', box: { style: 'classic', sticker: 'Great Meeting', confetti: 'classic', note: 'Great meeting today, [first name]. Looking forward to what comes next.' } },
  { id: 'nice', kind: 'business', name: 'Nice to Meet You', desc: 'A fresh Margherita in a Kraft box.', pm: 'marg', box: { style: 'kraft', sticker: 'Nice to Meet You', confetti: 'classic', note: 'It was great to meet you, [first name].' } },
  { id: 'client', kind: 'business', vibe: 'client', pro: true, note: 'Welcome aboard, [first name]! We are so glad you are here.' },
  { id: 'win', kind: 'business', vibe: 'win', pro: true, note: 'Congrats on the big win, [first name]! You earned this one.' },
  { id: 'referral', kind: 'business', vibe: 'referral', pro: true, note: 'Thank you for the referral, [first name]. It means a lot.' },
  { id: 'yearend', kind: 'business', vibe: 'yearend', pro: true, note: 'Thank you for a great year, [first name]. Here is to the next one.' },
  { id: 'thankyou', kind: 'personal', name: 'Thank You So Much', desc: 'Four Cheese in a Kraft box.', pm: 'four', box: { style: 'kraft', sticker: 'Thank You', confetti: 'classic', note: 'Thank you so much, [first name]. You are the best.' } },
  { id: 'celebrate', kind: 'personal', name: "Let's Celebrate", desc: 'A Supreme in a Classic box.', pm: 'supreme', box: { style: 'classic', sticker: "Let's Do This", confetti: 'classic', note: 'Time to celebrate, [first name]!' } },
  { id: 'bday', kind: 'personal', vibe: 'bday', pro: true, note: 'Happy birthday, [first name]! Gerald made this one just for you.' },
  { id: 'love', kind: 'personal', vibe: 'love', pro: true, note: 'Happy anniversary, [first name]. Here is to many more.' },
  { id: 'retire', kind: 'personal', vibe: 'retire', pro: true, note: 'Happy retirement, [first name]! Enjoy every slice.' },
  { id: 'holiday', kind: 'personal', vibe: 'holiday', pro: true, note: 'Happy holidays, [first name]! Warm wishes from all of us.' },
  { id: 'cheers', kind: 'personal', vibe: 'cheers', pro: true, note: 'Cheers to you, [first name]!' }
];
function sigPremade(pm) {
  const rv = pm.vibe ? reserveVibe(pm.vibe) : null;
  let p;
  if (rv) p = geraldPizza(pm.vibe, '', !!settings.veganDefault);
  else if (pm.pm) p = premadePizza(PREMADES.find(x => x.id === pm.pm));
  else p = pm.make();
  p.baked = true; p.bake = Math.max(p.bake || 0, .6);
  const name = rv ? rv.pizza : pm.name;
  p.name = name;
  const bx = rv ? { style: rv.style, sticker: rv.sticker, confetti: rv.confetti, note: pm.note } : pm.box;
  return { name, kind: pm.kind, pizza: cleanPizza(p), box: Object.assign({ kind: pm.kind }, bx), desc: rv ? (STYLES[rv.style] || 'Reserve') + ' box with a ' + rv.sticker + ' sticker. Gerald\'s Reserve.' : pm.desc };
}
/* The parts of a box a signature keeps. Photos stay out (they are per send). */
function sigBoxOf(b) {
  const keep = ['kind', 'style', 'sticker', 'confetti', 'tone', 'note', 'sign', 'linkLabel', 'link', 'lidText', 'topper'];
  const o = {}; keep.forEach(k => { if (b && b[k] !== undefined && b[k] !== null) o[k] = b[k]; });
  if (b && b.reward && b.reward.code) o.reward = { text: b.reward.text || '', code: b.reward.code, link: b.reward.link || '', exp: b.reward.exp || '' };
  return o;
}
const sigMain = () => sigs.items.find(x => x.id === sigs.main_id) || sigs.items[0] || null;
async function loadSigs() {
  if (!LIVE.TOKEN || !account) return;
  const r = await LIVE.call('/signatures').catch(() => null);
  if (!r || !r.ok) return;
  sigs = { items: Array.isArray(r.items) ? r.items : [], limit: Number(r.limit) || 1, main_id: r.main_id || null, loaded: true };
  /* First time: the signature pizza they already had becomes the first one on the list */
  if (!sigs.items.length && signature) {
    await saveSigItem({ name: signature.name || 'My signature pizza', kind: 'business', pizza: cleanPizza(signature), box: sigBoxOf(boxFromProfile(null)) }, true, true);
    return;
  }
  const m = sigMain(); if (m && m.pizza) { signature = m.pizza; store.set('signature', signature); }
  renderSigList();
}
async function saveSigItem(item, main, quiet) {
  let img = '';
  if (main) { try { img = pizzaImage(clonePizza(item.pizza), false); } catch (e) { img = ''; } }
  const r = await LIVE.call('/signatures/save', { item: Object.assign({}, item, { main: !!main }), image_data_url: img.length < 1900000 ? img : '' }).catch(() => null);
  if (!r || !r.ok) {
    if (!quiet) toast(r && r.code === 'signature_limit' ? 'Your signature pizzas are full (' + r.limit + '). Remove one first.' : MSG.server_error);
    return null;
  }
  if (main) { signature = item.pizza; store.set('signature', signature); }
  await loadSigs();
  return r.id;
}
/* Put a signature pizza in the Kitchen, ready on the Send step. Whoever it was for stays filled in. */
function applySig(item) {
  const to = box.to || '', contact = box.contact || '', company = box.company || '', role = box.role || '';
  editingSignature = false; editingSigId = null; toggleHire(false);
  pizza = clonePizza(item.pizza); pizza.baked = true; pizza.bake = Math.max(pizza.bake || 0, .6);
  box = Object.assign(boxFromProfile(meetings.find(x => x.id === currentMeetingId) || null), item.box || {});
  if (to) { box.to = to; box.contact = contact; box.company = company; box.role = role; }
  step = 5; saidStep = -1; show('make'); toast(item.name + ' is ready. Pick who it is for and send.');
}
function pickSig(fresh) {
  if (fresh) { currentMeetingId = null; box.to = ''; box.contact = ''; }
  if (sigs.items.length <= 1) { const m = sigMain(); if (m) applySig(m); else useSignature(); return; }
  const list = document.createElement('div'); list.style.cssText = 'display:flex;flex-direction:column;gap:8px';
  sigs.items.forEach(it => {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'btn small'; b.style.cssText = 'justify-content:flex-start;gap:10px;text-align:left';
    const c = document.createElement('canvas'); c.width = c.height = 40; c.style.cssText = 'width:40px;height:40px;flex:none'; b.appendChild(c); try { drawPizza(c, it.pizza, 40); } catch (e) {}
    b.appendChild(document.createTextNode(it.name + (it.kind === 'personal' ? ' (personal)' : '') + (it.id === sigs.main_id ? ' · Main' : '')));
    b.onclick = () => { closeLiveSheet(); applySig(it); }; list.appendChild(b);
  });
  liveSheet('Pick a signature pizza', list, []);
  const back = $('#liveSheet'); if (back) { const row = back.querySelector('.btn-row'); const x = document.createElement('button'); x.type = 'button'; x.className = 'btn ghost'; x.textContent = 'Cancel'; x.onclick = closeLiveSheet; row.appendChild(x); }
}
$('#kxSig').onclick = () => pickSig(false);
$('#sendSig').onclick = () => pickSig(true);
$('#editSig').onclick = () => { const m = sigMain(); if (m) editSig(m); else { editingSignature = true; currentMeetingId = null; pizza = clonePizza(signature); box = boxFromProfile(null); step = 2; saidStep = -1; show('make'); } };
function editSig(it) {
  editingSignature = true; editingSigId = it.id; currentMeetingId = null;
  pizza = clonePizza(it.pizza); box = Object.assign(boxFromProfile(null), it.box || {}); step = 2; saidStep = -1; show('make');
  toast('Editing ' + it.name + '. Save it on the Send step.');
}
/* Save as my signature pizza: changes the one being edited, or adds a new one (A Slice keeps one, so it is replaced) */
$('#saveSig').onclick = async function () {
  const p = clonePizza(pizza); p.baked = true; p.bake = Math.max(p.bake || 0, .6); if (!p.name) p.name = suggestName();
  const item = { name: p.name, kind: box.kind === 'personal' ? 'personal' : 'business', pizza: cleanPizza(p), box: sigBoxOf(box) };
  let main = false;
  if (!sigs.loaded) { signature = p; store.set('signature', signature); syncSignature(); toast('Saved as your signature pizza.'); }
  else {
    if (editingSigId) { item.id = editingSigId; const old = sigs.items.find(x => x.id === editingSigId); if (old) item.name = old.name; main = editingSigId === sigs.main_id; }
    else if (sigs.items.length >= sigs.limit) {
      if (sigs.limit > 1) { toast('Your signature pizzas are full (' + sigs.limit + '). Remove one in Settings first.'); return; }
      const only = sigs.items[0]; if (only) item.id = only.id; main = true;
    } else main = !sigs.items.length;
    const id = await saveSigItem(item, main); if (!id) return;
    toast(editingSigId ? 'Saved ' + item.name + '.' : (main ? 'Saved as your signature pizza.' : 'Added ' + item.name + ' to your signature pizzas.'));
  }
  if (main) { profile.note = box.note; profile.sign = box.sign; profile.sticker = box.sticker; profile.linkLabel = box.linkLabel; profile.link = box.link; saveProfile(); }
  editingSigId = null;
  if (editingSignature) { editingSignature = false; show('settings'); }
};
function openSigPremades(kind) {
  const wrap = document.createElement('div'); wrap.style.cssText = 'display:flex;flex-direction:column;gap:10px';
  const tabs = document.createElement('div'); tabs.className = 'chips';
  [['business', 'Business'], ['personal', 'Personal']].forEach(([k, l]) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip'; b.textContent = l; b.setAttribute('aria-pressed', String(k === kind)); b.onclick = () => openSigPremades(k); tabs.appendChild(b); });
  wrap.appendChild(tabs);
  SIG_PREMADES.filter(x => x.kind === kind).forEach(pm => {
    const it = sigPremade(pm), locked = pm.pro && !isPro();
    const row = document.createElement('div'); row.className = 'sig-pm'; row.style.cssText = 'display:grid;grid-template-columns:56px 1fr auto;gap:10px;align-items:center';
    const c = document.createElement('canvas'); c.width = c.height = 56; c.style.cssText = 'width:56px;height:56px;flex:none'; try { drawPizza(c, it.pizza, 56); } catch (e) {}
    const t = document.createElement('div'); t.appendChild(mk('b', '', it.name)); if (locked) { const tg = mk('span', 'pro-tag', 'Pro'); t.appendChild(tg); }
    t.appendChild(mk('div', 'muted', it.desc || ''));
    const add = document.createElement('button'); add.type = 'button'; add.className = 'btn small' + (locked ? '' : ' primary'); add.textContent = 'Add';
    add.onclick = async () => {
      if (locked) { closeLiveSheet(); upgrade('reserve'); return; }
      const full = sigs.items.length >= sigs.limit;
      if (full && sigs.limit > 1) { toast('Your signature pizzas are full (' + sigs.limit + '). Remove one first.'); return; }
      if (full) { const only = sigs.items[0]; if (only) it.id = only.id; }
      add.disabled = true; const main = full || !sigs.items.length;
      const id = await saveSigItem({ id: it.id, name: it.name, kind: it.kind, pizza: it.pizza, box: it.box }, main);
      add.disabled = false; if (!id) return;
      closeLiveSheet(); toast(full ? it.name + ' is now your signature pizza.' : 'Added ' + it.name + ' to your signature pizzas.');
    };
    row.append(c, t, add); wrap.appendChild(row);
  });
  liveSheet('Premade signature pizzas', wrap, []);
  const back = $('#liveSheet'); if (back) { const row = back.querySelector('.btn-row'); const x = document.createElement('button'); x.type = 'button'; x.className = 'btn ghost'; x.textContent = 'Close'; x.onclick = closeLiveSheet; row.appendChild(x); }
}
function renderSigList() {
  const card = $('#sigCard'); if (!card || !sigs.loaded) return;
  let w = $('#sigList');
  if (!w) { w = document.createElement('div'); w.id = 'sigList'; w.style.cssText = 'display:flex;flex-direction:column;gap:10px;margin-top:12px'; (card.querySelector('.fold-body') || card).appendChild(w); }
  w.innerHTML = '';
  const h2 = card.querySelector(':scope > h2'), sm = card.querySelector(':scope > .afold-sum'), m = sigMain();
  if (h2) h2.textContent = 'Your signature pizzas';
  if (sm) sm.textContent = sigs.items.length + (sigs.items.length === 1 ? ' signature pizza' : ' signature pizzas') + (m ? '. After meetings: ' + m.name : '');
  const head = document.createElement('div'); head.style.cssText = 'display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap';
  head.appendChild(mk('b', '', 'Your signature pizzas (' + sigs.items.length + ' of ' + sigs.limit + ')'));
  const addPm = document.createElement('button'); addPm.type = 'button'; addPm.className = 'btn small'; addPm.id = 'sigPremades'; addPm.textContent = 'Add a premade';
  addPm.onclick = () => openSigPremades('business'); head.appendChild(addPm); w.appendChild(head);
  sigs.items.forEach(it => {
    const row = document.createElement('div'); row.className = 'sig-row'; row.style.cssText = 'display:grid;grid-template-columns:48px 1fr;gap:10px;align-items:center;border-top:1.5px solid #E3CBA6;padding-top:10px';
    const c = document.createElement('canvas'); c.width = c.height = 48; c.style.cssText = 'width:48px;height:48px;flex:none'; try { drawPizza(c, it.pizza, 48); } catch (e) {}
    const t = document.createElement('div'); t.appendChild(mk('b', '', it.name));
    t.appendChild(mk('div', 'muted', (it.kind === 'personal' ? 'Personal' : 'Business') + (it.id === sigs.main_id ? ' · Main: goes out after meetings' : '')));
    const btns = document.createElement('div'); btns.className = 'btn-row'; btns.style.marginTop = '6px';
    const b = (label, fn, primary) => { const x = document.createElement('button'); x.type = 'button'; x.className = 'btn small' + (primary ? ' primary' : ''); x.textContent = label; x.onclick = fn; btns.appendChild(x); };
    b('Send', () => { currentMeetingId = null; box.to = ''; box.contact = ''; applySig(it); }, true);
    b('Edit', () => editSig(it));
    if (it.id !== sigs.main_id && it.kind !== 'personal') b('Make main', async () => { if (await saveSigItem(it, true)) toast(it.name + ' now goes out after meetings.'); });
    b('Rename', () => {
      const f = document.createElement('div'); f.className = 'field'; f.innerHTML = '<label for="sigNewName">Name</label><input type="text" id="sigNewName" maxlength="60">';
      liveSheet('Rename', f, [{ label: 'Save', primary: true, run: async () => { const n = $('#sigNewName').value.trim(); if (!n) return; closeLiveSheet(); if (await saveSigItem(Object.assign({}, it, { name: n }), it.id === sigs.main_id)) toast('Renamed.'); } }]);
      $('#sigNewName').value = it.name;
    });
    if (sigs.items.length > 1 && it.id !== sigs.main_id) b('Remove', () => liveSheet('Remove "' + it.name + '"?', null, [{ label: 'Remove', primary: true, run: async () => { closeLiveSheet(); const r = await LIVE.call('/signatures/remove', { id: it.id }).catch(() => null); if (r && r.ok) { toast('Removed.'); loadSigs(); } else toast(MSG.server_error); } }]));
    t.appendChild(btns); row.append(c, t); w.appendChild(row);
  });
  if (!isPro() && sigs.items.length >= sigs.limit) {
    const up = document.createElement('button'); up.type = 'button'; up.className = 'linkish'; up.textContent = 'Keep up to 10 signature pizzas on The Whole Pie';
    up.onclick = () => upgrade('signatures'); w.appendChild(up);
  }
}
PRO_INFO.signatures = ['Keep more signature pizzas', 'Save up to 10 signature pizzas, business and personal, and send any of them in one tap. Pizza Party keeps 20.'];
const _renderSettingsSigs = renderSettings;
renderSettings = function () { _renderSettingsSigs(); renderSigList(); };

/* --- Send to a group: start the box from a box preset --- */
let bulkPreset = null;
function renderBulkPreset() {
  const anchor = $('#bulkBiz'); if (!anchor) return;
  const card = anchor.closest('.card'); if (!card) return;
  let f = $('#bulkPresetRow');
  if (!f) {
    f = document.createElement('div'); f.className = 'field'; f.id = 'bulkPresetRow';
    f.innerHTML = '<label for="bulkPresetSel">Start from a box preset</label><select id="bulkPresetSel"></select><small id="bulkPresetHelp"></small>';
    const h = card.querySelector('h3'); card.insertBefore(f, h ? h.nextSibling : card.firstChild);
    f.querySelector('#bulkPresetSel').addEventListener('change', e => {
      const pr = presets.find(x => x.id === e.target.value);
      if (!pr) { bulkPreset = null; renderBulk(); return; }
      const b = presetBox(pr);
      bulkPreset = { id: pr.id, name: pr.name, linkLabel: b.linkLabel, link: b.link, reward: b.reward };
      bulk.style = b.style || bulk.style; bulk.sticker = b.sticker || bulk.sticker; bulk.confetti = b.confetti || bulk.confetti;
      if (b.note) bulk.note = b.note; bulk.sign = b.sign || '';
      renderBulk(); toast('The box is set from "' + pr.name + '". Change anything below.');
    });
  }
  const sel = $('#bulkPresetSel');
  sel.innerHTML = '<option value="">' + (presets.length ? 'Choose a preset' : 'No presets yet') + '</option>';
  presets.forEach(pr => { const o = document.createElement('option'); o.value = pr.id; o.textContent = pr.name; sel.appendChild(o); });
  sel.disabled = !presets.length; sel.value = bulkPreset && presets.some(x => x.id === bulkPreset.id) ? bulkPreset.id : '';
  $('#bulkPresetHelp').textContent = presets.length ? 'Sets the sticker, confetti, box style, note and sign-off for everyone on the list.' : 'Save a box as a preset on the Box step in the Kitchen, then pick it here.';
}
const _renderBulkP = renderBulk;
renderBulk = function () { _renderBulkP(); renderBulkPreset(); };
/* A preset's button and gift go on every box in the list */
const _bulkBoxP = bulkBox;
bulkBox = function (r) {
  const b = _bulkBoxP(r);
  if (bulkPreset) { if (bulkPreset.link) { b.link = bulkPreset.link; b.linkLabel = bulkPreset.linkLabel; } if (bulkPreset.reward && bulkPreset.reward.code) b.reward = bulkPreset.reward; }
  return b;
};

/* --- Confetti never gets stuck: it is placed on the visible screen (like the sheets), a failed frame clears it,
   and a timer clears anything left after the longest burst --- */
function fitConfetti() {
  const el = cfx; if (!el) return;
  el.style.transform = ''; el.style.width = ''; el.style.height = '';
  const vv = window.visualViewport, r = el.getBoundingClientRect();
  const top = vv ? vv.offsetTop : 0, left = vv ? vv.offsetLeft : 0, h = vv ? vv.height : innerHeight, w = vv ? vv.width : innerWidth;
  const dx = left - r.left, dy = top - r.top;
  if (Math.abs(dx) > 1 || Math.abs(dy) > 1 || Math.abs(r.height - h) > 1 || Math.abs(r.width - w) > 1) {
    el.style.transform = 'translate(' + dx + 'px,' + dy + 'px)'; el.style.width = w + 'px'; el.style.height = h + 'px';
  }
}
function clearConfetti() {
  if (cRaf) { cancelAnimationFrame(cRaf); cRaf = 0; }
  cparts = [];
  try { const c = cfx.getContext('2d'); c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, cfx.width, cfx.height); } catch (e) { /* ignore */ }
}
let confettiTimer = 0;
const _burstC = burst;
burst = function (kind) {
  fitConfetti();
  _burstC(kind);
  clearTimeout(confettiTimer);
  confettiTimer = setTimeout(clearConfetti, FALLING.includes(kind) ? 16000 : 9000);
};
const _cFrameC = cFrame;
cFrame = function () {
  try { _cFrameC(); } catch (e) { clearConfetti(); }
};
document.addEventListener('visibilitychange', () => { if (document.hidden) clearConfetti(); });
window.addEventListener('scroll', () => { if (cparts.length) fitConfetti(); }, { passive: true });

/* --- Plan a pizza for an upcoming meeting: make it now, it goes out when the meeting ends (Pro) --- */
function planMeeting(m) {
  if (!(LIVE.session && LIVE.session.features && LIVE.session.features.scheduling)) { upgrade('schedule'); return; }
  startFresh(m.id);
  box.sendAt = m.ends_at;
  toast('Make the pizza now. Potato takes it to ' + first(m.name || 'them') + ' when the meeting ends.');
}
PRO_INFO.schedule = ['Plan pizzas ahead', 'Make the pizza before the meeting and it goes out the moment the meeting ends.'];
const _buildPayloadM = buildPayload;
buildPayload = function () {
  const p = _buildPayloadM();
  if (p.box && typeof p.box.note === 'string' && p.recipient) p.box.note = fillNote(p.box.note, { name: p.recipient.name, company: p.recipient.company, role: p.recipient.role });
  if (currentMeetingId && cal.meetings.some(x => x.id === currentMeetingId)) p.meeting_id = currentMeetingId;
  if (box.sendAt && new Date(box.sendAt) > new Date()) { p.scheduled_for = new Date(box.sendAt).toISOString(); p.idem = (p.idem + '-plan').slice(0, 90); }
  return p;
};
const _renderSendM = renderSend;
renderSend = function () {
  _renderSendM();
  const b = $('#sendNow');
  if (b && box.sendAt && new Date(box.sendAt) > new Date()) b.textContent = 'Send when the meeting ends (' + new Date(box.sendAt).toLocaleString('en-US', { weekday: 'short', hour: 'numeric', minute: '2-digit' }) + ')';
};

/* --- After a meeting: "Only people with certain tags" --- */
settings.mtags = Array.isArray(settings.mtags) ? settings.mtags : [];
function renderModeTags() {
  const el = $('#modeTags'); if (!el) return;
  el.hidden = settings.mode !== 'tags';
  if (el.hidden) return;
  el.innerHTML = '';
  const tags = allTags().map(x => x.t);
  settings.mtags.forEach(t => { if (!tags.some(x => x.toLowerCase() === t.toLowerCase())) tags.push(t); });
  if (!tags.length) { el.appendChild(mk('small', 'muted', 'No tags yet. Add tags to people in People, then pick them here.')); return; }
  tags.forEach(t => {
    const b = mk('button', 'chip', t); b.type = 'button';
    const on = () => settings.mtags.some(x => x.toLowerCase() === t.toLowerCase());
    b.setAttribute('aria-pressed', String(on()));
    b.onclick = () => {
      settings.mtags = on() ? settings.mtags.filter(x => x.toLowerCase() !== t.toLowerCase()) : settings.mtags.concat([t]);
      store.set('settings', settings); b.setAttribute('aria-pressed', String(on()));
      if (LIVE.TOKEN) LIVE.call('/profile', { profile: { prefs: { after_meeting: 'tags', after_meeting_tags: settings.mtags } } }).then(() => loadCalendar()).catch(() => null);
      toast(settings.mtags.length ? 'Meetings with people tagged ' + settings.mtags.join(', ') + ' get your signature pizza.' : 'Pick at least one tag.');
    };
    el.appendChild(b);
  });
}
(function modeTagsSetting() {
  const r = $('#mode-tags'); const sm = r && r.parentElement.querySelector('small');
  if (sm) sm.textContent = 'Your signature pizza goes out after meetings with people in People who have one of these tags. Untick any meeting on Home to skip it.';
  SOTR.querySelectorAll('input[name=mode]').forEach(x => x.addEventListener('change', e => {
    renderModeTags();
    if (e.target.value === 'tags' && settings.mode === 'tags' && LIVE.TOKEN) LIVE.call('/profile', { profile: { prefs: { after_meeting: 'tags', after_meeting_tags: settings.mtags } } }).then(() => loadCalendar()).catch(() => null);
    else if (settings.mode === e.target.value && LIVE.TOKEN) setTimeout(() => loadCalendar(), 400);
  }));
})();
const _calStartM = calStart;
calStart = function (s) {
  const prefs = (s && s.prefs) || {};
  if (Array.isArray(prefs.after_meeting_tags)) { settings.mtags = prefs.after_meeting_tags; store.set('settings', settings); }
  _calStartM(s);
};
const _renderSettingsM = renderSettings;
renderSettings = function () { _renderSettingsM(); renderModeTags(); };

/* --- Free trial of The Whole Pie and the Get set up checklist (docs/ONBOARDING_PLAN.md) ---
   The server starts a 14 day trial on a new A Slice member's first sign in and ends it on its own.
   The app only explains it: a welcome sheet once, a card on Home, the plan card wording and the checklist. */
function trialOf() { const s = LIVE.session; return s && s.paid_plan === 'free' && s.trial ? s.trial : null; }
function savePrefs(p) { if (!LIVE.session) return; LIVE.session.prefs = Object.assign({}, LIVE.session.prefs || {}, p); if (LIVE.TOKEN) LIVE.call('/profile', { profile: { prefs: p } }).catch(() => null); }
function dayWord(n) { return n === 1 ? '1 day' : n + ' days'; }
const TRIAL_KEEP = ['Your logo and brand colors on the box', 'Your own button and a gift code', 'Pizzas after meetings and on birthdays that send on their own', 'Send to a whole list at once', '250 emails a month'];

function trialWelcome() {
  const t = trialOf(); const prefs = (LIVE.session && LIVE.session.prefs) || {};
  if (!t || !t.active || prefs.trial_welcome) return;
  const p = document.createElement('div');
  p.innerHTML = '<p>Gerald has the oven hot and Potato has her helmet on. Welcome to the kitchen.</p>' +
    '<p><b>Your ' + dayWord(t.days_left) + ' of The Whole Pie start now. No card needed.</b></p>' +
    '<p class="muted">You get every Whole Pie feature and 50 emails during your trial. When it ends you move to A Slice, which is free forever, unless you upgrade. Nothing you make is lost.</p>';
  liveSheet('Welcome to Slice of Thanks', p, [{ label: 'Get set up', primary: true, run: () => { closeLiveSheet(); savePrefs({ trial_welcome: true }); show('today'); const c = $('#setupCard'); if (c) c.scrollIntoView({ behavior: 'smooth', block: 'start' }); } }]);
  const b = $('#liveSheet'); const x = b && b.querySelector('.btn.ghost'); if (x) { x.textContent = 'Later'; x.onclick = () => { b.hidden = true; savePrefs({ trial_welcome: true }); }; }
}

function renderTrialCard() {
  const home = $('#view-today'); if (!home) return;
  let c = $('#trialCard'); const t = trialOf(); const prefs = (LIVE.session && LIVE.session.prefs) || {};
  const ended = t && !t.active;
  if (!t || (ended && prefs.trial_end_seen)) { if (c) c.remove(); return; }
  if (!c) { c = mk('div', 'card trial-card'); c.id = 'trialCard'; home.insertBefore(c, home.firstChild); }
  c.innerHTML = '';
  const add = (tag, cls, text) => { const e = mk(tag, cls, text); c.appendChild(e); return e; };
  if (!ended) {
    const soon = t.days_left <= 3;
    add('p', 'eyebrow', 'Free trial');
    add('h2', '', soon ? (t.days_left <= 1 ? 'Your trial ends today' : dayWord(t.days_left) + ' left of The Whole Pie') : 'You are on The Whole Pie for ' + dayWord(t.days_left));
    add('p', 'muted', soon ? 'Upgrade to keep these when your trial ends:' : 'No card needed. Every Whole Pie feature is on, with 50 emails for your trial.');
    if (soon) { const ul = add('ul', ''); TRIAL_KEEP.forEach(k => ul.appendChild(mk('li', '', k))); }
  } else {
    add('p', 'eyebrow', 'Trial over');
    add('h2', '', 'You are on A Slice now');
    add('p', 'muted', 'Your free trial of The Whole Pie ended. Everything you made is saved. Pro items show a Pro tag until you upgrade. These changed:');
    const ul = add('ul', ''); ['Your logo, button and gift code are off on new pizzas', 'Pizzas after meetings and on birthdays now wait for you to send', 'Send to a group is off', '10 emails a month'].forEach(k => ul.appendChild(mk('li', '', k)));
  }
  const row = add('div', 'btn-row');
  const up = mk('button', 'btn primary small', 'Upgrade to The Whole Pie'); up.type = 'button'; up.onclick = () => goPro(); row.appendChild(up);
  if (ended) { const ok = mk('button', 'btn ghost small', 'Got it'); ok.type = 'button'; ok.onclick = () => { savePrefs({ trial_end_seen: true }); c.remove(); }; row.appendChild(ok); }
}

/* Get set up: each step is done when the app can see it, or when the member taps Do it on a step it cannot see */
function setupSteps() {
  const s = LIVE.session || {}; const pr = s.profile || {}; const pro = s.plan !== 'free';
  const go = (view, card) => () => { show(view); if (card) setTimeout(() => { const el = typeof card === 'function' ? card() : $(card); if (el) { openFold(el); el.scrollIntoView({ behavior: 'smooth', block: 'start' }); } }, 80); };
  const st = [
    { id: 'name', title: 'Name and business', text: 'Your name, your business, and whether pizzas come from you or the business.', done: () => !!pr.display_name && !!(profile.business || pr.business_name), run: go('settings', '#youCard') },
    { id: 'reply', title: 'Where replies go', text: 'The email that gets replies to your pizzas.', done: () => !!pr.reply_to, run: go('settings', '#youCard') },
    { id: 'brand', pro: true, title: 'Logo and brand colors', text: 'Your logo and two colors on every box.', done: () => !!(profile.logo || pr.logo_url), run: go('settings', '#boxCard') },
    { id: 'sig', title: 'Your signature pizza', text: 'Pick a premade or make your own. It is the pizza that goes out after meetings.', done: () => sigs.items.length > 0, run: go('settings', '#sigCard') },
    { id: 'test', title: 'Send a test pizza to yourself', text: 'See exactly what people get.', manual: true, run: () => { show('make'); toast('Make a pizza, then send it to your own email.'); } },
    { id: 'people', title: 'Add your people', text: pro ? 'Upload a CSV, or add three people with birthdays and tags.' : 'Add people one at a time, with birthdays.', done: () => contacts.length >= (pro ? 3 : 1), run: go('people') },
    { id: 'hire', free: true, title: 'Try Hire Gerald', text: 'Let the Head Chef make a pizza for someone.', manual: true, run: () => { const b = $('#homeHire'); show('today'); if (b) b.click(); } },
    { id: 'cal', pro: true, title: 'Connect your calendar', text: 'Calendly or TidyCal, so pizzas go out after meetings.', done: () => cal.integrations.length > 0, run: go('settings', calCardEl) },
    { id: 'dates', title: 'Turn on Gerald never forgets a date', text: pro ? 'Birthday and work anniversary pizzas, sent on their own or waiting for you.' : 'Birthday and work anniversary pizzas wait for you to send.', done: () => datesPrefs.mode === 'wait' || datesPrefs.mode === 'auto', run: go('settings', '#datesCard') }
  ];
  return st.filter(x => !(x.pro && !pro) && !(x.free && pro));
}
let setupCelebrated = false;
function renderSetup() {
  const home = $('#view-today'); const s = LIVE.session; if (!home || !s) return;
  const prefs = s.prefs || {}; const su = Object.assign({ done: [], skip: [] }, prefs.setup || {});
  let c = $('#setupCard');
  if ((!trialOf() && !prefs.setup) || su.dismissed) { if (c) c.remove(); return; }
  const steps = setupSteps();
  const isDone = x => su.done.indexOf(x.id) >= 0 || (x.done && x.done());
  const n = steps.filter(isDone).length, all = steps.every(x => isDone(x) || su.skip.indexOf(x.id) >= 0);
  if (!c) { c = mk('div', 'card'); c.id = 'setupCard'; const t = $('#trialCard'); if (t) t.after(c); else home.insertBefore(c, home.firstChild); }
  const open = c.dataset.open !== '0';
  c.innerHTML = '';
  const head = mk('div', 'setup-head'); head.appendChild(mk('h2', '', 'Get set up'));
  const tg = mk('button', 'btn ghost small', open ? 'Fold' : 'Show'); tg.type = 'button'; tg.onclick = () => { c.dataset.open = open ? '0' : '1'; renderSetup(); }; head.appendChild(tg);
  c.appendChild(head);
  c.appendChild(mk('p', 'muted', n + ' of ' + steps.length + ' done' + (all ? '. You are all set.' : '')));
  const bar = mk('div', 'setup-bar'); const fill = mk('i'); fill.style.width = Math.round(100 * n / steps.length) + '%'; bar.appendChild(fill); c.appendChild(bar);
  if (open) {
    const ul = mk('ul', 'setup-list');
    steps.forEach(x => {
      const d = isDone(x), sk = !d && su.skip.indexOf(x.id) >= 0;
      const li = mk('li', d ? 'done' : sk ? 'skip' : '');
      li.appendChild(mk('span', 'tick', d ? '✓' : sk ? '-' : ''));
      const t = mk('span', 't'); t.appendChild(mk('b', '', x.title)); t.appendChild(mk('small', '', x.text)); li.appendChild(t);
      const a = mk('span', 'acts');
      if (!d) {
        const b = mk('button', 'btn small' + (sk ? '' : ' primary'), 'Do it'); b.type = 'button';
        b.onclick = () => { if (x.manual) markSetup(x.id, 'done'); x.run(); }; a.appendChild(b);
        if (!sk) { const k = mk('button', 'linkish', 'Skip'); k.type = 'button'; k.onclick = () => markSetup(x.id, 'skip'); a.appendChild(k); }
      }
      li.appendChild(a); ul.appendChild(li);
    });
    c.appendChild(ul);
    const row = mk('div', 'btn-row'); const hide = mk('button', 'btn ghost small', all ? 'Done, hide this' : 'Hide the checklist'); hide.type = 'button';
    hide.onclick = () => { su.dismissed = true; savePrefs({ setup: su }); c.remove(); }; row.appendChild(hide); c.appendChild(row);
  }
  if (all && !su.rewarded && !setupCelebrated && n === steps.length) {
    setupCelebrated = true; su.rewarded = true; savePrefs({ setup: su });
    treats.bal += 20; saveTreats(); try { burst('gold'); } catch (_) {}
    toast('Fully set up! Potato found you an easter egg: +20 Treats');
  }
}
function markSetup(id, kind) {
  const s = LIVE.session; if (!s) return;
  const su = Object.assign({ done: [], skip: [] }, (s.prefs || {}).setup || {});
  const list = kind === 'done' ? su.done : su.skip; if (list.indexOf(id) < 0) list.push(id);
  savePrefs({ setup: su }); renderSetup();
}

const _applySessionT = applySession;
applySession = function (s) {
  _applySessionT(s);
  renderTrialCard(); renderSetup();
  setTimeout(trialWelcome, 900);
  [1500, 4000].forEach(ms => setTimeout(renderSetup, ms));
};
const _showT = show;
show = function (v) { _showT(v); if (v === 'today' && LIVE.session) { renderTrialCard(); renderSetup(); } };
const _renderPlanCardT = renderPlanCard;
renderPlanCard = function () {
  _renderPlanCardT();
  const s = LIVE.session; const el = $('#planCard'); if (!s || !el) return;
  const t = trialOf(); const c = s.credits || {};
  const h = el.querySelector('h2'); const p = el.querySelector('p.muted');
  if (t && t.active && h) h.textContent = 'Your plan: The Whole Pie, free trial';
  if (p && c.bonus) p.textContent = p.textContent.replace('Emails left this month: ' + (c.monthly || 0), 'Emails left this month: ' + (c.monthly || 0) + ' plus ' + c.bonus + (t && t.active ? ' trial emails' : ' bonus emails'));
  if (p && t && t.active) p.textContent += ' Your trial ends in ' + dayWord(t.days_left) + '. No card needed.';
};

/* --- Send one back: the pizza page's button brings its link token here. The server adds the sender to People
   (name, business, reply email) and the Send step is filled in, so nobody has to know or type the email. --- */
(function catchSendBack() {
  const q = new URLSearchParams(location.search); const t = q.get('back');
  if (!t) return;
  store.set('sendBack', { t: t.slice(0, 400), at: Date.now() });
  q.delete('back'); q.delete('from');
  try { history.replaceState(null, '', location.pathname + (q.toString() ? '?' + q.toString() : '')); } catch (e) { /* ignore */ }
})();
async function useSendBack() {
  const sb = store.get('sendBack', null);
  if (!sb || !LIVE.TOKEN || !LIVE.session) return;
  store.set('sendBack', null);
  if (Date.now() - (sb.at || 0) > 7 * 864e5) return;
  const r = await LIVE.call('/sendback', { t: sb.t }).catch(() => null);
  if (!r || !r.ok || !r.person) { show('make'); toast('Make a pizza to send back. Add their name and email on the Send step.'); return; }
  const p = r.person; const who = first(p.name || 'them');
  if (!pizza.toppings.length || views.make.hidden) startFresh(null);
  pickPerson({ name: p.name || '', contact: p.email || '', company: p.company || '', hasConsent: !!p.email });
  if (p.email) loadPeople();
  toast(p.email ? 'Make a pizza back for ' + who + '. ' + (r.added ? 'They are in your People now, ' : '') + 'their email is filled in on the Send step.' : 'Make a pizza back for ' + who + '. Add their email on the Send step.');
}
const _applySessionB = applySession;
applySession = function (s) { _applySessionB(s); setTimeout(useSendBack, 300); };


/* --- Free test pizzas to yourself: up to 5, they use no emails and say TEST SEND (docs/ONBOARDING_PLAN.md) --- */
function myEmail() { const s = LIVE.session; return s && s.profile && s.profile.reply_to ? String(s.profile.reply_to).trim() : ''; }
function testsLeft() { const s = LIVE.session; return s && typeof s.self_tests_left === 'number' ? s.self_tests_left : 0; }
function renderTestBtn() {
  const send = $('#sendNow'); if (!send) return;
  let b = $('#liveTestSend');
  if (!LIVE.session || editingSignature) { if (b) b.hidden = true; return; }
  if (!b) { b = mk('button', 'btn', ''); b.type = 'button'; b.id = 'liveTestSend'; send.after(b); b.onclick = liveTestSend; }
  const n = testsLeft(); b.hidden = n <= 0;
  b.textContent = 'Send a test to myself (' + n + ' free left)';
}
async function liveTestSend() {
  const me = myEmail();
  if (!me || me.indexOf('@') < 1) { toast('Add your email in Settings under Replies go to first.'); show('settings'); return; }
  const b = $('#liveTestSend'); b.disabled = true; const label = b.textContent; b.textContent = 'Sending your test...';
  const pay = buildPayload();
  pay.idem = 'selftest-' + Date.now(); pay.is_test = true;
  pay.recipient = Object.assign({}, pay.recipient, { name: profile.name || 'Me', email: me });
  pay.consent = { basis: 'permission', method: 'Test send to myself' };
  pay.label = 'Test pizza';
  let r; try { r = await LIVE.call('/send', pay); } catch (e) { r = { code: 'server_error' }; }
  b.disabled = false; b.textContent = label;
  if (r && r.ok) {
    if (LIVE.session) LIVE.session.self_tests_left = Math.max(0, testsLeft() - 1);
    renderTestBtn(); markSetup('test', 'done');
    toast('Test sent to ' + me + '. It used no emails. ' + testsLeft() + ' free tests left.');
    burst('envelopes'); return;
  }
  if (r && (r.code === 'test_limit' || r.code === 'test_inbox_only')) { toast(MSG[r.code]); if (LIVE.session && r.code === 'test_limit') { LIVE.session.self_tests_left = 0; renderTestBtn(); } return; }
  sendProblem(r || {}, liveTestSend);
}
const _renderStepT = renderStep;
renderStep = function () { _renderStepT(); try { renderTestBtn(); } catch (e) {} };

/* --- Gerald's Birthday Special (docs/MEMBER_BIRTHDAY_PLAN.md) --- */
const BDAY_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
function bdayOf() { const s = LIVE.session; return (s && s.birthday) || {}; }
function bdayText(md) { if (!md) return ''; const m = +md.slice(0, 2), d = +md.slice(3, 5); return BDAY_MONTHS[m - 1] + ' ' + d; }
function bdayPicker(id, md) {
  const w = mk('div', 'btn-row'); w.style.alignItems = 'center';
  const ms = document.createElement('select'); ms.id = id + 'M'; ms.setAttribute('aria-label', 'Birthday month');
  ms.innerHTML = '<option value="">Month</option>' + BDAY_MONTHS.map((m, i) => '<option value="' + String(i + 1).padStart(2, '0') + '">' + m + '</option>').join('');
  const ds = document.createElement('select'); ds.id = id + 'D'; ds.setAttribute('aria-label', 'Birthday day');
  ds.innerHTML = '<option value="">Day</option>' + Array.from({ length: 31 }, (_, i) => '<option value="' + String(i + 1).padStart(2, '0') + '">' + (i + 1) + '</option>').join('');
  if (md) { ms.value = md.slice(0, 2); ds.value = md.slice(3, 5); }
  w.appendChild(ms); w.appendChild(ds);
  return w;
}
function pickedMd(id) { const m = $('#' + id + 'M'), d = $('#' + id + 'D'); return m && d && m.value && d.value ? m.value + '-' + d.value : ''; }
async function saveBirthday(md, after) {
  const r = await LIVE.call('/birthday', { md }).catch(() => null);
  if (!r || !r.ok) {
    if (r && r.code === 'birthday_locked') toast('Your birthday can be changed once a year. Next change: ' + shortDate(r.until) + '.');
    else toast(r && r.code === 'bad_date' ? 'Pick a month and a day.' : MSG.server_error);
    return false;
  }
  if (LIVE.session) LIVE.session.birthday = Object.assign({}, bdayOf(), { md: r.birthday });
  toast(md ? 'Saved. Gerald will remember ' + bdayText(md) + '.' : 'Birthday removed.');
  if (after) after();
  renderSetup(); return true;
}
/* Settings, You card: the birthday and the switch for Gerald's birthday pizza */
function renderBdayField() {
  const row = $('#liveYouSave') && $('#liveYouSave').parentElement; if (!row || !LIVE.session) return;
  let f = $('#liveBday');
  if (!f) { f = mk('div', 'field'); f.id = 'liveBday'; row.before(f); }
  const b = bdayOf(); f.innerHTML = '';
  const l = mk('label', '', 'Your birthday (optional)'); l.htmlFor = 'liveBdayPickM'; f.appendChild(l);
  f.appendChild(bdayPicker('liveBdayPick', b.md));
  const sv = mk('button', 'btn small', 'Save birthday'); sv.type = 'button'; f.querySelector('.btn-row').appendChild(sv);
  sv.onclick = () => { const md = pickedMd('liveBdayPick'); if (!md) { toast('Pick a month and a day.'); return; } saveBirthday(md, renderBdayField); };
  f.appendChild(mk('small', 'muted', 'Month and day only. Gerald bakes you a Birthday Special on the day.' + (b.locked_until ? ' It can be changed again on ' + shortDate(b.locked_until) + '.' : ' You can change it once a year.')));
  const sw = mk('label', 'meet-sw'); sw.style.marginTop = '8px';
  const cb = document.createElement('input'); cb.type = 'checkbox'; cb.checked = b.on !== false;
  cb.onchange = () => { LIVE.call('/profile', { profile: { prefs: { birthday_pizza: cb.checked } } }).catch(() => null); if (LIVE.session) LIVE.session.birthday = Object.assign({}, bdayOf(), { on: cb.checked }); toast(cb.checked ? 'Birthday pizza is on.' : 'Birthday pizza is off.'); };
  sw.appendChild(cb); sw.appendChild(document.createTextNode('Send me a birthday pizza')); f.appendChild(sw);
}
/* Home: ask once for the birthday; on the birthday, the gift and sharing */
function renderBdayHome() {
  const home = $('#view-today'); const s = LIVE.session; if (!home || !s) return;
  const b = bdayOf(), prefs = s.prefs || {}, sp = b.special;
  let c = $('#bdayCard');
  const ask = !b.md && !prefs.bday_ask_done && !trialOf();
  if (!sp && !ask) { if (c) c.remove(); return; }
  if (!c) { c = mk('div', 'card trial-card'); c.id = 'bdayCard'; const anchor = $('#setupCard') || $('#trialCard'); if (anchor) anchor.after(c); else home.insertBefore(c, home.firstChild); }
  c.innerHTML = '';
  if (sp) {
    c.appendChild(mk('p', 'eyebrow', "Gerald's Birthday Special"));
    c.appendChild(mk('h2', '', 'Happy birthday from the kitchen!'));
    const open = sp.gift === 'trial' && !sp.claimed && sp.claim_by && Date.parse(sp.claim_by) > Date.now();
    c.appendChild(mk('p', 'muted', (open ? 'Your gift: 14 days of The Whole Pie, on the house. Unlock them by ' + shortDate(sp.claim_by) + '. ' : sp.gift === 'trial' ? 'Your 14 days of The Whole Pie are unlocked. ' : 'Your gift: 100 bonus emails for 30 days and the ' + sp.year + ' birthday box topper, yours to keep. ') + 'You can also send the Birthday Special to anyone in People until ' + shortDate(sp.share_until) + '.'));
    const row = mk('div', 'btn-row');
    if (open) { const u = mk('button', 'btn primary small', 'Unlock my 14 days'); u.type = 'button'; u.onclick = claimBirthday; row.appendChild(u); }
    const sh = mk('button', 'btn small', 'Send the Birthday Special'); sh.type = 'button'; sh.onclick = shareBirthday; row.appendChild(sh);
    c.appendChild(row);
  } else {
    c.appendChild(mk('p', 'eyebrow', 'One quick question'));
    c.appendChild(mk('h2', '', 'When is your birthday?'));
    c.appendChild(mk('p', 'muted', 'Month and day only. Gerald bakes members a Birthday Special, with a gift under the pizza.'));
    c.appendChild(bdayPicker('homeBday', ''));
    const row = mk('div', 'btn-row');
    const sv = mk('button', 'btn primary small', 'Save'); sv.type = 'button';
    sv.onclick = () => { const md = pickedMd('homeBday'); if (!md) { toast('Pick a month and a day.'); return; } saveBirthday(md, () => { savePrefs({ bday_ask_done: true }); renderBdayHome(); }); };
    const no = mk('button', 'btn ghost small', 'No thanks'); no.type = 'button'; no.onclick = () => { savePrefs({ bday_ask_done: true }); c.remove(); };
    row.appendChild(sv); row.appendChild(no); c.appendChild(row);
  }
}
async function claimBirthday() {
  const r = await LIVE.call('/birthday/claim', {}).catch(() => null);
  if (!r || !r.ok) { toast(r && r.code === 'no_gift' ? 'There is no birthday gift to unlock right now.' : MSG.server_error); return; }
  const s = await LIVE.call('/session').catch(() => null);
  if (s && s.member_id) applySession(s);
  toast(r.already ? 'Your 14 days are already unlocked.' : 'Unlocked! The Whole Pie is yours until ' + shortDate(r.ends_at) + '.');
  burst('party');
}
function bdayPizza() {
  const p = newPizza(); p.sauce = 'red'; p.cheese = 'mozz'; p.toppings = [];
  [['pepStar', 12], ['pepHeart', 12], ['sprinkle', 22], ['candle', 6]].forEach(([k, n]) => { for (let i = 0; i < n; i++) { const a = Math.random() * 6.283, d = Math.sqrt(Math.random()) * 0.8; p.toppings.push({ k, x: Math.cos(a) * d, y: Math.sin(a) * d, rot: Math.random() * 6.283 }); } });
  p.bake = 1; p.baked = true; p.bakeLevel = 3; p.name = "Gerald's Birthday Special";
  return p;
}
function shareBirthday() {
  startFresh(null);
  pizza = bdayPizza();
  box.style = 'hearts'; box.sticker = 'Happy Birthday'; box.confetti = 'party'; box.birthdaySpecial = true;
  box.note = 'Happy birthday, [first name]! Gerald made you his Birthday Special.';
  step = 5; saidStep = 5; show('make'); renderStep();
  toast('Your Birthday Special is ready. Pick who it is for.');
}
const _boxPayloadB = boxPayload;
boxPayload = function (bx) { const b = _boxPayloadB(bx); if (bx.birthdaySpecial && bdayOf().special) { b.birthday_special = true; b.pro_style = false; b.confetti = 'party'; } return b; };
(function catchBirthdayUnlock() {
  const q = new URLSearchParams(location.search);
  if (q.get('birthday') !== 'unlock') return;
  store.set('bdayUnlock', Date.now());
  q.delete('birthday'); try { history.replaceState(null, '', location.pathname + (q.toString() ? '?' + q.toString() : '')); } catch (e) { /* ignore */ }
})();
const _applySessionBd = applySession;
applySession = function (s) {
  _applySessionBd(s);
  const b = (s && s.birthday) || {};
  OWNED_TOPPERS = (b.toppers || []).map(k => [k, k.slice(4) + ' birthday topper (yours to keep)', []]);
  renderBdayHome(); renderBdayField();
  const u = store.get('bdayUnlock', 0);
  if (u && Date.now() - u < 864e5) { store.set('bdayUnlock', 0); setTimeout(claimBirthday, 500); }
};
const _showBd = show;
show = function (v) { _showBd(v); if (LIVE.session) { if (v === 'today') renderBdayHome(); if (v === 'settings') renderBdayField(); } };
const _setupStepsB = setupSteps;
setupSteps = function () {
  const st = _setupStepsB();
  const t = st.find(x => x.id === 'test'); if (t) { t.manual = false; t.done = () => LIVE.session && typeof LIVE.session.self_tests_left === 'number' && LIVE.session.self_tests_left < 5; t.text = 'See exactly what people get. Your first 5 tests are free.'; t.run = () => { show('make'); toast('Make a pizza, then tap Send a test to myself on the Send step.'); }; }
  st.push({ id: 'bday', title: 'Your birthday', text: 'Month and day only. Gerald bakes you a Birthday Special on the day.', done: () => !!bdayOf().md, run: () => { show('settings'); setTimeout(() => { const f = $('#liveBday'); if (f) f.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 120); } });
  return st;
};

/* ===== Invite friends (referrals, with Partnero behind the scenes) =====
   An invite link (/kitchen?ref=CODE), or a Partnero link that left a partnero_partner or partnero_referral cookie on the site,
   is kept on this device until the visitor has an account, then sent once with /referral/capture. */
(function catchReferral() {
  const q = new URLSearchParams(location.search);
  const code = (q.get('ref') || '').replace(/[^A-Za-z0-9]/g, '').slice(0, 16);
  if (!code) return;
  store.set('sotRef', { code, at: Date.now() });
  q.delete('ref'); try { history.replaceState(null, '', location.pathname + (q.toString() ? '?' + q.toString() : '')); } catch (e) { /* ignore */ }
})();
function cookieVal(n) {
  const c = String(document.cookie || '').split('; ').find(x => x.indexOf(n + '=') === 0);
  try { return c ? decodeURIComponent(c.slice(n.length + 1)).slice(0, 80) : ''; } catch (e) { return ''; }
}
let refTried = false;
async function sendReferral() {
  const s = LIVE.session; if (refTried || !LIVE.TOKEN || !s || !s.member_id) return;
  const r0 = store.get('sotRef', null);
  const code = r0 && Date.now() - r0.at < 30 * 864e5 ? r0.code : '';
  const partner = cookieVal('partnero_partner'), referrer = cookieVal('partnero_referral');
  if (!code && !partner && !referrer) return;
  if (store.get('sotRefDone', '') === s.member_id) return;
  refTried = true;
  const r = await LIVE.call('/referral/capture', { code, partner, referrer }).catch(() => null);
  if (!r || r.code === 'not_signed_in') { refTried = false; return; }
  store.set('sotRefDone', s.member_id); store.set('sotRef', null);
  if (r.ok && r.emails > 0) {
    toast('Welcome! Your friend\'s invite added ' + r.emails + ' bonus emails to your account.');
    try { burst('gold'); } catch (e) { /* ignore */ }
    const fresh = await LIVE.call('/session').catch(() => null);
    if (fresh && fresh.member_id) { LIVE.session = fresh; renderPlanCard(); }
  }
}
let invite = null;
async function loadInvite() {
  if (!LIVE.TOKEN || !LIVE.session) return;
  const r = await LIVE.call('/referral').catch(() => null);
  invite = r && r.ok ? r : { off: true };
  renderInvite();
}
function renderInvite() {
  const crew = $('#view-gerald'); if (!crew) return;
  let c = $('#inviteCard');
  if (!invite || invite.off) { if (c) c.hidden = true; return; }
  if (!c) { c = mk('div', 'card invite-card'); c.id = 'inviteCard'; const news = $('#feed') && $('#feed').closest('.card'), faq = $('#faqCard'); if (news) news.before(c); else if (faq) faq.before(c); else crew.appendChild(c); }
  c.hidden = false; c.innerHTML = '';
  c.appendChild(mk('h2', '', 'Invite friends, earn emails'));
  c.appendChild(mk('p', 'muted', 'Share your link. When a friend signs up, they get ' + invite.friend_emails + ' bonus emails. When they send their first pizza, you get ' + invite.referrer_emails + '.'));
  const row = mk('div', 'invite-link');
  const inp = mk('input'); inp.type = 'text'; inp.readOnly = true; inp.value = invite.link; inp.id = 'inviteLink'; inp.setAttribute('aria-label', 'Your invite link');
  inp.onclick = () => inp.select();
  row.appendChild(inp); c.appendChild(row);
  const btns = mk('div', 'btn-row');
  const copy = mk('button', 'btn primary small', 'Copy link'); copy.type = 'button'; copy.id = 'inviteCopy';
  copy.onclick = () => {
    const done = () => { copy.textContent = 'Copied!'; toast('Link copied. Paste it anywhere.'); setTimeout(() => { copy.textContent = 'Copy link'; }, 2000); };
    try { navigator.clipboard.writeText(invite.link).then(done, () => { inp.select(); toast('Select the link and copy it.'); }); } catch (e) { inp.select(); }
  };
  btns.appendChild(copy);
  if (navigator.share) {
    const sh = mk('button', 'btn small', 'Share'); sh.type = 'button';
    sh.onclick = () => navigator.share({ text: 'I send thank-you pizzas with Slice of Thanks. Make your own and get ' + invite.friend_emails + ' bonus emails:', url: invite.link }).catch(() => {});
    btns.appendChild(sh);
  }
  c.appendChild(btns);
  /* The same link as a QR code: shown here, and saved as a picture for print, slides or an email signature */
  const qb = mk('div', 'invite-qr');
  const qc = mk('canvas'); qc.id = 'inviteQr'; qc.width = 240; qc.height = 240; qc.setAttribute('aria-label', 'QR code for your invite link');
  qb.appendChild(qc);
  const qt = mk('div', 'invite-qr-t');
  qt.appendChild(mk('b', '', 'Your QR code'));
  qt.appendChild(mk('small', '', 'Print it, put it on a slide, or add it to your email signature. Scanning it opens your invite link.'));
  const dl = mk('button', 'btn small', 'Download QR code'); dl.type = 'button'; dl.id = 'inviteQrDl';
  dl.onclick = downloadInviteQr; qt.appendChild(dl);
  qb.appendChild(qt); c.appendChild(qb);
  loadQrLib().then(q => { if (q) drawQr(qc.getContext('2d'), q, invite.link, 0, 0, 240); else qb.hidden = true; });
  const st = mk('div', 'invite-stats');
  [[invite.joined, invite.joined === 1 ? 'friend joined' : 'friends joined'], [invite.rewarded, 'sent their first pizza'], [invite.emails_earned, 'emails earned']].forEach(([n, l]) => {
    const d = mk('div'); d.appendChild(mk('b', '', String(n || 0))); d.appendChild(mk('small', '', l)); st.appendChild(d);
  });
  c.appendChild(st);
  c.appendChild(mk('p', 'muted invite-note', 'Your link is also on every receipt your pizzas share, so their friends can find you too.'));
}
// QR codes: the qrcode-generator library loads only when needed, pinned to one version
let qrLibP = null;
function loadQrLib() {
  if (window.qrcode) return Promise.resolve(window.qrcode);
  if (!qrLibP) qrLibP = new Promise(res => {
    const sc = document.createElement('script'); sc.src = 'https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js'; sc.async = true;
    sc.onload = () => res(window.qrcode || null); sc.onerror = () => { qrLibP = null; res(null); };
    document.head.appendChild(sc);
    setTimeout(() => res(window.qrcode || null), 5000);
  });
  return qrLibP;
}
function drawQr(ctx, lib, text, x, y, size) {
  const q = lib(0, 'M'); q.addData(text); q.make();
  const n = q.getModuleCount(), quiet = 2, cell = size / (n + quiet * 2);
  ctx.fillStyle = '#fff'; ctx.fillRect(x, y, size, size); ctx.fillStyle = '#2c2420';
  for (let r = 0; r < n; r++) for (let k = 0; k < n; k++) if (q.isDark(r, k)) ctx.fillRect(x + (k + quiet) * cell, y + (r + quiet) * cell, Math.ceil(cell), Math.ceil(cell));
}
async function downloadInviteQr() {
  const lib = await loadQrLib();
  if (!lib || !invite || !invite.link) { toast('The QR code could not load. Copy your link instead.'); return; }
  try { await Promise.race([Promise.all(['88px Shrikhand', '700 44px "Work Sans"', '700 40px "Courier Prime"'].map(f => document.fonts.load(f))), new Promise(r => setTimeout(r, 1500))]); } catch (e) { /* draw with fallback fonts */ }
  const W = 1200, H = 1500, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const c = cv.getContext('2d');
  c.fillStyle = '#FFF3E0'; c.fillRect(0, 0, W, H);
  for (let x = 0; x < W; x += 50) for (let y = 0; y < 2; y++) { c.fillStyle = (x / 50 + y) % 2 ? '#FFF3E0' : '#D62828'; c.fillRect(x, y * 50, 50, 50); }
  c.textAlign = 'center'; c.fillStyle = '#C21F1F'; c.font = '88px Shrikhand, "Cooper Black", Georgia, serif'; c.fillText('Slice of Thanks', W / 2, 240);
  c.fillStyle = '#3E2416'; c.font = '700 44px "Work Sans", system-ui, sans-serif'; c.fillText('Scan to send a thank-you pizza', W / 2, 330);
  c.fillStyle = '#3E2416'; c.fillRect(W / 2 - 390, 400, 780, 780);
  drawQr(c, lib, invite.link, W / 2 - 375, 415, 750);
  c.fillStyle = '#3E2416'; c.font = '600 40px "Work Sans", system-ui, sans-serif';
  c.fillText('Join free and get ' + invite.friend_emails + ' bonus emails', W / 2, 1270);
  const who = (LIVE.session && LIVE.session.profile && (LIVE.session.profile.business_name || LIVE.session.profile.display_name)) || '';
  if (who) { c.fillStyle = '#6B4A3A'; c.font = '400 36px "Work Sans", system-ui, sans-serif'; c.fillText('Invited by ' + who.slice(0, 40), W / 2, 1330); }
  c.fillStyle = '#C21F1F'; c.font = '700 40px "Courier Prime", "Courier New", monospace'; c.fillText('sliceofthanks.app', W / 2, 1430);
  cv.toBlob(blob => {
    if (!blob) { toast('The QR code could not be saved.'); return; }
    const name = 'slice-of-thanks-invite-qr.png';
    let file = null; try { file = new File([blob], name, { type: 'image/png' }); } catch (e) { /* older browsers */ }
    // Phones save pictures from the share sheet; computers download the file
    if (file && navigator.canShare && navigator.canShare({ files: [file] }) && /iPhone|iPad|Android/i.test(navigator.userAgent)) {
      navigator.share({ files: [file] }).catch(() => {}); return;
    }
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    toast('QR code saved. Print it or add it anywhere.');
  }, 'image/png');
}
const _applySessionInv = applySession;
applySession = function (s) { _applySessionInv(s); setTimeout(sendReferral, 1200); };
const _showInv = show;
show = function (v) { _showInv(v); if (v === 'gerald' && LIVE.session) { if (!invite) loadInvite(); else renderInvite(); } };
