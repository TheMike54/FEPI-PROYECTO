# Alta-v5 — Navegación LINEAL en la captura + garantías y datos jurídicos OBLIGATORIOS — Entregable para Maiki

**Fecha:** 2026-06-03 · **Autor:** Claude Code (Fundación) · **Base:** working tree sobre `0853e0c` (con el
endurecimiento de gating sin commitear ya presente — **conservado**). **Disciplina / Nivel 1:** construido y
probado en **LOCAL**; **sin commit / push / deploy, `main` intacto**. Ley **literal** citada con fracción; lo
interpretativo va como `[validar]`. Code **no es abogado**.

> **Patch incremental:** `docs/ALTA_v5_NAV_LINEAL_DIFFS.patch` (8 archivos: 1 nuevo + 7 modificados). Aísla **solo**
> el delta de v5 (se diffeó contra un snapshot del árbol previo, así que **no** incluye el endurecimiento ya hecho
> ni el `Historias_Usuario.xlsx` ajeno). Verificado: `git apply -R --check` **limpio** = es exactamente el delta v5.

---

## 0. Qué se cambió (de raíz) y qué se conservó

| # | Pedido | Estado |
|---|---|---|
| 1 | **Navegación SOLO lineal durante la captura.** Los NOMBRES de las pestañas **no navegan**; solo «Siguiente» (valida el paso actual) y «Atrás». Se **elimina** el mecanismo de clic-en-pestaña para gating (se acabó el "desbloqueo progresivo" clicable). | ✅ |
| 2 | Los nombres se vuelven **clicables SOLO** cuando la captura está **completa y válida** (todos los pasos + **PDF firmado** cargado); en ese estado, salto/revisión libre por nombre. | ✅ |
| 3 | **Garantías obligatorias:** fianza de **cumplimiento** siempre; fianza de **anticipo** solo si %anticipo>0. Campos requeridos por póliza. | ✅ |
| 4 | **Datos jurídicos obligatorios** (mínimo de formalización). | ✅ |
| — | **CONSERVADO:** `irAPaso` (Siguiente/Atrás + el hardening de la regresión), el **reset+redirect al guardar** (Bug 1), el **PDF firmado obligatorio** y el **PDF de anticipo > umbral obligatorio** (alta-v4). | ✅ |
| — | **NO tocado:** login / permisos / contrato-core (backend) / A2 / estimación / bitácora. Cero archivos de zona congelada. | ✅ |

**Cómo se verificó (raíz):** además del diseño, corrí una **auditoría adversarial multi-agente** (3 lentes:
fugas de gating, exactitud de citas legales vs. el texto literal, cobertura de pruebas) — ver §6.

---

## 1. Navegación SOLO lineal durante la captura (cambio de RAÍZ)

**Por qué era la fuente de fugas:** el modelo anterior (alta-v2…v4) navegaba con `onTabChange = irAPaso` y
"abría" pestañas vía un `Set tabsBloqueados` calculado de una **frontera de desbloqueo progresivo**
(`pasoMaxAlcanzado + 1`, `primerPasoInvalido`, `fronteraAccesible`). Cada iteración de esa lógica reintrodujo
huecos (cascada, salto a no-alcanzadas, asimetría save-vs-advance, estado obsoleto). **Se elimina la clase
entera**: ya no hay navegación por clic-en-nombre durante la captura.

**Modelo nuevo (en `AltaContrato.jsx`):**

```js
// captura completa = TODOS los pasos válidos (primerPasoInvalido > ULTIMO) Y PDF firmado presente.
const capturaCompleta = (primerPasoInvalido > ULTIMO_PASO_WIZARD) && (!!pdfFirmadoFile || !!contratoGuardadoId);

// Durante la captura: TODAS las pestañas salvo la activa quedan deshabilitadas (los nombres no navegan).
// Con la captura completa: NINGUNA (salto/revisión libre por nombre).
const tabsBloqueados = () => { if (capturaCompleta) return new Set();
  /* añade i !== tabActivo para i en 0..ULTIMO+1 */ };

// Click en el NOMBRE: NO navega durante la captura (defensa redundante con tabsBloqueados); libre si completa.
const clicNombrePestaña = (target) => { if (!capturaCompleta) return; setErrores(ERR0); setErrorWizard(null); setTabActivo(target); };
```

