/* Typing engine. DOM-free and side-effect-free so it can be unit tested in node.
 *
 * State is word-based rather than a flat character stream: input[i] holds exactly
 * what the user typed for words[i]. That is what makes stepping back into an
 * earlier word to fix it tractable — the caret is (wordIndex, input[wordIndex].length).
 */
(function (TT) {
  'use strict';

  // Cap runaway overflow so holding a key can't grow a word without bound.
  var MAX_EXTRA = 20;

  var DEFAULTS = {
    freeBackspace: false,   // step back into a word that was typed correctly
    confidenceMode: false,  // backspace disabled entirely
    stopOnError: 'off'      // 'off' | 'letter' | 'word'
  };

  function assign(target) {
    for (var i = 1; i < arguments.length; i++) {
      var src = arguments[i];
      if (!src) continue;
      for (var k in src) {
        if (Object.prototype.hasOwnProperty.call(src, k)) target[k] = src[k];
      }
    }
    return target;
  }

  /* mode: { type: 'time'|'words'|'quote'|'lesson'|'patterns'|'zen', value: number } */
  function create(words, mode, opts) {
    return {
      words: (words || []).slice(),
      wordIndex: 0,
      input: [''],
      log: [],           // { t, char, expected, ok, word } — accuracy derives from here
      startedAt: null,
      finishedAt: null,
      mode: mode || { type: 'words', value: (words || []).length },
      opts: assign({}, DEFAULTS, opts)
    };
  }

  function slot(state, i) {
    if (typeof state.input[i] !== 'string') state.input[i] = '';
    return state.input[i];
  }

  function target(state, i) {
    return typeof state.words[i] === 'string' ? state.words[i] : '';
  }

  function isWordCorrect(state, i) {
    return slot(state, i) === target(state, i);
  }

  /* Words available to type past the current one — used by time/zen modes to
   * know when to top up the buffer. */
  function remaining(state) {
    return state.words.length - state.wordIndex;
  }

  function appendWords(state, more) {
    for (var i = 0; i < more.length; i++) state.words.push(more[i]);
  }

  function elapsed(state, now) {
    if (state.startedAt === null) return 0;
    return ((state.finishedAt === null ? now : state.finishedAt) - state.startedAt) / 1000;
  }

  function finish(state, now) {
    if (state.finishedAt === null) state.finishedAt = now;
    return { type: 'finish' };
  }

  function log(state, now, ch, expected, ok) {
    state.log.push({
      t: state.startedAt === null ? 0 : now - state.startedAt,
      char: ch,
      expected: expected,
      ok: !!ok,
      word: state.wordIndex
    });
  }

  /* True when the whole sequence has been typed out — only meaningful for
   * finite modes. Time and zen end on the clock or on demand instead. */
  function isComplete(state) {
    if (state.mode.type === 'time' || state.mode.type === 'zen') return false;
    return state.wordIndex >= state.words.length;
  }

  function typeChar(state, ch, now) {
    if (state.finishedAt !== null) return { type: 'ignored' };
    if (ch === ' ' || ch === '\n') return commitWord(state, now);
    if (state.startedAt === null) state.startedAt = now;

    var i = state.wordIndex;
    var typed = slot(state, i);
    var want = target(state, i);
    var pos = typed.length;
    var expected = pos < want.length ? want.charAt(pos) : null;
    var ok = expected !== null && ch === expected;

    // stop-on-error/letter: record the miss but refuse to advance the caret.
    if (!ok && state.opts.stopOnError === 'letter') {
      log(state, now, ch, expected, false);
      return { type: 'blocked' };
    }

    if (pos >= want.length + MAX_EXTRA) {
      return { type: 'ignored' };
    }

    state.input[i] = typed + ch;
    log(state, now, ch, expected, ok);

    // Typing the last word to its full length ends a finite test without
    // needing a trailing space — even with mistakes in it, or the test would
    // silently refuse to end and strand the caret. Strict practice is what
    // the stop-on-error modes are for.
    if (isFinalWord(state, i) && state.input[i].length >= want.length) {
      state.wordIndex = i + 1;
      return finish(state, now);
    }
    return { type: 'type', ok: ok };
  }

  function isFinalWord(state, i) {
    if (state.mode.type === 'time' || state.mode.type === 'zen') return false;
    return i === state.words.length - 1;
  }

  function commitWord(state, now) {
    if (state.finishedAt !== null) return { type: 'ignored' };
    var i = state.wordIndex;
    var typed = slot(state, i);

    // A space before anything has been typed for this word is a no-op, not an error.
    if (typed.length === 0) return { type: 'ignored' };
    if (state.startedAt === null) state.startedAt = now;

    var correct = isWordCorrect(state, i);
    if (!correct && state.opts.stopOnError === 'word') {
      log(state, now, ' ', ' ', false);
      return { type: 'blocked' };
    }

    log(state, now, ' ', ' ', correct);
    state.wordIndex = i + 1;
    slot(state, state.wordIndex);

    if (isComplete(state)) return finish(state, now);
    return { type: 'advance' };
  }

  /* Move the caret back into the previous word so it can be edited.
   * Allowed when that word still has errors, or unconditionally in free-backspace mode. */
  function stepBack(state) {
    var i = state.wordIndex;
    if (i <= 0) return false;
    if (!state.opts.freeBackspace && isWordCorrect(state, i - 1)) return false;
    state.wordIndex = i - 1;
    slot(state, state.wordIndex);
    return true;
  }

  function backspace(state) {
    if (state.finishedAt !== null) return { type: 'ignored' };
    if (state.opts.confidenceMode) return { type: 'blocked' };

    var typed = slot(state, state.wordIndex);
    if (typed.length > 0) {
      state.input[state.wordIndex] = typed.slice(0, -1);
      return { type: 'delete' };
    }
    return stepBack(state) ? { type: 'stepback' } : { type: 'ignored' };
  }

  /* Ctrl/Alt/Cmd + Backspace: wipe the whole current word. When the current word
   * is already empty, jump back to the previous word and wipe that one instead —
   * so holding the combo walks backwards a word at a time. */
  function deleteWord(state) {
    if (state.finishedAt !== null) return { type: 'ignored' };
    if (state.opts.confidenceMode) return { type: 'blocked' };

    var typed = slot(state, state.wordIndex);
    if (typed.length > 0) {
      state.input[state.wordIndex] = '';
      return { type: 'delete-word' };
    }
    if (!stepBack(state)) return { type: 'ignored' };
    state.input[state.wordIndex] = '';
    return { type: 'delete-word' };
  }

  TT.engine = {
    create: create,
    typeChar: typeChar,
    commitWord: commitWord,
    backspace: backspace,
    deleteWord: deleteWord,
    stepBack: stepBack,
    finish: finish,
    isComplete: isComplete,
    isWordCorrect: isWordCorrect,
    remaining: remaining,
    appendWords: appendWords,
    elapsed: elapsed,
    slot: slot,
    target: target,
    MAX_EXTRA: MAX_EXTRA,
    DEFAULTS: DEFAULTS
  };
})(typeof window !== 'undefined'
  ? (window.TT = window.TT || {})
  : (global.TT = global.TT || {}));
