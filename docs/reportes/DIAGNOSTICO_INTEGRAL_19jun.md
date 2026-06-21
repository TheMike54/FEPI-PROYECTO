# DIAGNÓSTICO INTEGRAL — 5 FRENTES (solicitado 19-jun · investigado 21-jun)

> **Esto es un DIAGNÓSTICO con propuestas, NO arreglos.** Nada de código ni BD se tocó. Local, sin push.
> **Se leyó el código real** (causa raíz con `archivo:línea`), no de memoria. Cada hallazgo de navegación se
> **verificó adversarialmente** (se descartó 1 falso positivo, ver §1.5).
>
> **Estado base auditado:** `HEAD = 4eaf044` (= lo desplegado en Render) **+ working tree** con lo implementado
> el 19–21 jun: fixes del `PLAN_SOLUCION_ERRORES_19jun.md` (LinkHU, jerga fuera, `?contrato` en ~17 páginas,
> candados con motivo), **3A contrato global** (`ContratoActivoContext` + `ModalContratoActivo` +
> `BannerContratoActivo`), **P4-ALT pestañas de ciclo** (`PestanasCiclo`) y **chip "Ciclo · HU"** en 7 pantallas.
> Este diagnóstico reporta **lo que QUEDA roto/inconsistente DESPUÉS** de esos cambios, no lo ya hecho.
>
> **Construye sobre:** `docs/reportes/PLAN_SOLUCION_ERRORES_19jun.md`, `docs/reportes/AUDITORIA_FINAL_UX_19jun.md`,
> `docs/estado/CONTEXTO_3A_UX_21jun.md`. **Zona congelada** (NO tocar; solo Maiki, vía PR): `App.jsx`,
> `data/permisos.js`, `context/SesionContext.jsx`, `schema.sql`, controllers/routes de auth/usuarios/contratos/
> estimaciones. Donde una propuesta la roza, va **marcada**.
>
> **Método:** workflow de 17 agentes — mapa de rutas canónico (37 rutas, 22 historias) → barrido de navegación
> por 5 categorías → verificación adversarial de cada hallazgo → auditoría HU 1:1 por lotes → frentes 2/4/5 en
> profundidad.

---

## 0. RESUMEN EJECUTIVO

| Frente | 🔴 crítico | 🟡 importante | 🟢 menor | Veredicto |
|---|---|---|---|---|
| **1. Navegación** | 1 (rebote mudo en Ciclo de vida) | 6 (rebotes/loops + resaltado + divergencias) | 6 (cobertura/cosmético) | Quedan defectos reales **además** de los ya arreglados |
| **2. Chip de HU** | — | 1 (desaparece en 14/21 pantallas) | — | Bug de consistencia; fix de bajo riesgo |
| **3. HU vs sistema** | — | 3 ❌ contradice | 2 ⚠️ desactualizada | 17/22 ✅ · 5 a actualizar (sin cambiar ley) |
| **4. Notificaciones** | 1 (centro nuevo) | 2 (accionables) | 2 (acotar + reseed) | 410/1746 = **base sucia + sin acotar al contrato activo**, NO cálculo |
| **5. Sidebar colapsable** | — | — | 🟢 factible y seguro | Drawer responsivo, default abierto; ~1-2 archivos |

**Lo que hay que atacar primero (riesgo↓, confusión↓):**

1. 🔴 **NAV-A** — En *Ciclo de vida*, una **dependencia** ve el botón "Ir →" de la apertura de bitácora y **rebota a Inicio** (`CicloVidaContrato.jsx:27`). Fix de **1 línea**.
2. 🟡 **NAV-D** — El modal "Elige tu contrato" tiene un botón **"Ver portafolio →" que entra en bucle** para contratista/finanzas (y deja a **Finanzas atrapado** solo con "Cerrar sesión"). `ModalContratoActivo.jsx:105`.
3. 🟡 **NAV-B** — El **breadcrumb enlaza secciones sin verificar acceso** → 3 rebotes mudos reales (dependencia→"Estimaciones"/"Seguimiento", finanzas→"Contratos"). Causa raíz única en `Breadcrumb.jsx:34`.
4. 🟡 **NAV-C** — `TransitoPago.jsx:422` tiene un `<Link>` crudo a `/pagos/registro` que **rebota** al contratista (falta `LinkHU`).
5. 🟡 **NAV-E** — Al entrar a cualquier pantalla **hermana de un ciclo, NINGÚN item del sidebar queda resaltado** (`Sidebar.jsx:143`).
6. 🟡 **Frente 2 / Frente 4** — El **chip de HU desaparece** al cambiar de pestaña; las **notificaciones no son accionables** y muestran números inflados por base sucia.

> **Fuera de alcance de este diagnóstico (ya diagnosticado, no re-investigado):** el **bug 4 "Autorizar = error
> interno"** es **esquema parcial en Render**, no código (ver `AUDITORIA_FINAL_UX_19jun.md §5`); se cierra
> re-aplicando `schema.sql` a Render en la fase de BD (Maiki, con backup).

---

## FRENTE 1 — BARRIDO COMPLETO DE NAVEGACIÓN

Se revisó **cada elemento navegable**: sidebar (3 ítems + promociones), breadcrumbs (todas las páginas),
tarjetas de Inicio (14), pestañas de ciclo P4-ALT (7 ciclos), y enlaces/botones cruzados (`<Link>`, `navigate()`,
`LinkHU`). **Patrón de fondo:** casi todos los rebotes nacen de la **misma causa** que ya conoces — `WithLayout`
(`App.jsx:61-62`) y `SoloRol` redirigen a Inicio cuando el rol no tiene acceso al destino, y el componente que
genera el enlace **no consulta `nivelDe` antes de pintarlo**. `LinkHU` ya resuelve esto donde se aplicó; quedan
**3 superficies sin cubrir** (Ciclo de vida, Breadcrumb, el `<Link>` crudo de Tránsito y el modal de contrato).

### 1.1 🔴 CRÍTICO

| ID | Archivo:línea | Síntoma | Causa raíz | Propuesta | Clase · Congelado |
|---|---|---|---|---|---|
| **NAV-A** | `pages/CicloVidaContrato.jsx:27` (bloque `n:3`) · render `:171` (`accesible={b.roles.includes(rol)}`) | Una **dependencia** en *Ciclo de vida* ve el bloque "Apertura de la bitácora (HU-08)" con botón **"Ir →"**; al pulsarlo `WithLayout(HU-08)` la **rebota a Inicio** (mudo). | El array `roles` del bloque `n:3` incluye `'dependencia'`, pero `HU-08` tiene `dependencia:null` en `permisos.js`. El gate local (`b.roles.includes(rol)`) está **desalineado** con `nivelDe('HU-08','dependencia')===null` que aplica la guarda de ruta. **Es el ÚNICO bloque desalineado** (los otros 13 se verificaron uno a uno y coinciden). | En `CicloVidaContrato.jsx:27` quitar `'dependencia'` del `roles` del bloque `n:3` → `['residente','contratista','supervision']` (espeja HU-08). `BloqueCV` mostrará entonces la nota "No disponible para tu rol en este paso". | bug · **no** |

