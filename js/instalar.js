/* Gestoría Paredes — instalar la página como app (sin Play Store ni App Store).
 * Cualquier botón con [data-instalar] queda listo: en Android/Chrome/Brave/Edge abre la ventana de instalación;
 * en iPhone y en los navegadores que no la tienen, muestra los pasos con dibujos.
 * Si la app ya está instalada y abierta, los botones se ocultan.
 */
(function () {
  'use strict';
  var ua = navigator.userAgent || '';
  var IOS = /iPhone|iPad|iPod/.test(ua) || (navigator.maxTouchPoints > 1 && /Macintosh/.test(ua));
  var ANDROID = /Android/.test(ua);
  var MOVIL = IOS || ANDROID || /Mobile/.test(ua);
  var EDGE = /Edg\//.test(ua), FIREFOX = /Firefox\//.test(ua) && !/Seamonkey/.test(ua);
  var SAFARI_MAC = !MOVIL && /Macintosh/.test(ua) && /Safari\//.test(ua) && !/Chrome|Chromium|Edg|OPR|Firefox/.test(ua);
  var SAFARI_IOS = IOS && !/CriOS|FxiOS|EdgiOS|OPiOS|Brave/.test(ua);
  var INSTALADA = (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
  var EN = function () { return (document.documentElement.lang || '').slice(0, 2) === 'en'; };
  var aviso = null;

  if ('serviceWorker' in navigator) window.addEventListener('load', function () { navigator.serviceWorker.register('sw.js').catch(function () {}); });
  if (INSTALADA) document.documentElement.classList.add('es-app');

  window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); aviso = e; mostrar(); });
  window.addEventListener('appinstalled', function () { aviso = null; INSTALADA = true; mostrar(); cerrar(); });

  function botones() { return document.querySelectorAll('[data-instalar]'); }
  function mostrar() { botones().forEach(function (b) { b.hidden = INSTALADA; }); }

  var T = {
    es: {
      t: 'Instalar la app', listo: 'Entendido',
      ios: 'En su iPhone, desde <b>Safari</b>:', iosNoSafari: 'En iPhone la app se instala desde <b>Safari</b>. Abra esta página en Safari y siga estos pasos:',
      ios1: 'Toque el botón <b>Compartir</b>', ios2: 'Elija <b>Agregar a inicio</b>', ios3: 'Toque <b>Agregar</b>. Listo: el coyote queda en su pantalla.',
      and: 'En su Android:', and1: 'Toque el menú <b>⋮</b> del navegador (arriba o abajo a la derecha)', and2: 'Elija <b>Instalar app</b> o <b>Agregar a pantalla de inicio</b>', and3: 'Confirme. La app queda junto a sus otras aplicaciones.',
      pc: 'En su computadora (Google Chrome o Microsoft Edge, en Windows o Mac):', pc1: 'Haga clic en el ícono de <b>instalar</b> (una pantalla con flecha) al final de la barra de direcciones', pc2: 'Si no lo ve, abra el menú del navegador: en Chrome <b>⋮ → Transmitir, guardar y compartir → Instalar página como app</b>; en Edge <b>··· → Aplicaciones → Instalar este sitio como aplicación</b>', pc3: 'Listo: la app queda en el escritorio y en el menú de Inicio (o en Launchpad, en Mac), y abre en su propia ventana.',
      mac: 'En su Mac, desde Safari:', mac1: 'Abra el menú <b>Archivo</b> y elija <b>Agregar al Dock</b>', mac2: 'Confirme con <b>Agregar</b>', mac3: 'La app queda en el Dock y en Launchpad. Necesita macOS Sonoma (14) o más reciente; si no aparece la opción, use Google Chrome.',
      ff: 'Firefox no permite instalar apps.', ff1: 'Abra esta misma página en <b>Google Chrome</b> o <b>Microsoft Edge</b>', ff2: 'Toque <b>Instalar</b> otra vez y siga los pasos', copiar: 'Copiar dirección', copiado: 'Dirección copiada',
      nota: 'Es gratis, no ocupa casi espacio y no pasa por Play Store ni App Store.'
    },
    en: {
      t: 'Install the app', listo: 'Got it',
      ios: 'On your iPhone, in <b>Safari</b>:', iosNoSafari: 'On iPhone the app installs from <b>Safari</b>. Open this page in Safari and follow these steps:',
      ios1: 'Tap the <b>Share</b> button', ios2: 'Choose <b>Add to Home Screen</b>', ios3: 'Tap <b>Add</b>. Done: the coyote is on your screen.',
      and: 'On your Android:', and1: 'Tap the browser menu <b>⋮</b> (top or bottom right)', and2: 'Choose <b>Install app</b> or <b>Add to Home screen</b>', and3: 'Confirm. The app sits with your other apps.',
      pc: 'On your computer (Google Chrome or Microsoft Edge, Windows or Mac):', pc1: 'Click the <b>install</b> icon (a screen with an arrow) at the end of the address bar', pc2: 'If you do not see it, open the browser menu: in Chrome <b>⋮ → Cast, save and share → Install page as app</b>; in Edge <b>··· → Apps → Install this site as an app</b>', pc3: 'Done: the app sits on your desktop and Start menu (or Launchpad on Mac) and opens in its own window.',
      mac: 'On your Mac, in Safari:', mac1: 'Open the <b>File</b> menu and choose <b>Add to Dock</b>', mac2: 'Confirm with <b>Add</b>', mac3: 'The app sits in the Dock and Launchpad. Requires macOS Sonoma (14) or later; otherwise use Google Chrome.',
      ff: 'Firefox cannot install apps.', ff1: 'Open this same page in <b>Google Chrome</b> or <b>Microsoft Edge</b>', ff2: 'Tap <b>Install</b> again and follow the steps', copiar: 'Copy address', copiado: 'Address copied',
      nota: 'It is free, takes almost no space and skips the Play Store and App Store.'
    }
  };
  var ICO = {
    compartir: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12"/><path d="m8 7 4-4 4 4"/><path d="M6 11H5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-1"/></svg>',
    mas: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="3"/><path d="M12 8v8M8 12h8"/></svg>',
    ok: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12 4.5 4.5L19 7"/></svg>',
    menu: '<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>',
    pc: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="12" rx="2"/><path d="M12 8v5m-2.5-2.5L12 13l2.5-2.5"/><path d="M8 20h8"/></svg>'
  };

  var dlg = null, volver = null;
  function cerrar() { if (dlg) { dlg.remove(); dlg = null; document.removeEventListener('keydown', esc); if (volver && volver.focus) volver.focus(); } }
  function esc(e) { if (e.key === 'Escape') cerrar(); }
  function pasos() {
    var t = T[EN() ? 'en' : 'es'], icono = document.querySelector('link[rel="apple-touch-icon"]'), h = '', lista;
    if (IOS) { h = '<p class="ins-p">' + (SAFARI_IOS ? t.ios : t.iosNoSafari) + '</p>'; lista = [[ICO.compartir, t.ios1], [ICO.mas, t.ios2], [ICO.ok, t.ios3]]; }
    else if (MOVIL) { h = '<p class="ins-p">' + t.and + '</p>'; lista = [[ICO.menu, t.and1], [ICO.mas, t.and2], [ICO.ok, t.and3]]; }
    else if (SAFARI_MAC) { h = '<p class="ins-p">' + t.mac + '</p>'; lista = [[ICO.menu, t.mac1], [ICO.mas, t.mac2], [ICO.ok, t.mac3]]; }
    else if (FIREFOX) { h = '<p class="ins-p">' + t.ff + '</p>'; lista = [[ICO.pc, t.ff1], [ICO.mas, t.ff2]]; }
    else { h = '<p class="ins-p">' + t.pc + '</p>'; lista = [[ICO.pc, t.pc1], [ICO.menu, t.pc2], [ICO.ok, t.pc3]]; }
    h += '<ol class="ins-l">' + lista.map(function (x, i) { return '<li><span class="ins-i">' + x[0] + '</span><span><b class="ins-n">' + (i + 1) + '</b> ' + x[1] + '</span></li>'; }).join('') + '</ol>';
    volver = document.activeElement;
    dlg = document.createElement('div'); dlg.className = 'ins-fondo';
    dlg.innerHTML = '<div class="ins" role="dialog" aria-modal="true" aria-labelledby="ins-t">' +
      '<div class="ins-cab">' + (icono ? '<img src="' + icono.getAttribute('href') + '" alt="" width="56" height="56">' : '') +
      '<div><h2 id="ins-t">' + t.t + '</h2><p>' + t.nota + '</p></div></div>' + h +
      (FIREFOX ? '<button type="button" class="ins-no ins-copiar">' + t.copiar + '</button>' : '') +
      '<button type="button" class="btn btn-y ins-ok">' + t.listo + '</button></div>';
    document.body.appendChild(dlg);
    dlg.addEventListener('click', function (e) {
      var cp = e.target.closest('.ins-copiar');
      if (cp) { var u = location.href.replace(/[?&]instalar=1/, ''); (navigator.clipboard ? navigator.clipboard.writeText(u) : Promise.reject()).then(function () { cp.textContent = t.copiado; }).catch(function () { cp.textContent = u; }); return; }
      if (e.target === dlg || e.target.closest('.ins-ok')) cerrar();
    });
    document.addEventListener('keydown', esc);
    dlg.querySelector('.ins-ok').focus();
  }

  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-instalar]'); if (!b) return;
    e.preventDefault();
    if (dlg && dlg.contains(b)) cerrar();
    if (aviso) {
      var a = aviso; aviso = null;
      a.prompt(); a.userChoice.catch(function () {});
    } else pasos();
  });

  // Llegó desde «Apps» del panel (…?instalar=1): se ofrece instalar esta app con un solo toque.
  function ofrecer() {
    if (INSTALADA || !/[?&]instalar=1/.test(location.search)) return;
    try { history.replaceState(null, '', location.pathname + location.search.replace(/[?&]instalar=1/, '').replace(/^&/, '?') + location.hash); } catch (e) {}
    var t = T[EN() ? 'en' : 'es'], nom = (document.querySelector('meta[name="apple-mobile-web-app-title"]') || {}).content || 'Paredes';
    var icono = document.querySelector('link[rel="apple-touch-icon"]');
    volver = document.activeElement;
    dlg = document.createElement('div'); dlg.className = 'ins-fondo';
    dlg.innerHTML = '<div class="ins" role="dialog" aria-modal="true" aria-labelledby="ins-t">' +
      '<div class="ins-cab">' + (icono ? '<img src="' + icono.getAttribute('href') + '" alt="" width="56" height="56">' : '') +
      '<div><h2 id="ins-t">' + (EN() ? 'Install «' : 'Instalar «') + nom + '»</h2><p>' + t.nota + '</p></div></div>' +
      '<button type="button" class="btn btn-y ins-ok" data-instalar>' + (EN() ? 'Install now' : 'Instalar ahora') + '</button>' +
      '<button type="button" class="ins-no">' + (EN() ? 'Not now' : 'Ahora no') + '</button></div>';
    document.body.appendChild(dlg);
    dlg.addEventListener('click', function (e) { if (e.target === dlg || e.target.closest('.ins-no')) cerrar(); });
    document.addEventListener('keydown', esc);
    dlg.querySelector('.ins-ok').focus();
  }
  function iniciar() { mostrar(); ofrecer(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
})();
