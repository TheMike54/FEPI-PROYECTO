# Etapa A — Pantalla única de estimación (presentación)

**Base:** `origin/main = 069a71d`. **Local, sin commit/push.** Solo Maiki integra.
**Regla dura cumplida:** el **núcleo server-side de estimación (G1-G8, `integrarEstimacion`) NO se tocó** — verificado: `git diff backend/src/controllers/estimaciones.controller.js` = vacío. La UI **solo lee y muestra**; lo que faltaba exponer va por un **endpoint de SOLO LECTURA** nuevo.

---

## 1. Qué se construyó

Una **sola vista** (se eliminaron las pestañas) en `IntegracionEstimacion.jsx` con:

1. **Captura de volumen ejecutado** por concepto (los "números generadores"). *(ya existía; se conserva)*.
2. **Carátula viva** que recalcula al teclear, con el **mismo redondeo que el backend** (`r2`):
   - `bruto = Σ ROUND(vol × PU, 2)` · `(−) amortización = ROUND(bruto × %ant/100, 2)` **(art. 138 RLOPSRM)** · `(−) 5 al millar = ROUND(bruto × 0.005, 2)` **(art. 191 LFD)** · `(=) neto`.
   - Etiquetas en español + **badge/tooltip del artículo** (`ⓘ art. 138 RLOPSRM`, `ⓘ art. 191 LFD`) con la fórmula en el `title`.
   - **Renglón "(−) Retención por atraso" PREVISTO pero en $0** (badge "próxima etapa"; Etapa C — falta el % del profe, art. 138/139 RLOPSRM `[validar]`). No se calcula aquí.
3. **Semáforo de plan inline** por concepto: columnas **Planeado / Ya estimado / Disp. periodo**. Si el volumen excede lo **planeado hasta el periodo**, marca la fila/celda en rojo, muestra el aviso `semaforo-plan-exceso` y **deshabilita "Confirmar"**. Solo **ADELANTA** la validación del servidor (A2/art. 45-A-X+52 + art. 118); **el servidor sigue validando al integrar** (no se quitó ninguna validación; el candado duro de art. 118 también se conserva).
4. **Columnas acumulado / por estimar** (estilo carátula real, sin IVA): importe del contrato · estimado acumulado anterior · esta estimación · estimado acumulado · **saldo por estimar**.
5. **Barras de avance** físico-financiero (ejecutado/estimado acumulado, vivo) vs **programado** (curva S del programa hasta el periodo).

**Ejemplo guía (cuadra exacto):** C-001 `PU=200`, `anticipo=30%`, `vol=400` → bruto 80,000 − amort 24,000 − 5 al millar 400 = **neto $55,600**.

---

## 2. Endpoint de SOLO LECTURA nuevo (sin tocar el núcleo)

`GET /api/estimacion-prep/contrato/:contratoId?periodo_fin=AAAA-MM-DD` — **controller y route NUEVOS** (`estimacion-prep.controller.js` / `.routes.js`), montados en `server.js` (único toque permitido de zona congelada). Acotado por participación (`esParteOSupervision`). Reusa **las MISMAS consultas que el POST** para que el "disponible este periodo" del semáforo coincida EXACTO con lo que el server validará:
- `ya_estimado` = Σ `cantidad_periodo` de estimaciones no rechazadas (= `acumulado_anterior`).
- `planeado_hasta_periodo` = Σ `programa_obra` con `cp.fin <= periodo_fin` (espejo del chequeo 6c/A2); `null` sin programa.
- `disponible_periodo` = `(tiene_programa ? min(planeado, contratado) : contratado) − ya_estimado`.
- `avance` = físico (Σ ya_estimado×PU / monto) y programado (Σ planeado×PU / monto).

> No se persiste nada; no muta la estimación inmutable. El núcleo (`integrarEstimacion`) sigue siendo la única fuente de verdad del neto.

---

## 3. Archivos tocados

