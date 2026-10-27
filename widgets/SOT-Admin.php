<?php
/* SOT-Admin: the Slice of Thanks owner dashboard. Place this widget on a members-only page (for example /sot-analytics). Version 1.0.0
   Only the BD accounts listed in Supabase (app_settings analytics admin_bd_user_ids) see numbers. Everyone else sees a short notice.
   Needs the SOT-Auth widget, like SOT-App. */
$sot_tok = '';
if (function_exists('widget')) {
  $sot_lvl = ob_get_level();
  try {
    ob_start();
    widget('SOT-Auth', '', isset($w['website_id']) ? $w['website_id'] : 0, isset($w) ? $w : array());
    ob_get_clean();
  } catch (Throwable $sot_e) {
    while (ob_get_level() > $sot_lvl) { ob_end_clean(); }
  }
}
if (function_exists('sot_auth_token')) {
  $sot_tok = sot_auth_token(isset($w) ? $w : array());
}
$sot_tok_safe = htmlspecialchars($sot_tok, ENT_QUOTES);
?>
<div id="sot-admin" data-api="https://cmnclubiarmthibqibuj.supabase.co/functions/v1/api" data-token="<?php echo $sot_tok_safe; ?>"><p style="font-family:system-ui,sans-serif;padding:24px;text-align:center">Loading the Slice of Thanks dashboard...</p></div>
<script>
(function () {
  var root = document.getElementById('sot-admin');
  if (!root) { return; }
  var api = root.getAttribute('data-api');
  var tok = root.getAttribute('data-token') || '';
  function say(t) { root.innerHTML = ''; var p = document.createElement('p'); p.style.cssText = 'font-family:system-ui,sans-serif;padding:24px;text-align:center'; p.textContent = t; root.appendChild(p); }
  if (!tok) { say('Please log in with the Slice of Thanks owner account to see the dashboard.'); return; }
  fetch(api + '/admin/bootstrap', { headers: { 'x-sot-auth': tok } }).then(function (r) { return r.json().then(function (b) { b.httpStatus = r.status; return b; }); }).then(function (b) {
    if (b.httpStatus === 401) { say('Please log in again to see the dashboard.'); return; }
    if (!b.ok || !b.commit) { say('This page is only for the Slice of Thanks owner account.'); return; }
    var s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/gh/SliceOfThanks/slice-of-thanks@' + b.commit + '/admin/admin.js';
    document.body.appendChild(s);
  }).catch(function () { say('The dashboard did not load. Reload the page to try again.'); });
})();
</script>
