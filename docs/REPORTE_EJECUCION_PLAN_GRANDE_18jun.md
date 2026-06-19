# REPORTE DE EJECUCIÓN — Plan Grande SIGECOP (18-jun-2026) · handoff para Claude IA

> **Qué es.** El registro **exhaustivo y autocontenido** del esfuerzo de esta ronda, escrito para que
> **cualquier instancia futura de Claude (o Maiki, o el profe) retome el proyecto sin contexto previo**. NO
> reemplaza a `docs/contexto-claude/ESTADO_ACTUAL.md` (ese es el estado VIVO); este es el **diario del
> esfuerzo**. Sesión autónoma (Maiki: *"todo lo legal lo decides tú con la ley, continúa hasta finalizar"*).
> **Todo LOCAL, sin push** — Maiki revisa los diffs e integra.

---

## 1. Resumen ejecutivo

Se ejecutó, de inicio a fin, el `docs/planes/PLAN_MAESTRO_EJECUCION_18jun.md`:

| Fase | Entregable | Estado |
|---|---|---|
| Oleada 3 (ley) | 5 cierres legales (3.1–3.5) verificados contra `docs/legal` | ✅ **5/5** |
| Fase 3 | **Wizard de Estimación** (insignia) + reestructura de historias por ciclos | ✅ |
| Fase 4 | Replicar el wizard a **Pago / Bitácora / Avance** | ✅ |
| Fase 5 | Cierres (evidencia fotográfica = fuera de Etapa 1) + pulido | ✅ |
| Fase 6 | Este reporte | ✅ |

**Suite:** arrancó en **333/8/0**; cerró en una corrida LIMPIA en **338 passed · 8 skipped · 0 failed**
(cero fallas — incluso el flaky pre-existente `hu-07-alertas-atraso:237` pasó). +6 specs nuevos (2 ITEM 3.1,
2 ITEM 3.2, 1 wizard pago, + reescrituras del wizard de estimación/bitácora). **Nada quedó roto.**

**Qué cerró:** los 5 cierres legales de la Oleada 3; el rediseño "un flujo = un wizard" probado en la insignia
(Estimación) y replicado a Pago/Bitácora/Avance; las historias reestructuradas por ciclos con checklist de
conservación. **Qué quedó pendiente (follow-on para Maiki):** integrar las 4 DDL a `schema.sql` + Render;
decidir si difiere el EFECTO material del convenio (ITEM 3.2); multi-partida real por contrato (ITEM 3.1);
y el "¿convence el patrón wizard?" que el plan reserva a Maiki/profe.

---

## 2. Por hallazgo / item (síntoma → causa → cambio → cita → spec → resultado)

### Oleada 3 — ley (5/5). Reporte detallado: `docs/reportes/OLEADA3_FIXES_18jun.md`
- **3.1 HU-20 partida obligatoria + join por FK `dependencia_id`.** *Síntoma:* el techo presupuestal se ataba
  por el TEXTO de la dependencia (se rompe al renombrar) y la partida era opcional. *Causa:* `presupuesto_anual`
  sin FK + `partida` nullable; join por `contratos.dependencia` (texto derivado). *Cambio:* partida obligatoria
  (400 si falta), join por `contratos.dependencia_id` (FK estable) en suficiencia/instrucción; legacy
  `dependencia_id` NULL → 409 controlado. *Cita:* **art. 24 párr. 2 LOPSRM** (verificada literal, `lopsrm.txt`
  774-776: *"…suficiencia presupuestaria en la partida o partidas específicas…"*). *Spec:* `hu20-partida-fk.spec.js`
  (2). *DDL:* `backend/scripts/migracion_hu20_partida_fk.sql`. *Resultado:* ✅.
- **3.2 Convenio con acto de AUTORIZACIÓN explícito.** *Síntoma:* `autorizado_por` se llenaba con quien
  REGISTRA, en el mismo INSERT (registro == autorización). *Causa:* no había acto formal separado. *Cambio:* el
  convenio nace `estado='registrado'` (`autorizado_por`=NULL); endpoint NUEVO `POST /api/convenios/:id/autorizar`
  (rol dependencia; guardrail art. 102 >25% exige oficio) sella `estado/autorizado_por/autorizado_en`. *Cita:*
  **LOPSRM art. 59 párr. 3** + **RLOPSRM art. 99 p5** + **art. 102 fr. I-III** (verificadas). *Spec:*
  `convenio-autorizacion.spec.js` (2). *DDL:* `migracion_convenio_autorizacion.sql` (re-escribe el trigger
  `sigecop_convenio_inmutable`). *Resultado:* ✅ con **decisión de alcance `[validar]`**: se implementó el ACTO;
  el EFECTO material del convenio sigue aplicándose en el registro (diferirlo toca cómo HU-12/HU-06 leen el
  catálogo vivo → follow-on Maiki).
