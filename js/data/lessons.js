/* Progressive curriculum, one track per language.
 *
 * A lesson supplies its text one of four ways:
 *   chars: []   random chunks built from these characters (finger drills)
 *   words: []   drawn from this explicit list
 *   pool:  n    drawn from the top-n most common words of the language
 *   quote: true a real passage from the quote set
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

  var EN = [
    L('en-home-fj', 'Home row: f and j', 'Find the bumps without looking. Index fingers only.',
      { chars: ['f', 'j'], groupSize: 4, count: 20 }, 12, 92),
    L('en-home-dk', 'Home row: d and k', 'Middle fingers join in.',
      { chars: ['f', 'j', 'd', 'k'], groupSize: 4, count: 22 }, 14, 92),
    L('en-home-sl', 'Home row: s and l', 'Ring fingers. Keep the index fingers anchored.',
      { chars: ['f', 'j', 'd', 'k', 's', 'l'], groupSize: 4, count: 24 }, 16, 92),
    L('en-home-full', 'Home row: a and ;', 'The pinkies. This is where most people cheat.',
      { chars: ['a', 's', 'd', 'f', 'j', 'k', 'l', ';'], groupSize: 5, count: 26 }, 18, 93),
    L('en-home-gh', 'Home row: g and h', 'A short stretch inward, index fingers return home.',
      { chars: ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'], groupSize: 5, count: 26 }, 20, 93),
    L('en-home-words', 'Home row words', 'Real words, no reaching.',
      { words: ['dad', 'sad', 'lad', 'gas', 'has', 'ask', 'fall', 'flask', 'glass', 'salad',
                'shall', 'lash', 'gash', 'half', 'flash', 'alas', 'adds', 'gala'], count: 24 }, 22, 94),

    L('en-top-eiru', 'Top row: e i r u', 'Reach up and come straight back to home.',
      { chars: ['e', 'i', 'r', 'u', 'f', 'j', 'd', 'k'], groupSize: 5, count: 26 }, 22, 92),
    L('en-top-woqp', 'Top row: w o q p', 'Ring and pinky reaches.',
      { chars: ['w', 'o', 'q', 'p', 's', 'l', 'a'], groupSize: 5, count: 26 }, 24, 92),
    L('en-top-ty', 'Top row: t and y', 'The two longest reaches on the row.',
      { chars: ['t', 'y', 'r', 'u', 'f', 'j'], groupSize: 5, count: 24 }, 24, 92),
    L('en-top-words', 'Home and top row words', 'Two rows, real words.',
      { words: ['tree', 'quiet', 'route', 'paper', 'water', 'those', 'first', 'their',
                'writer', 'toward', 'quarter', 'purpose', 'popular', 'require', 'trouble',
                'quality', 'shorter', 'weather'],
        count: 24 }, 26, 94),

    L('en-bot-vncm', 'Bottom row: v n c m', 'Reach down without lifting the wrist.',
      { chars: ['v', 'n', 'c', 'm', 'f', 'j', 'd', 'k'], groupSize: 5, count: 26 }, 24, 91),
    L('en-bot-xzb', 'Bottom row: x z b and , . /', 'The awkward corners.',
      { chars: ['x', 'z', 'b', ',', '.', '/', 's', 'a'], groupSize: 4, count: 24 }, 24, 90),
    L('en-alphabet', 'The whole alphabet', 'Every letter, mixed.',
      { chars: 'abcdefghijklmnopqrstuvwxyz'.split(''), groupSize: 5, count: 28 }, 26, 92),

    L('en-shift', 'Capitals and shift', 'Opposite-hand shift: never the same-side pinky.',
      { words: ['The', 'And', 'For', 'But', 'You', 'All', 'One', 'Two', 'New', 'How',
                'Why', 'Who', 'Now', 'Our', 'Any', 'Say', 'She', 'Him', 'Its', 'Way'],
        count: 22 }, 26, 93),
    L('en-punct', 'Punctuation', 'Commas, full stops, apostrophes and quotes.',
      { pool: 200, punctuation: true, count: 26 }, 28, 93),
    L('en-numbers', 'The number row', 'Straight up from the home row, no glancing down.',
      { chars: '1234567890'.split(''), groupSize: 4, count: 24 }, 20, 90),
    L('en-symbols', 'Symbols', 'Shifted number row and the bracket cluster.',
      { chars: ['!', '@', '#', '$', '%', '&', '*', '(', ')', '-', '_', '=', '+'],
        groupSize: 3, count: 22 }, 18, 88),

    L('en-bigrams', 'Common letter pairs', 'th, he, in, er — the transitions that set your ceiling.',
      { patterns: 'bigrams', count: 32 }, 30, 94),
    L('en-trigrams', 'Common letter triples', 'the, and, ing, ion.',
      { patterns: 'trigrams', count: 30 }, 32, 94),
    L('en-top100', 'The 100 most common words', 'These are roughly half of everything you will ever type.',
      { pool: 100, count: 30 }, 34, 95),
    L('en-top500', 'The 500 most common words', 'A wider vocabulary at speed.',
      { pool: 500, count: 32 }, 38, 95),
    L('en-sentences', 'Real sentences', 'Full passages with punctuation and capitals.',
      { quote: true, length: 'medium' }, 40, 95)
  ];

  var ES = [
    L('es-home-fj', 'Fila base: f y j', 'Encuentra los relieves sin mirar. Sólo los índices.',
      { chars: ['f', 'j'], groupSize: 4, count: 20 }, 12, 92),
    L('es-home-dk', 'Fila base: d y k', 'Se suman los dedos medios.',
      { chars: ['f', 'j', 'd', 'k'], groupSize: 4, count: 22 }, 14, 92),
    L('es-home-sl', 'Fila base: s y l', 'Los anulares. Mantén los índices anclados.',
      { chars: ['f', 'j', 'd', 'k', 's', 'l'], groupSize: 4, count: 24 }, 16, 92),
    L('es-home-full', 'Fila base: a y ñ', 'Los meñiques. La ñ vive donde el inglés pone el punto y coma.',
      { chars: ['a', 's', 'd', 'f', 'j', 'k', 'l', 'ñ'], groupSize: 5, count: 26 }, 18, 93),
    L('es-home-gh', 'Fila base: g y h', 'Un estiramiento corto hacia adentro.',
      { chars: ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'ñ'], groupSize: 5, count: 26 }, 20, 93),
    L('es-home-words', 'Palabras de la fila base', 'Palabras reales, sin estirar los dedos.',
      { words: ['casa', 'sala', 'gala', 'daga', 'hada', 'lada', 'falla', 'halla', 'salsa',
                'gasa', 'jalada', 'ajada', 'dalas', 'flash'], count: 24 }, 22, 94),

    L('es-top-eiru', 'Fila superior: e i r u', 'Sube y vuelve enseguida a la base.',
      { chars: ['e', 'i', 'r', 'u', 'f', 'j', 'd', 'k'], groupSize: 5, count: 26 }, 22, 92),
    L('es-top-woqp', 'Fila superior: w o q p', 'Anulares y meñiques.',
      { chars: ['w', 'o', 'q', 'p', 's', 'l', 'a'], groupSize: 5, count: 26 }, 24, 92),
    L('es-top-ty', 'Fila superior: t e y', 'Los estiramientos más largos de la fila.',
      { chars: ['t', 'y', 'r', 'u', 'f', 'j'], groupSize: 5, count: 24 }, 24, 92),

    L('es-bot-vncm', 'Fila inferior: v n c m', 'Baja sin levantar la muñeca.',
      { chars: ['v', 'n', 'c', 'm', 'f', 'j', 'd', 'k'], groupSize: 5, count: 26 }, 24, 91),
    L('es-bot-xzb', 'Fila inferior: x z b y , . -', 'Las esquinas incómodas.',
      { chars: ['x', 'z', 'b', ',', '.', '-', 's', 'a'], groupSize: 4, count: 24 }, 24, 90),
    L('es-alphabet', 'Todo el alfabeto', 'Todas las letras, mezcladas.',
      { chars: 'abcdefghijklmnñopqrstuvwxyz'.split(''), groupSize: 5, count: 28 }, 26, 92),

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
    L('es-top100', 'Las 100 palabras más comunes', 'Aproximadamente la mitad de todo lo que escribirás.',
      { pool: 100, count: 30 }, 34, 95),
    L('es-top500', 'Las 500 palabras más comunes', 'Un vocabulario más amplio, a velocidad.',
      { pool: 500, count: 32 }, 38, 95),
    L('es-sentences', 'Frases reales', 'Pasajes completos con acentos y puntuación.',
      { quote: true, length: 'medium' }, 40, 95)
  ];

  TT.data = TT.data || {};
  TT.data.lessons = { en: EN, es: ES };
})(window.TT = window.TT || {});
