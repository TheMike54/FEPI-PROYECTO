# Historias de Usuario — SIGECOP

> **Versión:** 26-jun-2026 (auditada contra el código real —backend y frontend— y **reordenada por flujo del sistema**) · **Formato:** acción + criterio de éxito verificable (sin detalle de implementación).
>
> **Cómo leer cada historia.** Cada una responde tres preguntas: **quién** la usa y qué **hace** el sistema (la acción real, no la pantalla), **cómo se sabe que quedó bien** (el criterio observable: qué registro se generó, qué notificación se mandó, qué cambió de estado, qué no quedó vacío) y **qué impide el sistema** (las reglas que rechazan lo que no procede). El "cómo" técnico (pantallas, pasos, componentes) es decisión de implementación y no se describe aquí.
>
> Cada historia cita el o los artículos de LOPSRM / RLOPSRM / LFD en que se funda la regla, para que toda validación sea trazable.
>
> **Orden:** las historias aparecen en el **orden en que se usa el sistema de inicio a fin** (acceso → padrón de empresas → alta → fianzas → equipo → bitácora → avance → estimación → pago → convenios → expediente → portafolio → reportes → finiquito). Cada historia **conserva su número HU original**; solo cambia el orden de aparición.

---

## Índice (orden de flujo)

| # | Historia | Rol que la ejecuta |
|---|---|---|
| — | Acceso: inicio de sesión, sesión única y registro de personas | Transversal |
| HU-23 | Padrón de empresas | Dependencia |
| HU-01 | Alta de contrato de obra pública | Residente |
| HU-02 | Registro de fianzas y garantías | Dependencia (y residente que creó el contrato) |
| HU-22 | Sustitución de personas del equipo | Dependencia / Residente |
| HU-08 | Apertura de la bitácora (y firma "Por firmar") | Residente asignado |
| HU-09 | Emisión y firma de notas de bitácora | Residente, contratista, supervisión |
| HU-10 | Consulta y búsqueda de notas | Residente (consultan contratista y supervisión) |
| HU-11 | Minutas, visitas y acuerdos | Residente |
| HU-06 | Registro de trabajos terminados (avance) | Contratista (superintendente) |
| HU-07 | Alertas de atraso por concepto | Residente |
| HU-05 | Programa y curva de avance | Residente (consultan las demás partes) |
| HU-12 | Integración de la estimación | Contratista (superintendente) |
| HU-13 | Presentación de la estimación | Contratista (superintendente) |
| HU-15 | Revisión y autorización/rechazo de la estimación | Supervisión → Residencia |
| HU-14 | Historial de estimaciones | Residente (consultan las demás partes) |
| HU-17 | Tablero de estimaciones | Residente (consultan las demás partes) |
| HU-20 | Tránsito a pago: promoción de cobro del contratista | Contratista (revisa Finanzas) |
| HU-21 | Registro del pago | Finanzas |
| HU-03 | Trámite de convenios modificatorios | Dependencia |
| HU-04 | Consulta integrada del expediente | Residente (consultan las demás partes) |
| HU-18 | Portafolio ejecutivo con semáforos | Dependencia |
| HU-19 | Exportación de reportes del contrato | Residente |
| HU-24 | Finiquito y cierre del contrato | Dependencia / Residente |

> **Transversales** (no son HU numeradas pero el sistema las exige): registro de personas con aprobación de la dependencia; inicio de sesión con rol deducido y sesión única; firma de la apertura de bitácora ("Por firmar").
>
> **Nota sobre HU-16 (reingreso de estimación):** se retira como historia independiente. Un rechazo se resuelve volviendo a integrar (HU-12) y volviendo a presentar (HU-13); la estimación rechazada permanece en el historial con su motivo. No existe un "reingreso" como flujo aparte.

---

## Acceso al sistema (transversales)

### Inicio de sesión

**Quién y qué hace.** Cualquier persona con cuenta activa entra al sistema con su correo y contraseña. El sistema **deduce su rol** (residente, contratista, supervisión, dependencia o finanzas) de la cuenta; el rol no se elige.

**Criterio de éxito.** Con credenciales correctas de una cuenta activa, el sistema deja entrar y la persona ve el sistema con las funciones de su rol. Una cuenta pendiente de aprobación o rechazada no entra y recibe el aviso correspondiente.

**Qué impide el sistema.** Correo o contraseña incorrectos no entran (sin revelar cuál de los dos falló). Una cuenta que aún no aprueba la dependencia, o que fue rechazada, no puede iniciar sesión.

*Fundamento: control de acceso institucional.*

### Sesión única

**Quién y qué hace.** Cuando una persona inicia sesión, el sistema cierra cualquier sesión anterior de esa misma cuenta. Solo una sesión puede estar activa a la vez por persona.

**Criterio de éxito.** Si una cuenta inicia sesión por segunda vez (en otro dispositivo o navegador), la primera sesión queda cerrada: al intentar seguir trabajando, esa primera sesión es expulsada con el aviso "tu sesión se cerró porque iniciaste sesión en otro dispositivo". Solo la sesión más reciente sigue viva.

**Qué impide el sistema.** Que una misma cuenta opere desde varias sesiones simultáneas.

*Regla de seguridad de sesión.*

### Registro de una persona dentro de una empresa

**Quién y qué hace.** Una persona nueva solicita su acceso eligiendo primero **la empresa a la que pertenece** (de las que ya existen en el padrón, o registrando una nueva si no está) y luego capturando sus datos. La solicitud queda pendiente hasta que **la dependencia la aprueba** y le asigna el rol.