- `<Tabs … onTabChange={clicNombrePestaña} …>` (antes `irAPaso`). **«Siguiente»/«Atrás» siguen llamando a
  `irAPaso` directamente** (validador), que **no se tocó** (conserva el hardening de la regresión).
- **Doble candado** en cada nombre: el botón de la pestaña queda `disabled` (vía `tabsBloqueados`) **y**
  `clicNombrePestaña` hace no-op si `!capturaCompleta`. Imposible navegar por nombre durante la captura.
- **`Tab.jsx`** recibe un prop **opcional aditivo** `tituloBloqueado` (tooltip exacto: "Durante la captura
  navega con «Siguiente» y «Atrás»…"). Las otras 3 vistas que usan `Tabs` no lo pasan → comportamiento intacto.
- **Regreso al wizard desde "Registrados":** como los nombres no navegan en captura, se añadió el botón
  **`+ Capturar nuevo contrato`** (`data-testid="btn-nueva-alta"`) en la pestaña Registrados → `resetFormulario()` + ir al paso 0.

Resultado: durante la captura el avance es **estrictamente** «Siguiente» (valida el paso actual) / «Atrás»; los
nombres recién navegan cuando **todo** está completo + el **PDF firmado** está cargado. **No hay forma de saltar
pestañas.**

---

## 2. Garantías obligatorias — cita literal del mínimo exigible

**Fuente:** `docs/LOPSRM.pdf` (Última Reforma DOF 14-11-2025) y `docs/Reg_LOPSRM.pdf` (RLOPSRM, DOF 24-02-2023).

### 2.1 Fianza de CUMPLIMIENTO — obligatoria SIEMPRE

> **Art. 47 LOPSRM (literal):** *"No podrá formalizarse contrato alguno que no se encuentre garantizado de
> acuerdo con lo dispuesto en la **fracción II del artículo 48** de esta Ley."*

> **Art. 48 LOPSRM (literal):** *"Los contratistas que celebren los contratos a que se refiere esta Ley deberán
> garantizar: … **II. El cumplimiento de los contratos.** Esta garantía deberá presentarse en la fecha y lugar
> establecidos en la convocatoria de la licitación o en su defecto, dentro de los quince días naturales
> siguientes a la fecha de notificación del fallo."*

⇒ Sin fianza de cumplimiento **no puede formalizarse** el contrato ⇒ **obligatoria** en el alta.

### 2.2 Fianza de ANTICIPO — obligatoria SI hay anticipo (>0)

> **Art. 48 fr. I LOPSRM (literal):** *"**Los anticipos que reciban.** Estas garantías deberán presentarse en la
> fecha y lugar establecidas en la convocatoria a la licitación o en su defecto, dentro de los quince días
> naturales siguientes a la fecha de notificación del fallo y **por la totalidad del monto de los anticipos**, y"*

⇒ Coherencia con el % de anticipo: **si %anticipo = 0/vacío** no se exige; **si > 0** se exige la fianza de
anticipo. (El **PDF de autorización** del anticipo sigue exigiéndose por encima del umbral del 30%, sin cambios
respecto a alta-v4; nota: el 30% coincide con el tope ordinario del **art. 50 fr. II LOPSRM** — *"hasta un treinta
por ciento"*; el % exacto del umbral y su fundamento siguen `[validar]`.)

### 2.3 Vicios ocultos — NO obligatoria al alta

> **Art. 66 LOPSRM (literal):** *"…**previamente a la recepción de los trabajos**, los contratistas, a su
> elección, deberán constituir fianza por el equivalente al **diez por ciento** del monto total ejercido…"*

⇒ Es **post-recepción** de la obra, no del alta. Se ofrece el tipo "Vicios ocultos" en el selector pero **no se
exige** al dar de alta. `[validar]` si la dependencia quiere registrarla anticipadamente.

### 2.4 Campos requeridos por póliza

El usuario fijó el conjunto: **tipo, afianzadora, no. de póliza, monto, vigencia**. Apoyo legal de que la póliza
debe contener previsiones mínimas (incl. vigencia):

> **RLOPSRM art. 98 fr. I (literal):** *"La póliza de la fianza deberá contener como mínimo las siguientes
> previsiones: … c) Que la fianza permanecerá vigente durante el cumplimiento de la obligación que garantice…"*

**Implementación (`validarPaso(4)`):** por cada póliza no vacía se exige tipo + afianzadora + no. póliza + monto>0
+ vigencia, monto ≤ monto del contrato, y **sin tipos duplicados** (la BD tiene `UNIQUE(contrato_id, tipo)` en
`contrato_garantias` — zona congelada, **no se tocó**). Luego se exige la presencia de la **fianza de
cumplimiento** y, si %anticipo>0, la **de anticipo**. El campo `tipo` pasó de texto libre a **`<select>`** con
valores canónicos cortos (`Cumplimiento`, `Anticipo`, `Vicios ocultos`, `Otra`, todos ≤ 40 chars = el límite de
la columna). Indicador en vivo `garantias-requeridas` (rojo `garantias-faltan` / verde `garantias-ok`).

---

## 3. Datos jurídicos obligatorios — cita literal del mínimo

Antes el paso 3 era `{ ok: true }` (opcional). Ahora `validarPaso(3)` exige `REQ_JURIDICOS`.

| Campo | Estado | Fundamento literal |
|---|---|---|
| **Representante legal del contratista** | **Obligatorio** | **Art. 46 fr. IV LOPSRM:** *"Acreditación de la existencia y personalidad del licitante adjudicado."* + **RLOPSRM art. 61 fr. VI-b)/VII:** *"Del representante legal del licitante: datos de las escrituras públicas en las que le fueron otorgadas las facultades de representación…"* / *"…las facultades de su representante para suscribir el contrato correspondiente."* |
| **Firmante de la dependencia + cargo** | **Obligatorio** | **Art. 46 fr. I LOPSRM:** *"El nombre, denominación o razón social de la **dependencia o entidad convocante** y del contratista."* + art. 47/48 LOPSRM (el contrato lo firma *"la persona servidora pública facultada para firmar el contrato"*). La granularidad "cargo" es razonable; `[validar]` fino. |
| **Cédula profesional** del responsable técnico | **Obligatorio (por decisión de la Fundación)** | `[validar]` — **LOPSRM/RLOPSRM federal NO la exigen al alta**; el DRO/responsable deriva de **reglamentos de construcción locales** y de la responsabilidad profesional. Se exige porque lo pediste, marcándolo `[validar]` con el profe. |
| **No. de poder notarial / Notaría** | **Opcionales** | Una de varias formas de acreditar la personalidad (RLOPSRM art. 61 fr. VI-b menciona escrituras públicas, pero no son el único medio). `[validar]`. |

