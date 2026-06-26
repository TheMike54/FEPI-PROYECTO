# Memoria tecnica SIGECOP

**Proyecto:** SIGECOP - Sistema de Gestion de Contratos de Obra Publica  
**Fecha:** 26-jun-2026  
**Stack:** React 18 + Vite + Tailwind; Node 20 + Express; PostgreSQL 16  
**Tipo de entregable:** memoria tecnica consolidada del sistema

## Indice por modulo

1. Arquitectura general
2. Modelo de datos principal
3. Autenticacion, roles y sesiones
4. Empresas, usuarios y padron
5. Alta de contrato, catalogo y programa
6. Garantias, fianzas y endosos
7. Bitacora, notas, firmas, minutas y visitas
8. Roster y sustitucion de personas
9. Avance fisico, fotografias y alertas de atraso
10. Estimaciones, generadores y documento de estimacion
11. Revision, autorizacion, rechazo y reingreso
12. Convenios modificatorios y versiones de programa
13. Transito a pago, presupuesto y registro de pago
14. Expediente, tablero y portafolio ejecutivo
15. Finiquito y cierre
16. Reglas matematicas de cuadre
17. Evolucion tecnica reciente
18. Criterios configurables o no legales

## 1. Arquitectura general

SIGECOP esta construido como una aplicacion web de tres capas. El cliente usa React 18 con Vite, Tailwind y React Router; ademas incorpora exportacion documental y pruebas E2E con Playwright. El servidor usa Node con Express, PostgreSQL, JWT para autenticacion, bcrypt para contrasenas, multer para carga de archivos y validaciones de negocio en controladores. La base de datos es PostgreSQL y concentra tanto los datos operativos como los documentos binarios importantes en BYTEA para evitar depender de almacenamiento efimero.

La API se organiza por modulos funcionales: autenticacion, usuarios, empresas, contratos, programa, bitacora, roster, garantias, avance, alertas, estimaciones, ciclo de estimacion, convenios, instruccion de pago, pagos, finiquito, tablero y portafolio. El servidor aplica una regla comun de acceso por rol y participacion: los roles operativos solo trabajan sobre contratos donde participan, mientras que dependencia y finanzas tienen lectura transversal con acotamiento adicional por empresa cuando el contrato trae el contexto de dependencia.

## 2. Modelo de datos principal

Las entidades principales confirmadas en el esquema son:

- **usuarios:** nombre, email, contrasena cifrada, rol efectivo, rol solicitado, estado de aprobacion, empresa asociada, aprobador y `token_version`.
- **empresas:** catalogo de dependencias, contratistas y supervision, con estado `por_validar` o `validada`.
- **contratos:** folio, tipo, objeto, ubicacion, monto, plazo, fechas, anticipo, penalizacion, estado, dependencia, residente, superintendente, supervision, empresa contratista y empresa supervisora.
- **contrato_conceptos:** catalogo contractual con clave, concepto, unidad, cantidad, precio unitario y marca de concepto adicional.
- **contrato_periodos** y **programa_obra:** periodos mensuales/quincenales y matriz concepto-periodo con cantidades programadas.
- **plan_amortizacion:** plan por periodo para aplicar el anticipo.
- **contrato_documentos:** PDF del contrato, autorizacion de anticipo y oficio de convenio, guardados como binario.
- **contrato_garantias** y **garantia_endosos:** polizas, vigencias, montos, PDF de poliza y ajustes por convenio o prorroga.
- **bitacora_aperturas, bitacora_firmantes, bitacora_notas y bitacora_nota_firmas:** apertura, acta, firmas, notas, tipos, respuestas y trazabilidad.
- **contrato_roster:** historial vigente y anterior de residente, superintendente y supervision.
- **concepto_avance** y **avance_fotos:** avance fisico por concepto/periodo y evidencia fotografica opcional.
- **estimaciones, estimacion_generadores, estimacion_notas, estimacion_fotos, estimacion_observaciones:** caratula materializada, generadores, notas vinculadas, fotos y observaciones del ciclo de revision.
- **convenios_modificatorios, programa_version, programa_version_concepto y programa_version_celda:** convenios, autorizacion y versionamiento del programa.
- **presupuesto_anual, instruccion_pago, cobro_soportes y pagos:** suficiencia presupuestal, solicitud de cobro, soportes PDF y registro final de pago.
- **minutas, visitas, alerta_atraso, atraso_asentado y finiquitos:** acuerdos, visitas, alertas, asientos de atraso y cierre del contrato.

