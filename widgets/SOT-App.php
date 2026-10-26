<?php
/* SOT-App: the Slice of Thanks member app. Place this widget on the Kitchen page. Version 1.3.0 (animated pizza clock while the Kitchen loads)
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
<div id="sot-app" data-api="https://cmnclubiarmthibqibuj.supabase.co/functions/v1/api" data-token="<?php echo $sot_tok_safe; ?>" data-signup-url="/join" data-login-url="/login" data-upgrade-url="/join" data-why="<?php echo $sot_why_safe; ?>" data-special-url="" data-pack100-url="" data-pack500-url="" data-pack1000-url=""><div class="sotld" role="status" aria-label="Loading the Kitchen"><style>.sotld{display:flex;flex-direction:column;align-items:center;gap:14px;padding:48px 16px;font-family:'Work Sans',system-ui,sans-serif;color:#3E2416;text-align:center}.sotld svg{width:132px;height:132px;overflow:visible;animation:sotldBob 1.5s ease-in-out infinite}.sotld .hand{transform-origin:60px 60px;animation:sotldSpin 3s linear infinite}.sotld .sl{opacity:0;transform-origin:60px 60px;animation:sotldSlice 3s ease-out infinite}.sotld .s0{animation-delay:0.0s}.sotld .s1{animation-delay:0.5s}.sotld .s2{animation-delay:1.0s}.sotld .s3{animation-delay:1.5s}.sotld .s4{animation-delay:2.0s}.sotld .s5{animation-delay:2.5s}@keyframes sotldSpin{to{transform:rotate(360deg)}}@keyframes sotldSlice{0%{opacity:0;transform:scale(.6)}6%{opacity:1;transform:scale(1.06)}12%,88%{opacity:1;transform:scale(1)}100%{opacity:0}}@keyframes sotldBob{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}.sotld .msgs{position:relative;height:1.5em;width:100%;max-width:340px;font-weight:700;font-size:16px}.sotld .msgs span{position:absolute;left:0;right:0;opacity:0;animation:sotldMsg 12s infinite}.sotld .msgs span:nth-child(1){animation-delay:0s}.sotld .msgs span:nth-child(2){animation-delay:3s}.sotld .msgs span:nth-child(3){animation-delay:6s}.sotld .msgs span:nth-child(4){animation-delay:9s}@keyframes sotldMsg{0%{opacity:0;transform:translateY(6px)}3.8%,21.2%{opacity:1;transform:none}25.0%,100%{opacity:0}}.sotld small{font-size:13px;opacity:.7}@media (prefers-reduced-motion: reduce){.sotld svg,.sotld .hand,.sotld .sl,.sotld .msgs span{animation:none}.sotld .sl{opacity:1}.sotld .msgs span:first-child{opacity:1}}@media (prefers-color-scheme: dark){.sotld{color:#E3D0B8}}</style><svg viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="56" fill="#d9a35b" stroke="#3E2416" stroke-width="4"/><circle cx="60" cy="60" r="47" fill="#c0392b"/><circle cx="60" cy="60" r="44" fill="#f5c04e"/><line x1="60" y1="60" x2="60.0" y2="14.0" stroke="#e0a23a" stroke-width="1.6"/><line x1="60" y1="60" x2="99.8" y2="37.0" stroke="#e0a23a" stroke-width="1.6"/><line x1="60" y1="60" x2="99.8" y2="83.0" stroke="#e0a23a" stroke-width="1.6"/><line x1="60" y1="60" x2="60.0" y2="106.0" stroke="#e0a23a" stroke-width="1.6"/><line x1="60" y1="60" x2="20.2" y2="83.0" stroke="#e0a23a" stroke-width="1.6"/><line x1="60" y1="60" x2="20.2" y2="37.0" stroke="#e0a23a" stroke-width="1.6"/><g class="sl s0"><circle cx="69.5" cy="43.5" r="5.5" fill="#b8321f" stroke="#7a1d10" stroke-width="1.2"/><circle cx="76.5" cy="31.4" r="6.5" fill="#b8321f" stroke="#7a1d10" stroke-width="1.2"/></g><g class="sl s1"><circle cx="79.0" cy="60.0" r="5.5" fill="#b8321f" stroke="#7a1d10" stroke-width="1.2"/><circle cx="93.0" cy="60.0" r="6.5" fill="#b8321f" stroke="#7a1d10" stroke-width="1.2"/></g><g class="sl s2"><circle cx="69.5" cy="76.5" r="5.5" fill="#b8321f" stroke="#7a1d10" stroke-width="1.2"/><circle cx="76.5" cy="88.6" r="6.5" fill="#b8321f" stroke="#7a1d10" stroke-width="1.2"/></g><g class="sl s3"><circle cx="50.5" cy="76.5" r="5.5" fill="#b8321f" stroke="#7a1d10" stroke-width="1.2"/><circle cx="43.5" cy="88.6" r="6.5" fill="#b8321f" stroke="#7a1d10" stroke-width="1.2"/></g><g class="sl s4"><circle cx="41.0" cy="60.0" r="5.5" fill="#b8321f" stroke="#7a1d10" stroke-width="1.2"/><circle cx="27.0" cy="60.0" r="6.5" fill="#b8321f" stroke="#7a1d10" stroke-width="1.2"/></g><g class="sl s5"><circle cx="50.5" cy="43.5" r="5.5" fill="#b8321f" stroke="#7a1d10" stroke-width="1.2"/><circle cx="43.5" cy="31.4" r="6.5" fill="#b8321f" stroke="#7a1d10" stroke-width="1.2"/></g><g class="hand"><line x1="60" y1="60" x2="60" y2="10" stroke="#3E2416" stroke-width="3.5" stroke-linecap="round"/><circle cx="60" cy="10" r="7" fill="#fffaf0" stroke="#3E2416" stroke-width="3"/><circle cx="60" cy="10" r="2" fill="#3E2416"/></g><circle cx="60" cy="60" r="5" fill="#3E2416"/></svg><div class="msgs"><span>Warming up the oven...</span><span>Gerald is tossing the dough...</span><span>Sprinkling the cheese...</span><span>Potato is fueling up the scooter...</span></div><small>Slice of Thanks</small></div></div>