Se marcan con `*` y borde rojo al fallar; data-testids `jur-firmante`, `jur-cargo`, `jur-representante`,
`jur-cedula`, `jur-poder`, `jur-notaria`. El backend guarda `datos_juridicos` como **JSONB libre** ⇒ la
obligatoriedad es 100% frontend, **sin tocar backend**.

---

## 4. Lista `[validar]` (interpretativo/legal — NO auto-decidido, Nivel 1)

| # | Punto | Por qué `[validar]` |
|---|---|---|
| 1 | **Cédula profesional** obligatoria al alta | Sin base en LOPSRM/RLOPSRM federal (deriva de reglamentos locales / responsabilidad profesional). Se exige por decisión de producto; el profe confirma. |
| 2 | **Poder notarial / Notaría** opcionales | La acreditación de personalidad admite otras formas (acta constitutiva, etc.); no se fuerza un único medio. |
| 3 | **Umbral del 30%** para exigir el PDF de autorización del anticipo | Heredado de alta-v4; el % exacto lo confirma el profe (coincide con el tope ordinario del art. 50 fr. II, pero el knob es de producto). |
| 4 | **Monto exacto** de las fianzas | La ley fija porcentajes (cumplimiento típicamente 10% — art. 66; anticipo por la totalidad — art. 48 fr. I). Aquí solo se exige `monto > 0` y `≤ monto del contrato`; **no** se fuerza el % exacto (lo valida el profe). |
| 5 | **Excepción del art. 48, último párrafo** (servidor público facultado puede exceptuar la garantía de cumplimiento en los casos de los arts. 42 fr. IX/X/XV y 43) | No se implementa: el default seguro es exigir cumplimiento siempre; la excepción es un flujo avanzado. `[validar]`. |
| 6 | **Garantía con vigencia vencida** | Sigue como advertencia (`⚠`), no bloquea (heredado de alta-v4): si una fianza vencida al registrar debe impedir el alta es interpretativo. `[validar]`. |

