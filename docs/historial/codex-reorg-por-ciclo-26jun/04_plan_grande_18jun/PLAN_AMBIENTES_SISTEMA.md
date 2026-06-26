# SIGECOP — Plan de AMBIENTES del sistema (flujos por bloques de inicio a fin)

> **Solo análisis. NO construir todavía. LOCAL, sin commit/push.** Derivado de un análisis multi-agente
> (8 ciclos × mapear→diseñar→**verificar adversarialmente** contra el código real, + panel de
> priorización/completitud). Cada propuesta se contrastó con `App.jsx`, `Sidebar.jsx`, las pantallas reales
> y las historias; el verificador rechazó citas legales inventadas, rutas de spec inexistentes y roles que
> no existen. Lo que sigue ya incorpora esas correcciones.

## 0. Objetivo y la regla de oro

**Objetivo:** llevar el patrón de **"ambiente por bloques de inicio a fin"** —el que ya existe en el
**Ambiente de Estimación** (FASE 5, `frontend/src/pages/AmbienteEstimacion.jsx`) y en el **alta** (wizard de
7 pasos, `AltaContrato.jsx`)— a otros ciclos, para que SIGECOP **se sienta un sistema, no pantallas sueltas**.

**🔱 REGLA DE ORO (no negociable): AGRUPAR LA EXPERIENCIA SIN FUNDIR LAS HISTORIAS.**
Cada HU sigue siendo **su propia pantalla, su propia ruta, su propia ficha y sus propios criterios** —
identificable, revisable y trazable por separado (el profe las lee una por una). El ambiente es una capa de
**navegación + presentación** que **ENVUELVE y ENCADENA** las pantallas existentes con `Link`/`NavLink` y
muestra, a lo sumo, datos **read-only que el backend YA calcula**. **NO reescribe lógica, NO duplica captura,
NO borra ninguna vista individual.** Es exactamente lo que hace `AmbienteEstimacion.jsx`: encadena HU-12
(integrar) → HU-13 (presentar) → revisión, pero cada una **sigue siendo su historia y su ruta**
(`/estimaciones/integracion`, `/estimaciones/envio`).

**Por qué NO se pierde la trazabilidad:** el ambiente vive en una **ruta NUEVA** que no reemplaza a ninguna;
cada bloque es un encabezado + un enlace a la ruta real + (opcional) un resumen read-only. Si se borra el
ambiente, **todas las HU siguen funcionando intactas**. El verificador confirmó `funde_historias = false` en
los 8 ciclos.

**Patrón de montaje (sin tocar `permisos.js`):** ruta nueva en `App.jsx` con `<SoloRol roles={[...]}>` +
un link especial en `Sidebar.jsx`, **fuera del catálogo de HU** — exactamente como ya viven el **roster**
(`/contratos/roster`), el **finiquito** (`/contratos/finiquito`) y el **ambiente de estimación**
(`/estimaciones/ambiente`). Eso **no altera la matriz `permisos.js`** ni el conteo de HU. El único archivo
**congelado** que se toca es `App.jsx` (1 import + 1 ruta `SoloRol`), que **integra Maiki** (igual que hizo
con HU-24 y FASE 5).

> **⚠️ Estos ambientes NO son HU nuevas.** Son navegación de HU existentes (como `AmbienteEstimacion`, que no
> tiene ficha propia: vive como nota dentro de HU-12). **No agregar HU-25+ por ellos** salvo que Maiki quiera
> registrarlos; si lo hace, el **siguiente número libre real es HU-25** (HU-24 ya es el finiquito).
> **Corrección pendiente:** `ESTADO_ACTUAL.md` dice "el siguiente número de HU libre es HU-24" — está **stale**,
> HU-24 ya está tomado; corregir a **HU-25**.

---

## 1. Qué es del 24-jun y qué es posterior

La entrega **calificable del 24** es **ESTIMACIÓN + FINIQUITO + lo ya hecho** — y eso **ya está cubierto por
las pantallas individuales** (HU-12..16, HU-21, HU-24, FASE 5). **Los ambientes nuevos son UX/pulido POSTERIOR
al 24.** Excepción: los ambientes de **finiquito** y **pago** son tan seguros (navegación-only sobre endpoints
existentes) y refuerzan tanto el ciclo calificable que **podrían hacerse antes del 24 si sobra tiempo** — pero
**no son requisito**; sin ellos, el 24 está completo.

## 2. Priorización (ranking cross-ciclo)