## 3. Autenticacion, roles y sesiones

El registro crea usuarios en estado `pendiente`; la dependencia aprueba o rechaza y asigna el rol efectivo. El login solo permite cuentas `activo`. Cada inicio de sesion incrementa `token_version`; el JWT incluye ese valor y el middleware lo compara contra la base de datos. Si una cuenta inicia sesion de nuevo, el token anterior queda invalidado.

**Endpoints funcionales:**

- Iniciar sesion.
- Registrar usuario.
- Listar empresas para registro.
- Listar usuarios.
- Aprobar usuario.
- Rechazar usuario.
- Listar usuarios asignables por rol.
- Consultar perfil propio.

**Validaciones confirmadas:**

- Email y contrasena requeridos para login.
- Registro con nombre, email y contrasena.
- Nombre completo con al menos dos palabras de dos letras o mas, porque aparece en bitacora.
- Contrasena minima de 8 caracteres.
- Rol solicitado dentro de residente, contratista, supervision, dependencia o finanzas.
- Empresa obligatoria para contratista y supervision.
- Correo unico.
- Usuario pendiente o rechazado no puede iniciar sesion.

**Rechazos:**

- **400:** campos faltantes, contrasena corta, nombre incompleto, rol invalido, empresa requerida.
- **401:** credenciales invalidas o token invalido/expirado.
- **403:** cuenta pendiente/rechazada o rol no autorizado.
- **409:** correo ya registrado.

**Base legal relacionada:** RLOPSRM art. 123 fr. III para identificacion de participantes en bitacora; RLOPSRM art. 43 y LOPSRM art. 74 Bis como soporte del padron y administracion de empresas.

## 4. Empresas, usuarios y padron

El sistema distingue la empresa de la persona. Una persona pertenece a una empresa, y el contrato guarda la empresa contratista y la empresa supervisora con la que se firma. El registro resuelve o crea empresas con normalizacion debil y fuerte para reducir duplicados: mayusculas/minusculas, espacios, acentos, puntuacion y sufijos de razon social. Las empresas auto-registradas nacen `por_validar` y la dependencia las valida.

**Endpoints funcionales:**

- Listar padron.
- Listar empresas por validar.
- Listar dependencias.
- Listar personas de una empresa.
- Validar empresa.
- Fusionar empresa duplicada.

**Validaciones confirmadas:**

- Tipo de empresa restringido a dependencia, contratista o supervision.
- Estado restringido a por validar o validada.
- Fusion de empresa exige empresa canonica distinta.
- Al fusionar se actualizan usuarios, contrato como contratista/supervision y roster antes de borrar la duplicada.

**Rechazos:**

- **400:** id invalido, canonica invalida o fusion consigo misma.
- **403:** operaciones administrativas del padron solo para dependencia.
- **404:** empresa o canonica inexistente.

**Base legal relacionada:** RLOPSRM art. 43 para padron y administracion de contratistas; LOPSRM art. 74 Bis como referencia de plataforma/registro.

## 5. Alta de contrato, catalogo y programa

El alta crea el contrato con folio, tipo, objeto, ubicacion, plazo, fechas, participantes, empresas, catalogo de conceptos, garantias, ciclo de estimacion, periodos, programa de obra y plan de amortizacion. El monto no se confia al cliente cuando hay catalogo: se deriva en el servidor con la suma de importes por concepto.

**Endpoints funcionales:**

- Crear contrato.
- Listar contratos.
- Consultar detalle de contrato.
- Consultar programa.
- Reemplazar programa.
- Consultar plan de amortizacion.
- Subir PDF firmado del contrato.
- Consultar metadatos del PDF.
- Descargar PDF.

**Validaciones confirmadas:**

