# Fichas de Trazabilidad — SIGECOP (22 HU)

Documento **interno del equipo** (no entregable). Una ficha por HU: la cadena **Historia ↔ Servicio ↔ Sistema**. Cuando el profe pregunte *"¿esta historia con qué servicio se relaciona?"* o *"¿el sistema hace lo que dice?"*, la respuesta sale de aquí.

**Convenciones:** ✅ funcional end-to-end · 🟡 prototipo funcional (UI + lógica, sin persistencia a BD) · Suite E2E: **305 tests verde**.

---

## HU-00 → SRV-00-01 (Control de Accesos (transversal))
**Estado:** Terminado  ·  **Sistema:** ✅ Login end-to-end (bcrypt+JWT) — en vivo en Render
**Deseo:** autenticarme con mi usuario y contraseña, sin tener que indicar mi rol explícitamente, para que el sistema reconozca internamente quién soy y me muestre únicamente las funciones que me corresponden
**Criterios:**
1. El sistema valida usuario y contraseña, bloquea el acceso cuando son inválidos y no permite continuar si los campos usuario o contraseña están vacíos.
2. El sistema deduce el rol del usuario a partir de su identificador, sin que este lo seleccione, y muestra únicamente las pantallas y opciones que corresponden a ese rol.
3. Cada acción registrada por el usuario queda asociada a su nombre y fecha/hora en el sistema.

## HU-01 → SRV-01-01 (Alta y configuración del contrato)
**Estado:** Terminado  ·  **Sistema:** ✅ Alta + folio único persisten end-to-end (en vivo); demás bloques prototipo
**Deseo:** dar de alta un contrato nuevo capturando en un solo flujo: datos generales (folio, partes, monto, plazos, modalidad de pago), catálogo de conceptos (clave, descripción, unidad, precio, cantidad), programa de obra mes a mes, elementos jurídicos separados por dependencia y contratista, garantías (anticipo, cumplimiento y vicios ocultos), plan de amortización del anticipo, penalizaciones aplicables (incluida la retención del 5 al millar, art. 191 LFD) y el PDF firmado del contrato como respaldo
**Criterios:**
1. Existe un contrato con folio único que contiene, en una sola entidad, los siguientes bloques: datos generales, catálogo de conceptos, programa de obra, elementos jurídicos (dependencia y contratista por separado), garantías (anticipo, cumplimiento, vicios ocultos), plan de amortización, penalizaciones y PDF firmado.
2. El sistema no permite guardar el contrato hasta que todos los campos obligatorios estén llenos y el folio sea único.
3. El sistema contempla el PDF firmado como parte del expediente del contrato, ligado cuando se cargue, consultable por los actores autorizados.

## HU-02 → SRV-01-02 (Registro de fianzas y garantías)
**Estado:** En desarrollo  ·  **Sistema:** 🟡 Alertas por rango de días (30/15/5), modal agregar/editar, ver PDF
**Deseo:** subir las pólizas de fianza del contrato (cumplimiento, vicios ocultos, anticipo) con sus metadatos (vigencia, afianzadora y monto), recibir alertas anticipadas de vencimiento y mantener el historial de fianzas y sus endosos por modificatorios
**Criterios:**
1. La póliza queda ligada al contrato con afianzadora, vigencia y monto registrados.
2. El sistema emite alerta cuando faltan 30, 15 y 5 días para el vencimiento (configurable).
3. La póliza registrada puede consultarse en formato PDF desde el listado de fianzas del contrato.

