/**
 * Gestoría Paredes — Servidor del sitio (Google Apps Script)
 *
 * 1. Turnos de WhatsApp entre los dos números (hoja "Clientes").
 * 2. Recepción de expedientes en PDF (carpeta de Drive + hoja "Expedientes").
 * 3. Panel de administrador: inicio de sesión, lista, ver, descargar, editar y borrar expedientes.
 *
 * Las contraseñas no se guardan en texto: solo su huella (SHA-256 con sal).
 */

var HOJA = 'Clientes';
var HOJA_EXP = 'Expedientes';
var CARPETA = 'Gestoría Paredes — Expedientes';
var NUMEROS = ['529841297165', '529842021770'];
var ETIQUETAS = ['984 129 7165', '984 202 1770'];
var MAX_MB = 25;

var USUARIOS = [
  { usuario: 'tapia', nombre: 'Justino Tapia', sal: 'af88f632973f3fac', huella: 'bb68ec86acb865554ed39e08fc80d3670dea98fab3fd92410f4029b0c9cf83ed' },
  { usuario: 'justino tapia', nombre: 'Justino Tapia', sal: 'af88f632973f3fac', huella: 'bb68ec86acb865554ed39e08fc80d3670dea98fab3fd92410f4029b0c9cf83ed' },
  { usuario: 'tomas', nombre: 'Tomás Paredes', sal: '295021d04519d534', huella: '151908fed74120a3641c91baafb4ea6c7c879ca7e688b3ea213f391a07aa58af' },
  { usuario: 'tomas paredes', nombre: 'Tomás Paredes', sal: '295021d04519d534', huella: '151908fed74120a3641c91baafb4ea6c7c879ca7e688b3ea213f391a07aa58af' },
  { usuario: 'gael', nombre: 'Gael', sal: '5352212634773397', huella: '2628705ffb1ae215c404b37eea72893c216ca23853b36de430da62cf4927487b' }
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
    else if (b.a === 'editar') res = editar_(b);
    else if (b.a === 'borrar') res = borrar_(b);
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
    var folio = nuevoFolio_(), ahora = new Date();
    var doc = docNombre_(nombre, tramite, ahora);
    var archivo = carpeta_().createFile(Utilities.newBlob(bytes, 'application/pdf', doc));
    hojaExp_().appendRow([
      ahora, folio, limpio_(nombre), "'" + tel, limpio_(tramite), ETIQUETAS[ag],
      parseInt(b.paginas, 10) || '', Math.round(bytes.length / 1024), archivo.getId(), 'Nuevo', limpio_(doc)
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
    var v = h.getRange(2, 1, filas, 11).getValues();
    for (var i = v.length - 1; i >= 0; i--) {
      var r = v[i];
      exp.push({
        fecha: r[0] instanceof Date ? r[0].getTime() : String(r[0]),
        folio: String(r[1]), nombre: String(r[2]), tel: String(r[3]).replace(/\D/g, ''),
        tramite: String(r[4]), atiende: String(r[5]), paginas: r[6], kb: r[7], estado: String(r[9] || ''), doc: String(r[10] || '')
      });
    }
  }
  return { ok: true, usuario: usr.nombre, expedientes: exp, reparto: reparto_(), estados: ESTADOS };
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
  var v = h.getRange(2, 1, filas, 11).getValues();
  for (var i = v.length - 1; i >= 0; i--) {
    if (String(v[i][1]) !== folio) continue;
    var archivo;
    try { archivo = DriveApp.getFileById(String(v[i][8])); } catch (e) { return { ok: false, error: 'El archivo ya no está en Drive.' }; }
    if (String(v[i][9]) === 'Nuevo') h.getRange(i + 2, 10).setValue('En revisión');
    return { ok: true, folio: folio, archivo: String(v[i][10] || '') || archivo.getName(), b64: Utilities.base64Encode(archivo.getBlob().getBytes()) };
  }
  return { ok: false, error: 'No existe ese folio.' };
}

var ESTADOS = ['Nuevo', 'En revisión', 'Falta documentación', 'En trámite', 'Terminado'];

/** Busca la fila (número de fila en la hoja) de un folio. */
function filaFolio_(h, folio) {
  var filas = h.getLastRow() - 1;
  if (filas < 1) return -1;
  var v = h.getRange(2, 2, filas, 1).getValues();
  for (var i = v.length - 1; i >= 0; i--) if (String(v[i][0]) === folio) return i + 2;
  return -1;
}

/** Cambia nombre del cliente, teléfono, trámite, estado o nombre del documento; el archivo en Drive se renombra igual. */
function editar_(b) {
  var usr = verificar_(b.token);
  if (!usr) return { ok: false, sesion: false, error: 'Su sesión terminó. Entre de nuevo.' };
  var folio = String(b.folio || '');
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var h = hojaExp_(), fila = filaFolio_(h, folio);
    if (fila < 0) return { ok: false, error: 'No existe ese folio.' };
    var r = h.getRange(fila, 1, 1, 11).getValues()[0];
    var nombre = b.nombre != null ? String(b.nombre).trim() : String(r[2]);
    var tramite = b.tramite != null ? String(b.tramite).trim() : String(r[4]);
    var tel = b.tel != null ? tel10_(b.tel) : String(r[3]).replace(/\D/g, '');
    var estado = b.estado != null ? String(b.estado) : String(r[9]);
    if (nombre.length < 2) return { ok: false, error: 'El nombre es muy corto.' };
    if (!tramite) return { ok: false, error: 'Falta el trámite.' };
    if (tel && tel.length !== 10) return { ok: false, error: 'El teléfono debe tener 10 dígitos.' };
    if (b.estado != null && ESTADOS.indexOf(estado) < 0) return { ok: false, error: 'Estado no válido.' };
    h.getRange(fila, 3).setValue(limpio_(nombre));
    h.getRange(fila, 4).setValue(tel ? "'" + tel : '');
    h.getRange(fila, 5).setValue(limpio_(tramite));
    h.getRange(fila, 10).setValue(estado);
    // Nombre del documento: el que escriba el administrador, o Nombre - Trámite - fecha
    var doc = b.doc != null && String(b.doc).trim() ? nombreArchivo_(b.doc) : docNombre_(nombre, tramite, r[0] instanceof Date ? r[0] : new Date());
    if (!doc) return { ok: false, error: 'Escriba un nombre para el documento.' };
    h.getRange(fila, 11).setValue(limpio_(doc));
    try { DriveApp.getFileById(String(r[8])).setName(doc); } catch (e) {}
    return { ok: true, folio: folio, nombre: nombre, tel: tel, tramite: tramite, estado: estado, doc: doc };
  } finally {
    lock.releaseLock();
  }
}

