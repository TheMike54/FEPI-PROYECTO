# CONTEXTO PARA CLAUDE — 3A contrato global + UX + correcciones (sesión 19–21 jun)

> **Punto de retoma rápido.** Todo es **LOCAL, sin push, sin tocar BD**. `HEAD = 4eaf044` (= lo desplegado en
> Render). Zona congelada intacta (`App.jsx`, `permisos.js`, `SesionContext.jsx`, `schema.sql`, controllers core).
> **Checkpoint usado:** `cd frontend && npm run build` (gate de CI) — **VERDE** tras cada cambio. Los e2e
> Playwright requieren el stack (`docker compose up`); no corren en CI → pendiente smoke local.

## 1. Qué se IMPLEMENTÓ (build verde, sin push)
**Tanda de correcciones (PLAN_SOLUCION_ERRORES_19jun.md):**
- **FIX 1** Jerga UI fuera: badge flotante `HU-XX` (AppShell), `[Nivel 1 profe]`, `Etapa 1`, `(por bloques)`.
- **FIX 2** Callejones a Inicio → **`components/LinkHU.jsx`** (NUEVO): gatea links cross-actor por HU (`hu`) o por
  rol (`roles`); si el rol no tiene acceso, muestra chip deshabilitado con "lo hace X actor" en vez de rebotar.
  Aplicado en IntegracionEstimacion, AmbienteAvance/Finiquito/Convenio/Pago.
- **FIX 3** Tarjetas del Inicio (Bitácora/Avance) → abren el ambiente correcto y marcan el sidebar.
- **FIX 4** Re-selección de contrato: `?contrato` se preselecciona en ~17 páginas; wizard de bitácora auto-salta
  al paso ya logrado (`AmbienteBitacora` `setPaso(b?.completa?2:1)`); `link-firmar` lleva `?contrato`.
- **FIX 5** Convenio: banner persistente `cm-error-registro` que explica el "piso" de lo ya estimado (B5-2).
- **FIX 6 / A5** Candados con motivo en wizards (bitácora/estimación/pago): el "Siguiente" gris dice POR QUÉ.
- **FIX 8** Notificaciones unificadas en la campana (se quitó el botón ✍️ "Por firmar"; su acceso va en el pop-up
  de la campana, testid `drop-firmar-ir` conservado).
- **BLOQUE 2 — Gating secuencial** (espejo de Alta): **estimación** `pasoValido` ahora exige periodo (p0) y ≥1
  línea (p1); **pago** `pasoValidoPago`/`irPasoPago` (no avanzas sin suficiencia/soportes/instrucción). Motivos
  añadidos. **Verificado intacto** tras los cambios de 3A.

**3A — Contrato global (versión mínima aprobada, mockup `docs/mockups/PROPUESTA_UI_19jun.html`):**
- **`context/ContratoActivoContext.jsx`** (NUEVO): contrato activo global, persistido en `localStorage`, adopta
  `?contrato=ID`, cache de lista a nivel módulo. NO toca `SesionContext`.
- **`components/ModalContratoActivo.jsx`** (NUEVO, P1): modal bloqueante "Elige tu contrato"; salidas legítimas:
  elegir, "Ver portafolio", "Cerrar sesión". Solo bloquea rutas que requieren contrato (`RUTAS_LIBRES` =
  portafolio/tablero/admin-empresas/usuarios-solicitudes quedan libres).
- **`components/BannerContratoActivo.jsx`** (NUEVO, P3): reemplaza el `<select de contrato>` repetido; hereda el
  global llamando al handler propio de cada página. Aplicado en **27 páginas** (todas las de contrato).
- **`Layout.jsx`** monta el provider (no toca App.jsx). **`AppShell.jsx`** (P2): chip "Contrato activo · Cambiar"
  en la barra + render del modal.
- **P5** Reportes: añadido el banner 3A. *(El agrupado de los 8 botones por reporte YA existía en el código — la
  tabla `CATALOGO_REPORTES` ya los agrupa; el mockup exageró el ANTES.)*
- **P6** Chip "Ciclo · HU XX–YY" en los 6 ambientes + el wizard de estimación (testid `chip-ciclo-hu`).

## 2. Qué quedó PENDIENTE / requiere decisión de Maiki
- **P4 (colapsar doble salto ambiente→pantalla): DETENIDO a propósito** (regla de Maiki). El colapso "tal cual el
  mockup" (formulario inline bajo pestañas) exige **incrustar los componentes-página hijos** (doble `HeaderVista`)
  y arriesga el gating → no viable sin refactor grande/bugs. Alternativa limpia (sidebar→pantalla de acción
  directa + barra de pestañas-enlace) es **distinta** al dibujo in-page → **no se improvisó; espera OK de Maiki**.
