// jouken_core.js — 条件計算とスコアシートの計算・出題（画面なし。node の検算からも読む）
// 答えの出し方は 資料/麻雀/プロ試験/ドリル/作成用/solver.py と同じ（公式解答40問と一致を確認済み）
var JoukenCore = (function () {
  var RANK = [50, 10, -10, -30];
  // 子のアガリ点（50符以下＋満貫以上）。7,700は切り上げ満貫で8,000
  var RON = [1000, 1300, 1600, 2000, 2600, 3200, 3900, 5200, 6400, 8000, 12000, 16000, 24000, 32000, 64000];
  var TSUMO = [[300, 500], [400, 700], [400, 800], [500, 1000], [700, 1300], [800, 1600], [1000, 2000], [1300, 2600],
    [1600, 3200], [2000, 4000], [3000, 6000], [4000, 8000], [6000, 12000], [8000, 16000], [16000, 32000]];
  var N = 'ABCD'; // A＝東家（親）
  var SEAT = ['東家', '南家', '西家', '北家'];

  function r1(x) { return Math.round(x * 10) / 10; }

  // 順位点（同点は分ける）とトータル
  function totals(pts, prev) {
    var order = [0, 1, 2, 3].sort(function (a, b) { return pts[b] - pts[a]; });
    var rp = [0, 0, 0, 0];
    var i = 0;
    while (i < 4) {
      var j = i;
      while (j + 1 < 4 && pts[order[j + 1]] === pts[order[i]]) j++;
      var sum = 0;
      for (var k = i; k <= j; k++) sum += RANK[k];
      for (k = i; k <= j; k++) rp[order[k]] = sum / (j - i + 1);
      i = j + 1;
    }
    var tot = [0, 1, 2, 3].map(function (k) { return r1(prev[k] + (pts[k] - 30000) / 1000 + rp[k]); });
    return { tot: tot, rp: rp };
  }

  function ranking(v) { return [0, 1, 2, 3].sort(function (a, b) { return v[b] - v[a]; }); }

  // mode: 'top'＝持ち点でトップ／3＝優勝（トータル1位）／4＝2人勝ち上がり（トータル2位以内）
  function score(pts, prev, mode) { return mode === 'top' ? pts.slice() : totals(pts, prev).tot; }
  function ok(v, w, mode) {
    var above = 0;
    for (var k = 0; k < 4; k++) if (k !== w && v[w] > v[k]) above++;
    return mode === 4 ? above >= 2 : above === 3;
  }
  function hasTie(v, w) {
    for (var k = 0; k < 4; k++) if (k !== w && Math.abs(v[w] - v[k]) < 1e-9) return true;
    return false;
  }

  function afterRon(pts, w, p, s) { var q = pts.slice(); q[w] += s; q[p] -= s; return q; }
  function afterTsumo(pts, w, c, d) {
    var q = pts.slice();
    for (var k = 0; k < 4; k++) { if (k === w) continue; var pay = k === 0 ? d : c; q[k] -= pay; q[w] += pay; }
    return q;
  }

  // 答え：ron[p]＝pからのロンの最低点（届かなければnull）、tsumo＝[子,親]
  function solve(pts, prev, w, mode) {
    var res = { ron: {}, tsumo: null, tie: false };
    var v0 = score(pts, prev, mode);
    var o = ranking(v0);
    if (mode !== 'top') { var who = mode === 3 ? o[0] : o[1]; res.q1 = { who: who, total: v0[who] }; }
    for (var p = 0; p < 4; p++) {
      if (p === w) continue;
      res.ron[p] = null;
      for (var i = 0; i < RON.length; i++) {
        var v = score(afterRon(pts, w, p, RON[i]), prev, mode);
        if (hasTie(v, w)) res.tie = true;
        if (ok(v, w, mode)) { res.ron[p] = { idx: i, val: RON[i] }; break; }
      }
    }
    for (var t = 0; t < TSUMO.length; t++) {
      var vt = score(afterTsumo(pts, w, TSUMO[t][0], TSUMO[t][1]), prev, mode);
      if (hasTie(vt, w)) res.tie = true;
      if (ok(vt, w, mode)) { res.tsumo = { idx: t, val: TSUMO[t] }; break; }
    }
    return res;
  }

  // 解説用：ある点数でアガったあとの4人の数字
  function snapshot(q, prev, mode) {
    var v = score(q, prev, mode);
    return { pts: q, v: v, order: ranking(v), rp: mode === 'top' ? null : totals(q, prev).rp };
  }

  // ── 出題 ──
  function rnd(seed) { // 再現できる乱数（印刷と画面で同じ問題を出せるように）
    var s = (Math.imul(seed >>> 0, 2654435761) ^ 0x9e3779b9) >>> 0 || 1;
    for (var w = 0; w < 8; w++) { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; }
    return function () { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
  }

  function makeOne(mode, R) {
    for (var tries = 0; tries < 5000; tries++) {
      var cuts = [];
      while (cuts.length < 3) { var c = 1 + Math.floor(R() * 998); if (cuts.indexOf(c) < 0) cuts.push(c); }
      cuts.sort(function (a, b) { return a - b; });
      var pts = [cuts[0], cuts[1] - cuts[0], cuts[2] - cuts[1], 1000 - cuts[2]].map(function (x) { return x * 100; });
      if (Math.min.apply(null, pts) < 1000) continue;
      if (pts[0] === pts[1] || pts[0] === pts[2] || pts[0] === pts[3] || pts[1] === pts[2] || pts[1] === pts[3] || pts[2] === pts[3]) continue;
      var prev = [0, 0, 0, 0];
      if (mode !== 'top') {
        prev = [0, 1, 2].map(function () { return r1(-80 + R() * 160); });
        prev.push(r1(-(prev[0] + prev[1] + prev[2])));
        if (Math.abs(prev[3]) > 120) continue;
      }
      var w = 1 + Math.floor(R() * 3);
      var r = solve(pts, prev, w, mode);
      if (r.tie) continue;
      var vals = [];
      for (var p = 0; p < 4; p++) if (p !== w) vals.push(r.ron[p]);
      if (vals.indexOf(null) >= 0 || !r.tsumo) continue;
      var big = vals.filter(function (x) { return x.val >= 32000; }).length;
      if (big > 1) continue;
      if (mode === 3 && vals.some(function (x) { return x.val === 1000; })) continue;
      var o = ranking(score(pts, prev, mode));
      if ((mode === 3 || mode === 'top') && o[0] === w) continue;
      if (mode === 4 && (o[0] === w || o[1] === w)) continue;
      // 少なくとも1問は「アガると持ち点の並びが入れ替わる」＝順位点が動く問題にする
      if (mode !== 'top') {
        var swap = false;
        for (p = 0; p < 4; p++) {
          if (p === w) continue;
          var q = afterRon(pts, w, p, r.ron[p].val);
          if (ranking(q).join() !== ranking(pts).join()) swap = true;
        }
        if (!swap) continue;
      }
      return { mode: mode, w: w, pts: pts, prev: prev, ans: r };
    }
    return null;
  }

  function make(mode, seed) { return makeOne(mode, rnd(seed)); }

  // ── スコアシート（麻雀問題②の問題5） ──
  function makeSheet(seed) {
    var R = rnd(seed);
    for (var tries = 0; tries < 5000; tries++) {
      var kyo = R() < 0.5 ? 0 : (R() < 0.7 ? 1 : 2);
      var total = 1000 - kyo * 10;
      var cuts = [];
      while (cuts.length < 3) { var c = 30 + Math.floor(R() * (total - 60)); if (cuts.indexOf(c) < 0) cuts.push(c); }
      cuts.sort(function (a, b) { return a - b; });
      var pts = [cuts[0], cuts[1] - cuts[0], cuts[2] - cuts[1], total - cuts[2]].map(function (x) { return x * 100; });
      if (new Set(pts).size < 4 || Math.min.apply(null, pts) < -5000) continue;
      var tok = pts.map(function (x) { return r1((x - 30000) / 1000); });
      var o = ranking(pts);
      var rp = [0, 0, 0, 0];
      o.forEach(function (k, i) { rp[k] = RANK[i]; });
      var point = tok.map(function (x, k) { return r1(x + rp[k]); });
      var blank = Math.floor(R() * 4);
      return { kyo: kyo, tok: tok, rp: rp, point: point, blank: blank, order: o };
    }
    return null;
  }

  return {
    RANK: RANK, RON: RON, TSUMO: TSUMO, N: N, SEAT: SEAT,
    totals: totals, ranking: ranking, score: score, solve: solve, snapshot: snapshot,
    afterRon: afterRon, afterTsumo: afterTsumo, make: make, makeSheet: makeSheet, r1: r1
  };
})();
if (typeof module !== 'undefined') module.exports = JoukenCore;
