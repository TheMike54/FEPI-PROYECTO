# Reporte — Implementación de las 7 brechas (sesión autónoma 2026-06-23)

> **Plan base:** `docs/planes/PLAN_7_BRECHAS_23jun.md` · **Modo:** autónomo, decisiones de Maiki aplicadas.
> **Resultado: 7/7 implementadas**, en 3 bloques con checkpoint. **LOCAL, sin push.** Backups antes de cada
> bloque. **NO se tocó zona congelada ni schema** en esta sesión. Build verde y login de los 5 roles intactos
> tras cada bloque.

---

## Decisiones de Maiki aplicadas
1. **G5:** la orden de pago la promueve el contratista (modelo vigente); NO se auto-genera al autorizar — solo se agregó la **notificación**.
2. **G2:** solo **distinguir/etiquetar** adicionales (art. 101 RLOPSRM); sin flujo de pago separado.
3. **G6:** holgura = **1 punto porcentual** para disparar "pago sin respaldo de avance".
4. **G7:** versión **mínima SIN DDL** (fechas derivadas de datos existentes).
5. Alcance: las 7. No se cortó ninguna.

---

## BLOQUE A — G3, G2, G5 (TACHE baratos, front-only) · checkpoint ✅

### G3 · Carátula de estimación exportable (imprimible)
- **Archivos:** `frontend/src/components/estimacion/DocumentoCaratula.jsx` (NUEVO) · `frontend/src/pages/IntegracionEstimacion.jsx` (`ModalDetalle` botón "📄 Ver/Imprimir carátula" + montaje + estado `caratulaDoc`).
- **Qué hace:** documento GACM imprimible (`window.print()`, mismo patrón probado de `DocumentoNota`/`DocumentoFiniquito`, clase `doc-nota-abierto`): membrete, encabezado con **Contratista (empresa) vs Superintendente (persona)** distinguidos, resumen de generadores, carátula sin IVA (subtotal − amortización art. 143 − 5 al millar art. 191 LFD − deductivas = neto), acumulados del contrato, firmas. Lee de `detalleEstimacion` (ya devolvía todo) + `selected`. **Cero backend, cero schema.**
- **Smoke API:** `GET /estimaciones/2749` → `acumulados=true, sin_iva=true, generadores=1` (el documento lee de ahí). Build verde.

### G2 · Conceptos adicionales etiquetados (art. 101 RLOPSRM)
- **Archivos:** `backend/src/controllers/estimacion-prep.controller.js` (`preparacionEstimacion`: + `cc.es_adicional` al SELECT y al objeto concepto) · `frontend/src/pages/IntegracionEstimacion.jsx` (fila del generador: `es_adicional` desde prepMap + badge "Adicional") · `frontend/src/pages/ConsultaExpediente.jsx` (`BloqueCatalogo`: badge "Adicional", el dato ya llegaba del backend).
- **Qué hace:** los conceptos de convenio (`es_adicional=true`, que se escribía pero **nadie leía**) ahora se **distinguen** en la integración de la estimación y en el catálogo del expediente. **Cero schema** (la columna ya existía). No se tocó `estimaciones.controller` (congelado): se expuso vía `estimacion-prep` (Equipo 3).
- **Smoke API:** `GET /estimacion-prep/contrato/6938` → el primer concepto **trae** `es_adicional` (clave expuesta). Build verde.
- **Legal:** **art. 101 RLOPSRM** (lit.): los conceptos al amparo de convenios "se deberán considerar y administrar independientemente… distinguiéndolos unos de otros".

