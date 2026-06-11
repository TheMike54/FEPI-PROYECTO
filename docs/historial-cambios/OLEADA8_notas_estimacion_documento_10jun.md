# Oleada O8 — Notas firmadas vinculadas a la estimación + documento de la nota (P8/P9) — 10 jun 2026

> **LOCAL, sin commit/push**, sobre `main` (con O1..O7 + O-Profe). Componentes guinda (UI-1). **FRONTEND
> PURO.** **NO se tocó** `permisos.js`, `server.js`, `App.jsx` (sin rutas nuevas → el documento es un modal),
> `estimaciones.controller` (HU-12, congelado), G1-G8, ni la inmutabilidad de bitácora/firmas. Las notas son
> **inmutables**: O8 es **solo referencia lógica** + una vista de presentación.

## ¿Hubo DDL? **NO.** (Revisé el esquema primero, como pediste.)
La tabla **`estimacion_notas` YA EXISTÍA** (`schema.sql` L574) con **`PRIMARY KEY (estimacion_id, nota_id)`** —
que ES la `UNIQUE(estimacion_id, nota_id)` que pedías. Y el cableado ya estaba: `integrarEstimacion` valida que
las notas pertenezcan a la bitácora del contrato (art. 132 fr. II) e inserta en `estimacion_notas`;
`detalleEstimacion` ya devuelve las notas vinculadas. **No se necesita migración.**