**Criterio de éxito.** Al solicitar el acceso, se genera una cuenta en estado "pendiente", ligada a su empresa, sin poder entrar todavía. Cuando la dependencia la aprueba, la cuenta pasa a "activa" con el rol que la dependencia le otorgó (queda registrado quién la aprobó y cuándo) y a partir de ese momento la persona puede iniciar sesión. El correo es único: no existen dos cuentas con el mismo.

**Qué impide el sistema.** Un nombre incompleto (debe capturarse nombre y apellido, porque ese nombre aparece en la bitácora), una contraseña de menos de 8 caracteres, una persona de tipo contratista o supervisión sin empresa, o un correo ya registrado. Una persona aprobada recibe el rol que **decide la dependencia**, no necesariamente el que solicitó.

*Fundamento: art. 123 RLOPSRM (nombre completo de quienes constan en la bitácora).*

---

## HU-23 — Padrón de empresas

**Quién y qué hace.** La **dependencia** administra el padrón de empresas. Las empresas son lo primero: una persona se registra **dentro de** una empresa, y un contrato se hace **con** una empresa del padrón. Cuando alguien registra una empresa nueva al darse de alta, queda "por validar"; la dependencia la **valida** (la inscribe al padrón) o, si detecta que está duplicada, la **fusiona** con la empresa correcta.

**Criterio de éxito.** Al registrarse una persona con una empresa nueva, aparece una empresa "por validar" en el padrón, y la persona queda ligada a ella; si la empresa ya existía (aunque se escriba con otra puntuación o acentos), el sistema la **reutiliza** en vez de duplicarla. Al validar, la empresa pasa de "por validar" a "validada". Al fusionar, la empresa duplicada desaparece y sus personas quedan ligadas a la empresa correcta. No hay dos empresas con el mismo nombre normalizado.

**Qué impide el sistema.** Registrar una persona contratista o de supervisión sin empresa; fusionar una empresa consigo misma; y administrar el padrón sin ser dependencia.

*Fundamento: art. 43 RLOPSRM (validación e inscripción del padrón), art. 74 Bis LOPSRM (padrón de contratistas).*

---

## HU-01 — Alta de contrato de obra pública

**Quién y qué hace.** El **residente** da de alta un contrato de obra pública: captura sus datos generales, el catálogo de conceptos, el programa de obra por periodos, los datos jurídicos, las garantías y el plan de amortización del anticipo, y adjunta el PDF del contrato firmado. Todo el contrato se registra como una sola pieza.

**Criterio de éxito.** Se genera un registro de contrato con su folio único, completo (o se guarda todo o no se guarda nada). El **monto no se teclea**: el sistema lo calcula sumando cantidad × precio unitario de cada concepto, y el total coincide al centavo. La **fecha de término no se teclea**: se deriva de la fecha de inicio más el plazo. Quedan registrados el equipo inicial (residente, superintendente y, si aplica, supervisión) y, tras guardar, el sistema lleva al residente a **abrir la bitácora del contrato**: hasta que la bitácora no esté abierta, el contrato no permite registrar avance, estimaciones ni convenios.

**Qué impide el sistema.** Un folio repetido, una clave de concepto repetida, un programa de obra que no reparte el 100% de cada concepto, un plan de amortización que no suma exactamente el anticipo, una garantía vencida o que excede el monto del contrato, o un alta sin contratista y dependencia válidos. Si el anticipo supera el límite, exige adjuntar la autorización del titular.

*Fundamento: art. 45 fr. IX RLOPSRM (monto = catálogo), art. 45 ap. A fr. X RLOPSRM + art. 52 LOPSRM (programa por periodos), art. 118 RLOPSRM (no exceder lo contratado), art. 50 LOPSRM (anticipo), art. 138 párr. 3 + art. 143 fr. I RLOPSRM (amortización), art. 122 RLOPSRM (operar dentro de bitácora abierta).*

---

## HU-02 — Registro de fianzas y garantías

**Quién y qué hace.** La **dependencia** (o el residente que creó el contrato) gestiona las pólizas de garantía del contrato: las registra, les liga el PDF de la póliza, y registra **endosos** (ampliaciones de monto o prórrogas de vigencia) sobre una póliza existente.

**Criterio de éxito.** Cada póliza queda registrada con su afianzadora, monto y vigencia llenos (el número de póliza es opcional), y muestra su estado de vigencia (vigente / por vencer / vencida). Un **endoso genera un registro nuevo ligado a la misma póliza** (no una segunda póliza): al ampliar la vigencia, sube el conteo de endosos de esa garantía, no aparece una póliza duplicada. La póliza con PDF cargado se puede abrir y ver.

**Qué impide el sistema.** Dos garantías del mismo tipo en un mismo contrato (debe editarse la existente), una garantía de un tipo fuera del catálogo (debe ser anticipo, cumplimiento o vicios ocultos), una garantía con monto cero o que excede el contrato, una vigencia ya vencida al registrar, un endoso que no trae el dato que su motivo exige (un endoso de prórroga sin la nueva vigencia, por ejemplo), o un archivo que no es PDF. Un contrato cerrado por finiquito queda en solo lectura para sus garantías: no admite registrar ni editar pólizas, subir el PDF de una póliza, ni registrar endosos.

*Fundamento: art. 48 LOPSRM (garantías de anticipo y cumplimiento), art. 66 LOPSRM (vicios ocultos), art. 91 RLOPSRM (endosos por modificación de monto/plazo), art. 64 LOPSRM (contrato cerrado = solo lectura).*

---

## HU-22 — Sustitución de personas del equipo

