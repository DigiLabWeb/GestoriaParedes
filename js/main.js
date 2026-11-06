/* Gestoría Paredes — interacción del sitio (sin dependencias) */
(function () {
'use strict';
var WA = '529841156912';
var REQ = {
  primera: {
    es: { label: 'Licencia nueva', titulo: 'Licencia por primera vez', nota: 'Requisitos para licencia de automovilista. Las licencias de motociclista, chofer y servicio público pueden requerir documentos adicionales; se los indicamos al iniciar.' },
    en: { label: 'New license', titulo: 'First-time license', nota: 'List for a standard driver license. Motorcycle, chauffeur and public-service licenses may need extra documents: we tell you when we start.' },
    grupos: [{ es: '', en: '', items: [
      ['Solicitud de licencia de IMOVEQROO', 'IMOVEQROO license application'],
      ['CURP actualizada', 'Updated CURP'],
      ['INE o pasaporte vigente', 'Valid INE voter ID or passport'],
      ['Comprobante de domicilio (luz o agua) no mayor a 3 meses', 'Proof of address (power or water bill) under 3 months old'],
      ['Certificado de manejo de IMOVEQROO, del municipio o de una escuela acreditada', 'Driving certificate from IMOVEQROO, the municipality or an accredited school'],
      ['Certificado de examen de la vista de una dependencia municipal o un particular acreditado', 'Eye-exam certificate from a municipal office or an accredited provider']
    ] }]
  },
  renovacion: {
    es: { label: 'Renovar licencia', titulo: 'Renovación de licencia', nota: 'Para renovar la licencia de automovilista no se requieren los certificados de manejo ni de examen de la vista. Otros tipos de licencia pueden requerir documentos adicionales.' },
    en: { label: 'Renew license', titulo: 'License renewal', nota: 'Renewing a standard driver license does not require the driving or eye certificates. Other license types may need extra documents.' },
    grupos: [{ es: '', en: '', items: [
      ['Solicitud de licencia de IMOVEQROO', 'IMOVEQROO license application'],
      ['INE o pasaporte vigente', 'Valid INE voter ID or passport'],
      ['Comprobante de domicilio (luz o agua) no mayor a 3 meses', 'Proof of address (power or water bill) under 3 months old'],
      ['Licencia anterior en original', 'Your previous license (original)']
    ] }]
  },
  propietario: {
    es: { label: 'Cambio de propietario', titulo: 'Cambio de propietario', nota: 'Los vehículos importados, las placas extraviadas o las compras a nombre de una empresa requieren documentos adicionales; se los indicamos al iniciar.' },
    en: { label: 'Change of owner', titulo: 'Change of ownership', nota: 'Imported vehicles, lost plates or purchases by a company need extra documents: we tell you when we start.' },
    grupos: [
      { es: 'DEL VEHÍCULO', en: 'VEHICLE', items: [
        ['Tarjeta de circulación original', 'Original registration card'],
        ['Las dos placas (motocicleta: una)', 'Both plates (motorcycle: one)'],
        ['Factura original o carta factura', 'Original invoice or invoice letter'],
        ['Tenencias pagadas de los últimos 5 años, sin adeudos', 'Vehicle tax paid for the last 5 years, no debts'],
        ['El vehículo presente el día de la cita', 'The vehicle present on the appointment day']
      ] },
      { es: 'DEL VENDEDOR', en: 'SELLER', items: [
        ['INE vigente', 'Valid INE voter ID']
      ] },
      { es: 'DEL COMPRADOR', en: 'BUYER', items: [
        ['INE o pasaporte vigente', 'Valid INE voter ID or passport'],
        ['Licencia de conducir vigente', 'Valid driver license'],
        ['CURP y RFC', 'CURP and RFC'],
        ['Comprobante de domicilio a su nombre, no mayor a 60 días', 'Proof of address in your name, under 60 days old'],
        ['Teléfono y correo electrónico', 'Phone number and email']
      ] }
    ]
  }
};
var ORDER = ['primera', 'renovacion', 'propietario'];
var TXT = {
  es: {
    homeAria: 'Gestoría Paredes, inicio', descriptor: 'GESTORÍA Y TRAMITOLOGÍA', navAria: 'Principal', footNavAria: 'Pie de página',
    nav1: 'Servicios', nav2: 'Requisitos', nav3: 'Cómo funciona', nav4: 'Contacto',
    langAria: 'Idioma', themeAria: 'Cambiar entre modo oscuro y claro', menuOpen: 'Abrir menú', menuClose: 'Cerrar', menuLabel: 'Menú',
    heroAlt: 'Frente de un auto clásico amarillo con placa 595 AOK',
    h1a: 'Gestoría vehicular.', h1b: 'Trámites sin', h1c: 'hacer filas.',
    lead: 'Usted reúne sus documentos; nosotros nos encargamos de la cita, la gestión y el seguimiento.',
    topbar: 'Trámites vehiculares en Quintana Roo', s1: 'Licencias de conducir', s1sub: 'Motociclista · Automovilista · Chofer · Servicio público o privado', s2: 'Cambio de propietario', s2sub: 'Autos particulares · Tarjeta de circulación a su nombre', ctaNote: 'Atención personalizada de principio a fin.',
    pickLabel: '¿QUÉ NECESITA HOY?', tabPrimera: 'Licencia nueva', tabRenovacion: 'Renovar licencia', tabPropietario: 'Cambio de propietario',
    ctaWa: 'Iniciar trámite por WhatsApp', ctaCall: 'Llamar ahora', callShort: 'Llamar',
    svcTitle: 'Servicios', svcLead: 'Dos trámites, hechos con cuidado. Elija el suyo y vea al instante qué documentos necesita.',
    grpLic: 'LICENCIAS DE CONDUCIR', grpProp: 'CAMBIO DE PROPIETARIO', reqLink: 'Ver requisitos',
    propNombre: 'Autos particulares', propTexto: 'Actualización de la tarjeta de circulación a nombre del nuevo dueño.',
    band1Aria: 'Asesoría', band1: '¿No sabe qué tipo de licencia necesita? Le orientamos sin compromiso.', band1Cta: 'Consultar por WhatsApp',
    reqTitle: 'Requisitos', reqLead: 'Marque lo que ya tiene y envíenos su lista. Original y copia de cada documento.',
    tabsAria: 'Elegir trámite', expediente: 'SU EXPEDIENTE', sendList: 'Enviar mi lista por WhatsApp',
    procTitle: 'Cómo funciona', procLead: 'Cuatro pasos. Usted solo participa en el primero y el último.',
    testTitle: 'Lo que dicen nuestros clientes',
    contTitle: 'Contacto', contHook: 'Escríbanos o llámenos; con gusto le atendemos.', aSusOrdenes: 'A sus órdenes', telLabel: 'Llamadas y WhatsApp', waBubble: 'Escríbanos por WhatsApp', waTip: '¿Dudas? Escríbanos', horario: 'HORARIO', zona: 'ZONA', siganos: 'SÍGANOS',
    copy: 'Copiar número', copied: 'Copiado',
    formTitle: 'Déjenos sus datos', formLead: 'Le llamamos o le escribimos para iniciar su trámite.',
    fNombre: 'Nombre completo', fTel: 'Teléfono (10 dígitos)', fTramite: 'Trámite', fElija: 'Elija una opción', fMsg: 'Mensaje', opcional: '(opcional)',
    send: 'Enviar', sending: 'Enviando…', privacy: 'Sus datos se usan únicamente para contactarle sobre su trámite.',
    eNombre: 'Escriba su nombre.', eTel: 'Escriba un teléfono de 10 dígitos.', eTram: 'Elija el trámite que necesita.',
    failText: 'No pudimos enviar su mensaje. Revise su conexión e intente de nuevo, o', failLink: 'escríbanos por WhatsApp.',
    okTitle: 'Recibimos sus datos', okText: 'Le contactaremos pronto para iniciar su trámite. Si es urgente, escríbanos por WhatsApp.', okAgain: 'Enviar otro',
    toTop: 'Volver arriba', exitTitle: '¿Le quedó alguna duda?', exitText: 'Consulte por WhatsApp qué documentos requiere su caso, sin compromiso.',
    legal: 'Gestoría privada e independiente; no somos una dependencia de gobierno. Realizamos los trámites en su representación ante IMOVEQROO y SEFIPLAN. Los requisitos pueden cambiar: los confirmamos con usted antes de iniciar.',
    of: 'de', ready: 'listos', waHello: 'Hola, quiero iniciar este trámite: ', waHave: 'Ya tengo: ', waMiss: 'Me falta: ', waNone: 'ninguno',
    lic: [['Motociclista', 'Para conducir motocicleta, primera vez o renovación.'], ['Automovilista', 'Para su auto particular, primera vez o renovación.'], ['Chofer', 'Para quien conduce de manera profesional.'], ['Servicio público o privado', 'Para operar transporte de pasajeros o de carga.']],
    pasos: [['Contáctenos', 'Indíquenos qué trámite necesita.'], ['Revisamos sus documentos', 'Le confirmamos si falta alguno.'], ['Realizamos el trámite', 'Agendamos la cita y damos seguimiento.'], ['Reciba su documento', 'Le avisamos en cuanto esté listo.']],
    test: [['[Testimonio real de un cliente: qué trámite hizo y cómo le fue.]', '[Nombre del cliente]', '[Trámite realizado]'], ['[Testimonio real de un cliente.]', '[Nombre del cliente]', '[Trámite realizado]'], ['[Testimonio real de un cliente.]', '[Nombre del cliente]', '[Trámite realizado]']],
    ops: [['moto', 'Licencia de motociclista'], ['auto', 'Licencia de automovilista'], ['chofer', 'Licencia de chofer'], ['servicio', 'Licencia de servicio público o privado'], ['propietario', 'Cambio de propietario'], ['otro', 'Otro trámite o no estoy seguro']]
  },
  en: {
    homeAria: 'Gestoría Paredes, home', descriptor: 'VEHICLE PAPERWORK AGENCY', navAria: 'Main', footNavAria: 'Footer',
    nav1: 'Services', nav2: 'Requirements', nav3: 'How it works', nav4: 'Contact',
    langAria: 'Language', themeAria: 'Switch between dark and light mode', menuOpen: 'Open menu', menuClose: 'Close', menuLabel: 'Menu',
    heroAlt: 'Front of a yellow classic car with plate 595 AOK',
    h1a: 'Vehicle paperwork.', h1b: 'Done without', h1c: 'the lines.',
    lead: 'You gather your documents; we take care of the appointment, the filing and the follow-up.',
    topbar: 'Vehicle paperwork in Quintana Roo', s1: 'Driver licenses', s1sub: 'Motorcycle · Driver · Chauffeur · Public or private service', s2: 'Change of ownership', s2sub: 'Private cars · Registration card in your name', ctaNote: 'Personal service from start to finish.',
    pickLabel: 'WHAT DO YOU NEED TODAY?', tabPrimera: 'New license', tabRenovacion: 'Renew license', tabPropietario: 'Change of owner',
    ctaWa: 'Start on WhatsApp', ctaCall: 'Call now', callShort: 'Call',
    svcTitle: 'Services', svcLead: 'Two procedures, done with care. Pick yours and see right away which documents you need.',
    grpLic: 'DRIVER LICENSES', grpProp: 'CHANGE OF OWNERSHIP', reqLink: 'See requirements',
    propNombre: 'Private cars', propTexto: 'Registration card updated to the new owner’s name.',
    band1Aria: 'Advice', band1: 'Not sure which license you need? We will guide you, no commitment.', band1Cta: 'Ask on WhatsApp',
    reqTitle: 'Requirements', reqLead: 'Tick what you already have and send us your list. Original and copy of each document.',
    tabsAria: 'Choose a procedure', expediente: 'YOUR FILE', sendList: 'Send my list on WhatsApp',
    procTitle: 'How it works', procLead: 'Four steps. You only take part in the first and the last.',
    testTitle: 'What our clients say',
    contTitle: 'Contact', contHook: 'Message or call us; we will be glad to help.', aSusOrdenes: 'At your service', telLabel: 'Calls and WhatsApp', waBubble: 'Message us on WhatsApp', waTip: 'Questions? Message us', horario: 'HOURS', zona: 'AREA', siganos: 'FOLLOW US',
    copy: 'Copy number', copied: 'Copied',
    formTitle: 'Leave your details', formLead: 'We will call or message you to get started.',
    fNombre: 'Full name', fTel: 'Phone (10 digits)', fTramite: 'Procedure', fElija: 'Choose one', fMsg: 'Message', opcional: '(optional)',
    send: 'Send', sending: 'Sending…', privacy: 'We only use your details to contact you about your procedure.',
    eNombre: 'Enter your name.', eTel: 'Enter a 10-digit phone number.', eTram: 'Choose the procedure you need.',
    failText: 'We could not send your message. Check your connection and try again, or', failLink: 'message us on WhatsApp.',
    okTitle: 'We got your details', okText: 'We will contact you soon to start. If it is urgent, message us on WhatsApp.', okAgain: 'Send another',
    toTop: 'Back to top', exitTitle: 'Any questions left?', exitText: 'Ask on WhatsApp which documents your case needs. No commitment.',
    legal: 'Independent agency: we are not a government office. We file your paperwork on your behalf with IMOVEQROO and SEFIPLAN. Requirements can change; we confirm them with you before we start.',
    of: 'of', ready: 'ready', waHello: 'Hi, I want to start this procedure: ', waHave: 'I already have: ', waMiss: 'Missing: ', waNone: 'none',
    lic: [['Motorcycle', 'To ride a motorcycle, first time or renewal.'], ['Driver', 'For your private car, first time or renewal.'], ['Chauffeur', 'For people who drive for a living.'], ['Public or private service', 'To operate passenger or cargo transport.']],
    pasos: [['Contact us', 'Tell us which procedure you need.'], ['We review your documents', 'We confirm if anything is missing.'], ['We handle the procedure', 'We book the appointment and follow up.'], ['Receive your document', 'We let you know as soon as it is ready.']],
    test: [['[A real client testimonial: what they did and how it went.]', '[Client name]', '[Procedure]'], ['[A real client testimonial.]', '[Client name]', '[Procedure]'], ['[A real client testimonial.]', '[Client name]', '[Procedure]']],
    ops: [['moto', 'Motorcycle license'], ['auto', 'Driver license'], ['chofer', 'Chauffeur license'], ['servicio', 'Public or private service license'], ['propietario', 'Change of ownership'], ['otro', 'Other / not sure']]
  }
};


/* textos propios del sitio publicado (formulario a WhatsApp, pasos, enlaces legales) */
Object.assign(TXT.es, {
  skip: 'Saltar al contenido', privacyLink: 'Aviso de privacidad',
  formLead: 'Al continuar se abrirá WhatsApp con su mensaje listo.', send: 'Continuar en WhatsApp',
  privacy: 'Sus datos no se guardan en este sitio; solo se envían por WhatsApp.',
  okTitle: 'Su mensaje está listo', okText: 'Abrimos WhatsApp con sus datos. Solo presione enviar para iniciar su trámite.', okOpen: 'Abrir WhatsApp de nuevo',
  procLead: 'Usted solo participa al inicio y al final. Todo lo de en medio corre por nuestra cuenta.', legendYou: 'Lo hace usted', legendUs: 'Lo hacemos nosotros', whoYou: 'USTED', whoUs: 'NOSOTROS',
  toDark: 'Cambiar a modo oscuro', toLight: 'Cambiar a modo claro',
  p1t: 'Contáctenos', p1d: 'Escríbanos por WhatsApp o llámenos y díganos qué trámite necesita.', p2t: 'Revisamos sus documentos', p2d: 'Le confirmamos qué tiene completo y qué falta, antes de ir a cualquier oficina.',
  p3t: 'Realizamos el trámite', p3d: 'Agendamos la cita, hacemos la gestión y damos seguimiento ante la dependencia.', p4t: 'Reciba su documento', p4d: 'Le avisamos en cuanto su licencia o tarjeta de circulación esté lista.',
  waForm: 'Hola, quiero iniciar un trámite.', waNombre: 'Nombre: ', waTel: 'Teléfono: ', waTram: 'Trámite: ', waMsg: 'Mensaje: '
});
Object.assign(TXT.en, {
  skip: 'Skip to content', privacyLink: 'Privacy notice',
  formLead: 'When you continue, WhatsApp opens with your message ready.', send: 'Continue on WhatsApp',
  privacy: 'Your details are not stored on this site; they are only sent through WhatsApp.',
  okTitle: 'Your message is ready', okText: 'We opened WhatsApp with your details. Just press send to start your procedure.', okOpen: 'Open WhatsApp again',
  procLead: 'You only take part at the start and at the end. Everything in between is on us.', legendYou: 'You do it', legendUs: 'We do it', whoYou: 'YOU', whoUs: 'US',
  toDark: 'Switch to dark mode', toLight: 'Switch to light mode',
  p1t: 'Contact us', p1d: 'Message us on WhatsApp or call us and tell us which procedure you need.', p2t: 'We review your documents', p2d: 'We confirm what is complete and what is missing before going to any office.',
  p3t: 'We handle the procedure', p3d: 'We book the appointment, file the paperwork and follow up with the office.', p4t: 'Receive your document', p4d: 'We let you know as soon as your license or registration card is ready.',
  waForm: 'Hi, I want to start a procedure.', waNombre: 'Name: ', waTel: 'Phone: ', waTram: 'Procedure: ', waMsg: 'Message: '
});

var root = document.getElementById('gp');
var html = document.documentElement;
var store = {
  get: function (k, d) { try { return localStorage.getItem(k) || d; } catch (e) { return d; } },
  set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
};
var state = { lang: html.dataset.lang === 'en' ? 'en' : 'es', theme: html.dataset.theme === 'dark' ? 'dark' : 'light', tab: 'primera', checks: {} };
function T() { return TXT[state.lang]; }
function $(id) { return document.getElementById(id); }
function waUrl(text) { return 'https://wa.me/' + WA + (text ? '?text=' + encodeURIComponent(text) : ''); }

/* ---------- intro (solo la primera vez por sesión) ---------- */
if (html.dataset.intro === 'no') root.classList.add('nointro');
try { sessionStorage.setItem('gp-intro', '1'); } catch (e) {}

/* ---------- tema ---------- */
function applyTheme() {
  root.classList.toggle('dark', state.theme === 'dark');
  root.classList.toggle('light', state.theme === 'light');
  html.dataset.theme = state.theme;
  var fab = $('theme-fab'); if (fab) fab.setAttribute('aria-label', state.theme === 'dark' ? T().toLight : T().toDark);
}
$('theme-fab').addEventListener('click', function () { state.theme = state.theme === 'dark' ? 'light' : 'dark'; store.set('gp-theme', state.theme); applyTheme(); });
document.querySelectorAll('[data-toggle-theme]').forEach(function (b) {
  b.addEventListener('click', function () { state.theme = state.theme === 'dark' ? 'light' : 'dark'; store.set('gp-theme', state.theme); applyTheme(); });
});

/* ---------- idioma ---------- */
function applyLang() {
  var t = T();
  html.lang = state.lang;
  document.querySelectorAll('[data-i18n]').forEach(function (el) { var k = el.getAttribute('data-i18n'); if (t[k] != null) el.textContent = t[k]; });
  document.querySelectorAll('[data-i18n-aria]').forEach(function (el) { var k = el.getAttribute('data-i18n-aria'); if (t[k] != null) el.setAttribute('aria-label', t[k]); });
  document.querySelectorAll('[data-i18n-alt]').forEach(function (el) { var k = el.getAttribute('data-i18n-alt'); if (t[k] != null) el.setAttribute('alt', t[k]); });
  document.querySelectorAll('[data-set-lang]').forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-set-lang') === state.lang ? 'true' : 'false'); });
  fillOptions(); renderTabs(); renderReq(); refreshErrors(); applyTheme();
}
document.querySelectorAll('[data-set-lang]').forEach(function (b) {
  b.addEventListener('click', function () { state.lang = b.getAttribute('data-set-lang'); store.set('gp-lang', state.lang); applyLang(); });
});

/* ---------- menú móvil ---------- */
var menu = $('menu'), openBtn = $('menu-open');
function setMenu(open) {
  menu.hidden = !open; openBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
  document.body.classList.toggle('menu-open', open);
  if (open) $('menu-close').focus(); else openBtn.focus();
}
openBtn.addEventListener('click', function () { setMenu(true); });
$('menu-close').addEventListener('click', function () { setMenu(false); });
menu.querySelectorAll('[data-close-menu]').forEach(function (a) { a.addEventListener('click', function () { setMenu(false); }); });
document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { if (!menu.hidden) setMenu(false); $('exit').hidden = true; } });

