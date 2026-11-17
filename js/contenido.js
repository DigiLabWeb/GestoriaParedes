/* Gestoría Paredes — aplica los textos y requisitos editados desde el panel (sección «Editar página»).
 * 1. Al abrir la página usa la última versión guardada en este navegador (sin esperar).
 * 2. En segundo plano pregunta al servidor si hay una versión más nueva y, si la hay, la muestra al momento.
 * 3. Con ?borrador=1 muestra la vista previa que el administrador aún no publica.
 */
(function () {
  'use strict';
  var CFG = window.GP_CONFIG || {}, K = 'gp-contenido', KB = 'gp-contenido-borrador';
  var ls = {
    get: function (k) { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  };

  function aplicar(c) {
    if (!c || !c.req || !c.textos) return false;
    var req = {};
    Object.keys(c.req).forEach(function (id) {
      var r = c.req[id];
      req[id] = {
        es: r.es, en: { label: (r.en && r.en.label) || r.es.label, titulo: (r.en && r.en.titulo) || r.es.titulo, nota: (r.en && r.en.nota) || r.es.nota },
        grupos: (r.grupos || []).map(function (g) {
          return { es: g.es || '', en: g.en || g.es || '', items: (g.items || []).filter(function (it) { return it[0]; }).map(function (it) { return [it[0], it[1] || it[0]]; }) };
        })
      };
    });
    var base = window.GP_REQ_BASE || {}, nuevos = window.GP_REQ_NUEVOS || [], borrados = c.borrados || [], ord0 = (c.orden || Object.keys(req)).slice();
    nuevos.forEach(function (id) { if (!req[id] && base[id] && borrados.indexOf(id) < 0) { req[id] = base[id]; ord0.push(id); } });
    var ocultos = c.ocultos || [];
    var orden = ord0.filter(function (id) { return req[id] && ocultos.indexOf(id) < 0; });
    if (!orden.length) return false;
    window.GP_REQ = req; window.GP_REQ_ORDER = orden;
    var es = {}, en = {};
    Object.keys(c.textos).forEach(function (k) { var t = c.textos[k]; if (t.es) es[k] = t.es; if (t.en) en[k] = t.en; });
    window.GP_TEXTOS = { es: es, en: en };
    return true;
  }
  function repintar() {
    var go = function () { if (window.GPAplicarContenido) window.GPAplicarContenido(); if (window.GPDocsContenido) window.GPDocsContenido(); };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go); else go();
  }

  if (/[?&]borrador=1/.test(location.search)) {
    if (aplicar(ls.get(KB))) {
      document.addEventListener('DOMContentLoaded', function () {
        var b = document.createElement('div'); b.setAttribute('role', 'status');
        b.style.cssText = 'position:fixed;left:0;right:0;bottom:0;z-index:999;padding:13px 21px;background:#EBCB4F;color:#141C1E;font:600 14px/1.4 Poppins,sans-serif;text-align:center;box-shadow:0 -8px 21px rgba(0,0,0,.25)';
        b.textContent = 'Vista previa: estos cambios todavía no están publicados.';
        document.body.appendChild(b);
      });
    }
    return;
  }

  var guardado = ls.get(K);
  aplicar(guardado);
  if (!CFG.endpoint || !window.fetch) return;
  fetch(CFG.endpoint + '?a=contenido', { redirect: 'follow' })
    .then(function (r) { return r.json(); })
    .then(function (j) {
      if (!j || !j.ok || !j.c) return;
      if (guardado && guardado.v === j.c.v) return;
      ls.set(K, j.c);
      if (aplicar(j.c)) repintar();
    })
    .catch(function () {});
})();