**Quién y qué hace.** La **dependencia** o el **residente asignado** consulta el equipo vigente del contrato (residente, superintendente, supervisión) con su histórico de quién ocupó cada rol y desde cuándo, y **reemplaza** a una persona por otra, indicando el motivo. Son dos cosas distintas: ver el equipo (consulta) y reemplazar (acción).

**Criterio de éxito.** Al reemplazar, se genera un registro nuevo: la persona anterior queda en el histórico con su fecha de salida (no se borra) y la nueva queda vigente, ligada por el motivo del cambio. El sistema **asienta una nota de bitácora** documentando la sustitución (persona anterior, nueva, motivo, fecha). La persona sustituida deja de ser **parte vigente** del contrato y la nueva ocupa su lugar; quien originalmente dio de alta el contrato conserva acceso de consulta por figurar como su creador. Solo una persona puede estar vigente por rol.

**Qué impide el sistema.** Sustituir a una persona que **tiene firmas pendientes** dentro de su plazo (primero debe firmarlas o vencer el plazo); reemplazar sin motivo; reemplazar por una persona inexistente, inactiva o del rol equivocado; o sustituir en un contrato sin bitácora abierta o ya cerrado. La dependencia del contrato no se sustituye. El sustituto del **residente o del superintendente** pertenece a la misma empresa que la persona saliente; la **supervisión**, por ser un tercero independiente, puede pertenecer a otra empresa (la sustitución cambia la persona, no la empresa del contrato).

*Fundamento: art. 125 fr. I inciso g) RLOPSRM (registro de sustituciones), art. 122 RLOPSRM (bitácora obligatoria), art. 64 LOPSRM (contrato cerrado).*

---

## HU-08 — Apertura de la bitácora del contrato

**Quién y qué hace.** El **residente asignado** abre la bitácora del contrato. La apertura redacta el acta de inicio con los datos del contrato (partes y sus domicilios, objeto, ubicación, monto, anticipo, plazo, fechas de inicio y término) y define a los firmantes (residente, superintendente y, si hay, supervisión). La bitácora se abre al inicio del contrato y es obligatoria: sin ella el contrato no puede operar. La **fecha de apertura no se captura**: el sistema la fija a la fecha de inicio del contrato (la bitácora se abre el mismo día en que arranca el contrato), de modo que no puede registrarse una fecha anterior.

**Criterio de éxito.** Se genera una bitácora única para el contrato (un segundo intento de abrirla es rechazado) y la **nota número 1 de tipo apertura**, con el acta redactada y sin campos vacíos (domicilios, teléfonos, descripción de los trabajos y características del sitio constan). Quedan registrados los firmantes pendientes, uno por cada parte del equipo. A partir de aquí, intentar registrar avance, estimación, convenio o sustitución sin bitácora abierta es rechazado.

**Qué impide el sistema.** Abrir una segunda bitácora del mismo contrato; abrir la bitácora sin ser el residente asignado; o abrirla sin superintendente asignado al contrato.

*Fundamento: arts. 122-123 RLOPSRM (uso obligatorio de la bitácora y nota de inicio), art. 46 LOPSRM (la bitácora vincula a las partes).*

### Firma de la apertura ("Por firmar")

**Quién y qué hace.** Cada parte del equipo (residente, superintendente, supervisión) firma la apertura de la bitácora desde su propia cuenta. Mientras haya firmas pendientes, la apertura no está completa. La bandeja "Por firmar" (y la campana de notificaciones) reúne todo lo que la persona tiene pendiente de firmar: las **aperturas** de bitácora donde es firmante y aún no firma, y las **notas de bitácora** que le toca firmar como contraparte (notas en las que no es el emisor, que aún no ha firmado y cuyo plazo de firma sigue vigente). Desde la misma bandeja firma cualquiera de las dos, y la campana enlaza a esta pantalla.

**Criterio de éxito.** Al firmar, la firma de esa persona queda sellada con su fecha y hora. Cuando todas las partes firman, la apertura queda completa, y eso es lo que **habilita la emisión de notas** (HU-09). Una firma no se puede repetir ni hacer por otra persona. Las notas se listan en una sección aparte de las aperturas; una nota cuyo plazo de firma ya venció (aceptada tácitamente) deja de aparecer en la bandeja, porque ya no hay nada que firmar.

**Qué impide el sistema.** Que alguien firme una apertura de la que no es firmante, o que vuelva a firmar lo que ya firmó.

*Fundamento: art. 123 fr. III RLOPSRM (firma de la nota de inicio por el personal autorizado y plazo de firma / aceptación tácita de las notas).*

---

## HU-09 — Emisión y firma de notas de bitácora

**Quién y qué hace.** El **residente, el contratista y la supervisión** emiten notas tipificadas en la bitácora (cada rol emite los tipos que le corresponden). El emisor firma su nota al emitirla; las demás partes la firman (la aceptan) o, si pasa el plazo sin firmar, queda aceptada tácitamente. A partir de ese momento, el sistema ya no ofrece firmarla (el botón de firma desaparece) y rechaza cualquier intento de firmarla fuera de plazo; su estado "Aceptada (tácita)" sigue a la vista. Una nota no se edita: para corregirla se anula y se emite una nota nueva vinculada que dice "dice / debe decir".

**Criterio de éxito.** Cada nota se genera con un folio correlativo sin saltos, el emisor identificado por rol y nombre, su firma sellada y contenido no vacío. Al firmar una contraparte, queda registrada su firma; cuando todo el equipo firma, la nota queda firmada. Una corrección deja la nota original como anulada y genera una nota correctiva vinculada al folio anterior. Las notas son inmutables.

