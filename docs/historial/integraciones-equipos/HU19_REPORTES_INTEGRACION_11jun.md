# Integración HU-19 — Exportación de los 7 reportes del contrato (11-jun-2026)

**Rama:** `integracion-hu19` (sobre `integracion-hu15`). **PR de origen:** `origin/feat/e3-hu-19` (Equipo 3).
**Estado:** integrado en local, **SIN push**. **DDL:** **ninguno**. **Backend:** **no se toca** (client-side puro).

HU-19 exporta los 7 reportes definidos del contrato (PDF con jsPDF, Excel con exceljs vía
`excelExport.js`), cableados a datos REALES por endpoint. Toda la generación corre en el **cliente**.

---

## 1. Rebase / punto de ramificación (lo que obligó a reconciliar)

`feat/e3-hu-19` ramificó en **`f57636a` (O2: plan de amortización)** — es decir **ANTES** de O7, de la
integración de HU-15 y de O8. Por eso el PR asumía el ciclo de estimación **viejo** (estados crudos del
esquema en los reportes, columna "Enviada", sin la pena por atraso de Etapa C). Hubo que **reconciliar al
flujo final** (el mismo de `data/estadoEstimacion.js`):

| Estado (esquema) | Etiqueta final | Acto |
|---|---|---|
| `integrada`  | **Integrada**  | el contratista integra (HU-12) |
| `enviada`    | **Presentada** | el contratista presenta (HU-13, art. 54 LOPSRM) |
| `autorizada` | **Autorizada** | la residencia autoriza tras turnado de supervisión (HU-15) |
| `rechazada`  | **Rechazada**  | la residencia rechaza (HU-15) |
| `pagada`     | **Pagada**     | finanzas paga (HU-21) |

**Merge:** limpio, **0 conflictos** (la línea `integracion-hu15` nunca tocó esos 3 archivos; merge-base
real = `f57636a`, así que git tomó la versión del PR de los 3 archivos sin colisión).

## 2. Zona congelada — NO se toca

El PR + la reconciliación cambian **solo 3 archivos frontend**:

- `frontend/src/services/reportesContrato.js` (servicio nuevo, generadores)
- `frontend/src/pages/ExportacionReportes.jsx` (página)
- `frontend/e2e/hu-19-reportes.spec.js` (spec)

**Cero** `schema.sql` / `server.js` / `permisos.js` / `App.jsx` / `estimaciones.controller.js` / G1–G8.
Verificado con `git diff --name-only` sobre el merge + la reconciliación.

## 3. Cuadre numérico (verificado, no recalcula la carátula)

- **Carátula (subtotal, amortización, retención, deductivas, neto):** los reportes **vuelcan tal cual** los
  valores que el server persiste en `estimaciones` (vía `historialEstimaciones`). **No se recalcula** la
  fórmula `Σ ROUND(cant×pu)` ni la carátula. ✔
- **Curva S financiero:** `curvaS()` replica **fielmente** `CurvaAvance.financieroMap`:
  `financiero = Σ pagos.importe (fecha_pago ≤ corte) ÷ monto × 100`, con `corte = min(fin, hoy)`, futuros = `null`.
  Misma fuente (`api.listarPagos`), mismo `hoyISO()`. Única diferencia: `toFixed(2)` (display), no de fórmula. ✔
- **Pena por atraso (Etapa C, art. 138/139 RLOPSRM):** el endpoint del historial **NO expone**
  `retencion_atraso`. Se **DERIVA por la identidad EXACTA** de la carátula que arma el server:

  ```
  neto = subtotal − amortización − retención(5 al millar) − deductivas − retencion_atraso
   ⟹ retencion_atraso = subtotal − amortización − retención − deductivas − neto
  ```

  Validado contra datos reales de la BD: en estimaciones con `retencion_atraso = 4000.00`, la derivada da
  `4000.00` (cuadre **OK** al centavo). Así **las columnas de la carátula CUADRAN al neto** en R2/R3/R7,
  sin tocar backend.

## 4. Cambios de reconciliación aplicados (sobre el PR)

Todos verificados antes de aplicar con un panel adversarial (5 afirmaciones, alta confianza + crítico de
completitud). Lecciones 7 (re-etiquetado) y cuadre:

