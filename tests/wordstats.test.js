'use strict';

const E = global.TT.engine;
const S = global.TT.stats;
const W = global.TT.wordstats;
const G = global.TT.generator;

suite('stats / word timings');

/* Types text at a fixed cadence so each word's duration is exact. */
function play(words, text, msPerKey) {
  const s = E.create(words, { type: 'words', value: words.length });
  let t = 0;
  for (const ch of text) {
    t += msPerKey;
    E.typeChar(s, ch, t);
  }
  return s;
}

test('each word gets a timing', function () {
  const s = play(['ab', 'cd', 'ef'], 'ab cd ef', 100);
  const t = S.wordTimings(s);
  eq(t.length, 3);
  eq(t.map(x => x.word), ['ab', 'cd', 'ef']);
});

test('a word is timed from the previous commit to its own', function () {
  // The clock starts on the first keystroke, so "ab" spans a->b->space (200ms)
  // and "cd" spans that space through to d (another 200ms).
  const s = play(['ab', 'cd'], 'ab cd', 100);
  const t = S.wordTimings(s);
  eq(t[0].ms, 200, 'first word runs from the first keystroke to its commit');
  eq(t[1].ms, 200, 'second runs from that commit to finishing');
});

test('the pause before a word counts towards it', function () {
  const s = E.create(['ab', 'cd'], { type: 'words', value: 2 });
  E.typeChar(s, 'a', 0);
  E.typeChar(s, 'b', 100);
  E.typeChar(s, ' ', 200);
  E.typeChar(s, 'c', 5000);   // long hesitation before starting "cd"
  E.typeChar(s, 'd', 5100);
  const t = S.wordTimings(s);
  eq(t[1].ms, 4900, 'hesitation is part of what makes the word hard');
});

test('timings record whether the word was typed correctly', function () {
  const s = play(['ab', 'cd'], 'ax cd', 100);
  const t = S.wordTimings(s);
  eq(t[0].correct, false);
  eq(t[1].correct, true);
});

test('a word committed twice is only timed once', function () {
  const s = E.create(['ab', 'cd', 'ef'], { type: 'words', value: 3 }, { freeBackspace: true });
  E.typeChar(s, 'a', 0);
  E.typeChar(s, 'x', 100);      // wrong
  E.typeChar(s, ' ', 200);
  E.typeChar(s, 'c', 300);
  E.typeChar(s, 'd', 400);
  E.typeChar(s, ' ', 500);
  E.deleteWord(s);              // step back into "ab"
  E.deleteWord(s);
  E.typeChar(s, 'a', 3000);
  E.typeChar(s, 'b', 3100);
  E.typeChar(s, ' ', 3200);

  const t = S.wordTimings(s);
  const abTimings = t.filter(x => x.word === 'ab');
  eq(abTimings.length, 1, 'the re-commit must not produce a second, huge timing');
  eq(abTimings[0].ms, 200);
});

test('an untouched test produces no timings', function () {
  const s = E.create(['ab'], { type: 'words', value: 1 });
  eq(S.wordTimings(s), []);
});

suite('stats / timing units');

/* A word's measured span covers more than just its own letters, so the divisor
 * used for per-keystroke speed has to match what was actually measured. */

test('a normal word counts its characters plus the committing space', function () {
  const s = play(['aa', 'bb', 'cc', 'dd'], 'aa bb cc dd', 100);
  const t = S.wordTimings(s);
  eq(t[1].units, 3, 'two letters plus the space that commits them');
  eq(t[2].units, 3);
});

test("the first word does not count a keystroke before the clock started", function () {
  const s = play(['aa', 'bb', 'cc'], 'aa bb cc', 100);
  eq(S.wordTimings(s)[0].units, 2, 'the very first keystroke costs no time');
});

test('the last word does not count a space it never typed', function () {
  const s = play(['aa', 'bb', 'cc'], 'aa bb cc', 100);
  const t = S.wordTimings(s);
  eq(t[t.length - 1].units, 2, 'no trailing space on the final word');
});

