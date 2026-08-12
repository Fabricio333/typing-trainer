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
    'l.nav.why': 'por qué',
    'l.nav.how': 'cómo funciona',
    'l.nav.preview': 'vista previa',
    'l.nav.faq': 'preguntas',

    'l.cta.start': 'empezá a escribir <span class="arrow" aria-hidden="true">→</span>',
    'l.cta.source': '<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false"><path fill="currentColor" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.4 7.4 0 0 1 2-.27c.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z"/></svg> ver el código',
    'l.cta.essay': 'leer el ensayo',

    'l.hero.eyebrow': 'gratis · sin conexión · sin cuentas',
    'l.hero.title': 'Escribí sin mirar el teclado. Y después <em>seguí mejorando</em>.',
    'l.hero.sub': 'Escribir es la capa que está debajo de los correos, los apuntes, los ensayos, el código y las búsquedas. Este entrenador te lleva de la fila guía a la fluidez — y después sigue sirviendo, porque convierte tus palabras y transiciones más lentas en práctica.',
    'l.hero.note': 'Nada que instalar. Nada sale de tu navegador.',

    'l.fig.hours': 'por año, si una mejor técnica te ahorra diez minutos por día',
    'l.fig.lessons': 'lecciones progresivas, de la fila guía al teclado completo',
    'l.fig.modes': 'modos de prueba: tiempo, palabras, cita, patrones, difíciles y zen',
    'l.fig.langs': 'idiomas — español e inglés, con acentos incluidos',
    'l.fig.zero': 'cuentas, rastreadores y pedidos a un servidor',

    'l.why.eyebrow': 'por qué molestarse',
    'l.why.title': 'Unos segundos por oración, miles de veces',
    'l.why.body':
      '<p>La mayoría aprende a escribir en un teclado sin aprender realmente ' +
      'mecanografía. Mira hacia abajo, busca la siguiente tecla, corrige un error ' +
      'y lo repite. Funciona — y le agrega un poco de fricción a casi todas las ' +
      'tareas digitales del día.</p>' +
      '<p><strong>El retorno se acumula.</strong> Escribir rara vez es la tarea ' +
      'principal: es la capa que está debajo de la tarea principal. Ahorrar unos ' +
      'segundos en una oración no significa nada. Ahorrarlos en miles de oraciones ' +
      'vale más que las horas que invertís en aprender.</p>' +
      '<p>Y la ganancia no es solo velocidad. Alguien rápido igual pierde tiempo ' +
      'corrigiendo todo el tiempo. Lo que sirve de verdad es velocidad, precisión y ' +
      'constancia juntas — que es justo lo que este entrenador mide.</p>',
    'l.why.quote':
      '“En lugar de dividir la atención entre encontrar las teclas y desarrollar ' +
      'una idea, podés concentrarte en la idea misma. Las manos dejan de ser un ' +
      'obstáculo entre el pensamiento y el texto.”' +
      '<cite>de <a href="https://www.fabriok.ar/writings/touch-typing-investment" rel="noopener">' +
      'La mecanografía es una inversión que te devuelve tiempo todos los días</a></cite>',

    'l.how.eyebrow': 'cómo funciona',
    'l.how.title': 'Aprendé el movimiento, medilo y practicá lo que va lento',
    'l.how.sub': 'La precisión viene antes que la velocidad. Cada error apresurado les enseña a los dedos un movimiento equivocado, así que el entrenador está hecho para volver visibles esos movimientos en vez de regalarte un número grande.',
    'l.step1.title': 'Empezá en la fila guía',
    'l.step1.body': 'Veintidós lecciones que suman unas pocas teclas por vez. Cada una desbloquea la siguiente solo cuando alcanzás su velocidad <em>y</em> su precisión objetivo, así nunca construís sobre una base floja.',
    'l.step2.title': 'Practicá con lenguaje real',
    'l.step2.body': 'Pruebas por tiempo, por cantidad de palabras, citas, bloques de patrones o el modo zen sin límite. Velocidad, precisión y constancia en vivo, con un gráfico segundo a segundo al final.',
    'l.step3.title': 'Entrená tus puntos débiles',
    'l.step3.body': 'El entrenador ordena tus palabras, pares de teclas y teclas más lentas — y arma ejercicios de repetición con eso. La práctica va adonde de verdad se está perdiendo el tiempo.',

    'l.prev.eyebrow': 'vista previa',
    'l.prev.title': 'Cómo se ve',
    'l.prev.sub': 'Ocho temas de color, un teclado en pantalla que refleja los colores de cada dedo, y nada de adornos que no pediste.',
    'l.prev.altTest': 'Una prueba de escritura en curso: una cuenta regresiva, palabras por minuto y precisión en vivo, las palabras que faltan en gris y un teclado en pantalla que resalta la próxima tecla.',
    'l.prev.altLessons': 'La lista de lecciones: veintidós lecciones desde la fila guía con f y j, cada una con su velocidad objetivo, su precisión objetivo y tres estrellas, con las siguientes bloqueadas.',
    'l.prev.capTest': '<b>La prueba</b> Velocidad y precisión en vivo mientras escribís, con la próxima tecla encendida en el teclado de abajo.',
    'l.prev.capLessons': '<b>Las lecciones</b> En orden, con un objetivo que las abre, y puntuadas sobre tres estrellas.',
    'l.prev.capHeat': '<b>El mapa de calor</b> Cada tecla sombreada según cuánto la errás — o cuánto tardás en llegar a ella.',
    'l.prev.accurate': 'precisa',
    'l.prev.errorProne': 'propensa al error',

    'l.feat.eyebrow': 'qué incluye',
    'l.feat.title': 'Todo, y nada más',
    'l.feat1.title': 'Ejercicios adaptativos',
    'l.feat1.body': 'Repetición armada con tus propias palabras, pares de teclas y teclas más lentas.',
    'l.feat2.title': 'Estadísticas por tecla',
    'l.feat2.body': 'Un mapa de calor por precisión o por velocidad, más una tabla ordenada de lo que te cuesta tiempo.',
    'l.feat3.title': 'Historial que se queda',
    'l.feat3.body': 'Velocidad a lo largo del tiempo, récords por modo y contadores de por vida que sobreviven al límite del historial.',
    'l.feat4.title': 'Español e inglés',
    'l.feat4.body': 'Interfaz y texto de práctica, con acentos, teclas muertas y varias distribuciones de teclado.',
    'l.feat5.title': 'Funciona sin conexión',
    'l.feat5.body': 'Se guarda en caché desde la primera visita y se instala como una app. Un vuelo es una sesión de práctica.',
    'l.feat6.title': 'Privado por diseño',
    'l.feat6.body': 'Sin servidor, sin cuentas, sin analíticas. Tus resultados viven en tu navegador; exportalos cuando quieras.',
    'l.feat7.title': 'Ocho temas',
    'l.feat7.body': 'Carbon, paper, nord, dracula, solarized, matrix, ocean y sepia. Claros y oscuros.',
    'l.feat8.title': 'Todo con el teclado',
    'l.feat8.body': 'Tab reinicia, Esc sale, Enter arranca la siguiente. Tus manos nunca tienen que dejar la fila guía.',

    'l.quotes.eyebrow': 'texto de práctica',
    'l.quotes.title': 'Ideas que vale la pena repetir',
    'l.quotes.body':
      '<p>Los ejercicios de mecanografía suelen usar palabras al azar. Entrenan los ' +
      'dedos y no le dan nada a la cabeza. El modo cita usa en cambio escritos ' +
      'estoicos y filosóficos, así que mientras las manos repiten patrones de ' +
      'teclas estás leyendo sobre disciplina, atención y lo que sí está bajo tu ' +
      'control.</p>' +
      '<p>Le queda bien a la práctica. Mejorar la precisión implica aceptar los ' +
      'errores sin frustrarse y volver al ejercicio — y escribir una oración es una ' +
      'forma mucho más activa de encontrarla que pasarla de largo scrolleando.</p>',

    'l.faq.eyebrow': 'preguntas',
    'l.faq.title': 'Las respuestas cortas',
    'l.faq1.q': '¿Es gratis?',
    'l.faq1.a': 'Sí — gratis y de código abierto bajo licencia MIT. Sin cuentas, sin publicidad, sin versión paga, nada que desbloquear.',
    'l.faq2.q': '¿Adónde van mis datos?',
    'l.faq2.a': 'A ningún lado. Los resultados, el progreso de las lecciones y los ajustes quedan en el almacenamiento local de tu navegador; no hay servidor al que mandarlos. En ajustes → tus datos podés exportar todo como JSON y llevarlo a otra máquina.',
    'l.faq3.q': '¿Funciona sin conexión?',
    'l.faq3.a': 'Después de la primera visita, sí. Un service worker guarda toda la aplicación en caché, y podés instalarla para que se abra como cualquier otro programa.',
    'l.faq4.q': '¿Qué idiomas y distribuciones soporta?',
    'l.faq4.a': 'Español e inglés, tanto en la interfaz como en el texto de práctica, con acentos y teclas muertas, en varias distribuciones de teclado comunes.',
    'l.faq5.q': 'Ya escribo sin mirar. ¿Hay algo acá para mí?',
    'l.faq5.a': 'Es exactamente para quien fue hecho. Cuando lo básico ya es automático, lo que queda es un conjunto puntual de palabras lentas y transiciones incómodas — el entrenador las encuentra y las practica, en vez de hacerte repetir texto que ya manejás bien.',
    'l.faq6.q': '¿Cuánto tarda en notarse?',
    'l.faq6.a': 'Contá con ir más lento las primeras sesiones: estás reemplazando un hábito improvisado por uno deliberado. Sesiones cortas todos los días rinden más que sesiones largas de vez en cuando, y la precisión tiene que ir siempre adelante de la velocidad.',

    'l.close.title': 'Una pequeña inversión en una herramienta que ya usás todos los días',
    'l.close.sub': 'Tus propias manos. Abrilo y practicá — la primera lección lleva alrededor de un minuto.',

    'l.foot.built': 'Typing Trainer — licencia MIT, hecho por <a href="https://www.fabriok.ar/" rel="noopener">Fabricio Acosta</a>.',
    'l.foot.essay': 'el ensayo detrás'
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
