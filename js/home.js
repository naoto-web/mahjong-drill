// home.js — 🏠ホーム：試験までの日数・紙で解く（印刷）・スマホで解く部門の今日の数と正答率・苦手
// 条件計算・スコアシートは11/27から紙だけ（勉強の枠で印刷→自己採点→写真をクロコへ）＝ここでは数えない
var Home = (function () {
  var SECS = [
    { key: 'tensu', tab: 'tensu', icon: '🀄', name: '符と点数', sub: '麻雀問題① 問題2・3', unit: '題' },
    { key: 'table', tab: 'tensu', icon: '🔢', name: '点数表', sub: '70・90・110符と親', unit: '問' },
    { key: 'kitei', tab: 'kitei', icon: '📜', name: '規定・用語・漢字', sub: '麻雀問題② 問題1〜4', unit: '枚' }
  ];
  function rate(a) { return a[0] ? Math.round(a[1] / a[0] * 100) + '%' : '—'; }
  function weakList() {
    var out = [];
    var t = Store.weak('tensu');
    Object.keys(t).forEach(function (k) { if (t[k][0] >= 3 && t[k][1] / t[k][0] < 0.7) out.push('符と点数：' + TensuCore.CAT_NAME[k] + '（' + rate(t[k]) + '）'); });
    var w = Kitei.weakCount();
    if (w) out.push('規定カード：苦手 ' + w + '枚');
    return out;
  }
  function render() {
    var d = UI.examDays();
    var h = '<div class="countdown">試験（1/30 土）まで <b>' + (d > 0 ? d : 0) + '</b> 日</div>';
    h += '<h3>🖨 紙で解く（問題＋答えのページを印刷）</h3>' +
      '<div class="print-btns main"><button data-print="jouken">🧮 条件計算 3セット<small>麻雀問題③ 問題3・4（20点）</small></button>' +
      '<button data-print="sheet">📋 スコアシート 3題<small>麻雀問題② 問題5（6点）</small></button></div>' +
      '<div class="print-btns"><button data-print="tensu">符と点数 10題</button><button data-print="kitei-ana">規定の穴埋め</button>' +
      '<button data-print="kitei-kanji">漢字</button><button data-print="kitei-yougo">用語・仕組み</button></div>' +
      '<p class="small">毎回ちがう問題が出ます。答えのページで自己採点 → 写真をクロコへ。プリンターがないときは印刷画面で「PDFに保存」。</p>';
    h += '<h3>📱 スマホで解く</h3><div class="list">';
    SECS.forEach(function (s) {
      var td = Store.day(s.key), all = Store.total(s.key);
      h += '<button class="sec" data-go="' + s.tab + '"><span class="ic">' + s.icon + '</span><span class="tx"><b>' + s.name + '</b><small>' + s.sub + '</small></span>' +
        '<span class="nums"><b>今日 ' + td[0] + s.unit + '</b><small>正答 ' + rate(td) + '・通算 ' + rate(all) + '</small></span></button>';
    });
    h += '</div>';
    var wl = weakList();
    h += '<h3>苦手（正答70%未満）</h3>' + (wl.length ? '<ul class="weak-list">' + wl.map(function (x) { return '<li>' + UI.esc(x) + '</li>'; }).join('') + '</ul>' : '<p class="small">まだありません（3問以上解くと出ます）</p>');
    h += '<p class="foot">成績はこのスマホの中だけに保存。<button id="resetBtn" class="link">成績を消す</button></p>';
    document.getElementById('homeBody').innerHTML = h;
  }
  document.addEventListener('click', function (e) {
    if (!e.target.closest('#homeBody')) return;
    var g = e.target.closest('[data-go]');
    if (g) { Main.show(g.dataset.go); return; }
    var p = e.target.closest('[data-print]');
    if (p) {
      var k = p.dataset.print;
      if (k === 'jouken') Print.jouken(); else if (k === 'tensu') Print.tensu(10); else if (k === 'sheet') Print.sheet();
      else Print.kitei(k.split('-')[1]);
      return;
    }
    if (e.target.id === 'resetBtn' && confirm('成績と苦手の記録を全部消します。よいですか？')) { Store.reset(); render(); }
  });
  return { render: render };
})();
