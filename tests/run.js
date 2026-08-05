/* Headless test runner.  Usage:  node tests/run.js
 *
 * The core modules are written to attach to a TT namespace on `window` in the
 * browser or `global` in node, so they load here with no DOM and no dependencies.
 * The data files are browser-only (`window.TT`), which is why `window` is aliased
 * to `global` below rather than stubbed as a bare object. */
'use strict';

const path = require('path');

global.window = global;

const ROOT = path.join(__dirname, '..');
[
  'js/data/words.en.js',
  'js/data/words.es.js',
  'js/data/quotes.en.js',
  'js/data/quotes.es.js',
  'js/data/patterns.js',
  'js/data/layouts.js',
  'js/data/lessons.js',
  'js/core/generator.js',
  'js/core/engine.js',
  'js/core/stats.js',
  'js/core/wordstats.js',
  'js/core/keyspeed.js'
].forEach(function (rel) {
  require(path.join(ROOT, rel));
});

/* ---------- tiny assert harness ---------- */

let passed = 0;
const failures = [];
let currentSuite = '';

global.suite = function (name) {
  currentSuite = name;
};

global.test = function (name, fn) {
  try {
    fn();
    passed++;
  } catch (err) {
    failures.push({ suite: currentSuite, name: name, message: err.message });
  }
};

function fmt(v) {
  return typeof v === 'object' ? JSON.stringify(v) : String(v);
}

global.eq = function (actual, expected, msg) {
  const a = fmt(actual);
  const e = fmt(expected);
  if (a !== e) {
    throw new Error((msg ? msg + ': ' : '') + 'expected ' + e + ', got ' + a);
  }
};

global.ok = function (value, msg) {
  if (!value) throw new Error(msg || 'expected a truthy value, got ' + fmt(value));
};

global.near = function (actual, expected, tolerance, msg) {
  if (Math.abs(actual - expected) > tolerance) {
    throw new Error(
      (msg ? msg + ': ' : '') + 'expected ~' + expected + ' (+/-' + tolerance + '), got ' + actual
    );
  }
};

/* A deterministic stand-in for Math.random so generator tests are repeatable. */
global.seeded = function (seed) {
  let s = seed || 1;
  return function () {
    s = (s * 1103515245 + 12345) % 2147483648;
    return s / 2147483648;
  };
};

/* ---------- suites ---------- */

require('./engine.test.js');
require('./stats.test.js');
require('./generator.test.js');
require('./data.test.js');
require('./wordstats.test.js');
require('./keyspeed.test.js');

/* ---------- report ---------- */

if (failures.length === 0) {
  console.log('\n  ' + passed + ' passing\n');
  process.exit(0);
}

console.log('\n  ' + passed + ' passing, ' + failures.length + ' failing\n');
failures.forEach(function (f, i) {
  console.log('  ' + (i + 1) + ') ' + f.suite + ' — ' + f.name);
  console.log('     ' + f.message + '\n');
});
process.exit(1);
