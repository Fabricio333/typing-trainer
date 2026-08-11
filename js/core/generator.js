/* Turns the word/pattern/quote data plus the current settings into a sequence of
 * "words" for the engine to consume. DOM-free and unit tested.
 *
 * Randomness is injectable so tests can pin it. */
(function (TT) {
  'use strict';

  var PUNCT_WRAP = [
    { open: '"', close: '"' },
    { open: "'", close: "'" },
    { open: '(', close: ')' }
  ];
  var PUNCT_TAIL = ['.', ',', '.', ',', '!', '?', ';', ':', '...', '.', ','];
  var ES_LEAD = { '?': '¿', '!': '¡' };

  function defaultRandom() { return Math.random(); }

  function pick(list, random) {
    return list[Math.floor((random || defaultRandom)() * list.length)];
  }

  function pool(lang, size) {
    var words = (TT.data && TT.data.words && TT.data.words[lang]) || [];
    if (!words.length) return [];
    var n = size && size > 0 ? Math.min(size, words.length) : words.length;
    return words.slice(0, n);
  }

  /* Capitalise, wrap in quotes/brackets, and hang punctuation off the end.
   * Spanish gets its opening ¿ ¡ so the pair is practised together. */
  function punctuate(words, lang, random) {
    var rnd = random || defaultRandom;
    var out = words.slice();
    var sentenceStart = 0;

    for (var i = 0; i < out.length; i++) {
      var isLast = i === out.length - 1;
      // ~18% of words end a sentence, and the final word always does.
      var ends = isLast || (i - sentenceStart >= 3 && rnd() < 0.18);

      if (rnd() < 0.05 && !ends) {
        var wrap = pick(PUNCT_WRAP, rnd);
        out[i] = wrap.open + out[i] + wrap.close;
      }

      if (ends) {
        var mark = pick(PUNCT_TAIL, rnd);
        // Mid-sentence marks shouldn't terminate it.
        if (mark === ',' || mark === ';' || mark === ':') {
          if (!isLast) {
            out[i] = out[i] + mark;
            continue;
          }
          mark = '.';
        }
        out[i] = out[i] + mark;
        if (lang === 'es' && ES_LEAD[mark.charAt(mark.length - 1)]) {
          out[sentenceStart] = ES_LEAD[mark.charAt(mark.length - 1)] + out[sentenceStart];
        }
        out[sentenceStart] = capitalize(out[sentenceStart]);
        sentenceStart = i + 1;
      }
    }
    if (out.length) out[0] = capitalize(out[0]);
    return out;
  }

  function capitalize(w) {
    if (!w) return w;
    // Skip any leading ¿ ¡ " ' ( so the letter itself gets capitalised.
    var i = 0;
    while (i < w.length && /[¿¡"'(]/.test(w.charAt(i))) i++;
    return w.slice(0, i) + w.charAt(i).toUpperCase() + w.slice(i + 1);
  }

  function sprinkleNumbers(words, random, rate) {
    var rnd = random || defaultRandom;
    var chance = rate === undefined ? 0.12 : rate;
    return words.map(function (w) {
      if (rnd() >= chance) return w;
      var digits = 1 + Math.floor(rnd() * 4);
      var n = '';
      for (var i = 0; i < digits; i++) n += Math.floor(rnd() * 10);
      return n;
    });
  }

  /* Weighted draw favouring the patterns the user actually fails.
   * keyStats is the aggregated { char: {hits, misses} } map. */
  function weightPatterns(patterns, keyStats, random) {
    var rnd = random || defaultRandom;
    if (!keyStats) return pick(patterns, rnd);

    var weighted = [];
    for (var i = 0; i < patterns.length; i++) {
      var p = patterns[i];
      var weight = 1;
      for (var j = 0; j < p.length; j++) {
        var s = keyStats[p.charAt(j)];
        if (!s) continue;
        var total = (s.hits || 0) + (s.misses || 0);
        if (total < 3) continue;
        // Up to 5x more likely for a key missed half the time.
        weight += (s.misses / total) * 8;
      }
      weighted.push({ p: p, w: weight });
    }
    var sum = weighted.reduce(function (a, x) { return a + x.w; }, 0);
    var roll = rnd() * sum;
    for (var k = 0; k < weighted.length; k++) {
      roll -= weighted[k].w;
      if (roll <= 0) return weighted[k].p;
    }
    return weighted[weighted.length - 1].p;
  }

  /* opts:
   *   lang 'en'|'es', count, poolSize,
   *   punctuation, numbers (bool),
   *   source 'words'|'patterns',
   *   patternKind 'bigrams'|'trigrams'|'clusters'|'mixed',
   *   adaptive (bool), keyStats, random */
  function words(opts) {
    var o = opts || {};
    var rnd = o.random || defaultRandom;
    var lang = o.lang || 'en';
    var count = o.count || 25;
    var out = [];

    if (o.source === 'patterns') {
      var sets = (TT.data && TT.data.patterns && TT.data.patterns[lang]) || {};
      var kind = o.patternKind || 'mixed';
      var list = kind === 'mixed'
        ? [].concat(sets.bigrams || [], sets.trigrams || [], sets.clusters || [])
        : (sets[kind] || []);
      if (!list.length) return [];
      for (var i = 0; i < count; i++) {
        out.push(o.adaptive ? weightPatterns(list, o.keyStats, rnd) : pick(list, rnd));
      }
    } else {
      var src = pool(lang, o.poolSize);
      if (!src.length) return [];
      var last = null;
      for (var j = 0; j < count; j++) {
        var w = pick(src, rnd);
        // Avoid immediate repeats; they read as a glitch rather than a drill.
        if (w === last && src.length > 1) w = pick(src, rnd);
        out.push(w);
        last = w;
      }
    }

    if (o.numbers) out = sprinkleNumbers(out, rnd);
    if (o.punctuation) out = punctuate(out, lang, rnd);

    // A zero-length word would strand the caret with nothing to type.
    return out.filter(function (w) { return typeof w === 'string' && w.length > 0; });
  }

  function shuffle(list, random) {
    var rnd = random || defaultRandom;
    var out = list.slice();
    for (var i = out.length - 1; i > 0; i--) {
      var j = Math.floor(rnd() * (i + 1));
      var tmp = out[i];
      out[i] = out[j];
      out[j] = tmp;
    }
    return out;
  }

  /* Repetition drill over a fixed set of words.
   *
   * Draws by cycling a reshuffled copy rather than picking at random, so every
   * word in the set comes up the same number of times — the point of the drill
   * is even practice, not a random sample. */
  function drill(list, count, random) {
    var rnd = random || defaultRandom;
    var clean = (list || []).filter(function (w) {
      return typeof w === 'string' && w.length > 0;
    });
    if (!clean.length) return [];

    var out = [];
    var bag = [];
    while (out.length < count) {
      if (!bag.length) bag = shuffle(clean, rnd);
      var next = bag.pop();
      // Avoid an immediate repeat across a bag boundary.
      if (out.length && next === out[out.length - 1] && bag.length) {
        var alt = bag.pop();
        bag.push(next);
        next = alt;
      }
      out.push(next);
    }
    return out;
  }

  function dedupe(list) {
    var seen = {};
    return list.filter(function (w) {
      if (seen[w]) return false;
      seen[w] = true;
      return true;
    });
  }

  /* Drill over slow key pairs: each pair as a bare chunk plus a couple of real
   * words containing it, so the transition is practised in the context where it
   * actually occurs — not only as an isolated two-letter exercise.
   * opts: { lang, pairs, count, random } */
  function pairDrill(opts) {
    var o = opts || {};
    var rnd = o.random || defaultRandom;
    var src = pool(o.lang || 'en', 0);
    var set = [];
    (o.pairs || []).forEach(function (p) {
      set.push(p);
      var carriers = src.filter(function (w) { return w.indexOf(p) !== -1; });
      set = set.concat(shuffle(carriers, rnd).slice(0, 2));
    });
    set = dedupe(set);
    return set.length ? drill(set, o.count || 30, rnd) : [];
  }

  /* Drill for specific keys — the slowest ones from the stats screen. Real
   * words containing each key carry the practice; the learner's slowest pairs
   * into those keys (opts.pairs) are mixed in as chunks.
   * opts: { lang, keys, pairs, count, random } */
  function keyDrill(opts) {
    var o = opts || {};
    var rnd = o.random || defaultRandom;
    var src = pool(o.lang || 'en', 0);
    var set = [];
    (o.keys || []).forEach(function (k) {
      var carriers = src.filter(function (w) { return w.indexOf(k) !== -1; });
      set = set.concat(shuffle(carriers, rnd).slice(0, 6));
    });
    set = dedupe(set.concat(o.pairs || []));
    return set.length ? drill(set, o.count || 40, rnd) : [];
  }

  /* The quote that gives the learner's slow spots the most work: candidates are
   * scored by how densely they contain the given pairs, per character, so a
   * long quote does not win on length alone. Same shape as quote().
   * opts: { lang, pairs, avoid, random } */
  function hardestQuote(opts) {
    var o = opts || {};
    var rnd = o.random || defaultRandom;
    var lang = o.lang || 'en';
    var all = (TT.data && TT.data.quotes && TT.data.quotes[lang]) || [];
    if (!all.length) return { words: [], source: '', text: '' };

    var candidates = all;
    if (o.avoid && o.avoid.length) {
      var fresh = candidates.filter(function (q) { return o.avoid.indexOf(q.text) === -1; });
      if (fresh.length) candidates = fresh;
    }

    var pairs = o.pairs || [];
    var scored = candidates.map(function (q) {
      var hits = 0;
      var text = q.text.toLowerCase();
      pairs.forEach(function (p) {
        for (var i = text.indexOf(p); i !== -1; i = text.indexOf(p, i + 1)) hits++;
      });
      return { q: q, score: text.length ? hits / text.length : 0 };
    });
    scored.sort(function (a, b) { return b.score - a.score; });

    // A little variety: any of the top few, not always the single top scorer.
    var q = pick(scored.slice(0, Math.min(3, scored.length)), rnd).q;
    return {
      words: q.text.split(/\s+/).filter(Boolean),
      source: q.source,
      text: q.text
    };
  }

  /* Splits a quote into engine words. Returns { words, source, text }. */
  function quote(opts) {
    var o = opts || {};
    var rnd = o.random || defaultRandom;
    var lang = o.lang || 'en';
    var all = (TT.data && TT.data.quotes && TT.data.quotes[lang]) || [];
    if (!all.length) return { words: [], source: '', text: '' };

    var candidates = o.length && o.length !== 'any'
      ? all.filter(function (q) { return q.length === o.length; })
      : all;
    if (!candidates.length) candidates = all;

    // Recently shown quotes are skipped so the mode does not repeat itself —
    // unless that would leave nothing to pick from.
    if (o.avoid && o.avoid.length) {
      var fresh = candidates.filter(function (q) { return o.avoid.indexOf(q.text) === -1; });
      if (fresh.length) candidates = fresh;
    }

    var q = pick(candidates, rnd);
    return {
      words: q.text.split(/\s+/).filter(Boolean),
      source: q.source,
      text: q.text
    };
  }

  /* Lesson text. A lesson supplies its content one of five ways — see
   * js/data/lessons.js for the shape. Returns { words, source }. */
  function lesson(def, opts) {
    var o = opts || {};
    var rnd = o.random || defaultRandom;
    if (!def) return [];
    var lang = o.lang || 'en';
    var count = o.count || def.count || 30;
    var out = [];
    var i;

    if (def.quote) {
      return quote({ lang: lang, length: def.length || 'medium', random: rnd }).words;
    }
    if (def.slowest) {
      // The learner's own slowest key transitions, passed in via opts so this
      // module stays free of storage. Until there is enough history, fall back
      // to the language's common patterns — still a pattern drill, just not a
      // personalised one.
      var pairs = o.slowest && o.slowest.length ? o.slowest : null;
      if (pairs) return pairDrill({ lang: lang, pairs: pairs, count: count, random: rnd });
      var sets = (TT.data && TT.data.patterns && TT.data.patterns[lang]) || {};
      return drill([].concat(sets.bigrams || [], sets.trigrams || []), count, rnd);
    }
    if (def.pool) {
      return words({
        lang: lang,
        count: count,
        poolSize: def.pool,
        punctuation: def.punctuation,
        numbers: def.numbers,
        random: rnd
      });
    }
    if (def.patterns) {
      return words({
        lang: lang,
        count: count,
        source: 'patterns',
        patternKind: def.patterns,
        random: rnd
      });
    }
    if (def.words && def.words.length) {
      for (i = 0; i < count; i++) out.push(pick(def.words, rnd));
      return out;
    }
    if (def.chars && def.chars.length) {
      var groupSize = def.groupSize || 4;
      for (i = 0; i < count; i++) {
        var chunk = '';
        for (var k = 0; k < groupSize; k++) chunk += pick(def.chars, rnd);
        out.push(chunk);
      }
      return out;
    }
    if (def.text) return def.text.split(/\s+/).filter(Boolean);
    return out;
  }

  TT.generator = {
    words: words,
    quote: quote,
    pairDrill: pairDrill,
    keyDrill: keyDrill,
    hardestQuote: hardestQuote,
    lesson: lesson,
    drill: drill,
    shuffle: shuffle,
    punctuate: punctuate,
    sprinkleNumbers: sprinkleNumbers,
    weightPatterns: weightPatterns,
    capitalize: capitalize,
    pool: pool,
    pick: pick
  };
})(typeof window !== 'undefined'
  ? (window.TT = window.TT || {})
  : (global.TT = global.TT || {}));