| # | Ciclo | Valor | Riesgo | Seguro | ¿pre-24? | Una línea |
|---|---|---|---|---|---|---|
| 1 | **Finiquito / cierre** | alto | bajo | ✅ | opcional | Encadena estimaciones→saldos→cierre (HU-24); el cierre se siente un sistema completo justo donde el profe califica |
| 2 | **Pago de la estimación** | alto | bajo | ✅ | opcional | Encadena estimación autorizada→tránsito (HU-20)→registro (HU-21); cierra visualmente el ciclo de cobro |
| 3 | **Bitácora del contrato** | alto | bajo | ✅ | parcial | El hilo legal del contrato (apertura→firma→notas→consulta→minutas); mucha sensación de sistema |
| 4 | **MACRO: Ciclo de vida** | muy alto | bajo | ✅ | post-24 | El que más "esto es un sistema" transmite, **pero solo brilla cuando ya existen los sub-ambientes** que enlaza → al final |
| 5 | **Convenios modificatorios** | medio | bajo | ✅ | post-24 | Envuelve HU-03 + historial inmutable de versiones + oficio; ciclo **episódico** (no siempre ocurre) |
| 6 | **Avance físico y seguimiento** | medio | bajo | ✅ | post-24 | Trabajos (HU-06)→curva (HU-05)→alertas (HU-07); solapa con seguimiento ya existente |
| 7 | **Alta y configuración** | bajo | bajo | ✅ | post-24 | El alta **ya es** un wizard de 7 pasos; el ambiente aporta poco salvo enlazar fianzas/apertura |
| 8 | **Registro y acceso** | bajo | bajo | ✅ | post-24 | Flujo administrativo de borde (registro→aprobación→login), fuera del núcleo de obra |

**Todos son SEGUROS** (navegación + lectura, additivo, sin tocar `permisos.js`/backend/cálculo/triggers).
**Ninguno funde historias. Ninguno toca la zona congelada profunda** (solo el montaje mínimo de ruta en
`App.jsx`, que integra Maiki).

**Orden de construcción recomendado (post-24):** **1) finiquito · 2) pago** (opcionalmente pre-24, refuerzan
lo calificable) → **3) bitácora** (independiente, alto valor) → **4) reportes/expediente** *(ciclo faltante,
ver §4)* → **5) convenios** → **6) avance** → **7) MACRO ciclo de vida** (al final) → **8) alta** (bajo valor)
→ **9) registro** (borde).

---

## 3. Los 8 ciclos (encadenamiento HU-por-HU + prompt)

> Cada ficha: **ruta nueva**, **HUs encadenadas** (orden + qué dispara el paso), **vistas individuales que se
> conservan**, **riesgo**, **realista-24**, **correcciones del verificador** (ya incorporadas al prompt), y un
> **PROMPT ejecutable**. En todos: montaje = ruta `SoloRol` en `App.jsx` + link en `Sidebar.jsx` (fuera del
> catálogo), **sin tocar `permisos.js`**; el componente vive en `frontend/src/pages/`; specs en `frontend/e2e/`
> reusando `./_helpers.js` (`freshHome`/`enterAppMode`/`goToViaSidebar`) + `test.skip(!!process.env.CI)`.

### 3.1 🥇 Ambiente de FINIQUITO / cierre — `ruta: /contratos/cierre`
**No reemplaza** `/contratos/finiquito` (HU-24 sigue siendo su pantalla); el ambiente la **envuelve**.
**Roles:** `['dependencia','residente']` (los de HU-24).

**Bloques (cada uno read-only + enlace a la ruta real):**
1. **Contrato a cerrar** — selector propio (`api.listarContratos`). Dispara la carga read-only de los demás.
2. **Prerrequisito: bitácora abierta (HU-08)** — `api.bitacoraDeContrato`; si no hay, banner de bloqueo +
   enlace a `/bitacora/apertura`. *(El finiquito ES una nota de bitácora, art. 64.)*
3. **Estimaciones que entran al saldo (HU-12/13/15)** — `api.estimacionesDeContrato`, resalta autorizada/pagada;
   enlaza a `/estimaciones/integracion`, `/estimaciones/envio`, `/estimaciones/revision`.
4. **Pagos aplicados (HU-21)** — `api.listarPagos`; enlaza a `/pagos/registro`.
5. **Carátula del finiquito — saldo en vivo (HU-24, read-only)** — `api.finiquitoPrep`; muestra los mismos
   renglones que `Finiquito.jsx` (`finiquito-desglose`). El input de ajustes idealmente **delega** a HU-24.
6. **Cierre formal (candado) — DELEGA a HU-24** — link primario "🔒 Ir a elaborar el finiquito y cerrar →" a
   `/contratos/finiquito`, deshabilitado si falta bitácora o el rol no es dependencia/residente. **El POST
   transaccional (nota + estado 'cerrado') lo hace el controller de HU-24 sin cambios.**
7. **Documento art. 170 + constancia** — si cerrado, acceso al `DocumentoFiniquito` existente; enlaza a
   `/bitacora/consulta` (nota de finiquito) y `/contratos/expediente` (que ya refleja `estado=cerrado`).

**Trazabilidad:** HU-24 conserva su ruta, testids (`finiquito-desglose`, `btn-confirmar-cierre`,
`documento-finiquito`) y criterios; HU-08/12/13/15/21/10 quedan idénticas. El cierre **no se duplica**: se
delega. **Riesgo bajo:** si el ambiente falla, `/contratos/finiquito` y las HU siguen solas. **Realista-24:**
sí/parcial — el cierre real entra al 24; el ambiente envolvente es un cascarón nuevo de 7 bloques (no trivial),
opcionalmente pre-24.
**Correcciones del verificador:** copiar la firma local de `Bloque` (NO reusar `pendienteE3` de
`AmbienteEstimacion` — aquí **no hay placeholder de equipo**, todo el flujo de finiquito ya existe); usar
testids propios `bloque-cierre-${n}`; el rol del candado debe quedar **idéntico a HU-24** (backend revalida
identidad, no solo rol). `[validar profe]` heredado: `ajustes_finales` (deductivas/5-al-millar pendiente) +
acta de recepción física previa (art. 64/168) y notificaciones (art. 169) fuera de Etapa 1.

