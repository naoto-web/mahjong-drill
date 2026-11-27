// jouken.js — 🧮条件タブ：条件計算（本番の問題2・3・4の形）とスコアシート（問題②の問題5）
var Jouken = (function () {
  var J = JoukenCore;
  var MODES = {
    u: { mode: 3, label: '優勝（問題3型）', lead: 'タイトル戦決勝の最終半荘・南4局0本場。（　）は前回までのトータル。', goal: '優勝する', q1: '全員ノーテンで終局した場合の優勝者とその者のトータルスコア' },
    t: { mode: 4, label: '2人勝ち上がり（問題4型）', lead: '2人勝ち上がりトーナメント戦の最終半荘・南4局0本場。（　）は前回までのトータル。', goal: 'トーナメント通過する', q1: '全員ノーテンで終局した場合のトーナメント2位通過者とそのスコア' },
    top: { mode: 'top', label: 'トップ条件（問題2型）', lead: 'ある半荘の南4局0本場。', goal: 'トップになる', q1: null },
    sheet: { label: 'スコアシート（問題②-5）' }
  };
  var cur = 'u', q = null, done = false;

  // ── 出題文（画面と印刷で共通） ──
  function questions(p) {
    var M = modeOf(p), list = [];
    if (M.q1) list.push({ key: 'q1', text: M.q1 });
    for (var k = 0; k < 4; k++) {
      if (k === p.w) continue;
      list.push({ key: 'ron' + k, p: k, text: J.N[p.w] + 'が' + J.N[k] + 'からのロンアガリで' + M.goal + 'ための最低アガリ点数' });
    }
    list.push({ key: 'tsumo', text: J.N[p.w] + 'のツモアガリで' + M.goal + 'ための最低アガリ点数（子/親）' });
    return list;
  }
  function modeOf(p) { return p.mode === 3 ? MODES.u : p.mode === 4 ? MODES.t : MODES.top; }
  function scoreTable(p) {
    var h = '<table class="exam-table">';
    for (var k = 0; k < 4; k++) {
      h += '<tr><td>' + J.SEAT[k] + '</td><td class="who">' + J.N[k] + '</td><td class="r">' + UI.fmt(p.pts[k]) + '点</td>' +
        (p.mode === 'top' ? '' : '<td class="r prev">(' + UI.pt(p.prev[k]) + ')</td>') + '</tr>';
    }
    return h + '</table>';
  }
  function leadText(p) { return modeOf(p).lead + 'リーチ棒は出ない。アガリ点数は50符以下だけを考える。A＝東家（親）。'; }

  // ── 正解の文字 ──
  function answerText(p, key) {
    var a = p.ans;
    if (key === 'q1') return J.N[a.q1.who] + '　' + UI.pt(a.q1.total);
    if (key === 'tsumo') return UI.fmt(a.tsumo.val[0]) + '/' + UI.fmt(a.tsumo.val[1]);
    return UI.fmt(a.ron[+key.slice(3)].val);
  }

  // ── 解説：その点数でアガったときの並び／1つ下の点数だと誰に届かないか ──
  function rankTable(p, q2, mark) {
    var s = J.snapshot(q2, p.prev, p.mode);
    var h = '<table class="rank-table"><tr><th>順位</th><th></th><th>持ち点</th>' + (p.mode === 'top' ? '' : '<th>順位点</th><th>トータル</th>') + '</tr>';
    s.order.forEach(function (k, i) {
      h += '<tr' + (k === mark ? ' class="me"' : '') + '><td>' + (i + 1) + '位</td><td>' + J.N[k] + '</td><td class="r">' + UI.fmt(q2[k]) + '</td>' +
        (p.mode === 'top' ? '' : '<td class="r">' + UI.pt(s.rp[k]).replace('.0', '') + '</td><td class="r"><b>' + UI.pt(s.v[k]) + '</b></td>') + '</tr>';
    });
    return h + '</table>';
  }
  function blockers(p, q2) {
    var s = J.snapshot(q2, p.prev, p.mode), w = p.w, v = s.v;
    var ahead = [0, 1, 2, 3].filter(function (k) { return k !== w && v[k] >= v[w] - 1e-9; });
    var unit = p.mode === 'top' ? '点' : 'pt';
    var need = p.mode === 4 ? ahead.length - 1 : ahead.length; // 4型は1人までなら上にいてよい
    if (need <= 0) return '';
    ahead.sort(function (a, b) { return v[a] - v[b]; });
    var who = ahead.slice(0, need).map(function (k) {
      var d = v[k] - v[w];
      var ds = p.mode === 'top' ? UI.fmt(Math.round(d)) : (Math.round(d * 10) / 10).toFixed(1);
      return J.N[k] + (d < 1e-9 ? 'と同点' : 'に' + ds + unit + '届かない');
    });
    return who.join('・');
  }
  function explain(p, key) {
    var a = p.ans, w = p.w;
    if (key === 'q1') {
      return '<p>今の持ち点のまま終わる。順位点を足したトータルの並び：</p>' + rankTable(p, p.pts, a.q1.who) +
        '<p class="hint">' + (p.mode === 3 ? '1位' : '2位') + 'の' + J.N[a.q1.who] + '（' + UI.pt(a.q1.total) + '）が答え。</p>';
    }
    var html = '', q2, lower = null, lowerLabel = '';
    if (key === 'tsumo') {
      var t = a.tsumo.val;
      q2 = J.afterTsumo(p.pts, w, t[0], t[1]);
      html += '<p><b>' + UI.fmt(t[0]) + '/' + UI.fmt(t[1]) + '</b>（' + J.N[w] + 'が＋' + UI.fmt(t[0] * 2 + t[1]) + '・Aが−' + UI.fmt(t[1]) + '・ほかの子が−' + UI.fmt(t[0]) + '）でアガると：</p>';
      if (a.tsumo.idx > 0) { var tl = J.TSUMO[a.tsumo.idx - 1]; lower = J.afterTsumo(p.pts, w, tl[0], tl[1]); lowerLabel = UI.fmt(tl[0]) + '/' + UI.fmt(tl[1]); }
    } else {
      var k = +key.slice(3), r = a.ron[k];
      q2 = J.afterRon(p.pts, w, k, r.val);
      html += '<p><b>' + UI.fmt(r.val) + '</b>を' + J.N[k] + 'から（' + J.N[w] + 'が＋' + UI.fmt(r.val) + '・' + J.N[k] + 'が−' + UI.fmt(r.val) + '）でアガると：</p>';
      if (r.idx > 0) { var rl = J.RON[r.idx - 1]; lower = J.afterRon(p.pts, w, k, rl); lowerLabel = UI.fmt(rl); }
    }
    html += rankTable(p, q2, w);
    if (lower) html += '<p class="hint">1つ下の <b>' + lowerLabel + '</b> だと → ' + blockers(p, lower) + '</p>';
    else html += '<p class="hint">いちばん安いアガリでも届く。</p>';
    return html;
  }

  // ── 画面 ──
  function seg() {
    return '<div class="seg">' + Object.keys(MODES).map(function (k) {
      return '<button data-m="' + k + '"' + (k === cur ? ' class="on"' : '') + '>' + MODES[k].label + '</button>';
    }).join('') + '</div>';
  }
  function render() {
    var root = document.getElementById('joukenBody');
    if (cur === 'sheet') { Sheet.render(root, seg()); return; }
    if (!q) q = J.make(MODES[cur].mode, UI.seed());
    done = false;
    var h = seg();
    h += '<div class="card"><p class="lead">' + leadText(q) + '</p>' + scoreTable(q) + '</div>';
    h += '<div class="card qs">';
    questions(q).forEach(function (it, i) {
      h += '<div class="q" data-key="' + it.key + '"><div class="qt">(' + (i + 1) + ') ' + it.text + '</div><div class="qa">';
      if (it.key === 'q1') {
        h += '<span class="pick">' + [0, 1, 2, 3].map(function (k) { return '<button type="button" data-who="' + k + '">' + J.N[k] + '</button>'; }).join('') + '</span>' + UI.input('jq1', { sign: true, ph: '例 11.4' });
      } else if (it.key === 'tsumo') {
        h += UI.input('jtk', { ph: '子' }) + '<span class="slash">/</span>' + UI.input('jto', { ph: '親' });
      } else {
        h += UI.input('j' + it.key, { ph: '点' });
      }
      h += '</div><div class="res" hidden></div></div>';
    });
    if (q.mode !== 'top') h += '<p class="note">本番は(1)をまちがえると(2)〜(5)は採点されない。</p>';
    h += '<div class="btns"><button id="jCheck" class="primary">答え合わせ</button><button id="jNext">次の問題</button></div></div>';
    root.innerHTML = h;
  }
  function check() {
    if (done) return;
    done = true;
    var a = q.ans, okAll = true, q1ok = true;
    questions(q).forEach(function (it) {
      var ok;
      if (it.key === 'q1') {
        var b = document.querySelector('.pick button.on');
        ok = !!b && +b.dataset.who === a.q1.who && UI.same(UI.readSigned('jq1'), a.q1.total);
        q1ok = ok;
      } else if (it.key === 'tsumo') {
        ok = UI.same(UI.num(document.getElementById('jtk').value), a.tsumo.val[0]) && UI.same(UI.num(document.getElementById('jto').value), a.tsumo.val[1]);
      } else {
        ok = UI.same(UI.num(document.getElementById('j' + it.key).value), a.ron[it.p].val);
      }
      if (!ok) okAll = false;
      Store.record('jouken', ok, it.key === 'q1' ? 'q1' : (it.key === 'tsumo' ? 'tsumo' : 'ron'));
      var el = document.querySelector('.q[data-key="' + it.key + '"]');
      el.classList.add(ok ? 'ok' : 'ng');
      var res = el.querySelector('.res');
      res.hidden = false;
      res.innerHTML = '<div class="verdict">' + (ok ? '○' : '×') + '　正解：<b>' + answerText(q, it.key) + '</b><button class="more">解説</button></div><div class="exp" hidden>' + explain(q, it.key) + '</div>';
    });
    if (q.mode !== 'top' && !q1ok) UI.toast('(1)がまちがい＝本番なら(2)〜(5)は0点');
    else UI.toast(okAll ? '全問正解！' : '×の「解説」を開いてみてください');
    document.getElementById('jCheck').disabled = true;
  }

  document.addEventListener('click', function (e) {
    if (!e.target.closest('#joukenBody')) return;
    var m = e.target.closest('.seg button');
    if (m) { cur = m.dataset.m; q = null; render(); return; }
    var w = e.target.closest('.pick button');
    if (w) { w.parentNode.querySelectorAll('button').forEach(function (b) { b.classList.toggle('on', b === w); }); return; }
    if (e.target.id === 'jCheck') { check(); return; }
    if (e.target.id === 'jNext') { q = null; render(); window.scrollTo(0, 0); return; }
    var more = e.target.closest('.more');
    if (more) { var ex = more.closest('.res').querySelector('.exp'); ex.hidden = !ex.hidden; more.textContent = ex.hidden ? '解説' : '閉じる'; }
  });

  return { render: render, questions: questions, scoreTable: scoreTable, leadText: leadText, answerText: answerText, explain: explain, blockers: blockers, MODES: MODES };
})();

