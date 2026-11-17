/* Gestoría Paredes — «Editar página» en el panel de administrador.
 * Pensado para usarse sin explicación: se escribe directo sobre una copia de lo que ve el cliente,
 * Enter agrega otro documento, se arrastra para ordenar y todo se puede deshacer.
 * Al publicar, el servidor traduce al inglés (salvo lo que se corrigió a mano) y guarda la versión en el historial.
 */
(function () {
  'use strict';
  var CFG = window.GP_CONFIG || {};
  var A = function () { return window.GPAdmin; };
  var KB = 'gp-editor-borrador';
  function $(id) { return document.getElementById(id); }
  function el(tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }
  function copia(o) { return JSON.parse(JSON.stringify(o)); }
  function dos(n) { return n < 10 ? '0' + n : '' + n; }

  var TEXTOS = [
    ['Portada', 'Lo primero que se ve al abrir la página.', [['topbar', 'Franja de arriba'], ['h1a', 'Título · línea 1'], ['h1b', 'Título · línea 2'], ['h1c', 'Título · línea 3 (va en amarillo)'], ['lead', 'Texto bajo el título', 1], ['ctaNote', 'Nota junto al botón']]],
    ['Tarjetas de servicios', 'Las tarjetas de la portada que llevan a los requisitos.', [['s1', 'Tarjeta 1 · nombre'], ['s1sub', 'Tarjeta 1 · detalle'], ['s2', 'Tarjeta 2 · nombre'], ['s2sub', 'Tarjeta 2 · detalle'], ['s3', 'Tarjeta 3 · nombre'], ['s3sub', 'Tarjeta 3 · detalle'], ['s4', 'Tarjeta 4 · nombre'], ['s4sub', 'Tarjeta 4 · detalle'], ['band1', 'Franja amarilla', 1], ['band1Cta', 'Botón de la franja amarilla']]],
    ['Requisitos', 'El encabezado de la lista de documentos.', [['reqTitle', 'Título'], ['reqLead', 'Texto de introducción', 1], ['sendList', 'Botón para enviar la lista']]],
    ['Cómo funciona', 'Los pasos del proceso.', [['procTitle', 'Título'], ['procLead', 'Introducción', 1], ['p1t', 'Paso 1'], ['p1d', 'Paso 1 · explicación', 1], ['p2t', 'Paso 2'], ['p2d', 'Paso 2 · explicación', 1], ['p3t', 'Paso 3'], ['p3d', 'Paso 3 · explicación', 1], ['p4t', 'Paso 4'], ['p4d', 'Paso 4 · explicación', 1]]],
    ['Contacto', 'La sección final con el formulario.', [['contTitle', 'Título'], ['contHook', 'Texto', 1], ['formTitle', 'Título del formulario'], ['formLead', 'Texto del formulario', 1]]],
    ['Botones y pie de página', 'Botones que se repiten en toda la página.', [['ctaWa', 'Botón principal de WhatsApp'], ['upDocs', 'Botón para subir documentos'], ['legal', 'Texto legal del pie de página', 1]]]
  ];

  var c = null, original = '', sel = null, listo = false, modo = 'req', verEn = false, pila = [], busq = '';
  var recien = {}; // trámites nuevos: el nombre del botón copia el título hasta que lo cambien a mano

  /* ---------- contenido base (el que trae el sitio) ---------- */
  function base() {
    var T = window.GP_TXT || { es: {}, en: {} }, R = window.GP_REQ || {}, out = { textos: {}, req: {}, orden: (window.GP_REQ_ORDER || Object.keys(R)).slice(), ocultos: [] };
    TEXTOS.forEach(function (s) { s[2].forEach(function (f) { var k = f[0]; out.textos[k] = { es: T.es[k] || '', en: T.en[k] || '', f: T.es[k] || '' }; }); });
    Object.keys(R).forEach(function (id) { out.req[id] = desdeReq(R[id]); });
    return out;
  }
  function desdeReq(r) {
    var x = { es: copia(r.es), en: copia(r.en || {}), meta: {}, grupos: [] };
    ['label', 'titulo', 'nota'].forEach(function (k) { x.meta[k] = { f: r.es[k] || '' }; });
    (r.grupos || []).forEach(function (g) { x.grupos.push({ es: g.es || '', en: g.en || '', f: g.es || '', items: g.items.map(function (it) { return [it[0], it[1], 0, it[0]]; }) }); });
    return x;
  }
  function completar(x) { // agrega textos y trámites nuevos que el sitio tenga y la versión guardada no
    var b = base();
    x.textos = x.textos || {};
    Object.keys(b.textos).forEach(function (k) { if (!x.textos[k]) x.textos[k] = b.textos[k]; });
    x.req = x.req || b.req; x.orden = x.orden || b.orden; x.ocultos = x.ocultos || [];
    x.borrados = x.borrados || [];
    (window.GP_REQ_NUEVOS || []).forEach(function (id) { if (!x.req[id] && b.req[id] && x.borrados.indexOf(id) < 0) x.req[id] = b.req[id]; });
    x.orden = x.orden.filter(function (id) { return x.req[id]; });
    Object.keys(x.req).forEach(function (id) { if (x.orden.indexOf(id) < 0) x.orden.push(id); });
    return x;
  }

  /* ---------- cambios, deshacer y borrador ---------- */
  function plano(x) { // solo lo que el administrador ve en español, para contar cambios
    var o = {};
    Object.keys(x.textos).forEach(function (k) { o['t.' + k] = x.textos[k].es; });
    o.orden = x.orden.join(','); o.ocultos = x.ocultos.slice().sort().join(',');
    x.orden.forEach(function (id) {
      var r = x.req[id];
      ['label', 'titulo', 'nota'].forEach(function (k) { o[id + '.' + k] = r.es[k] || ''; o[id + '.' + k + '.en'] = (r.meta[k] && r.meta[k].m) ? r.en[k] : ''; });
      r.grupos.forEach(function (g, gi) {
        o[id + '.g' + gi] = g.es || ''; o[id + '.g' + gi + '.en'] = g.m ? g.en : '';
        o[id + '.g' + gi + '.docs'] = g.items.map(function (it) { return it[0] + (it[2] ? ' ⟨' + it[1] + '⟩' : ''); }).filter(Boolean);
      });
    });
    return o;
  }
  function difLista(a, b) { // documentos agregados o quitados, más 1 si solo cambió el orden
    a = a || []; b = b || [];
    var resto = a.slice(), n = 0;
    b.forEach(function (x) { var i = resto.indexOf(x); if (i >= 0) resto.splice(i, 1); else n++; });
    n += resto.length;
    if (!n && a.join('\n') !== b.join('\n')) n = 1;
    return n;
  }
  function cambios() {
    if (!c || !original) return 0;
    var a = plano(JSON.parse(original)), b = plano(c), n = 0, k;
    for (k in b) {
      if (Array.isArray(b[k]) || Array.isArray(a[k])) n += difLista(a[k], b[k]);
      else if ((a[k] || '') !== (b[k] || '')) n++;
    }
    for (k in a) if (!(k in b)) n += Array.isArray(a[k]) ? a[k].length : (a[k] ? 1 : 0);
    return n;
  }
  function sucio() { return c && JSON.stringify(c) !== original; }
  function foto() { pila.push(JSON.stringify(c)); if (pila.length > 80) pila.shift(); }
  function deshacer() {
    if (!pila.length) return;
    c = JSON.parse(pila.pop()); if (!c.req[sel]) sel = c.orden[0];
    pintar(); guardarBorrador(); aviso('Se deshizo el último cambio.');
  }
  var tBorr = null;
  function guardarBorrador() {
    clearTimeout(tBorr);
    tBorr = setTimeout(function () {
      try { if (sucio()) localStorage.setItem(KB, JSON.stringify({ base: original, c: c })); else localStorage.removeItem(KB); } catch (e) {}
    }, 300);
  }
  function cambio() { marcar(); guardarBorrador(); }

  /* ---------- barra inferior ---------- */
  function marcar() {
    var s = $('ed-estado'), n = cambios(), d = sucio();
    s.innerHTML = '';
    if (d) {
      s.className = 'ed-estado sucio';
      s.appendChild(el('b', null, n <= 1 ? '1 cambio sin publicar' : n + ' cambios sin publicar'));
      s.appendChild(el('span', null, 'Los clientes aún no lo ven.'));
    } else {
      s.className = 'ed-estado ok';
      s.appendChild(el('b', null, 'Todo está publicado'));
      s.appendChild(el('span', null, c && c.v ? 'Versión ' + c.v + (c.por ? ' · ' + c.por : '') + (c.fecha ? ' · ' + cuando(c.fecha) : '') : 'La página muestra los textos originales.'));
    }
    $('ed-guardar').hidden = !d; $('ed-previa').hidden = !d;
    $('ed-deshacer').hidden = !pila.length;
    $('ed-dock').classList.toggle('activo', d);
  }
  function cuando(f) {
    var d = new Date(f); if (isNaN(d)) return '';
    var m = Math.round((Date.now() - d) / 60000);
    if (m < 2) return 'hace un momento'; if (m < 60) return 'hace ' + m + ' min';
    if (m < 1440) return 'hace ' + Math.round(m / 60) + ' h';
    return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
  }
  window.addEventListener('beforeunload', function (e) { if (sucio()) { e.preventDefault(); e.returnValue = ''; } });

  /* ---------- aviso con botón «Deshacer» ---------- */
  var tAv = null;
  function aviso(t, conDeshacer) {
    var a = $('ed-toast');
    if (!a) { a = el('div', 'ed-toast'); a.id = 'ed-toast'; a.setAttribute('role', 'status'); document.body.appendChild(a); }
    a.innerHTML = ''; a.appendChild(el('span', null, t));
    if (conDeshacer) { var b = el('button', null, 'Deshacer'); b.type = 'button'; b.addEventListener('click', function () { a.hidden = true; deshacer(); }); a.appendChild(b); }
    a.hidden = false; clearTimeout(tAv); tAv = setTimeout(function () { a.hidden = true; }, conDeshacer ? 6000 : 3500);
  }

  /* ---------- servidor ---------- */
  function cargar() {
    $('ed-cuerpo').innerHTML = '<div class="doc-state"><div class="spin" aria-hidden="true"></div><p class="st-s">Cargando la página…</p></div>';
    return fetch(CFG.endpoint + '?a=contenido&t=' + Date.now(), { redirect: 'follow' }).then(function (r) { return r.json(); })
      .then(function (j) {
        c = completar(j && j.ok && j.c ? j.c : base()); original = JSON.stringify(c); pila = [];
        var b = null; try { b = JSON.parse(localStorage.getItem(KB) || 'null'); } catch (e) {}
        if (b && b.base === original && b.c) { c = completar(b.c); setTimeout(function () { aviso('Recuperamos los cambios que no había publicado.'); }, 300); }
        else { try { localStorage.removeItem(KB); } catch (e) {} }
        sel = sel && c.req[sel] ? sel : c.orden[0]; pintar();
      })
      .catch(function () { $('ed-cuerpo').innerHTML = '<p class="adm-alert">No se pudo cargar la página. Revise su conexión e intente de nuevo.</p>'; });
  }

  function validar() {
    var err = null;
    c.orden.forEach(function (id) {
      var r = c.req[id];
      if (!String(r.es.titulo || '').trim()) r.es.titulo = r.es.label;
      if (!String(r.es.label || '').trim()) r.es.label = r.es.titulo;
      if (!err && !String(r.es.label || '').trim()) { err = 'Hay un trámite sin nombre. Escríbale un nombre antes de publicar.'; sel = id; }
      r.grupos.forEach(function (g) { g.items = g.items.filter(function (it) { return String(it[0] || '').trim(); }); });
      r.grupos = r.grupos.filter(function (g) { return g.items.length || String(g.es || '').trim(); });
    });
    if (!err && !c.orden.filter(function (id) { return c.ocultos.indexOf(id) < 0; }).length) err = 'Debe quedar al menos un trámite visible en la página.';
    return err;
  }

  function publicar() {
    var e = validar(); if (e) { pintar(); aviso(e); return; }
    var b = $('ed-guardar'); b.disabled = true; b.textContent = 'Publicando…';
    A().api({ a: 'guardarContenido', token: A().token(), c: c }).then(function (j) {
      if (A().sesionVencida(j)) return;
      if (!j.ok) throw new Error(j.error || 'No se pudo publicar.');
      c = completar(j.c); original = JSON.stringify(c); pila = [];
      try { localStorage.setItem('gp-contenido', JSON.stringify(j.c)); localStorage.removeItem(KB); } catch (x) {}
      pintar(); aviso('¡Listo! Los cambios ya están en la página, en español e inglés.');
    }).catch(function (x) { aviso(x.message); })
      .then(function () { b.disabled = false; b.textContent = 'Publicar cambios'; marcar(); });
  }

  function vistaPrevia() {
    try { localStorage.setItem('gp-contenido-borrador', JSON.stringify(c)); } catch (x) {}
    var h = sel && modo === 'req' ? '#requisitos' : '';
    window.open('./?borrador=1' + h, '_blank');
  }

  function historial() {
    A().abrirDlg('<p class="kicker">Editar página</p><h2 id="dlg-t">Versiones anteriores</h2><p class="adm-dlg-p">Si algo salió mal, regrese a una versión anterior. Se publica al momento.</p><div id="hist-l"><div class="spin" aria-hidden="true"></div></div><div class="adm-dlg-acts"><button type="button" class="btn btn-o" data-cerrar>Cerrar</button></div>', '[data-cerrar]');
    A().api({ a: 'historialContenido', token: A().token() }).then(function (j) {
      if (A().sesionVencida(j)) return;
      var l = $('hist-l'); if (!l) return; l.innerHTML = '';
      if (!j.ok) { l.textContent = j.error || 'No se pudo cargar.'; return; }
      if (!j.versiones.length) { l.innerHTML = '<p class="adm-dlg-p">Todavía no se ha publicado ningún cambio.</p>'; return; }
      var ul = el('ul', 'ed-hist');
      j.versiones.forEach(function (v, i) {
        var li = el('li'), tx = el('div');
        tx.appendChild(el('b', null, i === 0 ? 'La que está publicada' : 'Versión ' + v.v));
        tx.appendChild(el('span', 'adm-sub', new Date(v.fecha).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' }) + ' · ' + v.por));
        li.appendChild(tx);
        if (i > 0) {
          var b = el('button', 'btn btn-o', 'Regresar a esta'); b.type = 'button';
          b.addEventListener('click', function () {
            if (sucio() && !window.confirm('Tiene cambios sin publicar que se perderán. ¿Regresar a la versión ' + v.v + '?')) return;
            b.disabled = true; b.textContent = 'Regresando…';
            A().api({ a: 'restaurarContenido', token: A().token(), fila: v.fila }).then(function (r) {
              if (!r.ok) throw new Error(r.error || 'No se pudo restaurar.');
              c = completar(r.c); original = JSON.stringify(c); pila = []; sel = c.req[sel] ? sel : c.orden[0];
              try { localStorage.setItem('gp-contenido', JSON.stringify(r.c)); localStorage.removeItem(KB); } catch (x) {}
              A().cerrarDlg(); pintar(); aviso('Listo: la página regresó a la versión ' + v.v + '.');
            }).catch(function (x) { b.disabled = false; b.textContent = 'Regresar a esta'; aviso(x.message); });
          });
          li.appendChild(b);
        }
        ul.appendChild(li);
      });
      l.appendChild(ul);
    });
  }

  /* ---------- piezas ---------- */
  var I = {
    asa: '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="9" cy="6" r="1.6"/><circle cx="15" cy="6" r="1.6"/><circle cx="9" cy="12" r="1.6"/><circle cx="15" cy="12" r="1.6"/><circle cx="9" cy="18" r="1.6"/><circle cx="15" cy="18" r="1.6"/></svg>',
    del: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M6 6l1 14h10l1-14"/></svg>',
    mas: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
    ojo: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>',
    lapiz: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>'
  };
  function ib(svg, aria, fn, cls) { var b = el('button', 'ib' + (cls ? ' ' + cls : '')); b.type = 'button'; b.innerHTML = svg; b.setAttribute('aria-label', aria); b.title = aria; if (fn) b.addEventListener('click', fn); return b; }
  function crecer(t) { t.style.height = 'auto'; t.style.height = t.scrollHeight + 'px'; }
  window.addEventListener('resize', function () { document.querySelectorAll('.ed-in').forEach(crecer); });

  // u: { es(), setEs(v), en(), setEn(v), m(), setM(v), f() }
  function uTexto(t) { return { es: function () { return t.es; }, setEs: function (v) { t.es = v; }, en: function () { return t.en; }, setEn: function (v) { t.en = v; }, m: function () { return !!t.m; }, setM: function (v) { t.m = v ? 1 : 0; }, f: function () { return t.f; } }; }
  function uCampo(r, k) { var mt = r.meta[k] = r.meta[k] || {}; return { es: function () { return r.es[k]; }, setEs: function (v) { r.es[k] = v; }, en: function () { return r.en[k]; }, setEn: function (v) { r.en[k] = v; }, m: function () { return !!mt.m; }, setM: function (v) { mt.m = v ? 1 : 0; }, f: function () { return mt.f; } }; }
  function uItem(it) { return { es: function () { return it[0]; }, setEs: function (v) { it[0] = v; }, en: function () { return it[1]; }, setEn: function (v) { it[1] = v; }, m: function () { return !!it[2]; }, setM: function (v) { it[2] = v ? 1 : 0; }, f: function () { return it[3]; } }; }

  // Texto editable en su sitio. op: { cls, ph, largo, aria, key, onEnter, onVacio, onPegar, onInput }
  function editable(u, op) {
    var w = el('div', 'ed-ew ' + (op.cls || ''));
    var t = el('textarea', 'ed-in'); t.rows = 1; t.value = u.es() || ''; t.placeholder = op.ph || ''; t.spellcheck = true;
    t.setAttribute('aria-label', op.aria || op.ph || 'Texto');
    if (op.key) t.setAttribute('data-k', op.key);
    var antes = null;
    t.addEventListener('focus', function () { antes = JSON.stringify(c); });
    t.addEventListener('input', function () {
      if (antes) { pila.push(antes); antes = null; }
      u.setEs(t.value); if (!u.m()) u.setEn('');
      crecer(t); if (enI) pintarEn(); if (op.onInput) op.onInput(t.value); cambio();
    });
    t.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey && !op.largo) { e.preventDefault(); if (op.onEnter) op.onEnter(t.selectionStart); }
      if (e.key === 'Backspace' && !t.value && op.onVacio) { e.preventDefault(); op.onVacio(); }
    });
    if (op.onPegar) t.addEventListener('paste', function (e) {
      var txt = (e.clipboardData || window.clipboardData).getData('text') || '';
      var lineas = txt.split(/\r?\n/).map(function (s) { return s.replace(/^\s*([-•*·▪●◦]|\d+[.)])\s*/, '').trim(); }).filter(Boolean);
      if (lineas.length > 1) { e.preventDefault(); op.onPegar(lineas, t); }
    });
    setTimeout(function () { crecer(t); }, 0);
    w.appendChild(t);
    // inglés (solo si el administrador lo pide)
    var enI = null, tag = null, auto = null;
    function pintarEn() {
      if (!enI) return;
      var m = u.m();
      tag.textContent = m ? 'EN · a mano' : 'EN · automático'; tag.classList.toggle('mano', m); auto.hidden = !m;
      if (!m) enI.value = (u.f && u.f() === u.es()) ? (u.en() || '') : '';
      enI.placeholder = m ? 'Escriba el texto en inglés' : 'Se traduce al publicar';
    }
    if (verEn) {
      var fila = el('div', 'ed-en'); tag = el('span', 'ed-tag'); enI = el('input', 'ed-eni'); auto = el('button', 'ed-auto', 'Volver a automático');
      enI.setAttribute('aria-label', 'Inglés'); auto.type = 'button';
      enI.value = u.m() || (u.f && u.f() === u.es()) ? (u.en() || '') : '';
      var antesEn = null;
      enI.addEventListener('focus', function () { antesEn = JSON.stringify(c); });
      enI.addEventListener('input', function () { if (antesEn) { pila.push(antesEn); antesEn = null; } u.setEn(enI.value); u.setM(!!enI.value.trim()); pintarEn(); cambio(); });
      auto.addEventListener('click', function () { foto(); u.setM(false); u.setEn(''); enI.value = ''; pintarEn(); cambio(); });
      pintarEn();
      fila.appendChild(tag); fila.appendChild(enI); fila.appendChild(auto); w.appendChild(fila);
    }
    return w;
  }

  // Arrastrar para ordenar (ratón, dedo o teclado con flechas)
  function ordenable(lista, selItem, alSoltar) {
    lista.addEventListener('pointerdown', function (e) {
      var asa = e.target.closest('.ed-asa'); if (!asa || !lista.contains(asa)) return;
      var li = asa.closest(selItem); if (!li || li.parentNode !== lista) return;
      e.preventDefault(); e.stopPropagation();
      var hermanos = function () { return Array.prototype.filter.call(lista.children, function (n) { return n.matches(selItem); }); };
      var desde = hermanos().indexOf(li);
      li.classList.add('arrastrando'); document.body.classList.add('ed-arrastre');
      function mover(ev) {
        var y = ev.clientY, hs = hermanos();
        for (var i = 0; i < hs.length; i++) {
          var h = hs[i]; if (h === li) continue;
          var r = h.getBoundingClientRect(), mid = r.top + r.height / 2, idx = hs.indexOf(li);
          if (i < idx && y < mid) { lista.insertBefore(li, h); break; }
          if (i > idx && y > mid) { lista.insertBefore(li, h.nextSibling); break; }
        }
      }
      function soltar() {
        window.removeEventListener('pointermove', mover); window.removeEventListener('pointerup', soltar); window.removeEventListener('pointercancel', soltar);
        li.classList.remove('arrastrando'); document.body.classList.remove('ed-arrastre');
        var hasta = hermanos().indexOf(li);
        if (hasta !== desde) alSoltar(desde, hasta); else pintar();
      }
      window.addEventListener('pointermove', mover); window.addEventListener('pointerup', soltar); window.addEventListener('pointercancel', soltar);
    });
    lista.addEventListener('keydown', function (e) {
      var asa = e.target.closest && e.target.closest('.ed-asa'); if (!asa || (e.key !== 'ArrowUp' && e.key !== 'ArrowDown')) return;
      var li = asa.closest(selItem), hs = Array.prototype.filter.call(lista.children, function (n) { return n.matches(selItem); });
      var i = hs.indexOf(li), j = i + (e.key === 'ArrowUp' ? -1 : 1); if (j < 0 || j >= hs.length) return;
      e.preventDefault(); alSoltar(i, j, true);
    });
  }
  function moverEn(arr, i, j) { var x = arr.splice(i, 1)[0]; arr.splice(j, 0, x); }
  function asa(aria) { var b = el('button', 'ed-asa'); b.type = 'button'; b.innerHTML = I.asa; b.setAttribute('aria-label', aria + '. Arrastre o use las flechas del teclado.'); b.title = 'Arrastre para mover'; return b; }
  function enfocar(k, fin) { setTimeout(function () { var e = document.querySelector('[data-k="' + k + '"]'); if (e) { e.focus(); var n = fin === 0 ? 0 : e.value.length; try { e.setSelectionRange(n, n); } catch (x) {} } }, 0); }

  /* ---------- pintar ---------- */
  function pintar() {
    var y = window.scrollY;
    ['req', 'txt'].forEach(function (m) { $('ed-m-' + m).setAttribute('aria-selected', m === modo ? 'true' : 'false'); });
    var cuerpo = $('ed-cuerpo'); cuerpo.innerHTML = '';
    cuerpo.appendChild(modo === 'req' ? vistaRequisitos() : vistaTextos());
    marcar();
    window.scrollTo(0, y);
  }

  function vistaRequisitos() {
    var w = el('div', 'ed-req');
    // lista de trámites
    var lado = el('aside', 'ed-lado');
    lado.appendChild(el('p', 'ed-lado-t', 'Trámites'));
    var ul = el('ul', 'ed-trams');
    c.orden.forEach(function (id, i) {
      var r = c.req[id], li = el('li', 'ed-tr' + (id === sel ? ' sel' : '') + (c.ocultos.indexOf(id) >= 0 ? ' oculto' : ''));
      li.appendChild(asa('Mover «' + (r.es.label || 'trámite') + '»'));
      var b = el('button', 'ed-tr-b'); b.type = 'button'; b.setAttribute('aria-current', id === sel ? 'true' : 'false');
      var n = r.grupos.reduce(function (s, g) { return s + g.items.filter(function (it) { return it[0]; }).length; }, 0);
      b.appendChild(el('b', null, r.es.label || 'Sin nombre'));
      b.appendChild(el('small', null, c.ocultos.indexOf(id) >= 0 ? 'Oculto · ' + n + ' documentos' : n + (n === 1 ? ' documento' : ' documentos')));
      b.addEventListener('click', function () { sel = id; pintar(); var p = document.querySelector('.ed-hoja'); if (p && window.innerWidth < 900) p.scrollIntoView({ behavior: 'smooth', block: 'start' }); });
      li.appendChild(b); ul.appendChild(li);
    });
    ordenable(ul, '.ed-tr', function (i, j, tecla) { foto(); moverEn(c.orden, i, j); pintar(); cambio(); if (tecla) setTimeout(function () { var a = document.querySelectorAll('.ed-tr .ed-asa')[j]; if (a) a.focus(); }, 0); });
    lado.appendChild(ul);
    var nuevo = el('button', 'ed-tr-n'); nuevo.type = 'button'; nuevo.innerHTML = I.mas; nuevo.appendChild(document.createTextNode('Nuevo trámite'));
    nuevo.addEventListener('click', function () {
      foto();
      var id = 't' + Date.now().toString(36);
      c.req[id] = { es: { label: '', titulo: '', nota: '' }, en: {}, meta: {}, grupos: [{ es: '', en: '', items: [['', '', 0, '']] }] };
      c.orden.push(id); recien[id] = 1; sel = id; pintar(); cambio(); enfocar('titulo');
    });
    lado.appendChild(nuevo);
    lado.appendChild(el('p', 'ed-tip', 'Arrastre ⠿ para cambiar el orden de las pestañas.'));
    w.appendChild(lado);
    if (sel && c.req[sel]) w.appendChild(hoja(sel));
    return w;
  }

  function hoja(id) {
    var r = c.req[id], visible = c.ocultos.indexOf(id) < 0;
    var h = el('section', 'ed-hoja'); h.setAttribute('aria-label', 'Requisitos de ' + (r.es.titulo || r.es.label));
    // barra de opciones del trámite
    var op = el('div', 'ed-hop');
    var sw = el('label', 'ed-sw'), cb = el('input'); cb.type = 'checkbox'; cb.checked = visible;
    cb.addEventListener('change', function () { foto(); var i = c.ocultos.indexOf(id); if (cb.checked && i >= 0) c.ocultos.splice(i, 1); if (!cb.checked && i < 0) c.ocultos.push(id); pintar(); cambio(); aviso(cb.checked ? 'El trámite se mostrará en la página.' : 'El trámite quedará oculto. No se borra: puede volver a mostrarlo.'); });
    sw.appendChild(cb); sw.appendChild(el('i')); sw.appendChild(el('span', null, visible ? 'Visible en la página' : 'Oculto en la página'));
    op.appendChild(sw);
    var swe = el('label', 'ed-sw ed-sw-en'), cbe = el('input'); cbe.type = 'checkbox'; cbe.checked = verEn;
    cbe.addEventListener('change', function () { verEn = cbe.checked; pintar(); });
    swe.appendChild(cbe); swe.appendChild(el('i')); swe.appendChild(el('span', null, 'Revisar inglés'));
    swe.title = 'El inglés se traduce solo. Actívelo solo si quiere corregir una traducción.';
    op.appendChild(swe);
    h.appendChild(op);
    if (!visible) h.appendChild(el('p', 'ed-banner', 'Este trámite está oculto: los clientes no lo ven. Active «Visible en la página» para mostrarlo.'));

    var papel = el('div', 'ed-papel');
    papel.appendChild(el('span', 'ed-kick', 'SU EXPEDIENTE'));
    papel.appendChild(editable(uCampo(r, 'titulo'), { cls: 'ed-e-tit', ph: 'Escriba el nombre del trámite', aria: 'Título del trámite', key: 'titulo',
      onInput: function (v) { if (recien[id]) { r.es.label = v; var lb = document.querySelector('[data-k="label"]'); if (lb) { lb.value = v; crecer(lb); } } actualizarLado(); },
      onEnter: function () { enfocar('g0i0'); } }));
    var corto = el('div', 'ed-corto');
    corto.appendChild(el('span', null, 'Nombre en el botón:'));
    corto.appendChild(editable(uCampo(r, 'label'), { cls: 'ed-e-lab', ph: 'Ej. Placas federales', aria: 'Nombre corto en el botón del trámite', key: 'label', onInput: function () { delete recien[id]; actualizarLado(); } }));
    papel.appendChild(corto);

    var cont = el('div', 'ed-grupos'), num = 0;
    r.grupos.forEach(function (g, gi) {
      var box = el('div', 'ed-g');
      var gh = el('div', 'ed-gh');
      if (r.grupos.length > 1) gh.appendChild(asa('Mover grupo'));
      gh.appendChild(editable(uTexto(g), { cls: 'ed-e-gt', ph: r.grupos.length > 1 ? 'Título del grupo, ej. DEL VEHÍCULO' : 'Título del grupo (opcional)', aria: 'Título del grupo ' + (gi + 1), key: 'g' + gi, onEnter: function () { enfocar('g' + gi + 'i0'); } }));
      if (r.grupos.length > 1 || g.es) gh.appendChild(ib(I.del, 'Quitar este grupo', function () {
        foto(); r.grupos.splice(gi, 1); if (!r.grupos.length) r.grupos.push({ es: '', en: '', items: [['', '', 0, '']] });
        pintar(); cambio(); aviso('Se quitó el grupo' + (g.es ? ' «' + g.es + '»' : '') + '.', true);
      }, 'ed-del'));
      box.appendChild(gh);
      var ol = el('ol', 'ed-items');
      g.items.forEach(function (it, ii) {
        num++;
        var li = el('li', 'ed-it');
        li.appendChild(asa('Mover documento'));
        li.appendChild(el('span', 'ed-n', dos(num)));
        li.appendChild(el('span', 'ed-box'));
        li.appendChild(editable(uItem(it), { cls: 'ed-e-it', ph: 'Escriba el documento', aria: 'Documento ' + num, key: 'g' + gi + 'i' + ii,
          onEnter: function (pos) {
            foto(); var resto = '';
            if (pos < it[0].length) { resto = it[0].slice(pos); it[0] = it[0].slice(0, pos).trim(); if (!it[2]) it[1] = ''; }
            g.items.splice(ii + 1, 0, [resto.trim(), '', 0, '']); pintar(); cambio(); enfocar('g' + gi + 'i' + (ii + 1), 0);
          },
          onVacio: function () {
            if (g.items.length === 1 && r.grupos.length === 1) return;
            foto(); g.items.splice(ii, 1); pintar(); cambio();
            enfocar(ii > 0 ? 'g' + gi + 'i' + (ii - 1) : (g.items.length ? 'g' + gi + 'i0' : 'g' + gi));
          },
          onPegar: function (lineas, t) {
            foto(); var actual = t.value.trim();
            if (!actual) { it[0] = lineas.shift(); it[1] = ''; }
            lineas.forEach(function (l, k) { g.items.splice(ii + 1 + k, 0, [l, '', 0, '']); });
            pintar(); cambio(); aviso('Se agregaron ' + (lineas.length + (actual ? 0 : 1)) + ' documentos.', true);
          } }));
        li.appendChild(ib(I.del, 'Quitar este documento', function () {
          foto(); g.items.splice(ii, 1); pintar(); cambio(); aviso('Se quitó «' + (it[0] || 'documento vacío') + '».', true);
        }, 'ed-del'));
        ol.appendChild(li);
      });
      ordenable(ol, '.ed-it', function (i, j, tecla) { foto(); moverEn(g.items, i, j); pintar(); cambio(); if (tecla) setTimeout(function () { var a = document.querySelectorAll('.ed-g')[gi].querySelectorAll('.ed-it .ed-asa')[j]; if (a) a.focus(); }, 0); });
      box.appendChild(ol);
      var add = el('button', 'ed-add'); add.type = 'button'; add.innerHTML = I.mas; add.appendChild(document.createTextNode('Agregar documento'));
      add.addEventListener('click', function () {
        var vacio = g.items.length && !g.items[g.items.length - 1][0];
        if (vacio) { enfocar('g' + gi + 'i' + (g.items.length - 1)); return; }
        foto(); g.items.push(['', '', 0, '']); pintar(); cambio(); enfocar('g' + gi + 'i' + (g.items.length - 1));
      });
      box.appendChild(add);
      cont.appendChild(box);
    });
    ordenable(cont, '.ed-g', function (i, j) { foto(); moverEn(r.grupos, i, j); pintar(); cambio(); });
    papel.appendChild(cont);
    var addg = el('button', 'ed-addg'); addg.type = 'button'; addg.innerHTML = I.mas;
    addg.appendChild(document.createTextNode(r.grupos.length > 1 || r.grupos[0].es ? 'Agregar otro grupo' : 'Dividir en grupos (ej. «Del vendedor» y «Del comprador»)'));
    addg.addEventListener('click', function () { foto(); r.grupos.push({ es: '', en: '', items: [['', '', 0, '']] }); pintar(); cambio(); enfocar('g' + (r.grupos.length - 1)); });
    papel.appendChild(addg);

    var nota = el('div', 'ed-nota');
    nota.appendChild(el('span', 'ed-nota-t', 'Nota al final (opcional)'));
    nota.appendChild(editable(uCampo(r, 'nota'), { cls: 'ed-e-nota', ph: 'Ej. Cada caso puede requerir documentos adicionales; se los confirmamos al iniciar.', aria: 'Nota al final de la lista', largo: 1 }));
    papel.appendChild(nota);
    h.appendChild(papel);

    var pie = el('div', 'ed-hpie');
    pie.appendChild(el('p', 'ed-tip', 'Consejos: Enter agrega otro documento · pegue una lista y se separa sola · borre con la papelera y podrá deshacer.'));
    var bdel = el('button', 'ed-lnk ed-lnk-del', 'Eliminar este trámite'); bdel.type = 'button';
    bdel.addEventListener('click', function () {
      if (!window.confirm('¿Eliminar «' + (r.es.titulo || r.es.label || 'este trámite') + '» y todos sus documentos?\n\nSi solo quiere quitarlo un tiempo, mejor use «Oculto en la página».')) return;
      foto(); var pos = c.orden.indexOf(id);
      delete c.req[id]; c.orden.splice(pos, 1); c.borrados = c.borrados || []; if (c.borrados.indexOf(id) < 0) c.borrados.push(id);
      var oi = c.ocultos.indexOf(id); if (oi >= 0) c.ocultos.splice(oi, 1);
      sel = c.orden[Math.max(0, pos - 1)]; pintar(); cambio(); aviso('Se eliminó el trámite.', true);
    });
    pie.appendChild(bdel);
    h.appendChild(pie);
    return h;
  }
  function actualizarLado() {
    var r = c.req[sel], b = document.querySelector('.ed-tr.sel b'); if (b && r) b.textContent = r.es.label || r.es.titulo || 'Sin nombre';
  }

  function vistaTextos() {
    var w = el('div', 'ed-txt');
    var bus = el('div', 'ed-bus');
    bus.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>';
    var q = el('input', 'ed-bus-i'); q.type = 'search'; q.placeholder = 'Buscar un texto, ej. «WhatsApp» o «pasos»'; q.value = busq; q.setAttribute('aria-label', 'Buscar un texto de la página');
    bus.appendChild(q); w.appendChild(bus);
    var nada = el('p', 'ed-nada', 'No encontramos ese texto. Pruebe con otra palabra.'); nada.hidden = true;
    var swe = el('label', 'ed-sw ed-sw-en'), cbe = el('input'); cbe.type = 'checkbox'; cbe.checked = verEn;
    cbe.addEventListener('change', function () { verEn = cbe.checked; pintar(); });
    swe.appendChild(cbe); swe.appendChild(el('i')); swe.appendChild(el('span', null, 'Revisar inglés'));
    w.appendChild(swe);
    var secs = [];
    TEXTOS.forEach(function (grp) {
      var s = el('section', 'ed-ts');
      s.appendChild(el('h3', null, grp[0])); s.appendChild(el('p', 'ed-ts-d', grp[1]));
      var campos = [];
      grp[2].forEach(function (f) {
        var t = c.textos[f[0]]; if (!t) return;
        var fl = el('div', 'ed-tf'); fl.appendChild(el('label', null, f[1]));
        var ed = editable(uTexto(t), { cls: 'ed-e-tx', ph: 'Escriba el texto', aria: grp[0] + ': ' + f[1], largo: f[2] });
        fl.appendChild(ed); s.appendChild(fl); campos.push({ n: fl, q: (grp[0] + ' ' + f[1]).toLowerCase(), t: t });
      });
      w.appendChild(s); secs.push({ s: s, campos: campos });
    });
    w.appendChild(nada);
    function filtrar() {
      busq = q.value; var z = q.value.trim().toLowerCase(), hay = 0;
      secs.forEach(function (x) {
        var vis = 0;
        x.campos.forEach(function (f) { var ok = !z || f.q.indexOf(z) >= 0 || String(f.t.es || '').toLowerCase().indexOf(z) >= 0; f.n.hidden = !ok; if (ok) vis++; });
        x.s.hidden = !vis; hay += vis;
      });
      nada.hidden = !!hay; setTimeout(function () { document.querySelectorAll('.ed-in').forEach(crecer); }, 0);
    }
    q.addEventListener('input', filtrar); filtrar();
    return w;
  }

  /* ---------- pestañas del panel ---------- */
  function pestana(cual) {
    $('sec-exp').hidden = cual !== 'exp'; $('sec-edit').hidden = cual !== 'edit';
    $('tab-exp').setAttribute('aria-selected', cual === 'exp' ? 'true' : 'false');
    $('tab-edit').setAttribute('aria-selected', cual === 'edit' ? 'true' : 'false');
    document.body.classList.toggle('ed-on', cual === 'edit');
    if (cual === 'edit' && !listo) { listo = true; cargar(); }
  }
  $('tab-exp').addEventListener('click', function () { pestana('exp'); });
  $('tab-edit').addEventListener('click', function () { pestana('edit'); });
  $('ed-m-req').addEventListener('click', function () { modo = 'req'; if (c) pintar(); });
  $('ed-m-txt').addEventListener('click', function () { modo = 'txt'; if (c) pintar(); });
  $('ed-guardar').addEventListener('click', publicar);
  $('ed-previa').addEventListener('click', vistaPrevia);
  $('ed-hist').addEventListener('click', historial);
  $('ed-deshacer').addEventListener('click', deshacer);
  document.addEventListener('keydown', function (e) {
    if ($('sec-edit').hidden) return;
    var dentro = e.target && (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT');
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey && !dentro && pila.length) { e.preventDefault(); deshacer(); }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); if (sucio()) publicar(); }
  });
})();
