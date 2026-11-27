// kitei.js — 📜規定タブ：カード（表＝問題、裏＝答え）を○×で自己採点／規定を読む（kitei_read.js）
// ×のカードは同じ回の3枚あとにもう一度出る＋「苦手だけ」に入る（次に○を付けるまで）
var Kitei = (function () {
  var mode = 'cards', cat = '', weakOnly = false, onlyIds = null, onlyLabel = '';
  var deck = [], pos = 0, flipped = false, stat = [0, 0];

  function pool() {
    return KITEI.filter(function (c) {
      if (onlyIds) return onlyIds.indexOf(c.id) >= 0;
      return (!cat || c.cat === cat) && (!weakOnly || Store.isWeakCard(c.id));
    });
  }
  function start() {
    // まだ解いていない・苦手を先に、あとはまぜる
    var p = UI.shuffle(pool().slice());
    p.sort(function (a, b) { return rank(a) - rank(b); });
    deck = p; pos = 0; flipped = false; stat = [0, 0];
  }
  function rank(c) { var i = Store.cardInfo(c.id); if (!i) return 0; return i.last === 'ng' ? 0 : 1; }
  function weakCount() { return KITEI.filter(function (c) { return Store.isWeakCard(c.id); }).length; }

  function head() {
    return '<div class="seg"><button data-mode="cards"' + (mode === 'cards' ? ' class="on"' : '') + '>カード</button>' +
      '<button data-mode="read"' + (mode === 'read' ? ' class="on"' : '') + '>規定を読む</button></div>';
  }
  function render() {
    var root = document.getElementById('kiteiBody');
    if (mode === 'read') { KiteiRead.render(root, head()); return; }
    var h = head();
    if (onlyIds) {
      h += '<div class="chips"><button class="on">' + UI.esc(onlyLabel) + ' のカード</button><button data-clear="1">× 絞り込みをやめる</button></div>';
    } else {
      h += '<div class="chips">' + KITEI_CATS.map(function (c) {
        var n = KITEI.filter(function (k) { return !c[0] || k.cat === c[0]; }).length;
        return '<button data-k="' + c[0] + '"' + (c[0] === cat ? ' class="on"' : '') + '>' + c[1] + ' <small>' + n + '</small></button>';
      }).join('') + '<button data-weak="1"' + (weakOnly ? ' class="on weak"' : ' class="weak"') + '>苦手だけ <small>' + weakCount() + '</small></button></div>';
    }
    if (!deck.length || pos >= deck.length) {
      if (!deck.length && !pool().length) h += '<div class="card empty">' + (weakOnly ? '苦手のカードはありません 🎉' : 'カードがありません') + '</div>';
      else h += '<div class="card empty"><p>この回はおしまい：○ ' + stat[1] + ' ／ × ' + (stat[0] - stat[1]) + '</p><div class="btns"><button id="kAgain" class="primary">もう一周</button></div></div>';
      root.innerHTML = h;
      return;
    }
    var c = deck[pos];
    var catName = KITEI_CATS.filter(function (x) { return x[0] === c.cat; })[0][1];
    h += '<div class="progress-line">' + (pos + 1) + ' / ' + deck.length + '<span class="tag">' + catName + '</span></div>';
    h += '<div class="card flash' + (flipped ? ' flipped' : '') + '"><div class="fq">' + UI.esc(c.q).replace(/\n/g, '<br>') + '</div>';
    if (c.cat === 'kanji' && !flipped) h += '<p class="small">紙に書いてから答えを見る</p>';
    if (flipped) {
      h += '<div class="fa">' + UI.esc(c.a) + '</div>' + (c.note ? '<p class="hint">' + UI.esc(c.note) + '</p>' : '');
      var no = KiteiRead.articleOfCard(c);
      if (no != null) h += '<button class="to-rule" data-no="' + no + '">📖 規定で見る（' + (no === 99 ? '付則' : '第' + no + '条') + '）</button>';
      h += '<div class="btns judge"><button id="kNg" class="ng">× まちがえた</button><button id="kOk" class="ok">○ 書けた</button></div>';
    } else {
      h += '<div class="btns"><button id="kFlip" class="primary">答えを見る</button></div>';
    }
    root.innerHTML = h + '</div>';
  }
  function judge(ok) {
    var c = deck[pos];
    Store.card(c.id, ok);
    stat[0]++; if (ok) stat[1]++;
    if (!ok) deck.splice(Math.min(pos + 4, deck.length), 0, c); // 3枚あとにもう一度
    pos++; flipped = false;
    render();
  }
  // 「規定を読む」の条から、その条のカードだけで練習
  function practiceArticle(no) {
    onlyIds = KiteiRead.cardsOf(no);
    onlyLabel = no === 99 ? '付則' : '第' + no + '条';
    mode = 'cards'; start(); render(); window.scrollTo(0, 0);
  }
  document.addEventListener('click', function (e) {
    if (!e.target.closest('#kiteiBody')) return;
    var m = e.target.closest('[data-mode]');
    if (m) { mode = m.dataset.mode; render(); window.scrollTo(0, 0); return; }
    if (e.target.closest('[data-clear]')) { onlyIds = null; start(); render(); return; }
    var k = e.target.closest('.chips button[data-k], .chips button[data-weak]');
    if (k) {
      if (k.dataset.weak) weakOnly = !weakOnly; else cat = k.dataset.k;
      start(); render(); return;
    }
    var tr = e.target.closest('.to-rule');
    if (tr) {
      if (!KiteiRead.has()) { mode = 'read'; render(); UI.toast('先に規定のファイルを取り込んでください'); return; }
      KiteiRead.jump(+tr.dataset.no); mode = 'read'; render(); return;
    }
    if (e.target.id === 'kFlip') { flipped = true; render(); }
    if (e.target.id === 'kOk') judge(true);
    if (e.target.id === 'kNg') judge(false);
    if (e.target.id === 'kAgain') { start(); render(); }
  });
  return { render: function () { if (!deck.length && mode === 'cards') start(); render(); }, weakCount: weakCount, start: start, practiceArticle: practiceArticle };
})();
