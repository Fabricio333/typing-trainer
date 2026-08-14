/* Application wiring: input capture, the clock, mode orchestration and view glue.
 * Loaded last; everything it depends on is already on TT by this point. */
(function (TT) {
  'use strict';

  var els = {};
  var state = null;          // current engine state
  var context = {};          // { lang, lessonDef, lessonIndex, quoteSource, note }
  var board = null;          // on-screen keyboard handle
  var rafId = null;
  var composing = false;
  var pausedMs = 0;          // total time spent unfocused, excluded from the clock
  var blurredAt = null;
  var lastWords = null;      // for "repeat same text"
  var toastTimer = null;

  var CAPS_TEXT = { en: 'caps lock is on', es: 'bloq mayús activado' };

  var VALUES = {
    time: [[15, '15'], [30, '30'], [60, '60'], [120, '120']],
    words: [[10, '10'], [25, '25'], [50, '50'], [100, '100']],
    quote: [['short', 'short'], ['medium', 'medium'], ['long', 'long'], ['any', 'any']],
    patterns: [['bigrams', 'pairs'], ['trigrams', 'triples'], ['clusters', 'chunks'], ['mixed', 'mixed']],
    hardest: [[10, '10'], [20, '20'], [30, '30'], [50, '50']]
  };
  var VALUE_KEY = {
    time: 'timeValue', words: 'wordsValue', quote: 'quoteLength',
    patterns: 'patternKind', hardest: 'drillSize'
  };
  // What the "hardest" mode can drill: your slowest words, keys, key
  // combinations, or the quote that works your slow spots hardest.
  var HARDEST_KINDS = ['words', 'keys', 'combos', 'quotes'];

  /* The hardest-words drill deliberately freezes its set for the session.
   *
   * If it re-picked the slowest words every test, a word would drop out the
   * moment you got quicker at it — so you would never actually get to practise
   * anything to completion, and the set would churn under you. Instead the set
   * is chosen once and held, with each word's live speed shown next to it so
   * the improvement is visible. `drillBaseline` is the speed each word had when
   * the set was picked, which is what "improved" is measured against. */
  var drillSet = null;
  var drillLang = null;
  var drillLimit = null;     // stats can request a persistent one-word session
  var drillBaseline = {};

  var pendingResume = null;  // words to restore after a refresh, used once
  var recentQuotes = [];     // last few quote texts, so quote mode does not repeat

  /* Active-time clock: pauses whenever the input loses focus, so walking away
   * mid-test does not wreck the WPM. */
  function now() {
    return performance.now() - pausedMs;
  }

  /* ── setup ─────────────────────────────────────────────────────── */

  function cache() {
    var id = function (x) { return document.getElementById(x); };
    els = {
      input: id('hidden-input'),
      typing: id('typing-area'),
      words: id('words'),
      caret: id('caret'),
      window: id('words-window'),
      veil: id('focus-veil'),
      liveCounter: id('live-counter'),
      liveWpm: id('live-wpm'),
      quoteSource: id('quote-source'),
      drillPanel: id('drill-panel'),
      drillWords: id('drill-words'),
      drillSub: id('drill-sub'),
      drillRepick: id('drill-repick'),
      drillEmpty: id('drill-empty'),
      capsAlert: id('caps-alert'),
      capsAlertText: id('caps-alert-text'),
      configBar: id('config-bar'),
      configSepToggles: id('config-sep-toggles'),
      configValues: id('config-values'),
      configSepValues: id('config-sep-values'),
      restartBtn: id('restart-btn'),
      skipBtn: id('skip-btn'),
      keyboardHost: id('keyboard-host'),
      langToggle: id('lang-toggle'),
      langLabel: id('lang-label'),
      themeCycle: id('theme-cycle'),
      toast: id('toast'),

      resWpm: id('res-wpm'), resAcc: id('res-acc'), resMeta: id('res-meta'),
      resChart: id('res-chart'), resGrid: id('res-grid'), resNote: id('res-note'),
      resPrev: id('res-prev'),
      resAgain: id('res-again'), resAgainLabel: id('res-again-label'),
      resRepeat: id('res-repeat'), resBack: id('res-back'),

      lessonList: id('lesson-list'), lessonProgress: id('lesson-progress'),

      statTiles: id('stat-tiles'), historyChart: id('history-chart'),
      pbGrid: id('pb-grid'),
      heatmapHost: id('heatmap-host'), worstKeys: id('worst-keys'),
      keyViewToggle: id('key-view-toggle'), keyViewSub: id('key-view-sub'),
      keyScale: id('key-scale'),
      keySpeedWrap: id('key-speed-wrap'), keySpeedChart: id('key-speed-chart'),
      slowWords: id('slow-words-body'), slowPatterns: id('slow-patterns-body'),
      slowLessons: id('slow-lessons-body'), historyBody: id('history-body'),

      settingsGrid: id('settings-grid'), dataExport: id('data-export'),
      dataImport: id('data-import'), dataReset: id('data-reset'),
      importFile: id('import-file'), storageWarning: id('storage-warning')
    };
  }

  function boot() {
    cache();
    TT.settings.load();
    TT.settings.apply();
    TT.i18n.apply();

    TT.render.mount({ words: els.words, caret: els.caret, window: els.window });
    TT.results.mount({
      wpm: els.resWpm, acc: els.resAcc, meta: els.resMeta, chart: els.resChart,
      grid: els.resGrid, note: els.resNote, prev: els.resPrev
    });

    wireInput();
    wireChrome();
    wireResults();
    wireStatsActions();
    wireSettingsView();
    registerRoutes();

    // A refresh on the test (or its results) lands back in the same test —
    // same lesson, same quote, same words — rather than a newly drawn one.
    var initialView = (window.location.hash.replace(/^#\/?/, '') || 'test').split('/')[0];
    if (initialView === 'test' || initialView === 'results') pendingResume = loadResume();

    TT.settings.onChange(onSettingChange);
    TT.router.start();

    // Offline support: after one visit over http(s) the service worker caches
    // the whole app, so it keeps working with no connection and can be
    // installed. Both the worker and the manifest are http-only — file:// has
    // no service workers and blocks manifest fetches, but needs neither.
    //
    // Both live one level up, at the site root, so the worker's scope covers
    // the landing page as well as this one.
    if (window.location.protocol !== 'file:') {
      var link = document.createElement('link');
      link.rel = 'manifest';
      link.href = '../manifest.webmanifest';
      document.head.appendChild(link);

      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('../sw.js?v=12').catch(function () {
          // Plain-http hosts other than localhost refuse service workers; the
          // app still works, just without the offline cache.
        });
      }
    }
  }

  /* ── input ─────────────────────────────────────────────────────── */

  function wireInput() {
    els.input.addEventListener('keydown', onKeyDown);
    els.input.addEventListener('input', function () {
      if (!composing) drainInput();
    });
    els.input.addEventListener('compositionstart', function () { composing = true; });
    els.input.addEventListener('compositionend', function () {
      composing = false;
      drainInput();
    });

    els.input.addEventListener('focus', onFocus);
    els.input.addEventListener('blur', onBlur);
    els.typing.addEventListener('mousedown', function (e) {
      e.preventDefault();
      focusInput();
    });
    els.veil.addEventListener('click', focusInput);

    window.addEventListener('resize', function () {
      if (state) TT.render.reflow(state);
    });
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) els.input.blur();
    });

    // Shortcuts that must work even when the typing field is not focused.
    document.addEventListener('keydown', onGlobalKey);

    // Both edges: pressing Caps Lock itself reports the new state on one of
    // keydown/keyup depending on the browser, so listen for both.
    document.addEventListener('keydown', updateCapsLock);
    document.addEventListener('keyup', updateCapsLock);
  }

  /* Caps Lock turns every letter into a mistake with no visible cause. */
  function updateCapsLock(e) {
    if (!e.getModifierState) return;
    var on = e.getModifierState('CapsLock');
    els.capsAlertText.textContent = CAPS_TEXT[TT.settings.get('lang')] || CAPS_TEXT.en;
    els.capsAlert.hidden = !on;
  }

  /* Text always arrives through the `input` event rather than keydown, because a
   * dead-key sequence (´ then a -> á on the Spanish layout) only resolves into a
   * real character here. Clearing the field after each read also means the
   * browser's own deleteWordBackward has nothing to act on, so Ctrl+Backspace is
   * handled in exactly one place below. */
  function drainInput() {
    var text = els.input.value;
    if (!text) return;
    els.input.value = '';
    if (!state || state.finishedAt !== null) return;

    for (var i = 0; i < text.length; i++) handleChar(text.charAt(i));
    afterChange();
  }

  function handleChar(ch) {
    var res = TT.engine.typeChar(state, ch, now());
    if (res.type === 'ignored') return;

    if (res.type === 'blocked') {
      TT.sound.play('error');
      TT.keyboard.flash(board, ch, false);
      return;
    }

    var wrong = res.ok === false;
    TT.sound.play(ch === ' ' ? 'space' : wrong ? 'error' : 'key');
    TT.keyboard.flash(board, ch, !wrong);

    if (res.type === 'finish') finish();
  }

  function expectedChar() {
    if (!state) return null;
    var want = state.words[state.wordIndex] || '';
    var typed = state.input[state.wordIndex] || '';
    return typed.length < want.length ? want.charAt(typed.length) : null;
  }

  function onKeyDown(e) {
    if (!state) return;

    if (e.key === 'Backspace') {
      e.preventDefault();
      // Ctrl (and Alt, and Cmd on macOS) wipes the whole word rather than a char.
      var res = (e.ctrlKey || e.altKey || e.metaKey)
        ? TT.engine.deleteWord(state)
        : TT.engine.backspace(state);
      if (res.type !== 'ignored') afterChange();
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      // Return commits the current word, exactly like space.
      var r = TT.engine.commitWord(state, now());
      if (r.type !== 'ignored') {
        TT.sound.play('space');
        if (r.type === 'finish') finish();
        else afterChange();
      }
      return;
    }

    if (e.key === 'Tab' && TT.settings.get('quickRestart') === 'tab') {
      e.preventDefault();
      restart();
      return;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      if (TT.settings.get('quickRestart') === 'esc') restart();
      else els.input.blur();
    }
  }

  function onGlobalKey(e) {
    var view = TT.router.current();

    if (view === 'results') {
      if (e.key === 'Enter') { e.preventDefault(); nextTest(); }
      else if (e.key === 'Escape') { e.preventDefault(); backToMenu(); }
      else if (e.key === 'Tab') { e.preventDefault(); nextTest(); }
      return;
    }

    // Typing anywhere on the test screen should just work.
    if (view === 'test' && document.activeElement !== els.input) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key.length === 1 || e.key === 'Backspace') focusInput();
    }
  }

  function focusInput() {
    els.input.focus({ preventScroll: true });
  }

  function onFocus() {
    els.typing.classList.remove('is-blurred');
    if (blurredAt !== null) {
      pausedMs += performance.now() - blurredAt;
      blurredAt = null;
    }
  }

  function onBlur() {
    els.typing.classList.add('is-blurred');
    if (state && state.startedAt !== null && state.finishedAt === null && blurredAt === null) {
      blurredAt = performance.now();
    }
  }

  /* ── after every state change ──────────────────────────────────── */

  function afterChange() {
    TT.render.sync(state);
    TT.keyboard.highlight(board, expectedChar());
    topUpWords();
    document.body.classList.toggle(
      'is-typing',
      state.startedAt !== null && state.finishedAt === null
    );
    if (state.startedAt !== null && rafId === null) tick();
  }

  /* Endless modes keep a healthy buffer of words ahead of the caret. */
  function topUpWords() {
    var mode = state.mode.type;
    if (mode !== 'time' && mode !== 'zen') return;
    if (TT.engine.remaining(state) > 25) return;

    var from = state.words.length;
    TT.engine.appendWords(state, buildWords(30));
    TT.render.appendFrom(state, from);
  }

  /* ── clock ─────────────────────────────────────────────────────── */

  function tick() {
    rafId = window.requestAnimationFrame(tick);
    if (!state || state.startedAt === null || state.finishedAt !== null) {
      stopTick();
      return;
    }

    var elapsed = TT.engine.elapsed(state, now());

    if (state.mode.type === 'time') {
      var left = Math.max(0, state.mode.value - elapsed);
      els.liveCounter.textContent = String(Math.ceil(left));
      if (left <= 0) {
        finish();
        return;
      }
    } else if (state.mode.type === 'zen') {
      els.liveCounter.textContent = formatClock(elapsed);
    } else {
      els.liveCounter.textContent = state.wordIndex + ' / ' + state.words.length;
    }

    if (elapsed > 0.5) {
      var live = TT.stats.summarize(state, now());
      els.liveWpm.textContent = Math.round(live.wpm) + ' wpm · ' + Math.round(live.accuracy) + '%';
    }
  }

  function stopTick() {
    if (rafId !== null) {
      window.cancelAnimationFrame(rafId);
      rafId = null;
    }
  }

  function formatClock(seconds) {
    var m = Math.floor(seconds / 60);
    var s = Math.floor(seconds % 60);
    return m + ':' + (s < 10 ? '0' : '') + s;
  }

  /* ── building a test ───────────────────────────────────────────── */

  function buildWords(count) {
    var s = TT.settings.all();
    var lang = s.lang;

    if (context.lessonDef) {
      return TT.generator.lesson(context.lessonDef, {
        lang: lang,
        slowest: TT.keyspeed.slowest(lang, 12).map(function (r) { return r.pair; })
      });
    }

    switch (s.mode) {
      case 'quote':
        var q = TT.generator.quote({ lang: lang, length: s.quoteLength, avoid: recentQuotes });
        context.quoteSource = q.source;
        recentQuotes.push(q.text);
        if (recentQuotes.length > 10) recentQuotes.shift();
        return q.words;

      case 'patterns':
        return TT.generator.words({
          lang: lang,
          count: count || 40,
          source: 'patterns',
          patternKind: s.patternKind,
          adaptive: s.patternAdaptive,
          keyStats: TT.statsview.keyStats()
        });

      case 'hardest':
        return hardestDrill(count);

      case 'words':
        return TT.generator.words({
          lang: lang, count: count || s.wordsValue, poolSize: s.poolSize,
          punctuation: s.punctuation, numbers: s.numbers
        });

      default: // time, zen
        return TT.generator.words({
          lang: lang, count: count || 60, poolSize: s.poolSize,
          punctuation: s.punctuation, numbers: s.numbers
        });
    }
  }

  /* ── hardest-* drills ──────────────────────────────────────────── */

  /* Serves whichever weakness the learner picked for the hardest mode. Every
   * kind falls back to ordinary words until there is enough history to rank.
   * context.keyDrill, set from the stats screen, narrows the keys kind to a
   * specific key instead of the five slowest. */
  function hardestDrill(count) {
    var s = TT.settings.all();
    var lang = s.lang;
    var kind = context.keyDrill ? 'keys' : (s.hardestKind || 'words');

    if (kind === 'keys') {
      var keys = context.keyDrill ||
        TT.keyspeed.keys(lang, 5).map(function (r) { return r.key; });
      if (keys.length) {
        // The learner's slowest transitions into these keys join the drill.
        var into = TT.keyspeed.slowest(lang, 0).filter(function (r) {
          return keys.indexOf(r.pair.charAt(1)) !== -1;
        }).slice(0, 10).map(function (r) { return r.pair; });
        var list = TT.generator.keyDrill({ lang: lang, keys: keys, pairs: into, count: count || 40 });
        if (list.length) {
          context.quoteSource = (keys.length === 1
            ? TT.i18n.t('drill.keyLabel')
            : TT.i18n.t('drill.slowKeysLabel')) + ': ' + keys.join(' · ');
          return list;
        }
      }
    }

    if (kind === 'combos') {
      var pairs = TT.keyspeed.slowest(lang, 12).map(function (r) { return r.pair; });
      if (pairs.length) {
        var combo = TT.generator.pairDrill({ lang: lang, pairs: pairs, count: count || 40 });
        if (combo.length) {
          context.quoteSource = TT.i18n.t('drill.slowCombosLabel') + ': ' + pairs.slice(0, 6).join(' ');
          return combo;
        }
      }
    }

    if (kind === 'quotes') {
      var slow = TT.keyspeed.slowest(lang, 12).map(function (r) { return r.pair; });
      var q = TT.generator.hardestQuote({ lang: lang, pairs: slow, avoid: recentQuotes });
      if (q.words.length) {
        context.quoteSource = q.source;
        recentQuotes.push(q.text);
        if (recentQuotes.length > 10) recentQuotes.shift();
        return q.words;
      }
    }

    if (kind === 'words') {
      var set = ensureDrillSet();
      // Nothing ranked yet: fall back to ordinary words so the screen still
      // works. renderDrillPanel explains why there is no drill.
      if (set.length) return TT.generator.drill(set, count || (s.drillSize || 20) * 2);
    }

    return TT.generator.words({ lang: lang, count: count || 25, poolSize: s.poolSize });
  }

  /* ── hardest-words drill ───────────────────────────────────────── */

  var MIN_DRILL_SAMPLES = 2;

  /* Picks the set once and remembers each word's speed at that moment. */
  function pickDrillSet() {
    var lang = TT.settings.get('lang');
    var size = drillLimit || TT.settings.get('drillSize') || 20;
    var rows = TT.wordstats.hardest(lang, size, MIN_DRILL_SAMPLES);

    drillSet = rows.map(function (r) { return r.word; });
    drillLang = lang;
    drillBaseline = {};
    rows.forEach(function (r) { drillBaseline[r.word] = r.bestWpm; });
    return drillSet;
  }

  function ensureDrillSet() {
    // Re-pick when the language changed or the size no longer matches, but
    // never merely because the rankings moved.
    var size = drillLimit || TT.settings.get('drillSize') || 20;
    if (!drillSet || drillLang !== TT.settings.get('lang') || drillSet.length > size) {
      pickDrillSet();
    }
    return drillSet;
  }

  function renderDrillPanel() {
    var isDrill = TT.settings.get('mode') === 'hardest' && !context.lessonDef &&
      !context.keyDrill && (TT.settings.get('hardestKind') || 'words') === 'words';
    els.drillPanel.hidden = !isDrill;
    els.drillEmpty.hidden = true;
    if (!isDrill) return;

    var lang = TT.settings.get('lang');
    var set = ensureDrillSet();

    if (!set.length) {
      els.drillPanel.hidden = true;
      els.drillEmpty.hidden = false;
      var have = TT.wordstats.rankableCount(lang, MIN_DRILL_SAMPLES);
      els.drillEmpty.textContent = have === 0
        ? 'No word history yet. Run a few time or words tests first — every word you ' +
          'type is timed, and the slowest ones will show up here.'
        : 'Only ' + have + ' word' + (have === 1 ? '' : 's') + ' typed enough times so far. ' +
          'Each word needs at least ' + MIN_DRILL_SAMPLES + ' clean attempts before it can be ranked.';
      return;
    }

    // Live speeds, so improvement shows up as you drill.
    var current = {};
    TT.wordstats.rank(TT.wordstats.all(lang), { minSamples: 1 }).forEach(function (r) {
      current[r.word] = r;
    });

    els.drillSub.textContent =
      set.length + ' words, fixed for this session · sorted slowest first when picked';

    els.drillWords.innerHTML = set.map(function (word) {
      var row = current[word];
      var wpm = row ? Math.round(row.bestWpm) : 0;
      var was = drillBaseline[word] || 0;
      var improved = was > 0 && row && row.bestWpm > was;
      return '<span class="drill-word' + (improved ? ' is-improved' : '') + '">' +
        '<b>' + escapeHtml(word) + '</b>' +
        '<span class="drill-wpm">' + (wpm ? wpm + ' wpm' : '—') +
        (improved ? ' ▲' : '') + '</span></span>';
    }).join('');
  }

  function escapeHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function currentMode() {
    var s = TT.settings.all();
    if (context.lessonDef) return { type: 'lesson', value: 0 };
    switch (s.mode) {
      case 'time': return { type: 'time', value: s.timeValue };
      case 'words': return { type: 'words', value: s.wordsValue };
      case 'quote': return { type: 'quote', value: 0 };
      case 'patterns': return { type: 'patterns', value: 0 };
      case 'hardest': return { type: 'hardest', value: s.drillSize || 20 };
      default: return { type: 'zen', value: 0 };
    }
  }

  function startTest(words) {
    stopTick();
    pausedMs = 0;
    blurredAt = null;
    var list = words;
    if (!list) {
      // Freshly drawn content sets its own source label; a stale one from the
      // previous test must not survive into it.
      context.quoteSource = null;
      list = buildWords();
    }
    context.quoteSource = context.quoteSource || null;
    if (!list.length) list = ['the'];
    lastWords = list.slice();

    // Remembered so a refresh can bring back this exact test.
    var m = currentMode();
    TT.storage.write('session', {
      lang: TT.settings.get('lang'),
      mode: m.type + ':' + m.value,
      lessonId: context.lessonDef ? context.lessonDef.id : null,
      quoteSource: context.quoteSource || null,
      words: lastWords
    });

    state = TT.engine.create(list, currentMode(), TT.settings.engineOpts());
    context.lang = TT.settings.get('lang');

    TT.render.renderAll(state);
    document.body.classList.remove('is-typing');
    els.liveWpm.textContent = '';
    resetCounter();
    syncKeyboard();
    TT.keyboard.highlight(board, expectedChar());

    els.quoteSource.hidden = !(context.lessonDef || context.quoteSource);
    els.quoteSource.textContent = context.lessonDef
      ? context.lessonDef.title
      : (context.quoteSource || '');

    renderDrillPanel();
    focusInput();
  }

  function resetCounter() {
    var m = state.mode;
    if (m.type === 'time') els.liveCounter.textContent = String(m.value);
    else if (m.type === 'zen') els.liveCounter.textContent = '0:00';
    else els.liveCounter.textContent = '0 / ' + state.words.length;
  }

  /* What was on screen before a refresh: the lesson, the quote source and the
   * exact word list. Applied once, to the first test after load. */
  function loadResume() {
    var saved = TT.storage.read('session', null);
    if (!saved || saved.lang !== TT.settings.get('lang')) return null;
    if (saved.lessonId) {
      var found = TT.lessons.find(saved.lang, saved.lessonId);
      if (!found) return null;
      context.lessonDef = found.def;
      context.lessonIndex = found.index;
    } else {
      // The saved words belong to a mode. If the mode changed since — from the
      // settings screen, or another tab — a stale list must not leak into it.
      var m = currentMode();
      if (saved.mode !== m.type + ':' + m.value) return null;
    }
    context.quoteSource = saved.quoteSource || null;
    return Array.isArray(saved.words) && saved.words.length ? saved.words : null;
  }

  function restart() {
    startTest();
  }

  /* Skips the current text without finishing it: a lesson jumps ahead to the
   * next one on the track — deliberately allowed even before a pass — and
   * every other mode simply draws fresh content (the next quote, a new set of
   * words). */
  function skip() {
    if (context.lessonDef) {
      var lang = TT.settings.get('lang');
      var found = TT.lessons.find(lang, context.lessonDef.id);
      var track = TT.lessons.track(lang);
      if (!found || found.index + 1 >= track.length) {
        toast(TT.i18n.t('skip.lastLesson'));
        return;
      }
      context.lessonDef = track[found.index + 1];
      context.lessonIndex = found.index + 1;
      toast(TT.i18n.t('skip.skippedTo') + ': ' + context.lessonDef.title);
    }
    startTest();
  }

  function nextTest() {
    // After a passed lesson, "next" advances the track instead of replaying.
    if (context.lessonDef && context.lessonNext) {
      var found = TT.lessons.find(context.lang, context.lessonNext.id);
      context.lessonDef = context.lessonNext;
      context.lessonIndex = found ? found.index : 0;
      context.lessonNext = null;
    }
    TT.router.go('test');
    startTest();
  }

  /* ── finishing ─────────────────────────────────────────────────── */

  function finish() {
    stopTick();
    if (state.finishedAt === null) TT.engine.finish(state, now());
    document.body.classList.remove('is-typing');
    els.input.blur();

    var summary = TT.stats.summarize(state, now());

    // A test nobody actually typed is not a result worth keeping.
    if (summary.keystrokes < 2 || summary.seconds < 1) {
      TT.router.go('test');
      toast('Too short to score — give it a proper go.');
      startTest();
      return;
    }

    var ctx = {
      lang: context.lang,
      quoteLength: TT.settings.get('quoteLength'),
      hardestKind: context.keyDrill ? 'keys' : (TT.settings.get('hardestKind') || 'words'),
      lessonId: context.lessonDef ? context.lessonDef.id : null,
      // Fixed content gets an identity so runs of the same text compare:
      // lessons by id, quotes by their (stable) opening words.
      contentKey: context.lessonDef ? context.lessonDef.id
        : state.mode.type === 'quote' ? 'q:' + lastWords.join(' ').slice(0, 80)
        : null
    };

    // The lesson outcome and the next step for the "next" button. Marking the
    // lesson complete comes before any history recording: bookkeeping must
    // never be able to eat a pass.
    context.lessonNext = null;
    if (context.lessonDef) {
      var outcome = TT.lessons.complete(context.lang, context.lessonDef, summary);
      ctx.note = outcome.passed
        ? 'Lesson passed — ' + outcome.stars + (outcome.stars === 1 ? ' star.' : ' stars.')
        : 'Not passed yet. Target is ' + context.lessonDef.target.wpm + ' wpm at ' +
          context.lessonDef.target.acc + '% accuracy.';

      // Once the lesson has ever been passed, "next" means the next lesson.
      if (TT.lessons.passed(context.lessonDef.id)) {
        var found = TT.lessons.find(context.lang, context.lessonDef.id);
        var track = TT.lessons.track(context.lang);
        if (found && found.index + 1 < track.length) {
          context.lessonNext = track[found.index + 1];
        }
      }
      els.resAgainLabel.textContent = context.lessonNext ? TT.i18n.t('res.nextLesson')
        : TT.lessons.passed(context.lessonDef.id) ? TT.i18n.t('res.repeatLesson')
        : TT.i18n.t('res.tryAgain');
    } else {
      els.resAgainLabel.textContent = TT.i18n.t('res.next');
    }

    var record = TT.results.toRecord(summary, ctx);
    TT.results.save(record);
    // Navigate first: the chart sizes itself from its on-screen box, and a
    // still-hidden canvas measures zero.
    TT.router.go('results');
    TT.results.render(summary, ctx, record);

    // History recording, after the result is safely on screen. A stats module
    // that fails here — say a half-updated cache mid-deploy left old and new
    // files mixed — must not take the result or the lesson pass down with it.
    try {
      TT.statsview.addKeyStats(summary.keys);

      // The per-word history only wants real words: finger drills and pattern
      // practice type random letter chunks, which would otherwise surface in
      // the hardest-words drill as gibberish.
      var hardestKind = TT.settings.get('hardestKind') || 'words';
      var chunkText = state.mode.type === 'patterns' ||
        // Key and combination drills mix bare letter pairs into the text.
        (state.mode.type === 'hardest' &&
          (context.keyDrill || hardestKind === 'keys' || hardestKind === 'combos')) ||
        !!(context.lessonDef &&
           (context.lessonDef.chars || context.lessonDef.patterns || context.lessonDef.slowest));
      if (!chunkText) {
        TT.wordstats.record(context.lang, TT.stats.wordTimings(state));
      }

      // Transition speed is real regardless of what was typed, so every mode
      // feeds the slowest-combinations history.
      TT.keyspeed.record(context.lang, TT.keyspeed.fromLog(state.log));
    } catch (err) {
      // The result still stands; only this test's history entry is lost.
    }
  }

  /* ── chrome ────────────────────────────────────────────────────── */

  function wireChrome() {
    els.configBar.addEventListener('click', function (e) {
      var btn = e.target.closest('button');
      if (!btn) return;

      if (btn.dataset.mode) {
        context.lessonDef = null;
        context.keyDrill = null;
        drillLimit = null;
        TT.settings.set('mode', btn.dataset.mode);
        renderConfig();
        startTest();
      } else if (btn.dataset.kind) {
        context.keyDrill = null;
        drillLimit = null;
        TT.settings.set('hardestKind', btn.dataset.kind);
        renderConfig();
        startTest();
      } else if (btn.dataset.toggle) {
        TT.settings.set(btn.dataset.toggle, !TT.settings.get(btn.dataset.toggle));
        renderConfig();
        startTest();
      } else if (btn.dataset.value !== undefined) {
        var key = VALUE_KEY[TT.settings.get('mode')];
        var raw = btn.dataset.value;
        TT.settings.set(key, isNaN(Number(raw)) ? raw : Number(raw));
        renderConfig();
        startTest();
      }
    });

    els.restartBtn.addEventListener('click', restart);
    els.skipBtn.addEventListener('click', skip);

    els.drillRepick.addEventListener('click', function () {
      pickDrillSet();
      renderDrillPanel();
      startTest();
      toast('New set picked.');
    });

    els.langToggle.addEventListener('click', function () {
      TT.settings.set('lang', TT.settings.get('lang') === 'en' ? 'es' : 'en');
    });

    els.themeCycle.addEventListener('click', function () {
      toast(TT.settings.cycleTheme());
    });
  }

  function renderConfig() {
    var s = TT.settings.all();

    Array.prototype.forEach.call(els.configBar.querySelectorAll('[data-mode]'), function (b) {
      b.classList.toggle('is-on', b.dataset.mode === s.mode);
    });
    Array.prototype.forEach.call(els.configBar.querySelectorAll('[data-toggle]'), function (b) {
      var on = !!s[b.dataset.toggle];
      b.classList.toggle('is-on', on);
      b.setAttribute('aria-pressed', String(on));
    });

    // Punctuation and numbers only mean anything for generated word lists.
    var generated = s.mode === 'time' || s.mode === 'words' || s.mode === 'zen';
    Array.prototype.forEach.call(els.configBar.querySelectorAll('[data-toggle]'), function (b) {
      b.hidden = !generated;
    });
    // Hide the divider too, or it leaves a gap where the toggles were.
    els.configSepToggles.hidden = !generated;

    els.configValues.innerHTML = '';
    var hardest = s.mode === 'hardest';
    var values = VALUES[s.mode];

    // The hardest mode picks what to drill first; a set size only applies to
    // the words kind.
    if (hardest) {
      var activeKind = s.hardestKind || 'words';
      HARDEST_KINDS.forEach(function (kind) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'opt' + (kind === activeKind ? ' is-on' : '');
        btn.dataset.kind = kind;
        btn.textContent = TT.i18n.t('kind.' + kind);
        els.configValues.appendChild(btn);
      });
      if (activeKind !== 'words') values = null;
    }

    if (values) {
      if (hardest) {
        var sep = document.createElement('span');
        sep.className = 'config-sep';
        sep.setAttribute('aria-hidden', 'true');
        els.configValues.appendChild(sep);
      }
      var active = s[VALUE_KEY[s.mode]];
      values.forEach(function (pair) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'opt' + (pair[0] === active ? ' is-on' : '');
        btn.dataset.value = pair[0];
        btn.textContent = s.mode === 'quote' ? TT.i18n.t('len.' + pair[0])
          : s.mode === 'patterns' ? TT.i18n.t('pat.' + pair[0])
          : pair[1];
        els.configValues.appendChild(btn);
      });
    }

    var showValues = hardest || !!values;
    els.configValues.hidden = !showValues;
    els.configSepValues.hidden = !showValues;
  }

  function syncKeyboard() {
    var s = TT.settings.all();
    var show = s.showKeyboard;
    els.keyboardHost.hidden = !show;
    if (!show) {
      board = null;
      return;
    }
    var layout = TT.data.layouts.resolve(s.keyboardLayout, s.lang);
    if (!board || board.layout.id !== layout.id ||
        els.keyboardHost.dataset.fingers !== String(s.fingerColors)) {
      board = TT.keyboard.build(els.keyboardHost, layout, { fingerColors: s.fingerColors });
      els.keyboardHost.dataset.fingers = String(s.fingerColors);
    }
  }

  function onSettingChange(key) {
    if (key === 'lang') {
      els.langLabel.textContent = TT.settings.get('lang').toUpperCase();
      TT.i18n.apply();
      TT.statsview.invalidateLayout();
      board = null;
      context.lessonDef = null;
      context.keyDrill = null;
      drillSet = null;   // word history is per language
      drillLimit = null;
      if (TT.router.current() === 'test') { renderConfig(); startTest(); }
      if (TT.router.current() === 'lessons') renderLessons();
      if (TT.router.current() === 'stats') renderStats();
    }
    if (key === 'showKeyboard' || key === 'fingerColors' || key === 'keyboardLayout') {
      if (key === 'keyboardLayout') TT.statsview.invalidateLayout();
      board = null;
      syncKeyboard();
      if (state) TT.keyboard.highlight(board, expectedChar());
    }
    if (key === 'theme' && TT.router.current() === 'stats') renderStats();
    if (key === 'fontSize' && state) {
      // Line wrapping changes with the type size.
      window.requestAnimationFrame(function () { TT.render.reflow(state); });
    }
    if (['freeBackspace', 'confidenceMode', 'stopOnError'].indexOf(key) !== -1 && state) {
      state.opts = TT.settings.engineOpts();
    }
    if (key === 'poolSize' || key === 'punctuation' || key === 'numbers') {
      if (TT.router.current() === 'test') startTest();
    }
    if (key === 'drillSize') {
      // An explicit size change is a request for a different set, unlike the
      // rankings shifting underneath an existing one.
      drillLimit = null;
      pickDrillSet();
      renderDrillPanel();
      if (TT.router.current() === 'test') startTest();
    }
  }

  /* ── results view ──────────────────────────────────────────────── */

  /* "Back to menu" means the place the run came from: the lessons list for a
   * lesson, the test screen for everything else. */
  function backToMenu() {
    TT.router.go(context.lessonDef ? 'lessons' : 'test');
  }

  function wireResults() {
    els.resAgain.addEventListener('click', nextTest);
    els.resBack.addEventListener('click', backToMenu);
    els.resRepeat.addEventListener('click', function () {
      TT.router.go('test');
      startTest(lastWords ? lastWords.slice() : null);
    });
  }

  /* ── lessons view ──────────────────────────────────────────────── */

  function renderLessons() {
    TT.lessons.renderList(
      els.lessonList,
      els.lessonProgress,
      TT.settings.get('lang'),
      function (def, index) {
        context.lessonDef = def;
        context.lessonIndex = index;
        TT.router.go('test');
        startTest();
      }
    );
  }

  /* ── stats view ────────────────────────────────────────────────── */

  /* The stat cards double as launch pads: what they diagnose, you can drill. */
  function wireStatsActions() {
    function startWordDrill(rows) {
      context.lessonDef = null;
      context.keyDrill = null;
      TT.settings.set('mode', 'hardest');
      TT.settings.set('hardestKind', 'words');
      drillLimit = rows ? rows.length : null;
      if (rows) {
        drillSet = rows.map(function (r) { return r.word; });
        drillLang = TT.settings.get('lang');
        drillBaseline = {};
        rows.forEach(function (r) { drillBaseline[r.word] = r.bestWpm; });
      } else {
        pickDrillSet();
      }
      TT.router.go('test');
      startTest();
    }

    document.getElementById('practice-hardest-word').addEventListener('click', function () {
      var rows = TT.wordstats.hardest(
        TT.settings.get('lang'), 1, TT.wordstats.DEFAULT_MIN_SAMPLES
      );
      if (!rows.length) {
        toast(TT.i18n.t('drill.noWordHistory'));
        return;
      }
      startWordDrill(rows);
    });

    document.getElementById('practice-slow-words').addEventListener('click', function () {
      startWordDrill(null);
    });

    document.getElementById('practice-slow-patterns').addEventListener('click', function () {
      var lang = TT.settings.get('lang');
      var found = TT.lessons.find(lang, lang + '-slowest');
      if (!found) return;
      context.lessonDef = found.def;
      context.lessonIndex = found.index;
      context.keyDrill = null;
      TT.router.go('test');
      startTest();
    });

    /* A session over specific keys. Passing null means the five slowest,
     * re-picked on every restart; a single key comes from its stats chip. */
    function startKeyDrill(keysOverride) {
      if (!TT.keyspeed.keys(TT.settings.get('lang'), 1).length && !keysOverride) {
        toast(TT.i18n.t('drill.noKeyHistory'));
        return;
      }
      context.lessonDef = null;
      context.keyDrill = keysOverride || null;
      TT.settings.set('mode', 'hardest');
      TT.settings.set('hardestKind', 'keys');
      TT.router.go('test');
      renderConfig();
      startTest();
    }

    document.getElementById('practice-slow-keys').addEventListener('click', function () {
      startKeyDrill(null);
    });

    // Every "worst key" chip is a launch pad for a session on that one key.
    els.worstKeys.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-key]');
      if (btn) startKeyDrill([btn.dataset.key]);
    });

    function startLessonRow(target) {
      var tr = target.closest('tr[data-lesson-id]');
      if (!tr) return;
      var found = TT.lessons.find(TT.settings.get('lang'), tr.dataset.lessonId);
      if (!found) return;
      context.lessonDef = found.def;
      context.lessonIndex = found.index;
      TT.router.go('test');
      startTest();
    }
    // Guarded: a browser holding a stale index.html would otherwise throw here
    // and take every listener wired after it down with it.
    if (els.keyViewToggle) {
      els.keyViewToggle.addEventListener('click', function (e) {
        var btn = e.target.closest('[data-keyview]');
        if (!btn) return;
        TT.statsview.setKeyView(btn.dataset.keyview);
        renderStats();
      });
    }

    els.slowLessons.addEventListener('click', function (e) { startLessonRow(e.target); });
    els.slowLessons.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') startLessonRow(e.target);
    });
  }

  function renderStats() {
    TT.statsview.render({
      tiles: els.statTiles,
      chart: els.historyChart,
      pbGrid: els.pbGrid,
      heatmap: els.heatmapHost,
      worst: els.worstKeys,
      keyViewToggle: els.keyViewToggle,
      keyViewSub: els.keyViewSub,
      keyScale: els.keyScale,
      keySpeedWrap: els.keySpeedWrap,
      keySpeedChart: els.keySpeedChart,
      slowWords: els.slowWords,
      slowPatterns: els.slowPatterns,
      slowLessons: els.slowLessons,
      historyBody: els.historyBody
    }, TT.settings.get('lang'));
  }

  /* ── settings view ─────────────────────────────────────────────── */

  function wireSettingsView() {
    els.dataExport.addEventListener('click', function () {
      var blob = new Blob([JSON.stringify(TT.storage.exportAll(), null, 2)],
        { type: 'application/json' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'typing-trainer-backup.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
      toast('Exported.');
    });

    els.dataImport.addEventListener('click', function () { els.importFile.click(); });

    els.importFile.addEventListener('change', function () {
      var file = els.importFile.files && els.importFile.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function () {
        try {
          TT.storage.importAll(JSON.parse(reader.result));
          TT.settings.load();
          TT.settings.apply();
          els.langLabel.textContent = TT.settings.get('lang').toUpperCase();
          TT.settings.renderView(els.settingsGrid);
          toast('Imported.');
        } catch (err) {
          toast('That file could not be read.');
        }
      };
      reader.readAsText(file);
      els.importFile.value = '';
    });

    els.dataReset.addEventListener('click', function () {
      if (!window.confirm('Delete all results, lesson progress and settings? This cannot be undone.')) {
        return;
      }
      TT.storage.clearAll();
      TT.settings.load();
      TT.settings.apply();
      TT.settings.renderView(els.settingsGrid);
      els.langLabel.textContent = TT.settings.get('lang').toUpperCase();
      board = null;
      TT.statsview.invalidateLayout();
      toast('Everything reset.');
    });
  }

  /* ── routes ────────────────────────────────────────────────────── */

  function registerRoutes() {
    TT.router.register('test', {
      enter: function () {
        els.langLabel.textContent = TT.settings.get('lang').toUpperCase();
        renderConfig();
        syncKeyboard();
        if (!state || state.finishedAt !== null) {
          startTest(pendingResume);
          pendingResume = null;
        } else {
          focusInput();
        }
      },
      leave: function () {
        stopTick();
        document.body.classList.remove('is-typing');
      }
    });

    TT.router.register('results', {
      enter: function () {
        // A refresh on this route has no result to show; fall through to the
        // test screen, which restores the interrupted test.
        if (!state) {
          TT.router.go('test');
          return;
        }
        els.input.blur();
      }
    });

    TT.router.register('lessons', { enter: renderLessons });

    TT.router.register('stats', { enter: renderStats });

    TT.router.register('settings', {
      enter: function () {
        TT.settings.renderView(els.settingsGrid);
        els.storageWarning.hidden = TT.storage.isPersistent();
      }
    });
  }

  /* ── misc ──────────────────────────────────────────────────────── */

  function toast(message) {
    els.toast.textContent = message;
    els.toast.hidden = false;
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { els.toast.hidden = true; }, 1800);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})(window.TT = window.TT || {});
