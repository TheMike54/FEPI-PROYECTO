# PLAN DE SOLUCIÓN DE ERRORES — SIGECOP (19-jun, investigado 20-jun)

> **Esto es un PLAN clasificado, NO arreglos.** Nada de código se tocó. Local, sin push.
> **Principio rector:** el sistema es **muy confuso para quien no lo construyó**. Cada solución debe **reducir la
> confusión del usuario nuevo**, no solo tapar el bug técnico. Se leyó el código real (causa raíz con `archivo:línea`).
>
> **Convergencia:** se cruzaron **los 8 bugs de Maiki** (probando en local) con **los hallazgos de la auditoría**
> del plan de pruebas. La investigación **verificó cada uno contra el código** y corrigió varios supuestos (de Maiki
> y míos) — ver §FALSOS POSITIVOS al final. **Zona congelada** = `App.jsx`, `permisos.js`, `SesionContext.jsx`,
> `schema.sql`, controllers/routes de auth/usuarios/contratos/estimaciones (solo Maiki).

---

## 0. RESUMEN EJECUTIVO — qué atacar primero (confusión↓ con riesgo↓)

| Orden | Tanda | Qué incluye | Por qué primero | Riesgo | Esfuerzo |
|---|---|---|---|---|---|
| **1** | **Limpiar jerga interna de la UI** (B8) | "Etapa 1", "Nivel 1 profe", badge **HU-XX** flotante, "(por bloques)", "Sprint" | Lo que **más grita "proyecto escolar"**; el profe lo ve en CADA pantalla; cero lógica | 🟢 nulo (solo cadenas) | S–M |
| **2** | **Matar los callejones a Inicio** (B2, A-nav-3, A-nav-4 + helper) | Links cross-actor que rebotan a Inicio; crear `<LinkHU>` y aplicarlo | Dead-end **mudo** = "se rompió"; lo sufre quien más usa la pantalla | 🟢 bajo (no congelado) | M |
| **3** | **Tarjetas del Inicio → misma pantalla que el sidebar** (B3, A-inicio-otros) | Avance y Bitácora abren el ambiente completo y marcan el sidebar | "Desde la tarjeta sale incompleto" = el usuario no sabe cuál es la buena | 🟢 bajo | S |
| **4** | **Quitar la re-selección de contrato en cadena** (B7, B7b, B6, B6b) | Preseleccionar `?contrato`, auto-desbloquear "Emitir" por estado backend | La confusión #1: "¿no le acabo de decir el contrato?" | 🟢 bajo | S (c/u) |
| **5** | **Convenio: hacer visible el "piso" de lo estimado** (B5-1/2/3) | Mostrar "ya estimado" y validar en vivo antes del 400 | "La estimación me bloquea el convenio" sin saber por qué | 🟡 medio (no congelado) | M |
| **6** | **Candados con motivo** (A5) + mensajes de error legibles (B5-2) | Botón gris dice por qué; toasts crudos → guía | Botón gris mudo = "¿está roto?" | 🟢 bajo | S |
| **7** | **Diagnosticar el 500 de "Autorizar"** (B4) | Es **esquema parcial en la BD**, no código → se cierra en la fase de BD (Parte 4) | 🔴 el profe ve "error interno" | 🔴 toca esquema (Maiki) | M |
| **—** | **Evaluaciones** (Parte 3) | A: contrato global · B: solo campana · C: sidebar responsive | Decide Maiki el alcance | — | — |
| **—** | **Infra BD** (Parte 4) | Resembrar / limpiar Render (al final, con los arreglos) | — | 🔴 destructivo | — |

> **Patrón de oro de la tanda 2:** crear **un** componente `src/components/LinkHU.jsx` que oculte/deshabilite un
> enlace cuando `nivelDe(HUdestino, rol) === null` (con tooltip "esto lo hace X actor"). Convierte 5 fixes sueltos
> en 1, y deja el sistema **predecible** para quien no lo hizo. **No toca `App.jsx` ni `permisos.js`** (solo los lee).

---

## 1. BUGS DE MAIKI + HALLAZGOS DE AUDITORÍA (causa raíz · tipo · fix · riesgo · esfuerzo · clase)

