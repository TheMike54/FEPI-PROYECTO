# Plan de resolución — 7 brechas restantes (preentrega jueves / final viernes)

> **Fecha:** 2026-06-23 · **Tipo:** SOLO ANÁLISIS Y PLAN (no se tocó código) · **Base:** lectura del código real
> (7 agentes read-only) + verificación legal con **texto literal** de `docs/legal/lopsrm.txt` y `reg.txt`.
> **Decisión conjunta pendiente:** este doc propone; Maiki decide qué entra y en qué orden.

---

## 0. Verificación legal (texto LITERAL, no de memoria)

| Pregunta | Veredicto | Cita literal |
|---|---|---|
| **Plazo de revisión/autorización de estimaciones: ¿54 o 58?** | **Art. 54 LOPSRM — 15 días naturales.** El profe erró el artículo (no es 58); acertó los días. El **código ya cita 54: correcto, no cambiar.** | Art. 54 LOPSRM (lopsrm.txt:2950): *"…la residencia para realizar la **revisión y autorización de las estimaciones** contará con un plazo no mayor de **quince días naturales** siguientes a su presentación."* El mismo art. 54 fija presentar = **6 días** (l.2948) y pagar = **20 días** (l.2964). Reforma DOF 14-11-2025. |
| **Umbral convenio → revisión/autorización SFP** | **25% — Art. 102 RLOPSRM** (remite al párr. 4 del art. 59 de la Ley). El código cita 102: **correcto.** | Art. 102 RLOPSRM (reg.txt:3818-3835): *"…cuando la modificación a los contratos implique aumento o reducción por una diferencia superior al **veinticinco por ciento**… Será necesario solicitar… la autorización de la **Secretaría de la Función Pública**…"* |
| **Umbral convenio → ajuste de costos indirectos/financiamiento** | **50% — Art. 59 Bis LOPSRM.** El código cita 59 Bis: **correcto.** | Art. 59 Bis LOPSRM (lopsrm.txt:3262-3263): *"Cuando la modificación en los convenios implique aumento o reducción por una diferencia superior al **cincuenta por ciento** del importe original… podrá solicitar el ajuste de costos indirectos y del financiamiento…"* (adicionado DOF 16-04-2025). |
| **Respaldo legal de los ADICIONALES (G2)** | **Art. 101 RLOPSRM — DIRECTO.** Obliga a administrar los conceptos de convenio aparte y a distinguirlos. | Art. 101 RLOPSRM (reg.txt:3802-3809): *"…los conceptos… al amparo de convenios en monto o plazo… se deberán **considerar y administrar independientemente** a los originalmente pactados… debiéndose **formular estimaciones específicas**… pueden incluirse en la misma estimación, **distinguiéndolos unos de otros**, anexando la documentación que los soporte **para efectos de pago**."* |

**Implicación legal por brecha:** G2 (adicionales) tiene respaldo literal en **art. 101 RLOPSRM** — la distinción NO es opcional. El resto de brechas son **presentación / coherencia / auditoría** sin validación legal nueva (las citas que usan ya están en el código). El **"pagar distinto"** de los adicionales: el art. 101 dice "distinguiéndolos para efectos de pago" = se identifican en la estimación, **no** que exista un segundo flujo de pago; el pago sigue por el mecanismo del art. 54. → la vía mínima (etiquetar/distinguir) **sí** cumple la ley; un "flujo de pago separado" sería sobre-ingeniería.

---

## 1. Tabla maestra de las 7 brechas

