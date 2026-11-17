/* Gestoría Paredes — interacción del sitio (sin dependencias) */
(function () {
'use strict';
var WA = (window.GP_CONFIG && window.GP_CONFIG.numeros[0]) || '529841297165';
var REQ = window.GP_REQ;
var ORDER = window.GP_REQ_ORDER;
var TXT = window.GP_TXT;
/* Textos y requisitos editados desde el panel (los aplica js/contenido.js) */
function mezclarTextos() { var o = window.GP_TEXTOS; if (!o) return; ['es', 'en'].forEach(function (l) { if (o[l]) Object.keys(o[l]).forEach(function (k) { if (o[l][k]) TXT[l][k] = o[l][k]; }); }); }
mezclarTextos();

var root = document.getElementById('gp');
var html = document.documentElement;
var store = {
  get: function (k, d) { try { return localStorage.getItem(k) || d; } catch (e) { return d; } },
  set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
};
var state = { lang: html.dataset.lang === 'en' ? 'en' : 'es', theme: html.dataset.theme === 'dark' ? 'dark' : 'light', tab: ORDER[0] || 'primera', checks: {} };
function T() { return TXT[state.lang]; }
function $(id) { return document.getElementById(id); }
function waUrl(text) { return 'https://wa.me/' + WA + (text ? '?text=' + encodeURIComponent(text) : ''); }

/* ---------- WhatsApp: el envío y los turnos están en js/whatsapp.js ---------- */
function openWhatsApp(href, datos) { if (window.GPWA) return window.GPWA.abrir(href, datos); window.location.href = href; }

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
  var bullets = function (arr) { return arr.length ? arr.map(function (x) { return '• ' + x; }).join('\n') : '• ' + t.waNone; };
  var msg = t.waHello + '\n*' + sel[lang].titulo + '*\n\n*' + t.waHave + '*\n' + bullets(have) + '\n\n*' + t.waMiss + '*\n' + bullets(miss);
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
F.tel.addEventListener('input', function () { if (window.GPWA) window.GPWA.consultarTelefono(F.tel.value); });
form.addEventListener('submit', function (ev) {
  ev.preventDefault(); submitted = true;
  var e = refreshErrors();
  if (Object.keys(e).length) { var first = e.nombre ? F.nombre : e.tel ? F.tel : F.tram; first.focus(); return; }
  var t = T(), tramTxt = F.tram.options[F.tram.selectedIndex].textContent;
  var lines = [t.waForm, t.waNombre + F.nombre.value.trim(), t.waTel + F.tel.value.trim(), t.waTram + tramTxt];
  if (F.msg.value.trim()) lines.push(t.waMsg + F.msg.value.trim());
  var url = waUrl(lines.join('\n'));
  $('form-wa').href = url;
  openWhatsApp(url, { telefono: F.tel.value, nombre: F.nombre.value.trim(), tramite: tramTxt, origen: 'formulario' });
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
/* Cuando llega contenido nuevo del panel, se vuelve a pintar todo sin recargar */
window.GPAplicarContenido = function () {
  mezclarTextos();
  REQ = window.GP_REQ; ORDER = window.GP_REQ_ORDER;
  if (ORDER.indexOf(state.tab) < 0) state.tab = ORDER[0];
  applyLang();
};
})();