### 🔴🟡 TANDA 1 — Jerga interna visible (Bug 8 de Maiki)
> Todo son **cadenas de UI** (riesgo nulo en lógica). Ojo: varias tienen `data-testid`; revisar specs e2e que
> validen texto exacto antes de cambiar.

| ID | Dónde (archivo:línea) | Qué se ve hoy | Reemplazo propuesto (neutro) | Clase |
|---|---|---|---|---|
| **B8j** | `components/ui/AppShell.jsx:373-376` (badge `indicador-hu`, **toda la app**) + `RUTAS_MARCO :19-29` | Píldora dorada **"HU-22"/"HU-24"** flotante abajo-derecha en casi todas las pantallas | **Ocultar el badge `huCode`** (no renderizar el `<span>{huCode}</span>`); quitar "(recorrido por bloques)" de los labels de `RUTAS_MARCO` | 🔴 |
| **B8c** | `pages/PortafolioEjecutivo.jsx:197` y `:336` | **"[Nivel 1 profe]"** (¡menciona al evaluador!) | `:197` → "Tipo de contratación — no disponible"; `:336` → quitar el paréntesis o "(no disponible en esta versión)" | 🔴 |
| **B8a** | `pages/AmbienteAvance.jsx:150`, `:155`, título `:82` | "fuera del alcance de la **Etapa 1**" (x2) + "(por bloques)" | `:150` → razón legal (art. 118 RLOPSRM); `:155` → "no disponible en esta versión"; `:82` → sin "(por bloques)" | 🔴 |
| **B8d** | `pages/IntegracionEstimacion.jsx:976` (`soportes-fotos-alcance`) | "fuera del alcance de la **Etapa 1**… etapa posterior" | "El registro fotográfico no es requisito legal de la estimación (art. 132 RLOPSRM…)" — sin mencionar etapas | 🔴 |
| **B8h** | títulos `Ambiente*.jsx` (`AmbienteAvance:82`, `AmbientePago:77,84`, `AmbienteFiniquito:79,86`, `AmbienteBitacora:93`, `AmbienteExpediente:73`, `AmbienteConvenio:83`) | **"(por bloques)"**, "cascarón" | Quitar "(por bloques)"; en avisos cambiar "por bloques" → **"paso a paso"** | 🟡 |
| **B8i** | `pages/CicloVidaContrato.jsx:140` + array `:27-37` | "(recorrido por bloques)" + títulos con **"(HU-09/10)"** | h1 sin "(recorrido por bloques)"; quitar los "(HU-xx)" de los títulos | 🟡 |
| **B8b** | `pages/CurvaAvance.jsx:523` | "(no se desglosa por concepto en **Etapa 1**)" | "(el financiero se reporta a nivel contrato, no por concepto)" | 🟡 |
| **B8e** | `components/convenios/EditorProgramaConvenio.jsx:126` (`cm-sin-periodos`) | "no se puede capturar una matriz por convenio en **Etapa 1**" | "primero captura el programa de obra para distribuir el convenio por periodo" | 🟡 |
| **B8f** | `pages/ReingresoEstimacion.jsx:399` | "no se persiste en **Etapa 1**; criterio del equipo… esquema diferido" | "queda como referencia en esta pantalla y no se almacena de forma permanente" | 🟡 |
| **B8g** | `pages/ConveniosModificatorios.jsx:24` | **FALSO POSITIVO**: está en un **comentario**, no se renderiza | (opcional, higiene; no es necesario) | 🟢 |

- **Tipo:** diseño/UX (con sustrato técnico en B8j: el badge alimentado por `RUTAS_MARCO`). **Zona congelada:** **no**
  (`AppShell.jsx` y `pages/*` no están congelados; los congelados de frontend son `App.jsx`, `permisos.js`,
  `SesionContext.jsx`). **Esfuerzo total:** S–M. **Nota:** los `prop sprint='Sprint N'` y `data/dummy.js` **no** se
  renderizan (HeaderVista los ignora) → no son ocurrencias visibles.

---

