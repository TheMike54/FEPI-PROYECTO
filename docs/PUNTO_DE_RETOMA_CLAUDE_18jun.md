# 🧭 PUNTO DE RETOMA — para que Claude continúe (SIGECOP, sesión autónoma 18-jun-2026)

> **Qué es esto.** El documento de **handoff**: dice EXACTAMENTE dónde me quedé, qué estamos haciendo y cómo
> seguir hasta terminar el plan, para que **otra instancia de Claude (o esta en otra sesión) continúe sin
> contexto previo**. Léelo COMPLETO antes de tocar nada.
>
> **Regla de arranque (CLAUDE.md del proyecto):** antes de cualquier tarea, lee también
> `docs/contexto-claude/ESTADO_ACTUAL.md` (estado canónico del sistema) y
> `docs/analisis-y-diseno/Historias_Usuario_ACTUALIZADAS_12jun.md` (requisitos). Después de cada cambio,
> ACTUALIZA `ESTADO_ACTUAL.md`.

---

## 0. Lo mínimo que tienes que saber

- **Proyecto:** SIGECOP — gestión técnico-administrativa de contratos de obra pública (LOPSRM / RLOPSRM / LFD).
  React+Vite (`frontend/`) · Node+Express+PostgreSQL (`backend/`) · español. Stack local en Docker.
- **Quién soy yo (Claude) aquí:** trabajo en **local, SIN commit/push**. Maiki (TheMike54) revisa los diffs e
  integra. Branch: `main`.
- **Instrucción viva de Maiki (sesión autónoma):** *"todo lo legal lo decides tú con base en la ley, continúa
  hasta finalizar."* → Resuelvo TODA decisión legal yo mismo **verificándola contra `docs/legal/`** (textos
  `lopsrm.txt` y `reg.txt`), y ejecuto el plan maestro **completo** hasta el final.
- **Estado de la suite AHORA:** corrida LIMPIA `338 passed · 8 skipped · 0 failed` (Oleada 3 + Fases 3-6).
  Verde de punta a punta. (Nota: el test `hu-07-alertas-atraso:237` es un **flaky pre-existente por
  pollution**; si una corrida lo marca rojo, re-córrelo solo para confirmar — en la corrida limpia pasó.)

---

## 1. Reglas PERMANENTES (no las rompas)

1. **Local, sin push.** No hago `git commit`/`git push`. Maiki integra.
2. **Zona congelada** (solo aditivo y marcado como "diff para Maiki"): `server.js` (solo montar routers),
   `schema.sql` (NO editar — las DDL van a `backend/scripts/`), `auth.*`, `permisos.js`, `App.jsx`,
   `SesionContext.jsx`, `contratos.controller`, `estimaciones.controller`, `usuarios.controller`,
   `lib/acceso.js`, `bitacora.controller`. Si un fix necesita tocarlas → cambio mínimo aditivo + comentario
   "diff para Maiki".
3. **Toda cita legal se VERIFICA** contra `docs/legal/lopsrm.txt` / `reg.txt` (grep `rt.culo N`). Si no la
   confirmas en el texto → márcala `[validar profe]`. (El verificador de los workflows ya se equivocó una vez
   — confía en el texto, no en él.)
4. **Suite verde tras cada tanda** (checkpoint). **Memoria + ESTADO_ACTUAL al día** tras cada fase.
5. **Cuadre exacto al centavo** en lo financiero. Registros formales **append-only** (corregir = registro
   nuevo vinculado, no editar).
6. **Método:** por cada oleada/fase → workflow de **blueprint** (un agente por item, lee código real + ley,
   verificación adversarial) → implemento yo → specs → suite verde → checkpoint + memoria.

---

## 2. El PLAN MAESTRO y dónde vamos

Fuente: `docs/planes/PLAN_MAESTRO_EJECUCION_18jun.md` (orquesta los planes chicos).

