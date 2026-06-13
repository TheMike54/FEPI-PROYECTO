# Integración HU-15 (revisión técnica E3) + reconciliación O7 — 11 jun 2026

> **LOCAL, sin push.** Rama de integración `integracion-hu15` (merge de `origin/feat/e3-hu-15` sobre `main`).
> Patrón de siempre: fetch → diff vs main → zona congelada → merge → reconciliación → suite completa.

## El PR (feat/e3-hu-15)
Implementa **HU-15 — recepción, revisión técnica y autorización/rechazo** de la estimación (Equipo 3):
- `estimaciones-ciclo.controller`: `revisionEstimacion` (lectura), `crearObservacion`/`eliminarObservacion`
  (supervisión), `turnarEstimacion` (supervisión turna a residencia), `autorizarEstimacion`/`rechazarEstimacion`
  (residencia). Modela todo con la tabla **`estimacion_observaciones`** (ya en el esquema) + el avance de
  `estimaciones.estado`. Rutas aditivas en `estimaciones-ciclo.routes.js` (router ya montado).
- `RevisionEstimacion.jsx`: la página HU-15 real (reemplaza el dummy) + métodos en `api.js`.
- **NO toca zona congelada** (verificado con `git diff --name-only`): nada de `schema.sql`, `server.js`,
  `permisos.js`, `App.jsx`, `estimaciones.controller` (HU-12). El PR ramificó de O9 (antes de O7).

## El conflicto O7↔HU-15 y la RECONCILIACIÓN
O7 había puesto la **autorización del residente en HU-13** (`'enviada'`="Autorizada") como solución temporal
**porque HU-15 no existía**. HU-15 implementa la autorización REAL del art. 54 (supervisión revisa → turna →
residencia autoriza). Integrar tal cual = el residente autorizaría dos veces. **Reconciliado:**

| | O7 (temporal) | Reconciliado (con HU-15) |
|---|---|---|
| `permisos.js` HU-13 | residente 'E' | **contratista 'E', residente 'C'** (revertido) |
| Candado `enviarEstimacion` | `residente_id` | **`superintendente_id`** (espejo de HU-12) |
| `'integrada'` | "Presentada" | **"Integrada"** |
| `'enviada'` | "Autorizada" | **"Presentada"** |
| `'autorizada'` | (vestigial) | **"Autorizada"** (la setea HU-15) |
| Acción de HU-13 | "Revisar y autorizar" (residente) | **"Presentar"** (contratista) |
| Semáforo art. 54 (15 d) | desde integrada_en | **desde `enviada_en` = la PRESENTACIÓN** |
| Candado de pago | `['integrada','enviada','autorizada']` | **igual** (permisivo; endurecer a solo 'autorizada' = `[validar]`) |

HU-12 **no cambia** de función (el contratista integra); solo se revirtió su texto O7 ("Formular y presentar"
→ "Apertura del periodo e integración"; "presentada" → "integrada"). G1-G8 intactos.

## Flujo FINAL (quién hace qué)

| Estado interno | Etiqueta | HU | Actor | Acción |
|---|---|---|---|---|
| `integrada`  | **Integrada**  | HU-12 | contratista (superintendente) | integra la estimación del periodo |
| `enviada`    | **Presentada** | HU-13 | contratista (superintendente) | **presenta** (arranca el plazo art. 54, 15 d) |
| `autorizada` | **Autorizada** | HU-15 | supervisión → residencia | supervisión **observa/turna**; residencia **autoriza** |
| `rechazada`  | **Rechazada**  | HU-15 | residencia | **rechaza** (registra la observación del rechazo) |
| `pagada`     | **Pagada**     | HU-21 | finanzas | paga la autorizada (candado permisivo) |

## Revisión de seguridad del PR (verificada)
- **Gates por identidad del contrato:** observar/eliminar/turnar exigen `supervision_id === req.user.id`;
  autorizar/rechazar exigen `residente_id === req.user.id`. **404 antes que 403** (espejo de HU-12).
- **UPDATE atómico** `WHERE estado='enviada'` + `rowCount` en autorizar/rechazar → anti doble-resolución.
- **409 autorizar/rechazar sin turnado** previo (`estaTurnada`). Rechazo **transaccional** (UPDATE estado +
  INSERT observación en una tx).
- **`estimacion_observaciones`**: el controller usa las columnas REALES (seccion/tipo/severidad/descripcion/
  estado/turnado_a/autor_id/created_at/solventada_en), confirmadas contra `schema.sql`.
- **Smoke completo verde:** integrar → presentar (residente NO, 403) → autorizar-sin-turnar (409) → supervisión
  observa (residente NO, 403) → turna → autorizar (superintendente NO, 403) → residencia autoriza → finanzas paga.

