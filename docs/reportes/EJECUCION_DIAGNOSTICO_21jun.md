# EJECUCIÓN DEL DIAGNÓSTICO_INTEGRAL — 6 bloques (21-jun)

> **LOCAL, sin push. Zona congelada y gating de roles INTACTOS.** Checkpoint = `vite build` verde tras cada
> bloque (los e2e no corren en CI). Base: `HEAD 4eaf044` + working tree (3A + P4-ALT + chip + fixes 19-jun).
>
> **Resumen e2e (corrida con base LIMPIA, 5 contratos):** **192 passed · 8 skipped · 121 failed.** Los 121 fallos
> trazan **TODOS** a specs *stale* de 3A/P4-ALT (testids eliminados) + 1 desfase de folio del seed + 2 *flaky* de
> chromium. **NINGÚN fallo proviene de los 6 bloques** (ver §3, verificado uno a uno con el log). Mis áreas tocadas
> que tienen specs no-stale PASAN (p. ej. `hu-21-registro-pago`).

---

## 1. QUÉ SE ARREGLÓ POR BLOQUE (archivos tocados · verificación)

### BLOQUE A — Navegación (Frente 1)
| ID | Arreglo | Archivo(s) | Verificado |
|---|---|---|---|
| **NAV-A** 🔴 | En *Ciclo de vida* quité `'dependencia'` del bloque n:3 (HU-08), que rebotaba a Inicio | `pages/CicloVidaContrato.jsx` | build ✅ |
| **NAV-B** 🟡 | Breadcrumb: cada nivel intermedio solo enlaza si el rol tiene acceso (`nivelDe`); si no, queda texto (no enlace que rebota). Cubre dependencia→Estimaciones/Seguimiento y finanzas→Contratos | `components/ui/Breadcrumb.jsx` (+ imports `useSesion`/`nivelDe`/`historiasUsuario` + `HU_POR_RUTA`) | build ✅ |
| **NAV-C** 🟡 | `TransitoPago` `<Link>` crudo a `/pagos/registro` → `LinkHU hu="HU-21"` (no rebota al contratista) | `pages/TransitoPago.jsx` (+ import `LinkHU`) | build ✅ |
| **NAV-D** 🟡 | Modal "Elige tu contrato": `/` (Inicio) ahora es **ruta libre** (puerto seguro, ningún rol atrapado), "Ver portafolio" gateado por `nivelDe('HU-18')` (mata el bucle de contratista/finanzas), y botón **"← Ir al inicio"** como escape garantizado | `components/ModalContratoActivo.jsx` | build ✅ + **destrabó las specs de campana/nav** (5→2 fallos) |
| **NAV-E** 🟡 | El padre del ciclo en el sidebar queda **resaltado** en sus rutas hermanas (match contra {ruta padre + rutas hijas}) | `components/layout/Sidebar.jsx` (+ `useLocation`) | build ✅ |
| **NAV-F** 🟡 | Unificada la entrada de Avance: tarjeta de Inicio → `/seguimiento/trabajos-terminados` (= sidebar) y `AmbienteAvance` ahora monta `PestanasCiclo` (en BLOQUE B) | `pages/Inicio.jsx` (+ `AmbienteAvance` en BLOQUE B) | build ✅ |

> **Confirmación finanzas (NAV-D):** `lib/acceso.js:esParteOSupervision` devuelve `true` para finanzas → finanzas **sí
> recibe contratos** en `listarContratos` y puede elegir uno y operar. El "atrapamiento" era el bucle de portafolio
> (resuelto) + la falta de un escape a Inicio (resuelto).

### BLOQUE B — Chip de HU (Frente 2)
- **Fuente única del chip** "Ciclo · HU XX–YY" dentro de `PestanasCiclo` (mapa `RANGOS_CICLO`); aparece **consistente
  en todas las pantallas de cada ciclo**.
- **Chip hardcodeado retirado** de las 7 pantallas-ambiente: `AmbientePago`, `AmbienteBitacora`, `AmbienteConvenio`,
  `AmbienteAvance`, `AmbienteFiniquito`, `AmbienteExpediente`, `IntegracionEstimacion`.
- **`PestanasCiclo` montado** en los 5 ambientes que faltaban: `AmbientePago`, `AmbienteAvance`, `AmbienteConvenio`,
  `AmbienteExpediente`, `AmbienteFiniquito` (resuelve también NAV-G del diagnóstico).
- Archivos: `components/PestanasCiclo.jsx` + esas 7 páginas. **Verificado:** build ✅; `chip-ciclo-hu` no se asierta
  en ningún spec (cero riesgo e2e).

### BLOQUE C — HU-21 sincronizado con el backend (Frente 3, funcional)
- `RegistroPagoForm.jsx`: `PAGABLES = new Set(['autorizada'])` (antes `integrada/enviada/autorizada` → 409) + dos
  etiquetas a "(autorizada, no pagada)". **No se tocó la lógica server-side** (fuente de verdad, art. 54).