> **Por qué crítico:** es un **dead-end mudo con CTA primaria visible**; el profe (rol dependencia en la demo)
> lo dispara con un clic. Fix de **1 línea, riesgo nulo**.

### 1.2 🟡 IMPORTANTE

#### NAV-B · Breadcrumb enlaza secciones SIN verificar acceso del rol → rebotes mudos
**Causa raíz única:** `Breadcrumb.jsx:34` resuelve el destino de cada nivel intermedio con `SECCION_RUTA[label]`
y lo vuelve `<Link>` **sin llamar `nivelDe(HUdestino, rol)`**. Cuando ese destino único de sección no es accesible
para el rol, la miga rebota a Inicio. Tres casos reales (confirmados; el barrido de "enlaces cruzados" los volvió
a hallar de forma independiente como F1-03/04/05 → **misma causa, no triple**):

| Sub-ID | Quién lo sufre · desde dónde | Miga · destino que rebota | `permisos.js` |
|---|---|---|---|
| NAV-B1 | **Dependencia** desde Historial / Revisión / Tablero | "Estimaciones" → `/estimaciones/integracion` | HU-12 `dependencia:null` |
| NAV-B2 | **Dependencia** desde Curva de avance | "Seguimiento" → `/seguimiento/trabajos-terminados` | HU-06 `dependencia:null` |
| NAV-B3 | **Finanzas** desde Registro de fianzas | "Contratos" → `/contratos/expediente` | HU-04 `finanzas:null` |

- **Propuesta (de raíz):** en `Breadcrumb.jsx` importar `useSesion` + `nivelDe`; si el destino de la sección **no
  es accesible** para el rol, renderizar `<span>` en vez de `<Link>` (patrón `LinkHU` centralizado en el breadcrumb).
  Cubre los 3 casos de una vez. **Alternativa por-página:** pasar `href` accesible (p. ej. `/estimaciones/tablero`,
  `/seguimiento/curva-avance`). **Riesgo:** medio-bajo (el breadcrumb está en casi todas las pantallas → probar
  que los roles que SÍ acceden conserven el enlace). **Esfuerzo:** bajo (~5-8 líneas en un componente). **Congelado:** no (solo *lee* `permisos.js`).

#### NAV-C · `<Link>` crudo en Tránsito a pago → rebota al contratista

| ID | Archivo:línea | Síntoma | Causa raíz | Propuesta | Clase · Congelado |
|---|---|---|---|---|---|
| **NAV-C** | `pages/TransitoPago.jsx:422` (`<Link>` crudo) · gate `:419` (solo por `instr`) | Tras generar la instrucción, **el contratista** (que SÍ accede a HU-20 'E') ve "Ir a registrar el pago →"; al pulsarlo `WithLayout(HU-21)` lo **rebota** (HU-21 `contratista:null`). | `<Link>` crudo a `/pagos/registro` dentro de un bloque gateado **solo por la existencia de la instrucción**, no por rol. | Sustituir por `<LinkHU hu="HU-21" to={…} actor="Lo registra Finanzas">…</LinkHU>` (mismo patrón ya usado en `AmbientePago.jsx:146`). Conserva `data-testid="link-registrar-pago"` en ambos estados. | bug · **no** |

#### NAV-D · Loop en el modal "Elige tu contrato" (Ver portafolio)

| ID | Archivo:línea | Síntoma | Causa raíz | Propuesta | Clase · Congelado |
|---|---|---|---|---|---|
| **NAV-D** | `ModalContratoActivo.jsx:34` (`irPortafolio`) · `:105-107` (botón) | **Contratista/Finanzas SIN contrato activo** pulsan "Ver portafolio →" → `/portafolio` → `WithLayout(HU-18)` rebota a `/` → Inicio exige contrato → **el modal reaparece: bucle**. Único escape: "Cerrar sesión". | El botón se muestra a **todos los roles** y `irPortafolio` navega incondicionalmente; HU-18 tiene `contratista/finanzas:null`. `/portafolio` está en `RUTAS_LIBRES` pero el rebote vuelve a `/` (no libre). | `const puedePortafolio = nivelDe('HU-18', rol) !== null;` y condicionar el botón/handler. Para roles sin portafolio dejar solo "Cerrar sesión" (o un enlace a su Inicio). `nivelDe` ya está importado. | bug · **no** |

> **⚠️ Marca para Maiki (posible 🔴):** para **Finanzas** esto puede ser un **lock duro** — Finanzas no participa
> del roster, así que normalmente **no tiene contrato activo** y todas sus rutas (pagos/reportes/fianzas) exigen
> contrato. Conviene **verificar si el contrato global 3A deja a Finanzas operable**; si no, hay que decidir si
> Finanzas queda exento del gate de contrato o si se le permite elegir de una lista distinta. (Excede los 5 frentes,
> pero el loop lo destapa.)

#### NAV-E · El sidebar no resalta NINGÚN item al estar en una pantalla hermana del ciclo

| ID | Archivo:línea | Síntoma | Causa raíz | Propuesta | Clase · Congelado |
|---|---|---|---|---|---|
| **NAV-E** | `Sidebar.jsx:143` (`NavLink` del padre, `end` solo en `/`) | Estando en una ruta **hermana** de un ciclo (p. ej. `/estimaciones/envio`, `/bitacora/consulta`, `/pagos/registro`, `/seguimiento/curva-avance`), **ningún item del sidebar queda activo** → el usuario pierde la orientación de "en qué ciclo estoy". Afecta a los **4 ciclos con hijos**. | El `NavLink` del padre usa *match por prefijo* por defecto, pero los hijos son rutas **hermanas, no anidadas** (`/estimaciones/envio` no empieza por `/estimaciones/integracion`); y como el sidebar muestra **solo el padre**, nada matchea. | Calcular `isActive` del padre con `useLocation`/`matchPath` contra el **conjunto {ruta del padre + rutas de sus children}** del ciclo y forzar la clase activa cuando el `pathname` pertenezca al ciclo. | bug · **no** |

- **Riesgo:** medio (enumerar bien las rutas-hijo por ciclo y evitar falsos positivos entre ciclos que comparten
  prefijo, p. ej. `/estimaciones/*` vs `/seguimiento/*`). **Esfuerzo:** M.

#### NAV-F · Divergencia del módulo "Avance y seguimiento" (Inicio ↔ Sidebar ↔ ambiente)
**Un solo defecto con 4 caras** (los 4 agentes lo hallaron por separado: SB-01 / INI-01 / F1-07 / P4ALT-01):

