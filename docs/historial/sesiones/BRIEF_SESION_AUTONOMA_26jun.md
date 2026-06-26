# BRIEF — Sesión autónoma Claude Code (entrega final 26-jun)

> **Modo:** sesión AUTÓNOMA. Ejecuta el plan completo de inicio a fin. La revisión final del profe es **mañana**; el objetivo es entregar **TODO**, sin pendientes que el profe vea en pantalla.
> **Insumos a leer ANTES de empezar:**
> - `docs/pruebas/PLAN_RESOLUCION_PENDIENTES_25jun.md` (el plan a ejecutar)
> - `docs/pendientes/PENDIENTES_MAESTRO_25jun.md` (el backlog)
> - `docs/mockups/estimacion_completa_25jun.html` (mockup APROBADO)
> - `docs/audios/Combinado_2026-06-25_2145.md` (los 5 audios del profe)
> - `documentos/legal/` → **reglamento (RLOPSRM) y ley (LOPSRM) + LFD**. Es la fuente legal.

---

## 0. REGLAS DE SEGURIDAD — NO NEGOCIABLES (aplican aunque sea sesión autónoma)

1. **BACKUP PRIMERO.** Antes de tocar la base, haz `pg_dump` de Render y guárdalo fuera del repo. Patrón:
   `docker exec sigecop_db pg_dump "$RENDER_DB" -f /tmp/backup_pre_autonoma.sql` + `docker cp` al host. NO uses el operador `>` de PowerShell (corrompe a UTF-16). Sin backup verificado, NO escribas en la base.
2. **RAMA, no main.** Trabaja en una rama nueva `entrega-final-26jun`. Commitea ahí. **NO hagas push a main ni dispares deploy** — eso lo hace Maiki en la mañana tras revisar.
3. **Base viva = solo local en esta sesión.** Las migraciones de schema y los scripts de datos los **escribes y los corres contra la base LOCAL** para probarlos. Para Render dejas un **runbook backup-gated** (ver §6). NO corras scripts destructivos contra Render de forma autónoma.
4. **Schema = idempotente.** Todo cambio de schema con `IF NOT EXISTS` / `ADD COLUMN IF NOT EXISTS`. Nada que rompa un redeploy. Columnas nuevas **nullable** primero, backfill después.
5. **Aditivo, no destructivo.** Para cuentas/contratos: **upsert idempotente** (`ON CONFLICT`), nunca `TRUNCATE`/`DELETE` masivo de usuarios o contratos. Si hay que "recrear", hazlo idempotente para que re-correr sea seguro.
6. **Zona congelada:** puedes editarla en esta sesión (autorizado), PERO cada edición a `auth.controller.js`, `acceso.js`, `estimaciones.controller.js`, `contratos.controller::crearContrato`, `auth.middleware.js` se **reporta una por una** en el reporte final para revisión de Maiki. Tras cada edición de auth, corre la suite de tests; si algo se pone rojo, **revierte esa edición** y repórtalo.
7. **Tests verdes antes de commit.** `vite build` + suite e2e deben pasar. Si un cambio rompe algo, arréglalo o revierte; no commitees en rojo.

---

## 1. MARCO LEGAL (para cualquier decisión)

- Toda regla de validación mapea a **artículo + fracción** exacto de `documentos/legal/`. Cítalo en código (comentario) y en el reporte.
- Si la ley lo respalda literal → **alta certeza**, impleméntalo.
- Si la ley **no** lo dice → es decisión de diseño (Nivel 2): **decide tú**, impleméntalo, y **repórtalo en el reporte final** con tu justificación, para que Maiki/el profe lo valide.
- No inventes citas. Si no encuentras el artículo, márcalo `[validar]`.

---

## 2. DECISIONES YA CERRADAS (no las re-abras)

- **IVA (D3):** Secciones 1 y 2 de la carátula **sin IVA** (RLOPSRM art. 2 fr. XIX); Sección 3 "Del neto a recibir" **CON IVA** (16% estimación − 16% amortización), como el GACM real. Ya implementado en `DocumentoCaratula.jsx`. Mantenlo.
- **Foto de avance (D1):** **vuélvela OPCIONAL.** El profe en el audio: *"foto obligatoria no va ahí, bórralo"*; art. 132 fr. IV RLOPSRM es **discrecional**, no obligatorio. Revierte el gate (`TrabajosTerminados.jsx:270` quita `&& fotos.length > 0` y el server-side equivalente). Déjalo anotado para avisar al equipo.

---

## 3. FASE 0 — AUDITORÍA DE ESTADO (antes de ejecutar)

