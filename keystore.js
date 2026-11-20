// Ключ GitHub «Головы»: хранится в двух местах (localStorage + IndexedDB) и просит браузер
// не стирать хранилище. Если одно место потерялось (сбой Chrome, очистка), ключ берётся из второго.
(function () {
  var K = 'cg2-token';
  function lsGet() { try { return localStorage.getItem(K) || ''; } catch (e) { return ''; } }
  function lsSet(v) { try { localStorage.setItem(K, v); } catch (e) {} }
  function db() {
    return new Promise(function (res, rej) {
      var r = indexedDB.open('golova-key', 1);
      r.onupgradeneeded = function () { r.result.createObjectStore('kv'); };
      r.onsuccess = function () { res(r.result); };
      r.onerror = function () { rej(r.error); };
    });
  }
  function idbGet() {
    return db().then(function (d) {
      return new Promise(function (res) {
        var q = d.transaction('kv').objectStore('kv').get(K);
        q.onsuccess = function () { res(q.result || ''); };
        q.onerror = function () { res(''); };
      });
    }).catch(function () { return ''; });
  }
  function idbSet(v) {
    return db().then(function (d) {
      return new Promise(function (res) {
        var t = d.transaction('kv', 'readwrite');
        t.objectStore('kv').put(v, K);
        t.oncomplete = res; t.onerror = res; t.onabort = res;
      });
    }).catch(function () {});
  }
  try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) {}
  window.GKey = {
    get: lsGet,
    set: function (v) { lsSet(v); return idbSet(v); },
    clear: function () { lsSet(''); return idbSet(''); },
    // вызывать при запуске: чинит ту копию, которая пропала, и возвращает ключ
    restore: function () {
      var a = lsGet();
      return idbGet().then(function (b) {
        if (a && a !== b) idbSet(a);
        if (!a && b) lsSet(b);
        return a || b;
      });
    }
  };
})();
