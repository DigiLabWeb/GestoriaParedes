/**
 * Gestoría Paredes — Servidor del sitio (Google Apps Script)
 *
 * 1. Turnos de WhatsApp entre los dos números (hoja "Clientes").
 * 2. Recepción de expedientes en PDF (carpeta de Drive + hoja "Expedientes").
 * 3. Panel de administrador: inicio de sesión, lista de expedientes, ver y descargar PDF.
 *
 * Las contraseñas no se guardan en texto: solo su huella (SHA-256 con sal).
 */

var HOJA = 'Clientes';
var HOJA_EXP = 'Expedientes';
var CARPETA = 'Gestoría Paredes — Expedientes';
var NUMEROS = ['529841156912', '529842021770'];
var ETIQUETAS = ['984 115 6912', '984 202 1770'];
var MAX_MB = 25;

var USUARIOS = [
  { usuario: 'tomas paredes', nombre: 'Tomás Paredes', sal: '8be6b209d55f46af', huella: '04b1d9f6f225937eb3c8ee9ab5ba57a1d8cc369455e736fe9f9297567b52f2e6' },
  { usuario: 'justino tapia', nombre: 'Justino Tapia', sal: '19e23e32e4006f5b', huella: 'ac8798a1954dccce89a1661b1ce27eb511334256c94cf7c03c7b2f2a7a722037' }
];
var HORAS_SESION = 12;

/* ===================== Entradas ===================== */

function doGet(e) {
  var p = (e && e.parameter) || {};
  var res;
  try {
    if (p.a === 'registro') res = registrar_(p);
    else res = turno_(p);
  } catch (err) {
    res = { ok: false, error: String(err && err.message || err) };
  }
  return json_(res);
}

function doPost(e) {
  var res;
  try {
    var b = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (b.a === 'subir') res = subir_(b);
    else if (b.a === 'login') res = login_(b);
    else if (b.a === 'lista') res = lista_(b);
    else if (b.a === 'pdf') res = pdf_(b);
    else res = { ok: false, error: 'Acción no válida' };
  } catch (err) {
    res = { ok: false, error: String(err && err.message || err) };
  }
  return json_(res);
}

function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

/* ===================== Turnos ===================== */

/** Devuelve a qué número le toca: el mismo de antes si el cliente ya escribió, si no el del turno. */
function turno_(p) {
  var tel = tel10_(p.t);
  var previo = buscar_(tel, p.d);
  if (previo >= 0) return { ok: true, n: previo, fijo: true };
  return { ok: true, n: siguiente_(), fijo: false };
}

/** Anota el contacto y, si es un cliente nuevo, pasa el turno al otro número. */
function registrar_(p) {
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var ag = parseInt(p.ag, 10);
    if (ag !== 0 && ag !== 1) ag = siguiente_();
    var tel = tel10_(p.t);
    var nuevo = p.nuevo === '1' && buscar_(tel, p.d) < 0;
    if (nuevo) pasarTurno_(ag);
    anotarCliente_(ag, p.n, tel, p.tr, nuevo, p.o, p.d);
    return { ok: true, n: ag };
  } finally {
    lock.releaseLock();
  }
}

function siguiente_() {
  var v = PropertiesService.getScriptProperties().getProperty('turno');
  return v === '1' ? 1 : 0;
}

function pasarTurno_(ag) {
  PropertiesService.getScriptProperties().setProperty('turno', String(1 - ag));
}

function anotarCliente_(ag, nombre, tel, tramite, nuevo, origen, dev) {
  hoja_().appendRow([
    new Date(),
    ETIQUETAS[ag],
    limpio_(nombre),
    tel ? "'" + tel : '',
    limpio_(tramite),
    nuevo ? 'Cliente nuevo' : 'Ya había escrito',
    limpio_(origen),
    limpio_(dev)
  ]);
}

/** Busca, del más reciente al más antiguo, el número que atendió a ese teléfono o dispositivo. */
function buscar_(tel, dev) {
  var h = hoja_(), filas = h.getLastRow() - 1;
  if (filas < 1) return -1;
  var v = h.getRange(2, 2, filas, 7).getValues(); // B: atiende … H: dispositivo
  var i, porDev = -1;
  for (i = v.length - 1; i >= 0; i--) {
    var ag = ETIQUETAS.indexOf(String(v[i][0]));
    if (ag < 0) continue;
    if (tel && String(v[i][2]).replace(/\D/g, '').slice(-10) === tel) return ag;
    if (porDev < 0 && dev && String(v[i][6]) === String(dev)) porDev = ag;
  }
  return porDev;
}

