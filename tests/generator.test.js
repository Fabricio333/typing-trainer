'use strict';

const G = global.TT.generator;

suite('generator');

test('produces the requested number of words', function () {
  const w = G.words({ lang: 'en', count: 25, random: seeded(7) });
  eq(w.length, 25);
});

test('never produces an empty word', function () {
  [{}, { punctuation: true }, { numbers: true }, { punctuation: true, numbers: true }]
    .forEach(function (extra, i) {
      const opts = Object.assign({ lang: 'en', count: 200, random: seeded(i + 1) }, extra);
      const w = G.words(opts);
      ok(w.every(function (x) { return typeof x === 'string' && x.length > 0; }),
        'variant ' + i + ' produced an empty word');
    });
});

test('draws from the English list when lang is en', function () {
  const pool = global.TT.data.words.en;
  const w = G.words({ lang: 'en', count: 50, random: seeded(3) });
  ok(w.every(function (x) { return pool.indexOf(x) !== -1; }));
});

test('draws from the Spanish list when lang is es', function () {
  const pool = global.TT.data.words.es;
  const w = G.words({ lang: 'es', count: 50, random: seeded(3) });
  ok(w.every(function (x) { return pool.indexOf(x) !== -1; }));
});

test('poolSize restricts the draw to the most common words', function () {
  const pool = global.TT.data.words.en.slice(0, 20);
  const w = G.words({ lang: 'en', count: 60, poolSize: 20, random: seeded(11) });
  ok(w.every(function (x) { return pool.indexOf(x) !== -1; }));
});

test('the numbers toggle introduces digits', function () {
  const w = G.words({ lang: 'en', count: 300, numbers: true, random: seeded(5) });
  ok(w.some(function (x) { return /^\d+$/.test(x); }), 'expected at least one numeric token');
});

test('without the numbers toggle there are no digits', function () {
  const w = G.words({ lang: 'en', count: 300, random: seeded(5) });
  ok(w.every(function (x) { return !/\d/.test(x); }));
});

test('the punctuation toggle introduces punctuation and a capital', function () {
  const w = G.words({ lang: 'en', count: 60, punctuation: true, random: seeded(9) });
  ok(/^[A-Z]/.test(w[0]), 'first word should be capitalised, got ' + w[0]);
  ok(w.some(function (x) { return /[.,!?;:]/.test(x); }));
});