| Fase | Qué | Estado |
|---|---|---|
| 0 | Acuerdos con el profe | **N/A** — Maiki me autorizó decidir lo legal con la ley |
| 1 | **Oleada 1 — errores** (6 fixes) | ✅ **HECHO**, suite 326/8/0 → `docs/reportes/OLEADA1_FIXES_18jun.md` |
| 2 | **Oleada 2 — notificaciones** (5 items) | ✅ **HECHO**, suite 331/8/0 → `docs/reportes/OLEADA2_FIXES_18jun.md` |
| (4-ley) | **Oleada 3 — ley** (5 items) | ✅ **COMPLETA 5/5**, suite 337/8/0 → `docs/reportes/OLEADA3_FIXES_18jun.md` |
| 3 | **Wizard de Estimación** + reestructurar historia del ciclo | ✅ **HECHO** — `IntegracionEstimacion` wizard de 5 pasos; `HISTORIAS_POR_CICLOS.md` |
| 4 | **Replicar el wizard** a Pago / Bitácora / Avance | ✅ **HECHO** — TransitoPago (3 pasos), AmbienteBitacora (3 pasos+paralelos), AmbienteAvance (acción+paralelos) |
| 5 | **Cierres** (evidencia fotográfica = FUERA de Etapa 1; pulido) | ✅ **HECHO** — copy de fotos suavizado en wizard estimación + ambiente avance |
| 6 | **Reporte extenso para Claude IA** (handoff final) | ✅ **HECHO** — `docs/REPORTE_EJECUCION_PLAN_GRANDE_18jun.md` |

> **PLAN MAESTRO COMPLETO.** Lo que queda es para **Maiki**: integrar los diffs congelados + las 4 DDL
> (`schema.sql` + Render, runbook) y decidir los `[validar]` (ver §6 y el reporte de ejecución).

---

## 3. 👉 DÓNDE ME QUEDÉ EXACTAMENTE — EL SIGUIENTE PASO ES LA **FASE 3 (wizard de Estimación)**

**La Oleada 3 quedó COMPLETA (5/5).** Detalle de los 5 en `docs/reportes/OLEADA3_FIXES_18jun.md` y blueprint
quirúrgico en `docs/planes/_BLUEPRINTS_OLEADA3_18jun.md`. Resumen de los dos últimos cerrados en esta tanda:

- **ITEM 3.1 ✅ — HU-20 partida obligatoria + join por FK `dependencia_id`** (art. 24 párr. 2 LOPSRM,
  verificado en `docs/legal/lopsrm.txt` 774-776). `instruccion-pago.controller` (crearPresupuesto exige
  partida + resuelve texto desde la cuenta; suficiencia/instrucción joinan por `dependencia_id`; legacy NULL →
  409). DDL `backend/scripts/migracion_hu20_partida_fk.sql` (aplicada local 2×). Front `TransitoPago.jsx`
  (input partida + `dependenciaId`). Spec `hu20-partida-fk.spec.js` (2). Etapa 1 = 1 partida/(ejercicio,
  dependencia); multi-partida real (`contratos.partida_id`) = follow-on Maiki.
- **ITEM 3.2 ✅ — Convenio con acto de AUTORIZACIÓN explícito** (art. 59 p3 + 99 p5 + 102 RLOPSRM, verificados).
  El convenio nace `estado='registrado'`; endpoint NUEVO `POST /api/convenios/:id/autorizar` (rol dependencia,
  guardrail art. 102 >25% exige oficio) sella la autorización. DDL
  `backend/scripts/migracion_convenio_autorizacion.sql` (re-escribe el trigger `sigecop_convenio_inmutable`;
  aplicada local 2×; **el CREATE OR REPLACE del trigger va ANTES del backfill**). Front
  `ConveniosModificatorios.jsx` + `api.js`. Spec `convenio-autorizacion.spec.js` (2) + ajuste a
  `hu-03-convenios.spec.js`. **🔶 ALCANCE `[validar]` (a Maiki):** se implementó el ACTO de autorización (ley
  dura); **NO** se difirió el EFECTO material del convenio (sigue aplicándose en el registro como hoy) — eso
  toca cómo HU-12/HU-06 leen el catálogo vivo = follow-on para Maiki.

> **Para MAIKI:** las 2 DDL nuevas (`migracion_hu20_partida_fk.sql`, `migracion_convenio_autorizacion.sql`)
> van a `schema.sql` + Render con el runbook. La 2.ª **re-escribe el trigger `sigecop_convenio_inmutable`**
> (replica el cuerpo nuevo en `schema.sql` ~L1380-1406). `server.js` NO se tocó.