## HU-03 → SRV-01-03 (Trámite y aplicación de convenios modificatorios)
**Estado:** En desarrollo  ·  **Sistema:** 🟡 Cálculo art.59/59Bis en vivo, registro genera versión, endosos
**Deseo:** registrar un convenio modificatorio del contrato (cambios al monto, plazo o conceptos) y aplicar las actualizaciones al catálogo, programa y endosos de las fianzas, manteniendo el histórico de versiones conforme al art. 59 LOPSRM
**Criterios:**
1. Al registrarse el modificatorio se genera una nueva versión del catálogo y del programa, sin alterar la versión anterior.
2. El sistema indica si el modificatorio se rige por el art. 59 LOPSRM (modificatorio ordinario) o por el art. 59 Bis (ajuste de costos cuando se supera 50% del monto o 50% del plazo).
3. El histórico de versiones registra fecha, autor y motivo del cambio, y los endosos correspondientes a las fianzas asociadas al modificatorio.

## HU-04 → SRV-01-04 (Consulta integrada del expediente contractual)
**Estado:** En desarrollo  ·  **Sistema:** 🟡 5 bloques + buscador AND + descargas individuales reales (jsPDF/SheetJS)
**Deseo:** consultar en una sola vista los 5 bloques vigentes del contrato (configuración, catálogo, programa, fianzas y documentos jurídicos), con buscador combinable y descarga individual de documentos
**Criterios:**
1. El expediente muestra en una sola vista los 5 bloques del contrato: configuración, catálogo, programa, fianzas y documentos jurídicos.
2. El buscador filtra los bloques por folio, contratista, objeto, periodo o tipo de documento, con lógica Y.
3. Cada documento del expediente puede descargarse individualmente desde su bloque.

## HU-05 → SRV-02-01 (Visualización del programa y curva de avance)
**Estado:** En desarrollo  ·  **Sistema:** 🟡 Gantt concepto×periodo + catálogo + 3 curvas + % avance
**Deseo:** visualizar el programa de obra (catálogo de conceptos y su calendario tipo Gantt, marcando lo ejecutado) y las curvas de avance (programado vs ejecutado vs financiero), con filtros por concepto y periodo
**Criterios:**
1. La vista muestra el programa de obra como matriz concepto × periodo (tipo Gantt), con el catálogo de conceptos y un código de color que distingue lo ejecutado de lo no ejecutado.
2. La vista grafica las tres curvas (programado, ejecutado, financiero) y los filtros por concepto y periodo recalculan tanto la matriz como las curvas.
3. El sistema calcula y muestra el porcentaje de avance global y por concepto.

## HU-06 → SRV-02-02 (Registro de trabajos terminados por concepto y periodo)
**Estado:** En desarrollo  ·  **Sistema:** 🟡 Captura + acumulado + bloqueo exceso + vínculo a notas
**Deseo:** registrar por periodo las cantidades terminadas por cada concepto del catálogo, vinculando cada registro a su nota de bitácora del periodo, viendo el avance acumulado contra lo contratado en vivo
**Criterios:**
1. Cada cantidad capturada queda ligada al concepto del catálogo correspondiente y a una nota de bitácora del periodo (tipo entrega de obra o avance).
2. El sistema acumula el avance ejecutado por concepto y muestra el porcentaje de avance contra lo contratado en vivo, periodo a periodo.
3. El sistema bloquea el registro cuando la cantidad acumulada excede la contratada (art. 118 RLOPSRM).

## HU-07 → SRV-02-03 (Configuración de alertas de atraso por concepto)
**Estado:** En desarrollo  ·  **Sistema:** 🟡 Crear/pausar/eliminar alertas + timeline de disparadas
**Deseo:** configurar qué conceptos del contrato quiero vigilar, el umbral de atraso a partir del cual quiero ser notificado y el canal de notificación (sistema o correo)
**Criterios:**
1. Se pueden crear, pausar y eliminar alertas por concepto sin alterar las del resto.
2. La alerta solo dispara cuando el avance real es menor al umbral configurado por el usuario.
3. La notificación se entrega por el canal elegido al configurar la alerta (sistema o correo).

