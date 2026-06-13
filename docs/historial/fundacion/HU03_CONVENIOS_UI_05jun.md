# HU-03 — UI de Convenios Modificatorios (cableado al backend real)

**Fecha:** 2026-06-05 · **Autor:** Fundación (Maiki) · **Estado:** LOCAL, sin commit/push, sobre `main` (`edbf58c`).
**Alcance de esta pasada (Fase 1):** convenio de **plazo** end-to-end + **historial inmutable** de convenios + **lectura de versiones** del programa. Editor de matriz para monto/programa/mixto = **follow-on** (ver §6).

---

## 1. Qué se construyó

Se reemplazó la página **dummy** `frontend/src/pages/ConveniosModificatorios.jsx` por su versión **cableada al backend real** de convenios modificatorios (art. 59 LOPSRM). El backend **YA EXISTÍA** (tabla `convenios_modificatorios` inmutable + versionado del programa; hecho en P3); esta pasada solo construye la UI que lo consume — **no se reimplementó backend ni se tocó `schema.sql`**.

- **Selector de contrato** (no texto libre): `api.listarContratos()` → `<select data-testid="select-contrato">`.
- **Formulario de creación** (solo rol `dependencia`, nivel `E`): tipo (solo `plazo` activo en Fase 1), nuevo plazo, motivo (dictamen art. 99 RLOPSRM), folio opcional. El **plazo vigente** se DERIVA del contrato (read-only), no se teclea.
- **Avisos en vivo** del 25% (revisión SFP, RLOPSRM art. 102) y 50% (ajuste de costos, LOPSRM art. 59 Bis), informativos; el backend es la fuente de la verdad.
- **Historial inmutable** de convenios: número/folio, tipo, fecha-hora de registro, cambio (monto/plazo ant→nuevo + Δ%), motivo, badges SFP/ajuste, autoridad. **Sin editar/anular/eliminar** (corregir = convenio nuevo).
- **Versiones del programa** (lectura): lista de snapshots (`programa_version`) con estado vigente/superseded; “Ver programa” despliega la matriz concepto×periodo reusando `MatrizProgramaLectura` (vía un adaptador del snapshot).

## 2. Contrato del backend consumido (verificado, no modificado)

Router `/api/convenios` (montado en `server.js:42`, **después** de `cors()`):

| Método | Ruta | Uso | Acceso |
|---|---|---|---|
| GET | `/convenios/contrato/:id` | `{convenios:[…], versiones:[…]}` | `esParteOSupervision` |
| GET | `/convenios/version/:versionId` | `{version, conceptos:[…], celdas:[…]}` | `esParteOSupervision` |
| POST | `/convenios/contrato/:id` | crea convenio (transaccional, inmutable) | **dependencia / residente_id / created_by** |

**POST (plazo) — body:** `{ tipo:'plazo', motivo, plazo_nuevo_dias, folio? }`. El `autorizado_por` sale del **JWT**; el monto/Δ/flags SFP/ajuste se **derivan server-side**. **Respuesta 201:** `{ ok, convenio_id, numero, plazo_anterior_dias, plazo_nuevo_dias, delta_plazo_pct, requiere_revision_sfp, requiere_ajuste_costos, programa_version_id, … }` (no incluye `folio`).

Métodos añadidos a `api.js` (aditivo): `convenios`, `versionPrograma`, `crearConvenio`.

## 3. Decisiones (tomadas por Maiki en PASO 0)

1. **Guardrail del 25%:** se deja `CONVENIO_LIMITE_VARIACION_PCT` en su **default (25)** → el backend **rechaza (400)** una variación >25%. La UI muestra el aviso (no bloquea el botón) y refleja el 400. *(Si en el futuro se quiere “avisar sin bloquear”, setear la env var a 0.)*
2. **Alcance:** plazo end-to-end + historial + versiones (lectura). **monto/programa/mixto = follow-on** (el backend exige re-capturar catálogo + matriz completos; el monto se DERIVA, no se teclea).
3. **Quién crea:** **solo dependencia** (se sigue `permisos.js` congelado, `HU-03` da `E` solo a dependencia). El backend además permite residente/created_by, pero la UI gateada por `useVistaHU('HU-03')` solo deja crear a dependencia.

## 4. Lecciones obligatorias aplicadas

1. **Selección, no texto libre:** contrato y plazo vigente derivados; nada que ya exista se teclea.
2. **Inmutabilidad:** sin botón editar/anular/eliminar; nota legal explícita.
3. **Banner solo-consulta:** lo emite `HeaderVista huId="HU-03"` para roles `C`; el form se oculta con `!soloLectura`.
4. **Fecha con hora:** `created_at` (TIMESTAMPTZ) con `fechaHora`; `fecha` (DATE) con `fechaMX`.
5. **Acotado por participación + permisos:** `useVistaHU`; el handler aborta si `soloLectura`; backend = 2.ª barrera (403).
6. **Ley art. 59:** la UI avisa >25% (art. 102) y >50% (art. 59 Bis) **sin** presentar un tope del art. 59; el 25% que rechaza es el guardrail configurable, no un tope legal.
7. **Router después de cors:** N/A (ya montado por P3; verificado).