| # | Brecha | Archivos | Schema | Z. congelada | Riesgo | Esfuerzo | Veredicto profe | Depende |
|---|---|---|---|---|---|---|---|---|
| **G1** | Curva no versionada (26%→13%) | `CurvaAvance.jsx` (solo front) | **No** (programa_version ya existe y se puebla) | **No** | medio | **M** | 🔴 **TACHE** | — |
| **G2** | Adicionales no se leen/distinguen | `estimacion-prep.controller` + `IntegracionEstimacion.jsx` + `ConsultaExpediente.jsx` | **No** (`es_adicional` ya existe) | **No** | bajo | **S** | 🔴 **TACHE** | G3 (suave) |
| **G3** | Carátula no exportable (PDF/print) | **NUEVO** `DocumentoCaratula.jsx` + `IntegracionEstimacion.jsx` | **No** | **No** | bajo | **S** | 🔴 **TACHE** | — |
| **G4** | Finanzas re-captura + instrucción no cierra | `RegistroPagoForm.jsx`, `AmbientePago.jsx`, `RegistroPago.jsx`, `pagos.controller` | **No** (`instruccion_pago` ya tiene los campos + `'cumplida'`) | **No** | medio | **M** | 🟡 MEJORA | — |
| **G5** | Sin notificación "ve a cobrar" al autorizar | `instruccion-pago.controller`+`routes`, `api.js`, `AppShell.jsx`, `NotificacionesCentro.jsx` | **No** (se deriva) | **No** | bajo | **S** | 🔴 **TACHE** | — |
| **G6** | Portafolio sin "pago sin respaldo de avance" | `portafolio.controller`, `PortafolioEjecutivo.jsx` | **No** (se deriva) | **No** | bajo | **S** | 🟡 MEJORA (ejemplo citado) | — |
| **G7** | Sellos de fecha autorizada/rechazada/pagada | `schema.sql` (aditivo), `estimaciones-ciclo.controller`, `pagos.controller`, `HistorialEstimaciones.jsx` | **Sí, aditivo idempotente** (mínima: **No**) | **No** (UPDATEs en E3; estimaciones.controller NO participa) | bajo | **S** | 🟡 MEJORA | — |

**Dos hechos que valen oro (de la auditoría de código):**
1. **NINGUNA de las 7 obliga a tocar el controller congelado `estimaciones.controller`.** Autorizar/rechazar viven en `estimaciones-ciclo` (Equipo 3, no congelado); pagar en `pagos.controller` (no congelado); adicionales se exponen vía `estimacion-prep` (no congelado). Confirmado con grep.
2. **Solo G7 toca el esquema, y de forma aditiva idempotente** (ADD COLUMN nullable) — y su versión MÍNIMA ni siquiera eso (deriva las fechas de datos ya existentes). Las otras 6 son **cero schema**.

---

## 2. Ficha por brecha (hallazgo + propuesta mínima/completa)

### G1 · Curva no versionada — 🔴 TACHE · front-only · riesgo medio · M
**Hallazgo.** `CurvaAvance.jsx` normaliza las 3 series sobre el estado VIGENTE: el financiero divide por `selected.monto` (l.293), que el convenio SOBREESCRIBE (`UPDATE contratos SET monto` en convenios.controller:247); programado/ejecutado dividen por `denom = Σ contratado` leído del catálogo VIVO (incluye adicionales). Por eso, al autorizar un convenio que sube el monto, **los % de periodos ya cerrados se re-escalan hacia abajo** ("26% hoy, 13% mañana"). **La infraestructura que lo arregla YA existe y se puebla** (`programa_version` con monto/created_at/supersedido_en por versión, y los endpoints `api.convenios`/`api.versionPrograma`), pero la curva no la consume.
**Mínima (demo):** cargar `api.convenios(id).versiones`; para cada punto, dividir el financiero por el **monto de la versión vigente a la fecha de cierre de ese periodo** (no el monto actual). Mata el síntoma que el profe nombró. Solo toca `financieroMap`.
**Completa:** reconstruir las 3 series por tramos con `api.versionPrograma(versionId)` (catálogo+celdas por versión) → curva "escalonada", ningún punto histórico se mueve jamás.
**Legal:** ninguna; es criterio de diseño (presentación). El monto por versión ya está persistido.