- Folio, tipo, objeto, plazo y fecha de inicio son requeridos.
- Plazo entero mayor a cero.
- Fecha de inicio con formato ISO, ano razonable y no anterior a hoy con margen operativo de un dia.
- Fecha de termino se deriva del inicio mas plazo, no se toma del cliente.
- Folio y tipo tienen limites de longitud.
- Anticipo entre 0 y 100.
- Pena por atraso opcional entre 0 y 1.
- Catalogo con clave, concepto, unidad, cantidad mayor a cero y precio unitario mayor a cero.
- Clave de concepto obligatoria y unica dentro del contrato.
- Si no hay catalogo, se exige monto mayor a cero.
- Garantias incompletas se rechazan si traen datos parciales.
- Garantia no puede exceder monto del contrato.
- Vigencia de garantia no puede estar vencida.
- Programa de obra requiere ciclo mensual o quincenal y catalogo.
- Periodos se generan en servidor.
- Cada celda del programa debe referir clave y periodo validos.
- Cantidades de programa no pueden ser negativas.
- El programa debe cuadrar al 100% por concepto.
- El plan de amortizacion debe sumar exactamente el anticipo al centavo.
- En periodos con obra programada debe existir amortizacion y no puede superar el importe programado del periodo.
- El PDF del contrato es append-only por tipo; no se reemplaza.
- El PDF se valida por magic bytes `%PDF`.
- Solo el residente asignado sube el PDF.

**Rechazos:**

- **400:** campos faltantes, fechas invalidas, anticipo fuera de rango, catalogo invalido, programa invalido, garantia invalida, PDF no valido.
- **403:** usuario sin acceso o residente no asignado.
- **409:** folio duplicado, contrato sin periodos al editar programa, programa congelado por estimaciones, documento ya cargado.

**Base legal:**

- LOPSRM art. 46 fr. I, V, VI, VII, VIII, IX y X: contenido del contrato.
- RLOPSRM art. 45 ap. A fr. IX: catalogo, cantidades, precios unitarios e importes.
- RLOPSRM art. 45 ap. A fr. X y LOPSRM art. 52: programa de obra como base de medicion.
- LOPSRM art. 48 fr. I y II: garantias de anticipo y cumplimiento.
- LOPSRM art. 50 fr. II, IV y V: anticipo y autorizacion especial.
- RLOPSRM art. 138 parrafo 3 y art. 143 fr. I: aplicacion y amortizacion del anticipo.

## 6. Garantias, fianzas y endosos

El modulo administra polizas de anticipo, cumplimiento y vicios ocultos; permite registrar/editar polizas, cargar PDF y registrar endosos. Los endosos son append-only y la poliza es gestionable por dependencia o residente.

**Endpoints funcionales:**

- Listar garantias de contrato.
- Crear garantia.
- Editar garantia.
- Registrar endoso.
- Subir PDF de poliza.
- Descargar PDF de poliza.

**Validaciones confirmadas:**

- Tipo de garantia limitado a anticipo, cumplimiento o vicios ocultos.
- Tipo se normaliza a clave canonica para evitar duplicados por mayusculas o espacios.
- Una garantia por tipo y contrato.
- Monto mayor a cero.
- Monto no mayor al monto del contrato.
- Vigencia no vencida.
- Endoso con motivo limitado a ampliacion de monto, prorroga de vigencia, mixto u otro.
- Endoso por monto requiere nuevo monto mayor a cero.
- Endoso por prorroga requiere nueva vigencia.
- Endoso sin cambio de monto ni vigencia se rechaza.
- PDF de poliza debe ser PDF valido.
- Contrato cerrado queda solo lectura.

**Rechazos:**

- **400:** contrato/garantia invalida, tipo fuera de catalogo, monto invalido, vigencia vencida, PDF invalido, endoso sin datos.
- **403:** usuario sin autoridad para gestionar o sin acceso para consultar.
- **409:** garantia duplicada por tipo, contrato cerrado.

**Base legal:** LOPSRM art. 48 fr. I y II; LOPSRM art. 66 para vicios ocultos; RLOPSRM art. 91 y art. 98 para ajuste/ampliacion de garantias.

## 7. Bitacora, notas, firmas, minutas y visitas

La bitacora se abre por contrato. La apertura crea un acta inmutable con datos del contrato, sitio, partes, telefonos, domicilio, descripcion de trabajos, caracteristicas del sitio y firmantes. Tambien genera la nota numero 1 de apertura. La firma de apertura es individual por cada participante: residente, superintendente y supervision cuando existe.

Las notas tienen catalogo por rol, folio correlativo, estado, firmas, respuestas, anulacion con nota correctiva y vinculaciones. La emision exige bitacora abierta y apertura firmada por todos. Las notas de apertura, cierre/finiquito y algunas notas de consecuencia son generadas por el sistema, no a mano.

**Endpoints funcionales:**

- Abrir bitacora.
- Firmar apertura.
- Consultar pendientes por firmar.
- Consultar bitacora de contrato.
- Listar tipos de nota.
- Emitir nota.
- Listar notas.
- Anular nota.
- Vincular/responder nota.
- Firmar nota.
- Listar notas pendientes.
- Crear/listar minutas.
- Vincular minuta a nota.
- Subir/descargar PDF de minuta.
- Crear/listar visitas.
- Vincular visita a nota.

