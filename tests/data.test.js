'use strict';

const D = global.TT.data;

suite('data');

function noDuplicates(list, label) {
  const seen = Object.create(null);
  const dupes = [];
  list.forEach(function (w) {
    if (seen[w]) dupes.push(w);
    else seen[w] = true;
  });
  eq(dupes.length, 0, label + ' has duplicates: ' + dupes.slice(0, 10).join(', '));
}

test('the English word list is substantial and duplicate-free', function () {
  ok(D.words.en.length > 1000, 'only ' + D.words.en.length + ' words');
  noDuplicates(D.words.en, 'words.en');
});

test('English words are lowercase letters only', function () {
  const bad = D.words.en.filter(function (w) { return !/^[a-z]+$/.test(w); });
  eq(bad.length, 0, 'unexpected tokens: ' + bad.slice(0, 10).join(', '));
});

test('the Spanish word list is substantial and duplicate-free', function () {
  ok(D.words.es.length > 600, 'only ' + D.words.es.length + ' words');
  noDuplicates(D.words.es, 'words.es');
});

test('Spanish words use only Spanish letters', function () {
  const bad = D.words.es.filter(function (w) { return !/^[a-záéíóúüñ]+$/.test(w); });
  eq(bad.length, 0, 'unexpected tokens: ' + bad.slice(0, 10).join(', '));
});

test('the Spanish list actually exercises accents and ñ', function () {
  const accented = D.words.es.filter(function (w) { return /[áéíóúüñ]/.test(w); });
  ok(accented.length > 40, 'only ' + accented.length + ' accented words');
});

test('quotes carry text, source and a length band', function () {
  ['en', 'es'].forEach(function (lang) {
    ok(D.quotes[lang].length >= 20, lang + ' has only ' + D.quotes[lang].length + ' quotes');
    D.quotes[lang].forEach(function (q) {
      ok(q.text && q.text.length > 10, lang + ': quote too short');
      ok(q.source && q.source.length > 0, lang + ': missing source for "' + q.text.slice(0, 30) + '"');
      ok(['short', 'medium', 'long'].indexOf(q.length) !== -1, lang + ': bad length band');
      eq(q.chars, q.text.length, lang + ': chars out of sync');
    });
  });
});

test('quotes have no double spaces or stray whitespace', function () {
  ['en', 'es'].forEach(function (lang) {
    D.quotes[lang].forEach(function (q) {
      eq(q.text, q.text.trim(), lang + ': untrimmed quote');
      ok(q.text.indexOf('  ') === -1, lang + ': double space in "' + q.text.slice(0, 30) + '"');
    });
  });
});

test('every length band has at least one quote in each language', function () {
  ['en', 'es'].forEach(function (lang) {
    ['short', 'medium', 'long'].forEach(function (band) {
      const n = D.quotes[lang].filter(function (q) { return q.length === band; }).length;
      ok(n > 0, lang + ' has no ' + band + ' quotes');
    });
  });
});

test('pattern sets exist for both languages', function () {
  ['en', 'es'].forEach(function (lang) {
    const p = D.patterns[lang];
    ok(p.bigrams.length > 20, lang + ': too few bigrams');
    ok(p.trigrams.length > 20, lang + ': too few trigrams');
    ok(p.clusters.length > 5, lang + ': too few clusters');
  });
});

test('bigrams are two characters and trigrams are three', function () {
  ['en', 'es'].forEach(function (lang) {
    const bad2 = D.patterns[lang].bigrams.filter(function (p) { return p.length !== 2; });
    const bad3 = D.patterns[lang].trigrams.filter(function (p) { return p.length !== 3; });
    eq(bad2.length, 0, lang + ' bigrams wrong length: ' + bad2.join(', '));
    eq(bad3.length, 0, lang + ' trigrams wrong length: ' + bad3.join(', '));
  });
});

suite('data / lessons');

/* Characters a learner could actually be asked to type on the target layout.
 * Anything outside this is almost certainly an authoring slip. */
