/* Gestoría Paredes — convierte la foto de un documento en un escaneo (todo en el navegador, sin servidores)
 * 1. detectar(): busca la hoja en la foto y propone sus 4 esquinas.
 * 2. editor(): el cliente ajusta las esquinas; luego revisa el resultado, lo gira y elige Color o Blanco y negro.
 * 3. procesar(): endereza la hoja, quita sombras y el tono del papel, enfoca las letras y deja el fondo blanco
 *    (las fotografías, como la de la INE, se respetan).
 */
(function () {
  'use strict';
  var LADO_SALIDA = 2200, LADO_FUENTE = 3200;

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

  // Mejora tipo "escáner de documentos":
  //  1) estima el color del papel en cada zona (por canal) y lo divide: quita sombras, manchas de luz y el tono amarillento;
  //  2) enfoca las letras (máscara de enfoque sobre la luminosidad);
  //  3) curva de documento: el papel queda blanco puro y la tinta negra y nítida; sellos y firmas conservan su color.
  function limpiar(O, w, h, modo) {
    var n = w * h, R = new Float32Array(n), G = new Float32Array(n), B = new Float32Array(n), L = new Float32Array(n), i, p;
    for (i = 0, p = 0; i < n; i++, p += 4) { R[i] = O[p]; G[i] = O[p + 1]; B[i] = O[p + 2]; L[i] = 0.299 * O[p] + 0.587 * O[p + 1] + 0.114 * O[p + 2]; }
    // fondo por bloques: el color del pixel más claro del bloque (papel), así el texto no cuenta
    var F = Math.max(6, Math.round(Math.max(w, h) / 120)), bw = Math.ceil(w / F), bh = Math.ceil(h / F), nb = bw * bh;
    var bL = new Float32Array(nb), bR = new Float32Array(nb), bG = new Float32Array(nb), bB = new Float32Array(nb), x, y, X, Y;
    for (Y = 0; Y < bh; Y++) for (X = 0; X < bw; X++) {
      // percentil alto (no el máximo) para ignorar brillos y ruido
      var vals = [], idx = [];
      for (y = Y * F; y < Math.min(h, (Y + 1) * F); y += 2) for (x = X * F; x < Math.min(w, (X + 1) * F); x += 2) { var k = y * w + x; vals.push(L[k]); idx.push(k); }
      var orden = vals.map(function (v, t) { return t; }).sort(function (a, b) { return vals[a] - vals[b]; });
      var a0 = Math.floor(orden.length * 0.90), a1 = Math.max(a0 + 1, Math.floor(orden.length * 0.97)), sr = 0, sg = 0, sb = 0, sl = 0, c = 0;
      for (var t = a0; t < a1 && t < orden.length; t++) { var q = idx[orden[t]]; sr += R[q]; sg += G[q]; sb += B[q]; sl += L[q]; c++; }
      var b = Y * bw + X; c = c || 1; bL[b] = sl / c; bR[b] = sr / c; bG[b] = sg / c; bB[b] = sb / c;
    }
    // ¿Qué bloques son fotografía (la cara de la INE, un logotipo a color)? Ahí no se blanquea ni se fuerza el contraste.
    var dl = dilatar(bL, bw, bh, 2), foto = new Float32Array(nb);
    // color del papel "de referencia" en un radio grande (para comparar el tono de cada bloque)
    var RG = Math.max(4, Math.round(Math.min(bw, bh) / 5)), ref = maxIdx(bL, bw, bh, RG);
    for (Y = 0; Y < bh; Y++) for (X = 0; X < bw; X++) {
      // en un bloque de texto casi todo es papel (blanco); en una foto casi nada lo es
      var bi = Y * bw + X, pap = Math.max(30, dl[bi]), blanco = 0, cnt = 0, mr = 0, mg = 0, mb = 0, ri = ref[bi];
      for (y = Y * F; y < Math.min(h, (Y + 1) * F); y += 2) for (x = X * F; x < Math.min(w, (X + 1) * F); x += 2) {
        var kk = y * w + x; if (L[kk] / pap > 0.88) blanco++; cnt++;
        mr += R[kk]; mg += G[kk]; mb += B[kk];
      }
      cnt = Math.max(1, cnt);
      // color propio (piel, fondo de foto, ropa) comparado con el papel: las sombras no tienen color propio
      var cr = mr / cnt / Math.max(20, bR[ri]), cg = mg / cnt / Math.max(20, bG[ri]), cb2 = mb / cnt / Math.max(20, bB[ri]);
      var croma = Math.max(cr, cg, cb2) - Math.min(cr, cg, cb2), luz = (cr + cg + cb2) / 3;
      foto[bi] = Math.max(paso(0.25, 0.10, blanco / cnt), luz < 0.96 ? paso(0.10, 0.18, croma) : 0);
    }
    // un bloque aislado no es foto (puede ser un sello o una letra grande); una foto ocupa varios bloques juntos
    var fm = new Float32Array(nb);
    for (Y = 0; Y < bh; Y++) for (X = 0; X < bw; X++) {
      var vec = 0, tot = 0;
      for (var jy = -1; jy <= 1; jy++) for (var jx = -1; jx <= 1; jx++) { var yy2 = Y + jy, xx2 = X + jx; if (yy2 >= 0 && yy2 < bh && xx2 >= 0 && xx2 < bw) { vec += foto[yy2 * bw + xx2]; tot++; } }
      fm[Y * bw + X] = vec / tot > 0.55 ? 1 : 0;
    }
    fm = dilatar(fm, bw, bh, 1);
    // papel debajo de fotos y texto denso: se rellena con el papel de alrededor
    var lleno = new Uint8Array(nb), cola = [];
    for (i = 0; i < nb; i++) { if (fm[i] || bL[i] < dl[i] * 0.80) lleno[i] = 0; else { lleno[i] = 1; cola.push(i); } }
    if (!cola.length) { for (i = 0; i < nb; i++) lleno[i] = 1; }
    for (var qi = 0; qi < cola.length; qi++) {
      var cb = cola[qi], cx = cb % bw, cy = (cb / bw) | 0;
      [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (dv) {
        var nx = cx + dv[0], ny = cy + dv[1]; if (nx < 0 || ny < 0 || nx >= bw || ny >= bh) return;
        var nbk = ny * bw + nx; if (lleno[nbk]) return;
        lleno[nbk] = 1; bR[nbk] = bR[cb]; bG[nbk] = bG[cb]; bB[nbk] = bB[cb]; bL[nbk] = bL[cb]; cola.push(nbk);
      });
    }
    fm = cajaBlur(fm, bw, bh, 1);
    bR = cajaBlur(cajaBlur(bR, bw, bh, 2), bw, bh, 2); bG = cajaBlur(cajaBlur(bG, bw, bh, 2), bw, bh, 2); bB = cajaBlur(cajaBlur(bB, bw, bh, 2), bw, bh, 2);
    function fondo(arr, x, y) {
      var gx = Math.min(bw - 1.001, Math.max(0, (x + 0.5) / F - 0.5)), gy = Math.min(bh - 1.001, Math.max(0, (y + 0.5) / F - 0.5)), x0 = gx | 0, y0 = gy | 0, fx = gx - x0, fy = gy - y0;
      return (arr[y0 * bw + x0] * (1 - fx) + arr[y0 * bw + x0 + 1] * fx) * (1 - fy) + (arr[(y0 + 1) * bw + x0] * (1 - fx) + arr[(y0 + 1) * bw + x0 + 1] * fx) * fy;
    }
    // normalizar contra el papel
    var nl = new Float32Array(n);
    for (y = 0; y < h; y++) for (x = 0; x < w; x++) {
      i = y * w + x;
      R[i] = Math.min(1.25, R[i] / Math.max(30, fondo(bR, x, y)));
      G[i] = Math.min(1.25, G[i] / Math.max(30, fondo(bG, x, y)));
      B[i] = Math.min(1.25, B[i] / Math.max(30, fondo(bB, x, y)));
      nl[i] = 0.299 * R[i] + 0.587 * G[i] + 0.114 * B[i];
    }
    // enfoque de letras
    var rr = Math.max(1, Math.round(Math.max(w, h) / 900));
    var bl = cajaBlur(cajaBlur(nl, w, h, rr), w, h, rr), AMT = 1.1;
    for (i = 0, p = 0; i < n; i++, p += 4) {
      var fy2 = i / w | 0, mf = fondo(fm, i - fy2 * w, fy2);
      if (mf > 0.98) { // fotografía: solo se corrige la luz y se enfoca un poco
        var ds = 0.45 * (nl[i] - bl[i]);
        if (modo === 'gris') { O[p] = O[p + 1] = O[p + 2] = tono(nl[i] + ds, 0.02, 1.0, 1.0); }
        else { O[p] = tono(R[i] + ds, 0.02, 1.0, 1.0); O[p + 1] = tono(G[i] + ds, 0.02, 1.0, 1.0); O[p + 2] = tono(B[i] + ds, 0.02, 1.0, 1.0); }
        continue;
      }
      var d = AMT * (nl[i] - bl[i]), l = nl[i] + d;
      if (modo === 'gris') {
        O[p] = O[p + 1] = O[p + 2] = tono(l, 0.30, 0.84, 1.55);
      } else {
        var r = R[i] + d, g = G[i] + d, bb = B[i] + d, mx = Math.max(r, g, bb), mn = Math.min(r, g, bb);
        if (mx - mn < 0.16 || l > 0.82) { r = g = bb = l; }                      // tinta negra y papel: neutros
        else { var s = 1.35; r = l + (r - l) * s; g = l + (g - l) * s; bb = l + (bb - l) * s; } // sellos, firmas, logotipos: color vivo
        O[p] = tono(r, 0.20, 0.86, 1.35); O[p + 1] = tono(g, 0.20, 0.86, 1.35); O[p + 2] = tono(bb, 0.20, 0.86, 1.35);
      }
      if (mf > 0.02) { // borde de una foto: mezcla suave entre las dos versiones
        var ds2 = 0.45 * (nl[i] - bl[i]), sv = modo === 'gris' ? [nl[i], nl[i], nl[i]] : [R[i], G[i], B[i]];
        for (var ch = 0; ch < 3; ch++) O[p + ch] = Math.round(O[p + ch] * (1 - mf) + tono(sv[ch] + ds2, 0.02, 1.0, 1.0) * mf);
      }
    }
  }
  function paso(a, b, v) { var t = (v - a) / (b - a); return t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t); }
  // curva de documento: debajo de "negro" es negro, arriba de "blanco" es papel blanco puro
  function tono(v, negro, blanco, gamma) {
    var t = (v - negro) / (blanco - negro);
    if (t <= 0) return 0; if (t >= 1) return 255;
    return Math.round(255 * Math.pow(t, gamma));
  }
  function maxIdx(a, w, h, r) { // índice del valor máximo en un radio (separable: primero filas, luego columnas)
    var t = new Int32Array(a.length), o = new Int32Array(a.length), x, y, i, b;
    for (y = 0; y < h; y++) for (x = 0; x < w; x++) { b = y * w + x; for (i = Math.max(0, x - r); i <= Math.min(w - 1, x + r); i++) if (a[y * w + i] > a[b]) b = y * w + i; t[y * w + x] = b; }
    for (y = 0; y < h; y++) for (x = 0; x < w; x++) { b = t[y * w + x]; for (i = Math.max(0, y - r); i <= Math.min(h - 1, y + r); i++) { var c = t[i * w + x]; if (a[c] > a[b]) b = c; } o[y * w + x] = b; }
    return o;
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

  /* ---------- 3. Editor: recortar → revisar (girar, color / blanco y negro) ---------- */
  var MODOS = [['color', 'Color'], ['gris', 'Blanco y negro']];
  var ICO = {
    izq: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></svg>',
    der: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/></svg>',
    rec: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 2v14a2 2 0 0 0 2 2h14"/><path d="M18 22V8a2 2 0 0 0-2-2H2"/></svg>'
  };
  function rotar(src, rot) {
    if (!rot) return src;
    var g = rot % 180 !== 0, c = canvas(g ? src.height : src.width, g ? src.width : src.height), x = c.getContext('2d');
    x.translate(c.width / 2, c.height / 2); x.rotate(rot * Math.PI / 180); x.drawImage(src, -src.width / 2, -src.height / 2);
    return c;
  }
  function editor(img, inicial) {
    return new Promise(function (resolver) {
      var q = inicial.quad.map(function (p) { return p.slice(); }), modo = inicial.modo || 'color', rot = 0, paso = 'recorte', cache = {}, qCache = '';
      var W = img.naturalWidth || img.width, H = img.naturalHeight || img.height;
      var raiz = document.createElement('div'); raiz.className = 'scn'; raiz.setAttribute('role', 'dialog'); raiz.setAttribute('aria-modal', 'true'); raiz.setAttribute('aria-labelledby', 'scn-t');
      raiz.innerHTML =
        '<div class="scn-top"><div><p class="scn-pasos"><span data-p="recorte">1 Recortar</span><span data-p="revision">2 Revisar</span></p><p class="scn-t" id="scn-t"></p><p class="scn-s"></p><p class="scn-n"></p></div>' +
        '<button type="button" class="ib scn-x" aria-label="Cancelar"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg></button></div>' +
        '<div class="scn-stage"><div class="scn-box"><canvas class="scn-img"></canvas><svg class="scn-svg"></svg><canvas class="scn-lupa" width="120" height="120" hidden></canvas></div>' +
        '<div class="scn-rev" hidden><canvas class="scn-out"></canvas><div class="scn-wait" hidden><div class="scn-spin" aria-hidden="true"></div><span>Mejorando el escaneo…</span></div></div></div>' +
        '<div class="scn-bar">' +
          '<div class="scn-g scn-g1"><button type="button" class="btn btn-o scn-todo">Toda la foto</button><button type="button" class="btn btn-y scn-sig">Siguiente</button></div>' +
          '<div class="scn-g scn-g2" hidden>' +
            '<div class="scn-giro"><button type="button" class="scn-ic scn-izq" aria-label="Girar a la izquierda" title="Girar a la izquierda">' + ICO.izq + '</button><button type="button" class="scn-ic scn-der" aria-label="Girar a la derecha" title="Girar a la derecha">' + ICO.der + '</button></div>' +
            '<div class="scn-modos" role="radiogroup" aria-label="Tipo de escaneo"></div>' +
            '<div class="scn-acts"><button type="button" class="btn btn-o scn-volver">' + ICO.rec + 'Recortar</button><button type="button" class="btn btn-y scn-ok">Usar este escaneo</button></div>' +
          '</div>' +
        '</div>';
      document.body.appendChild(raiz); document.body.style.overflow = 'hidden';
      if (inicial.nota) raiz.querySelector('.scn-n').textContent = inicial.nota;
      var $ = function (s) { return raiz.querySelector(s); };
      var box = $('.scn-box'), cv = $('.scn-img'), svg = $('.scn-svg'), lupa = $('.scn-lupa'), rev = $('.scn-rev'), out = $('.scn-out'), espera = $('.scn-wait');
      var modosEl = $('.scn-modos');
      MODOS.forEach(function (m) {
        var b = document.createElement('button'); b.type = 'button'; b.textContent = m[1]; b.setAttribute('role', 'radio'); b.dataset.m = m[0];
        b.addEventListener('click', function () { if (modo === m[0]) return; modo = m[0]; pintarModos(); mostrarResultado(); }); modosEl.appendChild(b);
      });
      function pintarModos() { Array.prototype.forEach.call(modosEl.children, function (b) { b.setAttribute('aria-checked', b.dataset.m === modo ? 'true' : 'false'); }); }
      pintarModos();

      function textos() {
        $('.scn-t').textContent = paso === 'recorte' ? 'Recorte el documento' : 'Revise su escaneo';
        var s = $('.scn-s'); s.classList.remove('bad');
        s.textContent = paso === 'recorte' ? 'Arrastre los cuatro puntos a las esquinas de la hoja.' : 'Gírelo si quedó de lado y elija color o blanco y negro.';
        Array.prototype.forEach.call(raiz.querySelectorAll('.scn-pasos span'), function (e) { e.classList.toggle('on', e.dataset.p === paso); });
        box.hidden = paso !== 'recorte'; rev.hidden = paso !== 'revision';
        $('.scn-g1').hidden = paso !== 'recorte'; $('.scn-g2').hidden = paso !== 'revision';
      }

      /* --- paso 1: recorte --- */
      var esc = 1, dw = 0, dh = 0;
      function medir() {
        var st = $('.scn-stage'), mw = st.clientWidth - 34, mh = st.clientHeight - 34;
        if (paso === 'revision') { dibujarResultado(); return; }
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

      /* --- paso 2: revisión --- */
      function mostrarResultado() {
        var clave = JSON.stringify(q);
        if (clave !== qCache) { cache = {}; qCache = clave; }
        if (cache[modo]) { dibujarResultado(); return; }
        espera.hidden = false; $('.scn-ok').disabled = true;
        setTimeout(function () { // deja pintar el aviso antes del cálculo
          try { cache[modo] = procesar(img, q, modo); } catch (e) { cache[modo] = null; }
          espera.hidden = true; $('.scn-ok').disabled = false; dibujarResultado();
        }, 40);
      }
      function dibujarResultado() {
        var src = cache[modo]; if (!src) return;
        var st = $('.scn-stage'), mw = st.clientWidth - 34, mh = st.clientHeight - 34, g = rot % 180 !== 0;
        var sw = g ? src.height : src.width, sh = g ? src.width : src.height, e2 = Math.min(mw / sw, mh / sh);
        var vw = Math.round(sw * e2), vh = Math.round(sh * e2), dpr = Math.min(2, window.devicePixelRatio || 1);
        out.width = Math.round(vw * dpr); out.height = Math.round(vh * dpr); out.style.width = vw + 'px'; out.style.height = vh + 'px';
        var x = out.getContext('2d'); x.save(); x.translate(out.width / 2, out.height / 2); x.rotate(rot * Math.PI / 180);
        var a = g ? out.height : out.width, b = g ? out.width : out.height; x.drawImage(src, -a / 2, -b / 2, a, b); x.restore();
        rev.classList.remove('gira'); void rev.offsetWidth; rev.classList.add('gira');
      }
      function irA(p) { paso = p; textos(); if (p === 'revision') mostrarResultado(); else medir(); }
      $('.scn-izq').addEventListener('click', function () { rot = (rot + 270) % 360; dibujarResultado(); });
      $('.scn-der').addEventListener('click', function () { rot = (rot + 90) % 360; dibujarResultado(); });

      function cerrar(res) { window.removeEventListener('resize', medir); document.removeEventListener('keydown', escTecla); raiz.remove(); document.body.style.overflow = ''; resolver(res); }
      function escTecla(e) { if (e.key === 'Escape') cerrar(null); }
      document.addEventListener('keydown', escTecla);
      $('.scn-x').addEventListener('click', function () { cerrar(null); });
      $('.scn-todo').addEventListener('click', function () { q = [[0, 0], [W, 0], [W, H], [0, H]]; pintar(); });
      $('.scn-sig').addEventListener('click', function () {
        if (!convexo(q) || area(q) < W * H * 0.02) { var s = $('.scn-s'); s.textContent = 'Las esquinas se cruzaron. Acomódelas en orden alrededor de la hoja.'; s.classList.add('bad'); return; }
        irA('revision');
      });
      $('.scn-volver').addEventListener('click', function () { irA('recorte'); });
      $('.scn-ok').addEventListener('click', function () {
        var src = cache[modo]; if (!src) return;
        cerrar({ quad: q, modo: modo, canvas: rotar(src, rot) });
      });
      window.addEventListener('resize', medir);
      textos();
      requestAnimationFrame(medir);
      setTimeout(function () { $('.scn-sig').focus(); }, 50);
    });
  }

  window.GPScan = { detectar: detectar, procesar: procesar, editor: editor, rotar: rotar };
})();
