# Plan de pruebas end-to-end — SIGECOP

**Estado:** todo lo de fundación + equipos integrado y desplegado en Render. 15 historias para probar en orden.

**Cómo usar esto:** sigue los pasos en orden (cada uno depende del anterior). Para cada paso te digo **quién entra, qué hacer, qué poner en cada campo, qué debes ver y qué comprobar** (incluyendo meterle datos malos a propósito para ver que el sistema te frena — eso es lo que más le gusta ver al profe).

---

## Cuentas (todas con contraseña: `Sigecop2026!`)

| Correo | Rol | Para qué |
|---|---|---|
| `residente@sigecop.test` | Residente | Crea contratos, abre bitácora, emite notas, crea estimaciones, alertas |
| `contratista@sigecop.test` | Contratista (superintendente) | Firma, registra avance físico, envía estimación |
| `supervision@sigecop.test` | Supervisión | Firma, consulta |
| `dependencia@sigecop.test` | Dependencia | Parte contratante, crea convenios |
| `finanzas@sigecop.test` | Finanzas | Registra pagos |

---

## Datos del contrato de prueba (cópialos tal cual — cuadran exacto)

- **Clave:** `OBRA-2026-001`
- **Objeto / nombre:** `Construcción de edificio administrativo`
- **Monto contratado:** `1000000` ($1,000,000.00)
- **Anticipo:** `30` (%)
- **% pena por atraso:** `0.05` (= 5%, para probar la retención)
- **Fecha inicio:** hoy · **Fecha fin:** dentro de 3 meses

**Conceptos (suman exacto $1,000,000):**

| Clave | Descripción | Unidad | Cantidad | Precio unitario |
|---|---|---|---|---|
| `C-001` | `Preliminares` | `m2` | `1000` | `200` |
| `C-002` | `Cimentación` | `m3` | `500` | `800` |
| `C-003` | `Estructura` | `m2` | `800` | `500` |

**Programa de obra (cada concepto debe sumar su cantidad total = regla del 100%):**

| Concepto | Periodo 1 | Periodo 2 | Periodo 3 | Suma |
|---|---|---|---|---|
| C-001 | `400` | `600` | `0` | 1000 |
| C-002 | `0` | `250` | `250` | 500 |
| C-003 | `0` | `300` | `500` | 800 |

**Garantías:** cumplimiento `100000` (10%) · anticipo → **se calcula solo** ($300,000).

---

## Paso 1 — HU-00 · Login

- **Entra con:** `residente@sigecop.test` / `Sigecop2026!`
- **Comprueba:**
  - Contraseña incorrecta → te rechaza.
  - Correcta → entras con el menú de residente.

---

## Paso 2 — HU-01 · Alta de contrato

- **Quién:** residente → "Alta / Nuevo contrato".
- **Avanzas paso por paso con "Siguiente"** (no te deja saltar si falta algo).

**Sub-paso 1 — Datos generales:**
- Clave: `OBRA-2026-001`
- Objeto: `Construcción de edificio administrativo`
- Fechas: inicio hoy / fin +3 meses
- Anticipo: `30`
- **% pena por atraso:** `0.05`
- **Contratista:** selecciona la cuenta `contratista@sigecop.test` (es el superintendente — **no se escribe**, se elige)
- **Dependencia:** selecciona `dependencia@sigecop.test` del desplegable

**Sub-paso 2 — Catálogo de conceptos:** captura los 3 de la tabla. El total debe marcar **$1,000,000 exacto**.

**Sub-paso 3 — Programa de obra:** llena la matriz como la tabla (cada renglón suma su cantidad).

**Sub-paso 4 — Garantías:**
- Cumplimiento: `100000`
- Anticipo: elige tipo de póliza = **Anticipo** → el monto se llena solo en **$300,000** (30% del contrato). Verifica que sea read-only.

**Sub-paso 5 — Datos jurídicos:** llena los campos obligatorios.

**Sub-paso 6 — PDF firmado:** sube cualquier PDF.

- **Qué ver:** al guardar te manda a "Registrados" y el contrato aparece en la lista.
- **Comprueba (mete datos malos):**
  - Catálogo que NO suma $1,000,000 → error, no avanzas.
  - Un concepto del programa que no suma su cantidad → te frena (regla 100%).
  - % de pena fuera de 0–1 (ej. `5`) → rechazado.
  - Falta dependencia / PDF / garantías → no guarda.
  - Abre el contrato en Registrados → en "Programa de obra" debe verse la **matriz mes por mes** (no un resumen) y todo en **solo lectura**.

