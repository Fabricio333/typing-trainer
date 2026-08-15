/* Landing page behaviour. Standalone: it shares the palette and base stylesheet
 * with the trainer but none of its JavaScript, so nothing here can slow the app
 * itself down.
 *
 * Everything is progressive. With scripting off the page is still complete
 * prose — the demo panel simply stays empty and the reveal animation never gets
 * applied, because the class that hides content is added by this file. */
(function () {
  'use strict';

  var reduced = window.matchMedia &&
                window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── shared with the trainer: the saved theme ──────────────────── */

  var SETTINGS_KEY = 'tt.settings.v1';
  var THEMES = ['carbon', 'paper', 'nord', 'dracula', 'solarized', 'matrix', 'ocean', 'sepia'];

  /* ── Spanish ───────────────────────────────────────────────────── */

  /* Only one dictionary: the English copy is the markup itself, captured before
   * the first swap, so it never has to be maintained in two places. Values are
   * ours, never user input, which is what makes innerHTML safe here.
   *
   * The register follows the essay this page is built from — Rioplatense
   * Spanish, second person voseo. */
  var ES = {
    'l.skip': 'Saltar al contenido',
    'l.nav.how': 'cómo funciona',
    'l.nav.preview': 'pantallas',
    'l.nav.faq': 'preguntas',

    'l.cta.start': 'empezá a escribir <span class="arrow" aria-hidden="true">→</span>',
    'l.hero.eyebrow': 'gratis · sin conexión · sin cuentas',
    'l.hero.title': 'escribí sin mirar el teclado. después <em>seguí mejorando</em>.',
    'l.hero.sub': 'lecciones guiadas, estadísticas en vivo y ejercicios hechos con las teclas que te frenan.',
    'l.hero.note': 'nada que instalar · nada sale de tu navegador',

    'l.fig.lessons': 'lecciones guiadas',
    'l.fig.modes': 'modos de práctica',
    'l.fig.zero': 'cuentas o rastreadores',

    'l.how.eyebrow': 'cómo funciona',
    'l.how.title': 'aprendé. medí. mejorá.',
    'l.step1.title': 'aprendé el teclado',
    'l.step1.body': '22 lecciones guiadas.',
    'l.step2.title': 'mirá cada resultado',
    'l.step2.body': 'velocidad, precisión, constancia.',
    'l.step3.title': 'arreglá lo que va lento',
    'l.step3.body': 'ejercicios personales automáticos.',

    'l.prev.eyebrow': 'la app real',
    'l.prev.title': 'menos explicación. más pantalla.',
    'l.prev.altTest': 'Una prueba de escritura en curso: una cuenta regresiva, palabras por minuto y precisión en vivo, las palabras que faltan en gris y un teclado en pantalla que resalta la próxima tecla.',
    'l.prev.altLessons': 'La lista de lecciones: veintidós lecciones desde la fila guía con f y j, cada una con su velocidad objetivo, su precisión objetivo y tres estrellas, con las siguientes bloqueadas.',
    'l.prev.capTest': '<b>prueba en vivo</b> velocidad, precisión, próxima tecla.',
    'l.prev.capLessons': '<b>lecciones</b> objetivos claros, progreso visible.',
    'l.prev.capHeat': '<b>mapa de calor</b> las teclas flojas se encienden.',
    'l.prev.accurate': 'precisa',
    'l.prev.errorProne': 'propensa al error',

    'l.feat.eyebrow': 'qué incluye',
    'l.feat.title': 'lo que sirve',
    'l.feat1.title': 'ejercicios adaptativos',
    'l.feat2.title': 'estadísticas en vivo',
    'l.feat4.title': 'español + inglés',
    'l.feat6.title': 'sin conexión + privado',

    'l.quotes.eyebrow': 'texto de práctica',
    'l.quotes.title': 'practicá ideas, no relleno.',

    'l.faq.eyebrow': 'preguntas',
    'l.faq.title': 'respuestas cortas',
    'l.faq1.q': '¿Typing Trainer es gratis?',
    'l.faq1.a': 'sí. gratis y de código abierto bajo licencia MIT.',
    'l.faq2.q': '¿Dónde guarda mis datos Typing Trainer?',
    'l.faq2.a': 'a ningún lado. quedan en tu navegador y podés exportarlos como JSON.',
    'l.faq3.q': '¿Typing Trainer funciona sin conexión?',
    'l.faq3.a': 'sí. después de la primera visita, toda la app funciona sin conexión.',
    'l.faq4.q': '¿Qué idiomas y distribuciones de teclado soporta Typing Trainer?',
    'l.faq4.a': 'español e inglés, con distribuciones comunes, acentos y teclas muertas.',

    'l.close.title': 'listo cuando tus manos estén listas.',

    'l.foot.built': 'Typing Trainer — licencia MIT, hecho por <a href="https://www.fabriok.ar/" rel="noopener">Fabricio Acosta</a>.'
  };

  var originals = null;

  /* Captures the markup as the English dictionary on first use, so a swap back
   * to English restores exactly what the page was served with. */
  function captureOriginals() {
    originals = { html: {}, alt: {} };
    Array.prototype.forEach.call(
      document.querySelectorAll('[data-i18n]'),
      function (el, i) {
        el.dataset.i18nId = String(i);
        originals.html[i] = el.innerHTML;
      }
    );
    Array.prototype.forEach.call(
      document.querySelectorAll('[data-i18n-alt]'),
      function (el, i) {
        el.dataset.i18nAltId = String(i);
        originals.alt[i] = el.getAttribute('alt') || '';
      }
    );
  }

  function applyLang(lang) {
    if (!originals) captureOriginals();

    document.documentElement.lang = lang;

    Array.prototype.forEach.call(
      document.querySelectorAll('[data-i18n]'),
      function (el) {
        var key = el.dataset.i18n;
        var fallback = originals.html[el.dataset.i18nId];
        el.innerHTML = lang === 'es' && ES[key] ? ES[key] : fallback;
      }
    );

    Array.prototype.forEach.call(
      document.querySelectorAll('[data-i18n-alt]'),
      function (el) {
        var key = el.getAttribute('data-i18n-alt');
        var fallback = originals.alt[el.dataset.i18nAltId];
        el.setAttribute('alt', lang === 'es' && ES[key] ? ES[key] : fallback);
      }
    );

    var label = document.getElementById('lang-label');
    if (label) label.textContent = lang.toUpperCase();
  }

  function readSettings() {
    try {
      return JSON.parse(window.localStorage.getItem(SETTINGS_KEY) || '{}') || {};
    } catch (e) {
      return {};
    }
  }

  /* Writes the whole settings object back rather than a theme-only key: the app
   * reads one blob, so a partial write would drop the other preferences. */
  function cycleTheme() {
    var s = readSettings();
    var next = THEMES[(THEMES.indexOf(s.theme) + 1) % THEMES.length];
    document.documentElement.setAttribute('data-theme', next);
    s.theme = next;
    try {
      window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
    } catch (e) { /* storage blocked: the theme still applies for this visit */ }
  }

  var themeBtn = document.getElementById('theme-cycle');
  if (themeBtn) themeBtn.addEventListener('click', cycleTheme);

  /* ── on-screen keyboards ───────────────────────────────────────── */

  var ROWS = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'];

  function buildKeyboard(host, opts) {
    if (!host) return {};
    var map = {};
    ROWS.forEach(function (row) {
      var el = document.createElement('div');
      el.className = 'demo-kb-row';
      row.split('').forEach(function (ch) {
        var key = document.createElement('span');
        key.className = 'demo-key';
        key.textContent = ch;
        if (opts && opts.shade) opts.shade(key, ch);
        el.appendChild(key);
        map[ch] = key;
      });
      host.appendChild(el);
    });

    var last = document.createElement('div');
    last.className = 'demo-kb-row';
    var space = document.createElement('span');
    space.className = 'demo-key wide';
    last.appendChild(space);
    host.appendChild(last);
    map[' '] = space;

    return map;
  }

  /* The heatmap preview is illustrative, not somebody's real history: these are
   * plausible relative error rates for a right-handed QWERTY typist. */
  var HEAT = {
    q: 0.7, w: 0.2, e: 0.02, r: 0.1, t: 0.05, y: 0.35, u: 0.15, i: 0.1, o: 0.15, p: 0.55,
    a: 0.05, s: 0.02, d: 0, f: 0, g: 0.2, h: 0.15, j: 0, k: 0.08, l: 0.12,
    z: 0.85, x: 0.6, c: 0.15, v: 0.3, b: 0.75, n: 0.08, m: 0.25
  };

  buildKeyboard(document.getElementById('heat-kb'), {
    shade: function (key, ch) {
      var heat = HEAT[ch] || 0;
      key.style.background = 'color-mix(in srgb, var(--error) ' +
                             Math.round(heat * 65) + '%, var(--surface-2))';
    }
  });

  /* ── the self-typing demo ──────────────────────────────────────── */

  var textEl = document.getElementById('demo-text');
  var kbMap = buildKeyboard(document.getElementById('demo-kb'));
  // Assigned below when the demo panel exists; called by the language toggle.
  var setDemoLang = function () {};

  if (textEl) {
    /* Each line carries its own deliberate typo — an index into the line and
     * the wrong key — so the error colour appears in the demo exactly the way
     * it does in the trainer. Positions are per line, hence per language. */
    var DEMO = {
      en: [
        { text: 'the obstacle in the path becomes the path', at: 12, ch: 'r' },
        { text: 'you have power over your mind, not outside events', at: 15, ch: 'e' },
        { text: 'well begun is half done and half done is a start', at: 9, ch: 'i' }
      ],
      es: [
        { text: 'lo que se interpone en el camino se vuelve el camino', at: 14, ch: 'r' },
        { text: 'tenés poder sobre tu mente, no sobre los hechos', at: 16, ch: 'e' },
        { text: 'sufrimos más seguido en la imaginación que en la realidad', at: 11, ch: 'i' }
      ]
    };

    var LINES = DEMO.en;
    var line = 0, pos = 0, typed = '', wrong = '';
    // Speed is per line (the counter restarts with each one); accuracy is
    // cumulative, so it settles instead of collapsing on the first typo.
    var correct = 0, started = 0;
    var hits = 0, misses = 0;
    var countEl = document.getElementById('demo-count');
    var wpmEl = document.getElementById('demo-wpm');
    var accEl = document.getElementById('demo-acc');

    function esc(s) {
      return s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
    }

    function paint() {
      var rest = LINES[line].text.slice(pos);
      textEl.innerHTML =
        '<span class="ok">' + esc(typed) + '</span>' +
        (wrong ? '<span class="bad">' + esc(wrong) + '</span>' : '') +
        '<span class="demo-caret"></span>' + esc(rest);
    }

    function flash(ch) {
      var key = kbMap[ch.toLowerCase()];
      if (!key) return;
      key.classList.add('is-hit');
      window.setTimeout(function () { key.classList.remove('is-hit'); }, 110);
    }

    function updateStats() {
      var mins = (Date.now() - started) / 60000;
      var wpm = mins > 0 ? Math.round((correct / 5) / mins) : 0;
      var total = hits + misses;
      wpmEl.textContent = Math.min(wpm, 120);
      accEl.textContent = total ? Math.round((hits / total) * 100) : 100;
      countEl.textContent = Math.max(0, 30 - Math.round((Date.now() - started) / 1000));
    }

    function step() {
      var current = LINES[line];
      var text = current.text;

      // The typo goes in, sits there for a beat, then gets rubbed out — which
      // is the whole point of showing it.
      if (wrong) {
        wrong = '';
        paint();
        return window.setTimeout(step, 220);
      }
      if (pos === current.at) {
        wrong = current.ch;
        misses++;
        flash(current.ch);
        paint();
        updateStats();
        return window.setTimeout(step, 380);
      }

      if (pos >= text.length) {
        line = (line + 1) % LINES.length;
        pos = 0;
        typed = '';
        return window.setTimeout(function () {
          started = Date.now();
          correct = 0;
          paint();
          step();
        }, 1400);
      }

      var ch = text.charAt(pos);
      typed += ch;
      pos++;
      correct++;
      hits++;
      flash(ch);
      paint();
      updateStats();

      // Human-ish cadence: a longer pause after a space, jitter everywhere else.
      var delay = (ch === ' ' ? 150 : 60) + Math.random() * 90;
      window.setTimeout(step, delay);
    }

    // Switching language mid-demo restarts it in the new one; the counters
    // carry on, since they are describing the same imaginary typist.
    setDemoLang = function (lang) {
      LINES = DEMO[lang] || DEMO.en;
      line = 0;
      pos = 0;
      typed = '';
      wrong = '';
      if (reduced) {
        typed = LINES[0].text;
        pos = typed.length;
      }
      paint();
    };

    if (reduced) {
      // No animation: show one finished line instead of an empty panel.
      typed = LINES[0].text;
      pos = typed.length;
      paint();
      wpmEl.textContent = '68';
    } else {
      started = Date.now();
      paint();
      window.setTimeout(step, 700);
    }
  }

  /* ── quote rotator ─────────────────────────────────────────────── */

  var rotator = document.getElementById('quote-rotator');
  var setQuoteLang = function () {};

  if (rotator) {
    var QUOTES = {
      en: [
        ['We suffer more often in imagination than in reality.', 'Seneca'],
        ['You have power over your mind — not outside events. Realise this, and you will find strength.', 'Marcus Aurelius'],
        ['It is not that we have a short time to live, but that we waste a lot of it.', 'Seneca'],
        ['The impediment to action advances action. What stands in the way becomes the way.', 'Marcus Aurelius'],
        ['First say to yourself what you would be; and then do what you have to do.', 'Epictetus']
      ],
      es: [
        ['Sufrimos más seguido en la imaginación que en la realidad.', 'Séneca'],
        ['Tenés poder sobre tu mente, no sobre los hechos de afuera. Date cuenta de esto y vas a encontrar fuerza.', 'Marco Aurelio'],
        ['No es que tengamos poco tiempo, sino que desperdiciamos mucho.', 'Séneca'],
        ['El obstáculo a la acción impulsa la acción. Lo que se interpone en el camino se vuelve el camino.', 'Marco Aurelio'],
        ['Decite primero qué querés ser; y después hacé lo que tenés que hacer.', 'Epicteto']
      ]
    };
    var IN_QUOTE_MODE = { en: ', in quote mode', es: ', en el modo cita' };

    var quoteLang = 'en';
    var qi = 0;

    function showQuote() {
      var list = QUOTES[quoteLang] || QUOTES.en;
      var q = list[qi % list.length];
      rotator.innerHTML = '';
      rotator.appendChild(document.createTextNode('“' + q[0] + '”'));
      var who = document.createElement('span');
      who.className = 'who';
      who.textContent = '— ' + q[1] + IN_QUOTE_MODE[quoteLang];
      rotator.appendChild(who);
      qi++;
    }

    // Repeats the same quote in the new language rather than skipping ahead.
    setQuoteLang = function (lang) {
      quoteLang = QUOTES[lang] ? lang : 'en';
      qi = Math.max(0, qi - 1);
      showQuote();
    };

    showQuote();
    if (!reduced) window.setInterval(showQuote, 6500);
  }

  /* ── language ──────────────────────────────────────────────────── */

  /* The trainer stores its language in the same settings blob, so the choice
   * carries in both directions: pick Spanish here and the app opens in
   * Spanish, and vice versa. */
  function setLang(lang, persist) {
    applyLang(lang);
    setDemoLang(lang);
    setQuoteLang(lang);

    if (!persist) return;
    var s = readSettings();
    s.lang = lang;
    try {
      window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
    } catch (e) { /* storage blocked: the choice still applies for this visit */ }
  }

  // ?lang=es wins over the stored choice, so a Spanish link lands in Spanish
  // for a reader who has never opened the trainer.
  var asked = (/[?&]lang=(es|en)\b/.exec(window.location.search) || [])[1];
  var currentLang = asked || (readSettings().lang === 'es' ? 'es' : 'en');
  setLang(currentLang, Boolean(asked));

  var langBtn = document.getElementById('lang-toggle');
  if (langBtn) {
    langBtn.addEventListener('click', function () {
      currentLang = currentLang === 'es' ? 'en' : 'es';
      setLang(currentLang, true);
    });
  }

  /* ── reveal on scroll and counting figures ─────────────────────── */

  var targets = document.querySelectorAll('.reveal');

  function countUp(el) {
    var to = parseInt(el.dataset.count, 10);
    var suffix = el.dataset.suffix || '';
    if (isNaN(to)) return;
    if (reduced) { el.textContent = to + suffix; return; }

    var from = Date.now();
    (function tick() {
      var p = Math.min(1, (Date.now() - from) / 900);
      el.textContent = Math.round(to * (1 - Math.pow(1 - p, 3))) + suffix;
      if (p < 1) window.requestAnimationFrame(tick);
    })();
  }

  if ('IntersectionObserver' in window) {
    document.body.classList.add('js-reveal');
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        var figures = entry.target.querySelectorAll('[data-count]');
        Array.prototype.forEach.call(figures, countUp);
        io.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.08 });

    Array.prototype.forEach.call(targets, function (el) { io.observe(el); });
  } else {
    Array.prototype.forEach.call(document.querySelectorAll('[data-count]'), countUp);
  }
})();
