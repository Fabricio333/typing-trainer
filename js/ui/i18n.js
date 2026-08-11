/* UI chrome translations. The typing content always follows the language
 * setting; this makes the navigation, buttons and headings follow it too.
 *
 * Static markup opts in with data-i18n (innerHTML from the dictionary — values
 * are ours, never user input) and data-i18n-title for tooltips. Dynamic strings
 * in the JS go through t(). English is the fallback for any missing key. */
(function (TT) {
  'use strict';

  var DICT = {
    en: {
      'a11y.skip': 'Skip to content',
      'nav.test': 'test',
      'nav.lessons': 'lessons',
      'nav.stats': 'stats',
      'nav.settings': 'settings',

      'cfg.punctuation': '@ punctuation',
      'cfg.numbers': '# numbers',
      'mode.time': 'time',
      'mode.words': 'words',
      'mode.quote': 'quote',
      'mode.patterns': 'patterns',
      'mode.hardest': 'hardest',
      'mode.zen': 'zen',

      'kind.words': 'words',
      'kind.keys': 'keys',
      'kind.combos': 'combos',
      'kind.quotes': 'quotes',

      'len.short': 'short', 'len.medium': 'medium', 'len.long': 'long', 'len.any': 'any',
      'pat.bigrams': 'pairs', 'pat.trigrams': 'triples', 'pat.clusters': 'chunks', 'pat.mixed': 'mixed',

      'test.focus': 'click here or press any key to focus',
      'test.restart': 'restart',
      'test.restartTitle': 'Restart (Tab)',
      'test.skip': 'skip',
      'test.skipTitle': 'Skip to the next text',
      'test.hint': '<kbd>Tab</kbd> restart · <kbd>Ctrl</kbd>+<kbd>⌫</kbd> delete word · <kbd>Esc</kbd> menu',
      'test.drillTitle': 'Your hardest words',
      'test.drillRepick': 'pick a new set',

      'res.wpm': 'wpm',
      'res.acc': 'accuracy',
      'res.next': 'next test',
      'res.nextLesson': 'next lesson',
      'res.repeatLesson': 'repeat lesson',
      'res.tryAgain': 'try again',
      'res.repeat': 'repeat same text',
      'res.back': 'back to menu',

      'lessons.title': 'Lessons',
      'lessons.sub': 'Work through these in order. Each one unlocks the next once you hit its target speed and accuracy.',

      'stats.title': 'Your statistics',
      'stats.sub': 'Everything below is stored only in this browser.',
      'stats.trend': 'Speed over time',
      'stats.bests': 'Personal bests',
      'stats.keys': 'Keyboard precision',
      'stats.keys.accuracy': 'accuracy',
      'stats.keys.speed': 'speed',
      'stats.keys.accSub': 'Redder keys are the ones you miss most. These feed the adaptive pattern drill.',
      'stats.keys.speedSub': 'How fast each key comes out once the previous one is down, shaded against your own fastest and slowest. Timed from clean in-word keystrokes only.',
      'stats.fastest': 'fastest',
      'stats.slowest': 'slowest',
      'stats.drillKeys': 'drill your 5 slowest keys →',
      'stats.drillKey': 'Drill this key',
      'stats.missed': 'missed',
      'stats.slowWords': 'Slowest words',
      'stats.slowWordsSub': 'Ranked by time per character, so long words are not penalised for being long. These are what the "hardest words" drill uses.',
      'stats.drillWords': 'drill these words →',
      'stats.slowPatterns': 'Slowest patterns',
      'stats.slowPatternsSub': 'Key-to-key transitions, ranked by the average gap between the two presses. The combinations drill practises them inside real words.',
      'stats.drillPatterns': 'drill these combinations →',
      'stats.slowLessons': 'Slowest lessons',
      'stats.slowLessonsSub': 'Every lesson you have attempted, slowest personal best first. Click one to practise it again.',
      'stats.recent': 'Recent tests',
      'th.word': 'word', 'th.wpm': 'wpm', 'th.avg': 'avg', 'th.best': 'best',
      'th.typed': 'typed', 'th.missed': 'missed', 'th.pair': 'pair', 'th.gap': 'avg gap',
      'th.lesson': 'lesson', 'th.bestWpm': 'best wpm', 'th.bestAcc': 'best acc',
      'th.stars': 'stars', 'th.attempts': 'attempts', 'th.when': 'when',
      'th.mode': 'mode', 'th.acc': 'acc', 'th.consistency': 'consistency',

      'set.title': 'Settings',
      'set.sub': 'Saved automatically in this browser.',
      'set.data': 'Your data',
      'set.dataSub': "Results, lesson progress and settings live in this browser's local storage. Export them to move to another machine.",
      'set.export': 'export as JSON',
      'set.import': 'import from JSON',
      'set.reset': 'reset everything',
      'set.storageWarning': 'This browser is blocking local storage, so your progress will be lost when you close the tab.',

      'drill.slowKeysLabel': 'Slowest keys',
      'drill.slowCombosLabel': 'Slowest combinations',
      'drill.keyLabel': 'Key drill',
      'drill.noKeyHistory': 'Not enough key history yet — finish a few tests first.',
      'skip.lastLesson': 'That was the last lesson.',
      'skip.skippedTo': 'Skipped to'
    },

    es: {
      'a11y.skip': 'Saltar al contenido',
      'nav.test': 'prueba',
      'nav.lessons': 'lecciones',
      'nav.stats': 'estadísticas',
      'nav.settings': 'ajustes',

      'cfg.punctuation': '@ puntuación',
      'cfg.numbers': '# números',
      'mode.time': 'tiempo',
      'mode.words': 'palabras',
      'mode.quote': 'citas',
      'mode.patterns': 'patrones',
      'mode.hardest': 'difíciles',
      'mode.zen': 'zen',

      'kind.words': 'palabras',
      'kind.keys': 'teclas',
      'kind.combos': 'combinaciones',
      'kind.quotes': 'citas',

      'len.short': 'corta', 'len.medium': 'media', 'len.long': 'larga', 'len.any': 'todas',
      'pat.bigrams': 'pares', 'pat.trigrams': 'tríos', 'pat.clusters': 'grupos', 'pat.mixed': 'mixto',

      'test.focus': 'haz clic aquí o pulsa cualquier tecla para enfocar',
      'test.restart': 'reiniciar',
      'test.restartTitle': 'Reiniciar (Tab)',
      'test.skip': 'saltar',
      'test.skipTitle': 'Saltar al siguiente texto',
      'test.hint': '<kbd>Tab</kbd> reiniciar · <kbd>Ctrl</kbd>+<kbd>⌫</kbd> borrar palabra · <kbd>Esc</kbd> menú',
      'test.drillTitle': 'Tus palabras más difíciles',
      'test.drillRepick': 'elegir otro conjunto',

      'res.wpm': 'ppm',
      'res.acc': 'precisión',
      'res.next': 'siguiente prueba',
      'res.nextLesson': 'siguiente lección',
      'res.repeatLesson': 'repetir lección',
      'res.tryAgain': 'intentar de nuevo',
      'res.repeat': 'repetir el mismo texto',
      'res.back': 'volver al menú',

      'lessons.title': 'Lecciones',
      'lessons.sub': 'Complétalas en orden. Cada una desbloquea la siguiente al alcanzar su velocidad y precisión objetivo.',

      'stats.title': 'Tus estadísticas',
      'stats.sub': 'Todo lo de abajo se guarda solo en este navegador.',
      'stats.trend': 'Velocidad en el tiempo',
      'stats.bests': 'Mejores marcas',
      'stats.keys': 'Precisión del teclado',
      'stats.keys.accuracy': 'precisión',
      'stats.keys.speed': 'velocidad',
      'stats.keys.accSub': 'Las teclas más rojas son las que más fallas. Alimentan el entrenamiento adaptativo de patrones.',
      'stats.keys.speedSub': 'La rapidez con la que sale cada tecla una vez pulsada la anterior, sombreada entre tu tecla más rápida y la más lenta. Medida solo con pulsaciones limpias dentro de palabras.',
      'stats.fastest': 'más rápida',
      'stats.slowest': 'más lenta',
      'stats.drillKeys': 'entrenar tus 5 teclas más lentas →',
      'stats.drillKey': 'Entrenar esta tecla',
      'stats.missed': 'fallada',
      'stats.slowWords': 'Palabras más lentas',
      'stats.slowWordsSub': 'Ordenadas por tiempo por carácter, así las palabras largas no quedan penalizadas por su longitud. Son las que usa el entrenamiento de "palabras difíciles".',
      'stats.drillWords': 'entrenar estas palabras →',
      'stats.slowPatterns': 'Patrones más lentos',
      'stats.slowPatternsSub': 'Transiciones entre teclas, ordenadas por el intervalo medio entre las dos pulsaciones. El entrenamiento de combinaciones las practica dentro de palabras reales.',
      'stats.drillPatterns': 'entrenar estas combinaciones →',
      'stats.slowLessons': 'Lecciones más lentas',
      'stats.slowLessonsSub': 'Cada lección que has intentado, la de peor marca primero. Haz clic en una para practicarla de nuevo.',
      'stats.recent': 'Pruebas recientes',
      'th.word': 'palabra', 'th.wpm': 'ppm', 'th.avg': 'media', 'th.best': 'mejor',
      'th.typed': 'veces', 'th.missed': 'fallos', 'th.pair': 'par', 'th.gap': 'intervalo',
      'th.lesson': 'lección', 'th.bestWpm': 'mejor ppm', 'th.bestAcc': 'mejor prec.',
      'th.stars': 'estrellas', 'th.attempts': 'intentos', 'th.when': 'cuándo',
      'th.mode': 'modo', 'th.acc': 'prec.', 'th.consistency': 'consistencia',

      'set.title': 'Ajustes',
      'set.sub': 'Se guardan automáticamente en este navegador.',
      'set.data': 'Tus datos',
      'set.dataSub': 'Los resultados, el progreso de las lecciones y los ajustes viven en el almacenamiento local de este navegador. Expórtalos para llevarlos a otra máquina.',
      'set.export': 'exportar como JSON',
      'set.import': 'importar desde JSON',
      'set.reset': 'borrar todo',
      'set.storageWarning': 'Este navegador está bloqueando el almacenamiento local, así que tu progreso se perderá al cerrar la pestaña.',

      'drill.slowKeysLabel': 'Teclas más lentas',
      'drill.slowCombosLabel': 'Combinaciones más lentas',
      'drill.keyLabel': 'Entrenamiento de tecla',
      'drill.noKeyHistory': 'Aún no hay historial de teclas — termina unas cuantas pruebas primero.',
      'skip.lastLesson': 'Esa era la última lección.',
      'skip.skippedTo': 'Saltado a'
    }
  };

  function lang() {
    return (TT.settings && TT.settings.get('lang')) || 'en';
  }

  function t(key) {
    var l = DICT[lang()] || DICT.en;
    return l[key] !== undefined ? l[key] : (DICT.en[key] !== undefined ? DICT.en[key] : key);
  }

  /* Re-labels every opted-in element. Called on boot and on language change. */
  function apply() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-i18n]'), function (el) {
      el.innerHTML = t(el.dataset.i18n);
    });
    Array.prototype.forEach.call(document.querySelectorAll('[data-i18n-title]'), function (el) {
      el.title = t(el.dataset.i18nTitle);
    });
  }

  TT.i18n = { t: t, apply: apply, DICT: DICT };
})(window.TT = window.TT || {});
