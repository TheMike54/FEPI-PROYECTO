# PLAN — Ronda de hallazgos 01-jul (imágenes del profe + audio + 2 bugs de Maiki)

**Fecha:** 2026-07-01 · **Rama:** `main` · **Esta pasada = SOLO diagnóstico + plan + mockups (NO se aplican fixes).**
**Material revisado:** `Imagenes de referencia/` (6 capturas del formato GACM), `docs/audios/Combinado_2026-07-01_1538.md`
(transcripción de 4 audios del profe — ES TEXTO, sí se procesó), y los 2 bugs descritos por Maiki (convenios / roster).

---

## 0. DECISIONES QUE NECESITO DE MAIKI ANTES DE EJECUTAR (resolver de una vez)

> El resto del plan queda diseñado para ejecutarse **de corrido** una vez resueltas estas 4. Recomiendo una
> opción en cada una; si Maiki dice "adelante con la recomendada", ejecuto todo sin más idas y vueltas.

| # | Decisión | Recomendación | Alternativa |
|---|---|---|---|
| **D1** | **¿Quién REGISTRA vs quién AUTORIZA un convenio?** (raíz del bug #13) | **RESIDENTE promueve/registra** (sustenta el dictamen técnico, art. 99 párr. 1 RLOPSRM + art. 53 LOPSRM); **DEPENDENCIA autoriza** (art. 59 párr. 3 LOPSRM). Se conserva la separación de funciones #13 (son personas distintas ⇒ nunca choca). | Que la **dependencia** haga ambos (promover + autorizar) y se **relaje #13** (quitar el bloqueo `autorizado_por===registrado_por` o dejarlo como aviso). Más simple para la demo, pierde separación de funciones. |
| **D2** | **Sustitución con notas pendientes: ¿bloqueo o aviso?** (bug roster) | **AVISO, no bloqueo:** permitir sustituir aunque el saliente tenga notas sin firmar en ESE contrato; se listan como advertencia. (Las notas pendientes se aceptan tácitamente al vencer su plazo, art. 123 fr. III RLOPSRM; y por el fix art.125 el sustituto NO puede firmar notas previas a su alta, así que bloquear no protege nada.) | Mantener el bloqueo pero **acotarlo** a notas que el saliente REALMENTE pueda/deba firmar (excluir las previas a su `vigencia_desde` y las ya resueltas). Sigue bloqueando en casos rutinarios. |
| **D3** | **Convenios: ¿se pueden AGREGAR conceptos NUEVOS (claves nuevas)?** (choca con #11, oleada 3) | **NO agregar claves nuevas** (se mantiene #11). Los tipos del profe se logran **ajustando cantidades y reacomodando** conceptos existentes entre periodos (que #11 ya permite). "Adicional" del profe = MÁS volumen de un concepto existente (ampliar), no una clave nueva. | Revertir #11 y **permitir adicionales** (claves nuevas con `es_adicional=true`) en `monto`/`mixto`, como estaba antes de la oleada 3. (El profe en el audio habla de "adicionales" y "añadir", pero parece referirse a volumen, no a claves nuevas.) |
| **D4** | **Convenio de PLAZO: ¿debe AÑADIR periodos nuevos al programa?** (el profe: "tengo que añadir el periodo") | **SÍ, regenerar/añadir periodos** al ampliar el plazo y permitir reacomodar conceptos no ejecutados a esos periodos nuevos. (Hoy el convenio de plazo NO regenera periodos — está marcado como follow-on.) | Dejarlo como está (plazo cambia la fecha de término pero no añade periodos) y solo permitir reacomodar en los periodos existentes. |

**Nota sobre el audio de estimación (New Recording 78/81):** el profe pidió trabajar la estimación **por
generador** (cada concepto con su propia foto de actividad, reporte fotográfico, soportes y notas) y que el
documento impreso sea el juego GACM (carátula → estimación de servicios ejecutados → resumen por partida →
**hojas generadoras**). Esto NO requiere decisión (es formato del profe); se implementa. Sí marco como
**D5 (menor):** ¿el reporte fotográfico + soportes + notas se **suben por generador dentro del wizard** (antes
de integrar) o **después, en el expediente**? Recomiendo **por generador dentro del wizard** (es lo que pide el
profe: "cada generador tiene su propio espacio… dale acceso a que pueda subir").

---

## 1. HALLAZGOS DADOS POR MAIKI (confirmados en código)

### H1 — Convenios: la dependencia NO puede autorizar su propio convenio promovido

- **Causa raíz:** `backend/src/controllers/convenios.controller.js`.
  - `crearConvenio` (autoridad, ~L165): permite registrar a `req.user.rol === 'dependencia' || residente_id || created_by`. Cuando la **dependencia** promueve, se persiste `registrado_por = req.user.id` (la dependencia).
  - `autorizarConvenio` (#13, oleada 3, ~L400): exige rol `dependencia` para autorizar, pero **rechaza (409) si `conv.registrado_por === req.user.id`**. ⇒ Si la MISMA dependencia registró, no puede autorizar. **Deadlock** cuando la dependencia hace ambos pasos.
- **Diagnóstico:** el fix #13 (separar registrar de autorizar) es correcto en intención, pero choca con que el
  sistema deja a la **dependencia registrar**. Legalmente, quien **sustenta/registra** el convenio es la
  **RESIDENCIA** (dictamen técnico, art. 99 párr. 1 RLOPSRM; responsabilidad de la residencia, art. 53 LOPSRM);
  quien **autoriza** es el **servidor facultado de la DEPENDENCIA** (art. 59 párr. 3 LOPSRM + art. 99 párr. 5).
  Son **roles distintos** ⇒ la separación de funciones se cumple sola.
- **Solución (según D1):**
  - **Recomendada:** en `crearConvenio`, la autoridad para **registrar/promover** pasa a **residente asignado**
    (y `created_by` solo si no es cuenta dependencia); se **quita** `req.user.rol === 'dependencia'` del gate de
    registro. La dependencia queda como **autorizadora**. Se conserva el chequeo #13 (`autorizado_por !==
    registrado_por`) como red de seguridad (ya nunca choca porque son personas distintas). Frontend
    `ConveniosModificatorios.jsx`: el botón "Promover/registrar convenio" se muestra a la residencia; el botón
    "Autorizar" a la dependencia.
  - **Alternativa (D1-alt):** dejar que la dependencia registre y autorice; en `autorizarConvenio` **eliminar**
    el bloqueo `registrado_por === autorizado_por` (o convertirlo en aviso).
- **+ Pop-up de confirmación al autorizar** (pedido de Maiki): antes de `autorizarConvenio`, un modal
  "¿Estás seguro de autorizar este convenio? Este acto es definitivo (art. 59 LOPSRM)". Ver **Mockup M1**.
- **Zona congelada:** `convenios.controller.js` **NO es congelado** (dominio de convenios). `permisos.js` NO se
  toca (los roles ya existen; el gate va en el controller + UI).
- **Riesgo / qué podría romper:**
  - Interacción con **#13 (oleada 3):** si se elige D1-recomendada, #13 queda intacto y solo cambia quién
    registra. Si se elige D1-alt, se **debilita** #13 (hay que documentar que la dependencia puede hacer ambos).
  - Los **smokes de oleada 3** (registrar dep→autorizar dep2) seguirían pasando con la recomendada (dep2 sigue
    autorizando lo que registró la residencia/otro). Con D1-alt, hay que ajustar ese smoke.
  - Bajo riesgo de datos: es un cambio de gate de rol, sin tocar el esquema.

### H2 — Roster/sustitución: bloqueo por "firmas pendientes" que el profe considera inexistentes

- **Causa raíz:** `backend/src/controllers/roster.controller.js::sustituir` (~L171-190).
- **Diagnóstico (importante — corrige la hipótesis "global"):** la consulta **YA está acotada al contrato**
  (`JOIN bitacora_aperturas ba … WHERE ba.contrato_id = $1`). **NO es global.** Lo verifiqué en vivo: para el
  contrato 7021, al intentar sustituir al residente, cuenta **1 nota tipo `avance` (#5, emitida por el
  contratista) que el residente aún no co-firma y sigue dentro de su plazo**. Es un pendiente **real pero
  rutinario**. El problema real es que el bloqueo es **más estricto de lo que el profe espera**:
  1. Cuenta **cualquier** nota sin la firma del saliente dentro de plazo (avances, etc., que otras partes
     emiten). En un contrato vivo casi siempre hay alguna ⇒ **bloquea seguido**, dando la sensación de "global".
  2. **No excluye** notas que el saliente **no puede firmar** (por el fix art.125, un entrante no firma notas
     previas a su alta) ni las que igual se **aceptarán tácitamente** al vencer el plazo ⇒ bloquea por notas que
     el saliente no tiene ni la obligación ni la posibilidad de resolver.
- **Solución (según D2):**
  - **Recomendada (D2 aviso):** convertir el 409 en **aviso NO bloqueante**: `sustituir` procede; en la
    respuesta se devuelve la lista de notas que quedaban pendientes del saliente (para que la UI las muestre
    como advertencia: "quedaron N notas que se tendrán por aceptadas tácitamente al vencer su plazo, art. 123
    fr. III RLOPSRM"). El sustituto asume el rol hacia adelante.
  - **Alternativa (D2-narrow):** mantener el bloqueo pero **acotar** el conteo a notas que (a) sean posteriores
    a la `vigencia_desde` del saliente (las que sí le tocaba firmar) y (b) no estén ya resueltas por otra vía.
- **Zona congelada:** `roster.controller.js` **NO es congelado**. El fix de vigencia art.125 vive en
  `bitacora.controller::firmarNota` (congelado-adyacente) y **NO se toca**.
- **Riesgo:** interacción con el **fix art.125** (commit 1ea4077): NO se altera; solo se deja de bloquear la
  sustitución por notas que ese fix ya impide firmar al entrante. **PRUEBA-TR-FIRMA-VIGENCIA intacto.** Riesgo
  bajo. (Con D2-recomendada, el único "riesgo" conceptual es permitir sustituir con notas colgando — que es lo
  que el profe pide y la ley resuelve con la aceptación tácita.)

---

## 2. HALLAZGOS DE LAS IMÁGENES (formato GACM que exige el profe)

Las 6 capturas son el **juego completo de la estimación GACM** (contrato NAICM / Autodesk, estimación 17):

| Imagen | Documento | Qué exige |
|---|---|---|
| 3.41.17 PM | **Carátula de estimación** | 3 bloques: (1) Importes SIN IVA (contrato, acumulado anterior, actual, saldo por estimar), (2) Del anticipo (importe, amortizado ant./actual, saldo por amortizar), (3) **Del neto a recibir CON IVA** (importe estimación, **IVA estimación**, total, amortización, **IVA amortización**, retenciones, trabajos no ejecutados, **5 al millar SFP**, total neto a pagar). 4 firmas: **FORMULÓ** (contratista/superintendente), **REVISÓ** (supervisión), **AUTORIZÓ** (residente), **Vo.Bo.** (dependencia). |
| 3.41.17 PM (1), 3.41.18 PM, (1) | **Estimación de servicios ejecutados** (hojas 1-3) | Tabla por concepto: Concepto Núm, Especificación, Concepto de obra, Unidad, **Según proyecto**, **Hasta estimación anterior**, **De esta estimación**, **Total estimado**, **Por ejecutar**, PU, Importe. TOTAL HOJA + ACUMULADO. |
| 3.41.18 PM (2) | **Resumen por partida** | Agrupa por partida (AD.01/05/09…) con importe; + neto (importe estimación, IVA, total, amortización, IVA amort., retenciones, trabajos no ejec., 5 al millar) + **importe con letra** (dos textos: "sin IVA y sin amortización" y "con IVA, amortización y 0.5% SFP") + 4 firmas. |
| 3.41.19 PM | **HOJA GENERADORA** (1 de 9 → **una por concepto**) | Encabezado (hoja generadora N de M, estimación, periodo, contrato, partida, croquis, clave). 3 columnas: **CATÁLOGO** (documento, unidad, cantidad), **EJECUTADO EN EL PERIODO** (unidad, cantidad, total), **FOTOGRAFÍA DE LA ACTIVIDAD** (foto + pie: concepto, clave, fecha/lugar). TOTAL / TOTAL ESTA HOJA / ACUMULADO HOJA ANTERIOR. 3 firmas: RESIDENTE, SUPERVISOR EXTERNO, SUPERINTENDENTE. |

### H3 — Estimación POR GENERADOR (foto + reporte + soportes + notas por concepto)
- **Base:** audio New Recording 78/81 ("cada generador trae una fotografía de la actividad por generador… cada
  generador debe tener su propio soporte… reporte fotográfico por generador… notas que soportan la entrega de
  ese concepto… cada uno tiene su propio espacio… dale acceso a que pueda subir") + imagen **Hoja generadora**.
- **Estado actual:** el backend **ya soporta lo por-concepto**: `estimacion_fotos.contrato_concepto_id`
  (fotos por generador, oleada previa), `estimacion_soportes_concepto.contrato_concepto_id` (soportes por
  concepto, **oleada 1**), `avance_fotos` por concepto/periodo, `estimacion_notas` (notas↔estimación). **La
  brecha es de UI/flujo:** hoy el wizard (`IntegracionEstimacion.jsx`) sube los soportes **en bloque** (paso 4,
  `soportesStaged` global) y las fotos por generador viven aparte en el expediente. Falta un **espacio POR
  generador** que junte, para cada concepto: foto de actividad + reporte fotográfico + soportes documentales +
  notas de entrega.
- **Solución:** en el paso "Generadores" del wizard (y en la Revisión HU-15 / Expediente HU-14), cada renglón
  de concepto se **expande** a su propio panel con 4 sub-secciones (foto de actividad, reporte fotográfico,
  soportes, notas), reusando los endpoints existentes (`estimacion-fotos` con `contrato_concepto_id`,
  `estimacion-soportes` con `contrato_concepto_id`, `avance-fotos`, `estimacion-notas`). Ver **Mockup M2**.
- **Zona congelada:** NO. Es UI + reuso de endpoints ya montados (oleada 1). Sin esquema nuevo.
- **Riesgo:** interacción con **oleada 1** (#4 soportes, #7 revisión completa, #24 cantidad=avance): se conserva;
  solo se re-organiza la UI de captura de global → por generador. La cantidad estimada sigue de solo-lectura
  (viene del avance, #24). Riesgo bajo-medio (toca `IntegracionEstimacion.jsx`, archivo grande).

### H4 — Documento "HOJA GENERADORA" imprimible (una por concepto, con foto y 3 firmas)
- **Base:** imagen 3.41.19 PM.
- **Estado actual:** existe `DocumentoCaratula.jsx` (carátula imprimible) pero **NO** hay componente de hoja
  generadora ni de resumen por partida.
- **Solución:** nuevo componente `components/estimacion/DocumentoHojaGeneradora.jsx` que, por cada concepto con
  cantidad en el periodo, renderiza el layout GACM (catálogo | ejecutado en el periodo | fotografía de la
  actividad) con numeración "Hoja N de M", acumulados y 3 firmas. Se imprime junto con la carátula
  (`window.print`, patrón existente). Ver **Mockup M3**.
- **Zona congelada:** NO. Riesgo bajo (presentación).

### H5 — Documento "RESUMEN POR PARTIDA" imprimible
- **Base:** imagen 3.41.18 PM (2).
- **Solución:** nuevo `DocumentoResumenPartida.jsx`: agrupa conceptos por **partida** (prefijo de la clave, p.ej.
  `AD.01`), suma importes, muestra el bloque de neto (IVA, amortización, 5 al millar) y el **importe con letra**
  (dos variantes). 4 firmas. **Requiere** que el catálogo tenga "partida" — hoy se puede **derivar del prefijo
  de la clave** (AD.01.B → partida AD.01) sin esquema nuevo.
- **Zona congelada:** NO. Riesgo bajo (presentación).

### H6 — Carátula con IVA + 4 firmas (verificar/completar)
- **Estado actual:** `DocumentoCaratula.jsx` existe; memorias previas indican "Sección 3 CON IVA (derivado
  client-side, cuadra al centavo)". La imagen confirma que el neto lleva **IVA estimación** e **IVA
  amortización anticipo**.
- **Solución:** **verificar** que la carátula actual empate 1:1 con la imagen (los 3 bloques, IVA en amortización
  y en estimación, 5 al millar, trabajos no ejecutados, 4 firmas con los cargos correctos). Ajustar textos/orden
  si difieren. **[validar profe]:** SIGECOP calcula la estimación "sin IVA" (art. 2 fr. XIX RLOPSRM) y el IVA se
  **deriva** solo para el documento; esta tensión ya estaba resuelta como "IVA derivado en el documento, no en
  la carátula financiera". Mantener así.
- **Zona congelada:** NO. Riesgo bajo.

### H7 — La estimación debe MOSTRAR las firmas del ciclo (contratista → supervisión → residencia)
- **Base:** audio New Recording 78 ("en tus estimaciones no había dónde firmarla… la presento aparece mi firma,
  la supervisión la revisa aparece su firma, el residente autoriza, ya son tres firmas… o desde el principio
  aparecen las tres firmas").
- **Diagnóstico:** el ciclo de estimación **ya sella** las firmas implícitamente (presentar = superintendente,
  turnar/autorizar = supervisión/residencia; oleada B asienta notas `sup_estimaciones`/`res_estimaciones`). Lo
  que falta es **mostrarlas** en la estimación/carátula: 3 (o 4) casilleros de firma que se **van llenando**
  conforme avanza el ciclo (FORMULÓ al presentar, REVISÓ al turnar, AUTORIZÓ al autorizar, Vo.Bo. dependencia).
- **Solución:** en `DocumentoCaratula.jsx` + Revisión/Expediente, un bloque de firmas que lee el estado del
  ciclo (quién presentó/turnó/autorizó y cuándo, derivado de `enviada_por`, las notas del ciclo y el `estado`)
  y marca cada firma como pendiente/firmada con nombre y fecha. Ver **Mockup M4**. **Regla de seguridad:** las
  fechas mostradas son las **reales** de cada acto (sellos ya existentes); no se inventan.
- **Zona congelada:** NO. Riesgo bajo.

---

## 3. HALLAZGOS DEL AUDIO (además de los ya cruzados con imágenes)

### H8 — Las OBSERVACIONES de la estimación también las hace el RESIDENTE (no solo supervisión)
- **Base:** audio New Recording 78 ("las observaciones… lo puede hacer supervisión y residente"; "el residente
  lo tiene que hacer").
- **Causa raíz:** `estimaciones-ciclo.controller.js::crearObservacion` (~L395) y `eliminarObservacion` (~L430):
  exigen `est.supervision_id === req.user.id` ⇒ **solo supervisión** puede registrar/eliminar observaciones. El
  `rechazar` (L614) ya permite supervisión **o** residencia; falta alinear las observaciones.
- **Solución:** permitir que **supervisión O residencia** registren/eliminen observaciones (`est.supervision_id
  === req.user.id || est.residente_id === req.user.id`). Mantener el turnado y la máquina de estados. Frontend
  `RevisionEstimacion.jsx`: habilitar el alta de observaciones también para el residente.
- **Zona congelada:** `estimaciones-ciclo.controller.js` — Maiki ya autorizó tocarlo para fixes puntuales del
  ciclo. Cambio pequeño.
- **Riesgo:** interacción con **oleada 1 #7** (secciones de observación) y con el flujo turnar/autorizar: bajo;
  solo amplía quién puede observar. Verificar que no rompa el gate "solo antes de turnar".

### H9 — "Por ejecutar / disponible = 0" que se ve mal
- **Base:** audio New Recording 78 ("cuántos por ejecutar disponible cero ahorita… dice ahí cero está mal").
- **Diagnóstico (a confirmar en implementación):** en `IntegracionEstimacion.jsx` conviven dos columnas:
  **"Por ejecutar"** (`Math.max(0, contratado − acumulado)`, ~L335) y **"Disponible"** del periodo
  (`disponible_periodo`, ~L672, = `max(0, min(planeado,contratado) − ya_estimado)`). El profe vio un **0**
  donde esperaba un remanente. Probable causa: se estaba mirando **otra estimación ya integrada** (el propio
  profe lo nota: "es que me metí a la estimación que él ya hizo"), o el "disponible" se confunde con "por
  ejecutar". **Acción:** revisar que ambas columnas se etiqueten y calculen sin ambigüedad y que "por ejecutar"
  refleje **contratado − total estimado acumulado** (como la imagen "Estimación de servicios ejecutados"),
  distinto de "disponible del periodo". Ajustar etiquetas/tooltips y, si hay un cálculo cruzado, corregirlo.
- **Zona congelada:** NO (frontend + lectura de `estimacion-prep`, no congelado). Riesgo bajo.

### H10 — Los CONVENIOS deben cumplir su tipo (programa / monto / plazo / mixto)
- **Base:** audio New Recording 79/80 ("los modificatorios todos tienen que servir y poder modificar lo que
  dicen"; programa = solo reacomodar en el futuro, no cambia totales; monto = cambia cantidades
  (aumenta/reduce); plazo = añade días/periodos y reacomoda; mixto = todo combinado) + "que reaparezca el botón".
- **Diagnóstico:**
  - `convenios.controller.js` ya tiene `tipo ∈ {monto, plazo, programa, mixto}` y, tras **#11 (oleada 3)**,
    permite **ajustar la cantidad** de conceptos existentes y **reacomodar celdas** (lo cual cubre *monto* y
    *programa*). ⇒ Buena parte YA está.
  - **Brecha 1 (D3):** ¿se permiten claves nuevas (adicionales)? #11 lo prohíbe. Ver D3.
  - **Brecha 2 (D4):** convenio de **plazo** NO regenera/añade periodos (marcado como follow-on en el código:
    "la regeneración de periodos por cambio de plazo queda como follow-on"). El profe pide **añadir el periodo**.
    Ver D4.
  - **Brecha 3 (semántica por tipo):** hoy la validación no distingue del todo *programa* (no debe cambiar
    totales, solo reacomodar) de *monto* (sí cambia totales). Hay que **enforcar por tipo**: en `programa`,
    rechazar si el Σ por concepto cambia (solo se permite mover volumen entre periodos futuros); en `monto`,
    permitir cambio de cantidades; en `plazo`, exigir `plazo_nuevo_dias` y (D4) regenerar periodos; en `mixto`,
    combinar. Y **conservar** lo ya ejecutado/estimado (no tocar periodos pasados) — el profe: "no puedes el
    pasado, solo el futuro" y "lo que ya estimé se congela".
  - **Brecha 4 ("botón que reaparezca"):** el profe menciona que falta reaparecer un botón (probablemente el de
    **reacomodar/añadir periodo** o el de **guardar el convenio** tras editar el programa). **Acción:** revisar
    `ConveniosModificatorios.jsx`/`EditorProgramaConvenio.jsx` y restituir el botón faltante según el tipo.
- **Solución (según D3/D4):** implementar la **semántica por tipo** en `convenios.controller.js::crearConvenio`
  (validaciones distintas por `tipo`) + `EditorProgramaConvenio.jsx` (habilitar edición de cantidad solo en
  `monto`/`mixto`; solo reacomodar celdas en `programa`/`plazo`; añadir UI de periodo nuevo si D4=sí). "Lo ya
  estimado/ejecutado se congela" ya está parcialmente (la pre-validación A rechaza reducir por debajo de lo
  estimado); reforzar que solo se toquen periodos **no cerrados/futuros**.
- **Zona congelada:** `convenios.controller.js` NO congelado. Si D4=sí, la **regeneración de periodos** toca
  `contrato_periodos` (aditivo) — sin esquema nuevo, pero con cuidado (los avances/estimaciones referencian
  periodos por FK; añadir periodos al final es seguro, mover/borrar NO).
- **Riesgo:** **ALTO** si D4=sí (regenerar periodos interactúa con avance/estimación/curva). Interacción con
  **#11** (D3) y con **#14/#24** (cantidad vs avance): un convenio que cambia cantidades no debe romper el
  amarre cantidad=avance de estimaciones ya hechas (las estimaciones congelan su snapshot, así que están
  protegidas). Se implementa con la máxima cautela y pruebas.

---

## 4. MOCKUPS

### M1 — Pop-up de confirmación al autorizar convenio (H1)
```
┌──────────────────────────────────────────────┐
│  ⚠  Autorizar convenio modificatorio          │
├──────────────────────────────────────────────┤
│  Vas a AUTORIZAR el convenio CM-002            │
│  (tipo: monto · Δ −8.3%).                      │
│                                                │
│  Este acto es DEFINITIVO y queda asentado en   │
│  bitácora (art. 59 párr. 3 LOPSRM). No se      │
│  puede deshacer.                               │
│                                                │
│  Oficio de aprobación:  ✓ cargado              │
│                                                │
│         [ Cancelar ]   [ Sí, autorizar ]       │
└──────────────────────────────────────────────┘
```

### M2 — Espacio POR GENERADOR en el wizard de estimación (H3)
```
Paso 2 · Generadores (uno por concepto)
┌───────────────────────────────────────────────────────────────┐
│ ▸ CONC-01 · Limpieza y trazo de terreno   [este periodo: 800 m²]│  ← clic expande
├───────────────────────────────────────────────────────────────┤
│  ▾ CONC-02 · Base hidráulica compactada   [este periodo: 1 200 m³]
│  ┌─────────────┬──────────────┬───────────┬──────────────────┐  │
│  │ 📷 Foto de  │ 🖼 Reporte    │ 📎 Soportes│ 📝 Notas de       │  │
│  │  actividad  │  fotográfico │ documental│  entrega          │  │
│  │ [subir/ver] │ [subir/ver…] │[PDF/XLS…] │ [ligar nota #… ]  │  │
│  │  (1 foto)   │  (5 fotos)   │ (2 docs)  │  (nota #14, #15)  │  │
│  └─────────────┴──────────────┴───────────┴──────────────────┘  │
│   Cantidad de esta estimación: 1 200 (solo lectura, del avance) │
└───────────────────────────────────────────────────────────────┘
▸ CONC-03 · Carpeta asfáltica …
```

### M3 — Documento HOJA GENERADORA imprimible (H4, matchea imagen 3.41.19 PM)
```
GACM · Dirección … · Subdirección de Control de Obras     Hoja generadora 2 de 9
Estimación 3   Periodo: 01–31 jul 2026   Contrato: SOP-2026-002
Partida: AD.01 …                         Clave: CONC-02   Croquis de ref.: —
┌──────────────────────────┬──────────────────────────┬────────────────────────┐
│ CATÁLOGO                  │ EJECUTADO EN EL PERIODO   │ FOTOGRAFÍA DE LA        │
│ Documento | Unid | Cant   │ Unid | Cantidad | Total   │ ACTIVIDAD               │
│ Base hidr.| m³   | 3 000  │ m³   | 1 200    | 1 200    │  [   foto   ]           │
│                           │                           │  CONC-02 · 15 jul 2026  │
├──────────────────────────┴──────────────────────────┴────────────────────────┤
│ TOTAL 1 200        TOTAL ESTA HOJA 1 200      ACUMULADO HOJA ANTERIOR 0        │
├───────────────────────────────────────────────────────────────────────────────┤
│  RESIDENTE            SUPERVISOR EXTERNO          SUPERINTENDENTE               │
│  Ing. … (firma)       Mtro. … (firma)             Arq. … (firma)               │
└───────────────────────────────────────────────────────────────────────────────┘
```

### M4 — Firmas del ciclo en la carátula/estimación (H7)
```
┌──────────────┬──────────────┬──────────────┬──────────────┐
│  FORMULÓ      │  REVISÓ      │  AUTORIZÓ    │  Vo. Bo.     │
│  Contratista  │  Supervisión │  Residencia  │  Dependencia │
│  ✓ Arq. …     │  ✓ Mtro. …   │  ⏳ pendiente │  ⏳ pendiente │
│  01/jul 14:20 │  02/jul 09:10│              │              │
└──────────────┴──────────────┴──────────────┴──────────────┘
  (se llenan conforme avanza el ciclo: presentar → turnar → autorizar → Vo.Bo.)
```

---

## 5. ORDEN DE IMPLEMENTACIÓN SUGERIDO (por dependencia/riesgo)

Una vez resueltas D1–D5, ejecutar en este orden (de menor a mayor riesgo; los primeros no dependen de los
demás):

1. **H1 convenios (D1)** + **M1 pop-up** — bug bloqueante, cambio de gate acotado. (backend + UI convenios)
2. **H2 roster (D2)** — bug bloqueante, cambio acotado. (backend roster + UI aviso)
3. **H8 observaciones por residente** — cambio pequeño, aislado.
4. **H9 "por ejecutar/disponible"** — etiquetas/cálculo de lectura, aislado.
5. **H6 carátula (verificar IVA/firmas)** + **H7 firmas del ciclo (M4)** — presentación, sobre `DocumentoCaratula`.
6. **H4 hoja generadora (M3)** + **H5 resumen por partida** — documentos nuevos (presentación).
7. **H3 estimación por generador (M2)** — reorganización de UI del wizard (más superficie; se apoya en H4).
8. **H10 convenios por tipo (D3/D4)** — el más delicado (regeneración de periodos si D4=sí); **al final**, con
   pruebas dedicadas, para no arriesgar el resto.

**Todo en LOCAL, sin push.** Cada bloque: `node -c` + `vite build` verdes + smoke en vivo; un commit por bloque
(o por hallazgo), sin mezclar. Se conservan intactos: fix art.125 / PRUEBA-TR-FIRMA-VIGENCIA, las 5 oleadas
(#2, #14, #24, #11, etc.) y el selector de fecha (elegibilidad-vs-sello).
