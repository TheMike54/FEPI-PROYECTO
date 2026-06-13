# Oleada O7 — Flujo legal de la estimación: el contratista presenta, la residencia autoriza — 10 jun 2026

> Art. 54 LOPSRM. El profe **CONFIRMÓ** invertir el flujo. **LOCAL, sin commit/push**, sobre `main`
> (con O1..O6 integrados). Componentes guinda (UI-1). **Cambio de ACTORES SIN migrar datos**: los estados
> internos del esquema se conservan; cambian **etiquetas, permisos y candados**. **NO se tocó** `server.js`,
> G1-G8, `estimaciones.controller` (HU-12, congelado) ni la lógica de cálculo. `permisos.js` (congelado) se
> cambió **con cuidado** (solo HU-13).

## ¿Hubo DDL? **NO.** Sin migración de datos.
Los estados internos (`integrada`/`enviada`/`autorizada`/`pagada`/`rechazada`) y las columnas
(`enviada_en`/`enviada_por`) **se reutilizan tal cual**. Solo cambia su SIGNIFICADO de cara al usuario.

## Antes → Después

| | Antes | Después (O7) |
|---|---|---|
| **HU-12** "Formular y presentar" | el contratista *integra* la estimación | el contratista **PRESENTA** (mismo actor) — etiqueta del estado `integrada` = **"Presentada"** |
| **HU-13** actor | el **superintendente** *envía* (`integrada`→`enviada`) | la **RESIDENCIA** revisa y **AUTORIZA** (`integrada`→`enviada`); etiqueta `enviada` = **"Autorizada"** |
| **HU-13** permiso | contratista `E`, residente `C` | **residente `E`, contratista `C`** (resto igual) |
| **HU-13** candado backend | `req.user.id === superintendente_id` | **`req.user.id === residente_id`** |
| Sello de `enviada_en/por` | acuse de **envío** | **sello de AUTORIZACIÓN** (mismas columnas) |
| **HU-21** pago | paga `integrada`/`autorizada` | paga **lo autorizado**: candado `+= 'enviada'` (Opción A, no bloqueante) |
| **HU-14 / HU-17** | "Integrada" / "Enviada / en revisión" | **"Presentada" / "Autorizada"** (etiquetas) |
| Tablero "Mis pendientes" | residente revisa lo `enviada`; contratista envía lo `integrada` | **residente revisa-autoriza lo `integrada`/Presentada; finanzas paga lo `enviada`/Autorizada; contratista reingresa lo `rechazada`** |
| Plazos art. 54 | semáforo de revisión (15 d desde el envío) | **referencia visual NO bloqueante**: 6 d presentación (corte→`integrada_en`), 15 d autorización (desde `integrada_en`), 20 d pago (desde `enviada_en`) |

