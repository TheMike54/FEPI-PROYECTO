# Guía de pruebas end-to-end — SIGECOP

**Estado:** `origin/main = 069a71d`, desplegado en Render. Cubre todo lo que ya está en producción: fundación (HU-00, 01, 02, 08, 09, 10, 12, 21 + endpoint de 03) y las dos primeras de Equipo 2 (HU-04, HU-07).

**Cómo leer esto:** orden de pasos → quién hace login → qué datos meter (de ejemplo, ya cuadran con las validaciones) → qué deberías ver → cómo compruebas que está bien. Los nombres de campo en pantalla pueden variar; te los doy por su función. **El truco para el profe:** mete datos malos a propósito para ver que el sistema te frena.

## Cuentas (todas con contraseña `Sigecop2026!`)
- `residente@sigecop.test` — crea contratos, abre bitácora, emite notas, crea estimaciones y alertas
- `contratista@sigecop.test` — es el **superintendente** (firma, parte del roster)
- `supervision@sigecop.test` — supervisión (firma, parte del roster)
- `dependencia@sigecop.test` — la dependencia contratante (parte contratante; **no firma** la bitácora)
- `finanzas@sigecop.test` — pagos
- `csilvasa@ipn.mx` — profe

> Las cuentas demo ya quedaron con **nombre y apellidos completos** (backfill del deploy `83e0a72`). Si registras una nueva, el sistema exige nombre + apellido (≥2 palabras).

## Datos de ejemplo del contrato (úsalos en el alta — ya cuadran exacto)
- **Clave:** OBRA-2026-001 · **Monto contratado:** $1,000,000.00 · **Anticipo:** 30% ($300,000)

**Conceptos (suman exacto $1,000,000):**

| Clave | Descripción | Unidad | Cantidad | PU | Importe |
|-------|-------------|--------|----------|------|-----------|
| C-001 | Preliminares | m² | 1000 | 200 | 200,000 |
| C-002 | Cimentación | m³ | 500 | 800 | 400,000 |
| C-003 | Estructura | m² | 800 | 500 | 400,000 |
|       |             |      |          | **Total** | **1,000,000** |

**Programa de obra (3 periodos; cada concepto suma su cantidad = regla del 100%):**

| Concepto | P1 | P2 | P3 | Σ |
|----------|-----|-----|-----|------|
| C-001 | 400 | 600 | 0 | 1000 |
| C-002 | 0 | 250 | 250 | 500 |
| C-003 | 0 | 300 | 500 | 800 |

- **Garantía de cumplimiento:** 10% ($100,000) · **Garantía de anticipo:** 30% ($300,000)

---

## Paso 1 — HU-00 Login
- **Quién:** `residente@sigecop.test` / `Sigecop2026!`
- **Qué ver:** entras a la app con el menú/rol de residente.
- **Comprueba:** (a) contraseña mal → te rechaza; (b) bien → entras; (c) ves solo lo que le toca al residente.

## Paso 2 — HU-01 Alta de contrato (+ catálogo + programa + roster)
- **Quién:** residente → "Alta / nuevo contrato".
- **Navegación:** lineal — solo avanzas con **Siguiente** cuando el paso está completo. (La pestaña "Registrados" sí es navegable siempre; la captura sigue bloqueada por pasos.)
- **Qué poner, por paso:**
  1. **Datos generales:** clave `OBRA-2026-001`, objeto/nombre, fechas inicio/fin, anticipo 30%.
     - **Contratista = se selecciona la cuenta del superintendente** (`contratista@sigecop.test`), ya no es texto libre.
     - **Dependencia = se selecciona de un `<select>`** de cuentas con rol dependencia (`dependencia@sigecop.test`). Es la parte contratante.
  2. **Catálogo de conceptos:** los 3 conceptos de arriba. El total debe dar **exacto $1,000,000**.
  3. **Programa de obra:** llena la matriz como la tabla (cada concepto suma su cantidad contratada).
  4. **Garantías:** cumplimiento $100,000 + anticipo $300,000 (obligatorias).
  5. **Datos jurídicos:** llena los obligatorios.
  6. **PDF firmado:** sube un PDF (obligatorio para guardar).
