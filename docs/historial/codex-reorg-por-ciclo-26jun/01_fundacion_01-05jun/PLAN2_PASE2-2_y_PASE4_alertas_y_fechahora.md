# Plan Maestro 2 — Pase 2.2 (fecha+hora en notas) + Pase 4 (visibilidad de alertas de atraso)

**Autor:** Maiki (TheMike54) · **Fecha:** 2026-06-05 · **Base:** `main` @ `97113d6` (Plan2 Pase 3 integrado)
**Estado:** HECHO en LOCAL. **Sin commit / sin push.**
**Pruebas:** suite e2e completa **189 passed · 8 skipped (`test.fixme` conocidos) · 0 failed** · `vite build` OK.

> Ambos cambios son **frontend-puro / presentación-lectura**. NO se tocó: inmutabilidad de bitácora/firmas (triggers), G1–G8 / cuadre al centavo, gating del alta, la **lógica de evaluación de alertas** (server) ni los **permisos** (permisos.js / guardas). **Cero archivos de la zona congelada.** NO se hizo 2.1 (anular) ni 2.3 (sustitución) — esperan al profe.

---

## A) Pase 2.2 — Fecha Y HORA de creación en cada nota de bitácora

**Qué:** la UI mostraba solo el día (recortaba el timestamp con `soloFecha()` = `slice(0,10)`). Ahora cada **nota de bitácora** muestra **fecha y hora**. La columna `bitacora_notas.fecha` ya es `TIMESTAMPTZ` (la hora siempre viajó del backend), así que es **solo display**.

**Formato:** se reutiliza el helper ya existente en la app para timestamps — `new Date(s).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })` → p. ej. `5/06/26, 18:42`. Es **el mismo formato que ya usan las firmas** (`firmado_en`) en la bitácora, por coherencia visual. (Decisión: consistencia con el resto de la app por encima de un formato literal dd/mm/aaaa; cambiar a formato explícito sería un ajuste menor si el profe lo pide.)

**Dónde (4 puntos de display de notas REALES, 3 archivos):**
| Archivo | Línea | Cambio |
|---|---|---|
| `frontend/src/pages/EmisionNotas.jsx` (HU-09) | ~192 | `soloFecha(n.fecha)` → `fechaHora(n.fecha)` + `data-testid="nota-fecha-${n.numero}"`. Se eliminó `soloFecha` (quedó sin uso). |
| `frontend/src/components/notas/BuscadorNotas.jsx` (HU-10/HU-12) | ~223 | columna Fecha → `fechaHora(n.fecha)` + `data-testid="bn-fecha-${n.numero}"`. Se **agregó** un `fechaHora` local. |
| `frontend/src/pages/IntegracionEstimacion.jsx` (HU-12) | ~212, ~441 | fecha de notas vinculadas → `fechaHora(n.fecha)`. Se **agregó** un `fechaHora` local. |

**Lo que NO se tocó (a propósito):**
- **`BuscadorNotas.jsx` filtro por rango (L78-80):** sigue usando `soloFecha` para comparar contra los `<input type=date>` (yyyy-mm-dd). Meter hora ahí rompería el filtrado.
- **`IntegracionEstimacion.jsx` `fechaMX`:** se reusa para fechas tipo `DATE` (periodos, `integrada_en`) que no llevan hora; se dejó intacta y se añadió un helper aparte solo para notas.
- `AperturaBitacora.jsx` / `ConsultaExpediente.jsx`: su `soloFecha` aplica a columnas `DATE` (no notas). `RevisionEstimacion.jsx`: datos dummy. El export Excel de `ConsultaNotas.jsx` se dejó como fecha-día (la tarea es la UI de las notas).

---

## B) Pase 4 — Visibilidad de alertas de atraso en el detalle del contrato

**Qué:** en el **modal de detalle** del contrato (Registrados) se agregó un **indicador de alertas de atraso** (“N conceptos en atraso”) + **acceso directo** a la lista de alertas del contrato. Así **residente y supervisión** las ven sin entrar a buscarlas. Es **solo presentación/lectura**: consume el endpoint existente `api.alertasDeContrato`; no cambia la evaluación server ni los permisos.

**Dónde:**
- `frontend/src/pages/AltaContrato.jsx` → `ModalDetalleContrato` (+ import de `Link`):
  - Lee las alertas en el `useEffect` de carga del modal (junto a `detalleContrato`/`leerProgramaObra`).
  - **Conteo** “en atraso” = `alertas.filter(a => a.disparada).length` (misma fórmula que la vista HU-07).
  - **Render** tras “Datos generales”: badge ámbar `⚠ N concepto(s) en atraso` (testid `detalle-alertas-atraso`) o verde `✓ Sin conceptos en atraso` (testid `detalle-alertas-ok`), más un `Link` a `/seguimiento/alertas?contrato=ID` (testid `detalle-link-alertas`). Contenedor `detalle-alertas`.