## Decisión consultada (candado de pago HU-21)
El requisito #4 tenía tensión interna ("paga lo Autorizado" vs "(solo etiquetas)"). Con el flujo nuevo, la
estimación autorizada queda en `enviada`, que el candado **no** aceptaba → el pago se trababa. Maiki eligió
**Opción A (no bloqueante)**: `pagos.controller` ahora paga `['integrada','enviada','autorizada']` (añade
`enviada` = Autorizada; conserva `integrada` permisivo, consistente con #6). `[validar profe]` endurecer luego
a solo lo autorizado.

## Backend (controllers de dominio — NO congelados)
- `estimaciones-ciclo.controller.js`: `enviarEstimacion` ahora exige `req.user.id === residente_id` (antes
  superintendente); mensajes reframeados a "autorizar". La transición `integrada→enviada` y el sello atómico
  quedan igual (reusa `enviada_en/por`). El path `/enviar` se conserva por compat de API.
- `pagos.controller.js`: candado pagable `+= 'enviada'` (Opción A). Cálculo (importe = neto), no-doble-pago e
  inmutabilidad intactos.
- `tablero.controller.js`: `ESTADOS` (etiquetas: integrada→"Presentada", enviada→"Autorizada", autorizada→
  "Autorizada" — vestigial e indistinguible de `enviada`, alineado con el util; responsable next-actor:
  integrada→residente, enviada→finanzas) y
  `PENDIENTE_POR_ESTADO` (integrada→residente "Revisar y autorizar"; enviada→finanzas "Registrar el pago";
  rechazada→contratista "Reingresar").

## Frontend (componentes guinda UI-1)
- **`data/estadoEstimacion.js`** (NUEVO): `labelEstadoEstimacion` — fuente única de las etiquetas (DRY); lo usan
  HU-12/13/14/21 y el expediente (O9).
- **`permisos.js`** (CONGELADO, cambio quirúrgico): `HU-13` → `residente 'E', contratista 'C'`.
- **`EnvioEstimacion.jsx` (HU-13, reescrito)**: título "Revisión y autorización de la estimación", actor
  residente, botón **"Autorizar estimación"**, badges via util; semáforos: presentación (6 d, informativo),
  **autorización (15 d desde `integrada_en`)** en la fila Presentada, **pago (20 d desde `enviada_en`)** en la
  fila Autorizada; sello "✓ Autorizada el …".
- **`IntegracionEstimacion.jsx` (HU-12)**: título "Formular y presentar la estimación", botón "Confirmar y
  presentar", badges via util, textos "presentada".
- **`HistorialEstimaciones.jsx` (HU-14)** y **`TableroEstimaciones.jsx` (HU-17)**: etiquetas vía util / FASES.
- **`RegistroPago.jsx` (HU-21)**: `PAGABLES += 'enviada'`, etiquetas "(presentada/autorizada)".
- **`ConsultaExpediente.jsx` (O9)**: el resumen de estimaciones usa el util compartido.

## Fuera de alcance (no se tocó)
- **HU-15** (revisión técnica con observaciones) y **HU-16** (reingreso): el prompt no los menciona; su código
  y permisos quedan intactos. El estado `autorizada` es **vestigial** (ningún flujo cableado lo produce hoy).

## Tests (lección 7)
- **Nuevo `o7-flujo-estimacion.spec.js` (5)**: API del ciclo completo (contratista presenta → **superintendente
  403** → residente autoriza ('enviada' + sello) → reautorizar 409 → **finanzas paga lo autorizado**) · **Opción A
  documentada** (pagar la "Presentada"/integrada aún devuelve 201 — blinda la decisión: si se endurece, este test
  falla) · UI: la residencia ve "Presentada", autoriza, la fila pasa a "Autorizada" + semáforo de pago 20 días · UI:
  HU-12 reetiquetada a "Formular y presentar".
- **`hu-13-envio-estimacion.spec.js` reescrito**: actor **residente** autoriza; etiquetas Presentada/Autorizada;
  botón "Autorizar"; contratista en solo-consulta.
- **`hu-12` / `hu-14` / `hu-17` actualizados**: título/etiquetas; "Mis pendientes" con los actores nuevos.
- **Sin cambios y verdes**: `pago-fecha-integrada` (paga `integrada`, sigue pagable), `hu-21`,
  `estimacion-pantalla-unica`, `estimacion-retencion-atraso`, `hu-15-revision` (fuera de alcance).
- **Suite completa: 250 passed · 8 skipped · 0 failed** (11.3 min, BD saneada). `vite build` ✓.

## Revisión adversarial (3 lentes) + correcciones
- **Seguridad/candados: el backend de autorización es SEGURO** (gate de identidad `residente_id` localizado,
  máquina de estados sin reautorización, sello atómico del JWT). El "hueco" de pagar la Presentada es la **Opción
  A intencional** (lo confirmó la lente). **Consistencia de etiquetas:** sin estado crudo visible al usuario.
- Correcciones aplicadas de la revisión: (1) comentario desfasado en `estimaciones-ciclo.routes.js` (superintendente
  → residente); (2) **alineé la etiqueta del estado vestigial `autorizada`** ("Autorizada (firme)" → "Autorizada")
  entre el tablero y el util; (3) **test que documenta la Opción A** (pagar la Presentada = 201) para blindar la
  decisión; (4) el test UI verifica el semáforo de pago tras autorizar. También: el test O9 del expediente
  (`hu-04`) pasó a esperar "Presentada" (era "Integrada").

## Runbook de integración (Maiki)
1. **Sin migración** (no hay DDL): solo `git pull` + `docker restart sigecop_backend` (cambiaron
   `estimaciones-ciclo`, `pagos`, `tablero`). El frontend recarga con Vite.
2. Smoke del flujo: contratista presenta (HU-12) → residente autoriza (HU-13; el superintendente recibe 403 si
   lo intenta) → finanzas paga la autorizada (HU-21). Revisar etiquetas en HU-14/HU-17 (Presentada/Autorizada).
3. **Para el profe**: flujo art. 54 invertido y confirmado. `[validar]`: (a) endurecer el pago a solo lo
   autorizado (quitar `integrada` del set) cuando se decida bloquear; (b) los plazos 6/15/20 son referencia
   visual — ¿pasan a candado duro en una fase siguiente?; (c) rol de HU-15 (revisión técnica) en el flujo nuevo.

## Archivos tocados
Backend: `estimaciones-ciclo.controller.js`, `pagos.controller.js`, `tablero.controller.js`. Frontend:
`data/permisos.js` (congelado), `data/estadoEstimacion.js` (nuevo), `pages/EnvioEstimacion.jsx` (reescrito),
`pages/IntegracionEstimacion.jsx`, `pages/HistorialEstimaciones.jsx`, `pages/TableroEstimaciones.jsx`,
`pages/RegistroPago.jsx`, `pages/ConsultaExpediente.jsx`, `services/api.js` (comentario). `services/api.js` (comentario), `routes/estimaciones-ciclo.routes.js` (comentario). Tests:
`o7-flujo-estimacion.spec.js` (nuevo) + `hu-13` (reescrito) + `hu-12`/`hu-14`/`hu-17`/`hu-04` (actualizados). **Sin DDL.**