> **PROMPT:**
> ```
> Soy Maiki. Construye el AMBIENTE DE CIERRE (finiquito por bloques) como CASCARÓN que ENVUELVE HU-24 sin
> fundir historias. LOCAL, sin commit/push. NO toques permisos.js, server.js (no hay router nuevo: reusa
> finiquitoPrep/bitacoraDeContrato/estimacionesDeContrato/listarPagos), ni el cálculo del saldo (HU-24 es la
> fuente). Crea frontend/src/pages/AmbienteFiniquito.jsx en ruta NUEVA /contratos/cierre (NO reemplaza
> /contratos/finiquito). 7 bloques read-only que ENLAZAN a las rutas reales (apertura HU-08, estimaciones
> HU-12/13/15, pagos HU-21, expediente HU-04, consulta de notas HU-10) y, en el bloque 6, DELEGAN el cierre a
> /contratos/finiquito (no ejecutar cerrarFiniquito por tu cuenta; link deshabilitado si falta bitácora o rol
> != dependencia/residente, patrón link-integrar de AmbienteEstimacion). Testids propios bloque-cierre-${n}
> (no reuses bloque-est-*). Monta SoloRol roles=['dependencia','residente'] en App.jsx + link en Sidebar
> (sección del roster/finiquito), fuera del catálogo (NO toques permisos.js). NO es HU nueva. Spec en
> frontend/e2e/ambiente-finiquito.spec.js (reusa ./_helpers.js + test.skip(CI)). Suite verde. Doc en
> ESTADO_ACTUAL como 'ambiente' (no HU). Reporta. NO push.
> ```

### 3.2 🥈 Ambiente de PAGO de la estimación — `ruta: /pagos/ambiente`
**Roles:** `['finanzas','contratista','residente','dependencia']` (unión de HU-20/HU-21; **supervisión
excluida**, es `null` en ambas).

**Bloques:**
1. **Punto de entrada — estimación AUTORIZADA** — `api.estimacionesDeContrato`, filtra `estado='autorizada'`
   (lo que dejó HU-15). Enlaza a `/estimaciones/historial` (HU-14) y `/estimaciones/revision` (HU-15).
2. **Tránsito a pago (HU-20)** `[PLACEHOLDER]` — enlaza `/pagos/transito`. **Marcado "Maqueta · pendiente
   E2/E3"**: HU-20 hoy es prototipo sin backend (DDL `presupuesto_anual`/`instruccion_pago` existe pero
   **huérfana**, sin controller).
3. **Instrucción de pago (delegado)** `[PLACEHOLDER]` — bisagra HU-20→HU-21; persistencia pendiente E2/E3.
4. **Registro del pago efectuado (HU-21)** — enlaza `/pagos/registro`; importe = neto server-side (no
   tecleable); candados (solo pagable, no doble pago) siguen en HU-21.
5. **Cierre del ciclo** — `api.listarPagos` (con plazo art. 54 ya calculado); enlaza a `/contratos/finiquito`
   (HU-24) como continuación natural (los pagos suman al saldo del finiquito).

**Riesgo bajo · Realista-24 parcial** (opcional pre-24). **Correcciones del verificador:** testids propios
`bloque-pago-${n}`/`placeholder-${n}` (no colisionar con `bloque-est-*`); bloques 2-3 **placeholder** porque
HU-20 es dummy (techo 15M/comprometido 11.2M fijos). `[validar profe]`: orden legal (autorizada art.54 →
tránsito art.24 → instrucción → pago) y si el plazo de 20 días **bloquea o solo avisa** (hoy solo avisa).

> **PROMPT:**
> ```
> Soy Maiki. Construye el AMBIENTE DE PAGO (por bloques) que ENVUELVE HU-20/HU-21 sin fundirlas. LOCAL, sin
> commit/push. NO toques permisos.js ni el cálculo; reusa estimacionesDeContrato/listarPagos (endpoints
> existentes). frontend/src/pages/AmbientePago.jsx en ruta NUEVA /pagos/ambiente. 5 bloques: (1) estimación
> autorizada read-only que siembra el ciclo; (2) tránsito HU-20 y (3) instrucción = PLACEHOLDER 'Maqueta ·
> pendiente E2/E3' (HU-20 es dummy, DDL presupuesto_anual/instruccion_pago huérfana — NO inventes backend);
> (4) registro HU-21 (enlaza /pagos/registro); (5) cierre con lista de pagos + enlace a finiquito HU-24.
> Testids bloque-pago-${n} (no reuses los de estimación). SoloRol roles=['finanzas','contratista','residente',
> 'dependencia'] (supervisión NO) en App.jsx + link Sidebar fuera del catálogo. NO es HU nueva. Spec en
> frontend/e2e/ambiente-pago.spec.js (./_helpers.js + test.skip(CI)). Marca [validar profe] el orden legal y
> el plazo 20 días (bloquea vs avisa). Suite verde. Reporta. NO push.
> ```

