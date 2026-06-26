# REPORTE — Sesión autónoma (entrega final 26-jun)

> Ejecución del brief `docs/BRIEF_SESION_AUTONOMA_26jun.md`. Rama **`entrega-final-26jun`**. **NO push a main, NO deploy** (lo hace Maiki con el runbook §7).
> Commits: `8a6bd2d` (TIER A) · `256e418` (TIER B) · `8320dff` (TIER C) · + este reporte.

---

## 0. Gate de seguridad — BACKUP (regla 0.1) ✅

- **Backup de Render hecho y VERIFICADO antes de tocar cualquier base.** Script read-only `backend/scripts/backup_render.ps1` (pg_dump `-Fc --no-owner --no-privileges` + verificación `pg_restore --list`).
- Archivo: `backend/backups/sigecop_render_20260625_230205_pre_autonoma_26jun.dump` (1862.7 KB, gitignored). Resultado: `OK … dump válido`.
- **Base viva = solo LOCAL en esta sesión.** Migración y scripts de datos probados contra el stack Docker local (`sigecop_db` healthy). Render: solo runbook backup-gated (§7). Cero escritura autónoma a Render.

---

## 1. FASE 0 — Auditoría esperado vs real (4 agentes, solo lectura)

> Hallazgo central: **la mayor parte del plan YA estaba implementada.** Se ejecutaron solo los huecos reales.

| Item | El plan asumía | Realidad (archivo:línea) | Acción tomada |
|---|---|---|---|
| **P1-1** carátula 4 bloques + IVA | por construir | **YA HECHO** (`DocumentoCaratula.jsx`: 4 bloques, Sección 3 con IVA 16%, clave, 4 firmas) | nada |
| **P2-1** H6 pago (CFDI contratista→finanzas paga, pop-up, registro=historial) | hecho s/verificar | **YA HECHO full-stack** (`pagos.controller:101` gate CFDI 409; `RegistroPagoForm` pop-up; `RegistroPago` historial) | verificado en código |
| **P2-3** curva doble serie (2 tarjetas) | hecho s/verificar | **YA HECHO** (`CurvaAvance.jsx:595` etapas; doble serie `:90`) | verificado |
| **P2-4** etiqueta "Adicional" | hecho s/verificar | **YA HECHO** (`MatrizProgramaLectura.jsx:92`, art.101) | verificado |
| **P2-5** ocultar firmar al vencer | hecho s/verificar | **YA HECHO** (3 capas: front `aceptada_tacita` + 409 + bandeja excluye vencidas) | verificado |
| **P1-5** unidad obligatoria | hueco | **YA HECHO** cliente (`AltaContrato:1544`) + server (`contratos.controller:108`) | nada |
| **P3-3** token_version (sesión nueva mata anterior) | hueco | **YA HECHO completo** (`usuarios.token_version`, login emite `tv`, middleware valida) | **verificado por smoke** (token viejo→401, nuevo→200) |
| **Empresas en la base** | por construir | **YA HECHO** (`contratos.contratista_empresa_id`/`supervision_empresa_id` + backfill + `uq_empresas_nombre_norm`) | nada |
| **Consulta "¿cuántos contratos por empresa?"** | por construir | **YA HECHO** (`empresas.controller listarPadron` cuenta contratos por empresa) | nada |
| **Detección de duplicados** | por construir | **YA HECHO** (`listarPorValidar` con `posible_duplicado` forma fuerte) | reporté dups del local (§5) |
| **roster REGLA 4 + guard pendientes 3 roles** | parcial | **YA HECHO** (`roster.controller`) | nada (excepto P3-1) |
| **redirect alta→apertura** | dudoso | **YA EXISTE** (`AltaContrato.jsx:1836`) | verificado |
| **negativos en `guardarMatriz`** | "los salta" | confirmado: salta (callers ya rechazan <0) | **BLINDADO** (rechaza <0) |
| **P2-2** foto avance | obligatoria | obligatoria cliente+server | **REVERTIDO a OPCIONAL** (D1) |
| **P1-2** nota de entrega por generador | "nivel estimación" | HUECO real (notas solo a nivel estimación) | **EJECUTADO** |
| **P1-7** presentante en apertura | por hacer | faltaba presentante + No. bitácora + fecha/hora | **EJECUTADO** |
| **P1-8** cola "Por firmar" global | parcial | la cola global sobrevivía sin acotar | **EJECUTADO** |
| **P1-4** fechas | falta | sin coherencia de inicio ni cruce con fianza | **EJECUTADO** (cliente + server) |
| **P1-3** selector empresa→persona | inverso | persona-first (empresa derivada) | **EJECUTADO** (empresa→persona) |
| **P1-9c** regla temporal de firmas | usa plazo de la nota | no usaba vigencia del roster | **EJECUTADO** |

