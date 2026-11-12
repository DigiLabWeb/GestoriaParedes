/* Gestoría Paredes — convierte la foto de un documento en un escaneo (todo en el navegador, sin servidores)
 * 1. detectar(): busca la hoja en la foto y propone sus 4 esquinas.
 * 2. editor(): el cliente revisa y ajusta las esquinas, y elige Escaneo / Color / Blanco y negro.
 * 3. procesar(): endereza la hoja (corrige la perspectiva), recorta el fondo y limpia sombras.
 */
(function () {
  'use strict';
  var LADO_SALIDA = 2000, LADO_FUENTE = 3000;

  function canvas(w, h) { var c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  function dist(a, b) { return Math.hypot(a[0] - b[0], a[1] - b[1]); }
  function area(q) { var s = 0; for (var i = 0; i < 4; i++) { var a = q[i], b = q[(i + 1) % 4]; s += a[0] * b[1] - b[0] * a[1]; } return Math.abs(s) / 2; }
  function convexo(q) {
    var sg = 0;
    for (var i = 0; i < 4; i++) {
      var a = q[i], b = q[(i + 1) % 4], c = q[(i + 2) % 4];
      var z = (b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]);
      if (Math.abs(z) < 1e-6) return false;
      if (!sg) sg = Math.sign(z); else if (Math.sign(z) !== sg) return false;
    }
    return true;
  }
  function margen(w, h, f) { var x = w * f, y = h * f; return [[x, y], [w - x, y], [w - x, h - y], [x, h - y]]; }

  /* ---------- 1. Detección de la hoja ---------- */
  function detectar(img) {
    var W = img.naturalWidth, H = img.naturalHeight, s = 360 / Math.max(W, H);
    var w = Math.max(8, Math.round(W * s)), h = Math.max(8, Math.round(H * s));
    var c = canvas(w, h), x = c.getContext('2d');
    x.drawImage(img, 0, 0, w, h);
    var d = x.getImageData(0, 0, w, h).data, n = w * h, g = new Float32Array(n), i, j;
    for (i = 0; i < n; i++) g[i] = 0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2];
    g = cajaBlur(cajaBlur(g, w, h, 2), w, h, 2);
    // Umbral de Otsu: separa la hoja (clara) del fondo
    var hist = new Array(256).fill(0); for (i = 0; i < n; i++) hist[Math.min(255, g[i] | 0)]++;
    var tot = 0; for (i = 0; i < 256; i++) tot += i * hist[i];
    var sB = 0, wB = 0, mejor = 0, t = 128;
    for (i = 0; i < 256; i++) {
      wB += hist[i]; if (!wB) continue; var wF = n - wB; if (!wF) break;
      sB += i * hist[i]; var mB = sB / wB, mF = (tot - sB) / wF, v = wB * wF * (mB - mF) * (mB - mF);
      if (v > mejor) { mejor = v; t = i; }
    }
    var m = new Uint8Array(n); for (i = 0; i < n; i++) m[i] = g[i] > t ? 1 : 0;
    // Componente clara más grande (prefiere la que toca el centro)
    var lab = new Int32Array(n), cola = new Int32Array(n), comp = 0, best = -1, bestTam = 0, centro = (h >> 1) * w + (w >> 1);
    for (i = 0; i < n; i++) {
      if (!m[i] || lab[i]) continue;
      comp++; var ini = 0, fin = 0, tam = 0, tieneCentro = false; cola[fin++] = i; lab[i] = comp;
      while (ini < fin) {
        var p = cola[ini++]; tam++; if (p === centro) tieneCentro = true;
        var px = p % w, py = (p / w) | 0;
        if (px > 0 && m[p - 1] && !lab[p - 1]) { lab[p - 1] = comp; cola[fin++] = p - 1; }
        if (px < w - 1 && m[p + 1] && !lab[p + 1]) { lab[p + 1] = comp; cola[fin++] = p + 1; }
        if (py > 0 && m[p - w] && !lab[p - w]) { lab[p - w] = comp; cola[fin++] = p - w; }
        if (py < h - 1 && m[p + w] && !lab[p + w]) { lab[p + w] = comp; cola[fin++] = p + w; }
      }
      var puntaje = tam * (tieneCentro ? 1.5 : 1);
      if (puntaje > bestTam) { bestTam = puntaje; best = comp; }
    }
    if (best < 0) return margen(W, H, 0.04);
    // Esquinas por puntos extremos
    var tl = null, tr = null, br = null, bl = null, vtl = 1e9, vtr = -1e9, vbr = -1e9, vbl = 1e9;
    for (j = 0; j < h; j++) for (i = 0; i < w; i++) {
      if (lab[j * w + i] !== best) continue;
      var a = i + j, b = i - j;
      if (a < vtl) { vtl = a; tl = [i, j]; }
      if (a > vbr) { vbr = a; br = [i, j]; }
      if (b > vtr) { vtr = b; tr = [i, j]; }
      if (b < vbl) { vbl = b; bl = [i, j]; }
    }
    var q = [tl, tr, br, bl].map(function (pt) { return [(pt[0] + 0.5) / s, (pt[1] + 0.5) / s]; });
    // cierra apenas las esquinas para que no entre el fondo de la mesa
    var cx = (q[0][0] + q[1][0] + q[2][0] + q[3][0]) / 4, cy = (q[0][1] + q[1][1] + q[2][1] + q[3][1]) / 4;
    q = q.map(function (p) { return [Math.max(0, Math.min(W, cx + (p[0] - cx) * 0.996)), Math.max(0, Math.min(H, cy + (p[1] - cy) * 0.996))]; });
    var frac = area(q) / (W * H);
    if (!convexo(q) || frac < 0.12) return margen(W, H, 0.04);
    return q;
  }

  function cajaBlur(src, w, h, r) {
    var out = new Float32Array(src.length), tmp = new Float32Array(src.length), x, y, k, s, cnt;
    for (y = 0; y < h; y++) for (x = 0; x < w; x++) {
      s = 0; cnt = 0; for (k = -r; k <= r; k++) { var xx = x + k; if (xx >= 0 && xx < w) { s += src[y * w + xx]; cnt++; } } tmp[y * w + x] = s / cnt;
    }
    for (y = 0; y < h; y++) for (x = 0; x < w; x++) {
      s = 0; cnt = 0; for (k = -r; k <= r; k++) { var yy = y + k; if (yy >= 0 && yy < h) { s += tmp[yy * w + x]; cnt++; } } out[y * w + x] = s / cnt;
    }
    return out;
  }

  /* ---------- 2. Enderezar + limpiar ---------- */
  // Homografía que lleva el rectángulo de salida (0,0)-(W,H) a la cuadrilátera de la foto.
  function homografia(W, H, q) {
    var src = [[0, 0], [W, 0], [W, H], [0, H]], A = [], b = [], i;
    for (i = 0; i < 4; i++) {
      var u = src[i][0], v = src[i][1], X = q[i][0], Y = q[i][1];
      A.push([u, v, 1, 0, 0, 0, -u * X, -v * X]); b.push(X);
      A.push([0, 0, 0, u, v, 1, -u * Y, -v * Y]); b.push(Y);
    }
    // eliminación gaussiana
    for (i = 0; i < 8; i++) {
      var piv = i; for (var r = i + 1; r < 8; r++) if (Math.abs(A[r][i]) > Math.abs(A[piv][i])) piv = r;
      var t = A[i]; A[i] = A[piv]; A[piv] = t; t = b[i]; b[i] = b[piv]; b[piv] = t;
      for (r = i + 1; r < 8; r++) { var f = A[r][i] / A[i][i]; for (var c = i; c < 8; c++) A[r][c] -= f * A[i][c]; b[r] -= f * b[i]; }
    }
    var h = new Array(8);
    for (i = 7; i >= 0; i--) { var s = b[i]; for (var c2 = i + 1; c2 < 8; c2++) s -= A[i][c2] * h[c2]; h[i] = s / A[i][i]; }
    return h;
  }

  function procesar(img, quad, modo) {
    var W0 = img.naturalWidth, H0 = img.naturalHeight, fs = Math.min(1, LADO_FUENTE / Math.max(W0, H0));
    var sw = Math.round(W0 * fs), sh = Math.round(H0 * fs);
    var sc = canvas(sw, sh), sx = sc.getContext('2d'); sx.drawImage(img, 0, 0, sw, sh);
    var S = sx.getImageData(0, 0, sw, sh).data;
    var q = quad.map(function (p) { return [p[0] * fs, p[1] * fs]; });
    var ow = Math.max(dist(q[0], q[1]), dist(q[3], q[2])), oh = Math.max(dist(q[0], q[3]), dist(q[1], q[2]));
    var k = Math.min(1, LADO_SALIDA / Math.max(ow, oh)); ow = Math.max(16, Math.round(ow * k)); oh = Math.max(16, Math.round(oh * k));
    var hm = homografia(ow, oh, q);
    var oc = canvas(ow, oh), ox = oc.getContext('2d'), od = ox.createImageData(ow, oh), O = od.data;
    var u, v, X, Y, Z, x0, y0, fx, fy, i00, i10, i01, i11, o, c;
    for (v = 0; v < oh; v++) {
      for (u = 0; u < ow; u++) {
        Z = hm[6] * (u + 0.5) + hm[7] * (v + 0.5) + 1;
        X = (hm[0] * (u + 0.5) + hm[1] * (v + 0.5) + hm[2]) / Z - 0.5;
        Y = (hm[3] * (u + 0.5) + hm[4] * (v + 0.5) + hm[5]) / Z - 0.5;
        if (X < 0) X = 0; if (Y < 0) Y = 0; if (X > sw - 1.001) X = sw - 1.001; if (Y > sh - 1.001) Y = sh - 1.001;
        x0 = X | 0; y0 = Y | 0; fx = X - x0; fy = Y - y0;
        i00 = (y0 * sw + x0) * 4; i10 = i00 + 4; i01 = i00 + sw * 4; i11 = i01 + 4; o = (v * ow + u) * 4;
        for (c = 0; c < 3; c++) {
          O[o + c] = (S[i00 + c] * (1 - fx) + S[i10 + c] * fx) * (1 - fy) + (S[i01 + c] * (1 - fx) + S[i11 + c] * fx) * fy;
        }
        O[o + 3] = 255;
      }
    }
    limpiar(O, ow, oh, modo);
    ox.putImageData(od, 0, 0);
    return oc;
  }

  // Quita sombras y deja el papel blanco: divide entre una estimación del fondo (iluminación).
  function limpiar(O, w, h, modo) {
    var n = w * h, gray = new Float32Array(n), i;
    for (i = 0; i < n; i++) gray[i] = 0.299 * O[i * 4] + 0.587 * O[i * 4 + 1] + 0.114 * O[i * 4 + 2];
    var F = Math.max(4, Math.round(Math.max(w, h) / 160)), bw = Math.ceil(w / F), bh = Math.ceil(h / F), bg = new Float32Array(bw * bh), x, y, X, Y;
    // máximo por bloque: el papel es lo más claro, el texto se ignora
    for (Y = 0; Y < bh; Y++) for (X = 0; X < bw; X++) {
      var mx = 0;
      for (y = Y * F; y < Math.min(h, (Y + 1) * F); y += 2) for (x = X * F; x < Math.min(w, (X + 1) * F); x += 2) { var g = gray[y * w + x]; if (g > mx) mx = g; }
      bg[Y * bw + X] = mx;
    }
    bg = dilatar(bg, bw, bh, 2);
    bg = cajaBlur(cajaBlur(bg, bw, bh, 3), bw, bh, 3);
    for (i = 0; i < bg.length; i++) if (bg[i] < 40) bg[i] = 40;
    for (y = 0; y < h; y++) {
      var gy = Math.min(bh - 1.001, Math.max(0, (y + 0.5) / F - 0.5)), y0 = gy | 0, fy = gy - y0;
      for (x = 0; x < w; x++) {
        var gx = Math.min(bw - 1.001, Math.max(0, (x + 0.5) / F - 0.5)), x0 = gx | 0, fx = gx - x0;
        var b = (bg[y0 * bw + x0] * (1 - fx) + bg[y0 * bw + x0 + 1] * fx) * (1 - fy) + (bg[(y0 + 1) * bw + x0] * (1 - fx) + bg[(y0 + 1) * bw + x0 + 1] * fx) * fy;
        var p = (y * w + x) * 4, r = gray[y * w + x] / b;
        if (modo === 'bn') {
          var val = r < 0.72 ? 0 : 255; O[p] = O[p + 1] = O[p + 2] = val;
        } else if (modo === 'color') {
          for (var c = 0; c < 3; c++) O[p + c] = curva(O[p + c] / b);
        } else {
          O[p] = O[p + 1] = O[p + 2] = curva(r);
        }
      }
    }
  }
  function curva(r) { // r = 1 es papel; oscurece tinta y blanquea fondo
    var t = (r - 0.12) / (0.88 - 0.12);
    if (t <= 0) return 0; if (t >= 1) return 255;
    return Math.round(255 * Math.pow(t, 1.35));
  }
  function dilatar(a, w, h, r) {
    var o = new Float32Array(a.length);
    for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) {
      var m = 0;
      for (var j = Math.max(0, y - r); j <= Math.min(h - 1, y + r); j++) for (var i = Math.max(0, x - r); i <= Math.min(w - 1, x + r); i++) if (a[j * w + i] > m) m = a[j * w + i];
      o[y * w + x] = m;
    }
    return o;
  }

  /* ---------- 3. Editor de esquinas ---------- */
  var MODOS = [['color', 'Color'], ['gris', 'Blanco y negro']];
  function editor(img, inicial) {
    return new Promise(function (resolver) {
      var q = inicial.quad.map(function (p) { return p.slice(); }), modo = inicial.modo || 'color';
      var W = img.naturalWidth, H = img.naturalHeight;
      var raiz = document.createElement('div'); raiz.className = 'scn'; raiz.setAttribute('role', 'dialog'); raiz.setAttribute('aria-modal', 'true'); raiz.setAttribute('aria-labelledby', 'scn-t');
      raiz.innerHTML =
        '<div class="scn-top"><div><p class="scn-t" id="scn-t">Recorte el documento</p><p class="scn-s">Arrastre los cuatro puntos a las esquinas de la hoja.</p><p class="scn-n"></p></div>' +
        '<button type="button" class="ib scn-x" aria-label="Cancelar"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg></button></div>' +
        '<div class="scn-stage"><div class="scn-box"><canvas class="scn-img"></canvas><svg class="scn-svg"></svg><canvas class="scn-lupa" width="120" height="120" hidden></canvas></div></div>' +
        '<div class="scn-bar"><div class="scn-modos" role="radiogroup" aria-label="Tipo de escaneo"></div>' +
        '<div class="scn-acts"><button type="button" class="btn btn-o scn-todo">Toda la foto</button><button type="button" class="btn btn-y scn-ok">Listo</button></div></div>';
      document.body.appendChild(raiz); document.body.style.overflow = 'hidden';
      if (inicial.nota) raiz.querySelector('.scn-n').textContent = inicial.nota;
      var box = raiz.querySelector('.scn-box'), cv = raiz.querySelector('.scn-img'), svg = raiz.querySelector('.scn-svg'), lupa = raiz.querySelector('.scn-lupa');
      var modosEl = raiz.querySelector('.scn-modos');
      MODOS.forEach(function (m) {
        var b = document.createElement('button'); b.type = 'button'; b.textContent = m[1]; b.setAttribute('role', 'radio'); b.dataset.m = m[0];
        b.addEventListener('click', function () { modo = m[0]; pintarModos(); }); modosEl.appendChild(b);
      });
      function pintarModos() { Array.prototype.forEach.call(modosEl.children, function (b) { b.setAttribute('aria-checked', b.dataset.m === modo ? 'true' : 'false'); }); }
      pintarModos();

      var esc = 1, dw = 0, dh = 0;
      function medir() {
        var st = raiz.querySelector('.scn-stage'), mw = st.clientWidth - 34, mh = st.clientHeight - 34;
        esc = Math.min(mw / W, mh / H); dw = Math.round(W * esc); dh = Math.round(H * esc);
        var dpr = Math.min(2, window.devicePixelRatio || 1);
        cv.width = dw * dpr; cv.height = dh * dpr; cv.style.width = dw + 'px'; cv.style.height = dh + 'px';
        cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
        box.style.width = dw + 'px'; box.style.height = dh + 'px';
        svg.setAttribute('viewBox', '0 0 ' + dw + ' ' + dh); svg.setAttribute('width', dw); svg.setAttribute('height', dh);
        pintar();
      }
      function pintar() {
        var P = q.map(function (p) { return [p[0] * esc, p[1] * esc]; });
        var poly = P.map(function (p) { return p.join(','); }).join(' ');
        var h = '<path class="scn-sombra" fill-rule="evenodd" d="M0 0H' + dw + 'V' + dh + 'H0Z M' + P.map(function (p) { return p.join(' '); }).join(' L') + 'Z"/>' +
          '<polygon class="scn-borde" points="' + poly + '"/>';
        P.forEach(function (p, i) {
          h += '<g class="scn-h" data-i="' + i + '" tabindex="0" role="slider" aria-label="Esquina ' + ['superior izquierda', 'superior derecha', 'inferior derecha', 'inferior izquierda'][i] + '">' +
            '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="22" class="scn-hit"/><circle cx="' + p[0] + '" cy="' + p[1] + '" r="10" class="scn-dot"/></g>';
        });
        svg.innerHTML = h;
      }
      var arr = -1;
      function punto(e) { var r = svg.getBoundingClientRect(); return [Math.max(0, Math.min(W, (e.clientX - r.left) / esc)), Math.max(0, Math.min(H, (e.clientY - r.top) / esc))]; }
      function mostrarLupa(p) {
        lupa.hidden = false; var L = lupa.getContext('2d'), z = 2.2, R = 60;
        L.save(); L.clearRect(0, 0, 120, 120); L.beginPath(); L.arc(R, R, R - 2, 0, Math.PI * 2); L.clip();
        var srcR = R / (esc * z);
        L.drawImage(img, p[0] - srcR, p[1] - srcR, srcR * 2, srcR * 2, 0, 0, 120, 120);
        L.strokeStyle = '#EBCB4F'; L.lineWidth = 2; L.beginPath(); L.moveTo(R - 10, R); L.lineTo(R + 10, R); L.moveTo(R, R - 10); L.lineTo(R, R + 10); L.stroke(); L.restore();
        var x = p[0] * esc, y = p[1] * esc;
        lupa.style.left = Math.min(dw - 120, Math.max(0, x - 60)) + 'px';
        lupa.style.top = (y > 150 ? y - 150 : y + 34) + 'px';
      }
      svg.addEventListener('pointerdown', function (e) {
        var g = e.target.closest('.scn-h'); var p = punto(e);
        if (g) arr = +g.dataset.i;
        else { var dmin = 1e9; q.forEach(function (c, i) { var dd = dist(c, p); if (dd < dmin) { dmin = dd; arr = i; } }); if (dmin * esc > 60) { arr = -1; return; } }
        svg.setPointerCapture(e.pointerId); e.preventDefault(); q[arr] = p; pintar(); mostrarLupa(p);
      });
      svg.addEventListener('pointermove', function (e) { if (arr < 0) return; var p = punto(e); q[arr] = p; pintar(); mostrarLupa(p); });
      function soltar() { arr = -1; lupa.hidden = true; }
      svg.addEventListener('pointerup', soltar); svg.addEventListener('pointercancel', soltar);
      svg.addEventListener('keydown', function (e) {
        var g = e.target.closest && e.target.closest('.scn-h'); if (!g) return;
        var i = +g.dataset.i, d = (e.shiftKey ? 20 : 4) / esc, k = { ArrowLeft: [-d, 0], ArrowRight: [d, 0], ArrowUp: [0, -d], ArrowDown: [0, d] }[e.key];
        if (!k) return; e.preventDefault();
        q[i] = [Math.max(0, Math.min(W, q[i][0] + k[0])), Math.max(0, Math.min(H, q[i][1] + k[1]))]; pintar();
        var nuevo = svg.querySelector('.scn-h[data-i="' + i + '"]'); if (nuevo) nuevo.focus();
      });
      function cerrar(res) { window.removeEventListener('resize', medir); document.removeEventListener('keydown', escTecla); raiz.remove(); document.body.style.overflow = ''; resolver(res); }
      function escTecla(e) { if (e.key === 'Escape') cerrar(null); }
      document.addEventListener('keydown', escTecla);
      raiz.querySelector('.scn-x').addEventListener('click', function () { cerrar(null); });
      raiz.querySelector('.scn-todo').addEventListener('click', function () { q = [[0, 0], [W, 0], [W, H], [0, H]]; pintar(); });
      raiz.querySelector('.scn-ok').addEventListener('click', function () {
        if (!convexo(q) || area(q) < W * H * 0.02) { raiz.querySelector('.scn-s').textContent = 'Las esquinas se cruzaron. Acomódelas en orden alrededor de la hoja.'; raiz.querySelector('.scn-s').classList.add('bad'); return; }
        cerrar({ quad: q, modo: modo });
      });
      window.addEventListener('resize', medir);
      requestAnimationFrame(medir);
      setTimeout(function () { raiz.querySelector('.scn-ok').focus(); }, 50);
    });
  }

  window.GPScan = { detectar: detectar, procesar: procesar, editor: editor };
})();
