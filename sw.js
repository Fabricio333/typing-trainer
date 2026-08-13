/* Offline support. The whole app is static and self-contained, so the service
 * worker precaches every file on first visit and afterwards serves
 * network-first with a cache fallback: online loads always run one consistent
 * deploy, and only an actual failure to fetch reaches into the cache.
 *
 * Cache-first was deliberately rejected: refreshing files independently in the
 * background lets a single page load mix two deploys — an old index.html with
 * a new script — which is exactly the kind of breakage (a missing module
 * throwing at the end of a test) that is impossible to reproduce locally.
 *
 * All paths are relative so the same worker serves a project page
 * (username.github.io/typing-trainer/) and a local server root alike. */
'use strict';

var CACHE = 'typing-trainer-v9';

var ASSETS = [
  './',
  'index.html',
  'type/',
  'type/index.html',
  'manifest.webmanifest',
  'icon.svg',
  'css/themes.css',
  'css/style.css?v=9',
  'css/keyboard.css',
  'css/landing.css',
  'js/landing.js',
  'js/data/words.en.js',
  'js/data/words.es.js',
  'js/data/quotes.en.js',
  'js/data/quotes.es.js',
  'js/data/patterns.js',
  'js/data/layouts.js',
  'js/data/lessons.js',
  'js/core/storage.js?v=9',
  'js/core/generator.js',
  'js/core/engine.js',
  'js/core/stats.js',
  'js/core/wordstats.js',
  'js/core/keyspeed.js',
  'js/ui/chart.js',
  'js/ui/render.js',
  'js/ui/keyboard.js',
  'js/ui/sound.js',
  'js/ui/results.js?v=9',
  'js/ui/settings.js',
  'js/ui/i18n.js?v=9',
  'js/ui/lessons.js',
  'js/ui/statsview.js',
  'js/ui/router.js',
  'js/app.js?v=9'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE)
      .then(function (cache) { return cache.addAll(ASSETS); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        return k === CACHE ? null : caches.delete(k);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  var url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return;

  e.respondWith(
    caches.open(CACHE).then(function (cache) {
      return fetch(e.request).then(function (res) {
        if (res && res.ok) cache.put(e.request, res.clone());
        return res;
      }).catch(function () {
        return cache.match(e.request, { ignoreSearch: true }).then(function (cached) {
          if (cached) return cached;
          // A navigation can still fall back to a shell: the trainer for
          // anything under /type/ (it handles its own routing by hash), the
          // landing page for everything else.
          if (e.request.mode === 'navigate') {
            return cache.match(/\/type(\/|$)/.test(url.pathname) ? 'type/' : './');
          }
          return Promise.reject(new Error('offline and uncached: ' + url.pathname));
        });
      });
    })
  );
});