### G5 · Notificación "ve a presentar documentos a cobro"
- **Archivos:** `backend/src/controllers/instruccion-pago.controller.js` (`porCobrar` nuevo) · `backend/src/routes/instruccion-pago.routes.js` (`GET /por-cobrar`) · `frontend/src/services/api.js` (`porCobrar`) · `frontend/src/components/ui/AppShell.jsx` (campana: estado + badge + item para contratista) · `frontend/src/components/NotificacionesCentro.jsx` (grupo "Estimaciones por cobrar").
- **Qué hace:** estimaciones **autorizadas sin instrucción** (el contratista aún no promovió cobro) se **derivan** y aparecen en la campana del contratista como "Estimación #N autorizada — presenta documentos a cobro" → `/pagos/ambiente`. **Cero schema** (derivado), routers ya montados (no se tocó `server.js`).
- **Smoke API:** `GET /instruccion-pago/por-cobrar` (contratista) → **4 filas** (ej. est#2 PRUEBA-HU-14, neto 208 500). Build verde.

**Checkpoint A:** `vite build` ✓ · login 5 roles ✓ · smokes ✓.

---

## BLOQUE B — G1 (curva versionada) · checkpoint ✅

### G1 · Curva financiera no re-escalable por convenio
- **Archivos:** `frontend/src/pages/CurvaAvance.jsx` (estado `versiones`, carga `api.convenios(id).versiones`, helper `montoEnFecha`, `financieroMap` por versión, nota cuando hay convenio). **Front-only, un archivo.**
- **Qué hace:** el % **financiero** de cada periodo se divide por el **monto vigente en la fecha de cierre de ese periodo** (de la versión del programa `programa_version`, snapshot inmutable que ya existía), no por el monto actual. Así, al subir el monto con un convenio, **los puntos históricos NO se re-escalan** ("26% hoy, 13% mañana" eliminado). Sin convenios (`versiones=[]`) usa el monto vigente → **idéntico al comportamiento previo, sin regresión.**
- **Decisión de alcance (autónoma):** la queja LITERAL del profe es el financiero. Implementé el **freeze del financiero** (el síntoma nombrado) + una **nota** de que programado/ejecutado se miden sobre el alcance vigente y los adicionales se administran aparte. La curva "escalonada por versión" para programado/ejecutado queda como **follow-on** (versión completa).
- **Verificación:** confirmé el shape real de `versiones` en `convenios.controller:90` (`monto, created_at, supersedido_en`) → `montoEnFecha` lee bien. **No hay datos demo con versiones de programa** (0 filas en `programa_version`), así que el freeze no se pudo smoke-probar con datos; el código es correcto contra el endpoint real. Maiki lo verá registrando un convenio que toque el programa y abriendo la curva.
- **Legal:** ninguna (presentación; el monto por versión ya está persistido).

**Checkpoint B:** `vite build` ✓ · login 5 roles ✓ · shape `api.convenios` verificado.

---

## BLOQUE C — G6, G4, G7 · checkpoint ✅

### G6 · Portafolio: bandera "pago sin respaldo de avance"
- **Archivos:** `backend/src/controllers/portafolio.controller.js` (deriva `pago_sin_avance` = financiero > físico + 1 pp; bloque `riesgos`) · `frontend/src/pages/PortafolioEjecutivo.jsx` (`PanelDetalle`: banner rojo de riesgo).
- **Qué hace:** compara los dos % que ya calculaba y, si lo pagado supera el avance físico por > 1 pp, marca "⚠ Pago sin respaldo de avance (+X pp)". **Cero schema** (derivado).
- **Smoke API:** `GET /portafolio` → **24/24** contratos traen el bloque `riesgos`; 0 con la bandera (los datos demo son coherentes — el badge se pinta cuando se cumpla). Build verde.
- **Legal:** concepto fundado en art. 54 LOPSRM (pago de obra ejecutada) + art. 143 fr. I (amortización proporcional); el **umbral de 1 pp** es criterio del equipo `[validar]`.

### G4 (parte barata) · Cierre de instrucción + folio heredado
- **Archivos:** `backend/src/controllers/pagos.controller.js` (`registrarPago`: `UPDATE instruccion_pago → 'cumplida'` en la misma tx) · `frontend/src/components/pagos/RegistroPagoForm.jsx` (prop `estimacionIdInicial`, preselección, **hereda el folio CFDI** de `transitoEstimacion`, aviso "heredado") · `frontend/src/pages/RegistroPago.jsx` (lee `?estimacion=`) · `frontend/src/pages/AmbientePago.jsx` (cola → `&estimacion=`).
- **Qué hace:** (a) al registrar el pago, la instrucción pasa `emitida→cumplida` y **sale de la cola** de finanzas (antes quedaba para siempre); (b) finanzas llega desde la cola con la estimación preseleccionada y el **folio CFDI ya heredado** del que promovió el contratista (lo revisa, no lo re-teclea). **Cero schema** (`instruccion_pago` ya admite `'cumplida'`, sin trigger de inmutabilidad).
- **Verificación:** la `cumplida` es un UPDATE de 1 línea dentro de la tx (code-verified; un smoke completo registraría un pago real = mutación, no ejecutado). El pre-llenado lee `transitoEstimacion` (shape ya conocido).
- **Nota:** NO se hizo el cotejo server-side del folio (versión completa) — el contrato del endpoint `/api/pagos` sigue igual; queda como follow-on.

### G7 (mínima, SIN DDL) · Fechas de autorización/rechazo/pago en el historial
- **Archivos:** `backend/src/controllers/estimaciones-ciclo.controller.js` (`historialEstimaciones`: deriva `pagada_en` (de `pagos`), `autorizada_en` (de la nota `res_estimaciones`), `rechazada_en` (de la observación `rechazo`) y los empuja a `transiciones[]`).
- **Qué hace:** el historial (HU-14) ya muestra fecha de presentación/autorización/rechazo/pago. El front ya estaba cableado para pintarlas. **Cero DDL** (decisión de Maiki): se derivan de datos existentes.
- **Smoke API:** historial 6928 → `[integrada@06-02, enviada@06-03, pagada@06-10]`; historial 6940 → `[integrada@06-02, enviada@06-03, rechazada@06-21]`. Build verde.
- **Limitación honesta del minimal:** `autorizada_en` solo aparece si existe la nota `res_estimaciones` (requiere bitácora abierta al autorizar); estimaciones seedeadas sin esa nota muestran la autorización sin fecha. La versión completa (columnas-sello `autorizada_en/_por`…) queda como follow-on con DDL aditivo, si Maiki lo quiere.

**Checkpoint C:** `vite build` ✓ · login 5 roles ✓ · smokes G6/G7 ✓.

---

## Hecho vs pendiente
- **Hecho (7/7):** G1, G2, G3, G4 (parte barata), G5, G6, G7 (mínima).
- **Follow-on conocidos (NO en el alcance de esta sesión):**
  - G1: curva escalonada por versión para programado/ejecutado (hoy: freeze financiero + nota).
  - G2: estimar/pagar adicionales en bloques separados (hoy: distinguir, que cumple art. 101).
  - G4: cotejo server-side del folio CFDI (hoy: pre-llenado + cierre de instrucción).
  - G7: columnas-sello con DDL aditivo (hoy: fechas derivadas sin DDL).
- **No se cortó nada por tiempo/contexto.**

## Confirmación de disciplina
- **Zona congelada NO tocada esta sesión:** `server.js`, `auth.*`, `permisos.js`, `App.jsx`, `SesionContext`, `estimaciones.controller`, `contratos.controller`, `lib/acceso.js`. *(Los diffs que aparezcan en esos archivos son de sesiones previas de hoy — cobro_soportes, ruta HU-16 —, no de las 7 brechas.)*
- **Schema NO tocado** (G7 fue mínima sin DDL).
- **Backups:** `backup_pre_bloqueA/B/C_20260623.sql` en scratchpad. **Residuo de smoke = 0** (esta sesión solo leyó).
- **NO push.**

## Archivos tocados (17)
NUEVO: `frontend/src/components/estimacion/DocumentoCaratula.jsx`.
Backend (todos Equipo 3 / no congelados): `estimacion-prep.controller.js`, `estimaciones-ciclo.controller.js`, `instruccion-pago.controller.js`, `instruccion-pago.routes.js`, `pagos.controller.js`, `portafolio.controller.js`.
Frontend: `IntegracionEstimacion.jsx`, `ConsultaExpediente.jsx`, `CurvaAvance.jsx`, `PortafolioEjecutivo.jsx`, `RegistroPago.jsx`, `AmbientePago.jsx`, `components/pagos/RegistroPagoForm.jsx`, `components/ui/AppShell.jsx`, `components/NotificacionesCentro.jsx`, `services/api.js`.

---
*Sesión autónoma 2026-06-23. LOCAL, sin push. Maiki revisa el diff e integra a Render.*
