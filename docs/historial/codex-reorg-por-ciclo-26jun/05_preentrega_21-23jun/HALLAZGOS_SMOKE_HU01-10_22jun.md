# Hallazgos de smoke HU-01 a HU-10 — confirmación + plan (22-jun) · SIGECOP

> **Encargo (Maiki):** PASO 1 **confirmar cada hallazgo contra el código real** (¿es bug o me equivoqué? verificar, no confiar en la palabra). PASO 2 **proponer** plan de solución, **sin aplicar nada**.
> **Base:** `main = cb10b27`, LOCAL, stack arriba (verificación viva solo-lectura). Cruzado con: código real, `docs/pruebas/PLAN_PRUEBAS_FINAL_MATCH_18jun.md`, `docs/requisitos/Historias_Usuario_ACTUALIZADAS_12jun.md`, ley `docs/legal/*.txt`, y los **AUDIOS del profe** (`docs/audios/`, sobre todo la sesión del 21-jun `Recording_transcript.md` donde el profe lee las historias).
> **NO se cambió código.**

## Resumen — PARTE A

| # | Hallazgo | Veredicto | Sev. | ¿Congelado? |
|---|---|---|---|---|
| 1 | HU-02: dos garantías del mismo tipo | ⚠️ **PARCIAL** (real, por inconsistencia de mayúsculas) | 🟡 | Sí (fix robusto) |
| 23 | HU-03 convenio + HU-06 avance SIN bitácora | ✅ **CONFIRMADO BUG** (audio decisivo) | 🔴 | No |
| 4 | HU-03 ~100M días → 500 | ✅ **CONFIRMADO BUG** (RangeError de `Date` JS) | 🟡 | No |
| 5 | HU-05 avance financiero "no se registra" | ✅ **CONFIRMADO BUG** (corte de la curva, no el cálculo) | 🟡 | No |
| 6 | HU-06 aviso no bloqueante no salió | ❌ **NO ES BUG** (existe; el seed lo hace irreproducible) | 🟡 | No |
| 7 | HU-03 versionado inmutable del programa | ❌ **NO ES BUG** (funciona) | 🟢 | No |
| 8 | HU-09 aceptación tácita al vencer plazo | ❌ **NO ES BUG** (funciona, derivado en lectura) | 🟢 | No |

**Neto: 4 bugs reales a corregir (P23 ×2, P4, P5) + 1 parcial latente (P1) + 3 que SÍ funcionan (P6 destapa un desajuste de seed/plan).** No te equivocaste en lo grave (P23, P4, P5); en P6/P7/P8 el sistema está bien (P7/P8 los marcaste "verificar", correcto).

---

# PARTE A — Confirmación

## ⚠️ P1 — HU-02: ¿se cargan dos garantías del mismo tipo? → PARCIAL (real, pero no por donde parece)

**Qué pasa hoy:** el caso obvio **está bloqueado en 3 capas**: BD `UNIQUE(contrato_id, tipo)` (`schema.sql:184`, verificado vivo: existe, 0 duplicados), backend `crearGarantia` mapea `23505 → 409` (`garantias.controller.js:100-104`), y la pantalla HU-02 **oculta los tipos ya presentes** (`RegistroFianzas.jsx:151-152` + botón deshabilitado `:237`). El alta HU-01 también valida dups antes de enviar (`AltaContrato.jsx:1608-1614`).

**Pero hay un agujero real — inconsistencia de mayúsculas:** el **alta HU-01 graba tipos CAPITALIZADOS** (`'Cumplimiento','Anticipo','Vicios ocultos'`, `AltaContrato.jsx:88-90`) y **HU-02 usa keys MINÚSCULAS** (`'cumplimiento','anticipo','vicios_ocultos'`, `RegistroFianzas.jsx:14-18`). Como el `UNIQUE` es **sensible a mayúsculas/string exacto**, `'Cumplimiento'` (del alta) y `'cumplimiento'` (de HU-02) **no colisionan**; además HU-02 no filtra el `'Cumplimiento'` legacy (compara key≠valor) y lo ofrece de nuevo → deja grabar el segundo.

