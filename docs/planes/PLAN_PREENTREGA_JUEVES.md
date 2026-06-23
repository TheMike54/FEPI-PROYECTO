# PLAN DE PREENTREGA — JUEVES (revisión profe 22-jun)

> **Autor:** Code (análisis) · **Para:** Maiki · **Fecha:** 22-jun-2026
> **Hitos:** Preentrega **jueves** (revisión ~3 h) · Entrega final **viernes**.
> **Naturaleza de este doc:** SOLO análisis + plan ordenado por dependencias. **No se implementó nada.**
> Cada hallazgo fue confirmado contra el **código real** (no asumido): 13 auditores en paralelo, evidencia `archivo:línea`.
>
> **Regla del profe (no negociable):** TODO lo que señaló se aplica SÍ O SÍ. Aquí no hay "qué dejar fuera",
> solo el **orden inteligente** por dependencias y la **verdad sobre el tamaño** para que organices el tiempo.

---

## 0. Veredicto de tamaño (la verdad, sin optimismo)

**Esto NO es trabajo de una noche. Es de TRES noches, y van apretadas.**

- Hay **4 piezas XL** (cada una ≈ 1.5–2 días de trabajo enfocado): **Empresas** (cambio de modelo de datos),
  **Estimación-ciclo** (corazón del sistema), **Carátula GACM** (copia literal de 3 documentos), **Convenios**
  (congelar originales + adicionales + curva). Más **3 piezas L**, **4 M** y **2 S**.
- **Trabajo bruto:** ≈ **10–13 días-persona**. Con 4–5 personas en paralelo y bien repartido por bloques, el
  **camino crítico** (la columna de estimación) es de **~4–5 noches en serie**; se comprime a **3** si Empresas
  y Convenios corren en paralelo en otras manos.
- **Riesgo real:** los 4 XL son donde se pierden las palomitas. El profe **califica historia por historia**
  (palomita/tache, sin crédito parcial) y la mayoría de los taches caen en la **cadena estimación → carátula →
  revisión → cobro**. Por eso esa cadena va **al frente del camino crítico**.
- **Tienes 2.5 días** hábiles antes del jueves (esta noche + martes + miércoles). **Alcanza si:** se ataca la
  cadena de estimación desde hoy, Empresas y Convenios arrancan en paralelo, y las historias se reescriben al
  final reflejando el código ya cerrado.

> **Quick wins para arrancar con marcador a favor (esta misma noche, < 3 h en total):**
> Portafolio→expediente (S), fix del plazo "hace −22 días" (S), KPI "atraso de X%" sin negativos (S),
> desmontar Reingreso HU-16 (M), copy "registrar"→"promover" en convenios (S). Son baratos y se ven en la demo.

---

## 1. Versión aprobada de las historias — **SÍ se encontró** ✅

El profe pidió volver a la versión que aprobó (~4–5 jun). **La recuperé de git:**

- **Archivo:** `docs/Historias_Usuario.xlsx` en el commit **`3622878` (4-jun)** — idéntica byte a byte a la del
  1-jun (`8d3a332`). Extraída a texto legible (27 hojas: HU-00…HU-21 + Registro + Por Firmar = **22 historias**).
- **Formato aprobado:** *Como / Deseo / A fin de* + **3 criterios verificables** + metadatos Scrum. **Sin**
  "asistente de 7 pasos", **sin** "matriz concepto × periodo", **sin** "criterios adoptados", **sin** jerga técnica.
- **Comando para que la tengas a mano:**
  `git show 3622878:docs/Historias_Usuario.xlsx > Historias_APROBADA_04jun.xlsx`

> ⚠️ **"Volver a la aprobada" NO es copiar tal cual.** La del 4-jun:
> 1. **Sí tenía HU-16 Reingreso** → el profe ahora dice **eliminarla**.
> 2. **No tenía HU-22 (sustitución), HU-23 (empresas) ni HU-24 (finiquito)** → el sistema ya las tiene.
>
> Por eso el trabajo de historias es: **partir del formato limpio del 4-jun + aplicar encima las correcciones
> del 22-jun + reflejar lo que el sistema hace DESPUÉS de los fixes.** (Un agente reportó que el snapshot del
> 4-jun "no existía" — se equivocó: buscó solo en los `.md` de `docs/historial/`; el xlsx en git sí está.)

---

## 2. Tabla maestra de confirmación (13 hallazgos contra código)