- `Inicio.jsx:24` → `/seguimiento/ambiente` (AmbienteAvance). `Sidebar.jsx:50` → `/seguimiento/trabajos-terminados`
  (TrabajosTerminados). **Rutas, componentes y guards distintos** (SoloRol vs HU-06), aunque ambas accesibles a los
  mismos 3 roles → **sin rebote**, pero:
  - Entrar por la **tarjeta de Inicio NO resalta** el item del sidebar (`aside a[href]` no coincide).
  - `AmbienteAvance` (la puerta de Inicio) **no monta `PestanasCiclo`** → se entra al ciclo **sin barra de pestañas**,
    mientras que entrando por el sidebar (TrabajosTerminados) **sí** hay barra. Dos puertas, dos experiencias.
  - *Ciclo de vida* (`CicloVidaContrato.jsx:29`) también apunta a `/seguimiento/ambiente`.
  - **Contraste:** "Bitácora" SÍ coincide (Inicio y Sidebar ambos a `/bitacora/ambiente`). **Avance es la única
    divergencia.**
- **Propuesta:** elegir la ruta canónica del módulo de avance y unificar las **dos** superficies + Ciclo de vida.
  *Opción A (recomendada, coherente con Bitácora):* todo a `/seguimiento/ambiente` y **montar `PestanasCiclo` en
  AmbienteAvance** (`<PestanasCiclo ciclo="avance" activo="trabajos"/>`, patrón `AmbienteBitacora.jsx:106`).
  *Opción B:* todo a `/seguimiento/trabajos-terminados`. **Decisión de diseño para Maiki.** Ajustar specs e2e
  (`goToViaSidebar`/`cardInInicioFor`) al href elegido. **Clase:** diseño · **Congelado:** no.

#### NAV-G · P4-ALT incompleto: pestañas de ciclo ausentes en pantallas que sí pertenecen al ciclo
El sistema de pestañas P4-ALT se cableó pantalla por pantalla y quedaron huecos:

- **5 de las 7 "ambiente" NO montan `PestanasCiclo`** (P4ALT-02): `AmbientePago`, `AmbienteConvenio`,
  `AmbienteExpediente`, `AmbienteEstimacion`, `AmbienteFiniquito`. Solo `AmbienteBitacora` la tiene. Y *Ciclo de
  vida* enlaza directo a **todas** → el usuario ve barra en bitácora pero no en los demás.
- **Apertura (HU-08) y Emisión de notas (HU-09) NO montan `PestanasCiclo`** (P4ALT-03), aunque sus hermanas
  (Consulta HU-10 / Minutas HU-11) sí. Son alcanzables por deep-link/breadcrumb.
- **Propuesta:** decidir la regla y aplicarla **uniforme**. Si se quiere barra en los ambientes: añadir
  `<PestanasCiclo ciclo="…" activo="…"/>` bajo cada `HeaderVista`. **Ojo:** las rutas-ambiente **no son tabs** del
  ciclo, así que en ellas la barra quedaría sin pestaña marcada (cosmético) salvo que se elija un `activo`
  representativo. **Clase:** diseño · **Congelado:** no · **Esfuerzo:** S (1 línea/archivo). *(Esto y el Frente 2
  conviene resolverlos juntos: ver §Frente 2, opción (a) monta la barra + chip en todas.)*

#### NAV-H · Criterio inconsistente de "entrada al ciclo" en Inicio (ambiente vs pantalla suelta)

| Sub-ID | Archivo:línea | Observación | Propuesta |
|---|---|---|---|
| NAV-H1 | `Inicio.jsx:22` (HU-12) | Tarjeta "Ciclo de estimación" abre `/estimaciones/integracion` (paso suelto), pero existe `/estimaciones/ambiente` (AmbienteEstimacion) **sin enlazar en ninguna superficie**. Bitácora/Avance usan `/ambiente`; Estimación/Pago usan la suelta → criterio mixto. | Decidir patrón único para "Tus flujos". Si ambientes: `Inicio.jsx:22` y `Sidebar.jsx:37` → `/estimaciones/ambiente`. |
| NAV-H2 | `Inicio.jsx:25` (HU-20) | Tarjeta "Pago y tránsito" abre `/pagos/transito`; existe `/pagos/ambiente` sin enlazar. Aquí tarjeta y sidebar **sí coinciden** (no rompe resaltado), solo coherencia de patrón. | Alinear con la decisión global de NAV-H1. |

- **Clase:** diseño · **Congelado:** no. *(Matiz verificado: el brief asumía "HU-20 excluye finanzas"; en realidad
  `HU-20 finanzas:'E'` — finanzas sí ejecuta el tránsito.)*

### 1.3 🟢 MENOR

| ID | Archivo:línea | Síntoma | Propuesta | Clase |
|---|---|---|---|---|
| NAV-M1 | `AmbienteExpediente.jsx:77` | Nivel intermedio "Expediente" del breadcrumb = **texto muerto** (no está en `SECCION_RUTA` ni trae `href`). | Pasar `href` (`/contratos/expediente`) o añadir clave `'expediente'` a `SECCION_RUTA`. | bug |
| NAV-M2 | `Inicio.jsx` (grupo "Tus flujos") | **HU-02 Fianzas** está en el sidebar (`Sidebar.jsx:36`) pero **no** tiene tarjeta en Inicio (sigue accesible por sidebar/deep-link). | Si se quiere paridad, añadir tarjeta `{hu:'HU-02'}`; o documentar que Inicio muestra solo módulos principales. | diseño |
| NAV-M3 | `Inicio.jsx` (Vistas ejecutivas) | **"Ciclo de vida"** está en el sidebar (`Sidebar.jsx:69`) pero no en Inicio. | Igual que NAV-M2 (puede quererse dejar el MACRO solo en el sidebar). | diseño |
| NAV-M4 | `PortafolioEjecutivo.jsx` (HU-18) | No monta `PestanasCiclo` mientras Tablero (HU-17) sí. **Defendible:** Portafolio es multi-contrato, no parte del ciclo de UN contrato. | Probablemente **sin acción**. | diseño |
| NAV-M5 | `PestanasCiclo.jsx:34-46` | En convenio/finiquito, los tabs "Bitácora"/"Expediente" llevan a pantallas de **otro ciclo** (ConsultaNotas=bitacora, ConsultaExpediente=expediente) → al clicar **cambia el set de pestañas** (pérdida de contexto, **sin rebote**; el tab inaccesible se ve deshabilitado, no enlaza). | Aceptable; si molesta, pasar el ciclo de origen por query a esas lecturas. | diseño |
| NAV-M6 | `_PLANTILLA_VISTA.jsx:57-61` | Plantilla con nivel intermedio `'Modulo'` sin mapear → texto muerto. **Latente** (no enrutada). | Usar un label válido o comentar que los niveles intermedios necesitan `href`. | bug latente |

