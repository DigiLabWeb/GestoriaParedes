# Gestoría Paredes — sitio web

Sitio estático (HTML, CSS y JavaScript sin dependencias), listo para GitHub Pages.

## Archivos

| Archivo | Qué es |
| --- | --- |
| `index.html` | Página principal |
| `404.html` | Página de error (GitHub Pages la usa automáticamente) |
| `aviso-de-privacidad.html` | Aviso de privacidad |
| `css/styles.css` | Estilos |
| `js/main.js` | Idioma ES/EN, modo claro/oscuro, menú móvil, requisitos, formulario a WhatsApp |
| `img/` | Foto principal, logotipo, íconos y la imagen para compartir en redes |
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

- **Número de WhatsApp / teléfono:** busque `529841156912` en `index.html`, `404.html`, `aviso-de-privacidad.html` y `js/main.js` y reemplácelo (formato: 52 + 10 dígitos).
- **Redes sociales:** en `index.html`, los íconos de Facebook, Instagram y TikTok apuntan a `404.html`. Cambie ese `href` por el enlace de cada cuenta.
- **Requisitos y textos:** están en `js/main.js` (objetos `REQ` y `TXT`, en español e inglés).
- **Imagen al compartir en WhatsApp/Facebook:** cuando sepa la dirección final del sitio, cambie en `index.html` la línea `og:image` por la dirección completa, por ejemplo `https://SU-USUARIO.github.io/gestoria-paredes/img/compartir.jpg`.