| # | Hallazgo | Estado real | Esfuerzo | ¿Zona congelada? | Depende de |
|---|----------|-------------|:--------:|:----------------:|------------|
| 1 | **Bitácora obligatoria** al alta | **PARCIAL** — gates existen (avance/convenio/sustitución/atraso/finiquito); FALTA el redirect al crear y la estimación NO exige bitácora (asimetría) | **M** | No¹ | — (cimiento) |
| 2 | **Empresas** primero (persona dentro de empresa) | **PARCIAL** — catálogo existe; pero persona 1:1 nace asignada, no elige al firmar | **XL** | **Sí** | — (cimiento) |
| 3 | **Avance** (periodo actual / foto / no corregir / sin negativos) | **PARCIAL** — corregir=YA; foto en avance=FALTA; periodo-vigente=FALTA; KPI negativo=PARCIAL | **L** | **Sí** (foto) | Bitácora |
| 4 | **Estimación-ciclo** (cerrar periodo / conceptos del periodo / jalar de notas / plazo 6 d / avance 14.9%) | **FALTA** (los 5 sub-puntos) | **XL** | **Sí** | Avance |
| 5 | **Reingreso** = eliminar HU-16 | **YA implementado** (hay que desmontarlo) | **M** | **Sí** | Estimación-ciclo |
| 6 | **Carátula GACM** literal (3 documentos) | **PARCIAL** — financiera (2 bloques) YA; faltan neto/IVA, columnas de servicios, foto-por-generador, firmas | **XL** | **Sí** | Estimación-ciclo |
| 7 | **Revisión** (sin severidad / por elemento / turnar opcional) | **FALTA** (los 3 puntos) | **L** | **Sí** | Estimación-ciclo |
| 8 | **Cobro / tránsito a pago** (contratista promueve / cola finanzas / fecha factura / SPEI / no pagar sin avance) | **PARCIAL** — faltan los 5 sub-puntos | **L** | Parcial² | Revisión, Avance |
| 9 | **Convenios** (promover / soportes antes / congelar+adicionales / no periodo pasado / curva) | **PARCIAL** — versionado pasivo existe; falta el resto | **XL** | **Sí** | Estimación-ciclo, Bitácora |
| 10 | **Sustitución** (no con pendientes / separar ver-reemplazar) | **FALTA** | **M** | Sí (ruta) | Bitácora |
| 11 | **Sesiones** (matar la anterior) | **FALTA** — JWT stateless, multisesión | **M** | **Sí (todo auth)** | — |
| 12 | **Portafolio** (semáforo → expediente al clic) | **FALTA** — el clic abre panel inline, no navega | **S** | No | — |
| 13 | **Historias** (formato + volver a aprobada) | **FALTA** — reescritura de las 27 | **L** | No (docs) | todos los de código |

¹ Solo el frontend; SI se decide extender el gate a la estimación, eso sí toca `estimaciones-ciclo.controller.js`.
² `pagos.controller.js` no está en la lista literal, pero el montaje de rutas nuevas en `server.js` y el gate
"sin avance" / cola global sí pueden tocar congelado.

**Leyenda esfuerzo:** S = <1 h · M = 1–3 h · L = medio día–día · XL = >1 día.

---

## 3. Confirmación detallada (evidencia `archivo:línea`)

### 1 · BITÁCORA obligatoria — **PARCIAL**
El flujo HOY es exactamente "al revés" como dijo el profe:
- **El alta NO abre ni redirige a bitácora:** `contratos.controller.js:49-510` (crearContrato) nunca inserta en
  `bitacora_aperturas`; `AltaContrato.jsx:1827-1830` tras guardar redirige a **"Registrados"**, no a `/bitacora/apertura`.
- **Los gates SÍ existen** (todos devuelven 409 "ábrela primero", pero **ninguno redirige a abrir**): avance
  `trabajos.controller.js:256-259`, convenio `convenios.controller.js:162-163`, sustitución `roster.controller.js:131-132`,
  atraso `alertas.controller.js:208-211`, finiquito `finiquito.controller.js:119-120`.
- **ASIMETRÍA:** el **ciclo de estimación NO exige bitácora** — `estimaciones-ciclo.controller.js:191-205` y `:505-507`
  solo "no asienta la nota" si no hay apertura, pero **deja presentar/autorizar**. El profe quiere que tampoco se opere.
