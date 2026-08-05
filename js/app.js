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

  var VALUES = {
    time: [[15, '15'], [30, '30'], [60, '60'], [120, '120']],
    words: [[10, '10'], [25, '25'], [50, '50'], [100, '100']],
    quote: [['short', 'short'], ['medium', 'medium'], ['long', 'long'], ['any', 'any']],
    patterns: [['bigrams', 'pairs'], ['trigrams', 'triples'], ['clusters', 'chunks'], ['mixed', 'mixed']]
  };
  var VALUE_KEY = {
    time: 'timeValue', words: 'wordsValue', quote: 'quoteLength', patterns: 'patternKind'
  };

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
      configBar: id('config-bar'),
      configValues: id('config-values'),
      configSepValues: id('config-sep-values'),
      restartBtn: id('restart-btn'),
      keyboardHost: id('keyboard-host'),
      langToggle: id('lang-toggle'),
      langLabel: id('lang-label'),
      themeCycle: id('theme-cycle'),
      toast: id('toast'),

      resWpm: id('res-wpm'), resAcc: id('res-acc'), resMeta: id('res-meta'),
      resChart: id('res-chart'), resGrid: id('res-grid'), resNote: id('res-note'),
      resAgain: id('res-again'), resRepeat: id('res-repeat'), resBack: id('res-back'),

      lessonList: id('lesson-list'), lessonProgress: id('lesson-progress'),

      statTiles: id('stat-tiles'), historyChart: id('history-chart'),
      pbGrid: id('pb-grid'),
      heatmapHost: id('heatmap-host'), worstKeys: id('worst-keys'),
      historyBody: id('history-body'),

      settingsGrid: id('settings-grid'), dataExport: id('data-export'),
      dataImport: id('data-import'), dataReset: id('data-reset'),
      importFile: id('import-file'), storageWarning: id('storage-warning')
    };
  }

  function boot() {
    cache();
    TT.settings.load();
    TT.settings.apply();

    TT.render.mount({ words: els.words, caret: els.caret, window: els.window });
    TT.results.mount({
      wpm: els.resWpm, acc: els.resAcc, meta: els.resMeta, chart: els.resChart,
      grid: els.resGrid, note: els.resNote
    });

    wireInput();
    wireChrome();
    wireResults();
    wireSettingsView();
    registerRoutes();

    TT.settings.onChange(onSettingChange);
    TT.router.start();
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
      else if (e.key === 'Escape') { e.preventDefault(); TT.router.go('test'); }
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
      return TT.generator.lesson(context.lessonDef, { lang: lang });
    }

    switch (s.mode) {
      case 'quote':
        var q = TT.generator.quote({ lang: lang, length: s.quoteLength });
        context.quoteSource = q.source;
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

  function currentMode() {
    var s = TT.settings.all();
    if (context.lessonDef) return { type: 'lesson', value: 0 };
    switch (s.mode) {
      case 'time': return { type: 'time', value: s.timeValue };
      case 'words': return { type: 'words', value: s.wordsValue };
      case 'quote': return { type: 'quote', value: 0 };
      case 'patterns': return { type: 'patterns', value: 0 };
      default: return { type: 'zen', value: 0 };
    }
  }

  function startTest(words) {
    stopTick();
    pausedMs = 0;
    blurredAt = null;
    context.quoteSource = context.quoteSource || null;

    var list = words || buildWords();
    if (!list.length) list = ['the'];
    lastWords = list.slice();

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

    focusInput();
  }

  function resetCounter() {
    var m = state.mode;
    if (m.type === 'time') els.liveCounter.textContent = String(m.value);
    else if (m.type === 'zen') els.liveCounter.textContent = '0:00';
    else els.liveCounter.textContent = '0 / ' + state.words.length;
  }

  function restart() {
    startTest();
  }

  function nextTest() {
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

    TT.statsview.addKeyStats(summary.keys);

    var ctx = {
      lang: context.lang,
      quoteLength: TT.settings.get('quoteLength'),
      lessonId: context.lessonDef ? context.lessonDef.id : null
    };

    if (context.lessonDef) {
      var outcome = TT.lessons.complete(context.lang, context.lessonDef, summary);
      ctx.note = outcome.passed
        ? 'Lesson passed — ' + outcome.stars + (outcome.stars === 1 ? ' star.' : ' stars.')
        : 'Not passed yet. Target is ' + context.lessonDef.target.wpm + ' wpm at ' +
          context.lessonDef.target.acc + '% accuracy.';
    }

    var record = TT.results.toRecord(summary, ctx);
    TT.results.save(record);
    TT.results.render(summary, ctx, record);
    TT.router.go('results');
  }

  /* ── chrome ────────────────────────────────────────────────────── */

  function wireChrome() {
    els.configBar.addEventListener('click', function (e) {
      var btn = e.target.closest('button');
      if (!btn) return;

      if (btn.dataset.mode) {
        context.lessonDef = null;
        TT.settings.set('mode', btn.dataset.mode);
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

    var values = VALUES[s.mode];
    els.configValues.innerHTML = '';
    els.configValues.hidden = !values;
    els.configSepValues.hidden = !values;
    if (!values) return;

    var active = s[VALUE_KEY[s.mode]];
    values.forEach(function (pair) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'opt' + (pair[0] === active ? ' is-on' : '');
      btn.dataset.value = pair[0];
      btn.textContent = pair[1];
      els.configValues.appendChild(btn);
    });

    // Punctuation and numbers only mean anything for generated word lists.
    var generated = s.mode === 'time' || s.mode === 'words' || s.mode === 'zen';
    Array.prototype.forEach.call(els.configBar.querySelectorAll('[data-toggle]'), function (b) {
      b.hidden = !generated;
    });
  }

  function syncKeyboard() {
    var s = TT.settings.all();
    var show = s.showKeyboard;
    els.keyboardHost.hidden = !show;
    if (!show) {
      board = null;
      return;
    }
    var layout = TT.data.layouts.forLanguage(s.lang);
    if (!board || board.layout.id !== layout.id ||
        els.keyboardHost.dataset.fingers !== String(s.fingerColors)) {
      board = TT.keyboard.build(els.keyboardHost, layout, { fingerColors: s.fingerColors });
      els.keyboardHost.dataset.fingers = String(s.fingerColors);
    }
  }

  function onSettingChange(key) {
    if (key === 'lang') {
      els.langLabel.textContent = TT.settings.get('lang').toUpperCase();
      TT.statsview.invalidateLayout();
      board = null;
      context.lessonDef = null;
      if (TT.router.current() === 'test') startTest();
      if (TT.router.current() === 'lessons') renderLessons();
    }
    if (key === 'showKeyboard' || key === 'fingerColors') {
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
  }

  /* ── results view ──────────────────────────────────────────────── */

  function wireResults() {
    els.resAgain.addEventListener('click', nextTest);
    els.resBack.addEventListener('click', function () { TT.router.go('test'); });
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

  function renderStats() {
    TT.statsview.render({
      tiles: els.statTiles,
      chart: els.historyChart,
      pbGrid: els.pbGrid,
      heatmap: els.heatmapHost,
      worst: els.worstKeys,
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
        if (!state || state.finishedAt !== null) startTest();
        else focusInput();
      },
      leave: function () {
        stopTick();
        document.body.classList.remove('is-typing');
      }
    });

    TT.router.register('results', { enter: function () { els.input.blur(); } });

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