**Validaciones confirmadas:**

- Solo residente asignado abre bitacora.
- Se exige fecha de entrega del sitio.
- Plazo de firma entre 1 y 60 dias.
- Superintendente obligatorio para abrir.
- Una bitacora por contrato.
- Solo firmante puede firmar su apertura.
- No se puede firmar dos veces.
- No se emiten notas si la apertura no esta firmada por todos.
- Tipo, contenido y asunto de nota se validan por longitud y catalogo.
- Notas de apertura y finiquito no se anulan.
- Solo el emisor puede anular su nota.
- No se anula nota ya respondida o firmada por contraparte.
- Minuta exige titulo, fecha, lugar y participantes.
- Visita exige fecha programada, lugar, responsable y proposito.
- Nota vinculada a minuta/visita debe pertenecer al mismo contrato.
- Contrato cerrado bloquea nuevas notas, minutas y visitas.

**Rechazos:**

- **400:** ids invalidos, campos obligatorios faltantes, longitud excedida, nota ajena al contrato.
- **403:** no firmante, no participante, rol no autorizado, emisor incorrecto.
- **409:** bitacora duplicada, firma duplicada, apertura incompleta, contrato cerrado, nota ya anulada/respondida/firmada.

**Base legal:** LOPSRM art. 46 ultimo parrafo; LOPSRM art. 52 Bis; RLOPSRM arts. 122, 123 fr. III, V, VI y X; RLOPSRM art. 125.

## 8. Roster y sustitucion de personas

El contrato conserva un roster historico para residente, superintendente y supervision. Una sustitucion cierra la asignacion vigente, crea una nueva, actualiza el cache del contrato y genera nota de bitacora si la bitacora esta abierta; si la sustitucion ocurrio antes de abrirla, el asiento se difiere y se genera al abrir.

**Endpoints funcionales:**

- Consultar roster vigente e historico.
- Sustituir persona del roster.

**Validaciones confirmadas:**

- Rol sustituible limitado a residente, superintendente o supervision.
- Motivo obligatorio.
- Usuario nuevo debe existir, estar activo y tener rol compatible.
- Solo dependencia o residente asignado pueden sustituir.
- Contrato cerrado bloquea sustituciones.
- Si hay bitacora abierta, se exige que la persona saliente no tenga notas pendientes de firma.
- El sustituto no puede ser la misma persona.
- Para residente y superintendente, el sustituto debe pertenecer a la misma empresa que la persona saliente; supervision externa puede ser de otra empresa.

**Rechazos:**

- **400:** rol invalido, usuario invalido, motivo faltante, usuario inactivo o rol incompatible.
- **403:** usuario sin autoridad.
- **409:** contrato cerrado, bitacora pendiente para registrar, notas pendientes de firma, sustituto de empresa incorrecta, conflicto concurrente.

**Base legal:** RLOPSRM art. 125 fr. I inciso g; RLOPSRM art. 123 fr. III y VI.

## 9. Avance fisico, fotografias y alertas de atraso

El avance registra cantidades ejecutadas por concepto y periodo. Cada captura se liga a un periodo del programa, genera nota automatica de avance y alimenta curva, estimaciones y alertas. La foto de avance es opcional: si se sube, se guarda como JPEG/PNG en base de datos y se asocia al registro de avance.

**Endpoints funcionales:**

- Consultar trabajos/avance de contrato.
- Registrar avance.
- Corregir avance.
- Listar fotos de avance.
- Subir foto de avance.
- Descargar foto de avance.
- Eliminar foto de avance.
- Consultar resumen de atrasos.
- Consultar detalle de atrasos.
- Consultar atrasos de contrato.
- Asentar atraso en bitacora.

**Validaciones confirmadas:**

- Avance exige concepto, cantidad no negativa y periodo.
- Concepto debe existir y pertenecer al contrato.
- Usuario debe participar en el contrato.
- Contrato cerrado bloquea registro/correccion.
- Bitacora abierta obligatoria para registrar/corregir avance.
- Periodo debe existir.
- No se permite reportar avance de periodo futuro.
- Periodo cerrado se permite como registro tardio con aviso.
- El exceso contra el programa es aviso, no bloqueo.
- El bloqueo duro es no exceder cantidad contratada por concepto.
- La correccion no edita la fila: anula la entrada vigente y crea una nueva vinculada.
- Fotos validan JPEG/PNG y limite en ruta.
- El asiento de atraso exige deficit real, bitacora abierta y no duplicar atraso por concepto-periodo.

