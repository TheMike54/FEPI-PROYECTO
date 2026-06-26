# CLAUDE.md — SIGECOP (UAGRO, Etapa 1)

Sistema de Gestión Técnico-Administrativa de Contratos de Obra Pública (LOPSRM / RLOPSRM / LFD).
**Stack:** React + Vite + Tailwind (`frontend/`) · Node + Express + PostgreSQL (`backend/`) · deploy en Render. **Idioma del proyecto: español.**

## 🔱 REGLA PERMANENTE — leer primero, mantener después (OBLIGATORIO)

**ANTES de cualquier tarea, LEE:**
1. `docs/estado/ESTADO_ACTUAL.md` — el documento **canónico** del estado real del sistema (cómo
   levantarlo, arquitectura, modelo de datos, flujos críticos con `archivo:función`, catálogo de HU con
   estado, zona congelada, pendientes). Es la **fuente de verdad** sobre lo que el sistema HACE HOY.
2. `docs/requisitos/Historias_Usuario_ACTUALIZADAS_12jun.md` — las historias de usuario vigentes
   (sus criterios = comportamiento real del sistema).
3. `docs/contexto/CATALOGO_CAMPOS_SISTEMA.md` — catálogo de TODOS los campos/validaciones por pantalla.
   Consúltalo al tocar campos/pantallas (referencia para NO re-auditar el sistema desde cero).

**DESPUÉS de cualquier cambio que altere comportamiento o agregue funcionalidad:**
1. **Actualiza `ESTADO_ACTUAL.md`** (incluida su cabecera de fecha/commit) para que siga reflejando la
   realidad.
2. **Revisa que la(s) historia(s) afectada(s) concuerden con el sistema:**
   - Si construiste algo **sin historia** → agrégala con el **siguiente número libre** (HU-24, HU-25, …),
     **sin renumerar** las existentes; si no puedes, **repórtalo** a Maiki.
   - Si una historia **ya no concuerda** con lo que hace el sistema → **actualízala**.
3. **Cita el artículo de ley** (LOPSRM / RLOPSRM / LFD) donde aplique, o marca **`[validar]`** si es
   interpretativo (lo legal lo confirma el profe, no Code).
4. **No dejes dos docs de estado compitiendo:** `ESTADO_ACTUAL.md` es el único; las fotos viejas viven en
   `docs/historial/`.

> **Docs guía:** historia del proyecto `docs/estado/HISTORIAL_PROYECTO.md` · plan de partición
> `docs/equipos/Plan_Particion_3Equipos_SIGECOP.md` · DDL anticipado `docs/estado/Borrador_DDL_Tablas_Nuevas_SIGECOP.md` · briefs por equipo `docs/equipos/Prompts_Accion_Equipos_SIGECOP.md`.
>
> **Mapa de `docs/` (reorg 26-jun):** `estado/` (estado vivo: ESTADO_ACTUAL, HISTORIAL_PROYECTO, PUNTO_DE_RETOMA,
> Borrador_DDL, DECISIONES) · `requisitos/` (historias + trazabilidad + accesos + requerimientos/validar profe) ·
> `contexto/` (**referencia que Code lee cada sesión:** CATALOGO_CAMPOS_SISTEMA, CONTRATOS_PRUEBA_ESQUEMA,
> MAPA_DEMO_PROFE, SEED_DEMO_SIGECOP, REPARTO) · `pruebas/` (**SOLO planes de prueba:** PLAN_PRUEBAS_FINAL_MATCH,
> POSITIVAS, NEGATIVAS, 24_CONTRATOS, guía e2e) · `legal/` · `planes/` (vigentes) · `reportes/` (vigentes +
> sesiones autónomas) · `mockups/` · `equipos/` · `referencias/` · `historial/` (todo lo superado, nada borrado).

**Resumen de zona congelada (detalle abajo §⛔):** NO tocar auth, `permisos.js`, `server.js`, `schema.sql`
(salvo aditivo idempotente), triggers de inmutabilidad, G1-G8 del alta ni la lógica de cálculo de la
carátula. **Método de trabajo:** **Maiki (TheMike54) integra y es el ÚNICO que despliega** (auto-deploy
desde `main`); los equipos entregan **por PR** que Maiki revisa/rebasa/integra; **Code trabaja en local sin
commit/push** (Maiki revisa el diff); correcciones por **oleadas**; cuadre EXACTO al centavo; registros
formales **append-only** (corregir = registro nuevo vinculado).

## Equipos y ramas
- 6 personas, 3 frentes. **Maiki (TheMike54) integra y es el ÚNICO que despliega a Render** (auto-deploy desde `main`).
- **Fundación (Maiki):** auth, alta/catálogo/programa, control de accesos, estimación core, esquema. Además, las correcciones del profe que tocan el core (A2 programa de obra, B anticipo, C-críticos del alta, F sustitución de personas) y HU-03 (migración + endpoint).
- **Equipo 2 — Bitácora / documental / avance físico:** HU-02, 04, 05, 06, 07, 08, 09, 10, 11.
- **Equipo 3 — Estimaciones (ciclo) / pagos / reportes:** HU-13, 14, 15, 16, 17, 18, 19, 20, 21.
- Ramas `feat/e2-*` y `feat/e3-*`. **Nadie commitea a `main` salvo Maiki.** Rebasar sobre `main` con frecuencia.

## ⛔ ZONA CONGELADA — NO editar (solo Maiki, vía PR)
Sostienen auth, control de acceso, cuadre exacto del catálogo e integridad financiera. ¿Necesitas algo de aquí? **Pídeselo a Maiki; no lo edites.**

