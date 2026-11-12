/* Gestoría Paredes — subir documentos y unirlos en un solo PDF (todo ocurre en el navegador del cliente) */
(function () {
  'use strict';
  var CFG = window.GP_CONFIG || {};
  var REQ = window.GP_REQ || {}, ORDER = window.GP_REQ_ORDER || [];
  var MAX_ARCHIVOS = 40, MAX_MB_ARCHIVO = 40, MAX_MB_PDF = 24, LADO_MAX = 2000, CALIDAD = 0.82;
  var CARTA = [612, 792], MARGEN = 18;

  function $(id) { return document.getElementById(id); }
  var y = $('year'); if (y) y.textContent = new Date().getFullYear();

  var F = { nombre: $('d-nombre'), tel: $('d-tel'), tram: $('d-tramite'), acepto: $('d-acepto'), web: $('d-web') };
  var items = [], seq = 0, ultimo = null; // ultimo: { bytes, nombreArchivo, folio, numero, paginas }

  /* ---------- trámites y lista de requisitos ---------- */
  var o0 = document.createElement('option'); o0.value = ''; o0.textContent = 'Elija su trámite'; F.tram.appendChild(o0);
  ORDER.forEach(function (k) { var o = document.createElement('option'); o.value = k; o.textContent = REQ[k].es.titulo; F.tram.appendChild(o); });
  var oo = document.createElement('option'); oo.value = 'otro'; oo.textContent = 'Otro trámite'; F.tram.appendChild(oo);
  var pre = (location.hash || '').replace('#', ''); if (REQ[pre]) F.tram.value = pre;

  function pintarNecesita() {
    var k = F.tram.value, ul = $('need-list'); ul.textContent = '';
    if (!REQ[k]) {
      $('need-t').textContent = k === 'otro' ? 'Otro trámite' : 'Elija su trámite';
      var li = document.createElement('li'); li.className = 'muted';
      li.textContent = k === 'otro' ? 'Suba los documentos que tenga; su asesor le dirá si falta algo.' : 'Al elegir el trámite verá aquí la lista de documentos.';
      ul.appendChild(li); $('need-nota').textContent = ''; return;
    }
    $('need-t').textContent = REQ[k].es.titulo;
    REQ[k].grupos.forEach(function (g) {
      if (g.es) { var h = document.createElement('li'); h.className = 'need-g'; h.textContent = g.es; ul.appendChild(h); }
      g.items.forEach(function (p) { var li = document.createElement('li'); li.textContent = p[0]; ul.appendChild(li); });
    });
    $('need-nota').textContent = REQ[k].es.nota || '';
  }
  F.tram.addEventListener('change', function () { pintarNecesita(); validar(false); });
  // En celular la lista empieza cerrada para no empujar el formulario hacia abajo; en computadora siempre abierta.
  var det = $('need-det'), mq = window.matchMedia('(max-width: 960px)');
  function ajustarDet() { det.open = !mq.matches; }
  ajustarDet(); if (mq.addEventListener) mq.addEventListener('change', ajustarDet);
  det.addEventListener('toggle', function () { if (!mq.matches && !det.open) det.open = true; });
  pintarNecesita();

  /* ---------- archivos ---------- */
  function esPdf(f) { return f.type === 'application/pdf' || /\.pdf$/i.test(f.name); }
  function kb(n) { return n > 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB'; }

  function cargarImagen(url) {
    return new Promise(function (ok, no) { var im = new Image(); im.onload = function () { ok(im); }; im.onerror = no; im.src = url; });
  }

  function agregar(files) {
    var lista = Array.prototype.slice.call(files || []);
    lista.forEach(function (f) {
      if (items.length >= MAX_ARCHIVOS) { aviso('Puede subir hasta ' + MAX_ARCHIVOS + ' archivos.'); return; }
      if (f.size > MAX_MB_ARCHIVO * 1048576) { aviso('«' + f.name + '» pesa más de ' + MAX_MB_ARCHIVO + ' MB.'); return; }
      var it = { id: ++seq, file: f, name: f.name || 'foto.jpg', kind: esPdf(f) ? 'pdf' : 'img', rot: 0, pages: 0, estado: 'cargando' };
      items.push(it);
      if (it.kind === 'img') {
        it.url = URL.createObjectURL(f);
        cargarImagen(it.url).then(function (im) { it.w = im.naturalWidth; it.h = im.naturalHeight; it.pages = 1; it.estado = 'ok'; pintar(); })
          .catch(function () { it.estado = 'error'; it.msg = 'Este formato de imagen no se puede leer. Tómele foto desde aquí o súbalo en JPG o PDF.'; pintar(); });
      } else {
        f.arrayBuffer().then(function (buf) { it.buf = buf; return PDFLib.PDFDocument.load(buf, { ignoreEncryption: true }); })
          .then(function (doc) { it.pages = doc.getPageCount(); it.estado = 'ok'; pintar(); })
          .catch(function () { it.estado = 'error'; it.msg = 'No se pudo abrir este PDF (puede estar protegido o dañado).'; pintar(); });
      }
    });
    pintar(); validar(false);
  }

  function quitar(id) {
    items = items.filter(function (it) { if (it.id === id && it.url) URL.revokeObjectURL(it.url); return it.id !== id; });
    pintar(); validar(false);
  }
  function mover(id, d) {
    var i = items.findIndex(function (it) { return it.id === id; }), j = i + d;
    if (i < 0 || j < 0 || j >= items.length) return;
    var t = items[i]; items[i] = items[j]; items[j] = t; pintar();
    var b = document.querySelector('[data-id="' + id + '"] [data-mv="' + d + '"]'); if (b && !b.disabled) b.focus();
  }

  function boton(txt, aria, fn, extra) {
    var b = document.createElement('button'); b.type = 'button'; b.className = 'ib'; b.innerHTML = txt; b.setAttribute('aria-label', aria);
    if (extra) for (var k in extra) b.setAttribute(k, extra[k]);
    b.addEventListener('click', fn); return b;
  }
  var ICO = {
    up: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m18 15-6-6-6 6"/></svg>',
    down: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>',
    rot: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/></svg>',
    del: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M6 6l1 14h10l1-14"/></svg>'
  };

  function pintar() {
    var ol = $('lista'); ol.textContent = '';
    items.forEach(function (it, i) {
      var li = document.createElement('li'); li.className = 'doc-it' + (it.estado === 'error' ? ' bad' : ''); li.setAttribute('data-id', it.id);
      var n = document.createElement('span'); n.className = 'it-n'; n.textContent = (i < 9 ? '0' : '') + (i + 1);
      var th = document.createElement('div'); th.className = 'it-th';
      if (it.kind === 'img' && it.url && it.estado !== 'error') {
        var im = document.createElement('img'); im.src = it.url; im.alt = ''; im.style.transform = 'rotate(' + it.rot + 'deg)'; th.appendChild(im);
      } else { th.innerHTML = '<span class="pdf-tag">' + (it.kind === 'pdf' ? 'PDF' : 'IMG') + '</span>'; }
      var tx = document.createElement('div'); tx.className = 'it-tx';
      var nm = document.createElement('p'); nm.className = 'it-nm'; nm.textContent = it.name;
      var mt = document.createElement('p'); mt.className = 'it-mt';
      mt.textContent = it.estado === 'cargando' ? 'Revisando…' : it.estado === 'error' ? it.msg : (it.pages + (it.pages === 1 ? ' página' : ' páginas') + ' · ' + kb(it.file.size));
      tx.appendChild(nm); tx.appendChild(mt);
      var ac = document.createElement('div'); ac.className = 'it-ac';
      var up = boton(ICO.up, 'Subir «' + it.name + '»', function () { mover(it.id, -1); }, { 'data-mv': '-1' }); up.disabled = i === 0;
      var dn = boton(ICO.down, 'Bajar «' + it.name + '»', function () { mover(it.id, 1); }, { 'data-mv': '1' }); dn.disabled = i === items.length - 1;
      ac.appendChild(up); ac.appendChild(dn);
      if (it.kind === 'img' && it.estado === 'ok') ac.appendChild(boton(ICO.rot, 'Girar «' + it.name + '»', function () { it.rot = (it.rot + 90) % 360; pintar(); }));
      ac.appendChild(boton(ICO.del, 'Quitar «' + it.name + '»', function () { quitar(it.id); }));
      li.appendChild(n); li.appendChild(th); li.appendChild(tx); li.appendChild(ac); ol.appendChild(li);
    });
    var ok = items.filter(function (it) { return it.estado === 'ok'; });
    var pags = ok.reduce(function (s, it) { return s + it.pages; }, 0);
    var r = $('resumen'); r.hidden = !items.length;
    r.textContent = ok.length + (ok.length === 1 ? ' archivo' : ' archivos') + ' · ' + pags + (pags === 1 ? ' página en total' : ' páginas en total');
    if (intento) validar(false);
  }

  function aviso(msg) { var e = $('e-d-docs'); e.textContent = msg; e.hidden = false; clearTimeout(aviso.t); aviso.t = setTimeout(function () { validar(false); }, 5000); }

  $('in-files').addEventListener('change', function () { agregar(this.files); this.value = ''; });
  $('in-cam').addEventListener('change', function () { agregar(this.files); this.value = ''; });
  var dz = $('drop');
  ['dragenter', 'dragover'].forEach(function (ev) { dz.addEventListener(ev, function (e) { e.preventDefault(); dz.classList.add('on'); }); });
  ['dragleave', 'drop'].forEach(function (ev) { dz.addEventListener(ev, function (e) { e.preventDefault(); dz.classList.remove('on'); }); });
  dz.addEventListener('drop', function (e) { if (e.dataTransfer) agregar(e.dataTransfer.files); });

  /* ---------- validación ---------- */
  var intento = false;
  function err(id, campo, msg) {
    var e = $(id), show = !!msg && intento; e.hidden = !show; e.textContent = show ? msg : '';
    if (campo) campo.setAttribute('aria-invalid', show ? 'true' : 'false');
  }
  function validar(marcar) {
    if (marcar) intento = true;
    var e = {};
    if (F.nombre.value.trim().length < 2) e.nombre = 'Escriba su nombre completo.';
    if (F.tel.value.replace(/\D/g, '').length !== 10) e.tel = 'Escriba un teléfono de 10 dígitos.';
    if (!F.tram.value) e.tram = 'Elija el trámite.';
    var listos = items.filter(function (it) { return it.estado === 'ok'; }).length;
    if (!listos) e.docs = 'Agregue al menos un documento.';
    else if (items.some(function (it) { return it.estado === 'cargando'; })) e.docs = 'Espere a que terminen de revisarse sus archivos.';
    else if (items.some(function (it) { return it.estado === 'error'; })) e.docs = 'Quite los archivos marcados en rojo para continuar.';
    if (!F.acepto.checked) e.acepto = 'Necesitamos su aceptación para recibir sus documentos.';
    err('e-d-nombre', F.nombre, e.nombre); err('e-d-tel', F.tel, e.tel); err('e-d-tramite', F.tram, e.tram);
    err('e-d-docs', null, e.docs); err('e-d-acepto', F.acepto, e.acepto);
    return e;
  }
  [F.nombre, F.tel, F.acepto].forEach(function (c) { c.addEventListener('input', function () { validar(false); }); c.addEventListener('change', function () { validar(false); }); });

  /* ---------- construir el PDF ---------- */
  function imagenAJpg(it) {
    return cargarImagen(it.url).then(function (im) {
      var w = im.naturalWidth, h = im.naturalHeight, s = Math.min(1, LADO_MAX / Math.max(w, h));
      var dw = Math.round(w * s), dh = Math.round(h * s), giro = it.rot % 180 !== 0;
      var cv = document.createElement('canvas'); cv.width = giro ? dh : dw; cv.height = giro ? dw : dh;
      var cx = cv.getContext('2d'); cx.fillStyle = '#fff'; cx.fillRect(0, 0, cv.width, cv.height);
      cx.translate(cv.width / 2, cv.height / 2); cx.rotate(it.rot * Math.PI / 180); cx.drawImage(im, -dw / 2, -dh / 2, dw, dh);
      return new Promise(function (ok, no) {
        cv.toBlob(function (b) { if (!b) return no(new Error('canvas')); b.arrayBuffer().then(function (buf) { ok({ buf: buf, w: cv.width, h: cv.height }); }); }, 'image/jpeg', CALIDAD);
      });
    });
  }

  function construir(progreso) {
    var PDF = PDFLib, out, validos = items.filter(function (it) { return it.estado === 'ok'; });
    return PDF.PDFDocument.create().then(function (d) {
      out = d;
      out.setTitle('Expediente de ' + F.nombre.value.trim()); out.setAuthor(F.nombre.value.trim());
      out.setCreator('Gestoría Paredes'); out.setProducer('Gestoría Paredes');
      var p = Promise.resolve();
      validos.forEach(function (it, i) {
        p = p.then(function () {
          progreso(i, validos.length);
          if (it.kind === 'img') {
            return imagenAJpg(it).then(function (j) {
              return out.embedJpg(j.buf).then(function (img) {
                var hor = j.w > j.h, W = hor ? CARTA[1] : CARTA[0], H = hor ? CARTA[0] : CARTA[1];
                var s = Math.min((W - 2 * MARGEN) / j.w, (H - 2 * MARGEN) / j.h), w = j.w * s, h = j.h * s;
                out.addPage([W, H]).drawImage(img, { x: (W - w) / 2, y: (H - h) / 2, width: w, height: h });
              });
            });
          }
          return PDF.PDFDocument.load(it.buf, { ignoreEncryption: true }).then(function (src) {
            return out.copyPages(src, src.getPageIndices()).then(function (pgs) { pgs.forEach(function (pg) { out.addPage(pg); }); });
          });
        });
      });
      return p;
    }).then(function () { progreso(validos.length, validos.length); return out.save(); })
      .then(function (bytes) { return { bytes: bytes, paginas: out.getPageCount() }; });
  }

  function aBase64(bytes) {
    var s = '', CH = 0x8000;
    for (var i = 0; i < bytes.length; i += CH) s += String.fromCharCode.apply(null, bytes.subarray(i, i + CH));
    return btoa(s);
  }

  function nombreArchivo(folio) {
    var limpio = F.nombre.value.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '');
    return (folio ? folio + '-' : '') + 'Expediente-' + (limpio || 'cliente') + '.pdf';
  }

  /* ---------- pantallas ---------- */
  function ver(cual) {
    ['doc-pasos', 'doc-proceso', 'doc-ok', 'doc-falla'].forEach(function (id) { $(id).hidden = id !== cual; });
    var el = $(cual); if (cual !== 'doc-pasos') { el.focus && el.focus(); }
    $('doc-form').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  function proc(t, s, pct) { $('proc-t').textContent = t; if (s) $('proc-s').textContent = s; $('proc-bar').style.width = pct == null ? '' : pct + '%'; $('proc-bar').parentNode.classList.toggle('ind', pct == null); }

  function tramiteTexto() { var o = F.tram.options[F.tram.selectedIndex]; return o ? o.textContent : ''; }

  function enviarServidor() {
    var u = ultimo;
    if (!CFG.endpoint) return Promise.reject(new Error('El sitio aún no está conectado con Google.'));
    proc('Enviando su expediente…', kb(u.bytes.length) + ' · ' + u.paginas + ' páginas. No cierre esta página.', null);
    var body = JSON.stringify({ a: 'subir', nombre: F.nombre.value.trim(), tel: F.tel.value, tramite: tramiteTexto(), d: window.GPWA ? window.GPWA.dispositivo : '', paginas: u.paginas, pdf: aBase64(u.bytes) });
    return fetch(CFG.endpoint, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: body, redirect: 'follow' })
      .then(function (r) { return r.json(); })
      .then(function (j) { if (!j || !j.ok) throw new Error((j && j.error) || 'El servidor no respondió.'); return j; });
  }

  function exito(j) {
    ultimo.folio = j.folio; ultimo.numero = j.numero;
    $('ok-folio').textContent = j.folio;
    $('ok-det').textContent = F.nombre.value.trim() + ' · ' + tramiteTexto() + ' · ' + ultimo.paginas + ' páginas';
    ver('doc-ok');
  }

  function falla(e) {
    var m = e && e.message ? e.message : '';
    if (!m || /fetch|network|load failed|json/i.test(m)) m = 'no hubo conexión con el servidor';
    $('falla-det').textContent = 'Detalle: ' + m.replace(/\.$/, '') + '.';
    ver('doc-falla');
  }

  $('doc-form').addEventListener('submit', function (ev) {
    ev.preventDefault();
    if (F.web.value) return; // trampa para robots
    var e = validar(true);
    if (Object.keys(e).length) {
      var first = e.nombre ? F.nombre : e.tel ? F.tel : e.tram ? F.tram : e.docs ? $('drop') : F.acepto;
      (first.focus ? first : $('drop')).focus && first.focus(); first.scrollIntoView({ behavior: 'smooth', block: 'center' }); return;
    }
    ver('doc-proceso');
    construir(function (i, n) { proc('Uniendo sus documentos… ' + Math.min(i + 1, n) + ' de ' + n, 'No cierre esta página.', Math.round(i / n * 100)); })
      .then(function (r) {
        ultimo = { bytes: r.bytes, paginas: r.paginas };
        if (r.bytes.length > MAX_MB_PDF * 1048576) throw Object.assign(new Error('El PDF quedó de ' + kb(r.bytes.length) + '; el máximo es ' + MAX_MB_PDF + ' MB. Quite algunas hojas o envíelo en dos partes.'), { local: true });
        return enviarServidor().then(exito);
      })
      .catch(function (e2) {
        if (!ultimo || (e2 && e2.local)) {
          if (!(e2 && e2.local)) ultimo = null;
          ver('doc-pasos'); aviso((e2 && e2.local && e2.message) || 'No se pudo armar el PDF. Revise que sus archivos se vean bien e intente de nuevo.');
          return;
        }
        falla(e2);
      });
  });

  function descargar() {
    if (!ultimo) return;
    var url = URL.createObjectURL(new Blob([ultimo.bytes], { type: 'application/pdf' }));
    var a = document.createElement('a'); a.href = url; a.download = nombreArchivo(ultimo.folio);
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(url); }, 60000);
  }
  $('ok-pdf').addEventListener('click', descargar);
  $('falla-retry').addEventListener('click', function () {
    ver('doc-proceso');
    enviarServidor().then(exito).catch(falla);
  });

  Array.prototype.forEach.call(document.querySelectorAll('[data-reiniciar]'), function (b) {
    b.addEventListener('click', function () {
      items.forEach(function (it) { if (it.url) URL.revokeObjectURL(it.url); });
      items = []; ultimo = null; intento = false; $('doc-form').reset(); pintar(); pintarNecesita(); validar(false); ver('doc-pasos'); F.nombre.focus();
    });
  });

  window.addEventListener('beforeunload', function (e) {
    if (!$('doc-proceso').hidden) { e.preventDefault(); e.returnValue = ''; }
  });
})();
