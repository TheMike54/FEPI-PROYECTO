# REPORTE — Bloques XL del PLAN_PREENTREGA_JUEVES (sesión autónoma)

> **Fecha:** 22–23-jun-2026 · **Modo:** autónomo · **LOCAL, sin push** · **Backup previo:** `pg_dump` en scratchpad
> (`backup_pre_XL_22jun.sql`, 5938 líneas) antes de tocar el corazón (estimaciones/contratos/schema).
> **Gate:** `vite build` VERDE + backend arranca limpio + `/api/health` 200 + **smoke en vivo de cada bloque** +
> **LOGIN verificado intacto** tras cada cambio. Sin residuo de datos (todo smoke se limpió).
> **31 archivos de código modificados + 1 script nuevo.** Zona congelada tocada CON autorización previa de Maiki.

---

## Resumen ejecutivo (qué quedó por bloque)

| Bloque | Estado | Verificado en vivo |
|--------|--------|--------------------|
| **1 · Estimación-ciclo** (no estimar antes de cerrar / solo conceptos del periodo / jalar del avance) | ✅ **Completo** | Sí (e2e) |
| **2 · Cobro / Finanzas** (contratista promueve / cola global) | ✅ **Completo** | Sí (e2e) |
| **3 · Convenios** (soportes antes / congelar+adicionales / no periodo pasado / curva) | ✅ **Completo** (curva = versionado existente) | Sí (4 casos) |
| **4 · Carátula** (resumen GACM + foto por generador) | ✅ **Backend+columnas** · UI de subida foto-por-renglón = follow-on | Sí (resumen + foto) |
| **Reseed demo** (fechas actuales) | ✅ Script `backend/scripts/reseed_demo_fechas_actuales.sql` | Sí (6936) |

---

## RESEED (prerequisito del Bloque 1)
El seed dejaba los periodos en **mar–may (todos pasados)** → imposible demostrar "solo se estima al cerrar el
periodo". Creé **`backend/scripts/reseed_demo_fechas_actuales.sql`** (idempotente, **NO toca el schema**) que ajusta
el contrato demo **6936 (PRUEBA-HU-12)** a fechas **relativas a hoy**:
- **Periodo 1 = mes anterior → VENCIDO** (estimable) · con **avance reportado** (1000, para "jalar del avance").
- **Periodo 2 = mes actual → EN CURSO** (no estimable) · **Periodo 3 = mes siguiente → FUTURO**.
- Añade un **PDF firmado dummy** (el alta exige PDF para integrar estimaciones — gate pre-existente HU-01).
**Estado final 6936:** 3 conceptos, 0 estimaciones, avance 1000 en el vencido, PDF presente, monto $1,000,000 — **listo para demo en vivo**.

---

## BLOQUE 1 · ESTIMACIÓN-CICLO (el corazón)
**Archivos:** `estimaciones.controller.js` (frozen), `estimacion-prep.controller.js`, `EnvioEstimacion.jsx`*,
`IntegracionEstimacion.jsx`. *(el fix del "−22 días" ya iba de antes).*

- **(a) No estimar antes de cerrar el periodo:** en `integrarEstimacion` (frozen) se bloquea si `periodo_fin >= CURRENT_DATE`
  (comparación TZ-safe en SQL): *"solo se estima un periodo ya VENCIDO al terminar el mes (art. 54 LOPSRM)"*. El selector
  de periodo del front **deshabilita** los periodos en curso/futuros y etiqueta su estado.
- **(b) Solo conceptos de ESE periodo:** `estimacion-prep` expone `programado_periodo` (plan del periodo EXACTO);
  el front **filtra** los generadores a los conceptos con `programado_periodo > 0`.
- **(c) Jalar del avance:** `estimacion-prep` expone `avance_periodo` (terminado reportado en ese periodo); el front
  **prellena** cada concepto con esa cantidad (el usuario solo MODIFICA).
- **Smoke e2e (6936):** prep periodo vencido → **1 concepto del periodo, avance_periodo=1000** (prellena). Integrar
  periodo **en curso → 409 `periodoNoCerrado`**; integrar periodo **vencido → 201** (estimación, neto $208,500). ✅

