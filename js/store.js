// store.js — 成績をスマホ内に保存
// 形：{ days: { '2026-11-27': { jouken:[解いた数,正解数], ... } }, kitei: { カードID: { ok, ng, last } }, weak: { 部門: { 種類: [数, 正解] } } }
// 🪤 localStorage は naoto-web.github.io の自作アプリ全部で約5MBを分け合う＝他のアプリでいっぱいだと書けない（11/27 規定の取り込みで発覚）
//    ⇒ 正本は IndexedDB（mjdrill/kv の 'stats'）。起動直後は localStorage の写しで画面を出し、IndexedDB を読んだら差し替える
var Store = (function () {
  var KEY = 'mjdrill_v1';
  var data;
  try { data = JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { data = {}; }
  norm();

  function norm() { data.days = data.days || {}; data.kitei = data.kitei || {}; data.weak = data.weak || {}; }
  function db() {
    return new Promise(function (ok, ng) {
      var rq = indexedDB.open('mjdrill', 1);
      rq.onupgradeneeded = function () { rq.result.createObjectStore('kv'); };
      rq.onsuccess = function () { ok(rq.result); };
      rq.onerror = function () { ng(rq.error); };
    });
  }
  db().then(function (d) {
    var rq = d.transaction('kv').objectStore('kv').get('stats');
    rq.onsuccess = function () {
      if (rq.result) { data = rq.result; norm(); }
      else save(); // 初回：localStorage にあった記録を IndexedDB へ移す
      if (window.Home && !document.getElementById('view-home').hidden) Home.render();
    };
  }).catch(function () {});

  function save() {
    db().then(function (d) { d.transaction('kv', 'readwrite').objectStore('kv').put(JSON.parse(JSON.stringify(data)), 'stats'); }).catch(function () {});
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) {}
  }
  function today() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  // 1問ぶんの記録。sec＝jouken/sheet/tensu/table/kitei、kind＝苦手を数える種類（任意）
  function record(sec, ok, kind) {
    var d = data.days[today()] = data.days[today()] || {};
    var a = d[sec] = d[sec] || [0, 0];
    a[0]++; if (ok) a[1]++;
    if (kind) {
      var w = data.weak[sec] = data.weak[sec] || {};
      var b = w[kind] = w[kind] || [0, 0];
      b[0]++; if (ok) b[1]++;
    }
    save();
  }
  function day(sec, date) { var d = data.days[date || today()]; return (d && d[sec]) || [0, 0]; }
  function total(sec) {
    var s = [0, 0];
    Object.keys(data.days).forEach(function (k) { var a = data.days[k][sec]; if (a) { s[0] += a[0]; s[1] += a[1]; } });
    return s;
  }
  function weak(sec) { return data.weak[sec] || {}; }
  function card(id, ok) {
    var c = data.kitei[id] = data.kitei[id] || { ok: 0, ng: 0, last: '' };
    if (ok) c.ok++; else c.ng++;
    c.last = ok ? 'ok' : 'ng';
    record('kitei', ok);
  }
  function cardInfo(id) { return data.kitei[id] || null; }
  function isWeakCard(id) { var c = data.kitei[id]; return !!c && c.last === 'ng'; }
  function reset() { data = { days: {}, kitei: {}, weak: {} }; save(); }
  return { record: record, day: day, total: total, weak: weak, card: card, cardInfo: cardInfo, isWeakCard: isWeakCard, reset: reset, today: today };
})();