**Confirmación contra el profe (audio 21-jun):** *"nosotros cargamos dos del mismo tipo y sí se pudo… eso hay que revisarlo, el criterio 1."* → reprodujeron el caso. La referencia esperada: plan de pruebas N7 (`:861`, "2ª garantía mismo tipo → 409") y criterio HU-02; art. 48 LOPSRM (una de anticipo + una de cumplimiento). *(Los audios no piden el rechazo explícitamente; el respaldo es el plan + criterio.)*

**Veredicto:** ⚠️ **PARCIAL** — el candado funciona para el flujo de una sola pantalla; el escenario exacto que viste se reproduce por la **doble convención de mayúsculas** entre alta y HU-02. *(En la BD viva hoy solo hay minúsculas del seed; el riesgo es latente pero real en cuanto se da de alta por la UI.)*

**Fix propuesto (no implementar):**
1. **Canonicalizar `tipo`** a un set único de claves (minúsculas) en TODO el sistema: alinear `AltaContrato.jsx:88-90` con las keys de `RegistroFianzas.jsx:14-18`.
2. **Defensa server-side:** normalizar `tipo` (lower) antes del INSERT en `garantias.controller.js:97` y `contratos.controller.js:430`.
3. **Robusto de raíz:** índice `UNIQUE` sobre `lower(tipo)` → **toca `schema.sql` (ZONA CONGELADA, aditivo idempotente, lo integras tú)**.
4. **Saneamiento:** UPDATE de tipos capitalizados existentes a las keys canónicas (runbook, una vez).

---

## 🔴 P23 — HU-03 (convenio) y HU-06 (avance) permiten registrar SIN bitácora abierta → CONFIRMADO BUG

**Acertaste en los dos.** Hoy ni el convenio ni el avance exigen bitácora abierta: se registran y la nota se **difiere** (`nota_id NULL`), asentándose sola al abrir la bitácora (patrón "atómico-o-diferido", diseño consciente de O4/O6, documentado en `ESTADO_ACTUAL §5.3`).
- **Convenio:** `convenios.controller.js:248-260` — si no hay bitácora **no bloquea**, inserta con `nota_id NULL` y responde 201 `nota_diferida:true`. Router sin guard (`convenios.routes.js:36`).
- **Avance:** `trabajos.controller.js:283-297` — `bitId null ⇒ notaId null`, responde 201 `nota_diferida:true`. Router sin guard (`trabajos.routes.js:20`).

**Decisivo — el profe lo rechazó explícitamente (audio 21-jun, verificado verbatim):**
- Convenio: *"te dejó integrar un convenio modificatorio sin abrir la bitácora… **aquí es donde está el error, porque no debe de poderse**… no se puede integrar un convenio modificatorio si no está abierta la bitácora, o que **te redireccione primero a abrir bitácora**."*
- Avance: *"o la difiere si la bitácora aún no está abierta. Bueno, ahí también. **Que no deje hacer esto a menos de que la bitácora ya está abierta**."*
- Ley: **art. 122 RLOPSRM** (`reg_utf8.txt:4500`, verbatim): *"El uso de la Bitácora es obligatorio en cada uno de los contratos de obras y servicios."*

> **Matiz honesto:** el diferido NO era un descuido — es diseño coherente y transaccional, y las historias 12-jun + `ESTADO_ACTUAL §5.3` lo describían como esperado. **Cambió el REQUISITO:** el profe ahora exige bitácora abierta como precondición. Por eso es bug **contra la voluntad del profe**, severidad roja.

**Barrido — todas las acciones con el mismo patrón (lo que pediste):**

| Acción | Endpoint | Hoy | ¿Bug? |
|---|---|---|---|
| Avance | `trabajos.controller::registrarAvance` (:286) y `corregirAvance` | **difiere** | ✅ exigir bitácora (profe) |
| Convenio | `convenios.controller::crearConvenio` (:248) | **difiere** | ✅ exigir bitácora (profe) |
| Sustitución roster | `roster.controller::sustituirPersona` | **difiere** | ⚠️ **[validar]** — el profe NO la mencionó |
| Estimación presentar/autorizar | `estimaciones-ciclo` | atómico-o-omite (no difiere, no exige) | ⚠️ **[validar]** — el profe no la señaló |
| **Atraso** | `alertas.controller::asentarAtraso` (:208-212) | **YA EXIGE bitácora** (409) | ✓ patrón a copiar |

