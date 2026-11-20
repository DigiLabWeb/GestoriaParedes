/* Gestoría Paredes — app «Escáner» para administradores.
 * Foto (cámara o galería) → recorte automático → revisión (girar, color / blanco y negro) → PDF para guardar o compartir.
 * Todo ocurre en el teléfono: las imágenes no se suben a ningún lado.
 */
(function () {
  'use strict';
  var CFG = window.GP_CONFIG || {};
  var K = 'gp-admin-sesion';
  var APP = (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
  var LADO = 2000, CALIDAD = 0.85, CARTA = [612, 792], MARGEN = 0;
  function $(id) { return document.getElementById(id); }
  var hojas = [], ses = null, pdfUrl = null;

  /* ---------- sesión (la misma del panel) ---------- */
  function leer() {
    var s = null;
    try { s = JSON.parse(localStorage.getItem(K) || sessionStorage.getItem(K) || 'null'); } catch (e) {}
    return s && s.vence > Date.now() ? s : null;
  }
  function guardar(s) {
    try {
      var alm = APP ? localStorage : sessionStorage;
      if (s) alm.setItem(K, JSON.stringify(s)); else { localStorage.removeItem(K); sessionStorage.removeItem(K); }
    } catch (e) {}
  }
  function api(body) {
    return fetch(CFG.endpoint, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(body), redirect: 'follow' })
      .catch(function () { throw new Error('Sin conexión con el servidor. Revise su internet.'); })
      .then(function (r) { return r.json(); });
  }
  function vista() {
    ses = leer();
    $('esc-login').hidden = !!ses; $('esc-app').hidden = !ses; $('esc-salir').hidden = !ses;
    if (!ses) setTimeout(function () { $('esc-u').focus(); }, 50);
  }
  $('esc-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var u = $('esc-u').value.trim(), p = $('esc-p').value, err = $('esc-err'), b = $('esc-entrar');
    err.hidden = true;
    if (!u || !p) { err.textContent = 'Escriba su usuario y contraseña.'; err.hidden = false; return; }
    b.disabled = true; b.textContent = 'Entrando…';
    api({ a: 'login', u: u, p: p }).then(function (j) {
      if (!j.ok) throw new Error(j.error || 'Usuario o contraseña incorrectos.');
      guardar({ token: j.token, nombre: j.nombre, usuario: j.usuario || u.toLowerCase(), vence: j.vence }); $('esc-p').value = ''; vista();
    }).catch(function (x) { err.textContent = x.message; err.hidden = false; })
      .then(function () { b.disabled = false; b.textContent = 'Entrar'; });
  });
  $('esc-salir').addEventListener('click', function () {
    if (hojas.length && !confirm('Se perderán las hojas escaneadas. ¿Salir?')) return;
    limpiarTodo(); guardar(null); vista();
  });

  /* ---------- aviso ---------- */
  var tA;
  function aviso(t) { var a = $('esc-toast'); a.textContent = t; a.hidden = false; clearTimeout(tA); tA = setTimeout(function () { a.hidden = true; }, 3500); }

  /* ---------- fotos → hojas ---------- */
  function cargar(file) {
    return new Promise(function (ok, no) {
      var url = URL.createObjectURL(file), im = new Image();
      im.onload = function () {
        // se reduce a un tamaño manejable para el teléfono, conservando la nitidez
        var W = im.naturalWidth, H = im.naturalHeight, s = Math.min(1, 3200 / Math.max(W, H));
        if (s >= 1) { ok({ img: im, url: url }); return; }
        var c = document.createElement('canvas'); c.width = Math.round(W * s); c.height = Math.round(H * s);
        c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
        c.toBlob(function (b) {
          URL.revokeObjectURL(url);
          var u2 = URL.createObjectURL(b), im2 = new Image();
          im2.onload = function () { ok({ img: im2, url: u2 }); }; im2.onerror = no; im2.src = u2;
        }, 'image/jpeg', 0.92);
      };
      im.onerror = function () { URL.revokeObjectURL(url); no(new Error('No se pudo abrir la imagen.')); };
      im.src = url;
    });
  }
  function nuevaHoja(file, nota) {
    return cargar(file).then(function (o) {
      var q = window.GPScan.detectar(o.img);
      return window.GPScan.editor(o.img, { quad: q, modo: 'color', nota: nota }).then(function (r) {
        if (!r) { URL.revokeObjectURL(o.url); return; }
        return guardarCanvas(r.canvas).then(function (res) {
          hojas.push({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), img: o.img, orig: o.url, quad: r.quad, modo: r.modo, blob: res.blob, url: res.url, w: res.w, h: res.h });
          pintar();
        });
      });
    }).catch(function (e) { aviso(e.message || 'No se pudo escanear la foto.'); });
  }
  function guardarCanvas(cv) {
    var s = Math.min(1, LADO / Math.max(cv.width, cv.height)), c = cv;
    if (s < 1) { c = document.createElement('canvas'); c.width = Math.round(cv.width * s); c.height = Math.round(cv.height * s); c.getContext('2d').drawImage(cv, 0, 0, c.width, c.height); }
    return new Promise(function (ok) { c.toBlob(function (b) { ok({ blob: b, url: URL.createObjectURL(b), w: c.width, h: c.height }); }, 'image/jpeg', CALIDAD); });
  }
  var cola = Promise.resolve();
  function entrada(ev) {
    var fs = Array.prototype.slice.call(ev.target.files || []).filter(function (f) { return /^image\//.test(f.type) || /\.(jpe?g|png|heic|webp)$/i.test(f.name); });
    ev.target.value = '';
    fs.forEach(function (f, i) {
      cola = cola.then(function () { return nuevaHoja(f, fs.length > 1 ? 'Foto ' + (i + 1) + ' de ' + fs.length : ''); });
    });
  }
  $('esc-in-cam').addEventListener('change', entrada);
  $('esc-in-gal').addEventListener('change', entrada);

  /* ---------- en computadora: elegir, arrastrar o pegar fotos ---------- */
  var PC = window.matchMedia && matchMedia('(hover: hover) and (pointer: fine)').matches && !/Android|iPhone|iPad|Mobile/.test(navigator.userAgent);
  function agregarArchivos(lista) {
    var fs = Array.prototype.slice.call(lista || []).filter(function (f) { return /^image\//.test(f.type); });
    if (!fs.length) { aviso('Solo se pueden escanear fotos (JPG, PNG, HEIC).'); return; }
    fs.forEach(function (f, i) { cola = cola.then(function () { return nuevaHoja(f, fs.length > 1 ? 'Foto ' + (i + 1) + ' de ' + fs.length : ''); }); });
  }
  if (PC) {
    document.documentElement.classList.add('esc-pc');
    $('esc-in-cam').removeAttribute('capture'); $('esc-in-cam').setAttribute('multiple', '');
    $('esc-cam-t').dataset.pc = '1'; $('esc-cam-t').textContent = 'Elegir fotos';
    var zona = document.createElement('div'); zona.className = 'esc-drop'; zona.hidden = true;
    zona.innerHTML = '<div><b>Suelte las fotos aquí</b><span>Se escanean una por una</span></div>';
    document.body.appendChild(zona);
    var n = 0;
    window.addEventListener('dragenter', function (e) { if (!ses || !e.dataTransfer || [].indexOf.call(e.dataTransfer.types || [], 'Files') < 0) return; n++; zona.hidden = false; });
    window.addEventListener('dragleave', function () { n = Math.max(0, n - 1); if (!n) zona.hidden = true; });
    window.addEventListener('dragover', function (e) { if (!zona.hidden) e.preventDefault(); });
    window.addEventListener('drop', function (e) { if (zona.hidden) return; e.preventDefault(); n = 0; zona.hidden = true; agregarArchivos(e.dataTransfer.files); });
    window.addEventListener('paste', function (e) {
      if (!ses || (e.target && /INPUT|TEXTAREA/.test(e.target.tagName))) return;
      var fs = Array.prototype.slice.call((e.clipboardData && e.clipboardData.files) || []);
      if (fs.length) { e.preventDefault(); agregarArchivos(fs); }
    });
    var p = document.querySelector('.esc-vacio .esc-p');
    if (p) p.innerHTML = 'Arrastre aquí las fotos de sus documentos, elíjalas desde su computadora o péguelas con <kbd>Ctrl</kbd>+<kbd>V</kbd>. Las recortamos, las enderezamos, las mejoramos y las unimos en un PDF.';
  }

  /* ---------- lista de hojas ---------- */
  var IC = {
    edit: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>',
    del: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M6 6l1 14h10l1-14"/></svg>',
    izq: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>',
    der: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>'
  };
  function pintar() {
    var g = $('esc-grid'); g.innerHTML = '';
    hojas.forEach(function (h, i) {
      var li = document.createElement('li'); li.className = 'esc-hoja';
      li.innerHTML = '<div class="esc-mini"><img alt="Hoja ' + (i + 1) + '" src="' + h.url + '"><span class="esc-num">' + (i + 1) + '</span></div>' +
        '<div class="esc-hoja-acts">' +
        '<button type="button" class="esc-ib" data-a="izq" aria-label="Mover antes"' + (i === 0 ? ' disabled' : '') + '>' + IC.izq + '</button>' +
        '<button type="button" class="esc-ib" data-a="edit" aria-label="Volver a recortar o girar">' + IC.edit + '</button>' +
        '<button type="button" class="esc-ib" data-a="del" aria-label="Quitar hoja">' + IC.del + '</button>' +
        '<button type="button" class="esc-ib" data-a="der" aria-label="Mover después"' + (i === hojas.length - 1 ? ' disabled' : '') + '>' + IC.der + '</button></div>';
      li.addEventListener('click', function (e) {
        var b = e.target.closest('button'); if (!b) return;
        var a = b.dataset.a;
        if (a === 'izq' && i > 0) { hojas.splice(i - 1, 0, hojas.splice(i, 1)[0]); pintar(); }
        if (a === 'der' && i < hojas.length - 1) { hojas.splice(i + 1, 0, hojas.splice(i, 1)[0]); pintar(); }
        if (a === 'del') { var x = hojas.splice(i, 1)[0]; URL.revokeObjectURL(x.url); URL.revokeObjectURL(x.orig); pintar(); aviso('Se quitó la hoja ' + (i + 1) + '.'); }
        if (a === 'edit') {
          cola = cola.then(function () {
            return window.GPScan.editor(h.img, { quad: h.quad, modo: h.modo, nota: 'Hoja ' + (i + 1) }).then(function (r) {
              if (!r) return;
              return guardarCanvas(r.canvas).then(function (res) { URL.revokeObjectURL(h.url); h.quad = r.quad; h.modo = r.modo; h.blob = res.blob; h.url = res.url; h.w = res.w; h.h = res.h; pintar(); });
            });
          });
        }
      });
      g.appendChild(li);
    });
    var n = hojas.length;
    $('esc-vacio').hidden = n > 0; $('esc-hojas').hidden = n === 0; $('esc-pdf').hidden = n === 0;
    $('esc-cuenta').textContent = n === 1 ? '1 hoja' : n + ' hojas';
    $('esc-cam-t').textContent = $('esc-cam-t').dataset.pc ? (n ? 'Agregar más fotos' : 'Elegir fotos') : (n ? 'Otra hoja' : 'Tomar foto');
    $('esc-crear').textContent = 'Crear PDF' + (n > 1 ? ' (' + n + ' hojas)' : '');
    if (!$('esc-nombre').value) $('esc-nombre').value = 'Escaneo ' + fecha();
  }
  function fecha() {
    var d = new Date(), m = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'][d.getMonth()];
    return ('0' + d.getDate()).slice(-2) + '-' + m + '-' + String(d.getFullYear()).slice(-2);
  }
  function limpiarTodo() {
    hojas.forEach(function (h) { URL.revokeObjectURL(h.url); URL.revokeObjectURL(h.orig); });
    hojas = []; $('esc-nombre').value = ''; if (pdfUrl) { URL.revokeObjectURL(pdfUrl); pdfUrl = null; } pintar();
  }
  $('esc-borrar').addEventListener('click', function () { if (confirm('¿Quitar todas las hojas y empezar de nuevo?')) limpiarTodo(); });
  window.addEventListener('beforeunload', function (e) { if (hojas.length) { e.preventDefault(); e.returnValue = ''; } });

  /* ---------- PDF ---------- */
  var libP = null;
  function lib() {
    if (window.PDFLib) return Promise.resolve(window.PDFLib);
    if (!libP) libP = new Promise(function (ok, no) { var s = document.createElement('script'); s.src = 'js/vendor/pdf-lib.min.js?v=1'; s.onload = function () { ok(window.PDFLib); }; s.onerror = function () { libP = null; no(new Error('No se pudo cargar el generador de PDF. Revise su conexión.')); }; document.head.appendChild(s); });
    return libP;
  }
  if ('requestIdleCallback' in window) requestIdleCallback(function () { lib().catch(function () {}); }); else setTimeout(function () { lib().catch(function () {}); }, 1500);

  function nombreArchivo() {
    var n = ($('esc-nombre').value || 'Escaneo ' + fecha()).trim().replace(/[\\/:*?"<>|]+/g, '-').slice(0, 80);
    return /\.pdf$/i.test(n) ? n : n + '.pdf';
  }
  $('esc-crear').addEventListener('click', function () {
    if (!hojas.length) return;
    var b = $('esc-crear'), t = b.textContent; b.disabled = true; b.textContent = 'Creando PDF…';
    var PDF, doc;
    lib().then(function (L) { PDF = L; return PDF.PDFDocument.create(); }).then(function (d) {
      doc = d; doc.setTitle(nombreArchivo().replace(/\.pdf$/i, '')); doc.setCreator('Gestoría Paredes'); doc.setProducer('Gestoría Paredes');
      return hojas.reduce(function (p, h) {
        return p.then(function () { return h.blob.arrayBuffer(); }).then(function (buf) { return doc.embedJpg(buf); }).then(function (img) {
          var hor = h.w > h.h, W = hor ? CARTA[1] : CARTA[0], H = hor ? CARTA[0] : CARTA[1];
          var s = Math.min((W - 2 * MARGEN) / h.w, (H - 2 * MARGEN) / h.h), w = h.w * s, hh = h.h * s;
          doc.addPage([W, H]).drawImage(img, { x: (W - w) / 2, y: (H - hh) / 2, width: w, height: hh });
        });
      }, Promise.resolve());
    }).then(function () { return doc.save(); }).then(function (bytes) {
      var blob = new Blob([bytes], { type: 'application/pdf' });
      if (pdfUrl) URL.revokeObjectURL(pdfUrl); pdfUrl = URL.createObjectURL(blob);
      mostrarListo(blob);
    }).catch(function (e) { aviso(e.message || 'No se pudo crear el PDF.'); })
      .then(function () { b.disabled = false; b.textContent = t; });
  });

  function mostrarListo(blob) {
    var nom = nombreArchivo(), kb = blob.size / 1024;
    $('esc-listo-d').textContent = nom + ' · ' + hojas.length + (hojas.length === 1 ? ' hoja' : ' hojas') + ' · ' + (kb > 1024 ? (kb / 1024).toFixed(1) + ' MB' : Math.round(kb) + ' KB');
    var acts = $('esc-listo-acts'); acts.innerHTML = '';
    var file = null; try { file = new File([blob], nom, { type: 'application/pdf' }); } catch (e) {}
    if (file && navigator.canShare && navigator.share && navigator.canShare({ files: [file] })) {
      var s = document.createElement('button'); s.type = 'button'; s.className = 'btn btn-y'; s.textContent = 'Compartir o guardar en…';
      s.addEventListener('click', function () { navigator.share({ files: [file], title: nom }).catch(function (e) { if (e && e.name !== 'AbortError') aviso('No se pudo compartir. Use «Descargar».'); }); });
      acts.appendChild(s);
    }
    var d = document.createElement('a'); d.className = 'btn ' + (acts.children.length ? 'btn-o' : 'btn-y'); d.href = pdfUrl; d.download = nom; d.textContent = 'Descargar PDF';
    acts.appendChild(d);
    var v = document.createElement('a'); v.className = 'btn btn-o'; v.href = pdfUrl; v.target = '_blank'; v.rel = 'noopener'; v.textContent = 'Ver PDF';
    acts.appendChild(v);
    var n = document.createElement('button'); n.type = 'button'; n.className = 'btn btn-o'; n.textContent = 'Nuevo escaneo';
    n.addEventListener('click', function () { $('esc-listo').hidden = true; limpiarTodo(); });
    acts.appendChild(n);
    $('esc-listo').hidden = false; acts.firstChild.focus();
  }
  $('esc-seguir').addEventListener('click', function () { $('esc-listo').hidden = true; });

  vista(); pintar();
})();