| # | Archivo:dónde | Antes | Después |
|---|---|---|---|
| 1 | `reportesContrato.js` import | (sin util) | `import { labelEstadoEstimacion }` |
| 2 | R2/R3/R7 columna **Estado** | `e.estado` crudo (`enviada`) | `labelEstadoEstimacion(e.estado)` (**Presentada**) |
| 3 | R3 sellos | "Enviada en/por" | **"Presentada en/por"** (col. esquema `enviada_*` = presentación HU-13) |
| 4 | R7 | "Retencion (pena por atraso)" = `e.retencion` | **mislabel corregido**: `e.retencion` = **5 al millar fiscal (art. 191 LFD)**; + columna nueva **"Retencion por atraso (art.138/139 RLOPSRM)"** = derivada |
| 5 | R2/R3 | (faltaba la pena) | columna **"Retencion por atraso"** derivada → la carátula cuadra al neto |
| 6 | R2 resumen | "Σ Neto **autorizado** (no rechazadas)" | "Σ Neto de estimaciones no rechazadas" (no sobre-reclama: el gate de pago es permisivo) |
| 7 | R7 comentario | "art. 138/139 **LOPSRM**" | "art. 138/139 **RLOPSRM**" (sweep 143→138 ya estaba; no hay rastro de 143) |
| 8 | R4 badge/descr. | "depende de HU-15" | "falta GET de observaciones a **nivel contrato**" (HU-15 ya integrado; las expone por estimación) |
| 9 | spec comentario | "SheetJS para Excel" | "exceljs vía excelExport.js" |

## 5. Pendientes (claros, NO rotos) — para Maiki / profe

- **R4 Observaciones — DESHABILITADO (correcto).** HU-15 expone observaciones **solo por estimación**
  (`GET /estimaciones-ciclo/estimacion/:id/revision`). **No existe** un GET a nivel contrato. El reporte
  queda `disponible:false` con badge. *Opción futura:* construirlo client-side haciendo fan-out de
  `revisionEstimacion(id)` por cada estimación (nueva feature, fuera de este PR).
- **R7 — fundamento legal de la pena por atraso (art. 138/139 RLOPSRM): `[validar profe]`** — Nivel 1, no
  lo decide Code. El **número** sí cuadra (derivado exacto); lo pendiente es la **confirmación legal**.
  *Mejora opcional (1 línea backend, E3, NO congelado):* exponer `e.retencion_atraso` en el SELECT de
  `historialEstimaciones` para leerlo directo en vez de derivarlo.
- **Ancla de periodo (Mensual/Trimestral/Acumulado): `[validar profe]`** — el período recorta el RANGO de
  fechas anclado al "dato más reciente del conjunto". Es etiqueta, no altera el contenido (CA-2). La regla
  de anclaje (último mes / último trimestre) está marcada como pendiente en el código y la UI.
- **R2 comprometido/disponible presupuestal:** depende de **HU-20** (`presupuesto_anual`); el resumen lo
  marca "PENDIENTE". Sin cambio aquí.

## 6. Pruebas

- **`vite build` (gate de CI):** ✔ 477 módulos, build limpio.
- **`hu-19-reportes.spec.js`:** **8/8 verde** contra backend vivo (antes y después de la reconciliación).
- **Suite completa:** **258 passed, 8 skipped, 0 fallos** (~7.8 min, login real, stack local).
- **Cuadre derivada vs BD real:** `retencion_atraso == subtotal−amort−ret−deduct−neto` → **OK** al centavo.

> Node 24 + Playwright 1.60 corren sin problema en local (E3 probablemente no pudo levantar el stack).

## 7. Runbook de despliegue (Maiki)

**NO hay DDL ni cambio de backend** → no hay migración. Despliegue estándar de frontend:

1. (Cuando Maiki decida) `git push` de `integracion-hu19` → PR a `main`, o fast-forward del flujo de
   integración habitual.
2. Render auto-deploy desde `main` reconstruye el frontend (`vite build`). **No** se toca el backend ni la BD.
3. Smoke post-deploy: abrir **/reportes**, elegir un contrato sembrado, exportar R1 (PDF) y R7 (Excel) y
   verificar que la columna **"Retencion por atraso"** sale y que **Estado** dice "Presentada"/"Autorizada".

**Sin** backup de BD, **sin** `psql`, **sin** ventana de migración. Estado actual: **local, sin push.**
