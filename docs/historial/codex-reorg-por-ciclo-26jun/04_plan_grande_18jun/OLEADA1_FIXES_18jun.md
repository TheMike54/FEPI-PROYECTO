# OLEADA 1 — Quick wins (errores + cierres legales) · 18-jun-2026

> **Fase 1 del `PLAN_MAESTRO_EJECUCION_18jun.md`.** Los 6 fixes de bajo riesgo que más se notan, cada uno con
> su prueba y su cita legal **verificada contra `docs/legal`** (lopsrm.txt / reg.txt). Local, sin push; Maiki
> integra. Método: blueprint quirúrgico (workflow `ws6d3q9zt`, 12 agentes, verificación adversarial) →
> implementación → suite.
>
> **Citas legales: 5/5 verificadas contra el texto de la ley.** El verificador del blueprint propuso 1 cambio
> (minutas a fr. V) que la verificación directa **descartó** (la fr. X es la correcta).

---

## Resumen

| Fix | Qué | Zona | Cita (verificada) | Estado |
|---|---|---|---|---|
| 1.1 | Finiquito bloquea el ciclo de estimación | `estimaciones.controller` (congelado) + `estimaciones-ciclo` | art. 64 LOPSRM ✓ | hecho |
| 1.2 | Minutas/visitas muestran el FOLIO, no el id | `minutas.controller` + `MinutasVisitas.jsx` | art. 123 fr. X RLOPSRM ✓ | hecho |
| 1.3 | Endoso valida monto/vigencia por motivo | `garantias.controller` | art. 91 RLOPSRM ✓ | hecho |
| 1.4 | Quitar placeholder FALSO de generadores | `AmbienteEstimacion.jsx` | art. 118 RLOPSRM ✓ | hecho |
| 1.5 | Atraso: no duplicar el asiento (idempotencia) | `alertas.controller` + **DDL nueva** | art. 123 RLOPSRM ✓ | hecho |
| 1.6 | Sidebar: pill con rango de HU por flujo | `Sidebar.jsx` | — (UX) | hecho |

**Validación rápida:** los 6 specs afectados → **28/28 verde** (41 s). Vite build OK. Suite completa: _(ver al pie)_.

---

## Detalle por fix

### 1.1 — Finiquito BLOQUEA el ciclo de estimación ⚖️
- **Síntoma:** con el contrato `cerrado` (finiquito elaborado) aún se podían integrar/enviar/autorizar/
  rechazar/reingresar estimaciones. Solo el tránsito a pago consultaba el estado.
- **Causa raíz:** ni `integrarEstimacion` ni las transiciones del ciclo leían `contratos.estado`.
- **Cambio:**
  - `estimaciones-ciclo.controller.js` (NO congelado): helper `gateContratoCerrado` + `c.estado AS
    contrato_estado` en `cargarEstimacionConContrato` y en el SELECT de `enviarEstimacion`; gate **409** en
    `enviar`, `turnar`, `crearObservacion`, `eliminarObservacion`, `autorizar`, `rechazar`, `reingresar`.
  - `estimaciones.controller.js::integrarEstimacion` (**CONGELADO → diff a Maiki**): `estado` en el SELECT del
    contrato + `ROLLBACK` + **409** si `estado==='cerrado'`, tras el 404 y antes del 403. Espejo del gate que ya
    existe en `instruccion-pago`.
- **Cita:** **art. 64 LOPSRM** — verificado en `docs/legal/lopsrm.txt`: "…elaborar el **finiquito**… el saldo
  resultante" y "…**extinguidos los derechos y obligaciones** asumidos por ambas partes en el contrato".
- **Spec:** `fase4-finiquito.spec.js` — cerrar y luego integrar → **409**.

### 1.2 — Minutas/visitas: FOLIO, no id interno 🐛
- **Síntoma:** la columna "Nota" mostraba el id interno (`#58`) en vez del folio de la nota (`#1`).
- **Cambio:** `minutas.controller.js` `listarMinutas`/`listarVisitas` → `LEFT JOIN bitacora_notas bn ON
  bn.id = m.nota_id`, `bn.numero AS nota_numero`. `MinutasVisitas.jsx` muestra `#${nota_numero}` (con fallback)
  en Minutas, Acuerdos y **nueva columna Nota en Visitas**.
