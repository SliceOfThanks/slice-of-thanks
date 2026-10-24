<?php
/* SOT-App: the Slice of Thanks member app. Place this widget on the Kitchen page. Version 1.1.0
   The four checkout links are the BD Digital Product purchase links: Special Delivery, 100, 500 and 1,000 Email Packs. */
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
<div id="sot-app" data-api="https://cmnclubiarmthibqibuj.supabase.co/functions/v1/api" data-token="<?php echo $sot_tok_safe; ?>" data-signup-url="/join" data-login-url="/login" data-upgrade-url="/join" data-special-url="" data-pack100-url="" data-pack500-url="" data-pack1000-url=""><p style="text-align:center;padding:40px 16px;font-family:Georgia,serif;color:#3a1d12">Warming up the oven...</p></div>