### 🔴🟡 TANDA 2 — Callejones a Inicio (Bugs 1 y 2 de Maiki + auditoría de navegación)
> **Causa común:** `WithLayout` (`App.jsx:61-62`) redirige a Inicio cuando `nivelDe(HU_POR_RUTA[ruta], rol)===null`
> (correcto como red de seguridad). El problema: el frontend **muestra el link igual** aunque el rol no tenga la HU
> destino → rebote **mudo**. **Fix transversal:** componente `LinkHU` (ver A-nav-6).

| ID | Causa raíz (archivo:línea) | Quién lo sufre | Clase | Esf. |
|---|---|---|---|---|
| **B2** | `pages/IntegracionEstimacion.jsx:854` `par-revision` → `/estimaciones/revision` (HU-15). Bloque "en paralelo" `:851-859` se pinta SIEMPRE | **Contratista** (dueño del wizard HU-12; HU-15=null) → rebota | 🔴 | S |
| **A-nav-3** | `pages/AmbienteAvance.jsx:142` `link-alertas` → `/seguimiento/alertas` (HU-07) | **Contratista** (actor central del avance; HU-07=null) → rebota | 🔴 | S |
| **A-nav-4** | `pages/AmbienteFiniquito.jsx:118,131,132,189` (apertura HU-08, integración HU-12, envío HU-13, consulta HU-10) | **Dependencia** (actor del finiquito; null en esas 4) → 4 botones rebotan | 🔴 | M |
| **B2b** | `pages/IntegracionEstimacion.jsx:855,856` `par-reingreso` (HU-16) y `par-historial` (HU-14) | **Supervisión** (HU-12='C'; HU-16/HU-14=null) → rebota | 🟡 | S |
| **A-nav-5** | `pages/AmbienteConvenio.jsx:173` `link-consulta` → `/bitacora/consulta` (HU-10) | **Dependencia** (registra el convenio; HU-10=null) → rebota | 🟡 | S |
| **A-nav-6** | **Patrón de fondo**: no hay un guardián de link reutilizable; solo `AltaContrato.jsx:1061` lo hace a mano (ver B1) | — (causa común de los anteriores) | 🟡 | M |

- **Tipo:** ambos (bug de navegación + UX). **Fix que reduce confusión:** crear **`src/components/LinkHU.jsx`**
  (recibe `hu`, `to`, `children`, `fallbackTexto`; si `nivelDe(hu,rol)!==null` renderiza `<Link>`, si no, un chip
  **deshabilitado con tooltip** "esto lo hace X actor"). Reemplazar los links cross-actor de las 4 pantallas. Así un
  usuario nuevo **entiende el reparto de actores** en vez de un rebote mudo. **Zona congelada:** **no** (archivo
  nuevo + ediciones en `pages/*`; solo *lee* `permisos.js`/`SesionContext`). **Esfuerzo:** M (helper) + S (aplicarlo).

---

### 🟡 TANDA 3 — Tarjetas del Inicio ≠ destino del sidebar (Bug 3 de Maiki)
| ID | Causa raíz (archivo:línea) | Síntoma | Clase | Esf. |
|---|---|---|---|---|
| **B3** | `Inicio.jsx:24` define el item como `{hu:'HU-06'}` → resolver `:69-74` lo manda a `h.ruta` = `/seguimiento/trabajos-terminados` (`dummy.js:150-155` = pantalla suelta). El **sidebar** usa ruta fija `/seguimiento/ambiente` (`Sidebar.jsx:50`, = ambiente completo, `App.jsx:125`). | La tarjeta abre la pantalla **incompleta** (solo registro), y el NavLink del sidebar **no se ilumina** (la URL no coincide). **Los 3 síntomas de Maiki = mismo origen.** | 🟡 | S |
| **A-inicio-otros** | `Inicio.jsx:23` `{hu:'HU-08'}` → `/bitacora/apertura`; el sidebar usa `/bitacora/ambiente` (`Sidebar.jsx:43`) | Tarjeta de **Bitácora** con el mismo desajuste (no lo reportó Maiki pero es idéntico) | 🟡 | S |

