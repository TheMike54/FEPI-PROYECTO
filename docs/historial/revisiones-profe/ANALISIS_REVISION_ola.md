# Análisis de la revisión de Maiki (`docs/historial/revisiones-profe/ola.docx`) contra el código real

> **Insumos:** `docs/historial/revisiones-profe/ola.docx` (hallazgos de Maiki, organizados contra
> `docs/contexto-claude/PLAN_PRUEBAS_VALORES.md`) +
> `docs/historial/revisiones-profe/SIGECOP — Sistema de Gestión de Contratos de Obra Pública.pdf` (PDF del expediente exportado como
> evidencia). **Solo lectura + análisis. NO se tocó código, sin commit/push.**
>
> **Regla de lectura del Word (Maiki):** los puntos del plan que **NO** aparecen en el Word funcionaron bien;
> los que SÍ aparecen son errores/preguntas. Lo que Maiki marcó **"verde"** (§3.1, §3.2, §3.3, "la mayoría
> verde") se confirma OK y **no se analiza**.
>
> **Convención zona congelada (CLAUDE.md):** marco cada fix como 🟢 **SEGURO** (fuera de zona congelada) o
> 🔴 **TOCA CONGELADO** (solo Maiki, vía PR). No arreglo nada aquí: esto es para que decidas qué se corrige.

---

## Resumen ejecutivo (prioridad: bugs reales primero)

| # | Punto del Word | Tipo | Fix |
|---|---|---|---|
| P1 | Cuenta de contratista nueva no aparece para sustituir (roster) | **BUG real** | 🔴 toca congelado (`usuarios.routes.js`) |
| P2 | Apertura de bitácora: "ver documento" sale *pendiente de firmar* + nota #1 **duplicada** + botón firmar persiste | **BUG real (cluster, frontend)** | 🟢 seguro |
| P3 | PDF expediente: "Total neto estimado" **doble-cuenta** la rechazada + su reingreso | **BUG real (display)** | 🟢 seguro |
| P4 | ¿No debería crearse una nota de bitácora automática al integrar/presentar/autorizar estimación? | **Brecha con fundamento legal** (recomendable) | 🟢 seguro (si se cabletea en presentar/autorizar) |
| P5 | Integración de estimación: el periodo se teclea a mano; mejor un selector de periodos | **Mejora UX (gap real)** | 🟢 seguro |
| P6 | Captura de generadores: falta columna con la **clave** del concepto | **Mejora menor** | 🟢 seguro |
| P7 | Jurídicos: firmante/representante son texto libre; ¿ligarlos a las cuentas? | **Mejora / [validar profe]** | 🟢 seguro |
| P8 | Datos generales: deja poner **fecha de inicio anterior a hoy** | **[validar profe] / falta regla** | 🟢 cliente · 🔴 servidor |
| P9 | Quitar el **buscador** "contrato, nota, estimación" de la barra superior | **Mejora UI (cosmético)** | 🟢 seguro |
| P10 | Junto a la **campanita**, poner algo que lleve a "Por firmar" | **Mejora UI** | 🟢 seguro |
| P11 | Jurídicos: la **cédula** "no se exige, agrégala (la pidió el profe)" | **NO es bug — ya se exige** | n/a (cerrar `[validar]`) |
| P12 | (PDF) Periodos del programa no se regeneran tras convenio de plazo | **Brecha conocida** (ya documentada) | — |

> **P-extra:** "Nota: quedó pendiente lo de cambio de persona" → es **consecuencia de P1** (no pudo completar
> la sustitución porque el selector salía vacío). El PDF lo confirma: "0 sustitución(es) registrada(s)".

---

## Detalle por punto

### 🔴 P1 — Cuenta de contratista nueva NO aparece para sustituir (BUG real)

**Word:** *"Paso 13 creé una nueva cuenta de contratista, pero no me aparece para elegirlo para sustitución; a la dependencia sí le aparece… y ya hasta inicié sesión con esa cuenta nueva."*

**Qué dice el código:**
- La página `/contratos/roster` es accesible a **`['dependencia','residente']`** — `App.jsx:100`.
- El selector "nueva persona" carga candidatos así (`RosterContrato.jsx:67-75`): para el slot **superintendente** llama `api.listarAsignables('contratista')`; para **residente** llama `api.listarUsuarios('activo')`. Ambas con `.catch(() => [])` → **si la petición falla, el selector queda vacío sin avisar**.
- `GET /usuarios/asignables` está gateado **`requireRole('residente')`** (`usuarios.routes.js:16`).
- TODO lo demás de ese router (incl. `GET /usuarios/`) está gateado **`requireRole('dependencia')`** (`usuarios.routes.js:19`).
- El filtro del candidato es correcto: `WHERE u.rol=$1 AND u.estado='activo'` (`usuarios.controller.js:46-52`).
- Login exige `estado='activo'` (`auth.controller.js:48`) → la cuenta nueva, como Maiki pudo iniciar sesión, **está activa**; y al aprobar se asigna `rol` + `estado='activo'` (`usuarios.controller.js:75-81`).

**Diagnóstico (causa raíz):** **gating de rol CRUZADO.** La página la abren dependencia **o** residente, pero cada fuente de candidatos está gateada al rol **contrario**:
- Si Maiki abrió el roster como **dependencia** y sustituía al **superintendente** → `listarAsignables('contratista')` responde **403** (dependencia no es residente) → `.catch` → lista vacía → "no me aparece" (de hecho **no aparece ninguno**).
- Espejo: como **residente**, el slot **residente** usa `listarUsuarios` (`/usuarios/`, solo dependencia) → 403 → vacío.

Es decir, según quién entre, **una de las dos fuentes siempre cae en 403 silencioso**. No es que la cuenta esté mal: es el gate. (Causa secundaria a descartar con SQL: que al aprobarla la dependencia le pusiera un `rol` distinto a `contratista`.)

**Acción recomendada:** alinear el gate del endpoint de candidatos con quién usa la pantalla (permitir `residente` **y** `dependencia` en `/usuarios/asignables`, y exponer un listado de residentes asignables a la dependencia). 🔴 **TOCA CONGELADO** (`usuarios.routes.js` / `usuarios.controller.js`) → lo decide/integra Maiki. Mitigación menor 🟢: que `RosterContrato.jsx` muestre el 403 en vez de tragárselo con `.catch(()=>[])` (deja de ser "silencioso").
**Verificación rápida (SQL):** `SELECT rol, estado FROM usuarios WHERE email='<cuenta nueva>';` → confirmar `rol='contratista'`, `estado='activo'`.

---

### 🟢 P2 — Apertura de bitácora: documento "pendiente", nota #1 duplicada, botón firmar persiste (BUG real, frontend)

**Word:** *"En la nota de apertura ya firmé como supervisión y contratista y me sigue apareciendo el botón de firmar… cuando le doy a 'ver como documento' aparece como pendiente de firmar y aparte aparece doble."*

Son **tres síntomas** del mismo módulo (`EmisionNotas.jsx` + `DocumentoNota.jsx`):

1. **Nota #1 duplicada (BUG claro).** La apertura se pinta en DOS lugares: en el panel dedicado `data-testid="apertura-nota"` (`EmisionNotas.jsx:288-313`) **y otra vez** dentro del libro al expandir "Ver bitácora" (`EmisionNotas.jsx:376-386`, `{notaApertura && NotaCard(notaApertura)}`). `notaApertura` se deriva de `notas.find(tipo==='apertura')` (`:179-181`) y se renderiza dos veces.
   → **Fix:** excluir la apertura del libro (ya tiene su panel), o no pintar el panel cuando el libro está abierto. 🟢 frontend puro.

2. **"Ver como documento" sale pendiente de firmar (BUG).** La nota de apertura tiene `firmado_en = NULL` por diseño (su firma es la **conjunta**, en `bitacora_firmantes`, no en `bitacora_nota_firmas`) — ver `bitacora.controller.js:164-167`. Pero `DocumentoNota.jsx:29-34` arma los firmantes desde `nota.firmado_en` (NULL) y `nota.firmas` (vacío) → la tabla muestra "Pendiente" para todos (`DocumentoNota.jsx:96`). **No recibe `apertura_firmantes`** (que el backend SÍ devuelve en `construirPayloadNotas`, `bitacora.controller.js:606-613`).
   → **Fix:** cuando `nota.tipo==='apertura'`, pasar/usar `apertura_firmantes` (firmado/firmado_en por rol) en `DocumentoNota`. 🟢 frontend puro.

3. **Botón "Firmar apertura" persiste (parcialmente real / parcialmente percepción).** El botón se muestra si `miFirmaAperturaPendiente` (`EmisionNotas.jsx:67`, = "mi usuario aún no firmó"). `firmarApertura` SÍ re-consulta (`await cargarNotas(...)`, `:155-165`), así que para **el propio usuario** debería ocultarse tras firmar. Lo que Maiki ve como "sigue apareciendo" se explica por (a) si está viendo como el **residente** que aún NO firmó (las 3 partes deben firmar: residente, superintendente, supervisión), el botón es correcto; y (b) el síntoma #2 (documento "pendiente") da la falsa impresión de que su firma no quedó. 
   → **Fix:** prioritario resolver #1 y #2; verificar que tras firmar, el botón desaparece para ese usuario (el re-fetch ya existe). 🟢 frontend.

**Diagnóstico:** bug de **presentación** (frontend), datos del backend correctos. No toca zona congelada (`EmisionNotas.jsx`, `DocumentoNota.jsx`, `components/notas/`).

---

### 🟢 P3 — PDF del expediente: "Total neto estimado" doble-cuenta la rechazada + reingreso (BUG de display)

**Evidencia (PDF, pág. 4):** #1 Pagada $69,500 · #2 **Rechazada** $330,125 · #3 **Presentada** $330,125 · **Total neto estimado $729,750.00**.

**Qué dice el código:** `ConsultaExpediente.jsx:437` → `const totalNeto = filas.reduce((s,e)=>s+num(e.neto),0)` **sin filtrar estado**. Las filas vienen de `estimacionesDeContrato` (`estimaciones.controller.js:413-420`), cuyo SQL **NO filtra** `estado` (trae todas, incl. rechazadas). El propio controller **sí** sabe excluir rechazadas en los cálculos monetarios reales (`estimaciones.controller.js:159, 189, 483-484` usan `estado <> 'rechazada'`), pero el resumen del expediente no.

**Diagnóstico:** la #3 es el **reingreso** (`reemplaza_a`) de la #2 rechazada → sumar ambas cuenta el mismo dinero dos veces. Es defecto de **presentación** del total (no afecta dinero real ni la carátula).

**Acción recomendada:** excluir `estado='rechazada'` del `reduce` del total (y, idealmente, marcar visualmente la rechazada como superseded). 🟢 **SEGURO** si se hace en el frontend (`ConsultaExpediente.jsx:437`). *(Tocar el SQL de `estimacionesDeContrato` sería 🔴 — ese controller está congelado; el fix de frontend basta.)*

---

### 🟢 P4 — Falta nota de bitácora automática al ciclo de estimación (brecha con fundamento legal)

**Word:** *"Al integrar una estimación ¿no se debería crear una nota? … revisa la ley y el reglamento en /docs."*

**Qué dice la ley (revisada en `docs/legal/Reg_LOPSRM.pdf`, art. 125):**
- **Art. 125 fr. II inciso a)** — al **superintendente** le corresponde registrar en bitácora *"La solicitud de aprobación de estimaciones"*.
- **Art. 125 fr. I inciso b)** — al **residente** le corresponde registrar *"La autorización de estimaciones"*.
- **Art. 132 fr. II** — la estimación (como expediente) se acompaña de *"Notas de Bitácora"*.

