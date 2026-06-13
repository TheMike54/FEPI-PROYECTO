# Plan 2 — Pase 1: bug del programa de obra + display mes por mes

**Base:** `origin/main = 6b51b37` (desplegado). **Modo:** LOCAL, sin commit/push (Code construye; Maiki integra).
**Alcance de esta sesión:** SOLO Pase 1 (crítico, riesgo del demo). Los Pases 2–4 quedan pendientes para después de tu checkpoint/la reunión con el profe.

---

## 1. Problema (lo que reportaste)

Un contrato que **SÍ** tiene programa de obra (capturado en el alta como matriz concepto × periodo)
aparecía como **"no tiene programa de obra registrado"** en la consulta de expediente (HU-04). Además,
donde sí se veía el programa, se mostraba un **resumen por concepto**, no el **mes por mes**.

## 2. Causa raíz (confirmada leyendo el código)

Existen **dos formas** de guardar el programa y el expediente leía la equivocada:

| | Dónde | Estado |
|---|---|---|
| **Escritura (alta)** | `crearContrato` guarda **ambas**: `contrato_actividades` (A1, texto libre, *deprecated*) **y** la matriz A2 `contrato_periodos` + `programa_obra` vía `guardarMatriz` — `backend/src/controllers/contratos.controller.js:316-354` | ✅ correcto |
| **Lectura (expediente HU-04)** | `detalleContrato` sólo hacía `SELECT … contrato_actividades` — `backend/src/controllers/contratos.controller.js:458-462`. **Nunca** leía `programa_obra` ni `contrato_periodos` | ❌ **el bug** |
| **Frontend** | `ConsultaExpediente.jsx` (`BloquePrograma`) decidía "no registrado" con `if (actividades.length === 0)` | ❌ consecuencia |

Ya existía el endpoint correcto **`GET /api/contratos/:id/programa`** (`programa.controller.js: leerPrograma`,
expuesto como `api.leerProgramaObra`), que devuelve `periodos`, `conceptos`, `celdas` y la reconciliación.
El `ModalDetalleContrato` de Registrados ya lo llamaba, pero pintaba sólo el resumen por concepto.

## 3. Solución (frontend-puro, sin tocar el núcleo)

> **No se tocó nada del backend.** Cero cambios de esquema, cero migración, cero cambios en `detalleContrato`,
> en el cálculo/validaciones de estimación (G1–G8) ni en el gating/100%/cuadre del alta. El fix consume el
> endpoint read-only que **ya existía**.

### Componente nuevo, reutilizable (read-only)
- **`frontend/src/components/programa/MatrizProgramaLectura.jsx`** *(NUEVO)*: matriz **CONCEPTO × PERIODO**
  en solo lectura (espejo de `TabProgramaMatriz` del alta, art. 45 fr. X RLOPSRM). Filas = conceptos,
  columnas = periodos del ciclo, celda = cantidad planeada; columnas Σ planeado / Contratado / Restante.
  Exporta también `periodoQueContiene(periodos, isoDate)` para resaltar el **periodo actual** donde aplique.

### Las 3 vistas leen la matriz y la pintan mes por mes
- **(a) Detalle del contrato en Registrados** — `frontend/src/pages/AltaContrato.jsx` (`ModalDetalleContrato`):
  se reemplazó la tabla *"Programa de obra (resumen por concepto)"* por la matriz *"(mes por mes)"*, con el
  periodo que contiene la fecha de hoy resaltado.
- **(b) Consulta de expediente (HU-04)** — `frontend/src/pages/ConsultaExpediente.jsx`: al seleccionar
  contrato se carga `leerProgramaObra` en paralelo; `BloquePrograma` ahora muestra la matriz si hay programa
  A2, cae a la tabla de **actividades A1** si sólo existe esa (retrocompatibilidad con contratos viejos) y
  sólo dice "no registrado" si no hay ninguna. El buscador por *periodo* también matchea los periodos del ciclo.
- **(c) Captura de estimación (HU-12)** — `frontend/src/pages/IntegracionEstimacion.jsx`: panel **plegable**
  *"Ver programa de obra (mes por mes)"* después de las barras de avance, con el **periodo capturado** resaltado
  (el de la fecha de `periodo-fin`, o el que la contiene). Solo lectura: **no** toca el cálculo de la carátula.