- **Tipo:** ambos. **Fix:** en `Inicio.jsx` cambiar esos 2 items por **ruta fija** al ambiente (igual que el sidebar),
  con los **mismos roles** que la guarda `SoloRol` de esas rutas (avance: contratista/residente/supervisión; bitácora:
  los mismos). Regla general: **si un ciclo tiene "ambiente", la tarjeta del Inicio apunta a ESA ruta**, no a la HU
  hija. El resto de tarjetas ya coinciden (verificado una a una). **Zona congelada:** **no** (solo el array `SECCIONES`
  de `Inicio.jsx`). **Esfuerzo:** S.

---

### 🟡🟢 TANDA 4 — Re-selección de contrato en cadena (Bugs 6 y 7 de Maiki + auditoría)
| ID | Causa raíz (archivo:línea) | Qué confunde | Clase | Esf. |
|---|---|---|---|---|
| **B7** | El ambiente SÍ propaga `?contrato` (`AmbienteBitacora.jsx:75,161,188`) pero **las pantallas destino NO lo leen**: `AperturaBitacora.jsx:124` (`useState('')`) y `EmisionNotas.jsx:37` no usan `useSearchParams` | El contrato viaja en la URL pero la pantalla **nace vacía** y obliga a re-elegirlo | 🟡 | S |
| **B7b** | `AmbienteBitacora.jsx` ya deriva `abierta`/`completa` del backend (`:73,74`) pero el wizard arranca en `useState(0)` (`:49`) y `setPaso(0)` al elegir contrato (`:57`); nada hace `setPaso(2)` aunque ya esté completa | Obliga a **recorrer pasos ya cumplidos** para llegar a "Emitir" (Maiki: "me obliga a re-pisar apertura/firma") | 🟡 | S |
| **B6** | `AmbienteBitacora.jsx:173` `link-firmar` va a `/bitacora/por-firmar` **sin `${q}`**; y `PorFirmar.jsx` es una **bandeja global** (no tiene selector ni lee query, `:22`) | El wizard promete "firmar la apertura de ESTE contrato" y deposita en **todos** los pendientes | 🟡 | S |
| **B6b** | `AmbienteAvance.jsx:116,134,142` propaga `?contrato` a los 3 links, pero solo **alertas** lo lee; `TrabajosTerminados.jsx:28` y `CurvaAvance.jsx:164` lo ignoran | "Registrar avance" y "Curva" desde el ambiente vuelven a pedir el contrato | 🟢 | S |
| **A-3A** | **Sistémico**: cada página tiene su propio `useState('')` + `select-contrato`; solo **2 de 24** leen `?contrato` (`AlertasAtraso.jsx:67-74`, `ConveniosModificatorios.jsx:164-171`) | "Cada pantalla parece otro mundo" — la confusión raíz (candidato de la Parte 3A) | 🟡 | M |

- **Tipo:** ambos. **Fix (mínimo, esta tanda):** replicar el patrón **ya probado** de `AlertasAtraso.jsx:67-74`
  (`useSearchParams` + `useEffect` que preselecciona cuando la lista cargó) en `AperturaBitacora`, `EmisionNotas`,
  `ConsultaNotas`, `TrabajosTerminados`, `CurvaAvance`; en `AmbienteBitacora.jsx` inicializar el paso con
  `setPaso(b?.completa ? 2 : b ? 1 : 0)`; y agregar `${q}` al `link-firmar` + resaltar en `PorFirmar` la fila del
  `?contrato`. **Sin quitar** los selects (por si entran directo del sidebar). **Zona congelada:** **no**.
  **Relación con 3A:** este es el parche por-página; si se hace el **contrato global** (Parte 3A), estos `useEffect`
  se vuelven redundantes. **Recomendación:** parche ahora (S c/u), marcado "a absorber por 3A".

---