test('units always match the measured span at a steady rhythm', function () {
  const s = play(['zz', 'abcdefghij', 'of', 'it'], 'zz abcdefghij of it', 100);
  S.wordTimings(s).forEach(function (t) {
    near(t.ms / t.units, 100, 0.001, t.word + ' should be exactly one interval per unit');
  });
});

suite('wordstats / merge');

test('merging accumulates count, total and best', function () {
  let map = W.mergeTimings({}, [{ word: 'the', ms: 400, correct: true, chars: 3 }]);
  map = W.mergeTimings(map, [{ word: 'the', ms: 200, correct: true, chars: 3 }]);
  eq(map.the.n, 2);
  eq(map.the.ms, 600);
  eq(map.the.best, 200);
});

test('a faster attempt moves recent speed even when the lifetime average is buried', function () {
  const old = { word: 'the', ms: 300, correct: true };
  let map = {};
  for (let i = 0; i < 1000; i++) map = W.mergeTimings(map, [old]);
  const before = W.rank(map, { minSamples: 1 })[0];
  map = W.mergeTimings(map, [{ word: 'the', ms: 150, correct: true }]);
  const after = W.rank(map, { minSamples: 1 })[0];
  ok(after.bestWpm > before.bestWpm, 'the personal best should react immediately');
  ok(after.wpm > before.wpm * 1.1, 'recent speed should react immediately');
  near(map.the.ms / map.the.n, 300, 0.2, 'lifetime average remains available');
});

test('merging does not mutate the input map', function () {
  const before = { the: { n: 1, ms: 100, best: 100, err: 0 } };
  W.mergeTimings(before, [{ word: 'the', ms: 200, correct: true, chars: 3 }]);
  eq(before.the.n, 1, 'the original map must be left alone');
});

test('a mistyped word counts as an error, not as a speed sample', function () {
  const map = W.mergeTimings({}, [{ word: 'the', ms: 400, correct: false, chars: 3 }]);
  eq(map.the.n, 0);
  eq(map.the.err, 1);
  eq(map.the.ms, 0);
});

test('implausible timings are discarded', function () {
  const map = W.mergeTimings({}, [
    { word: 'a', ms: 5, correct: true, chars: 1 },        // impossibly fast
    { word: 'b', ms: 999999, correct: true, chars: 1 },   // walked away
    { word: 'c', ms: 500, correct: true, chars: 1 }
  ]);
  eq(map.a.n, 0);
  eq(map.b.n, 0);
  eq(map.c.n, 1);
});

suite('wordstats / ranking');

/* The regression that prompted all of this: dividing a word's span by its
 * letter count alone inflated short words by (n+1)/n — 50% for a two-letter
 * word against 10% for a ten-letter one — so short words ranked as "hard"
 * purely for being short. */
test('word length does not affect the score at a constant rhythm', function () {
  const words = ['zz', 'abcdefghij', 'of', 'extraordinary', 'it'];
  const map = {};
  words.forEach(function (word) {
    map[word] = { n: 3, ms: 3 * (word.length + 1) * 100,
      best: (word.length + 1) * 100, err: 0 };
  });

  const rows = W.rank(map);
  eq(rows.length, words.length);
  rows.forEach(function (r) {
    near(r.msPerChar, 100, 0.001, r.word + ' (' + r.word.length + ' chars)');
    near(r.wpm, 120, 0.001, r.word);
  });
});

test('a genuinely slow short word still ranks as hardest', function () {
  const s = E.create(['of', 'abcdeghij', 'it'], { type: 'words', value: 3 });
  let t = 0;
  for (const ch of 'of abcdeghij it') {
    t += (ch === 'o' || ch === 'f') ? 400 : 100;   // "of" typed slowly
    E.typeChar(s, ch, t);
  }
  let map = {};
  for (let i = 0; i < 3; i++) map = W.mergeTimings(map, S.wordTimings(s));
  eq(W.rank(map)[0].word, 'of');
});

