/* ===== Slice of Thanks live layer v0.13.4 =====
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
const BASIS_OPTIONS = '<option value="one_to_one">We just met and this is a one-to-one thank-you</option>' +
  '<option value="relationship">We have a current business relationship</option>' +
  '<option value="permission">They gave me permission to send them messages</option>';
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
    ? 'The Whole Pie is $9 a month or $90 a year after the trial, with 250 emails a month. Cancel anytime. Special Delivery is a one-time $2.99 that unlocks these features for one pizza and includes its send.'
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
    '<ol class="muted" style="margin:0 0 4px 18px;padding:0;font-size:.92rem"><li>Tap Open secure billing. It opens in a new tab.</li><li>Use Add New Credit Card or Billing Address there.</li><li>Come back to this tab. Your Billing card updates on its own.</li></ol>';
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
    ['pro', 'The Whole Pie', '$9 a month or $90 a year. 250 emails a month, your logo, gift codes and your own button. 14-day free trial.', 'checkout_pro', '/checkout/12'],
    ['team', 'Pizza Party', '$29 a month or $290 a year. 3 seats and 1,000 shared emails a month. 14-day free trial.', 'checkout_team', '/checkout/11']
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
})();
const _renderSettings = renderSettings;
renderSettings = function () {
  _renderSettings();
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
  test_inbox_only: 'Test pizzas only go to your test inboxes.',
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
    toast(r.delivered === false && r.reason !== 'not_due' ? 'Saved. Delivery is retrying and should arrive shortly.' : 'Potato is on her way to ' + first(box.to) + '.');
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
    liveSheet('Create your free account to send', (() => { const p = document.createElement('p'); p.className = 'muted'; p.textContent = 'Your pizza is saved. Make a free account, sign in, and you will come right back to send it.'; return p; })(),
      [{ label: 'Create free account', primary: true, run: () => { location.href = bdLink('checkout_free', '/checkout/10'); } }, { label: 'I already have one', run: () => { location.href = LIVE.LOGIN; } }]);
    return;
  }
  liveSend();
};

/* --- People on real data: everyone the member has sent a pizza to, from Supabase --- */
function personFromServer(x) {
  return { id: x.id, name: x.name || x.email || 'No name', company: x.company || '', contact: x.email || '', vegan: !!x.vegan, notes: x.notes || '',
    country: x.country || '', hasConsent: !!x.has_consent,
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
    const r = await LIVE.call('/people/save', { person: { name: n, email: em, company: $('#npCompany').value.trim(), role: $('#npRole') ? $('#npRole').value.trim() : '', vegan: $('#npVegan').checked } }).catch(() => null);
    if (!r || !r.ok) { toast(r && r.code === 'bad_email' ? MSG.bad_email : MSG.server_error); return; }
    ['#npName', '#npContact', '#npCompany', '#npRole'].forEach(sel => { if ($(sel)) $(sel).value = ''; }); $('#npVegan').checked = false; $('#addPerson').hidden = true;
    await loadPeople();
    const c = contacts.find(x => x.id === r.id); selContact = r.id; resetQs(c); renderPeople(); toast(n + ' added.');
  };
})();