**Qué impide el sistema.** Emitir notas antes de que la apertura esté firmada por todas las partes; emitir un tipo de nota que no corresponde al rol; emitir a mano las notas de apertura, cierre o finiquito (las genera el sistema); que el emisor "acepte" su propia nota; firmar una nota cuyo plazo de firma ya venció (ya quedó aceptada tácitamente); firmar una nota cuya fecha quede **fuera del periodo de vigencia** de la persona en el contrato (tras una sustitución, la persona saliente no firma notas posteriores a su baja ni la entrante notas anteriores a su alta; el titular original conserva la firma desde el inicio del contrato); anular una nota ya respondida o ya firmada por la contraparte (no se modifica una nota firmada), o anular la nota de finiquito (acta de cierre); y emitir, responder, firmar o anular notas en un contrato cerrado (queda en solo lectura).

*Fundamento: art. 125 RLOPSRM (tipos de nota por rol y vigencia de quien firma según el roster), art. 123 fr. III (plazo de firma y aceptación tácita), fr. V (folio correlativo), fr. VI (inmutabilidad), fr. VII (corrección por nota nueva), art. 64 LOPSRM (contrato cerrado).*

---

## HU-10 — Consulta y búsqueda de notas

**Quién y qué hace.** El **residente** (y en consulta el contratista y la supervisión) busca y consulta las notas de la bitácora del contrato, filtrando por tipo, fecha, emisor, vínculo o palabra clave, y puede exportar la selección.

**Criterio de éxito.** La búsqueda devuelve solo las notas que cumplen todos los filtros a la vez, con su contador de resultados; cada nota muestra su emisor (no vacío), su estado de aceptación y a qué nota o documento está vinculada. La selección se puede exportar a un archivo con folio, fecha, tipo, emisor, vínculo, asunto, contenido y estado.

**Qué impide el sistema.** Consultar las notas de un contrato del que no se es parte; consultar un contrato sin bitácora (avisa que no la tiene y ofrece abrirla).

*Fundamento: art. 132 fr. II RLOPSRM (notas vinculadas a la estimación), art. 123 fr. III/XII RLOPSRM (estado de aceptación).*

---

## HU-11 — Minutas, visitas y acuerdos

**Quién y qué hace.** El **residente** del contrato (o quien lo dio de alta) registra minutas de junta y agenda visitas de obra, y puede **vincularlas a una nota** de la bitácora sin modificar la nota. Los acuerdos capturados en las minutas se consultan en su propia vista.

**Criterio de éxito.** Cada minuta queda registrada con su lugar y participantes (y, si se sube, su PDF); cada visita con su fecha, lugar, responsable y propósito. Al vincular una minuta o visita a una nota, queda la relación y la nota original no cambia. En la consulta de notas, la nota muestra que tiene una minuta o visita asociada.

**Qué impide el sistema.** Registrar una minuta sin asunto, fecha, lugar o participantes, o una visita sin fecha, lugar, responsable o propósito; vincular a una nota que no pertenece al contrato; subir un archivo que no es PDF; o registrar en un contrato cerrado.

*Fundamento: art. 123 fr. X RLOPSRM (ratificación en bitácora de minutas y oficios), art. 123 fr. VI RLOPSRM (inmutabilidad de la nota vinculada).*

---

## HU-06 — Registro de trabajos terminados

**Quién y qué hace.** El **contratista (superintendente)** registra los trabajos terminados: por cada concepto, la cantidad ejecutada en el periodo en curso, con su evidencia fotográfica. El sistema asienta automáticamente una nota de avance en la bitácora. Un avance ya registrado no se edita: para corregirlo se genera una nota nueva vinculada que dice "dice / debe decir", referenciando el folio anterior.

**Criterio de éxito.** Al registrar un avance válido se genera un registro de avance y una **nota de bitácora de tipo avance** con folio ("se ejecutaron X unidades en el periodo N"), ligada al avance y sin datos vacíos. El avance no se puede registrar sin al menos una foto de evidencia, que se adjunta en la misma operación que crea el avance: esa primera foto no puede diferirse. Pueden adjuntarse varias fotos, cada una con su descripción, y todas quedan ligadas a ese avance. Después del registro, el contratista puede **sumar más fotos** de evidencia, eliminarlas y **anotar o editar la descripción** de cualquiera de ellas. Al corregir el avance, el anterior queda anulado y aparece uno nuevo con su nota correctiva. El periodo en curso viene preseleccionado.

**Qué impide el sistema.** Registrar avance de un **periodo futuro** (trabajo no iniciado); registrar sin bitácora abierta; capturar una cantidad que **excede lo contratado** del concepto; registrar en un contrato cerrado; registrar un avance sin adjuntar al menos una foto de evidencia; o adjuntar un archivo que no sea una imagen JPEG/PNG válida. No existen avances negativos. Si la cantidad supera lo programado del periodo, el sistema avisa pero no bloquea (adelantar a precios pactados es válido).

*Fundamento: art. 118 RLOPSRM (no exceder lo contratado), art. 122 RLOPSRM (bitácora obligatoria), art. 125 fr. II RLOPSRM (nota de avance), art. 123 fr. VI/VII RLOPSRM (corrección por registro vinculado), art. 132 fr. IV RLOPSRM (evidencia fotográfica), art. 64 LOPSRM (contrato cerrado).*

---

## HU-07 — Alertas de atraso por concepto

**Quién y qué hace.** El **residente** ve los conceptos que van atrasados respecto del programa al periodo vigente, con su déficit en unidades, y puede **asentar el atraso en la bitácora**.

