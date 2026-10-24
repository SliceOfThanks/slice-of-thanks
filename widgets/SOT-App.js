<script>
(function () {
  var root = document.getElementById('sot-app');
  if (!root) { return; }
  var api = root.getAttribute('data-api');
  var tok = root.getAttribute('data-token') || '';
  fetch(api + '/bootstrap', { headers: { 'x-sot-auth': tok } }).then(function (r) { return r.json(); }).then(function (b) {
    var base = 'https://cdn.jsdelivr.net/gh/SliceOfThanks/slice-of-thanks@' + b.commit;
    root.setAttribute('data-base', base);
    root.innerHTML = '';
    var s = document.createElement('script');
    s.src = base + '/app/app.js';
    document.body.appendChild(s);
  });
})();
</script>