- **Qué ver:** al guardar, se limpia el formulario y te manda a **Registrados**; el contrato aparece ahí. **Por detrás, el alta llena el roster** (residente + superintendente + supervisión) dentro de la misma transacción.
- **Comprueba las validaciones (lo que busca el profe — métele datos malos a propósito):**
  - Catálogo que NO suma exacto → banner de error, no avanzas.
  - Programa de un concepto que no suma su cantidad → te frena (regla 100%).
  - Garantía que excede el contrato → bloqueada.
  - Falta PDF / jurídicos / garantías → no guarda.
  - **Falta seleccionar dependencia** → no guarda (400).
  - "Ver info" de un contrato registrado → **solo lectura**.
  - **Anticipo >30%:** crea otro con anticipo 35% → debe exigir PDF de anticipo obligatorio.

## Paso 3 — HU-02 Sustitución de personas (roster)
- **Quién:** residente, en `/contratos/roster` (o la vista de roster del contrato OBRA-2026-001).
- **Qué ver:** el roster vigente del contrato — residente, superintendente, supervisión.
- **Qué hacer:** sustituye al superintendente por otra cuenta de rol contratista (motivo + fecha).
- **Comprueba (esto es lo fuerte para el profe):**
  - El registro es **append-only**: la persona anterior NO se borra, queda en el historial; la nueva pasa a vigente.
  - **La bitácora es inmutable:** las notas/firmas previas conservan al firmante original (la sustitución NO reescribe quién firmó). Mira una nota firmada antes de sustituir y confirma que sigue mostrando al firmante original.
  - No puedes dejar dos personas vigentes en el mismo rol (lo frena el CHECK).

## Paso 4 — HU-08 Apertura de bitácora
- **Quién:** residente, en el contrato OBRA-2026-001, abre la bitácora.
- **Qué ver:** se crea la **nota #1 = apertura**, con fecha y datos mínimos.
- **Comprueba:** no puedes abrir la bitácora dos veces (candado server-side); la apertura es la nota #1.

## Paso 5 — HU-09 Notas de bitácora (+ firmas)
- **Quién:** residente emite; luego supervisión / contratista firman.
- **Qué poner:** crea una nota (de un tipo permitido para residente) con sus datos mínimos.
- **Qué ver:** la nota aparece con folio correlativo, su tipo, y estado "pendiente de firma".
- **Firmas:** entra como cada rol del roster (residente + superintendente/supervisión) y firma. Cuando todos firman → la nota pasa a **"Firmada"**.
- **Comprueba:** folio correlativo e inmutable; un rol no puede emitir un tipo que no le toca; una vez firmada no se edita.
- ⚠️ **Para la demo con el profe NO uses "Anular" / "Eliminar nota"** aunque hoy todavía aparezcan. El profe pidió quitarlos (la ley no permite alterar la bitácora, **art. 123 fr. VI RLOPSRM** — una corrección se hace con una nota nueva que referencia a la anterior). Es corrección **pendiente de Equipo 2**.

## Paso 6 — HU-10 Consulta de notas
- **Quién:** cualquiera con acceso al contrato.
- **Qué ver:** el listado de notas de la bitácora.
- **Comprueba:** la búsqueda por tag filtra; ves la apertura + las notas que creaste.

## Paso 7 — HU-04 Consulta integrada del expediente (Equipo 2)
- **Quién:** entra con cada rol que solo consulta — `contratista`, `supervision`, `dependencia`.
- **Qué hacer:** abre la consulta de expediente → **selecciona el contrato** OBRA-2026-001.
- **Qué ver:** carga el expediente (aparece el buscador), con el aviso **"solo consulta"**.
- **Comprueba:** es **solo lectura** — no hay botones de crear/editar/borrar; sin contrato seleccionado no carga nada; no aparece aviso de error al cargar.