## HU-08 → SRV-03-01 (Apertura formal de la bitácora del contrato)
**Estado:** En desarrollo  ·  **Sistema:** 🟡 Firma conjunta de 3 + primera nota art.122 + apertura inalterable
**Deseo:** aperturar la bitácora electrónica del contrato en la fecha de entrega del sitio de los trabajos, ligando a las tres partes (dependencia, supervisión y contratista) con sus representantes autorizados a firmar, y registrando la primera nota con los datos obligatorios
**Criterios:**
1. Existe una bitácora única por contrato con las tres partes ligadas y sus firmantes autorizados (residente, supervisor externo si existe, superintendente).
2. La fecha y hora de apertura (fecha de entrega del sitio) queda registrada como evento formal inalterable, con la firma conjunta de los tres autorizados.
3. La primera nota registra los datos obligatorios: identificación del contrato, objeto, datos financieros, cronograma contractual y registro de firmas (art. 122 RLOPSRM).

## HU-09 → SRV-03-02 (Emisión y respuesta de notas tipificadas con firma)
**Estado:** En desarrollo  ·  **Sistema:** 🟡 Folio correlativo + 3 firmas + nota vinculada (dice/debe decir)
**Deseo:** emitir notas en la bitácora del contrato —el residente autoriza y aprueba, el superintendente solicita y avisa, y la supervisión registra el avance—, conforme a los arts. 122 y 125 RLOPSRM, con folio correlativo automático y firma conjunta de los tres participantes
**Criterios:**
1. Aparecen los tipos de nota que corresponden al rol del usuario, pudiendo incorporar también otro tipo de nota para eventos no tipificados.
2. Una nota firmada queda inmutable; las correcciones se hacen generando una nota vinculada (formato «dice / debe decir»), sin alterar la original.
3. Cada nota queda registrada con folio correlativo, fecha, firma de los tres participantes y vínculo opcional a nota previa.

## HU-10 → SRV-03-03 (Consulta y búsqueda de notas)
**Estado:** En desarrollo  ·  **Sistema:** 🟡 5 filtros AND + export Excel real
**Deseo:** buscar notas de la bitácora del contrato combinando los filtros tipo, rango de fechas, firmante, vínculo y palabra clave, todos aplicados con lógica Y (AND), y exportar las notas seleccionadas en formato Excel
**Criterios:**
1. La búsqueda devuelve solo las notas que cumplen simultáneamente todos los filtros aplicados (tipo, fecha, firmante, vínculo y palabra clave).
2. Se pueden seleccionar varias notas del resultado y exportarlas en formato Excel.

## HU-11 → SRV-03-04 (Registro y agenda de minutas, visitas e inspecciones)
**Estado:** En desarrollo  ·  **Sistema:** 🟡 Registrar minuta PDF + agendar visita + adjuntar a nota
**Deseo:** subir el PDF de las minutas de reuniones del contrato con sus metadatos, agendar visitas e inspecciones de campo, y consultar los acuerdos asentados, pudiendo adjuntar una minuta como referencia en una nota de bitácora
**Criterios:**
1. Las minutas (con su PDF y metadatos) y las visitas registradas son visibles para los usuarios autorizados del contrato.
2. Se pueden consultar los acuerdos y compromisos derivados, filtrados por contrato y periodo.
3. Una minuta o registro de visita puede adjuntarse como referencia en una nota de bitácora (HU-09).

## HU-12 → SRV-04-01 (Apertura del periodo e integración de la estimación)
**Estado:** En desarrollo  ·  **Sistema:** 🟡 Carátula calcula en vivo + selector de notas + bloqueo exceso
**Deseo:** abrir el periodo de estimación e integrar como un solo bloque la carátula (con anticipo amortizado, retenciones del 5 al millar y deductivas), los números generadores, el registro fotográfico, los soportes y las notas de bitácora del periodo seleccionadas desde el buscador de bitácora
**Criterios:**
1. La estimación se guarda como una sola entidad que contiene carátula, generadores, registro fotográfico, soportes y notas vinculadas seleccionadas del buscador de bitácora.
2. La carátula calcula automáticamente anticipo amortizado, retenciones legales (5 al millar, art. 191 LFD) y deductivas por penalizaciones según el contrato.
3. El sistema bloquea la integración cuando una cantidad por concepto excede la cantidad contratada en el catálogo (art. 118 RLOPSRM).

