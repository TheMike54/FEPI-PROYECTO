# Auditoría — "Selección vs. texto libre" de identificadores de entidades

**Alcance:** ¿dónde el usuario **TECLEA** el identificador/llave/nombre de una entidad que **YA EXISTE** (folio de contrato, llave/folio de estimación, nombre de persona que debería ser una cuenta, folio de nota de bitácora al vincular, clave de concepto) en vez de **SELECCIONARLA**?
**Base:** `origin/main` = `069a71d` (local). **Solo reporte — no se tocó código.** **Read-only.**
**Pantallas auditadas a fondo:** crear estimación (HU-12), crear/vincular nota (HU-09), sustitución de persona (HU-02), alertas (HU-07), expediente (HU-04). **Confirmadas en 1 línea:** pago (HU-21), alta contratista/dependencia (HU-01).
**Nivel 1 (ley):** las citas legales van con artículo o `[validar]`.

---

## Resumen ejecutivo

- **El patrón dominante es CORRECTO:** contrato, estimación, conceptos, notas, personas operativas (residente/superintendente/supervisión/dependencia) se **seleccionan** de listas, y el backend **revalida existencia + pertenencia + rol** server-side (no confía en el cliente). Los importes sensibles se **derivan** (no se teclean).
- **Los dos temores explícitos NO se materializan:**
  - **Folio/llave de estimación tecleado:** ❌ no ocurre. La estimación se crea sobre un contrato **seleccionado** (HU-12) y, para pagar, se **selecciona** la estimación (HU-21) — nunca se teclea su folio.
  - **Folio de nota de bitácora al vincular:** ❌ no ocurre. Vincular usa un **modal con buscador + checkboxes** (HU-09/HU-12), no captura del folio.
- **Hallazgo real (1):** **HU-02** tiene un *fallback* donde se **teclea el ID de la persona** (`sust-nuevo-id`) cuando la lista de elegibles queda vacía.
- **Endurecimiento defensivo (1):** **HU-09** valida que la nota destino existe, pero no comprueba **explícitamente** que sea de la **misma bitácora** (hoy es implícito).
- **Candidato `[validar]` con el profe (1):** **HU-01 jurídicos** (firmante/representante) son **texto libre** de nombres de personas.
- **Periférico, fuera del set (1):** **HU-03 convenios** captura "oficio" como texto libre (referencia a documento externo).

---

## Hallazgos (acción propuesta)

| # | Pantalla | Campo (`data-testid`) | Hoy | Riesgo de integridad / auditabilidad | Fix propuesto (selector + validación server-side de existencia) |
|---|---|---|---|---|---|
| **1** | **HU-02 Sustitución de persona** (`RosterContrato.jsx`) | **`sust-nuevo-id`** (ID de la persona) | **Texto libre** (`input type=number`), *fallback* cuando `elegibles.length === 0` (RosterContrato.jsx:~179-186). El caso normal sí es `select` (`sust-nuevo`). | **MEDIO→BAJO** (el backend mitiga). Si la lista queda vacía (sin cuentas elegibles o permisos), el usuario debe **teclear un ID**; riesgo de **confusión de identidad** y mala UX. La sustitución se asienta en `contrato_roster`/bitácora (art. 125 fr. I g) y su trazabilidad toca **art. 123 fr. VI** `[validar texto]`. | **Quitar el input numérico**: usar **siempre** selector/buscador de cuentas (rol correcto + `estado='activo'`); si no hay elegibles, mostrar **aviso** (no un input). Backend **ya valida**: existe (`roster.controller.js:~114`), activa (`:117`), rol correcto (`:118`) → conservar. |
| **2** | **HU-09 Vincular nota** (`bitacora.controller.js`) | (sin campo de UI: la nota destino se **selecciona**) | **Select** (modal+checkbox); backend valida que la nota destino **existe** (`vincularNota`, `WHERE id=$1` → 404, `:~620`). | **BAJO** (defensivo). No hay chequeo **explícito** de que la nota destino sea de la **misma bitácora** que la respuesta (hoy se deriva implícitamente de la apertura). Importa para la **trazabilidad de referencias** de la bitácora — **art. 123 fr. VI** `[validar texto]`. | Mantener la **selección** (correcta). Endurecer backend: `if (orig.bitacora_id !== apertura.id) return 400`. (Mejora, no bloqueante.) |
| **3** | **HU-01 Datos jurídicos** (`AltaContrato.jsx`, `TabJuridicos`) | `jur-firmante`, `jur-representante` (y `jur-cargo`, `jur-cedula`) | **Texto libre** (nombres tecleados). Se guardan en `datos_juridicos` (JSON) sin cruzar contra cuentas. | **MEDIO `[validar]`.** Son **nombres de personas**: el firmante de la dependencia y el representante legal **podrían** mapear a cuentas (dependencia/contratista). Si se teclean, no hay verificación cruzada → auditabilidad débil. **PERO** pueden ser, por diseño, referencias jurídicas externas distintas de las cuentas operativas. **Decisión de alcance/legal: del profe.** | **A confirmar con el profe:** si deben ser cuentas → `select` (firmante = cuenta `dependencia`; representante = cuenta `contratista`) + validar `usuario_id`/rol server-side. Si son referencias externas → dejar texto + validación de formato. **No tocar sin decisión.** |
| **4** | **HU-03 Convenios modificatorios** (`ConveniosModificatorios.jsx`) | `oficio` (referencia a documento) | **Texto libre** (backend dummy, sin persistencia real aún). | **BAJO/periférico** (fuera del set pedido). Es referencia a **documento externo**, no a una entidad interna seleccionable hoy. | Cuando se implemente: vincular a documento del **expediente/GED** o validar formato + existencia. Anotado para no perderlo. |

