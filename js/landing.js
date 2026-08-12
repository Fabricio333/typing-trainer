/* Landing page behaviour. Standalone: it shares the palette and base stylesheet
 * with the trainer but none of its JavaScript, so nothing here can slow the app
 * itself down.
 *
 * Everything is progressive. With scripting off the page is still complete
 * prose — the demo panel simply stays empty and the reveal animation never gets
 * applied, because the class that hides content is added by this file. */
(function () {
  'use strict';

  var reduced = window.matchMedia &&
                window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── shared with the trainer: the saved theme ──────────────────── */

  var SETTINGS_KEY = 'tt.settings.v1';
  var THEMES = ['carbon', 'paper', 'nord', 'dracula', 'solarized', 'matrix', 'ocean', 'sepia'];

  function readSettings() {
    try {
      return JSON.parse(window.localStorage.getItem(SETTINGS_KEY) || '{}') || {};
    } catch (e) {
      return {};
    }
  }

  /* Writes the whole settings object back rather than a theme-only key: the app
   * reads one blob, so a partial write would drop the other preferences. */
  function cycleTheme() {
    var s = readSettings();
    var next = THEMES[(THEMES.indexOf(s.theme) + 1) % THEMES.length];
    document.documentElement.setAttribute('data-theme', next);
    s.theme = next;
    try {
      window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
    } catch (e) { /* storage blocked: the theme still applies for this visit */ }
  }

  var themeBtn = document.getElementById('theme-cycle');
  if (themeBtn) themeBtn.addEventListener('click', cycleTheme);

  /* ── on-screen keyboards ───────────────────────────────────────── */

  var ROWS = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'];

  function buildKeyboard(host, opts) {
    if (!host) return {};
    var map = {};
    ROWS.forEach(function (row) {
      var el = document.createElement('div');
      el.className = 'demo-kb-row';
      row.split('').forEach(function (ch) {
        var key = document.createElement('span');
        key.className = 'demo-key';
        key.textContent = ch;
        if (opts && opts.shade) opts.shade(key, ch);
        el.appendChild(key);
        map[ch] = key;
      });
      host.appendChild(el);
    });

    var last = document.createElement('div');
    last.className = 'demo-kb-row';
    var space = document.createElement('span');
    space.className = 'demo-key wide';
    last.appendChild(space);
    host.appendChild(last);
    map[' '] = space;

    return map;
  }

  /* The heatmap preview is illustrative, not somebody's real history: these are
   * plausible relative error rates for a right-handed QWERTY typist. */
  var HEAT = {
    q: 0.7, w: 0.2, e: 0.02, r: 0.1, t: 0.05, y: 0.35, u: 0.15, i: 0.1, o: 0.15, p: 0.55,
    a: 0.05, s: 0.02, d: 0, f: 0, g: 0.2, h: 0.15, j: 0, k: 0.08, l: 0.12,
    z: 0.85, x: 0.6, c: 0.15, v: 0.3, b: 0.75, n: 0.08, m: 0.25
  };

  buildKeyboard(document.getElementById('heat-kb'), {
    shade: function (key, ch) {
      var heat = HEAT[ch] || 0;
      key.style.background = 'color-mix(in srgb, var(--error) ' +
                             Math.round(heat * 65) + '%, var(--surface-2))';
    }
  });

  /* ── the self-typing demo ──────────────────────────────────────── */

  var textEl = document.getElementById('demo-text');
  var kbMap = buildKeyboard(document.getElementById('demo-kb'));

  if (textEl) {
    var LINES = [
      'the obstacle in the path becomes the path',
      'you have power over your mind, not outside events',
      'well begun is half done and half done is a start'
    ];

    // A deliberate typo per line, so the error colour appears in the demo the
    // same way it does in the trainer: index into the line, and the wrong key.
    var TYPOS = [{ at: 12, ch: 'r' }, { at: 15, ch: 'e' }, { at: 9, ch: 'i' }];

    var line = 0, pos = 0, typed = '', wrong = '';
    // Speed is per line (the counter restarts with each one); accuracy is
    // cumulative, so it settles instead of collapsing on the first typo.
    var correct = 0, started = 0;
    var hits = 0, misses = 0;
    var countEl = document.getElementById('demo-count');
    var wpmEl = document.getElementById('demo-wpm');
    var accEl = document.getElementById('demo-acc');

    function esc(s) {
      return s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
    }

    function paint() {
      var rest = LINES[line].slice(pos);
      textEl.innerHTML =
        '<span class="ok">' + esc(typed) + '</span>' +
        (wrong ? '<span class="bad">' + esc(wrong) + '</span>' : '') +
        '<span class="demo-caret"></span>' + esc(rest);
    }

    function flash(ch) {
      var key = kbMap[ch.toLowerCase()];
      if (!key) return;
      key.classList.add('is-hit');
      window.setTimeout(function () { key.classList.remove('is-hit'); }, 110);
    }

    function updateStats() {
      var mins = (Date.now() - started) / 60000;
      var wpm = mins > 0 ? Math.round((correct / 5) / mins) : 0;
      var total = hits + misses;
      wpmEl.textContent = Math.min(wpm, 120);
      accEl.textContent = total ? Math.round((hits / total) * 100) : 100;
      countEl.textContent = Math.max(0, 30 - Math.round((Date.now() - started) / 1000));
    }

    function step() {
      var text = LINES[line];
      var typo = TYPOS[line];

      // The typo goes in, sits there for a beat, then gets rubbed out — which
      // is the whole point of showing it.
      if (wrong) {
        wrong = '';
        paint();
        return window.setTimeout(step, 220);
      }
      if (typo && pos === typo.at) {
        wrong = typo.ch;
        misses++;
        flash(typo.ch);
        paint();
        updateStats();
        return window.setTimeout(step, 380);
      }

      if (pos >= text.length) {
        line = (line + 1) % LINES.length;
        pos = 0;
        typed = '';
        return window.setTimeout(function () {
          started = Date.now();
          correct = 0;
          paint();
          step();
        }, 1400);
      }

      var ch = text.charAt(pos);
      typed += ch;
      pos++;
      correct++;
      hits++;
      flash(ch);
      paint();
      updateStats();

      // Human-ish cadence: a longer pause after a space, jitter everywhere else.
      var delay = (ch === ' ' ? 150 : 60) + Math.random() * 90;
      window.setTimeout(step, delay);
    }

    if (reduced) {
      // No animation: show one finished line instead of an empty panel.
      typed = LINES[0];
      pos = LINES[0].length;
      paint();
      wpmEl.textContent = '68';
    } else {
      started = Date.now();
      paint();
      window.setTimeout(step, 700);
    }
  }

  /* ── quote rotator ─────────────────────────────────────────────── */

  var rotator = document.getElementById('quote-rotator');
  if (rotator) {
    var QUOTES = [
      ['We suffer more often in imagination than in reality.', 'Seneca'],
      ['You have power over your mind — not outside events. Realise this, and you will find strength.', 'Marcus Aurelius'],
      ['It is not that we have a short time to live, but that we waste a lot of it.', 'Seneca'],
      ['The impediment to action advances action. What stands in the way becomes the way.', 'Marcus Aurelius'],
      ['First say to yourself what you would be; and then do what you have to do.', 'Epictetus']
    ];
    var qi = 0;

    function showQuote() {
      var q = QUOTES[qi % QUOTES.length];
      rotator.innerHTML = '';
      rotator.appendChild(document.createTextNode('“' + q[0] + '”'));
      var who = document.createElement('span');
      who.className = 'who';
      who.textContent = '— ' + q[1] + ', in quote mode';
      rotator.appendChild(who);
      qi++;
    }

    showQuote();
    if (!reduced) window.setInterval(showQuote, 6500);
  }

  /* ── reveal on scroll and counting figures ─────────────────────── */

  var targets = document.querySelectorAll('.reveal');

  function countUp(el) {
    var to = parseInt(el.dataset.count, 10);
    var suffix = el.dataset.suffix || '';
    if (isNaN(to)) return;
    if (reduced) { el.textContent = to + suffix; return; }

    var from = Date.now();
    (function tick() {
      var p = Math.min(1, (Date.now() - from) / 900);
      el.textContent = Math.round(to * (1 - Math.pow(1 - p, 3))) + suffix;
      if (p < 1) window.requestAnimationFrame(tick);
    })();
  }

  if ('IntersectionObserver' in window) {
    document.body.classList.add('js-reveal');
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        var figures = entry.target.querySelectorAll('[data-count]');
        Array.prototype.forEach.call(figures, countUp);
        io.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.08 });

    Array.prototype.forEach.call(targets, function (el) { io.observe(el); });
  } else {
    Array.prototype.forEach.call(document.querySelectorAll('[data-count]'), countUp);
  }
})();
