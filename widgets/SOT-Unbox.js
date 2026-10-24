<script>
(function () {
  var root = document.getElementById('sot-unbox');
  if (!root) { return; }
  var api = root.getAttribute('data-api');
  function load(src, done) {
    var s = document.createElement('script');
    s.src = src;
    if (done) { s.onload = done; }
    document.body.appendChild(s);
  }
  fetch(api + '/bootstrap').then(function (r) { return r.json(); }).then(function (b) {
    var base = 'https://cdn.jsdelivr.net/gh/SliceOfThanks/slice-of-thanks@' + b.commit;
    root.setAttribute('data-base', base);
    var css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = base + '/unbox/unbox.css';
    document.head.appendChild(css);
    load(base + '/shared/pizza-core.js', function () { load(base + '/unbox/unbox.js'); });
  });
})();
</script>
