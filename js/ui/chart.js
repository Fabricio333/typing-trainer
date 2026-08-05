/* Hand-drawn canvas charts. Deliberately dependency-free: a charting library
 * would be the only thing in this project needing a network fetch or a build step.
 *
 * Colours are read from the active theme's custom properties at draw time, so
 * charts re-theme correctly when the palette changes. */
(function (TT) {
  'use strict';

  var PAD = { top: 18, right: 44, bottom: 26, left: 44 };
  var TICKS = 4;

  function palette(el) {
    var cs = window.getComputedStyle(el || document.documentElement);
    function v(name, fallback) {
      var got = cs.getPropertyValue(name).trim();
      return got || fallback;
    }
    return {
      main: v('--main', '#ffb86b'),
      sub: v('--sub', '#61616b'),
      subAlt: v('--sub-alt', '#3a3a42'),
      text: v('--text', '#e8e8ea'),
      error: v('--error', '#ff5f5f'),
      border: v('--border', '#2f2f37')
    };
  }

  /* Sizes the backing store to the element's real pixel size so lines stay crisp
   * on high-DPI screens, and returns a context already scaled to CSS pixels. */
  function prepare(canvas) {
    var dpr = window.devicePixelRatio || 1;
    var rect = canvas.getBoundingClientRect();
    var w = Math.max(1, Math.round(rect.width || canvas.width));
    var h = Math.max(1, Math.round(rect.height || canvas.height));

    canvas.width = w * dpr;
    canvas.height = h * dpr;
    var ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    return { ctx: ctx, w: w, h: h };
  }

  /* Picks a maximum that divides evenly by the tick count, so the axis reads
   * 0/25/50/75/100 rather than 0/88/175/263/350. */
  function niceMax(value, ticks) {
    var n = ticks || 4;
    if (value <= 0) return n * 5;
    var perTick = value / n;
    var steps = [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500];
    for (var i = 0; i < steps.length; i++) {
      if (steps[i] >= perTick) return steps[i] * n;
    }
    return Math.ceil(perTick / 1000) * 1000 * n;
  }

  function axes(ctx, box, c, maxY, xLabels) {
    var plotH = box.h - PAD.top - PAD.bottom;
    var plotW = box.w - PAD.left - PAD.right;

    ctx.strokeStyle = c.border;
    ctx.fillStyle = c.sub;
    ctx.lineWidth = 1;
    ctx.font = '11px ui-monospace, monospace';
    ctx.textBaseline = 'middle';

    var ticks = TICKS;
    for (var i = 0; i <= ticks; i++) {
      var val = (maxY / ticks) * i;
      var y = Math.round(PAD.top + plotH - (plotH * i) / ticks) + 0.5;
      ctx.beginPath();
      ctx.moveTo(PAD.left, y);
      ctx.lineTo(PAD.left + plotW, y);
      ctx.stroke();
      ctx.textAlign = 'right';
      ctx.fillText(String(Math.round(val)), PAD.left - 8, y);
    }

    if (xLabels && xLabels.length) {
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      xLabels.forEach(function (lab) {
        var x = PAD.left + plotW * lab.at;
        ctx.fillText(lab.text, x, PAD.top + plotH + 8);
      });
    }
  }

  function line(ctx, points, colour, width, dashed) {
    if (points.length === 0) return;
    ctx.save();
    ctx.strokeStyle = colour;
    ctx.lineWidth = width;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    if (dashed) ctx.setLineDash([4, 4]);
    ctx.beginPath();
    points.forEach(function (p, i) {
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.stroke();
    ctx.restore();
  }

  /* Per-second WPM for a single completed test, with error markers. */
  function results(canvas, series) {
    if (!canvas || !series) return;
    var box = prepare(canvas);
    var ctx = box.ctx;
    var c = palette(canvas);

    if (series.length === 0) {
      empty(ctx, box, c, 'not enough data');
      return;
    }

    var plotH = box.h - PAD.top - PAD.bottom;
    var plotW = box.w - PAD.left - PAD.right;
    var peak = series.reduce(function (m, p) { return Math.max(m, p.raw, p.wpm); }, 0);
    var maxY = niceMax(peak, TICKS);
    var lastSecond = series[series.length - 1].second;

    axes(ctx, box, c, maxY, [
      { at: 0, text: '0s' },
      { at: 1, text: lastSecond + 's' }
    ]);

    function toXY(p, key) {
      var t = series.length === 1 ? 1 : (p.second - series[0].second) / (lastSecond - series[0].second || 1);
      return {
        x: PAD.left + plotW * t,
        y: PAD.top + plotH - (plotH * Math.min(p[key], maxY)) / maxY
      };
    }

    line(ctx, series.map(function (p) { return toXY(p, 'raw'); }), c.subAlt, 1.5, true);
    line(ctx, series.map(function (p) { return toXY(p, 'wpm'); }), c.main, 2.5, false);

    // Errors sit on the baseline so they read as "when", not "how many".
    ctx.fillStyle = c.error;
    series.forEach(function (p) {
      if (!p.errors) return;
      var xy = toXY(p, 'wpm');
      ctx.beginPath();
      ctx.arc(xy.x, PAD.top + plotH, 3, 0, Math.PI * 2);
      ctx.fill();
    });

    legend(ctx, box, c, [
      { colour: c.main, label: 'wpm' },
      { colour: c.subAlt, label: 'raw' },
      { colour: c.error, label: 'errors' }
    ]);
  }

  /* WPM across recent tests, oldest to newest. */
  function history(canvas, points) {
    if (!canvas) return;
    var box = prepare(canvas);
    var ctx = box.ctx;
    var c = palette(canvas);

    if (!points || points.length < 2) {
      empty(ctx, box, c, points && points.length === 1
        ? 'one test so far — a couple more and a trend appears'
        : 'no tests yet');
      return;
    }

    var plotH = box.h - PAD.top - PAD.bottom;
    var plotW = box.w - PAD.left - PAD.right;
    var peak = points.reduce(function (m, p) { return Math.max(m, p.wpm); }, 0);
    var maxY = niceMax(peak, TICKS);

    axes(ctx, box, c, maxY, [
      { at: 0, text: 'oldest' },
      { at: 1, text: 'latest' }
    ]);

    var xy = points.map(function (p, i) {
      return {
        x: PAD.left + (plotW * i) / (points.length - 1),
        y: PAD.top + plotH - (plotH * Math.min(p.wpm, maxY)) / maxY
      };
    });

    line(ctx, xy, c.main, 2, false);
    ctx.fillStyle = c.main;
    xy.forEach(function (p) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  function legend(ctx, box, c, items) {
    ctx.font = '11px ui-monospace, monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    var x = PAD.left;
    var y = 9;
    items.forEach(function (it) {
      ctx.fillStyle = it.colour;
      ctx.fillRect(x, y - 1.5, 12, 3);
      ctx.fillStyle = c.sub;
      ctx.fillText(it.label, x + 17, y);
      x += 17 + ctx.measureText(it.label).width + 14;
    });
  }

  function empty(ctx, box, c, message) {
    ctx.fillStyle = c.sub;
    ctx.font = '13px ui-monospace, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(message, box.w / 2, box.h / 2);
  }

  TT.chart = { results: results, history: history };
})(window.TT = window.TT || {});
