# Plan maestro — UI de estimación + auditoría "selección vs texto libre"

**Meta:** aplicar la pantalla única de estimación (más amigable, sin perder funcionalidad) y eliminar en todas las pantallas end-to-end los campos donde el usuario **escribe** un identificador de algo que **ya existe** (folio de contrato, folio de estimación, nombre de persona, folio de nota), obligando a **seleccionarlo**. Todo aterrizado en ley y ejecutado en una sola corrida por etapas con checkpoint.

Base: `origin/main = 069a71d`, desplegado.

---

## Principios (no negociables)

1. **Aterrizado en ley.** Cada cambio cita su artículo, o se marca `[validar]` si es interpretativo. Lo de la estimación es ley literal; lo de "selección vs texto libre" es integridad/auditabilidad que **sirve** a la ley (art. 123 fr. VI: bitácora inalterable y auditable por la SFP), no un artículo que lo prohíba — se enmarca como tal, sin inventar.
2. **Auditar antes de tocar.** La etapa 0 solo **reporta** (igual que la auditoría que encontró los 8 huecos del ciclo estimación→pago). No cambia código.
3. **Por etapas con checkpoint.** Una sola corrida, pero cada etapa se prueba (suite verde) y Maiki la integra antes de la siguiente. Así la corrida termina bien y, si algo falla, se sabe dónde.
4. **Núcleo server-side intacto.** El cálculo de la estimación y las validaciones G1–G8 **no se tocan**. La UI solo **lee y muestra**. Cualquier endpoint nuevo es de **solo lectura**.
5. **Solo Maiki integra/despliega.** Code construye en LOCAL, sin commit/push; entrega doc Markdown + patch + runbook + suite verde.
6. **Lo que necesita al profe espera.** La retención por atraso (necesita el %) va **después** de la reunión.

---

## Orden de ejecución

### Etapa 0 — Auditoría "selección vs texto libre" (SOLO reporte)

**Qué:** barrer todos los formularios de creación/referencia en la zona de fundación (HU-00, 01, 02, 03, 08–12, 21) y listar cada campo donde el usuario **escribe** el identificador de una entidad que ya existe, en vez de **seleccionarla**.

**Por qué (ley):** la bitácora, estimaciones y pagos deben ser inalterables y auditables por la SFP (art. 123 fr. VI RLOPSRM). Un identificador tecleado a mano rompe el enlace auditable y permite inconsistencias (folio que no existe, nombre que no calza con una cuenta). Es fix de integridad que sostiene la auditabilidad legal.

**Ya sabido (no re-auditar a fondo, solo confirmar):** pago HU-21 (G1, ya selecciona estimación real) y alta HU-01 (contratista/dependencia, ya selección) están **bien**.

**Sospechosos a verificar:** selección de contrato al crear estimación; contrato al crear nota de bitácora; **nota referenciada al "vincular"** (debe elegirse, no teclear su folio); persona en sustitución (HU-02); contrato en alertas (HU-07) y expediente (HU-04).

**Entrega:** documento con tabla — `pantalla | campo | hoy (texto/select) | riesgo | fix propuesto`. **CERO cambios de código.**

**Prompt para Code (copiar):**
```
Soy Maiki. Auditoría de "selección vs texto libre", SOLO reporte, sin tocar código, sobre origin/main (069a71d) en LOCAL.
Objetivo: encontrar cada campo donde el usuario ESCRIBE el identificador de una entidad que YA existe (folio de contrato, folio/llave de estimación, nombre de persona que debería ser una cuenta, folio de nota de bitácora al vincular) en vez de SELECCIONARLA de las que ya hay.
Revisa los formularios de: crear estimación (HU-12), crear/vincular nota de bitácora (HU-09), sustitución de persona (HU-02), alertas (HU-07), expediente (HU-04). NO re-audites a fondo pago (HU-21 G1) ni alta (HU-01 contratista/dependencia): ya son selección, solo confírmalo en una línea.
Entrégame un .md con una tabla: pantalla | campo | hoy (texto libre / select / autollenado) | riesgo de integridad | fix propuesto (selector + validación server-side de existencia). Cita art. 123 fr. VI donde aplique a la auditabilidad.
NO cambies código. Solo el reporte.
```

**Checkpoint:** Maiki y Claude revisan el reporte → se define el alcance exacto de la Etapa B.

---

### Etapa A — Pantalla única de estimación (presentación)

**Qué:** implementar la pantalla del mockup aprobado — captura de volúmenes + **carátula viva** + **semáforo de plan inline** + etiquetas con su artículo + columnas acumulado/saldos + **barras de avance físico/financiero**.

**Ley (renglones de la carátula, ya establecidos):**
- Importe bruto = Σ (volumen ejecutado × PU).
- Amortización de anticipo = % anticipo × bruto — **art. 138 RLOPSRM**.
- 5 al millar = 0.5% × bruto — **art. 191 LFD**.
- Tope por periodo (no estimar más de lo planeado) — **art. 45-A-X / 52**.
- Periodo de estimación ≤ 1 mes — **art. 54 RLOPSRM**.