### 1.4 Anticipación de errores SIMILARES (mismo patrón, aún no reportados)
- **Cualquier `<Link>`/`navigate()` crudo a una ruta de otra HU** repite NAV-C. El barrido encontró que **solo
  TransitoPago** quedó crudo (los demás cross-actor ya usan `LinkHU`). Regla para nuevas pantallas: **todo enlace
  cross-actor pasa por `LinkHU`**.
- **Cualquier breadcrumb cuyo nivel intermedio caiga en una sección inaccesible para el rol** repite NAV-B. El fix
  de raíz (gatear el `<Link>` del breadcrumb por `nivelDe`) **inmuniza a futuro** todas las pantallas.
- **Cualquier modal/atajo que navegue a una HU sin chequear acceso** repite NAV-D (lo vimos en "Ver portafolio").
  Revisar otras salidas del modal de contrato y de los estados vacíos con CTA.
- **Cualquier tarjeta de Inicio nueva por ruta fija** debe **replicar EXACTAMENTE la lista de roles del `SoloRol`**
  correspondiente (las 6 actuales se verificaron OK, ver §1.5).

### 1.5 Verificado OK / Falso positivo descartado
- **INI-06 (OK):** las **6 tarjetas de Inicio por ruta fija** (Bitácora, Avance, Finiquito, Empresas, Roster,
  Solicitudes) declaran listas de roles **idénticas** a sus guardas `SoloRol` (`App.jsx` 110/125/103/130/140/137).
  Las 8 tarjetas por HU usan `nivelDe` (misma función que la guarda). **Ninguna tarjeta produce rebote mudo.**
- **SB-03 (FALSO POSITIVO):** "el pill dice 'HU 20-21' pero el item de Pago solo enlaza a `/pagos/transito`" — es
  **comportamiento intencional y documentado**: el pill representa el **rango del ciclo** (padre + sub-pasos), igual
  que bitácora ("HU 08-11") y estimación ("HU 12-16"). No es bug; si Maiki prefiriera `pill = destino`, sería una
  decisión **global** a los 3 ciclos, no un fix puntual.

---

## FRENTE 2 — TRAZABILIDAD DEL CHIP DE HU AL CAMBIAR DE PESTAÑA

### Dónde vive el chip hoy
El chip `data-testid="chip-ciclo-hu"` (pill "Ciclo · HU XX–YY") está **hardcodeado dentro del JSX del prop
`titulo`** de cada pantalla "ambiente", repitiendo el mismo `<span>` literal **7 veces**:

| Archivo | Línea | Texto del chip | ¿Vía HeaderVista? |
|---|---|---|---|
| `pages/AmbienteAvance.jsx` | 84 | `Ciclo · HU 05–07` | sí (titulo) |
| `pages/AmbienteBitacora.jsx` | 98 | `Ciclo · HU 08–11` | sí (titulo) |
| `pages/AmbienteConvenio.jsx` | 85 | `Ciclo · HU-03` | **no** (`<h1>` propio, sin HeaderVista) |
| `pages/AmbienteExpediente.jsx` | 74 | `Ciclo · HU 04 · 19` | sí (titulo) |
| `pages/AmbienteFiniquito.jsx` | 81 | `Ciclo · HU-24` | sí (titulo) |
| `pages/AmbientePago.jsx` | 79 | `Ciclo · HU 20–21` | sí (titulo) |
| `pages/IntegracionEstimacion.jsx` | 793 | `Ciclo · HU 12–17` | sí (titulo) |

`HeaderVista` (`components/vista/HeaderVista.jsx`) **no renderiza ningún chip**: solo pinta `{titulo}` tal cual.
El chip es un detalle decorativo de cada página, no una pieza del ciclo.

### Pantallas hermanas por ciclo (chip presente/ausente)
Crucialmente, **las páginas con chip casi nunca son las que están en la barra de pestañas**: viven en rutas-índice
aparte (`/seguimiento/ambiente`, `/pagos/ambiente`, `/contratos/convenio-ambiente`, `/contratos/cierre`,
`/contratos/expediente-ambiente`) que **no figuran como tab**. Solo en **bitácora** (`/bitacora/ambiente`) y
**estimación** (`/estimaciones/integracion`) el "ambiente" coincide con una pestaña.

| Ciclo | Pantallas que SÍ son pestaña (vía `PestanasCiclo`) | ¿chip? |
|---|---|---|
| **avance** | TrabajosTerminados, CurvaAvance, AlertasAtraso | ❌❌❌ |
| **bitacora** | AmbienteBitacora (✅), ConsultaNotas, MinutasVisitas | ✅ ❌❌ |
| **estimacion** | IntegracionEstimacion (✅), Envio, Revision, Reingreso, Historial, Tablero | ✅ ❌❌❌❌❌ |
| **pago** | TransitoPago, RegistroPago | ❌❌ |
| **convenio** | ConveniosModificatorios, ConsultaNotas, ConsultaExpediente | ❌❌❌ |
| **expediente** | ConsultaExpediente, ExportacionReportes | ❌❌ |
| **finiquito** | Finiquito, ConsultaExpediente | ❌❌ |

Resultado: el chip aparece en **7 de 21** pantallas de ciclo y, en **5 de 7 ciclos**, ni siquiera está en una
pantalla que sea pestaña. **En cuanto el usuario pisa cualquier pestaña hermana, el chip desaparece.**

### Causa raíz
El chip es **por-página, no por-ciclo**: está copiado a mano en el `titulo` de cada "ambiente" en vez de derivarse
del ciclo. El componente que **sí** conoce el ciclo (`PestanasCiclo`, recibe `ciclo` y tiene la lista de HUs en
`CICLOS`) **no pinta el chip**; y `HeaderVista` no tiene noción de ciclo. **Bug de consistencia de presentación**,
no diseño deliberado.

### Propuesta — 🟢 recomendada: (a) renderizar el chip DENTRO de `PestanasCiclo`
`PestanasCiclo` ya recibe `ciclo` y está montado en **todas** las pantallas hermanas. Se añade un mapa literal
`RANGOS_CICLO` (derivado de los chips actuales: `avance:'HU 05–07'`, `bitacora:'HU 08–11'`, `estimacion:'HU 12–17'`,
`pago:'HU 20–21'`, `convenio:'HU-03'`, `expediente:'HU 04 · 19'`, `finiquito:'HU-24'`) y se pinta el mismo `<span
data-testid="chip-ciclo-hu">` como primer hijo del `<div role="tablist">`. Así el chip aparece **automáticamente en
todas** las pantallas del ciclo, discreto, a la izquierda de las pestañas.