/* ---------- requisitos ---------- */
var tabTimer;
function pickTab(id) {
  if (id === state.tab) return;
  state.tab = id; renderTabs();
  $('req-lista').hidden = true; $('req-skeleton').hidden = false;
  clearTimeout(tabTimer);
  tabTimer = setTimeout(function () { $('req-skeleton').hidden = true; $('req-lista').hidden = false; renderReq(); }, 380);
}
document.querySelectorAll('[data-go-tab]').forEach(function (a) { a.addEventListener('click', function () { pickTab(a.getAttribute('data-go-tab')); }); });
function renderTabs() {
  var box = $('tabs'); box.textContent = '';
  ORDER.forEach(function (id) {
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'tab'; b.textContent = REQ[id][state.lang].label;
    b.setAttribute('aria-pressed', id === state.tab ? 'true' : 'false');
    b.addEventListener('click', function () { pickTab(id); });
    box.appendChild(b);
  });
}
function renderReq() {
  var sel = REQ[state.tab], lang = state.lang, t = T(), n = 0, have = [], miss = [];
  var list = $('req-lista'); list.textContent = '';
  sel.grupos.forEach(function (g, gi) {
    var fs = document.createElement('fieldset'); fs.className = 'req-grupo';
    var titulo = lang === 'en' ? g.en : g.es;
    if (titulo) { var lg = document.createElement('legend'); lg.textContent = titulo; fs.appendChild(lg); }
    g.items.forEach(function (pair, ii) {
      n += 1;
      var key = state.tab + '-' + gi + '-' + ii, on = !!state.checks[key], text = lang === 'en' ? pair[1] : pair[0];
      (on ? have : miss).push(text);
      var lab = document.createElement('label'); lab.className = 'chk' + (on ? ' done' : '');
      var num = document.createElement('span'); num.className = 'n'; num.textContent = (n < 10 ? '0' : '') + n;
      var cb = document.createElement('input'); cb.type = 'checkbox'; cb.checked = on;
      cb.addEventListener('change', function () { state.checks[key] = cb.checked; renderReq(); });
      var tx = document.createElement('span'); tx.className = 'tx'; tx.textContent = text;
      lab.appendChild(num); lab.appendChild(cb); lab.appendChild(tx); fs.appendChild(lab);
    });
    list.appendChild(fs);
  });
  $('req-titulo').textContent = sel[lang].titulo;
  $('req-nota').textContent = sel[lang].nota;
  $('req-progreso').textContent = have.length + ' ' + t.of + ' ' + n + ' ' + t.ready;
  $('req-barra').style.width = Math.round(have.length / n * 100) + '%';
  var msg = t.waHello + sel[lang].titulo + '. ' + t.waHave + (have.length ? have.join('; ') : t.waNone) + '. ' + t.waMiss + (miss.length ? miss.join('; ') : t.waNone) + '.';
  $('req-wa').href = waUrl(msg);
}

