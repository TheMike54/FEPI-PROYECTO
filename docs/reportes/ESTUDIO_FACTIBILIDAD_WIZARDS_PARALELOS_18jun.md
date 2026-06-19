# ESTUDIO DE FACTIBILIDAD — wizards (TIPO A) + vistas siempre accesibles (TIPO B) · 18-jun-2026

> Encargo de Maiki: antes de ejecutar el match con `docs/mockups/sigecop-prototipo-ciclos.html`, estudiar cómo
> conviven en cada ciclo los **pasos secuenciales con candado (TIPO A)** y las **vistas siempre accesibles
> (TIPO B, "en paralelo")**. **Solo análisis — nada implementado.** Leído del **código real** (controllers +
> wizards) y de los docs, no de memoria. Local, sin push.
>
> **Definiciones:** **TIPO A** = paso de un wizard con orden obligatorio (no avanzas sin completar el
> anterior). **TIPO B** = vista de lectura que NO se puede bloquear nunca (se ve aunque el wizard esté
> incompleto). El candado de las TIPO A es **server-side** (lo enforce el backend, no solo la UI).

---

## 1. CLASIFICACIÓN POR CICLO (HU → TIPO A / TIPO B + condición)

### Bitácora (HU-08/09/10/11)
| HU | Tipo | Condición de desbloqueo (TIPO A) / por qué nunca se bloquea (TIPO B) |
|---|---|---|
| **HU-08 Apertura** | **A** (paso 1) | Solo el residente (403, `bitacora.controller:98`). Es el primer paso: sin apertura no hay bitácora. |
| **Firma conjunta (Por firmar)** | **A** (paso 2) | Requiere apertura existente; cada parte firma (409 si ya firmó, `:304/312`). |
| **HU-09 Emitir notas** | **A** (paso 3) | **Requiere apertura FIRMADA por TODOS** (409, `:573`, art. 123 fr. III RLOPSRM). |
| **HU-10 Consultar / buscar** | **B** | **NUNCA se bloquea.** Lectura; el backend solo valida participación (403), **no hay candado de orden**. Se debe poder consultar el libro siempre (art. 123: la bitácora es de consulta permanente). *(Si aún no hay apertura → estado vacío "aún no hay bitácora", no error.)* |
| **HU-11 Minutas y visitas** | **B** (episódico) | Acto puntual de lectura/registro paralelo; vincular una minuta a una nota exige que la nota sea del contrato (400), pero la pantalla siempre se abre. |

### Ciclo de estimación (HU-12/13/14/15/16/17)
| HU | Tipo | Condición / por qué |
|---|---|---|
| **HU-12 Integrar** (Periodo→Generadores→Carátula→Soportes→Integrar) | **A** (wizard interno) | Pasos internos de UNA historia. Candados reales: PDF firmado ligado (409, `estimaciones.controller:148`), anticipo>umbral exige su PDF (409, `:152`), no exceder contratado/planeado (409, `:267`/art.118/45-A-X), periodo ≤1 mes, contrato no cerrado (409, `:128`). |
| **HU-13 Presentar** | **A** (paso final) | Requiere estado **'integrada'** (409, `estimaciones-ciclo.controller:171`); una sola vez (`:168`). |
| **HU-15 Revisión / autorización** | **A** pero **de OTRO actor** (paralelo al wizard del contratista) | Supervisión **turna** (no doble turnado, `:428`) → residencia **autoriza** (solo residencia, 403 `:477`; no antes de turnar). Es secuencial, pero lo ejecutan supervisión/residencia, no el contratista. |
| **HU-16 Reingreso** | **A condicional** (acción gated) | La pantalla se abre siempre, pero **solo reingresa una 'rechazada'**. |
| **HU-14 Historial** | **B** | Lectura; solo participación (403, `:52`), sin candado de orden. Siempre accesible. |
| **HU-17 Tablero** | **B** | Vista ejecutiva de lectura. Siempre accesible. |

