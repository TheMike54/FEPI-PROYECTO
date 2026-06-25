# Implementación de hallazgos de la revisión — 24-jun

> **Sesión autónoma. LOCAL, sin push. Backup previo:** `scratchpad/backup_pre_hallazgos_24jun.sql` (4.2 MB).
> Disciplina: build verde tras cada hallazgo, datos reales, sin tocar zona congelada salvo la línea
> autorizada de `programa.controller.js`. **B4 = solo propuesta (esperando OK de Maiki), NO implementado.**

## Resumen

| # | Hallazgo | Estado | Build | Archivos |
|---|---|---|---|---|
| A3 | Curva versionada (selector original/vigente) | ✅ Implementado | verde | `CurvaAvance.jsx` |
| A2 | Checklist art. 132 en integración | ✅ Implementado | verde | `IntegracionEstimacion.jsx` |
| B5 | Badge "Adicional" en programa y curva | ✅ Implementado | verde | `programa.controller.js` (1 línea autorizada) + `MatrizProgramaLectura.jsx` + `CurvaAvance.jsx` |
| A1 | Foto obligatoria al registrar avance (criterio del equipo) | ✅ Implementado | verde | `TrabajosTerminados.jsx` + `o4-avance-periodo.spec.js` |
| B4 | Más cantidad de un concepto existente | ⏸️ **Propuesta (espera OK)** | — | (no tocado) |

Cero `schema`/DDL. Único toque a core autorizado: `programa.controller.js:28` (agregar `es_adicional` al SELECT).

---

## A3 — Curva versionada con selector (lo que el profe pidió textual)

**Qué hace:** en HU-05 (Programa y curva de avance), si el contrato tiene **versiones de programa**
(generadas por convenios), aparece un selector **"Programa de obra: Vigente / Versión N (histórica)"**.
Al elegir una versión histórica, la línea **Programado** se dibuja con el programa de esa versión; el
**Ejecutado** y el **Financiero** siguen reflejando el avance real sobre el alcance vigente (el avance es uno
solo). Un aviso ámbar lo explica (art. 101 RLOPSRM: adicionales aparte).

**Cómo:** solo frontend, reusando datos que YA existen en BD:
- Se cargan los snapshots por versión con `api.versionPrograma(versionId)` (endpoint ya existente, ya usado en ConveniosModificatorios).
- Se arma el `% programado acumulado por periodo` desde `programa_version_celda` / `programa_version_concepto`.
- `datosCurva` usa ese snapshot para la serie Programado cuando hay versión seleccionada; si no, usa el programa vivo (comportamiento actual).

**Sin schema, sin backend, sin congelado.** Archivos: `frontend/src/pages/CurvaAvance.jsx` (estado
`versionSelId`/`snapshotProg`, efecto de carga, helper `progAcumEnPeriodo`, selector + aviso, ajuste de la
serie Programado).

**⚠️ Para verlo en vivo hace falta un contrato con versiones de programa.** Hoy **ningún** contrato las tiene
(`programa_version` = 0 filas): el convenio demo se sembró directo en `convenios_modificatorios` sin snapshot.
Las versiones se crean cuando se registra un convenio de **monto/programa por la app** (crearConvenio →
snapshotVersion). **Opciones para demostrarlo:** (1) registrar un convenio de programa por la UI sobre un
contrato (p. ej. SOP-2026-001), o (2) que yo siembre un snapshot de versión para un contrato demo (avísame).

---

## A2 — Checklist de soportes del art. 132 en la integración

**Qué hace:** el paso 4 ("Soportes y notas") de la integración (HU-12) ahora muestra un **checklist de las 7
fracciones del art. 132 RLOPSRM**, con dónde vive cada documento en el sistema y su estado:

| Fr. | Documento | Estado en el sistema |
|---|---|---|
| I | Números generadores | ✓ En el sistema (paso 2) |
| II | Notas de bitácora | ✓ vinculadas aquí / Pendiente |
| III | Croquis | Lo determina la dependencia (Expediente HU-04) |
| IV | Controles de calidad, pruebas y fotografías | Lo determina la dependencia (fotos por generador en Expediente) |
| V | Análisis, cálculo e integración de importes | ✓ En el sistema (carátula, paso 3) |
| VI | Avances de obra (precio alzado) | No aplica (precios unitarios) / Aplica |
| VII | Informe de operación y mantenimiento | Lo determina la dependencia |

