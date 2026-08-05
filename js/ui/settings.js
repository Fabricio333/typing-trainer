/* Settings model, persistence and the settings view.
 *
 * Everything that changes behaviour lives here as one flat object, so exporting
 * it or reasoning about it is trivial. Subscribers are notified on every change. */
(function (TT) {
  'use strict';

  var DEFAULTS = {
    // Bumped when a default changes meaning, so load() can migrate stored
    // settings exactly once. Not shown in the settings view.
    _v: 2,

    lang: 'en',
    theme: 'carbon',

    mode: 'time',
    timeValue: 30,
    wordsValue: 25,
    quoteLength: 'medium',
    patternKind: 'mixed',
    patternAdaptive: true,
    poolSize: 200,
    drillSize: 20,

    punctuation: false,
    numbers: false,

    caret: 'line',
    fontSize: 'medium',
    blind: false,
    showKeyboard: true,
    fingerColors: true,
    keyboardLayout: 'auto',

    stopOnError: 'off',
    freeBackspace: false,
    confidenceMode: false,
    quickRestart: 'tab',
    sound: false
  };

  var THEMES = ['carbon', 'paper', 'nord', 'dracula', 'solarized', 'matrix', 'ocean', 'sepia'];
  var FONT_SIZES = { small: '1.35rem', medium: '1.75rem', large: '2.25rem', huge: '2.9rem' };

  var current = null;
  var listeners = [];

  function load() {
    var saved = TT.storage.read('settings', {});
    // v2: finger colours became mirrored and default-on. Drop the stored value
    // once so existing profiles see the new look; any choice made afterwards
    // sticks, because _v is persisted along with it.
    if ((saved._v || 1) < 2) {
      delete saved.fingerColors;
      saved._v = 2;
    }
    current = {};
    Object.keys(DEFAULTS).forEach(function (k) {
      current[k] = Object.prototype.hasOwnProperty.call(saved, k) ? saved[k] : DEFAULTS[k];
    });
    return current;
  }

  function all() {
    if (!current) load();
    return current;
  }

  function get(key) { return all()[key]; }

  function set(key, value) {
    var s = all();
    if (s[key] === value) return;
    s[key] = value;
    TT.storage.write('settings', s);
    apply();
    listeners.forEach(function (fn) { fn(key, value, s); });
  }

  function onChange(fn) { listeners.push(fn); }

  /* Pushes the presentation-affecting settings onto the document. */
  function apply() {
    var s = all();
    var root = document.documentElement;
    root.setAttribute('data-theme', s.theme);
    root.setAttribute('data-caret', s.caret);
    root.style.setProperty('--type-size', FONT_SIZES[s.fontSize] || FONT_SIZES.medium);
    document.body.classList.toggle('blind', !!s.blind);
    if (TT.sound) TT.sound.setEnabled(s.sound);
  }

  function cycleTheme() {
    var i = THEMES.indexOf(get('theme'));
    set('theme', THEMES[(i + 1) % THEMES.length]);
    return get('theme');
  }

  /* Options the engine cares about, in the shape engine.create expects. */
  function engineOpts() {
    var s = all();
    return {
      freeBackspace: s.freeBackspace,
      confidenceMode: s.confidenceMode,
      stopOnError: s.stopOnError
    };
  }

  /* ── the settings view ─────────────────────────────────────────── */

  var SCHEMA = [
    {
      key: 'lang', name: 'Language', desc: 'Word lists, quotes, lessons and keyboard layout.',
      options: [['en', 'English'], ['es', 'Español']]
    },
    {
      key: 'theme', name: 'Theme', desc: 'Colour palette.',
      options: THEMES.map(function (t) { return [t, t]; })
    },
    {
      key: 'fontSize', name: 'Text size', desc: 'How large the words are while typing.',
      options: [['small', 'small'], ['medium', 'medium'], ['large', 'large'], ['huge', 'huge']]
    },
    {
      key: 'caret', name: 'Caret', desc: 'Shape of the cursor that follows your typing.',
      options: [['line', 'line'], ['block', 'block'], ['underline', 'underline'], ['off', 'off']]
    },
    {
      key: 'stopOnError', name: 'Stop on error', desc:
        'Refuse to move past a mistake. "letter" is strict practice; "off" lets you keep going.',
      options: [['off', 'off'], ['letter', 'letter'], ['word', 'word']]
    },
    {
      key: 'freeBackspace', name: 'Free backspace', desc:
        'Normally you can only go back to a word you got wrong. This lets you go back to any word.',
      options: [[false, 'off'], [true, 'on']]
    },
    {
      key: 'confidenceMode', name: 'Confidence mode', desc:
        'Disables backspace entirely. Forces you to commit to every keystroke.',
      options: [[false, 'off'], [true, 'on']]
    },
    {
      key: 'blind', name: 'Blind mode', desc:
        'Hides right/wrong colouring while typing. You only see the result at the end.',
      options: [[false, 'off'], [true, 'on']]
    },
    {
      key: 'quickRestart', name: 'Quick restart', desc: 'Which key restarts the test instantly.',
      options: [['tab', 'tab'], ['esc', 'esc'], ['off', 'off']]
    },
    {
      key: 'showKeyboard', name: 'On-screen keyboard', desc: 'Shows the next key to press.',
      options: [[true, 'on'], [false, 'off']]
    },
    {
      key: 'keyboardLayout', name: 'Keyboard layout',
      desc: 'The distribution the on-screen keyboard and key hints follow. Auto matches the language.',
      options: [['auto', 'auto'], ['ansi', 'US qwerty'], ['latam', 'latam'],
                ['es', 'spanish iso'], ['uk', 'UK iso']]
    },
    {
      key: 'fingerColors', name: 'Finger colours',
      desc: 'Colour-codes each key by the finger that presses it — mirrored, so both hands share the same colours.',
      options: [[true, 'on'], [false, 'off']]
    },
    {
      key: 'sound', name: 'Keypress sound', desc: 'A short synthesised click on each key.',
      options: [[false, 'off'], [true, 'on']]
    },
    {
      key: 'poolSize', name: 'Word difficulty', desc:
        'How deep into the frequency list the word tests draw from.',
      options: [[100, 'top 100'], [200, 'top 200'], [500, 'top 500'], [0, 'everything']]
    },
    {
      key: 'patternAdaptive', name: 'Adaptive patterns', desc:
        'Weights the pattern drill towards the keys you actually miss.',
      options: [[true, 'on'], [false, 'off']]
    }
  ];

  function renderView(host) {
    if (!host) return;
    var s = all();
    host.innerHTML = '';

    SCHEMA.forEach(function (item) {
      var card = document.createElement('div');
      card.className = 'setting';

      var head = document.createElement('div');
      head.className = 'setting-head';
      head.innerHTML = '<div class="setting-name"></div><div class="setting-desc"></div>';
      head.querySelector('.setting-name').textContent = item.name;
      head.querySelector('.setting-desc').textContent = item.desc;
      card.appendChild(head);

      var opts = document.createElement('div');
      opts.className = 'setting-options';

      item.options.forEach(function (pair) {
        var value = pair[0];
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'seg';
        btn.textContent = pair[1];
        btn.setAttribute('aria-pressed', String(s[item.key] === value));
        if (s[item.key] === value) btn.classList.add('is-on');
        btn.addEventListener('click', function () {
          set(item.key, value);
          renderView(host);
        });
        opts.appendChild(btn);
      });

      card.appendChild(opts);
      host.appendChild(card);
    });
  }

  TT.settings = {
    DEFAULTS: DEFAULTS,
    THEMES: THEMES,
    load: load,
    all: all,
    get: get,
    set: set,
    onChange: onChange,
    apply: apply,
    cycleTheme: cycleTheme,
    engineOpts: engineOpts,
    renderView: renderView
  };
})(window.TT = window.TT || {});