**Criterio de éxito.** El sistema muestra, sin configuración, los conceptos cuyo ejecutado acumulado va por debajo de lo programado hasta hoy, con el déficit expresado como **cantidad positiva en unidades** del concepto (nunca como porcentaje negativo). Un concepto al día no aparece. Al asentar, se genera una nota de bitácora de tipo atraso, única, con el concepto, déficit, unidad y periodo, sin datos vacíos; reasentarlo del mismo concepto y periodo no lo duplica.

**Qué impide el sistema.** Asentar un atraso de un concepto que ya no lo tiene; asentar sin bitácora abierta; o duplicar el asiento de un mismo concepto y periodo.

*Fundamento: art. 52 LOPSRM + art. 45 ap. A fr. X RLOPSRM (base contra la que se mide el atraso), art. 46 Bis LOPSRM (penas convencionales), art. 123 RLOPSRM (asiento en bitácora), art. 53 LOPSRM (emisor = residente).*

---

## HU-05 — Programa y curva de avance

**Quién y qué hace.** El **residente** (y en consulta las demás partes) ve el programa de obra como matriz de concepto por periodo y la **curva de avance** del contrato: lo programado, lo ejecutado y lo financiero (lo pagado), más el porcentaje de avance físico.

**Criterio de éxito.** Con un contrato que tiene programa y al menos un avance reportado, se ve: las tres curvas partiendo de 0% al inicio y subiendo (no en blanco ni planas); el porcentaje de avance físico derivado de lo ejecutado contra lo contratado (con cero avances marca 0%, no un número inventado); la desviación expresada siempre en positivo como **"Atraso de X%"** o "Adelanto de X%" (nunca un porcentaje negativo); y la matriz con celdas en verde donde hubo ejecución, rojo donde un periodo venció sin ejecutar, ámbar donde está por venir y gris donde el concepto no tiene cantidad programada en ese periodo. Cuando el contrato **no** tiene convenio modificatorio, la curva de ejecutado es una sola serie. Cuando **sí** tiene convenio (dos o más versiones del programa), además de la curva consolidada sobre el plan vigente aparece un bloque "Avance por etapas" con una tarjeta por versión del programa: la del plan original queda congelada como histórico y la versión vigente mide sobre el plan modificado. En cada tarjeta de etapa la curva de ejecutado se desdobla en **dos** series: "Nuevo (desde convenio)" (lo ejecutado dentro de la ventana de tiempo de esa versión) y "Acumulado total" (todo lo ejecutado de todas las versiones, medido sobre el denominador de esa versión); y la etapa vigente muestra además un tercer indicador "Acumulado total", junto a "Programado a hoy" y "Ejecutado (nuevo)".

**Qué impide el sistema.** Ver el programa o la curva de un contrato del que no se es parte. (Esta vista no captura datos: solo presenta.)

*Fundamento: art. 52 LOPSRM + art. 45 ap. A fr. X RLOPSRM (programa por periodos), art. 46 Bis LOPSRM (penas por atraso, base de la desviación), art. 59 LOPSRM (convenio modificatorio que origina la nueva versión del programa) y art. 101 RLOPSRM (conceptos adicionales).*

---

## HU-12 — Integración de la estimación

**Quién y qué hace.** El **contratista (superintendente)** integra la estimación de un periodo ya vencido: el sistema muestra solo los conceptos de ese periodo y **trae automáticamente las cantidades ya reportadas en el avance** (el contratista solo las modifica si hace falta, no las recaptura). Sobre esas cantidades el sistema arma la carátula de la estimación con el formato GACM: importes sin IVA, amortización del anticipo, 5 al millar, retenciones, neto a recibir y el resumen de conceptos.

**Criterio de éxito.** Se genera una estimación única con su número correlativo y estado "integrada", con la carátula calculada por el sistema (el contratista no teclea los importes): subtotal, amortización, retención del 5 al millar y neto, todos llenos y sin IVA. La estimación queda congelada (no editable) con sus generadores y las notas de bitácora que la respaldan. El avance físico del contrato se muestra correcto (deriva de lo ejecutado, no del estimado acumulado).

**Qué impide el sistema.** Integrar un periodo que **aún no cierra** (solo se estima un periodo vencido); integrar sin bitácora abierta; integrar conceptos que **exceden lo contratado o lo planeado** hasta ese periodo; integrar sin el PDF del contrato firmado (y la autorización del anticipo si superó el límite); integrar dos estimaciones que se traslapan en el periodo; o integrar en un contrato cerrado. Solo el superintendente del contrato integra.

*Fundamento: art. 54 LOPSRM (periodo mensual vencido), art. 132 RLOPSRM (la estimación = carátula + generadores + notas + evidencia), art. 118 RLOPSRM (no exceder lo contratado), art. 143 fr. I RLOPSRM (amortización del anticipo), art. 191 LFD (5 al millar), art. 2 fr. XIX RLOPSRM (montos sin IVA), art. 122 RLOPSRM (bitácora), art. 64 LOPSRM (contrato cerrado).*

> **Nota sobre el IVA.** La carátula de estimación se presenta **sin IVA**: la ley expresa los importes de obra sin el impuesto (art. 2 fr. XIX RLOPSRM) y no exige el IVA en la carátula de cobro; el IVA es un dato fiscal que va en el CFDI/factura, no en la carátula.
>
> **Nota sobre la evidencia fotográfica.** La evidencia fotográfica **por generador (concepto)** de la estimación se sube y se consulta en el expediente del contrato (HU-04), ligada a cada concepto.

---

## HU-13 — Presentación de la estimación