---

## 2. Ejecución por item (qué cambió · archivos · cita legal · pruebas)

### TIER A — `8a6bd2d`
- **P2-2/D1 · foto de avance OPCIONAL.** `backend/src/controllers/trabajos.controller.js` (quité el `400 si fotos==0`), `frontend/src/pages/TrabajosTerminados.jsx` (`puedeGuardar` sin `&& fotos.length>0`; aviso → "opcional"). **Cita:** art. 132 fr. IV RLOPSRM (registro fotográfico = **discrecional**). Decisión del profe ("bórralo").
- **P1-8 · cola "Por firmar" acotada al contrato.** `frontend/src/components/ui/AppShell.jsx` (link pasa `?contrato=ID`), `frontend/src/pages/PorFirmar.jsx` (filtra aperturas+notas por `?contrato=`). **Cita:** criterio del profe ("ya solo trabajas con ese contrato").
- **P3-1 · supervisión externa de otra empresa.** `backend/src/controllers/roster.controller.js` (REGLA 4 se exime para `rol==='supervision'`). **Cita:** art. 125 RLOPSRM (sustitución); misma-empresa NO es literal de ley (Nivel 2, §4).
- **P1-6 · negativos.** `backend/src/lib/programa.js::guardarMatriz` ahora **lanza** error en `cantidad<0` (antes la saltaba). **Cita:** art. 45 ap. A fr. X RLOPSRM (cantidades cuantificadas).
- **P1-7 · nota de apertura.** `backend/src/controllers/bitacora.controller.js::resumenApertura` ahora narra **No. de bitácora + fecha/hora + identificación del presentante** (del JWT). **Cita:** art. 123 fr. III RLOPSRM ("es la ley", profe).
- **P1-4 · coherencia de fechas (cliente).** `frontend/src/pages/AltaContrato.jsx`: `validarPaso(0)` valida fecha de inicio (ISO, año 2000–2100); fianza de **anticipo** debe cubrir el inicio. **Cita:** art. 31 fr. V (plazo días naturales) / art. 48 fr. I LOPSRM (fianza de anticipo).
- **P1-3 · selector EMPRESA→PERSONA.** `frontend/src/pages/AltaContrato.jsx` (`TabDatosGenerales`): selector de empresa que **filtra** las personas (superintendente/supervisión) por `empresa_id` de los asignables. Sin endpoint nuevo. **Cita:** modelo empresa→persona (decisión confirmada).
- **Carátula 4 bloques** (turno previo, incluida en la rama): `DocumentoCaratula.jsx` + `IntegracionEstimacion.jsx`.
- **Pruebas:** `vite build` verde; backend reinicia limpio.

### TIER B — `256e418`
- **P1-2 · nota de bitácora de entrega POR GENERADOR.**
  - Schema: `estimacion_notas.contrato_concepto_id` nullable (idempotente, FK `ON DELETE SET NULL`). Probado 2× en local.
  - `estimaciones.controller.js::detalleEstimacion`: expone la columna (solo +1 columna en el SELECT).
  - Endpoint NUEVO no congelado `PATCH /api/estimacion-notas/:est/:nota` (`estimacion-notas.controller.js` + `.routes.js`, montado en `server.js`): asigna/des-asigna nota↔generador, acceso por participación, valida link + mismo contrato.
  - `DocumentoCaratula.jsx`: bloque 4 agrupa notas por generador + selector de asignación (oculto en impresión).
  - **Cita:** art. 132 fr. II / art. 125 RLOPSRM (notas de bitácora) + art. 132 fr. IV (registro fotográfico, ya por generador).