### 3.3 🥉 Ambiente de BITÁCORA — `ruta: /bitacora/ambiente`
**Roles:** `['residente','contratista','supervision']` (los de la bitácora). **El más "hilo legal" del
contrato.**

**Bloques (HU encadenadas, con su disparador real):**
1. **Contrato y estado de la bitácora** — `api.bitacoraDeContrato`: ¿abierta?, acta nota #1, firmas X/Y.
   Decide qué bloques se activan. *Disparo:* sin apertura → bloque 2 activo, resto en candado; `completa=true`
   → desbloquea bloque 4.
2. **Abrir la bitácora (HU-08)** — enlaza `/bitacora/apertura`. *Disparo:* el residente abre → backend genera
   nota #1 + firmas pendientes; al volver, el ambiente avanza al bloque 3.
3. **Firma conjunta (Por Firmar)** — enlaza `/bitacora/por-firmar`; muestra "X de Y firmadas". *Disparo:* al
   firmar el ÚLTIMO, `bitacora.completa=true` → **condición que desbloquea emitir notas**.
4. **Emitir y responder notas (HU-09)** — enlaza `/bitacora/notas`, **habilitado solo si `completa=true`**
   (mismo candado que ya implementa la pantalla). *Disparo:* emitir nota → folio MAX+1 + firma del emisor;
   anular → nota correctiva vinculada "dice/debe decir".
5. **Consultar, buscar y exportar (HU-10)** — enlaza `/bitacora/consulta`; espejo de lectura (filtros AND +
   Excel). Disponible en paralelo.
6. **Minutas, visitas y acuerdos (HU-11)** `[PLACEHOLDER]` — enlaza `/bitacora/minutas`, **marcado "Maqueta ·
   sin backend"** (datos en `useState`, `minutas.nota_id` huérfana).

**Riesgo bajo · Realista-24 parcial.** **Correcciones del verificador (importantes):**
- **CITA LEGAL: el candado de emisión es `art. 123 fr. III RLOPSRM`, NO "art. 46 Bis/52 LOPSRM"** (el agente
  diseñador lo inventó; el código real —`bitacora.controller.js` ~L558, `EmisionNotas.jsx` gate— cita 123 fr.
  III). El "art. 46" aparece en otro contexto (vinculación de partes), sin "Bis".
- Usar **solo `bitacora.completa`** de `api.bitacoraDeContrato` para el candado (NO `apertura_completa`, que
  es de otro endpoint). No mezclar nombres.
- Specs reales que cubren la cadena/candado: `bitacora-v2.spec.js`, `hu-08-apertura-bitacora.spec.js`,
  `hu-09-emision-notas.spec.js` (no existe ningún "fase-apertura-firma-emision"). El spec nuevo va en
  `frontend/e2e/ambiente-bitacora.spec.js`.
- `[validar profe]`: que agrupar el ciclo en un ambiente **no se lea como "fundir" las HU** (el diseño lo
  respeta) y la cita exacta del candado de emisión.

> **PROMPT:**
> ```
> Soy Maiki. Construye el AMBIENTE DE BITÁCORA (por bloques) que ENCADENA apertura→firma→emisión→consulta sin
> fundir las HU. LOCAL, sin commit/push. NO toques permisos.js, server.js ni la lógica de notas; reusa
> bitacoraDeContrato/pendientesPorFirmar/notasDeContrato. frontend/src/pages/AmbienteBitacora.jsx en ruta
> NUEVA /bitacora/ambiente. 6 bloques que ENLAZAN a las rutas reales (/bitacora/apertura HU-08,
> /bitacora/por-firmar, /bitacora/notas HU-09, /bitacora/consulta HU-10, /bitacora/minutas HU-11). El candado
> "emitir notas solo si la apertura está firmada por todos" usa SOLO bitacora.completa de api.bitacoraDeContrato
> y se cita como art. 123 fr. III RLOPSRM (NO 46 Bis/52). El bloque de minutas = PLACEHOLDER 'Maqueta · sin
> backend'. SoloRol roles=['residente','contratista','supervision'] en App.jsx + NavLink en la sección
> 'Bitácora' del Sidebar (ya existe, junto a 'Por firmar'), fuera del catálogo (NO permisos.js). NO es HU
> nueva. Spec en frontend/e2e/ambiente-bitacora.spec.js (./_helpers.js + test.skip(CI)). Marca [validar profe]
> la cita del candado y que agrupar no funde HU. Suite verde. Reporta. NO push.
> ```

### 3.4 🏛️ MACRO: Ambiente del CICLO DE VIDA del contrato — `ruta: /contratos/ciclo-vida`
**El que más "esto es un sistema" transmite**, pero **se construye AL FINAL** porque solo brilla cuando ya
existen los sub-ambientes que enlaza. **Roles:** `['residente','contratista','supervision','dependencia']`
(Finanzas excluida).

