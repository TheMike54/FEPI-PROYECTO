# OLEADA 2 — Notificaciones + funcionalidad faltante · 18-jun-2026

> **Fase 2 del `PLAN_MAESTRO_EJECUCION_18jun.md`.** 5 items de notificaciones y datos derivados, cada uno con
> su prueba. Método: blueprint quirúrgico (workflow `wna81mh3h`, 10 agentes, verificación adversarial) →
> implementación → suite. Local, sin push; Maiki integra. Se ejecutó en **dos sub-tandas**: A (2.1/2.4/2.2,
> bajo riesgo) y B (2.5 campana, 2.3 ciclo de vida).
>
> **3 endpoints nuevos** (controller/route nuevos, NO congelados); su **montaje en `server.js`** va como diff
> aditivo para Maiki.

---

## Resumen

| Item | Qué | Endpoint nuevo | Zona | Estado |
|---|---|---|---|---|
| 2.1 | Consulta de notas muestra vínculos minuta/visita/avance | — | `bitacora.controller` (congelado) + `BuscadorNotas.jsx` | hecho |
| 2.2 | HU-19 reporte #4 (observaciones) habilitado | `GET /api/observaciones/contrato/:id` | controllers/routes nuevos + `reportesContrato.js` | hecho |
| 2.3 | Ciclo de vida con **progreso real** por bloque | — (deriva de lecturas) | `CicloVidaContrato.jsx` | hecho |
| 2.4 | "Mi info / mi empresa" (dropdown del avatar) | `GET /api/yo` | `AppShell.jsx` + controllers/routes nuevos | hecho |
| 2.5 | **Campana unificada** (firmas + atrasos + solicitudes) | `GET /api/notas-pendientes` | `AppShell.jsx` + controllers/routes nuevos | hecho |

**Validación:** sub-tanda A 15/15 verde; sub-tanda B 13/13 verde. Vite build OK. Suite completa: _(al pie)_.

---

## Detalle por item

### 2.1 — Consulta de notas: vínculos minuta/visita/avance 🚧
- **Causa:** el SELECT de `construirPayloadNotas` solo exponía `vinculada_a` (nota→nota); las tablas
  `minutas`/`visitas`/`concepto_avance` ya referencian la nota por `nota_id`, pero no se mostraba.
- **Cambio:** `bitacora.controller.js::construirPayloadNotas` (**CONGELADO → diff a Maiki**): 3 subconsultas
  `EXISTS` aditivas (`tiene_minuta`/`tiene_visita`/`tiene_avance`), sin params nuevos, fluyen por el spread del
  `.map`. `BuscadorNotas.jsx`: chips `bn-minuta/visita/avance-N` en la columna Vínculo; el `—` solo si no hay
  ningún vínculo.
- **Cita:** art. 123 fr. X RLOPSRM (minuta) · art. 125 fr. II RLOPSRM (avance) — referencias del propio schema.
- **Sin DDL, sin endpoint.** (Nota de perf opcional para Maiki: `visitas.nota_id` no tiene índice.)

### 2.2 — HU-19 reporte #4 (observaciones) ⚖️
- **Endpoint nuevo:** `GET /api/observaciones/contrato/:id` (`observaciones.controller`/`.routes`, acotado por
  `esParteOSupervision`, 404-antes-de-403, JOIN estimaciones para filtrar por contrato).
- **Front:** `api.observacionesContrato`; generador `observacionesExcel` (exceljs); `CATALOGO_REPORTES[3]
  .disponible=true`; `HANDLERS[4]={Excel}`; la página carga la fuente en su `Promise.all` (degrada a null).
- **Montaje en `server.js`:** aditivo (diff a Maiki). **Spec:** `hu-19-reportes.spec.js` — R4 pasa de
  deshabilitado a **habilitado** y se exporta como los demás.

### 2.3 — Ciclo de vida con progreso real 🔀
- **Cambio:** `CicloVidaContrato.jsx` — al elegir contrato, `Promise.all` defensivo de programa/estimaciones/
  notas/pagos/convenios → función pura `derivarProgreso(c, d)` que devuelve `hecho`/`en_curso`/`pendiente` por
  bloque (badge `progreso-cv-N`). **Defensivo:** cualquier fuente ausente cae a `pendiente` (nunca rompe).
- **Sin backend nuevo.** Estados de estimación verificados (`chk_estimaciones_estado`).
- **Cobertura:** el spec `ciclo-vida.spec.js` sigue verde (el badge es aditivo); aserción específica del badge
  = follow-on menor.

### 2.4 — Mi info / mi empresa 🚧
- **Endpoint nuevo:** `GET /api/yo` (`yo.controller`/`.routes`) → nombre, correo, rol y empresa (nombre + tipo
  + estado). El correo y el tipo/estado de empresa no viajan en el JWT → este endpoint los trae.
- **Front:** el avatar pasa de `<div>` a `<button data-testid="btn-mi-info">` que abre el pop-up `drop-miinfo`
  (reusa el mecanismo de dropdown existente). `api.miPerfil`. Etiquetas legibles de tipo/estado de empresa.
- **Conserva** todos los testids existentes; nuevos: `btn-mi-info`, `mi-info-correo`, `mi-info-empresa`.
- **Spec:** `mi-info-avatar.spec.js`.

### 2.5 — Campana UNIFICADA 💅🚧
- **Endpoint nuevo:** `GET /api/notas-pendientes` (`notas-pendientes.controller`/`.routes`) → notas que el
  usuario (parte del roster, no emisor, no firmada, no anulada, no apertura, plazo vigente) debe firmar
  (art. 123 fr. III RLOPSRM).
- **Front (`AppShell.jsx`):** badge unificado `campana-atrasos = atrasos + firmas + solicitudes`; `por-firmar-
  count = aperturas + notas`; dropdown de campana en **secciones** (Firmas / Atrasos / Solicitudes) con
  `drop-campana-firmas`, `drop-campana-solicitudes`, `drop-solicitudes-ir`. **Se conservan** los 2 botones y
  TODOS los testids del BLOQUE 4 (`link-por-firmar`, `drop-firmar`, `drop-campana`, `drop-campana-ir`,
  `campana-atrasos`, …) → `nav-modo-sistema.spec.js` queda verde.
- **Decisión:** se mantienen los DOS botones (✍️ + 🔔) porque el spec depende de `link-por-firmar`. La
  unificación es de **badge** (suma) + **contenido** del dropdown (3 secciones). Un solo botón = follow-on que
  exige reescribir el spec.
- **Spec:** `notas-pendientes-campana.spec.js`.

---

## ⛔ Zona congelada tocada (para Maiki)
1. **`bitacora.controller.js`** — 3 `EXISTS` aditivos en `construirPayloadNotas` (2.1). Lectura pura.
2. **`server.js`** — montaje de 3 routers nuevos: `/api/yo`, `/api/observaciones`, `/api/notas-pendientes`
   (líneas aditivas marcadas `OLEADA 2 — diff para Maiki`).

Controllers/routes nuevos (`yo`, `observaciones`, `notas-pendientes`) y todo el frontend NO son congelados.
**Sin DDL nueva** en esta oleada.

---

## Suite
- **Sub-tanda A** (2.1/2.4/2.2): 15/15 verde. **Sub-tanda B** (2.5/2.3): 13/13 verde.
- **Suite completa:** **331 passed · 8 skipped · 0 failed** (8.6 min). Sin regresiones.