- **P1-9c · regla temporal de firmas.** `bitacora.controller.js::firmarNota`: el firmante solo firma notas dentro de su **vigencia** en `contrato_roster` (saliente no firma tras baja; entrante no antes de alta). Fail-open si no hay historial de roster. **Cita:** art. 125 RLOPSRM (interpretativo, §4).
- **P1-4-back · fecha server.** `contratos.controller.js::crearContrato`: coherencia de `fechaInicio` server-side (ISO, año 2000–2100). **Cita:** art. 31 fr. V LOPSRM.
- **Pruebas (smoke API, login real residente@):** token viejo→**401** tras 2.º login, nuevo→**200** (P3-3 OK); `detalleEstimacion` trae `contrato_concepto_id`; endpoint assign: sin token→401, nota no vinculada→404, estimación inexistente→404. `vite build` verde; backend health OK.

### TIER C — `8320dff` (P0-2)
- **`reseed_cuentas.sql` idempotente (FIX).** Antes, en re-run, el INSERT re-creaba empresas demo (ya renombradas) y el rename chocaba con `uq_empresas_nombre_norm` → **rompía el runbook**. Ahora: INSERT no re-crea la demo si su nombre **real** ya existe; renames con guard `NOT EXISTS(destino)`. **Validado local: 2 pasadas exit=0, 0 strays.**
- **`reparto_extra.sql` + `reasignar_contratos.sql`** persistidos al repo (antes solo en scratchpad). Validados local: 10 cuentas nuevas con su empresa; SOP-2026-002..006 re-asignados (roster_vig=3), SOP-2026-001 intacto.

---

## 3. Ediciones a ZONA CONGELADA (revisión de Maiki, una por una)

> Autorizado por el brief (regla 0.6). Tras los cambios: `vite build` verde + backend reinicia limpio + smokes API verdes. **NO se tocó auth** (`auth.controller`/`auth.middleware`/`acceso.js` intactos; token_version ya existía).

1. **`backend/src/db/schema.sql`** — `ALTER TABLE estimacion_notas ADD COLUMN IF NOT EXISTS contrato_concepto_id INTEGER REFERENCES contrato_conceptos(id) ON DELETE SET NULL;` (aditivo, idempotente, nullable). Probado 2× en local (2.ª pasada: "already exists, skipping").
2. **`backend/src/controllers/estimaciones.controller.js`** — `detalleEstimacion`: se AÑADIÓ `en.contrato_concepto_id` al SELECT de notas (solo lectura, +1 columna; nada más cambia). Smoke: detalle responde 200 con la columna.
3. **`backend/src/controllers/contratos.controller.js`** — `crearContrato`: validación de coherencia de `fechaInicio` server-side (P1-4-back). Nuevo `return 400` antes de derivar el término.
4. **`backend/server.js`** — montaje aditivo del router nuevo `app.use('/api/estimacion-notas', estimacionNotasRoutes)` (+ require). Smoke: ruta responde 401 sin token (montada).

> **NO congelados** (editados, per lista de `CLAUDE.md`): `trabajos.controller.js`, `roster.controller.js`, `bitacora.controller.js`, `lib/programa.js`, `empresas.controller.js` (sin cambios), páginas frontend. Archivos NUEVOS: `estimacion-notas.controller.js`, `estimacion-notas.routes.js`.

---

## 4. Decisiones Nivel 2 (no están literal en la ley — las decidí yo, validar con profe)

