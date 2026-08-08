'use strict';

const R = global.TT.results;

suite('results');

test('the finished run is included immediately and lesson notes do not hide a PR', function () {
  var rows = [];
  TT.storage = {
    read: function () { return rows; },
    write: function (name, value) { rows = value; }
  };
  TT.chart = { results: function () {} };
  const node = () => ({ textContent: '', innerHTML: '', hidden: false });
  const els = { wpm: node(), acc: node(), meta: node(), grid: node(), chart: node(), note: node(), prev: node() };
  R.mount(els);

  R.save({ at: 1, mode: 'lesson', content: 'home-row', wpm: 40 });
  const record = { at: 2, mode: 'lesson', content: 'home-row', wpm: 50 };
  R.save(record);
  R.render({
    wpm: 50, raw: 50, accuracy: 100, consistency: 100, seconds: 10,
    mode: { type: 'lesson' }, chars: { correct: 50, incorrect: 0, extra: 0, missed: 0 },
    keystrokes: 50, series: []
  }, { note: 'Lesson passed.' }, record);

  ok(els.note.textContent.indexOf('Lesson passed.') !== -1, els.note.textContent);
  ok(els.note.textContent.indexOf('New personal best') !== -1, els.note.textContent);
  eq(els.prev.textContent, 'Best 50 wpm · runs: 40, 50 wpm');
});