/** Manda el PDF a la papelera de Drive (se puede recuperar 30 días) y quita el expediente de la lista. */
function borrar_(b) {
  var usr = verificar_(b.token);
  if (!usr) return { ok: false, sesion: false, error: 'Su sesión terminó. Entre de nuevo.' };
  var folio = String(b.folio || '');
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var h = hojaExp_(), fila = filaFolio_(h, folio);
    if (fila < 0) return { ok: false, error: 'No existe ese folio.' };
    var id = String(h.getRange(fila, 9).getValue());
    try { DriveApp.getFileById(id).setTrashed(true); } catch (e) {}
    h.deleteRow(fila);
    return { ok: true, folio: folio };
  } finally {
    lock.releaseLock();
  }
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
    h.appendRow(['Fecha', 'Folio', 'Nombre', 'Teléfono', 'Trámite', 'Atiende', 'Páginas', 'Tamaño (KB)', 'Archivo (Drive)', 'Estado', 'Documento']);
    h.setFrozenRows(1);
    h.getRange('A1:K1').setFontWeight('bold');
  } else if (!h.getRange(1, 11).getValue()) {
    h.getRange(1, 11).setValue('Documento').setFontWeight('bold');
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

/** Nombre del PDF: Nombre - Trámite - 12-nov-26.pdf */
function docNombre_(nombre, tramite, fecha) {
  return nombreArchivo_(String(nombre).slice(0, 60) + ' - ' + String(tramite).slice(0, 50) + ' - ' + fechaCorta_(fecha));
}

/** Quita caracteres no válidos para un archivo y asegura la terminación .pdf */
function nombreArchivo_(s) {
  s = String(s || '').replace(/\.pdf$/i, '').replace(/[\\\/:*?"<>|#%{}~]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 150);
  return s ? s + '.pdf' : '';
}

/** Fecha abreviada: 12-nov-26 */
function fechaCorta_(d) {
  var m = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'], z = 'America/Cancun';
  return Utilities.formatDate(d, z, 'dd') + '-' + m[parseInt(Utilities.formatDate(d, z, 'M'), 10) - 1] + '-' + Utilities.formatDate(d, z, 'yy');
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