test('ranks by time per character, not raw time', function () {
  // "elephant" takes longer in total but is faster per character.
  const map = {
    elephant: { n: 2, ms: 2 * 800, best: 800, err: 0 },   // 100ms/char
    ox: { n: 2, ms: 2 * 600, best: 600, err: 0 }          // 300ms/char
  };
  const rows = W.rank(map);
  eq(rows[0].word, 'ox', 'the short slow word is the hard one');
  eq(rows[1].word, 'elephant');
});

test('words with too few samples are excluded', function () {
  const map = {
    once: { n: 1, ms: 5000, best: 5000, err: 0 },
    twice: { n: 2, ms: 400, best: 200, err: 0 }
  };
  const rows = W.rank(map);
  eq(rows.map(r => r.word), ['twice']);
});

test('the sample floor is adjustable', function () {
  const map = { once: { n: 1, ms: 5000, best: 5000, err: 0 } };
  eq(W.rank(map, { minSamples: 1 }).length, 1);
});

test('limit truncates to the hardest N', function () {
  const map = {};
  for (let i = 0; i < 30; i++) {
    map['w' + i] = { n: 2, ms: 2 * (100 + i * 10), best: 100, err: 0 };
  }
  const rows = W.rank(map, { limit: 20 });
  eq(rows.length, 20);
  eq(rows[0].word, 'w29', 'slowest first');
});

test('ranking reports a per-word wpm', function () {
  // Five letters plus their committing space in 600ms => 120 wpm.
  const map = { abcde: { n: 1, ms: 600, u: 999, best: 600, err: 0 } };
  const row = W.rank(map, { minSamples: 1 })[0];
  near(row.msPerChar, 100, 0.001);
  near(row.wpm, 120, 0.001);
  near(row.bestWpm, 120, 0.001);
  near(row.avgMs, 600, 0.001);
});

test('corrupt stored unit totals cannot distort word speed', function () {
  const map = { abcde: { n: 2, ms: 1200, best: 600, err: 0 } };
  map.abcde.u = 999999;
  const row = W.rank(map, { minSamples: 1 })[0];
  near(row.msPerChar, 100, 0.001);
  near(row.wpm, 120, 0.001);
  near(row.bestWpm, 120, 0.001);
});

test('ranking is stable and never returns junk entries', function () {
  const rows = W.rank({ '': { n: 5, ms: 500, best: 100, err: 0 } });
  eq(rows, [], 'an empty word is not rankable');
  eq(W.rank(null), []);
  eq(W.rank(undefined), []);
});

suite('generator / drill');

test('produces the requested number of words from the set', function () {
  const set = ['alpha', 'beta', 'gamma'];
  const out = G.drill(set, 30, seeded(1));
  eq(out.length, 30);
  ok(out.every(w => set.indexOf(w) !== -1));
});

test('cycles the whole set before repeating any word', function () {
  const set = ['a', 'b', 'c', 'd'];
  const out = G.drill(set, 12, seeded(2));
  for (let start = 0; start < 12; start += 4) {
    const chunk = out.slice(start, start + 4).slice().sort();
    eq(chunk, ['a', 'b', 'c', 'd'], 'each pass should cover the set exactly once');
  }
});

test('gives every word an equal share over many repetitions', function () {
  const set = ['a', 'b', 'c', 'd', 'e'];
  const out = G.drill(set, 100, seeded(3));
  const counts = set.map(w => out.filter(x => x === w).length);
  eq(counts, [20, 20, 20, 20, 20]);
});

test('avoids immediate repeats across a cycle boundary', function () {
  for (let s = 1; s < 12; s++) {
    const out = G.drill(['a', 'b', 'c'], 30, seeded(s));
    for (let i = 1; i < out.length; i++) {
      ok(out[i] !== out[i - 1], 'seed ' + s + ' repeated "' + out[i] + '" at ' + i);
    }
  }
});

test('a single-word set still works', function () {
  const out = G.drill(['solo'], 5, seeded(1));
  eq(out.length, 5);
  ok(out.every(w => w === 'solo'));
});

test('an empty set produces nothing rather than hanging', function () {
  eq(G.drill([], 10, seeded(1)), []);
  eq(G.drill(null, 10, seeded(1)), []);
  eq(G.drill(['', ''], 10, seeded(1)), [], 'empty strings are not words');
});