**14 bloques = recorrido completo, cada uno un `Link` a la ruta real:** 1) Selección del contrato (ancla,
`?contrato=ID` a todos) · 2) Alta (HU-01) · 3) Apertura bitácora (HU-08) · 4) Bitácora en operación (HU-09 +
HU-10 + Por Firmar) · 5) Ejecución y seguimiento (HU-06 + HU-07 + HU-05) · 6) Convenios (HU-03, "cuando
aplica") · 7) Integración (HU-12) · 8) Presentación (HU-13) · 9) Revisión/autorización (HU-15) · 10) Reingreso
(HU-16, "si fue rechazada") · 11) Registro de pago (HU-21) · 12) Coordinación (HU-14 + HU-17 + HU-18) ·
13) Expediente integral (HU-04) · 14) Finiquito y cierre (HU-24).

**Trazabilidad:** cada bloque es **un `Link` a la ruta real**; el componente **no tiene lógica de negocio**
(monto/carátula/saldo/déficit los calcula el backend); muestra estado read-only con endpoints existentes
(`detalleContrato`, `leerProgramaObra`, `finiquitoPrep`, `historialEstimaciones`). Es un **índice ordenado
por ciclo de vida**, no un reemplazo. **Riesgo bajo · Realista-24 parcial** (post-24).
**Correcciones del verificador:**
- **Gatear cada `Link` por el rol de sesión** (importar `nivelDe` de `permisos.js` **solo lectura**, no
  editar) para no ofrecer enlaces que rebotan a `/`. **Caso grave: bloque 11 (pago HU-21) lo ejecuta SOLO
  finanzas, excluida del SoloRol** → mostrarlo como bloque **informativo** ("el pago lo registra Finanzas"),
  no como `Link`.
- Spec como **residente** (no contratista), aseverar **presencia** de los `Link` (testid `bloque-cv-${n}` +
  href), **no la navegación** (varios destinos rebotan por rol). `test.skip(CI)` si toca backend.
- **No tocar** el `.filter(historiasUsuario…)` del Sidebar (no alterar el conteo del menú que aseveran otros
  specs). `[validar profe]` el orden lifecycle y la agrupación.

> **PROMPT:**
> ```
> Soy Maiki. Construye el MACRO ambiente CICLO DE VIDA DEL CONTRATO (recorrido por bloques) que ENLAZA todas
> las HU en orden, sin fundirlas. LOCAL, sin commit/push. SOLO navegación + lectura: cero lógica de negocio,
> reusa detalleContrato/leerProgramaObra/finiquitoPrep/historialEstimaciones; NO toques permisos.js/server.js/
> dummy.js. frontend/src/pages/CicloVidaContrato.jsx en ruta NUEVA /contratos/ciclo-vida. ~14 bloques, cada uno
> un Link a la ruta REAL (alta→bitácora→avance→convenios→estimación→revisión→reingreso→pago→coordinación→
> expediente→finiquito), con ?contrato=ID. GATEA cada Link por rol (importa nivelDe de permisos.js SOLO
> lectura); el bloque de pago HU-21 (solo finanzas, excluida) va como bloque INFORMATIVO sin Link. Enlaza al
> sub-ambiente de estimación (/estimaciones/ambiente) para no duplicar. SoloRol roles=['residente','contratista',
> 'supervision','dependencia'] en App.jsx + sección 'Ciclo del contrato' en Sidebar (no toques el .filter del
> catálogo). NO es HU nueva (o HU-25 si la registras, sin renumerar). Spec frontend/e2e/ciclo-vida.spec.js como
> residente, asevera presencia de Links (bloque-cv-${n}), no navegación; test.skip(CI). Suite verde. Reporta. NO push.
> ```

### 3.5 Ambiente de CONVENIOS modificatorios — `ruta: /contratos/convenio-ambiente`
**Ciclo episódico** (no siempre ocurre). **Roles:** `['dependencia','residente','contratista','supervision']`.
**Bloques:** 1) Contrato + estado vigente del convenio (`api.detalleContrato`/`leerProgramaObra`/`convenios`)
· 2) Registrar convenio (HU-03, enlaza `/contratos/modificatorios`) · 3) Variaciones y avisos SFP/59 Bis
(read-only, lo que el backend ya marcó) · 4) Oficio de aprobación (FASE 0C, `descargarOficioConvenio`) ·
5) Asiento automático en bitácora (informativo + enlace a `/bitacora/consulta`) · 6) Ver en el expediente (HU-04).

**Sin dependencia de E2/E3** (todo lo expone Fundación). **Riesgo bajo · Realista-24 no.**
**Correcciones del verificador:**
- **Ni HU-04 (`ConsultaExpediente`) ni `/bitacora/consulta` (`ConsultaNotas`) soportan `?contrato=`** →
  corregir el copy a "abre el expediente y elige el contrato", **o** pedir a Maiki añadir `?contrato=` (eso ya
  **toca HU-04**, fuera de navegación-only). HU-03 **sí** lee `?contrato=`.