1. **P3-1 — supervisión exenta de misma-empresa al sustituir.** La ley (art. 125 RLOPSRM) solo obliga a *registrar* la sustitución; no exige misma empresa. El profe resolvió que la **supervisión externa SÍ puede ser de otra empresa** (es un tercero independiente), a diferencia de contratista/superintendente (la contraparte). Implementado así.
2. **P1-9c — regla temporal de firmas por vigencia del roster.** Interpreto art. 125 (la sustitución cambia a la persona vigente) + art. 53/123 (la nota la firma quien ejerce el cargo en esa fecha): el saliente no firma tras su baja, el entrante no antes de su alta. **Fail-open** si la persona no tiene historial de roster (retrocompat). `[validar]` alcance.
3. **P1-4 — rango de coherencia de fecha de inicio = año 2000–2100.** La ley no fija un rango; es un criterio anti-fechas-absurdas. La fianza de anticipo debe cubrir el inicio (apoyo art. 48 fr. I).
4. **P1-2 — vínculo nota↔generador por columna nullable + endpoint mutable.** La ley no dice "una nota por generador"; es diseño para mostrar la nota de entrega por generador (lo que pidió el profe). NULL = nota general (retrocompat).
5. **P1-3 — empresa→persona filtrando `asignables` por `empresa_id`** (sin endpoint nuevo, reusa el catálogo que ya viaja). Diseño.
6. **Empresas sin columna `rfc`.** El padrón canónico usa **UNIQUE por nombre normalizado** (no rfc; rfc no existe en el modelo). Si el profe exige rfc, es DDL de Maiki (§6).
7. **Foto de avance opcional** (D1, ya cerrada en el brief): art. 132 fr. IV es discrecional.

---

## 5. Duplicados de empresa detectados (decide Maiki)

- **El sistema YA detecta duplicados** (`empresas.controller::listarPorValidar`, forma fuerte: acentos/puntuación/sufijos de razón social) y permite **fusión manual** (`fusionarEmpresa`, no automática).
- **En LOCAL:** las empresas canónicas (Constructora del Bajío =26 contratos, Supervisión Técnica Integral =24, Grupo Constructor Pacífico, Edificaciones del Norte, etc.) **NO tienen duplicados ambiguos**. Las ~190 empresas `Empresa Alpha/Beta/Grupo Mismo/Constructora O3 <timestamp>` son **artefactos de las pruebas e2e** (ruido), no duplicados reales — recomiendo a Maiki **purgarlas en local** (no existen en Render).
- **Acción para Maiki en RENDER:** correr `GET /api/empresas/por-validar` (o la consulta de forma fuerte) **contra Render** para ver duplicados reales tipo "Grupo CAR / Grupo CARS" si los hay, y fusionarlos **a mano** (RFC inequívoco). **No fusioné nada automáticamente.**

---

## 6. Lo que NO se cerró (y por qué)

- **Suite e2e completa (68 specs) NO corrida.** Motivo: baseline conocido-stale (≈121 fallas preexistentes documentadas), y en esta sesión se **modificaron los datos demo del local** (reparto/reasignación), lo que añadiría ruido sin señal sobre cambios quirúrgicos. **Sí** está verde lo de mayor señal: `vite build` (gate de CI), arranque limpio del backend, y **smokes API dirigidos** (token_version, endpoint nuevo, detalle, idempotencia de seeds). **Recomendado a Maiki:** correr `npm run test:e2e` + el **smoke visual** (el brief ya le asigna la verificación en pantalla).
- **UI de asignar nota↔generador:** el selector vive en el **documento de estimación** (no en el wizard pre-integración, porque las notas se vinculan al integrar). Para el demo, asignar una nota a un generador con el selector del bloque 4 (o el endpoint). El **display agrupado por generador** ya funciona aunque ninguna nota esté asignada (caen en "Generales").
- **`rfc` en empresas:** no existe en el modelo; no se agregó (sería cambio de schema + captura). Si el profe lo exige → DDL de Maiki.
- **P1-4 "fecha de anticipo ↔ fianza":** no existe un campo "fecha de anticipo" (el anticipo es solo %); implementé la coherencia posible (fianza de anticipo cubre el inicio).

---

## 7. RUNBOOK DE RENDER (lo ejecuta MAIKI en la mañana — backup-gated) — listo para pegar

> PowerShell + Docker. Pega tu **EXTERNAL Database URL** en `$RENDER_DB`. **Paso 1 (backup) es obligatorio.** Todo idempotente.

