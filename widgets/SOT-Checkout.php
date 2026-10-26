<?php
/* SOT-Checkout: Slice of Thanks look for BD's sign up pages (/checkout/...). Version 1.4.0
   BD's checkout pages skip the site footer widgets, so this widget is loaded from the default widget
   Bootstrap Theme - Signup Page - H1 Title, which only appears on the sign up pages.
   Add ?sotdebug=1 to the page address to see a small box proving the widget loaded there. */
$sot_co_uri = isset($_SERVER['REQUEST_URI']) ? (string) $_SERVER['REQUEST_URI'] : '';
if (strpos($sot_co_uri, 'sotdebug=1') !== false) {
  echo '<div style="position:fixed;bottom:8px;left:8px;z-index:99999;background:#fff;color:#000;border:2px solid #000;border-radius:8px;padding:6px 10px;font:13px monospace">SOT-Checkout 1.4.0 loaded. Server address: ' . htmlspecialchars($sot_co_uri) . '</div>';
}
?>
<!-- The script hides all of this on any page whose address does not start with /checkout.
     BD still creates the account, checks the legal boxes, and takes any payment. This widget only styles it,
     moves BD's form into the Slice of Thanks card, and adds the links around it. -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Shrikhand&family=Yellowtail&family=Work+Sans:wght@400;500;600;700&display=swap">