| Archivo | Tipo | Cambio |
|---|---|---|
| `backend/src/controllers/estimacion-prep.controller.js` | **nuevo** | endpoint read-only (plan/saldos/avance) |
| `backend/src/routes/estimacion-prep.routes.js` | **nuevo** | ruta `GET /contrato/:id` (authMiddleware) |
| `backend/server.js` | mod (+2) | montaje `app.use('/api/estimacion-prep', …)` |
| `frontend/src/services/api.js` | mod (+3) | `api.preparacionEstimacion(contratoId, periodoFin)` |
| `frontend/src/pages/IntegracionEstimacion.jsx` | mod | pestañas → vista única; semáforo de plan; saldos; barras; renglón $0 atraso; redondeo espejo `r2` |
| `frontend/e2e/estimacion-pantalla-unica.spec.js` | **nuevo** | 2 specs de UI (ver §4) |
| `backend/src/controllers/estimaciones.controller.js` | **INTACTO** | núcleo G1-G8 sin cambios |

*(Nota menor: quedaron sin uso `import Tabs` y la función `TabPlaceholder` en `IntegracionEstimacion.jsx`; no rompen el build. Limpieza trivial opcional.)*

---

## 4. Pruebas

- **Suite completa: 165 passed · 8 skipped · 0 failed** (baseline 163 + 2 nuevos). Sin regresión.
- **Specs de estimación existentes VERDES:** `hu-12-integracion-estimacion` (estructural + acceso por rol; el `test.fixme` de inputs deshabilitados sigue skip, no se reactivó), `hu-13`, `hu-21`, est-pago.
- **Specs de UI nuevos** (`estimacion-pantalla-unica.spec.js`, login real):
  1. **Carátula viva + ejemplo guía:** vol=400 → neto `$55,600` y bruto `$80,000`; recalcula al teclear (vol=200 → `$27,800`).
  2. **Semáforo de plan:** con el periodo acotado a P1 (planeado 400), vol=400 OK (Confirmar habilitado); vol=500 (> planeado 400, < contratado 1000) → `semaforo-plan-exceso` visible + **Confirmar deshabilitado** — prueba el PLAN, no el art. 118.
- **Verificación de la fórmula** (espejo del server): la carátula viva usa `r2` (ROUND a 2) igual que `integrarEstimacion`; el neto del preview = el neto oficial.

---

## 5. Runbook (Maiki)

> **No hay cambio de esquema** (el endpoint es solo lectura sobre tablas existentes). No requiere migración.

1. Integrar el patch / la rama local en `main`.
2. **Reiniciar backend** (no auto-recarga): `docker restart sigecop_backend`. (En Render: deploy normal; el router nuevo se monta al arrancar.)
3. **Frontend**: build normal (Vite). Verificar `GET /api/estimacion-prep/contrato/:id` responde 401 sin token / 200 al participante.
4. **Smoke en Render** (lo pediste): como superintendente, abrir un contrato con programa → capturar **400 en C-001 (PU 200, anticipo 30%)** → la carátula muestra **neto $55,600**; capturar **500** sobre un periodo cuyo planeado sea menor → el semáforo marca rojo y **Confirmar** se deshabilita; al intentar por API igual, el server sigue validando (art. 118 / A2).
5. **Compatibilidad:** el endpoint es aditivo; el código viejo no lo usa. `integrarEstimacion` no cambió → las estimaciones ya integradas y su carátula inmutable no se afectan.

**Rollback:** quitar el `app.use('/api/estimacion-prep', …)` y los 2 archivos nuevos + revertir `IntegracionEstimacion.jsx`/`api.js`. El núcleo no se tocó, así que no hay riesgo en el cálculo.

---

## 6. Pendiente (Etapa C, post-reunión profe)
- **Retención por atraso**: el renglón ya está PREVISTO en $0; falta el **%** y la **regla de disparo** (art. 138/139 RLOPSRM `[validar]`) — es lógica **server-side nueva**, no se construye hasta tener el dato.
- **Definición fina físico vs financiero**: hoy estimado ≈ ejecutado (la estimación formaliza lo ejecutado, sin IVA); la separación exacta (obra ejecutada aún no estimada/pagada) se afina con el profe `[validar]`.

**Entregables:** este doc + `docs/ETAPA_A_pantalla_unica_estimacion.patch` + runbook (§5). `main` intacto, sin push.