**Fix propuesto (no implementar):**
1. **Convenio:** en `crearConvenio`, tras el `FOR UPDATE` (junto al gate de cierre), `SELECT id FROM bitacora_aperturas`; si no hay → `ROLLBACK + 409` *"Abre primero la bitácora del contrato (art. 122 RLOPSRM)"*. Quitar la rama diferida + el barrido de convenios de `abrirBitacora`.
2. **Avance:** igual en `registrarAvance` y `corregirAvance` con `bitacoraAbiertaId()`; quitar el barrido de avances.
3. **Frontend (lo que pidió el profe, "que te redireccione"):** en Convenios y Trabajos terminados, si no hay bitácora → deshabilitar el botón + aviso con enlace a `/bitacora/apertura`.
4. **Sincronizar** HU-03 crit. 5, HU-06 crit. 5 y `ESTADO_ACTUAL §5.3` ("exige bitácora; ya no difiere") + casos negativos al plan de pruebas.
5. **[validar] contigo/profe:** ¿la **sustitución** y la **nota de estimación** también deben exigir bitácora? El profe no las mencionó → recomiendo dejarlas como están hasta confirmar. **No toca zona congelada** (controllers de dominio, no core).

---

## 🟡 P4 — HU-03: ~100 millones de días → "Error interno" (500) → CONFIRMADO BUG

**Acertaste** (con una corrección a la hipótesis). **Causa exacta:** `convenios.controller.js:199` calcula `fecha_termino = new Date(fecha_inicio + (plazo-1)·86400000 ms).toISOString()`. Con ~100M días el timestamp **excede el rango válido de `Date` de JavaScript** (±8.64e15 ms ≈ ±100M días desde epoch) → `RangeError: Invalid time value`. Ese error **no** lo atrapa el catch interno (`:316-318`, solo maneja codes PG conocidos) → `throw e` → 500 "Error interno".

**Corrección a la hipótesis:** **NO** es overflow del `INTEGER` de `plazo_dias` (100M cabe, max 2.1e9) **ni** del `DATE` de PostgreSQL (verificado vivo: `'2026-01-15'::date + 100000000 = año 275816`, PG lo aguanta). El desborde es **de JS** (`.toISOString()`). Umbral de quiebre ≈ 99,979,466 días.

**Ley:** **NO hay tope numérico de plazo** en LOPSRM (art. 59 modificaciones; art. 59 Bis: el 50% es disparador de ajuste de costos, no un cap; los "45/15 días" son plazos procedimentales). Verificado verbatim. → la cota máxima es **criterio de diseño**. El profe mismo lo pidió así: *"que mejor ponga algo como excediste muchos días, no sé si la ley tenga un máximo."*

**Fix propuesto (no implementar):**
1. Validar `plazo_nuevo_dias` con cota máxima **antes** del cálculo (junto a `:124`/`:131`): p. ej. `PLAZO_MAX_DIAS = 36500` (~100 años) → **400** *"El plazo del convenio (N días) excede el máximo permitido (~100 años); revisa el dato."*
2. Red de seguridad: ampliar el catch interno (`:316-318`) para mapear codes de overflow de fecha de PG (`22007/22008`) a 400, como ya hace con `22003`. **No toca zona congelada.** **[validar]** el valor del tope (Nivel 1, decisión de diseño).

---

## 🟡 P5 — HU-05: el avance financiero "no se registra" → CONFIRMADO BUG (pero del corte de la curva, no del cálculo)

**Acertaste a medias, y tu pista metodológica fue exacta.** El financiero **SÍ se computa bien**: `financiero_pct = Σ pagos.importe ÷ monto ×100` (`estimacion-prep.controller.js:39-41`, reusado en `portafolio.controller.js:211,261`). **Verificado vivo:** PRUEBA-HU-04 = **20.85%**, HU-19 = **20.85%**, HU-24 = **69.50%** (los pagos existen). `programa.controller` NO tiene financiero (correcto, la curva HU-05 es físico/programado).