## (a) Vincular notas FIRMADAS a la estimación
Al **presentar** la estimación (flujo O7: lo hace el contratista en HU-12), el selector de notas ahora muestra
**solo las FIRMADAS** del contrato ("notas que soportan esta estimación"):
- `IntegracionEstimacion.jsx`: el modal `ModalVincularNotas` recibe `notasFirmadas` = `notasContrato` filtrado a
  `aceptacion === 'firmada'` **excluyendo la apertura** (nota #1, que es el acta de apertura, no un soporte). El
  estado `'firmada'` lo **deriva el backend** (`construirPayloadNotas`): emisor + todo el roster firmaron antes
  del plazo (art. 123 fr. III). `[validar profe]`: ¿incluir también las **aceptadas tácitas** (por vencimiento
  del plazo)? Hoy se excluyen (filtro estricto "firmadas").
- La vista de la estimación **lista sus notas con link** a documento: en la captura (`TabNotasVinculadas`) y en
  el detalle (`ModalDetalle`), cada nota tiene un enlace "📄 documento".

## (b) Vista "documento" de la nota
Nuevo componente **`DocumentoNota.jsx`** (modal imprimible, patrón de O9):
- **Membrete** + **encabezado** (contrato folio/objeto/dependencia/contratista + nota folio/tipo/**fecha y
  hora**) + **cuerpo** (asunto + contenido) + **tabla de firmantes** (emisor + contrapartes, cada uno con su
  **rol** y **hora de firma**) + botón **"Ver como documento / Imprimir"** (`window.print()`).
- **Aislamiento de impresión** sin tocar O9: al abrirse, el componente marca `<body class="doc-nota-abierto">`;
  un `@media print` en `styles/index.css` usa un truco de `visibility` para imprimir **solo** `[data-print-area]`
  (el documento) y ocultar el resto (página de fondo, backdrop, barra de acciones). La clase se limpia al
  desmontar → no rompe la impresión del expediente (O9), que no la lleva.
- Sirve como **el "PDF" de la nota** que se adjunta a la estimación (link desde la lista de notas de la estimación).
- Cableado: **HU-09** (`EmisionNotas`, botón por nota), **HU-10** (`ConsultaNotas`, vía prop **opcional**
  `onVerDocumento` en el componente compartido `BuscadorNotas` — retrocompatible, el modal de HU-12 no la pasa),
  y **HU-12** (link en la lista de notas de la estimación; resuelve la nota completa con firmas desde `notasContrato`).

## Tests (lección 7)
- **Nuevo `o8-notas-estimacion.spec.js` (3)**: (1) API — presentar estimación (contratista, O7) vinculando una
  nota **firmada**; el detalle de la estimación la lista. (2) UI HU-12 — el modal de vinculación muestra **solo la
  firmada** (excluye la nota sin firmar y la apertura); se vincula; la estimación la lista; el link "documento"
  abre `DocumentoNota` con **3 firmantes** (emisor + 2 contrapartes). (3) UI HU-09 — "Ver como documento" abre el
  documento con el folio y los firmantes.
- **Sin cambios y verdes**: `bitacora-v2`, `hu-09-emision-notas`, `hu-10-consulta-notas`, `o7-flujo-estimacion`,
  `hu-12`, `estimacion-pantalla-unica`, `pago-fecha-integrada` (la columna/ prop nuevas son aditivas).
- **Suite completa: 255 passed · 8 skipped · 0 failed** (7.7 min). `vite build` ✓. (Tras los arreglos de la
  revisión —z-index cosmético + aserciones negativas en el spec O8— se re-verificó `o8` 3/3 + build ✓; no cambian el conteo.)

## Revisión adversarial (3 lentes) + decisiones
- Implementación **sólida**: sin DDL (tabla con PK=UNIQUE ya existía), `BuscadorNotas` retrocompatible (prop +
  columna opcionales), aislamiento de impresión correcto (clase de body con cleanup, no rompe O9).
- **Correcciones aplicadas:** (1) `DocumentoNota` sube a `z-[60]` para quedar siempre encima de `ModalDetalle`;
  (2) el spec O8 ahora afirma **explícitamente** que la nota sin firmar NO aparece en el selector.
- **⚠️ HALLAZGO PARA MAIKI (zona congelada — no lo toqué):** el candado "solo firmadas" es **solo de UI**. El
  backend `integrarEstimacion` (CONGELADO) valida que las notas pertenezcan a la bitácora del contrato, pero
  **NO** que estén firmadas. Un cliente que llame al API directo podría vincular notas no firmadas. Si el profe
  exige el candado normativo server-side (art. 132 fr. II RLOPSRM), **tú** debes añadir a `integrarEstimacion`
  (frozen) un filtro `AND bn.<estado firmada> AND bn.tipo<>'apertura'` en el SELECT de validación de notas
  (L197-209). Lo dejé fuera por respetar la zona congelada; lo decides tú/el profe.
- **Declinado (intencional):** el filtro excluye `aceptada_tacita` (firmadas estrictas) — ver `[validar]` arriba;
  el fallback de nota mínima en `ModalDetalle` degrada con gracia (la nota siempre está en `notasContrato` del
  contrato seleccionado).

## Runbook de integración (Maiki)
1. **SIN migración** (no hay DDL): solo `git pull`. El frontend recarga con Vite; **no hace falta reiniciar el
   backend** (O8 no toca backend).
2. Smoke: en HU-09/HU-10, "Ver como documento" abre la nota como documento imprimible con firmantes. En HU-12, al
   presentar, el selector de notas muestra solo firmadas; la estimación lista sus notas con link al documento.
3. **Para el profe** `[validar]`: ¿el selector debe incluir también las notas **aceptadas tácitamente** (por
   vencimiento del plazo, art. 123 fr. III), o solo las firmadas activamente? (hoy: solo firmadas).

## Archivos tocados (todos frontend)
NUEVO: `src/components/notas/DocumentoNota.jsx`. Editados: `src/styles/index.css` (@media print del documento),
`src/components/notas/BuscadorNotas.jsx` (prop opcional `onVerDocumento`), `src/pages/EmisionNotas.jsx` (HU-09),
`src/pages/ConsultaNotas.jsx` (HU-10), `src/pages/IntegracionEstimacion.jsx` (HU-12: filtro firmadas + link).
Test: `e2e/o8-notas-estimacion.spec.js` (nuevo). **Sin DDL · sin backend · sin zona congelada.**