### Pago y tránsito (HU-20/21)
| HU | Tipo | Condición / por qué |
|---|---|---|
| **HU-20 Tránsito** (Suficiencia→Soportes→Instrucción) | **A** (wizard) | Generar instrucción requiere estado **'autorizada'** (409, `instruccion-pago.controller:272`) + suficiencia (techo+**partida**, 409 `:289/300/317`) + soportes + no cerrado (`:268`). |
| **HU-21 Registrar pago** | **A** (paso final del ciclo en el mockup) | Solo **'autorizada'** (409, `pagos.controller:72`); no doble pago (`:66`); no rechazada (`:67`). |
| (consulta de suficiencia/soportes) | **B** | `estadoTransito` es lectura (solo acceso). |

### Avance y seguimiento (HU-05/06/07) — el mockup lo marca **"pantalla"** (no wizard)
| HU | Tipo | Condición / por qué |
|---|---|---|
| **HU-06 Registrar avance** | **A "suelto"** (acción, no multi-paso) | No exceder lo contratado (409, `trabajos.controller:269`, art. 118). **NO requiere bitácora** (la nota se DIFIERE si no hay). No es un wizard de varios pasos → por eso el mockup lo deja como "pantalla". |
| **HU-05 Curva de avance** | **B** | Lectura (curva S). Siempre accesible. |
| **HU-07 Alertas de atraso** | **B** (la vista) | Derivación de déficit (lectura) — siempre accesible. *Asentar* el atraso es una acción (idempotente, tabla `atraso_asentado`), pero la vista no se bloquea. |

### Convenios (HU-03) · Finiquito (HU-24) · Expediente (HU-04) — "pantalla"/"visor"
| HU | Tipo | Condición / por qué |
|---|---|---|
| **HU-03 Convenios** | **A condicional** (registrar→autorizar, en una pantalla) | Registrar (rol) → **Autorizar** (solo dependencia 403 `:338`, estado 'registrado' 409 `:352`, guardrail art.102 >25% exige oficio 409 `:361`). No es stepper multi-pantalla → "pantalla". |
| **HU-24 Finiquito** | **A condicional** | Solo dependencia/residente (403 `:114`); no cerrado (409 `:116`); sin finiquito previo (`:118`); **requiere bitácora abierta** (409 `:121`). Acto único → "pantalla". |
| **HU-04 Expediente** | **B (visor)** | Solo lectura consolidada. Siempre accesible. |

> **Resumen:** TIPO A real (candado secuencial) = Bitácora (apertura→firma→emitir), Estimación (wizard HU-12 +
> presentar + el estado-máquina integrada→presentada→turnada→autorizada), Pago (autorizada→instrucción→pago),
> Alta (ya hecho). TIPO B = Consultar(HU-10), Minutas(HU-11), Historial(HU-14), Tablero(HU-17), Curva(HU-05),
> Alertas(HU-07), Expediente(HU-04), Portafolio(HU-18), Reportes(HU-19).

---

## 2. DEPENDENCIAS REALES — ¿el sistema HOY las respeta? (leído del código)

**SÍ, y el candado es server-side (lo importante):**
- Los candados TIPO A están en los **controllers** (los 409/403 citados arriba), no solo en la UI. Es decir,
  **aunque la UI fallara, el backend impide el desorden** (emitir sin firma, presentar sin integrar, pagar sin
  autorizar, finiquitar sin bitácora). Esto es lo que hace seguro el rediseño: mover/quitar chrome de
  navegación **no afecta el gating real**.
- Las **TIPO B no tienen candado de orden** en el backend: los reads (`consultarNotas`, historial, curva,
  alertas, expediente, tablero) solo validan **participación** (403), nunca "estado previo". → Por diseño ya
  son siempre accesibles a nivel datos.

**¿La UI actual respeta TIPO A/B? — Sí, y ya hay un MODELO correcto:**
- **`AmbienteBitacora.jsx` (mi wizard de esta ronda) ES el patrón objetivo:** stepper Apertura→Firma→Emitir con
  `pasoValido(0)=abierta`, `pasoValido(1)=completa` (TIPO A) **+ una sección "En paralelo" (Consultar/Minutas)
  que se renderiza SIEMPRE, fuera de los condicionales de paso** (TIPO B). Esto ya separa correctamente A de B.