### 🟡 TANDA 5 — Convenio vs estimación (Bug 5 de Maiki)
| ID | Causa raíz (archivo:línea) | Qué pasa de verdad | Clase | Esf. |
|---|---|---|---|---|
| **B5-1** | `backend/convenios.controller.js:162-173`: al crear convenio que toca el programa, el backend rechaza (400 + ROLLBACK) si una cantidad `< ` lo **ya estimado** por concepto (SUM de estimaciones no rechazadas, incluye 'integrada'). El editor (`EditorProgramaConvenio.jsx:141-143`) **nunca muestra ese piso** y `ConveniosModificatorios.jsx:177-219` no lo precarga | El usuario reduce un concepto sin saber que hay un **piso invisible**; lee "la estimación me bloquea el convenio" | 🟡 | M |
| **B5-2** | `ConveniosModificatorios.jsx:340-345`: el 400 se muestra como **toast crudo** del backend, efímero, sin señalar la fila | Mensaje incomprensible para usuario nuevo (el profe lo vería en demo) | 🟡 | S |
| **B5-3** | `ConveniosModificatorios.jsx:133-150`: la página **no carga ni muestra** las estimaciones del contrato; el "estimado acumulado" (que rige la regla) es invisible | "La estimación que integré no aparece donde la espero" | 🟢 | M |

- **Tipo:** diseño/UX (con sustrato de visibilidad). **Fix que reduce confusión:** (1) precargar el acumulado estimado
  por concepto (reusar el SELECT de `convenios.controller.js:163-168` o el endpoint de `estimaciones.controller.js:549-556`);
  (2) en `EditorProgramaConvenio` añadir columna **"Ya estimado"** y pintar rojo + leyenda inline si la cantidad < estimado;
  (3) **gatear el botón Registrar** con esa validación cliente (espejo del backend) para que el error sea **en vivo**, no un
  toast tras enviar. Así el usuario entiende: "la estimación no bloquea; solo fija el mínimo por concepto".
  **Zona congelada:** **no** (la regla del backend ya existe; solo se *lee*; el fix es de frontend). **Esfuerzo:** M.

---

### 🟡 TANDA 6 — Candados mudos y mensajes (auditoría)
| ID | Causa raíz (archivo:línea) | Qué confunde | Clase | Esf. |
|---|---|---|---|---|
| **A5** | `AmbienteBitacora.jsx:205`: "Siguiente →" con `disabled={!pasoValido(paso)}` **sin texto** que diga por qué (solo el paso 3 tiene aviso) | Botón gris sin causa = "el sistema está roto" | 🟡 | S |
| **A4** | Inconsistencia: el `?contrato` que pasan los ambientes es **inerte** en varias pantallas (mismo que B7/B6b) | Doble captura del contrato | 🟡 | M |

- **Fix A5:** cuando "Siguiente" esté disabled, mostrar la razón concreta usando los valores ya en scope
  (`abierta`, `completa`, `firmadas`/`totalFirmas` en `AmbienteBitacora.jsx:71-74`): paso 0 → "Primero abre la
  bitácora"; paso 1 → "Faltan firmas: {firmadas} de {totalFirmas}". **Zona congelada:** no. **Esf.:** S.

---

### 🔴 TANDA 7 — "Autorizar" da "error interno" (Bug 4 de Maiki) — ES ESQUEMA, NO CÓDIGO
| ID | Causa raíz (archivo:línea) | Clase | Esf. |
|---|---|---|---|
| **B4-1** | **No existe "Autorizar por concepto"**: el único botón (`RevisionEstimacion.jsx:735-743` `btn-autorizar`) autoriza la **estimación completa** (`autorizarEstimacion`, `estimaciones-ciclo.controller.js:469-528`; UPDATE estado, `:493-499`). El **500 sale del asiento de la nota automática** de bitácora dentro de la **misma transacción** (`:504-518`): inserta `tipo='res_estimaciones'` en `bitacora_notas`. Si en la BD **no corrió** la migración que pasa esa columna de ENUM a `VARCHAR(40)` (`schema.sql:410-413`, guard), o falta el catálogo/FK (`schema.sql:880-901`), el INSERT revienta → ROLLBACK → 500, y la estimación **no** queda autorizada. En una BD con el **schema completo** funciona (por eso `ESTADO_ACTUAL.md` marca HU-15 ✅). | 🔴 | M |

- **Tipo:** ambos. **Confianza:** media (no se pudo correr la BD; el 500 puede ser ENUM no migrado, FK faltante, o
  columnas `asunto/numero/...` no agregadas — las **tres** apuntan a **esquema parcialmente aplicado**, no a bug de
  código del front; el front y el payload son correctos).
