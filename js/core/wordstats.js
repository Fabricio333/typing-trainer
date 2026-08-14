/* Per-word speed history, accumulated across every test you ever run.
 *
 * The pure parts (mergeTimings, rank) take and return plain objects so they can
 * be unit tested without a browser; the rest is a thin persistence wrapper. */
(function (TT) {
  'use strict';

  /* Timings outside this range are not typing, they are life happening —
   * a phone call mid-word would otherwise permanently mark that word as hard. */
  var MIN_MS = 40;
  var MAX_MS = 10000;

  var DEFAULT_MIN_SAMPLES = 2;
  var RECENT_WEIGHT = 0.2;

  /* n/ms are lifetime totals; recentMs is the weighted average used for
   * ranking so hundreds of old attempts cannot bury current improvement. */
  function emptyEntry() {
    return { n: 0, ms: 0, recentMs: 0, best: 0, err: 0 };
  }

  /* Folds one test's timings into an existing map. Pure: returns a new map. */
  function mergeTimings(map, timings) {
    var out = {};
    var k;
    for (k in map || {}) {
      if (Object.prototype.hasOwnProperty.call(map, k)) {
        out[k] = {
          n: map[k].n || 0,
          ms: map[k].ms || 0,
          recentMs: map[k].recentMs || 0,
          best: map[k].best || 0,
          err: map[k].err || 0
        };
      }
    }

    (timings || []).forEach(function (t) {
      if (!t || !t.word) return;
      if (!out[t.word]) out[t.word] = emptyEntry();
      var e = out[t.word];

      if (!t.correct) {
        e.err++;
        return;   // a mistyped word tells us nothing useful about speed
      }
      if (!(t.ms >= MIN_MS && t.ms <= MAX_MS)) return;

      var previous = e.recentMs || (e.n > 0 ? e.ms / e.n : t.ms);
      e.recentMs = previous + RECENT_WEIGHT * (t.ms - previous);
      e.n++;
      e.ms += t.ms;
      e.best = e.best === 0 ? t.ms : Math.min(e.best, t.ms);
    });

    return out;
  }

  /* Ranks words hardest-first.
   *
   * Ranking by raw time would just surface the longest words, so the metric is
   * milliseconds per keystroke — the average gap between key presses while
   * typing that word. That is what "this word is hard for me" means
   * independently of how many letters it happens to have.
   *
   * Deriving it from time, attempts and word length keeps the result auditable
   * and avoids trusting a separate accumulated divisor that can drift. */
  function rank(map, opts) {
    var o = opts || {};
    var minSamples = o.minSamples === undefined ? DEFAULT_MIN_SAMPLES : o.minSamples;
    var rows = [];

    for (var word in map || {}) {
      if (!Object.prototype.hasOwnProperty.call(map, word)) continue;
      var e = map[word];
      if (!e || e.n < minSamples || !word.length) continue;
      if (o.allow && !o.allow(word)) continue;

      var avgMs = e.recentMs || e.ms / e.n;
      var unitsPerWord = word.length + 1; // letters plus the committing space
      var msPerChar = avgMs / unitsPerWord;
      rows.push({
        word: word,
        n: e.n,
        err: e.err || 0,
        avgMs: avgMs,
        bestMs: e.best,
        bestWpm: e.best > 0 ? 60000 / ((e.best / unitsPerWord) * 5) : 0,
        msPerChar: msPerChar,
        wpm: msPerChar > 0 ? 60000 / (msPerChar * 5) : 0
      });
    }

    rows.sort(function (a, b) {
      return b.msPerChar - a.msPerChar || b.n - a.n || a.word.localeCompare(b.word);
    });

    return o.limit ? rows.slice(0, o.limit) : rows;
  }

  /* ── persistence ───────────────────────────────────────────────── */

  function readAll() {
    if (!TT.storage) return {};
    var raw = TT.storage.read('wordstats', {});
    return raw && typeof raw === 'object' ? raw : {};
  }

  function all(lang) {
    var store = readAll();
    return store[lang] && typeof store[lang] === 'object' ? store[lang] : {};
  }

  function record(lang, timings) {
    if (!TT.storage) return {};
    var store = readAll();
    store[lang] = mergeTimings(store[lang] || {}, timings);
    TT.storage.write('wordstats', store);
    return store[lang];
  }

  /* Only real dictionary words may surface as "hardest": older histories can
   * carry letter chunks from finger drills and pattern practice ("fjjf"), and
   * quote or punctuation runs record decorated tokens ("The,") — none of which
   * belong in a word drill. The junk stays in storage but never ranks. */
  function dictionary(lang) {
    var list = (TT.data && TT.data.words && TT.data.words[lang]) || [];
    if (!list.length) return null;
    var set = Object.create(null);
    for (var i = 0; i < list.length; i++) set[list[i]] = true;
    return set;
  }

  function hardest(lang, limit, minSamples) {
    var dict = dictionary(lang);
    return rank(all(lang), {
      limit: limit,
      minSamples: minSamples,
      allow: dict && function (w) { return dict[w] === true; }
    });
  }

  /* How many words have enough samples to be ranked — used to tell the user
   * whether the drill has anything to work with yet. */
  function rankableCount(lang, minSamples) {
    var dict = dictionary(lang);
    return rank(all(lang), {
      minSamples: minSamples,
      allow: dict && function (w) { return dict[w] === true; }
    }).length;
  }

  function totals(lang) {
    var map = all(lang);
    var words = 0, plays = 0, ms = 0;
    for (var k in map) {
      if (!Object.prototype.hasOwnProperty.call(map, k)) continue;
      words++;
      plays += map[k].n || 0;
      ms += map[k].ms || 0;
    }
    return { words: words, plays: plays, ms: ms };
  }

  function reset() {
    if (TT.storage) TT.storage.remove('wordstats');
  }

  TT.wordstats = {
    mergeTimings: mergeTimings,
    rank: rank,
    all: all,
    record: record,
    hardest: hardest,
    rankableCount: rankableCount,
    totals: totals,
    reset: reset,
    MIN_MS: MIN_MS,
    MAX_MS: MAX_MS,
    DEFAULT_MIN_SAMPLES: DEFAULT_MIN_SAMPLES
  };
})(typeof window !== 'undefined'
  ? (window.TT = window.TT || {})
  : (global.TT = global.TT || {}));