- **`IntegracionEstimacion.jsx`:** el wizard gatea por datos (exceso/neto); las TIPO B del ciclo (Historial,
  Revisión, Reingreso) hoy viven como **sub-items del sidebar** → siempre accesibles. (Al aplanar habría que
  moverlas a "en paralelo" dentro, **manteniéndolas sin candado**.)
- **`TransitoPago.jsx`:** navegación libre entre los 3 pasos; el gate duro es "Generar instrucción".

**Riesgos detectados (casos donde podría romperse A/B):**
1. **El que MÁS importa:** si al aplanar el sidebar se mueven las TIPO B (Consultar, Historial, Curva…) a
   "botones dentro del ciclo", hay que asegurar que **NO queden detrás de un paso del wizard** (deben renderizar
   siempre, como ya hace la sección paralela de `AmbienteBitacora`). Si por error se condicionan al `paso`,
   romperíamos la regla "Consultar siempre".
2. **HU-10 sin apertura:** `consultarNotas`/`notasDeContrato` puede devolver 404 si no hay bitácora. La vista es
   TIPO B, así que **debe mostrar estado vacío** ("aún no hay bitácora"), no un error que parezca bloqueo. (A
   verificar en `ConsultaNotas.jsx` durante la ejecución — es UI, no gating.)
3. **No mover el candado a solo-frontend:** el gating TIPO A debe seguir viviendo en el backend (ya está). El
   stepper de la UI es **espejo** del candado server-side, no el candado en sí.
- **No encontré** ningún caso donde el wizard actual **bloquee** una TIPO B (las paralelas de bitácora se
  renderizan siempre; las de estimación están en el sidebar). Tampoco uno donde algo que debe ser TIPO A quede
  abierto (los candados son server-side).

---

## 3. CÓMO INTEGRARLO POR CICLO (stepper TIPO A + "en paralelo" TIPO B) + riesgos

| Ciclo | Stepper (TIPO A, con candado) | En paralelo (TIPO B, siempre) | Riesgo |
|---|---|---|---|
| **Bitácora** | Apertura → Firma → Emitir (candado: firma→abierta, emitir→completa) | Consultar (HU-10), Minutas (HU-11) | 🟢 **BAJO** — `AmbienteBitacora` YA lo hace; solo falta que sea la entrada del ciclo. |
| **Estimación** | Periodo → Generadores → Carátula → Soportes → Integrar y presentar | Revisión/autorización (HU-15, otro actor), Reingreso (HU-16, gated a 'rechazada'), Historial (HU-14), Tablero (HU-17) | 🟡 **MEDIO** — mover las paralelas del sidebar a "en paralelo" dentro, **sin candado**. |
| **Pago** | Suficiencia → Soportes → Instrucción → **Registrar pago** | — (paralelo vacío en el mockup) | 🔴 **MEDIO-ALTO** — el mockup mete HU-21 como 4º paso (hoy es pantalla aparte); embeber HU-21 toca su form/specs. |
| **Avance** | (pantalla: Registrar avance, acción única) | Curva (HU-05), Alertas (HU-07) | 🟢 **BAJO** — no necesita stepper; añadir "en paralelo" Curva/Alertas. |
| **Convenios** | (pantalla: registrar→autorizar en una vista) | — | 🟢 **BAJO** — ya es una pantalla con su acto de autorización. |
| **Finiquito** | (pantalla: un acto, gated por bitácora) | — | 🟢 **BAJO**. |
| **Expediente** | (visor, todo lectura) | (es TIPO B completo) | 🟢 **BAJO**. |

> **Patrón técnico reutilizable:** el de `AmbienteBitacora` — `paso` + `pasoValido(p)` (espejo del candado
> server-side) para los pasos TIPO A, y una **sección "En paralelo" renderizada incondicionalmente** (solo
> requiere contrato seleccionado) para las TIPO B. Replicarlo a Estimación/Avance es de bajo riesgo lógico; el
> riesgo está en los **specs** (navegación) y, en Pago, en embeber HU-21.

---

