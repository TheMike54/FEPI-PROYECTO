# Oleada O4 — HU-06 v2: avance por periodo + nota + validación vs programa vigente — 10 jun 2026

> Ejecuta el prompt O4 (P14 del profe). **LOCAL, sin commit/push**, sobre `main` (con O1+UI+O2+O3
> integrados; árbol limpio). Componentes guinda. **NO se tocó `permisos.js`, `server.js`, G1-G8 ni la
> inmutabilidad de bitácora/firmas** (el candado art. 118 queda EXACTO; solo se AÑADE el bloqueo por periodo).

## Hallazgo que cambió el plan: SIN DDL

El paso 1 del prompt pedía "DDL: periodo_numero + nota_id en la tabla de avances". **La tabla
`concepto_avance` YA tiene `contrato_periodo_id` (FK que imputa a un periodo) y `nota_id`** — el plan
se escribió sin conocer el esquema real. O4 NO añade columnas redundantes: **reusa** `contrato_periodo_id`
(ahora puesto desde el SELECTOR en vez de derivado de una fecha) y `nota_id` (ahora ligado a la nota
AUTOMÁTICA). El cambio es **semántico**, no de esquema → **cero DDL, cero migración** (a diferencia de
O2/O3). Esto evita dos fuentes de verdad para el periodo.

## El cambio real (reescritura del flujo, no del esquema)

El flujo E2 actual derivaba el periodo de una **fecha libre** y exigía una **nota pre-existente** (la
supervisión la emitía y el contratista la citaba); el exceso vs programa era una **alerta no bloqueante**.
O4 lo invierte a lo que pidió el profe:

| | Antes (E2) | O4 (v2) |
|---|---|---|
| Periodo | derivado de fecha libre | **SELECTOR** del programa vigente |
| Nota de bitácora | pre-existente (la elige el usuario) | **AUTOMÁTICA** al registrar (diferida si no hay bitácora) |
| Exceso vs programa del periodo | alerta (no bloquea) | **BLOQUEA** (409, art. 59) |
| Concepto no programado en el periodo | — | **BLOQUEA** (409) |
| art. 118 total | bloquea | **bloquea (intacto)** |

### Backend (`trabajos.controller.js`)
- `registrarAvance` reescrito: recibe `periodo_numero` (selector) → busca el periodo (`cargarPeriodoPorNumero`), fija `contrato_periodo_id` y `fecha = periodo.fin` (la curva HU-05 usa fecha + periodo).
- **Validación bloqueante por periodo** (`validarProgramaPeriodo`) sobre `programa_obra` = **el programa VIGENTE** (los convenios lo reescriben en vivo con `guardarMatriz`, así que un convenio que adelantó volumen lo permite **solo**, sin tocar O4). Computa `programado_acumulado(≤ periodo)` y `ejecutado_acumulado(≤ periodo)`; bloquea si el concepto no está programado (acum = 0) o si `ejecutado_acum + nuevo > programado_acum`. Solo aplica si el contrato **tiene** programa (matriz); sin matriz, solo rige art. 118.
- **Nota automática**: si hay bitácora abierta, se asienta en vivo (`insertarNotaAtomica`, tipo `avance`, folio atómico, emisor = contratista); si NO, se **difiere** (nota_id NULL) y `abrirBitacora` la asienta sola (loop nuevo, mismo patrón que la sustitución Pase 2.3). Texto: *"Avance de trabajos — {concepto}: se ejecutaron {cantidad} {unidad} en el periodo {p}, conforme al programa de obra."* (`textoNotaAvance` en `bitacora.controller`, compartido entre el asiento en vivo y el diferido).
- `actualizarAvance` (PATCH): se quitó el requisito de nota pre-existente (las notas son de sistema); revalida art. 118 **y** el bloqueo por periodo; ya no edita `nota_id` (limitación documentada: editar la cantidad no regenera la nota — la nota es el asiento del registro original).
- art. 118 y los `FOR UPDATE` (cierre de carrera) intactos.

