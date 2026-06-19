# OLEADA 3 — Ley / reglas de negocio · 18-jun-2026

> **Fase 4-ley del `PLAN_MAESTRO_EJECUCION_18jun.md`.** Maiki autorizó resolver TODA decisión legal con base
> en `docs/legal` (ya no se difiere al profe). Cada decisión se verificó contra el texto de la ley. Método:
> blueprint quirúrgico (workflow `wy60hy21h`, 5/5 aprobados) → implementación → suite. Local, sin push.
>
> **Blueprints completos persistidos:** `docs/planes/_BLUEPRINTS_OLEADA3_18jun.md` (para continuidad).

---

## Resumen

| Item | Decisión legal (verificada en `docs/legal`) | Zona | Estado |
|---|---|---|---|
| 3.3 | **Avance APPEND-ONLY** — art. 123 fr. VI/VII/VIII RLOPSRM | `trabajos.controller` + DDL (trigger) | ✅ hecho |
| 3.4 | **Dependencia NO sustituible** — art. 125 fr. I g RLOPSRM | `roster.controller` + `RosterContrato.jsx` | ✅ hecho |
| 3.5 | **Re-seed 1 empresa : N cuentas** — art. 43 RLOPSRM | `backend/scripts/reseed_cuentas.*` | ✅ hecho |
| 3.1 | **HU-20 partida obligatoria + FK** — art. 24 párr. 2 LOPSRM | `instruccion-pago.controller` + DDL + `TransitoPago.jsx` | ✅ **hecho** |
| 3.2 | **Convenio con acto de autorización** — art. 59 párr. 3 + 102 RLOPSRM | `convenios.controller` (endpoint nuevo) + DDL + front | ✅ **hecho** |

**Oleada 3 COMPLETA (5/5).** Suite tras 3.3/3.4/3.5: 333/8/0. Tras 3.1/3.2: **ver checkpoint al pie** (suite re-corrida con +4 specs nuevos).

---

## Detalle (items hechos)

### 3.3 — Avance físico APPEND-ONLY ⚖️
- **Decisión (art. 123 fr. VI/VII/VIII RLOPSRM, verificadas literal):** el registro de avance es inmutable;
  corregir = registro NUEVO vinculado, no editar/borrar.
- **Cambio:** se ELIMINARON `PATCH /trabajos/:id` y `DELETE /trabajos/:id`; se añadió `POST /trabajos/:id/
  corregir` (anula la original `vigente→anulada` + inserta una nueva `reemplaza_a` con su nota de bitácora
  "dice/debe decir"). `acumuladoEjecutado`/`validarProgramaPeriodo`/`trabajosDeContrato` cuentan solo
  `estado='vigente'` (art. 118 sobre vigentes). Front `TrabajosTerminados`: Editar/Eliminar → **Corregir**;
  las anuladas quedan marcadas.
- **DDL (→ Maiki):** `backend/scripts/avance_append_only.sql` — columnas `estado/reemplaza_a/anulada_*` +
  **trigger `sigecop_avance_inmutable`** (solo permite `vigente→anulada` y ligar la nota diferida; cualquier
  otra mutación lanza excepción). Aplicado en local.
- **Spec:** `avance-append-only.spec.js` (PATCH/DELETE → 404; corregir anula+crea; acumulado = vigentes) +
  `o4-avance-periodo` migrado de PATCH a corregir.
- **Gotcha:** el trigger necesitó un **caso B** (permitir `nota_id NULL→valor` con estado vigente) porque
  `abrirBitacora` asienta la nota DIFERIDA del avance vía `UPDATE nota_id`.

### 3.4 — Dependencia NO sustituible 🔀
- **Decisión (art. 125 fr. I g RLOPSRM, verificada):** la fracción solo prevé sustituir residente/
  superintendente/supervisión — la dependencia contratante NO. **El guard ya existía** (whitelist
  `ROLES_ROSTER` + `COL_CACHE` sin `dependencia_id`).
- **Cambio:** comentario legal explícito en `roster.controller`, aviso UI `roster-dependencia-aviso` en
  `RosterContrato.jsx`, spec (rol 'dependencia' → 400).

### 3.5 — Re-seed 1 empresa : N cuentas 🚧
- **Decisión (art. 43 RLOPSRM, verificada):** padrón de contratistas. **Cambio:** `backend/scripts/
  reseed_cuentas.{sql,js}` + `npm run reseed:cuentas` — siembra una 2ª dependencia (Dependencia Sur Demo) y
  varias personas por empresa (modelo 1 empresa : N cuentas) para probar el acotamiento. Idempotente, NO toca
  `schema.sql` ni runtime. Aplicado en local.

---

### 3.1 — HU-20 partida obligatoria + join por FK 💰 ⚖️
- **Decisión (art. 24 párr. 2 LOPSRM, verificada literal en `docs/legal/lopsrm.txt` líneas 774-776):**
  *"…suficiencia presupuestaria en la PARTIDA O PARTIDAS ESPECÍFICAS…"* → la **partida es OBLIGATORIA** al
  cargar el techo y la unicidad pasa a `(ejercicio, dependencia_id, partida)`. El join contrato↔presupuesto
  se hace por la **FK estable `contratos.dependencia_id`** (no por el texto `dependencia`, que se rompe al
  renombrar la cuenta) — decisión de integridad referencial, no legal.