**Rechazos:**

- **400:** contrato/concepto/periodo/foto invalida.
- **403:** sin acceso al contrato.
- **409:** contrato cerrado, bitacora no abierta, periodo futuro, exceso de cantidad contratada, avance ya anulado/corregido, atraso inexistente o ya asentado.

**Base legal:** RLOPSRM art. 118; RLOPSRM art. 45 ap. A fr. X; LOPSRM art. 52; RLOPSRM art. 122; RLOPSRM art. 123 fr. II, III y VI; RLOPSRM art. 125; RLOPSRM art. 132 fr. IV.

## 10. Estimaciones, generadores y documento de estimacion

La integracion de estimacion la realiza el superintendente asignado. El servidor valida periodo, bitacora, PDF de contrato, autorizacion de anticipo cuando aplica, generadores, notas vinculadas, acumulados y reglas financieras. La caratula queda materializada e inmutable; los generadores guardan snapshot de precio unitario y cantidad acumulada anterior.

**Endpoints funcionales:**

- Preparar estimacion de contrato.
- Integrar estimacion.
- Consultar estimaciones de contrato.
- Consultar avance de contrato para estimacion.
- Consultar detalle de estimacion.
- Listar/subir/descargar/eliminar fotos de estimacion.
- Asignar nota a generador.

**Validaciones confirmadas:**

- Contrato, periodo inicio y periodo fin requeridos.
- Periodo no puede exceder un mes calendario.
- Periodo debe estar vencido; no se estima periodo abierto.
- Bitacora abierta obligatoria.
- Contrato cerrado bloquea nuevas estimaciones.
- Solo superintendente asignado integra.
- PDF firmado del contrato obligatorio para integrar.
- Anticipo mayor al umbral configurado exige PDF de autorizacion del titular.
- Deductivas no negativas.
- Al menos un generador con cantidad mayor a cero.
- No se repite concepto en una misma estimacion.
- Conceptos deben pertenecer al contrato.
- Notas vinculadas deben pertenecer a la bitacora del contrato.
- Acumulado estimado no puede exceder cantidad contratada.
- Si hay programa, acumulado estimado tampoco puede exceder lo planeado hasta el periodo.
- Periodos de estimacion no pueden solaparse con estimaciones no rechazadas.
- Deducciones no pueden dejar neto negativo.
- Foto de estimacion valida JPEG/PNG y puede asociarse a concepto/generador.

**Rechazos:**

- **400:** fechas invalidas, deductivas invalidas, generador invalido, concepto ajeno, nota ajena, neto negativo, archivo invalido.
- **403:** usuario no es superintendente asignado o no participa.
- **409:** bitacora no abierta, periodo no cerrado, contrato cerrado, PDF faltante, autorizacion de anticipo faltante, periodo solapado, excede contratado, excede programa.

**Base legal:** LOPSRM art. 54; RLOPSRM art. 118; RLOPSRM art. 132 fr. I, II, IV y V; RLOPSRM art. 143 fr. I; LFD art. 191; LOPSRM art. 46 Bis; RLOPSRM arts. 86-90.

## 11. Revision, autorizacion, rechazo y reingreso

La estimacion integrada se envia por el contratista; la supervision revisa, observa, turna o rechaza; la residencia autoriza o rechaza despues del turnado. El historial conserva todas las estimaciones, incluso rechazadas. El reingreso crea una nueva estimacion vinculada a la rechazada, copiando snapshots y caratula validada; no recalcula dinero ni reinicia automaticamente el plazo original.

**Endpoints funcionales:**

- Consultar historial de estimaciones.
- Enviar estimacion.
- Consultar revision de estimacion.
- Crear observacion.
- Eliminar observacion.
- Turnar estimacion.
- Autorizar estimacion.
- Rechazar estimacion.
- Reingresar estimacion rechazada.

**Validaciones confirmadas:**

