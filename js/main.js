// main.js — タブ切り替え・インストールボタン・ホーム画面アプリ化
var Main = (function () {
  // 条件計算タブは11/27に削除（紙で解いて写真をクロコへ＝印刷はホームから）
  var TITLES = { home: '麻雀ドリル', tensu: '🀄 点数計算', kitei: '📜 競技規定・用語' };
  var tab = 'home';
  function show(name) {
    tab = name;
    document.querySelectorAll('.tabs button').forEach(function (b) { b.classList.toggle('on', b.dataset.tab === name); });
    document.querySelectorAll('.view').forEach(function (v) { v.hidden = v.id !== 'view-' + name; });
    document.getElementById('pageTitle').textContent = TITLES[name];
    window.scrollTo(0, 0);
    if (name === 'home') Home.render();
    if (name === 'tensu') Tensu.render();
    if (name === 'kitei') Kitei.render();
  }
  document.querySelector('.tabs').addEventListener('click', function (e) {
    var b = e.target.closest('button[data-tab]');
    if (b) show(b.dataset.tab);
  });

  // アプリとしてインストール（まとめ通信と同じ対処）
  // 🪤Pixel の Chrome は「︙→ホーム画面に追加」で naoto-web.github.io の新しいアプリを「すでにインストールされています」と誤判定する
  //   ⇒ ページ側からインストール画面を直接呼ぶボタン（beforeinstallprompt）。合図が来たときだけ出す
  var installEvt = null;
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    installEvt = e;
    if (document.getElementById('installBtn')) return;
    var b = document.createElement('button');
    b.id = 'installBtn';
    b.className = 'install-btn';
    b.textContent = 'アプリとしてインストール';
    b.addEventListener('click', function () {
      if (!installEvt) return;
      installEvt.prompt();
      installEvt.userChoice.then(function (r) {
        if (r && r.outcome === 'accepted') { installEvt = null; b.textContent = 'インストール中…'; }
      }).catch(function () {});
    });
    document.querySelector('.top').appendChild(b);
  });
  window.addEventListener('appinstalled', function () {
    var b = document.getElementById('installBtn');
    if (b) b.remove();
  });
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () { navigator.serviceWorker.register('./sw.js').catch(function () {}); });
  }
  show('home');
  return { show: show };
})();