### G2 · Adicionales no se leen — 🔴 TACHE · riesgo bajo · S · **respaldo art. 101 RLOPSRM**
**Hallazgo.** `es_adicional` se ESCRIBE (convenios.controller:239) pero **nadie lo LEE**: `estimacion-prep` no lo trae en su SELECT, `IntegracionEstimacion` no lo pinta, el expediente lo recibe (`contratos.controller:603 SELECT *`) pero `ConsultaExpediente` lo ignora. Los adicionales son indistinguibles de los originales en toda la UI.
**Mínima (demo, sin tocar congelado):** (1) añadir `cc.es_adicional` al SELECT de `estimacion-prep.controller` y propagarlo; (2) chip "Adicional (convenio)" en la tabla de generadores de `IntegracionEstimacion` + asegurar que los adicionales pasen el filtro de periodo (para estimarlos "en paralelo"); (3) marca "Adicional" en el catálogo del expediente (`ConsultaExpediente`, el dato ya llega). Lectura pura.
**Completa (NO recomendada para la demo):** carátula con bloques obra-original vs adicionales y cómputo de importe separado → tocaría `detalleEstimacion` (CONGELADO) o un endpoint nuevo. **[validar profe]:** "pagar distinto" según art. 101 = distinguir para efectos de pago, NO un segundo flujo. La mínima ya cumple el art. 101.
**Legal:** **Art. 101 RLOPSRM** (administrar independientemente / estimaciones específicas / distinguir).

### G3 · Carátula exportable — 🔴 TACHE · front-only · riesgo bajo · S
**Hallazgo.** La carátula GACM ya se PINTA (preview en `TabCaratula` + recortada en `ModalDetalle`), pero **no hay documento imprimible/exportable** ni botón. El patrón de impresión YA funciona y está probado dos veces (`DocumentoNota.jsx`, `DocumentoFiniquito` en `Finiquito.jsx`, con `window.print()` + `@media print` en `index.css:55-64`). El backend `detalleEstimacion` YA devuelve carátula + generadores + `acumulados` ricos + notas; el encabezado del contrato y los nombres del roster vienen de `listarContratos` (`selected`). **No falta dato ni cálculo, solo el documento.**
**Mínima (demo, ~2-3h):** componente NUEVO `DocumentoCaratula.jsx` calcado de `DocumentoFiniquito` (clase `doc-nota-abierto`, `data-print-area`, botón `window.print()`), que pinta el documento GACM (membrete, encabezado, **resumen de generadores** reusando el JSX de `ModalDetalle`, carátula sin IVA, tabla de acumulados/saldos del objeto `acumulados`, firmas). Botón "📄 Ver/Imprimir carátula" en `ModalDetalle` → sale de la estimación REAL integrada.
**Completa:** además imprimir el preview vivo desde el wizard.
**Legal:** ninguna nueva (art. 143, 191 LFD, 2-XIX, 132 ya citados).

### G4 · Finanzas re-captura / instrucción no cierra — 🟡 MEJORA · riesgo medio · M
**Hallazgo.** La instrucción YA hereda el folio del contratista (`instruccion_pago.factura_cfdi = sop.folio_cfdi`), pero `RegistroPagoForm` arranca VACÍO y finanzas re-teclea folio/fecha/referencia; el botón de la cola navega con `?contrato=` (sin `estimacion_id`), así que ni siquiera preselecciona la estimación. Y tras pagar, `instruccion_pago` queda en `'emitida'` para siempre (la cola la marca "pagada" por un EXISTS, pero **no sale de la cola**). `'cumplida'` ya está en el CHECK y no hay trigger de inmutabilidad → avanzar el estado es un UPDATE simple.
**Mínima (demo):** (A) cola→form pasando `&estimacion=`; pre-llenar `facturaCfdi` desde `api.transitoEstimacion` (heredado, solo-lectura); (B) en `registrarPago`, en la misma tx, `UPDATE instruccion_pago SET estado='cumplida'` → la solicitud SALE de la cola.
**Completa:** cotejo server-side del folio (derivarlo, no pedirlo); persistir fecha del CFDI ([validar], posible columna aditiva).
**Legal:** ninguna nueva (cotejo = coherencia de datos; art. 54 ya citado).

