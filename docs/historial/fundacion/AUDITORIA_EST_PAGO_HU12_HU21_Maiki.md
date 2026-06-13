# Auditoría y endurecimiento del ciclo estimación→pago (HU-12 + HU-21) — Pasada 4/4

**Autor:** Maiki (Fundación) · **Fecha:** 2026-06-04 · **Sobre:** main `9b89a4d` · **Tipo:** entregable interno.
**Método (como P1):** analizar HU-12/HU-21 hoy → comparar vs **ley** (`docs/legal/`) y vs **formato real del profe** (estimación GACM/NAICM) → listar huecos de enforcement → aplicar fixes claros, dejar condicionales las decisiones.

> ⚠️ **Nota sobre el formato real:** el archivo `Referencia_Estimacion_Real_NAICM.md` que mencionaste **NO existe**; en `docs/Referencias-estimaciones/` solo hay **6 imágenes de WhatsApp** de una carátula real de **GACM/NAICM** (estimación #17, contratista AUTODESK). Las **leí directamente** (3 de 6: carátula + 2 hojas de generadores) y de ahí salen los hallazgos del formato real. **No soy abogado.**

## Formato real (GACM/NAICM) — lo que el sistema debe parecerse

**Carátula = 3 bloques:**
1. **Importes SIN IVA:** importe del contrato (100%) · estimado acumulado anterior (%) · **estimación actual** (%) · estimado acumulado actual (%) · **saldo por estimar** (%).
2. **Del anticipo:** importe del anticipo (100%) · amortizado acumulado anterior (%) · amortización actual (%) · amortizado acumulado actual (%) · **saldo por amortizar** (%).
3. **Del neto a recibir (CON IVA):** importe estimación · **+ IVA estimación (16%)** · total con IVA · − amortización (+ su IVA) · − retenciones · − trabajos no ejecutados · **− 5 al millar SFP (0.5%)** · = **TOTAL NETO A PAGAR**.

**Generadores** por concepto: cantidad **según proyecto** (contratado) · **hasta estimación anterior** (acumulado) · **de esta estimación** (periodo) · **total estimado** · **por ejecutar** (saldo) · PU · importe.

## Tabla hueco-por-hueco

| # | Qué exige la ley / formato real (cita literal) | Qué hace hoy el sistema | Fix |
|---|---|---|---|
| **G1 PAGO no amarrado** | Integridad financiera (CLAUDE.md zona crítica). El pago real se hace **contra una estimación** (art. 54 LOPSRM: "las estimaciones… deberán pagarse…"). | `estimacion_ref` es **TEXTO LIBRE**, `estimacion_id` se inserta **NULL**; cualquier folio inventado pasa. | **APLICADO**: el pago exige `estimacion_id` REAL, valida que **pertenezca al contrato** y exista. |
| **G2 importe arbitrario** | El pago = el **neto** autorizado de la estimación (no más que lo certificado, cf. art. 118). | El importe se **teclea a mano** (solo `> 0`); se puede pagar de más/menos. | **APLICADO**: `importe = estimaciones.neto` (server-side, no editable; el front lo muestra read-only). [validar: parcial vs exacto] |
| **G3 doble pago** | Una estimación se paga **una vez**. | **No hay UNIQUE** ni chequeo: se insertan pagos duplicados sin error. | **APLICADO**: `UNIQUE PARCIAL uq_pagos_estimacion` + `FOR UPDATE` + chequeo en la transacción → 409. |
| **G4 estado / cierre (CA-1)** | El pago debe **marcar la estimación pagada** y solo pagar estimaciones válidas. | No lee el estado; no cierra nada (el banner admitía "diferido a HU-12"). | **APLICADO**: solo paga `integrada`/`autorizada` (no rechazada/pagada); al pagar avanza la estimación a **`pagada`** (mismo TX; el trigger deja libre `estado`). [validar: ¿exigir 'autorizada' cuando exista HU-15?] |
| **G5 estimación vs PROGRAMA (A2)** | **art. 45 ap. A fr. X RLOPSRM** ("programa… cuantificado por periodos") + **art. 52 LOPSRM** ("el programa… será la base… del avance") + **art. 118**. | HU-12 valida art. 118 **solo contra el total contratado** (`contrato_conceptos.cantidad`), **nunca contra `programa_obra`**: puedes ejecutar el 100% en la estimación #1 sin error. | **APLICADO**: el acumulado por concepto no puede exceder lo **planeado hasta el periodo** (Σ `programa_obra` de periodos con `fin ≤ periodo_fin`), si el contrato tiene programa A2 → 409. [validar: bloqueo vs alerta] |
| **G6 PDF firmado server-side** | El contrato se formaliza con su PDF (HU-01); >30% de anticipo exige autorización del titular (**art. 50 fr. IV LOPSRM**). | El gating del PDF (firmado/anticipo) vive **SOLO en la UI** (`AltaContrato.jsx`); por API directa se integra estimación / abre bitácora sobre un contrato **sin PDF**. | **APLICADO** (en el punto financiero): `integrarEstimacion` exige `EXISTS(contrato_documentos tipo='contrato')` → 409; si `anticipo_pct > umbral` exige además `'anticipo_autorizacion'`. Umbral parametrizable. |
| **G7 acumulados/saldos en carátula** | El formato real lleva estimado/amortizado **acumulado** + **saldo por estimar/amortizar** + %. | La carátula persiste **solo el periodo actual** (subtotal/amort/retención/neto); no expone acumulados/saldos. | **APLICADO** (read-side): el detalle DERIVA `acumulados` (sin IVA + anticipo, con %) de las estimaciones previas no rechazadas. No muta nada inmutable. |
| **G8 IVA** | El formato real INCLUYE **IVA (16%)** en el neto a pagar; la carátula de progreso es **SIN IVA** (**art. 2 fr. XIX RLOPSRM**: "monto total ejercido… **sin considerar el impuesto al valor agregado**"). | El sistema NUNCA calcula IVA: carátula sin IVA y pago = neto sin IVA. | **DECISIÓN** → patch CONDICIONAL (ver abajo). |

### Citas verificadas (literal)
- **art. 54 LOPSRM**: *"Las estimaciones… deberán formularse con una periodicidad no mayor de un mes… deberán pagarse… en un plazo no mayor a veinte días naturales… que el contratista haya presentado la factura…"*.
- **art. 2 fr. XIX RLOPSRM**: *"Monto total ejercido: el importe… **sin considerar el impuesto al valor agregado**"*.
- **art. 45 ap. A fr. X RLOPSRM** (programa por periodos) + **art. 52 LOPSRM** ("el programa… será la base conforme al cual se medirá el avance") + **art. 118 RLOPSRM** (no exceder).
- **art. 191 LFD**: 5 al millar (ya en la carátula). **art. 128 RLOPSRM**: retención de derechos/impuestos sobre la estimación.

## G8 — DECISIÓN del IVA (NO aplicado; patch condicional)

**Hallazgo legal:** el **IVA (16%) y su desglose NO están en LOPSRM/RLOPSRM/LFD** — los rige la **Ley del IVA** y las reglas **CFDI del SAT** (fuera de `docs/legal/`). La carátula de **progreso** es correcta SIN IVA (art. 2 fr. XIX). Pero el **pago real** al contratista lleva IVA (factura/CFDI), como muestra el formato del profe. Son **dos cosas distintas**: *monto ejercido* (sin IVA) vs *neto a pagar* (con IVA).

**Recomendación:** **mantener** la carátula de progreso SIN IVA (no romper el cuadre art. 2 fr. XIX), y **agregar un bloque de "neto a pagar"** con IVA **parametrizable** (`IVA_TASA`, default 16, NO hardcodeado, [validar con el profe]) en la RESPUESTA de la estimación (no muta lo persistido). El patch condicional `AUDITORIA_EST_PAGO_IVA_DIFFS.patch` lo hace. **No lo apliqué** — lo decides tú con el profe.

## Fixes aplicados — pruebas (local, vía endpoints reales)

| Prueba | Resultado |
|---|---|
| Migración idempotente 2× (`psql --single-transaction`) + UNIQUE creado | ✅ exit 0 |
| **G5** est-vs-programa: A1=80 en periodo con planeado 60 → rechazado | ✅ 409 |
| **G6** PDF gating: integrar estimación en contrato sin PDF → rechazado | ✅ 409 |
| estimación dentro del plan (A1=60) → integra | ✅ 201, neto 2985 |
| **G1/G2/G4** pago: `estimacion_id` real, `importe`=neto (2985, derivado), estimación → **pagada** | ✅ 201 |
| **G3** no-doble-pago: pagar la misma estimación 2× → rechazado | ✅ 409 |
| **G7** acumulados/saldos en el detalle | ✅ derivados |
| `vite build` + suite Playwright | ✅ build 6.98s · **153 passed · 8 skipped · 0 failed** (+5 del roster, sin regresión) |

## Runbook de migración
**Local (probado):**
```bash
docker exec -i sigecop_db pg_dump -U sigecop -d sigecop_db > backup_local_$(date +%Y%m%dT%H%M%S).sql
docker exec -i sigecop_db psql -U sigecop -d sigecop_db --single-transaction -v ON_ERROR_STOP=1 < backend/src/db/schema.sql   # 2× = exit 0
docker restart sigecop_backend && curl -s localhost:4000/api/health
```
**Render:** backup → aplicar `schema.sql` (`--single-transaction`, el UNIQUE parcial es aditivo, no rompe pagos legacy con `estimacion_id` NULL) → verificar → push. Parametrizar en Render si aplica: `ANTICIPO_UMBRAL_PDF` (default 30).
⚠️ **Coordinación frontend↔backend:** el endurecimiento de HU-21 CAMBIA el contrato del endpoint de pago (ahora `estimacion_id`, sin `importe` ni `estimacion_ref` libres). `RegistroPago.jsx` se actualizó en el MISMO cambio (selector de estimación + importe read-only). Cualquier cliente viejo que mande `estimacion_ref`+`importe` recibirá 400.

## Archivos tocados
| Archivo | Cambio |
|---|---|
| `backend/src/db/schema.sql` | M — `UNIQUE PARCIAL uq_pagos_estimacion` (no-doble-pago) |
| `backend/src/controllers/estimaciones.controller.js` | M — PDF gating (G6) + est-vs-programa (G5) + acumulados (G7) |
| `backend/src/controllers/pagos.controller.js` | M — amarre a estimación + importe=neto + no-doble-pago + avance a 'pagada' (G1-G4) |
| `frontend/src/pages/RegistroPago.jsx` | M — selector de estimación + importe read-only (G1-G2) |
| `frontend/e2e/roster-sustitucion.spec.js` | **nuevo** — spec e2e del roster (pasada 2) |

## Pendiente / follow-on (honesto)
- **5 `test.fixme`** (hu-08 ×2, hu-12 ×1, hu-21 ×2): son tests de "formulario editable / solo-consulta" que requieren **sembrar** un contrato + bitácora/estimación reales y renderizar el form con datos. Convertirlos a integración es trabajo per-test (cada uno con su seed). **Agregué el spec del roster** (nueva cobertura) en esta pasada; la conversión de los 5 fixme queda como follow-on acotado (no los des-fixme sin su seed, romperían la suite). El patrón: `enterAppMode(rol)` + sembrar vía SQL + des-`fixme`.
- **G5** (est-vs-programa) y **G6** (umbral anticipo) tienen un `[validar con el profe]`: ¿bloqueo duro o alerta? ¿el % del umbral?
- **G8 IVA**: aplicar el patch condicional solo si el profe confirma tasa/desglose.
- Documentos del **art. 132** (croquis, fotos, controles de calidad) no se exigen completos como adjuntos formales.

**Suite:** **153 passed · 8 skipped · 0 failed** (verde; +5 del spec del roster; 5 `test.fixme` intactos). `vite build` OK; migración idempotente 2×; smoke de los 6 fixes (G1–G7) vía endpoints reales en verde.