- **DIAGNÓSTICO (solo lectura, no modifica nada) — correr ANTES de cualquier fix:**
  ```bash
  docker logs --tail 60 sigecop_backend         # reproducir pulsando Autorizar; buscar "[autorizarEstimacion]" y el error de pg
  docker exec -i sigecop_db psql -U sigecop -d sigecop_db -c "SELECT data_type, udt_name FROM information_schema.columns WHERE table_name='bitacora_notas' AND column_name='tipo';"
  docker exec -i sigecop_db psql -U sigecop -d sigecop_db -c "SELECT clave FROM bitacora_nota_tipos WHERE clave='res_estimaciones';"
  ```
  - `udt_name='tipo_nota_bitacora'` (sigue ENUM) → **causa confirmada**: re-aplicar la migración idempotente de
    `schema.sql` (convierte a VARCHAR(40) + FK + catálogo). **Esto es zona congelada (schema): lo ejecuta Maiki, con
    backup**, runbook `psql --single-transaction -v ON_ERROR_STOP=1` → reverificar → `docker restart sigecop_backend`.
- **Fix de confusión (frontend, fuera de zona congelada):** aclarar el copy del panel de resolución
  (`RevisionEstimacion.jsx:712-714`): *"Autorizas la **estimación completa** (todos sus conceptos). Las observaciones
  por concepto/sección son de la fase de supervisión, no de la autorización."* — el usuario cree que existe "autorizar
  por concepto" porque las observaciones se registran por sección.
- **Conclusión:** el fix real del 500 se cierra en la **fase de BD (Parte 4)** re-aplicando el esquema; el copy del
  front se puede hacer en cualquier tanda.

---

## 2. PARTE 3 — EVALUACIONES (solo riesgo/beneficio a 6 días; NO se planea ejecución)

### 3A — Seleccionar el contrato desde el login + botón "cambiar de contrato" (contrato global)
- **Beneficio: ALTO.** La re-selección en 24 páginas (~26 `select-contrato`) es la **causa raíz** de la confusión que
  alimenta los bugs 3/6/7. Un contrato global + botón "Cambiar de contrato" es **justo lo que un usuario nuevo espera**.
- **Qué tocaría:** (1) un contexto **NUEVO** `ContratoActivoContext` (fuera de zona congelada) que carga la lista una
  vez, persiste en `localStorage` y sincroniza con `?contrato=`; (2) montarlo **envolviendo** en `App.jsx:77` (sin
  editar `SesionContext`); (3) un selector global en `AppShell.jsx` (junto al chip de empresa ~`:224`).
- **Zona congelada:** **solo** si se intenta literalmente "elegir contrato DENTRO del login" (tocaría `SesionContext`/
  auth) → **se evita** con un gate **post-login** dentro de Layout ("Elige tu contrato").
- **Deep-links:** compatibles y **mejorados** (hoy solo 2/24 páginas leen `?contrato`).
- **Multi-contrato:** Portafolio/Tablero/Padrón deben quedar **EXENTOS** (el contrato activo es **opcional**, no filtro
  duro; al hacer clic en una fila del portafolio se setea el activo y se navega al detalle).
- **Costo:** contexto + selector global + lectura/escritura de `?contrato` = **S–M**. La parte **cara y riesgosa** es
  migrar las 24 páginas (**L**), cada una con matices (fetches en `seleccionarContrato`, `precargaToken` anti-race en
  `ConveniosModificatorios.jsx:158`).
- **RECOMENDACIÓN:** **versión mínima a 6 días** — construir el contexto + selector global + `?contrato` centralizado,
  y hacerlo **opcional** (cada página usa el global si existe; conserva su selector local como respaldo). Entrega ~80%
  del beneficio sin la migración masiva ni riesgo en zona congelada. La migración a fondo + gate post-login: **después**
  de los 6 días, coordinado con Maiki. **No** hacerlo completo ni dentro del login a 6 días.

