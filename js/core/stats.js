/* Result maths. DOM-free so it can be unit tested in node.
 *
 * Deliberate split:
 *   - speed comes from the FINAL state (what actually ended up on screen)
 *   - accuracy comes from the KEYSTROKE LOG, so a mistake you went back and
 *     fixed still counts against you. Final-state accuracy would let you type
 *     badly, correct everything, and score 100%.
 */
(function (TT) {
  'use strict';

  var CHARS_PER_WORD = 5;

  function breakdown(state) {
    var correct = 0, incorrect = 0, extra = 0, missed = 0;
    var reached = Math.min(state.wordIndex, state.words.length - 1);

    for (var i = 0; i <= reached; i++) {
      var want = typeof state.words[i] === 'string' ? state.words[i] : '';
      var typed = typeof state.input[i] === 'string' ? state.input[i] : '';
      var shared = Math.min(want.length, typed.length);

      for (var j = 0; j < shared; j++) {
        if (typed.charAt(j) === want.charAt(j)) correct++;
        else incorrect++;
      }
      if (typed.length > want.length) extra += typed.length - want.length;
      // Only a word the user moved past can be "missing" characters; the word
      // still under the caret is simply unfinished.
      else if (i < state.wordIndex) missed += want.length - typed.length;
    }

    // Spaces come from the log rather than the word count: the last word of a
    // test is completed without a trailing space, so counting one per committed
    // word would invent a keystroke that was never made.
    var spaces = 0;
    for (var s = 0; s < state.log.length; s++) {
      if (state.log[s].char === ' ' && state.log[s].ok) spaces++;
    }

    return {
      correct: correct,
      incorrect: incorrect,
      extra: extra,
      missed: missed,
      spaces: spaces
    };
  }

  function accuracyFromLog(log) {
    var total = 0, ok = 0;
    for (var i = 0; i < log.length; i++) {
      total++;
      if (log[i].ok) ok++;
    }
    return { total: total, ok: ok, pct: total === 0 ? 100 : (ok / total) * 100 };
  }

  /* Per-second cumulative WPM series, plus error counts per second, for the chart. */
  function series(log, seconds) {
    var span = Math.max(1, Math.ceil(seconds));
    var out = [];
    var okCount = 0, allCount = 0, cursor = 0;

    for (var s = 1; s <= span; s++) {
      var errorsThisSecond = 0;
      while (cursor < log.length && log[cursor].t / 1000 <= s) {
        allCount++;
        if (log[cursor].ok) okCount++;
        else errorsThisSecond++;
        cursor++;
      }
      var minutes = s / 60;
      out.push({
        second: s,
        wpm: (okCount / CHARS_PER_WORD) / minutes,
        raw: (allCount / CHARS_PER_WORD) / minutes,
        errors: errorsThisSecond
      });
    }
    return out;
  }

  /* Coefficient of variation over per-second speed. 100 = perfectly even pace. */
  function consistency(log, seconds) {
    var span = Math.max(1, Math.ceil(seconds));
    if (span < 2 || log.length === 0) return 0;

    var buckets = new Array(span);
    for (var i = 0; i < span; i++) buckets[i] = 0;
    for (var k = 0; k < log.length; k++) {
      if (!log[k].ok) continue;
      var idx = Math.min(span - 1, Math.floor(log[k].t / 1000));
      if (idx >= 0) buckets[idx]++;
    }

    var perMinute = buckets.map(function (n) { return (n / CHARS_PER_WORD) * 60; });
    var mean = perMinute.reduce(function (a, b) { return a + b; }, 0) / perMinute.length;
    if (mean <= 0) return 0;

    var variance = perMinute.reduce(function (a, v) {
      return a + (v - mean) * (v - mean);
    }, 0) / perMinute.length;
    var cv = Math.sqrt(variance) / mean;
    return clamp(100 * (1 - cv), 0, 100);
  }

  /* hits/misses keyed by the character the user was *supposed* to type. */
  function keyStats(log) {
    var map = {};
    for (var i = 0; i < log.length; i++) {
      var e = log[i];
      if (e.expected === null || e.expected === undefined) continue;
      if (e.expected === ' ') continue;
      var k = e.expected;
      if (!map[k]) map[k] = { hits: 0, misses: 0 };
      if (e.ok) map[k].hits++;
      else map[k].misses++;
    }
    return map;
  }

  function mergeKeyStats(base, addition) {
    var out = {};
    [base || {}, addition || {}].forEach(function (src) {
      for (var k in src) {
        if (!Object.prototype.hasOwnProperty.call(src, k)) continue;
        if (!out[k]) out[k] = { hits: 0, misses: 0 };
        out[k].hits += src[k].hits || 0;
        out[k].misses += src[k].misses || 0;
      }
    });
    return out;
  }

  /* Keys sorted worst-first, ignoring keys with too little data to mean anything. */
  function worstKeys(map, limit, minSamples) {
    var min = minSamples === undefined ? 5 : minSamples;
    var rows = [];
    for (var k in map) {
      if (!Object.prototype.hasOwnProperty.call(map, k)) continue;
      var total = (map[k].hits || 0) + (map[k].misses || 0);
      if (total < min || !map[k].misses) continue;
      rows.push({ key: k, total: total, misses: map[k].misses, rate: map[k].misses / total });
    }
    rows.sort(function (a, b) { return b.rate - a.rate || b.total - a.total; });
    return rows.slice(0, limit || 10);
  }

  function clamp(v, lo, hi) {
    return v < lo ? lo : v > hi ? hi : v;
  }

  /* How long each individual word took.
   *
   * A word's time runs from the moment the previous word was committed to the
   * moment this one is — so the pause before starting to type it counts, which
   * is where most of the difficulty in a hard word actually lives.
   *
   * A word committed more than once (because the user stepped back to fix it)
   * is only recorded the first time; the later timing would span everything
   * typed in between and be meaningless. */
  function wordTimings(state) {
    var out = [];
    var segmentStart = 0;
    var recorded = {};

    function push(index, ms) {
      if (recorded[index]) return;
      var want = typeof state.words[index] === 'string' ? state.words[index] : '';
      var typed = typeof state.input[index] === 'string' ? state.input[index] : '';
      if (!want) return;
      recorded[index] = true;
      out.push({
        word: want,
        typed: typed,
        correct: typed === want,
        chars: want.length,
        ms: ms
      });
    }

    for (var i = 0; i < state.log.length; i++) {
      var e = state.log[i];
      if (e.char !== ' ') continue;
      push(e.word, e.t - segmentStart);
      segmentStart = e.t;
    }

    // The final word of a finite test completes without a trailing space.
    var last = state.log[state.log.length - 1];
    if (state.finishedAt !== null && last && last.char !== ' ') {
      push(last.word, last.t - segmentStart);
    }

    return out;
  }

  function summarize(state, endedAt) {
    var end = state.finishedAt === null ? endedAt : state.finishedAt;
    var seconds = state.startedAt === null ? 0 : (end - state.startedAt) / 1000;
    var b = breakdown(state);
    var acc = accuracyFromLog(state.log);

    var minutes = seconds / 60;
    var netChars = b.correct + b.spaces;
    var rawChars = b.correct + b.incorrect + b.extra + b.spaces;

    return {
      wpm: minutes > 0 ? (netChars / CHARS_PER_WORD) / minutes : 0,
      raw: minutes > 0 ? (rawChars / CHARS_PER_WORD) / minutes : 0,
      accuracy: acc.pct,
      consistency: consistency(state.log, seconds),
      seconds: seconds,
      keystrokes: acc.total,
      chars: b,
      series: series(state.log, seconds),
      keys: keyStats(state.log),
      mode: state.mode
    };
  }

  TT.stats = {
    summarize: summarize,
    wordTimings: wordTimings,
    breakdown: breakdown,
    accuracyFromLog: accuracyFromLog,
    consistency: consistency,
    series: series,
    keyStats: keyStats,
    mergeKeyStats: mergeKeyStats,
    worstKeys: worstKeys,
    CHARS_PER_WORD: CHARS_PER_WORD
  };
})(typeof window !== 'undefined'
  ? (window.TT = window.TT || {})
  : (global.TT = global.TT || {}));
