// tensu.js — 🀄点数タブ：符と点数（手牌から）／点数表（◯符◯翻→点数）
var Tensu = (function () {
  var T = TensuCore;
  var cur = 'hand', cat = '', q = null, done = false;
  var CHIPS = [['', 'おまかせ'], ['kan', '槓'], ['nakitsumo', '鳴きツモ'], ['chiitoi', '七対子'], ['oya', '親'], ['high', '70符以上']];

  function seatLine(x) { return '東場・' + T.SEATS[x.seat]; }
  // 点数の入力欄（ロン／子のツモ＝子/親／親のツモ＝オール）
  function payInputs(x, pre) {
    if (!x.tsumo) return UI.input(pre + 'r', { ph: '点' }) + '<span class="unit">点</span>';
    if (x.seat === 0 || x.oya) return UI.input(pre + 'a', { ph: '点' }) + '<span class="unit">オール</span>';
    return UI.input(pre + 'k', { ph: '子' }) + '<span class="slash">/</span>' + UI.input(pre + 'o', { ph: '親' });
  }
  function payOk(p, pre) {
    function v(id) { return UI.num(document.getElementById(pre + id).value); }
    if (p.ron) return UI.same(v('r'), p.ron);
    if (p.all) return UI.same(v('a'), p.all);
    return UI.same(v('k'), p.ko) && UI.same(v('o'), p.oya);
  }
  // 点数の出し方（第44条）
  function payExplain(fu, han, oya, tsumo, p) {
    var h = '';
    if (p.name) h += '<p><b>' + p.name + '</b>：基本点 ' + UI.fmt(p.basic) + '</p>';
    else h += '<p>基本点＝' + fu + '符 × 2の(' + han + '翻＋場ゾロ2)乗 ＝ ' + fu + ' × ' + Math.pow(2, han + 2) + ' ＝ <b>' + UI.fmt(p.basic) + '</b></p>';
    if (!tsumo) h += '<p>ロン＝基本点 × ' + (oya ? '6（子3人ぶん×2）' : '4（子2人＋親×2）') + ' ＝ ' + UI.fmt(p.basic * (oya ? 6 : 4)) + ' → 100点未満切り上げ <b>' + UI.fmt(p.ron) + '</b></p>';
    else if (oya) h += '<p>親のツモ＝子3人が基本点×2ずつ ＝ ' + UI.fmt(p.basic * 2) + ' → 切り上げ <b>' + UI.fmt(p.all) + 'オール</b></p>';
    else h += '<p>子のツモ＝子は基本点 ' + UI.fmt(p.basic) + '→<b>' + UI.fmt(p.ko) + '</b>、親は×2 ' + UI.fmt(p.basic * 2) + '→<b>' + UI.fmt(p.oya) + '</b>（么二の法則）</p>';
    return h;
  }
  function fuExplain(x) {
    var h = '<table class="fu-table">';
    x.items.forEach(function (it) { h += '<tr><td>' + UI.esc(it[0]) + '</td><td class="r">' + it[1] + '</td></tr>'; });
    h += '<tr class="sum"><td>合計（連底）</td><td class="r">' + x.raw + '</td></tr></table>';
    if (x.cat !== 'chiitoi') h += '<p>' + (x.raw === x.fu ? x.raw + '符' : x.raw + ' → 1の位を切り上げて <b>' + x.fu + '符</b>') + '</p>';
    if (x.note) h += '<p class="hint">' + UI.esc(x.note) + '</p>';
    if (x.wait && x.cat !== 'chiitoi') h += '<p class="small">待ちは「' + x.wait + '」で取ると一番高い（高点法）。</p>';
    return h;
  }
  function handHtml(x) {
    return '<div class="hand">' + UI.esc(x.hand) + (x.melds ? ' <span class="melds">' + UI.esc(x.melds) + '</span>' : '') + '</div>' +
      '<div class="win">' + UI.esc(x.win) + '</div>';
  }

  function seg() {
    return '<div class="seg"><button data-t="hand"' + (cur === 'hand' ? ' class="on"' : '') + '>符と点数</button><button data-t="table"' + (cur === 'table' ? ' class="on"' : '') + '>点数表</button></div>';
  }
  function render() {
    var root = document.getElementById('tensuBody');
    done = false;
    if (cur === 'table') { renderTable(root); return; }
    if (!q) q = T.make(UI.seed(), cat || undefined);
    var h = seg() + '<div class="chips">' + CHIPS.map(function (c) { return '<button data-c="' + c[0] + '"' + (c[0] === cat ? ' class="on"' : '') + '>' + c[1] + '</button>'; }).join('') + '</div>';
    h += '<div class="card"><div class="meta">' + seatLine(q) + '</div>' + handHtml(q) +
      '<div class="han">翻数：<b>' + q.han + '翻</b><span class="small">（役・ドラこみ。役は考えなくてよい）</span></div>';
    h += '<div class="qa-row"><label>符</label>' + UI.input('tf', { ph: '符' }) + '<span class="unit">符</span></div>';
    h += '<div class="qa-row"><label>点数</label>' + payInputs(q, 'tp') + '</div>';
    h += '<div id="tRes" class="res" hidden></div><div class="btns"><button id="tCheck" class="primary">答え合わせ</button><button id="tNext">次の問題</button></div></div>';
    root.innerHTML = h;
  }
  function check() {
    if (done) return;
    done = true;
    var okF = UI.same(UI.num(document.getElementById('tf').value), q.fu);
    var okP = payOk(q.pay, 'tp');
    Store.record('tensu', okF && okP, q.cat);
    var r = document.getElementById('tRes');
    r.hidden = false;
    r.innerHTML = '<div class="verdict">' + (okF ? '○' : '×') + ' 符：<b>' + q.fu + '符</b>　' + (okP ? '○' : '×') + ' 点数：<b>' + T.payText(q.pay) + '</b><span class="tag">' + T.CAT_NAME[q.cat] + '</span></div>' +
      '<div class="exp">' + fuExplain(q) + payExplain(q.fu, q.han, q.seat === 0, q.tsumo, q.pay) + '</div>';
    document.getElementById('tCheck').disabled = true;
  }

  // 点数表
  var tq = null;
  function tableLabel(x) { return (x.oya ? '親' : '子') + '　' + x.fu + '符 ' + x.han + '翻　' + (x.tsumo ? 'ツモ' : 'ロン'); }
  function renderTable(root) {
    if (!tq) tq = T.makeTable(UI.seed());
    root.innerHTML = seg() + '<div class="card"><div class="big-q">' + tableLabel(tq) + '</div>' +
      '<div class="qa-row center">' + payInputs({ tsumo: tq.tsumo, seat: tq.oya ? 0 : 1, oya: tq.oya }, 'bp') + '</div>' +
      '<div id="bRes" class="res" hidden></div><div class="btns"><button id="bCheck" class="primary">答え合わせ</button><button id="bNext">次の問題</button></div>' +
      '<p class="small">覚えどころ：70符は3つだけ（子ロン2翻4,500・親ロン1翻3,400・子ツモ1翻600/1,200）／90符＝40＋50符／110符＝50＋60符</p></div>';
    var first = root.querySelector('input');
    if (first) first.focus();
  }
  function checkTable() {
    if (done) return;
    done = true;
    var ok = payOk(tq.pay, 'bp');
    Store.record('table', ok, tq.fu + '符');
    var r = document.getElementById('bRes');
    r.hidden = false;
    r.innerHTML = '<div class="verdict">' + (ok ? '○' : '×') + ' 正解：<b>' + T.payText(tq.pay) + '</b></div><div class="exp">' + payExplain(tq.fu, tq.han, tq.oya, tq.tsumo, tq.pay) + '</div>';
    document.getElementById('bCheck').disabled = true;
  }

  document.addEventListener('click', function (e) {
    if (!e.target.closest('#tensuBody')) return;
    var s = e.target.closest('.seg button');
    if (s) { cur = s.dataset.t; q = null; tq = null; render(); return; }
    var c = e.target.closest('.chips button');
    if (c) { cat = c.dataset.c; q = null; render(); return; }
    if (e.target.id === 'tCheck') check();
    if (e.target.id === 'tNext') { q = null; render(); }
    if (e.target.id === 'bCheck') checkTable();
    if (e.target.id === 'bNext') { tq = null; render(); }
  });
  // 点数表はEnterで答え合わせ→もう一度Enterで次へ（すきま時間に連打できるように）
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter' || !e.target.closest || !e.target.closest('#tensuBody')) return;
    if (cur === 'table') { if (done) { tq = null; render(); } else checkTable(); }
  });

  return { render: render, handHtml: handHtml, fuExplain: fuExplain, payExplain: payExplain, seatLine: seatLine, tableLabel: tableLabel };
})();