- **Cita:** **art. 123 fr. X RLOPSRM** — verificado en `docs/legal/reg.txt` (línea 4575): "se podrán ratificar
  en la Bitácora las instrucciones emitidas vía oficios, **minutas**, memoranda y circulares". (La cita
  preexistente era correcta; el verificador del blueprint se equivocó al sugerir fr. V.)
- **Spec:** `minutas-crud.spec.js` — la nota vinculada muestra el folio `#1` (no el id).

### 1.3 — Endoso de garantía: validar por motivo ⚖️
- **Cambio:** `garantias.controller.js::registrarEndoso` — si motivo ∈ {ampliacion_monto, mixto} exige
  `nuevo_monto>0`; si ∈ {prorroga_vigencia, mixto} exige `nueva_vigencia`; endoso sin monto ni vigencia → **400**.
- **Cita:** **art. 91 RLOPSRM** (garantía de cumplimiento ≥10%; ajuste vía 92/98) — verificado en `docs/legal/reg.txt`.
- **Spec:** `fianzas-crud.spec.js` — endoso sin el dato de su motivo → **400**; válido → 201.

### 1.4 — Quitar placeholder FALSO de generadores 🔀
- **Síntoma:** el bloque 2 del ambiente decía "Pendiente · Equipo 3", pero HU-12 ya captura generadores.
- **Cambio:** `AmbienteEstimacion.jsx` — bloque 2 a estado "listo" con CTA **"Ir a capturar generadores
  (HU-12) →"**; aviso de cascarón corregido; el registro **fotográfico** sí queda como pendiente de alcance.
- **Cita:** art. 118 RLOPSRM (cantidad disponible por concepto) — preexistente, verificada.
- **Spec:** `fase5-ambiente-estimacion.spec.js` — sin `pendiente-e3-2`; con `link-generadores-hu12`.

### 1.5 — Atraso: no duplicar el asiento (idempotencia) 🐛
- **Síntoma:** asentar el atraso del mismo concepto/periodo se podía repetir → notas duplicadas en bitácora.
- **Cambio:** `alertas.controller.js::asentarAtraso` — pre-chequeo en `atraso_asentado(concepto, periodo)`;
  si existe → **409**; tras insertar la nota, registra la fila puente; el `UNIQUE` blinda la carrera (23505 → 409).
- **DDL (CONGELADO → a Maiki):** `backend/scripts/migracion_atraso_asentado.sql` — tabla `atraso_asentado` +
  `uq_atraso_asentado(contrato_concepto_id, periodo_numero)`. **Aditiva e idempotente.** Aplicada en la BD local
  con psql; **falta integrarla a `schema.sql` y aplicarla en Render** (autor único: Maiki).
- **Cita:** **art. 123 RLOPSRM** (registro de bitácora append-only) — verificado.
- **Spec:** `hu-07-alertas-atraso.spec.js` — asentar 2× → 409 y una sola nota de atraso.

### 1.6 — Sidebar: pill con rango de HU por flujo 💅
- **Cambio:** `Sidebar.jsx` — helper `rangoHU(item)` (min–max de padre + sub-pasos) → pill `HU 08–11`; un solo
  HU conserva el formato plano `HU-18`.
- **Spec:** `nav-modo-sistema.spec.js` — el flujo Alta rotula `HU 01–02`.

---

## ⛔ Zona congelada tocada (para que Maiki la revise/integre)
1. **`backend/src/controllers/estimaciones.controller.js`** — gate de finiquito en `integrarEstimacion`
   (aditivo: 1 columna al SELECT + 4 líneas de gate `ROLLBACK`+409). Cero cambio en el cálculo de la carátula.
2. **`backend/src/db/schema.sql`** — NO editado. La DDL de `atraso_asentado` va en
   `backend/scripts/migracion_atraso_asentado.sql` para que Maiki la integre + aplique en Render (runbook
   `--single-transaction -v ON_ERROR_STOP=1`).

Todo lo demás (`estimaciones-ciclo`, `minutas`, `garantias`, `alertas`, `AmbienteEstimacion`, `MinutasVisitas`,
`Sidebar`, specs) NO es zona congelada.

---

## Suite
- **6 specs afectados:** 28/28 verde (41 s) — incluye los 3 specs negativos nuevos (1.1, 1.3, 1.5) y los
  ajustes de 1.2/1.4/1.6.
- **Suite completa:** **326 passed · 8 skipped · 0 failed** (9.1 min). Sin regresiones.