- `api.convenios` devuelve un **objeto `{convenios, versiones}`**, no un array.
- El convenio sembrado es **+14.2%** (plazo 211→241, **bajo el 25%**) → `requiere_revision_sfp=false`: el spec
  debe aseverar el **Δ plazo**, NO las marcas SFP/59 Bis (o sembrar un convenio >25%).
- `HeaderVista huId='HU-03'` dispara el banner "solo lectura" para residente/contratista/supervisión (su nivel
  es 'C') → usar un huId neutral o suprimir el aviso (cosmético).

> **PROMPT:**
> ```
> Soy Maiki. Construye el AMBIENTE DE CONVENIO MODIFICATORIO (por bloques) que ENVUELVE HU-03 + oficio + HU-04
> sin fundirlas. LOCAL, sin commit/push. NO toques permisos.js/server.js/cálculo; reusa detalleContrato/
> leerProgramaObra/convenios/versionPrograma/descargarOficioConvenio. frontend/src/pages/AmbienteConvenio.jsx
> en ruta NUEVA /contratos/convenio-ambiente. 6 bloques: vigente+historial → registrar (enlaza
> /contratos/modificatorios?contrato=ID, HU-03 SÍ lee ?contrato=) → variaciones SFP/59Bis read-only (api.convenios
> devuelve OBJETO {convenios,versiones}, no array; solo refleja requiere_revision_sfp/ajuste_costos, no recalcula)
> → oficio FASE 0C (descargarOficioConvenio) → asiento en bitácora (informativo + enlace a /bitacora/consulta,
> que NO preselecciona contrato: copy 'elige el contrato') → ver en expediente (/contratos/expediente, tampoco
> preselecciona: mismo copy). huId neutral en HeaderVista (evita el banner 'solo lectura'). SoloRol
> roles=['dependencia','residente','contratista','supervision'] + link Sidebar fuera del catálogo (NO permisos.js).
> NO es HU nueva. Spec frontend/e2e/ambiente-convenio.spec.js: asevera el Δ plazo del convenio sembrado (+14.2%),
> NO marcas SFP. Marca [validar profe] el guardrail 25%. Suite verde. Reporta. NO push.
> ```

### 3.6 Ambiente de AVANCE físico y seguimiento — `ruta: /seguimiento/ambiente`
**Roles:** `['contratista','residente','supervision']`. **Bloques:** 1) Contrato + periodo
(`leerProgramaObra`) · 2) Registrar avance (HU-06, enlaza `/seguimiento/trabajos-terminados`) · 3) Curva y
desviación (HU-05, enlaza `/seguimiento/curva-avance`; KPIs read-only de `preparacionEstimacion.avance`) ·
4) Atrasos + asiento (HU-07, enlaza `/seguimiento/alertas?contrato=ID` — **esta SÍ acepta `?contrato=`**) ·
5) Evidencia fotográfica `[PLACEHOLDER]` pendiente **E2** (HU-06 hoy no sube fotos por periodo).

**Riesgo bajo · Realista-24 no.** **Correcciones del verificador:**
- **El rol `'superintendente'` NO existe** en `permisos.js` (los 5 roles son residente/contratista/supervision/
  dependencia/finanzas; el superintendente **ES** el contratista). El `SoloRol` **no debe incluir
  'superintendente'** (rompería).
- **`dependencia` tiene `'C'` en HU-05** pero queda fuera del envolvente **por decisión** (ejecutores +
  supervisión) → **anotarlo explícito** `[validar con Maiki/profe]`, no por olvido.
- KPIs del bloque 3 deben salir de la **misma fuente que HU-05** (`prep.avance` de `estimacion-prep`) para no
  mostrar un número distinto a la curva canónica.

> **PROMPT:**
> ```
> Soy Maiki. Construye el AMBIENTE DE AVANCE Y SEGUIMIENTO (por bloques) que ENCADENA HU-06→HU-05→HU-07 sin
> fundirlas. LOCAL, sin commit/push. NO toques permisos.js/server.js/cálculo; reusa trabajosDeContrato/
> leerProgramaObra/alertasDeContrato/preparacionEstimacion. frontend/src/pages/AmbienteAvance.jsx en ruta
> NUEVA /seguimiento/ambiente. 5 bloques: contrato+periodo → registrar avance (enlaza
> /seguimiento/trabajos-terminados HU-06) → curva (enlaza /seguimiento/curva-avance HU-05; los % salen de
> prep.avance de estimacion-prep, MISMA fuente que la curva) → atrasos (enlaza /seguimiento/alertas?contrato=ID
> HU-07, que SÍ preselecciona) → evidencia fotográfica = PLACEHOLDER 'pendiente Equipo 2'. SoloRol
> roles=['contratista','residente','supervision'] (NO 'superintendente', ese rol NO existe; superintendente =
> contratista) en App.jsx + link Sidebar fuera del catálogo. Anota explícito que dependencia (que tiene 'C' en
> HU-05) queda fuera del envolvente por decisión [validar Maiki/profe]. NO es HU nueva. Spec
> frontend/e2e/ambiente-avance.spec.js (./_helpers.js + test.skip(CI)). Suite verde. Reporta. NO push.
> ```