- Solo superintendente asignado envia o reingresa.
- Envio solo desde estado integrada.
- Supervision asignada crea/elimina observaciones antes de turnar.
- Turnar exige observaciones o marca explicita de sin observaciones.
- Autorizar exige estado enviada y turnado a residencia.
- Residencia autoriza; supervision puede rechazar directo sin turnar.
- Residencia rechaza solo si hubo turnado previo.
- Rechazo exige motivo.
- Reingreso exige confirmacion de atencion de observaciones.
- Solo se reingresa una estimacion en estado rechazada.
- Una estimacion rechazada solo puede tener un reingreso.
- Contrato cerrado bloquea observaciones, turnado, autorizacion, rechazo y reingreso.

**Rechazos:**

- **400:** id invalido, observacion incompleta, motivo faltante, confirmacion faltante.
- **403:** actor no asignado al contrato.
- **409:** estado no compatible, falta turnado, ya resuelta, ya reingresada, contrato cerrado.

**Base legal:** LOPSRM art. 54; RLOPSRM art. 113 fr. IX; RLOPSRM art. 114; RLOPSRM art. 115 fr. X; RLOPSRM art. 133.

## 12. Convenios modificatorios y versiones de programa

El modulo registra convenios de monto, plazo o programa. El sistema clasifica variaciones, distingue conceptos adicionales, permite ampliacion de conceptos heredando el precio unitario original, versiona el programa y exige oficio/soporte PDF antes de autorizar el convenio.

**Endpoints funcionales:**

- Listar convenios de contrato.
- Crear convenio.
- Consultar detalle de version de programa.
- Autorizar convenio.
- Subir oficio de convenio.
- Descargar oficio de convenio.

**Validaciones confirmadas:**

- Convenio requiere motivo.
- Usuario debe tener acceso y autoridad.
- Contrato cerrado bloquea registro y autorizacion.
- Monto se recalcula desde catalogo vivo con `SUMA(ROUND(cantidad * precio_unitario, 2))`.
- Concepto original queda congelado.
- Concepto adicional se marca como adicional.
- Ampliacion de concepto debe heredar precio unitario del original.
- Concepto adicional no puede programarse en periodo ya cerrado.
- Programa se re-cuadra al 100% usando la misma regla del programa.
- Variacion mayor a umbral configurado genera aviso, no bloqueo.
- Autorizacion formal solo por dependencia.
- Autorizacion exige oficio/soporte PDF cargado.
- Oficio de convenio es append-only: un PDF por convenio.

**Rechazos:**

- **400:** convenio invalido, monto desbordado, programa descuadrado, concepto o periodo inexistente, PDF no valido.
- **403:** usuario sin acceso o sin autoridad.
- **409:** contrato cerrado, programa congelado indebido, adicional en periodo cerrado, convenio ya autorizado, oficio faltante, oficio duplicado.

**Base legal:** LOPSRM art. 59; LOPSRM art. 59 Bis como referencia de clasificacion; RLOPSRM art. 99; RLOPSRM art. 102; RLOPSRM art. 45 ap. A fr. IX y X; LOPSRM art. 52.

## 13. Transito a pago, presupuesto y registro de pago

El cobro lo promueve el contratista despues de la autorizacion. El sistema revisa suficiencia presupuestal por dependencia y ejercicio, soportes, factura/CFDI, fianza de cumplimiento, plazo legal de pago y cola para finanzas. Finanzas registra el pago exacto del neto de la estimacion autorizada.

**Endpoints funcionales:**

- Consultar estado de transito de una estimacion.
- Cargar soporte metadata.
- Subir archivo PDF de cobro.
- Listar archivos de cobro.
- Descargar archivo de cobro.
- Generar instruccion de pago.
- Consultar presupuesto.
- Crear/actualizar presupuesto.
- Consultar cola de cobro.
- Consultar estimaciones por cobrar.
- Registrar pago.
- Listar pagos de contrato.

**Validaciones confirmadas:**

- Solo contratista promueve cobro y sube CFDI/oficio.
- Finanzas consulta cola y registra pago.
- Estimacion debe estar autorizada para generar instruccion.
- Contrato cerrado bloquea soportes, instrucciones y pagos nuevos.
- Factura, CFDI con folio y fianza de cumplimiento vigente forman checklist de soportes.
- Presupuesto se calcula por dependencia, ejercicio y partida.
- Presupuesto requiere partida especifica, dependencia valida y techo no negativo.
- Instruccion bloquea si no hay dependencia FK, no hay techo o el neto excede disponible.
- Transaccion bloquea filas de presupuesto para evitar doble compromiso.
- Archivo de cobro debe ser PDF.
- Pago exige contrato, estimacion, fecha de pago, referencia numerica SPEI, folio fiscal y fecha de factura.
- Fecha de factura no puede ser futura.
- Pago solo procede sobre estimacion autorizada.
- No se paga estimacion rechazada o ya pagada.
- Una estimacion tiene un solo pago.
- No se paga sin avance fisico registrado.
- No se paga si falta CFDI PDF de cobro.
- Fecha de pago no puede ser anterior a la integracion de la estimacion.
- Al pagar, la estimacion pasa a pagada y la instruccion emitida pasa a cumplida.