/* ---------- formulario → WhatsApp ---------- */
var form = $('form'), touched = {}, submitted = false;
var F = { nombre: $('f-nombre'), tel: $('f-tel'), tram: $('f-tramite'), msg: $('f-msg') };
function fillOptions() {
  var t = T(), cur = F.tram.value; F.tram.textContent = '';
  var o0 = document.createElement('option'); o0.value = ''; o0.textContent = t.fElija; F.tram.appendChild(o0);
  t.ops.forEach(function (o) { var op = document.createElement('option'); op.value = o[0]; op.textContent = o[1]; F.tram.appendChild(op); });
  F.tram.value = cur;
}
function errors() {
  var t = T(), e = {};
  if (F.nombre.value.trim().length < 2) e.nombre = t.eNombre;
  if (F.tel.value.replace(/\D/g, '').length !== 10) e.tel = t.eTel;
  if (!F.tram.value) e.tram = t.eTram;
  return e;
}
function showErr(field, id, msg) {
  var el = $(id), show = !!msg && (submitted || touched[field]);
  el.hidden = !show; el.textContent = show ? msg : '';
  F[field].setAttribute('aria-invalid', show ? 'true' : 'false');
}
function refreshErrors() {
  var e = errors();
  showErr('nombre', 'e-nombre', e.nombre); showErr('tel', 'e-tel', e.tel); showErr('tram', 'e-tramite', e.tram);
  return e;
}
[['nombre', 'blur'], ['tel', 'blur'], ['tram', 'blur'], ['tram', 'change']].forEach(function (p) {
  F[p[0]].addEventListener(p[1], function () { touched[p[0]] = true; refreshErrors(); });
});
['nombre', 'tel'].forEach(function (k) { F[k].addEventListener('input', function () { if (touched[k] || submitted) refreshErrors(); }); });
form.addEventListener('submit', function (ev) {
  ev.preventDefault(); submitted = true;
  var e = refreshErrors();
  if (Object.keys(e).length) { var first = e.nombre ? F.nombre : e.tel ? F.tel : F.tram; first.focus(); return; }
  var t = T(), tramTxt = F.tram.options[F.tram.selectedIndex].textContent;
  var lines = [t.waForm, t.waNombre + F.nombre.value.trim(), t.waTel + F.tel.value.trim(), t.waTram + tramTxt];
  if (F.msg.value.trim()) lines.push(t.waMsg + F.msg.value.trim());
  var url = waUrl(lines.join('\n'));
  $('form-wa').href = url;
  window.open(url, '_blank', 'noopener');
  form.hidden = true; $('form-ok').hidden = false; $('form-ok').focus && $('form-ok').setAttribute('tabindex', '-1'); $('form-ok').focus();
  $('exit').hidden = true; exitDone = true;
});
$('form-reset').addEventListener('click', function () {
  form.reset(); touched = {}; submitted = false; refreshErrors();
  $('form-ok').hidden = true; form.hidden = false; F.nombre.focus();
});

/* ---------- volver arriba ---------- */
var totop = $('totop');
window.addEventListener('scroll', function () { totop.hidden = window.scrollY < 700; }, { passive: true });
totop.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: 'smooth' }); $('inicio').setAttribute('tabindex', '-1'); $('inicio').focus({ preventScroll: true }); });

/* ---------- aviso al intentar salir (solo escritorio, una vez) ---------- */
var exitDone = false;
try { exitDone = !!sessionStorage.getItem('gp-exit'); } catch (e) {}
document.addEventListener('mouseleave', function (e) {
  if (e.clientY > 0 || exitDone || window.matchMedia('(max-width: 900px)').matches) return;
  exitDone = true; try { sessionStorage.setItem('gp-exit', '1'); } catch (er) {}
  $('exit').hidden = false;
});
$('exit-close').addEventListener('click', function () { $('exit').hidden = true; });

/* ---------- inicio ---------- */
var y = $('year'); if (y) y.textContent = new Date().getFullYear();
applyTheme(); applyLang();
})();