### 3.7 Ambiente de ALTA y configuración — `ruta: /contratos/ambiente-alta`
**Valor bajo** (el alta **ya es** un wizard de 7 pasos). **Roles:** `['residente','dependencia']`.
**Bloques:** 1) Alta (HU-01, enlaza `/contratos/alta`) · 2) Garantías/fianzas (HU-02, **lectura real**) ·
3) Apertura de bitácora (HU-08) · 4) Firmas (Por Firmar).

**Riesgo bajo · Realista-24 no.** **Correcciones del verificador:**
- **El bloque 2 SÍ puede mostrar garantías REALES** vía `api.detalleContrato` (campo `garantias` **ya existe**,
  `contratos.controller.js` ~L586) — **eliminar la dependencia inventada** "GET de contrato_garantias que no
  existe" y el placeholder.
- **No prometer `pdf_firmado` desde `detalleContrato`** (ese campo no está en el payload) → usar
  `api.documentoMeta(id)` o degradar a texto.
- **Incoherencia de rol:** `dependencia` **no** tiene acceso a HU-08 apertura (`permisos.js` dependencia=null)
  ni a Por Firmar → **montar solo para `['residente']`**, o dejar los bloques 3/4 deshabilitados con aviso para
  dependencia.
- *Alternativa trivial-y-segura para la demo (única candidata barata):* enlaces "Próximos pasos" al final de
  la pestaña "Registrados" de HU-01, **sin archivo/ruta nuevos**.

> **PROMPT:**
> ```
> Soy Maiki. Construye el AMBIENTE DE ALTA Y CONFIGURACIÓN (por bloques) que ENVUELVE HU-01→HU-02→HU-08→Por
> Firmar sin fundirlas. LOCAL, sin commit/push. NO toques permisos.js/server.js/G1-G8 del alta. 
> frontend/src/pages/AmbienteAltaContrato.jsx en ruta NUEVA /contratos/ambiente-alta. 4 bloques: alta (enlaza
> /contratos/alta HU-01; estado del PDF vía api.documentoMeta, NO inventes pdf_firmado en detalleContrato) →
> garantías REALES read-only via api.detalleContrato.garantias (campo YA existe; NO placeholder, NO endpoint
> nuevo) enlazando /contratos/fianzas HU-02 → apertura /bitacora/apertura HU-08 → Por Firmar. Monta SoloRol
> roles=['residente'] (dependencia NO tiene acceso a HU-08/por-firmar; si la incluyes, deshabilita los bloques
> 3/4 para ella con aviso). Link Sidebar fuera del catálogo. NO es HU nueva. Spec
> frontend/e2e/ambiente-alta.spec.js. Suite verde. (Bajo valor: el alta ya es wizard; considera primero la
> alternativa trivial de enlaces 'Próximos pasos' en la pestaña Registrados de HU-01.) Reporta. NO push.
> ```

### 3.8 Ambiente de REGISTRO y acceso — `ruta: /usuarios/ambiente-registro`
**Valor bajo, flujo de borde** (cruza la frontera público/privado). **Roles:** `['dependencia']` (la única
parte accionable post-login es aprobar/rechazar). **Bloques:** 1) Crear cuenta (`/solicitud-acceso`,
read-only/compartir enlace) · 2) Catálogo de empresas (HU-23, `GET /auth/empresas` read-only) · 3) Solicitudes
pendientes (contador + enlace `/usuarios/solicitudes`) · 4) Aprobar/rechazar (en `/usuarios/solicitudes`) ·
5) Acceso habilitado (login HU-00, informativo) · 6) Entrada al ciclo (atajos por rol).

**Riesgo bajo · Realista-24 no.** **Correcciones del verificador:**
- `HeaderVista` con huId neutral (evita banner "solo lectura" engañoso).
- **Bloque 6: los atajos a la "primera pantalla de otros roles" REBOTAN para la dependencia** (HU-12, ambiente
  de estimación, Por Firmar la excluyen) → renderizarlos como **texto/`<span>` no navegable**, no `Link`.
  Solo `/contratos/alta` (HU-01 dependencia='C') y `/pagos/transito` (HU-20 dependencia='C') son navegables.
- Bloque 5: `Link to='/'` para la dependencia logueada es **su Inicio, no el login** → enfatizar "copiar
  enlace de login para reenviar al solicitante".

> **PROMPT:**
> ```
> Soy Maiki. Construye el AMBIENTE DE REGISTRO Y ACCESO (por bloques) que ENCADENA registro→aprobación→login
> sin fundir historias. LOCAL, sin commit/push. NO toques permisos.js/auth/server.js; reusa listarEmpresas/
> listarUsuarios('pendiente'). frontend/src/pages/AmbienteRegistro.jsx en ruta NUEVA /usuarios/ambiente-registro,
> SoloRol roles=['dependencia'] (la única acción post-login es aprobar/rechazar). 6 bloques read-only que
> ENLAZAN a /solicitud-acceso, el catálogo GET /auth/empresas, /usuarios/solicitudes (contador + acción real
> ahí), y el login. HeaderVista con huId neutral (sin banner 'solo lectura'). Bloque 6: los atajos a pantallas
> que la dependencia NO puede abrir (HU-12, ambiente estimación, Por Firmar) van como TEXTO no navegable;
> solo /contratos/alta y /pagos/transito como Link. Link Sidebar en la sección 'Administración' (junto a
> Solicitudes), fuera del catálogo. NO es HU nueva. Spec frontend/e2e/ambiente-registro.spec.js. Suite verde.
> Reporta. NO push.
> ```