**Rechazos:**

- **400:** datos de pago invalidos, SPEI no numerico, fecha invalida, presupuesto invalido, PDF invalido.
- **403:** rol incorrecto o sin acceso.
- **409:** contrato cerrado, estimacion no autorizada, soportes incompletos, sin presupuesto, presupuesto insuficiente, instruccion duplicada, pago duplicado, sin avance fisico, CFDI faltante.

**Base legal:** LOPSRM art. 24; LOPSRM art. 54; LOPSRM art. 55; LOPSRM art. 48 fr. II; LOPSRM art. 64.

## 14. Expediente, tablero y portafolio ejecutivo

El expediente consolida datos del contrato, catalogo, programa, garantias, bitacora, avance, estimaciones, convenios, pagos y finiquito. El tablero de estimaciones muestra estado operativo del flujo de cobro y el portafolio resume riesgos ejecutivos por avance, plazo, pago y cierre.

**Endpoints funcionales:**

- Consultar detalle de contrato/expediente.
- Consultar observaciones del contrato.
- Consultar tablero de estimaciones.
- Consultar portafolio ejecutivo.
- Exportar/reportar informacion desde el cliente.

**Validaciones confirmadas:**

- Lectura acotada por participacion.
- Finanzas no accede al tablero de estimaciones operativo.
- Portafolio usa umbrales centralizados: avance vs programado y dias vencidos.
- Contrato cerrado se trata como caso neutro para no marcar atraso operativo despues del finiquito.
- Reportes y vistas no deben contar estimaciones rechazadas para avance financiero.

**Rechazos:**

- **403:** rol no autorizado o sin participacion.
- **404:** contrato inexistente.

**Base legal:** LOPSRM art. 52; LOPSRM art. 54; LOPSRM art. 64; RLOPSRM art. 143 fr. I.

## 15. Finiquito y cierre

El finiquito prepara el saldo, asienta una nota de bitacora y marca el contrato como cerrado. Desde ese momento el contrato queda practicamente solo lectura: se bloquean nuevas estimaciones, pagos, instrucciones, convenios, garantias, notas, minutas, visitas, sustituciones y avances.

**Endpoints funcionales:**

- Preparar finiquito.
- Cerrar contrato con finiquito.

**Validaciones confirmadas:**

- Acceso por participacion y empresa de dependencia.
- Autoridad de cierre: dependencia o residente/creador.
- Un solo finiquito por contrato.
- Contrato ya cerrado no se vuelve a cerrar.
- Bitacora abierta obligatoria porque el finiquito se asienta como nota.
- Saldo se calcula en servidor desde estimaciones autorizadas/pagadas, pagos, anticipo no amortizado y ajustes finales.
- Finiquito es append-only.

**Rechazos:**

- **400:** contrato invalido.
- **403:** usuario sin autoridad.
- **409:** contrato ya cerrado, finiquito existente, bitacora faltante.

**Base legal:** LOPSRM art. 64; RLOPSRM arts. 168, 170, 171 y 172.

## 16. Reglas matematicas de cuadre

### Monto del contrato y del convenio

```text
monto = SUMA(ROUND(cantidad * precio_unitario, 2))
```

Base legal: RLOPSRM art. 45 ap. A fr. IX.

### Programa al 100%

```text
SUMA(cantidad_programada_por_periodo_del_concepto) = cantidad_contratada_del_concepto
```

Base legal: RLOPSRM art. 45 ap. A fr. X y LOPSRM art. 52.

### Periodos de estimacion

```text
periodo_fin <= periodo_inicio + 1 mes calendario
periodo_fin < fecha_actual
```

Base legal: LOPSRM art. 54.

### Subtotal de estimacion

```text
subtotal = SUMA(ROUND(cantidad_periodo * precio_unitario_snapshot, 2))
```

Base legal: RLOPSRM art. 132 fr. V y RLOPSRM art. 128 como soporte de integracion de importes.

### Amortizacion proporcional

