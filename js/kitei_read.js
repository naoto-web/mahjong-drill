// kitei_read.js — 📜規定タブの「規定を読む」：競技規定の全文（章→条）・検索・穴埋めに出る言葉に色
// 🔴本文はこの公開ページに置かない。スマホで1回だけ取り込んだファイル（kind: mjdrill-kitei）を localStorage に持つ
var KiteiRead = (function () {
  var KEY = 'mjdrill_kitei_text';
  var data = null, q = '', openChap = {}, jumpTo = null, lastError = '';
  // 🪤 localStorage は naoto-web.github.io の自作アプリ全部で約5MBを分け合う＝他のアプリでいっぱいになり取り込めなかった（11/27）
  //    ⇒ 本文は容量の大きい IndexedDB に置く
  var DB = {
    open: function () {
      return new Promise(function (ok, ng) {
        var rq = indexedDB.open('mjdrill', 1);
        rq.onupgradeneeded = function () { rq.result.createObjectStore('kv'); };
        rq.onsuccess = function () { ok(rq.result); };
        rq.onerror = function () { ng(rq.error); };
      });
    },
    get: function (k) {
      return DB.open().then(function (db) {
        return new Promise(function (ok, ng) {
          var rq = db.transaction('kv').objectStore('kv').get(k);
          rq.onsuccess = function () { ok(rq.result); };
          rq.onerror = function () { ng(rq.error); };
        });
      });
    },
    set: function (k, v) {
      return DB.open().then(function (db) {
        return new Promise(function (ok, ng) {
          var tx = db.transaction('kv', 'readwrite');
          tx.objectStore('kv').put(v, k);
          tx.oncomplete = function () { ok(); };
          tx.onerror = function () { ng(tx.error); };
        });
      });
    }
  };
  DB.get(KEY).then(function (d) {
    if (d && d.articles) { data = d; if (document.getElementById('kiteiBody') && !document.getElementById('view-kitei').hidden) Kitei.render(); }
  }).catch(function () {});

  // カードの「第◯条」から、条ごとの穴埋めの答え（色を付ける言葉）と出題歴を集める
  var byArt = {};
  KITEI.forEach(function (c) {
    if (c.cat !== 'ana') return;
    var nos = (c.q.match(/第(\d+)条/g) || []).map(function (s) { return +s.replace(/\D/g, ''); });
    if (/^手積み/.test(c.q)) nos = [99];
    if (/^付則/.test(c.q)) nos = [99];
    nos.forEach(function (no) {
      var b = byArt[no] = byArt[no] || { terms: [], cards: [], asked: false };
      b.cards.push(c.id);
      if ((c.note || '').indexOf('25期後期で出題') >= 0) b.asked = true;
      c.a.replace(/（.*?）/g, '').split(/[①-⑳]|　|／|・|、|→/).forEach(function (t) {
        t = t.trim();
        if (t.length >= 2 && b.terms.indexOf(t) < 0) b.terms.push(t);
      });
    });
  });

  function has() { return !!(data && data.articles); }
  function artLabel(a) { return a.no === 99 ? '付則' : '第' + a.no + '条'; }
  function mark(text, terms, query) {
    var h = UI.esc(text);
    terms.slice().sort(function (x, y) { return y.length - x.length; }).forEach(function (t) {
      var et = UI.esc(t);
      if (h.indexOf(et) >= 0) h = h.split(et).join('\u0001' + et + '\u0002');
    });
    h = h.replace(/\u0001/g, '<em class="ans">').replace(/\u0002/g, '</em>');
    if (query) {
      var eq = UI.esc(query);
      // タグの中は置き換えない
      h = h.split(/(<[^>]+>)/).map(function (part) { return part.charAt(0) === '<' ? part : part.split(eq).join('<mark>' + eq + '</mark>'); }).join('');
    }
    return h;
  }

  function importBox(msg) {
    return '<div class="card"><p><b>競技規定の全文を取り込みます</b></p>' +
      '<p class="small">全文はこの公開ページには置いていません。クロコが作った「競技規定_アプリ取り込み用.json」を1回だけ選ぶと、このスマホの中に保存され、電波がなくても読めます。</p>' +
      (msg ? '<p class="note">' + UI.esc(msg) + '</p>' : '') +
      '<label class="file-btn">ファイルを選ぶ<input id="kiteiFile" type="file"></label></div>';
  }

  function render(root, headHtml) {
    if (!has()) { root.innerHTML = headHtml + importBox(lastError ? '読めませんでした。この文をスクショでクロコへ：' + lastError : ''); return; }
    var arts = data.articles;
    var ql = q.trim();
    var h = headHtml + '<div class="search-row"><input id="kiteiQ" type="search" placeholder="規定の中を探す（例：リーチ、符）" value="' + UI.esc(q) + '" enterkeyhint="search"></div>';
    h += '<p class="small">色つきの言葉＝穴埋めカードの答え。<span class="asked-dot"></span>＝25期後期で出た条。</p>';
    var chaps = [];
    arts.forEach(function (a) { if (chaps.indexOf(a.chap) < 0) chaps.push(a.chap); });
    var hits = 0;
    chaps.forEach(function (ch) {
      var list = arts.filter(function (a) {
        if (a.chap !== ch) return false;
        if (!ql) return true;
        return (a.title + a.body.join('')).indexOf(ql) >= 0;
      });
      if (!list.length) return;
      hits += list.length;
      var open = !!ql || openChap[ch];
      h += '<div class="chap"><button class="chap-h" data-ch="' + UI.esc(ch) + '">' + (open ? '▾ ' : '▸ ') + UI.esc(ch) + '<small>' + list.length + '条</small></button>';
      if (open) {
        list.forEach(function (a) {
          var b = byArt[a.no] || { terms: [], cards: [], asked: false };
          h += '<div class="art" id="art-' + a.no + '"><div class="art-h">' + artLabel(a) + (a.no === 99 ? '' : '　' + UI.esc(a.title)) +
            (b.asked ? '<span class="asked-dot" title="25期後期で出題"></span>' : '') +
            (b.cards.length ? '<button class="art-cards" data-no="' + a.no + '">カード' + b.cards.length + '枚</button>' : '') + '</div>';
          a.body.forEach(function (line) { h += '<p class="art-p">' + mark(line, b.terms, ql) + '</p>'; });
          h += '</div>';
        });
      }
      h += '</div>';
    });
    if (ql && !hits) h += '<div class="card empty">「' + UI.esc(ql) + '」は見つかりませんでした</div>';
    h += '<p class="foot">出典：' + UI.esc(data.source || '') + '<br><button id="kiteiReimport" class="link">ファイルを取り込み直す</button></p>';
    root.innerHTML = h;
    if (jumpTo != null) {
      var el = document.getElementById('art-' + jumpTo);
      jumpTo = null;
      if (el) { el.scrollIntoView({ block: 'start' }); el.classList.add('flash-hl'); }
    }
  }

  function jump(no) {
    if (!has()) return false;
    var a = data.articles.filter(function (x) { return x.no === no; })[0];
    if (!a) return false;
    q = ''; openChap[a.chap] = true; jumpTo = no;
    return true;
  }
  function articleOfCard(c) {
    if (c.cat !== 'ana') return null;
    if (/^(手積み|付則)/.test(c.q)) return 99;
    var m = c.q.match(/第(\d+)条/);
    return m ? +m[1] : null;
  }

  document.addEventListener('change', function (e) {
    if (e.target.id !== 'kiteiFile') return;
    var f = e.target.files[0];
    if (!f) return;
    var r = new FileReader();
    r.onload = function () {
      var text = String(r.result || '').replace(/^﻿/, '');
      var step = '読み取り';
      try {
        step = '中身の解読';
        var d = JSON.parse(text);
        step = '形の確認';
        if (d.kind !== 'mjdrill-kitei' || !d.articles || !d.articles.length) throw new Error('取り込み用のファイルではない');
        step = 'スマホへの保存';
        DB.set(KEY, d).then(function () {
          data = d; lastError = '';
          UI.toast('取り込みました（' + d.articles.length + '条）');
          Kitei.render();
        }).catch(function (err) {
          lastError = 'スマホへの保存で失敗：' + (err && (err.name + ' ' + err.message));
          Kitei.render();
        });
      } catch (err) {
        // 原因が分かるように、どこで止まったかと受け取った中身の様子を画面に出す
        lastError = step + 'で失敗：' + (err && err.message ? err.message : err) +
          '／ファイル名 ' + f.name + '・' + f.size + 'バイト・種類 ' + (f.type || '不明') +
          '・受け取った文字数 ' + text.length + '・先頭「' + text.slice(0, 30) + '」';
        Kitei.render();
      }
    };
    r.onerror = function () { lastError = '読み取りで失敗：' + (r.error && r.error.name) + '／' + f.name + '・' + f.size + 'バイト'; Kitei.render(); };
    r.readAsText(f, 'utf-8');
  });
  document.addEventListener('input', function (e) {
    if (e.target.id !== 'kiteiQ') return;
    q = e.target.value;
    var pos = e.target.selectionStart;
    Kitei.render();
    var el = document.getElementById('kiteiQ');
    if (el) { el.focus(); try { el.setSelectionRange(pos, pos); } catch (x) {} }
  });
  document.addEventListener('click', function (e) {
    if (!e.target.closest('#kiteiBody')) return;
    var ch = e.target.closest('.chap-h');
    if (ch) { var k = ch.dataset.ch; openChap[k] = !openChap[k]; Kitei.render(); return; }
    var ac = e.target.closest('.art-cards');
    if (ac) { Kitei.practiceArticle(+ac.dataset.no); return; }
    if (e.target.id === 'kiteiReimport') { data = null; Kitei.render(); }
  });

  return { render: render, has: has, jump: jump, articleOfCard: articleOfCard, cardsOf: function (no) { return (byArt[no] || { cards: [] }).cards; } };
})();