<style>
/* 1.3.3: sizes are in px because BD sets the page's root font size to 10px, which shrank every rem size */
:root{--sot-bg:#FFF3E0;--sot-surface:#FFFAF2;--sot-ink:#3E2416;--sot-muted:#7A5641;--sot-line:#EBCFA8;--sot-edge:#3E2416;
  --sot-tomato:#D62828;--sot-tomato-ink:#FFF3E0;--sot-tomato-text:#C21F1F;--sot-mustard:#F5C04E;--sot-field:#FFFFFF}
@media (prefers-color-scheme: dark){:root{--sot-bg:#24160F;--sot-surface:#3E2416;--sot-ink:#E3D0B8;--sot-muted:#BBA088;--sot-line:#634433;
  --sot-edge:#17110E;--sot-tomato:#D93A30;--sot-tomato-ink:#FFF3E0;--sot-tomato-text:#FF8A7A;--sot-field:#2E1B11}}
html,body{background:var(--sot-bg)!important;color:var(--sot-ink);margin:0}
body{font-family:"Work Sans",system-ui,-apple-system,"Segoe UI",sans-serif;font-size:16px;line-height:1.5;padding:0 16px}
.sot-login{max-width:620px;margin:0 auto;padding:28px 0 56px;display:flex;flex-direction:column;gap:18px}
.sot-login-head{background:var(--sot-tomato);color:var(--sot-tomato-ink);border:3px solid var(--sot-edge);border-radius:24px;
  box-shadow:6px 6px 0 var(--sot-edge);padding:18px 22px 16px;text-decoration:none;display:block}
.sot-login-head{display:flex;align-items:center;gap:14px}
.sot-login-head .sot-env{width:44px;height:auto;flex:none;transform:rotate(-8deg);filter:drop-shadow(3px 3px 0 rgba(58,29,18,.55))}
.sot-login-head .sot-logo{display:block;width:180px;max-width:100%;height:auto;filter:drop-shadow(3px 3px 0 rgba(58,29,18,.55))}
.sot-login-head .sot-tag{font-weight:600;font-size:15px;display:block;margin-top:8px;color:#FFF3E0!important}
.sot-login-card{background:var(--sot-surface);border:3px solid var(--sot-edge);border-radius:22px;box-shadow:6px 6px 0 var(--sot-edge);padding:22px}
.sot-login-card h1,.sot-login-card h2,.sot-login-card h3{font:400 27px "Shrikhand",Georgia,serif;margin:0 0 14px;color:var(--sot-ink)}
.sot-login-card hr{display:none}
.sot-login-card label{display:block;font-weight:700;margin:14px 0 6px;color:var(--sot-ink)}
/* Checkbox rows (legal agreement and BD's consent boxes): box and text side by side */
.sot-login-card label:has(input[type=checkbox]),.sot-login-card .checkbox label{display:flex;gap:10px;align-items:flex-start;font-weight:500}
.sot-login-card input[type=checkbox]{width:20px;height:20px;flex:none;margin:2px 0 0;accent-color:var(--sot-tomato)}
.sot-login-card .checkbox,.sot-login-card .well{background:transparent!important;border:0!important;padding:0!important;margin:10px 0!important;box-shadow:none!important}
/* One column so every field fits the card */
#sot-login-slot [class*="col-"]{width:100%!important;float:none!important;max-width:100%!important;flex:none!important;padding-left:0!important;padding-right:0!important}
#sot-login-slot .row{display:block!important}
.sot-login-card select,.sot-login-card textarea{display:block;width:100%;box-sizing:border-box;font:500 16px "Work Sans",system-ui,sans-serif;color:var(--sot-ink);background:var(--sot-field);border:3px solid var(--sot-edge);border-radius:14px;padding:12px 14px}
.sot-login-card .text-danger,.sot-login-card .required,.sot-login-card label span{color:var(--sot-tomato-text)}
.sot-login-card input[type=text],.sot-login-card input[type=email],.sot-login-card input[type=password]{display:block;width:100%;box-sizing:border-box;
  font:500 16px "Work Sans",system-ui,sans-serif;color:var(--sot-ink);background:var(--sot-field);border:3px solid var(--sot-edge);border-radius:14px;padding:12px 14px;margin:0}
.sot-login-card input::placeholder{color:var(--sot-muted)}
.sot-login-card input:focus{outline:3px solid var(--sot-mustard);outline-offset:2px}
/* Only the main action gets the big button; BD's small helper buttons (like the password lock) stay small */
.sot-login-card input[type=submit],.sot-login-card button[type=submit],.sot-login-card a.btn{display:block;width:100%;box-sizing:border-box;margin:18px 0 0;cursor:pointer;
  font:700 17px "Work Sans",system-ui,sans-serif;color:var(--sot-tomato-ink);background:var(--sot-tomato);border:3px solid var(--sot-edge);border-radius:999px;
  padding:13px 20px;box-shadow:4px 4px 0 var(--sot-edge);text-align:center;text-decoration:none}
#sot-login-slot button:not([type=submit]){display:inline-block;width:auto;margin:0;padding:2px 6px;background:transparent;border:0;box-shadow:none;color:var(--sot-muted);cursor:pointer}
.sot-login-card button[type=submit]:active,.sot-login-card input[type=submit]:active{transform:translate(2px,2px);box-shadow:2px 2px 0 var(--sot-edge)}
.sot-login-card a{color:var(--sot-tomato-text);font-weight:600}
.sot-login-card form > a{display:inline-block;margin-top:12px}
/* BD's own "Get Listed Today" link list; the footer below has the sign up link */
.sot-login-card ul{display:none}
.sot-login-card a.btn.sot-quiet{background:transparent;color:var(--sot-ink)}
.sot-login-card p{margin:0 0 4px;color:var(--sot-muted)}
.sot-login-card .alert{border:2px solid var(--sot-edge);border-radius:14px;padding:10px 14px;margin:0 0 12px;background:var(--sot-line);color:var(--sot-ink)}
.sot-login-card .g-recaptcha{margin-top:16px}
/* BD's field notes, such as Required Field */
.sot-login-card .help-block,.sot-login-card .error,.sot-login-card .text-muted{display:block;font-size:14px;margin-top:6px;color:var(--sot-tomato-text)}
/* BD's login CSS sets the container colors with !important on a strong selector; the id here outranks it */
#sot-login-slot .module,#sot-login-slot .row,#sot-login-slot .fpad-lg,#sot-login-slot .member-login-container,#sot-login-slot form,#sot-login-slot .form-group,#sot-login-slot fieldset{
  width:auto!important;max-width:none!important;margin-left:0!important;margin-right:0!important;padding:0!important;
  background:transparent!important;border:0!important;box-shadow:none!important;color:var(--sot-ink)!important}
/* Keep BD's password lock icon next to its field instead of floating to the top of the page */
#sot-login-slot,#sot-login-slot form,#sot-login-slot .form-group,#sot-login-slot label{position:relative}
#sot-login-slot .fa-lock,#sot-login-slot .glyphicon-lock{position:absolute!important;left:auto!important;right:4px!important;top:4px!important;bottom:auto!important;transform:none!important;color:var(--sot-muted)}
.sot-plan-line{text-align:center}
.sot-plan-line span{display:block;color:var(--sot-muted);font-weight:600}
.sot-plan-line b{display:block;font:400 32px "Shrikhand",Georgia,serif;color:var(--sot-ink);line-height:1.2}
.sot-login-foot{text-align:center;display:flex;flex-direction:column;gap:8px}
.sot-login-foot a{color:var(--sot-tomato-text);font-weight:700}
.sot-login-foot .sot-muted{color:var(--sot-muted)}
/* 1.3.1: BD's Bootstrap rules win over the card rules above, so these repeat them with the id and !important */
#sot-login-slot h1,#sot-login-slot h2,#sot-login-slot h3,#sot-login-slot legend{font:400 27px "Shrikhand",Georgia,serif!important;color:var(--sot-ink)!important;border:0!important;margin:0 0 14px!important;padding:0!important}
#sot-login-slot input[type=text],#sot-login-slot input[type=email],#sot-login-slot input[type=password],#sot-login-slot input[type=tel],#sot-login-slot select,#sot-login-slot textarea{
  height:auto!important;border:3px solid var(--sot-edge)!important;border-radius:14px!important;background:var(--sot-field)!important;color:var(--sot-ink)!important;
  padding:12px 14px!important;font:500 16px "Work Sans",system-ui,sans-serif!important;box-shadow:none!important}
#sot-login-slot .checkbox label,#sot-login-slot label:has(input[type=checkbox]){display:flex!important;gap:10px!important;align-items:flex-start!important;padding-left:0!important;font-weight:500!important}
#sot-login-slot input[type=checkbox]{position:static!important;margin:3px 0 0!important;width:20px!important;height:20px!important;flex:none!important}
#sot-login-slot input[type=submit],#sot-login-slot button[type=submit]{font:700 18px "Work Sans",system-ui,sans-serif!important;border-radius:999px!important;padding:14px 20px!important;height:auto!important}
/* 1.3.2: the script tags BD's form title and main button, whatever tag BD uses for them */
#sot-login-slot .sot-co-title{font:400 27px "Shrikhand",Georgia,serif!important;color:var(--sot-ink)!important;border:0!important;margin:0 0 14px!important;padding:0!important;background:transparent!important;text-transform:none!important;letter-spacing:0!important}
#sot-login-slot .sot-co-go,#sot-login-slot .sot-co-go *{font:700 18px "Work Sans",system-ui,sans-serif!important;letter-spacing:0!important;text-transform:none!important}
#sot-login-slot .sot-co-go{display:block!important;width:100%!important;border-radius:999px!important;padding:14px 20px!important;height:auto!important;color:var(--sot-tomato-ink)!important;
  background:var(--sot-tomato)!important;border:3px solid var(--sot-edge)!important;box-shadow:4px 4px 0 var(--sot-edge)!important}
</style>
<div class="sot-login" id="sot-login">
  <a class="sot-login-head" href="/kitchen"><img class="sot-env" src="https://cdn.jsdelivr.net/gh/SliceOfThanks/slice-of-thanks@b2daf45f83bb13e416264136401456c95f2cde3f/brand/logo/pizza-envelope-96.png" alt=""><span><img class="sot-logo" src="https://cdn.jsdelivr.net/gh/SliceOfThanks/slice-of-thanks@b2daf45f83bb13e416264136401456c95f2cde3f/brand/logo/slice-of-thanks-logo-white-360.png" alt="Slice of Thanks"><span class="sot-tag">Pizzas for every thank-you and celebration</span></span></a>
  <div class="sot-plan-line" id="sot-plan-line"><span>Create your account</span><b id="sot-plan-name"></b></div>
  <div class="sot-login-card" id="sot-login-slot"></div>
  <div class="sot-login-foot">
    <span class="sot-muted">Already have an account? <a href="/login?loc=%2Fkitchen">Log in</a></span>
    <a href="/join">See all plans</a>
    <a href="/kitchen">Back to the Kitchen</a>
  </div>
</div>
<script>
(function () {
  var VERSION = 'checkout 1.3.3';
  var NL = String.fromCharCode(10);
  var tries = 0;
  function cookieNames() {
    var out = [];
    var parts = document.cookie.split(';');
    for (var i = 0; i < parts.length; i++) { var n = parts[i].trim().split('=')[0]; if (n) { out.push(n); } }
    return out;
  }
  function loggedIn() {
    var parts = document.cookie.split(';');
    for (var i = 0; i < parts.length; i++) {
      var kv = parts[i].trim().split('=');
      if (kv[0] === 'userid' && Number(kv[1]) > 0) { return true; }
      if (kv[0] === 'loggedin' && kv[1] === '1') { return true; }
    }
    return false;
  }
  /* BD's page titles can be h1, h2 or h3 depending on the page settings: hide every heading outside our shell */
  function hideTitles(shell) {
    var hs = document.querySelectorAll('h1, h2, h3');
    for (var i = 0; i < hs.length; i++) {
      if (!shell.contains(hs[i])) { hs[i].style.display = 'none'; }
    }
  }
  function desc(el) {
    if (!el) { return '-'; }
    var cs = getComputedStyle(el);
    return el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(' ').join('.') : '') + ' ' + cs.fontSize + ' ' + cs.fontFamily.split(',')[0];
  }
  /* BD's form title and main button use different tags on different pages: tag them so the styles above always apply */
  function tagParts(slot) {
    var ts = slot.querySelectorAll('h1, h2, h3, h4, h5, h6, legend, .panel-title, .panel-heading, .h1, .h2, .h3, .h4, [class*=title], [class*=heading]');
    for (var i = 0; i < ts.length; i++) {
      if (ts[i].querySelector('input, select, textarea') || ts[i].tagName === 'LABEL') { continue; }
      ts[i].classList.add('sot-co-title');
    }
    var bs = slot.querySelectorAll('button, input[type=submit], input[type=button], .btn');
    for (var j = 0; j < bs.length; j++) {
      var txt = (bs[j].value || bs[j].textContent || '').trim();
      if (txt.length > 3) { bs[j].classList.add('sot-co-go'); }
    }
  }
  /* Open /checkout/a-slice?sotdebug=1 to see what the widget found (names only, no values) */
  function debug(shell, found) {
    if (location.search.indexOf('sotdebug=1') < 0) { return; }
    var heads = [];
    var hs = document.querySelectorAll('h1, h2, h3');
    for (var i = 0; i < hs.length; i++) { heads.push(hs[i].tagName + ' ' + hs[i].textContent.trim().slice(0, 40)); }
    var pre = document.getElementById('sot-login-debug') || document.createElement('pre');
    pre.id = 'sot-login-debug';
    pre.style.cssText = 'white-space:pre-wrap;font:13px monospace;background:#fff;color:#000;border:2px solid #000;padding:10px;border-radius:8px';
    pre.textContent = 'SOT-Checkout ' + VERSION + ' | try ' + tries +
      NL + 'login container: ' + !!document.querySelector('.member-login-page-container') +
      NL + 'forms: ' + document.querySelectorAll('form').length + ', password fields: ' + document.querySelectorAll('input[type=password]').length +
      NL + 'form moved into card: ' + found + ', logged in cookie: ' + loggedIn() +
      NL + 'cookies: ' + cookieNames().join(', ') +
      NL + 'headings: ' + heads.join(' / ') +
      NL + 'title: ' + desc(document.querySelector('#sot-login-slot .sot-co-title')) +
      NL + 'button: ' + desc(document.querySelector('#sot-login-slot .sot-co-go')) +
      NL + 'page: ' + location.pathname;
    shell.appendChild(pre);
  }
  /* This page cannot hide BD's header and footer in Page Options, so do it here: our shell becomes the page */
  function clearPage(shell) {
    if (shell.parentElement !== document.body) { document.body.insertBefore(shell, document.body.firstChild); }
    var kids = document.body.children;
    for (var i = 0; i < kids.length; i++) {
      var k = kids[i];
      if (k === shell || k.tagName === 'SCRIPT' || k.tagName === 'STYLE' || k.tagName === 'LINK' || k.tagName === 'NOSCRIPT') { continue; }
      k.style.setProperty('display', 'none', 'important');
    }
  }
  function place() {
    var shell = document.getElementById('sot-login');
    var slot = document.getElementById('sot-login-slot');
    if (!shell || !slot) { return; }
    if (location.pathname.indexOf('/checkout') !== 0) { shell.style.display = 'none'; return; }
    /* The title widget sits inside BD's page, maybe inside the form itself: lift our shell out first */
    if (shell.parentElement !== document.body) { document.body.insertBefore(shell, document.body.firstChild); }
    /* Name the plan from the address, like /checkout/a-slice */
    var names = { 'a-slice': 'A Slice', '10': 'A Slice', 'the-whole-pie': 'The Whole Pie', '12': 'The Whole Pie', 'pizza-party': 'Pizza Party', '11': 'Pizza Party' };
    var slug = location.pathname.split('/')[2] || '';
    var pn = document.getElementById('sot-plan-name');
    if (pn && !pn.textContent) { pn.textContent = names[slug] || ''; if (!names[slug]) { document.getElementById('sot-plan-line').style.display = 'none'; } }
    if (slot.getAttribute('data-done')) { hideTitles(shell); return; }
    var box = null;
    var pw = document.querySelector('input[type=password]');
    if (pw) { var f = pw.closest('form'); box = (f && (f.closest('.module') || f.closest('.well') || f.parentElement)) || f; }
    if (box) {
      slot.appendChild(box);
      tagParts(slot);
      slot.setAttribute('data-done', '1');
      slot.style.display = '';
      hideTitles(shell);
      clearPage(shell);
      debug(shell, true);
      return;
    }
    hideTitles(shell);
    if (loggedIn()) {
      var foot = shell.querySelector('.sot-login-foot'); if (foot) { foot.style.display = 'none'; }
      slot.innerHTML = '<h2>You already have an account</h2><p>Change your plan anytime from Settings in your Kitchen.</p><a class="btn" href="/kitchen">Go to the Kitchen</a>';
      slot.setAttribute('data-done', '1');
      slot.style.display = '';
      clearPage(shell);
      debug(shell, false);
      return;
    }
    /* BD may add the form a moment later: keep looking for about 5 seconds */
    slot.style.display = 'none';
    debug(shell, false);
    if (tries++ < 20) { setTimeout(place, 250); }
  }
  if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', place); } else { place(); }
})();
</script>
<?php
?>
