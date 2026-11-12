/* Gestoría Paredes — WhatsApp por turnos
 * Reparte a cada cliente nuevo entre los números de NUMEROS, uno y uno.
 * Un cliente que ya escribió (mismo dispositivo o mismo teléfono en el formulario)
 * vuelve siempre al mismo número.
 * Los números y la dirección del servidor están en js/config.js.
 * Si la dirección está vacía o no responde, el cliente nuevo se asigna 50/50 y queda fijo en su número.
 */
(function () {
  var CFG = window.GP_CONFIG || {};
  var NUMEROS = CFG.numeros || ['529841297165', '529842021770'];
  var ENDPOINT = CFG.endpoint || '';

  var K_AG = 'gp-wa-numero', K_DEV = 'gp-wa-dispositivo';
  var ls = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  };
  function idx(n) { var i = NUMEROS.indexOf(String(n)); return i; }

  var dev = ls.get(K_DEV);
  if (!dev) { dev = Date.now().toString(36) + Math.random().toString(36).slice(2, 10); ls.set(K_DEV, dev); }

  var fijo = idx(ls.get(K_AG));          // número ya asignado a este dispositivo (-1 si ninguno)
  var siguiente = Math.random() < 0.5 ? 0 : 1; // respaldo si no hay servidor
  var porTel = {};                        // teléfono → índice, conocido por el servidor

  function q(o) { return Object.keys(o).map(function (k) { return k + '=' + encodeURIComponent(o[k] == null ? '' : o[k]); }).join('&'); }
  function get(params, cb) {
    if (!ENDPOINT || !window.fetch) return cb && cb(null);
    var done = false, timer = setTimeout(function () { if (!done) { done = true; cb && cb(null); } }, 4000);
    fetch(ENDPOINT + '?' + q(params), { method: 'GET', redirect: 'follow' })
      .then(function (r) { return r.json(); })
      .then(function (j) { if (!done) { done = true; clearTimeout(timer); cb && cb(j); } })
      .catch(function () { if (!done) { done = true; clearTimeout(timer); cb && cb(null); } });
  }
  function enviar(params) {
    if (!ENDPOINT || !window.fetch) return;
    try { fetch(ENDPOINT + '?' + q(params), { method: 'GET', mode: 'no-cors', keepalive: true }); } catch (e) {}
  }

  // Al cargar: si este dispositivo aún no tiene número, preguntar de quién es el turno.
  if (fijo < 0) get({ a: 'turno', d: dev }, function (j) { if (j && (j.n === 0 || j.n === 1)) siguiente = j.n; });

  function tel10(t) { return String(t || '').replace(/\D/g, '').slice(-10); }

  // Para el formulario: consultar si ese teléfono ya fue atendido antes.
  function consultarTelefono(t) {
    t = tel10(t); if (t.length !== 10 || t in porTel) return;
    porTel[t] = -1;
    get({ a: 'turno', d: dev, t: t }, function (j) { if (j && j.fijo && (j.n === 0 || j.n === 1)) porTel[t] = j.n; });
  }

  // Elige el número para este contacto y lo registra.
  function asignar(datos) {
    datos = datos || {};
    var t = tel10(datos.telefono), i, nuevo = false;
    if (t && porTel[t] >= 0) i = porTel[t];
    else if (fijo >= 0) i = fijo;
    else { i = siguiente; nuevo = true; }
    var registrar = nuevo || !!t;
    fijo = i; ls.set(K_AG, NUMEROS[i]);
    if (t) porTel[t] = i;
    if (registrar) enviar({ a: 'registro', d: dev, ag: i, nuevo: nuevo ? 1 : 0, t: t, n: (datos.nombre || '').slice(0, 80), tr: (datos.tramite || '').slice(0, 80), o: datos.origen || location.pathname });
    return NUMEROS[i];
  }

  var IS_MOBILE = /Android|iPhone|iPad|iPod|Mobile|Opera Mini|IEMobile/i.test(navigator.userAgent) ||
    (navigator.maxTouchPoints > 1 && /Macintosh/.test(navigator.userAgent));
  function waText(href) { var m = /[?&]text=([^&]*)/.exec(href || ''); return m ? m[1] : ''; }

  // Abre el chat: app en celular, WhatsApp Web en computadora.
  function abrir(href, datos) {
    var num = asignar(datos), t = waText(href);
    var webUrl = 'https://wa.me/' + num + (t ? '?text=' + t : '');
    if (IS_MOBILE) {
      var fallback = setTimeout(function () { if (!document.hidden) window.location.href = webUrl; }, 1600);
      document.addEventListener('visibilitychange', function onHide() { if (document.hidden) { clearTimeout(fallback); document.removeEventListener('visibilitychange', onHide); } });
      window.location.href = 'whatsapp://send?phone=' + num + (t ? '&text=' + t : '');
    } else {
      var desk = 'https://web.whatsapp.com/send?phone=' + num + (t ? '&text=' + t : '');
      var w = null; try { w = window.open(desk, '_blank'); if (w) w.opener = null; } catch (e) {}
      if (!w) window.location.href = desk;
    }
    return num;
  }

  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href^="https://wa.me/"]');
    if (!a || a.hasAttribute('data-wa-fijo') || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
    e.preventDefault(); abrir(a.getAttribute('href'), { origen: (a.id || a.className || 'enlace') + ' ' + location.pathname });
  });

  // Abre el chat con un número ya decidido por el servidor (p. ej. al subir documentos).
  function abrirCon(numero, texto) {
    var i = idx(numero); if (i >= 0) { fijo = i; ls.set(K_AG, NUMEROS[i]); }
    var href = 'https://wa.me/' + numero + (texto ? '?text=' + encodeURIComponent(texto) : '');
    var t = waText(href);
    if (IS_MOBILE) {
      var fallback = setTimeout(function () { if (!document.hidden) window.location.href = href; }, 1600);
      document.addEventListener('visibilitychange', function onHide() { if (document.hidden) { clearTimeout(fallback); document.removeEventListener('visibilitychange', onHide); } });
      window.location.href = 'whatsapp://send?phone=' + numero + (t ? '&text=' + t : '');
    } else {
      var desk = 'https://web.whatsapp.com/send?phone=' + numero + (t ? '&text=' + t : '');
      var w = null; try { w = window.open(desk, '_blank'); if (w) w.opener = null; } catch (e) {}
      if (!w) window.location.href = desk;
    }
  }

  window.GPWA = { abrir: abrir, abrirCon: abrirCon, consultarTelefono: consultarTelefono, numeros: NUMEROS, dispositivo: dev, asignado: function () { return fijo >= 0 ? NUMEROS[fijo] : ''; } };
})();
