'use strict';

const E = global.TT.engine;

suite('engine');

/* Types a whole string through the engine, treating spaces as word commits. */
function typeAll(state, text, startMs) {
  let t = startMs === undefined ? 1000 : startMs;
  for (let i = 0; i < text.length; i++) {
    E.typeChar(state, text.charAt(i), t);
    t += 100;
  }
  return t;
}

function fresh(words, opts) {
  return E.create(words || ['the', 'quick', 'brown'], { type: 'words', value: 3 }, opts);
}

test('typing a correct character advances the caret', function () {
  const s = fresh();
  E.typeChar(s, 't', 1000);
  eq(s.input[0], 't');
  eq(s.wordIndex, 0);
  eq(s.log.length, 1);
  eq(s.log[0].ok, true);
});

test('the clock starts on the first keystroke, not at creation', function () {
  const s = fresh();
  eq(s.startedAt, null);
  E.typeChar(s, 't', 4242);
  eq(s.startedAt, 4242);
});

test('a wrong character is still recorded but marked incorrect', function () {
  const s = fresh();
  E.typeChar(s, 'x', 1000);
  eq(s.input[0], 'x');
  eq(s.log[0].ok, false);
  eq(s.log[0].expected, 't');
});

test('space commits the word and advances', function () {
  const s = fresh();
  typeAll(s, 'the');
  E.commitWord(s, 2000);
  eq(s.wordIndex, 1);
  eq(s.input[0], 'the');
});

test('a leading space is a no-op, not an error', function () {
  const s = fresh();
  const r = E.commitWord(s, 1000);
  eq(r.type, 'ignored');
  eq(s.wordIndex, 0);
  eq(s.log.length, 0, 'no keystroke should be logged');
});

test('space on an unfinished word still advances and leaves it editable', function () {
  const s = fresh();
  typeAll(s, 'th');
  E.commitWord(s, 2000);
  eq(s.wordIndex, 1);
  eq(s.input[0], 'th', 'the partial word is preserved for later editing');
  eq(E.isWordCorrect(s, 0), false);
});

test('overflow characters are kept but capped', function () {
  const s = fresh(['hi']);
  let t = 1000;
  for (let i = 0; i < 60; i++) {
    E.typeChar(s, 'z', t);
    t += 10;
  }
  eq(s.input[0].length, 2 + E.MAX_EXTRA);
});

/* ---------- backspace ---------- */

suite('engine / backspace');

test('backspace deletes one character', function () {
  const s = fresh();
  typeAll(s, 'the');
  E.backspace(s);
  eq(s.input[0], 'th');
});

test('backspace at the start of a word steps back when the previous word was wrong', function () {
  const s = fresh();
  typeAll(s, 'teh ');
  eq(s.wordIndex, 1);
  const r = E.backspace(s);
  eq(r.type, 'stepback');
  eq(s.wordIndex, 0);
  eq(s.input[0], 'teh', 'what was typed is preserved so it can be fixed');
});

test('backspace at the start of a word refuses to step back over a correct word', function () {
  const s = fresh();
  typeAll(s, 'the ');
  const r = E.backspace(s);
  eq(r.type, 'ignored');
  eq(s.wordIndex, 1);
});

test('free-backspace steps back over a correct word too', function () {
  const s = fresh(null, { freeBackspace: true });
  typeAll(s, 'the ');
  const r = E.backspace(s);
  eq(r.type, 'stepback');
  eq(s.wordIndex, 0);
});

test('backspace at the very start of the test is a no-op', function () {
  const s = fresh();
  const r = E.backspace(s);
  eq(r.type, 'ignored');
  eq(s.wordIndex, 0);
});

test('confidence mode blocks backspace entirely', function () {
  const s = fresh(null, { confidenceMode: true });
  typeAll(s, 'the');
  const r = E.backspace(s);
  eq(r.type, 'blocked');
  eq(s.input[0], 'the');
});

/* ---------- ctrl+backspace ---------- */

suite('engine / delete word');

test('ctrl+backspace clears the whole current word', function () {
  const s = fresh();
  typeAll(s, 'the');
  const r = E.deleteWord(s);
  eq(r.type, 'delete-word');
  eq(s.input[0], '');
  eq(s.wordIndex, 0);
});

test('ctrl+backspace on an empty word jumps back and clears the previous one', function () {
  const s = fresh();
  typeAll(s, 'teh quick');
  eq(s.wordIndex, 1);

  E.deleteWord(s);               // clears "quick"
  eq(s.input[1], '');
  eq(s.wordIndex, 1);

  E.deleteWord(s);               // steps back to "teh" and clears it
  eq(s.wordIndex, 0);
  eq(s.input[0], '');
});

