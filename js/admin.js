/* Gestoría Paredes — panel de administrador
 * Usuario y contraseña se comprueban en el servidor (Google Apps Script); aquí no se guarda ninguna contraseña.
 */
(function () {
  'use strict';
  var CFG = window.GP_CONFIG || {};
  var K = 'gp-admin-sesion';
  var COLORES = ['var(--c-dark)', 'var(--c-acc)'];
  var IS_MOBILE = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && /Macintosh/.test(navigator.userAgent));
  function $(id) { return document.getElementById(id); }

  var ses = null, datos = { expedientes: [], reparto: null }, cache = {}, abierto = null;

  function leerSesion() { try { var s = JSON.parse(sessionStorage.getItem(K) || 'null'); return s && s.vence > Date.now() ? s : null; } catch (e) { return null; } }
  function guardarSesion(s) { try { if (s) sessionStorage.setItem(K, JSON.stringify(s)); else sessionStorage.removeItem(K); } catch (e) {} }

  function api(body) {
    if (!CFG.endpoint) return Promise.reject(new Error('Falta la dirección del servidor en js/config.js.'));
    return fetch(CFG.endpoint, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(body), redirect: 'follow' })
      .then(function (r) { return r.text(); })
      .then(function (t) { try { return JSON.parse(t); } catch (e) { throw new Error('El servidor de Google no respondió como se esperaba. Revise que la implementación tenga acceso para "Cualquier usuario".'); } });
  }

  function vista(id) { ['v-login', 'v-panel', 'v-cargando'].forEach(function (v) { $(v).hidden = v !== id; }); $('adm-user').hidden = id !== 'v-panel'; }

  /* ---------- sesión ---------- */
  function mostrarLogin(msg) {
    vista('v-login');
    var e = $('login-err'); e.hidden = !msg; e.textContent = msg || '';
    setTimeout(function () { ($('l-u').value ? $('l-p') : $('l-u')).focus(); }, 30);
  }

  $('login').addEventListener('submit', function (ev) {
    ev.preventDefault();
    var u = $('l-u').value.trim(), p = $('l-p').value;
    if (!u || !p) { mostrarLogin('Escriba su usuario y su contraseña.'); return; }
    var b = $('l-btn'); b.disabled = true; b.textContent = 'Entrando…';
    api({ a: 'login', u: u, p: p }).then(function (j) {
      if (!j.ok) throw new Error(j.error || 'No se pudo entrar.');
      ses = { token: j.token, nombre: j.nombre, vence: j.vence }; guardarSesion(ses);
      $('l-p').value = '';
      cargar();
    }).catch(function (e) { mostrarLogin(e.message); $('l-p').select(); })
      .then(function () { b.disabled = false; b.textContent = 'Entrar'; });
  });

  $('l-ver').addEventListener('click', function () {
    var on = $('l-p').type === 'password'; $('l-p').type = on ? 'text' : 'password';
    this.setAttribute('aria-pressed', on ? 'true' : 'false'); this.setAttribute('aria-label', on ? 'Ocultar contraseña' : 'Mostrar contraseña');
  });

  $('adm-salir').addEventListener('click', function () {
    ses = null; guardarSesion(null); cache = {}; datos = { expedientes: [], reparto: null };
    $('t-body').textContent = ''; mostrarLogin('');
  });

  function sesionVencida(j) { if (j && j.sesion === false) { ses = null; guardarSesion(null); mostrarLogin(j.error); return true; } return false; }

  /* ---------- lista ---------- */
  function cargar(silencioso) {
    if (!silencioso) vista('v-cargando');
    return api({ a: 'lista', token: ses.token }).then(function (j) {
      if (sesionVencida(j)) return;
      if (!j.ok) throw new Error(j.error || 'No se pudo cargar la lista.');
      datos = j; $('adm-nombre').textContent = ses.nombre;
      vista('v-panel'); pintarFiltro(); pintar();
      var h = decodeURIComponent((location.hash || '').slice(1));
      if (/^GP-\d+$/.test(h) && !abierto) abrir(h);
    }).catch(function (e) {
      if (silencioso) { alert(e.message); return; }
      mostrarLogin(e.message);
    });
  }
  $('adm-recargar').addEventListener('click', function () {
    var b = this; b.disabled = true;
    cargar(true).then(function () { b.disabled = false; });
  });

  function pintarFiltro() {
    var sel = $('f-at'), cur = sel.value; sel.textContent = '';
    var et = (datos.reparto && datos.reparto.etiquetas) || [];
    [['', 'Todos los números']].concat(et.map(function (e) { return [e, 'Atiende ' + e]; })).forEach(function (p) {
      var o = document.createElement('option'); o.value = p[0]; o.textContent = p[1]; sel.appendChild(o);
    });
    sel.value = cur;
  }

  function fecha(ms) {
    var d = new Date(ms); if (isNaN(d)) return String(ms);
    var p = function (n) { return (n < 10 ? '0' : '') + n; };
    return p(d.getDate()) + '/' + p(d.getMonth() + 1) + '/' + d.getFullYear() + ' · ' + p(d.getHours()) + ':' + p(d.getMinutes());
  }
  function telFmt(t) { t = String(t || ''); return t.length === 10 ? t.slice(0, 3) + ' ' + t.slice(3, 6) + ' ' + t.slice(6) : t; }
  function norm(s) { return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase(); }
  function colorDe(etq) { var i = ((datos.reparto && datos.reparto.etiquetas) || []).indexOf(etq); return COLORES[i] || 'var(--line)'; }

  function pintar() {
    var ex = datos.expedientes || [], hoy = new Date().toDateString();
    $('s-total').textContent = ex.length;
    $('s-hoy').textContent = ex.filter(function (e) { return new Date(e.fecha).toDateString() === hoy; }).length;

    var r = datos.reparto;
    if (r) {
      var tot = r.total[0] + r.total[1];
      $('t-a').style.width = (tot ? r.total[0] / tot * 100 : 50) + '%';
      $('t-b').style.width = (tot ? r.total[1] / tot * 100 : 50) + '%';
      $('t-legend').innerHTML = '';
      r.etiquetas.forEach(function (e, i) { var s = document.createElement('span'); s.innerHTML = '<b style="background:' + COLORES[i] + '"></b>'; s.appendChild(document.createTextNode(e + ': ' + r.total[i] + (r.total[i] === 1 ? ' cliente' : ' clientes'))); $('t-legend').appendChild(s); });
      $('t-seq').innerHTML = ''; r.ultimos.forEach(function (i) { var s = document.createElement('span'); s.style.background = COLORES[i]; $('t-seq').appendChild(s); });
      $('t-next').textContent = (r.ultimos.length ? 'Últimos ' + r.ultimos.length + ' asignados, del más antiguo al más reciente. ' : 'Aún no hay clientes registrados. ') + 'El siguiente cliente nuevo va a ' + r.etiquetas[r.siguiente] + '.';
    }

    var q = norm($('f-q').value.trim()), at = $('f-at').value, qd = q.replace(/\D/g, '');
    var vis = ex.filter(function (e) {
      if (at && e.atiende !== at) return false;
      if (!q) return true;
      return norm(e.folio).indexOf(q) >= 0 || norm(e.nombre).indexOf(q) >= 0 || (qd.length >= 3 && String(e.tel).indexOf(qd) >= 0) || norm(e.tramite).indexOf(q) >= 0;
    });
    var tb = $('t-body'); tb.textContent = '';
    vis.forEach(function (e) {
      var tr = document.createElement('tr');
      var nuevo = !e.estado || e.estado === 'Nuevo';
      tr.innerHTML =
        '<td><span class="adm-folio"></span>' + (nuevo ? '<span class="adm-nuevo">NUEVO</span>' : '') + '</td>' +
        '<td><span class="adm-nombre"></span><span class="adm-sub tel"></span></td>' +
        '<td><span class="tram"></span><span class="adm-sub pags"></span></td>' +
        '<td><span class="adm-chip"><b></b><span class="at"></span></span></td>' +
        '<td><span class="fe"></span><span class="adm-sub est"></span></td>' +
        '<td><div class="adm-acts"><button type="button" class="btn btn-o" data-ver>Ver</button><button type="button" class="btn btn-y" data-desc>Descargar</button></div></td>';
      tr.querySelector('.adm-folio').textContent = e.folio;
      tr.querySelector('.adm-nombre').textContent = e.nombre;
      tr.querySelector('.tel').textContent = telFmt(e.tel);
      tr.querySelector('.tram').textContent = e.tramite;
      tr.querySelector('.pags').textContent = (e.paginas ? e.paginas + ' págs. · ' : '') + (e.kb ? (e.kb > 1024 ? (e.kb / 1024).toFixed(1) + ' MB' : e.kb + ' KB') : '');
      tr.querySelector('.adm-chip b').style.background = colorDe(e.atiende);
      tr.querySelector('.at').textContent = e.atiende;
      tr.querySelector('.fe').textContent = fecha(e.fecha);
      tr.querySelector('.est').textContent = nuevo ? '' : e.estado;
      tr.querySelector('[data-ver]').setAttribute('aria-label', 'Ver ' + e.folio);
      tr.querySelector('[data-desc]').setAttribute('aria-label', 'Descargar ' + e.folio);
      tr.querySelector('[data-ver]').addEventListener('click', function () { abrir(e.folio); });
      tr.querySelector('[data-desc]').addEventListener('click', function () { descargar(e.folio, this); });
      tb.appendChild(tr);
    });
    var vacio = $('t-empty');
    vacio.hidden = vis.length > 0;
    vacio.textContent = ex.length ? 'No hay expedientes que coincidan con la búsqueda.' : 'Todavía no llega ningún expediente. Cuando un cliente suba sus documentos aparecerá aquí.';
  }
  $('f-q').addEventListener('input', pintar);
  $('f-at').addEventListener('change', pintar);

  /* ---------- PDF ---------- */
  function obtener(folio) {
    if (cache[folio]) return Promise.resolve(cache[folio]);
    return api({ a: 'pdf', token: ses.token, folio: folio }).then(function (j) {
      if (sesionVencida(j)) throw new Error('sesion');
      if (!j.ok) throw new Error(j.error || 'No se pudo abrir el documento.');
      var bin = atob(j.b64), n = bin.length, u8 = new Uint8Array(n);
      for (var i = 0; i < n; i++) u8[i] = bin.charCodeAt(i);
      var blob = new Blob([u8], { type: 'application/pdf' });
      cache[folio] = { url: URL.createObjectURL(blob), nombre: j.archivo || (folio + '.pdf') };
      var e = (datos.expedientes || []).filter(function (x) { return x.folio === folio; })[0];
      if (e && (!e.estado || e.estado === 'Nuevo')) { e.estado = 'Visto por ' + ses.nombre; pintar(); }
      return cache[folio];
    });
  }

  function guardarArchivo(c) {
    var a = document.createElement('a'); a.href = c.url; a.download = c.nombre.replace(/[\\/:*?"<>|]+/g, '-');
    document.body.appendChild(a); a.click(); a.remove();
  }

  function descargar(folio, btn) {
    var txt = btn && btn.textContent; if (btn) { btn.disabled = true; btn.textContent = 'Preparando…'; }
    obtener(folio).then(guardarArchivo).catch(function (e) { if (e.message !== 'sesion') alert(e.message); })
      .then(function () { if (btn) { btn.disabled = false; btn.textContent = txt; } });
  }

  var ultimoFoco = null;
  function abrir(folio) {
    var e = (datos.expedientes || []).filter(function (x) { return x.folio === folio; })[0];
    abierto = folio; ultimoFoco = document.activeElement;
    $('v-folio').textContent = folio;
    $('v-det').textContent = e ? e.nombre + ' · ' + e.tramite : '';
    $('v-frame').hidden = true; $('v-frame').removeAttribute('src');
    $('v-load').hidden = false; $('v-msg').textContent = 'Abriendo documento…';
    $('visor').hidden = false; document.body.style.overflow = 'hidden'; $('v-cerrar').focus();
    if (history.replaceState) history.replaceState(null, '', '#' + folio);
    obtener(folio).then(function (c) {
      if (abierto !== folio) return;
      if (IS_MOBILE) {
        // En celular el PDF se abre con el visor del teléfono.
        $('v-msg').innerHTML = '';
        var b = document.createElement('a'); b.className = 'btn btn-y'; b.href = c.url; b.target = '_blank'; b.rel = 'noopener'; b.textContent = 'Abrir PDF';
        var p = document.createElement('p'); p.style.marginTop = '13px'; p.textContent = 'O use «Descargar» para guardarlo en el teléfono.';
        $('v-msg').appendChild(b); $('v-msg').appendChild(p);
        $('v-load').querySelector('.spin').hidden = true;
      } else {
        $('v-frame').src = c.url; $('v-frame').hidden = false; $('v-load').hidden = true;
      }
    }).catch(function (err) { if (err.message !== 'sesion') { $('v-msg').textContent = err.message; $('v-load').querySelector('.spin').hidden = true; } else cerrar(); });
  }
  function cerrar() {
    $('visor').hidden = true; document.body.style.overflow = ''; abierto = null;
    $('v-frame').removeAttribute('src'); $('v-load').querySelector('.spin').hidden = false;
    if (history.replaceState) history.replaceState(null, '', location.pathname);
    if (ultimoFoco && ultimoFoco.focus) ultimoFoco.focus();
  }
  $('v-cerrar').addEventListener('click', cerrar);
  $('v-desc').addEventListener('click', function () { if (abierto) descargar(abierto, this); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !$('visor').hidden) cerrar(); });

  /* ---------- inicio ---------- */
  ses = leerSesion();
  if (ses) cargar(); else mostrarLogin('');
})();
