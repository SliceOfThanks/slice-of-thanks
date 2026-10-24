<?php
/* SOT-App: the Slice of Thanks member app. Place this widget on the Kitchen page. Version 1.2.0
   Checkout links live in Supabase (app_settings checkout_urls). The data-*-url attributes below override them when filled in.
   data-why lists which sign in checks failed (names only, no secrets) so Supabase can log it. */
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
$sot_why = array();
if (!function_exists('widget')) { $sot_why[] = 'no_widget_fn'; }
if (!function_exists('sot_auth_token')) { $sot_why[] = 'auth_not_loaded'; }
if (!defined('SOT_BD_SECRET')) { $sot_why[] = 'no_secret'; }
elseif (strlen(SOT_BD_SECRET) < 32 || strpos(SOT_BD_SECRET, 'PASTE_') === 0) { $sot_why[] = 'secret_not_set'; }
if (!class_exists('user')) { $sot_why[] = 'no_user_class'; }
if (!isset($_COOKIE['userid'])) { $sot_why[] = 'no_userid_cookie'; }
elseif (class_exists('user')) {
  try { if (!user::isUserLogged($_COOKIE)) { $sot_why[] = 'not_logged'; } } catch (Throwable $sot_e2) { $sot_why[] = 'logged_check_error'; }
}
if (function_exists('sot_db_name') && sot_db_name(isset($w) ? $w : array()) == '') { $sot_why[] = 'no_db'; }
if (!function_exists('mysql')) { $sot_why[] = 'no_mysql_fn'; }
$sot_ck = array();
foreach (array_keys($_COOKIE) as $sot_k) {
  $sot_l = strtolower($sot_k);
  if (strpos($sot_l, 'user') !== false || strpos($sot_l, 'login') !== false || strpos($sot_l, 'member') !== false || strpos($sot_l, 'sess') !== false) { $sot_ck[] = $sot_k; }
}
$sot_why[] = ($sot_tok == '' ? 'empty_token' : 'token_ok');
$sot_why[] = 'cookies:' . implode('+', array_slice($sot_ck, 0, 10));
$sot_why_safe = htmlspecialchars(implode(',', $sot_why), ENT_QUOTES);
?>
<div id="sot-app" data-api="https://cmnclubiarmthibqibuj.supabase.co/functions/v1/api" data-token="<?php echo $sot_tok_safe; ?>" data-signup-url="/join" data-login-url="/login" data-upgrade-url="/join" data-why="<?php echo $sot_why_safe; ?>" data-special-url="" data-pack100-url="" data-pack500-url="" data-pack1000-url=""><p style="text-align:center;padding:40px 16px;font-family:Georgia,serif;color:#3a1d12">Warming up the oven...</p></div>