### G5 · Notificación "ve a cobrar" + orden de pago — 🔴 TACHE · riesgo bajo · S
**Hallazgo.** Al autorizar (HU-15), solo se cambia estado + nota `res_estimaciones`. **NO hay notificación al contratista** "ve a presentar documentos a pago". La "orden de pago" = `instruccion_pago`, que **por diseño la promueve el CONTRATISTA** (FIX 22-jun: `generarInstruccion` gateado a rol contratista) tras presentar CFDI/factura/fianza → NO debe auto-generarse al autorizar. La campana in-app ya existe y es reutilizable; HOY el contratista ya ve la nota de autorización como un genérico "firmar nota", pero **falta el encuadre "tienes una estimación autorizada por cobrar".**
**Mínima (demo, sin schema):** `GET /api/instruccion-pago/por-cobrar` (estimaciones `autorizada` sin `instruccion_pago`, acotado por participación, igual que `colaCobro`) → en `AppShell`/`NotificacionesCentro`, item accionable para el contratista: "Estimación #N autorizada — presenta documentos para cobro" → `/pagos/ambiente`.
**Completa:** copy explícito en el toast/banner de autorización; opcional ancla del plazo art. 54 (`autorizada_en`, aditivo — coincide con G7).
**Legal:** ninguna nueva (instruccion_pago = art. 54; notificación = operativa).
**⚠ DECISIÓN MAIKI (no legal):** ¿la "orden de pago" que el profe espera es la `instruccion_pago` que **promueve el contratista** (modelo vigente) o espera que **autorizar la genere automáticamente**? Recomiendo dejarla como está (la promueve el contratista, con sus soportes) y solo cerrar la NOTIFICACIÓN — es lo que el profe verbaliza.

### G6 · Portafolio "pago sin respaldo de avance" — 🟡 MEJORA (ejemplo citado) · riesgo bajo · S
**Hallazgo.** El portafolio YA calcula `fisico_pct` y `financiero_pct` server-side y los muestra lado a lado, pero **no los confronta**. El semáforo suma 3 factores (desviación, plazos, pendientes); **no hay un cuarto** que detecte `financiero > físico`. Un contrato con pago alto y avance bajo puede salir VERDE (justo el "pagaste sin avance reportado" que citó el profe). No existe ningún texto "sin respaldo" en el front.
**Mínima (demo):** derivar `pago_sin_avance = financieroPct > fisicoPct + holgura(~1pp)`, exponer `riesgos:{pago_sin_avance, excedente_pp}` y pintar badge "⚠ Pago sin respaldo de avance (+X pp)" en el panel de detalle.
**Completa:** convertirlo en 4º factor del semáforo (eleva el color automáticamente).
**Legal:** concepto fundado (art. 54 = pagar obra ejecutada; art. 143-I = amortización proporcional al avance); el **número del umbral** = `[validar]` criterio del equipo (igual que los otros umbrales).

### G7 · Sellos de fecha — 🟡 MEJORA · riesgo bajo · S (mínima sin DDL)
**Hallazgo.** `estimaciones` solo tiene `integrada_en` y `enviada_en`; no hay `autorizada_en/rechazada_en/pagada_en`. Los UPDATE de estado viven en `estimaciones-ciclo` y `pagos.controller` (NO congelados; `estimaciones.controller` no participa). El front de Historial YA está cableado para mostrar `fechaRevision`/`fechaPago` si llegaran, pero siempre caen en null. El tablero "congela" la antigüedad en `enviada_en`.
**Mínima (demo, SIN DDL):** llenar las transiciones del historial con datos ya disponibles: pago = `pagos.created_at`/`fecha_pago` (LEFT JOIN); autorización = `created_at` de la nota `res_estimaciones` ligada; rechazo = `created_at` de la observación `tipo='rechazo'`. Cero schema.
**Completa (recomendada si hay tiempo):** columnas aditivas `autorizada_en/_por`, `rechazada_en/_por`, `pagada_en/_por`, selladas en los UPDATE. Más robusto. **Schema aditivo idempotente que integra Maiki.**
**Legal:** ninguna (sellos de auditoría).

---

## 3. Orden de ataque propuesto (razonamiento)

