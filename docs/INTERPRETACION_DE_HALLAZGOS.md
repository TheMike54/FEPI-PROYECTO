# INTERPRETACIÓN DE HALLAZGOS — prueba a fondo de Maiki (18-jun-2026)

> **Qué es esto.** Maiki probó el sistema de punta a punta y anotó ~20 observaciones (bugs, dudas legales,
> ideas de rediseño). Este documento las **estructura, las contrasta con el código real y la ley, y agrega mi
> interpretación** para decidir qué hacer. **No se ha implementado nada todavía** — es el insumo para priorizar.
>
> Cada hallazgo está **verificado** (se cita `archivo:función:línea` del comportamiento actual) y, cuando hay
> pregunta legal, **contra el texto literal** de `docs/legal/` (LOPSRM/RLOPSRM). Lo que no tiene base literal se
> marca **[validar profe / escuchar audio]**.
>
> **Diagnóstico:** 🐛 bug · 🚧 falta implementación · 🔀 diseño confuso/decisión · ⚖️ pregunta legal · 💅 UX.
> **Esfuerzo:** 🟩 bajo · 🟨 medio · 🟥 alto.

---

## 1. NOTIFICACIONES (unificar la campana + avisar firmas/solicitudes)

### 1.1 🚧🟩 Las solicitudes de registro no avisan a la dependencia *(NOTIF-1)*
- **Observaste:** "las solicitudes de registro deberían llegar como notificación".
- **Estado real:** no hay aviso. Al auto-registrarse (`auth.controller.js:register`) la cuenta queda
  `'pendiente'` y la dependencia se entera **solo si entra a mano** a *Solicitudes de registro*
  (`/usuarios/solicitudes`). El ítem del sidebar y de Inicio es estático, **sin contador**.
- **Ley:** [validar] — el alta/aprobación de cuentas del sistema es operativa; no hay artículo que regule avisos
  in-app.
- **Sugerencia:** badge derivado (como atrasos): conteo de `usuarios estado='pendiente'` → punto/número en la
  campana o en el ítem "Solicitudes", **solo rol dependencia**. Cero DDL (`usuarios.controller` congelado → el
  endpoint de conteo lo monta Maiki, o se deriva del listado que ya carga el front).

### 1.2 🚧🟨 Emitir una nota no avisa "tienes una nota sin firmar" a las partes *(NOTIF-2)*
- **Observaste:** al emitir una nota debería avisar a los ligados al contrato que deben firmarla.
- **Estado real:** no existe ese aviso **ni el dato que lo alimentaría**. `emitirNota` inserta la nota firmada
  solo por el emisor; la contraparte firma después (`firmarNota`), pero **nada avisa**. El badge ✍️ "Por firmar"
  (`api.pendientesPorFirmar` → `/bitacora/pendientes`) **solo lee firmas de APERTURA** (la página se titula
  literal *"Por firmar — aperturas de bitácora"*), **no notas**.
- **Ley:** **art. 123 fr. III RLOPSRM** (plazo máximo para firmar; vencido se tienen por aceptadas) + **fr. XII**
  (residente/superintendente/supervisor resuelven las notas que les toquen) → fundamentan el **deber de firmar**;
  el aviso in-app en sí es operativo [validar que basta el indicador].
- **Sugerencia:** endpoint derivado `GET /bitacora/notas-pendientes` (SELECT puro, cero DDL): notas `'emitida'`
  de contratos donde el usuario es parte, en las que **no** firmó y **no** es el emisor y el plazo no venció.
  Sumar su `.length` al badge de firmas.

### 1.3 💅🟨 Unificar 🔔 y ✍️ en UNA campana con tipos — **sí, buena idea y factible** *(NOTIF-3)*
- **Observaste:** unificar la campana y "Por firmar" en una sola campanita con todos los tipos.
- **Estado real:** hoy son **dos botones** (✍️ aperturas-por-firmar + 🔔 atrasos). El dropdown 🔔 **ya agrega
  ambas fuentes** en su cuerpo; falta fusionar los **dos badges en uno** y sumar las cuentas.
- **Mi interpretación:** **buena idea, bajo riesgo.** Una sola 🔔 con badge = (aperturas + notas por firmar
  [1.2] + atrasos + solicitudes [1.1, si dependencia]); el dropdown se vuelve la lista única **agrupada por tipo**
  (Firmas · Atrasos · Solicitudes), cada item con su "ir a". Cada fuente ya respeta el acceso por rol, así que
  cada quien ve solo lo suyo.
