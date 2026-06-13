# Plan 2 — Pase 2.3: la sustitución de personas se asienta en la bitácora y se ve en el expediente

**Fecha:** 2026-06-05 · **Autor:** Fundación (Maiki) · **Estado:** LOCAL, sin commit/push, sobre `main` (`edbf58c`).

**Ley:** la bitácora asienta los hechos relevantes (art. 123 fr. III RLOPSRM); un cambio de superintendente/residente/supervisión ES un hecho relevante → nota tipo `res_sustitucion` (art. 125 fr. I inciso g). El nombramiento formal es documento del expediente (art. 74 LOPSRM); aquí se refleja el roster histórico.

---

## 1. Qué se construyó

1. **Nota AUTOMÁTICA al sustituir.** `POST /api/roster/contrato/:id/sustituir` (controller `sustituirPersona`) ahora, **dentro de la misma transacción** que cierra la asignación anterior + crea la nueva + sincroniza el caché de punteros, **asienta una nota `res_sustitucion`** en la bitácora del contrato (rol, persona anterior → nueva, motivo, fecha). Reutiliza el folio correlativo atómico del controller de bitácora (`insertarNotaAtomica`), no lo reimplementa. La nota se liga a la fila del roster (`contrato_roster.nota_id`).
2. **Guard sin bitácora → DIFERIR.** Si el contrato aún no tiene bitácora aperturada, la sustitución **NO truena**: se registra igual (roster), la respuesta marca `nota_diferida: true` + un `aviso`, y **al ABRIR la bitácora** (`abrirBitacora`) se asientan automáticamente las notas de las sustituciones previas sin nota (numeradas tras la #1 de apertura; el contenido aclara «Sustitución ocurrida el … ; asentada al abrir la bitácora»). Así el aviso es verdadero.
3. **Expediente (HU-04).** `ConsultaExpediente.jsx` añade el bloque **«Roster y sustituciones de personas»**, que lee el endpoint propio `GET /api/roster/contrato/:id` (NO `detalleContrato`, que es zona congelada): muestra por rol el histórico append-only (persona, desde, hasta/«Vigente», motivo) y si la sustitución ya tiene su nota asentada en bitácora.

## 2. Decisión del guard (lo que pediste reportar)

**Implementé DIFERIR (con aviso).** La sustitución sin bitácora se registra (`201`, `nota_diferida: true`, `aviso`), y la nota se asienta **automáticamente al abrir la bitácora** — no queda como promesa vacía. Alternativa descartada: «solo avisar» sin materializar (haría falso el aviso).

## 3. Archivos (working tree sobre main, sin commit)

- **M** `backend/src/controllers/roster.controller.js` — genera la nota en la tx de `sustituirPersona` (o difiere); añade `nota`/`nota_diferida`/`aviso` a la respuesta. (NO congelado — Pasada F.)
- **M** `backend/src/controllers/bitacora.controller.js` — helper `textoNotaSustitucion`, bloque DIFERIDO en `abrirBitacora` tras la nota #1, exporta `insertarNotaAtomica`/`textoNotaSustitucion`. (NO congelado — Equipo 2.)
- **M** `frontend/src/pages/ConsultaExpediente.jsx` — bloque de roster vía `api.rosterContrato`.
- **A** `backend/scripts/seed_smoke_p23_sustitucion.sql` — cuenta sustituta (2.ª contratista activa).
- **A** `frontend/e2e/hu-02-sustitucion-bitacora.spec.js` — flujo real.
- **Zona congelada:** intacta (`schema.sql`, `server.js`, `contratos.controller.js`, `App.jsx`, `permisos.js`, `SesionContext.jsx`, `lib/acceso.js` sin cambios — verificado con `git diff`). **Sin DDL**: el tipo `res_sustitucion` ya existía en el catálogo `bitacora_nota_tipos`.

## 4. Núcleo respetado (no se rompió)

- **Inmutabilidad de notas/firmas:** la nota nace completa (un solo INSERT, `estado='emitida'`); el bloque diferido solo INSERTA notas nuevas (folio `MAX+1`) y hace `UPDATE` únicamente de `contrato_roster.nota_id` (metadato editable que el trigger del roster permite); jamás toca notas previas ni firmas.
- **Roster append-only:** se sigue cerrando la asignación anterior y creando una nueva (nunca se borra ni reasigna).
- **Atomicidad / un solo punto de sincronización:** todo (cierre + alta + nota + caché de punteros) va en el mismo `BEGIN/COMMIT` bajo `pg_advisory_xact_lock(3, contratoId)` + `FOR UPDATE`. Si la nota falla, rollback total.
- **Sin deadlock:** el lock de roster `(3, contratoId)` (2-arg) y el de nota `(bitacoraId)` (1-arg) son keyspaces distintos en Postgres; `emitirNota` concurrente solo toma el de nota → no hay ciclo de espera.

## 5. Revisión adversarial (multi-agente) — resultado

Sin hallazgos accionables (todos `baja`). Confirmado: zona congelada intacta, atomicidad y rollback correctos, sin deadlock, inmutabilidad/folio respetados, sin doble-asiento, sin regresión esperable en apertura. Pendientes **[validar profe]** (decisiones legales, ya marcadas en el código):

- **Emisor de la nota:** hoy es quien ejecuta la sustitución (`req.user.id`); art. 125 fr. I g asigna el asiento al residente. ¿Forzar emisor = residente cuando ejecuta la dependencia?
- **Folio diferido:** las notas diferidas quedan #2..#N con fecha de asiento = apertura (el hecho ocurrió antes); el contenido lo aclara. ¿Satisface art. 123 fr. V/VI?

## 6. Pruebas

`frontend/e2e/hu-02-sustitucion-bitacora.spec.js` (login real + alta por API + UI), 4 casos: (1) con bitácora → nota `res_sustitucion` (rol, anterior→nueva, motivo, art.125); (2) sin bitácora → no truena, `nota_diferida`; (3) diferido → al abrir la bitácora se asienta sola; (4) expediente HU-04 muestra el bloque de roster con la sustitución. **4/4 verde.** Suite completa: sin regresión.

---

## Runbook — prueba local

> Requiere el stack Docker arriba. **El backend cambió → `docker restart sigecop_backend`** tras editar. Frontend: Vite HMR.

```powershell
# 1. (si está abajo) levantar stack
docker compose up -d
# 2. recargar el backend (cambió roster + bitacora controllers)
docker restart sigecop_backend
# 3. sembrar la cuenta sustituta (idempotente)
docker exec -i sigecop_db psql -U sigecop -d sigecop_db -v ON_ERROR_STOP=1 < backend/scripts/seed_smoke_p23_sustitucion.sql
# 4. correr SOLO el spec del Pase 2.3
npm --prefix frontend run test:e2e -- hu-02-sustitucion-bitacora
# 5. suite completa (regresión)
npm --prefix frontend run test:e2e
```

**Cuentas (login real, `Sigecop2026!`):** `residente@` (abre bitácora + sustituye, es creador), `dependencia@` (sustituye), `sustituto.contratista@sigecop.test` (nueva persona del rol superintendente, sembrada). Los contratos de prueba se crean por API con folio único por test (acumulan, como el spec de roster existente).
