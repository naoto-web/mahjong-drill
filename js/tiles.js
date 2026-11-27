// tiles.js — 麻雀牌の絵（自前のSVG。外部の画像は使わない＝電波なしでも出る・著作権の心配なし）
// 牌の番号は tensu_core.js と同じ：0-8 萬子／9-17 筒子／18-26 索子／27東 28南 29西 30北 31白 32發 33中
// 鳴きの並べ方は競技規定 第31条：明刻・明槓・チーは1枚を横向き、暗槓は両端の2枚を伏せる
var Tiles = (function () {
  var W = 30, H = 40;
  var RED = '#c62828', GREEN = '#1b7a3e', NAVY = '#1f3b73', INK = '#222';
  var KAN = ['一', '二', '三', '四', '五', '六', '七', '八', '九'];
  var JI = ['東', '南', '西', '北', '白', '發', '中'];

  function frame(inner) {
    return '<rect x="0.75" y="0.75" width="28.5" height="38.5" rx="3.5" fill="#fbf8ef" stroke="#cfc6ae" stroke-width="1.5"/>' + inner;
  }
  function text(x, y, s, size, color, weight) {
    return '<text x="' + x + '" y="' + y + '" font-size="' + size + '" fill="' + color + '" text-anchor="middle" dominant-baseline="central" ' +
      'font-family="\'Yu Mincho\',\'Hiragino Mincho ProN\',\'Noto Serif JP\',serif" font-weight="' + (weight || 700) + '">' + s + '</text>';
  }
  // 筒子の丸（外の輪・白・中の点）
  function pin(x, y, r, c) {
    return '<circle cx="' + x + '" cy="' + y + '" r="' + r + '" fill="' + c + '"/>' +
      '<circle cx="' + x + '" cy="' + y + '" r="' + (r * 0.62) + '" fill="#fbf8ef"/>' +
      '<circle cx="' + x + '" cy="' + y + '" r="' + (r * 0.3) + '" fill="' + c + '"/>';
  }
  var PIN = {
    1: [[15, 20, 10, RED]],
    2: [[15, 11, 6, GREEN], [15, 29, 6, NAVY]],
    3: [[8, 9, 5, NAVY], [15, 20, 5, RED], [22, 31, 5, GREEN]],
    4: [[9, 11, 5, NAVY], [21, 11, 5, GREEN], [9, 29, 5, GREEN], [21, 29, 5, NAVY]],
    5: [[8.5, 9.5, 4.5, NAVY], [21.5, 9.5, 4.5, GREEN], [15, 20, 4.5, RED], [8.5, 30.5, 4.5, GREEN], [21.5, 30.5, 4.5, NAVY]],
    6: [[10, 8, 4.3, GREEN], [20, 8, 4.3, GREEN], [10, 21, 4.3, RED], [20, 21, 4.3, RED], [10, 32, 4.3, RED], [20, 32, 4.3, RED]],
    7: [[7, 6.5, 3.6, GREEN], [15, 10, 3.6, GREEN], [23, 13.5, 3.6, GREEN], [10, 24, 3.8, RED], [20, 24, 3.8, RED], [10, 33, 3.8, RED], [20, 33, 3.8, RED]],
    8: [[10, 6.5, 3.6, NAVY], [20, 6.5, 3.6, NAVY], [10, 15.5, 3.6, NAVY], [20, 15.5, 3.6, NAVY], [10, 24.5, 3.6, NAVY], [20, 24.5, 3.6, NAVY], [10, 33.5, 3.6, NAVY], [20, 33.5, 3.6, NAVY]],
    9: [[7.5, 9, 3.6, NAVY], [15, 9, 3.6, NAVY], [22.5, 9, 3.6, NAVY], [7.5, 20, 3.6, RED], [15, 20, 3.6, RED], [22.5, 20, 3.6, RED], [7.5, 31, 3.6, GREEN], [15, 31, 3.6, GREEN], [22.5, 31, 3.6, GREEN]]
  };
  // 索子の棒（中に節の線）
  function stick(x, y, h, c) {
    var w = 3.6;
    return '<rect x="' + (x - w / 2) + '" y="' + (y - h / 2) + '" width="' + w + '" height="' + h + '" rx="1.6" fill="' + c + '"/>' +
      '<line x1="' + (x - w / 2) + '" y1="' + y + '" x2="' + (x + w / 2) + '" y2="' + y + '" stroke="#fbf8ef" stroke-width="0.9"/>';
  }
  var G = GREEN;
  var SOU = {
    2: [[15, 11, 13, G], [15, 29, 13, G]],
    3: [[15, 11, 13, G], [9, 29, 13, G], [21, 29, 13, G]],
    4: [[9, 11, 13, G], [21, 11, 13, G], [9, 29, 13, G], [21, 29, 13, G]],
    5: [[8, 11, 13, G], [22, 11, 13, G], [15, 20, 13, RED], [8, 29, 13, G], [22, 29, 13, G]],
    6: [[7.5, 11, 13, G], [15, 11, 13, G], [22.5, 11, 13, G], [7.5, 29, 13, G], [15, 29, 13, G], [22.5, 29, 13, G]],
    7: [[15, 7, 9, RED], [7.5, 20, 9, G], [15, 20, 9, G], [22.5, 20, 9, G], [7.5, 32, 9, G], [15, 32, 9, G], [22.5, 32, 9, G]],
    8: [[6, 11, 13, G], [12, 11, 13, G], [18, 11, 13, G], [24, 11, 13, G], [6, 29, 13, G], [12, 29, 13, G], [18, 29, 13, G], [24, 29, 13, G]],
    9: [[7.5, 8, 9.5, G], [15, 8, 9.5, RED], [22.5, 8, 9.5, G], [7.5, 20, 9.5, G], [15, 20, 9.5, RED], [22.5, 20, 9.5, G], [7.5, 32, 9.5, G], [15, 32, 9.5, RED], [22.5, 32, 9.5, G]]
  };

  function face(t) {
    if (t < 9) return text(15, 11.5, KAN[t], 16, NAVY, 900) + text(15, 28.5, '萬', 15, RED, 900);
    if (t < 18) return PIN[t - 8].map(function (p) { return pin(p[0], p[1], p[2], p[3]); }).join('');
    if (t < 27) {
      var n = t - 17;
      if (n === 1) { // 1索：大きめの棒を1本（本物の鳥の絵の代わり）
        return '<rect x="11.5" y="5" width="7" height="30" rx="3" fill="' + G + '"/>' +
          '<line x1="11.5" y1="15" x2="18.5" y2="15" stroke="#fbf8ef" stroke-width="1"/><line x1="11.5" y1="25" x2="18.5" y2="25" stroke="#fbf8ef" stroke-width="1"/>' +
          '<circle cx="15" cy="20" r="2" fill="' + RED + '"/>';
      }
      return SOU[n].map(function (s) { return stick(s[0], s[1], s[2], s[3]); }).join('');
    }
    var j = t - 27;
    if (j === 4) return '<rect x="6" y="7" width="18" height="26" rx="2" fill="none" stroke="#4a6fa5" stroke-width="1.6"/>'; // 白
    return text(15, 20.5, JI[j], 20, j === 5 ? GREEN : j === 6 ? RED : INK);
  }

  // 1枚の牌。opt: { side: 横向き, back: 伏せ, cls: 追加クラス }
  function one(t, opt) {
    opt = opt || {};
    var body = opt.back
      ? '<rect x="0.75" y="0.75" width="28.5" height="38.5" rx="3.5" fill="#e8a33a" stroke="#c98a2a" stroke-width="1.5"/>'
      : frame(face(t));
    if (opt.side) {
      return '<svg class="tile side' + (opt.cls ? ' ' + opt.cls : '') + '" viewBox="0 0 ' + H + ' ' + W + '" aria-hidden="true">' +
        '<g transform="translate(' + H + ',0) rotate(90)">' + body + '</g></svg>';
    }
    return '<svg class="tile' + (opt.cls ? ' ' + opt.cls : '') + '" viewBox="0 0 ' + W + ' ' + H + '" aria-hidden="true">' + body + '</svg>';
  }
  function row(ts, opt) { return ts.map(function (t) { return one(t, opt); }).join(''); }

  // 鳴いた面子（第31条）。from：0上家 1対面 2下家（横向きにする位置）
  function meld(g) {
    var from = g.from == null ? 0 : g.from, h = '';
    if (g.k === 'shun') {
      h = one(g.t, { side: true }) + one(g.t + 1) + one(g.t + 2); // チーは上家からだけ＝左端を横向き
    } else if (g.k === 'kou') {
      for (var i = 0; i < 3; i++) h += one(g.t, { side: i === [0, 1, 2][from] });
    } else if (!g.open) {
      h = one(g.t, { back: true }) + one(g.t) + one(g.t) + one(g.t, { back: true }); // 暗槓＝両端を伏せる
    } else {
      var pos = [0, 2, 3][from]; // 明槓：上家＝左端／対面＝左から3枚目／下家＝右端
      for (var j = 0; j < 4; j++) h += one(g.t, { side: j === pos });
    }
    return '<span class="meld">' + h + '</span>';
  }
  return { one: one, row: row, meld: meld };
})();