## HU-13 → SRV-04-02 (Envío de la estimación)
**Estado:** En desarrollo  ·  **Sistema:** 🟡 Envío inalterable + plazo 15 días + notificaciones
**Deseo:** enviar formalmente una estimación integrada para que arranque el plazo de revisión del art. 54 LOPSRM, dentro de los 6 días naturales del periodo de presentación
**Criterios:**
1. Al enviar la estimación quedan registradas la fecha y hora exacta de recepción, y queda notificación formal a residencia y supervisión.
2. El botón Enviar se deshabilita cuando se vencen los 6 días naturales del periodo de presentación (art. 54 LOPSRM).
3. Al enviarse, inicia automáticamente el plazo de revisión de 15 días naturales (supervisión, art. 54 LOPSRM).

## HU-14 → SRV-04-03 (Historial de estimaciones del contrato)
**Estado:** En desarrollo  ·  **Sistema:** 🟡 Historial + drawer de detalle + export Excel
**Deseo:** consultar todas las estimaciones del contrato a lo largo del tiempo con sus estados (aceptadas, rechazadas, en proceso) y filtros por periodo, pudiendo abrir cada una para ver su expediente
**Criterios:**
1. El historial muestra todas las estimaciones del contrato en orden cronológico, incluyendo las versiones rechazadas.
2. Los filtros permiten consultar por periodo, estado o ambos combinados (lógica Y).
3. Cada estimación del historial puede abrirse para ver su expediente completo.

## HU-15 → SRV-05-01 (Recepción, revisión, observaciones y autorización/rechazo de la estimación)
**Estado:** En desarrollo  ·  **Sistema:** 🟡 Observaciones tipo/severidad + semáforo real + turnado secuencial
**Deseo:** revisar la estimación recibida sección por sección (carátula, números generadores, registro fotográfico, soportes, notas), registrar observaciones con tipo y severidad, turnar de supervisión a residencia y al final autorizar o rechazar
**Criterios:**
1. La revisión permite ir sección por sección (carátula, generadores, registro fotográfico, soportes y notas) y registrar observaciones con tipo y severidad por concepto.
2. La autorización queda condicionada al turnado secuencial: primero supervisión, luego residencia; residencia no puede resolver antes del turnado.
3. El sistema controla el plazo de 15 días naturales de revisión conforme al art. 54 LOPSRM mediante un semáforo basado en la fecha real de recepción.

## HU-16 → SRV-05-02 (Reingreso de estimación tras rechazo)
**Estado:** En desarrollo  ·  **Sistema:** 🟡 Descargas reales + reingreso de versión + trazabilidad
**Deseo:** presentar una nueva versión completa de la estimación del mismo periodo después de un rechazo, atendiendo las observaciones recibidas
**Criterios:**
1. La nueva versión se trata como bloque completo independiente y la versión rechazada queda como histórico vinculado.
2. El listado de observaciones de la versión rechazada está disponible para descarga en PDF o Excel.
3. La nueva versión queda vinculada con la rechazada para trazabilidad, sin reiniciar el plazo de presentación.

## HU-17 → SRV-06-01 (Tablero de seguimiento de estimaciones aceptadas y en revisión)
**Estado:** En desarrollo  ·  **Sistema:** 🟡 Tablero + indicadores agregados + línea de tiempo + filtros
**Deseo:** ver en un tablero las estimaciones del contrato aceptadas y en proceso (presentada, en revisión, autorizada, en pago, pagada), con su línea de tiempo, indicadores y pendientes por solventar
**Criterios:**
1. El tablero muestra solo estimaciones aceptadas y en proceso (no las rechazadas, que viven en el historial).
2. Cada estimación muestra su línea de tiempo de estado, y el tablero da indicadores agregados del contrato (avance, montos, días en cada estado).
3. El panel «Mis pendientes» filtra los pendientes según el rol del usuario autenticado.

