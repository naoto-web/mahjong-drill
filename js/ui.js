// ui.js — 共通の小物（要素づくり・数字の読み書き・トースト）
var UI = (function () {
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  }
  function fmt(n) { return Number(n).toLocaleString(); }
  // ポイント表記：+12.5 / △20.3（競技規定 第38条と本番の問題用紙に合わせて△。入力は▲も−も受け付ける）
  function pt(x) {
    var v = Math.round(x * 10) / 10;
    if (Math.abs(v) < 1e-9) return '0.0';
    return (v > 0 ? '+' : '△') + Math.abs(v).toFixed(1);
  }
  // 入力の読み取り：カンマ・全角・▲△−- を受け付ける
  function num(s) {
    if (s == null) return NaN;
    s = String(s).trim().replace(/[０-９．]/g, function (c) { return String.fromCharCode(c.charCodeAt(0) - 0xFEE0); })
      .replace(/[,，\s]/g, '').replace(/^[▲△−ー\-]/, '-').replace(/^＋/, '+');
    if (s === '' || s === '-' || s === '+') return NaN;
    return Number(s);
  }
  function same(a, b) { return !isNaN(a) && Math.abs(a - b) < 1e-6; }

  var toastTimer = null;
  function toast(msg) {
    var t = document.getElementById('toast');
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.hidden = true; }, 2200);
  }
  function seed() { return (Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0; }
  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  // 数字の入力欄（スマホで数字キーボード）。sign=true なら＋/△ の切り替えボタン付き
  function input(id, opts) {
    opts = opts || {};
    var html = '<span class="in-wrap' + (opts.sign ? ' has-sign' : '') + '">';
    if (opts.sign) html += '<button type="button" class="sign" data-for="' + id + '">＋</button>';
    html += '<input id="' + id + '" class="num" inputmode="' + (opts.sign ? 'decimal' : 'numeric') + '" autocomplete="off" placeholder="' + esc(opts.ph || '') + '">';
    html += '</span>';
    return html;
  }
  // 符号ボタン付きの欄の値（＋/△ ボタンの状態を足す）
  function readSigned(id) {
    var el = document.getElementById(id);
    var v = num(el.value);
    if (isNaN(v)) return NaN;
    var b = document.querySelector('.sign[data-for="' + id + '"]');
    if (b && b.textContent === '△' && v > 0) v = -v;
    return v;
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest('.sign');
    if (!b) return;
    b.textContent = b.textContent === '＋' ? '△' : '＋';
    b.classList.toggle('neg', b.textContent === '△');
  });
  function examDays() {
    var d = new Date(), t = new Date(2027, 0, 30);
    d.setHours(0, 0, 0, 0);
    return Math.round((t - d) / 86400000);
  }
  return { esc: esc, fmt: fmt, pt: pt, num: num, same: same, toast: toast, seed: seed, shuffle: shuffle, input: input, readSigned: readSigned, examDays: examDays };
})();