- **3.3 Avance APPEND-ONLY** (art. 123 fr. VI/VII/VIII RLOPSRM): PATCH/DELETE → `POST /trabajos/:id/corregir`
  (anula + registro vinculado + nota dice/debe-decir); trigger `sigecop_avance_inmutable`. Spec
  `avance-append-only.spec.js`. ✅
- **3.4 Dependencia NO sustituible** (art. 125 fr. I g): guard ya existía; reforzado + aviso UI + spec. ✅
- **3.5 Re-seed 1 empresa : N cuentas** (art. 43): `reseed_cuentas.{sql,js}` + `npm run reseed:cuentas`. ✅

### Fase 3 — Wizard de Estimación (insignia). Detalle: `sigecop-fase3-wizard-estimacion-18jun` (memoria) + `HISTORIAS_POR_CICLOS.md`
- *Síntoma:* el flujo de estimación aparecía como historias sueltas + un "Recorrido por bloques" que era un
  cascarón de enlaces (confuso). *Cambio:* `frontend/src/pages/IntegracionEstimacion.jsx` (la captura real de
  HU-12) se transformó **in situ** en un **wizard de 5 pasos** (Periodo → Generadores → Carátula → Soportes y
  notas → Integrar y presentar), patrón del Alta, reusando los MISMOS componentes y `data-testid`. Gating: el
  avance se bloquea por exceso (art. 118 / plan) y neto<0; periodo y "≥1 línea" se exigen en el botón Integrar
  (conserva el comportamiento). El cascarón `AmbienteEstimacion` → `<Navigate>` al wizard; se quitó "Recorrido
  por bloques" del Sidebar. *Specs:* 5 reescritos para navegar pasos + helper `irPasoEstimacion`. *Resultado:* ✅.

### Fase 4 — replicación del wizard
- **Pago** (`frontend/src/pages/TransitoPago.jsx`): wizard **Suficiencia → Soportes → Instrucción** + enlace a
  registrar pago (HU-21). El **ambiente de pago** (`/pagos/ambiente`) se conservó como **macro** del ciclo de
  cobro (no era un placeholder redundante). Spec `pago-wizard.spec.js`. ✅
- **Bitácora** (`frontend/src/pages/AmbienteBitacora.jsx`): wizard **Apertura → Firma → Emitir notas** (candado
  art. 123 fr. III en Emitir); **Consultar (HU-10)** y **Minutas (HU-11)** en **paralelo** (lectura, siempre
  accesibles — "consultar no se puede bloquear"). Spec `ambiente-bitacora.spec.js` reescrito. ✅
- **Avance** (`frontend/src/pages/AmbienteAvance.jsx`): acción **Registrar avance (HU-06)** + **Curva (HU-05)** y
  **Atrasos (HU-07)** en paralelo. ✅

### Fase 5 — cierres
- **Evidencia fotográfica = FUERA del alcance de la Etapa 1** (la ley no la exige como requisito de la
  estimación/avance; el expediente del art. 132 RLOPSRM se integra con generadores + notas). El copy se suavizó
  de "Pendiente Equipo 2/3" a "fuera de alcance" en el paso 4 del wizard de estimación y en el ambiente de
  avance. *(Decisión tomada con la ley; el profe puede revertirla si la quiere en Etapa 1.)*

---

## 3. ⛔ Zona congelada tocada (diffs para Maiki)
- `backend/src/controllers/estimaciones.controller.js` — gate de finiquito en `integrarEstimacion` (Oleada 1).
- `backend/src/controllers/bitacora.controller.js` — 3 `EXISTS` aditivos (Oleada 2).
- `backend/server.js` — montaje de routers nuevos (`/api/yo`, `/api/observaciones`, `/api/notas-pendientes`).
- **NO se tocó** `permisos.js`, `App.jsx`, `auth.*`, `SesionContext.jsx`. Los wizards reusan rutas existentes;
  los endpoints nuevos (instrucción-pago, convenios/autorizar) usan routers YA montados.