## HU-18 → SRV-06-02 (Vista ejecutiva con semáforos y drill-down al contrato)
**Estado:** En desarrollo  ·  **Sistema:** 🟡 Semáforo calculado de 3 factores + agrupar + comparar periodos
**Deseo:** ver mis contratos asignados como una lista con semáforo de tres colores (verde, ámbar, rojo) según avance físico, atrasos y pendientes, con drill-down al detalle del contrato
**Criterios:**
1. Cada contrato del portafolio muestra un semáforo de color calculado a partir de tres factores: avance físico vs programado, atrasos en plazos legales y pendientes sin atender.
2. Al hacer doble clic sobre un contrato se abre su detalle con indicadores físicos, financieros, atrasos y penalizaciones.
3. El portafolio puede agruparse (por contratista, ejercicio fiscal o tipo de contratación) y comparar el periodo actual contra el anterior.

## HU-19 → SRV-06-03 (Exportación de reportes definidos del contrato)
**Estado:** En desarrollo  ·  **Sistema:** 🟡 7 reportes con descargas reales (jsPDF/SheetJS)
**Deseo:** descargar cualquiera de los 7 reportes definidos del contrato (avance físico, financiero, estimaciones, observaciones, bitácora, modificatorios, penalizaciones) en formato PDF o Excel según el reporte
**Criterios:**
1. Cada uno de los 7 reportes definidos genera un archivo descargable en el formato establecido (PDF, Excel o ambos según el reporte).
2. El usuario puede seleccionar el periodo (mensual, trimestral, acumulado) sin alterar el contenido predefinido del reporte.

## HU-20 → SRV-07-01 (Tránsito a pago y carga de soportes documentales)
**Estado:** En desarrollo  ·  **Sistema:** 🟡 Bloqueo presupuestal + semáforo real + instrucción + notif a Finanzas
**Deseo:** que al autorizarse una estimación el sistema verifique la suficiencia presupuestal (art. 24 LOPSRM), genere la instrucción de pago, permita cargar los soportes (factura, CFDI y fianza de cumplimiento cuando el contrato lo exija) y notifique a Finanzas con el plazo de 20 días naturales del art. 54 LOPSRM
**Criterios:**
1. El sistema verifica suficiencia presupuestal contra el techo anual y bloquea la generación de la instrucción de pago si el monto excede lo disponible (art. 24 LOPSRM).
2. Un semáforo muestra el avance del plazo de 20 días naturales para pago (art. 54 LOPSRM), basado en la fecha de autorización, y avisa al entrar en amarillo.
3. La instrucción de pago solo puede generarse cuando todos los soportes obligatorios (factura, CFDI, estado de fianza de cumplimiento cuando el contrato lo exija) están cargados.

## HU-21 → SRV-07-02 (Registro del pago efectuado)
**Estado:** En desarrollo  ·  **Sistema:** 🟡 Validación de formulario + marca pagada + banner
**Deseo:** registrar en el sistema el pago realizado de una estimación: fecha, importe, referencia bancaria y observaciones
**Criterios:**
1. El registro del pago marca la estimación como pagada y actualiza el avance financiero del contrato.
2. se encuentran todos o se encuentran los siguientes datos: fecha, importe, referencia bancaria y usuario que realizó el registro.

---

## Resumen para la defensa

- **22/22 HU** con cadena coherente: servicio explícito (qué hace / qué NO hace) ↔ historia completa trazable ↔ sistema funcional con E2E.
- **HU-00 y HU-01** funcionan **end-to-end en vivo en Render** con PostgreSQL.
- **HU-02 a HU-21** son prototipos funcionales reales (cálculos, validaciones, descargas, semáforos calculados — sin toasts pendientes).
- **Suite E2E:** 305 tests verde.

**Frase de cierre:** *"En cualquier historia, si va al servicio encuentra el mismo contenido más detallado; y si va al sistema, encuentra lo que la historia dice."*