- **Cambio:** `instruccion-pago.controller` — `crearPresupuesto` exige partida (400) y resuelve el texto
  desde la cuenta (FK); `calcularSuficiencia`/`generarInstruccion`/`cargarEstimacionContrato`/`estadoTransito`/
  `consultarPresupuesto` joinan por `dependencia_id`. Caso legacy (`dependencia_id` NULL, p. ej.
  `OP-2026-DEMO-001`) → **409 controlado**, no 500. `TransitoPago.jsx`: input obligatorio "Partida específica"
  + envía `dependenciaId` + `partida`; botón "Cargar techo" deshabilitado sin partida.
- **DDL (→ Maiki):** `backend/scripts/migracion_hu20_partida_fk.sql` — `ADD dependencia_id` (FK), backfill
  desde el texto, `partida NOT NULL`, mover UNIQUE a `(ejercicio, dependencia_id, partida)`. Aditiva,
  idempotente (aplicada 2× en local). **Etapa 1 = 1 partida por (ejercicio, dependencia)**; multi-partida
  real por contrato exigiría `contratos.partida_id` (CONGELADO) = follow-on para Maiki.
- **Spec:** `hu20-partida-fk.spec.js` (2 tests): partida obligatoria + unicidad; aislamiento por FK (el techo
  de OTRA dependencia no se cruza) + la instrucción liga la partida correcta.

### 3.2 — Convenio con acto de AUTORIZACIÓN explícito 📝 ⚖️
- **Decisión (verificada en `docs/legal`):** LOPSRM **art. 59 párr. 3** (el convenio debe ser AUTORIZADO por
  la persona servidora facultada — acto distinto del registro/sustento, que hace el residente, art. 99 p1) +
  RLOPSRM **art. 99 p5** (suscripción por el servidor facultado) + **art. 102 fr. I-III** (variación > 25 %
  exige autorización/soporte). Hoy `crearConvenio` ponía `autorizado_por = quien registra` en el mismo INSERT;
  se separa el ACTO.
- **Cambio:** el convenio **nace `estado='registrado'`** con `autorizado_por=NULL`. Endpoint NUEVO
  `POST /api/convenios/:id/autorizar` (`autorizarConvenio`, sub-ruta en `convenios.routes` — **NO toca
  server.js**, ya montado): solo rol **dependencia** (servidor facultado, mapeo conservador a los
  "lineamientos" del art. 1 Quinquies, no modelados); 409 si ya autorizado; **guardrail art. 102**: variación
  > 25 % exige el oficio (`contrato_documentos.convenio_id`) cargado antes de sellar; UPDATE
  `estado='autorizado' + autorizado_por + autorizado_en`. Front `ConveniosModificatorios.jsx`: badge
  "Pendiente de autorización"/"Autorizado" + botón "Autorizar convenio" (solo dependencia) que maneja el 409
  del guardrail enlazando al oficio.
- **DDL (→ Maiki):** `backend/scripts/migracion_convenio_autorizacion.sql` — `+estado` (default 'autorizado'
  para backfill) `+autorizado_en`; backfill viejos→'autorizado' (sello=created_at); **trigger
  `sigecop_convenio_inmutable` re-escrito** para permitir SOLO la transición controlada `registrado→autorizado`
  (sella `autorizado_por/en` una vez) y conservar `nota_id NULL→valor`. Aditiva, idempotente (2× local).
  ⚠️ **Gotcha:** el `CREATE OR REPLACE` del trigger debe ir ANTES del backfill (el trigger viejo bloquea
  cualquier UPDATE de un convenio con nota ligada).
- **Spec:** `convenio-autorizacion.spec.js` (2 tests): nace registrado → solo dependencia autoriza → sello
  único (re-autorizar 409); guardrail >25% sin oficio 409, con oficio 200. Además se ajustó
  `hu-03-convenios.spec.js` (la fila ahora tiene un control legítimo más: el botón Autorizar, append-only).
- **🔶 DECISIÓN DE ALCANCE (Code, para Maiki) — `[validar]`:** se implementa el **acto de autorización** (ley
  dura, art. 59 p3) como sello append-only. **NO** se difiere el **efecto material** del convenio (la mutación
  de catálogo/monto/programa y la versión vigente siguen aplicándose en el REGISTRO, como hoy). Diferir el
  efecto hasta la autorización exige rehacer cómo **HU-12 (estimaciones)** y **HU-06 (avance)** leen el
  catálogo VIVO (`contrato_conceptos`/`programa_obra`), riesgo alto que el verificador del blueprint marcó
  como "causa raíz no resuelta". Por eso el convenio queda "registrado y operando, pendiente de autorización
  formal". El cierre pleno de "surte efecto solo al autorizar" = **follow-on para Maiki** (coordina con E3).

---

## ⛔ Zona congelada / DDL para Maiki
- **DDL nuevas en `backend/scripts/`** (integrar a `schema.sql` + aplicar en Render con el runbook
  `--single-transaction -v ON_ERROR_STOP=1`): `avance_append_only.sql` (3.3, trigger),
  `migracion_hu20_partida_fk.sql` (3.1), `migracion_convenio_autorizacion.sql` (3.2, **re-escribe el trigger
  `sigecop_convenio_inmutable`** — replicar el cuerpo nuevo en `schema.sql` L1380-1406).
- `roster.controller`/`trabajos.controller`/`convenios.controller`/`instruccion-pago.controller` y sus routes
  NO son congelados (dominio de equipo). **`server.js` NO se tocó** (las dos sub-rutas/endpoints usan routers
  ya montados: `/api/instruccion-pago` y `/api/convenios`).
- **Follow-ons (no bloquean):** (3.1) `contratos.partida_id` para multi-partida real por contrato; (3.2)
  diferir el efecto material del convenio hasta la autorización (toca lectura del catálogo vivo en HU-12/HU-06).