**Reglas duras:**
- El **núcleo server-side** (cálculo + validaciones G1–G8) **NO se toca**. La UI solo lee y muestra.
- El **semáforo de plan** solo **adelanta visualmente** la validación G5 que ya hace el servidor (si excede, el campo se marca y el botón confirmar se deshabilita; el servidor sigue validando igual al confirmar).
- **Avance físico/financiero se MUESTRA** (derivado de programa vs ejecutado). **La retención NO entra aquí** (es Etapa C).
- Si falta exponer acumulados/saldos/avance, se agrega un endpoint de **solo lectura**.

**Tests:** specs de estimación existentes **verdes** + nuevos de UI: la carátula recalcula al teclear; el semáforo dispara al exceder el plan; no se puede confirmar si se excede; las cifras del ejemplo guía cuadran (C-001=400 → neto $55,600).

**Checkpoint:** Maiki integra + smoke en Render (capturar 400 → neto correcto; capturar 500 → frena).

**Prompt para Code (copiar):**
```
Soy Maiki. Etapa A: implementa la pantalla única de estimación (más amigable), en LOCAL, sin commit/push, sobre 069a71d.
Es PRESENTACIÓN: el núcleo server-side de estimación (cálculo y validaciones G1-G8) NO se toca; la UI solo lee y muestra. Cualquier dato que falte exponer (acumulados, saldos, avance físico/financiero) va por endpoint de SOLO LECTURA.
La pantalla: una sola vista con (1) captura de volumen ejecutado por concepto, (2) carátula viva que recalcula al teclear (bruto = Σ vol×PU; − amortización anticipo art.138; − 5 al millar 0.5% art.191 LFD; = neto), (3) semáforo de plan inline por concepto (planeado/ya estimado/disponible este periodo) que marca en rojo si excede y deshabilita "confirmar" — solo ADELANTA la validación G5 del servidor, que sigue validando al confirmar, (4) columnas acumulado/saldos, (5) barras de avance físico vs financiero (derivadas de programa vs ejecutado). NO incluyas retención por atraso (va en otra etapa, falta el % del profe).
Etiquetas en español claro con tooltip del artículo en amortización y 5 al millar.
Tests: deja verdes los specs de estimación existentes + agrega specs de UI (carátula recalcula, semáforo dispara al exceder, no confirma si excede, ejemplo guía C-001=400 → neto $55,600).
Entrégame doc .md + patch + runbook + suite. NO push.
```

---

### Etapa B — Fixes "selección vs texto libre"

**Qué:** convertir cada campo que la Etapa 0 marcó en **selector respaldado por la entidad real**. Cada fix: el servidor **valida que la entidad referenciada exista** (defensa en profundidad) + la UI **selecciona** (no teclea).

**Ley:** misma que Etapa 0 (auditabilidad/inalterabilidad, art. 123 fr. VI).

**Tests:** por cada fix — negar un identificador inexistente (400) + camino feliz por selección. Sin regresión en gating/100%/cuadre/firma/roster.

**Checkpoint:** Maiki integra + smoke.

**Prompt para Code:** se arma **con el resultado de la Etapa 0** (sabremos exactamente qué campos tocar).

---

### Etapa C — (POST-REUNIÓN) Retención por atraso + avance físico/financiero en la nota de estimación

**Qué:** calcular y registrar la **retención por atraso** cuando la obra va atrasada vs. programa, y dejar el **avance físico/financiero** en la nota de estimación.

**Depende de:** el **%** de retención y la **regla de disparo** (por periodo / por concepto) que confirme el profe — **art. 138/139 RLOPSRM**, `[validar]`.

**Regla:** **NO construir hasta tener ese dato.** Es lógica server-side nueva; al tenerlo, se añade el renglón "− retención por atraso" (ya previsto visualmente en la carátula de la Etapa A).

---

## Integración (la "sola corrida")

```
Etapa 0 (audit, sin código) → revisar reporte
   → Etapa A (UI estimación) → suite verde → Maiki integra + push + smoke
   → Etapa B (fixes selección) → suite verde → Maiki integra + push + smoke
   → [reunión profe: % retención, IVA, demás validar]
   → Etapa C (retención/avance) → suite verde → Maiki integra + push + smoke
```

Cada flecha es un checkpoint: build en local → suite verde → doc+patch+runbook → Maiki commitea+pushea → smoke → siguiente. Un plan, de principio a fin, que termina bien porque cada pieza queda verificada antes de la que sigue.

**Zona congelada durante todo esto:** auth, contratos core, **el cálculo y las validaciones de estimación (G1–G8)**, schema.sql salvo aditivo, permisos.js, acceso.js, el gating del alta. Las etapas A/B solo añaden presentación, selectores y validación de existencia; no reescriben la lógica que ya pasó pruebas.
```
