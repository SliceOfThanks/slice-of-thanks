/* ===== Slice of Thanks live layer v0.8.0 =====
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
(function hideProtoBits() {
  const rg = $('#resetGuest'); if (rg) { const c = rg.closest('.card'); if (c) c.hidden = true; }
  const ac = $('#adminCard'); if (ac) ac.hidden = true;
  SOTR.querySelectorAll('.signboard .tag').forEach(t => { t.hidden = true; });
  SOTR.querySelectorAll('p.muted').forEach(p => { if (p.textContent.indexOf('The link is a sample') === 0) p.hidden = true; });
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
  row.appendChild(cancel); sh.appendChild(row); back.appendChild(sh); back.hidden = false;
  return back;
}
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
  const b = $('#planBilling'); if (b) b.onclick = () => { const c = $('#liveBilling'); if (c) c.scrollIntoView({ behavior: 'smooth', block: 'start' }); };
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
  card.onclick = () => { location.href = bdLink('billing', '/account/billing'); };
  btns.append(cp, card);
  if (s.plan !== 'free') { const pk = document.createElement('button'); pk.type = 'button'; pk.className = 'btn small'; pk.textContent = 'Buy more emails'; pk.onclick = openPacks; btns.appendChild(pk); }
  c.appendChild(btns);
}
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

/* --- Profile and logo save to Supabase --- */
let profTimer = 0;
const _saveProfile = saveProfile;
saveProfile = function () {
  _saveProfile();
  if (!LIVE.session) return;
  clearTimeout(profTimer);
  profTimer = setTimeout(() => LIVE.call('/profile', { profile: { display_name: profile.name, business_name: profile.business, brand_color_1: profile.brand1 || null, brand_color_2: profile.brand2 || null } }), 800);
};
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

/* Mailing address and reply-to in Settings */
(function settingsExtras() {
  const pb = $('#pBiz'); if (!pb) return;
  const f = document.createElement('div'); f.className = 'field';
  f.innerHTML = '<label for="liveAddrS">Your business mailing address (optional)</label><textarea id="liveAddrS" maxlength="300" rows="2"></textarea><small class="muted">Leave it blank and your emails show the Slice of Thanks mailing address. Add yours to show it instead.</small>';
  const r = document.createElement('div'); r.className = 'field';
  r.innerHTML = '<label for="liveReply">Replies go to</label><input type="text" id="liveReply" maxlength="200" inputmode="email">';
  pb.closest('.field').after(f, r);
  /* Log out ends the BD session; BD's /logout page does it */
  if (LIVE.TOKEN) {
    const lo = document.createElement('div'); lo.className = 'btn-row';
    lo.innerHTML = '<button class="btn small" type="button" id="liveLogout">Log out</button>';
    r.after(lo);
    lo.querySelector('button').onclick = () => { store.set('draft', null); location.href = '/logout'; };
  }
  let t = 0;
  const save = () => { clearTimeout(t); t = setTimeout(() => LIVE.call('/profile', { profile: { mailing_address: $('#liveAddrS').value.trim(), reply_to: $('#liveReply').value.trim() } }), 800); };
  $('#liveAddrS').addEventListener('input', save); $('#liveReply').addEventListener('input', save);
})();
const _renderSettings = renderSettings;
renderSettings = function () {
  _renderSettings();
  const s = LIVE.session; if (!s) return;
  loadBilling();
  if ($('#liveAddrS') && document.activeElement !== host) { $('#liveAddrS').value = s.profile.mailing_address || ''; $('#liveReply').value = s.profile.reply_to || ''; }
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
  try { r = await LIVE.call('/send', buildPayload()); } catch (e) { r = { code: 'server_error' }; }
  btn.disabled = false; btn.textContent = label;
  if (r.ok && r.delivered === false && r.reason === 'provider_error') {
    toast('Potato could not deliver this one, and it did not use an email. Try again in a few minutes.'); return;
  }
  if (r.ok) {
    logSend({ who: box.to, org: '', contact: box.contact, vegan: pizza.vegan }, pizza, box, box.meeting ? 'After ' + box.meeting.toLowerCase() : 'Fresh pizza');
    if (LIVE.session && r.bucket && LIVE.session.credits[r.bucket] !== undefined) LIVE.session.credits[r.bucket]--;
    toast(r.delivered === false && r.reason !== 'not_due' ? 'Saved. Delivery is retrying and should arrive shortly.' : 'Potato is on her way to ' + first(box.to) + '.');
    burst('pizza'); store.set('draft', null); endSpecial(); show('today'); loadPeople(); return;
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
    toast('Potato is on her way to ' + first(c.name) + '.'); burst('pizza'); resetQs(c); loadPeople(); return;
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
    burst('pizza'); toast(when ? 'Your list is scheduled.' : 'Your pizzas are in the oven.');
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
const PRESET_KEYS = ['style', 'sticker', 'confetti', 'tone', 'note', 'sign', 'linkLabel', 'link'];
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
    row.querySelector('#presetSave').onclick = () => {
      if (presets.length >= presetLimit) { presetFull(); return; }
      askPresetName('Save these box choices', '', async name => { if (await savePreset(null, name, presetData(box))) toast('Saved "' + name + '". Load it any time from the top of this step.'); });
    };
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
    [['Edit', () => editPreset(pr)], ['Rename', () => askPresetName('Rename preset', pr.name, async name => { if (await savePreset(pr.id, name)) toast('Renamed.'); })],
      ['Remove', () => liveSheet('Remove "' + pr.name + '"?', null, [{ label: 'Remove', primary: true, run: async () => { closeLiveSheet(); const r = await LIVE.call('/presets/remove', { id: pr.id }).catch(() => null); if (r && r.ok) { toast('Removed.'); loadPresets(); } else toast(MSG.server_error); } }])]]
      .forEach(([l, fn]) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'btn small' + (l === 'Remove' ? ' ghost' : ''); b.textContent = l; b.onclick = fn; row.appendChild(b); });
    li.append(t, row); ul.appendChild(li);
  });
}
const _renderSettingsP = renderSettings;
renderSettings = function () { _renderSettingsP(); renderPresetCard(); };

