// print.js — 紙で解く用：問題ページ＋答えページ（改ページ）を作って印刷
// スマホでもPCでも window.print()（スマホは「PDFに保存」→印刷でもよい）
var Print = (function () {
  var J = JoukenCore, T = TensuCore;
  function today() { var d = new Date(); return (d.getMonth() + 1) + '/' + d.getDate(); }
  function strip(html) { var d = document.createElement('div'); d.innerHTML = html; return d.textContent; }

  function go(title, qHtml, aHtml) {
    var area = document.getElementById('printArea');
    area.innerHTML = '<section class="p-page"><h1>' + title + '<span>' + today() + '　麻雀ドリル</span></h1>' + qHtml + '</section>' +
      '<section class="p-page p-ans"><h1>' + title + '（答え）<span>解き終わるまで見ない</span></h1>' + aHtml + '</section>';
    document.body.classList.add('printing');
    setTimeout(function () { window.print(); }, 150);
  }
  window.addEventListener('afterprint', function () { document.body.classList.remove('printing'); });

  // 条件計算：本番の麻雀問題③と同じく 優勝1セット＋2人勝ち上がり2セット
  function jouken() {
    var sets = [J.make(3, UI.seed()), J.make(4, UI.seed() + 1), J.make(4, UI.seed() + 2)];
    var names = ['問題3（優勝）', '問題4-1（2人勝ち上がり）', '問題4-2（2人勝ち上がり）'];
    var q = '<p class="p-lead">日本プロ麻雀協会公式ルール。リーチ棒は出ない。アガリ点数は50符以下のみを考える。(1)が誤答の場合、(2)〜(5)は採点しない。目安：1セット5分。</p>';
    var a = '';
    sets.forEach(function (p, i) {
      q += '<div class="p-set"><h2>' + names[i] + '</h2><p>' + Jouken.MODES[p.mode === 3 ? 'u' : 't'].lead + '</p>' + Jouken.scoreTable(p) + '<ol>';
      a += '<div class="p-set"><h2>' + names[i] + '</h2><ol>';
      Jouken.questions(p).forEach(function (it) {
        q += '<li>' + it.text + '<span class="p-blank"></span></li>';
        var hint = '';
        if (it.key === 'tsumo' && p.ans.tsumo.idx > 0) { var tl = J.TSUMO[p.ans.tsumo.idx - 1]; hint = '1つ下の' + UI.fmt(tl[0]) + '/' + UI.fmt(tl[1]) + 'だと' + Jouken.blockers(p, J.afterTsumo(p.pts, p.w, tl[0], tl[1])); }
        else if (it.key.indexOf('ron') === 0) {
          var r = p.ans.ron[it.p];
          if (r.idx > 0) hint = '1つ下の' + UI.fmt(J.RON[r.idx - 1]) + 'だと' + Jouken.blockers(p, J.afterRon(p.pts, p.w, it.p, J.RON[r.idx - 1]));
        } else if (it.key === 'q1') {
          var s = J.snapshot(p.pts, p.prev, p.mode);
          hint = 'トータル：' + s.order.map(function (k) { return J.N[k] + ' ' + UI.pt(s.v[k]); }).join('／');
        }
        a += '<li><b>' + Jouken.answerText(p, it.key) + '</b>' + (hint ? '<span class="p-hint">' + hint + '</span>' : '') + '</li>';
      });
      q += '</ol></div>';
      a += '</ol></div>';
    });
    go('条件計算（本番形式・3セット）', q, a);
  }

  function tensu(n) {
    n = n || 10;
    var q = '<p class="p-lead">東場。翻数は問題の数字で計算する（役・ドラこみ）。符と点数を答える。</p><ol class="p-tensu">', a = '<ol class="p-tensu">';
    for (var i = 0; i < n; i++) {
      var x = T.make(UI.seed() + i * 7919);
      if (!x) continue;
      q += '<li><div>' + Tensu.seatLine(x) + '　<b>' + x.han + '翻</b></div><div class="p-hand">' + UI.esc(x.hand) + ' ' + UI.esc(x.melds) + '　' + UI.esc(x.win) + '</div><div class="p-fill">符：＿＿＿＿　点数：＿＿＿＿＿＿＿＿</div></li>';
      a += '<li><b>' + x.fu + '符　' + T.payText(x.pay) + '</b><span class="p-hint">' +
        x.items.map(function (it) { return it[0].replace(/（.*?）/g, '') + ' ' + it[1]; }).join('＋') + (x.cat === 'chiitoi' ? '' : '＝' + x.raw + '→' + x.fu + '符') + (x.note ? '／' + x.note : '') + '</span></li>';
    }
    go('符と点数（' + n + '題）', q + '</ol>', a + '</ol>');
  }

  function sheet() {
    var q = '<p class="p-lead">空欄の得失点(1)と、4人のポイント(2)〜(5)を答える。</p>', a = '';
    for (var i = 0; i < 3; i++) {
      var s = J.makeSheet(UI.seed() + i * 104729);
      q += '<div class="p-set"><h2>スコアシート ' + (i + 1) + '</h2>' + Sheet.table(s, false) + '</div>';
      a += '<div class="p-set"><h2>スコアシート ' + (i + 1) + '</h2>' + Sheet.explain(s) + '</div>';
    }
    go('スコアシート（3題）', q, a);
  }

  function kitei(cat) {
    var cards = KITEI.filter(function (c) { return !cat || c.cat === cat; });
    var name = KITEI_CATS.filter(function (x) { return x[0] === (cat || ''); })[0][1];
    var q = '<ol class="p-kitei">', a = '<ol class="p-kitei">';
    cards.forEach(function (c) {
      q += '<li>' + UI.esc(c.q).replace(/\n/g, '<br>') + '</li>';
      a += '<li><b>' + UI.esc(c.a) + '</b>' + (c.note ? '<span class="p-hint">' + UI.esc(c.note) + '</span>' : '') + '</li>';
    });
    go('競技規定・用語：' + name + '（' + cards.length + '問）', q + '</ol>', a + '</ol>');
  }
  return { jouken: jouken, tensu: tensu, sheet: sheet, kitei: kitei, strip: strip };
})();