### Frontend (`TrabajosTerminados.jsx`)
- **Selector de periodo** (`cap-periodo`) reemplaza la fecha libre.
- **Renglón del programa** (`ref-programa`) al elegir concepto+periodo: programado del periodo, programado acumulado, ejecutado acumulado, **disponible** (espeja el cálculo del backend).
- **Toggle** "Ejecuté todo lo programado del periodo" (`toggle-todo-periodo`) → autollena la cantidad con lo disponible.
- Se quitó el selector de nota (auto ahora); avisos de bloqueo en vivo (no programado / excede periodo) como guía; la tabla de avances muestra el periodo y la nota (#número o "pendiente (al abrir bitácora)").

## Decisiones (y por qué)

1. **Sin DDL**: la tabla ya imputaba a un periodo y tenía nota_id; añadir `periodo_numero` duplicaría la verdad. Reusar `contrato_periodo_id` es más íntegro (FK) y evita migración.
2. **Validar sobre `programa_obra`** (no `programa_version`): confirmado que `programa_obra` ES el programa vigente — los convenios lo reescriben en vivo (`guardarMatriz` con convenioId, exento del freeze) y `programa_version` es solo snapshot histórico. Por eso "convenio que amplía → pasa" funciona sin código extra (el test lo prueba con un convenio real).
3. **Bloqueo (no aviso)**: el prompt y el profe lo piden ("no puedo pagar más de eso"); consistente con el semáforo G5 de la estimación. Marcado `[validar profe]` por si prefiere aviso.
4. **Nota automática vía `insertarNotaAtomica`** (no `emitirNota`): igual que la sustitución, el asiento automático no pasa por el gate de firmas ni por el rol_emisor del catálogo (la tipo `avance` figura como de supervisión, pero el asiento del sistema la emite a nombre del contratista). `[validar profe]` el emisor.
5. **Diferido extendiendo `abrirBitacora`**: mismo patrón probado de la sustitución (Pase 2.3); el avance no se bloquea por falta de bitácora.

## Fase B (diseño, NO implementado en O4)

**Evidencias adjuntas al registro** (fotos/planos), pedido del profe ("la nota es texto; tu registro tiene la evidencia"). Diseño:
- Tabla nueva `avance_evidencias(id, concepto_avance_id FK CASCADE, nombre, mime, tamano, contenido BYTEA | archivo, descripcion, subido_en)` — reusa el mecanismo del PDF del alta (multipart → BYTEA, o sistema de archivos si se decide así, ver comentario del profe en P13).
- Endpoints `POST /api/trabajos/:id/evidencia` (multipart) + `GET .../evidencia/:eid`. La **nota** sigue siendo solo texto; la **evidencia** vive en el registro.
- UI: zona de adjuntos en cada avance (galería de miniaturas).
- No toca G1-G8 ni la nota automática.

## Tests (lección 7)

- **Nuevo** `o4-avance-periodo.spec.js` (4): excede periodo → bloquea + concepto no programado → bloquea · **convenio que amplía → el avance que excedía ahora pasa** (convenio `programa` real, redistribuye P1=600/P2=400 sin cambiar monto) · sin bitácora → nota diferida → se asienta al abrir · UI: selector de periodo + renglón + toggle + registro con nota en vivo.
- `hu-06-trabajos-terminados.spec.js` **sin cambios**: solo verifica visibilidad por rol (no el flujo de captura) → compatible con la reescritura.
- Pre-vuelo (o4 + hu-06): **10/10 verde**. **Suite completa: 222 passed · 8 skipped · 0 failed** — los 218 previos + 4 nuevos de O4. (Una corrida intermedia tuvo 1 flaky de timing en `detalle-indicador-atraso` — `detalle-alertas` tardó >5s bajo carga; confirmado transitorio: pasa 4/4 aislado y NO toca código de O4 —siembra `concepto_avance` por SQL, ajeno al cambio de endpoint—.) `vite build` ✓.

## Runbook de integración (Maiki)

1. **Sin migración** (no hay DDL nuevo): la columna `contrato_periodo_id` y `nota_id` ya existen en Render. Solo `docker restart sigecop_backend` tras pull (controllers cambiaron: `trabajos`, `bitacora`).
2. Suite completa + smoke: registrar avance eligiendo periodo (la nota se asienta o difiere); excederlo (bloquea); abrir bitácora con un avance previo (la nota aparece sola).
3. **Para el profe**: P14 resuelto. Pendientes `[validar]`: (a) ¿bloqueo o aviso al exceder el periodo? (b) emisor de la nota automática de avance (contratista vs residente). (c) Fase B (evidencias) cuando lo apruebe.

## Archivos tocados

Backend: `trabajos.controller.js` (rework registrar/actualizar + helpers), `bitacora.controller.js` (textoNotaAvance + loop diferido en abrirBitacora + export). Frontend: `api.js` (comentario payload), `TrabajosTerminados.jsx` (reescrito). Test: `o4-avance-periodo.spec.js` (nuevo). **Sin DDL.**