**Backend**
- `backend/server.js` (montaje de routers)
- `backend/src/db/schema.sql`, `src/db/init.js`, `src/db/pool.js`
- `backend/src/middlewares/auth.middleware.js` (JWT, `requireRole`)
- `backend/src/lib/acceso.js` (acceso por participación)
- `backend/src/controllers/auth.controller.js` + `src/routes/auth.routes.js`
- `backend/src/controllers/usuarios.controller.js` + `src/routes/usuarios.routes.js`
- `backend/src/controllers/contratos.controller.js` + `src/routes/contratos.routes.js`
- `backend/src/controllers/estimaciones.controller.js` + `src/routes/estimaciones.routes.js`

**Frontend**
- `frontend/src/App.jsx` (rutas + guardas de acceso)
- `frontend/src/data/permisos.js` (matriz de acceso HU × rol)
- `frontend/src/context/SesionContext.jsx` (sesión / JWT)

## Esquema (regla dura)
- **UN solo `schema.sql`, autor único: Maiki.** Ningún equipo lo edita.
- ¿Necesitas una tabla? Mándale a Maiki el bloque de DDL (mira el borrador) y él lo integra.
- Migraciones **aditivas e idempotentes** (`CREATE TABLE IF NOT EXISTS`, guards sobre `pg_constraint`/`information_schema`, `ADD COLUMN ... DEFAULT`). Probar 2–3× en local antes de desplegar.

## Backend — cómo añadir endpoints
- Crea **archivos NUEVOS** en tu dominio: `src/controllers/<tuHU>.controller.js` + `src/routes/<tuHU>.routes.js`. **No metas tu lógica en los controllers congelados.**
- Maiki los **monta en `server.js`** (congelado) y reinicia el backend.
- Patrones obligatorios (copia de los existentes): valida JWT con `authMiddleware`; acota por participación con `esParteOSupervision` (`lib/acceso.js`); cálculos sensibles **server-side** (fuente única de verdad); registros formales **append-only** (trigger de inmutabilidad); `registrado_por`/`integrada_por`/etc. salen del **JWT**, nunca del body.

## Frontend — cómo trabajar tu HU
- Edita el componente de tu página en `src/pages/`. Las rutas y permisos de TODAS las HU **ya existen** en `App.jsx`/`permisos.js` — no los toques.
- Reemplaza el dummy por llamadas reales en `src/services/api.js` (sigue el patrón de las HU ya cableadas: HU-01/08/09/10/12/21).
- Respeta `useVistaHU(huId)`: `soloLectura` cuando el nivel no es `E`.

## Modo proyecto: EN RETIRADA
La app quedará **solo en modo aplicación** (login real). **No construyas nada nuevo** que dependa de `modo === 'proyecto'`, del atajo de rol demo, ni de `mostrarMeta`. La remoción la coordina Maiki (§6 del plan); con ella **se borran o se reescriben como autenticadas las ~18 specs de modo proyecto** (no se quedan `skip` para siempre).

## Convenciones legales y de datos
- **Cuadre EXACTO al centavo** (sin tolerancia): el monto se DERIVA `Σ ROUND(cant×pu, 2)`. Clave de concepto **capturada** por el usuario (art. 45 fr. IX RLOPSRM).
- **Carátula de estimación server-side:** amortización (art. 138 RLOPSRM), 5 al millar (art. 191 LFD), exceso (art. 118 RLOPSRM), periodo (art. 54 LOPSRM). **CMIC / 2 al millar: parametrizable, base LFD / aportación CMIC (NO LOPSRM), tasa y aplicabilidad a CONFIRMAR con el profe** (Nivel 1: no la decide Code).
- **Inmutabilidad:** apertura, firmas, notas, documentos, estimaciones y pagos son append-only (triggers). Corregir = registro vinculado NUEVO, no editar.
- **Sustitución de personas (art. 125):** se SUSTITUYE, no se borra. Histórico 1:N en `contrato_roster`; el cache de punteros de `contratos` se sincroniza en **un solo punto** (endpoint de sustitución, transaccional).
- Cita siempre el artículo (LOPSRM / RLOPSRM / LFD) en las validaciones. Code lee los PDF de `docs/`, pero **lo legal lo confirma el profe**.

## Dev / pruebas / deploy
- Stack local: `docker compose up` → `sigecop_db` (5432), `sigecop_backend` (4000), `sigecop_frontend` (5173).
- **Backend NO auto-recarga:** tras editar backend → `docker restart sigecop_backend`. **Frontend SÍ** (Vite HMR).
- psql: `docker exec -i sigecop_db psql -U sigecop -d sigecop_db ...`.
- **CI = solo que compile** (`vite build`). Los e2e **no** corren en CI. Antes de pedir merge: **smoke local** de tu HU contra el stack (Playwright con sesión real inyectada en `localStorage`). Specs que necesiten backend → `test.skip(!!process.env.CI, 'requiere backend')`.
- **Solo Maiki despliega.** Migración de esquema con runbook: backup → `psql --single-transaction -v ON_ERROR_STOP=1` → verificar código viejo sobre el esquema nuevo → push.
- Credenciales demo: doc interno `Cuentas_Prueba_SIGECOP.md` (gitignored). **Nunca** pongas contraseñas en archivos versionados.

## Estilo
Español siempre. Cambios pequeños y revisables. No inventes datos/fórmulas/citas legales. Ante duda de alcance o ley: **pregunta a Maiki / al profe** antes de programar.