La nota aclara que el art. 132 es **lista enunciativa** (*"serán determinados por cada dependencia o
entidad… entre otros"*). **Presentación pura**, sin backend ni schema. Archivo:
`frontend/src/pages/IntegracionEstimacion.jsx` (reemplaza el banner suelto de fotos por el checklist).

---

## B5 — Badge "Adicional" en el programa de obra y la curva

**Qué hace:** los conceptos adicionales de convenio (art. 101 RLOPSRM, `es_adicional`) ahora se distinguen
con el mismo badge ámbar "Adicional" que ya existía en el expediente y en los generadores, **también** en:
- la **matriz del programa de obra** (`MatrizProgramaLectura.jsx`),
- el **catálogo** y la **matriz Gantt** de la curva (`CurvaAvance.jsx`).

**Cómo:** el endpoint del programa no exponía el flag → se agregó `es_adicional` al SELECT
(`programa.controller.js:28`, **línea autorizada por Maiki**, cambio aditivo sin lógica nueva). El frontend
conserva el flag en el remapeo de la curva y pinta el badge. Backend reiniciado; verificado que el endpoint
ya devuelve `es_adicional`.

**⚠️ El badge solo se ve si el contrato tiene conceptos adicionales** (hoy ningún demo los tiene; aparecerá
cuando un convenio agregue uno — relacionado con B4).

---

## A1 — Foto obligatoria al registrar avance (CRITERIO DEL EQUIPO, no es ley)

**Decisión legal (verificada en Tarea 1):** la ley **NO** obliga foto para el avance (art. 132 fr. IV es
discrecional de la dependencia y soporte de la *estimación*; art. 122/125 no piden foto). Por eso el candado
se marca explícitamente como **"requerido por criterio del equipo"**, **sin** citar ningún artículo.

**Qué hace:** en HU-06 (Registro de trabajos terminados), el formulario de captura ahora tiene un campo
**"Foto de evidencia *(requerida — criterio del equipo)"*** y el botón **"Registrar avance" queda
deshabilitado** hasta adjuntar una foto.

**Cómo se resuelve el "la foto necesita el id del avance" (hoy es endpoint posterior):**
1. El usuario adjunta la foto **en el formulario** (parte del flujo de registro, antes de pulsar Registrar).
2. Al registrar: se **redimensiona** la foto → se hace el **POST del avance** (`api.registrarAvance`, que
   devuelve `{ avance: { id } }`) → **inmediatamente** se sube la foto a ese id
   (`api.subirFotoAvance(avance.id, …)`).
3. Si la subida de la foto fallara tras crear el avance (caso de red raro), el avance queda registrado y se
   avisa "agrégala desde la galería" (no se pierde el avance).

**Naturaleza del candado:** es un **gate de UI** (el botón se deshabilita sin foto). Para el flujo de la app
y la revisión del profe queda enforced. Un candado **duro de backend** (multipart en `/api/trabajos`, foto y
avance en la misma transacción) sería más invasivo (rompe el contrato JSON del endpoint y los e2e/smoke) y
**no lo pide la ley** → se deja como decisión aparte si se quisiera inviolable por API.

Archivos: `frontend/src/pages/TrabajosTerminados.jsx` (estado `fotoEvidencia`, gate en `puedeGuardar`, flujo
en `registrar`, campo en el formulario). E2E: `o4-avance-periodo.spec.js` adjunta la foto antes de registrar.
*(Nota: ese spec además arrastra una staleness preexistente `select-contrato` ajena a A1.)*

---

## B4 — Más cantidad de un concepto existente (PROPUESTA — esperando OK, NO implementado)

**Problema (confirmado en código):** hoy el convenio **congela** los conceptos originales y solo deja agregar
conceptos con **clave nueva** (`es_adicional`) y **PU tecleado libre**. Reusar la clave del original con otra
cantidad → 409 *"el concepto original… se congela"* (`convenios.controller.js:225-235`); dos filas con la
misma clave → 400 *"claves repetidas"*; y la UI deshabilita la cantidad del original
(`EditorProgramaConvenio.jsx`). El único camino es inventar una clave y teclear el PU.

**Ley (art. 59 LOPSRM, literal):** *"Tratándose de **cantidades adicionales, éstas se pagarán a los precios
unitarios pactados originalmente**; tratándose de los conceptos no previstos… sus precios unitarios deberán
ser conciliados…"*. La ley distingue **cantidades adicionales del mismo concepto** (al PU original) de
**conceptos nuevos** (PU conciliado). El diseño actual fuerza todo al segundo caso → choca con el art. 59.
**Punto legal duro: el PU se HEREDA del original, nunca se teclea libre.**

### Opciones

**(a) Incrementar la cantidad del concepto original vía convenio** *(recomendada)*
- **Mecánica:** el convenio sube `contrato_conceptos.cantidad` del original (misma clave, mismo PU), re-cuadra
  el monto y registra el snapshot anterior (`snapshotVersion`, ya existe). Se registra el delta y su origen
  (convenio) para trazabilidad.
- **Estimaciones/pagos después:** es **el mismo `contrato_concepto_id`** → las estimaciones existentes y
  futuras siguen apuntando al mismo concepto; `art. 118` (acumulado ≤ contratado) usa la **nueva** cantidad,
  así que el volumen extra **se puede estimar y pagar** sin renglones nuevos; la carátula/financiero
  re-derivan del nuevo monto (G1 ya versiona el denominador). El % de avance del concepto se mide contra la
  nueva cantidad.
- **Pros:** es lo que **literalmente** dice el art. 59 (mismo concepto, PU original, una sola fila); no rompe
  estimaciones existentes (mismo id); trazabilidad por `programa_version`. **No toca schema.**
- **Contras:** contradice el criterio de diseño "originales congelados" → hay que relajar el freeze **solo**
  para "subir cantidad, mismo PU" bajo convenio (rechazando cambio de PU y bajada por debajo de lo ya
  estimado — esa guarda ya existe, `convenios.controller.js:188-191`). **Toca `convenios.controller.js`
  (congelado → PR de Maiki)** + desbloquear la cantidad del original en `EditorProgramaConvenio.jsx` bajo
  convenio.

**(b) Adicional que referencia el concepto original**
- **Mecánica:** nuevo `contrato_concepto` `es_adicional` con clave derivada (p. ej. `CONC-01-A`) que **hereda
  concepto/unidad/PU del original** (no se teclea el PU). Opcional: columna `origen_concepto_id` para el
  vínculo formal (eso **sí tocaría schema**).
- **Estimaciones/pagos después:** es **otro `contrato_concepto_id`** → se estima y paga **por separado**
  (art. 101 "administrar independientemente"); el % de avance del original **no** incluye el extra (se ve en
  el renglón adicional).
- **Pros:** respeta "originales congelados" + art. 101; hereda el PU (cumple art. 59); sin tocar schema si se
  usa la clave derivada como vínculo (sin `origen_concepto_id`).
- **Contras:** dos renglones del "mismo" concepto; el avance se reporta partido; semánticamente "más de lo
  mismo" como concepto nuevo es forzado frente a la redacción del art. 59 ("cantidades adicionales").

### Recomendación
**(a)** por fidelidad legal y coherencia de datos (un concepto, estimaciones/pagos intactos, % de avance
correcto). **(b)** es la alternativa conservadora si prefieres no relajar el freeze del original. En **ambas**
el PU se **hereda**, nunca se teclea. **Toca zona congelada (`convenios.controller.js`) → requiere tu OK y un
PR cuidadoso.** **No implemento nada hasta tu confirmación del enfoque.**

---

## Pendiente (no incluido aquí)
- Actualizar `docs/estado/ESTADO_ACTUAL.md` y criterios de HU-05/HU-06/HU-12 (reflejar A3/A1/A2/B5). Lo hago
  cuando me digas (es doc canónico).
- A3/B5 necesitan datos (versiones de programa / conceptos adicionales) para verse en vivo — ver notas arriba.
