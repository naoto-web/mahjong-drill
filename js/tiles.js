// tiles.js — 麻雀牌の絵
// 画像＝FluffyStuff「riichi-mahjong-tiles」（パブリックドメイン・img/tiles/README.txt）。表地 Front.svg の上に牌の絵を重ねる
// 牌の番号は tensu_core.js と同じ：0-8 萬子／9-17 筒子／18-26 索子／27東 28南 29西 30北 31白 32發 33中
// 鳴きの並べ方は競技規定 第31条：明刻・明槓・チーは1枚を横向き、暗槓は両端の2枚を伏せる
var Tiles = (function () {
  var DIR = 'img/tiles/';
  var JI = ['Ton', 'Nan', 'Shaa', 'Pei', 'Haku', 'Hatsu', 'Chun'];
  function file(t) {
    if (t < 9) return 'Man' + (t + 1);
    if (t < 18) return 'Pin' + (t - 8);
    if (t < 27) return 'Sou' + (t - 17);
    return JI[t - 27];
  }
  // 1枚の牌。opt: { side: 横向き, back: 伏せ, cls: 追加クラス }
  function one(t, opt) {
    opt = opt || {};
    var inner = opt.back
      ? '<img src="' + DIR + 'Back.svg" alt="">'
      : '<img src="' + DIR + 'Front.svg" alt=""><img src="' + DIR + file(t) + '.svg" alt="">';
    return '<span class="tile' + (opt.side ? ' side' : '') + (opt.cls ? ' ' + opt.cls : '') + '"><span class="tf">' + inner + '</span></span>';
  }
  function row(ts, opt) { return ts.map(function (t) { return one(t, opt); }).join(''); }

  // 鳴いた面子（第31条）。from：0上家 1対面 2下家（横向きにする位置）
  function meld(g) {
    var from = g.from == null ? 0 : g.from, h = '';
    if (g.k === 'shun') {
      h = one(g.t, { side: true }) + one(g.t + 1) + one(g.t + 2); // チーは上家からだけ＝左端を横向き
    } else if (g.k === 'kou') {
      for (var i = 0; i < 3; i++) h += one(g.t, { side: i === from });
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
