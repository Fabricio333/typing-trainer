/* The end-of-test screen, plus the results history it writes to.
 * Keeping both here means the record shape is defined in exactly one place. */
(function (TT) {
  'use strict';

  var MAX_HISTORY = 500;

  function list() {
    var rows = TT.storage.read('results', []);
    return Array.isArray(rows) ? rows : [];
  }

  function save(record) {
    var rows = list();
    rows.push(record);
    if (rows.length > MAX_HISTORY) rows = rows.slice(rows.length - MAX_HISTORY);
    TT.storage.write('results', rows);
    return rows;
  }

  function modeLabel(mode, extra) {
    if (!mode) return '';
    switch (mode.type) {
      case 'time': return 'time ' + mode.value;
      case 'words': return 'words ' + mode.value;
      case 'quote': return 'quote ' + (extra && extra.quoteLength ? extra.quoteLength : '');
      case 'patterns': return 'patterns';
      case 'zen': return 'zen';
      case 'lesson': return 'lesson';
      default: return mode.type;
    }
  }

  /* Best result per mode label, ranked by wpm. */
  function bests() {
    var out = {};
    list().forEach(function (r) {
      var k = r.mode;
      if (!out[k] || r.wpm > out[k].wpm) out[k] = r;
    });
    return out;
  }

  function round(n, places) {
    var f = Math.pow(10, places || 0);
    return Math.round(n * f) / f;
  }

  /* Builds the stored record. Kept separate from rendering so a lesson run can
   * reuse it without touching the DOM. */
  function toRecord(summary, context) {
    return {
      at: Date.now(),
      wpm: round(summary.wpm, 1),
      raw: round(summary.raw, 1),
      acc: round(summary.accuracy, 1),
      consistency: round(summary.consistency, 1),
      seconds: round(summary.seconds, 1),
      mode: modeLabel(summary.mode, context),
      lang: context && context.lang ? context.lang : 'en',
      lesson: context && context.lessonId ? context.lessonId : null,
      // Identifies fixed content (a lesson, a particular quote) so later runs
      // of the same text can be compared against each other.
      content: context && context.contentKey ? context.contentKey : null,
      chars: summary.chars
    };
  }

  function timeAgo(ts) {
    var secs = Math.floor((Date.now() - ts) / 1000);
    if (secs < 60) return 'just now';
    var mins = Math.floor(secs / 60);
    if (mins < 60) return mins + 'm ago';
    var hours = Math.floor(mins / 60);
    if (hours < 24) return hours + 'h ago';
    var days = Math.floor(hours / 24);
    if (days < 30) return days + 'd ago';
    return new Date(ts).toLocaleDateString();
  }

  var els = null;

  function mount(nodes) { els = nodes; }

  function render(summary, context, record) {
    if (!els) return;
    var ctx = context || {};

    els.wpm.textContent = String(Math.round(summary.wpm));
    els.acc.textContent = Math.round(summary.accuracy) + '%';
    els.meta.textContent = [
      modeLabel(summary.mode, ctx),
      ctx.lang ? ctx.lang.toUpperCase() : '',
      Math.round(summary.seconds) + 's'
    ].filter(Boolean).join(' · ');

    var c = summary.chars;
    var rows = [
      ['raw wpm', Math.round(summary.raw)],
      ['consistency', Math.round(summary.consistency) + '%'],
      ['characters', c.correct + '<small> / ' + c.incorrect + ' / ' + c.extra + ' / ' + c.missed + '</small>'],
      ['keystrokes', summary.keystrokes],
      ['time', Math.round(summary.seconds) + 's']
    ];
    els.grid.innerHTML = rows.map(function (r) {
      return '<div><dt>' + r[0] + '</dt><dd>' + r[1] + '</dd></div>';
    }).join('');

    TT.chart.results(els.chart, summary.series);

    // Highlight a personal best, but only once there is something to beat.
    var notes = [];
    if (record) {
      var previous = list().filter(function (r) {
        return r.mode === record.mode && r.at !== record.at;
      });
      var top = previous.reduce(function (m, r) { return Math.max(m, r.wpm); }, 0);
      if (previous.length && record.wpm > top) {
        notes.push('New personal best for ' + record.mode + ' — beat ' + Math.round(top) + ' wpm.');
      }
    }

    // Fixed content — a lesson or a particular quote — shows how the same
    // text went on earlier runs.
    var prevLine = '';
    if (record && record.content) {
      var previousRuns = list().filter(function (r) {
        return r.content === record.content && r.at !== record.at;
      });
      if (previousRuns.length) {
        var previousBest = previousRuns.reduce(function (m, r) { return Math.max(m, r.wpm); }, 0);
        if (record.wpm > previousBest && notes.length === 0) {
          notes.push('New personal best for this text — beat ' + Math.round(previousBest) + ' wpm.');
        }
        var runs = previousRuns.concat(record);
        var best = Math.max(previousBest, record.wpm);
        var lastFew = runs.slice(-5).map(function (r) { return Math.round(r.wpm); });
        prevLine = 'Best ' + Math.round(best) + ' wpm · runs: ' +
          lastFew.join(', ') + ' wpm';
      } else {
        prevLine = 'Best ' + Math.round(record.wpm) + ' wpm · runs: ' +
          Math.round(record.wpm) + ' wpm';
      }
    }
    if (ctx.note) notes.unshift(ctx.note);
    var note = notes.join(' ');
    els.note.textContent = note;
    els.note.hidden = !note;
    els.prev.textContent = prevLine;
    els.prev.hidden = !prevLine;
  }

  TT.results = {
    mount: mount,
    render: render,
    save: save,
    list: list,
    bests: bests,
    toRecord: toRecord,
    modeLabel: modeLabel,
    timeAgo: timeAgo,
    round: round,
    MAX_HISTORY: MAX_HISTORY
  };
})(window.TT = window.TT || {});