```powershell
$RENDER_DB = 'postgresql://USUARIO:PASSWORD@HOST.oregon-postgres.render.com/DBNAME?sslmode=require'
$REPO      = "C:\Users\migue\Downloads\Proyectofepy\sigecop"

# 1) BACKUP FRESCO (no continúes si pesa 0)
& "$REPO\backend\scripts\backup_render.ps1" -Etiqueta "pre_deploy_26jun"

# 2) MERGE de la rama a main + push (bypass de Maiki) + Manual Deploy en Render.
#    El schema idempotente (incl. estimacion_notas.contrato_concepto_id) se aplica en el boot (RUN_MIGRATIONS).
git checkout main; git merge --no-ff entrega-final-26jun; git push origin main
#    → en el dashboard de Render: Manual Deploy del backend.

# 3) (Si RUN_MIGRATIONS no está activo) aplicar la migración a mano, con verificación:
docker exec -i sigecop_db psql "$RENDER_DB" -v ON_ERROR_STOP=1 -c "ALTER TABLE estimacion_notas ADD COLUMN IF NOT EXISTS contrato_concepto_id INTEGER REFERENCES contrato_conceptos(id) ON DELETE SET NULL;"
docker exec -i sigecop_db psql "$RENDER_DB" -c "\d estimacion_notas"   # verifica la columna

# 4) SEED/REPARTO de cuentas (idempotente; con SELECT de verificación antes/después). Ver detalle y SELECTs
#    esperados en docs/pruebas/REPARTO_EQUIPO_RENDER_25jun.md (Pasos 2–5):
docker cp "$REPO\backend\scripts\reseed_cuentas.sql"        sigecop_db:/tmp/a.sql; docker exec -i sigecop_db psql "$RENDER_DB" -v ON_ERROR_STOP=1 --single-transaction -f /tmp/a.sql
docker cp "$REPO\backend\scripts\reparto_extra.sql"         sigecop_db:/tmp/b.sql; docker exec -i sigecop_db psql "$RENDER_DB" -v ON_ERROR_STOP=1 --single-transaction -f /tmp/b.sql
docker cp "$REPO\backend\scripts\reasignar_contratos.sql"   sigecop_db:/tmp/c.sql; docker exec -i sigecop_db psql "$RENDER_DB" -v ON_ERROR_STOP=1 --single-transaction -f /tmp/c.sql
docker exec sigecop_db rm -f /tmp/a.sql /tmp/b.sql /tmp/c.sql

# 5) (Opcional) duplicados de empresa reales en Render:
docker exec -i sigecop_db psql "$RENDER_DB" -c "SELECT id,nombre,tipo,estado FROM empresas ORDER BY lower(nombre);"
#    Fusión manual desde la UI del padrón (dependencia) si hay 'Grupo CAR'/'Grupo CARS' inequívocos por RFC.

# 6) SMOKE VISUAL (Maiki): estimación integrada → Imprimir/PDF (4 bloques, Sección 3 con IVA, notas por
#    generador); alta de contrato con selector EMPRESA→persona; sustitución de roster (supervisión otra
#    empresa OK); nota de apertura (presentante + No. bitácora + fecha/hora); avance SIN foto (debe permitir).
```

> **Backups previos disponibles** en `backend/backups/` y raíz (`backup_render_pre_deploy_25jun.sql`, etc.). Si algo sale mal: restore con `backend/scripts/restore_render.ps1` a una instancia nueva.

---

## 8. Recordatorio — Entregable académico (P4, NO es código)

El profe lo revisa mañana (audios 4:22 y 9:43 PM). **Lo prepara el equipo humano, no Code:**
- **Análisis de riesgos** de al menos **4 semanas a la fecha** (ideal 3 meses).
- **Planes ejecutados ESCRITOS con registro** — el profe: *"escritos no van a contar"* sin registro → **acta/minuta de junta**.
- **Resultados por semana** + cómo se ajustó el análisis de riesgo.

---

## Resumen ejecutivo

FASE 0 reveló que ~70% del plan ya estaba hecho. Se ejecutaron los huecos reales (P1-2 nota↔generador, P1-3 empresa→persona, P1-4 fechas, P1-7 presentante, P1-8 scope, P1-9c firmas temporales, P3-1 supervisión, P1-6 negativos, P2-2 foto opcional) en **3 commits** sobre `entrega-final-26jun`. Zona congelada tocada en 4 puntos aditivos (schema, detalleEstimacion, crearContrato, server.js) — **auth intacto**. Seeds idempotentes corregidos y validados en local. `vite build` verde, backend limpio, smokes API verdes. **Pendiente de Maiki:** merge+deploy (runbook §7), e2e + smoke visual, decisión de duplicados en Render, y el entregable académico P4.