**El bug está en la GRAFICACIÓN de la curva** (`CurvaAvance.jsx:298`): el corte por periodo es `cutoff = (p.fin <= hoy ? p.fin : hoy)`. Cuando **todo el programa ya venció** (seed: programa termina 2026-05-31, hoy 2026-06-22) ningún periodo extiende su corte a hoy. Si el **pago es posterior al fin del último periodo** (seed: `fecha_pago = 2026-06-10`, justo después; es lo normal por art. 54: el pago llega hasta 20 días tras autorizar) **cae fuera de toda ventana** → la serie financiera y el KPI "Financiero a hoy" salen **0%** pese al 20.85%/69.50% real. *(El e2e `hu-05-curva-avance.spec.js:127` solo prueba el punto inicial 0%, por eso pasó desapercibido.)*

**Confirmación profe (audio):** *"hay que revisar que funcione el avance financiero, porque como que no lo está registrando"* (tras confirmar que sí hay pagos).

**Fix propuesto (no implementar):** en `CurvaAvance.jsx:298`, para el **periodo terminal** usar `cutoff = hoy` cuando `hoy >= último fin` (o garantizar que el último punto financiero = `Σ pagos<=hoy / monto`, el canónico). **Solo frontend, NO toca zona congelada.** Añadir un e2e con pago posterior al fin del programa. **[validar]** UX: ¿extender el eje X más allá del programa, o solo corregir el KPI/último punto? Lo mínimo: que el KPI deje de marcar 0%.

---

## ❌ P6 — HU-06: el aviso no bloqueante no salió → NO ES BUG (el aviso funciona; el seed lo hace irreproducible)

**No es un bug de código.** El aviso está implementado de punta a punta: backend `validarProgramaPeriodo` (`trabajos.controller.js:92-118`) devuelve `{aviso}` si el concepto no estaba programado **o** si excede lo programado; se devuelve en la respuesta 201 como `aviso_programa` (`:317`); el frontend lo **muestra** (`TrabajosTerminados.jsx:178-179` toast + banners en vivo `:408-417`). El art. 118 es el único bloqueo.

**Por qué no salió:** el **seed** (`seed_demo_24.sql:80-82`) programa **cada concepto 100% en UN periodo con programado == contratado**. Con eso, "excede lo programado sin rebasar lo contratado" es una **franja vacía**: cualquier exceso choca antes con el art. 118 (409). El único aviso reproducible con este seed es "no está programado" (imputando un concepto a un periodo sin celda). Además el **plan de pruebas (`:514-515`) describe un dataset (C-02 = 250 en P1) que NO existe en el seed.**

**Confirmación profe (audio):** *"si te dejo sin ningún aviso. Qué dice pendiente qué abrir bitácora"* → lo que viste fue el mensaje de **nota diferida** (que es el bug P23), no el aviso.

**Veredicto:** ❌ **NO ES BUG** de código. **Fix = datos:** ajustar el seed de PRUEBA-HU-06 para que un concepto tenga programado < contratado en su periodo (ej. CONC-01: 600 en P1 + 400 en P2; registrar 700 en P1 → aviso sin art. 118) **y** alinear el plan de pruebas. **No toca código de cálculo ni zona congelada.** *(El criterio 4 sigue [validar]: el profe confirma si "adelantar a precios pactados sin convenio" es lo correcto frente al art. 118.)*

---

## ❌ P7 — HU-03 crit. 2: versión nueva inmutable + anterior sustituida → NO ES BUG (funciona)

**Funciona exactamente como dice el criterio.** Para convenio monto/programa/mixto (`tocaPrograma`, `convenios.controller.js:128`): snapshot perezoso de v1 (`:190-191`) → muta catálogo y **re-deriva el monto canónico** (`:219-221`) → re-cuadra con `guardarMatriz({convenioId})` (`:291`) → **supersede la anterior** (`UPDATE programa_version SET vigente=false, supersedido_en=NOW()`, `:292`) → **crea versión nueva vigente** (`:293`). Inmutabilidad blindada por **trigger** (`schema.sql:1584-1603`, solo permite `vigente true→false`) + **índice único parcial** (`uq_programa_version_vigente`, `:1580`, confirmado vivo). Un convenio de **plazo puro NO versiona** (correcto). e2e `hu-03-convenios.spec.js:272+` ya asierta "v1 superseded + v2 vigente".