---

## Paso 3 — HU-08 · Apertura de bitácora

- **Quién:** residente, en el contrato `OBRA-2026-001` → Abrir bitácora.
- **Qué ver:** se crea la **nota #1 (apertura)** con fecha.
- **Comprueba:** intenta abrirla otra vez → no te deja (ya está abierta).

---

## Paso 4 — HU-02 · Sustitución de personas (genera nota de bitácora)

- **Quién:** residente, en la vista de Roster del contrato.
- **Qué hacer:** sustituye al superintendente: **selecciona** otra cuenta de rol contratista, motivo: `Cambio de superintendente por reasignación`, fecha: hoy.
- **Qué ver:**
  - El roster muestra la nueva persona como vigente y la anterior en el histórico.
  - **Se crea automáticamente una nota de bitácora** de la sustitución (rol, persona anterior → nueva, motivo, fecha y hora).
- **Comprueba:**
  - **No hay campo para teclear el ID** — solo el selector; si no hubiera cuentas elegibles, sale un aviso.
  - Una nota firmada **antes** de sustituir conserva al firmante original (inmutabilidad).
  - *(Opcional, prueba el diferido):* crea un 2º contrato, sustituye **antes** de abrir su bitácora → te avisa que la nota queda "diferida"; al abrir la bitácora aparece asentada.

---

## Paso 5 — HU-09 · Notas de bitácora (+ firmas + vincular)

- **Quién:** residente emite; supervisión/contratista firman.
- **Qué hacer:** crea una nota. Tipo: el que permita tu rol. Contenido: `Inicio de trabajos de preliminares conforme al programa`.
- **Qué ver:** la nota aparece con su folio correlativo, **fecha y hora de creación**, y estado "pendiente de firma".
- **Firmas:** entra como supervisión (y como el superintendente) y firma. Cuando todos firman → estado **"Firmada"**.
- **Vincular:** crea otra nota y vincúlala a la anterior (es una nota nueva que la referencia). Comprueba que solo deja vincular notas **del mismo contrato**.
- **Comprueba:**
  - El folio es correlativo e inmutable.
  - Una nota firmada ya no se edita.
  - **NO uses "Anular"** en la demo (aunque aparezca) — está pendiente de definir con el profe.

---

## Paso 6 — HU-10 · Consulta de notas

- **Quién:** cualquiera con acceso al contrato.
- **Qué ver:** el listado de notas (apertura + las que creaste + la de sustitución).
- **Comprueba:** la búsqueda/filtro funciona; cada nota muestra fecha y hora.

---

## Paso 7 — HU-04 · Consulta del expediente

- **Quién:** entra como `contratista`, `supervision` o `dependencia`.
- **Qué hacer:** abre Consulta de expediente → **selecciona** el contrato.
- **Qué ver:**
  - El expediente carga con aviso **"solo consulta"**.
  - **Programa de obra mes por mes** (matriz, no resumen).
  - Sección **"Roster y sustituciones"** con el histórico de quién entró/salió.
- **Comprueba:** todo es **solo lectura** (sin botones de crear/editar/borrar).

---

## Paso 8 — HU-06 · Registro de avance físico

- **Quién:** entra como `contratista` (el superintendente).
- **Qué hacer:** selecciona el contrato → tabla de conceptos → registra avance del concepto `C-001`: cantidad ejecutada `400`.
- **Qué ver:** el avance se registra contra el concepto.
- **Comprueba (art. 118):**
  - Intenta registrar más de lo contratado (ej. `1200` en C-001 cuando el total es 1000) → **te frena**.
  - Como residente/supervisión ves la tabla pero **sin** botón de registrar.
  - Como dependencia/finanzas → sin acceso.

---

## Paso 9 — HU-07 · Alertas de atraso

- **Quién:** residente (crea), supervisión (solo lee).
- **Qué hacer (residente):** Alertas de atraso → **selecciona** el contrato → concepto `C-001`, umbral (ej. `10` %) → Crear alerta.
- **Qué ver:** la alerta se evalúa en el servidor (avance vs. planeado).
- **Comprueba:**
  - En el **detalle del contrato (Registrados)** aparece el indicador **"N conceptos en atraso"** + link directo a las alertas (solo para residente/supervisión).
  - Como supervisión, el panel de alertas está en **solo lectura**.
  - Una cuenta sin acceso al contrato no ve sus alertas.

---

## Paso 10 — HU-12 · Estimación (pantalla única)