- **Falta:** (1) tras el 201 del alta, `navigate('/bitacora/apertura?contrato=<id>')` en vez de ir a Registrados;
  (2) convertir los 409 en un botón "Abrir bitácora"; (3) **decidir con el profe** si se cierra la asimetría de
  estimación. **No recomendado:** auto-apertura silenciosa en crearContrato (la apertura exige datos art.123 fr.III
  y firma conjunta) → mejor **redirección forzada**.

### 2 · EMPRESAS — **PARCIAL** (el más caro de los cimientos)
- El catálogo de empresas como entidad general **YA existe**: `schema.sql:1684-1698` (`empresas` independiente +
  índice único normalizado), la persona elige empresa del catálogo al registrarse (`SeleccionRol.jsx:271-307`).
- **Pero el modelo es persona→empresa 1:1 fija:** `usuarios.empresa_id` (`schema.sql:1697`) → la persona **nace
  asignada** a UNA empresa; la empresa del contrato se **deriva** por JOIN (`contratos.controller.js:568-570`),
  no se elige al firmar. `acceso.js:32-33` también asume `empresa_id` único.
- **Falta (cambio de modelo):** romper el 1:1 (tabla `persona_empresa` o fijar la empresa **por contrato** en
  `contrato_roster`); en el alta del contrato **pedir explícitamente** la empresa del contratista/supervisión;
  re-cablear `contratos.controller.js` y `acceso.js`; decidir si la empresa en el registro pasa a opcional.
- **Riesgo:** backfill de datos existentes, romper acotamiento por empresa, regresión en padrón y suite e2e.
  **Es decisión de modelo, no de presentación — Maiki/profe.**

### 3 · AVANCE — **PARCIAL** (4 sub-puntos)
- **(a) Periodo vigente = FALTA.** `trabajos.controller.js:262-266` solo valida que el periodo **exista** en el
  programa; `TrabajosTerminados.jsx:331-342` lista **todos** los periodos sin restringir al vigente. La noción de
  "periodo actual" solo vive en `CurvaAvance.jsx:278-284`, no en el registro → se puede reportar en periodo pasado/futuro.
- **(b) Foto en avance = FALTA.** `AmbienteAvance.jsx:25,148-160` es placeholder que manda al Expediente;
  `FotosEstimacion.jsx:8` está 100% ligado a `estimacionId`; los 4 endpoints son `/estimacion/:id`. La foto solo
  vive en estimación/expediente. **Necesita** tabla nueva `avance_fotos` (DDL) + controller/routes nuevos (copiar
  patrón de `estimacion-fotos`) + montar input en `TrabajosTerminados.jsx`.
- **(c) No corregir / nota vinculada = YA.** `trabajos.controller.js:342-444` (corregirAvance): anula la original +
  inserta nueva con `reemplaza_a` + nota "dice X / debe decir Y" (art.123). PATCH/DELETE eliminados (append-only). ✅
- **(d) Sin negativos = PARCIAL.** La curva S nunca pinta negativos (`CurvaAvance.jsx:80` hace `Math.max(0,…)`),
  **pero el KPI "Desviación" muestra "−61.0%"** (`CurvaAvance.jsx:521-526`) y `PortafolioEjecutivo.jsx:105` el `pp`
  crudo. **Falta:** mostrar "Atraso de 61%" / "Adelanto de X%" / "En programa" (solo presentación).

### 4 · ESTIMACIÓN-CICLO — **FALTA** (los 5)
- **(a) No bloquea estimar antes de cerrar periodo:** `estimaciones.controller.js:59-66` solo valida formato y
  ≤1 mes (art.54); **no compara contra hoy**. `IntegracionEstimacion.jsx:884-922` deja elegir cualquier periodo.
- **(b) No filtra conceptos del periodo:** `avanceDeContrato` (`estimaciones.controller.js:534-563`) devuelve
  **todos** los conceptos del catálogo, sin join al programa del periodo.
- **(c) No jala del avance:** no consulta avance físico (HU-06) ni notas; `cantidades[cid]` se teclea a mano
  (`IntegracionEstimacion.jsx:300-309`). Es recaptura manual total, no "solo modificar".
- **(d) Plazo mal calculado:** `EnvioEstimacion.jsx:90-96` resta `hoy − periodo_fin`; como el periodo está en el
  futuro, sale negativo y muestra **"hace −22 días"** (`:255-260`). Nunca contempla "faltan X días para que cierre".