const ALLOWED = {
  en: /^[a-zA-Z0-9 .,;:'"!?()\-_=+@#$%&*/\\[\]{}<>~`^|]+$/,
  es: /^[a-zA-ZáéíóúüñÁÉÍÓÚÜÑ0-9 .,;:'"!?¿¡()\-_=+@#$%&*/\\[\]{}<>~`^|°]+$/
};

test('every lesson has an id, title, description and target', function () {
  ['en', 'es'].forEach(function (lang) {
    ok(D.lessons[lang].length >= 15, lang + ' has only ' + D.lessons[lang].length + ' lessons');
    D.lessons[lang].forEach(function (l) {
      ok(l.id && l.id.indexOf(lang + '-') === 0, 'bad id: ' + l.id);
      ok(l.title && l.title.length > 2, l.id + ': missing title');
      ok(l.desc && l.desc.length > 5, l.id + ': missing description');
      ok(l.target && l.target.wpm > 0 && l.target.acc > 0, l.id + ': bad target');
      ok(l.target.acc <= 100, l.id + ': accuracy target above 100');
    });
  });
});

test('lesson ids are unique', function () {
  const all = [].concat(D.lessons.en, D.lessons.es).map(function (l) { return l.id; });
  noDuplicates(all, 'lesson ids');
});

test('targets get harder as the track progresses', function () {
  ['en', 'es'].forEach(function (lang) {
    const wpms = D.lessons[lang].map(function (l) { return l.target.wpm; });
    ok(wpms[wpms.length - 1] > wpms[0], lang + ': last lesson is no harder than the first');
  });
});

test('every lesson generates non-empty, typeable text', function () {
  ['en', 'es'].forEach(function (lang) {
    D.lessons[lang].forEach(function (l) {
      const words = global.TT.generator.lesson(l, { lang: lang, random: seeded(3) });
      ok(Array.isArray(words) && words.length > 0, l.id + ': generated nothing');
      words.forEach(function (w) {
        ok(typeof w === 'string' && w.length > 0, l.id + ': produced an empty word');
        ok(ALLOWED[lang].test(w), l.id + ': untypeable text "' + w + '"');
      });
    });
  });
});

test('explicit lesson word lists are typeable on the target layout', function () {
  ['en', 'es'].forEach(function (lang) {
    D.lessons[lang].forEach(function (l) {
      (l.words || []).forEach(function (w) {
        ok(ALLOWED[lang].test(w), l.id + ': bad word "' + w + '"');
      });
      (l.chars || []).forEach(function (c) {
        eq(c.length, 1, l.id + ': "' + c + '" is not a single character');
        ok(ALLOWED[lang].test(c), l.id + ': bad character "' + c + '"');
      });
    });
  });
});

test('character drills only use characters present on the layout', function () {
  const layouts = { en: D.layouts.ansi, es: D.layouts.latam };
  ['en', 'es'].forEach(function (lang) {
    const idx = layouts[lang].index;
    D.lessons[lang].forEach(function (l) {
      (l.chars || []).forEach(function (c) {
        ok(idx[c] !== undefined, l.id + ': "' + c + '" is not on the ' + layouts[lang].name + ' layout');
      });
    });
  });
});

suite('data / layouts');

test('every layout exposes a home row, bumps and an index', function () {
  D.layouts.ids.forEach(function (id) {
    const l = D.layouts[id];
    eq(l.homeRow.length, 8, id + ': home row should be eight keys');
    eq(l.bumps, ['f', 'j'], id + ': bumps should be F and J');
    ok(Object.keys(l.index).length > 40, id + ': index looks too small');
  });
});

test('every letter of the alphabet is reachable on every layout', function () {
  D.layouts.ids.forEach(function (id) {
    'abcdefghijklmnopqrstuvwxyz'.split('').forEach(function (c) {
      ok(D.layouts[id].index[c], id + ' is missing ' + c);
    });
  });
  ok(D.layouts.latam.index['ñ'], 'latam is missing ñ');
  ok(D.layouts.es.index['ñ'], 'es is missing ñ');
});

test('an explicit layout choice wins and auto follows the language', function () {
  eq(D.layouts.resolve('uk', 'es').id, 'uk', 'explicit choice must override the language');
  eq(D.layouts.resolve('auto', 'es').id, 'latam');
  eq(D.layouts.resolve('auto', 'en').id, 'ansi');
  eq(D.layouts.resolve(undefined, 'en').id, 'ansi', 'a missing setting behaves like auto');
});

test('accented characters resolve to their dead key on the Latin American layout', function () {
  ['á', 'é', 'í', 'ó', 'ú', 'ü'].forEach(function (c) {
    const entry = D.layouts.latam.index[c];
    ok(entry, 'no mapping for ' + c);
    ok(entry.dead, c + ' should be marked as a dead-key sequence');
    ok(entry.key.main === '´' || entry.key.main === '¨', c + ' maps to the wrong dead key');
  });
});

test('every Spanish word can be produced on both Spanish-capable layouts', function () {
  ['latam', 'es'].forEach(function (id) {
    const idx = D.layouts[id].index;
    const missing = {};
    D.words.es.forEach(function (w) {
      w.split('').forEach(function (c) { if (!idx[c]) missing[c] = true; });
    });
    eq(Object.keys(missing), [], id + ': characters with no key: ' + Object.keys(missing).join(', '));
  });
});

test('every finger assignment is a known finger', function () {
  const valid = ['lp', 'lr', 'lm', 'li', 'ri', 'rm', 'rr', 'rp', 'th'];
  D.layouts.ids.forEach(function (id) {
    D.layouts[id].rows.forEach(function (row) {
      row.forEach(function (k) {
        ok(valid.indexOf(k.finger) !== -1, id + ': "' + k.main + '" has finger "' + k.finger + '"');
      });
    });
  });
});

suite('data');

test('patterns contain no whitespace', function () {
  ['en', 'es'].forEach(function (lang) {
    const sets = D.patterns[lang];
    [].concat(sets.bigrams, sets.trigrams, sets.clusters).forEach(function (p) {
      ok(!/\s/.test(p), lang + ': whitespace in pattern "' + p + '"');
      ok(p.length > 0, lang + ': empty pattern');
    });
  });
});