## ¿Hubo DDL? **NO.**
`estimacion_observaciones` **ya existe** en `schema.sql` (y en Render, verificado en su migración). El PR no
añade esquema. **Sin migración.**

## Tests (lección 7)
- **`o7-flujo-estimacion.spec.js` reescrito** → flujo RECONCILIADO completo: API (contratista presenta · residente
  NO presenta 403 · autorizar-sin-turnar 409 · supervisión observa/turna · superintendente NO autoriza 403 ·
  residencia autoriza · finanzas paga) · API rechazo (residencia rechaza → 'rechazada' + observación) · Opción A
  pago permisivo · UI HU-13 presenta (Integrada→Presentada) · UI HU-12 integra.
- **`hu-13-envio-estimacion.spec.js` reescrito** → contratista presenta; etiquetas Integrada/Presentada; botón "Presentar".
- **`hu-12`/`hu-14`/`hu-17`/`hu-04`** actualizados (etiquetas + "Mis pendientes" con los actores reconciliados).
- **`hu-15-revision.spec.js`** (del PR) corre verde: acceso por rol (residente/supervisión 'E', dependencia 'C',
  contratista/finanzas sin acceso) + carga de la vista. (E3 no pudo correr e2e por Node 24 vs Playwright; aquí sí.)
- **Suite completa: 256 passed · 8 skipped · 0 failed** (7.6 min). `vite build` ✓. Tras el endurecimiento HU-15
  (backend) se re-verificó el ciclo (o7-flujo + hu-15) 12/12 con el backend reiniciado; no cambia el conteo.

## Revisión adversarial (3 lentes) + endurecimiento
- **Merge EXITOSO** (6 funciones HU-15 + enviarEstimacion exportadas/montadas). **Etiquetas reconciliadas
  correctas** en todo el código activo. Gates por identidad y 404→403 **correctos**.
- **Endurecimiento aplicado (concurrencia HU-15):** la revisión halló TOCTOU (el chequeo de turnado iba
  FUERA del UPDATE atómico). Cerrado: (1) `autorizar`/`rechazar` exigen el turnado **dentro del UPDATE
  atómico** (`AND EXISTS(... turnado_a='residencia')`) — si la supervisión turna en la carrera, ya no
  falsea la precondición; (2) `turnarEstimacion` toma `SELECT ... FOR UPDATE` sobre la fila de la
  estimación al iniciar la tx y re-chequea turnado/COUNT **dentro** de ella (cierra el doble-turnado).
- **Comentarios obsoletos de O7 corregidos** (`ConsultaExpediente.jsx`, `pagos.controller.js`).
- **Declinado (bajo impacto, un solo supervisor secuencial):** `crearObservacion`/`eliminarObservacion`
  re-chequean `estaTurnada()` fuera de tx (carrera de baja severidad: modificar una observación justo
  tras turnar). No cambia la máquina de estados. `[validar]` si se requiere serializarlas también.

## Runbook de integración (Maiki)
1. La rama `integracion-hu15` ya tiene el merge + la reconciliación. **Sin migración** (no hay DDL;
   `estimacion_observaciones` ya está en Render).
2. Las rutas HU-15 (`/revision`, `/observaciones`, `/turnar`, `/autorizar`, `/rechazar`) cuelgan del router
   `estimaciones-ciclo` **ya montado** en `server.js` → no requiere cambio en el archivo congelado.
3. `docker restart sigecop_backend` (cambiaron estimaciones-ciclo + tablero). Frontend recarga con Vite.
4. Smoke: integrar (HU-12) → presentar (HU-13, contratista) → revisar/turnar (HU-15, supervisión) → autorizar/
   rechazar (HU-15, residencia) → pagar (HU-21). Revisar etiquetas Integrada/Presentada/Autorizada.
5. **Para el profe** `[validar]`: endurecer el pago a SOLO 'autorizada' (hoy permisivo) cuando se decida bloquear.

## Archivos
Merge del PR: `estimaciones-ciclo.controller/routes`, `RevisionEstimacion.jsx`, `api.js`, `hu-15-revision.spec.js`.
Reconciliación: `estimaciones-ciclo.controller` (enviarEstimacion), `tablero.controller` (ESTADOS/PENDIENTE),
`data/estadoEstimacion.js`, `data/permisos.js` (HU-13), `pages/EnvioEstimacion.jsx` (reescrito),
`IntegracionEstimacion.jsx`, `TableroEstimaciones.jsx`, `RegistroPago.jsx`, `api.js`/`routes` (comentarios).
Specs: `o7-flujo`/`hu-13` (reescritos) + `hu-12`/`hu-14`/`hu-17`/`hu-04` (etiquetas). **Sin DDL · sin zona congelada.**