**Confirmación viva:** 0 versiones en los 24 contratos porque el único convenio sembrado es de **plazo** (id 1132, PRUEBA-HU-03) → coherente con la regla. **Acertaste al marcarlo "verificar":** en la BD viva no había versión que mostrar, pero el comportamiento existe y es correcto. **Fix:** ninguno. *(Opcional: sembrar un convenio de monto en PRUEBA-HU-03 para verlo en vivo sin correr e2e.)*

---

## ❌ P8 — HU-09 crit. 5: aceptación tácita al vencer el plazo → NO ES BUG (funciona, derivado en lectura)

**Funciona.** La aceptación tácita se **deriva en lectura** (no hay job ni estado almacenado que cambie): `construirPayloadNotas` calcula `plazo_vencido = NOW() > n.fecha + plazo_firma_dias` (`bitacora.controller.js:614`) y si la nota no se firmó/respondió a tiempo → `aceptacion = 'aceptada_tacita'` (`:668`). La campana excluye las vencidas (`notas-pendientes.controller.js:23`). El estado físico solo es `'emitida'`/`'anulada'` (verificado vivo: hay 2 notas ya vencidas que siguen `'emitida'` — la aceptación es puro cálculo). **Ley** (verbatim, `reg_utf8.txt:4550-4551`, art. 123 fr. III): *"se establecerá un plazo máximo para la firma de las notas, debiendo acordar las partes que se tendrán por aceptadas una vez vencido el plazo."*

**Acertaste al marcarlo "verificar":** existe y respeta historia + ley. **Fix:** ninguno. *(Opcional: una nota de seed con fecha pasada para demostrarlo en QA sin esperar 2 días.)*

---

# PARTE B — Limpieza de historias (solo PROPUESTA, no edité el archivo)

> Leí completo `Historias_Usuario_ACTUALIZADAS_12jun.md` y **verifiqué todas las instrucciones contra el audio del profe (21-jun)**. **Conservar TODOS los fundamentos legales** (el profe: *"cada historia tiene un fundamento… eso está bien"*). Respaldar el archivo en `docs/historial/requisitos/` antes de editar.

### B.1 — Tecnicismos a reescribir (ejemplos verbatim → propuesto)
| Historia | Original | Propuesto |
|---|---|---|
| HU-06 | "append-only: no se edita ni se elimina; corregir… anula la entrada anterior y registra una nueva vinculada" | "la captura no se edita ni se elimina; para corregir, la anterior queda **anulada** y se registra una nueva ligada a ella" |
| HU-06 | "La cantidad **se redondea a 3 decimales** antes de validar y guardar." | "La cantidad admite **hasta 3 decimales**." |
| HU-07 / HU-09 | "nota inmutable… con **folio correlativo**" | "nota que **ya no se puede modificar**, con su **número de folio consecutivo**" |
| HU-09 (título) | "notas **tipificadas**" | "notas **de bitácora** (de los tipos del art. 125)" |

*Profe (verbatim): "¿Qué es eso de append only? Que lo quite. Nada de términos técnicos" · "redondear a 3 decimales… que lo quite de las historias" · "¿Qué es un folio correlativo?" · "¿Qué es una nota tipificada?"*

### B.2 — Menciones meta/internas a quitar (verbatim)
- HU-04 c3: *"(se quitaron los filtros de folio, contratista, empresa y objeto porque…)"* → **quitar** (profe: *"si no le voy a leer eso al profe y le va a dar cáncer"*).
- HU-04 c2: *"con respaldo al dato del alta si hiciera falta"* → **quitar** (profe: *"No entiendo qué se refiere… hay que quitar eso"*).
- HU-02: *"y el nombre del archivo PDF"* → **quitar** (profe: *"nada más hay que quitarle lo de y el nombre del archivo PDF"*).
- HU-03 c6: *"diferir el efecto material hasta la autorización es un ajuste posterior coordinado con el equipo de estimaciones"* → **quitar** (obsoleto; profe: *"eso ya hay que quitarlo… el sistema ya está en su etapa final"*).
- Referencias internas: *"Hallazgo del profe, audio 2026-06-01"*, *"criterio del equipo / default conservador"*, *"[PARA MAIKI]"*, *"(resueltos — ver TABLA_VALIDAR_PROFE_RESUELTOS…)"* → se van con los bloques "Criterios adoptados".