- Controllers de dominio modificados (NO congelados): `instruccion-pago.controller`, `convenios.controller`,
  `convenios.routes`, `trabajos.controller`, `roster.controller`.

## 4. DDL aditiva (en `backend/scripts/`, idempotente; integrar a `schema.sql` + Render con runbook `--single-transaction -v ON_ERROR_STOP=1`)
1. `migracion_atraso_asentado.sql` (Oleada 1) — aplicada local.
2. `avance_append_only.sql` (3.3, trigger `sigecop_avance_inmutable`) — aplicada local.
3. `migracion_hu20_partida_fk.sql` (3.1) — `presupuesto_anual.dependencia_id` FK + backfill + `partida NOT NULL`
   + UNIQUE `(ejercicio, dependencia_id, partida)`. Aplicada 2× local.
4. `migracion_convenio_autorizacion.sql` (3.2) — `convenios_modificatorios.estado` + `autorizado_en` + backfill
   + **re-escribe el trigger `sigecop_convenio_inmutable`** (replicar el cuerpo nuevo en `schema.sql` L1380-1406).
   Aplicada 2× local. **GOTCHA:** el `CREATE OR REPLACE` del trigger va ANTES del backfill.

## 5. Rediseño por ciclos (wizards) + checklist de conservación
Fuente: `docs/analisis-y-diseno/HISTORIAS_POR_CICLOS.md` (vista por ciclos que **referencia** las historias, no
las reescribe). Regla de oro: **la reestructura NO cambia requisitos**. Wizards: Estimación (5 pasos), Pago (3),
Bitácora (3 + paralelos), Avance (acción + paralelos). El checklist HU-por-HU demuestra que cada criterio
funcional **sobrevive literal** (revisable por el profe).

## 6. Suite (antes/después)
- Antes de la sesión: **333/8/0**. Después: corrida limpia **338 passed · 8 skipped · 0 failed**. +6 specs
  nuevos; 6 specs reescritos para los wizards (estimación + bitácora) conservando su intención.
- **Flaky conocido:** `hu-07-alertas-atraso:237` ("contratista con déficit no ve banner") — por pollution de la
  BD local; **pasa en aislamiento** (verificado varias veces). NO es regresión.
- Gotcha de proceso: NO editar fuentes/specs mientras corre la suite completa (blanco móvil por HMR → falsos
  rojos). Correr cambios → suite. 

## 7. Decisiones del profe / Maiki pendientes
- **[validar] ITEM 3.2:** ¿diferir el EFECTO material del convenio hasta la autorización? (hoy aplica al
  registrar). Toca cómo HU-12/HU-06 leen el catálogo vivo → coordinar con E3.
- **[validar] ITEM 3.1:** multi-partida real por contrato (`contratos.partida_id`, congelado). Hoy Etapa 1 = 1
  partida por (ejercicio, dependencia).
- **Evidencia fotográfica:** confirmada FUERA de Etapa 1 con la ley; el profe puede pedir incluirla.
- **¿Convence el patrón wizard?** El plan reserva a Maiki/profe la decisión de si el rediseño "escala" (ya está
  replicado a los 4 flujos; si no convence, se puede revertir flujo por flujo).

## 8. Cómo retomar
- **Estado vivo:** `docs/contexto-claude/ESTADO_ACTUAL.md`. **Handoff operativo:** `docs/PUNTO_DE_RETOMA_CLAUDE_18jun.md`.
- **Siguiente paso natural:** que Maiki **integre los diffs congelados + las 4 DDL** (schema.sql + Render con el
  runbook), corra la suite en su entorno, y decida sobre los `[validar]`. No hay trabajo de Etapa 1 bloqueado.
- **Para extender el rediseño:** el patrón wizard está en `IntegracionEstimacion.jsx` (referencia) + el helper
  `e2e/_helpers.js: irPasoEstimacion`. Cada ciclo nuevo: wizard + entrada en `HISTORIAS_POR_CICLOS.md` + specs.

---

*Reporte de cierre — sesión autónoma 18-jun. Local, sin push. Lo legal se resolvió con `docs/legal` (citas
verificadas); lo interpretativo que excede la ley quedó marcado `[validar]` para el profe/Maiki.*