El plan asume cosas "ya hechas". Verifícalas contra el repo real y **corrige el plan** si algo no está como dice:
- Confirma qué de P2-* (H6 pago, H2, H8, H9, #20) está realmente implementado y funcionando (lee el código, corre lo que puedas en local).
- Confirma los hallazgos del plan §4 (redirect alta→apertura existe, endpoint personas-por-empresa existe, negativos se saltan no se rechazan, etc.).
- Genera al inicio del reporte una tabla **"esperado vs real"** con lo que encontraste distinto. Luego ejecuta los **huecos reales**, no lo que ya está.

---

## 4. EJECUCIÓN — todo el plan, en este orden

Ejecuta P1 completo, P3-1, P1-9, los endurecimientos server-side, y el trabajo de empresas. Verifica P2-*.

### 4.1 BATCH A — frontend (P1-1 labels, P1-4 fechas, P1-5 unidad, P1-6 negativos, P1-8 scope, P2-5)
Como en el plan. Gates en cliente con mensajes claros. Cita legal en cada validación.

### 4.2 EMPRESAS — hazlo COMPLETO (P1-3 + el modelo en la base)
El profe pidió que **esté en la base**, no solo en la vista. Hazlo bien:
1. **Schema (idempotente):** `ALTER TABLE contrato ADD COLUMN IF NOT EXISTS empresa_contratista_id INT REFERENCES empresa(id)`. (Y para supervisión externa, `empresa_supervision_id` análogo — ver P3-1.)
2. **Backfill:** rellena `empresa_contratista_id` de los contratos existentes derivándolo de la empresa del superintendente actual. Verifica con SELECT que todos los contratos demo quedaron ligados; reporta los que no.
3. **Padrón canónico:** agrega `UNIQUE` (por RFC, o por nombre normalizado) a `empresa` con guard `IF NOT EXISTS`. **Detecta** duplicados existentes ("Grupo CAR" vs "Grupo CARS") y **repórtalos**; **NO los fusiones automáticamente** salvo coincidencia inequívoca de RFC (fusionar mal corrompe asociaciones). Los ambiguos los decide Maiki.
4. **Alta de contrato:** selector de **empresa (contraparte/contratista)** → selector de **persona filtrado a esa empresa** (nombre real, no cuenta). Usa `api.personasDeEmpresa`. `crearContrato` ahora **persiste `empresa_contratista_id`** (esto toca el congelado → repórtalo). Aplica igual a contratista y supervisión.
5. **Consulta por empresa:** habilita que se pueda responder *"¿cuántos contratos tiene esta empresa?"* (lo que el profe pidió literal en el audio) — una consulta/vista por `empresa_contratista_id`.

### 4.3 BATCH B — generadores + nota de apertura
- **P1-2:** resumen global + generador por concepto + **soportes vinculados a CADA generador con su nota de bitácora** (cierra el hueco de "nivel estimación" → llévalo a nivel generador individual). Contra el mockup aprobado.
- **P1-7:** nota de apertura con formato exacto (No. bitácora, fecha/hora, dependencia, contratista, contrato, objeto) + **re-añadir identificación del presentante** ("es la ley") + verificar el flujo de 2 pantallas (redirect alta→apertura).

### 4.4 BATCH C — roster (P3-1 + P1-9)
- **P3-1:** eximir a **supervisión** de la REGLA 4 (puede ser de otra empresa). Mantener misma-empresa para contratista/superintendente.
- **P1-9 (b)** extender el guard de sustitución a los **3 roles**; **(c)** regla temporal de firmas (saliente no firma tras su baja; entrante no antes de su alta), usando `contrato_roster.vigencia_*`. **(a)** confirma en código que el guard de pendientes corre para los tres y agrega un test (la verificación en pantalla la hace Maiki).

### 4.5 BATCH D — endurecimiento server-side (zona congelada, autorizado)
- `crearContrato`: validar fechas (P1-4-back), unidad obligatoria (P1-5-back), persistir `empresa_contratista_id`.
- `lib/programa.js::guardarMatriz`: **rechazar** `cantidad < 0` (hoy las salta).
- **Sesión (P3-3):** implementa `token_version` para que un login nuevo invalide la sesión anterior ("cualquier sesión mata la anterior"). Esto toca `auth.controller` + `auth.middleware` (congelados) → tests + reporte obligatorios.

### 4.6 Cuentas del equipo (P0-2)
Prepara el seed **idempotente** de las 23 cuentas + reasignación de SOP-002..006 (basado en `REPARTO_EQUIPO_RENDER_25jun.md`). Córrelo contra **local** para validar. Para Render → runbook §6. Con `token_version` + reparto, el equipo ya no se saca entre sí.

### 4.7 Verificar P2-* (no construir, salvo que encuentres roto)
Lee el código de H6/H2/H8/H9/#20. Si algo está roto, arréglalo y repórtalo. Si está bien, déjalo y anótalo como verificado-en-código (el smoke visual lo hace Maiki).

---

## 5. REPORTE FINAL (obligatorio)

Genera `docs/pruebas/REPORTE_SESION_AUTONOMA_26jun.md` con:
- Tabla **esperado vs real** de la Fase 0.
- Por cada item ejecutado: qué cambió, archivos, **cita legal (art. + fracción)**, y resultado de tests.
- **Lista explícita de cada edición a zona congelada** (para revisión de Maiki).
- **Decisiones Nivel 2** (las que no están en la ley) con tu justificación.
- **Duplicados de empresa detectados** que requieren decisión de Maiki.
- Lo que NO pudiste cerrar y por qué.
- El **runbook de Render** (§6) listo para copiar-pegar.

---

## 6. RUNBOOK DE RENDER (lo ejecuta MAIKI en la mañana — NO Code)

Déjalo escrito, listo para pegar, en este orden:
1. `pg_dump` de respaldo de Render (backup-gated).
2. Merge de `entrega-final-26jun` → main + push (bypass).
3. Manual Deploy en Render (el schema idempotente se aplica en el boot).
4. Correr los scripts de datos (backfill `empresa_contratista_id`, seed/reparto de cuentas) contra Render con el patrón `docker exec -i sigecop_db psql "$RENDER_DB" -c "..."`, **con SELECT de verificación antes y después** de cada escritura.
5. Smoke visual: abrir una estimación integrada → Imprimir/PDF; alta de contrato con selector de empresa; sustitución de roster; nota de apertura.

---

## 7. ENTREGABLE ACADÉMICO (P4) — NO lo construye Code
Recuérdaselo a Maiki en el reporte: análisis de riesgos (4 semanas a la fecha) + planes ejecutados escritos **con registro/acta de junta** + resultados por semana. Es documentación humana, no código, pero el profe la revisa mañana.