**Qué dice el código:**
- El catálogo **ya tiene** los tipos: `sup_estimaciones` ("Solicitud de aprobación de estimaciones", rol superintendente) y `res_estimaciones` ("Autorización de estimaciones", rol residente) — `schema.sql:880,892`.
- **Hoy NO se crea ninguna nota automática** en el ciclo: `integrarEstimacion` (`estimaciones.controller.js:49-396`) solo **vincula** notas que ya existen (`estimacion_notas`), no llama a `insertarNotaAtomica`. Compárese con avance (`trabajos.controller.js:282`), convenio (`convenios.controller.js:245`), sustitución (`roster.controller.js:184`) y atraso (`alertas.controller.js:221`), que **sí** asientan nota automática.

**Diagnóstico:** brecha real **con fundamento legal sólido**. El mapeo natural por el flujo SIGECOP:
- **PRESENTAR** la estimación (HU-13, `enviarEstimacion`) = "solicitud de aprobación" → nota `sup_estimaciones` (emisor superintendente).
- **AUTORIZAR** (HU-15, `autorizarEstimacion`) = "autorización de estimaciones" → nota `res_estimaciones` (emisor residente).

**Acción recomendada:** cablear la nota automática (patrón `insertarNotaAtomica`, con diferido si no hay bitácora) en **`enviarEstimacion` y `autorizarEstimacion`** — ambos viven en `estimaciones-ciclo.controller.js` (**NO congelado**, dominio E3) → 🟢 **SEGURO**. *(Evita `integrarEstimacion`, que está en el controller congelado.)* `[validar profe]`: confirmar que el disparo correcto es presentar/autorizar (no integrar) y vincular la nota a la estimación (`estimacion_notas`).