---

## 4. Después de cerrar la Oleada 3: Fases 3-6

- **Fase 3 — Wizard de Estimación (insignia):** construir "Nueva estimación" como wizard
  (Periodo→Generadores→Carátula→Soportes→Integrar→Presentar) **reusando los componentes de HU-12/HU-13 como
  pasos** (mismos `data-testid` → la suite de HU-12 sigue verde). Reemplazar el cascarón
  `/estimaciones/ambiente` por el wizard. **Reestructurar la historia del Ciclo de estimación** a la vista por
  ciclos (HU-12..17 agrupadas) **CONSERVANDO los requisitos verbatim** + checklist de conservación (regla de
  oro de Maiki: la reestructura NO relaja/quita/añade requisitos — p. ej. HU-01 conserva su PDF firmado).
  Referencias: `docs/REPORTE_REESTRUCTURACION_HISTORIAS_POR_CICLOS.md`,
  `docs/planes/PLAN_REDISENO_BLOQUES_WIZARD_18jun.md`, mockups `docs/mockups/sigecop-prototipo-ciclos.html` y
  `sigecop-rediseno-bloques.html`.
- **Fase 4 — Replicar el wizard** a Pago → Bitácora → Avance (un flujo por tanda, suite verde + historia
  reestructurada cada vez).
- **Fase 5 — Cierres:** evidencia fotográfica — **decisión ya tomada: FUERA de Etapa 1** (la ley no la exige
  como requisito de estimación) → suavizar copy a "fuera de alcance" (ya se hizo para generadores en el fix
  1.4; aplicar el mismo criterio a fotos). Pulido + verificación adversarial del conjunto.
- **Fase 6 — Reporte extenso para Claude IA:** el handoff final y exhaustivo (lo pidió Maiki). Detalle en
  `docs/planes/PLAN_MAESTRO_EJECUCION_18jun.md` §"FASE 6".

---

## 5. Qué se hizo en esta sesión (resumen con punteros)

- **Oleada 1 (6 fixes):** finiquito bloquea el ciclo (art. 64), minutas muestran folio (art. 123 fr. X),
  endoso valida por motivo (art. 91), placeholder falso de generadores quitado, atraso no se duplica (DDL
  `atraso_asentado`), sidebar rango HU. → `docs/reportes/OLEADA1_FIXES_18jun.md`.
- **Oleada 2 (5 items):** vínculos minuta/visita/avance en consulta de notas, HU-19 reporte #4 observaciones
  (`GET /api/observaciones/contrato/:id`), ciclo de vida con progreso real, "mi info/empresa"
  (`GET /api/yo`), campana unificada (`GET /api/notas-pendientes`). → `docs/reportes/OLEADA2_FIXES_18jun.md`.
- **Oleada 3 (3 de 5):** 3.3 avance append-only (trigger `sigecop_avance_inmutable` + `POST /trabajos/:id/
  corregir`), 3.4 dependencia no sustituible (art. 125), 3.5 reseed cuentas 1 empresa : N
  (`npm run reseed:cuentas`). → `docs/reportes/OLEADA3_FIXES_18jun.md`.

**Memorias de continuidad** (en el dir de memoria del proyecto): `sigecop-oleada1-fixes-18jun`,
`sigecop-oleada2-notificaciones-18jun`, `sigecop-oleada3-ley-18jun`, `sigecop-prototipo-ciclos-18jun`.

---

## 6. ⛔ Para MAIKI: diffs de zona congelada + DDL a integrar

**Diffs en archivos congelados (revisar e integrar):**
- `backend/src/controllers/estimaciones.controller.js` — gate de finiquito en `integrarEstimacion` (Oleada 1).
- `backend/src/controllers/bitacora.controller.js` — 3 `EXISTS` aditivos en `construirPayloadNotas` (Oleada 2).
- `backend/server.js` — montaje de routers nuevos: `/api/yo`, `/api/observaciones`, `/api/notas-pendientes`.