**Presupuesto:** jueves preentrega ~4h + viernes final ~2h ≈ 6h efectivas. El profe evalúa **historia por historia, sin crédito parcial** → maximizar "palomitas" priorizando **TACHE baratos y visibles**, dejando schema/congelado para el final.

**🟩 BLOQUE A — jueves, primeras ~2h · TACHE baratos, front-only, alto impacto visual**
1. **G3 Carátula exportable** (S) — el entregable central; patrón de impresión ya probado. **El mayor ROI:** una palomita en la HU más importante con riesgo casi nulo.
2. **G2 Adicionales visibles** (S) — barato, con respaldo legal directo (art. 101), y **alimenta G3** (la carátula puede etiquetar adicionales). Hacerlo junto con/antes de G3.
3. **G5 Notificación "ve a cobrar"** (S) — cierra el TACHE de HU-15 con un endpoint derivado + item de campana.

> A y B comparten zona: **G2+G3 tocan la estimación/carátula** (hacerlos juntos), **G5 toca pago/notificación**.

**🟦 BLOQUE B — jueves, resto ~2h · el TACHE de más esfuerzo**
4. **G1 Curva versionada** (M) — mata el "26%→13%" que el profe nombró textual. Hacer **solo la mínima** (congelar el denominador financiero por versión); si sobra, programado/ejecutado.

**🟨 BLOQUE C — viernes 2h (o si sobra el jueves) · MEJORAS baratas que cubren ejemplos citados**
5. **G6 Portafolio "pago sin respaldo"** (S) — bandera derivada; cubre el ejemplo exacto que dio el profe. Barato.
6. **G4 (parte barata)** — `UPDATE instruccion_pago→'cumplida'` (1 línea, la solicitud sale de la cola) + pre-llenar folio en el form. La versión completa (cotejo server-side) se deja fuera.

**⬜ PENDIENTE CONOCIDO (si no da el tiempo)**
7. **G7 Sellos de fecha** — MEJORA que el profe probablemente NO prueba a fondo (dato derivado en columna secundaria). Si entra, hacer la **mínima sin DDL**. El schema aditivo (versión completa) lo integra Maiki solo si hay margen. **Documentar como pendiente conocido — no es vergonzoso dejarlo.**

**Por qué este orden:**
- **Riesgo creciente:** A y B son **front-only, cero schema, cero congelado** → se pueden integrar y probar sin runbook de BD. G7 (lo único con schema) queda al final/pendiente.
- **TACHE antes que MEJORA:** G3, G2, G5, G1 son TACHE (el profe los marca si faltan); G6/G4/G7 son MEJORA. Si el tiempo se acorta, se corta desde el final (G7 → G4 → G6).
- **Agrupación por archivo:** G2+G3 (estimación), G4+G5 (pago) — abrir cada zona una sola vez.
- **Dependencia real:** solo G2→G3 (suave: la carátula muestra adicionales). El resto son independientes.

---

## 4. Decisiones que necesito de Maiki (para arrancar)

1. **G5 — "orden de pago":** ¿confirmas que la orden la **promueve el contratista** (modelo vigente) y solo cerramos la NOTIFICACIÓN, o el profe espera que **autorizar la genere automáticamente**? (Recomiendo lo primero.)
2. **G2 — "pagar distinto":** ¿basta **distinguir/etiquetar** los adicionales (cumple art. 101) o el profe exige un cómputo/flujo de pago separado? (Recomiendo solo distinguir; "pago separado" = sobre-ingeniería sin base legal.)
3. **G6 — umbral de holgura** (¿1 pp? ¿0?) para disparar "pago sin respaldo": es `[validar]` criterio del equipo.
4. **G7 — ¿mínima sin DDL (derivar fechas) o completa con columnas aditivas?** La completa toca schema (aditivo, lo integras tú).
5. **Alcance del jueves:** ¿confirmas Bloque A+B para la preentrega y dejamos C/G7 para viernes/pendiente?

---

*Plan generado en sesión 2026-06-23. Solo análisis; no se tocó código ni schema. Citas legales verificadas contra el texto literal de `docs/legal/`.*
