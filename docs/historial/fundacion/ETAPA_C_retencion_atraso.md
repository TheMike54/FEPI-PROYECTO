# Etapa C — Retención por atraso + avance físico/financiero

**Base:** `origin/main = 6b51b37`. **Local, sin commit/push.** Construido con los defaults de Maiki; los `[validar]` los confirma el profe.
**Ley:** penas convencionales por atraso — **art. 138/139 RLOPSRM**. El % es **contractual** (pactado por contrato, no fijo).

---

## Defaults construidos (y qué queda `[validar]`)
- `pena_convencional_pct`: **campo del contrato, nullable** (NULL → retención por atraso = $0).
- **Disparo:** atraso **GLOBAL** del contrato — `ejecutado_acumulado < programado_acumulado` a la fecha del periodo, medido **en valor** (Σ cant×PU). `[validar: ¿por concepto o global?]`
- **Retención** = `pena_pct × importe_bruto` de la estimación. `[validar: ¿sobre bruto o neto? ¿se recupera en periodos siguientes?]` → hoy: sobre **bruto**, **por estimación**, **sin recuperación**.
- Decisiones de implementación (marcadas `[validar]`): el ejecutado **incluye** la estimación que se integra; sin programa → atraso no medible → $0; **financiero = pagado/monto** (físico = ejecutado/monto).

---

## Las 6 piezas

1. **`schema.sql`** (aditivo, idempotente): `contratos.pena_convencional_pct NUMERIC(5,4)` (CHECK 0–1 ó NULL); `estimaciones.retencion_atraso NUMERIC(14,2) DEFAULT 0` (CHECK ≥0), `avance_fisico_pct`, `avance_financiero_pct NUMERIC(7,4)`.
2. **Alta** (`AltaContrato.jsx` + `contratos.controller.js`): campo **opcional** "% de pena por atraso" en datos generales (fracción 0–1). Vacío → NULL. Validación server 0–1. **No toca el gating ni la regla del 100%.**
3. **`estimaciones.controller.js` (núcleo, EXTENDIDO — G1-G8 intactos):** lee `pena_convencional_pct`; mide el **atraso global** (`ejec_prev + esta estimación < programado`, en valor) y el **pagado acumulado**; el cálculo del neto suma un renglón: `retencion_atraso = ROUND(pena × bruto, 2)` (solo si pena≠NULL Y hay programa Y atraso). `neto = bruto − amortización − 5_al_millar − deductivas − retencion_atraso`. Guarda `retencion_atraso`, `avance_fisico_pct`, `avance_financiero_pct`. **No se tocó ninguna validación G1-G8** (art. 54, 118, 6c plan, no-solape, etc.): solo se restó un renglón más y se añadieron columnas al INSERT/RETURNING.
4. **`IntegracionEstimacion.jsx`:** el renglón "(−) Retención por atraso" (placeholder $0 de Etapa A) ahora muestra el **valor real vivo** (badge "atraso" cuando aplica); si `pena_pct` es NULL o no hay atraso → $0. Barras conectadas: físico (ejecutado), programado (curva S), **financiero (pagado)**.
5. **`estimacion-prep.controller.js` (read-only):** expone `pena_convencional_pct`, `planeado_valor`/`fisico_ejecutado` (para medir el atraso vivo), `pagado_acumulado`/`financiero_pct` → la carátula viva muestra la retención correcta **antes de confirmar**.
6. **Avance físico/financiero** (server, en `integrarEstimacion`): `avance_fisico_pct = ejecutado_valor/monto`, `avance_financiero_pct = pagado_acumulado/monto`, **snapshot** guardado en la estimación; mostrados en las barras.

---

## Ejemplo guía (cuadra EXACTO)
C-001 `400 m² × $200`, anticipo 30%, **pena 0.05**, con atraso (ejecutado 80,000 < programado 160,000):
`bruto 80,000 − amortización 24,000 − 5 al millar 400 − retención atraso 4,000 = **neto $51,600**`.
Sin pena (NULL): retención atraso $0 → neto $55,600 (Etapa A).

---

## Pruebas (entorno completo, BD provisionada)
- **Suite completa: 176 passed · 8 skipped · 0 failed** (baseline 6b51b37 = 173 + 3 nuevos). Sin regresión.
- **`estimacion-retencion-atraso.spec.js` (3):**
  1. carátula viva: pena 5% + atraso → retención **$4,000** (badge "atraso") + **neto $51,600**.
  2. sin pena (NULL) → retención por atraso **$0** (sin badge) + neto $55,600.
  3. **server (integrar):** guarda `retencion_atraso=4000`, `neto=51600`, `avance_fisico_pct≈40`, `avance_financiero_pct=0`.
- Specs de estimación existentes (Etapa A, hu-12/13/21) **verdes**: el cálculo base no cambió.

---

## Archivos tocados (6 + 1 spec)
backend: `db/schema.sql`, `controllers/{contratos,estimaciones,estimacion-prep}.controller.js` · frontend: `pages/{AltaContrato,IntegracionEstimacion}.jsx` · test: `e2e/estimacion-retencion-atraso.spec.js` (nuevo).
**Zona congelada:** intacta (auth/usuarios/acceso/permisos/App/server.js sin cambios). **G1-G8:** solo extendidos en el neto.

---

## Runbook (Maiki)
1. **Migración ADITIVA** (3 columnas nullable/default en `estimaciones`, 1 en `contratos`). Sin pérdida de datos; estimaciones previas → `retencion_atraso=0`, avances NULL. Aplicar:
   ```bash
   docker exec -i sigecop_db psql -U sigecop -d sigecop_db -v ON_ERROR_STOP=1 --single-transaction < backend/src/db/schema.sql
   ```
   (Render: por el arranque del backend / runbook habitual.)
2. **Reiniciar backend:** `docker restart sigecop_backend`. **Frontend:** build Vite normal.
3. **Verificar:** columnas `contratos.pena_convencional_pct`, `estimaciones.{retencion_atraso,avance_fisico_pct,avance_financiero_pct}` existen.
4. **Smoke en Render:** crear contrato con **% pena = 0.05** + programa; como superintendente estimar 400 con atraso → la carátula muestra **−$4,000** y **neto $51,600**; integrar → la estimación guarda `retencion_atraso=4000` y los avances. Un contrato **sin** pena → renglón en **$0**.
5. **Rollback:** todo es aditivo/extensión; revertir los 6 archivos no afecta datos (las columnas nuevas quedan sin uso).

**Entregables:** este doc + `docs/ETAPA_C_retencion_atraso.patch` + runbook. **NO push** — tú integras.

## Pendiente (a confirmar con el profe)
Los `[validar]`: tasa(s) de pena, disparo global vs por concepto, retención sobre bruto vs neto, recuperación en periodos siguientes, definición fina físico vs financiero. La estructura ya soporta cambiar la **regla de disparo** y el **% por contrato** sin reescribir el cálculo.