- **Cuidado:** la suite e2e asercióna `campana-atrasos`, `link-por-firmar`/`por-firmar-count`,
  `drop-firmar`/`drop-campana` → hay que conservar esos testids o actualizar sus specs en la misma pasada.

---

## 2. VINCULACIÓN DE NOTAS (minutas / avance)

### 2.1 🐛🟩 "Minutas registradas" muestra `nota #58` (id global), no el folio `#3` *(NOTAS-VINC-01)*
- **Observaste:** la nota vinculada se ve como "#58" y no coincide con la que elegiste.
- **Estado real (la causa):** `MinutasVisitas.jsx:97/176` imprime `m.nota_id`, que es el **id global** (PK de
  `bitacora_notas`, único en TODA la base). El folio que ves en todo el sistema es **`numero`**, que es
  **consecutivo por bitácora**. Por eso la nota que conoces como "#3" tiene id 58 y se imprime "#58". **El
  vínculo SÍ persiste** (`minutas.controller.js:84 UPDATE minutas SET nota_id` y se relee); es **solo un bug de
  presentación**.
- **Ley:** **art. 123 fr. V RLOPSRM** (verificado) — las notas se numeran en forma seriada; la numeración visible
  es el `numero`, no el id.
- **Sugerencia (fix bajo):** que `listarMinutas/listarVisitas` hagan `LEFT JOIN bitacora_notas bn ON
  bn.id=m.nota_id` y devuelvan `bn.numero AS nota_numero` (igual que **ya hace `trabajos.controller.js`**); en el
  front mostrar `#${m.nota_numero ?? m.nota_id}`.

### 2.2 🚧🟨 En "Consultar/buscar notas" no se ve que una nota esté ligada a minuta/avance *(NOTAS-VINC-02)*
- **Observaste:** la nota que vinculaste no aparece como vinculada en *Consultar notas* → sospechaste que no
  vincula.
- **Estado real:** la columna "Vínculo" de la consulta **solo mira `vinculada_a`**, que es la relación
  **nota→nota** (una nota que CONTESTA a otra). El vínculo **minuta→nota / avance→nota** vive en **otras
  columnas** (`minutas.nota_id`, `visitas.nota_id`, `concepto_avance.nota_id`) que esa consulta no lee. O sea:
  **sí está vinculada**, pero la consulta no lo refleja.