- **Verificado:** build ✅; `hu-21-registro-pago.spec.js` **PASA** en la corrida limpia.

### BLOQUE D — Notificaciones accionables + Centro (Frente 4)
| Pieza | Archivo |
|---|---|
| Endpoint detalle accionable `GET /api/alertas/detalle?contrato=ID` (filas; acotado al contrato activo) | `backend/src/controllers/alertas.controller.js` (+`alertasDetalle`) · `backend/src/routes/alertas.routes.js` (+ruta) — **no congelados; router ya montado, sin tocar `server.js`** |
| Cliente | `frontend/src/services/api.js` (+`alertasDetalle`) |
| **Centro de notificaciones** (overlay agrupado por tipo, accionable, acotado al contrato activo con toggle) | `frontend/src/components/NotificacionesCentro.jsx` (**NUEVO**) |
| Campana accionable por-ítem + "Ver todas →" al Centro + efecto de detalle | `frontend/src/components/ui/AppShell.jsx` |
| Deep-links destino | `pages/AlertasAtraso.jsx` (lee `&concepto` → resalta la fila) · `pages/PorFirmar.jsx` (lee `?contrato` → resalta) |
- **Verificado:** build ✅; backend reiniciado; **smoke `/alertas/detalle` → 200 con filas**; `/alertas/resumen`
  devolvió **1746 conceptos / 1745 contratos** (confirma base sucia → ya limpiada); campana sin regresión.
- **`/notificaciones` con URL propia** requeriría `<Route>` en `App.jsx` (congelado) → se entregó como **overlay**
  (misma función) para no tocar el router. Snippet de ruta queda para Maiki si quiere la URL.

### BLOQUE E — Sidebar colapsable (Frente 5)
- Botón **☰** en la barra superior (`AppShell.jsx`) con estado persistido (`localStorage 'sigecop:sidebar'`),
  **default ABIERTO**; `Sidebar.jsx` recibe `abierto` y colapsa por **ancho** (`w-72` ↔ `w-0`) — el `<aside>`
  **nunca se desmonta** (contrato e2e: `enterAppMode` exige aside visible, `goToViaSidebar` clica `aside a[href]`).
- Archivos: `components/ui/AppShell.jsx`, `components/layout/Sidebar.jsx`. **Verificado:** build ✅.

### BLOQUE F — Historias 1:1 (Frente 3, documentación) — *(agente)*
- **Originales conservados** en `docs/historial/requisitos/` (`*_pre21jun.md`) ANTES de editar.
- `docs/requisitos/Historias_Usuario_ACTUALIZADAS_12jun.md`: **HU-06** (append-only/"Corregir", no editar/eliminar),
  **HU-21** (solo "Autorizada", art. 54), **HU-23** (padrón administrado por la Dependencia; se quitó "No existe un
  panel"; citas art. 43 RLOPSRM / 74 Bis LOPSRM marcadas `[validar profe]`), **HU-14** (placeholders vacíos
  explícitos), **HU-19** (los 7 reportes exportan). **HU-03** ya estaba correcta (sin cambio).
- `docs/requisitos/HISTORIAS_POR_CICLOS.md`: HU-06 append-only.
- **Verificado:** grep confirmó los cambios + "No existe un panel" = 0; sin cambiar requisitos legales.

**Zona congelada:** `App.jsx`, `data/permisos.js`, `context/SesionContext.jsx`, `schema.sql`, controllers/routes
core (auth/usuarios/contratos/estimaciones) **NO tocados**. El gating de roles (permisos.js) intacto; NAV-A solo
alineó un array de display local con ese gating.

---

## 2. SPECS STALE — qué actualizar (trabajo CONOCIDO de 3A/P4-ALT, NO bugs)

Causa raíz: 3A reemplazó los **selectores de contrato por-página** por el **contrato activo global** (`BannerContratoActivo`
+ modal `modal-elegir-contrato`), y FIX 8/FIX 1 retiraron el botón ✍️ y el badge HU-XX. Los specs siguen buscando
testids que **ya no existen** → 30 s de timeout cada uno. **Fix = migrar los specs al flujo de contrato activo**
(elegir el contrato vía el modal `modal-elegir-contrato` / `modal-contrato-{id}`, o sembrar `localStorage
'sigecop.contratoActivo'`, o navegar con `?contrato=ID`) en vez de `select-contrato`.