test('without the punctuation toggle the text stays bare', function () {
  const w = G.words({ lang: 'en', count: 60, random: seeded(9) });
  ok(w.every(function (x) { return !/[.,!?;:"'()]/.test(x); }));
});

test('punctuated text always ends a sentence on the final word', function () {
  for (let i = 1; i < 8; i++) {
    const w = G.words({ lang: 'en', count: 20, punctuation: true, random: seeded(i) });
    ok(/[.!?]$/.test(w[w.length - 1]), 'seed ' + i + ' ended with ' + w[w.length - 1]);
  }
});

test('Spanish punctuation opens questions and exclamations', function () {
  let found = false;
  for (let i = 1; i < 40 && !found; i++) {
    const w = G.words({ lang: 'es', count: 40, punctuation: true, random: seeded(i) });
    found = w.some(function (x) { return /^[¿¡]/.test(x); });
  }
  ok(found, 'expected an opening ¿ or ¡ somewhere across seeds');
});

test('capitalize skips leading opening punctuation', function () {
  eq(G.capitalize('¿que'), '¿Que');
  eq(G.capitalize('"hello'), '"Hello');
  eq(G.capitalize('word'), 'Word');
  eq(G.capitalize(''), '');
});

suite('generator / patterns');

test('pattern mode draws from the pattern sets', function () {
  const sets = global.TT.data.patterns.en;
  const all = [].concat(sets.bigrams, sets.trigrams, sets.clusters);
  const w = G.words({ lang: 'en', count: 40, source: 'patterns', random: seeded(2) });
  eq(w.length, 40);
  ok(w.every(function (x) { return all.indexOf(x) !== -1; }));
});

test('patternKind narrows the draw', function () {
  const w = G.words({ lang: 'en', count: 30, source: 'patterns', patternKind: 'bigrams', random: seeded(4) });
  ok(w.every(function (x) { return x.length === 2; }), 'bigrams should all be 2 characters');
});

test('adaptive mode favours patterns containing keys you miss', function () {
  const patterns = ['aa', 'bb'];
  const keyStats = { a: { hits: 1, misses: 9 }, b: { hits: 10, misses: 0 } };
  const rnd = seeded(1);
  let aCount = 0;
  for (let i = 0; i < 400; i++) {
    if (G.weightPatterns(patterns, keyStats, rnd) === 'aa') aCount++;
  }
  ok(aCount > 250, 'expected "aa" to dominate, got ' + aCount + '/400');
});

test('adaptive mode ignores keys with too little data', function () {
  const patterns = ['aa', 'bb'];
  const thin = { a: { hits: 0, misses: 2 } };   // only 2 samples, under the floor
  const rnd = seeded(1);
  let aCount = 0;
  for (let i = 0; i < 400; i++) {
    if (G.weightPatterns(patterns, thin, rnd) === 'aa') aCount++;
  }
  near(aCount, 200, 60, 'should stay roughly even');
});

suite('generator / quotes');

test('returns a quote split into words with its source', function () {
  const q = G.quote({ lang: 'en', random: seeded(6) });
  ok(q.words.length > 3);
  ok(q.source.length > 0);
  eq(q.words.join(' '), q.text);
});

test('length filter is honoured', function () {
  ['short', 'medium', 'long'].forEach(function (len) {
    const q = G.quote({ lang: 'en', length: len, random: seeded(8) });
    const match = global.TT.data.quotes.en.filter(function (x) { return x.text === q.text; })[0];
    eq(match.length, len);
  });
});

test('Spanish quotes are available', function () {
  const q = G.quote({ lang: 'es', random: seeded(6) });
  ok(q.words.length > 3);
});

test('recently seen quotes are avoided', function () {
  const all = global.TT.data.quotes.en.map(function (q) { return q.text; });
  const q = G.quote({ lang: 'en', avoid: all.slice(1), random: seeded(7) });
  eq(q.text, all[0], 'the only unseen quote must be the one picked');
});

test('avoiding every quote still returns one rather than nothing', function () {
  const all = global.TT.data.quotes.en.map(function (q) { return q.text; });
  const q = G.quote({ lang: 'en', avoid: all, random: seeded(3) });
  ok(q.words.length > 0);
});

suite('generator / lessons');

test('a char-drill lesson emits fixed-size chunks', function () {
  const w = G.lesson({ chars: ['a', 's', 'd', 'f'], groupSize: 4 }, { count: 20, random: seeded(1) });
  eq(w.length, 20);
  ok(w.every(function (x) { return x.length === 4 && /^[asdf]+$/.test(x); }));
});

test('a word-drill lesson draws from its own list', function () {
  const w = G.lesson({ words: ['dad', 'sad', 'lad'] }, { count: 15, random: seeded(1) });
  eq(w.length, 15);
  ok(w.every(function (x) { return ['dad', 'sad', 'lad'].indexOf(x) !== -1; }));
});

test('a fixed-text lesson is used verbatim', function () {
  const w = G.lesson({ text: 'the quick brown fox' }, {});
  eq(w, ['the', 'quick', 'brown', 'fox']);
});

suite('generator / weakness drills');

test('pairDrill mixes the pairs themselves with words containing them', function () {
  const w = G.pairDrill({ lang: 'en', pairs: ['th'], count: 40, random: seeded(5) });
  eq(w.length, 40);
  ok(w.indexOf('th') !== -1, 'the bare pair should appear');
  ok(w.some(function (x) { return x.length > 2 && x.indexOf('th') !== -1; }),
    'a real word containing the pair should appear');
  ok(w.every(function (x) { return x === 'th' || x.indexOf('th') !== -1; }),
    'everything in the drill should exercise the pair');
});

test('pairDrill with no pairs returns nothing', function () {
  eq(G.pairDrill({ lang: 'en', pairs: [], random: seeded(1) }), []);
});

test('a slowest lesson practises the pairs in word context', function () {
  const w = G.lesson({ slowest: true }, { lang: 'en', count: 30, slowest: ['he'], random: seeded(2) });
  eq(w.length, 30);
  ok(w.every(function (x) { return x.indexOf('he') !== -1; }));
});

test('keyDrill only serves words that exercise the requested keys', function () {
  const w = G.keyDrill({ lang: 'en', keys: ['w', 'z'], pairs: ['ow'], count: 30, random: seeded(9) });
  eq(w.length, 30);
  ok(w.every(function (x) {
    return x.indexOf('w') !== -1 || x.indexOf('z') !== -1;
  }), 'every entry should contain one of the drilled keys');
});

test('keyDrill with no keys and no pairs returns nothing', function () {
  eq(G.keyDrill({ lang: 'en', keys: [], random: seeded(1) }), []);
});

test('hardestQuote prefers the quote densest in the given pairs', function () {
  const quotes = global.TT.data.quotes.en;
  const q = G.hardestQuote({ lang: 'en', pairs: ['zz'], random: seeded(1) });
  ok(q.words.length > 0, 'always returns a quote even when nothing matches');
  // A pair taken from one specific quote must rank that quote into the top picks.
  const target = quotes[0].text.toLowerCase().slice(0, 2);
  const picked = G.hardestQuote({ lang: 'en', pairs: [target], random: seeded(1) });
  ok(picked.text.toLowerCase().indexOf(target) !== -1);
});

test('hardestQuote avoids recently seen quotes', function () {
  const all = global.TT.data.quotes.en.map(function (q) { return q.text; });
  const q = G.hardestQuote({ lang: 'en', pairs: [], avoid: all.slice(1), random: seeded(4) });
  eq(q.text, all[0]);
});