### 3B — Unificar notificaciones a SOLO la campana
- **Hallazgo:** el acuerdo **ya está casi hecho** — la campana (`AppShell.jsx:204-222`) ya muestra un badge
  **unificado** (`totalNotif = atrasos + firmas + solicitudes`, `:155-156`) y agrupa todo en su pop-up (`:326-359`).
  El **Sidebar NO** pinta conteos (solo el pill de HU). El "conteo duplicado" real son **2 superficies**:
  1. **Botón "Por firmar" ✍️** con su propio badge `por-firmar-count` (`AppShell.jsx:184-201`, badge `:195-199`) — es
     un **subconjunto** del de la campana → dos badges pegados confunden. **Quitar** el botón ✍️ + su pop-up
     (`:282-305`); preservar el acceso "Por firmar" dentro del pop-up de la campana. **Esfuerzo S.**
  2. **Banner de atrasos en Inicio** (`Inicio.jsx:99-111`, mismo `api.resumenAtrasos`) — tercer lugar. **Recomendación:
     conservarlo** como bienvenida (más visible al entrar); si se quiere "solo campana" literal, quitar `:99-111` + el
     effect `:56-64`. **Esfuerzo S.**
- **RECOMENDACIÓN:** **mejor relación costo/beneficio del cluster (S, ~1-2h).** Quitar el botón ✍️ y su badge.
  **Riesgo:** `por-firmar-count` se usa en e2e → limpiar specs.

### 3C — Sidebar colapsable + responsive
- **Estado HOY: NO es responsive.** `Sidebar.jsx:152` es `w-72` fijo **sin un solo breakpoint** Tailwind; sin
  hamburguesa, sin colapso, sin overlay. En móvil/tablet el `<main>` queda exprimido.
- **Esfuerzo "bien hecho": M–L.** Requiere estado de colapso, hamburguesa, drawer+backdrop en móvil (el patrón de
  backdrop ya existe en `AppShell.jsx:277`), y labels colapsables. **Riesgo medio:** la suite e2e usa selectores
  `aside a[href=...]` (`AppShell.jsx:50-52`); si el sidebar se **desmonta** en móvil, esos selectores fallan → un
  cambio "cosmético" toca el contrato de pruebas.
- **RECOMENDACIÓN:** **nice-to-have, NO crítico** para la demo (se verá en laptop/proyector). Posponer, o versión
  mínima: ocultar el sidebar bajo `lg` con drawer hamburguesa, **dejándolo siempre en el DOM** (clases de visibilidad,
  no desmontar) para no romper la suite. Si el profe no abre en móvil, se puede saltar sin costo académico.

---

## 3. PARTE 4 — INFRA (BD). NO ejecutar ahora; al final, con los arreglos.

> **Conexión (verificado):** `backend/src/db/pool.js:3-6` — si existe `DATABASE_URL`, el pool la usa con
> `ssl:{rejectUnauthorized:false}` (lo que Render exige). En Render, `render.yaml:37-40` inyecta `DATABASE_URL` desde
> la BD `sigecop-db` **dentro** del servicio backend (no existe en tu máquina). Los scripts son wrappers del mismo
> pool (`reseed_cuentas.js:9`, `seed_demo.js:8`).
> **Caveat del runbook (memoria deploy):** **sin `psql`/`pg_dump` local** → para operar Render usa el **Shell del
> servicio** o node-pg, y respalda en **JSON**. Backup SIEMPRE antes.

### 4.1 RESEMBRAR Render igual que local (aditivo) — comando que pediste
**Opción recomendada (a) — Shell del servicio backend en Render** (la `DATABASE_URL` ya está cargada, no expone la BD):
1. Render Dashboard → `sigecop-backend` → pestaña **Shell**. Verifica `ls package.json` (o `cd` al backend).
2. Comando EXACTO (orden obligatorio: cuentas/empresas **antes** de contratos):
   ```bash
   npm run reseed:cuentas && npm run seed:demo
   ```
**Opción (b) — desde tu PC** (solo si el Shell no está disponible): usar la **External Database URL** de Render (NO la
Internal):
   ```powershell
   $env:DATABASE_URL = "<EXTERNAL_DATABASE_URL_de_Render>"; npm run reseed:cuentas; if ($?) { npm run seed:demo }
   Remove-Item Env:DATABASE_URL   # ⚠️ limpiar para no seguir apuntando a producción
   ```
