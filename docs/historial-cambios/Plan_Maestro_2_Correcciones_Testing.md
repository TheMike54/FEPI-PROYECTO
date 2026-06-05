# Plan maestro 2 — correcciones y mejoras (testing de Maiki)

Base: `origin/main = 6b51b37`, desplegado.

## Modelo de trabajo (aclarado)
- Las HU **ya integradas en main son de Maiki**; los equipos ya no las tocan. Los **bugs de lo integrado los arregla fundación** (Maiki + Code). Los equipos siguen entregando **HU nuevas** por PR.
- Code construye en LOCAL, sin commit/push; Maiki integra.
- **Núcleo endurecido a NO regresar (solo extender/añadir):** auth, cálculo + validaciones de estimación (G1–G8), gating/100%/cuadre del alta, CHECK del roster, inmutabilidad de bitácora/firmas.
- **EXCLUIDO de este plan** (necesita autorización del profe): mover el % de pena de datos generales al paso 5 (penalizaciones).

## Pases (cada uno: build local → suite verde → Maiki integra → smoke → siguiente)

---

### Pase 1 — Programa de obra: bug + display [CRÍTICO, primero]
Cubre: bug #1 (programa "no registrado"), display mes-por-mes (#5), plan visible en la captura (#9).

- Investigar (read-only) dónde guarda el alta el programa vs. dónde lo lee el expediente → reportar causa antes de cambiar nada.
- Arreglar la lectura para que el programa aparezca.
- Mostrar el programa **mes por mes** (matriz concepto × periodos, como la pestaña del alta) en: (a) detalle del contrato en Registrados, (b) consulta de expediente (HU-04), (c) panel plegable en la captura de estimación (HU-12). En vez del resumen actual.

**Prompt:**
```
Soy Maiki. Plan 2, Pase 1: bug del programa de obra + mostrarlo mes por mes. LOCAL, sin commit/push, sobre origin/main (6b51b37).
Contexto: un contrato que SÍ tiene programa (capturado en el alta) aparece como "no tiene programa de obra registrado" en la consulta de expediente (HU-04).
1) INVESTIGA primero (read-only): dónde guarda el alta el programa (tabla/columnas) vs. dónde lo lee el expediente. Reporta la causa antes de cambiar nada.
2) FIX: que el expediente y el detalle del contrato en Registrados lean el programa correctamente.
3) DISPLAY mes por mes: en (a) el detalle del contrato en Registrados, (b) la consulta de expediente, y (c) un panel plegable "Ver programa de obra" en la captura de estimación — la matriz concepto × periodos igual que la pestaña "Programa de obra" del alta, con el periodo actual resaltado donde aplique. En vez del resumen.
Núcleo a NO tocar (solo extender): cálculo y validaciones de estimación (G1-G8), gating/100%/cuadre del alta.
Tests: el contrato de ejemplo muestra su programa en las 3 vistas; suite completa sin regresión. Doc .md + runbook. NO push.
```

---

