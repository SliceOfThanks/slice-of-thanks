/* Slice of Thanks recipient page (unbox) v0.2.0
   Delivery by Potato, open the box, six-slice pizza, sender's button under the pizza,
   Gerald's receipt on the same screen, gift after the sixth slice, send a pizza back.
   Needs shared/pizza-core.js loaded first. Mounts into #sot-unbox. */
(function () {
  'use strict';
  var ROOT = document.getElementById('sot-unbox');
  if (!ROOT) return;
  var API = ROOT.getAttribute('data-api') || 'https://cmnclubiarmthibqibuj.supabase.co/functions/v1/api';
  var BASE = ROOT.getAttribute('data-base') || '';
  var SITE = 'https://www.sliceofthanks.app';
  var P = window.SOTPizza;
  var qs = new URLSearchParams(location.search);
  var TOKEN = qs.get('t') || '';
  var DEMO = qs.get('demo') === '1';
  var lang = (qs.get('lang') || navigator.language || 'en').slice(0, 2) === 'es' ? 'es' : 'en';

  var T = {
    en: {
      sent: function (s) { return s + ' sent you a pizza'; }, named: function (s) { return 'Your pizza, named by ' + s; }, from: 'from', open: 'Open the box', see: 'See your pizza', tap: 'Tap a slice to eat it.',
      togo: function (n) { return n + ' to go.'; }, lines: ['Mmm.', 'Gerald is watching. He approves.', 'Halfway there.', 'Potato is drooling.', 'One more slice.'],
      tease: function (s) { return s + ' hid something under this pizza. Eat all 6 slices to find out.'; },
      gone: 'All gone.', ate: 'You ate all 6 slices. Gerald is impressed. Potato is a little jealous.',
      under: 'Under the pizza', copy: 'Copy code', copied: 'Copied!', use: 'Use it now', useBy: function (d) { return 'Use it by ' + d; },
      back: function (s) { return 'Send ' + s + ' a pizza back'; }, review: "GERALD'S REVIEW", critic: 'Head Chef, Slice of Thanks',
      rating: function (n) { return 'Rating: ' + n + ' of 5 slices'; }, eaten: function (n) { return 'Slices eaten: ' + '●'.repeat(n) + '○'.repeat(6 - n) + ' ' + n + ' of 6'; },
      from: 'From', potato: 'Delivered by Potato, Head of Delivery.', why: 'Why did I get this?',
      whyText: function (s) { return s + ' sent you this pizza through Slice of Thanks to say thank you.'; },
      unsub: 'Unsubscribe', privacy: 'Privacy', terms: 'Terms', report: 'Report', made: 'Made with Slice of Thanks. Make your own, free.',
      missing: 'We could not find this pizza. The link may be incomplete. Try opening it again from your email.',
      woof: 'Woof!', unsubTitle: 'Stop pizzas', unsubSender: 'Stop pizzas from this sender', unsubAll: 'Stop all Slice of Thanks pizzas',
      unsubDone: 'Done. You will not get these pizzas anymore.', test: 'TEST PIZZA'
    },
    es: {
      sent: function (s) { return s + ' te envió una pizza'; }, named: function (s) { return 'Tu pizza, bautizada por ' + s; }, from: 'de', open: 'Abre la caja', see: 'Mira tu pizza', tap: 'Toca una porción para comerla.',
      togo: function (n) { return 'Faltan ' + n + '.'; }, lines: ['Mmm.', 'Gerald te está mirando. Lo aprueba.', 'Vas a la mitad.', 'A Potato se le hace agua la boca.', 'Una porción más.'],
      tease: function (s) { return s + ' escondió algo debajo de esta pizza. Come las 6 porciones para descubrirlo.'; },
      gone: 'Se acabó.', ate: 'Te comiste las 6 porciones. Gerald está impresionado. Potato tiene un poco de envidia.',
      under: 'Debajo de la pizza', copy: 'Copiar código', copied: '¡Copiado!', use: 'Úsalo ahora', useBy: function (d) { return 'Úsalo antes del ' + d; },
      back: function (s) { return 'Envíale una pizza a ' + s; }, review: 'RESEÑA DE GERALD', critic: 'Chef principal, Slice of Thanks',
      rating: function (n) { return 'Calificación: ' + n + ' de 5 porciones'; }, eaten: function (n) { return 'Porciones comidas: ' + '●'.repeat(n) + '○'.repeat(6 - n) + ' ' + n + ' de 6'; },
      from: 'De', potato: 'Entregada por Potato, jefa de entregas.', why: '¿Por qué recibí esto?',
      whyText: function (s) { return s + ' te envió esta pizza a través de Slice of Thanks para darte las gracias.'; },
      unsub: 'Cancelar suscripción', privacy: 'Privacidad', terms: 'Términos', report: 'Reportar', made: 'Hecho con Slice of Thanks. Crea la tuya gratis.',
      missing: 'No encontramos esta pizza. Es posible que el enlace esté incompleto. Ábrelo de nuevo desde tu correo.',
      woof: '¡Guau!', unsubTitle: 'Dejar de recibir pizzas', unsubSender: 'No recibir más pizzas de este remitente', unsubAll: 'No recibir ninguna pizza de Slice of Thanks',
      unsubDone: 'Listo. Ya no recibirás estas pizzas.', test: 'PIZZA DE PRUEBA'
    }
  };
  var t = T[lang];

  function el(tag, attrs, kids) {
    var e = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === 'text') e.textContent = attrs[k];
      else if (k === 'class') e.className = attrs[k];
      else if (k.indexOf('on') === 0) e.addEventListener(k.slice(2), attrs[k]);
      else if (attrs[k] !== null && attrs[k] !== undefined && attrs[k] !== false) e.setAttribute(k, attrs[k] === true ? '' : attrs[k]);
    });
    (kids || []).forEach(function (c) { if (c) e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return e;
  }
  function safeUrl(u) {
    u = String(u || '').trim();
    if (!u) return '';
    if (u.indexOf('http://') !== 0 && u.indexOf('https://') !== 0) u = 'https://' + u;
    try { var x = new URL(u); return (x.protocol === 'https:' || x.protocol === 'http:') ? x.href : ''; } catch (e) { return ''; }
  }
  function first(n) { return String(n || '').trim().split(' ')[0] || ''; }
  function track(type, slice) {
    if (DEMO || !TOKEN) return;
    try { fetch(API + '/p/event', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ t: TOKEN, type: type, slice: slice }), keepalive: true }); } catch (e) { /* tracking never blocks */ }
  }
  function senderLabel(s) { return (s.send_as === 'business' && s.business) ? s.business : (s.name || s.business || 'Someone'); }
  /* "Name from Business", the same as the Kitchen preview and the email; the business alone when sending as the business */
  function senderHeadline(s, from) { return (s.send_as !== 'business' && s.name && s.business) ? s.name + ' ' + from + ' ' + s.business : senderLabel(s); }

  if (!document.getElementById('sot-fonts')) {
    var fl = document.createElement('link'); fl.id = 'sot-fonts'; fl.rel = 'stylesheet';
    fl.href = 'https://fonts.googleapis.com/css2?family=Shrikhand&family=Yellowtail&family=Work+Sans:wght@400;500;600;700&family=Caveat:wght@500;700&family=Courier+Prime:wght@400;700&display=swap';
    document.head.appendChild(fl);
  }
  ROOT.className = 'sot-u';
  ROOT.innerHTML = '';
  ROOT.appendChild(el('div', { class: 'u-check', 'aria-hidden': 'true' }));

  if (location.pathname.indexOf('unsubscribe') !== -1) return renderUnsubscribe();
  if (DEMO) return render(demoData());
  if (!TOKEN) return message(t.missing);
  fetch(API + '/p?t=' + encodeURIComponent(TOKEN)).then(function (r) { return r.ok ? r.json() : null; })
    .then(function (d) { if (d && d.snapshot) render(d); else message(t.missing); })
    .catch(function () { message(t.missing); });

  function message(m) { ROOT.appendChild(el('p', { class: 'u-msg', text: m })); }

  function renderUnsubscribe() {
    var s = qs.get('s') === 'global' ? 'global' : 'sender';
    var wrap = el('div', { class: 'u-stage' }, [el('h1', { text: t.unsubTitle })]);
    var btn = el('button', { class: 'u-btn primary', type: 'button', text: s === 'global' ? t.unsubAll : t.unsubSender, onclick: function () {
      btn.disabled = true;
      fetch(API + '/unsubscribe', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ t: TOKEN, s: s }) })
        .then(function () { wrap.appendChild(el('p', { class: 'u-why', role: 'status', text: t.unsubDone })); btn.hidden = true; })
        .catch(function () { btn.disabled = false; });
    } });
    wrap.appendChild(btn);
    ROOT.appendChild(wrap);
  }

  function render(d) {
    var snap = d.snapshot || {}, pizza = snap.pizza || P.defaultSignature(), box = snap.box || {}, sender = snap.sender || {};
    var who = senderLabel(sender), whoFirst = sender.send_as === 'business' ? who : (first(sender.name) || who);
    P.setProfile({ logo: sender.logo_url, brand1: sender.brand_color_1, brand2: sender.brand_color_2 });
    if (d.locale === 'es' && !qs.get('lang')) { lang = 'es'; t = T.es; }

    // Stage 1: delivery and the box
    var s1 = el('div', { class: 'u-stage' });
    if (d.is_test) s1.appendChild(el('p', { class: 'u-eyebrow', text: t.test }));
    var bark = el('p', { class: 'u-bark', hidden: true, text: t.woof });
    var pet = el('button', { class: 'u-pet', type: 'button', 'aria-label': 'Pet Potato' });
    var scootLogo = el('span', { class: 'u-scoot-logo' });
    // A personal pizza rides under the Slice of Thanks logo; a business pizza under the business logo or name
    if (sender.personal) scootLogo.appendChild(el('img', { src: BASE + '/brand/logo/slice-of-thanks-logo-240.png', alt: 'Slice of Thanks' }));
    else if (sender.logo_url) scootLogo.appendChild(el('img', { src: sender.logo_url, alt: (sender.business || who) + ' logo' })); else scootLogo.textContent = sender.business || who;
    var scoot = el('div', { class: 'u-scoot' }, [bark, pet, el('img', { src: BASE + '/brand/characters/potato-delivery-side.png', alt: 'Potato the bulldog driving a red delivery scooter in her helmet and goggles' }), scootLogo]);
    var pets = 0;
    pet.addEventListener('click', function () { pets++; pet.classList.remove('hop'); void pet.offsetWidth; pet.classList.add('hop'); bark.hidden = false; setTimeout(function () { bark.hidden = true; }, 900); if (pets === 5) P.burst('potato'); });
    s1.appendChild(scoot);
    s1.appendChild(el('p', { class: 'u-from', text: t.sent(senderHeadline(sender, t.from)) }));
    var lid = el('div', { class: 'lid', 'data-style': box.style || 'kraft' }, [
      sender.logo_url ? el('div', { class: sender.personal ? 'lid-logo photo' : 'lid-logo' }, [el('img', { src: sender.logo_url, alt: '' })]) : null,
      el('div', { class: 'lid-biz', text: (sender.personal && box.lid_text) ? String(box.lid_text).slice(0, 40) : (sender.business || who) }),
      box.sticker ? el('div', { class: 'lid-sticker', text: box.sticker }) : null,
      pizza.vegan ? el('div', { class: 'lid-vegan', text: '🌱 Vegan' }) : null
    ]);
    // Pro box topper: a seasonal decoration on the lid
    var topper = box.topper && P.topperEl ? P.topperEl(box.topper) : null; if (topper) lid.appendChild(topper);
    /* Notes can start with their own greeting, like "Hi [first name]": then the page does not add another */
    var ownGreeting = /^\s*(hi|hello|hey|dear|hola|good (morning|afternoon|evening))\b/i.test(box.note || '');
    var greet = d.recipient_name && !ownGreeting ? (lang === 'es' ? 'Hola ' : 'Hi ') + first(d.recipient_name) + ', ' : '';
    var inside = el('div', { class: 'inside' }, [el('p', { class: 'hand', text: greet + (box.note || '') }), el('p', { class: 'hand sign', text: box.sign || '' })]);
    var rbox = el('div', { class: 'rbox' }, [inside, lid]);
    s1.appendChild(rbox);
    var openBtn = el('button', { class: 'u-btn primary', type: 'button', text: t.open });
    s1.appendChild(openBtn);
    ROOT.appendChild(s1);

    // Stage 2: eat
    var s2 = el('div', { class: 'u-stage', hidden: true });
    s2.appendChild(el('p', { class: 'u-eyebrow u-named', text: t.named(whoFirst) }));
    s2.appendChild(el('h1', { text: pizza.name || 'The Thank-You Special' }));
    var img = el('img', { alt: (pizza.name || 'A pizza') + ', cut into six slices' });
    var eatBtn = el('button', { class: 'u-eat', type: 'button', 'aria-label': t.tap }, [img]);
    var hint = el('p', { class: 'u-hint', 'aria-live': 'polite', text: t.tap });
    var ctaUrl = safeUrl(box.cta_url);
    var cta = ctaUrl ? el('a', { class: 'u-btn primary', href: ctaUrl, target: '_blank', rel: 'noopener', text: box.cta_label || 'Book a follow-up', onclick: function () { track('cta_clicked'); } }) : null;
    var gift = box.gift && box.gift.code ? box.gift : null;
    var tease = gift ? el('p', { class: 'u-tease', text: t.tease(whoFirst) }) : null;
    var slicesLine = el('span', { text: t.eaten(0) });
    var r = P.review(pizza, box);
    var receipt = el('div', { class: 'receipt' }, [
      el('span', { class: 'rh', text: t.review }),
      el('span', { class: 'u-critic' }, [el('img', { class: 'u-av', src: BASE + '/brand/characters/gerald-avatar.svg', alt: 'Gerald the raccoon' }), el('span', { text: 'Gerald. ' + t.critic })]),
      el('hr'), el('span', { text: r.text }), el('span', { text: t.rating(r.stars) }), slicesLine, el('hr'),
      el('span', { text: t.from + ': ' + [sender.name, sender.business].filter(Boolean).join(', ') }),
      el('span', { class: 'u-critic' }, [el('img', { class: 'u-av', src: BASE + '/brand/characters/potato-avatar.png', alt: 'Potato the dog' }), el('span', { text: t.potato })])
    ]);
    var done = el('div', { class: 'u-stage', hidden: true });
    s2.appendChild(eatBtn); s2.appendChild(hint); if (cta) s2.appendChild(cta); if (tease) s2.appendChild(tease); s2.appendChild(done); s2.appendChild(receipt);
    var backBtn = el('a', { class: 'u-btn', href: SITE + '/kitchen?from=pizza', text: t.back(whoFirst), onclick: function () { track('send_back_started'); } });
    s2.appendChild(backBtn);
    ROOT.appendChild(s2);
    ROOT.appendChild(footer(who, sender));

    openBtn.addEventListener('click', function () {
      if (!rbox.classList.contains('open')) {
        rbox.classList.add('open'); openBtn.textContent = t.see; track('box_opened');
        setTimeout(function () { P.burst(box.confetti || 'classic'); }, 450);
      } else { s1.hidden = true; s2.hidden = false; window.scrollTo(0, 0); }
    });

    // Six slices
    var cv = document.createElement('canvas'); var pc = P.clonePizza(pizza); P.drawPizza(cv, pc, 340);
    var c = cv.getContext('2d'), R = 340 * 0.48 * (pc.size || 0.9), SL = 6, S0 = -Math.PI / 2, W = 2 * Math.PI / SL;
    var left = [true, true, true, true, true, true], eaten = d.slices_eaten || 0;
    c.save(); c.globalCompositeOperation = 'source-atop'; c.strokeStyle = 'rgba(58,29,18,.38)'; c.lineWidth = 2.5;
    for (var i = 0; i < SL; i++) { var a = S0 + i * W; c.beginPath(); c.moveTo(170, 170); c.lineTo(170 + Math.cos(a) * R * 1.1, 170 + Math.sin(a) * R * 1.1); c.stroke(); }
    c.restore();
    function paint() { try { img.src = cv.toDataURL('image/png'); } catch (e) { /* ignore */ } }
    function eatSlice(k) { c.save(); c.globalCompositeOperation = 'destination-out'; c.beginPath(); c.moveTo(170, 170); c.arc(170, 170, R * 1.12, S0 + k * W - 0.01, S0 + (k + 1) * W + 0.01); c.closePath(); c.fill(); c.restore(); left[k] = false; paint(); }
    function count() { return left.filter(function (v) { return !v; }).length; }
    for (var j = 0; j < Math.min(eaten, 5); j++) eatSlice(j);
    paint(); slicesLine.textContent = t.eaten(count());
    eatBtn.addEventListener('click', function (e) {
      var rc = img.getBoundingClientRect(), k = 0;
      if (e.detail && rc.width) {
        var x = (e.clientX - rc.left) / rc.width * 340 - 170, y = (e.clientY - rc.top) / rc.height * 340 - 170;
        var ang = Math.atan2(y, x) - S0; ang = ((ang % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI); k = Math.floor(ang / W) % SL;
      }
      if (!left[k]) { var best = -1, bd = 9; for (var q = 0; q < SL; q++) if (left[q]) { var dd = Math.min((q - k + SL) % SL, (k - q + SL) % SL); if (dd < bd) { bd = dd; best = q; } } k = best; }
      if (k < 0) return;
      eatSlice(k); var n = count(); slicesLine.textContent = t.eaten(n); track('slice_eaten', n);
      try { if (navigator.vibrate) navigator.vibrate(12); } catch (er) { /* ignore */ }
      eatBtn.classList.remove('chomp'); void eatBtn.offsetWidth; eatBtn.classList.add('chomp');
      if (n >= SL) finish(); else hint.textContent = t.lines[Math.min(n - 1, t.lines.length - 1)] + ' ' + t.togo(SL - n);
    });

    function finish() {
      track('pizza_completed');
      setTimeout(function () {
        eatBtn.hidden = true; hint.hidden = true; if (tease) tease.hidden = true;
        done.appendChild(el('img', { class: 'u-empty', src: BASE + '/brand/characters/empty-box.svg', alt: 'An empty pizza box with crumbs' }));
        done.appendChild(el('img', { class: 'u-celebrate', src: BASE + '/brand/characters/potato-celebrate.png', alt: 'Potato celebrating' }));
        done.appendChild(el('h2', { text: t.gone }));
        if (gift) {
          track('gift_revealed');
          var codeEl = el('span', { class: 'u-code', text: gift.code });
          var copyBtn = el('button', { class: 'u-btn small', type: 'button', text: t.copy, onclick: function () {
            try { navigator.clipboard.writeText(gift.code).then(function () { copyBtn.textContent = t.copied; }); } catch (e) { /* ignore */ }
          } });
          var useUrl = safeUrl(gift.url);
          var card = el('div', { class: 'u-gift' }, [
            el('span', { class: 'u-eyebrow', text: t.under }), el('strong', { text: gift.text || '' }), codeEl,
            gift.expires ? el('span', { class: 'u-why', text: t.useBy(new Date(gift.expires + 'T12:00').toLocaleDateString(lang === 'es' ? 'es' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' })) }) : null,
            el('div', { class: 'u-row' }, [copyBtn, useUrl ? el('a', { class: 'u-btn small primary', href: useUrl, target: '_blank', rel: 'noopener', text: t.use, onclick: function () { track('gift_clicked'); } }) : null])
          ]);
          done.appendChild(card);
        }
        if (cta) done.appendChild(cta);
        done.appendChild(el('p', { class: 'u-why', text: t.ate }));
        done.hidden = false;
        P.burst(gift ? 'gold' : 'crumbs');
      }, 260);
    }
  }

  function footer(who, sender) {
    var whyP = el('p', { class: 'u-why', hidden: true, text: t.whyText(who) });
    var unsubHref = SITE + '/unsubscribe?t=' + encodeURIComponent(TOKEN) + '&s=sender';
    var f = el('div', { class: 'u-foot' }, [
      el('a', { class: 'u-mark', href: SITE, 'aria-label': 'Slice of Thanks' }, [el('img', { src: BASE + '/brand/logo/pizza-envelope-96.png', alt: '' })]),
      el('button', { type: 'button', text: t.why, onclick: function () { whyP.hidden = !whyP.hidden; } }), ' · ',
      el('a', { href: unsubHref, text: t.unsub }), ' · ', el('a', { href: SITE + '/privacy', text: t.privacy }), ' · ',
      el('a', { href: SITE + '/terms', text: t.terms }), ' · ', el('a', { href: SITE + '/report', text: t.report }), whyP
    ]);
    if (sender.show_made_with) f.appendChild(el('div', {}, [el('a', { href: SITE, text: t.made })]));
    return f;
  }

  function demoData() {
    return { recipient_name: 'Jordan Reyes', locale: lang, slices_eaten: 0, snapshot: {
      pizza: P.defaultSignature(),
      box: { style: 'kraft', sticker: 'Thank You', confetti: 'classic', tone: 'playful', note: 'Thank you for making time to meet today. I loved hearing about your plans.', sign: 'Warmly, Stacey',
        cta_label: 'Book a follow-up with Stacey', cta_url: 'example.com', gift: { text: '20% off your first 3 months', code: 'SLICE20', url: 'example.com', expires: '' } },
      sender: { name: 'Stacey Lake', business: 'Mountain Studio', send_as: 'person', mailing_address: 'PO Box 1, Crestline, CA', show_made_with: true } } };
  }
})();
