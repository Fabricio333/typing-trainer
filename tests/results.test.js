'use strict';

const R = global.TT.results;

suite('results');

test('the finished run is included immediately and lesson notes do not hide a PR', function () {
  var store = {};
  TT.storage = {
    read: function (name, fallback) { return name in store ? store[name] : fallback; },
    write: function (name, value) { store[name] = value; }
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

test('lifetime counters keep growing past the history cap and trimmed rows fold into blocks', function () {
  var store = {};
  TT.storage = {
    read: function (name, fallback) { return name in store ? store[name] : fallback; },
    write: function (name, value) { store[name] = value; }
  };

  var total = R.MAX_HISTORY + 60;
  for (var i = 1; i <= total; i++) {
    R.save({ at: i, mode: 'time 30', wpm: 40 + (i % 10), acc: 95, seconds: 30 });
  }

  eq(R.list().length, R.MAX_HISTORY);

  var life = R.lifetime();
  eq(life.tests, total);
  eq(life.seconds, total * 30);
  eq(life.bestWpm, 49);

  var blocks = R.blocks();
  eq(blocks.done.length, 1);           // 60 trimmed rows -> one closed block of 50
  eq(blocks.done[0].n, 50);
  eq(blocks.done[0].seconds, 1500);
  eq(blocks.open.n, 10);               // ...and 10 waiting in the open block
});

test('lifetime seeds itself from an existing history the first time', function () {
  var store = {
    results: [
      { at: 1, mode: 'time 30', wpm: 50, acc: 96, seconds: 30 },
      { at: 2, mode: 'time 30', wpm: 60, acc: 97, seconds: 15 }
    ]
  };
  TT.storage = {
    read: function (name, fallback) { return name in store ? store[name] : fallback; },
    write: function (name, value) { store[name] = value; }
  };

  var life = R.lifetime();
  eq(life.tests, 2);
  eq(life.seconds, 45);
  eq(life.bestWpm, 60);

  R.save({ at: 3, mode: 'time 30', wpm: 55, acc: 95, seconds: 30 });
  life = R.lifetime();
  eq(life.tests, 3);
  eq(life.seconds, 75);
  eq(life.bestWpm, 60);
});