## 5. Archivos (working tree sobre main, sin commit)

- **M** `frontend/src/services/api.js` — aditivo (3 métodos).
- **M** `frontend/src/pages/ConveniosModificatorios.jsx` — dummy → real.
- **D** `frontend/e2e/hu-03-modificatorios.spec.js` — **obsoleto** (probaba la página dummy: inputs monto/días); consolidado en el nuevo spec.
- **A** `frontend/e2e/hu-03-convenios.spec.js` — flujo real (login real + seed psql).
- **A** `backend/scripts/seed_smoke_hu03.sql` / `unseed_smoke_hu03.sql`.
- **Zona congelada:** intacta (`schema.sql`, `server.js`, controllers, `App.jsx`, `permisos.js`, `SesionContext.jsx` sin cambios — verificado con `git diff`).

## 6. Follow-on (siguiente entrega)

**Editor de matriz para convenios de monto/programa/mixto.** El backend exige el **catálogo nuevo COMPLETO** (`conceptos:[{clave,cantidad,pu}]`) + la **matriz nueva** (`celdas:[{clave,periodoNumero,cantidad}]`); el monto se deriva `Σ ROUND(cant×pu,2)`. La UI debe precargar el programa vigente (`api.leerProgramaObra`) como punto de partida editable, derivar monto/Δ y validar el cuadre al 100% (espejo del editor A2 del alta). En esta pasada esos tipos aparecen **deshabilitados** en el selector con “(próxima entrega)”.

## 7. Revisión adversarial (multi-agente) — hallazgos y resolución

- **Zona congelada / lecciones / seguridad:** ✅ sin observaciones.
- **Seed hardcodeaba ids 1/2/3** (media) → **corregido**: se resuelven por email con `RAISE EXCEPTION` si faltan.
- **Assert de inmutabilidad pasaba tautológicamente** (media→baja) → **corregido**: acotado a la fila del convenio (sin controles editables) + **nuevo test** de barrera real (403 del backend a un rol no autorizado vía POST directo).
- **Toast leía `res.folio` inexistente** (baja) → **corregido** en frontend (usa el folio capturado; fallback CM-NNN).
- **Aceptados/documentados:** adaptador de snapshot deriva periodos de las celdas (válido para el snapshot); reseed por test (simplicidad, como HU-13).

## 8. [validar con el profe]

- Asignación legal de umbrales: 25% → revisión SFP (RLOPSRM art. 102); 50% → ajuste de costos (LOPSRM art. 59 Bis). El art. 59 vigente (reforma DOF 14-11-2025) **no** impone tope numérico; el 25% del sistema es un **guardrail configurable**, no un tope legal.
- Quién puede crear convenios (hoy: dependencia, por `permisos.js`).

---

## Runbook — prueba local

> Requiere el stack Docker (`sigecop_db`, `sigecop_backend`, `sigecop_frontend`) arriba. El backend **no** se tocó, así que no requiere restart; el frontend es Vite HMR.

```powershell
# 1. (si el stack está abajo) levantarlo
docker compose up -d

# 2. sembrar el contrato de smoke (idempotente, re-runnable)
docker exec -i sigecop_db psql -U sigecop -d sigecop_db -v ON_ERROR_STOP=1 < backend/scripts/seed_smoke_hu03.sql

# 3. correr SOLO el spec de HU-03 (login real; el seed se reaplica en cada test)
npm --prefix frontend run test:e2e -- hu-03-convenios

# 4. correr la suite completa (regresión)
npm --prefix frontend run test:e2e

# 5. limpiar el contrato de smoke (el afterAll del spec ya lo hace; manual si hiciera falta)
docker exec -i sigecop_db psql -U sigecop -d sigecop_db < backend/scripts/unseed_smoke_hu03.sql
```

**Datos del seed:** contrato `SMOKE-HU03-001`, plazo 180 días, monto $100,000 (CONC-01 100×600 + CONC-02 50×800), 2 periodos, programa que cuadra al 100%, versión v1 (original, vigente). El seed resetea plazo/monto y borra convenios/versiones en cada corrida.

**Cuentas (login real, `Sigecop2026!`):** `dependencia@sigecop.test` (crea), `residente/contratista/supervision@sigecop.test` (consulta), `finanzas@sigecop.test` (sin acceso).
