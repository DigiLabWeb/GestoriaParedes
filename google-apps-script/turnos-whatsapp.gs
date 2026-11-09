/**
 * Gestoría Paredes — Turnos de WhatsApp (Google Apps Script)
 *
 * Lleva el turno entre los dos números y registra cada cliente en la hoja "Clientes".
 * Instalación: ver README.md, sección "WhatsApp por turnos".
 */

var HOJA = 'Clientes';
var NUMEROS = ['529841156912', '529842021770'];
var ETIQUETAS = ['984 115 6912', '984 202 1770'];

function doGet(e) {
  var p = (e && e.parameter) || {};
  var res;
  try {
    if (p.a === 'registro') res = registrar_(p);
    else res = turno_(p);
  } catch (err) {
    res = { ok: false, error: String(err) };
  }
  return ContentService.createTextOutput(JSON.stringify(res)).setMimeType(ContentService.MimeType.JSON);
}

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
    if (p.nuevo === '1' && buscar_(tel, p.d) < 0) {
      PropertiesService.getScriptProperties().setProperty('turno', String(1 - ag));
    }
    hoja_().appendRow([
      new Date(),
      ETIQUETAS[ag],
      limpio_(p.n),
      tel ? "'" + tel : '',
      limpio_(p.tr),
      p.nuevo === '1' ? 'Cliente nuevo' : 'Ya había escrito',
      limpio_(p.o),
      limpio_(p.d)
    ]);
    return { ok: true, n: ag };
  } finally {
    lock.releaseLock();
  }
}

function siguiente_() {
  var v = PropertiesService.getScriptProperties().getProperty('turno');
  return v === '1' ? 1 : 0;
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

function tel10_(t) { return String(t || '').replace(/\D/g, '').slice(-10); }

/** Evita que un texto se interprete como fórmula y limita su largo. */
function limpio_(s) {
  s = String(s || '').slice(0, 120);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

/** Ejecútela una vez desde el editor para crear la hoja y autorizar el script. */
function prueba() {
  hoja_();
  Logger.log(JSON.stringify(turno_({})));
}
