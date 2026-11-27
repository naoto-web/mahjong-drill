// tensu_core.js — 符と点数の計算・出題（画面なし。node の検算からも読む）
// 協会の競技規定 第42〜45条どおり。翻数は問題に書く（役の判定はしない＝符と点数表の練習）
var TensuCore = (function () {
  // 牌の番号：0-8 萬子／9-17 筒子／18-26 索子／27東 28南 29西 30北 31白 32發 33中
  var KAN = ['一', '二', '三', '四', '五', '六', '七', '八', '九'];
  var MARU = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨'];
  var JI = ['東', '南', '西', '北', '白', '發', '中'];
  var SEATS = ['東家（親）', '南家（子）', '西家（子）', '北家（子）'];

  function suit(t) { return t >= 27 ? 3 : Math.floor(t / 9); }
  function num(t) { return t % 9; }
  function yaochu(t) { return t >= 27 || num(t) === 0 || num(t) === 8; }
  function yakuhai(t, seat) { return t >= 31 || t === 27 || t === 27 + seat; }

  // ── 表示（採点PDFと同じ書き方：萬子＝漢数字＋萬／筒子＝丸数字／索子＝数字＋索） ──
  function tilesText(ts) {
    ts = ts.slice().sort(function (a, b) { return a - b; });
    var out = [], cur = -1, buf = '';
    function flush() {
      if (!buf) return;
      out.push(buf + (cur === 0 ? '萬' : cur === 2 ? '索' : ''));
      buf = '';
    }
    ts.forEach(function (t) {
      var s = suit(t);
      if (s !== cur) { flush(); cur = s; }
      buf += s === 0 ? KAN[num(t)] : s === 1 ? MARU[num(t)] : s === 2 ? String(num(t) + 1) : JI[t - 27];
    });
    flush();
    return out.join(' ');
  }
  function oneText(t) { return tilesText([t]); }
  function meldText(g) {
    if (g.k === 'shun') return '［' + tilesText([g.t, g.t + 1, g.t + 2]) + ' チー］';
    if (g.k === 'kou') return '［' + oneText(g.t) + ' ポン］';
    return '［' + oneText(g.t) + (g.open ? ' 明槓' : ' 暗槓') + '］';
  }

  // ── 面子の符 ──
  function groupFu(g, seat, ronOpen) {
    if (g.k === 'shun') return 0;
    var f = 2;
    if (yaochu(g.t)) f *= 2;
    if (!(g.open || ronOpen)) f *= 2;
    if (g.k === 'kan') f *= 4;
    return f;
  }
  function groupName(g, ronOpen) {
    var y = yaochu(g.t) ? (g.t >= 27 ? '字牌' : '老頭牌') : '中張牌';
    var o = g.open || ronOpen;
    if (g.k === 'kou') return oneText(g.t) + 'の' + (o ? '明刻' : '暗刻') + '（' + y + '）' + (ronOpen ? '※ロンで完成＝明刻扱い' : '');
    return oneText(g.t) + 'の' + (g.open ? '明槓' : '暗槓') + '（' + y + '）';
  }

  // ── 手の中（14枚のうち鳴いていない部分）を雀頭＋面子に分ける：全部の取り方 ──
  function decompose(cnt, need) {
    var res = [];
    for (var p = 0; p < 34; p++) {
      if (cnt[p] < 2) continue;
      cnt[p] -= 2;
      sets(cnt, need, [], function (gs) { res.push({ pair: p, sets: gs.slice() }); });
      cnt[p] += 2;
    }
    return res;
  }
  function sets(cnt, need, acc, cb) {
    if (acc.length === need) { cb(acc); return; }
    var i = 0;
    while (i < 34 && cnt[i] === 0) i++;
    if (i === 34) return;
    if (cnt[i] >= 3) { cnt[i] -= 3; acc.push({ k: 'kou', t: i, open: false }); sets(cnt, need, acc, cb); acc.pop(); cnt[i] += 3; }
    if (i < 27 && num(i) <= 6 && cnt[i + 1] && cnt[i + 2]) {
      cnt[i]--; cnt[i + 1]--; cnt[i + 2]--;
      acc.push({ k: 'shun', t: i, open: false }); sets(cnt, need, acc, cb); acc.pop();
      cnt[i]++; cnt[i + 1]++; cnt[i + 2]++;
    }
  }

  // ── 符を出す（取り方・アガリ牌の位置を全部試して一番高い符＝高点法） ──
  // hand = { closed:[牌…13枚から鳴き分を引いたもの], melds:[{k,t,open}], win:牌, tsumo:bool, seat:0-3 }
  function evaluate(hand) {
    var menzen = hand.melds.every(function (g) { return !g.open; });
    var cnt = new Array(34).fill(0);
    hand.closed.concat([hand.win]).forEach(function (t) { cnt[t]++; });
    var need = 4 - hand.melds.length;
    var best = null, pinfuShape = false;
    decompose(cnt, need).forEach(function (d) {
      var cands = [];
      if (d.pair === hand.win) cands.push({ type: 'pair' });
      d.sets.forEach(function (g, i) {
        if (g.k === 'kou' && g.t === hand.win) cands.push({ type: 'kou', i: i });
        if (g.k === 'shun' && hand.win >= g.t && hand.win <= g.t + 2) cands.push({ type: 'shun', i: i });
      });
      cands.forEach(function (c) {
        var items = [['副底', 20]];
        if (menzen && !hand.tsumo) items.push(['門前清栄和（門前でロン）', 10]);
        if (hand.tsumo) items.push(['ツモ符', 2]);
        var all = hand.melds.concat(d.sets);
        all.forEach(function (g, gi) {
          var ronOpen = !hand.tsumo && c.type === 'kou' && gi - hand.melds.length === c.i;
          var f = groupFu(g, hand.seat, ronOpen);
          if (f) items.push([groupName(g, ronOpen), f]);
        });
        if (yakuhai(d.pair, hand.seat)) items.push(['雀頭 ' + oneText(d.pair) + '（役牌）', 2]);
        var wait = '両面';
        if (c.type === 'pair') wait = '単騎';
        else if (c.type === 'kou') wait = 'シャンポン';
        else {
          var g = d.sets[c.i], pos = hand.win - g.t;
          if (pos === 1) wait = 'カンチャン';
          else if ((pos === 2 && num(g.t) === 0) || (pos === 0 && num(g.t) === 6)) wait = 'ペンチャン';
        }
        if (wait === '単騎' || wait === 'カンチャン' || wait === 'ペンチャン') items.push([wait + '待ち', 2]);
        var allShun = d.sets.every(function (g) { return g.k === 'shun'; }) && hand.melds.length === 0;
        if (menzen && allShun && wait === '両面' && !yakuhai(d.pair, hand.seat)) pinfuShape = true;
        var raw = items.reduce(function (s, x) { return s + x[1]; }, 0);
        var note = '';
        if (!menzen && raw === 20 && !hand.tsumo) { raw = 30; note = '鳴いた平和形のロンは副底に10符を足して30符（第42条ニ）'; }
        var fu = Math.ceil(raw / 10) * 10;
        var cand = { fu: fu, raw: raw, items: items, wait: wait, note: note };
        if (!best || fu > best.fu) best = cand;
      });
    });
    return best ? { best: best, pinfuShape: pinfuShape } : null;
  }

  // ── 点数（第44条・第45条＋協会の切り上げ満貫） ──
  function c100(x) { return Math.ceil(x / 100) * 100; }
  function basic(fu, han) {
    if (han >= 13) return { b: 8000, name: '役満' };
    if (han >= 11) return { b: 6000, name: '三倍満' };
    if (han >= 8) return { b: 4000, name: '倍満' };
    if (han >= 6) return { b: 3000, name: 'ハネ満' };
    var b = fu * Math.pow(2, han + 2);
    if (han >= 5 || b >= 2000) return { b: 2000, name: '満貫' };
    if (b >= 1920) return { b: 2000, name: '切り上げ満貫（7,700・11,600→満貫）' };
    return { b: b, name: '' };
  }
  function pay(fu, han, oya, tsumo) {
    var B = basic(fu, han), b = B.b;
    if (!tsumo) return { ron: c100(b * (oya ? 6 : 4)), basic: b, name: B.name };
    if (oya) return { all: c100(b * 2), basic: b, name: B.name };
    return { ko: c100(b), oya: c100(b * 2), basic: b, name: B.name };
  }
  function payText(p) {
    if (p.ron) return p.ron.toLocaleString();
    if (p.all) return p.all.toLocaleString() + 'オール';
    return p.ko.toLocaleString() + '/' + p.oya.toLocaleString();
  }

  // ── 乱数 ──
  function rnd(seed) {
    var s = (Math.imul(seed >>> 0, 2654435761) ^ 0x9e3779b9) >>> 0 || 1;
    for (var w = 0; w < 8; w++) { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; }
    return function () { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
  }
  function pick(R, arr) { return arr[Math.floor(R() * arr.length)]; }
  function wpick(R, table) { // [[値, 重み]…]
    var tot = table.reduce(function (s, x) { return s + x[1]; }, 0), r = R() * tot;
    for (var i = 0; i < table.length; i++) { r -= table[i][1]; if (r < 0) return table[i][0]; }
    return table[table.length - 1][0];
  }

  var CATS = [['kan', 3], ['nakitsumo', 3], ['chiitoi', 1.5], ['oya', 2], ['high', 2.5], ['mix', 2]];
  var CAT_NAME = { kan: '槓の符', nakitsumo: '鳴いた手のツモ', chiitoi: '七対子', oya: '親の点数', high: '70符以上', mix: 'いろいろ' };

  function chooseHan(R, fu, oya, tsumo, minHan) {
    var hs = [];
    for (var h = Math.max(1, minHan); h <= 4; h++) {
      var b = basic(fu, h).b;
      hs.push([h, b >= 2000 ? 0.25 : 1]);
    }
    return wpick(R, hs);
  }

  function makeChiitoi(R, cat) {
    for (var tries = 0; tries < 500; tries++) {
      var pairs = [];
      while (pairs.length < 7) { var t = Math.floor(R() * 34); if (pairs.indexOf(t) < 0) pairs.push(t); }
      var win = pairs[Math.floor(R() * 7)];
      var closed = [];
      pairs.forEach(function (p) { closed.push(p); if (p !== win) closed.push(p); });
      var cnt = new Array(34).fill(0);
      closed.concat([win]).forEach(function (x) { cnt[x]++; });
      if (decompose(cnt, 4).length) continue; // 普通の形にも取れる手（二盃口など）は出さない
      var seat = cat === 'oya' ? 0 : (R() < 0.35 ? 0 : 1 + Math.floor(R() * 3));
      var tsumo = R() < 0.6;
      var han = tsumo ? wpick(R, [[3, 3], [4, 1]]) : wpick(R, [[2, 3], [3, 1.5], [4, 1]]);
      var p = pay(25, han, seat === 0, tsumo);
      return {
        cat: 'chiitoi', seat: seat, tsumo: tsumo, han: han, fu: 25, pay: p,
        hand: tilesText(closed), melds: '', win: (tsumo ? 'ツモ' : 'ロン') + oneText(win),
        tiles: { closed: closed.slice().sort(function (a, b) { return a - b; }), melds: [], win: win },
        items: [['七対子は符を数えない', 25]], raw: 25, wait: '単騎',
        note: '七対子は25符の固定（ツモ・ロンとも）。切り上げもしない。' + (tsumo ? 'ツモは門前清自摸和がつくので3翻から。' : '')
      };
    }
    return null;
  }

  function make(seed, onlyCat) {
    var R = rnd(seed);
    var cat = onlyCat || wpick(R, CATS);
    if (cat === 'chiitoi') return makeChiitoi(R, cat);
    for (var tries = 0; tries < 4000; tries++) {
      var seat = cat === 'oya' ? 0 : (R() < 0.3 ? 0 : 1 + Math.floor(R() * 3));
      var tsumo = cat === 'nakitsumo' ? true : R() < 0.45;
      var cnt = new Array(34).fill(0);
      var groups = [], okBuild = true;
      var nKan = cat === 'kan' ? 1 + Math.floor(R() * 2) : (cat === 'high' ? Math.floor(R() * 3) : (R() < 0.2 ? 1 : 0));
      for (var gi = 0; gi < 4; gi++) {
        var k = gi < nKan ? 'kan' : wpick(R, [['shun', cat === 'high' ? 1 : 3], ['kou', cat === 'high' ? 3 : 1.5]]);
        var t, need;
        if (k === 'shun') { t = Math.floor(R() * 3) * 9 + Math.floor(R() * 7); need = [t, t + 1, t + 2]; }
        else {
          t = cat === 'high' && R() < 0.6 ? pick(R, [0, 8, 9, 17, 18, 26, 27, 28, 29, 30, 31, 32, 33]) : Math.floor(R() * 34);
          need = k === 'kan' ? [t, t, t, t] : [t, t, t];
        }
        need.forEach(function (x) { cnt[x]++; });
        if (need.some(function (x) { return cnt[x] > 4; })) { okBuild = false; break; }
        var open;
        if (k === 'kan') open = R() < 0.5;
        else if (cat === 'nakitsumo') open = gi === nKan ? true : R() < 0.35;
        else open = R() < (cat === 'high' ? 0.15 : 0.25);
        groups.push({ k: k, t: t, open: open });
      }
      if (!okBuild) continue;
      var pr = Math.floor(R() * 34);
      if (pr === 27 && seat === 0) continue; // 連風牌の雀頭は出さない
      cnt[pr] += 2;
      if (cnt[pr] > 4) continue;
      // 鳴き・槓は見える面子、それ以外は手の中
      var melds = groups.filter(function (g) { return g.open || g.k === 'kan'; });
      var inner = groups.filter(function (g) { return !(g.open || g.k === 'kan'); });
      if (melds.length === 4 && R() < 0.7) continue;
      var tiles = [];
      inner.forEach(function (g) { if (g.k === 'shun') tiles.push(g.t, g.t + 1, g.t + 2); else tiles.push(g.t, g.t, g.t); });
      tiles.push(pr, pr);
      // アガリ牌：手の中の面子か雀頭から1枚
      var cands = [];
      inner.forEach(function (g) { if (g.k === 'shun') cands.push(g.t, g.t + 1, g.t + 2); else cands.push(g.t); });
      cands.push(pr);
      var win = pick(R, cands);
      var closed = tiles.slice();
      closed.splice(closed.indexOf(win), 1);
      var hand = { closed: closed, melds: melds, win: win, tsumo: tsumo, seat: seat };
      var ev = evaluate(hand);
      if (!ev || ev.pinfuShape) continue;
      var b = ev.best;
      if (cat === 'kan' && !melds.some(function (g) { return g.k === 'kan'; })) continue;
      if (cat === 'nakitsumo' && !melds.some(function (g) { return g.open; })) continue;
      if (cat === 'high' && b.fu < 70) continue;
      if (cat !== 'high' && b.fu > 110) continue;
      if (b.fu > 110) continue;
      var han = chooseHan(R, b.fu, seat === 0, tsumo, 1);
      var p = pay(b.fu, han, seat === 0, tsumo);
      return {
        cat: cat, seat: seat, tsumo: tsumo, han: han, fu: b.fu, pay: p,
        hand: tilesText(closed), melds: melds.map(meldText).join(' '), win: (tsumo ? 'ツモ' : 'ロン') + oneText(win),
        // 絵で出す用（from＝鳴いた相手：0上家 1対面 2下家。チーは上家だけ）
        tiles: {
          closed: closed.slice().sort(function (a, b) { return a - b; }), win: win,
          melds: melds.map(function (g) { return { k: g.k, t: g.t, open: g.open, from: g.k === 'shun' ? 0 : Math.floor(R() * 3) }; })
        },
        items: b.items, raw: b.raw, wait: b.wait, note: b.note
      };
    }
    return null;
  }

  // ── 点数表（◯符◯翻 → 点数） ──
  var FU_W = [[20, 1], [25, 1], [30, 1.5], [40, 1.5], [50, 1.2], [60, 1], [70, 2], [80, 1], [90, 2], [100, 1], [110, 2]];
  function makeTable(seed) {
    var R = rnd(seed);
    for (var tries = 0; tries < 1000; tries++) {
      var fu = wpick(R, FU_W), han = 1 + Math.floor(R() * 4);
      var oya = R() < 0.45, tsumo = R() < 0.45;
      if (fu === 20 && (!tsumo || han === 1)) continue;   // 20符は平和ツモだけ（2翻から）
      if (fu === 25 && (han === 1 || (tsumo && han === 2))) continue; // 七対子は2翻から・ツモは3翻から
      var b = basic(fu, han).b;
      if (b >= 2000 && R() < 0.8) continue;
      return { fu: fu, han: han, oya: oya, tsumo: tsumo, pay: pay(fu, han, oya, tsumo) };
    }
    return null;
  }

  return {
    evaluate: evaluate, pay: pay, payText: payText, basic: basic, make: make, makeTable: makeTable,
    tilesText: tilesText, meldText: meldText, SEATS: SEATS, CAT_NAME: CAT_NAME, CATS: CATS
  };
})();
if (typeof module !== 'undefined') module.exports = TensuCore;
