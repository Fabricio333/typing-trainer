/* Versioned localStorage wrapper.
 * Degrades to an in-memory store when localStorage is missing or throws
 * (private browsing, quota exceeded, file:// on some browsers). */
(function (TT) {
  'use strict';

  var PREFIX = 'tt.';
  var VERSION = 'v1';
  var memory = {};
  var persistent = probe();

  function probe() {
    try {
      var k = PREFIX + 'probe';
      window.localStorage.setItem(k, '1');
      window.localStorage.removeItem(k);
      return true;
    } catch (e) {
      return false;
    }
  }

  function key(name) {
    return PREFIX + name + '.' + VERSION;
  }

  function read(name, fallback) {
    var k = key(name);
    var raw = null;
    if (persistent) {
      try {
        raw = window.localStorage.getItem(k);
      } catch (e) {
        persistent = false;
      }
    }
    if (raw === null || raw === undefined) raw = memory[k];
    if (raw === null || raw === undefined) return fallback;
    try {
      var parsed = JSON.parse(raw);
      return parsed === null || parsed === undefined ? fallback : parsed;
    } catch (e) {
      return fallback;
    }
  }

  function write(name, value) {
    var k = key(name);
    var raw;
    try {
      raw = JSON.stringify(value);
    } catch (e) {
      return false;
    }
    memory[k] = raw;
    if (!persistent) return false;
    try {
      window.localStorage.setItem(k, raw);
      return true;
    } catch (e) {
      // Quota exceeded or storage disabled mid-session: keep going in memory.
      persistent = false;
      return false;
    }
  }

  function remove(name) {
    var k = key(name);
    delete memory[k];
    if (!persistent) return;
    try {
      window.localStorage.removeItem(k);
    } catch (e) {
      persistent = false;
    }
  }

  /* Every store the app writes. Export, import and reset all walk this list,
   * so a new store MUST be added here or it silently escapes all three. */
  var NAMES = ['settings', 'progress', 'results', 'keystats',
               'wordstats', 'keyspeed', 'session'];

  function exportAll() {
    var out = { version: VERSION, exportedAt: new Date().toISOString(), data: {} };
    NAMES.forEach(function (n) {
      out.data[n] = read(n, null);
    });
    return out;
  }

  function importAll(blob) {
    if (!blob || typeof blob !== 'object' || !blob.data) {
      throw new Error('Not a typing-trainer export file.');
    }
    NAMES.forEach(function (n) {
      if (blob.data[n] !== null && blob.data[n] !== undefined) write(n, blob.data[n]);
    });
  }

  function clearAll() {
    NAMES.forEach(remove);
  }

  TT.storage = {
    read: read,
    write: write,
    remove: remove,
    exportAll: exportAll,
    importAll: importAll,
    clearAll: clearAll,
    isPersistent: function () { return persistent; },
    NAMES: NAMES
  };
})(window.TT = window.TT || {});