- **Idempotencia:** `reseed:cuentas` es **idempotente y NO destructivo** (INSERT/UPDATE con `WHERE NOT EXISTS`/`ON
  CONFLICT`/backfill). `seed:demo` es idempotente pero **destructivo acotado**: borra y recrea **solo** 5 folios demo
  (`OBRA-2026-DEMO-01`, `OBRA-2026-ATRASO-01..04`); no toca otros contratos.

### 4.2 LIMPIAR Render por COMPLETO (incluidos usuarios) + resembrar — **AL FINAL, destructivo, solo Maiki**
> ⚠️ **Esto borra TODO (incluidas todas las cuentas).** Hacer **solo** en la fase final, **con backup primero**, y solo
> Maiki. No hay un script "nuke" existente; la secuencia limpia y reconstruye igual que local:

1. **BACKUP primero** (obligatorio, método del runbook — node-pg → JSON, ya que no hay `pg_dump` local). No continuar
   sin backup verificado.
2. **Limpiar todo** (en el Shell del backend de Render, donde `DATABASE_URL` ya apunta a la BD; requiere `psql` en el
   contenedor — si no está, usar un pequeño runner node-pg equivalente):
   ```bash
   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
   ```
3. **Recrear esquema + seed base** (5 cuentas base + empresas + contrato demo del schema). En Render el esquema corre
   por `RUN_MIGRATIONS=true` (`render.yaml:47-48`) en el arranque; para forzarlo manualmente, re-aplicar `schema.sql`
   vía el runner de `init.js` o `psql --single-transaction -v ON_ERROR_STOP=1 -f src/db/schema.sql`.
4. **Cuentas/empresas ampliadas + contratos demo:**
   ```bash
   npm run reseed:cuentas && npm run seed:demo
   ```
5. **Verificar** (cuentas por empresa) y `docker restart`/redeploy si aplica.
- **Riesgo:** 🔴 destructivo e irreversible sin backup; `schema.sql` es zona congelada (Maiki). **Decisión y ejecución:
  Maiki, al final.** La password de todas las cuentas demo será `Sigecop2026!` (entorno de demostración, no publicar).

---

## 4. FALSOS POSITIVOS / EXCLUIDOS (no gastar esfuerzo aquí)
| ID | Qué se creía | Realidad verificada |
|---|---|---|
| **B1** | "Ver atraso del contrato" rebota a Inicio | **Ya está protegido**: `AltaContrato.jsx:1061` oculta el bloque con `!sinAccesoAlertas` (= `nivelDe('HU-07',rol)===null`). No hay dead-end vivo. *(Maiki: revisa que en tu local no se haya quitado ese gate.)* Es el **patrón modelo** para `LinkHU`. 🟢 |
| **B8g** | "Etapa 1" en `ConveniosModificatorios.jsx:24` | Es un **comentario**, no se renderiza. 🟢 |
| **A1** | `link-firmar` sin `?contrato` "pierde contexto" | **No rompe nada funcional**: `PorFirmar` es bandeja **global** per-usuario (no per-contrato). Queda solo la **inconsistencia UX** (cubierta por B6). 🟢 |
| **A2** | "dependencia no puede ver la Curva (HU-05)" | **FALSO**: `permisos.js:16` HU-05 dependencia='C'; el sidebar la **promueve** a item plano (`Sidebar.jsx:127-139`). Alucinación de la auditoría previa. **No tocar `permisos.js`.** 🟢 |
| **A3** | "Tipo de contrato es un select de una sola opción que confunde" | **FALSO**: tiene **3 opciones** (`AltaContrato.jsx:222-224`). Lo único real: **le falta `data-testid`** (deuda de testabilidad). Fix menor opcional: añadir `data-testid="dg-tipo"`. 🟢 |
| **(audit)** | minutas en `/minutas-visitas` | **FALSO**: la ruta real es `/bitacora/minutas` (`App.jsx:88`). Alucinación de la auditoría previa. |

---

*Plan generado leyendo el código real (causa raíz con `archivo:línea`) y verificando adversarialmente cada hallazgo
(se descartaron 6 falsos positivos). **No se modificó código ni base de datos.** Orden de ejecución: §0. Las
evaluaciones (Parte 3) y la limpieza de BD (Parte 4) esperan decisión de Maiki.*