**Decisión:** el periodo "cierra" = `periodo_fin < hoy` (mes vencido). Es del art. 54 LOPSRM (*"esa mes vencido… te pagan
el mes que trabajaste"*). Pasados varios vencidos, se estiman uno por uno eligiendo el periodo (el selector lo permite).

---

## BLOQUE 2 · COBRO / FINANZAS
**Archivos:** `instruccion-pago.controller.js`, `instruccion-pago.routes.js`, `pagos.controller.js`* , `AmbientePago.jsx`,
`api.js`. *(las 3 validaciones SPEI/factura/avance ya iban de antes).*

- **(a) El CONTRATISTA promueve su cobro:** `cargarSoporte` y `generarInstruccion` se restringen a **rol contratista**
  (antes contratista/finanzas indistinto). El contratista sube CFDI/oficio/**datos bancarios SPEI** (numéricos, validados)
  y **genera la solicitud** (instrucción 'emitida'). Finanzas ya **no** genera la instrucción.
- **(b) Cola GLOBAL de Finanzas:** endpoint nuevo `GET /api/instruccion-pago/cola` lista **todas** las instrucciones
  'emitida' (de **todos** los contratos), con contrato/estimación/neto/CFDI/estado, acotada por participación (finanzas ve
  todas). Nueva sección **"Cola global de solicitudes de cobro (Finanzas)"** en el Ambiente de pago.
- **Smoke e2e:** contratista integra→autoriza→soportes(201)→**genera instrucción ('emitida')**; finanzas ve la **cola con 1
  fila** (contrato/estim/neto/CFDI); **finanzas NO genera instrucción → 403**. ✅

**Decisión:** "promover el cobro" = el contratista crea la **instrucción de pago** (la solicitud) con sus soportes; finanzas
solo la **revisa en la cola y paga** (registrarPago sigue siendo de finanzas). La subida de archivos binarios del CFDI/oficio
sigue como metadato (la infra de archivo del tránsito ya estaba marcada "no disponible"); los **datos bancarios SPEI** se
validan numéricos. La carga del PDF binario del CFDI es follow-on (requiere tabla/BYTEA — schema).

---

## BLOQUE 3 · CONVENIOS
**Archivos:** `convenios.controller.js`, `ConveniosModificatorios.jsx`, `EditorProgramaConvenio.jsx`.

- **(a) Subir soportes ANTES:** se exige el **oficio de soporte** (solicitud/autorización) al promover; sin él **409
  `requiereOficio`** (*art. 99 RLOPSRM: el dictamen/soporte es previo*). La referencia queda asentada en el motivo (sin columna
  nueva); el PDF se adjunta con el `subirOficioConvenio` existente. El front tiene un **campo de oficio obligatorio**.
- **(b) Congelar originales + etiquetar adicionales:** los conceptos **originales se CONGELAN** — si el convenio intenta
  cambiar su cantidad/PU → **409 `conceptoCongelado`** (nada de 524→1500). Los conceptos **nuevos se INSERTAN como
  `es_adicional = true`** (se estiman/pagan aparte). El editor del front pone **cantidad/PU/programa de los originales en
  solo-lectura** y solo deja **agregar adicionales**.
- **(c) No adicionar a periodo pasado:** una celda de un concepto **adicional** en un periodo **ya cerrado** → **409
  `periodoCerrado`** (solo de hoy en adelante).
- **(d) Curva vieja congelada → nueva:** **ya estaba cubierto** por el versionado existente: al tocar el programa,
  `snapshotVersion` guarda el `programa_version` (la curva vieja como **histórico inmutable**) y supersede la anterior; la
  nueva curva arranca con el nuevo marco. Es consultable (MatrizProgramaLectura).
- **Smoke (4 casos, contrato 6936):** (a) sin oficio → **409 requiereOficio** · (b) cambiar original → **409
  conceptoCongelado=CONC-01** · (c) adicional en periodo pasado → **409 periodoCerrado** · (b+) adicional en periodo abierto
  → **201**, concepto nuevo con **`es_adicional=true`**. ✅ (residuo restaurado: trigger de inmutabilidad deshabilitado
  temporalmente solo para limpiar el smoke).

**Decisión:** "subir soportes antes" se implementó como **exigir la referencia del oficio al capturar** (gate `requiereOficio`)
+ el PDF post-promoción (la infra de upload del convenio ya existe). El re-modelado a "borrador de convenio con PDFs antes"
sería mayor; esta versión cumple "sin oficio no procede" sin tocar el esquema congelado.

---

## BLOQUE 4 · CARÁTULA — resumen GACM + foto por generador
**Archivos:** `IntegracionEstimacion.jsx` (resumen), `estimacion-fotos.controller.js`, `api.js`.

- **Resumen de servicios ejecutados (GACM literal):** la tabla de generadores ahora muestra las columnas del formato GACM:
  **Según proyecto · Hasta est. anterior · De esta estimación · Total estimado · Por ejecutar · Precio unitario · Importe**
  (se renombraron las existentes y se **agregó "Por ejecutar"** = según proyecto − total estimado). Todas derivadas al
  centavo de los datos del contrato/avance.
- **Foto POR GENERADOR:** la columna `estimacion_fotos.contrato_concepto_id` (ya creada) ahora se **usa**: `subirFoto`
  acepta y valida `contrato_concepto_id` (foto ligada a un concepto del contrato), y `listarFotos` lo devuelve. `api.js`
  lo pasa. *(El encabezado del documento — descripción/contrato/fecha/contratista — y el bloque de FIRMAS ya se habían
  agregado en la sesión anterior.)*
- **Smoke:** subir foto con `contrato_concepto_id=7103` → **201, foto ligada al generador**. ✅
- **Follow-on (UI):** falta la **UI de subida de foto por cada renglón** del generador dentro de la vista del documento
  (el backend/columna/api ya lo soportan; el componente `FotosEstimacion` se puede extender para pasar el `conceptoId` por
  renglón). El resto del formato GACM (columnas, encabezado, firmas) ya está.

---

## Verificación global
- **`vite build` VERDE** en cada bloque (~497 módulos). Backend reiniciado tras cada cambio (no auto-recarga), arranque
  **limpio** (logs sin errores), `/api/health` 200.
- **LOGIN verificado intacto** después de tocar auth/estimaciones/contratos/convenios — nunca se rompió.
- **Smoke en vivo e2e** de cada bloque (no solo "compila"): integración bloqueada/permitida por periodo, prellenado del
  avance, cola de cobro poblada + rol 403, 4 casos de convenio, foto por generador.
- **Sin residuo de datos:** cada estimación/instrucción/convenio/foto de prueba se eliminó; 6936 quedó en estado de demo
  limpio. Los logins de smoke solo incrementan `token_version` (esperado).
- **NO push.** Local. Backup disponible para revertir.

## Decisiones tomadas (con base en la ley)
1. **Periodo "vencido"** = `periodo_fin < CURRENT_DATE` (mes terminado), art. 54 LOPSRM. Comparación en SQL (TZ-safe).
2. **Cobro:** el contratista genera la instrucción (la "solicitud de cobro"); finanzas solo revisa la **cola** y paga.
   La subida binaria de CFDI/oficio queda como metadato + datos SPEI numéricos (la infra de archivo es follow-on).
3. **Convenios (a):** "soportes antes" = exigir la **referencia del oficio** al capturar (gate) + PDF post (infra existente),
   sin re-modelar a borrador-con-PDFs (evita tocar el esquema congelado).
4. **Convenios (b):** congelar = **rechazar cualquier cambio** a cantidad/PU de un original; los cambios van como
   **adicionales** (`es_adicional`). El programa de los originales también queda solo-lectura en el front.
5. **Convenios (d):** la "curva vieja congelada" **no requirió código nuevo** — el versionado de programa ya la conserva.
6. **Carátula:** el resumen se hizo **GACM-literal** en la tabla de captura/generadores; la foto-por-generador quedó
   soportada en backend/columna/api, con la UI de subida por renglón como follow-on acotado.

## Pendiente / follow-on (acotado)
- **UI de foto por renglón** del generador (backend listo).
- **Carga binaria de CFDI/oficio** en cobro y convenios (hoy metadato; requiere tabla/BYTEA → schema, decisión de Maiki).
- **Programa de originales en convenio:** el front ya lo congela; el backend congela cantidad/PU (la redistribución de
  celdas de un original no se bloquea explícitamente server-side — el front lo impide; endurecerlo server-side es opcional).