> **Sobre art. 123 fr. VI RLOPSRM:** lo cito como fundamento de la **auditabilidad/trazabilidad de las referencias** de la bitácora (hallazgos 1 y 2: que lo que se vincula/sustituye apunte a una entidad **real y verificable**, no a un identificador tecleado). El **texto literal de la fracción VI queda `[validar con el profe]`** — no se transcribe para no inventar la cita.

---

## Confirmado: YA es selección (correcto, sin acción)

| Pantalla | Campo | Hoy | Backend valida existencia (cita) |
|---|---|---|---|
| **HU-12** Integrar estimación | Contrato (`select-contrato`) | **Select** | Sí — `estimaciones.controller.js:~116-121` (existe + 403 si no es superintendente) |
| **HU-12** Integrar estimación | Conceptos / números generadores | **Autollenado** del catálogo; el usuario teclea solo **cantidades** (valor, no identificador) | Sí — `:~168-178` (el `contrato_concepto_id` pertenece al contrato) |
| **HU-12** Integrar estimación | Notas vinculadas | **Select** (modal + buscador + checkbox) | Sí — `:~193-206` (cada nota existe en la bitácora del contrato) |
| **HU-12** | Periodo (inicio/fin) | Fecha (valor libre legítimo, art. 54 LOPSRM) | N/A — no es identificador de entidad existente |
| **HU-09** Emitir nota | Contrato (`select-contrato`) · Tipo (`select-tipo`) | **Select** | Sí — `bitacora.controller.js` `cargarAperturaYRol` (apertura derivada + participación) |
| **HU-09** | `tag` / `asunto` / `contenido` | Texto libre **legítimo** (metadata; el folio lo genera el servidor) | N/A |
| **HU-07** Alertas | Contrato (`select-contrato`) · Concepto (`al-concepto`) | **Select** (catálogo del contrato) | Sí — `alertas.controller.js:~52-56` y `:~133-137` (`contratoPorConcepto` + `esParteOSupervision`) |
| **HU-07** | Umbral (`al-umbral`) · Canal (`al-canal-*`) | Número (%) / radio fijo `sistema` | N/A — valor, no identificador; canal validado por enum (`:~116-131`) |
| **HU-04** Expediente | Contrato (`select-contrato`) | **Select** | Sí (lectura por participación, `detalleContrato`) |
| **HU-04** | Buscador (`input-busqueda`) | Texto de **búsqueda legítimo** (filtra contenido ya cargado; no es captura de folio) | N/A |
| **HU-21** Registro de pago | Estimación (`pago-estimacion`) | **Select**; importe (`pago-importe-neto`) **derivado/solo-lectura** | Sí — `pagos.controller.js:~61-69` (estimación existe + pertenece al contrato + pagable; `registrado_por` del JWT `:~82`) |
| **HU-01** Alta | Contratista=superintendente (`select-superintendente`) · Dependencia (`dg-dependencia`) · Supervisión (`select-supervision`) | **Select** | Sí — `contratos.controller.js:~232-247` (existen + rol correcto + activos) |
| **HU-01** Alta | `dg-folio`, `concepto-clave`, `concepto-concepto` | Texto libre **legítimo** (identificadores **nuevos** que el usuario define; folio con `UNIQUE` en BD) | N/A — no son referencias a entidades preexistentes |

---

## Prioridad recomendada
1. **HU-02 `sust-nuevo-id`** → quitar el *fallback* numérico (único caso real de "teclear el ID de una entidad existente"). Bajo esfuerzo; el backend ya valida.
2. **HU-09** → chequeo explícito de misma-bitácora al vincular (endurecimiento de auditabilidad, art. 123 fr. VI).
3. **HU-01 jurídicos** → **decisión del profe** (¿cuentas o referencias externas?) antes de tocar.
4. **HU-03 oficio** → anotado para cuando se implemente convenios de verdad.

*Citas `file:línea` aproximadas (anclar por `data-testid`, que es exacto). Auditoría read-only sobre 069a71d; ningún archivo de producto modificado.*
