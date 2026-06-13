# Oleada UI-1 — Reskin "institucional moderno" (paleta guinda) — 10 jun 2026

> Ejecuta el prompt UI-1 del plan (`docs/Contexto_Maestro_y_Plan_Correcciones_09jun_1.md`, sección "Oleada UI").
> **LOCAL, sin commit/push.** REGLA DE ORO cumplida: **solo reskin** — cero cambios en lógica, endpoints, cálculos (G1–G8), validaciones, `permisos.js`, `server.js` o llamadas a la API. Solo markup JSX + clases Tailwind + componentes compartidos nuevos. **Todos los `data-testid` y textos asercionados se conservaron.**
> ⚠️ **El árbol de trabajo también contiene la O1 sin commitear**: el diff exacto de O1 quedó congelado en `docs/historial-cambios/OLEADA1_fixes_revision_profe_09jun.patch` para que ambas pasadas sean separables al revisar/committear.

## La jugada central: reskin por TOKENS

El sistema de estilos ya estaba centralizado (colores `sigecop-*` en `tailwind.config.js`, clases `sg-btn-*`/`sg-input`/`sg-card` en `styles/index.css`). En vez de editar 28 páginas, se **remapearon los tokens históricos a la paleta guinda** (mismo nombre, nuevo valor):

| Token | Antes | Ahora |
|---|---|---|
| `sigecop-blue` | `#1F4E78` (azul) | `#691C32` (guinda) |
| `sigecop-blue-light` | `#DDEBF7` | `#F3E9EC` (guinda-soft) |
| `sigecop-accent` | `#2E75B6` | `#8A2B44` (guinda claro: links/focus) |
| `sigecop-green-*` | verdes Excel | `#3B6D11` / `#EAF3DE` |
| `sigecop-amber-*` | ámbar Excel | `#854F0B` / `#FAEEDA` |

Con eso, **las ~28 vistas (incluidas las de UI-2) quedaron coherentes con la identidad guinda sin tocar sus archivos** — `sigecop-blue` aparece 178 veces en 39 archivos y todas migran solas. Encima se añadieron los tokens nuevos del sistema (`guinda`, `guinda-dark`, `guinda-soft`, `dorado`, `pagina #FAFAF8`, `borde #ECEAE4`, `tinta #2C2C2A`, `tinta-sec`, `tinta-ter`, `exito/aviso/peligro` con sus fondos), tipografía **Inter** (cargada en `index.html`, fallback system) y **radius md 8 / lg 12** (las clases `rounded-md/lg` existentes se actualizan globalmente).

## Componentes nuevos (`frontend/src/components/ui/`)

- **`AppShell`** — barra superior **guinda con filo dorado (3px)**: logo + **buscador** + **campana** (ambos presentacionales en UI-1, sin lógica — regla de oro) + **chip de rol** + nombre + **avatar** (iniciales) + botón **"Salir"** (texto intacto: lo asierta la suite). Sidebar **claro `#FAFAF8`** + contenido sobre página. Conserva el contrato de la suite: `<aside>` con NavLinks (`aside a[href]`), `<main>` para el contenido, nombre del usuario visible.
- **`Card`**, **`Kpi`**, **`Badge`** (pills suaves de estado), **`Tabla`** (wrapper + `thClass`), **`Boton`** (primario guinda / secundario outline, reusa `sg-btn-*`), **`Modal`** (extraído del modal de exceso de garantía de O1), **`BannerSoloConsulta`** (mismo texto "solo consulta" — contrato de la suite), **`EncabezadoContrato`** (tarjeta blanca con acento guinda; sucesor de BannerContexto en las vistas migradas).

## Swap del layout (sin tocar router)

`App.jsx` (zona congelada) **no se tocó**: importa `Layout`, y `Layout.jsx` ahora delega en `AppShell`. `Sidebar.jsx` se restiló (claro, item activo guinda-soft + texto guinda + borde-izq guinda) **conservando estructura, NavLinks y secciones por rol**; el chip de rol pasó a la barra superior y "← Cambiar de rol" (salirRol) quedó al pie del sidebar. `Header.jsx` (azul) quedó sin usos (lo absorbió AppShell; se elimina en UI-2).

## Compartidos restilados (reskin en cascada)