/* --- Send to a list (CSV): Pro and Team. Rows go up 50 at a time; the send worker delivers them. --- */
(function bulkExtras() {
  const sample = $('#sampleCsv'); if (sample) sample.hidden = true; /* sample addresses are not real inboxes */
  const card = $('#csvFile') && $('#csvFile').closest('.card');
  if (card) {
    const help = card.querySelector('small.muted');
    if (help) help.innerHTML = '<b>Columns:</b> First, Last (or one Name column), Email, Company, Role, Country (two letters, like US or CA), Consent and Vegan (yes or no). Only a name and Email are required. Extra columns are ignored. Up to 500 people per list.<br>' +
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
      const csv = ['First,Last,Email,Company,Role,Country,Consent,Vegan',
        'Jordan,Reyes,jordan@example.com,Brightline Legal,Managing Partner,US,relationship,no',
        'Priya,Shah,priya@example.com,Shah & Ortiz LLP,Paralegal,CA,yes,yes'].join(String.fromCharCode(13, 10)) + String.fromCharCode(13, 10);
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
  else toast('Loaded ' + bulk.rows.length + ' people. They join People when their pizzas are sent.');
  renderBulk();
};
$('#openBulk').onclick = () => { if (!isPro()) { upgrade('bulk'); return; } show('bulk'); };
$('#bulkSend').onclick = async () => {
  const good = bulk.rows.filter(r => r.ok); if (!good.length || bulk.sending) return;
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
  /* One picture for a signature pizza list. Vegan rows and Gerald's one-off pizzas go without a picture in the email. */
  let img = '';
  if (bulk.mode === 'signature') { try { img = pizzaImage(clonePizza(signature), false); } catch (e) { img = ''; } }
  const tally = { ok: 0 }; let stop = '';
  for (let i = 0; i < good.length && !stop; i += 50) {
    const rows = good.slice(i, i + 50).map((r, k) => ({ i: i + k, pizza: cleanPizza(bulkPizza(r)), box: boxPayload(bulkBox(r)),
      recipient: { name: r.name, email: r.contact, company: r.company, role: r.role || '', first_name: r.first || undefined, last_name: r.last || undefined, vegan: r.vegan, country: r.country || country, locale: 'en' },
      consent: { basis: r.basis || basis, method: 'CSV list upload' }, send_type: 'one_to_one', image: !!img && !r.vegan }));
    let res;
    try { res = await LIVE.call('/send/bulk', { batch, rows, scheduled_for: when, label: bulk.sticker + ' list', image_data_url: img.length < 1900000 ? img : '' }); } catch (e) { res = { code: 'server_error' }; }
    if (!res || !res.ok) { stop = (res && res.code) || 'server_error'; break; }
    res.results.forEach(x => { if (x.ok) tally.ok++; else tally[x.code] = (tally[x.code] || 0) + 1; });
    if (res.results.some(x => x.code === 'needs_terms')) stop = 'needs_terms';
    $('#bulkBar').style.width = Math.min(100, (i + 50) / good.length * 100) + '%';
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
    row.innerHTML = '<label for="presetSel">Start from a preset</label><div class="inline"><select id="presetSel"></select><button class="btn small" type="button" id="presetSave">Save as preset</button></div>';
    panel.querySelector('h2').after(row);
    row.querySelector('#presetSel').addEventListener('change', e => {
      const pr = presets.find(x => x.id === e.target.value); if (!pr) return;
      applyPreset(pr); toast('Loaded "' + pr.name + '".'); e.target.value = '';
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
  row.hidden = !account || !!editingPreset;
  $('#presetSaveRow').hidden = !account || !!editingPreset;
  $('#presetBanner').hidden = !editingPreset;
  if (editingPreset) $('#presetBannerName').textContent = editingPreset.name;
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
  if (ep) { $('#makeFor').textContent = 'Editing preset: ' + editingPreset.name; $('#next').hidden = true; $('#back').style.visibility = 'hidden'; }
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
  loadPeople(); loadPresets(); calStart(s);
  if (s.needs_terms) setTimeout(() => askTerms(() => {}), 600);
  const d = store.get('draft', null);
  if (d && d.pizza && Date.now() - (d.at || 0) < 7 * 864e5) {
    pizza = d.pizza; box = Object.assign(boxFromProfile(null), d.box); store.set('draft', null);
    if (d.special && s.credits && s.credits.special_delivery > 0) startSpecial(true); else if (d.special) wantSpecial = true;
    step = 5; saidStep = 5; show('make'); renderStep(); toast(specialOn ? 'Special Delivery is on. Your pizza is ready to send.' : 'Welcome. Your pizza is ready to send.');
  } else { show('today'); }
  checkPurchases();
})();

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
function wantsPizza(m) { return m.want_pizza === null || m.want_pizza === undefined ? (calAuto() && settings.mode === 'auto') : !!m.want_pizza; }
function mk(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; }
function meetingRow(m) {
  const li = mk('li', 'meeting'), info = mk('div', 'info'), row = mk('div', 'row');
  li.dataset.id = m.id;
  info.append(mk('h3', '', m.title || 'Meeting'), mk('span', 'who', [m.name, m.email].filter(Boolean).join(' · ') || 'No guest details'));
  const pill = mk('span', 'pill');
  const btn = (label, fn, primary) => { const b = mk('button', 'btn small' + (primary ? ' primary' : ''), label); b.type = 'button'; b.onclick = () => fn(b); row.appendChild(b); return b; };
  if (m.state === 'upcoming') {
    pill.textContent = 'Upcoming'; row.appendChild(pill);
    if (!m.email) row.appendChild(mk('small', 'muted', 'No guest email on this booking'));
    else {
      const lab = mk('label', 'check'), cb = document.createElement('input'); cb.type = 'checkbox'; cb.checked = wantsPizza(m); cb.className = 'meetWant';
      lab.append(cb, document.createTextNode(calAuto() ? ' Send my signature pizza when it ends' : ' Have my signature pizza ready when it ends'));
      cb.onchange = async () => {
        m.want_pizza = cb.checked;
        const r = await LIVE.call('/calendar/meeting', { id: m.id, want: cb.checked }).catch(() => ({}));
        if (!r.ok) { cb.checked = !cb.checked; m.want_pizza = cb.checked; toast('That did not save. Try again.'); return; }
        toast(cb.checked ? (calAuto() ? 'Your signature pizza goes to ' + first(m.name || 'them') + ' when it ends.' : 'Your signature pizza will be waiting here when it ends.') : 'No pizza for this one.');
      };
      row.appendChild(lab);
    }
  } else if (m.state === 'ready') {
    pill.classList.add('wait'); pill.textContent = m.note === 'no_credits' ? 'Waiting · out of emails' : 'Pizza waiting'; row.appendChild(pill);
    btn('Send signature pizza', b => sendMeetingSignature(m, b), true);
    btn('Make a fresh one', () => startFresh(m.id));
    btn('Skip', async () => { await LIVE.call('/calendar/skip', { id: m.id }).catch(() => null); loadCalendar(); });
  } else if (m.state === 'sent') {
    pill.classList.add('ok'); pill.textContent = 'Sent' + (m.opened ? ' · opened' : ''); row.appendChild(pill);
  } else if (m.state === 'ended') {
    pill.textContent = 'Ended'; row.appendChild(pill);
    if (m.email) btn('Make one', () => startFresh(m.id));
  } else {
    pill.textContent = m.note === 'canceled' ? 'Canceled' : 'Skipped'; row.appendChild(pill);
  }
  info.appendChild(row);
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
  if (cal.meetings.length) { cal.meetings.forEach(m => ul.appendChild(meetingRow(m))); return; }
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
  if (prefs.after_meeting && prefs.after_meeting !== settings.mode && (prefs.after_meeting !== 'auto' || calAuto())) { settings.mode = prefs.after_meeting; store.set('settings', settings); }
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