- **Ley:** **art. 123 fr. X RLOPSRM** (verificado) — ratificar en bitácora instrucciones de oficios/**minutas**.
- **Sugerencia:** en el query de la consulta, agregar `EXISTS(... FROM minutas/visitas/concepto_avance WHERE
  nota_id=n.id)` y pintar también esos vínculos en la columna.

### 2.3 🔀🟩 El avance **sí** vincula su nota; el caso "sin vincular" fue bitácora cerrada *(NOTAS-VINC-03)*
- **Observaste:** al registrar un avance "tampoco se vinculó" la nota.
- **Estado real:** el avance **SÍ** crea y liga su nota **en la misma transacción** *cuando hay bitácora
  abierta* (`trabajos.controller.js:285-298`), y la muestra con el folio correcto. **Pero** si la bitácora **no
  está abierta**, la nota se **difiere** (legítimo) y el avance queda "pendiente de nota" hasta abrir la bitácora.
- **Mi interpretación:** antes de tratarlo como bug, confirma si en ese contrato la bitácora estaba abierta al
  registrar. Si **sí** estaba abierta y aun así quedó sin nota, ahí sí hay bug a reproducir. (Probable causa de tu
  observación: probaste sobre un contrato sin bitácora abierta.)

### 2.4 ⚖️🟩 ¿Las notas se vinculan al crearlas? — **No: la ley lo hace opcional** *(NOTAS-VINC-04)*
- **Estado real / ley:** hay **dos comportamientos correctos**: (a) **avance** → la nota se liga
  **automáticamente** porque la nota ES el asiento del avance (**art. 123 fr. II**); (b) **minuta/visita** → la
  nota se liga **después** con "Adjuntar a nota", porque **art. 123 fr. X** dice *"CUANDO SE REQUIERA, se PODRÁN
  ratificar…"* (verificado literal) → es **opcional**. El copy del modal ya cita bien la fr. X.
- **Sugerencia:** no forzar el vínculo al crear; el flujo actual es el correcto. Si el profe lo pide, se puede
  *permitir* elegir nota desde el alta de la minuta, pero **no obligar**.

---

## 3. INTEGRIDAD DE REGISTROS (editar/duplicar/cerrar)

### 3.1 🔀🟨 Un avance se puede **editar y eliminar** libremente (no es append-only) *(INT-01)*
- **Observaste:** ¿el avance registrado se puede editar/eliminar?
- **Estado real:** **sí.** `trabajos.controller.js` expone `actualizarAvance` (PATCH) y `eliminarAvance` (DELETE)
  para rol contratista; el propio comentario lo declara: *"Captura EDITABLE (POST/PATCH/DELETE): no append-only"*.
- **Tensión:** cada avance genera su **nota de bitácora** automática, y esa nota **sí es inmutable** (art. 123 fr.
  VI). Editar el avance sin tocar la nota deja **inconsistencia** entre el dato y el asiento.
- **Ley:** el avance crudo (`concepto_avance`) no tiene artículo que prohíba editar; la **nota** sí es inmutable
  (art. 123 fr. VI). [validar profe el modelo].
- **Sugerencia (decisión del profe):** (A) hacerlo **append-only** como el resto (corregir = avance nuevo
  vinculado, no editar) — alinea con el patrón del proyecto; o (B) si se conserva editable, que editar/eliminar
  **asiente su propia nota** de corrección en la bitácora.

### 3.2 🐛🟨 "Asentar atraso en bitácora" se puede repetir sin tope → notas duplicadas *(INT-02)*
- **Observaste:** asentar C-03 muchas veces sin parar — ¿debe poderse?
- **Estado real:** la única precondición de `asentarAtraso` es que el concepto tenga déficit > 0 **ahora** y haya
  bitácora abierta. Como asentar la nota **no reduce el déficit**, se puede llamar otra vez y **crea otra nota
  cada vez**. No hay verificación de "¿ya asenté este atraso este periodo?".
- **Ley:** la inmutabilidad pide no **modificar** la nota (art. 123 fr. VI), pero asentar N veces el mismo atraso
  **ensucia la bitácora** (medio de prueba, art. 122 RLOPSRM). [validar el criterio: 1 por concepto/periodo].
- **Sugerencia:** antes del INSERT, si ya existe una nota de atraso de ese concepto en el periodo vigente → **409**
  "el atraso de este concepto ya está asentado en el periodo N". (Necesita un vínculo atraso↔concepto/periodo:
  columna o tabla puente.)

### 3.3 🚧🟩 Tras el FINIQUITO (contrato 'cerrado') aún se pueden integrar/presentar estimaciones *(INT-03)*
- **Observaste:** después del finiquito aún puedo presentar estimaciones → debe bloquearse + notificar.
- **Estado real:** `cerrarFiniquito` marca `contratos.estado='cerrado'` **pero NO bloquea el ciclo de
  estimaciones.** El gate de "cerrado" **solo existe** en el último tramo (`instruccion-pago.controller`:
  cargar soporte / generar instrucción dan 409). `integrarEstimacion`, `enviarEstimacion`, `autorizarEstimacion`,
  `rechazarEstimacion`, `reingresarEstimacion` **no consultan `contrato.estado`**.
- **Ley:** **art. 64 LOPSRM** (verificado) — el finiquito da por **extinguidos los derechos y obligaciones** del
  contrato → tras cerrarlo no caben más estimaciones. **+ art. 170-172 RLOPSRM**.
- **Sugerencia (fix bajo):** replicar el gate existente: en cada puerta de entrada del ciclo, **409 si
  `contrato.estado==='cerrado'`**. Y agregar la **notificación** a los involucrados (se engancha con §1).

---

## 4. NAVEGACIÓN Y REESTRUCTURA (el tema central)

### 4.1 🔀🟩 "Números generadores · Pendiente Equipo 3" es **FALSO**: ya está al 100% *(C-01)*
- **Observaste:** el recorrido por bloques dice que los generadores están pendientes.
- **Estado real:** el cartel ámbar de `AmbienteEstimacion.jsx` es un **placeholder mentiroso**. La captura de
  generadores **YA EXISTE Y FUNCIONA** en `IntegracionEstimacion.jsx::TabGeneradores` (tabla real, teclea volumen
  ejecutado por concepto, calcula importe/acumulado/% en vivo y arma el array al integrar, **art. 132 fr. I
  RLOPSRM** verificado).
- **Sugerencia (fix bajo):** quitar el badge "Pendiente · Equipo 3" y el cartel; marcar el bloque como **listo** y
  enlazarlo a HU-12 (o embeberlo si se hace el wizard — ver 4.3).

### 4.2 🚧🟥 Evidencia fotográfica por periodo: el placeholder **sí es real** (no implementado) *(C-02)*
- **Observaste:** el recorrido del avance dice que la evidencia fotográfica aún no está.
- **Estado real:** **correcto, no existe.** `concepto_avance` no tiene columna de foto/imagen; HU-06 no tiene
  input de archivo. El placeholder es honesto.
- **Ley:** **art. 132 fr. IV RLOPSRM** (verificado) — "fotografías" entre los documentos de la estimación; pero el
  encabezado del art. 132 dice que los documentos *"serán determinados por cada dependencia… entre otros"* → no es
  obligatorio universal.
- **Mi interpretación (decisión tuya):** (1) si **no** es alcance de Etapa 1, suavizar el copy a *"fuera de
  alcance de Etapa 1"* (más honesto que "pendiente Equipo 2"); (2) si **sí**, es trabajo real (tabla/columna BYTEA
  + endpoint multer como `contrato_documentos` + UI). **Esfuerzo alto.**

### 4.3 🔀🟥 EL CONCEPTO CENTRAL: hoy es "historia por historia **Y** por bloques" (confuso); los recorridos son **cascarones de enlaces**, no wizards *(C-03, C-04)*
- **Observaste:** quieres que ciclo de estimación / bitácora / avance / convenios / expediente se vean como el
  **Alta de contrato** (pasos encadenados), y que el "recorrido por bloques" **no** sea una pantalla aparte sino
  **LA pantalla que integra** esas historias (no amontonado). Hoy es confuso.
- **Estado real (confirmado):** en el sidebar, bajo "Bitácora" cuelgan **como hermanos** las historias (Por
  firmar, Emitir, Consultar, Minutas) **y además** "Recorrido por bloques" → o sea el recorrido es **una pantalla
  más al lado**, no su contenedor. Y los `Ambiente*.jsx` son **cascarones**: muestran datos read-only y **delegan
  por `<Link>`** a las pantallas reales; **no integran la captura**. Es exactamente la confusión que describes.
- **Excepción que pides (válida):** *consultar bitácora no se puede bloquear* — HU-10 es lectura; `AmbienteBitacora`
  ya la marca *"disponible en paralelo, no depende del candado"*. ✓
- **Factibilidad por flujo (mi análisis):**
  | Flujo | ¿Wizard estilo Alta? | Por qué |
  |---|---|---|
  | **Ciclo de estimación** | 🟢 **ALTA** | `AltaContrato.jsx` ya tiene el patrón reutilizable (`tabActivo` + `pasoMaxAlcanzado`, gating secuencial); los pasos serían contrato/periodo → **generadores** (TabGeneradores de HU-12) → **carátula** → soportes/notas → integrar/presentar. Candidato natural. |
  | **Bitácora** | 🟡 **MEDIA** | Tiene una secuencia (apertura → firmar → notas), pero **consultar** debe quedar siempre accesible (no encadenado). Wizard para apertura+firma; consulta/minutas en paralelo. |
  | **Avance** | 🟡 **MEDIA** | Registrar → curva → alertas tiene orden lógico, pero curva/alertas son lectura. |
  | **Pago** | 🟢 **ALTA** | Tránsito (suficiencia→soportes→instrucción) → registro: ya es secuencial. |
  | **Convenios / Expediente** | 🔴 **BAJA** | Convenio es un acto puntual (un formulario); expediente es **solo lectura consolidada** — no es un wizard, es un visor. |
- **Mi recomendación honesta:** **no es "ajustar copy", es reescribir** los cascarones que se quieran volver
  wizard. Empezar por **Estimación** (mayor valor, patrón ya existe). Decide el alcance **antes** de construir: si
  solo es "que no se vea amontonado en el menú", basta el acordeón que ya hicimos; si es "captura integrada como
  el alta", es trabajo de rediseño real por pantalla. **Conviene escuchar de nuevo el audio del profe** sobre
  "quitar lo innecesario (buscar/vincular notas firmadas) porque todo va en una sola pantalla" para fijar el
  alcance exacto.

### 4.4 🔀🟨 "Ciclo de vida" no muestra nada: es un índice estático de enlaces *(BUG-CICLOVIDA-VACIO)*
- **Observaste:** la pestaña Ciclo de vida no muestra nada aunque el contrato ya tenga cosas hechas.
- **Estado real:** `CicloVidaContrato.jsx` es un **array fijo de 14 enlaces**; al elegir contrato solo usa el
  detalle para la etiqueta, **no lee** programa/trabajos/estimaciones/pagos/bitácora → **nunca marca qué etapas
  están hechas**. (Además rebota a Finanzas por gating.)
- **Sugerencia:** que al elegir contrato cargue en paralelo las fuentes reales (programa, historial de
  estimaciones, notas, pagos, convenios — las mismas que usa Reportes) y derive un **estado por bloque**
  (pendiente / en curso / hecho). Es el visor de progreso que esperabas.

---

## 5. BUGS DE FUNCIONALIDAD

### 5.1 🔀🟨 HU-20 Tránsito a pago: el "techo presupuestal" acepta cualquier cifra y la suficiencia se evade *(BUG-HU20-TECHO)*
- **Observaste:** me deja poner lo que quiera en el techo; creo que no funciona bien.
- **Estado real (dos problemas):** (1) `crearPresupuesto` solo valida ejercicio 2000-2100, dependencia no vacía y
  `techo ≥ 0` — **sin tope ni relación con el monto del contrato**; tecleas el techo que quieras y la suficiencia
  "pasa" siempre. (2) La suficiencia se calcula **uniendo contrato↔presupuesto por TEXTO de dependencia + año**,
  **sin la FK** que ya existe (`contratos.dependencia_id`).
- **Ley:** **art. 24 LOPSRM** (verificado) — suficiencia *"en la partida o partidas específicas"*. La ley exige
  suficiencia en **partida**, no un número suelto.
- **Sugerencia:** (a) hacer la **partida** obligatoria al cargar el techo (anclar a la "partida específica"); (b)
  sustituir el join por texto por la **FK** `contratos.dependencia_id`. **Es una historia para revisar a fondo**,
  como dices.

### 5.2 🚧🟨 HU-19 Reportes: el reporte #4 (observaciones de HU-15) tiene el Excel deshabilitado *(BUG-HU19-REPORTE4)*
- **Observaste:** la parte de HU-15 "no se puede por contrato" y no deja descargar el Excel.
- **Estado real:** el reporte **#4 "Listado de observaciones"** está marcado `disponible:false` **sin handler**;
  el botón se pinta "No disponible aún". La causa documentada en el propio archivo: *"falta un GET de
  observaciones a nivel de contrato"* (hoy las observaciones de HU-15 se leen por estimación, no por contrato).
- **Sugerencia:** endpoint nuevo `GET /estimaciones-ciclo/contrato/:id/observaciones` (acotado por participación)
  que junte las observaciones de todas las estimaciones del contrato; luego habilitar el reporte #4.

---

## 6. PREGUNTAS LEGALES / REGLAS DE NEGOCIO

### 6.1 🐛🟩 Endoso de fianza guardado **sin monto ni vigencia** (endoso vacío) *(L1)*
- **Observaste:** me dejó guardar un endoso sin monto; ¿un endoso no lleva monto?
- **Estado real:** `garantias.controller.js::registrarEndoso` deja `nuevo_monto` y `nueva_vigencia`
  **opcionales** y no exige nada según el motivo: se puede guardar un endoso **totalmente vacío**, incluso con
  motivo "Ampliación de monto".
- **Ley:** **art. 91 RLOPSRM** (verificado) — *"Las modificaciones en monto o plazo… conllevarán el respectivo
  AJUSTE a la garantía…"* → un endoso de **monto** debe traer el nuevo monto; uno de **vigencia**, la nueva
  vigencia.
- **Sugerencia (fix bajo):** validar por motivo — `ampliacion_monto`/`mixto` exigen `nuevo_monto`;
  `prorroga_vigencia`/`mixto` exigen `nueva_vigencia`; rechazar el endoso vacío. (Art. 91 / 98-II RLOPSRM.)

### 6.2 🚧🟨 El convenio se crea y surte efecto en **un solo paso**, sin acto de AUTORIZACIÓN *(L2)*
- **Observaste:** para aumentar días o cambiar conceptos no se necesita aprobación de nadie; puedo cambiar lo que
  quiera.
- **Estado real:** `crearConvenio` **sí acota la autoridad** (dependencia o residente asignado/creador), **pero**
  registra y **muta el estado vivo** (monto/plazo/programa) en una sola llamada, **sin** un paso separado de
  autorización ni estado borrador→autorizado. El "oficio de aprobación" existe pero es **opcional y posterior**
  (no es un gate). El guardrail del 25% (art. 102) sí avisa.
- **Ley:** **art. 59 párr. 3 LOPSRM** (verificado; **NO** el 99, que es arbitraje) — *"Los convenios… DEBERÁN SER
  AUTORIZADOS por la persona servidora pública…"* facultada. Hoy `autorizado_por` = quien **registra**, que no
  necesariamente es quien **autoriza**.
- **Sugerencia:** acto explícito de autorización (estado/campo `autorizado_por`+`autorizado_en` de la persona
  facultada del art. 59 párr. 3); y cuando la variación > 25% (art. 102), exigir el soporte/oficio antes de surtir
  efecto.

### 6.3 🔀🟩 La **dependencia** de un contrato **no** se puede (ni debe) sustituir — el comportamiento es correcto *(L3)*
- **Observaste:** la dependencia no se puede cambiar, ¿qué dice la ley?
- **Estado real:** correcto. El roster solo cubre **residente / superintendente / supervisión**; la dependencia
  es un puntero que se fija en el alta y **nunca cambia** (0 `UPDATE contratos SET dependencia_id` en todo el
  backend).
- **Ley:** **art. 125 fr. I g RLOPSRM** (verificado) — solo enumera como sustituibles *"el superintendente, el
  anterior residente y la supervisión"*. La **dependencia (entidad contratante) NO figura** como sustituible — es
  coherente: cambiar de contratante sería otro contrato.
- **Sugerencia:** dejarlo **explícito** en la UI ("la dependencia contratante no es sustituible, art. 125"). Si el
  alta capturó mal la dependencia, definir con el profe si se corrige por vía administrativa (no "sustitución").

### 6.4 ⚖️🟨 "Una dependencia por empresa": no tiene base legal directa *(L4)*
- **Observaste:** crear más cuentas por empresa y "una dependencia por empresa".
- **Estado real:** el modelo permite **N cuentas de cualquier rol por empresa** (no hay UNIQUE rol+empresa). El
  padrón (art. 43) registra **CONTRATISTAS**, no dependencias.
- **Ley:** **art. 43 RLOPSRM** (verificado) — el registro único es de **contratistas**; **no** menciona registrar
  dependencias. → "1 dependencia : 1 empresa" no sale de la ley.
- **Mi interpretación:** lo natural es **1 empresa-dependencia : N cuentas** (titular + suplentes), no "1
  dependencia : 1 empresa". El padrón art. 43 solo aplica a contratista/supervisión (ya está bien separado). Ver
  §7.3 para el re-seed.

---

## 7. UX Y DATOS

### 7.1 💅🟩 Sidebar: mostrar el **rango de HU** por flujo (ej. "HU 12–17") *(UX-1)*
- **Observaste:** en el acordeón de Alta dice "HU-01" pero no veo las demás; como el HTML, que diga de qué HU a
  qué HU cubre cada acordeón.
- **Estado real:** el pill del flujo muestra **solo el HU del padre** (no calcula rango).
- **Sugerencia (fix bajo):** en `Sidebar.jsx::Flujo`, recolectar los códigos HU del padre + hijos (ya hay
  `codigosDe`), tomar min/max y formatear `HU 12–17` (o `HU 01` si es uno solo) — como el mockup. Bonito y barato.

### 7.2 🚧🟨 Ver "de qué empresa soy / mi info" *(UX-2)*
- **Observaste:** agregar un punto para ver mi empresa/info (¿en el círculo del nombre?).
- **Estado real:** el chip de empresa muestra solo el nombre y se oculta en pantallas chicas; el **avatar no es
  clickeable**.
- **Sugerencia:** convertir el avatar en un **botón con dropdown** (reusando el patrón de pop-up que ya existe en
  AppShell) que muestre: nombre, rol, **empresa** (nombre + tipo + estado), correo. Bajo riesgo.

### 7.3 🚧🟨 Re-seed de cuentas ligadas a empresas + más cuentas por empresa *(UX-3)*
- **Pediste:** borrar y recrear las cuentas con los mismos datos pero ligadas a empresa (ej. residente
  "chocovan" → empresa "cjn"); y crear más cuentas de todos los roles en distintas empresas (una dependencia por
  empresa, varias de los demás).
- **Estado real:** `schema.sql` siembra las 5+1 cuentas demo + 3 empresas y hace **backfill de `empresa_id` solo si
  está NULL** (no pisa lo ya asignado). `reset_demo` **NO toca cuentas** (solo contratos).
- **Sugerencia:** **NO** meterlo en `schema.sql` (congelado, y su bloque de cuentas es `ON CONFLICT DO NOTHING`).
  Crear un **script dedicado** `backend/scripts/reseed_cuentas.sql` + wrapper `.js` (patrón de `reset_demo.js`):
  recrear las cuentas con sus empresas + sembrar **2-3 empresas más** (una dependencia + contratistas/supervisión
  por empresa) para probar el acotamiento a fondo. Factible, riesgo controlado. *(Te armo el plan de cuentas si me
  confirmas qué empresas quieres: ej. "cjn", "Constructora Norte", etc.)*
- **Legal:** sin base (son datos de prueba); "1 empresa : N cuentas" como en §6.4.

---

## 8. RESUMEN PRIORIZADO (impacto × esfuerzo)

> **Quick wins** (bug/fácil, alto valor) — yo empezaría por aquí:

| Prioridad | Hallazgo | Tipo | Esfuerzo |
|---|---|---|---|
| 1 | **Finiquito bloquea estimaciones** (§3.3) | 🚧 falta | 🟩 |
| 2 | **Minutas: mostrar folio, no id** (§2.1) | 🐛 bug | 🟩 |
| 3 | **Endoso sin monto/vigencia → validar** (§6.1) | 🐛 bug | 🟩 |
| 4 | **Quitar placeholder falso de generadores** (§4.1) | 🔀 copy | 🟩 |
| 5 | **Atraso: no duplicar el asiento** (§3.2) | 🐛 bug | 🟨 |
| 6 | **Sidebar: rango de HU por flujo** (§7.1) | 💅 UX | 🟩 |
| 7 | **HU-19 reporte #4 (observaciones)** (§5.2) | 🚧 falta | 🟨 |
| 8 | **Ciclo de vida con progreso real** (§4.4) | 🔀 | 🟨 |
| 9 | **Campana unificada + avisos de firma/solicitud** (§1) | 💅/🚧 | 🟨 |
| 10 | **Ver mi info / empresa** (§7.2) | 🚧 | 🟨 |
| 11 | **HU-20 techo presupuestal a fondo** (§5.1) | 🔀 | 🟨 |
| 12 | **Convenio: acto de autorización (art. 59)** (§6.2) | 🚧 | 🟨 |
| 13 | **Avance append-only vs editable** (§3.1) | 🔀 decisión profe | 🟨 |
| 14 | **Re-seed cuentas con empresas** (§7.3) | 🚧 datos | 🟨 |
| — | **Wizard de Estimación (reestructura)** (§4.3) | 🔀 rediseño | 🟥 |
| — | **Evidencia fotográfica del avance** (§4.2) | 🚧 / alcance | 🟥 |

### Decisiones que dependen del PROFE (no las decide Code)
- Avance: ¿append-only o editable con nota? (§3.1)
- Evidencia fotográfica: ¿alcance de Etapa 1? (§4.2)
- Alcance del rediseño "wizard por flujo" — **escuchar de nuevo el audio** sobre "quitar buscar/vincular notas
  firmadas porque todo va en una pantalla" (§4.3)
- "1 empresa : N cuentas" como modelo de dependencias (§6.4)

---

*Documento de interpretación — generado verificando el código real (`backend/src`, `frontend/src`, `schema.sql`)
y el texto literal de la ley (`docs/legal/`). Nada implementado aún; es el insumo para priorizar. Las citas
legales están verificadas; lo interpretativo va marcado [validar profe / escuchar audio].*