### B.3 — Sacar los bloques "Criterios adoptados" a archivo aparte
Profe: *"hay que quitarlo, los criterios adoptados, y mejor que me los ponga en otro archivo"*. → **Crear `docs/requisitos/CRITERIOS_ADOPTADOS_INTERNO.md`** y mover ahí los **27 bloques "Criterios adoptados"** (HU-00…HU-24 + Registro + Por Firmar) + las secciones "[PARA MAIKI]"/"Pendientes" de HU-20. *(Acción distinta de B.1: una cosa es limpiar el texto de los criterios, otra mover el bloque "Criterios adoptados".)*

### B.4 — Pantallas a especificar (quitar ambigüedad)
- **HU-06**: "en el formulario" → **"en la pantalla Registrar avance"** (`/seguimiento/trabajos-terminados`). Profe: *"que se especifique cuál es el formulario, que no sea ambiguo."*
- **HU-12**: "la pantalla" → **"paso 3 'Carátula' del wizard de estimación"**.
- **HU-15**: "la vista" → **"pantalla de Revisión de la estimación"**.
- **HU-01 "precio alzado" → DEJAR COMO DUDA, no inventar.** Busqué "precio alzado" en TODOS los audios: el profe lo **leyó pero NO lo entendió ni lo confirmó**: *"¿Y qué es eso de precio alzado? No sé dónde está lo del precio alzado. Eso hay que preguntarle… que especifique bien en qué pantalla se debe ver."* → marcar visiblemente como **pregunta abierta al profe** al inicio de HU-01. *(El profe sí discutió "precio unitario" —cantidad × P.U.—, que es distinto.)*

### B.5 — Reordenar por FLUJO (sin renumerar los IDs)
Profe: *"las historias nada más que las cambie de lugar en el punto MD"* (conservar HU-00…HU-24). Orden propuesto:
`HU-00 → Registro → HU-23 → HU-01 → HU-02 → HU-22 → HU-08 → Por Firmar → HU-09 → HU-10 → HU-11 → HU-05 → HU-06 → HU-07 → HU-12 → HU-13 → HU-15 → HU-16 → HU-20 → HU-21 → HU-03 → HU-24 → HU-04 → HU-14 → HU-17 → HU-18 → HU-19`
(alta → fianzas → roster → bitácora → notas → minutas → avance/curva/atraso → estimación → revisión → pago → convenio → finiquito → **consultas** al final).

### B.6 — Hallazgos extra del audio (no son de esta limpieza de texto, pero anótalos)
- **HU-03 c1**: el texto dice *"recibe un aviso de acceso denegado"* pero el sistema muestra *"vista solo de consulta para tu rol"*. Profe: *"hay que mover eso"* → ajustar la redacción (o el sistema).
- **HU-03 c5**: el profe quiere **quitar** de la nota la frase *"marca cuando la variación exige revisión de la SFP…"* porque *"esa no la veo en el sistema"* (revisar si es solo redacción o falta UI).
- **Cita a verificar (HU-09 c1):** el texto dice "tipos del **art. 125**"; el profe lo leyó como "art. 123". **Verificar contra `docs/legal` cuál es el correcto antes de tocar** (es número de artículo, no jerga — no cambiar a ciegas).

---

## Cierre
- **No apliqué nada** (PARTE A ni B). Tú revisas y decides qué se corrige.
- **Bugs reales a corregir:** P23 (convenio + avance: exigir bitácora — el más serio, audio decisivo), P4 (cota de plazo + 500→400), P5 (corte de la curva financiera), P1 (canonicalizar `tipo` de garantía — el robusto toca `schema.sql`). **No-bugs:** P6 (arreglar seed/plan), P7, P8.
- **[validar] contigo/profe:** ¿sustitución/estimación también exigen bitácora? · valor del tope de plazo · UX de la curva · art. 123 vs 125 en HU-09 c1.
- Stack sigue arriba (lo usé para verificación viva solo-lectura; no muté nada). Respaldar las historias en `docs/historial/requisitos/` antes de cualquier edición de PARTE B.