`Tab.jsx` (pestañas del wizard: solo clases; nombres/disabled/`data-bloqueado` intactos) · `HeaderVista` (título en tinta peso 500) · `AvisoSoloLectura` → delega en `BannerSoloConsulta` · `BannerContexto` (para las vistas no migradas aún) · `Toast`/`Breadcrumb`/`MatrizProgramaLectura`/`BuscadorNotas` heredan por tokens.

## Páginas migradas (UI-1)

1. **Login (`SeleccionRol`)** — pantalla previa al shell: franja guinda con filo dorado, logo, tarjeta limpia centrada. Formularios (ids `#login-usuario`/`#login-password`, testids `reg-*`, textos "Iniciar sesión"/"Crear cuenta", `auth-mensaje` con `data-tipo`) **intactos**.
2. **Alta de contrato** — wizard re-skineado vía `Tab.jsx` + tokens; cajas informativas azules → guinda-soft; el modal de exceso usa el `Modal` compartido (testids idénticos).
3. **Bitácora (apertura, notas+firmas, consulta)** — ya consumían tokens `sigecop-*` al 100%: migraron por el remapeo (cero ediciones de markup necesarias = cero riesgo en sus 600+ líneas de testids).
4. **Consulta de expediente** — bloques acordeón a tarjeta blanca/encabezado claro; `EncabezadoContrato` (mismo `testid` banner-expediente).
5. **Estimación (pantalla única)** — `EncabezadoContrato`; badges ⓘ de artículos y caja del art. 138 a guinda-soft; carátula/semáforo/barras heredan por tokens.

## Decisiones (y por qué)

1. **Remapear tokens en lugar de editar página por página**: máximo cambio visual con mínimo diff (las 600+ líneas de asserts de la suite ni se enteran). Las páginas de UI-2 ya quedan coherentes; UI-2 será barrido de detalles, no de identidad.
2. **Buscador y campana sin lógica**: la regla de oro prohíbe lógica nueva; quedan como elementos del diseño listos para cablearse (búsqueda global / notificaciones) en oleadas funcionales.
3. **`rounded-md/lg` global a 8/12px** vía `borderRadius` del config: todos los radios del producto se modernizan sin tocar clases.
4. **"Cambiar de rol" se conservó** (al pie del sidebar): es funcionalidad existente (salirRol); quitarla sería un cambio de comportamiento, no un reskin.
5. **`Header.jsx` no se borró** aunque quedó sin usos (igual que `BadgeSprint`): bajo riesgo de import residual; se limpia en UI-2.
6. **Dorado solo en filos/acentos** (filo de la barra, avatar), nunca texto sobre blanco (contraste, regla del doc).

## Gotcha de operación (para el runbook)

Cambiar `tailwind.config.js` **NO se recarga en caliente** en el contenedor: el dev server siguió con el config viejo y `@apply bg-pagina` tronó el CSS (la app entera en blanco, 14 specs rojos). **`docker restart sigecop_frontend` tras tocar el config** — quedó documentado porque va a pasar de nuevo en UI-2.

## Tests

- Sin specs nuevos ni modificados (reskin puro): la suite existente es la red de seguridad.
- **Suite completa: 210 passed · 8 skipped (fixme conocidos) · 0 failed (6.5 min)** — idéntico al resultado pre-reskin: ningún assert se rompió. `vite build` (gate del CI) ✓.

## Capturas (después)

`docs/capturas-ui1/`: 01-login · 02-inicio-shell · 03-alta-wizard · 04-expediente · 05-bitacora-notas · 06-estimacion. (El "antes" es lo desplegado en Render hoy.)

## Runbook de integración (Maiki)

1. **Committear O1 primero** (el patch `OLEADA1_fixes_revision_profe_09jun.patch` es la referencia exacta de qué pertenece a O1) y luego UI-1 — así los diffs quedan limpios.
2. Tras pull/checkout: `docker restart sigecop_frontend` (config de Tailwind) — el backend no cambió en UI-1.
3. Suite local: `npx playwright test`. Smoke visual: login → inicio → alta → bitácora → expediente → estimación (paleta guinda, barra con filo dorado, sidebar claro).
4. Push a `main` → Render. El build de producción ya quedó verificado (`vite build` ✓).
