/* Gestoría Paredes — service worker: hace la página instalable y la abre al instante.
 * Páginas: primero la red (para ver siempre lo último); sin conexión, la copia guardada.
 * Archivos (css, js, imágenes): se muestran de la copia y se actualizan en segundo plano.
 * Nunca guarda nada del servidor de Google (expedientes, inicio de sesión, documentos).
 */
var VERSION = 'gp-20261119';
var BASE = ['./', 'index.html', 'admin.html', 'documentos.html', 'offline.html', 'manifest.webmanifest', 'admin.webmanifest',
  'img/icon-192.png', 'img/admin-192.png', 'img/coyote-blanco.png'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(VERSION).then(function (c) { return c.addAll(BASE); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k !== VERSION; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

function aCache(req, res) { if (res && res.ok && res.type === 'basic') { var copia = res.clone(); caches.open(VERSION).then(function (c) { c.put(req, copia); }); } return res; }

self.addEventListener('fetch', function (e) {
  var req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return; // Google, WhatsApp, fuentes: directo a la red
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then(function (r) { return aCache(new Request(url.pathname), r); }).catch(function () {
      return caches.match(url.pathname, { ignoreSearch: true }).then(function (r) { return r || caches.match('offline.html'); });
    }));
    return;
  }
  e.respondWith(caches.match(req).then(function (guardado) {
    var red = fetch(req).then(function (r) { return aCache(req, r); }).catch(function () { return guardado; });
    return guardado || red;
  }));
});
