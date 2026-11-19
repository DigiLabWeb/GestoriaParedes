/* Registro de Socios — service worker
   Permite instalar la app y abrirla rápido. Los datos de socios SIEMPRE
   se piden en línea a Google (nunca se guardan aquí). */
const VERSION = 'socios-v5';
const BASICOS = ['./', './index.html', './logo.png', './favicon.ico', './favicon-32.png',
  './apple-touch-icon.png', './icon-192.png', './icon-512.png', './icon-maskable-512.png', './manifest.webmanifest'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(BASICOS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;   // Google (datos) y fuentes: directo a internet

  // La página: primero internet (para recibir actualizaciones); si no hay señal, la copia guardada
  if (req.mode === 'navigate' || url.pathname.endsWith('/index.html') || url.pathname.endsWith('/')) {
    e.respondWith(fetch(req).then(r => {
      const copia = r.clone(); caches.open(VERSION).then(c => c.put('./index.html', copia)); return r;
    }).catch(() => caches.match('./index.html')));
    return;
  }
  // Imágenes e íconos: copia guardada primero
  e.respondWith(caches.match(req).then(r => r || fetch(req)));
});
