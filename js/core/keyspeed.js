/* Per-key-transition speed history — which pairs of keys are slow to type in
 * sequence, accumulated across every test. This is what the "your slowest
 * combinations" lesson drills.
 *
 * Same split as wordstats: the pure parts (fromLog, merge, rank) are plain
 * functions over plain objects so they can be unit tested in node; the rest is
 * a thin persistence wrapper. */
(function (TT) {
  'use strict';

  /* Tighter than the word bounds: a transition longer than this is a pause to
   * think about the word, which wordstats already accounts for. */
  var MIN_MS = 40;
  var MAX_MS = 2000;

  var DEFAULT_MIN_SAMPLES = 3;

  /* Extracts transition timings from an engine keystroke log. Only cleanly
   * typed transitions count: both keys correct, inside the same word, and a
   * plausible interval apart — an error or a backspace detour in between shows
   * up as an `ok: false` entry and breaks the chain. */
  function fromLog(log) {
    var out = [];
    var list = log || [];
    for (var i = 1; i < list.length; i++) {
      var a = list[i - 1];
      var b = list[i];
      if (!a.ok || !b.ok) continue;
      if (a.word !== b.word) continue;
      if (a.char === ' ' || b.char === ' ') continue;
      if (String(a.char).length !== 1 || String(b.char).length !== 1) continue;
      var ms = b.t - a.t;
      if (!(ms >= MIN_MS && ms <= MAX_MS)) continue;
      out.push({ pair: a.char + b.char, ms: ms });
    }
    return out;
  }

  /* Folds one test's transitions into an existing map. Pure: returns a new map. */
  function merge(map, timings) {
    var out = {};
    for (var k in map || {}) {
      if (Object.prototype.hasOwnProperty.call(map, k)) {
        out[k] = { n: map[k].n || 0, ms: map[k].ms || 0, best: map[k].best || 0 };
      }
    }
    (timings || []).forEach(function (t) {
      if (!t || !t.pair || t.pair.length !== 2) return;
      if (!(t.ms >= MIN_MS && t.ms <= MAX_MS)) return;
      if (!out[t.pair]) out[t.pair] = { n: 0, ms: 0, best: 0 };
      var e = out[t.pair];
      e.n++;
      e.ms += t.ms;
      e.best = e.best === 0 ? t.ms : Math.min(e.best, t.ms);
    });
    return out;
  }

  /* Slowest transitions first, by average interval. */
  function rank(map, opts) {
    var o = opts || {};
    var minSamples = o.minSamples === undefined ? DEFAULT_MIN_SAMPLES : o.minSamples;
    var rows = [];
    for (var pair in map || {}) {
      if (!Object.prototype.hasOwnProperty.call(map, pair)) continue;
      var e = map[pair];
      if (!e || e.n < minSamples || pair.length !== 2) continue;
      rows.push({ pair: pair, n: e.n, avgMs: e.ms / e.n, bestMs: e.best });
    }
    rows.sort(function (a, b) {
      return b.avgMs - a.avgMs || b.n - a.n || a.pair.localeCompare(b.pair);
    });
    return o.limit ? rows.slice(0, o.limit) : rows;
  }

  /* Per-key speed, folded out of the same transition map: a pair "ab" measures
   * how long the b took once the a was already down, so every pair is a sample
   * for its second key. The first key of a word has no preceding transition and
   * simply contributes nothing — there is no honest interval to attribute to it.
   *
   * Slowest key first, same shape as rank(). */
  function perKey(map, opts) {
    var o = opts || {};
    var minSamples = o.minSamples === undefined ? DEFAULT_MIN_SAMPLES : o.minSamples;
    var acc = {};
    for (var pair in map || {}) {
      if (!Object.prototype.hasOwnProperty.call(map, pair)) continue;
      var e = map[pair];
      if (!e || pair.length !== 2 || !e.n) continue;
      var ch = pair.charAt(1);
      if (!acc[ch]) acc[ch] = { n: 0, ms: 0, best: 0 };
      acc[ch].n += e.n;
      acc[ch].ms += e.ms;
      acc[ch].best = acc[ch].best === 0 ? e.best : Math.min(acc[ch].best, e.best || acc[ch].best);
    }

    var rows = [];
    for (var key in acc) {
      if (!Object.prototype.hasOwnProperty.call(acc, key)) continue;
      var a = acc[key];
      if (a.n < minSamples) continue;
      var avgMs = a.ms / a.n;
      rows.push({
        key: key,
        n: a.n,
        avgMs: avgMs,
        bestMs: a.best,
        wpm: avgMs > 0 ? 60000 / (avgMs * 5) : 0
      });
    }
    rows.sort(function (x, y) {
      return y.avgMs - x.avgMs || y.n - x.n || x.key.localeCompare(y.key);
    });
    return o.limit ? rows.slice(0, o.limit) : rows;
  }

  /* ── persistence ───────────────────────────────────────────────── */

  function readAll() {
    if (!TT.storage) return {};
    var raw = TT.storage.read('keyspeed', {});
    return raw && typeof raw === 'object' ? raw : {};
  }

  function all(lang) {
    var store = readAll();
    return store[lang] && typeof store[lang] === 'object' ? store[lang] : {};
  }

  function record(lang, timings) {
    if (!TT.storage) return {};
    var store = readAll();
    store[lang] = merge(store[lang] || {}, timings);
    TT.storage.write('keyspeed', store);
    return store[lang];
  }

  function slowest(lang, limit, minSamples) {
    return rank(all(lang), { limit: limit, minSamples: minSamples });
  }

  function keys(lang, limit, minSamples) {
    return perKey(all(lang), { limit: limit, minSamples: minSamples });
  }

  function reset() {
    if (TT.storage) TT.storage.remove('keyspeed');
  }

  TT.keyspeed = {
    fromLog: fromLog,
    merge: merge,
    rank: rank,
    perKey: perKey,
    all: all,
    record: record,
    slowest: slowest,
    keys: keys,
    reset: reset,
    MIN_MS: MIN_MS,
    MAX_MS: MAX_MS,
    DEFAULT_MIN_SAMPLES: DEFAULT_MIN_SAMPLES
  };
})(typeof window !== 'undefined'
  ? (window.TT = window.TT || {})
  : (global.TT = global.TT || {}));