---

### 🟢 P5 — El periodo de la estimación se teclea a mano; debería seleccionarse (mejora UX, gap real)

**Word:** *"Apertura del periodo, no debe dejar poner la fecha; mejor que te deje seleccionar los periodos directamente para no andar adivinando."*

**Qué dice el código:** en `IntegracionEstimacion.jsx:819-826` el periodo se captura con **dos `<input type="date">` libres** (`periodo-inicio`, `periodo-fin`). El contrato YA tiene sus periodos (`contrato_periodos`) y el componente incluso los muestra como panel de solo-lectura "Ver programa de obra" (`IntegracionEstimacion.jsx:852-861`), pero **no los ofrece como selector**.

**Evidencia del problema (PDF):** la estimación **#1** quedó con periodo "2026-01-31 — 2026-01-31" (Maiki tecleó ambas fechas iguales) — exactamente el "adivinar" que describe. El neto salió bien igual ($69,500) porque el candado usa fecha-fin acumulada.

**Acción recomendada:** reemplazar los dos inputs de fecha por un **selector de periodos del contrato** (P1/P2/P3 con sus fechas), que autocomplete `periodo_inicio`/`periodo_fin`. Los datos ya están disponibles. 🟢 **SEGURO** (frontend; `IntegracionEstimacion.jsx` no es zona congelada).

