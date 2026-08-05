/* Progressive curriculum, one track per language.
 *
 * A lesson supplies its text one of five ways:
 *   chars: []     random chunks built from these characters (finger drills)
 *   words: []     drawn from this explicit list
 *   pool:  n      drawn from the top-n most common words of the language
 *   quote: true   a real passage from the quote set
 *   slowest: true chunks built from the learner's slowest key transitions
 *
 * `target` is what must be reached to pass and unlock the next lesson.
 * Stars are awarded against target, target+25%, target+50% wpm. */
(function (TT) {
  'use strict';

  function L(id, title, desc, body, wpm, acc) {
    var def = { id: id, title: title, desc: desc, target: { wpm: wpm, acc: acc } };
    for (var k in body) {
      if (Object.prototype.hasOwnProperty.call(body, k)) def[k] = body[k];
    }
    return def;
  }

  /* The letter ladder. Each level introduces at most two new keys — always the
   * mirror pair, the same finger on each hand, which is also how the on-screen
   * keyboard colours them — as a lesson over just that pair, followed by a
   * review lesson drawing on every key learned so far. Level one skips the
   * review, which would only repeat the pair. */
  function levels(pairs, rev) {
    var out = [];
    var learned = [];
    pairs.forEach(function (p, i) {
      learned = learned.concat(p.keys);
      out.push(L(p.id, p.title, p.desc,
        { chars: p.keys.slice(), groupSize: 4, count: 20 }, p.wpm, 92));
      if (i === 0) return;
      var title = learned.length <= 8
        ? rev.word + ': ' + learned.join(' ')
        : rev.word + ': ' + rev.all.replace('{n}', String(learned.length));
      out.push(L(p.id.replace('-key-', '-rev-'), title, rev.desc,
        { chars: learned.slice(), groupSize: 5, count: 24 }, p.wpm + 1, 92));
    });
    return out;
  }

  function insertAfter(list, id, extra) {
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id) {
        return list.slice(0, i + 1).concat(extra, list.slice(i + 1));
      }
    }
    return list.concat(extra);
  }

  var EN_PAIRS = [
    { id: 'en-home-fj', keys: ['f', 'j'], wpm: 12,
      title: 'Home row: f and j', desc: 'Find the bumps without looking. Index fingers only.' },
    { id: 'en-key-dk', keys: ['d', 'k'], wpm: 13,
      title: 'Home row: d and k', desc: 'Middle fingers, just the new pair.' },
    { id: 'en-key-sl', keys: ['s', 'l'], wpm: 14,
      title: 'Home row: s and l', desc: 'Ring fingers. Keep the index fingers anchored.' },
    { id: 'en-key-asemi', keys: ['a', ';'], wpm: 15,
      title: 'Home row: a and ;', desc: 'The pinkies. This is where most people cheat.' },
    { id: 'en-key-gh', keys: ['g', 'h'], wpm: 16,
      title: 'Home row: g and h', desc: 'A short stretch inward, index fingers return home.' },

    { id: 'en-key-ei', keys: ['e', 'i'], wpm: 17,
      title: 'Top row: e and i', desc: 'Middle fingers reach up and come straight back.' },
    { id: 'en-key-ru', keys: ['r', 'u'], wpm: 18,
      title: 'Top row: r and u', desc: 'Index fingers up.' },
    { id: 'en-key-ty', keys: ['t', 'y'], wpm: 19,
      title: 'Top row: t and y', desc: 'The two longest reaches on the row.' },
    { id: 'en-key-wo', keys: ['w', 'o'], wpm: 20,
      title: 'Top row: w and o', desc: 'Ring fingers up.' },
    { id: 'en-key-qp', keys: ['q', 'p'], wpm: 21,
      title: 'Top row: q and p', desc: 'The pinky reaches.' },

    { id: 'en-key-vm', keys: ['v', 'm'], wpm: 22,
      title: 'Bottom row: v and m', desc: 'Index fingers reach down without lifting the wrist.' },
    { id: 'en-key-bn', keys: ['b', 'n'], wpm: 23,
      title: 'Bottom row: b and n', desc: 'The long inward stretches.' },
    { id: 'en-key-ccomma', keys: ['c', ','], wpm: 24,
      title: 'Bottom row: c and ,', desc: 'Middle fingers down.' },
    { id: 'en-key-xdot', keys: ['x', '.'], wpm: 25,
      title: 'Bottom row: x and .', desc: 'Ring fingers down.' },
    { id: 'en-key-zslash', keys: ['z', '/'], wpm: 26,
      title: 'Bottom row: z and /', desc: 'Pinkies down. The awkward corners.' }
  ];

  var EN = levels(EN_PAIRS, {
    word: 'Review', all: 'all {n} keys', desc: 'Every key learned so far, mixed.'
  });

  EN = insertAfter(EN, 'en-rev-gh', [
    L('en-home-words', 'Home row words', 'Real words, no reaching.',
      { words: ['dad', 'sad', 'lad', 'gas', 'has', 'ask', 'fall', 'flask', 'glass', 'salad',
                'shall', 'lash', 'gash', 'half', 'flash', 'alas', 'adds', 'gala'], count: 24 }, 19, 94)
  ]);
  EN = insertAfter(EN, 'en-rev-qp', [
    L('en-top-words', 'Home and top row words', 'Two rows, real words.',
      { words: ['tree', 'quiet', 'route', 'paper', 'water', 'those', 'first', 'their',
                'writer', 'toward', 'quarter', 'purpose', 'popular', 'require', 'trouble',
                'quality', 'shorter', 'weather'],
        count: 24 }, 24, 94)
  ]);

  EN = EN.concat([
    L('en-alphabet', 'The whole alphabet', 'Every letter, mixed.',
      { chars: 'abcdefghijklmnopqrstuvwxyz'.split(''), groupSize: 5, count: 28 }, 28, 92),

    L('en-shift', 'Capitals and shift', 'Opposite-hand shift: never the same-side pinky.',
      { words: ['The', 'And', 'For', 'But', 'You', 'All', 'One', 'Two', 'New', 'How',
                'Why', 'Who', 'Now', 'Our', 'Any', 'Say', 'She', 'Him', 'Its', 'Way'],
        count: 22 }, 28, 93),
    L('en-punct', 'Punctuation', 'Commas, full stops, apostrophes and quotes.',
      { pool: 200, punctuation: true, count: 26 }, 29, 93),
    L('en-numbers', 'The number row', 'Straight up from the home row, no glancing down.',
      { chars: '1234567890'.split(''), groupSize: 4, count: 24 }, 20, 90),
    L('en-symbols', 'Symbols', 'Shifted number row and the bracket cluster.',
      { chars: ['!', '@', '#', '$', '%', '&', '*', '(', ')', '-', '_', '=', '+'],
        groupSize: 3, count: 22 }, 18, 88),

    L('en-bigrams', 'Common letter pairs', 'th, he, in, er — the transitions that set your ceiling.',
      { patterns: 'bigrams', count: 32 }, 30, 94),
    L('en-trigrams', 'Common letter triples', 'the, and, ing, ion.',
      { patterns: 'trigrams', count: 30 }, 32, 94),
    L('en-slowest', 'Your slowest combinations', 'Built from your own typing: the key ' +
      'transitions that slow you down the most.',
      { slowest: true, count: 30 }, 34, 94),
    L('en-top100', 'The 100 most common words', 'These are roughly half of everything you will ever type.',
      { pool: 100, count: 30 }, 34, 95),
    L('en-top500', 'The 500 most common words', 'A wider vocabulary at speed.',
      { pool: 500, count: 32 }, 38, 95),
    L('en-sentences', 'Real sentences', 'Full passages with punctuation and capitals.',
      { quote: true, length: 'medium' }, 40, 95)
  ]);

  var ES_PAIRS = [
    { id: 'es-home-fj', keys: ['f', 'j'], wpm: 12,
      title: 'Fila base: f y j', desc: 'Encuentra los relieves sin mirar. Sólo los índices.' },
    { id: 'es-key-dk', keys: ['d', 'k'], wpm: 13,
      title: 'Fila base: d y k', desc: 'Los dedos medios, sólo el par nuevo.' },
    { id: 'es-key-sl', keys: ['s', 'l'], wpm: 14,
      title: 'Fila base: s y l', desc: 'Los anulares. Mantén los índices anclados.' },
    { id: 'es-key-anye', keys: ['a', 'ñ'], wpm: 15,
      title: 'Fila base: a y ñ', desc: 'Los meñiques. La ñ vive donde el inglés pone el punto y coma.' },
    { id: 'es-key-gh', keys: ['g', 'h'], wpm: 16,
      title: 'Fila base: g y h', desc: 'Un estiramiento corto hacia adentro.' },

    { id: 'es-key-ei', keys: ['e', 'i'], wpm: 17,
      title: 'Fila superior: e, i', desc: 'Los medios suben y vuelven enseguida a la base.' },
    { id: 'es-key-ru', keys: ['r', 'u'], wpm: 18,
      title: 'Fila superior: r y u', desc: 'Los índices suben.' },
    { id: 'es-key-ty', keys: ['t', 'y'], wpm: 19,
      title: 'Fila superior: t e y', desc: 'Los estiramientos más largos de la fila.' },
    { id: 'es-key-wo', keys: ['w', 'o'], wpm: 20,
      title: 'Fila superior: w y o', desc: 'Los anulares suben.' },
    { id: 'es-key-qp', keys: ['q', 'p'], wpm: 21,
      title: 'Fila superior: q y p', desc: 'Los meñiques.' },

    { id: 'es-key-vm', keys: ['v', 'm'], wpm: 22,
      title: 'Fila inferior: v y m', desc: 'Los índices bajan sin levantar la muñeca.' },
    { id: 'es-key-bn', keys: ['b', 'n'], wpm: 23,
      title: 'Fila inferior: b y n', desc: 'Los estiramientos largos hacia adentro.' },
    { id: 'es-key-ccoma', keys: ['c', ','], wpm: 24,
      title: 'Fila inferior: c y ,', desc: 'Los medios bajan.' },
    { id: 'es-key-xpunto', keys: ['x', '.'], wpm: 25,
      title: 'Fila inferior: x y .', desc: 'Los anulares bajan.' },
    { id: 'es-key-zguion', keys: ['z', '-'], wpm: 26,
      title: 'Fila inferior: z y -', desc: 'Los meñiques bajan. Las esquinas incómodas.' }
  ];

  var ES = levels(ES_PAIRS, {
    word: 'Repaso', all: 'las {n} teclas', desc: 'Todas las teclas aprendidas hasta ahora, mezcladas.'
  });

  ES = insertAfter(ES, 'es-rev-gh', [
    L('es-home-words', 'Palabras de la fila base', 'Palabras reales, sin estirar los dedos.',
      { words: ['casa', 'sala', 'gala', 'daga', 'hada', 'lada', 'falla', 'halla', 'salsa',
                'gasa', 'jalada', 'ajada', 'dalas', 'flash'], count: 24 }, 19, 94)
  ]);

  ES = ES.concat([
    L('es-alphabet', 'Todo el alfabeto', 'Todas las letras, mezcladas.',
      { chars: 'abcdefghijklmnñopqrstuvwxyz'.split(''), groupSize: 5, count: 28 }, 28, 92),

    L('es-tildes', 'Acentos: á é í ó ú', 'Tecla muerta ´ y luego la vocal. Dos pulsaciones, un carácter.',
      { words: ['más', 'sí', 'día', 'país', 'está', 'aquí', 'también', 'después', 'según',
                'razón', 'canción', 'árbol', 'fácil', 'rápido', 'médico', 'música',
                'línea', 'número', 'último', 'público'], count: 24 }, 22, 92),
    L('es-enye', 'La ñ en palabras', 'Meñique derecho, sin mirar.',
      { words: ['año', 'niño', 'niña', 'señor', 'señora', 'mañana', 'España', 'pequeño',
                'sueño', 'baño', 'caña', 'montaña', 'compañero', 'enseñar', 'diseño',
                'extraño', 'puño', 'daño'], count: 22 }, 24, 93),
    L('es-shift', 'Mayúsculas', 'Shift con la mano contraria, nunca con el mismo meñique.',
      { words: ['El', 'La', 'Los', 'Que', 'Con', 'Por', 'Para', 'Como', 'Cuando', 'Dónde',
                'Qué', 'Sí', 'No', 'Ya', 'Hoy', 'Ayer', 'Todo', 'Nada', 'Muy', 'Más'],
        count: 22 }, 26, 93),
    L('es-punct', 'Puntuación y signos de apertura', 'El español abre lo que cierra: ¿ y ¡.',
      { pool: 200, punctuation: true, count: 26 }, 28, 93),
    L('es-numbers', 'La fila de números', 'Recto hacia arriba desde la base.',
      { chars: '1234567890'.split(''), groupSize: 4, count: 24 }, 20, 90),
    L('es-symbols', 'Símbolos', 'Fila de números con shift y el grupo de corchetes.',
      { chars: ['!', '"', '#', '$', '%', '&', '/', '(', ')', '=', '?', '¿', '¡'],
        groupSize: 3, count: 22 }, 18, 88),

    L('es-bigrams', 'Pares de letras frecuentes', 'de, es, en, la — donde se gana la velocidad.',
      { patterns: 'bigrams', count: 32 }, 30, 94),
    L('es-trigrams', 'Tríos de letras frecuentes', 'que, ent, del, con.',
      { patterns: 'trigrams', count: 30 }, 32, 94),
    L('es-slowest', 'Tus combinaciones más lentas', 'Creado a partir de tu propia escritura: ' +
      'las transiciones de teclas que más te frenan.',
      { slowest: true, count: 30 }, 34, 94),
    L('es-top100', 'Las 100 palabras más comunes', 'Aproximadamente la mitad de todo lo que escribirás.',
      { pool: 100, count: 30 }, 34, 95),
    L('es-top500', 'Las 500 palabras más comunes', 'Un vocabulario más amplio, a velocidad.',
      { pool: 500, count: 32 }, 38, 95),
    L('es-sentences', 'Frases reales', 'Pasajes completos con acentos y puntuación.',
      { quote: true, length: 'medium' }, 40, 95)
  ]);

  TT.data = TT.data || {};
  TT.data.lessons = { en: EN, es: ES };
})(window.TT = window.TT || {});
