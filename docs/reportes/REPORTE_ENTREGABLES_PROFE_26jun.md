# REPORTE — Construcción de entregables académicos del profe (26-jun-2026)

> Sesión autónoma, **solo documentación**, en `main`, **sin push**. No se tocó código, schema, seeds, BD ni zona
> congelada (el `schema.sql` se leyó solo para derivar el modelo de datos). Todos los entregables en **.md**, como
> borradores para que Maiki valide; donde no hubo evidencia dura quedó `[confirmar Maiki]`.

## Qué construí (4 de 5; B queda pendiente)

| Entregable | Archivo | Base / fuentes |
|---|---|---|
| **A — Análisis de riesgos con seguimiento semanal** | `docs/entrega_profe/ANALISIS_RIESGOS_SIGECOP_26jun.md` | 11 riesgos con evolución P/I por semana (W1–W7), cada semana enganchada al **plan real** que la movió (de `planes_y_soluciones/`), actas mínimas por revisión, plan de mitigación + resultado por semana. |
| **C — Planeación de sprints + puntos + velocidad** | `docs/entrega_profe/PLANEACION_SPRINTS_SIGECOP_26jun.md` | Catálogo de 24 HU (prioridad/complejidad/**puntos** Fibonacci ≈145 pts), sprints en dos fases (maquetas may + implementación real jun), velocidad ~31 pts/sem. Refleja con honestidad que pago/finiquito quedaron al final. |
| **E — Modelo de datos / E-R** | `docs/entrega_profe/MODELO_DATOS_SIGECOP_26jun.md` | Derivado del `schema.sql` real (38 tablas): diagrama **mermaid erDiagram**, entidades por dominio, cardinalidades, 12 reglas de inmutabilidad, diccionario de datos núcleo. Marca `contrato_actividades` como legacy. |
| **D — Changelog por revisión** | `docs/entrega_profe/CHANGELOG_REVISIONES_SIGECOP_26jun.md` | Tabla cronológica revisión → pedido → ajuste (12-may a 25-jun), condensada del historial y reportes. |
| **B — RNF + ISO 25010/FURPS** | **NO construido** | Pendiente: falta confirmar si el entregable es de esta materia (los audios que lo piden tienen estilo de otra clase). |

También actualicé el índice del paquete: `docs/entrega_profe/README.md`.

## Método
Trabajé sobre la verdad del proyecto con tres barridos read-only en paralelo: (1) cronología de
`planes_y_soluciones/` por semana + riesgos evidenciados; (2) reconstrucción de sprints y changelog desde
`HISTORIAL_PROYECTO.md` + reportes; (3) extracción del modelo de datos desde `schema.sql`. Sobre eso redacté los
cuatro documentos en voz de entrega (sin jerga técnica interna, sin rutas de código ni identificadores de control de
versiones).

## Qué quedó marcado `[confirmar Maiki]`
- **A (riesgos):** la **ponderación numérica semanal** (P/I) es una reconstrucción; conviene cotejarla con el
  `Plan_Riesgos` existente para no contradecir lo ya registrado. No hay acta de revisión el ~25/26-may ni el 04-jun.
  Quedan abiertos: regla concreta de **penas por atraso** (R12) y verificación de **PDF firmado** en todos los
  contratos demo (R6).
- **C (sprints):** los **puntos exactos** por HU y por sprint y la **velocidad** son estimación de complejidad
  relativa; ajustar contra el registro real.
- **D (changelog):** las fechas sin acta (25/26-may, 04-jun) y el punto abierto de la **foto de avance**
  (obligatoria 24-jun → opcional 25-jun) — confirmar la versión final del criterio.

## Qué me faltó / no hice (a propósito)
- **B (RNF/ISO/FURPS):** no construido (falta confirmar materia).
- No abrí `referencias/Plan_Riesgos.xlsx` (es .xlsx y un borrador a medias; el análisis se armó desde los
  planes/soluciones, como se indicó). Recomiendo que Maiki cotee la matriz de A contra ese archivo.
- No toqué `docs/Historias_Usuario_SIGECOP.md` (modificado por Maiki) ni nada fuera de `entrega_profe/` + este reporte.

## Estado
- 4 entregables nuevos en `docs/entrega_profe/` + índice actualizado + este reporte. Commit en `main`, **sin push**.
- Pendiente para Maiki: validar números (A/C), confirmar B, cotejar riesgos contra `Plan_Riesgos.xlsx`.
