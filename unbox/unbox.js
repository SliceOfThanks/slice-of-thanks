/* Slice of Thanks recipient page (unbox) v0.4.2
   Delivery by Potato, open the box, six-slice pizza, sender's button under the pizza,
   the fun receipt (shareable) and Gerald's review on the same screen, gift after the sixth slice, send a pizza back.
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
  var DEMO = qs.get('demo') === '1' || qs.get('demo') === 'birthday';
  var lang = (qs.get('lang') || navigator.language || 'en').slice(0, 2) === 'es' ? 'es' : 'en';

  var T = {
    en: {
      sent: function (s) { return s + ' sent you a pizza'; }, named: function (s) { return 'Your pizza, named by ' + s; }, from: 'from', open: 'Open the box', see: 'See your pizza', tap: 'Tap a slice to eat it.',
      togo: function (n) { return n + ' to go.'; }, lines: ['Mmm.', 'Gerald is watching. He approves.', 'Halfway there.', 'Potato is drooling.', 'One more slice.'],
      tease: function (s) { return s + ' hid something under this pizza. Eat all 6 slices to find out.'; },
      gone: 'All gone.', received: 'All gone. Thanks received.', to: 'To', ate: 'You ate all 6 slices. Gerald is impressed. Potato is a little jealous.',
      under: 'Under the pizza', giftFrom: function (s) { return 'A gift from ' + s; }, yourCode: 'Your code', useAt: function (c, h) { return 'Use code ' + c + ' at ' + h + '.'; }, useWith: function (c, s) { return 'Use code ' + c + ' with ' + s + '.'; }, copy: 'Copy code', copied: 'Copied!', use: 'Use it now', useBy: function (d) { return 'Use it by ' + d; },
      back: function (s) { return 'Send ' + s + ' a pizza back'; }, review: "GERALD'S REVIEW", critic: 'Head Chef, Slice of Thanks',
      rating: function (n) { return 'Rating: ' + n + ' of 5 slices'; }, eaten: function (n) { return 'Slices eaten: ' + '●'.repeat(n) + '○'.repeat(6 - n) + ' ' + n + ' of 6'; },
      from: 'From', potato: 'Delivered by Potato, Head of Delivery.', why: 'Why did I get this?',
      whyText: function (s) { return s + ' sent you this pizza through Slice of Thanks to say thank you.'; },
      unsub: 'Unsubscribe', privacy: 'Privacy', terms: 'Terms', report: 'Report', made: 'Made with Slice of Thanks. Make your own, free.',
      missing: 'We could not find this pizza. The link may be incomplete. Try opening it again from your email.',
      woof: 'Woof!', unsubTitle: 'Stop pizzas', unsubSender: 'Stop pizzas from this sender', unsubAll: 'Stop all Slice of Thanks pizzas',
      unsubDone: 'Done. You will not get these pizzas anymore.', test: 'TEST PIZZA',
      fun: { order: 'Order #', kitchen: 'Kitchen: Gerald, Head Chef', driver: 'Driver: Potato, Head of Delivery', item: 'Thank-you pizza', house: 'ON THE HOUSE',
        sauce: 'Sauce', toppings: 'Toppings', counted: function (n) { return n + ' (Gerald counted)'; }, star: 'Star topping', bake: 'Bake', bakes: ['Quick', 'Golden', 'Stone-fired', "Gerald's perfect"],
        slices: 'Slices devoured', total: 'TOTAL', paid: 'Paid in gratitude',
        extras: [['Calories', 'Emotionally significant'], ['Good vibes', 'EXTRA LARGE'], ['Crust', 'Structurally sound'], ['Cheese pull', 'Legendary'], ['Napkins used', 'Not enough'], ['Delivery', 'Fast. Potato had the zoomies.'], ['Tip', 'One belly rub for Potato'], ['Leftovers', 'None. Impressive.']],
        footers: ['THANK YOU FOR EATING YOUR FEELINGS', 'NO REFUNDS ON GOOD VIBES', 'CRUST IS NOT A VEGETABLE. WE CHECKED.', 'COME BACK HUNGRY', 'GERALD SAYS: NICE BITE TECHNIQUE'],
        stamp: ['PAID', 'WITH GRATITUDE'], approved: 'Approved by Gerald', paw: 'Inspected by Potato',
        cheers: ['Gerald signed it. Potato tried to eat it.', 'Stamped and approved. Gerald is framing a copy.', 'Potato added a paw print. She insists it is official.', 'Receipt printed. Gerald says it is his best work.'],
        share: 'Share my receipt', making: 'Printing your receipt...', saved: 'Receipt saved. Share it anywhere.', privacy: 'Your note, names and codes stay private. Only the receipt and the pizza are shared.',
        shareText: 'I just ate a thank-you pizza. Make your own at sliceofthanks.app', get: 'Send your own at sliceofthanks.app' }
    },
    es: {
      sent: function (s) { return s + ' te envió una pizza'; }, named: function (s) { return 'Tu pizza, bautizada por ' + s; }, from: 'de', open: 'Abre la caja', see: 'Mira tu pizza', tap: 'Toca una porción para comerla.',
      togo: function (n) { return 'Faltan ' + n + '.'; }, lines: ['Mmm.', 'Gerald te está mirando. Lo aprueba.', 'Vas a la mitad.', 'A Potato se le hace agua la boca.', 'Una porción más.'],
      tease: function (s) { return s + ' escondió algo debajo de esta pizza. Come las 6 porciones para descubrirlo.'; },
      gone: 'Se acabó.', received: 'Se acabó. Gracias recibidas.', to: 'Para', ate: 'Te comiste las 6 porciones. Gerald está impresionado. Potato tiene un poco de envidia.',
      under: 'Debajo de la pizza', giftFrom: function (s) { return 'Un regalo de ' + s; }, yourCode: 'Tu código', useAt: function (c, h) { return 'Usa el código ' + c + ' en ' + h + '.'; }, useWith: function (c, s) { return 'Usa el código ' + c + ' con ' + s + '.'; }, copy: 'Copiar código', copied: '¡Copiado!', use: 'Úsalo ahora', useBy: function (d) { return 'Úsalo antes del ' + d; },
      back: function (s) { return 'Envíale una pizza a ' + s; }, review: 'RESEÑA DE GERALD', critic: 'Chef principal, Slice of Thanks',
      rating: function (n) { return 'Calificación: ' + n + ' de 5 porciones'; }, eaten: function (n) { return 'Porciones comidas: ' + '●'.repeat(n) + '○'.repeat(6 - n) + ' ' + n + ' de 6'; },
      from: 'De', potato: 'Entregada por Potato, jefa de entregas.', why: '¿Por qué recibí esto?',
      whyText: function (s) { return s + ' te envió esta pizza a través de Slice of Thanks para darte las gracias.'; },
      unsub: 'Cancelar suscripción', privacy: 'Privacidad', terms: 'Términos', report: 'Reportar', made: 'Hecho con Slice of Thanks. Crea la tuya gratis.',
      missing: 'No encontramos esta pizza. Es posible que el enlace esté incompleto. Ábrelo de nuevo desde tu correo.',
      woof: '¡Guau!', unsubTitle: 'Dejar de recibir pizzas', unsubSender: 'No recibir más pizzas de este remitente', unsubAll: 'No recibir ninguna pizza de Slice of Thanks',
      unsubDone: 'Listo. Ya no recibirás estas pizzas.', test: 'PIZZA DE PRUEBA',
      fun: { order: 'Pedido #', kitchen: 'Cocina: Gerald, chef principal', driver: 'Repartidora: Potato, jefa de entregas', item: 'Pizza de agradecimiento', house: 'INVITA LA CASA',
        sauce: 'Salsa', toppings: 'Ingredientes', counted: function (n) { return n + ' (los contó Gerald)'; }, star: 'Ingrediente estrella', bake: 'Horneado', bakes: ['Rápido', 'Dorado', 'A la piedra', 'Perfecto de Gerald'],
        slices: 'Porciones devoradas', total: 'TOTAL', paid: 'Pagado con gratitud',
        extras: [['Calorías', 'Emocionalmente importantes'], ['Buena onda', 'EXTRA GRANDE'], ['Corteza', 'Muy sólida'], ['Queso', 'Legendario'], ['Servilletas', 'No alcanzaron'], ['Entrega', 'Rápida. Potato iba corriendo.'], ['Propina', 'Una rascadita de panza para Potato'], ['Sobras', 'Ninguna. Impresionante.']],
        footers: ['GRACIAS POR COMERTE TUS SENTIMIENTOS', 'NO HAY REEMBOLSOS DE BUENA ONDA', 'LA CORTEZA NO ES UNA VERDURA. LO REVISAMOS.', 'VUELVE CON HAMBRE', 'GERALD DICE: BUENA TÉCNICA DE MORDIDA'],
        stamp: ['PAGADO', 'CON GRATITUD'], approved: 'Aprobado por Gerald', paw: 'Inspeccionado por Potato',
        cheers: ['Gerald lo firmó. Potato intentó comérselo.', 'Sellado y aprobado. Gerald va a enmarcar una copia.', 'Potato le puso su huella. Dice que es oficial.', 'Recibo impreso. Gerald dice que es su mejor obra.'],
        share: 'Compartir mi recibo', making: 'Imprimiendo tu recibo...', saved: 'Recibo guardado. Compártelo donde quieras.', privacy: 'Tu nota, los nombres y los códigos son privados. Solo se comparten el recibo y la pizza.',
        shareText: 'Me acabo de comer una pizza de agradecimiento. Crea la tuya en sliceofthanks.app', get: 'Envía la tuya en sliceofthanks.app' }
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
    // Gerald's Birthday Special: Potato wears a party hat
    if (box.birthday_special) { var hat = el('span', { class: 'u-party-hat', 'aria-hidden': 'true' }); hat.innerHTML = "<svg viewBox='0 0 40 48'><path d='M20 4 34 44H6z' fill='#2b6cb0' stroke='#3E2416' stroke-width='3' stroke-linejoin='round'/><path d='M13 24h14M10 33h20' stroke='#f5c518' stroke-width='3.5'/><circle cx='20' cy='5' r='5' fill='#e86a92' stroke='#3E2416' stroke-width='2.5'/></svg>"; scoot.appendChild(hat); }
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
    var ownGreeting = /^\s*(hi|hello|hey|dear|hola|happy|feliz|good (morning|afternoon|evening))\b/i.test(box.note || '');
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
    var fun = funReceipt(pizza);
    var r = P.review(pizza, box);
    var receipt = el('div', { class: 'receipt' }, [
      el('span', { class: 'rh', text: t.review }),
      el('span', { class: 'u-critic' }, [el('img', { class: 'u-av', src: BASE + '/brand/characters/gerald-avatar.svg', alt: 'Gerald the raccoon' }), el('span', { text: 'Gerald. ' + t.critic })]),
      el('hr'), el('span', { text: r.text }), el('span', { text: t.rating(r.stars) }), slicesLine, el('hr'),
      el('span', { text: t.from + ': ' + [sender.name, sender.business].filter(Boolean).join(', ') }),
      el('span', { class: 'u-critic' }, [el('img', { class: 'u-av', src: BASE + '/brand/characters/potato-avatar.png', alt: 'Potato the dog' }), el('span', { text: t.potato })])
    ]);
    var done = el('div', { class: 'u-stage', hidden: true });
    // Send one back shows twice: under the sender's button, and again at the end of the page
    var backHref = SITE + '/kitchen?from=pizza' + (TOKEN && !DEMO ? '&back=' + encodeURIComponent(TOKEN) : '');
    var backOf = function () { return el('a', { class: 'u-btn u-back', href: backHref, text: t.back(whoFirst), onclick: function () { track('send_back_started'); } }); };
    var backTop = backOf(), backBtn = backOf();
    if (tease) s2.appendChild(tease);
    s2.appendChild(eatBtn); s2.appendChild(hint); if (cta) s2.appendChild(cta); s2.appendChild(backTop); s2.appendChild(done); s2.appendChild(fun.card); s2.appendChild(receipt);
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
    paint(); slicesLine.textContent = t.eaten(count()); fun.setSlices(count());
    eatBtn.addEventListener('click', function (e) {
      var rc = img.getBoundingClientRect(), k = 0;
      if (e.detail && rc.width) {
        var x = (e.clientX - rc.left) / rc.width * 340 - 170, y = (e.clientY - rc.top) / rc.height * 340 - 170;
        var ang = Math.atan2(y, x) - S0; ang = ((ang % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI); k = Math.floor(ang / W) % SL;
      }
      if (!left[k]) { var best = -1, bd = 9; for (var q = 0; q < SL; q++) if (left[q]) { var dd = Math.min((q - k + SL) % SL, (k - q + SL) % SL); if (dd < bd) { bd = dd; best = q; } } k = best; }
      if (k < 0) return;
      eatSlice(k); var n = count(); slicesLine.textContent = t.eaten(n); fun.setSlices(n); track('slice_eaten', n);
      try { if (navigator.vibrate) navigator.vibrate(12); } catch (er) { /* ignore */ }
      eatBtn.classList.remove('chomp'); void eatBtn.offsetWidth; eatBtn.classList.add('chomp');
      if (n >= SL) finish(); else hint.textContent = t.lines[Math.min(n - 1, t.lines.length - 1)] + ' ' + t.togo(SL - n);
    });

    function finish() {
      track('pizza_completed');
      setTimeout(function () {
        eatBtn.hidden = true; hint.hidden = true; if (tease) tease.hidden = true;
        // The open box: the note card stays on the inside of the lid, and the box below is empty
        var cardIn = el('div', { class: 'u-note' }, [
          d.recipient_name ? el('span', { class: 'u-to', text: t.to + ': ' + first(d.recipient_name) }) : null,
          el('p', { class: 'u-note-text', text: box.note || '' }),
          el('p', { class: 'u-note-sign', text: box.sign || [sender.name, sender.business].filter(Boolean).join(', ') }),
          gift ? el('span', { class: 'u-note-gift', text: (lang === 'es' ? 'Código de regalo: ' : 'Gift code: ') + gift.code }) : null
        ]);
        done.appendChild(el('div', { class: 'u-open' }, [
          el('div', { class: 'u-lidin', 'data-style': box.style || 'kraft' }, [cardIn]),
          el('div', { class: 'u-base' }, [el('div', { class: 'u-base-in' }, [el('p', { text: t.received })])])
        ]));
        if (gift) {
          track('gift_revealed');
          var codeEl = el('span', { class: 'u-code', text: gift.code });
          var copyBtn = el('button', { class: 'u-btn small', type: 'button', text: t.copy, onclick: function () {
            try { navigator.clipboard.writeText(gift.code).then(function () { copyBtn.textContent = t.copied; }); } catch (e) { /* ignore */ }
          } });
          var useUrl = safeUrl(gift.url);
          // Say who the gift is from (with their logo) and where the code works, so "20% off" is never a mystery
          var giver = (sender.send_as === 'business' && sender.business) ? sender.business : (sender.business || sender.name || who);
          var host = ''; try { host = useUrl ? new URL(useUrl).hostname.replace(/^www[.]/, '') : ''; } catch (e) { host = ''; }
          var giftLogo = !sender.personal && sender.logo_url ? el('img', { class: 'u-gift-logo', src: sender.logo_url, alt: giver + ' logo' }) : null;
          var card = el('div', { class: 'u-gift' }, [
            el('span', { class: 'u-eyebrow', text: t.under }), giftLogo,
            el('span', { class: 'u-gift-from', text: t.giftFrom(giver) }),
            el('strong', { class: 'u-gift-what', text: gift.text || '' }),
            el('span', { class: 'u-gift-label', text: t.yourCode }), codeEl,
            el('span', { class: 'u-gift-how', text: host ? t.useAt(gift.code, host) : t.useWith(gift.code, giver) }),
            gift.expires ? el('span', { class: 'u-why', text: t.useBy(new Date(gift.expires + 'T12:00').toLocaleDateString(lang === 'es' ? 'es' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' })) }) : null,
            el('div', { class: 'u-row' }, [copyBtn, useUrl ? el('a', { class: 'u-btn small primary', href: useUrl, target: '_blank', rel: 'noopener', text: gift.cta ? String(gift.cta).slice(0, 30) : t.use, onclick: function () { track('gift_clicked'); } }) : null])
          ]);
          done.appendChild(card);
        }
        if (cta) done.appendChild(cta);
        done.appendChild(backTop);
        done.appendChild(el('p', { class: 'u-why', text: t.ate }));
        done.hidden = false;
        P.burst(gift ? 'gold' : 'crumbs');
      }, 260);
    }
  }

  /* The fun receipt: a shareable order slip above Gerald's review. The shared image never has the note, any names,
     the pizza's name, letters spelled on the pizza, the gift code or the button link. */
  function hashOf(str) { var h = 2166136261; for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function funFacts(pizza) {
    var f = t.fun, seed = hashOf(TOKEN || (pizza.name || '') + (pizza.seed || 0)), tops = (pizza.toppings || []).filter(function (x) { return x.k !== 'label'; });
    var counts = {}; tops.forEach(function (x) { counts[x.k] = (counts[x.k] || 0) + 1; });
    var starK = Object.keys(counts).sort(function (a, b) { return counts[b] - counts[a]; })[0];
    var sauce = (P.SAUCES[pizza.sauce] || {}).n, bl = pizza.bakeLevel || 0;
    var e1 = seed % f.extras.length, e2 = (e1 + 1 + (seed >>> 4) % (f.extras.length - 1)) % f.extras.length;
    var rows = [];
    if (sauce) rows.push([f.sauce, sauce]);
    rows.push([f.toppings, f.counted(tops.length)]);
    if (starK && P.TOPS[starK]) rows.push([f.star, P.TOPS[starK].n + ' x' + counts[starK]]);
    rows.push([f.bake, f.bakes[Math.max(0, Math.min(3, bl))]]);
    rows.push(f.extras[e1]); rows.push(f.extras[e2]);
    return { order: 1000 + seed % 9000, rows: rows, footer: f.footers[(seed >>> 8) % f.footers.length] };
  }
  function funReceipt(pizza) {
    var f = t.fun, facts = funFacts(pizza), eatenN = 0;
    var row = function (a, b) { return el('div', { class: 'fr-row' }, [el('span', { text: a }), el('span', { text: b })]); };
    var slicesVal = el('span', { text: '0/6' });
    var status = el('p', { class: 'fr-status', 'aria-live': 'polite' });
    var shareBtn = el('button', { class: 'u-btn small primary', type: 'button', text: f.share });
    var stamp = el('div', { class: 'fr-stamp', 'aria-hidden': 'true' }, [el('b', { text: f.stamp[0] }), el('span', { text: f.stamp[1] })]);
    var card = el('div', { class: 'fun-receipt' }, [
      el('div', { class: 'fr-head' }, [el('img', { class: 'fr-logo', src: BASE + '/brand/logo/slice-of-thanks-logo-240.png', alt: 'Slice of Thanks' }), el('span', { text: f.order + facts.order + ' · ' + new Date().toLocaleDateString(lang === 'es' ? 'es' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' }) }),
        el('span', { text: f.kitchen }), el('span', { text: f.driver })]),
      el('hr'), row('1x ' + (pizza.name || f.item), f.house)
    ].concat(facts.rows.map(function (x) { return row(x[0], x[1]); })).concat([
      el('div', { class: 'fr-row' }, [el('span', { text: f.slices }), slicesVal]),
      el('hr'), el('div', { class: 'fr-row fr-total' }, [el('span', { text: f.total }), el('span', { text: '$0.00' })]), el('span', { class: 'fr-paid', text: f.paid }),
      el('hr'), el('p', { class: 'fr-foot', text: facts.footer + ' ♥' }), el('div', { class: 'fr-bar', 'aria-hidden': 'true' }), stamp,
      shareBtn, el('p', { class: 'fr-note', text: f.privacy }), status
    ]));
    shareBtn.addEventListener('click', function () {
      status.textContent = f.making;
      // The fun part: Gerald stamps it, a little burst, and a line from the crew
      card.classList.remove('stamped'); void card.offsetWidth; card.classList.add('stamped');
      setTimeout(function () { try { P.burst('pizza'); } catch (e) { /* ignore */ } }, 420);
      shareImage(pizza, facts, eatenN).then(function (blob) {
        if (!blob) { status.textContent = ''; return; }
        track('receipt_shared');
        var cheer = f.cheers[Math.floor(Math.random() * f.cheers.length)];
        var file = null; try { file = new File([blob], 'slice-of-thanks-receipt.jpg', { type: 'image/jpeg' }); } catch (e) { /* older browsers */ }
        if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
          status.textContent = cheer; navigator.share({ files: [file], text: f.shareText }).then(function () { /* shared */ }, function () { /* closed */ });
        } else {
          var a = el('a', { href: URL.createObjectURL(blob), download: 'slice-of-thanks-receipt.jpg' }); document.body.appendChild(a); a.click(); a.remove();
          status.textContent = cheer + ' ' + f.saved;
        }
      });
    });
    return { card: card, setSlices: function (n) { eatenN = n; slicesVal.textContent = n + '/6'; } };
  }
  function loadImg(src) {
    return new Promise(function (res) { var i = new Image(); i.crossOrigin = 'anonymous'; i.onload = function () { res(i); }; i.onerror = function () { res(null); }; i.src = src; });
  }
  function shareImage(pizza, facts, eatenN) {
    return Promise.all([loadImg(BASE + '/brand/logo/slice-of-thanks-logo-240.png'), loadImg(BASE + '/brand/characters/gerald-avatar.svg'), loadImg(BASE + '/brand/characters/potato-avatar.png')])
      .then(function (imgs) { return drawShare(pizza, facts, eatenN, imgs[0], imgs[1], imgs[2]); });
  }
  function drawShare(pizza, facts, eatenN, logo, gAv, pAv) {
    var f = t.fun, W = 1080, H = 1350, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    var c = cv.getContext('2d'), mono = '"Courier Prime","Courier New",monospace';
    c.fillStyle = '#FFF3E0'; c.fillRect(0, 0, W, H);
    for (var x = 0; x < W; x += 40) for (var y = 0; y < 2; y++) { c.fillStyle = (x / 40 + y) % 2 ? '#FFF3E0' : '#D62828'; c.fillRect(x, y * 40, 40, 40); }
    // The pizza without any spelled letters
    var pc = P.clonePizza(pizza); pc.sign = null; pc.toppings = (pc.toppings || []).filter(function (x) { return x.k !== 'label'; });
    var pcv = document.createElement('canvas'); P.drawPizza(pcv, pc, 260); c.drawImage(pcv, (W - 260) / 2, 100, 260, 260);
    // The paper
    var px = 150, py = 376, pw = W - 300, ph = 664 + 44 * facts.rows.length;
    c.fillStyle = 'rgba(62,36,22,.18)'; c.fillRect(px + 10, py + 12, pw, ph);
    c.fillStyle = '#fffdf5'; c.fillRect(px, py, pw, ph);
    c.fillStyle = '#FFF3E0'; for (var z = px; z < px + pw; z += 28) { c.beginPath(); c.arc(z + 14, py + ph + 1, 10, Math.PI, 0); c.fill(); }
    c.fillStyle = '#2c2420'; c.textBaseline = 'alphabetic';
    var yy = py + 60, L = px + 44, Rt = px + pw - 44;
    function center(txt, size, bold, color) { c.font = (bold ? '700 ' : '400 ') + size + 'px ' + mono; c.fillStyle = color || '#2c2420'; c.textAlign = 'center'; c.fillText(txt, W / 2, yy); }
    function line(a, b, bold) { c.font = (bold ? '700 ' : '400 ') + '28px ' + mono; c.fillStyle = '#2c2420'; c.textAlign = 'left'; c.fillText(a, L, yy); c.textAlign = 'right'; c.fillText(b, Rt, yy); yy += 44; }
    function dash() { c.strokeStyle = '#b9aea3'; c.setLineDash([8, 8]); c.lineWidth = 2; c.beginPath(); c.moveTo(L, yy - 14); c.lineTo(Rt, yy - 14); c.stroke(); c.setLineDash([]); yy += 26; }
    if (logo) { var lh = 96, lw = lh * logo.width / logo.height; c.drawImage(logo, (W - lw) / 2, yy - 40, lw, lh); yy += 92; } else { center('SLICE OF THANKS', 44, true, '#D62828'); yy += 44; }
    center(f.order + facts.order, 26, false); yy += 44; dash();
    line('1x ' + f.item, f.house, true);
    facts.rows.forEach(function (r) { line(r[0], r[1].length > 30 ? r[1].slice(0, 29) + '.' : r[1]); });
    line(f.slices, (eatenN || 6) + '/6'); dash();
    line(f.total, '$0.00', true); center(f.paid, 26, false); yy += 52;
    center(facts.footer, 26, true); yy += 30;
    var barY = yy;
    for (var b = 0; b < 60; b++) { c.fillStyle = '#2c2420'; var bw = (hashOf(String(facts.order + b)) % 3) + 2; c.fillRect(W / 2 - 270 + b * 9, yy, bw, 50); }
    yy += 120;
    // Gerald signs, Potato inspects
    function badge(img, label, x) { if (img) { c.save(); c.beginPath(); c.arc(x + 30, yy - 10, 30, 0, 6.283); c.clip(); c.drawImage(img, x, yy - 40, 60, 60); c.restore(); }
      c.font = '700 22px ' + mono; c.fillStyle = '#2c2420'; c.textAlign = 'left'; c.fillText(label, x + 72, yy - 2); }
    badge(gAv, f.approved, L); badge(pAv, f.paw, L + 340);
    // The PAID stamp, a little crooked
    c.save(); c.translate(Rt - 96, barY + 30); c.rotate(-0.22); c.scale(0.8, 0.8); c.globalAlpha = 0.85; c.strokeStyle = '#D62828'; c.lineWidth = 7; c.fillStyle = '#D62828';
    c.strokeRect(-130, -62, 260, 124); c.lineWidth = 2; c.strokeRect(-120, -52, 240, 104);
    c.textAlign = 'center'; c.font = '700 58px ' + mono; c.fillText(f.stamp[0], 0, 6); c.font = '700 20px ' + mono; c.fillText(f.stamp[1], 0, 38); c.restore();
    // Potato's paw print in the corner
    c.save(); c.translate(px + pw - 54, py + 62); c.rotate(0.3); c.fillStyle = 'rgba(62,36,22,.55)';
    c.beginPath(); c.ellipse(0, 10, 20, 16, 0, 0, 6.283); c.fill(); [[-22, -14], [-8, -26], [8, -26], [22, -14]].forEach(function (q) { c.beginPath(); c.ellipse(q[0], q[1], 7, 9, 0, 0, 6.283); c.fill(); }); c.restore();
    c.font = '700 30px ' + mono; c.fillStyle = '#3E2416'; c.textAlign = 'center'; c.fillText(f.get, W / 2, Math.min(H - 18, py + ph + 56));
    return new Promise(function (res) { try { cv.toBlob(function (bl) { res(bl); }, 'image/jpeg', 0.92); } catch (e) { res(null); } });
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
    if (qs.get('demo') === 'birthday') {
      var tops = [], kinds = [['pepStar', 12], ['pepHeart', 12], ['sprinkle', 22], ['candle', 6]];
      kinds.forEach(function (kn) { for (var i = 0; i < kn[1]; i++) { var a = Math.random() * 6.283, dd = Math.sqrt(Math.random()) * 0.8; tops.push({ k: kn[0], x: Math.cos(a) * dd, y: Math.sin(a) * dd, rot: Math.random() * 6.283 }); } });
      return { recipient_name: 'Jordan Reyes', locale: lang, slices_eaten: 0, snapshot: {
        pizza: { size: 0.92, seed: 4, sauce: 'red', cheese: 'mozz', vegan: false, toppings: tops, bake: 1, baked: true, byGerald: true, bakeLevel: 3, sign: { text: 'Jordan' }, name: "Gerald's Birthday Special" },
        box: { style: 'hearts', sticker: 'Happy Birthday', confetti: 'party', tone: 'playful', topper: 'bday2026', birthday_special: true,
          note: 'Happy birthday, Jordan! The whole kitchen made this one just for you. Potato ate one slice. Sorry.', sign: 'Gerald, Head Chef, and Potato, Head of Delivery',
          gift: { text: '14 days of The Whole Pie, on the house. Unlock them within 30 days.', code: 'HAPPY-BIRTHDAY', url: SITE + '/kitchen?birthday=unlock', cta: 'Unlock my 14 days' } },
        sender: { name: '', business: 'Gerald and Potato', send_as: 'business', show_made_with: false } } };
    }
    return { recipient_name: 'Jordan Reyes', locale: lang, slices_eaten: 0, snapshot: {
      pizza: P.defaultSignature(),
      box: { style: 'kraft', sticker: 'Thank You', confetti: 'classic', tone: 'playful', note: 'Thank you for making time to meet today. I loved hearing about your plans.', sign: 'Warmly, Stacey',
        cta_label: 'Book a follow-up with Stacey', cta_url: 'example.com', gift: { text: '20% off your first 3 months', code: 'SLICE20', url: 'example.com', expires: '' } },
      sender: { name: 'Stacey Lake', business: 'Mountain Studio', send_as: 'person', mailing_address: 'PO Box 1, Crestline, CA', show_made_with: true } } };
  }
})();
