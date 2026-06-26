# Análisis — curva y % de avance por etapas (versión del programa)

> **Solo análisis + mockups. NO implementado.** Mockups: `docs/mockups/curva_versionada_propuestas.html`.
> Datos de ejemplo: SOP-2026-001 (v1 original Σ25 600 · v2 vigente Σ30 600, del seed A3).

## 1. Cómo se mide el avance HOY (y por qué se "bugea")

`frontend/src/pages/CurvaAvance.jsx` calcula las series así:
- **denom = Σ contratado del programa VIGENTE** (`denom`, ~línea 351, suma `programa.conceptos.cantidad`).
- **programado/ejecutado** = acumulado por periodo **÷ denom × 100** (`datosCurva`, ~líneas 362-392).
- **financiero** ya está versionado por convenio (G1: `montoEnFecha`/`financieroMap`) — ese sí no se re-escala.
- **A3** agregó un selector que redibuja la **línea programada** de una versión histórica, pero **ejecutado se sigue
  midiendo sobre el denom vigente** y **no existe el concepto de "% congelado por etapa"**.

**El bug (ejemplo real SOP-2026-001):** ejecutas CONC-01 completo (12 000 m²).
- Sobre el programa **original** (Σ25 600): **12 000 / 25 600 = 46.9 %**.
- Entra el convenio CM-001 (AD-01, +5 000 m² → Σ30 600). El **mismo** trabajo: **12 000 / 30 600 = 39.2 %**.

El denominador creció, así que el 46.9 % "así íbamos con el plan original" **desaparece** y se re-escala a 39.2 %.
Es exactamente lo que describió el profe: el avance se "bugea" con el convenio.

## 2. Qué se necesita para medirlo por ETAPAS (original congelado + vigente)

La idea: el avance se ve como **etapas en el tiempo**, una por versión del programa:
- **Etapa original (histórico):** su curva y su % se **congelan** al momento del convenio, medidos sobre el denom
  de v1. "Así íbamos con el plan original" queda intacto.
- **Etapa vigente (desde el convenio N):** arranca una curva y un % **nuevos**, medidos sobre el denom de v2.

**Los datos YA existen — no falta nada en BD:**
- `programa_version` (v1/v2) con `created_at` y `supersedido_en` → define la **ventana temporal** de cada etapa.
- `programa_version_concepto` / `programa_version_celda` → el **denom y la curva programada** de cada versión
  (ya los lee `api.versionPrograma`, usado en A3).
- `concepto_avance.fecha` → el **ejecutado** se puede partir por la fecha del convenio (lo ejecutado **antes**
  pertenece a la etapa original; lo de **después**, a la vigente).

**Lo que falta es la LÓGICA DE PRESENTACIÓN en la curva** (componer las series por etapa + congelar el % de la
original), no datos ni backend.

## 3. Alcance del cambio (cuando se autorice)

| Aspecto | Detalle |
|---|---|
| Archivos | `frontend/src/pages/CurvaAvance.jsx` (componer series por etapa + KPIs congelados); posible helper nuevo en `frontend/src/` para derivar etapas desde versiones + avances. Reusa `api.convenios` (versiones con fechas) y `api.versionPrograma`. |
| Backend | **Ninguno** (snapshots + fechas de avance ya existen). |
| Schema | **Ninguno** (no DDL). |
| Zona congelada | **No** — `CurvaAvance.jsx` no es congelado. |
| Riesgo | **Medio**: es lógica de curva (varias series, ventanas por fecha, edge cases de avances sin fecha clara). 100% frontend, reversible. |

**Decisión pendiente:** cuál de las 3 propuestas de presentación (ver mockups). Eso fija cuánta lógica de render
se necesita. La de **tramos en una sola gráfica** y la de **dos etapas separadas** son las más directas; la de
**línea de tiempo de versiones** es la más escalable si hay varios convenios.

## 4. Mockups (3 propuestas)
Archivo: `docs/mockups/curva_versionada_propuestas.html` (ábrelo en el navegador). Cada propuesta deja claro que el
**% original queda congelado (no se re-escala)** y el **nuevo % arranca sobre el programa modificado**:

- **Propuesta A — Curva única con tramos:** original (guinda, sólida, congelada) + marcador "Convenio CM-001" +
  tramo vigente (dorado) en la misma gráfica, con una línea fantasma que muestra el "si se re-escalara (bug)".
- **Propuesta B — Dos etapas separadas:** tarjeta "Etapa original (histórico)" con su % final congelado + tarjeta
  "Etapa vigente (desde Convenio N)" con su % nuevo, lado a lado.
- **Propuesta C — Línea de tiempo de versiones:** chips v1 → Convenio → v2 con el % de cada etapa + la curva de la
  etapa seleccionada (la más escalable a N convenios).

**No implemento hasta que elijas una.**