/* ===================== Expedientes ===================== */

function subir_(b) {
  var nombre = String(b.nombre || '').trim();
  var tel = tel10_(b.tel);
  var tramite = String(b.tramite || '').trim();
  if (nombre.length < 2) return { ok: false, error: 'Falta el nombre.' };
  if (tel.length !== 10) return { ok: false, error: 'El teléfono debe tener 10 dígitos.' };
  if (!tramite) return { ok: false, error: 'Falta el trámite.' };
  var b64 = String(b.pdf || '');
  if (!b64) return { ok: false, error: 'No llegó el PDF.' };
  if (b64.length > MAX_MB * 1024 * 1024 * 4 / 3) return { ok: false, error: 'El PDF pasa de ' + MAX_MB + ' MB.' };
  var bytes = Utilities.base64Decode(b64);
  if (bytes.length < 5 || bytes[0] !== 37 || bytes[1] !== 80 || bytes[2] !== 68 || bytes[3] !== 70) return { ok: false, error: 'El archivo no es un PDF.' };

  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var ag = buscar_(tel, b.d), nuevo = false;
    if (ag < 0) { ag = siguiente_(); nuevo = true; pasarTurno_(ag); }
    var folio = nuevoFolio_();
    var archivo = carpeta_().createFile(Utilities.newBlob(bytes, 'application/pdf', folio + ' - ' + nombre.slice(0, 60) + ' - ' + tramite.slice(0, 40) + '.pdf'));
    hojaExp_().appendRow([
      new Date(), folio, limpio_(nombre), "'" + tel, limpio_(tramite), ETIQUETAS[ag],
      parseInt(b.paginas, 10) || '', Math.round(bytes.length / 1024), archivo.getId(), 'Nuevo'
    ]);
    anotarCliente_(ag, nombre, tel, tramite, nuevo, 'documentos', b.d);
    return { ok: true, folio: folio, n: ag, numero: NUMEROS[ag] };
  } finally {
    lock.releaseLock();
  }
}

function nuevoFolio_() {
  var pr = PropertiesService.getScriptProperties();
  var n = (parseInt(pr.getProperty('folio'), 10) || 0) + 1;
  pr.setProperty('folio', String(n));
  return 'GP-' + ('0000' + n).slice(-4);
}

/* ===================== Panel de administrador ===================== */

function login_(b) {
  var u = normUsuario_(b.u);
  var cache = CacheService.getScriptCache();
  var kFallos = 'fallos:' + u;
  var fallos = parseInt(cache.get(kFallos), 10) || 0;
  if (fallos >= 5) return { ok: false, error: 'Demasiados intentos. Espere 15 minutos.' };
  var usr = null;
  for (var i = 0; i < USUARIOS.length; i++) if (USUARIOS[i].usuario === u) usr = USUARIOS[i];
  var p = String(b.p || '').normalize('NFC');
  if (!usr || sha256_(usr.sal + ':' + p) !== usr.huella) {
    cache.put(kFallos, String(fallos + 1), 900);
    return { ok: false, error: 'Usuario o contraseña incorrectos.' };
  }
  cache.remove(kFallos);
  var exp = Date.now() + HORAS_SESION * 3600 * 1000;
  return { ok: true, token: firmar_(usr.usuario + '|' + exp), nombre: usr.nombre, vence: exp };
}

function lista_(b) {
  var usr = verificar_(b.token);
  if (!usr) return { ok: false, sesion: false, error: 'Su sesión terminó. Entre de nuevo.' };
  var h = hojaExp_(), filas = h.getLastRow() - 1, exp = [];
  if (filas > 0) {
    var v = h.getRange(2, 1, filas, 10).getValues();
    for (var i = v.length - 1; i >= 0; i--) {
      var r = v[i];
      exp.push({
        fecha: r[0] instanceof Date ? r[0].getTime() : String(r[0]),
        folio: String(r[1]), nombre: String(r[2]), tel: String(r[3]).replace(/\D/g, ''),
        tramite: String(r[4]), atiende: String(r[5]), paginas: r[6], kb: r[7], estado: String(r[9] || '')
      });
    }
  }
  return { ok: true, usuario: usr.nombre, expedientes: exp, reparto: reparto_() };
}