```text
amortizacion = ROUND(subtotal * porcentaje_anticipo / 100, 2)
```

Base legal: RLOPSRM art. 143 fr. I.

### Cinco al millar

```text
retencion_5_al_millar = ROUND(subtotal * 0.005, 2)
```

Base legal: LFD art. 191.

### Retencion por atraso

```text
si hay pena pactada y ejecutado_acumulado_con_estimacion < programado_acumulado:
  retencion_atraso = ROUND(subtotal * pena_convencional_pct, 2)
si no:
  retencion_atraso = 0
```

Base legal: LOPSRM art. 46 Bis y RLOPSRM arts. 86-90. La forma exacta de disparo es criterio parametrizable del sistema.

### Neto de caratula sin IVA

```text
neto_sin_iva = subtotal - amortizacion - retencion_5_al_millar - deductivas - retencion_atraso
```

El servidor guarda la caratula sin IVA. El documento visual de estimacion deriva el IVA solo en la seccion 3:

```text
iva_estimacion = ROUND(subtotal * 0.16, 2)
iva_amortizacion = ROUND(amortizacion * 0.16, 2)
neto_a_recibir_con_iva =
  (subtotal + iva_estimacion)
  - (amortizacion + iva_amortizacion)
  - retencion_5_al_millar
  - retencion_atraso
  - deductivas
```

Base legal aplicada en el documento: RLOPSRM art. 2 fr. XIX para importes de obra sin IVA; IVA 16% en presentacion del neto a recibir.

### Finiquito

```text
anticipo_contrato = ROUND(monto_contrato * anticipo_pct / 100, 2)
anticipo_no_amortizado = MAX(0, anticipo_contrato - SUMA(amortizacion_aplicada))
saldo =
  SUMA(neto_estimaciones_autorizadas_o_pagadas)
  - SUMA(pagos)
  - anticipo_no_amortizado
  - ajustes_finales
```

Base legal: LOPSRM art. 64; RLOPSRM arts. 170 y 171; RLOPSRM art. 143 para anticipo no amortizado.

## 17. Evolucion tecnica reciente

Durante junio el sistema evoluciono en puntos tecnicos concretos:

- Pasamos de captura libre de contratista/dependencia a seleccion de personas registradas y empresas vinculadas.
- Separamos empresa de persona: el contrato guarda empresa contratista y empresa de supervision, y la persona queda como responsable.
- Agregamos validacion de empresa distinta para supervision externa cuando corresponde.
- Agregamos sesion unica por usuario mediante `token_version`.
- Endurecimos el alta con fecha de inicio no pasada en servidor.
- Cambiamos el programa a matriz concepto-periodo con cuadre 100%.
- Agregamos plan de amortizacion por periodo ligado al anticipo.
- Exigimos PDF firmado antes de integrar estimaciones.
- Exigimos autorizacion PDF cuando el anticipo supera el umbral configurado.
- Reforzamos bitacora abierta como precondicion de avance, estimacion y asientos de atraso.
- Vinculamos notas con generadores de estimacion.
- Agregamos registro fotografico por generador y por avance; la foto de avance quedo opcional.
- Separamos avance fisico reportado de avance estimado/cobrado.
- Agregamos retencion por atraso y avance fisico/financiero en estimacion.
- Cambiamos el cobro para que lo promueva el contratista y Finanzas lo revise/pague.
- Agregamos soportes PDF de cobro en base de datos.
- Cerramos la instruccion de pago al registrar el pago.
- Agregamos bloqueo transversal de contrato cerrado.
- Agregamos versionamiento de programa por convenio.
- Agregamos autorizacion formal de convenio con oficio PDF.
- Agregamos finiquito con nota de bitacora y cierre del contrato.

## 18. Criterios configurables o no legales

El codigo confirma que algunos valores son criterios de sistema, no mandatos numericos de la ley:

- Umbral de aviso de variacion en convenios: configurable; el convenio no se bloquea por superar 25%, solo se marca aviso.
- Umbrales de semaforo de portafolio: avance mayor o igual a 95%, ambar 85-95%, rojo menor a 85%; dias vencidos 0, 1-10 y mayor a 10.
- Retencion por atraso: el disparo implementado es global por valor contra programa acumulado; la tasa viene del contrato.
- Ajustes finales de finiquito: parametrizables, por defecto 0.
- El texto de atencion a observaciones en reingreso se trata como confirmacion operativa; no se persiste como campo documental independiente.