## 4. Decisiones tomadas (y por qué)

1. **Frontend-puro vía `leerProgramaObra`** en lugar de extender el congelado `detalleContrato`. Menos
   superficie, no toca la zona congelada del backend y reutiliza la lectura ya probada del programa.
2. **Coexistencia A1/A2 con prioridad de la matriz** en el expediente: si el contrato tiene matriz A2 se
   muestra esa; si sólo tiene actividades A1 viejas, se muestra la tabla vieja. Así no se rompe ningún
   contrato legacy. **[validar profe]** si A1 (`contrato_actividades`) debe deprecarse del todo.
3. **Periodo "actual" por vista**: Registrados y Expediente resaltan el periodo que contiene **hoy**;
   la captura de estimación resalta el **periodo capturado** (`periodo-fin`). Si ninguno aplica, no se resalta.
4. **Sin IVA / sin recálculo**: el panel de HU-12 es informativo; la carátula viva y el motor del backend
   quedan intactos.

## 5. Pruebas

- **NUEVO** `frontend/e2e/plan2-programa-mes-por-mes.spec.js`: crea por API un contrato con programa A2 que
  cuadra al 100% y valida que la matriz aparece en las **3 vistas** (Registrados, Expediente HU-04 sin el
  aviso "no registrado", panel plegable de HU-12).
- **Compilación**: `vite build` ✅ (467 módulos).
- **Suite e2e completa**: ver resultado al pie de este doc / en el reporte de la sesión. Specs directamente
  relacionados (a2-programa-obra, hu-04, hu-12) **verdes**, sin regresión.

## 6. Runbook de integración (Maiki) — SIN migración

> Este pase **no cambia el esquema ni el backend**. No hay DDL, no hay que migrar la BD ni reiniciar
> `sigecop_backend`. Frontend con Vite HMR.

1. Integrar los archivos:
   - NUEVO `frontend/src/components/programa/MatrizProgramaLectura.jsx`
   - MOD `frontend/src/pages/AltaContrato.jsx`
   - MOD `frontend/src/pages/ConsultaExpediente.jsx`
   - MOD `frontend/src/pages/IntegracionEstimacion.jsx`
   - NUEVO `frontend/e2e/plan2-programa-mes-por-mes.spec.js`
2. Compilar: `cd frontend && npm run build` (debe pasar; es lo que valida el CI).
3. Suite local (stack arriba): `cd frontend && npx playwright test`.
4. **Smoke manual** (stack `docker compose up`):
   - Da de alta un contrato con catálogo + programa que cuadre al 100% (o usa uno existente con programa).
   - **Registrados → "Ver info del contrato"**: el modal muestra *"Programa de obra (mes por mes)"* con la matriz.
   - **Expediente (HU-04)**: selecciona ese contrato → el bloque *Programa de obra* muestra la matriz, **no**
     "no tiene programa de obra registrado".
   - **Captura de estimación (HU-12)**, como superintendente: selecciona el contrato → abre el panel
     *"Ver programa de obra (mes por mes)"* → se ve la matriz con el periodo capturado resaltado.
5. Deploy a Render: push de `main` (auto-deploy). No requiere paso de migración.

## 7. Pendientes / a confirmar con el profe

- **[validar profe]** ¿Se depreca `contrato_actividades` (A1, texto libre) del alta, dejando sólo la matriz A2?
  Hoy coexisten (A2 manda en la lectura).
- **[validar profe]** Confirmar que el programa **mes por mes** es la forma en que lo quiere ver en
  detalle/expediente (lo asumimos como default del plan).

## 8. Fuera de alcance de este pase (Plan 2, siguientes)

- Pase 2 (bitácora: quitar anular, fecha/hora, sustitución→nota — esta última `[validar profe]`).
- Pase 3 (validaciones: pago ≥ fecha de estimación → **decidido: contra `integrada_en`**; garantía anticipo
  auto; nombre/apellido).
- Pase 4 (visibilidad de alertas de atraso).