### S1 — `select-contrato` eliminado (3A) — **39 specs**
`ambiente-avance`, `ambiente-bitacora`, `ambiente-convenio`, `ambiente-expediente`, `ambiente-finiquito`,
`ambiente-pago`, `bitacora-v2`, `ciclo-vida`, `detalle-indicador-atraso`, `estimacion-pantalla-unica`,
`estimacion-retencion-atraso`, `fase0c-oficio-convenio`, `fase2-apertura-redaccion`, `fase4-finiquito`,
`fase5-ambiente-estimacion`, `fianzas-crud`, `hu-02-registro-fianzas`, `hu-02-sustitucion-bitacora`,
`hu-03-convenios`, `hu-04-consulta-expediente`, `hu-05-curva-avance`, `hu-06-trabajos-terminados`,
`hu-07-alertas-atraso`, `hu-13-envio-estimacion`, `hu-14-historial`, `hu-15-revision`, `hu-16-reingreso`,
`hu-19-reportes`, `hu-20-transito-pago`, `minutas-crud`, `nota-fecha-hora`, `o1-fixes-revision-profe`,
`o3-empresas`, `o4-avance-periodo`, `o6-convenios-bitacora`, `o7-flujo-estimacion`, `o8-notas-estimacion`,
`pago-wizard`, `plan2-programa-mes-por-mes`.

### S2 — `roster-contrato` eliminado (3A, RosterContrato usa BannerContratoActivo) — **2 specs**
`alta-personas-roster`, `roster-sustitucion`.

### S3 — `select-contrato-reporte` eliminado (3A) — **1 spec** (además de S1)
`hu-19-reportes` (también lo usa).

### S4 — `link-por-firmar` / `drop-firmar` (FIX 8, botón ✍️) + `indicador-hu` con texto "HU-XX" (FIX 1) — **1 spec**
`nav-modo-sistema` (test `:46` "Por firmar pop-up" y test `:37` "indicador muestra HU-04"). Los demás tests de este
spec ya pasan.

### S5 — desfase de FOLIO del seed (no es testid) — **1 spec**
`hu-18-portafolio`: espera `semaforo-dot-OP-2026-DEMO-001`, pero `seed:demo` crea **`OBRA-2026-DEMO-01`**. Actualizar
el folio esperado en el spec (o el seed). Pre-existente.

### S6 — no conduce el modal 3A para elegir contrato — **1 spec**
`hu-11-minutas`: navega a Minutas sin elegir contrato → el modal bloquea la página y no puede clicar la pestaña
"Agenda de visitas". Mismo origen (flujo 3A); migrar igual que S1.

### Flaky de entorno (NO stale, NO bug) — re-correr para confirmar
`pago-fecha-integrada`, `roster-sustitucion`: `worker process exited (code=3221225794 / 0xC0000142)` = **crash de
chromium** (no es una aserción fallida). Probable agotamiento de recursos por la corrida larga; en una corrida limpia
deberían pasar o crashear al azar.

> **Total fallos = 45 archivos** (39 S1 + 2 S2 + nav-modo-sistema + hu-18-portafolio + hu-11-minutas + 2 flaky que
> también son S2/otros). Todos explicados; ninguno por los 6 bloques.

---

## 3. ¿ALGÚN ARREGLO MÍO ROMPIÓ UN SPEC? — NO (verificado)
- Áreas que toqué con specs **no-stale**: `hu-21-registro-pago` (BLOQUE C) **pasa**; campana/notificaciones
  (`notas-pendientes-campana` **pasa**, `nav-modo-sistema` pasa salvo los 2 tests stale `:37/:46`).
- `chip-ciclo-hu` (BLOQUE B) **no se asierta** en ningún spec → mover el chip no rompe e2e.
- Ningún spec asienta el href viejo de la tarjeta Avance (`cardInInicioFor('/seguimiento/ambiente')`) → NAV-F no
  rompe nada. `ambiente-avance.spec.js` navega a `/seguimiento/ambiente` (ruta viva) y falla solo por `select-contrato`.
- `Sidebar` colapsable: default abierto → `aside` visible → `enterAppMode`/`goToViaSidebar` intactos.

---

## 4. PENDIENTE (cuando se quiera dejar la suite verde) — UNA corrida limpia al final
1. **Migrar los specs S1–S3/S6** al flujo de contrato activo (un helper `elegirContratoActivo(page, folio)` que use
   `modal-contrato-{id}` o siembre `localStorage 'sigecop.contratoActivo'` resuelve la mayoría de un golpe).
2. **S4** (`nav-modo-sistema`): quitar/actualizar los 2 tests del botón ✍️ y del texto HU-XX (ya retirados del producto).
3. **S5** (`hu-18-portafolio`): cambiar el folio esperado a `OBRA-2026-DEMO-01`.
4. **Base limpia antes de correr** (la suite NO hace teardown → ensucia): `TRUNCATE contratos CASCADE` + `seed:demo`
   (conserva cuentas/empresas). Sin esto, cada corrida re-acumula contratos `E2E-*` y se vuelve a arrastrar.
5. **Bug 4 (Autorizar 500) y re-seed de Render** siguen en la fase de BD (Maiki, con backup) — fuera de este lote.

*Sin push. Sin tocar zona congelada. Suite NO re-corrida tras este reporte (por indicación de Maiki).*