---

### 🟢 P6 — Falta la columna "clave" del concepto en la captura de generadores (mejora menor)

**Word:** *"Captura del volumen ejecutado: hay que agregar una columna con el identificador de cada concepto."*

**Qué dice el código:** la tabla de generadores (`IntegracionEstimacion.jsx:266-308`) muestra Concepto, Unidad, Contratado, Ya estimado, Planeado, Disp., PU, Este periodo, Importe, Acumulado, % — **pero no la clave** (`cc.clave`, ej. "C-01"). La clave existe en `contrato_conceptos.clave` y se ve en el catálogo del expediente.

**Acción recomendada:** agregar columna "Clave" a `tabla-generadores`. 🟢 **SEGURO**. *(Verificar que el endpoint que alimenta la tabla — `estimacion-prep` / `avanceDeContrato` — devuelva `clave`; `avanceDeContrato` hoy NO la selecciona (`estimaciones.controller.js:538-551`). Si se usa `estimacion-prep` (E3, no congelado), agregar `clave` ahí es seguro; si se usara `avanceDeContrato` (congelado), pedírselo a Maiki.)*

---

### 🟢 P7 — Jurídicos: firmante/representante son texto libre; ¿ligarlos a las cuentas? (mejora / [validar profe])

**Word:** *"Puedo escribir el firmante autorizado por la dependencia; hay que ver si yo lo puedo escribir o ya se debería ligar a la dependencia, y lo mismo con el contratista que ya tenemos."*

**Qué dice el código:** `jur-firmante` y `jur-representante` son **inputs de texto libre** (`AltaContrato.jsx:500-503`) que se guardan tal cual en el JSONB `datos_juridicos` (`AltaContrato.jsx:1679` → `contratos.controller.js:332`, sin validación server). Las cuentas de dependencia (`dependenciaId`) y superintendente (`superintendenteId`) ya están seleccionadas en el equipo.

**Diagnóstico:** decisión de diseño. Se podría **prellenar** el firmante con el nombre de la cuenta de dependencia y el representante con el de la cuenta de contratista (editables, porque el representante legal puede no ser el superintendente).