**Quién y qué hace.** El **contratista (superintendente)** presenta a revisión una estimación ya integrada. La presentación sella la fecha y hora del acto y avisa a la supervisión y residencia que hay una estimación por revisar.

**Criterio de éxito.** La estimación cambia de "integrada" a "presentada", con la fecha y hora exactas selladas (eso arranca el plazo de revisión). Se asienta una nota de bitácora única solicitando la aprobación de la estimación, sin datos vacíos. El plazo de presentación se cuenta **desde el cierre del periodo** (cuando aún no termina, el sistema dice "faltan N días para el corte"; nunca muestra días negativos). Presentarla de nuevo avisa que ya fue presentada.

**Qué impide el sistema.** Presentar algo que no está integrado; presentar sin bitácora abierta; presentar en un contrato cerrado; o presentar sin ser el superintendente del contrato.

*Fundamento: art. 54 LOPSRM (plazo de presentación y revisión), art. 122 RLOPSRM (bitácora), art. 125 fr. II-b RLOPSRM (nota de solicitud de aprobación), art. 64 LOPSRM (contrato cerrado).*

---

## HU-15 — Revisión y autorización o rechazo de la estimación

**Quién y qué hace.** La **supervisión** revisa la estimación presentada por secciones (carátula, números generadores, notas) y registra **observaciones sobre el documento, sin modificarlo**, asociadas a la sección correspondiente. La supervisión turna la estimación a la **residencia** —con o sin observaciones— o la **rechaza directamente**; la residencia autoriza o rechaza con motivo obligatorio. **No hay niveles de severidad**: toda observación cuenta por igual, y **registrar una observación no rechaza por sí sola** la estimación: autorizar o rechazar pese a las observaciones es decisión de la residencia.

**Criterio de éxito.** Cada observación queda registrada con su sección, descripción no vacía y autor, sin alterar el documento revisado. Al autorizar, la estimación pasa de "presentada" a "autorizada" y se asienta una nota de bitácora de autorización. Al rechazar (sea la supervisión directo o la residencia), pasa a "rechazada" y se genera una observación de rechazo dirigida al contratista con su motivo. Una estimación rechazada no desaparece: queda en el historial con su motivo, y el contratista la vuelve a integrar y presentar desde cero (no existe un "reingreso" aparte).

**Qué impide el sistema.** Registrar una observación sin descripción; turnar sin observaciones ni marca expresa de "sin observaciones"; que la residencia autorice sin que la supervisión haya turnado; rechazar sin motivo; o actuar sobre una estimación que no está en revisión o sobre un contrato cerrado. La responsabilidad de aceptar una estimación que la supervisión observó recae en la residencia.

*Fundamento: art. 54 LOPSRM (revisión y plazo de la estimación), art. 125 fr. I-b RLOPSRM (nota de autorización), art. 64 LOPSRM (contrato cerrado).*

---

## HU-14 — Historial de estimaciones

**Quién y qué hace.** El **residente** (y en consulta las demás partes) ve todas las estimaciones del contrato en orden, con su estado, importe y fecha de presentación, incluidas las rechazadas.

**Criterio de éxito.** Se listan todas las estimaciones del contrato en orden cronológico, cada una con su estado real (integrada, presentada, autorizada, pagada o rechazada), su importe neto y su fecha de presentación. Una estimación rechazada no desaparece del historial. El importe mostrado es el neto congelado de la estimación.

**Qué impide el sistema.** Ver el historial de un contrato del que no se es parte. (Es una vista de consulta.)

*Fundamento: art. 54 LOPSRM (sello de presentación), art. 132 RLOPSRM (carátula inmutable).*

---

## HU-17 — Tablero de estimaciones

**Quién y qué hace.** El **residente** (y en consulta contratista, supervisión y dependencia) ve el estado de las estimaciones agregadas: cuántas y por cuánto en cada estado, los totales de cartera, y qué le toca actuar a su rol.

**Criterio de éxito.** Se muestra cada estimación en proceso (integrada, presentada, autorizada, pagada) con su estado, periodo e importe; los conteos y totales por estado cuadran al centavo con los netos congelados de las estimaciones. Las rechazadas cuentan en las métricas pero no aparecen en el tablero de seguimiento. "Mis pendientes" lista solo lo que le toca actuar al rol que consulta.

**Qué impide el sistema.** El acceso de Finanzas a este tablero (no es su función). Es una vista de consulta agregada.

*Fundamento: art. 54 LOPSRM (ciclo de la estimación).*

---

## HU-20 — Tránsito a pago: promoción de cobro del contratista

**Quién y qué hace.** Una vez autorizada la estimación, el **contratista promueve su cobro**: captura el folio del **CFDI** y la **factura** (cuya fecha queda como la del momento en que la registra) y **sube los PDF** de su CFDI/factura y del oficio de autorización; con eso genera una **solicitud de cobro**. Finanzas no inventa ni captura el CFDI/factura: solo los **recibe y los hereda** al registrar el pago. Las solicitudes de todos los contratos llegan a una **cola global de Finanzas**, que las revisa y pasa a cobranza.

**Criterio de éxito.** Al promover, se genera una solicitud de cobro única para esa estimación, con su monto (el neto, no tecleado) y su CFDI, notificada a Finanzas. La solicitud aparece en la **cola global de Finanzas** con el contrato al que pertenece, el contratista, el periodo, el neto y el CFDI, y con los **soportes digitales (PDF del CFDI/oficio) descargables**, sin que Finanzas tenga que entrar contrato por contrato. El sistema verifica además que haya suficiencia presupuestal (techo de la partida) antes de dejar pasar, y muestra un **semáforo del plazo de pago de 20 días naturales** (art. 54 LOPSRM): cuenta los días desde la fecha más tardía entre la autorización de la estimación y la presentación de la factura, y lo marca en verde, ámbar o rojo según los días vencidos; mientras el contratista no presente la factura, el plazo aún no corre.