test('repeated ctrl+backspace walks backwards word by word', function () {
  // Four words, only three typed, so the test does not auto-complete.
  const s = fresh(['one', 'two', 'three', 'four'], { freeBackspace: true });
  typeAll(s, 'one two three');
  eq(s.wordIndex, 2);

  E.deleteWord(s);
  eq([s.wordIndex, s.input[2]], [2, '']);
  E.deleteWord(s);
  eq([s.wordIndex, s.input[1]], [1, '']);
  E.deleteWord(s);
  eq([s.wordIndex, s.input[0]], [0, '']);
  eq(E.deleteWord(s).type, 'ignored', 'nowhere further back to go');
});

test('ctrl+backspace will not cross a correctly typed word by default', function () {
  const s = fresh();                 // freeBackspace off
  typeAll(s, 'the quick');
  E.deleteWord(s);                   // clears "quick"
  const r = E.deleteWord(s);         // "the" was correct, so this must stop
  eq(r.type, 'ignored');
  eq(s.wordIndex, 1);
  eq(s.input[0], 'the', 'the correct word is left untouched');
});

test('ctrl+backspace at the first word with nothing typed is a no-op', function () {
  const s = fresh();
  const r = E.deleteWord(s);
  eq(r.type, 'ignored');
  eq(s.wordIndex, 0, 'must never produce a negative index');
  ok(s.input[0] === '');
});

test('a word cleared by ctrl+backspace can be stepped back over afterwards', function () {
  const s = fresh();
  typeAll(s, 'teh quick');   // "teh" is wrong, so it is reachable
  E.deleteWord(s);           // clear "quick"
  E.deleteWord(s);           // step back and clear "teh"
  eq(s.wordIndex, 0);
  eq(s.input[0], '');
  // Now empty, the word is no longer "correct", so plain backspace is still stuck
  // at the start of the test rather than running off the front.
  eq(E.backspace(s).type, 'ignored');
});

test('confidence mode blocks ctrl+backspace too', function () {
  const s = fresh(null, { confidenceMode: true });
  typeAll(s, 'the');
  eq(E.deleteWord(s).type, 'blocked');
  eq(s.input[0], 'the');
});

/* ---------- stop on error ---------- */

suite('engine / stop on error');

test('stop-on-error letter refuses the keystroke but logs the miss', function () {
  const s = fresh(null, { stopOnError: 'letter' });
  const r = E.typeChar(s, 'x', 1000);
  eq(r.type, 'blocked');
  eq(s.input[0], '', 'the wrong character never lands');
  eq(s.log.length, 1, 'but it still counts against accuracy');
  eq(s.log[0].ok, false);
});

test('stop-on-error word refuses to advance past a wrong word', function () {
  const s = fresh(null, { stopOnError: 'word' });
  typeAll(s, 'teh');
  const r = E.commitWord(s, 2000);
  eq(r.type, 'blocked');
  eq(s.wordIndex, 0);
});

/* ---------- completion ---------- */

suite('engine / completion');

test('finishing the last word correctly ends the test without a trailing space', function () {
  const s = fresh(['ab', 'cd']);
  typeAll(s, 'ab cd');
  ok(s.finishedAt !== null, 'test should be finished');
  eq(s.wordIndex, 2);
});

test('a finished test ignores further input', function () {
  const s = fresh(['ab']);
  typeAll(s, 'ab');
  ok(s.finishedAt !== null);
  const r = E.typeChar(s, 'z', 9999);
  eq(r.type, 'ignored');
  eq(s.input[0], 'ab');
});

test('time mode never self-completes', function () {
  const s = E.create(['ab', 'cd'], { type: 'time', value: 30 });
  typeAll(s, 'ab cd');
  eq(s.finishedAt, null);
  eq(E.isComplete(s), false);
});

test('time mode can be topped up with more words', function () {
  const s = E.create(['ab'], { type: 'time', value: 30 });
  eq(E.remaining(s), 1);
  E.appendWords(s, ['cd', 'ef']);
  eq(E.remaining(s), 3);
  eq(s.words.length, 3);
});

test('elapsed reports frozen time once finished', function () {
  const s = fresh(['ab']);
  E.typeChar(s, 'a', 1000);
  E.typeChar(s, 'b', 3000);
  near(E.elapsed(s, 99999), 2, 0.001, 'should stop at finishedAt');
});