- **Archivo:línea:** `components/PestanasCiclo.jsx` — añadir `RANGOS_CICLO` (~L11) + `<span>` en el `return` (~L57);
  luego **quitar** el `<span>` duplicado del `titulo` en las 7 páginas listadas.
- **Cobertura total:** como las **5 "ambiente" sin pestañas** (Avance, Pago, Convenio, Expediente, Finiquito) hoy
  no montan `PestanasCiclo`, conviene **además montarles la barra** (resuelve a la vez **NAV-G**). Con eso, chip +
  pestañas quedan uniformes en todo el sistema.
- **Riesgo:** 🟢 bajo. `chip-ciclo-hu` **no se asierta en ningún `.spec.js`** (verificado: 0 coincidencias) → mover
  el testid no rompe e2e; `aside a[href]`, `pestanas-ciclo` y `pestana-*` quedan intactos.
- **Esfuerzo:** 🟡 medio (1 componente + retoque en ~12 páginas, todo presentación). **Congelado:** no.

**Alternativa (b) — prop `cicloHU` en `HeaderVista`:** 🟡 deja el chip en el encabezado (no en la barra), pero hay
que pasar el prop en las 21 páginas (más invasivo), `AmbienteConvenio` ni usa `HeaderVista`, y duplica la lista de
rangos en cada página. Mismo riesgo e2e bajo, **más superficie de edición** y sin "fuente única".

**Veredicto:** **(a)**. El chip pertenece al ciclo, y `PestanasCiclo` es la única pieza que conoce el ciclo y está
en todas las hermanas. Clasificación global: 🟡 **bug de consistencia · riesgo bajo · esfuerzo medio.**

---

## FRENTE 3 — AUDITORÍA HISTORIAS DE USUARIO vs SISTEMA REAL (1:1)

Comparado `docs/requisitos/Historias_Usuario_ACTUALIZADAS_12jun.md` (+ `HISTORIAS_POR_CICLOS.md`) contra el código
real (páginas + controllers). **17/22 ✅ coinciden, 2 ⚠️ desactualizadas, 3 ❌ contradicen.** Ninguna propuesta
cambia requisitos legales: solo refleja la realidad de navegación/wizard/flujo.

### Tabla de veredictos

| HU | Título | Veredicto | Nota |
|---|---|---|---|
| HU-01 | Alta de contratos | ✅ | + aclarar pestaña aux "Registrados" y que el alta no hereda el contrato global |
| HU-02 | Fianzas y garantías | ✅ | + contrato heredado del **global** (banner), no selector propio |
| HU-03 | Convenios modificatorios | ✅ | + nav (PestañasCiclo+banner); **⚠ copy en pantalla desactualizado** (ver abajo) |
| HU-04 | Expediente | ✅ | + nav (PestañasCiclo+banner) |
| HU-05 | Programa y curva de avance | ✅ | matiz: pantalla muestra 3 criterios vs 5 de la historia (cosmético) |
| HU-06 | Registro de trabajos terminados | ❌ **contradice** | sistema es **append-only (Corregir)**; historia dice editar/eliminar |
| HU-07 | Alertas de atraso | ✅ | — |
| HU-08 | Apertura de bitácora | ✅ | pendiente ya declarado: reescribir spec viejo (E2) |
| HU-09 | Emisión de notas | ✅ | — |
| HU-10 | Consulta/búsqueda de notas | ✅ | — |
| HU-11 | Minutas y visitas | ✅ | 2 desajustes menores de redacción (campo "Acuerdos"; PDF opcional) |
| HU-12 | Integración de estimación | ✅ | wizard 5 pasos 1:1 |
| HU-13 | Envío/presentación | ✅ | — |
| HU-14 | Historial de estimaciones | ⚠️ **desactualizada** | panel promete fechas revisión/pago/observaciones que **nunca se llenan** |
| HU-15 | Revisión y autorización | ✅ | — |
| HU-16 | Reingreso tras rechazo | ✅ | — |
| HU-17 | Tablero de estimaciones | ✅ | — |
| HU-18 | Portafolio ejecutivo | ✅ | matiz: "Agrupar por Tipo de contratación" deshabilitado (no existe el dato) |
| HU-19 | Exportación de 7 reportes | ⚠️ **desactualizada** | el reporte 4 (Observaciones) **ya exporta** (antes deshabilitado) |
| HU-20 | Tránsito a pago | ✅ | + 4.º paso "Registrar pago" (HU-21 embebida) |
| HU-21 | Registro del pago | ❌ **contradice** | backend solo paga **'autorizada'**; historia/CA-4 permisivo; **frontend desincronizado** |
| HU-22 | Sustitución de roster | ✅ | + contrato global (banner), ruta SoloRol |
| HU-23 | Catálogo de empresas | ❌ **contradice** | **existe un padrón administrado** por la Dependencia; historia dice "no hay panel" |
| HU-24 | Finiquito y cierre | ✅ | — |

### Las que hay que actualizar (detalle + propuesta)

**❌ HU-06 — el sistema ya NO permite editar/eliminar (es append-only).**
- *Historia:* "puedo **editar o eliminar** la captura" (criterio 5). *Sistema:* `TrabajosTerminados.jsx` solo ofrece
  **"Corregir"** (`btn-corregir` → `POST /trabajos/:id/corregir`); el backend (`trabajos.routes.js`) expone **solo**
  `POST '/'` y `POST '/:id/corregir'` (no PATCH ni DELETE). Es append-only (FIX 3.3 / Oleada 3, art. 123 fr. VI/VII).
