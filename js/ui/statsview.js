/* The statistics view: headline tiles, trend chart, personal bests, key heatmap
 * and the recent-tests table. All read-only over what results.js has stored. */
(function (TT) {
  'use strict';

  var heatBoard = null;

  function keyStats() {
    var m = TT.storage.read('keystats', {});
    return m && typeof m === 'object' ? m : {};
  }

  function addKeyStats(sessionKeys) {
    var merged = TT.stats.mergeKeyStats(keyStats(), sessionKeys);
    TT.storage.write('keystats', merged);
    return merged;
  }

  function tiles(rows) {
    if (rows.length === 0) {
      return [
        { label: 'tests taken', value: '0' },
        { label: 'best wpm', value: '—' },
        { label: 'average wpm', value: '—' },
        { label: 'time typing', value: '0m' }
      ];
    }

    var best = rows.reduce(function (m, r) { return Math.max(m, r.wpm); }, 0);
    var recent = rows.slice(-10);
    var avg = recent.reduce(function (a, r) { return a + r.wpm; }, 0) / recent.length;
    var acc = recent.reduce(function (a, r) { return a + r.acc; }, 0) / recent.length;
    var seconds = rows.reduce(function (a, r) { return a + (r.seconds || 0); }, 0);

    return [
      { label: 'tests taken', value: String(rows.length) },
      { label: 'best wpm', value: String(Math.round(best)) },
      { label: 'average wpm', value: String(Math.round(avg)), sub: 'last ' + recent.length + ' tests' },
      { label: 'average accuracy', value: Math.round(acc) + '%', sub: 'last ' + recent.length + ' tests' },
      { label: 'time typing', value: formatDuration(seconds) }
    ];
  }

  function formatDuration(seconds) {
    if (seconds < 60) return Math.round(seconds) + 's';
    var mins = Math.round(seconds / 60);
    if (mins < 60) return mins + 'm';
    var hours = Math.floor(mins / 60);
    return hours + 'h ' + (mins % 60) + 'm';
  }

  function render(els, lang) {
    var rows = TT.results.list();

    els.tiles.innerHTML = tiles(rows).map(function (t) {
      return '<div class="tile">' +
        '<div class="tile-label">' + t.label + '</div>' +
        '<div class="tile-value">' + t.value + '</div>' +
        (t.sub ? '<div class="tile-sub">' + t.sub + '</div>' : '') +
        '</div>';
    }).join('');

    // Trend chart over the most recent runs. The canvas draws its own empty
    // state, so there is no separate placeholder to toggle.
    TT.chart.history(els.chart, rows.slice(-40));

    // Personal bests per mode.
    var bests = TT.results.bests();
    var modes = Object.keys(bests).sort();
    els.pbGrid.innerHTML = modes.length === 0
      ? '<p class="empty-note">No results yet.</p>'
      : modes.map(function (m) {
          var r = bests[m];
          return '<div class="pb">' +
            '<div class="pb-mode">' + escapeHtml(m) + '</div>' +
            '<div class="pb-wpm">' + Math.round(r.wpm) + '</div>' +
            '<div class="pb-acc">' + Math.round(r.acc) + '% · ' + TT.results.timeAgo(r.at) + '</div>' +
            '</div>';
        }).join('');

    // Key heatmap. Rebuild when the layout (i.e. language) changes.
    var layout = TT.data.layouts.forLanguage(lang);
    if (!heatBoard || heatBoard.layout.id !== layout.id) {
      heatBoard = TT.keyboard.build(els.heatmap, layout, { fingerColors: false });
    }
    var keys = keyStats();
    TT.keyboard.heatmap(heatBoard, keys);

    var worst = TT.stats.worstKeys(keys, 8, 6);
    els.worst.innerHTML = worst.length === 0
      ? '<span class="tile-sub">Type a few more tests and your weakest keys will show up here.</span>'
      : worst.map(function (w) {
          return '<span class="worst-key">' + escapeHtml(w.key) +
            ' <b>' + Math.round(w.rate * 100) + '%</b> missed</span>';
        }).join('');

    // Recent tests, newest first.
    var recent = rows.slice(-25).reverse();
    els.historyBody.innerHTML = recent.length === 0
      ? '<tr><td colspan="5" class="dim">Nothing yet.</td></tr>'
      : recent.map(function (r) {
          return '<tr>' +
            '<td class="dim">' + TT.results.timeAgo(r.at) + '</td>' +
            '<td class="dim">' + escapeHtml(r.mode) + '</td>' +
            '<td>' + Math.round(r.wpm) + '</td>' +
            '<td>' + Math.round(r.acc) + '%</td>' +
            '<td class="dim">' + Math.round(r.consistency) + '%</td>' +
            '</tr>';
        }).join('');
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function invalidateLayout() { heatBoard = null; }

  TT.statsview = {
    render: render,
    keyStats: keyStats,
    addKeyStats: addKeyStats,
    invalidateLayout: invalidateLayout,
    formatDuration: formatDuration
  };
})(window.TT = window.TT || {});