---

## 5. Pruebas (LOCAL, verde)

| Capa | Resultado |
|---|---|
| `vite build` | ✅ 465 módulos, **EXIT 0** |
| **Specs de alta** (v5 + v4 + regresión + 4x + hu-01 + a2) | ✅ **26/26** |
| **Suite e2e completa** | ✅ **148 passed · 8 skipped (los 8 fixme, sin empeorar) · 0 failed** (baseline 141 → **+7** por el spec nuevo) |

**Spec nuevo `frontend/e2e/alta-v5-navegacion-lineal.spec.js`** (login real) — cubre los 5 escenarios pedidos:
- **(1)** durante la captura, clic en un NOMBRE de pestaña NO navega (todas deshabilitadas salvo la activa, incl.
  pasos ya visitados); solo «Atrás»/«Siguiente» mueven.
- **(2)** los nombres se habilitan **SOLO** con todo válido + **PDF firmado** cargado (antes del PDF siguen
  deshabilitados; tras el PDF, clic en "Datos generales" navega y se puede volver al PDF a guardar).
- **(3a)** no se avanza con **jurídicos vacíos** (banner + sigue en el paso + sin Guardar); **(3b)** no se avanza
  con **garantías vacías** (falta cumplimiento); **(3c)** con **anticipo>0** se exige además la fianza de anticipo.
- **(4)** el guardado **redirige a Registrados, limpia y re-bloquea** (lineal); "Capturar nuevo contrato" reinicia.
- **(5)** **"Guardar" NUNCA aparece** en los pasos 0–4; solo en el paso 5 (PDF), deshabilitado sin el PDF.

**Specs existentes actualizadas** al nuevo modelo (helpers `altaLlenarJuridicos`/`altaLlenarGarantias`; reescritura
de los tests de "desbloqueo progresivo" de alta-v4 → modelo lineal; clic-en-nombre → «Atrás»/`btn-nueva-alta`).
**No-regresión:** login, bitácora, estimación, pago, reportes, etc. → todo verde.

---

## 6. Auditoría adversarial (3 lentes)

Red-team multi-agente (3 lentes en paralelo) sobre el código + specs + texto literal de los PDFs:

- **Citas legales — veredicto `ok`:** verificó cada cita (arts. 46-I/IV, 47, 48-I/II, 50-II, 66 LOPSRM; RLOPSRM
  61-VI/VII, 98-I) contra el **texto literal** extraído de los PDF. **Sin hallazgos**: todas correctas y no exageradas.
