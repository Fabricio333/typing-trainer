/* Lesson list, progress tracking and unlocking. */
(function (TT) {
  'use strict';

  function track(lang) {
    return (TT.data.lessons && TT.data.lessons[lang]) || [];
  }

  function progress() {
    var p = TT.storage.read('progress', {});
    return p && typeof p === 'object' ? p : {};
  }

  function recordFor(id) {
    return progress()[id] || null;
  }

  /* Stars scale off the lesson's own target: hitting it exactly is one star,
   * +25% is two, +50% is three. Accuracy must always clear the target. */
  function starsFor(def, wpm, acc) {
    if (!def || acc < def.target.acc || wpm < def.target.wpm) return 0;
    if (wpm >= def.target.wpm * 1.5) return 3;
    if (wpm >= def.target.wpm * 1.25) return 2;
    return 1;
  }

  function passed(id) {
    var r = recordFor(id);
    return !!(r && r.stars > 0);
  }

  /* A lesson is open if it is the first, or the one before it has been passed. */
  function isUnlocked(lang, index) {
    if (index <= 0) return true;
    var list = track(lang);
    return passed(list[index - 1].id);
  }

  function complete(lang, def, summary) {
    var stars = starsFor(def, summary.wpm, summary.accuracy);
    var all = progress();
    var prev = all[def.id];
    all[def.id] = {
      stars: Math.max(stars, prev ? prev.stars : 0),
      bestWpm: Math.max(summary.wpm, prev ? prev.bestWpm : 0),
      bestAcc: Math.max(summary.accuracy, prev ? prev.bestAcc : 0),
      attempts: (prev ? prev.attempts : 0) + 1,
      at: Date.now()
    };
    TT.storage.write('progress', all);
    return { stars: stars, passed: stars > 0, record: all[def.id] };
  }

  function summary(lang) {
    var list = track(lang);
    var done = list.filter(function (l) { return passed(l.id); }).length;
    var stars = list.reduce(function (n, l) {
      var r = recordFor(l.id);
      return n + (r ? r.stars : 0);
    }, 0);
    return {
      total: list.length,
      done: done,
      stars: stars,
      maxStars: list.length * 3,
      pct: list.length ? (done / list.length) * 100 : 0
    };
  }

  function nextLesson(lang) {
    var list = track(lang);
    for (var i = 0; i < list.length; i++) {
      if (!passed(list[i].id)) return { def: list[i], index: i };
    }
    return null;
  }

  function find(lang, id) {
    var list = track(lang);
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id) return { def: list[i], index: i };
    }
    return null;
  }

  function starMarkup(n) {
    var out = '';
    for (var i = 1; i <= 3; i++) {
      out += '<span class="' + (i <= n ? 'earned' : '') + '">' + (i <= n ? '★' : '☆') + '</span>';
    }
    return out;
  }

  function renderList(host, progressHost, lang, onPick) {
    if (!host) return;
    var list = track(lang);
    var s = summary(lang);

    if (progressHost) {
      progressHost.innerHTML =
        '<div class="progress-bar"><div class="progress-fill" style="width:' + s.pct.toFixed(1) + '%"></div></div>' +
        '<div class="progress-text">' + s.done + ' / ' + s.total + ' passed · ' +
        s.stars + ' / ' + s.maxStars + ' stars</div>';
    }

    host.innerHTML = '';
    list.forEach(function (def, i) {
      var unlocked = isUnlocked(lang, i);
      var rec = recordFor(def.id);

      var li = document.createElement('li');
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'lesson' + (unlocked ? '' : ' is-locked');
      btn.disabled = !unlocked;

      var target = 'target ' + def.target.wpm + ' wpm · ' + def.target.acc + '%';
      var best = rec && rec.bestWpm
        ? 'best ' + Math.round(rec.bestWpm) + ' wpm · ' + Math.round(rec.bestAcc) + '%'
        : target;

      btn.innerHTML =
        '<span class="lesson-num">' + (i + 1) + '</span>' +
        '<span class="lesson-body">' +
          '<span class="lesson-title"></span>' +
          '<span class="lesson-desc"></span>' +
        '</span>' +
        '<span class="lesson-target">' + (unlocked ? best : 'locked') + '</span>' +
        '<span class="lesson-stars">' + starMarkup(rec ? rec.stars : 0) + '</span>';

      btn.querySelector('.lesson-title').textContent = def.title;
      btn.querySelector('.lesson-desc').textContent = unlocked
        ? def.desc
        : 'Pass lesson ' + i + ' to unlock.';

      if (unlocked && onPick) {
        btn.addEventListener('click', function () { onPick(def, i); });
      }

      li.appendChild(btn);
      host.appendChild(li);
    });
  }

  TT.lessons = {
    track: track,
    progress: progress,
    recordFor: recordFor,
    starsFor: starsFor,
    passed: passed,
    isUnlocked: isUnlocked,
    complete: complete,
    summary: summary,
    nextLesson: nextLesson,
    find: find,
    renderList: renderList,
    starMarkup: starMarkup
  };
})(window.TT = window.TT || {});
