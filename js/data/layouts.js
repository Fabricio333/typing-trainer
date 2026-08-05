/* Physical keyboard geometry plus touch-typing finger assignments.
 *
 * Each key is [unshifted, shifted, finger, width?]. Width is in key units
 * (1 = a standard letter key). Fingers use the standard eight-finger home-row
 * assignment; `th` is the thumb.
 *
 *   lp lr lm li   |   ri rm rr rp
 *   pinky … index | index … pinky
 */
(function (TT) {
  'use strict';

  function key(main, shift, finger, width) {
    return { main: main, shift: shift, finger: finger, width: width || 1 };
  }

  var ANSI = {
    id: 'ansi',
    name: 'US (ANSI)',
    rows: [
      [
        key('`', '~', 'lp'), key('1', '!', 'lp'), key('2', '@', 'lr'), key('3', '#', 'lm'),
        key('4', '$', 'li'), key('5', '%', 'li'), key('6', '^', 'ri'), key('7', '&', 'ri'),
        key('8', '*', 'rm'), key('9', '(', 'rr'), key('0', ')', 'rp'), key('-', '_', 'rp'),
        key('=', '+', 'rp'), key('Backspace', null, 'rp', 2)
      ],
      [
        key('Tab', null, 'lp', 1.5), key('q', 'Q', 'lp'), key('w', 'W', 'lr'), key('e', 'E', 'lm'),
        key('r', 'R', 'li'), key('t', 'T', 'li'), key('y', 'Y', 'ri'), key('u', 'U', 'ri'),
        key('i', 'I', 'rm'), key('o', 'O', 'rr'), key('p', 'P', 'rp'), key('[', '{', 'rp'),
        key(']', '}', 'rp'), key('\\', '|', 'rp', 1.5)
      ],
      [
        key('Caps', null, 'lp', 1.75), key('a', 'A', 'lp'), key('s', 'S', 'lr'), key('d', 'D', 'lm'),
        key('f', 'F', 'li'), key('g', 'G', 'li'), key('h', 'H', 'ri'), key('j', 'J', 'ri'),
        key('k', 'K', 'rm'), key('l', 'L', 'rr'), key(';', ':', 'rp'), key("'", '"', 'rp'),
        key('Enter', null, 'rp', 2.25)
      ],
      [
        key('Shift', null, 'lp', 2.25), key('z', 'Z', 'lp'), key('x', 'X', 'lr'), key('c', 'C', 'lm'),
        key('v', 'V', 'li'), key('b', 'B', 'li'), key('n', 'N', 'ri'), key('m', 'M', 'ri'),
        key(',', '<', 'rm'), key('.', '>', 'rr'), key('/', '?', 'rp'), key('Shift', null, 'rp', 2.75)
      ],
      [
        key('Ctrl', null, 'lp', 1.25), key('Alt', null, 'lp', 1.25), key(' ', null, 'th', 6.25),
        key('Alt', null, 'rp', 1.25), key('Ctrl', null, 'rp', 1.25)
      ]
    ],
    // Home row keys get the raised bumps under index fingers.
    homeRow: ['a', 's', 'd', 'f', 'j', 'k', 'l', ';'],
    bumps: ['f', 'j'],
    dead: {}
  };

  var LATAM = {
    id: 'latam',
    name: 'Latin American',
    rows: [
      [
        key('|', '°', 'lp'), key('1', '!', 'lp'), key('2', '"', 'lr'), key('3', '#', 'lm'),
        key('4', '$', 'li'), key('5', '%', 'li'), key('6', '&', 'ri'), key('7', '/', 'ri'),
        key('8', '(', 'rm'), key('9', ')', 'rr'), key('0', '=', 'rp'), key("'", '?', 'rp'),
        key('¿', '¡', 'rp'), key('Backspace', null, 'rp', 2)
      ],
      [
        key('Tab', null, 'lp', 1.5), key('q', 'Q', 'lp'), key('w', 'W', 'lr'), key('e', 'E', 'lm'),
        key('r', 'R', 'li'), key('t', 'T', 'li'), key('y', 'Y', 'ri'), key('u', 'U', 'ri'),
        key('i', 'I', 'rm'), key('o', 'O', 'rr'), key('p', 'P', 'rp'), key('´', '¨', 'rp'),
        key('+', '*', 'rp'), key('Enter', null, 'rp', 1.5)
      ],
      [
        key('Caps', null, 'lp', 1.75), key('a', 'A', 'lp'), key('s', 'S', 'lr'), key('d', 'D', 'lm'),
        key('f', 'F', 'li'), key('g', 'G', 'li'), key('h', 'H', 'ri'), key('j', 'J', 'ri'),
        key('k', 'K', 'rm'), key('l', 'L', 'rr'), key('ñ', 'Ñ', 'rp'), key('{', '[', 'rp'),
        key('}', ']', 'rp', 1.25)
      ],
      [
        key('Shift', null, 'lp', 2.25), key('z', 'Z', 'lp'), key('x', 'X', 'lr'), key('c', 'C', 'lm'),
        key('v', 'V', 'li'), key('b', 'B', 'li'), key('n', 'N', 'ri'), key('m', 'M', 'ri'),
        key(',', ';', 'rm'), key('.', ':', 'rr'), key('-', '_', 'rp'), key('Shift', null, 'rp', 2.75)
      ],
      [
        key('Ctrl', null, 'lp', 1.25), key('Alt', null, 'lp', 1.25), key(' ', null, 'th', 6.25),
        key('AltGr', null, 'rp', 1.25), key('Ctrl', null, 'rp', 1.25)
      ]
    ],
    homeRow: ['a', 's', 'd', 'f', 'j', 'k', 'l', 'ñ'],
    bumps: ['f', 'j'],
    // Accented characters are produced with a dead key first, so the on-screen
    // keyboard should point at ´ (or ¨) before the vowel.
    dead: {
      'á': ['´', 'a'], 'é': ['´', 'e'], 'í': ['´', 'i'], 'ó': ['´', 'o'], 'ú': ['´', 'u'],
      'Á': ['´', 'A'], 'É': ['´', 'E'], 'Í': ['´', 'I'], 'Ó': ['´', 'O'], 'Ú': ['´', 'U'],
      'ü': ['¨', 'u'], 'Ü': ['¨', 'U']
    }
  };

  /* char -> { key, shift, dead } so the renderer can find the physical key to light up. */
  function index(layout) {
    var map = {};
    layout.rows.forEach(function (row) {
      row.forEach(function (k) {
        if (k.main && k.main.length === 1 && map[k.main] === undefined) {
          map[k.main] = { key: k, shift: false };
        }
        if (k.shift && k.shift.length === 1 && map[k.shift] === undefined) {
          map[k.shift] = { key: k, shift: true };
        }
      });
    });
    Object.keys(layout.dead).forEach(function (ch) {
      var deadKey = layout.dead[ch][0];
      if (map[deadKey]) map[ch] = { key: map[deadKey].key, shift: false, dead: true };
    });
    return map;
  }

  ANSI.index = index(ANSI);
  LATAM.index = index(LATAM);

  TT.data = TT.data || {};
  TT.data.layouts = {
    ansi: ANSI,
    latam: LATAM,
    forLanguage: function (lang) { return lang === 'es' ? LATAM : ANSI; }
  };
})(window.TT = window.TT || {});
