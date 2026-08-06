'use strict';

const E = global.TT.engine;
const S = global.TT.stats;

suite('stats');

/* Types text at a fixed cadence so timings are exact and hand-checkable. */
function play(words, text, msPerKey, opts) {
  const s = E.create(words, { type: 'words', value: words.length }, opts);
  let t = 0;
  for (let i = 0; i < text.length; i++) {
    t += msPerKey;
    E.typeChar(s, text.charAt(i), t);
  }
  return { state: s, endedAt: t };
}

test('a clean run scores 100% accuracy', function () {
  const r = play(['the', 'cat'], 'the cat', 100);
  const out = S.summarize(r.state, r.endedAt);
  near(out.accuracy, 100, 0.001);
  eq(out.chars.incorrect, 0);
  eq(out.chars.missed, 0);
  eq(out.chars.extra, 0);
});

test('accuracy counts a corrected mistake as a miss', function () {
  // The correction happens on a non-final word: a final word at full length
  // ends the test, mistakes and all.
  const s = E.create(['ab', 'cd'], { type: 'words', value: 2 });
  E.typeChar(s, 'a', 100);
  E.typeChar(s, 'x', 200);   // wrong — and the test carries on
  E.backspace(s);            // fixed — final state is now perfect
  E.typeChar(s, 'b', 300);
  E.typeChar(s, ' ', 400);
  E.typeChar(s, 'c', 500);
  E.typeChar(s, 'd', 600);

  const out = S.summarize(s, 700);
  eq(out.chars.incorrect, 0, 'final state ends up clean');
  eq(out.keystrokes, 6);
  near(out.accuracy, (5 / 6) * 100, 0.001, 'but the log remembers the miss');
});

test('WPM is computed from correct characters over elapsed time', function () {
  // "the cat" = 6 correct letters + 1 correct space = 7 chars, typed in 700ms.
  const r = play(['the', 'cat'], 'the cat', 100);
  const out = S.summarize(r.state, r.endedAt);
  near(out.seconds, 0.6, 0.001, 'clock starts on the first keystroke');
  // 7 chars / 5 = 1.4 words in 0.6s => 1.4 / (0.6/60)
  near(out.wpm, 1.4 / (0.6 / 60), 0.001);
});

test('raw WPM counts incorrect characters, net WPM does not', function () {
  const r = play(['abcde'], 'abxde', 100);
  const out = S.summarize(r.state, r.endedAt);
  eq(out.chars.correct, 4);
  eq(out.chars.incorrect, 1);
  ok(out.raw > out.wpm, 'raw must exceed net when there are errors');
});

test('unfinished trailing word counts as missed, not as an error', function () {
  const s = E.create(['abcd', 'efgh'], { type: 'words', value: 2 });
  let t = 0;
  'ab '.split('').forEach(function (c) { t += 100; E.typeChar(s, c, t); });
  const out = S.summarize(s, t);
  eq(out.chars.missed, 2, 'cd was skipped by committing early');
  eq(out.chars.incorrect, 0);
});

test('the word still under the caret is not counted as missing characters', function () {
  const s = E.create(['abcd'], { type: 'words', value: 1 });
  E.typeChar(s, 'a', 100);
  const out = S.summarize(s, 200);
  eq(out.chars.missed, 0, 'an unfinished current word is simply unfinished');
  eq(out.chars.correct, 1);
});

test('extra characters are counted separately', function () {
  // Two words so typing past the first does not auto-complete the test.
  const r = play(['ab', 'cd'], 'abzz cd', 100);
  const out = S.summarize(r.state, r.endedAt);
  eq(out.chars.correct, 4);
  eq(out.chars.extra, 2);
  eq(out.chars.incorrect, 0, 'overflow is extra, not incorrect');
});

test('no trailing space is credited for the final word', function () {
  // "the cat" is 6 letters plus the single space that was actually pressed.
  const r = play(['the', 'cat'], 'the cat', 100);
  const out = S.summarize(r.state, r.endedAt);
  eq(out.chars.correct, 6);
  eq(out.chars.spaces, 1, 'only the space between the two words counts');
});

test('a space after a wrong word is not credited', function () {
  const r = play(['abc', 'de'], 'abx de', 100);
  const out = S.summarize(r.state, r.endedAt);
  eq(out.chars.spaces, 0);
});

test('a perfectly even pace scores full consistency', function () {
  const log = [];
  for (let i = 0; i < 50; i++) log.push({ t: i * 100, ok: true, expected: 'a', char: 'a' });
  near(S.consistency(log, 5), 100, 0.001);
});

test('a wildly uneven pace scores low consistency', function () {
  const log = [];
  for (let i = 0; i < 40; i++) log.push({ t: 10 * i, ok: true, expected: 'a', char: 'a' });
  for (let j = 0; j < 2; j++) log.push({ t: 4000 + j * 10, ok: true, expected: 'a', char: 'a' });
  const c = S.consistency(log, 5);
  ok(c < 60, 'expected a low score, got ' + c);
  ok(c >= 0);
});

test('consistency is clamped to 0..100', function () {
  eq(S.consistency([], 10), 0);
  const c = S.consistency([{ t: 0, ok: true }], 3);
  ok(c >= 0 && c <= 100, 'got ' + c);
});

test('the series has one entry per elapsed second', function () {
  const log = [];
  for (let i = 0; i < 30; i++) log.push({ t: i * 100, ok: true, expected: 'a', char: 'a' });
  const series = S.series(log, 3);
  eq(series.length, 3);
  eq(series[0].second, 1);
  ok(series[2].wpm > 0);
});

test('per-key stats are keyed by the expected character, not what was pressed', function () {
  const s = E.create(['ab'], { type: 'words', value: 1 });
  E.typeChar(s, 'a', 100);
  E.typeChar(s, 'z', 200);   // expected 'b', pressed 'z'
  const keys = S.keyStats(s.log);
  eq(keys.a.hits, 1);
  eq(keys.b.misses, 1, 'the miss is attributed to the key that was missed');
  ok(keys.z === undefined);
});

test('spaces are excluded from per-key stats', function () {
  const r = play(['ab', 'cd'], 'ab cd', 100);
  const keys = S.keyStats(r.state.log);
  ok(keys[' '] === undefined);
});

test('key stats merge additively', function () {
  const merged = S.mergeKeyStats(
    { a: { hits: 3, misses: 1 } },
    { a: { hits: 2, misses: 4 }, b: { hits: 1, misses: 0 } }
  );
  eq(merged.a, { hits: 5, misses: 5 });
  eq(merged.b, { hits: 1, misses: 0 });
});

test('worst keys are ranked by miss rate and ignore thin samples', function () {
  const map = {
    q: { hits: 1, misses: 1 },      // 50% but only 2 samples
    z: { hits: 5, misses: 5 },      // 50% over 10
    m: { hits: 9, misses: 1 },      // 10% over 10
    k: { hits: 10, misses: 0 }      // flawless
  };
  const worst = S.worstKeys(map, 10, 5);
  eq(worst.length, 2, 'q is below the sample floor and k has no misses');
  eq(worst[0].key, 'z');
  eq(worst[1].key, 'm');
});

test('summarize on an untouched test does not divide by zero', function () {
  const s = E.create(['ab'], { type: 'words', value: 1 });
  const out = S.summarize(s, 1000);
  eq(out.wpm, 0);
  eq(out.raw, 0);
  eq(out.accuracy, 100);
  eq(out.seconds, 0);
});