**Qué impide el sistema.** Que Finanzas (o cualquiera que no sea el contratista) genere la solicitud; promover sobre una estimación que no está autorizada; promover sin los soportes obligatorios (factura, CFDI con folio, fianza vigente); promover sin techo presupuestal suficiente; o promover en un contrato cerrado.

*Fundamento: art. 54 LOPSRM (pago de lo autorizado), art. 24 LOPSRM (suficiencia presupuestal en la partida), art. 48 fr. II LOPSRM (fianza de cumplimiento), art. 64 LOPSRM (contrato cerrado).*

---

## HU-21 — Registro del pago

**Quién y qué hace.** **Finanzas** registra el pago de una estimación autorizada. El folio **CFDI** y la **factura** (con su fecha) **no** los teclea Finanzas: los **hereda en solo lectura** del tránsito a pago, donde los promovió el contratista (HU-20). Finanzas únicamente **revisa** esos soportes y captura lo suyo: la **referencia SPEI** (clave de rastreo) y la **fecha de pago** (más observaciones opcionales). Al pulsar "Registrar pago", el sistema abre un **pop-up de confirmación "¿El CFDI y la factura coinciden?"**; solo al confirmar se registra. La pantalla de "Registro de pago" es solo el **historial** de pagos del contrato; el registro se hace dentro del tránsito a pago.

**Criterio de éxito.** Se genera un registro de pago ligado a la estimación, con el importe igual al **neto** (derivado, no tecleado), la **referencia SPEI**, la **fecha de pago**, y el **folio CFDI** y la **fecha de factura heredados** del contratista, y queda registrado quién lo hizo, sin campos vacíos. La estimación pasa de "autorizada" a "pagada" y la solicitud sale de la cola de Finanzas. No se paga dos veces la misma estimación. El pago es inalterable (registro de auditoría).

**Qué impide el sistema.** Pagar una estimación que no está autorizada, o ya pagada o rechazada; pagar **sin que el contratista haya subido el CFDI del cobro** en el tránsito a pago; pagar **sin que el contrato tenga avance físico reportado**; pagar en un **contrato cerrado** (el saldo se liquida por el finiquito); una **referencia SPEI** con letras (debe ser numérica); o que alguien que no sea Finanzas registre el pago.

*Fundamento: art. 54 LOPSRM (pago de lo autorizado y plazo), art. 55 LOPSRM (mora), art. 64 LOPSRM (contrato cerrado).*

---

## HU-03 — Trámite de convenios modificatorios

**Quién y qué hace.** La **dependencia** promueve un convenio modificatorio del contrato (de monto, plazo, programa o mixto). Primero **registra el oficio de soporte** (de solicitud/autorización): sin esa referencia no procede; el PDF del oficio se adjunta al convenio. Los conceptos originales del contrato **se congelan** (no se cambian); los conceptos nuevos se **agregan y se marcan como adicionales**, separados de los originales.

**Criterio de éxito.** Se genera un convenio con su número, tipo, motivo (no vacío), el monto y plazo anteriores y los nuevos, y se asienta una nota de bitácora del convenio. Si toca el programa, el programa anterior queda como **versión histórica** y arranca una versión nueva vigente; el monto y plazo del contrato quedan sincronizados. El convenio nace **registrado** (pendiente de autorización); el servidor facultado de la dependencia lo **autoriza en un acto separado**, y para autorizarlo debe estar cargado el oficio/soporte de aprobación en **PDF** (de todo convenio, no solo cuando la variación supera el 25%). Los conceptos adicionales quedan marcados como tales en el catálogo —distintos de los originales, que no se movieron— y esa etiqueta "Adicional" se guarda en el **snapshot de cada versión** del programa, de modo que también las versiones históricas (en "Versiones del programa de obra → Ver programa") la muestran, no solo el programa vigente. El monto no se teclea: lo deriva el sistema.

**Qué impide el sistema.** Promover sin el oficio de soporte; **cambiar la cantidad o precio de un concepto original** (se congela; los cambios van como adicionales — no se convierte un concepto de 524 en 1500); **adicionar a un periodo que ya cerró** (solo de hoy en adelante); reducir un concepto por debajo de lo ya estimado; promover sin bitácora abierta; autorizar el convenio sin tener cargado su oficio de aprobación en PDF (se exige para todo convenio, no solo cuando la variación supera el 25%); o promover en un contrato cerrado.

*Fundamento: art. 59 LOPSRM (modificación de contratos), art. 99 RLOPSRM (dictamen y soporte previos; oficio de aprobación para autorizar todo convenio), art. 101 RLOPSRM (conceptos adicionales), art. 102 RLOPSRM (revisión si la variación supera el 25%), art. 122 RLOPSRM (bitácora), art. 64 LOPSRM (contrato cerrado).*

---

## HU-04 — Consulta integrada del expediente

**Quién y qué hace.** El **residente** (y en consulta el contratista, la supervisión y la dependencia) consulta, en una sola vista, todo el expediente del contrato: configuración y equipo, catálogo de conceptos, programa de obra, fianzas, plan de amortización, datos jurídicos, sustituciones del equipo, convenios modificatorios y el resumen de estimaciones con su evidencia fotográfica por generador.

