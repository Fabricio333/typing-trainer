/* On-screen keyboard: next-key hinting while typing, and a miss-rate heatmap
 * in the stats view. Both render from the same layout data. */
(function (TT) {
  'use strict';

  var FINGER_LABEL = {
    lp: 'left pinky', lr: 'left ring', lm: 'left middle', li: 'left index',
    ri: 'right index', rm: 'right middle', rr: 'right ring', rp: 'right pinky',
    th: 'thumb'
  };

  function build(host, layout, opts) {
    var o = opts || {};
    if (!host) return null;
    host.innerHTML = '';

    var board = document.createElement('div');
    board.className = 'kb';
    if (o.fingerColors) board.classList.add('kb-fingers');

    var byChar = {};

    layout.rows.forEach(function (row) {
      var rowEl = document.createElement('div');
      rowEl.className = 'kb-row';

      row.forEach(function (k) {
        var el = document.createElement('div');
        el.className = 'kb-key';
        el.style.flexGrow = String(k.width);
        el.style.flexBasis = (k.width * 2.6) + 'rem';
        el.dataset.finger = k.finger;

        var isSpecial = k.main.length > 1;
        if (isSpecial) el.classList.add('kb-special');
        if (k.main === ' ') el.classList.add('kb-space');
        if (layout.homeRow.indexOf(k.main) !== -1) el.classList.add('kb-home');
        if (layout.bumps.indexOf(k.main) !== -1) el.classList.add('kb-bump');

        var label = k.main === ' ' ? '' : k.main;
        if (k.shift && !isSpecial && k.shift !== k.main.toUpperCase()) {
          el.innerHTML = '<span class="kb-shift">' + esc(k.shift) + '</span>' +
                         '<span class="kb-main">' + esc(label) + '</span>';
        } else {
          el.innerHTML = '<span class="kb-main">' + esc(label) + '</span>';
        }

        el.title = FINGER_LABEL[k.finger] || '';
        rowEl.appendChild(el);

        if (k.main.length === 1 && !byChar[k.main]) byChar[k.main] = el;
      });

      board.appendChild(rowEl);
    });

    host.appendChild(board);
    return { board: board, byChar: byChar, layout: layout };
  }

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  /* Lights the physical key for `ch`, plus Shift when the character needs it.
   * Accented characters point at the dead key that starts them. */
  function highlight(board, ch) {
    if (!board) return;
    clearClass(board.board, 'is-next');
    clearClass(board.board, 'is-shift');
    if (!ch) return;

    var entry = board.layout.index[ch];
    if (!entry) return;

    var el = board.byChar[entry.key.main];
    if (el) el.classList.add('is-next');

    if (entry.shift) {
      Array.prototype.forEach.call(board.board.querySelectorAll('.kb-key'), function (k) {
        if (k.querySelector('.kb-main') && k.querySelector('.kb-main').textContent === 'Shift') {
          k.classList.add('is-shift');
        }
      });
    }
  }

  /* Brief flash on the key actually pressed, so mistakes are visible. */
  function flash(board, ch, ok) {
    if (!board) return;
    var el = board.byChar[ch] || board.byChar[String(ch).toLowerCase()];
    if (!el) return;
    var cls = ok ? 'is-hit' : 'is-miss';
    el.classList.add(cls);
    setTimeout(function () { el.classList.remove(cls); }, 140);
  }

  function clearClass(root, cls) {
    Array.prototype.forEach.call(root.querySelectorAll('.' + cls), function (el) {
      el.classList.remove(cls);
    });
  }

  /* Both maps write their own custom property, so each has to wipe the other's
   * before painting or a key keeps the colour of the view you just left. */
  function resetPaint(el) {
    el.classList.remove('is-cold');
    el.style.removeProperty('--heat');
    el.style.removeProperty('--speed');
  }

  /* Paints each key by miss rate: transparent when clean, saturated when bad. */
  function heatmap(board, keyStats, minSamples) {
    if (!board) return;
    var min = minSamples === undefined ? 4 : minSamples;

    Object.keys(board.byChar).forEach(function (ch) {
      var el = board.byChar[ch];
      var s = keyStats[ch] || keyStats[ch.toLowerCase()];
      resetPaint(el);

      if (!s) {
        el.classList.add('is-cold');
        el.title = (FINGER_LABEL[el.dataset.finger] || '') + ' — no data yet';
        return;
      }
      var total = (s.hits || 0) + (s.misses || 0);
      if (total < min) {
        el.classList.add('is-cold');
        el.title = 'only ' + total + ' presses so far';
        return;
      }
      var rate = s.misses / total;
      // Anything worse than 1-in-4 is already "fully hot"; beyond that the
      // gradient stops carrying information.
      el.style.setProperty('--heat', Math.min(1, rate / 0.25).toFixed(3));
      el.title = ch + ' — ' + Math.round(rate * 100) + '% missed over ' + total + ' presses';
    });
  }

  /* Paints each key by how fast it comes out. The scale is relative to this
   * typist's own range — fastest key to slowest key — because an absolute
   * wpm scale paints a beginner's whole board red and an expert's whole board
   * orange, and neither tells them which key to work on next.
   *
   * `rows` is what keyspeed.perKey() returns. */
  function speedmap(board, rows) {
    if (!board) return;
    var byKey = {};
    (rows || []).forEach(function (r) { byKey[r.key] = r; });

    var times = (rows || []).map(function (r) { return r.avgMs; });
    var fastest = times.length ? Math.min.apply(null, times) : 0;
    var slowest = times.length ? Math.max.apply(null, times) : 0;
    var span = slowest - fastest;

    Object.keys(board.byChar).forEach(function (ch) {
      var el = board.byChar[ch];
      var r = byKey[ch] || byKey[ch.toLowerCase()];
      resetPaint(el);

      if (!r) {
        el.classList.add('is-cold');
        el.title = (FINGER_LABEL[el.dataset.finger] || '') + ' — no timing yet';
        return;
      }
      // A single ranked key (or a dead-flat range) has nothing to be relative
      // to, so it sits mid-scale rather than being called the slowest.
      var t = span > 0 ? (r.avgMs - fastest) / span : 0.5;
      el.style.setProperty('--speed', t.toFixed(3));
      el.title = ch + ' — ' + Math.round(r.wpm) + ' wpm (' +
        Math.round(r.avgMs) + 'ms) over ' + r.n + ' timed presses';
    });
  }

  TT.keyboard = {
    build: build,
    highlight: highlight,
    flash: flash,
    heatmap: heatmap,
    speedmap: speedmap,
    FINGER_LABEL: FINGER_LABEL
  };
})(window.TT = window.TT || {});