- *Propuesta:* reescribir la Historia y el CA-5 a "**CORREGIR** una captura (se anula la anterior y se registra una
  nueva vinculada, dice/debe decir, append-only)"; retirar el criterio adoptado de "editar no regenera la nota".
  **Mejora de código (no requisito):** el comentario de cabecera `TrabajosTerminados.jsx:21` ("captura EDITABLE
  (PATCH/DELETE)") quedó **stale** y contradice el código → corregirlo. El criterio legal art. 118 no cambia.

**❌ HU-21 — backend paga solo 'autorizada'; frontend quedó desincronizado.**
- *Historia/CA-4:* permisivo ("Integrada/Presentada/Autorizada"). *Backend:* `pagos.controller.js registrarPago`
  **rechaza 409** cualquier estado ≠ `'autorizada'` (art. 54 LOPSRM). *Desincronización real:*
  `components/pagos/RegistroPagoForm.jsx` ofrece en el selector `PAGABLES = {integrada, enviada, autorizada}` y la
  etiqueta dice "(integrada/presentada/autorizada…)" → el usuario puede elegir una integrada, llenar el form y al
  Registrar **recibe un 409**.
- *Propuesta:* (1) actualizar CA-4/historia a "**solo AUTORIZADA** (art. 54); cualquier otro estado se rechaza".
  (2) **Sincronizar el frontend** (no congelado): `RegistroPagoForm.jsx` → `PAGABLES = {'autorizada'}` y etiqueta
  "(autorizada, no pagada)". Revisar specs de HU-21 que asuman el set permisivo.

**❌ HU-23 — ahora existe un padrón administrado (la historia dice que no).**
- *Historia:* "**No existe un panel para administrar el catálogo**" (se llena solo al registrarse). *Sistema:* existe
  `pages/EmpresasPadron.jsx`, ruta `SoloRol ['dependencia']` en `/admin/empresas`: padrón con 3 pestañas donde la
  Dependencia **valida/fusiona** empresas (estado `por_validar`/`validada`, tipo, conteos), citado a art. 43 RLOPSRM /
  art. 74 Bis LOPSRM. Además, en el expediente (HU-04) la **búsqueda por empresa quedó inerte** (`CAMPOS_BUSQUEDA`
  solo expone `{documento, periodo}`).
- *Propuesta:* reescribir HU-23: (1) quitar "no existe panel" y añadir el padrón "propone→valida/fusiona"
  (dependencia, art. 43/74 Bis — **lo legal lo confirma el profe**); (2) corregir el criterio 5: el expediente filtra
  por **tipo de documento y periodo**, la búsqueda por empresa no está expuesta (documentar como quitada/follow-on o
  reactivar la rama); (3) conservar criterios 1-4 (selector de catálogo al registrarse, dedupe, empresa opcional,
  aviso "misma empresa"). **Reportar a Maiki:** HU-23 cambió de alcance (de "sin permiso por rol" a administrada por
  la Dependencia).

**⚠️ HU-14 — el panel "Expediente" promete datos que nunca se llenan.**
- *CA-3:* panel con fecha de revisión, fecha de pago, observaciones y columna Versión. *Sistema:* el backend
  `historialEstimaciones` solo arma eventos `integrada` y `enviada` (no hay tabla de transiciones ni columnas
  `autorizada_en`/`pagada_en`); resultado: **fechaRevisión/fechaPago siempre "—", observaciones siempre [], versión
  siempre "—"**, aunque el estado ya sea Autorizada/Pagada. El filtro y el export sí funcionan.
- *Propuesta:* **Opción A (documental, recomendada):** en CA-3 dejar explícito que el panel muestra periodo, estado,
  importe y fecha de presentación **reales**, y que revisión/pago/observaciones son placeholders hasta que existan
  sus sellos. **Opción B (con código, requiere Maiki):** DDL aditiva `autorizada_en/rechazada_en/pagada_en` poblada
  por HU-15/HU-21 + traer observaciones — toca esquema y `estimaciones.controller` (congelado) → follow-on.

**⚠️ HU-19 — el reporte 4 (Observaciones) ya exporta.**
- *Historia/CA-2:* "6 de 7; el reporte 4 deshabilitado por falta de fuente". *Sistema:* `reportesContrato.js`
  `CATALOGO_REPORTES[4].disponible: true`; `ExportacionReportes.jsx` carga `api.observacionesContrato(id)` (FIX 2.2,
  `observaciones.controller.js`) → **los 7 exportan** (el 5 Bitácora sigue condicionado a bitácora abierta).
- *Propuesta:* reescribir CA-1 a "los 7 reportes exportan" (manteniendo el 5 condicionado) y eliminar/reescribir CA-2.

### Copy desactualizado en pantalla (no es la historia, pero contradice al sistema)
- **HU-03 / `ConveniosModificatorios.jsx` (~L599-600):** el aviso del 25% dice que el guardrail "**rechazará el
  registro mientras esté activo**", pero el comportamiento real (backend + historia) es **avisar, no bloquear** al
  registrar; el 409 solo ocurre al **AUTORIZAR** si >25% sin oficio. Corregir ese copy. 🟢

---

## FRENTE 4 — NOTIFICACIONES ACCIONABLES + CENTRO DE NOTIFICACIONES

### 1. Cómo está hecho hoy el pop-up
La campana 🔔 (`AppShell.jsx:190-208`) abre un dropdown (`drop==='campana'`, `:300-336`) con **3 grupos de RESUMEN
por tipo**: "Tienes N pendientes por firmar" (`totalFirmas` = aperturas `pendientes` + `notasFirma`, `:158`), "N
conceptos en atraso" (`atrasos`) y —solo dependencia— "N solicitudes de registro". El badge se topa a `99+` pero el
**texto del dropdown muestra el número crudo** (`:313`). Cada grupo tiene un solo enlace **genérico al pie** (`:327-335`):
"Ir a «Por firmar» →", "Ver alertas de atraso →", "Ver solicitudes →". **No hay enlace por-ítem**: la nota concreta
y el concepto concreto no son clicables; el usuario aterriza en una bandeja completa y debe re-buscar.

### 2. DIAGNÓSTICO de los números enormes (410 / 1746)
**Causa raíz: BASE DE PRUEBA SUCIA + consulta no acotada al contrato activo. NO es bug de cálculo.**

- **El cálculo es sano y conservador.** `resumenAtrasos` (`alertas.controller.js:119-163`) cuenta, por concepto de
  cada contrato accesible, `programado_acum(≤ periodo vigente) − ejecutado_acum(total) > EPS`. Usa el ejecutado
  **total** a propósito (`:142-144`) para que "ir adelantado" nunca dé falso atraso. No infla nada.
- **Las consultas NO se acotan al contrato activo, sino a TODOS los contratos del usuario.** Para
  `dependencia`/`finanzas`, el CTE `contratos_acc` hace `WHERE $2::boolean` con `venTodo=true` (`:122-127`) → **cuenta
  sobre TODA la base**. Para residente/supervisión, sobre **todos sus contratos**. Igual `notasPendientes`
  (`notas-pendientes.controller.js:9-32`) y `pendientesPorFirmar` (`bitacora.controller.js`). **`ContratoActivoContext`
  existe pero las 3 consultas lo ignoran.**
- **La base está inflada por la suite e2e, no por los seeds.** `seed_demo.sql` es idempotente y deja **solo 5
  contratos** (borra por folio antes de recrear). Ningún script de `backend/scripts/` genera contratos en masa. El
  inflado viene de los **specs Playwright que dan de alta contratos vía API real** (hu-05/06/07, o4-avance,
  roster-sustitucion…) con programa **pero sin avance** → cada concepto queda en déficit. Corroborado por el
  historial: ya hubo que **limpiar ~2050 contratos de prueba** acumulados que causaban *flaky* por *pollution*.
  1746 conceptos = cientos de esos contratos × varios conceptos, todos sin avance.

> **Veredicto para Maiki:** **dato sucio** (BD acumulada de la suite) **amplificado** por una decisión de diseño (la
> campana suma TODA la base en vez del contrato activo). **No toques el cálculo.** Acción inmediata: **re-sembrar
> limpio** para la demo; acción de diseño: acotar/filtrar (puntos 3-4).

### 3. Propuesta (a) — Notificaciones ACCIONABLES (cada ítem a su destino exacto)
Hoy `resumenAtrasos` devuelve **solo conteos** (`{conceptos, contratos}`) → no se puede deep-linkear sin payload de
detalle. En cambio `notasPendientes` y `pendientesPorFirmar` **ya devuelven filas con `id`/`contrato_id`/`folio`** →
las **firmas son accionables HOY sin backend nuevo**.

- **Firmas (sin backend nuevo):** listar en el dropdown las primeras N filas de `notasFirma`/`pendientes`; cada fila
  → `<Link to={`/bitacora/por-firmar?contrato=${contrato_id}#nota-${id}`}>`. Requiere que `PorFirmar.jsx` lea
  `?contrato=` (filtrar) y haga scroll/resalte por `#nota-ID`.
- **Atrasos (necesita 1 endpoint de detalle, patrón `notas-pendientes`):** crear `GET /api/alertas/detalle`
  (read-only, acotado por participación, **mismo cálculo** que `resumenAtrasos` pero devolviendo filas):
  `[{contrato_id, folio, contrato_concepto_id, concepto_label, unidad, deficit}]` con `LIMIT`. Cada fila →
  `/seguimiento/alertas?contrato=…&concepto=…`. `AlertasAtraso.jsx` **ya lee `?contrato=`**; solo falta leer
  `&concepto=` para resaltar la fila (ancla `fila-atraso-{id}` ya existe).
- **Archivos (aditivo, sin congelar lógica):** backend NUEVO `notificaciones.controller.js`/`notificaciones.routes.js`
  (o ampliar `alertas.controller.js`) — **Maiki monta el router en `server.js` (congelado)**; front `api.js`,
  `AppShell.jsx` (render por-ítem), `AlertasAtraso.jsx`, `PorFirmar.jsx`. **No toca** `App.jsx`/`permisos.js`/
  `SesionContext.jsx`/controllers congelados/`schema.sql`.

### 4. Propuesta (b) — Centro de notificaciones (vista agrupada)
Cuando hay muchas, el dropdown no alcanza. **Centro de notificaciones** como ruta propia `/notificaciones` (**ruta
nueva → requiere Maiki: `<Route>` en `App.jsx`**; o reusar una ruta-marco `SoloRol` para no tocar `permisos.js`). El
dropdown queda como **vista rápida** (top 5 por tipo + "Ver todas →").

```
┌─ Centro de notificaciones ───────────────────────────────┐
│ [Contrato: ▾ OBRA-2026-DEMO-01]  [Tipo: Todas ▾]   ↻      │ ← filtro por contrato activo + tipo
│ ✍️  POR FIRMAR (3)                                         │
│   • Nota #14 «Atraso concepto…»  OBRA-…01  hace 2 d  [Firmar→]
│   • Apertura de bitácora         OBRA-…02  hace 5 d  [Firmar→]
│ ⚠️  EN ATRASO (12)                                         │
│   • C-03 Terracerías  déficit 120 m³  OBRA-…01  [Ver→]    │
│   • C-07 Acabados     déficit 40 m²   OBRA-…01  [Ver→]    │
│ 📝  SOLICITUDES DE REGISTRO (2)  (solo dependencia)        │
│   • Juan Pérez · contratista  hace 1 d  [Revisar→]        │
└────────────────────────────────────────────────────────────┘
```
Agrupar por **tipo** (firmas/atrasos/solicitudes), secundaria por **contrato**, orden por **fecha desc**. **Acotar
por defecto al contrato activo** (`ContratoActivoContext`) con opción "todos mis contratos" — esto **por sí solo
baja 1746 → un número manejable** sin tocar el cálculo. Mismos deep-links del punto 3. Endpoints: `GET
/api/alertas/detalle` + `notasPendientes` + `pendientesPorFirmar`, todos con `?contrato=ID` opcional (aditivo).

### 5. Riesgo / esfuerzo / clasificación

| Ítem | Tipo | 🔴/🟡/🟢 | Esfuerzo | Requiere Maiki |
|---|---|---|---|---|
| **Limpiar BD (re-seed)** para que 410/1746 vuelvan a números reales | dato sucio | 🟢 | 5 min | **Sí** (despliega/siembra: `reset_demo` + `seed:demo`) |
| **Acotar la campana al contrato activo** (`?contrato=` opcional en las 3 consultas) | diseño | 🟢 | bajo | Backend aditivo (`bitacora.pendientesPorFirmar` y `notas-pendientes` → **diff para Maiki**; `alertas` no congelado) |
| **Firmas accionables por-ítem** en el dropdown | diseño | 🟡 | medio | No (front + `PorFirmar.jsx`); ya traen el detalle |
| **`GET /api/alertas/detalle`** + atrasos accionables | diseño | 🟡 | medio | **Sí** (monta router en `server.js` congelado; controller/route nuevos) |
| **Centro de notificaciones `/notificaciones`** | diseño | 🔴 | alto | **Sí** (ruta nueva en `App.jsx` congelado, o reusar `SoloRol`) |

**Correctitud/ley:** ningún ítem cambia cálculo ni inmutabilidad; todo es presentación + endpoints **read-only**
(patrón `notas-pendientes`). La firma sigue por su vía append-only (`firmarApertura`, congelada).

---

## FRENTE 5 — SIDEBAR COLAPSABLE / OCULTABLE (factibilidad)

### Veredicto: 🟢 FACTIBLE Y SEGURO — esfuerzo bajo (1-2 archivos, ~30-40 líneas)
El enfoque correcto **no es** "colapsar a solo-iconos" ni "ocultar del todo": ambos chocan con la suite e2e. El
seguro es un **drawer responsivo** que mantiene el `<aside>` y sus `<a href>` **siempre en el DOM y visibles** para
Playwright, con **default ABIERTO**.

### 1. Factibilidad
| Aspecto | Estado |
|---|---|
| Layout | `AppShell.jsx` ya usa flexbox (`<div className="flex flex-1 …">` con `<Sidebar/>` + `<main className="flex-1">`). Si el aside se reduce, `main` ocupa el resto solo. |
| Sidebar | `Sidebar.jsx:152` fija `w-72` en su `<aside>`. Es el único punto a parametrizar. |
| Responsive | El header ya usa `hidden md:inline-flex` → el proyecto ya asume breakpoints Tailwind. |
| Persistencia | Trivial con `localStorage` + `useState`. No hay store global que tocar. |

Dificultad real: **baja** (sin medición de viewport ni librerías; estado React + clases condicionales).

### 2. Archivos que toca
- `components/ui/AppShell.jsx` — estado `sbAbierto`, botón hamburguesa en el header, pasar el estado a `<Sidebar/>`.
- `components/layout/Sidebar.jsx` — recibir prop y condicionar el ancho/visibilidad del `<aside>`.
- **Zona congelada: NO se toca.** `App.jsx`/`permisos.js`/`SesionContext.jsx` intactos; gating y rutas no cambian.
  100% presentación de marco.

### 3. Riesgo e2e (lo crítico)
El contrato de `frontend/e2e/_helpers.js` impone **2 invariantes duras**:
- **`enterAppMode`:** `page.locator('aside').first().waitFor({ state:'visible' })` → el `<aside>` debe estar
  **visible al entrar**. Si el default fuera "oculto", **toda la suite con login real revienta en el `beforeEach`**.
- **`goToViaSidebar`:** clica `aside a[href="${path}"]` y solo cae a `page.goto` si `count()===0`. Si el enlace
  existe pero está **oculto**, `click()` **falla por timeout** (no cuenta como 0). Es el modo de fallo más peligroso.

| Enfoque | ¿Conserva `aside a[href]`? | Riesgo e2e |
|---|---|---|
| Solo-iconos (quitar labels, mantener `<a>`) | sí, visibles | 🟢 bajo (pero tooltips por hover frágiles, mal UX táctil) |
| **Ocultar con `-translate-x-full`** colapsado | montados pero no visibles | 🔴 alto SI default colapsado · 🟢 bajo SI **default abierto** en viewport de test |
| Desmontar el `<aside>` al colapsar | **no** | 🔴 crítico (rompe `enterAppMode` y todo) |

**Mitigación clave:** **default ABIERTO**. Playwright corre en viewport ancho; si el auto-colapso se ata a un
breakpoint móvil (`< lg`), el test nunca lo dispara y `aside a[href]` queda siempre clicable. Nota: `expandirSidebarHasta`
busca `data-accordion-toggle`, que **ya no existe** (sidebar plano desde F5) — **no resucitar** esa lógica.
`PestanasCiclo` y `Breadcrumb` navegan por su cuenta → colapsar el sidebar no los afecta.

### 4. Enfoque recomendado: drawer responsivo, default abierto
- **Escritorio (≥ lg):** sidebar visible. Botón hamburguesa (🟰) en el header alterna `w-72` ↔ colapsado; estado en
  `localStorage` (`sigecop:sidebar`).
- **Móvil/tablet (< lg):** sidebar como **overlay/drawer** con backdrop (reusar el patrón ya existente en
  `AppShell.jsx:273-275`). Cerrado por defecto en móvil **pero el `<aside>` permanece montado**.
- El toggle **nunca desmonta** el `<aside>`: solo cambia ancho (`w-72` ↔ `w-0 overflow-hidden`/`-translate-x-full`) y
  monta backdrop en móvil.

Pasos: (1) `const [sbAbierto, setSbAbierto] = useState(() => { try { return localStorage.getItem('sigecop:sidebar')
!== 'cerrado'; } catch { return true; } });` (default `true` ⇒ pasa `enterAppMode`). (2) hamburguesa con
`aria-expanded`. (3) pasar `abierto` a `<Sidebar/>`. (4) clase condicional en el `<aside>` con `transition-all`;
overlay+backdrop en móvil. (5) **correr la suite completa** (login real, backend arriba) y confirmar `enterAppMode` +
`goToViaSidebar` verdes antes de dar por bueno.

**Clasificación:** 🟢 bajo riesgo / bajo esfuerzo **siempre que el default sea abierto y el `<aside>` nunca se
desmonte**. Sube a 🔴 si se hace default-colapsado o se desmonta. **No requiere a Maiki** (no toca zona congelada).

---

## APÉNDICE — Mapa de rutas canónico (referencia)
- **37 rutas** en `App.jsx` (incl. catch-all `*` → `/`). **22 historias** en `dummy.js` (HU-00..HU-21).
- **21 WithLayout** (1 sin gating HU = `/`, 20 por HU vía `HU_POR_RUTA`+`nivelDe`) · **14 SoloRol** (por-firmar,
  finiquito, 8 ambientes/ciclo-vida/cierre, admin/empresas, usuarios/solicitudes, roster) · **1 pública**
  (`/solicitud-acceso`) · **1 catch-all**.
- **HU-22/23/24 NO existen en `permisos.js` ni `dummy.js`:** se sirven como rutas `SoloRol` (roster=HU-22,
  finiquito/cierre=HU-24, admin/empresas=HU-23). Ninguna HU del catálogo queda huérfana de ruta.
- **Riesgo estructural de las rutas-ambiente `SoloRol`:** como **no** están en `HU_POR_RUTA`, **no respetan los
  niveles E/C** de la matriz — un rol listado entra con vista completa aunque en la HU subyacente sea solo 'C'. La
  restricción `soloLectura` la aplica cada página por dentro vía `useVistaHU(huId)`, **no** la guarda de ruta.

## Decisiones pendientes para Maiki (resumen)
1. **NAV-A** (1 línea, 🔴): quitar `'dependencia'` del bloque 3 de Ciclo de vida.
2. **NAV-B** (raíz, 🟡): gatear el `<Link>` del breadcrumb por `nivelDe`.
3. **NAV-C/D** (🟡): `LinkHU` en TransitoPago; gatear "Ver portafolio" del modal + **verificar si Finanzas queda
   operable con el contrato global**.
4. **NAV-F/G/H + Frente 2** (diseño): decidir la **ruta canónica de cada ciclo** (ambiente vs pantalla suelta),
   unificar Inicio↔Sidebar↔Ciclo-de-vida, montar `PestanasCiclo`+chip uniforme en los 5 ambientes que faltan.
5. **Frente 3** (sin tocar ley): actualizar HU-06/HU-21/HU-23 (❌) y HU-14/HU-19 (⚠️); sincronizar `RegistroPagoForm`;
   corregir copy del 25% en convenios. Lo legal de HU-23 (art. 43/74 Bis) lo confirma el profe.
6. **Frente 4**: re-seed de la BD (BD), acotar campana al contrato activo (diff aditivo sobre 2 controllers
   congelados), endpoint `GET /api/alertas/detalle`, y centro `/notificaciones` (ruta nueva).
7. **Frente 5**: drawer responsivo default-abierto cuando se decida (no urgente para la demo en laptop).

---

*Diagnóstico read-only generado leyendo el código real y verificando adversarialmente cada hallazgo de navegación
(17 agentes; 1 falso positivo descartado: SB-03). **No se modificó código ni base de datos. No push. Zona congelada
intacta.** Maiki revisa y decide qué se aplica.*