- **(e) "Avance del contrato" 14.9% mal:** `estimacion-prep.controller.js:100-141` calcula `(Σ valor estimado) /
  monto`; está etiquetado "ejecutado" pero **no refleja avance físico** (sería 0%) ni programado (50%).
- **Recomendación de orden:** (d) es **S y aislado → hacerlo YA** (solo `EnvioEstimacion.jsx`). (e) es M. (a)(b)(c)
  son cambios de modelo/flujo (XL) y **tocan `estimaciones.controller.js` congelado → Maiki**.

### 5 · REINGRESO (HU-16) — **YA implementado, hay que desmontarlo**
- Existe de punta a punta: `estimaciones-ciclo.controller.js:621-709` (reingresarEstimacion), ruta `:44`, columna
  `reemplaza_a` (`schema.sql:1194-1202`), página `ReingresoEstimacion.jsx` (482 líneas), ruta `App.jsx:91`, permiso
  `permisos.js:30`, pestaña `PestanasCiclo.jsx:26`, consumidores en portafolio/tablero/ciclo-de-vida.
- **El histórico de rechazos que pide el profe YA lo cubre HU-14** (`HistorialEstimaciones.jsx:355-369`).
- **Falta:** borrar página/endpoint/ruta/pestaña/permiso; redirigir el rechazo al flujo de **integración HU-12**;
  **verificar que HU-12 acepta re-presentar el MISMO periodo** tras un rechazo (si hay UNIQUE(contrato,periodo) o
  guard, ese es el cambio funcional real). La columna `reemplaza_a` puede quedar **inerte** (no migrar).
- **Toca congelado:** `App.jsx`, `permisos.js`, `schema.sql` → Maiki.

### 6 · CARÁTULA GACM — **PARCIAL** (las fotos confirman 3 documentos)
Las 3 fotos del GACM = **(1) carátula financiera**, **(2) estimación de servicios ejecutados** (resumen de
conceptos), **(3) generador por concepto con foto de la actividad**. Estado:
- **Financiera:** `estimaciones.controller.js:490-518` (detalleEstimacion) YA deriva los bloques **"Importes sin
  IVA"** (5 campos con %) y **"Del anticipo"** (5 campos con %). ✅
- **FALTA el bloque "Del neto a recibir":** el sistema es **deliberadamente SIN IVA** (art.2-XIX, banner
  `IntegracionEstimacion.jsx:365`). **Las fotos del GACM SÍ traen IVA 16%, total con IVA, IVA sobre amortización,
  total amortización, "trabajos no ejecutados" y 5 al millar SFP.** ⚠️ **Tensión legal de fondo** (ver §6).
- **Servicios ejecutados:** faltan columnas GACM **especificación, "según proyecto", "por ejecutar"** y el
  encabezado del documento con **descripción de obra / contrato / fecha de contrato / contratista (empresa)**.
- **Foto por concepto = FALTA:** `estimacion_fotos` cuelga solo de `estimacion_id` (`schema.sql:597-614`), no por
  concepto → necesita `contrato_concepto_id` (DDL). El generador del GACM tiene **una foto por generador**.
- **Firmas = FALTAN:** no existe bloque de firmas (residente / superintendente / supervisión externa / autorizó).
  No hay documento imprimible de estimación (solo `DocumentoNota` para notas).
- **Toca `estimaciones.controller.js` (congelado, cuadre G1-G8) y `schema.sql` → Maiki.** Mucho es presentación/UI.

### 7 · REVISIÓN — **FALTA** (los 3)
- **Severidad existe** (`schema.sql:1244` CHECK menor/mayor/crítica; `estimaciones-ciclo.controller.js:236`;
  `RevisionEstimacion.jsx:167-170`) → el profe la quiere **fuera** (toda observación = rechazo de facto).
- **Observación por SECCIÓN, no por elemento** (`schema.sql:1242` enum de 5 secciones; sin FK a concepto) → el
  profe quiere observación **anclada a cada generador/elemento sobre el documento**.
- **Supervisión obligada a turnar:** `estimaciones-ciclo.controller.js:469,534` exigen `residente_id` para
  autorizar/rechazar y turnado previo → el profe quiere que supervisión **rechace directo o turne**.
- **Toca `schema.sql` (quitar severidad, FK a generador) → Maiki**; la lógica de HU-15 vive en
  `estimaciones-ciclo.controller.js` (no congelado).