- `frontend/src/pages/AlertasAtraso.jsx` (HU-07): lee `?contrato=ID` con `useSearchParams` y **preselecciona** ese contrato en cuanto carga la lista (mientras el usuario no elija otro). Así el link es realmente “acceso directo a la lista del contrato”.

**Doble candado de visibilidad (no se cambian permisos, solo se leen):**
1. **Rol:** `useVistaHU('HU-07').sinAcceso` — el indicador solo se renderiza para roles con acceso a HU-07 (**residente = E, supervisión = C**). Para contratista/dependencia/finanzas no se renderiza nada (ni se llama al endpoint).
2. **Participación:** el backend (`alertas.controller.js`) responde **403** a quien no es parte del contrato; el `try/catch` deja el indicador **oculto** (nunca inventa alertas).

> Matriz relevante: HU-01 da acceso al modal a residente/contratista/supervisión/dependencia; HU-07 solo a residente/supervisión. Por eso **contratista** puede abrir el detalle pero **no** ve el indicador — es el caso “sin acceso” de la prueba.

**Lo que NO se tocó:** `alertas.controller.js` (lógica de `disparada`), `alertas.routes.js`, `permisos.js`, guardas de `App.jsx`. El wizard de alta (`validarPaso`/gating) está en otro componente; el cambio vive solo en `ModalDetalleContrato`.

---

## C) Pruebas

**Specs nuevos**
- `frontend/e2e/nota-fecha-hora.spec.js`: siembra por API (contrato + apertura + 3 firmas + nota emitida), abre HU-09 (`/bitacora/notas`), despliega “Ver bitácora” y verifica que `nota-fecha-2` contiene **fecha** (`dd/mm/aa`) **y hora** (`HH:MM`).
- `frontend/e2e/detalle-indicador-atraso.spec.js` (4 casos):
  - **residente (con acceso):** ve `1 concepto en atraso` + link con `href=/seguimiento/alertas?contrato=ID`.
  - **supervisión (con acceso):** ve el indicador.
  - **contratista (sin acceso HU-07):** abre el detalle pero `detalle-alertas` y `detalle-link-alertas` están ausentes (count 0).
  - **acceso directo:** el link preselecciona el contrato (`select-contrato` con value = ID) y muestra `lista-disparadas`.

**Siembra de la alerta disparada:** una alerta “disparada” exige avance físico (`concepto_avance`), que **no tiene endpoint** (HU-06). Se crea el contrato + la alerta por API y el avance se inserta por **SQL** (`docker exec ... psql`, patrón de `hu-14`): `INSERT INTO concepto_avance (contrato_concepto_id, cantidad) VALUES (ccid, 10)` → 10% < umbral 80% ⇒ `disparada`. `afterAll` limpia best-effort esas filas.

**Resultado:** `npx playwright test` → **189 passed · 8 skipped · 0 failed** (los 8 son `test.fixme` conocidos de HU-12/HU-21). `vite build` OK.

---

## D) Runbook (local; sin deploy)

**Sin cambio de esquema ni de backend** → no hay migración ni reinicio de `sigecop_backend`. Todo es frontend (Vite HMR) + tests.

```powershell
# 1) Stack local (Docker engine arriba)
docker compose up -d            # db (5432), backend (4000), frontend (5173)

# 2) Suite e2e (desde frontend/, con el stack arriba)
cd frontend
npx playwright test                                              # suite completa
npx playwright test e2e/nota-fecha-hora.spec.js e2e/detalle-indicador-atraso.spec.js   # solo este pase

# 3) Gate de CI
npm run build                                                    # vite build (los e2e NO corren en CI)
```

> El spec de Pase 4 usa `docker exec -i sigecop_db psql` para sembrar `concepto_avance` (no hay endpoint HU-06). Requiere el contenedor `sigecop_db` arriba (igual que `hu-14`).

**Si más adelante se despliega** (lo coordina Maiki, NO ahora): no hay migración ni cambio de backend; basta `push` a `main` (auto-deploy Render). Verificar smoke de bitácora y del detalle de contrato tras desplegar.

---

## E) Archivos tocados

| Archivo | Pase | Cambio |
|---|---|---|
| `frontend/src/pages/EmisionNotas.jsx` | 2.2 | nota muestra fecha+hora (+testid); quita `soloFecha` sin uso |
| `frontend/src/components/notas/BuscadorNotas.jsx` | 2.2 | display fecha+hora (+testid); filtro intacto |
| `frontend/src/pages/IntegracionEstimacion.jsx` | 2.2 | notas vinculadas con fecha+hora; `fechaMX` intacta |
| `frontend/src/pages/AltaContrato.jsx` | 4 | `ModalDetalleContrato`: indicador de atraso + link; import `Link` |
| `frontend/src/pages/AlertasAtraso.jsx` | 4 | preselección de contrato vía `?contrato=` |
| `frontend/e2e/nota-fecha-hora.spec.js` | 2.2 | spec nuevo |
| `frontend/e2e/detalle-indicador-atraso.spec.js` | 4 | spec nuevo |

Parche completo: `docs/PLAN2_PASE2-2_y_PASE4_alertas_y_fechahora.patch`.
