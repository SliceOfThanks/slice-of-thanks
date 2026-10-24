<?php
/*
  SOT-Auth (helper widget). Never place this widget on a page.
  Other Slice of Thanks widgets load it to prove who the logged-in member is.
  It signs a one-hour pass with the member ID and plan, using the shared secret
  that is also saved in Supabase as BD_SHARED_SECRET.
  Also reports whether the member ticked the required legal box on the BD sign up form
  (form field with the system name sot_legal_agree), so Supabase can record it.
  Version 1.1.0
*/
if (!defined('SOT_BD_SECRET')) {
  define('SOT_BD_SECRET', 'PASTE_YOUR_BD_SHARED_SECRET_HERE');
}

if (!function_exists('sot_b64url')) {
  function sot_b64url($s) {
    return rtrim(strtr(base64_encode($s), '+/', '-_'), '=');
  }
}

if (!function_exists('sot_db_name')) {
  function sot_db_name($w) {
    if (is_array($w) && isset($w['database']) && $w['database'] != '') { return $w['database']; }
    if (isset($GLOBALS['w']) && is_array($GLOBALS['w']) && isset($GLOBALS['w']['database'])) { return $GLOBALS['w']['database']; }
    return '';
  }
}

if (!function_exists('sot_auth_token')) {
  function sot_auth_token($w) {
    if (strlen(SOT_BD_SECRET) < 32 || strpos(SOT_BD_SECRET, 'PASTE_') === 0) { return ''; }
    if (!class_exists('user') || !isset($_COOKIE['userid'])) { return ''; }
    if (!user::isUserLogged($_COOKIE)) { return ''; }
    $uid = (int) $_COOKIE['userid'];
    if ($uid <= 0) { return ''; }
    $sub = '';
    $name = '';
    $lg = 0;
    $jn = '';
    $dbn = sot_db_name($w);
    if ($dbn != '' && function_exists('mysql') && function_exists('mysql_fetch_assoc')) {
      $res = mysql($dbn, 'SELECT * FROM users_data WHERE user_id=' . $uid . ' LIMIT 1');
      if ($res) {
        $row = mysql_fetch_assoc($res);
        if ($row) {
          $sub = (string) (int) $row['subscription_id'];
          $name = trim($row['first_name'] . ' ' . $row['last_name']);
          if (isset($row['sot_legal_agree']) && trim((string) $row['sot_legal_agree']) != '') { $lg = 1; }
          if (isset($row['signup_date']) && $row['signup_date'] != '') {
            $t = strtotime($row['signup_date']);
            if ($t) { $jn = date('c', $t); }
          }
        }
      }
      if ($lg == 0) {
        $mres = mysql($dbn, 'SELECT `value` FROM users_meta WHERE `database`=' . "'users_data'" . ' AND database_id=' . $uid . ' AND `key`=' . "'sot_legal_agree'" . ' LIMIT 1');
        if ($mres) {
          $mrow = mysql_fetch_assoc($mres);
          if ($mrow && trim((string) $mrow['value']) != '') { $lg = 1; }
        }
      }
    }
    $payload = json_encode(array('uid' => $uid, 'sub' => $sub, 'name' => $name, 'lg' => $lg, 'jn' => $jn, 'exp' => time() + 3600), JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    $body = sot_b64url($payload);
    return $body . '.' . hash_hmac('sha256', $body, SOT_BD_SECRET);
  }
}
?>