## 4. ¿Las HISTORIAS reflejan esta estructura (wizard + paralelos, qué se bloquea)?

- **`Historias_Usuario_ACTUALIZADAS_12jun.md`:** tiene los **criterios por HU** y el fundamento legal, e incluye
  (lo añadí esta ronda) el bullet de HU-12 "ambiente = WIZARD" y el de HU-03 (acto de autorización). **Pero NO
  clasifica explícitamente cada HU como TIPO A/B ni dice su condición de desbloqueo.** Está organizada por HU,
  no por "qué se bloquea y qué no".
- **`HISTORIAS_POR_CICLOS.md`:** SÍ agrupa por ciclo y, para Bitácora/Avance, **ya dice "Consulta/Minutas en
  paralelo"** y "Curva/Alertas en paralelo". Tiene el cuadro paso↔criterio para Estimación y Pago. **Lo que
  falta:** una **columna/marca TIPO A vs TIPO B** por HU con su **condición de desbloqueo** (justo la tabla de
  la §1 de este estudio), para que quede explícito qué nunca se bloquea y por qué (con la cita).
- **Veredicto:** están **bien encaminadas pero incompletas** para este fin. **Falta** integrar la clasificación
  A/B + condiciones (la §1 de aquí) a `HISTORIAS_POR_CICLOS.md` — es trabajo de **documento**, no de código, y
  se puede hacer junto con (o antes de) la ejecución del rediseño.

---

## 5. RECOMENDACIÓN para ejecutar el match de forma segura

1. **Apóyate en el patrón ya probado** (`AmbienteBitacora`): stepper para TIPO A + sección "En paralelo"
   incondicional para TIPO B. No inventes un mecanismo nuevo.
2. **Regla de oro de seguridad:** una vista **TIPO B nunca** se condiciona a un paso del wizard ni a un candado;
   su única precondición es **contrato seleccionado + participación** (que ya valida el backend). Las TIPO B
   deben mostrar **estado vacío** cuando no hay datos (p. ej. consultar sin apertura), nunca un error de bloqueo.
3. **No toques el gating server-side.** Los candados TIPO A ya están en los controllers (verificado). El stepper
   de la UI es su espejo; si lo respetas, el gating no se rompe aunque cambie la navegación.
4. **Ejecuta por ciclo, con checkpoint de suite verde** (es donde está el riesgo real: ~31 specs asertan el
   sidebar). Orden sugerido por riesgo: Avance/Convenios/Finiquito/Expediente (🟢) → Bitácora (🟢, ya hecho) →
   Estimación (🟡) → Pago (🔴, decide si embebes HU-21 o lo dejas como enlace).
5. **Primero el documento:** añade la clasificación A/B + condiciones (la §1) a `HISTORIAS_POR_CICLOS.md` para
   que el contrato de comportamiento esté escrito **antes** de mover navegación.
6. **A 6 días:** lo seguro de verdad es (a) **quitar el residuo "Recorrido por bloques"** y (b) opcionalmente
   formalizar "en paralelo" en Avance/Estimación (bajo riesgo). El **aplanado total del sidebar** y **Pago paso
   4 (HU-21 embebido)** son los puntos rojos; si los haces, que sea con checkpoints y, idealmente, post-entrega.

> **Conclusión honesta:** el rediseño es **factible y de bajo riesgo LÓGICO** porque los candados (TIPO A) ya son
> server-side y las TIPO B ya están sin candado — el sistema **ya respeta** la separación. El riesgo no es romper
> el gating, es el **churn de specs de navegación**. El patrón objetivo ya existe (`AmbienteBitacora`); replicarlo
> es mecánico. Lo que NO recomiendo a 6 días es el aplanado total + embeber HU-21 de un golpe.

---

*Estudio leído del código real (controllers `bitacora`/`estimaciones`/`estimaciones-ciclo`/`instruccion-pago`/
`pagos`/`finiquito`/`trabajos`/`convenios` con sus 409/403; wizards `AmbienteBitacora`/`IntegracionEstimacion`/
`TransitoPago`) y de los docs de historias. Nada implementado.*