**DDL nuevas (en `backend/scripts/`, integrar a `schema.sql` + aplicar en Render con el runbook
`--single-transaction -v ON_ERROR_STOP=1`):**
- `migracion_atraso_asentado.sql` (Oleada 1) — ya aplicada en local.
- `avance_append_only.sql` (Oleada 3.3, trigger) — ya aplicada en local.
- `migracion_hu20_partida_fk.sql` (3.1) — ✅ **creada y aplicada en local** (2×, idempotente).
- `migracion_convenio_autorizacion.sql` (3.2) — ✅ **creada y aplicada en local** (2×). **Re-escribe el trigger
  `sigecop_convenio_inmutable`** → replica el cuerpo nuevo en `schema.sql` ~L1380-1406.

**Scripts nuevos (no DDL):** `reseed_cuentas.{sql,js}` + `npm run reseed:cuentas` (3.5) — ya aplicado en local.

---

## 7. Cómo levantar el entorno y correr (comandos clave)

```bash
# Stack local (Docker): sigecop_db (5432), sigecop_backend (4000), sigecop_frontend (5173)
docker compose up
# Backend NO auto-recarga: tras editar backend →
docker restart sigecop_backend
# Frontend SÍ (Vite HMR).

# psql a la BD local:
docker exec -i sigecop_db psql -U sigecop -d sigecop_db -c "SELECT ..."
# Aplicar una migración/seed local:
docker exec -i sigecop_db psql -U sigecop -d sigecop_db < backend/scripts/<archivo>.sql

# Suite e2e (login real → skip en CI; corre en local). Desde frontend/:
cd frontend && npx playwright test --reporter=line          # completa (~9 min)
cd frontend && npx playwright test <archivo> --reporter=line # afectados (rápido)
cd frontend && npx vite build                                # lo único que valida el CI

# Verificar una cita legal (latin1, formato "Articulo N.-"):
cd docs/legal && grep -nE "rt.culo 24[^0-9]" lopsrm.txt
```

**Cuentas demo** (todas pass `Sigecop2026!`): `residente@`, `contratista@`, `supervision@`, `dependencia@`,
`finanzas@`+`@sigecop.test`. Empresas demo: Dependencia Demo (id 1), Constructora Demo (2), Supervisión
Externa Demo (3). El reseed 3.5 añadió Dependencia Sur Demo, Constructora Patito, etc.

**Gotcha conocido:** la BD local tiene pollution de empresas/contratos de prueba (`Constructora O3 <ts>`,
`E2E-*`, etc.) que dejan los specs al registrar contratistas/contratos. No rompe nada; limpieza = follow-on.

---

## 8. Checklist para retomar (haz esto en orden)

1. Lee `docs/contexto-claude/ESTADO_ACTUAL.md` (entrada 13 = el estado más reciente) y este doc.
2. Confirma la suite verde: `cd frontend && npx playwright test --reporter=line` (debe dar ~337/8/0; si
   `hu-07-alertas-atraso:237` sale rojo, es el flaky por pollution → re-córrelo solo).
3. **Arranca la FASE 3 (wizard de Estimación):** referencias en §4 — `docs/REPORTE_REESTRUCTURACION_HISTORIAS_POR_CICLOS.md`,
   `docs/planes/PLAN_REDISENO_BLOQUES_WIZARD_18jun.md`, mockups `docs/mockups/sigecop-prototipo-ciclos.html` y
   `sigecop-rediseno-bloques.html`. **Regla de oro de Maiki:** la reestructura NO relaja/quita/añade requisitos.
4. Reutiliza los componentes de HU-12/HU-13 como pasos del wizard (mismos `data-testid` → la suite sigue verde).
5. Sigue con Fase 4 (replicar wizard) … hasta Fase 6 (reporte Claude IA).
6. Tras CADA fase: suite verde + ESTADO_ACTUAL + memoria. Nunca dejes el sistema a medias.

> *Documento de retoma — actualizado al cierre de la Oleada 3 (5/5), 18-jun. Estado: Oleadas 1-2 + Oleada 3
> COMPLETAS. Suite 337/8/0. Local, sin push. Siguiente acción concreta: **FASE 3 — wizard de Estimación**.*