---

## 4. Ciclos FALTANTES (los detectó el crítico de completitud)

Los 8 ciclos anteriores son **por-contrato**. El análisis encontró **3 ejes que ningún diseño cubre** y que
también dan mucha sensación de "sistema":

1. **🟠 Ambiente de REPORTES / cierre documental** — `HU-19` (exportación de 7 reportes) + `HU-04` (expediente
   consolidado). Un ciclo *"arma el expediente y exporta el paquete del contrato de inicio a fin"*. **Es de los
   que más 'producto terminado' transmiten al profe**, y HU-04/HU-19 hoy viven sueltas sin envoltura.
   **Recomendado: construirlo (es seguro, navegación-only); va en el puesto 4 del orden post-24.**
2. **🟠 Ambiente de SUPERVISIÓN / revisión** — `HU-15` (revisión/autorización) + `HU-16` (reingreso tras
   rechazo). El ciclo del **revisor** (supervisión observa → turna → residencia autoriza/rechaza → contratista
   reingresa) hoy queda **huérfano de ambiente** (el de estimación delega a HU-12/13 pero no cubre el lado del
   revisor). Encadenaría HU-15+HU-16. **Riesgo bajo, navegación-only.**
3. **🔵 Ambiente EJECUTIVO / multi-contrato** — `HU-17` (tablero) + `HU-18` (portafolio) + `HU-19` (reportes) a
   **nivel cartera**. Es **otro eje** ("vista de gobierno", no inicio-a-fin de UN contrato), pero esas 3 HU hoy
   son pantallas sueltas sin envoltura. **Evaluar con Maiki** (no es el patrón "ciclo de un contrato").

**Lo que NO merece ambiente propio** (para no proponer redundancia): **HU-22 roster** encaja como **bloque** del
ambiente de alta/ciclo-de-vida; **HU-02 fianzas** como **bloque** del alta. No crear ambientes para ellas.

---

## 5. Zona congelada, trazabilidad y `[validar profe]`

- **Zona congelada:** ningún ambiente toca auth, G1-G8, cálculo de carátula, `permisos.js`, triggers ni
  `schema.sql`. El **único** archivo congelado que se edita es **`App.jsx`** (1 import + 1 ruta `SoloRol` por
  ambiente) — lo **integra Maiki**, como con HU-24/FASE 5. `server.js` **no** se toca (los ambientes reusan
  endpoints ya montados; ninguno necesita router nuevo).
- **Trazabilidad (lo que el profe pidió cuidar):** verificado `funde_historias=false` en los 8. Cada HU
  conserva ruta, pantalla, ficha, testids, spec y criterios. El ambiente es **índice/navegación**; si se borra,
  las HU siguen solas. Cada bloque **etiqueta** su HU (número + rol + artículo) para reforzar que es un
  recorrido, no un reemplazo.
- **Corrección documental:** `ESTADO_ACTUAL.md` ("siguiente HU libre = HU-24") está **stale** → corregir a
  **HU-25**. Los ambientes **no** son HU; documentarlos como "ambiente" (igual que `AmbienteEstimacion`).
  `[validar profe]` adicional: si conviene que `AmbienteEstimacion` (FASE 5) tenga su propia ficha.
- **`[validar profe]` por ciclo:** finiquito (`ajustes_finales`, acta de recepción física, notificaciones) ·
  bitácora (cita del candado = 123 fr. III; que agrupar no funde HU) · pago (orden legal art.54/24; plazo 20
  días bloquea vs avisa) · convenios (guardrail 25% / SFP / 59 Bis) · avance (excluir dependencia del
  envolvente pese a su 'C' en HU-05; nombre del ciclo) · alta (revisión de fianzas como gate o informativo).

---

## 6. Recomendación final

**Para el 24:** nada nuevo es obligatorio (la entrega calificable —estimación + finiquito + lo hecho— ya está
cubierta por las pantallas individuales y FASE 5). **Si sobra tiempo y se quiere pulir**, los ambientes de
**finiquito** y **pago** son los únicos candidatos seguros y alineados (navegación-only, refuerzan el ciclo de
cobro/cierre que se califica).

**Después del 24**, construir en el orden de §2, empezando por **bitácora** (alto valor, independiente) y el
**ambiente de reportes/expediente** (el ciclo faltante de mayor "producto terminado"), y dejando el **MACRO
ciclo de vida** para el final (solo brilla cuando ya existen los sub-ambientes que enlaza). Cada uno se
construye con su prompt (§3), en local, y **Maiki integra** el montaje en `App.jsx`.
