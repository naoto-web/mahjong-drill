// store.js — 成績をスマホ内に保存（localStorage）
// 形：{ days: { '2026-11-27': { jouken:[解いた数,正解数], ... } }, kitei: { カードID: { ok, ng, last } }, weak: { 部門: { 種類: [数, 正解] } } }
var Store = (function () {
  var KEY = 'mjdrill_v1';
  var data;
  try { data = JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { data = {}; }
  data.days = data.days || {};
  data.kitei = data.kitei || {};
  data.weak = data.weak || {};

  function save() { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) {} }
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