### 8 · COBRO / TRÁNSITO A PAGO — **PARCIAL** (5 sub-puntos)
- **Quién sube soportes:** contratista **o** finanzas indistinto (`instruccion-pago.controller.js:238,268`); falta
  el **paso intermedio donde el contratista promueve su cobro** (CFDI + oficio + datos SPEI). La subida de archivos
  binarios **no existe** (`TransitoPago.jsx:366` "Carga de archivo no disponible").
- **Cola de finanzas = NO EXISTE:** no hay endpoint que liste solicitudes de **todos** los contratos; ambas
  pantallas obligan a elegir contrato primero.
- **Fecha de factura no validada** (`pagos.controller.js:10-14` solo valida formato; una fecha futura pasa).
- **SPEI no valida** (`pagos.controller.js:40-41` acepta letras; `RegistroPagoForm.jsx:127` input libre).
- **No bloquea pago sin avance** (cero referencia a avance físico en la ruta de pago).
- **Falta montar rutas nuevas en `server.js` (congelado) → Maiki**; el gate "sin avance" cruza con avance/estimación.

### 9 · CONVENIOS — **PARCIAL** (el otro XL)
- **(a) "registrar" → "promover" = FALTA** (todo el copy y el estado dicen "registrar/registrado").
- **(b) Soportes antes = FALTA:** hoy el oficio se sube **después** sobre un convenio ya creado
  (`convenios.controller.js:400`) y solo hay **un** tipo de documento (no los 3: solicitud/autorización/técnicos).
- **(c) Congelar originales + etiquetar adicionales = FALTA:** al revés — `convenios.controller.js:217-219` permite
  **UPDATE** de cantidad/pu de los originales (cambiar 524→1500 sí se puede); no hay columna `es_adicional`.
- **(d) No adicionar a periodo pasado = FALTA:** solo valida que el periodo exista, no contra hoy.
- **(e) Curva vieja congela / nueva arranca = PARCIAL:** hay versionado pasivo (`snapshotVersion` + trigger
  supersede), **pero** el programa vivo se sobrescribe in-place (`lib/programa.js:164-168`) y la curva lee el vivo;
  no hay "curva histórica congelada + nueva con nuevo marco".
- **Toca `schema.sql` (es_adicional, lectura por versión) → Maiki.**

### 10 · SUSTITUCIÓN — **FALTA**
- **Pendientes NO se validan:** `roster.controller.js:89-256` valida rol/motivo/bitácora/misma-empresa pero
  **nunca** consulta si el saliente tiene notas sin firmar (los datos existen: `bitacora_notas.emisor_id` +
  `bitacora_nota_firmas`). La sustitución procede con pendientes.
- **Ver / reemplazar NO separados:** `RosterContrato.jsx` mezcla roster vigente + formulario de sustitución en una
  sola pantalla; la consulta de solo lectura solo existe embebida en el Expediente, no como historia propia.
- **Cuidado:** excluir del conteo de pendientes las notas con **aceptación tácita** (`schema.sql:939-942` la deriva,
  no inserta fila) o bloqueará de más. **Qué cuenta como "pendiente" y si es bloqueo o aviso → decide el profe.**

### 11 · SESIONES — **FALTA** (todo auth → Maiki)
- JWT 100% **stateless**: `auth.controller.js:55-62` firma sin guardar sesión; `auth.middleware.js:11-17` solo
  `jwt.verify` sin lookup; no hay tabla de sesiones; `logout` solo borra localStorage. **Multisesión permitida**, token 8 h.
- **Falta** (volver el JWT invalidable): columna `token_version` en `usuarios`; en login incrementarla y meterla en
  el payload; en el middleware comparar contra la BD → 401 si no coincide (last-login-wins). **Todo zona congelada.**

### 12 · PORTAFOLIO — **FALTA** (quick win)
- `PortafolioEjecutivo.jsx`: la fila solo tiene `onDoubleClick` que abre un **panel inline** (`:137,:273`); el
  semáforo no tiene `onClick`; no importa `useNavigate`. **Nunca lleva al expediente.**
- **Falta:** `navigate('/contratos/expediente?contrato=<contrato_id>')` al clic del semáforo (con `stopPropagation`).
  El dato `contrato_id` ya viene del backend. **No toca congelado.** ~30–60 min.

