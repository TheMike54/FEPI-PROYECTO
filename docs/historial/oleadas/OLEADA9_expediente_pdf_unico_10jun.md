# Oleada O9 — Expediente: un solo PDF real (print) en vez de descargables prototipo — 10 jun 2026

> Propuesta del equipo (W4c). **LOCAL, sin commit/push**, sobre `main` (con O1+UI+O2..O6 integrados).
> Componentes guinda (UI-1). **Solo presentación/consolidación**: NO toca `permisos.js`, `server.js`,
> G1-G8 ni la lógica de datos (consolida lo que el expediente YA consulta).

## ¿Hubo DDL? **NO.** Tampoco backend.
Cambio 100% frontend (HU-04). Se consume el endpoint EXISTENTE `GET /api/estimaciones/contrato/:id`
(ya en `api.estimacionesDeContrato`) para el bloque nuevo; nada más se añade del lado servidor.

## El cambio
Antes, cada bloque del expediente tenía un "descargable" **prototipo**: un PDF placeholder generado con
jsPDF (configuración/fianzas/jurídicos) y un Excel por bloque (catálogo/programa); más un botón
"Exportar expediente" **deshabilitado** ("Disponible en SRV-06-03"). O9 los retira y los reemplaza por
**UN solo PDF real** del expediente:

| | Antes | O9 |
|---|---|---|
| Por bloque | PDF placeholder (jsPDF) + Excel (exceljs) | — (retirados) |
| Exportar | botón deshabilitado (placeholder) | **"Exportar expediente (PDF)" → `window.print`** |
| Formato | descargas sueltas, sin datos reales | **1 documento consolidado** con TODOS los bloques |

### Vista de impresión consolidada (print CSS, single-DOM)
- **TODOS los bloques** en un solo documento, en orden: datos generales (con **superintendente VIGENTE**
  del roster, fallback al snapshot), catálogo con claves, programa vigente (**+ referencia a las versiones**),
  plan de amortización, garantías, jurídicos, roster/sustituciones, convenios modificatorios y
  **resumen de estimaciones** (números y estados — bloque NUEVO).
- **Single-DOM** (sin duplicar el render): los bloques se renderizan UNA vez. La búsqueda los **oculta en
  pantalla** (`hidden print:block`) en vez de sacarlos del DOM; al imprimir, **todos** aparecen (la búsqueda
  no recorta el PDF). Cada bloque colapsable mantiene su cuerpo en el DOM y lo **fuerza abierto al imprimir**
  (`print:block`). Esto evita duplicar testids (matriz-programa, roster-*, convenio-*, plan-exp-*, …).
- **Chrome fuera del PDF**: el selector de contrato, el buscador, el botón, el encabezado de vista y los
  "criterios de aceptación" van en `print:hidden`; un **membrete** (`print-header`) encabeza el documento.
- **Print CSS global** (`styles/index.css`, `@media print`): oculta el topbar (`header`) y el sidebar (`aside`)
  del AppShell, suelta el layout de altura fija/scroll a flujo normal y deja el contenido a ancho completo.
  Es global pero inocuo: la impresión solo se ofrece desde el expediente.

### Archivos
- `pages/ConsultaExpediente.jsx` (**reescrito**): se quitaron `BtnDescargar`/`descargarPDFPlaceholder`/
  `descargarExcel`/`JURIDICOS_DOCS` + imports `jsPDF`/`excelExport`; los bloques quedaron presentación pura
  (conservan sus testids); + `BloqueEstimaciones`, superintendente vigente, referencia a versiones, membrete,
  botón único y la consolidación single-DOM.
- `styles/index.css`: bloque `@media print` (nuevo).

## Tests (lección 7)
- **`hu-04-consulta-expediente.spec.js` (+7 O9, total 12)**: la vista consolidada incluye los **9 bloques**
  clave (incl. estimaciones) + superintendente vigente · los descargables prototipo **ya no existen**
  (`btn-descargar-*` count 0 + sin el placeholder "Disponible en SRV-06-03") · botón único Exportar PDF ·
  **modo impresión** (`emulateMedia('print')`): el chrome (header/aside/selector/búsqueda/botón) se oculta y
  el documento (membrete + bloques) se muestra · el botón dispara `window.print` (stub) · el resumen de
  estimaciones muestra números y estados (2 estimaciones, estados distintos + suma del total) · **un bloque
  COLAPSADO en pantalla se fuerza abierto en impresión** · **la búsqueda oculta bloques en pantalla pero NO
  los saca del PDF** (los 2 huecos que halló la revisión).
- **Sin regresión** en los specs que usan bloques del expediente: o1-fixes (clave del catálogo), o2 (plan de
  amortización), o6 (convenios + versiones), plan2 (matriz mes por mes) → **18/18**. Los `btn-descargar` que
  quedan en la suite son de HU-16 (otra página), no del expediente.
- **Suite completa: 246 passed · 8 skipped · 0 failed** (10.9 min, spec final). `vite build` ✓.

## Revisión adversarial (2 lentes) + corrección
- **regresión/print: lente limpio** (single-DOM sin testids duplicados; print CSS inocuo para otras vistas;
  imports `excelExport`/`jsPDF` siguen usándose en otras páginas; `api.estimacionesDeContrato` con manejo de
  error; fallback del superintendente vigente correcto).
- La lente de **specs** halló 2 huecos reales (bloque colapsado y bloque filtrado deben seguir en el PDF) →
  **incorporados** como 2 tests con `emulateMedia('print')`. Además, corregí un bug menor de producto que
  salió al fortalecer: `ESTADO_EST_LABEL` listaba estados inexistentes y le faltaba **'autorizada'**; ahora
  coincide con el check real `('integrada','enviada','autorizada','pagada','rechazada')`.

## Runbook de integración (Maiki)
1. **Sin migración** (no hay DDL ni backend): solo `git pull` + el frontend recarga (Vite). No requiere
   reiniciar el backend.
2. Smoke: abrir un expediente, ver los bloques (incl. resumen de estimaciones), pulsar **Exportar
   expediente (PDF)** → el diálogo de impresión del navegador muestra el documento consolidado sin el
   menú/sidebar/buscador; "Guardar como PDF" produce el archivo.
3. **Para el profe**: el expediente se exporta como un solo documento real (no descargas sueltas de prototipo).
   `[validar]`: si el profe quiere membrete/sello institucional específico o paginación con folio en cada hoja
   (hoy el print usa el estilo de pantalla; se puede afinar el print CSS sin tocar datos).

## Archivos tocados
Frontend: `pages/ConsultaExpediente.jsx` (reescrito), `styles/index.css` (@media print). Test:
`e2e/hu-04-consulta-expediente.spec.js` (+describe O9). **Sin DDL, sin backend.**
