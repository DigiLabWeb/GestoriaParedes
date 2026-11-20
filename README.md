# Gestoría Paredes — sitio web

Sitio estático (HTML, CSS y JavaScript sin dependencias), listo para GitHub Pages.

## Archivos

| Archivo | Qué es |
| --- | --- |
| `index.html` | Página principal |
| `404.html` | Página de error (GitHub Pages la usa automáticamente) |
| `aviso-de-privacidad.html` | Aviso de privacidad |
| `css/styles.css` | Estilos |
| `js/main.js` | Idioma ES/EN, modo claro/oscuro, menú móvil, requisitos (licencias, cambio de propietario, emplacamiento), formulario a WhatsApp |
| `img/` | Foto principal, logotipo, íconos, imagen para compartir |
| `favicon.ico` | Ícono de la pestaña |
| `.nojekyll` | Le indica a GitHub Pages que publique los archivos tal cual |

## Publicar en GitHub Pages

1. En GitHub, cree un repositorio nuevo (por ejemplo `gestoria-paredes`), público.
2. Pulse **Add file › Upload files** y arrastre **todo el contenido** de esta carpeta (no la carpeta en sí: `index.html` debe quedar en la raíz del repositorio). Incluya el archivo oculto `.nojekyll`.
3. Pulse **Commit changes**.
4. Vaya a **Settings › Pages**. En *Build and deployment*, elija **Deploy from a branch**, rama `main` y carpeta `/ (root)`. Guarde.
5. En uno o dos minutos el sitio estará en `https://SU-USUARIO.github.io/gestoria-paredes/`.

Para usar un dominio propio (por ejemplo `gestoriaparedes.com`), escríbalo en **Settings › Pages › Custom domain** y siga las instrucciones de DNS que muestra GitHub.

## Cambios frecuentes

- **Número de WhatsApp / teléfono:** busque `529841297165` en `index.html`, `404.html`, `aviso-de-privacidad.html` y `js/main.js` y reemplácelo (formato: 52 + 10 dígitos).
- **Redes sociales:** solo Instagram (@gestoria.paredes) y Facebook, en la sección de contacto y en el pie de página de `index.html`.
- **Requisitos y textos:** están en `js/main.js` (objetos `REQ` y `TXT`, en español e inglés).
- **Imagen al compartir en WhatsApp/Facebook:** cuando sepa la dirección final del sitio, cambie en `index.html` la línea `og:image` por la dirección completa, por ejemplo `https://SU-USUARIO.github.io/gestoria-paredes/img/compartir.jpg`.

## WhatsApp por turnos (dos números)

Cada cliente nuevo se asigna a un número, uno y uno:

| Cliente | Número |
|---|---|
| 1.º | 984 129 7165 |
| 2.º | 984 202 1770 |
| 3.º | 984 129 7165 |
| … | … |

Si un cliente vuelve a escribir, lo atiende el mismo número de antes. Se reconoce de dos formas:

- **Mismo celular o computadora:** cuenta para cualquier botón de WhatsApp.
- **Mismo teléfono escrito en el formulario:** cuenta aunque escriba desde otro dispositivo.

Los números se cambian en `js/whatsapp.js` (`NUMEROS`) y en `google-apps-script/turnos-whatsapp.gs` (`NUMEROS` y `ETIQUETAS`).

### Instalación (una sola vez, ~5 minutos)

1. **Crear la hoja.** En Google Drive, cree una hoja de cálculo nueva y llámela "Clientes Gestoría Paredes".
2. **Pegar el script.** En la hoja, abra **Extensiones → Apps Script**. Borre lo que haya y pegue todo el contenido de `google-apps-script/turnos-whatsapp.gs`. Guarde.
3. **Autorizar.** En la barra de arriba, elija la función `prueba` y pulse **Ejecutar**.
   - Acepte los permisos. Si sale "Google no ha verificado esta app", elija *Configuración avanzada → Ir a…*: el script es suyo.
   - Se crea la pestaña **Clientes**.
4. **Publicar.** Pulse **Implementar → Nueva implementación**.
   - En el engrane, elija el tipo **Aplicación web**.
   - Configure:
     - *Ejecutar como:* **Yo**.
     - *Quién tiene acceso:* **Cualquier usuario**.
   - Pulse **Implementar** y copie la URL que termina en `/exec`.
5. **Conectar el sitio.** En `js/whatsapp.js`, pegue esa URL en `var ENDPOINT = '';`. Suba el cambio a GitHub.

Mientras `ENDPOINT` esté vacío, el sitio sigue funcionando: cada cliente nuevo cae 50/50 y queda fijo en su número.

Si después edita el script, use **Implementar → Gestionar implementaciones → editar → Versión nueva**. Así la URL no cambia.

### Qué guarda la hoja

Cada fila es un contacto, con estas columnas:

- Fecha
- Número que atiende
- Nombre, teléfono y trámite (solo si vino del formulario)
- Si era cliente nuevo
- Botón de origen
- Identificador anónimo del navegador


## Envío de documentos y panel de administrador

- **`documentos.html`** — El cliente sube fotos o PDF de sus documentos.
  - La página los une en un solo PDF, en su propio navegador, con `js/vendor/pdf-lib.min.js` (licencia MIT).
  - Lo guarda en la carpeta de Drive «Gestoría Paredes — Expedientes» y le asigna un folio (GP-0001…).
  - Al final, el cliente avisa por WhatsApp al número que le tocó. El mensaje incluye el enlace al expediente.
- **`js/escaner.js`** — Convierte cada foto en escaneo: detecta la hoja, permite ajustar las esquinas, endereza la perspectiva y quita fondo y sombras (modos Escaneo, Color y Blanco y negro). Los PDF que suben ya escaneados entran tal cual.
- **`admin.html`** — Panel con usuario y contraseña:
  - Lista de expedientes, con búsqueda y filtro por número y por estado.
  - Ver, descargar, editar (nombre del documento, datos del cliente y estado) y eliminar cada expediente. Al eliminar, el PDF va a la papelera de Drive (30 días).
  - Los PDF se guardan como «Nombre - Trámite - 12-nov-26.pdf».
  - Reparto de turnos entre los dos números.
  - Las contraseñas se comprueban en el script de Google, no en este sitio.
- **`js/config.js`** — Los dos números y la dirección del script de Google.
- **`google-apps-script/turnos-whatsapp.gs`** — Turnos, expedientes e inicio de sesión. Cada vez que cambie este archivo:
  1. Pegue el contenido nuevo en el editor de Apps Script.
  2. Ejecute `prueba`.
  3. Pulse **Implementar → Gestionar implementaciones → editar → Versión nueva**.

## Editar página (panel de administrador)

- En el panel, la pestaña **Editar página** permite cambiar los requisitos de cada trámite y los textos principales del inicio:
  - agregar, quitar, reordenar y reescribir documentos y grupos;
  - crear, ocultar o eliminar trámites.
- Se escribe en español; al **Publicar cambios**, el script traduce al inglés solo lo nuevo o modificado, con `LanguageApp` de Google. Un glosario respeta siglas y términos del giro (INE, CURP, RFC, REC, IMOVEQROO, tarjeta de circulación…).
- Si un texto en inglés se escribe a mano, queda marcado **EN · a mano** y ya no se traduce solo.
- Cada publicación se guarda en la hoja **Contenido** (no editarla a mano).
- **Historial** permite restaurar cualquier versión anterior.
- **Vista previa** abre la página con los cambios sin publicarlos.
- Los archivos `js/textos.js` y `js/requisitos.js` son el contenido original; `js/contenido.js` aplica lo publicado desde el panel.