### 13 · HISTORIAS (formato) — **FALTA**
- El `.md` actual (`Historias_Usuario_ACTUALIZADAS_12jun.md`, 882 líneas) ya pasó una limpieza (los "Criterios
  adoptados" ya salieron), **pero sigue con:** "Fundamento legal" extenso en las 27 (87 citas `art. N`), jerga
  vetada — `asistente de 7 pasos` (HU-01:155), `matriz concepto × periodo` (HU-01/HU-05), `curva S`, `9 bloques`,
  `tres pestañas`, `línea de tiempo de 4 fases`, rutas técnicas (`/contratos/roster`…), y marcas internas
  `[DUDA para el profe]` / `[validar profe]`.
- **Falta:** reescribir las 27 al formato **QUÉ hace + criterio verificable** (generó registro / mandó
  notificación / sin datos vacíos / rechaza Y), quitar fundamentos del cuerpo visible (a un anexo de trazabilidad),
  quitar jerga/rutas/marcas, **y cambiar el contenido** de las que el profe corrigió (ver §5/§6).

---

## 4. Plan de ejecución ordenado por dependencias

### Grafo de dependencias (qué desbloquea qué)

```
                 ┌─────────────────────────────────────────────┐
  CIMIENTOS      │  B0a BITÁCORA redirect      B0b EMPRESAS      │  (reordenan flujo y modelo)
                 └───────┬───────────────────────────┬─────────┘
                         │                            │
  EJECUCIÓN        B1a AVANCE  ── B1b SUSTITUCIÓN      │   (dependen de bitácora)
  FÍSICA                 │                            │
                         ▼                            │
  CORAZÓN          B2a ESTIMACIÓN-CICLO ───────────── │   (depende de avance)
  ESTIMACIÓN             │                            │
                         ├──► B2b CARÁTULA GACM        │
                         ├──► B3a REVISIÓN             │
                         ├──► B3b REINGRESO (quitar)   │
                         └──► B3c COBRO ◄── (avance)   │
                                                       ▼
  CONVENIOS        B4 CONVENIOS ◄── (estimación + bitácora)

  PARALELO SIN DEPENDENCIAS (cualquier momento):  B12 PORTAFOLIO (S) · B11 SESIONES (M, Maiki)
  AL FINAL:  B5 HISTORIAS (refleja el código ya cerrado)
```

### Bloques (en orden de arranque)

**BLOQUE 0 — Cimientos del flujo + decisiones grandes (arrancar HOY)**
- **0a · Bitácora redirect (M, no congelado).** Tras el alta → `navigate('/bitacora/apertura?contrato=<id>')`;
  los 409 "sin bitácora" → botón "Abrir bitácora". *Decisión profe:* ¿cerrar la asimetría de estimación?
- **0b · Empresas modelo (XL, CONGELADO — Maiki).** Romper el 1:1, elegir empresa al firmar. **Es el cambio de
  mayor blast-radius:** arráncalo en paralelo en manos dedicadas; **decide alcance con el profe antes de tocar el
  esquema** (¿N:M completo o empresa-por-contrato mínima?).

**BLOQUE 1 — Ejecución física (depende de bitácora)**
- **1a · Avance (L).** (a) validar periodo vigente · (b) foto en avance (DDL `avance_fotos` + controller/routes
  nuevos + montaje `server.js` → Maiki) · (d) KPI "atraso de X%". *(c) ya está.*
- **1b · Sustitución (M).** Guard de pendientes (excluir tácitas) + separar "ver equipo" / "reemplazar" (ruta nueva
  en `App.jsx` → Maiki).

**BLOQUE 2 — Corazón de estimación (el camino crítico; máxima prioridad)**
- **2a · Estimación-ciclo (XL).** Empezar por **(d) plazo "faltan X días"** [S, ya] y **(e) avance contrato**;
  luego **(a)** no estimar antes de cerrar periodo, **(b)** solo conceptos del periodo, **(c)** jalar del avance.
  Toca `estimaciones.controller.js` congelado → Maiki para (a)(b)(c).
- **2b · Carátula GACM (XL).** Completar los 3 documentos literal: bloque neto/IVA *(decisión profe, ver §6)*,
  columnas de servicios ejecutados, encabezado (descripción/contrato/fecha/contratista), **foto por generador**
  (DDL → Maiki), **bloque de firmas**. La UI/layout puede empezar apenas se fije el set de campos.

**BLOQUE 3 — Revisión, reingreso y cobro (dependen de estimación)**
- **3a · Revisión (L).** Quitar severidad (DDL) + observación por generador (DDL FK) + supervisión rechaza directo
  o turna. → Maiki para el esquema.
- **3b · Reingreso quitar (M).** Desmontar HU-16 + asegurar que HU-12 acepta re-presentar el mismo periodo.
- **3c · Cobro (L).** Paso "contratista promueve cobro" (CFDI/oficio/SPEI) + cola global de finanzas + validar
  fecha de factura + validar SPEI numérico + no pagar sin avance. Montaje en `server.js` → Maiki.

**BLOQUE 4 — Convenios (el otro XL; en paralelo desde que esté el equipo libre)**
- **4 · Convenios (XL).** "registrar"→"promover" [S, ya] · soportes antes (3 docs) · congelar originales +
  etiquetar adicionales (DDL `es_adicional` → Maiki) · no adicionar a periodo pasado · curva vieja congela / nueva
  arranca.

**PARALELO (sin dependencias, encájalos donde haya manos)**
- **Portafolio (S).** Clic del semáforo → expediente. *Quick win de demo.*
- **Sesiones (M, CONGELADO — Maiki).** `token_version` que mata la sesión anterior. Riesgoso (auth) → Maiki.

**BLOQUE 5 — Historias (AL FINAL, reflejando el código cerrado)**
- **5 · Reescribir las 27 (L).** Partir del **xlsx aprobado del 4-jun** (ya recuperado) → formato QUÉ + criterio
  verificable; quitar jerga/fundamentos-extensos/marcas; **aplicar los cambios de comportamiento** (avance exige
  bitácora, reingreso eliminado, revisión sin severidad, cobro promueve, convenios congela, sustitución ver/reemplazar);
  manejar HU-22/23/24 (no existían el 4-jun). Reescribir con 1 agente por bloque de HU + revisión tuya.

### Reparto sugerido (3 noches, 4–5 personas)

| | Camino crítico (estimación) | Frente B | Frente C |
|---|---|---|---|
| **Noche 1 (hoy)** | Quick wins (plazo, KPI, portafolio) · arranca Estimación-ciclo (a/b/c) | Bitácora redirect · Avance (foto+periodo) | Empresas (modelo) — Maiki |
| **Noche 2 (mar)** | Carátula GACM (3 docs) | Revisión + Reingreso quitar | Convenios (congelar/adicionales/curva) |
| **Noche 3 (mié)** | Cobro (promueve+cola+validaciones) | Sustitución · Sesiones (Maiki) | **Historias** (reescritura) + cierre/smoke |

---

## 5. Separación que pediste: (a) CÓDIGO vs (b) HISTORIAS

### (a) Arreglos de CÓDIGO
Todo lo de §3 puntos **1–12**. Resumen por tipo:
- **Presentación/UI pura (rápido, sin riesgo):** portafolio→expediente, KPI "atraso de X%", plazo "faltan X días",
  copy "promover", redirect de alta y botones "Abrir bitácora".
- **Lógica de dominio (controllers no congelados):** sustitución (guard pendientes + separar pantallas), revisión
  (quitar severidad / por-generador / rechazo de supervisión), cobro (paso de promoción + cola + validaciones),
  convenios (soportes antes / no periodo pasado), reingreso (desmontaje).
- **Modelo de datos / zona congelada (Maiki):** empresas (relación persona-empresa), estimación-ciclo (guards en
  `estimaciones.controller.js`), carátula (cálculo IVA/neto + DDL foto-por-concepto), avance (DDL `avance_fotos` +
  `server.js`), revisión (DDL severidad/FK), convenios (DDL `es_adicional`), sesiones (auth completo), montajes de
  rutas nuevas en `server.js`.

### (b) Corrección de HISTORIAS (§3 punto 13)
- **Baseline:** xlsx 4-jun (`git show 3622878:docs/Historias_Usuario.xlsx`) — formato limpio ya aprobado.
- **Formato objetivo:** *Título natural + QUÉ hace + criterios de éxito verificables*; sin jerga, sin rutas, sin
  fundamentos extensos en el cuerpo (a un anexo), sin marcas `[DUDA]`/`[validar profe]`.
- **Cambios de contenido obligados por el 22-jun:** HU-06/HU-03 (exigen bitácora, ya no "diferido"), **eliminar
  HU-16**, HU-15 (sin severidad, por elemento, supervisión rechaza/turna), HU-20/21 (paso de promoción de cobro +
  validaciones), HU-03 (promover/congelar/adicionales/curva), HU-22 (separar ver/reemplazar), HU-05/06 (sin
  negativos, foto en avance), HU-12/13 (estimar al cerrar periodo, jalar de notas, plazo 6 días).
- **Estructura final:** ~24 historias + Registro + Por Firmar (HU-16 fuera; HU-22/23/24 dentro; posible split de
  sustitución en consulta + acción).

---

## 6. Decisiones que **NO** las toma Code — confirmar con el profe/Maiki

Estas bloquean o cambian el alcance; conviene resolverlas **antes** de programar el bloque correspondiente:

1. **CARÁTULA — IVA (la más grande).** Las fotos del GACM traen **IVA 16% y "trabajos no ejecutados"**, pero el
   sistema se diseñó **SIN IVA** (art.2-XIX). "Copia literal" ⇒ habría que **agregar IVA**, lo que contradice la
   decisión legal vigente y toca el cuadre congelado. **¿Se agrega el bloque neto-con-IVA?** (las fotos dicen que sí).
2. **CARÁTULA — Firmas.** ¿Bloque impreso para firma manuscrita (presentación) o firma electrónica? (asumo lo primero).
3. **EMPRESAS.** ¿Romper a N:M completo o empresa-por-contrato mínima? ¿La empresa en el registro pasa a opcional?
4. **BITÁCORA.** ¿La estimación también se bloquea sin bitácora abierta (cerrar la asimetría)? ¿Redirección forzada
   o aviso? (auto-apertura silenciosa NO se recomienda).
5. **AVANCE / ESTIMACIÓN — periodos.** ¿Se permite registrar/estimar periodos pasados (registro tardío) o se bloquea
   duro? El bloqueo duro **rompe el seed actual** (sus fechas están en el futuro: por eso aparece "−22 días").
6. **REVISIÓN.** ¿A quién se atribuye el rechazo directo de supervisión (art.53/54)?
7. **COBRO — SPEI.** ¿Formato exacto? (la clave de rastreo SPEI es numérica; confirmar antes de endurecer).
8. **SUSTITUCIÓN.** ¿Qué cuenta como "pendiente" (solo notas sin firmar, o también estimaciones/avances en trámite)?
   ¿Bloqueo o aviso?
9. **CONVENIOS.** ¿"Periodo pasado" se mide por fecha de hoy o por periodo ya estimado? ¿Basta el versionado pasivo
   o HU-05 debe dibujar dos curvas (histórica congelada + nueva)?

---

## 7. Consolidado de zona congelada (lo que integra Maiki)

| Cambio | Archivo congelado | Tipo |
|--------|-------------------|------|
| Empresas (modelo) | `schema.sql`, `auth.controller.js`, `contratos.controller.js`, `acceso.js` | DDL + lógica |
| Estimación-ciclo (a/b/c) | `estimaciones.controller.js` | guards |
| Carátula (IVA/neto) | `estimaciones.controller.js` | cálculo |
| Carátula (foto por concepto) | `schema.sql` (`estimacion_fotos.contrato_concepto_id`) | DDL aditivo |
| Avance (foto) | `schema.sql` (`avance_fotos`), `server.js` (montaje) | DDL + montaje |
| Revisión | `schema.sql` (quitar severidad, FK a generador) | DDL |
| Reingreso (desmontaje) | `App.jsx` (ruta), `permisos.js` (HU-16), `schema.sql` (`reemplaza_a` inerte) | borrado |
| Sustitución (split) | `App.jsx` (ruta nueva de consulta) | ruta |
| Cobro | `server.js` (rutas nuevas), posible `schema.sql` (estado de solicitud) | montaje + DDL |
| Convenios | `schema.sql` (`es_adicional`) | DDL aditivo |
| Sesiones | `schema.sql` (`token_version`), `auth.controller.js`, `auth.middleware.js`, `auth.routes.js` | auth completo |

> Todas las migraciones, **aditivas e idempotentes** (`ADD COLUMN IF NOT EXISTS`, guards), probadas 2–3× en local
> antes de Render, conforme a la regla del proyecto.

---

## 8. Próximo paso

Revisa este plan y dime **por qué bloque arrancamos**. Mi recomendación: **esta noche** los 5 quick wins
(portafolio, plazo, KPI, reingreso-desmontaje, copy convenios) para mover el marcador, **en paralelo** Bitácora
redirect + arranque de Estimación-ciclo, y que **tú** decidas ya el alcance de **Empresas** y la **IVA de la
carátula** (son las dos decisiones que más amarran el resto). En cuanto me digas, ejecutamos por bloques.
