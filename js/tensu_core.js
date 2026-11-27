// tensu_core.js — 役・翻・符・点数の計算と出題（画面なし。node の検算からも読む）
// 協会の競技規定 第42〜45条（符・翻・基本点・満貫）と第54〜58条（役）どおり。
// 11/27 から役も判定する（それまでは翻数を問題に書いていた）。リーチ・ドラ・一発・海底などの状況役は出さない＝手牌だけで決まる役
var TensuCore = (function () {
  // 牌の番号：0-8 萬子／9-17 筒子／18-26 索子／27東 28南 29西 30北 31白 32發 33中
  var KAN = ['一', '二', '三', '四', '五', '六', '七', '八', '九'];
  var MARU = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨'];
  var JI = ['東', '南', '西', '北', '白', '發', '中'];
  var SEATS = ['東家（親）', '南家（子）', '西家（子）', '北家（子）'];
  var GREEN = [19, 20, 21, 23, 25, 32]; // 緑一色：2・3・4・6・8索と發

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
  function groupFu(g, ronOpen) {
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

  // ── 手の中（鳴いていない部分）を雀頭＋面子に分ける：全部の取り方 ──
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

  // ── 点数（第44条・第45条＋協会の切り上げ満貫） ──
  function c100(x) { return Math.ceil(x / 100) * 100; }
  function basic(fu, han) {
    if (han >= 13) return { b: 8000 * Math.floor(han / 13), name: han >= 26 ? Math.floor(han / 13) + '倍役満' : '役満' };
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
  function payTotal(p) { return p.ron || (p.all ? p.all * 3 : p.ko * 2 + p.oya); }
  function payText(p) {
    if (p.ron) return p.ron.toLocaleString();
    if (p.all) return p.all.toLocaleString() + 'オール';
    return p.ko.toLocaleString() + '/' + p.oya.toLocaleString();
  }

  // ── 役（第54〜58条）。groups＝4面子（鳴き・槓こみ）、それぞれ { k, t, open, conceal } ──
  function yakuOf(ctx) {
    var gs = ctx.groups, pair = ctx.pair, seat = ctx.seat, menzen = ctx.menzen;
    var tiles = ctx.tiles; // 14枚以上（槓は4枚）
    var Y = [], YM = [];
    function add(name, han) { Y.push([name, han]); }
    var shun = gs.filter(function (g) { return g.k === 'shun'; });
    var kous = gs.filter(function (g) { return g.k !== 'shun'; });
    var kans = gs.filter(function (g) { return g.k === 'kan'; });
    var anko = kous.filter(function (g) { return g.conceal; }).length;
    var allY = tiles.every(yaochu), noHonor = tiles.every(function (t) { return t < 27; });
    var honorOnly = tiles.every(function (t) { return t >= 27; });
    var suitsUsed = {};
    tiles.forEach(function (t) { if (t < 27) suitsUsed[suit(t)] = 1; });
    var nSuit = Object.keys(suitsUsed).length;
    var dragonsK = kous.filter(function (g) { return g.t >= 31; }).length;
    var windsK = kous.filter(function (g) { return g.t >= 27 && g.t <= 30; }).length;

    // 役満
    if (anko === 4) YM.push(['四暗刻', 13]);
    if (dragonsK === 3) YM.push(['大三元', 13]);
    if (tiles.every(function (t) { return GREEN.indexOf(t) >= 0; })) YM.push(['緑一色', 13]);
    if (honorOnly) YM.push(['字一色', 13]);
    if (windsK === 4) YM.push(['大四喜', 13]);
    else if (windsK === 3 && pair >= 27 && pair <= 30) YM.push(['小四喜', 13]);
    if (allY && noHonor) YM.push(['清老頭', 13]);
    if (kans.length === 4) YM.push(['四槓子', 13]);
    if (menzen && nSuit === 1 && noHonor && ctx.cnt) {
      var s0 = suit(tiles[0]) * 9, need = [3, 1, 1, 1, 1, 1, 1, 1, 3], ok = true;
      for (var i = 0; i < 9; i++) if (ctx.cnt[s0 + i] < need[i]) ok = false;
      if (ok && !kans.length) YM.push(['九蓮宝燈', 13]);
    }
    if (YM.length) return YM;

    if (menzen && ctx.tsumo) add('門前清自摸和', 1);
    if (ctx.pinfu) add('平和', 1);
    kous.forEach(function (g) {
      if (g.t >= 31) add('役牌 ' + JI[g.t - 27], 1);
      else if (g.t === 27 && seat === 0) add('連風牌 東', 2);
      else if (g.t === 27) add('役牌 東（場風）', 1);
      else if (g.t === 27 + seat) add('役牌 ' + JI[g.t - 27] + '（自風）', 1);
    });
    if (tiles.every(function (t) { return !yaochu(t); })) add('断么九', 1);
    if (menzen) {
      var c = {}, pairs = 0;
      shun.forEach(function (g) { c[g.t] = (c[g.t] || 0) + 1; });
      Object.keys(c).forEach(function (k) { pairs += Math.floor(c[k] / 2); });
      if (pairs >= 2) add('二盃口', 3); else if (pairs === 1) add('一盃口', 1);
    }
    for (var n = 0; n < 7; n++) {
      if ([0, 1, 2].every(function (s) { return shun.some(function (g) { return g.t === s * 9 + n; }); })) { add('三色同順' + (menzen ? '' : '（鳴き）'), menzen ? 2 : 1); break; }
    }
    for (var s = 0; s < 3; s++) {
      if ([0, 3, 6].every(function (o) { return shun.some(function (g) { return g.t === s * 9 + o; }); })) { add('一気通貫' + (menzen ? '' : '（鳴き）'), menzen ? 2 : 1); break; }
    }
    var allHasY = gs.every(function (g) { return g.k === 'shun' ? (num(g.t) === 0 || num(g.t) === 6) : yaochu(g.t); }) && yaochu(pair);
    if (allHasY && shun.length) {
      if (noHonor) add('純全帯么九' + (menzen ? '' : '（鳴き）'), menzen ? 3 : 2);
      else add('全帯么九' + (menzen ? '' : '（鳴き）'), menzen ? 2 : 1);
    }
    if (kous.length === 4) add('対々和', 2);
    if (anko === 3) add('三暗刻', 2);
    for (n = 0; n < 9; n++) {
      if ([0, 1, 2].every(function (s) { return kous.some(function (g) { return g.t === s * 9 + n; }); })) { add('三色同刻', 2); break; }
    }
    if (kans.length === 3) add('三槓子', 2);
    if (dragonsK === 2 && pair >= 31) add('小三元', 2);
    if (allY && !honorOnly && !noHonor) add('混老頭', 2);
    if (nSuit === 1 && !honorOnly) {
      if (noHonor) add('清一色' + (menzen ? '' : '（鳴き）'), menzen ? 6 : 5);
      else add('混一色' + (menzen ? '' : '（鳴き）'), menzen ? 3 : 2);
    }
    return Y;
  }

  // ── 手を全部の取り方で評価して、点数が一番高い取り方を返す（高点法・第41条イ） ──
  // hand = { closed:[手の中の牌（アガリ牌は除く）], melds:[{k,t,open}], win:牌, tsumo:bool, seat:0-3 }
  function analyze(hand) {
    var menzen = hand.melds.every(function (g) { return !g.open; });
    var oya = hand.seat === 0;
    var cnt = new Array(34).fill(0);
    hand.closed.concat([hand.win]).forEach(function (t) { cnt[t]++; });
    var meldTiles = [];
    hand.melds.forEach(function (g) {
      if (g.k === 'shun') meldTiles.push(g.t, g.t + 1, g.t + 2);
      else for (var i = 0; i < (g.k === 'kan' ? 4 : 3); i++) meldTiles.push(g.t);
    });
    var tiles = hand.closed.concat([hand.win], meldTiles);
    var allCnt = new Array(34).fill(0);
    tiles.forEach(function (t) { allCnt[t]++; });
    var best = null;
    function consider(c) {
      if (!c.yaku.length) return;
      c.han = c.yaku.reduce(function (s, y) { return s + y[1]; }, 0);
      c.pay = pay(c.fu, c.han, oya, hand.tsumo);
      if (!best || payTotal(c.pay) > payTotal(best.pay) || (payTotal(c.pay) === payTotal(best.pay) && c.han > best.han)) best = c;
    }
    var need = 4 - hand.melds.length;
    decompose(cnt, need).forEach(function (d) {
      var cands = [];
      if (d.pair === hand.win) cands.push({ type: 'pair' });
      d.sets.forEach(function (g, i) {
        if (g.k === 'kou' && g.t === hand.win) cands.push({ type: 'kou', i: i });
        if (g.k === 'shun' && hand.win >= g.t && hand.win <= g.t + 2) cands.push({ type: 'shun', i: i });
      });
      cands.forEach(function (c) {
        var wait = '両面';
        if (c.type === 'pair') wait = '単騎';
        else if (c.type === 'kou') wait = 'シャンポン';
        else {
          var wg = d.sets[c.i], pos = hand.win - wg.t;
          if (pos === 1) wait = 'カンチャン';
          else if ((pos === 2 && num(wg.t) === 0) || (pos === 0 && num(wg.t) === 6)) wait = 'ペンチャン';
        }
        var groups = hand.melds.map(function (g) { return { k: g.k, t: g.t, open: g.open, conceal: g.k !== 'shun' && !g.open }; })
          .concat(d.sets.map(function (g, i) {
            var ronOpen = !hand.tsumo && c.type === 'kou' && c.i === i;
            return { k: g.k, t: g.t, open: false, ronOpen: ronOpen, conceal: g.k === 'kou' && !ronOpen };
          }));
        var pinfu = menzen && hand.melds.length === 0 && d.sets.every(function (g) { return g.k === 'shun'; }) && wait === '両面' && !yakuhai(d.pair, hand.seat);
        // 符
        var items = [['副底', 20]];
        if (menzen && !hand.tsumo) items.push(['門前清栄和（門前でロン）', 10]);
        if (hand.tsumo && !pinfu) items.push(['ツモ符', 2]);
        groups.forEach(function (g) { var f = groupFu(g, g.ronOpen); if (f) items.push([groupName(g, g.ronOpen), f]); });
        if (yakuhai(d.pair, hand.seat)) items.push(['雀頭 ' + oneText(d.pair) + '（役牌）', 2]);
        if (wait === '単騎' || wait === 'カンチャン' || wait === 'ペンチャン') items.push([wait + '待ち', 2]);
        var raw = items.reduce(function (s, x) { return s + x[1]; }, 0), note = '';
        if (pinfu && hand.tsumo) note = '平和のツモはツモ符を付けず20符（第42条ロ）';
        if (!menzen && raw === 20 && !hand.tsumo) { raw = 30; note = '鳴いた平和形のロンは副底に10符を足して30符（第42条ニ）'; }
        var fu = Math.ceil(raw / 10) * 10;
        var yaku = yakuOf({ groups: groups, pair: d.pair, seat: hand.seat, menzen: menzen, tsumo: hand.tsumo, pinfu: pinfu, tiles: tiles, cnt: allCnt });
        consider({ fu: fu, raw: raw, items: items, wait: wait, note: note, yaku: yaku, chiitoi: false });
      });
    });
    // 七対子（第55条⑫）：7種類の対子
    if (hand.melds.length === 0) {
      var pairsN = 0, okC = true;
      for (var t = 0; t < 34; t++) { if (cnt[t] === 2) pairsN++; else if (cnt[t]) okC = false; }
      if (okC && pairsN === 7) {
        var Y = [];
        var honorOnly = tiles.every(function (x) { return x >= 27; });
        if (honorOnly) Y = [['字一色', 13]];
        else {
          Y.push(['七対子', 2]);
          if (hand.tsumo) Y.push(['門前清自摸和', 1]);
          if (tiles.every(function (x) { return !yaochu(x); })) Y.push(['断么九', 1]);
          if (tiles.every(yaochu)) Y.push(['混老頭', 2]);
          var su = {}; tiles.forEach(function (x) { if (x < 27) su[suit(x)] = 1; });
          if (Object.keys(su).length === 1) Y.push(tiles.every(function (x) { return x < 27; }) ? ['清一色', 6] : ['混一色', 3]);
        }
        consider({ fu: 25, raw: 25, items: [['七対子は符を数えない', 25]], wait: '単騎', note: '七対子は25符の固定（ツモ・ロンとも）。切り上げもしない。', yaku: Y, chiitoi: true });
      }
    }
    return best;
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

  // 出題の種類（弱点寄り）。yaku＝役づくりを狙った手（混一色・三色・一通・チャンタ・対々和など）
  var CATS = [['kan', 2.5], ['nakitsumo', 2.5], ['chiitoi', 1.2], ['oya', 2], ['high', 2], ['yaku', 3], ['mix', 1.5]];
  var CAT_NAME = { kan: '槓の符', nakitsumo: '鳴いた手のツモ', chiitoi: '七対子', oya: '親の点数', high: '70符以上', yaku: '役づくり', mix: 'いろいろ' };
  var THEMES = [['none', 2], ['tanyao', 1.5], ['yakuhai', 1.5], ['honitsu', 1.2], ['chinitsu', 0.4], ['sanshoku', 0.8], ['ittsu', 0.8], ['toitoi', 0.8], ['chanta', 0.7]];

  // テーマに合う牌の選び方
  function themePick(R, theme, s0) {
    function anySuit() { return theme === 'honitsu' || theme === 'chinitsu' ? s0 : Math.floor(R() * 3); }
    return {
      shunStart: function () {
        var s = anySuit();
        if (theme === 'tanyao') return s * 9 + 1 + Math.floor(R() * 5);
        if (theme === 'chanta') return s * 9 + (R() < 0.5 ? 0 : 6);
        return s * 9 + Math.floor(R() * 7);
      },
      kouTile: function (hi) {
        if (theme === 'tanyao') return Math.floor(R() * 3) * 9 + 1 + Math.floor(R() * 7);
        if (theme === 'chinitsu') return s0 * 9 + Math.floor(R() * 9);
        if (theme === 'honitsu') return R() < 0.5 ? s0 * 9 + Math.floor(R() * 9) : 27 + Math.floor(R() * 7);
        if (theme === 'chanta') return pick(R, [0, 8, 9, 17, 18, 26, 27, 28, 29, 30, 31, 32, 33]);
        if (hi && R() < 0.6) return pick(R, [0, 8, 9, 17, 18, 26, 27, 28, 29, 30, 31, 32, 33]);
        return Math.floor(R() * 34);
      },
      pairTile: function () {
        if (theme === 'tanyao') return Math.floor(R() * 3) * 9 + 1 + Math.floor(R() * 7);
        if (theme === 'chinitsu') return s0 * 9 + Math.floor(R() * 9);
        if (theme === 'honitsu') return R() < 0.6 ? s0 * 9 + Math.floor(R() * 9) : 27 + Math.floor(R() * 7);
        if (theme === 'chanta') return pick(R, [0, 8, 9, 17, 18, 26, 27, 28, 29, 30, 31, 32, 33]);
        return Math.floor(R() * 34);
      }
    };
  }

  function buildResult(cat, hand, a, R) {
    var sorted = hand.closed.slice().sort(function (x, y) { return x - y; });
    return {
      cat: cat, seat: hand.seat, tsumo: hand.tsumo, han: a.han, fu: a.fu, pay: a.pay, yaku: a.yaku,
      hand: tilesText(sorted), melds: hand.melds.map(meldText).join(' '), win: (hand.tsumo ? 'ツモ' : 'ロン') + oneText(hand.win),
      // 絵で出す用（from＝鳴いた相手：0上家 1対面 2下家。チーは上家だけ）
      tiles: {
        closed: sorted, win: hand.win,
        melds: hand.melds.map(function (g) { return { k: g.k, t: g.t, open: g.open, from: g.k === 'shun' ? 0 : Math.floor(R() * 3) }; })
      },
      items: a.items, raw: a.raw, wait: a.wait, note: a.note, chiitoi: a.chiitoi
    };
  }

  function makeChiitoi(R, cat) {
    for (var tries = 0; tries < 2000; tries++) {
      var pairs = [], theme = R() < 0.25 ? 'honitsu' : 'none', s0 = Math.floor(R() * 3);
      while (pairs.length < 7) {
        var t = theme === 'honitsu' ? (R() < 0.6 ? s0 * 9 + Math.floor(R() * 9) : 27 + Math.floor(R() * 7)) : Math.floor(R() * 34);
        if (pairs.indexOf(t) < 0) pairs.push(t);
      }
      var win = pairs[Math.floor(R() * 7)];
      var closed = [];
      pairs.forEach(function (p) { closed.push(p); if (p !== win) closed.push(p); });
      var cnt = new Array(34).fill(0);
      closed.concat([win]).forEach(function (x) { cnt[x]++; });
      if (decompose(cnt, 4).length) continue; // 普通の形にも取れる手（二盃口など）は出さない
      var seat = cat === 'oya' ? 0 : (R() < 0.35 ? 0 : 1 + Math.floor(R() * 3));
      var hand = { closed: closed, melds: [], win: win, tsumo: R() < 0.5, seat: seat };
      var a = analyze(hand);
      if (!a || a.han >= 13) continue;
      return buildResult('chiitoi', hand, a, R);
    }
    return null;
  }

  function make(seed, onlyCat) {
    var R = rnd(seed);
    var cat = onlyCat || wpick(R, CATS);
    if (cat === 'chiitoi') return makeChiitoi(R, cat);
    for (var tries = 0; tries < 6000; tries++) {
      var theme = cat === 'yaku' ? wpick(R, THEMES.slice(1)) : wpick(R, THEMES);
      if (cat === 'high' && (theme === 'tanyao' || theme === 'sanshoku' || theme === 'ittsu')) theme = 'none';
      var s0 = Math.floor(R() * 3), P = themePick(R, theme, s0);
      var seat = cat === 'oya' ? 0 : (R() < 0.3 ? 0 : 1 + Math.floor(R() * 3));
      var tsumo = cat === 'nakitsumo' ? true : R() < 0.45;
      var cnt = new Array(34).fill(0);
      var groups = [], okBuild = true;
      var nKan = cat === 'kan' ? 1 + Math.floor(R() * 2) : (cat === 'high' ? Math.floor(R() * 3) : (R() < 0.15 ? 1 : 0));
      if (theme === 'tanyao' || theme === 'sanshoku' || theme === 'ittsu') nKan = Math.min(nKan, 1);
      // 決め打ちの面子（三色・一通・役牌）
      var fixed = [];
      if (theme === 'sanshoku') { var n = Math.floor(R() * 7); fixed = [0, 1, 2].map(function (s) { return { k: 'shun', t: s * 9 + n }; }); }
      if (theme === 'ittsu') { var ss = Math.floor(R() * 3); fixed = [0, 3, 6].map(function (o) { return { k: 'shun', t: ss * 9 + o }; }); }
      if (theme === 'yakuhai') fixed = [{ k: 'kou', t: pick(R, [31, 32, 33, 31, 32, 33, 27, 27 + seat]) }];
      for (var gi = 0; gi < 4; gi++) {
        var k, t, need;
        if (gi < fixed.length) { k = fixed[gi].k; t = fixed[gi].t; }
        else {
          k = gi - fixed.length < nKan ? 'kan' : (theme === 'toitoi' ? 'kou' : wpick(R, [['shun', cat === 'high' ? 1 : 3], ['kou', cat === 'high' ? 3 : 1.5]]));
          t = k === 'shun' ? P.shunStart() : P.kouTile(cat === 'high');
          if (theme === 'tanyao' && k === 'kan') t = Math.floor(R() * 3) * 9 + 1 + Math.floor(R() * 7);
        }
        need = k === 'shun' ? [t, t + 1, t + 2] : (k === 'kan' ? [t, t, t, t] : [t, t, t]);
        need.forEach(function (x) { cnt[x]++; });
        if (need.some(function (x) { return cnt[x] > 4; })) { okBuild = false; break; }
        var open;
        if (k === 'kan') open = R() < 0.5;
        else if (cat === 'nakitsumo') open = gi === Math.max(nKan, fixed.length) ? true : R() < 0.35;
        else open = R() < (cat === 'high' ? 0.15 : 0.25);
        groups.push({ k: k, t: t, open: open });
      }
      if (!okBuild) continue;
      var pr = P.pairTile();
      if (pr === 27 && seat === 0) continue; // 連風牌の雀頭は出さない（協会表の扱いが紛らわしい）
      cnt[pr] += 2;
      if (cnt[pr] > 4) continue;
      var melds = groups.filter(function (g) { return g.open || g.k === 'kan'; });
      var inner = groups.filter(function (g) { return !(g.open || g.k === 'kan'); });
      if (melds.length === 4 && R() < 0.7) continue;
      var tiles = [];
      inner.forEach(function (g) { if (g.k === 'shun') tiles.push(g.t, g.t + 1, g.t + 2); else tiles.push(g.t, g.t, g.t); });
      tiles.push(pr, pr);
      var cands = [];
      inner.forEach(function (g) { if (g.k === 'shun') cands.push(g.t, g.t + 1, g.t + 2); else cands.push(g.t); });
      cands.push(pr);
      var win = pick(R, cands);
      var closed = tiles.slice();
      closed.splice(closed.indexOf(win), 1);
      var hand = { closed: closed, melds: melds, win: win, tsumo: tsumo, seat: seat };
      var a = analyze(hand);
      if (!a) continue; // 役なし
      if (a.han >= 13 && R() < 0.9) continue; // 役満はたまにだけ
      if (cat === 'kan' && !melds.some(function (g) { return g.k === 'kan'; })) continue;
      if (cat === 'nakitsumo' && !melds.some(function (g) { return g.open; })) continue;
      if (cat === 'high' && a.fu < 70) continue;
      if (cat === 'yaku' && a.yaku.every(function (y) { return /門前清自摸和|役牌|断么九/.test(y[0]); })) continue;
      if (a.fu > 110) continue;
      // 満貫以上ばかりだと符の練習にならない＝半分は捨てる（役づくりは残す）
      if (a.han >= 5 && cat !== 'yaku' && R() < 0.5) continue;
      return buildResult(cat, hand, a, R);
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
    analyze: analyze, pay: pay, payText: payText, basic: basic, make: make, makeTable: makeTable,
    tilesText: tilesText, meldText: meldText, SEATS: SEATS, CAT_NAME: CAT_NAME, CATS: CATS
  };
})();
if (typeof module !== 'undefined') module.exports = TensuCore;
