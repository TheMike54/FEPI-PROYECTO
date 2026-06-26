# B4 — Más cantidad de un concepto existente: implementación (24-jun)

> Variante **B** + datos **Opción 1** (fila adicional con clave derivada que hereda P.U.). Backup previo:
> `scratchpad/backup_pre_B4_24jun.sql`. **LOCAL, sin push.** El **diff de `convenios.controller.js` (congelado)
> está PENDIENTE de tu OK** — no aplicado.

## 1. Frontend (Variante B) — HECHO, build verde

| Archivo | Cambio |
|---|---|
| `frontend/src/components/convenios/EditorProgramaConvenio.jsx` | Botón **«+ Ampliar»** en cada concepto original; fila de ampliación **bloqueada** (clave/concepto/unidad/cantidad/celdas) con **P.U. candado 🔒 + chip «art. 59 LOPSRM»**; **total del concepto** (original + ampliación) en el renglón del original; ✕ para quitar la ampliación. |
| `frontend/src/pages/ConveniosModificatorios.jsx` | Estado + handlers del panel (`abrirAmpliar`/`confirmarAmpliar`); **modal «Ampliar»** con cajas *Original / +Extra / Total nuevo*, cantidad extra, P.U. heredado bloqueado, selector de periodo, importe; al confirmar agrega una fila `amplia_a` con **clave derivada `CONC-01-A`** que hereda el P.U.; envía `amplia_a` en el payload. |

**Cómo modela los datos (Opción 1):** la ampliación es un `contrato_concepto` **nuevo** `es_adicional=true`, clave derivada
`<original>-A/-B/…`, que **hereda concepto/unidad/P.U. del original** (P.U. no se teclea). El volumen extra se coloca
en un periodo (cuadre 100%). El vínculo con el original es por **convención de clave** (`-A`) — **sin tocar schema**.

**Importante:** la feature **funciona con el frontend solo** — la fila con clave derivada es una clave nueva, y el
backend ya la inserta como `es_adicional`. **El cambio al controller es solo para ENFORZAR server-side** que la
ampliación herede el P.U. (defensa en profundidad del art. 59; hoy un POST por API podría mandar otro P.U.).

## 2. Diff propuesto de `convenios.controller.js` (CONGELADO — espera tu OK)

Único cambio: dentro de `crearConvenio`, en la rama de **concepto nuevo** (`else`, ~línea 236), antes del INSERT.
**100% aditivo**: los conceptos sin `amplia_a` se comportan EXACTAMENTE igual que hoy.

```diff
           } else {
+            // B4 (Opción 1): si es una AMPLIACIÓN (amplia_a), el P.U. se HEREDA del original (art. 59 LOPSRM:
+            // las cantidades adicionales se pagan al precio unitario pactado). Se valida SERVER-SIDE que el
+            // P.U. coincida con el del concepto original; no se teclea libre.
+            if (c.amplia_a != null) {
+              const base = datosPorClave.get(String(c.amplia_a));
+              if (!base) { await client.query('ROLLBACK'); return res.status(400).json({ error: `La ampliación "${c.clave}" referencia un concepto original inexistente ("${c.amplia_a}")` }); }
+              if (Math.abs(Number(c.pu) - base.pu) > 1e-4) { await client.query('ROLLBACK'); return res.status(400).json({ error: `La ampliación de "${c.amplia_a}" debe heredar su P.U. (${base.pu}): las cantidades adicionales se pagan al precio unitario pactado (art. 59 LOPSRM).` }); }
+            }
             // Concepto NUEVO = ADICIONAL: se INSERTA etiquetado es_adicional=true (se estima/paga aparte).
             maxOrden += 1;
             const ins = await client.query('INSERT INTO contrato_conceptos (contrato_id, orden, concepto, unidad, cantidad, pu, clave, es_adicional) VALUES ($1,$2,$3,$4,$5::numeric(14,3),$6::numeric(16,4),$7,true) RETURNING id',
               [contratoId, maxOrden, c.concepto ?? '', c.unidad ?? '', c.cantidad, c.pu, c.clave]);
             idPorClave.set(String(c.clave), ins.rows[0].id);
             clavesAdicionales.add(String(c.clave));
           }
```

- **Qué quita:** nada.
- **Qué agrega:** 6 líneas (un `if (c.amplia_a != null)` con 2 validaciones: original existe + P.U. heredado).
- **Riesgo:** bajo. No cambia el flujo de los conceptos normales/adicionales sin `amplia_a`. No toca schema.
- **Por qué en zona congelada:** es el único punto donde el P.U. de la ampliación se puede enforzar como fuente de
  verdad (CLAUDE.md: «cálculos sensibles server-side»). El frontend ya bloquea el P.U.; esto cierra el bypass por API.

## 3. Qué pasa con estimaciones/pagos/avance del concepto ampliado (Opción 1)

Verificado por lectura de código (la verificación en vivo se hará al aplicar el backend):

- **Estimar el extra:** ✅ la ampliación es un `contrato_concepto` (es_adicional) → aparece como **generador** en
  `estimacion-prep` (mismo camino que cualquier adicional, ya con badge «Adicional» de B5). El contratista lo estima.
- **Pagar el extra:** ✅ fluye estimación → pago como cualquier concepto (su importe entra al neto de la estimación).
- **art. 118 (acumulado ≤ contratado):** se evalúa **por concepto**. La ampliación tiene su propio tope = volumen
  extra; el original conserva su tope = cantidad original. **Tope combinado del concepto = original + extra** → el
  volumen extra ya es facturable (que es el objetivo). «art. 118 usa la cantidad nueva» se cumple en el sentido de
  que el extra abre tope adicional; no reescribe el tope del original.
- **% de avance:** ⚠️ **caveat de la Opción 1** (lo anticipé en el modelado). Como son **dos renglones**
  (`CONC-01` + `CONC-01-A`), las vistas post-guardado (curva, trabajos) muestran **dos % separados**, no un único %
  combinado. El **editor del convenio (panel B4) sí muestra el total** (original + ampliación) al capturar. Si quieres
  que la **curva/trabajos** muestren un **% único contra el total** (agrupando `CONC-01` con `CONC-01-A`), es un
  **follow-on de presentación** (agrupar por clave base) — dime si lo quieres y lo hago aparte. Es el trade-off que
  aceptaste al elegir Opción 1 (vs Opción 2 = un solo renglón con % único, pero relajando la inmutabilidad del original).

## 4. Cómo probarlo en pantalla (tras aplicar el backend)

- **Cuenta:** `dependencia@sigecop.test` o `residente@sigecop.test` (`Sigecop2026!`) — son quienes promueven convenios.
- **Contrato:** **mejor uno SIN convenio aún** para ver el flujo limpio — p. ej. **SOP-2026-002** (no SOP-2026-001,
  que ya tiene v1/v2 del seed A3). Fíjalo como contrato activo.
- **Pasos:** HU-03 Convenios → tipo **«Monto»** → se carga el editor con el catálogo vigente → en un concepto original
  pulsa **«+ Ampliar»** → en el panel pon la cantidad extra (el P.U. sale con candado) y el periodo → **«Agregar
  ampliación»** → verás la fila `…-A` con P.U. heredado y el total del concepto → captura motivo + oficio →
  **Registrar**. Luego abre la **Curva** y el **Expediente** de ese contrato para ver el adicional con badge.

## 5. Lo que falta (tu decisión)
1. **OK para aplicar el diff** de §2 a `convenios.controller.js`.
2. ¿Quieres el **% único combinado** en curva/trabajos (§3, follow-on de presentación) o lo dejamos en dos renglones?