## Paso 8 — HU-07 Alertas de atraso (Equipo 2)
- **Quién:** residente (escribe) y supervisión (solo lee).
- **Qué hacer (residente):** abre alertas de atraso → **selecciona el contrato** → elige concepto + umbral → **crear alerta**.
- **Qué ver:** la alerta se evalúa **en el servidor** comparando avance físico vs. lo planeado; si el concepto va atrasado, la alerta dispara.
- **Comprueba:**
  - Como **residente**: campos de concepto/umbral habilitados + botón crear visible; la alerta se crea y se ve.
  - Como **supervisión**: el mismo panel pero en **solo lectura** (campos deshabilitados, sin botón de crear) + aviso "solo consulta".
  - Sin contrato seleccionado, no aparecen los campos (hay que elegir contrato primero).
  - Una cuenta que no es parte ni supervisión del contrato no puede crear ni ver sus alertas (permiso por participación).

## Paso 9 — HU-12 Estimación (núcleo)
- **Quién:** residente.
- **Qué poner:** estimación del contrato OBRA-2026-001, **periodo 1**, volumen ejecutado **C-001 = 400 m²** (se captura en la pestaña "Números generadores", no en la carátula). Periodo máximo de una estimación = 1 mes (**art. 54 RLOPSRM**).
- **Qué ver — la carátula (calculada en el servidor):**
  - Importe bruto = 400 × 200 = **$80,000**
  - Amortización anticipo 30% = **$24,000** (**art. 138 RLOPSRM**)
  - 5 al millar (0.5%) = **$400** (**art. 191 LFD**)
  - **Neto a pagar = $55,600**
- **Comprueba:**
  - Los 4 números coinciden con la cuenta de arriba.
  - **Tope por periodo (ya activo):** intenta capturar **C-001 = 500** en el periodo 1 (planeado P1 = 400) → **te frena** (no puedes estimar más de lo planeado del periodo; art. 45-A-X / 52).
  - La carátula muestra **acumulados y saldos** (lo estimado antes, lo de esta estimación, y lo que queda por estimar).

## Paso 10 — HU-21 Pago
- **Quién:** `finanzas@sigecop.test`.
- **Qué hacer:** registra el pago **seleccionando la estimación** del paso 9 (ya no es texto libre).
- **Qué ver:** el importe del pago = el **neto $55,600** (lo trae el servidor, es de solo lectura); al pagar, la estimación pasa a **"pagada"**.
- **Comprueba (ciclo endurecido):**
  - **No puedes editar el importe** (viene del servidor).
  - **No puedes pagar dos veces la misma estimación** (te lo bloquea).
  - El PDF/carátula del pago se genera del lado del servidor (no a mano).
  - Una vez registrado, el pago es inmutable.

---

## Lo que NO se prueba aquí (todavía)
- **HU-03 convenios modificatorios:** el **endpoint y la migración ya están** (fundación); la **UI la hace Equipo 3**, así que aún no hay pantalla para probar el flujo completo.
- **HU-13–20 (revisión/aprobación/reportes de estimaciones):** son de Equipo 3, pendientes.
- **HU-14 historial:** Equipo 3 la está reentregando.

## Recordatorios
- El orden importa: sin contrato (paso 2) no hay roster, bitácora, estimación ni pago.
- Lo que más pesa para el profe: las **validaciones del paso 2** (catálogo exacto, regla 100%, garantías, dependencia obligatoria), los **folios/firmas inmutables del paso 5**, la **inmutabilidad de la bitácora ante sustitución (paso 3)** y el **ciclo estimación→pago blindado (pasos 9–10)**. Pruébalos metiendo datos malos a propósito.
- **Para la demo: no toques "Anular"/"Eliminar nota"** (paso 5) — está pendiente de quitarse.