- **Bug 4 "Autorizar = error interno" (EN RENDER): es la BD, no el código.** El controller inserta nota
  `tipo='res_estimaciones'` (existe en `schema.sql:883`) en la MISMA transacción que el UPDATE de autorización;
  en Render `bitacora_notas.tipo` quedó como ENUM viejo / falta el catálogo (migración del commit `7bb1b99` no
  re-corrió). **Fix = re-aplicar `schema.sql` a Render (idempotente) en la FASE DE BD, con backup** (zona
  congelada → lo hace Maiki). Diagnóstico read-only en `docs/reportes/AUDITORIA_FINAL_UX_19jun.md §5`.
- **4 propuestas UX EXTRA** (`docs/mockups/PROPUESTA_UI_EXTRA_19jun.html`) — **IMPLEMENTADAS 21-jun** (build verde,
  no tocan lógica/gating): (1) **estados vacíos con guía** en 7 vistas Tipo B (texto "qué falta + qué hacer" + CTA
  `LinkHU`, sin bloquear); (2) **confirmación** — los banners persistentes ya existían (`banner-integrada`,
  `banner-autorizada/rechazada`); solo se reforzó el "siguiente paso" en `aviso-pago-registrado`; (3) **"Paso N de
  M"** (`paso-indicador*`) en los 3 wizards (estimación/pago/bitácora); (4) **jerarquía de botón** — auditadas 10
  pantallas: **8 ya correctas, 0 cambios**, **2 AMBIGUAS reportadas para decisión de Maiki** (AmbienteBitacora
  paso 0: `link-abrir` vs `Siguiente`; AmbientePago: tránsito HU-20 vs registrar HU-21 — ambos CTAs legítimos, no
  se degradó ninguno).
- **P4 alternativa — IMPLEMENTADA 21-jun** (`docs/mockups/PROPUESTA_UI_P4_ALT_19jun.html`, build verde, gating
  verificado intacto): componente nuevo **`components/PestanasCiclo.jsx`** (barra de pestañas-ENLACE por ciclo,
  gateadas por acceso, NO incrusta componentes); sidebar **Avance → `/seguimiento/trabajos-terminados`** (acción
  directa, retira el índice `/seguimiento/ambiente` del sidebar; el ambiente-route sigue vivo para Ciclo de vida);
  **18 pantallas** con la barra arriba; en estimación y bitácora la barra **reemplazó** el bloque "EN PARALELO"
  (`estimacion-en-paralelo`, `bloque-bit-5/6` retirados → ahora `pestana-*`). **Wizards y gating secuencial
  intactos** (la barra va arriba). Los demás ambientes-índice (pago/convenio/finiquito/expediente) ya se saltaban
  desde el sidebar; sus rutas siguen vivas para Ciclo de vida. **P4 original (incrustación): descartado.**
  **Jerarquía de botón (#4):** aplicadas las 2 recomendaciones (AmbienteBitacora paso 0: Siguiente→secundario;
  AmbientePago: tránsito HU-20→secundario). Las otras 8 ya estaban bien.
- **Seed ampliado** (`backend/scripts/reseed_cuentas.sql`, 3/3/3 empresas): preparado, **NO ejecutado**. Cuentas
  en `docs/Cuentas_Prueba_SIGECOP.md` (gitignored).
- **e2e**: limpiar specs que referencian el botón ✍️ retirado (`por-firmar-count`/`link-por-firmar`) y el badge
  `HU-XX`. Smoke local recomendado antes de desplegar.

## 3. Reglas y archivos clave
- **No push. Solo Maiki despliega.** No tocar zona congelada salvo bug 4 (marcado, fase BD con backup).
- Plan de pruebas canónico: `docs/pruebas/PLAN_PRUEBAS_FINAL_MATCH_18jun.md`. Plan de solución:
  `docs/reportes/PLAN_SOLUCION_ERRORES_19jun.md`. Auditoría: `docs/reportes/AUDITORIA_FINAL_UX_19jun.md`.
- Componentes nuevos: `LinkHU.jsx`, `ContratoActivoContext.jsx`, `ModalContratoActivo.jsx`, `BannerContratoActivo.jsx`.
- Si se reanuda P3 o se hace algo masivo por páginas: el patrón ya está; un workflow idempotente lo aplica.