- **Quién:** residente → nueva estimación del contrato, **periodo 1**.
- **Qué poner:** volumen ejecutado de `C-001` = `400` (en la captura de volúmenes).
- **Qué ver — la carátula se calcula en vivo:**
  - Importe bruto = 400 × 200 = **$80,000**
  - − Amortización anticipo 30% = **$24,000**
  - − 5 al millar 0.5% = **$400**
  - − Retención por atraso = **$0** (vas al corriente: 400 = lo planeado del periodo)
  - **Neto = $55,600**
- **Comprueba:**
  - **Semáforo de plan:** captura `C-001 = 500` (el plan del periodo es 400) → la fila se pone **roja**, aviso, y "Confirmar" se deshabilita.
  - **Retención (ahora sí):** captura `C-001 = 300` (menos que el plan de 400 → atraso) → aparece la retención. Con pena 5%: bruto $60,000 − amort $18,000 − 5 al millar $300 − **retención $3,000** = **neto $38,700**.
  - Panel plegable **"Ver programa de obra"** muestra la matriz con el periodo actual resaltado.
  - Barras de avance físico/financiero.
- **Deja una estimación válida integrada** (con C-001 = 400, neto $55,600) para los pasos siguientes.

---

## Paso 11 — HU-13 · Envío de estimación

- **Quién:** entra como `contratista` (superintendente).
- **Qué hacer:** toma la estimación **integrada** del paso 10 → botón **Enviar**.
- **Qué ver:** la estimación pasa a estado **"Enviada"**, se sella la fecha/hora de envío.
- **Comprueba:**
  - Intenta enviarla otra vez → **no te deja** (409, ya está enviada).
  - Como residente, solo la consultas (sin botón Enviar).
  - Solo una estimación **integrada** es enviable.

---

## Paso 12 — HU-21 · Pago

- **Quién:** entra como `finanzas@sigecop.test`.
- **Qué hacer:** registra el pago **seleccionando** la estimación enviada del paso 11. Fecha de pago: hoy.
- **Qué ver:** el importe = el **neto $55,600** (lo trae el servidor, no lo editas); al pagar, la estimación pasa a **"Pagada"**.
- **Comprueba:**
  - Pon una **fecha de pago anterior** a la integración de la estimación → **te frena** (no se paga antes de estimar).
  - Intenta editar el importe → no se puede.
  - Intenta pagar dos veces la misma estimación → bloqueado.

---

## Paso 13 — HU-14 · Historial de estimaciones

- **Quién:** cualquiera con acceso al contrato.
- **Qué hacer:** abre Historial de estimaciones → selecciona el contrato.
- **Qué ver:** la lista de estimaciones con su estado (integrada / enviada / pagada).
- **Comprueba:** es solo lectura; el filtro por estado funciona; una cuenta sin acceso no ve el historial.

---

## Paso 14 — HU-03 · Convenios modificatorios (plazo)

- **Quién:** entra como `dependencia@sigecop.test`.
- **Qué hacer:** Convenios → **selecciona** el contrato → tipo **Plazo** → nuevo plazo (ej. +30 días), motivo: `Ampliación por lluvias`, fecha hoy.
- **Qué ver:** el convenio se registra y aparece en el **historial inmutable**.
- **Comprueba:**
  - El folio y nombre del contrato **no se teclean** (se derivan del seleccionado).
  - Intenta una variación **mayor al 25%** → ves el **aviso** (y si la mandas, el servidor la rechaza — tope configurable).
  - El historial **no se edita ni se borra** (inmutable).
  - Como residente/contratista/supervisión → solo lectura; como finanzas → sin acceso.
  - En "Versiones del programa" se ve el snapshot (solo lectura).

---

## Resumen de lo que más le importa al profe
1. **Validaciones del alta** (catálogo exacto, regla 100%, garantías, dependencia obligatoria) — paso 2.
2. **Folios y firmas inmutables** + fecha/hora en notas — paso 5.
3. **Inmutabilidad de la bitácora ante sustitución** + que la sustitución quede asentada — pasos 4 y 7.
4. **Ciclo estimación → envío → pago blindado** (neto del servidor, no doble pago, no pagar antes de estimar) — pasos 10–12.
5. **Carátula viva con retención y avance** + tope por periodo — paso 10.
6. **Convenios inmutables con aviso de tope** — paso 14.
7. **Todo lo que ya existe se SELECCIONA, no se teclea** (contrato, personas, estimación) — en todos los pasos.

> Nota: no toques "Anular nota" en la demo (pendiente de confirmar con el profe).