### Pase 2 — Bitácora: anular + fecha/hora + sustitución
Cubre: quitar anular + fecha/hora (#7), sustitución refleja en bitácora/expediente (#10).

- Quitar "anular/eliminar nota" (art. 123 fr. VI RLOPSRM — bitácora inalterable; corrección = nota nueva que referencia, ya existe con vincular).
- Mostrar fecha **y hora** de creación en cada nota.
- Sustitución (HU-02): al registrar una sustitución, generar **nota de bitácora** que asiente el hecho (art. 123) + verse en el **expediente** (art. 74). Default: nota automática con motivo + fecha + persona anterior/nueva. **[validar profe: auto vs manual, dato mínimo].**

**Prompt:**
```
Soy Maiki. Plan 2, Pase 2: bitácora — quitar anular, fecha/hora, reflejar sustitución. LOCAL, sin commit/push, sobre origin/main.
1) Quitar "anular nota"/"eliminar nota" (UI + endpoint si existe). Bitácora inalterable (art. 123 fr. VI RLOPSRM); corrección = NOTA NUEVA que referencia (ya existe con vincular).
2) En cada nota, mostrar fecha Y HORA de creación.
3) Sustitución (HU-02): al registrar una sustitución, generar una NOTA en la bitácora que asiente el hecho (art. 123 — hecho relevante) y que sea visible en el expediente (art. 74). Default: nota automática con motivo + fecha + persona anterior/nueva. [validar profe: auto vs manual, dato mínimo].
Núcleo a NO tocar: inmutabilidad de bitácora/firmas (no rompas folio correlativo ni firmas), roster append-only, G1-G8.
Tests: no existe acción de anular; cada nota muestra fecha+hora; una sustitución crea su nota y aparece en el expediente; sin regresión. Doc .md + runbook. NO push.
```

---

### Pase 3 — Validaciones y formularios
Cubre: pago fecha (#2), garantía anticipo auto-calc (#6), nombre/apellido (#3).

- Pago (HU-21): validar fecha de pago **≥** fecha de la estimación (no pagar antes de estimar).
- Garantía de anticipo (alta): al elegir tipo = anticipo, auto-llenar monto = anticipo% × monto del contrato.
- Registro: separar nombre en **dos campos obligatorios** — "nombre(s)" y "apellido(s)".

**Prompt:**
```
Soy Maiki. Plan 2, Pase 3: validaciones y formularios. LOCAL, sin commit/push, sobre origin/main.
1) Pago (HU-21): validar que la fecha del pago sea >= la fecha de la estimación (no se puede pagar antes de estimar). Error claro si no.
2) Garantía de anticipo (alta, paso Garantías): al elegir tipo de póliza = anticipo, auto-llenar el monto = anticipo% × monto del contrato (read-only derivado).
3) Registro de usuario: separar el nombre en DOS campos obligatorios — "nombre(s)" y "apellido(s)", ambos requeridos. Al guardar concatena en el campo nombre existente (no rompas los ~7 lugares que lo muestran).
Núcleo a NO tocar: gating/100%/cuadre del alta, G1-G8, el cálculo del neto del pago (solo añade la validación de fecha).
Tests: pago con fecha anterior a la estimación → rechazado; garantía anticipo auto (30% de $1M = $300,000); registro exige nombre Y apellido por separado; sin regresión. Doc .md + runbook. NO push.
```

---

### Pase 4 — Alertas: visibilidad
Cubre: discoverability de alertas (#8).

- En el detalle/panel del contrato, indicador de alertas activas ("N conceptos en atraso") + acceso directo a la lista. Que residente y supervisión las vean sin buscarlas.

**Prompt:**
```
Soy Maiki. Plan 2, Pase 4: visibilidad de alertas de atraso. LOCAL, sin commit/push, sobre origin/main.
Hoy las alertas (HU-07) están escondidas en su pantalla. Añade visibilidad: en el detalle/panel del contrato, un indicador de alertas activas ("N conceptos en atraso") + acceso directo a la lista del contrato. Residente y supervisión las ven sin entrar a buscarlas.
Solo presentación/lectura: no cambies la lógica de evaluación (server-side) ni los permisos.
Tests: contrato con alertas activas muestra el indicador; cuenta sin acceso no lo ve; sin regresión. Doc .md + runbook. NO push.
```

---

## Para confirmar con el profe (mañana)
- **#4 (excluido):** mover el % de pena de datos generales a penalizaciones.
- **#10 detalle:** sustitución — ¿nota de bitácora automática o manual? ¿dato mínimo (motivo + autorización art. 125 fr. I g)?
- **Programa mes-por-mes:** confirmar que así lo quiere ver en detalle/expediente.

## Orden e integración
Pase 1 (crítico, riesgo del demo) → 2 → 3 → 4. Cada uno con checkpoint (Maiki integra + smoke). El Pase 1 se puede empezar ya; el resto puede ir después de la reunión.