**Acción recomendada:** prellenar desde las cuentas seleccionadas (editable). 🟢 **SEGURO** (frontend, `AltaContrato.jsx`). `[validar profe]`: ¿el firmante/representante DEBE ser la misma persona de la cuenta, o puede diferir? (en obra pública suelen ser cargos distintos).

---

### P8 — Deja poner fecha de inicio anterior a hoy ([validar profe] / falta regla)

**Word:** *"En datos generales me dejó poner una fecha de inicio anterior al día actual."*

**Qué dice el código:** **no hay validación** de fecha pasada, ni cliente ni servidor. El input `dg-fecha` no tiene `min` (`AltaContrato.jsx:225`), `validarPaso(0)` solo exige no-vacío, y `crearContrato` no compara contra hoy (`contratos.controller.js:49-67`). *(El único rechazo por fecha vencida es para garantías, `contratos.controller.js:187-191`.)*

**Diagnóstico:** **no es un bug del sistema**, es una **regla de negocio que falta decidir**. Ojo con la **tensión**: el propio `docs/contexto-claude/PLAN_PRUEBAS_VALORES.md` usa fecha de inicio `2026-01-01` (pasada) **a propósito**, para que los 3 periodos ya hayan arrancado y el panel de atraso (HU-07) mida algo. Prohibir fechas pasadas rompería ese diseño y, en obra real, a veces se formaliza con inicio retroactivo.

**Acción recomendada:** `[validar profe]` la regla. Si se decide prohibir: `min={hoy}` en el input es 🟢 **SEGURO** (frontend); enforcement server-side sería 🔴 (toca `contratos.controller.js` congelado). Alternativa intermedia: **aviso** ("la fecha de inicio es anterior a hoy"), no bloqueo.

---

### 🟢 P9 — Quitar el buscador "contrato, nota, estimación" (mejora UI)

**Word:** *"En la UI aparece un buscador que dice contrato, nota, estimación; eso quítalo."*

**Qué dice el código:** es el `<input type="search" placeholder="Buscar contrato, nota, estimación…">` de la barra superior, **presentacional** (sin handlers, sin estado, sin API) — `AppShell.jsx:60-68`. El propio comentario lo dice: *"El buscador y la campana son PRESENTACIONALES en UI-1… se cablearán cuando exista la búsqueda global"* (`AppShell.jsx:18-19`).

**Acción recomendada:** eliminar el `<div>` del buscador (`AppShell.jsx:61-68`). Alcance mínimo (1 archivo, sin referencias en tests). 🟢 **SEGURO** (`AppShell.jsx` no está en la lista congelada).

---

### 🟢 P10 — Junto a la campanita, un acceso a "Por firmar" (mejora UI)

**Word:** *"Detalle de diseño: al lado de la campanita poner algo similar pero que te lleve al 'Por firmar'."*

**Qué dice el código:** la campana vive junto al buscador en `AppShell.jsx` (presentacional). La ruta destino **ya existe** (la bandeja "Por firmar" / `pendientesPorFirmar`, `bitacora.controller.js:304`).

**Acción recomendada:** agregar un ícono/enlace a la ruta de "Por firmar" junto a la campana. 🟢 **SEGURO** (frontend, `AppShell.jsx`).

---

### P11 — Cédula profesional: "no se exige, agrégala" → **YA SE EXIGE** (no es bug)

**Word:** *"La cédula que pusiste como 'validar con el profe' porque no se exige, hay que agregarlo porque así lo pidió el profesor."*

**Qué dice el código:** la cédula **ya es obligatoria** en el alta: `cedulaProfesional` está en `REQ_JURIDICOS` (`AltaContrato.jsx:160`) y el paso jurídicos rechaza si falta (`AltaContrato.jsx:1492-1501`). Lo único "abierto" es el **comentario** `cedulaProfesional: [validar] — LOPSRM/RLOPSRM federal NO la exigen… confirmar con el profe` (`AltaContrato.jsx:156-158`).

**Diagnóstico:** no hay nada que "agregar" en cliente — ya se exige. *(Matiz: el **backend** no valida jurídicos, los guarda como JSONB libre — `contratos.controller.js:332` — así que por API directa es saltable; el enforcement real es solo cliente.)*