// スコアシート（麻雀問題②の問題5）
var Sheet = (function () {
  var J = JoukenCore, S = null, done = false;
  var SEATS = ['東家', '南家', '西家', '北家'];
  function table(s, withInputs) {
    var h = '<table class="sheet-table"><tr><th></th>' + SEATS.map(function (x) { return '<th>' + x + '</th>'; }).join('') + '<th>供託</th></tr>';
    h += '<tr><th>得失点</th>';
    for (var k = 0; k < 4; k++) h += '<td>' + (k === s.blank ? (withInputs ? UI.input('sb', { sign: true }) : '<b>(1)</b>') : UI.pt(s.tok[k])) + '</td>';
    h += '<td>' + (s.kyo ? '+' + s.kyo.toFixed(1) : '0') + '</td></tr><tr><th>ポイント</th>';
    for (k = 0; k < 4; k++) h += '<td>' + (withInputs ? UI.input('sp' + k, { sign: true }) : '<b>(' + (k + 2) + ')</b>') + '</td>';
    return h + '<td></td></tr></table>';
  }
  function explain(s) {
    var sumKnown = 0;
    for (var k = 0; k < 4; k++) if (k !== s.blank) sumKnown += s.tok[k];
    var all = -20 - s.kyo;
    var h = '<p>① 4人の得失点の合計＝<b>' + UI.pt(all) + '</b>（25,000持ち30,000返しで△20.0' + (s.kyo ? '・供託' + s.kyo.toFixed(1) + 'のぶんさらに減る' : '') + '）</p>';
    h += '<p>　空欄＝' + UI.pt(all) + ' −（' + UI.pt(J.r1(sumKnown)) + '）＝<b>' + UI.pt(s.tok[s.blank]) + '</b></p>';
    h += '<p>② 得失点の高い順に順位点（+50／+10／△10／△30）→ ③ ポイント＝得失点＋順位点</p><table class="rank-table"><tr><th>順位</th><th></th><th>得失点</th><th>順位点</th><th>ポイント</th></tr>';
    s.order.forEach(function (k, i) {
      h += '<tr><td>' + (i + 1) + '位</td><td>' + SEATS[k] + '</td><td class="r">' + UI.pt(s.tok[k]) + '</td><td class="r">' + UI.pt(s.rp[k]).replace('.0', '') + '</td><td class="r"><b>' + UI.pt(s.point[k]) + '</b></td></tr>';
    });
    return h + '</table>';
  }
  function render(root, segHtml) {
    if (!S) S = J.makeSheet(UI.seed());
    done = false;
    root.innerHTML = segHtml + '<div class="card"><p class="lead">半荘が終わったときのスコアシート。空欄の得失点(1)と、4人のポイントを答える。</p>' +
      '<div class="scroll-x">' + table(S, true) + '</div><div id="sRes" class="res" hidden></div>' +
      '<div class="btns"><button id="sCheck" class="primary">答え合わせ</button><button id="sNext">次の問題</button></div></div>';
  }
  function check() {
    if (done) return;
    done = true;
    var ok1 = UI.same(UI.readSigned('sb'), S.tok[S.blank]);
    var okP = [0, 1, 2, 3].map(function (k) { return UI.same(UI.readSigned('sp' + k), S.point[k]); });
    Store.record('sheet', ok1 && okP.every(Boolean));
    var r = document.getElementById('sRes');
    r.hidden = false;
    r.innerHTML = '<div class="verdict">' + (ok1 ? '○' : '×') + ' 空欄の得失点：<b>' + UI.pt(S.tok[S.blank]) + '</b></div>' +
      '<div class="verdict">ポイント：' + SEATS.map(function (x, k) { return (okP[k] ? '○' : '×') + x + ' <b>' + UI.pt(S.point[k]) + '</b>'; }).join('　') + '</div>' +
      '<div class="exp">' + explain(S) + '</div>';
    document.getElementById('sCheck').disabled = true;
  }
  document.addEventListener('click', function (e) {
    if (e.target.id === 'sCheck') check();
    if (e.target.id === 'sNext') { S = null; Jouken.render(); }
  });
  return { render: render, table: table, explain: explain };
})();