**Criterio de éxito.** Al elegir un contrato, se ven todos sus bloques con datos reales: el catálogo muestra la clave de cada concepto, la configuración muestra el equipo vigente (no el del alta si hubo sustituciones), y los convenios muestran el cambio de monto/plazo (anterior→nuevo) y las versiones del programa. Los conceptos adicionales aparecen marcados con su etiqueta "Adicional" en el catálogo y el programa vigente del expediente; el detalle de cada versión histórica del programa —que conserva esa misma etiqueta— se abre desde el enlace "Ver versiones del programa" del bloque de convenios. Un bloque sin datos lo dice explícitamente ("este contrato no tiene…"), no aparece vacío sin explicación. El expediente se puede exportar como un solo documento.

**Qué impide el sistema.** Consultar el expediente de un contrato del que no se es parte.

*Fundamento: art. 45 fr. IX RLOPSRM (clave de concepto), art. 125 RLOPSRM (roster/sustituciones), art. 59 LOPSRM / art. 99 RLOPSRM (convenios), art. 101 RLOPSRM (conceptos adicionales), art. 132 fr. IV RLOPSRM (evidencia fotográfica).*

---

## HU-18 — Portafolio ejecutivo con semáforos

**Quién y qué hace.** La **dependencia** (y en consulta el residente y la supervisión) ve todos sus contratos con un **semáforo** de estado, para detectar de un vistazo cuáles van bien y cuáles tienen problemas. Al hacer **clic en el semáforo**, va al expediente de ese contrato.

**Criterio de éxito.** Cada contrato muestra un semáforo: verde (buen estado), amarillo (varios atrasos o pendientes) o rojo (grave), calculado a partir de la desviación de avance, los plazos legales vencidos y los pendientes sin atender. Al hacer **clic en el semáforo, lleva al expediente** del contrato correspondiente. Los contadores por color cuadran con la suma de contratos. Un contrato **cerrado** (con finiquito ya elaborado) se conserva en el portafolio, identificado con su estado "cerrado" y un semáforo **verde (neutro)** acompañado de la nota "Contrato cerrado (finiquito elaborado): no se evalúa atraso/avance"; en él no se evalúan la desviación de avance, los plazos vencidos ni los pendientes, de modo que una obra ya extinguida no dispara una falsa alarma de atraso.

**Qué impide el sistema.** Ver contratos en los que no se participa (cada quien ve solo su portafolio; la dependencia ve todos).

*Fundamento: art. 52/54 LOPSRM (plazos de ejecución y revisión), art. 46 Bis LOPSRM (penas por atraso), art. 64 LOPSRM (contrato cerrado: extinción de derechos y obligaciones).*

---

## HU-19 — Exportación de reportes del contrato

**Quién y qué hace.** El **residente** exporta los reportes definidos del contrato. Cada reporte tiene un **formato fijo**: el **avance físico vs programado** y la **bitácora completa** se exportan como **PDF** (documento imprimible); el **avance financiero**, el **listado de estimaciones**, el **listado de observaciones**, el **histórico de modificatorios** y las **penalizaciones y deductivas** se exportan como **Excel**. Puede acotar por periodo (mensual, trimestral o acumulado).

**Criterio de éxito.** Al elegir contrato y periodo, se descarga un archivo real con los datos del contrato, en el formato que corresponde a ese reporte (no un volcado vacío ni de relleno). Los PDF llevan un encabezado con el contrato, el periodo y la fecha; si una fuente viene vacía, el archivo sale con sus encabezados y sin filas, nunca con datos ficticios. El reporte de bitácora requiere que la bitácora esté abierta.

**Qué impide el sistema.** Exportar sin ser el rol que ejecuta la historia (los demás roles ven la lista pero no descargan); exportar la bitácora de un contrato que no la ha abierto.

*Fundamento: art. 54 LOPSRM (revisión y plazos), art. 46 Bis LOPSRM + arts. 86-88 RLOPSRM (penas y deductivas).*

---

## HU-24 — Finiquito y cierre del contrato

**Quién y qué hace.** La **dependencia** o el **residente** elabora el finiquito del contrato: el sistema calcula el saldo restando del importe neto autorizado lo pagado, el anticipo no amortizado y, en su caso, los **ajustes finales** que se capturan al cerrar (deductivas, sobrecosto o cinco al millar pendiente, con valor predeterminado de cero), y dice a favor de quién queda. Al cerrar, asienta el finiquito como nota de bitácora y deja el contrato en solo lectura.

**Criterio de éxito.** Se genera un registro de finiquito único, con el saldo y todos sus componentes llenos, y dice **a favor de quién** queda el saldo (el contratista cobra, la dependencia reintegra, o queda en cero). Se asienta una nota de bitácora de finiquito con la relación de importes y la cláusula de extinción. El contrato pasa a **"cerrado"** y queda en solo lectura: después de eso, intentar una nota, avance, estimación, convenio, minuta, garantía o sustitución es rechazado. El finiquito es inalterable.

**Qué impide el sistema.** Cerrar un contrato sin bitácora abierta (el finiquito es una nota de bitácora); cerrar dos veces el mismo contrato; o cerrar sin ser la dependencia o el residente asignado.

*Fundamento: art. 64 LOPSRM (finiquito, saldo y solo lectura), arts. 168-172 RLOPSRM (procedimiento de finiquito y acta de extinción), art. 53 LOPSRM (emisor = residente).*

---

*Documento de historias de usuario — SIGECOP. Cada historia describe la acción y su criterio de éxito verificable, conforme al criterio acordado con el profesor. El detalle de implementación (pantallas, pasos, componentes) queda a criterio del desarrollo.*