**Acción recomendada:** como el profe confirma que la pide, **cerrar el `[validar]`** (actualizar el comentario y el plan de pruebas, que la marcaba dudosa). Si se quiere blindar contra API directa, validarla en backend sería 🔴 (controller congelado). 🟢 cambio de comentario/doc.

---

### P12 — (PDF) Periodos del programa no se regeneran tras convenio de plazo (brecha conocida)

**Evidencia (PDF):** tras el convenio `CM-001` (plazo 90→100), VIGENCIA muestra "2026-01-01 — 2026-04-10" (plazo 100 ✔) pero el **programa de obra sigue con 3 periodos** (ene/feb/mar, fin 03-31) y el plan de amortización igual.

**Qué dice el código:** intencional y **ya documentado**. `convenios.controller.js:194-195`: *"la regeneración de periodos por cambio de plazo queda como follow-on (E3 coordina el re-mapeo de celdas a periodos nuevos)"*. Coincide con la brecha del plan ("Convenio de plazo: cambia plazo y término pero no regenera periodos").

**Diagnóstico:** **brecha conocida, no bug.** Acción: dejarla en pendientes E3 (re-mapeo de celdas a periodos nuevos), no urge.

---

## Contraste PDF del expediente ↔ lo que el código debería generar

| Bloque del PDF | ¿Coincide con el código/dataset? | Nota |
|---|---|---|
| Folio, objeto, dependencia, monto **$1,000,000.00**, modalidad | ✅ | Igual al dataset del plan |
| Catálogo (C-01..C-04, importes, Σ 1,000,000) | ✅ | Cuadre exacto |
| Programa de obra (matriz 100%, 3 periodos) | ✅ | Σ por concepto correcto |
| Garantías (Anticipo 300k, Cumplimiento 100k) | ✅ | — |
| Plan de amortización (100k/100k/100k = 300k) | ✅ | — |
| **Plazo 100 / Vigencia hasta 2026-04-10** vs **periodos hasta 03-31** | ⚠️ | **P12** (periodos no regenerados tras convenio de plazo — brecha conocida) |
| Equipo: "Residente: **ivan**" | ✅ (dato) | Es el nombre de la cuenta que usaste como residente; no es bug |
| Estimaciones #1 $69,500 / #2 $330,125 / #3 $330,125 | ✅ (netos) | Netos correctos uno a uno |
| **Total neto estimado $729,750** | ❌ | **P3** (doble-cuenta #2 rechazada + #3 reingreso) |
| #1 periodo "2026-01-31 — 2026-01-31" | ⚠️ | Fechas tecleadas iguales → refuerza **P5** (selector de periodo) |
| Roster: "0 sustituciones" | ✅ (consecuencia) | No se completó la sustitución → **P1/P13** |

---

## Lo que funcionó (verde, no requiere acción)

Maiki marcó como OK (no aparecen como problema en el Word): §3.1 datos generales, §3.2 catálogo/cuadre, §3.3 programa 100%, y "la mayoría verde" del resto del recorrido (garantías, plan de amortización, gating del alta, carátula y neto de estimación, presentar/turnar/autorizar/pagar, reingreso copia carátula, convenio dentro del 25%, control de acceso). El neto **$69,500** de la estimación #1 se confirma en el PDF.

---

## Oleadas de corrección sugeridas (para que decidas qué entra)

- **Oleada A — bugs 🟢 seguros (frontend, alto valor, bajo riesgo):** P2 (apertura: documento+duplicado), P3 (total neto del expediente), P9 (quitar buscador), P10 (link "Por firmar"), P5 (selector de periodo), P6 (columna clave).
- **Oleada B — funcional con ley (🟢 no congelado):** P4 (nota automática de estimación en presentar/autorizar), P7 (prellenar jurídicos).
- **Oleada C — requiere decisión tuya / zona congelada:** **P1** (gate de candidatos del roster — `usuarios.routes.js` 🔴), P8 (regla de fecha pasada — definir con el profe), P11 (cerrar `[validar]` de cédula; opcional blindaje backend 🔴).

---

*Análisis leído del código real (controllers, páginas, `schema.sql`, rutas) y de los PDFs de ley en
`docs/legal/`. No se modificó código. Lo legal interpretativo queda como `[validar profe]`.*