/* --- Start: sign in with the BD pass, restore a guest draft --- */
(async function liveStart() {
  if (!LIVE.TOKEN) { account = null; refreshPlan(true); return; }
  const s = await LIVE.call('/session');
  if (!s || !s.member_id) { account = null; refreshPlan(true); return; }
  applySession(s);
  loadPeople(); loadPresets();
  if (s.needs_terms) setTimeout(() => askTerms(() => {}), 600);
  const d = store.get('draft', null);
  if (d && d.pizza && Date.now() - (d.at || 0) < 7 * 864e5) {
    pizza = d.pizza; box = Object.assign(boxFromProfile(null), d.box); store.set('draft', null);
    if (d.special && s.credits && s.credits.special_delivery > 0) startSpecial(true); else if (d.special) wantSpecial = true;
    step = 5; saidStep = 5; show('make'); renderStep(); toast(specialOn ? 'Special Delivery is on. Your pizza is ready to send.' : 'Welcome. Your pizza is ready to send.');
  } else { show('today'); }
  checkPurchases();
})();

/* --- Today without the sample calendar --- */
const _renderToday = renderToday;
renderToday = function () {
  _renderToday();
  const se = $('#simEnd'); if (se) se.hidden = true;
  SOTR.querySelectorAll('.tag').forEach(t => { if (t.textContent.trim() === 'Sample calendar') t.hidden = true; });
  const ul = $('#meetings');
  if (ul && !meetings.length) {
    ul.innerHTML = '';
    const li = document.createElement('li'); li.className = 'meeting'; li.style.gridTemplateColumns = '1fr';
    const pro = LIVE.session && LIVE.session.plan !== 'free';
    li.innerHTML = '<div class="info"><b>No meetings yet</b><span class="muted">Calendly and TidyCal connections arrive in the next update. Your meetings for the week will show here. ' +
      (pro ? 'You choose which meetings get a pizza, and it is ready when each one ends.' : 'Pick the meetings you want a pizza for. When each one ends, your signature pizza is made for that person and we email you that it is waiting to be sent. Set your signature pizza in Settings.') +
      ' Until then, use Make a new pizza above.</span></div>';
    ul.appendChild(li);
  }
};

/* Test hook, only when the widget sets data-debug */
if (host_isDebug()) { window.__SOT_DEBUG = { goSend() { pizza = P_demo(); step = 5; saidStep = 5; show('make'); renderStep(); } }; }
function host_isDebug() { return SOTR.host.hasAttribute('data-debug'); }
function P_demo() { const p = clonePizza(signature); p.baked = true; p.bake = 1; p.tosses = 3; return p; }
