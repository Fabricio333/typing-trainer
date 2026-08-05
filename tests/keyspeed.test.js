'use strict';

const E = global.TT.engine;
const K = global.TT.keyspeed;
const W = global.TT.wordstats;
const G = global.TT.generator;

suite('keyspeed / fromLog');

function play(words, text, msPerKey) {
  const s = E.create(words, { type: 'words', value: words.length });
  let t = 0;
  for (const ch of text) {
    t += msPerKey;
    E.typeChar(s, ch, t);
  }
  return s;
}

test('extracts one timing per in-word transition', function () {
  const s = play(['abc', 'de'], 'abc de', 100);
  const t = K.fromLog(s.log);
  eq(t.map(x => x.pair), ['ab', 'bc', 'de']);
  t.forEach(x => eq(x.ms, 100));
});

test('spaces break the chain rather than forming pairs', function () {
  const s = play(['ab', 'cd'], 'ab cd', 100);
  const pairs = K.fromLog(s.log).map(x => x.pair);
  ok(pairs.indexOf('b ') === -1 && pairs.indexOf(' c') === -1, 'got ' + pairs.join(','));
});

test('a wrong keystroke poisons the transitions on both sides', function () {
  const s = play(['abc'], 'axc', 100);   // x is wrong
  eq(K.fromLog(s.log), [], 'neither a->x nor x->c is a clean transition');
});

test('implausibly long gaps are hesitation, not transitions', function () {
  const s = E.create(['ab'], { type: 'words', value: 1 });
  E.typeChar(s, 'a', 0);
  E.typeChar(s, 'b', 8000);   // walked away mid-word
  eq(K.fromLog(s.log), []);
});

test('an empty or missing log produces nothing', function () {
  eq(K.fromLog([]), []);
  eq(K.fromLog(null), []);
});

suite('keyspeed / merge and rank');

test('merging accumulates count, total and best', function () {
  let map = K.merge({}, [{ pair: 'th', ms: 300 }]);
  map = K.merge(map, [{ pair: 'th', ms: 100 }]);
  eq(map.th.n, 2);
  eq(map.th.ms, 400);
  eq(map.th.best, 100);
});

test('merging does not mutate the input map', function () {
  const before = { th: { n: 1, ms: 100, best: 100 } };
  K.merge(before, [{ pair: 'th', ms: 200 }]);
  eq(before.th.n, 1);
});

test('rank returns the slowest pairs first', function () {
  const map = {
    th: { n: 3, ms: 3 * 100, best: 100 },
    zq: { n: 3, ms: 3 * 500, best: 400 },
    er: { n: 3, ms: 3 * 250, best: 200 }
  };
  eq(K.rank(map).map(r => r.pair), ['zq', 'er', 'th']);
});

test('pairs with too few samples are excluded until the floor is lowered', function () {
  const map = { zq: { n: 2, ms: 1000, best: 400 } };
  eq(K.rank(map).length, 0, 'default floor is ' + K.DEFAULT_MIN_SAMPLES);
  eq(K.rank(map, { minSamples: 1 }).length, 1);
});

test('limit truncates to the slowest N', function () {
  const map = {};
  for (let i = 0; i < 20; i++) map['a' + i] = { n: 3, ms: 3 * (100 + i * 10), best: 100 };
  // Two-character keys only: 'a0'..'a9' qualify, the rest are 3 chars long.
  const rows = K.rank(map, { limit: 5 });
  eq(rows.length, 5);
  eq(rows[0].pair, 'a9', 'slowest first');
});

suite('generator / slowest-combinations lesson');

test('drills the supplied slow pairs', function () {
  const def = { slowest: true, count: 12 };
  const out = G.lesson(def, { lang: 'en', slowest: ['zq', 'xw', 'pv'], random: seeded(1) });
  eq(out.length, 12);
  ok(out.every(w => ['zq', 'xw', 'pv'].indexOf(w) !== -1), out.join(' '));
});

test('falls back to common patterns when there is no history yet', function () {
  const def = { slowest: true, count: 10 };
  const out = G.lesson(def, { lang: 'en', random: seeded(1) });
  eq(out.length, 10);
  out.forEach(w => ok(/^[a-z]+$/.test(w), 'unexpected drill text "' + w + '"'));
});

suite('wordstats / dictionary filter');

test('rank can be restricted with an allow predicate', function () {
  const map = {
    fjjf: { n: 4, ms: 4 * 4000, best: 3000, err: 0 },
    the: { n: 4, ms: 4 * 800, best: 600, err: 0 }
  };
  const rows = W.rank(map, { allow: w => w === 'the' });
  eq(rows.map(r => r.word), ['the']);
});

test('hardest() never surfaces letter chunks that are not dictionary words', function () {
  // Simulate a polluted store: the chunk is by far the slowest entry.
  const store = { en: {
    fjjf: { n: 6, ms: 6 * 5000, best: 4000, err: 0 },
    about: { n: 6, ms: 6 * 2000, best: 1500, err: 0 }
  } };
  const origRead = global.TT.storage && global.TT.storage.read;
  global.TT.storage = { read: () => store, write: () => {}, remove: () => {} };
  try {
    const rows = W.hardest('en', 10, 2);
    ok(rows.length > 0, 'the real word should still rank');
    ok(rows.every(r => r.word !== 'fjjf'), 'the chunk must be filtered out');
    eq(rows[0].word, 'about');
  } finally {
    if (origRead) global.TT.storage.read = origRead;
    else delete global.TT.storage;
  }
});