- **Fugas de gating:** levantó 2 hallazgos "alta" que, revisados, son **falsos positivos**:
  1. *"Garantía con monto vacío se cuela"* — **no aplica**: `garantiaVacia` devuelve `false` para una fila con `tipo`
     puesto (no la "salta"); el bucle de `validarPaso(4)` la valida y `if (!(Number(g.monto) > 0))` la rechaza, y
     `tieneCumplimiento` exige `polizaCompleta` (monto>0). El ataque está bloqueado en 3 capas (paso, validez global, `validar()`).
     **Aun así** apliqué su mejora defensiva: el payload del guardado ahora filtra por `polizaCompleta` (no solo `!garantiaVacia`).
  2. *"clic-en-nombre sin deshabilitar visualmente"* — **no aplica**: `tabsBloqueados` deshabilita TODAS las pestañas
     no-activas cuando `!capturaCompleta` (Tab.jsx pone `disabled`); el `return` de `clicNombrePestaña` es la 2ª capa.
  - Hallazgos "media" #5 y #6 (race de closure en `irAPaso`; estado intermedio del reset) parten de una versión
    **desactualizada** del modelo (suponen que `tabsBloqueados` aún depende de `pasoMaxAlcanzado` — ya no): `tabsBloqueados`
    se computa de `capturaCompleta`. Además tocan el `irAPaso`/reset **conservados** (fuera de alcance). React 18 batchea los `setState` del handler.
- **Cobertura de pruebas:** 3 mejoras válidas, **aplicadas**: (1) el test (1) ahora **fuerza** `dispatchEvent('click')`
  sobre un nombre y verifica que NO navega (prueba de comportamiento, no solo del atributo `disabled`); (2) el test (4)
  asercta `btn-siguiente` visible tras `btn-nueva-alta` (de vuelta en captura, paso 0); (3) `(3b)` afina el match a
  `'fianza de CUMPLIMIENTO'`.

---

## 7. Archivos tocados

**Código (2):**
- `frontend/src/pages/AltaContrato.jsx` — modelo de navegación lineal (`capturaCompleta`, `tabsBloqueados`,
  `clicNombrePestaña`; se quitaron `fronteraAccesible`/`pasoAccesible`); `validarPaso(3)` jurídicos obligatorios;
  `validarPaso(4)` garantías obligatorias + tipo `<select>` + indicador; `tabsConError` (+3, +garantías);
  botón `btn-nueva-alta`. **`irAPaso`, el reset+redirect y los gates de PDF se conservan.**
- `frontend/src/components/ui/Tab.jsx` — prop opcional aditivo `tituloBloqueado` (retrocompatible).

**Pruebas (6):**
- `frontend/e2e/alta-v5-navegacion-lineal.spec.js` — **NUEVO**, los 5 escenarios.
- `frontend/e2e/_helpers.js` — `altaLlenarJuridicos`, `altaLlenarGarantias`.
- `frontend/e2e/alta-v4-gating.spec.js` — `irAGarantias` llena jurídicos; (b)/(c) reescritos al modelo lineal.
- `frontend/e2e/4x-alta-correcciones.spec.js` — llena jurídicos/garantías en los flujos que cruzan esos pasos.
- `frontend/e2e/alta-gating-regresion.spec.js` — test 2 llena jurídicos/garantías + usa `btn-nueva-alta`.
- `frontend/e2e/hu-01-alta-catalogo.spec.js` — «Atrás» en vez de clic-en-nombre; llena jurídicos/garantías; `btn-nueva-alta`.

**NO se tocó:** backend (contratos.controller, schema.sql, …), App.jsx, permisos.js, SesionContext, A2,
estimación, bitácora, ni las HU prototipo.

---

## 8. Disciplina

- **`main` intacto:** `HEAD = 0853e0c`, **sin commits / staged**. El endurecimiento de gating sin commitear (la
  regresión) se **conservó** (no se revirtió ni re-incluyó en el patch v5).
- **Zona congelada tocada: NINGUNA.** `datos_juridicos` (JSONB) y `contrato_garantias` (con su `UNIQUE`) ya
  soportan el cambio sin tocar el backend.
- **Sin commit / push / deploy.** Entregables nuevos: `docs/ALTA_v5_NAV_LINEAL_*`.

*Fin. Patch: `docs/ALTA_v5_NAV_LINEAL_DIFFS.patch`. Probado en local: build OK, alta 26/26, suite 148/8-skip/0-fail.
Lo legal y los umbrales, `[validar]` con el profe.*
