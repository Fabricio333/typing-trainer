/* Hash router. Views are all present in the document; only visibility changes.
 *
 * Hash routing (rather than the History API) is deliberate: it works identically
 * on a GitHub Pages project subpath and from a file:// URL, with no server
 * rewrite rules. */
(function (TT) {
  'use strict';

  var routes = {};
  var current = null;
  var fallback = 'test';

  function register(name, handlers) {
    routes[name] = handlers || {};
  }

  function parse() {
    var raw = (window.location.hash || '').replace(/^#\/?/, '');
    var parts = raw.split('/').filter(Boolean);
    return { name: parts[0] || fallback, params: parts.slice(1) };
  }

  function show(name, params) {
    var views = document.querySelectorAll('[data-view]');
    Array.prototype.forEach.call(views, function (v) {
      v.classList.toggle('is-active', v.dataset.view === name);
    });

    var links = document.querySelectorAll('[data-nav]');
    Array.prototype.forEach.call(links, function (a) {
      a.classList.toggle('is-active', a.dataset.nav === name);
    });

    if (current && routes[current] && routes[current].leave) routes[current].leave();
    current = name;
    if (routes[name] && routes[name].enter) routes[name].enter(params || []);
  }

  function handle() {
    var r = parse();
    if (!routes[r.name] && !document.querySelector('[data-view="' + r.name + '"]')) {
      r = { name: fallback, params: [] };
    }
    show(r.name, r.params);
  }

  function go(path) {
    var target = '#/' + String(path).replace(/^#?\/?/, '');
    if (window.location.hash === target) handle();
    else window.location.hash = target;
  }

  function start() {
    window.addEventListener('hashchange', handle);
    handle();
  }

  function currentName() { return current; }

  TT.router = {
    register: register,
    start: start,
    go: go,
    show: show,
    current: currentName
  };
})(window.TT = window.TT || {});