/** Cuántos clientes nuevos le tocaron a cada número, y los últimos asignados. */
function reparto_() {
  var h = hoja_(), filas = h.getLastRow() - 1;
  var total = [0, 0], ultimos = [];
  if (filas > 0) {
    var v = h.getRange(2, 1, filas, 6).getValues();
    for (var i = 0; i < v.length; i++) {
      if (String(v[i][5]) !== 'Cliente nuevo') continue;
      var ag = ETIQUETAS.indexOf(String(v[i][1]));
      if (ag < 0) continue;
      total[ag]++;
      ultimos.push(ag);
    }
  }
  return { etiquetas: ETIQUETAS, total: total, ultimos: ultimos.slice(-12), siguiente: siguiente_() };
}

function pdf_(b) {
  var usr = verificar_(b.token);
  if (!usr) return { ok: false, sesion: false, error: 'Su sesión terminó. Entre de nuevo.' };
  var folio = String(b.folio || '');
  var h = hojaExp_(), filas = h.getLastRow() - 1;
  if (filas < 1) return { ok: false, error: 'No existe ese folio.' };
  var v = h.getRange(2, 1, filas, 10).getValues();
  for (var i = v.length - 1; i >= 0; i--) {
    if (String(v[i][1]) !== folio) continue;
    var archivo = DriveApp.getFileById(String(v[i][8]));
    if (String(v[i][9]) === 'Nuevo') h.getRange(i + 2, 10).setValue('Visto por ' + usr.nombre);
    return { ok: true, folio: folio, archivo: archivo.getName(), b64: Utilities.base64Encode(archivo.getBlob().getBytes()) };
  }
  return { ok: false, error: 'No existe ese folio.' };
}

/* ===================== Sesión ===================== */

function secreto_() {
  var pr = PropertiesService.getScriptProperties();
  var s = pr.getProperty('secreto');
  if (!s) { s = Utilities.getUuid() + Utilities.getUuid(); pr.setProperty('secreto', s); }
  return s;
}

function firmar_(datos) {
  var firma = Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature(datos, secreto_()));
  return Utilities.base64EncodeWebSafe(datos) + '.' + firma;
}

function verificar_(token) {
  token = String(token || '');
  var partes = token.split('.');
  if (partes.length !== 2) return null;
  var datos;
  try { datos = Utilities.newBlob(Utilities.base64DecodeWebSafe(partes[0])).getDataAsString(); } catch (e) { return null; }
  if (firmar_(datos) !== token) return null;
  var d = datos.split('|');
  if (Number(d[1]) < Date.now()) return null;
  for (var i = 0; i < USUARIOS.length; i++) if (USUARIOS[i].usuario === d[0]) return USUARIOS[i];
  return null;
}

/* ===================== Utilidades ===================== */

function hoja_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var h = ss.getSheetByName(HOJA);
  if (!h) {
    h = ss.insertSheet(HOJA);
    h.appendRow(['Fecha', 'Atiende', 'Nombre', 'Teléfono', 'Trámite', 'Tipo', 'Origen', 'Dispositivo']);
    h.setFrozenRows(1);
    h.getRange('A1:H1').setFontWeight('bold');
  }
  return h;
}

function hojaExp_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var h = ss.getSheetByName(HOJA_EXP);
  if (!h) {
    h = ss.insertSheet(HOJA_EXP);
    h.appendRow(['Fecha', 'Folio', 'Nombre', 'Teléfono', 'Trámite', 'Atiende', 'Páginas', 'Tamaño (KB)', 'Archivo (Drive)', 'Estado']);
    h.setFrozenRows(1);
    h.getRange('A1:J1').setFontWeight('bold');
  }
  return h;
}

function carpeta_() {
  var pr = PropertiesService.getScriptProperties();
  var id = pr.getProperty('carpeta');
  if (id) { try { return DriveApp.getFolderById(id); } catch (e) {} }
  var it = DriveApp.getFoldersByName(CARPETA);
  var c = it.hasNext() ? it.next() : DriveApp.createFolder(CARPETA);
  pr.setProperty('carpeta', c.getId());
  return c;
}

function sha256_(s) {
  var d = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, s, Utilities.Charset.UTF_8);
  return d.map(function (b) { return ('0' + ((b + 256) % 256).toString(16)).slice(-2); }).join('');
}

function normUsuario_(u) {
  return String(u || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z ]/g, '').replace(/\s+/g, ' ').trim();
}

function tel10_(t) { return String(t || '').replace(/\D/g, '').slice(-10); }

/** Evita que un texto se interprete como fórmula y limita su largo. */
function limpio_(s) {
  s = String(s || '').slice(0, 120);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

/** Ejecútela desde el editor para crear las hojas y la carpeta, y autorizar el script. */
function prueba() {
  hoja_();
  hojaExp_();
  carpeta_();
  secreto_();
  Logger.log(JSON.stringify(turno_({})));
}
