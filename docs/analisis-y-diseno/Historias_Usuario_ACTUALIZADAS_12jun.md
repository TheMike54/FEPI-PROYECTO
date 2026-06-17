# SIGECOP — Historias de Usuario ACTUALIZADAS (12-jun-2026)

> **Reemplaza** (no borra) a `Historias_Usuario.xlsx` como la versión que refleja lo que el sistema
> **HACE HOY**. El xlsx original queda intacto. Cada criterio se leyó del comportamiento real de la
> aplicación (lo que el usuario ve y hace en pantalla).
>
> **Lenguaje:** estas historias están redactadas en lenguaje natural para leerse en voz alta durante la
> revisión. La **evidencia técnica detallada** (archivo, línea, nombre de función, ruta, etc.) NO se
> perdió: vive en `AUDITORIA_COHERENCIA_HU.md`, que sirve de trazabilidad para quien necesite verificar
> dónde está cada regla en el código.
>
> **Reglas respetadas:** los números HU-00..HU-21 y las historias Registro/Por Firmar **conservan su
> identidad**. Las funcionalidades construidas **sin ficha** reciben el siguiente número libre:
> **HU-22** (sustitución de personas/roster) y **HU-23** (catálogo de empresas).
>
> **Roles del sistema:** Residente de obra · Contratista / Superintendente · Supervisión ·
> Dependencia / Contratante · Finanzas. En cada historia se indica quién **ejecuta** (hace la acción),
> quién **consulta** (solo lee) y a quién **no le aparece** la pantalla.

---

## Índice

| ID | Título | Quién ejecuta |
|---|---|---|
| HU-00 | Inicio de sesión | Cualquier rol con cuenta activa (transversal) |
| HU-01 | Alta de contratos | Residente de obra |
| HU-02 | Registro de fianzas y garantías | Dependencia / Contratante |
| HU-03 | Trámite y aplicación de convenios modificatorios | Dependencia / Contratante |
| HU-04 | Consulta integrada del expediente contractual | Residente de obra |
| HU-05 | Programa y curva de avance | Residente de obra |
| HU-06 | Registro de trabajos terminados por periodo | Contratista / Superintendente |
| HU-07 | Alertas de atraso por concepto | Residente de obra |
| HU-08 | Apertura formal de la bitácora del contrato | Residente de obra |
| HU-09 | Emisión y respuesta de notas tipificadas con firma | Residente, Contratista y Supervisión |
| HU-10 | Consulta y búsqueda de notas de bitácora | Residente de obra |
| HU-11 | Minutas, visitas y acuerdos | Residente de obra |
| HU-12 | Apertura del periodo e integración de la estimación | Contratista / Superintendente |
| HU-13 | Envío / presentación de la estimación | Contratista / Superintendente |
| HU-14 | Historial de estimaciones del contrato | Residente de obra |
| HU-15 | Recepción, revisión técnica y autorización de la estimación | Residente y Supervisión |
| HU-16 | Reingreso de estimación tras rechazo | Contratista / Superintendente |
| HU-17 | Tablero de estimaciones aceptadas y en proceso | Residente de obra |
| HU-18 | Portafolio ejecutivo con semáforos | Dependencia / Contratante |
| HU-19 | Exportación de los 7 reportes definidos del contrato | Residente de obra |
| HU-20 | Tránsito a pago: soportes y suficiencia presupuestal | Contratista y Finanzas |
| HU-21 | Registro del pago efectuado | Finanzas |
| Registro | Registro de usuario con aprobación | Cualquier persona (público); la Dependencia aprueba |
| Por Firmar | Firma de aperturas de bitácora pendientes | Quien tiene aperturas pendientes de firmar |
| HU-22 | Sustitución de personas del roster | Dependencia y Residente de obra |
| HU-23 | Catálogo de empresas | Todos (funcionalidad de implementación, sin permiso por rol) |
| HU-24 | Finiquito y cierre del contrato | Dependencia / Contratante y Residente de obra |

---

## HU-00 · Inicio de sesión

**Quién ve y quién hace:** Esta pantalla es **transversal**: cualquier persona con cuenta activa entra por
la misma puerta, sin importar su rol (Residente de obra, Contratista / Superintendente, Supervisión,
Dependencia / Contratante o Finanzas). El usuario **no elige su rol** al entrar: el sistema lo toma de su
cuenta. A partir de ahí, el rol decide qué pantallas le aparecen en el resto del sistema.

**Historia:**
- **Como** usuario registrado y aprobado del sistema (Residente, Contratista / Superintendente,
  Supervisión, Dependencia o Finanzas)
- **Deseo** iniciar sesión con mi correo y mi contraseña (sin tener que elegir mi rol), de modo que el
  sistema reconozca por sí mismo quién soy, mantenga mi sesión abierta y me muestre solo las pantallas y
  opciones que mi rol permite
- **A fin de** proteger la información del contrato y que cada acción formal quede asociada a mi identidad
  y a la fecha y hora reales, no a lo que yo escriba

**Criterios de aceptación:**
1. Si el usuario deja vacío el correo o la contraseña, o si el correo no existe o la contraseña no
   coincide, el sistema no lo deja entrar y le muestra el aviso "Credenciales inválidas" sin abrir la
   sesión.
2. Si la cuenta existe pero todavía no está activa, el sistema impide el acceso y avisa de forma distinta
   según el caso: "pendiente de aprobación por la dependencia" o "tu solicitud fue rechazada". Las altas
   nuevas no entran hasta que la Dependencia las aprueba.
3. El rol no se selecciona al entrar: lo toma el sistema de la cuenta y con él decide a qué pantallas tiene
   acceso la persona. El sistema bloquea por igual el menú y el intento de entrar por enlace directo a una
   pantalla que no le corresponde a ese rol.
4. Tras entrar bien, la sesión se conserva aunque se refresque la página; "Salir" la cierra. La sesión
   caduca sola tras un tiempo (8 horas por defecto) y obliga a volver a iniciar sesión.
5. Toda acción formal (por ejemplo, una nota de bitácora) registra como autor a quien inició sesión y con
   la fecha y hora reales del servidor, nunca con datos enviados desde la pantalla.

**Fundamento legal:** art. 123 RLOPSRM (el nombre completo del actor debe quedar asentado; por eso el
registro exige nombre + apellido[s]).

**Pendientes / [validar profe]:**
- La ficha vieja pedía "no permite continuar con campos vacíos": hoy ese bloqueo lo hace el servidor.
  Decidir si se quiere además un candado visible en la pantalla (campos obligatorios / botón deshabilitado)
  o se acepta el comportamiento actual. [validar profe/Maiki]
- El registro guarda el correo en minúsculas, pero al iniciar sesión se busca tal cual se teclea. Confirmar
  si el inicio de sesión debe ignorar mayúsculas/minúsculas para evitar fallos. [validar Maiki]
- Confirmar que Finanzas no requiere reglas extra de acceso más allá de las del flujo. [validar profe]

---

## HU-01 · Alta de contratos

**Quién ve y quién hace:** El **Residente de obra** da de alta el contrato. El Contratista /
Superintendente, la Supervisión y la Dependencia solo lo **consultan**. Finanzas **no tiene acceso** a esta
pantalla.

**Historia:**
- **Como** Residente de obra
- **Deseo** dar de alta un contrato en un asistente de 7 pasos (datos generales; catálogo de conceptos;
  programa de obra como matriz concepto × periodo; datos jurídicos; garantías, penalizaciones y % de
  anticipo; plan de amortización del anticipo; y el PDF firmado), donde el monto se calcula solo a partir
  del catálogo y casi todo se valida en pantalla y se vuelve a verificar al guardar, todo de una sola vez
- **A fin de** tener el expediente del contrato en línea, íntegro y consultable solo por los actores que
  son parte del contrato

**Criterios de aceptación:**
1. El alta guarda el contrato completo de una sola vez (todo o nada): cabecera más sus bloques (conceptos,
   programa de obra, garantías, plan de amortización y el equipo inicial). El folio es único: si se repite,
   el sistema lo rechaza. Solo el Residente de obra puede crear contratos.
2. El monto del contrato no se teclea: el sistema lo calcula sumando cantidad × precio unitario de cada
   concepto del catálogo (sin IVA), cuadrando exacto al centavo. Cada concepto exige una clave única que
   captura el usuario, descripción, unidad, cantidad mayor a cero y precio unitario mayor a cero. Si es a
   precio alzado (sin catálogo), el monto se captura a mano (mayor a cero).
3. La fecha de término la calcula el sistema a partir del inicio y el plazo (no se confía en lo que mande
   la pantalla). El programa de obra es una matriz concepto × periodo (mensual o quincenal) cuyos periodos
   genera el sistema; cada concepto debe sumar exactamente lo contratado (cuadre al 100%) y nada queda
   fuera del plazo.
4. El equipo se liga a cuentas reales validadas por rol y estado: superintendente (cuenta de contratista
   aprobada, obligatorio) y dependencia (cuenta de dependencia aprobada, obligatorio); la supervisión es
   opcional. Las garantías obligatorias se exigen: cumplimiento siempre, y anticipo si el % de anticipo es
   mayor a cero, cada una con monto mayor a cero, sin pasar del monto del contrato y con vigencia no
   vencida.
5. El PDF firmado del contrato es obligatorio para registrar y, una vez subido, ya no se reemplaza (queda
   inmutable); solo lo sube el residente asignado y solo lo consultan los actores que son parte. Si el
   anticipo supera el 30%, se exige además un segundo PDF de autorización del anticipo (umbral a validar
   con el profe). Con anticipo mayor a cero se captura un plan de amortización por periodo que (a) suma
   exactamente el anticipo al centavo (art. 138 párr. 3 RLOPSRM) y (b) **se liga al programa de obra (art.
   143 fr. I RLOPSRM): ningún periodo amortiza más que su importe programado y todo periodo con obra
   programada amortiza algo** (rechaza el plan que deja todo al último periodo). El plan se precarga
   proporcional al programa y se valida en pantalla y al guardar.

**Fundamento legal:** art. 45 fr. IX RLOPSRM (el catálogo con sus importes ES el presupuesto: monto
derivado); art. 45 ap. A fr. X RLOPSRM (programa de obra conforme al catálogo, del total de los conceptos);
art. 52 LOPSRM (programa como base para medir el avance / cuadre 100%); art. 54 LOPSRM (ciclo de estimación
/ periodos); art. 118 RLOPSRM (lo planeado por concepto no excede lo contratado); art. 50 fr. IV LOPSRM
(anticipo sobre el umbral requiere autorización escrita del titular); art. 139 RLOPSRM (anticipo mayor al
50% se informa a la SFP); art. 50 fr. V LOPSRM (anticipo 100% solo en plurianual que inicia en el último
trimestre); art. 138 párr. 3 RLOPSRM (programa/forma de aplicación del anticipo = el plan; el plan suma el
anticipo) y art. 143 fr. I RLOPSRM (amortización proporcional del anticipo, ligada al programa; saldo a la
estimación final, art. 143 fr. III-d); art. 138 y 139 RLOPSRM (penas convencionales por atraso); art. 191
LFD (retención del 5 al millar, citada en la vista); art. 47 y art. 48 fr. I y II LOPSRM (fianzas de
anticipo y cumplimiento obligatorias); art. 46 fr. I y IV LOPSRM y art. 61 RLOPSRM (datos jurídicos:
firmante de la dependencia y representante legal del contratista); art. 123 RLOPSRM (la dependencia no firma
la bitácora → no entra al equipo firmante); art. 125 RLOPSRM (histórico de personas / sustituir-no-borrar,
sembrado desde el alta).

**Pendientes / [validar profe]:**
- El umbral del 30% que dispara el PDF de autorización del anticipo: el valor exacto y su fundamento están
  marcados [validar profe] (la exigencia de autorización escrita se apoya en art. 50 fr. IV LOPSRM, pero el
  30 no se asume de la ley).
- El plan de amortización es editable y se guarda, pero la carátula de la estimación todavía amortiza de
  forma proporcional al avance, no según el plan capturado: 'Fase B pendiente de validar con el profe'.
  También [validar profe]: si debe exigirse proporcionalidad estricta (art. 143 fr. I) en lugar de la banda
  editable actual.
- La cédula profesional como dato jurídico obligatorio se exige por decisión de la Fundación [validar con
  el profe].
- El fundamento de exigir el PDF firmado para que el contrato se formalice lo confirma el profe; el sistema
  no asume número de artículo para esa regla.
- El % de pena por atraso y su tasa están marcados [validar tasa con el profe].
- La ficha vieja mencionaba 'penalizaciones aplicables' como bloque: hoy se reduce a un % de pena por
  atraso opcional más avisos en la vista (5 al millar art. 191 LFD, deductivas art. 46 Bis); no hay un
  editor de penalizaciones por concepto.

---

## HU-02 · Registro de fianzas y garantías

**Quién ve y quién hace:** La **Dependencia / Contratante** captura y edita las fianzas. El Residente de
obra y Finanzas solo **consultan**. El Contratista / Superintendente y la Supervisión **no tienen acceso**.

**Historia:**
- **Como** Dependencia / Contratante (el Residente y Finanzas solo consultan; Contratista y Supervisión sin
  acceso)
- **Deseo** capturar y editar en una pantalla las pólizas de fianza del contrato (tipo, afianzadora, número
  de póliza, monto, fecha de emisión y de vencimiento, y el nombre del archivo PDF), y ver para cada una un
  distintivo de color y unos contadores según los días que faltan para su vencimiento
- **A fin de** tener a la vista y gestionar el estado de vigencia de las garantías del contrato

**Estado:** ✅ **Funcional** (sesión E2 18-jun): la pantalla está cableada al backend real, sobre el contrato
que se elige; ya no es maqueta.

**Criterios de aceptación:**
1. La pantalla lista las pólizas del contrato con tipo, afianzadora, número de póliza, monto y fecha de
   vencimiento, y permite agregar o editar pólizas. Los cambios se guardan en el sistema. Hay **una garantía
   por tipo** (anticipo, cumplimiento, vicios ocultos): intentar crear una segunda del mismo tipo se rechaza
   (se edita la existente).
2. Cada fila muestra un distintivo de color según los días que faltan para vencer, con cortes fijos: rojo
   si está vencida o faltan 5 días o menos, ámbar a 15 días o menos, amarillo a 30 días o menos, verde a
   más de 30. Arriba se muestran tarjetas con el conteo de pólizas por vencer en 5/15/30 días. No se envía
   ninguna alerta ni hay umbral configurable.
3. El botón 'Ver PDF' abre el **documento PDF real** de la póliza (el archivo se sube y se guarda en el
   sistema). Cada garantía admite **endosos** (ajustes por ampliación de monto o prórroga de vigencia), que
   quedan registrados sin alterar la garantía original.
4. Solo la Dependencia ve los botones de agregar y editar; el Residente y Finanzas ven la pantalla en
   solo-consulta; el Contratista y la Supervisión no tienen acceso.
5. Las garantías capturadas en el alta del contrato (HU-01) y las que se agregan aquí son las mismas: esta
   pantalla las gestiona (lee, agrega, edita, endosa) y se muestran de solo-lectura en el expediente (HU-04).

**Fundamento legal:** art. 48 LOPSRM (qué se garantiza: el anticipo —fr. I— y el cumplimiento del contrato
—fr. II—, dentro de los 15 días naturales del fallo); art. 66 LOPSRM (garantía por defectos y vicios ocultos);
art. 98 RLOPSRM (forma de la fianza y previsiones mínimas de la póliza); art. 91 RLOPSRM (garantía de
cumplimiento de al menos el 10% del monto y su **ajuste/ampliación** por modificación de monto o plazo, que
es el **endoso**).

**Pendientes / [validar profe]:**
- Emisión real de alertas de vencimiento (30/15/5 días) por un canal (correo/notificación): hoy son
  distintivos y contadores en pantalla con cortes fijos; no hay motor de notificación. **[sin base legal —
  criterio del profe; default conservador: no se notifica, solo se muestra]**.
- Vincular el endoso al convenio modificatorio que lo origina (el sistema ya permite vincularlo
  internamente): hoy el endoso se registra suelto. Mejora opcional [validar Maiki].

---

## HU-03 · Trámite y aplicación de convenios modificatorios

**Quién ve y quién hace:** La **Dependencia / Contratante** registra los convenios. El Residente de obra,
el Contratista / Superintendente y la Supervisión solo **consultan**. Finanzas **no tiene acceso**. En la
práctica el sistema también deja registrar al residente asignado al contrato o a quien lo creó; cualquier
otro rol que intente registrar recibe un aviso de acceso denegado.

**Historia:**
- **Como** Dependencia / Contratante (o el residente asignado / quien creó el contrato)
- **Deseo** registrar un convenio modificatorio del contrato de tipo monto, plazo, programa o mixto:
  capturo el tipo, el motivo (dictamen técnico) y, según el tipo, el catálogo y el programa nuevos
  completos (el sistema calcula el monto solo, no lo tecleo) o el nuevo plazo; al registrarlo, si toca el
  programa el sistema guarda una versión nueva inmutable y deja la anterior como sustituida, ajusta el
  monto y el plazo vigentes del contrato, asienta una nota automática en la bitácora y marca cuándo la
  variación exige revisión de la SFP (más del 25%) o da derecho a ajuste de costos (más del 50%)
- **A fin de** documentar formalmente los cambios al contrato conforme al art. 59 LOPSRM (y dejar visible
  el derecho del art. 59 Bis cuando aplica), preservar el histórico inmutable de versiones del programa y
  poder consultar qué cambió, cuándo, por quién y por qué

**Criterios de aceptación:**
1. Solo la Dependencia, el residente asignado o quien creó el contrato puede registrar convenios; las demás
   partes solo consultan. Cualquier otro rol que lo intente recibe un aviso de acceso denegado.
2. Al registrar un convenio que toca el programa (monto/programa/mixto), el sistema guarda una versión
   nueva e inmutable del programa, la marca como vigente y deja la anterior como sustituida sin alterarla.
   Un convenio de plazo puro actualiza el plazo y la fecha de término del contrato, pero no crea una nueva
   versión del programa.
3. El monto y los porcentajes de variación los calcula el sistema (suma de cantidad × precio unitario, al
   centavo); el usuario nunca teclea el monto. El sistema rechaza el convenio si el catálogo nuevo no
   incluye todos los conceptos, tiene claves repetidas, descuadra el programa o reduce un concepto por
   debajo de lo ya estimado (art. 118 RLOPSRM). Si la variación de monto o plazo supera el límite
   configurable (25% por defecto), el sistema **avisa, no bloquea**: registra el convenio y marca el aviso de
   variación (referido al art. 59 LOPSRM; el 25% es referencia administrativa de revisión, art. 102 RLOPSRM).
4. Cada convenio queda guardado de forma inmutable con folio (capturado o asignado), tipo, motivo/dictamen
   (art. 99 RLOPSRM), fecha y hora, autor (tomado de la sesión) y las marcas de "requiere revisión de la
   SFP" (más del 25%, art. 102 RLOPSRM) y "requiere ajuste de costos" (más del 50%, art. 59 Bis); no se
   edita ni se anula (corregir = convenio nuevo).
5. Al registrar el convenio se asienta una nota automática en la bitácora del contrato (de inmediato si
   está abierta, diferida si todavía no); las versiones del programa se pueden consultar revisando su
   contenido concepto × periodo.

**Fundamento legal:** art. 59 LOPSRM; art. 59 Bis LOPSRM; art. 99 RLOPSRM; art. 102 RLOPSRM; art. 118
RLOPSRM; art. 123 fr. III RLOPSRM; art. 45 fr. IX RLOPSRM.

**Pendientes / [validar profe]:**
- Endosos de fianzas: la ficha vieja pedía que el modificatorio aplicara y registrara los endosos de las
  fianzas; HU-03 no lo construye. La base lo contempla pero no genera el endoso automático al registrar el
  convenio. Validar si HU-03 debe disparar el endoso o si queda como integración futura HU-02 ↔ HU-03.
- Fundamento art. 59 vs art. 59 Bis: el sistema funda siempre el convenio en el art. 59 y trata el 59 Bis
  como derecho adicional (una marca), no como régimen alternativo. La ficha pedía 'indicar si se rige por
  59 o 59 Bis'. Confirmar que la interpretación de marca (no de cambio de fundamento) es la correcta.
- Autoridad que registra: hoy pueden registrar la Dependencia, el residente o el creador del contrato, pero
  el menú solo da el botón a la Dependencia. Confirmar el conjunto exacto de roles autorizados [validar con
  el profe].
- Emisor de la nota automática de bitácora = residente del contrato [validar profe].
- ✅ **RESUELTO (criterio del equipo, 18-jun):** superar el 25% del monto/plazo **avisa, no bloquea** — el
  convenio se registra con su aviso de variación (art. 59 referido). El 25% es **configuración**, no un tope
  legal del art. 59 (que tras la reforma DOF 14-11-2025 no fija tope numérico; es referencia administrativa
  RLOPSRM art. 102); el valor exacto sigue siendo ajustable y a confirmar con el profe.
- Al cambiar el plazo, hoy el convenio conserva los periodos vigentes (no los recalcula); follow-on
  declarado.

---

## HU-04 · Consulta integrada del expediente contractual

**Quién ve y quién hace:** El **Residente de obra** consulta el expediente como ejecutor. El Contratista /
Superintendente, la Supervisión y la Dependencia también lo **consultan** (solo-lectura). Finanzas **no
tiene acceso**. Además, el sistema solo deja entrar a quien es parte o supervisión de ese contrato; a
cualquier otro le niega el acceso.

**Historia:**
- **Como** Residente de obra (ejecuta); el Contratista, la Supervisión y la Dependencia consultan en
  solo-lectura; Finanzas sin acceso
- **Deseo** consultar en una sola vista el expediente completo del contrato, integrado en 9 bloques
  (configuración con superintendente vigente, catálogo de conceptos, programa de obra, fianzas, plan de
  amortización del anticipo, documentos jurídicos, equipo/sustituciones de personas, convenios
  modificatorios y resumen de estimaciones), con un buscador y la opción de exportar todo el expediente a
  un solo PDF
- **A fin de** obtener toda la información del contrato sin entrar a cada módulo, y poder imprimir o
  exportar un documento consolidado del expediente

**Criterios de aceptación:**
1. El expediente carga al seleccionar un contrato y muestra en una sola vista los 9 bloques (configuración,
   catálogo, programa, fianzas, plan de amortización, jurídicos, equipo/sustituciones, convenios y resumen
   de estimaciones); el acceso está limitado a quien es parte o supervisión del contrato, y Finanzas no ve
   la pantalla.
2. El bloque de configuración muestra el superintendente vigente tomado del equipo del contrato (art. 125),
   con respaldo al dato del alta si hiciera falta.
3. El buscador filtra los bloques por dos campos: **tipo de documento** y **periodo** (se quitaron los
   filtros de folio, contratista, empresa y objeto porque, dentro de un mismo contrato, no aportan). Los
   bloques que no coinciden se ocultan solo en pantalla, no en el PDF.
4. El expediente completo se exporta como un solo PDF con 'Exportar expediente (PDF)': oculta lo accesorio
   de la pantalla y fuerza a abrir los bloques que estuvieran colapsados u ocultos por la búsqueda. No hay
   descarga individual por bloque.
5. El resumen de estimaciones lista número, periodo, estado del ciclo (con su etiqueta) y el total neto
   sumado de todas las estimaciones del contrato.

**Fundamento legal:** art. 45 fr. IX RLOPSRM (clave del concepto en el catálogo); art. 59 LOPSRM / art. 99
RLOPSRM (convenios modificatorios); art. 125 RLOPSRM (sustitución de personas / equipo); art. 138 fr. I
RLOPSRM (plan de amortización del anticipo); art. 123 fr. III RLOPSRM (nota de bitácora asociada a
sustitución/convenio).

**Pendientes / [validar profe]:**
- La ficha vieja pedía 'descarga individual por bloque'; el profe lo cambió a un único PDF consolidado.
  Confirmar que la descarga por documento individual queda definitivamente fuera de alcance.
- Confirmar si el bloque 'documentos jurídicos' (firmante de la dependencia, representante legal, poder
  notarial, equipo) cubre lo que la ficha entendía por 'documentos jurídicos', o si se esperaba adjuntar
  archivos jurídicos descargables (no implementado).
- El buscador ahora filtra solo por tipo de documento y periodo. Validar que esos dos filtros bastan para
  el expediente de un solo contrato.
- Validar el alcance ampliado (4 bloques nuevos: amortización, equipo, convenios y estimaciones) frente a
  la ficha original de 5 bloques.

---

## HU-05 · Programa y curva de avance

**Quién ve y quién hace:** El **Residente de obra** ejecuta. El Contratista / Superintendente, la
Supervisión y la Dependencia solo **consultan** (ven un aviso de solo-lectura). Finanzas **no tiene
acceso** (no le aparece ni en el menú ni en el inicio).

**Historia:**
- **Como** Residente de obra (ejecuta); el Contratista, la Supervisión y la Dependencia consultan en
  solo-lectura; Finanzas sin acceso
- **Deseo** seleccionar un contrato y ver su programa de obra como matriz concepto × periodo (tipo Gantt
  con cuatro colores: ejecutado, atraso, por venir y no programado), la curva S con tres líneas acumuladas
  (programado, ejecutado y financiero) que arrancan en 0% al inicio del contrato y se cortan en hoy, los
  indicadores clave (programado / ejecutado / financiero a hoy y la desviación), el catálogo de conceptos
  con su % de avance, y filtros por concepto y por rango de periodo (Todo / Últimos 3 / Último)
- **A fin de** identificar a tiempo las desviaciones entre lo planeado, lo ejecutado y lo cobrado, para
  decidir oportunamente

**Criterios de aceptación:**
1. Al seleccionar un contrato, la matriz concepto × periodo colorea cada celda en cuatro estados:
   ejecutado (verde), atraso = programado vencido sin ejecutar (rojo), por venir (ámbar) y no programado
   (gris), con su leyenda.
2. La curva S grafica tres líneas acumuladas en %: programado (llega al 100%), ejecutado y financiero. Las
   tres parten de un Inicio en 0% y las de ejecutado/financiero se detienen en el periodo de hoy (con un
   marcador). Cada punto muestra su valor al pasar el cursor.
3. El filtro por concepto deja una sola fila en la matriz y el catálogo y recalcula las curvas; el filtro
   por periodo (Todo / Últimos 3 / Último) recorta columnas y curvas sin alterar los acumulados.
4. El sistema calcula y muestra el % de avance físico global (ejecutado sobre contratado) en la cabecera y
   el % por concepto en el catálogo y la matriz, más los indicadores de programado / ejecutado / financiero
   a hoy y la desviación (ejecutado − programado) con color.
5. El financiero se calcula a nivel contrato (pagos efectuados hasta el corte, sobre el monto) y no se
   desglosa por concepto en esta Etapa; todos los cálculos derivan de datos reales acotados a los contratos
   en que la persona participa.

**Pendientes / [validar profe]:**
- El sistema no cita ningún artículo de ley en esta vista; la ficha vieja tampoco. Confirmar si la curva S
  o la fórmula del financiero requieren fundamento legal explícito.
- Financiero a nivel contrato (no por concepto), declarado como alcance de esta Etapa; validar si se exige
  desglose por concepto.
- Filtro de periodo por rango fijo (Todo / Últimos 3 / Último) en lugar de un selector libre: validar si
  cumple la intención de 'filtros por periodo' de la ficha.
- El financiero depende de los pagos registrados aguas abajo; validar coherencia con el flujo de
  estimaciones.
- La definición de 'atraso' por celda (programado vencido sin ejecución) es interpretación del sistema;
  confirmar que coincide con el criterio de desviación esperado.

---

## HU-06 · Registro de trabajos terminados por periodo

**Quién ve y quién hace:** El **Contratista / Superintendente** registra el avance. El Residente de obra y
la Supervisión solo **consultan**. La Dependencia y Finanzas **no tienen acceso**.

**Historia:**
- **Como** Contratista / Superintendente
- **Deseo** registrar, por periodo del programa, la cantidad ejecutada de cada concepto del catálogo,
  viendo en la misma pantalla el avance acumulado y el porcentaje contra lo contratado, donde cada captura
  genera automáticamente su nota de bitácora de tipo 'avance' (o la difiere si la bitácora aún no está
  abierta) y puedo editar o eliminar la captura
- **A fin de** alimentar la curva de avance ejecutado (HU-05) y la integración de la estimación con
  respaldo documental, sin poder registrar más de lo contratado (art. 118 RLOPSRM)

**Criterios de aceptación:**
1. Para capturar avance debo elegir un concepto del catálogo y un periodo del programa (de un selector, no
   una fecha libre); el periodo es obligatorio y debe existir en el contrato. La cantidad se redondea a 3
   decimales antes de validar y guardar.
2. El sistema acumula el avance ejecutado por concepto (suma de todas las capturas) y muestra lo
   contratado, lo ejecutado acumulado y el % de avance por concepto; en el formulario muestra además lo
   programado, lo ejecutado y lo disponible del periodo elegido.
3. Bloqueo (art. 118 RLOPSRM): rechaza la captura cuando lo ejecutado acumulado del concepto más la nueva
   cantidad excede lo contratado. Es el único bloqueo.
4. Aviso no bloqueante: si el avance excede lo programado del periodo o el concepto no estaba programado,
   se registra igual y se muestra un aviso para verificar monto o conceptos (adelantar a precios pactados
   no requiere convenio).
5. Cada captura con cantidad mayor a cero genera una nota de bitácora automática de tipo 'avance' ligada al
   avance; si no hay bitácora abierta, la nota se difiere y se asienta sola al abrir la bitácora. La captura
   se puede editar y eliminar, revalidando el art. 118.
6. Acceso: solo el Contratista captura, edita y elimina; el Residente y la Supervisión consultan; la
   Dependencia y Finanzas sin acceso. Todo limitado a quien participa en el contrato; el autor de la
   captura se toma de la sesión.

**Fundamento legal:** art. 118 RLOPSRM (cantidad sobre lo contratado sin orden no es pagable → bloqueo);
art. 125 fr. II RLOPSRM (la nota automática del avance se cita así); art. 45 ap. A fr. X RLOPSRM / art. 52
LOPSRM (programa por periodo).

**Pendientes / [validar profe]:**
- La nota automática se crea siempre de tipo 'avance'; la ficha vieja preveía también el tipo 'entrega de
  obra' (no construido). Confirmar si basta con 'avance'.
- Emisor de la nota = quien registra (el contratista). El sistema lo marca [validar].
- Que el aviso no bloqueante (adelantar a precios pactados sin convenio) sea el comportamiento legal
  correcto frente al art. 118 / convenios. Es interpretación a confirmar.
- Editar la cantidad de un avance no regenera ni corrige la nota original (limitación documentada).
  Confirmar si es aceptable o requiere una nota vinculada nueva (inmutabilidad).

---

## HU-07 · Alertas de atraso por concepto

**Quién ve y quién hace:** El **Residente de obra** ejecuta (es el único que asienta el atraso en la
bitácora). La Supervisión solo **consulta** (ve la tabla, pero sin el botón de asentar). El Contratista /
Superintendente, la Dependencia y Finanzas **no tienen acceso**.

**Historia:**
- **Como** Residente de obra (ejecuta) o Supervisión (consulta) de un contrato
- **Deseo** consultar un panel automático que, por contrato, liste los conceptos cuyo trabajo ejecutado va
  por debajo de lo programado al periodo en curso, mostrando el déficit en las unidades del concepto, y
  (el residente) poder asentar cada atraso como nota en la bitácora
- **A fin de** detectar y dejar constancia formal de los atrasos por concepto sin configurar umbrales ni
  canales, con un cálculo que se obtiene en vivo del programa vigente

**Criterios de aceptación:**
1. Al seleccionar un contrato (en el que la persona participa; un contrato ajeno se rechaza), el panel
   lista automáticamente solo los conceptos con déficit (lo programado acumulado al periodo vigente menos
   lo ejecutado acumulado), en las unidades del concepto, sin umbrales ni porcentajes.
2. El 'periodo vigente' es el último periodo cuyo inicio ya pasó; si el contrato aún no arranca su primer
   periodo, no se muestra ningún atraso. Un concepto que va al corriente o adelantado nunca produce un
   falso atraso.
3. El residente puede 'Asentar en bitácora' un atraso: genera una nota inmutable de tipo 'atraso' con folio
   correlativo; exige que la bitácora esté abierta y que el concepto siga teniendo déficit en ese momento.
   El emisor de la nota es el residente del contrato (art. 53 LOPSRM).
4. La Supervisión (parte del contrato) ve la tabla en solo-lectura, sin el botón 'Asentar'. El Contratista,
   la Dependencia y Finanzas no tienen acceso a la vista ni al aviso.
5. Al iniciar sesión, el Residente y la Supervisión con atrasos ven un aviso dentro de la aplicación
   (banner en Inicio y un número en la campana) con el conteo de conceptos y contratos con déficit. Los
   roles sin acceso a esta pantalla no lo ven.

**Fundamento legal:** art. 52 LOPSRM (citado en el contenido de la nota de atraso); art. 45 ap. A fr. X
RLOPSRM (citado en el contenido de la nota); art. 123 RLOPSRM (asiento del sistema en bitácora; exige
bitácora abierta); art. 53 LOPSRM (emisor de la nota de consecuencia = residente).

**Pendientes / [validar profe]:**
- Toda la historia original (configurar conceptos a vigilar, umbral de atraso y canal sistema/correo) fue
  reemplazada por el profe por el panel automático; confirmar que la ficha se reescribe y no se reabre el
  modelo de configuración.
- Notificación por correo: no existe; solo aviso dentro de la aplicación. Confirmar si el canal de correo
  queda descartado para esta Etapa.
- La estructura de 'alerta de atraso' del diseño se conserva pero ya no se usa; decidir si se elimina o se
  documenta como obsoleta.
- Quién debe ser el emisor de la nota de atraso (hoy se fuerza al residente por el art. 53); validar contra
  el art. 123 fr. III/XII (firmas del equipo). [validar profe]
- Los artículos citados en la nota (52 LOPSRM / 45 ap. A fr. X RLOPSRM) los pone el sistema; lo legal lo
  confirma el profe.

---

## HU-08 · Apertura formal de la bitácora del contrato

**Quién ve y quién hace:** El **Residente de obra** abre la bitácora (y solo el residente asignado a ese
contrato puede hacerlo). El Contratista / Superintendente y la Supervisión **consultan** y luego firman su
parte desde 'Por firmar'. La Dependencia y Finanzas **no tienen acceso** a la vista.

**Historia:**
- **Como** Residente de obra asignado al contrato
- **Deseo** abrir la bitácora electrónica única del contrato seleccionando el equipo ya ligado a sus
  cuentas (residente y superintendente obligatorios; supervisión si existe), capturando la fecha de entrega
  del sitio, el plazo de firma de notas (en días naturales, 2 por defecto) y los datos mínimos del art. 123
  fr. III (domicilios y teléfonos de ambas partes, alcance de los trabajos y características del sitio); al
  confirmar, el sistema congela un acta inmutable, la registra como nota #1 'apertura', deja una firma
  pendiente por cada miembro del equipo y asienta automáticamente cualquier sustitución, avance o convenio
  previo que aún no tuviera nota
- **A fin de** habilitar el registro formal e inalterable de eventos del contrato; la bitácora queda
  'completa' solo cuando todas las partes firman desde su propia cuenta en 'Por firmar', y hasta entonces
  no pueden emitirse notas posteriores (art. 46 y 52 Bis LOPSRM; arts. 122-123 fr. III RLOPSRM)

**Criterios de aceptación:**
1. Existe una sola bitácora por contrato (un intento de duplicarla se rechaza). Solo el residente asignado
   a ese contrato la abre; el equipo (residente y superintendente obligatorios, supervisión opcional) se
   toma de las cuentas del contrato, sin nombres libres; sin superintendente asignado, la apertura se
   rechaza.
2. La apertura registra el momento exacto de apertura (inalterable) y fija la fecha de apertura igual a la
   fecha de inicio del contrato; la fecha de entrega del sitio (capturada) se conserva aparte en el acta.
   El acta y las firmas son inmutables.
3. La primera nota (acta de apertura, folio #1, tipo 'apertura') congela: identificación del contrato,
   objeto, datos financieros (monto, anticipo, plazo), cronograma (inicio / término / entrega del sitio),
   datos mínimos del art. 123 fr. III (domicilios, teléfonos, alcance de trabajos, características del
   sitio) y el registro de firmantes con su rol y cuenta.
4. Al abrir se crea una firma pendiente por cada miembro; nadie firma en la apertura. Cada parte firma
   después desde su cuenta ('Por firmar'); la apertura queda completa cuando no quedan firmas pendientes.
   No se pueden emitir notas posteriores hasta que la apertura esté firmada por todos.
5. Al abrir, si hubo sustituciones de personas, avances de trabajos o convenios registrados antes y sin
   nota, el sistema asienta sus notas automáticamente (numeradas después de la #1) en el mismo acto.

**Fundamento legal:** art. 46 LOPSRM; art. 52 Bis LOPSRM; art. 122 RLOPSRM; art. 123 fr. III RLOPSRM;
art. 123 fr. VI RLOPSRM; art. 125 fr. I g RLOPSRM (asiento de sustitución diferida).

**Pendientes / [validar profe]:**
- Regla 'mismo día': el sistema fija la fecha de apertura igual a la fecha de inicio del contrato, no la
  fecha de entrega del sitio como decía la ficha vieja; está marcado [validar] (hallazgo del profe, audio
  2026-06-01). Confirmar cuál es la fecha legal de apertura.
- Asiento retroactivo (diferido) de notas de sustitución/avance/convenio al abrir: el folio refleja el
  orden de asiento, no la fecha del hecho. Marcado [validar profe] (orden de folio vs. fecha, art. 123 fr.
  V/VI).
- Plazo de firma de notas por defecto = 2 días naturales (esta Etapa); días hábiles y el plazo legal exacto
  quedan a confirmar.
- Quién debe firmar la apertura (firma conjunta): hoy se exige a todo el equipo (residente + superintendente
  + supervisión si aplica); confirmar con el profe si basta la contraparte directa.
- Las pruebas automáticas de HU-08 prueban un formulario viejo de demostración que ya no existe en la
  pantalla real; falta reescribirlas como integración con datos reales.

---

## HU-09 · Emisión y respuesta de notas tipificadas con firma

**Quién ve y quién hace:** Ejecutan el **Residente de obra**, el **Contratista / Superintendente** y la
**Supervisión**, cada quien según su lugar en el equipo del contrato. La Dependencia y Finanzas **no tienen
acceso** a emitir; si son parte del contrato pueden leer la bitácora, pero no emiten notas. Nota: el
sistema reconoce el lugar de cada persona en el contrato (no su rol genérico); por eso el contratista emite
como 'superintendente'.

**Historia:**
- **Como** Residente, Superintendente (Contratista) o Supervisión, según el lugar que ocupo en el equipo
  del contrato
- **Deseo** emitir notas de bitácora del tipo que me corresponde según mi lugar en el contrato (el catálogo
  del art. 125 RLOPSRM, más 'otro' para eventos no tipificados), firmándolas automáticamente desde mi
  cuenta al emitirlas; responder o vincular notas previas y, si me equivoqué, anular mi nota generando una
  correctiva 'dice / debe decir', sin poder editar nunca la original; y que las demás partes puedan firmar
  (aceptar) mis notas, o que se acepten solas al vencer el plazo
- **A fin de** documentar formalmente los eventos del contrato de forma trazable, inmutable y auditable
  (art. 123 fr. V y VI RLOPSRM)

**Criterios de aceptación:**
1. El selector de tipos muestra solo los tipos del art. 125 vigentes que corresponden a mi lugar en el
   contrato (residente / superintendente / supervisión) más 'otro'; el sistema rechaza cualquier tipo que
   no me corresponda.
2. No se puede emitir ninguna nota hasta que la apertura (nota #1) esté firmada por todos; mientras falten
   firmas, el botón está deshabilitado y el sistema lo impide.
3. Cada nota recibe folio correlativo sin saltos ni duplicados, fecha y hora, y queda firmada por su emisor
   (tomado de la sesión) al emitirla; puede vincularse a una nota previa de la misma bitácora.
4. Una nota emitida es inmutable: lo único permitido es anularla, y solo lo hace su emisor, generando una
   nota correctiva vinculada 'dice / debe decir'; no se puede anular la nota de apertura ni una nota ya
   respondida por otra parte.
5. Las partes distintas del emisor pueden firmar (aceptar) la nota; si se completan todas las firmas del
   equipo, la nota queda 'firmada', y si vence el plazo de firma sin completarse se marca 'aceptada
   (tácita)'.

**Fundamento legal:** art. 122 RLOPSRM; art. 123 fr. III RLOPSRM; art. 123 fr. V RLOPSRM; art. 123 fr. VI
RLOPSRM; art. 123 fr. VII RLOPSRM; art. 125 RLOPSRM (fr. I residente, fr. II superintendente, fr. III
supervisión, último párrafo 'otros'); art. 53 LOPSRM (las notas de consecuencia las avala el residente).

**Pendientes / [validar profe]:**
- Quién debe firmar una nota para considerarla aceptada: ¿todo el equipo (residente + superintendente +
  supervisión) o basta la contraparte directa? [validar].
- Asiento retroactivo (diferido) de notas automáticas (sustitución/avance/convenio) al abrir la bitácora:
  orden del folio vs. fecha real del hecho (art. 123 fr. V/VI) — marcado [validar profe].
- La ficha vieja redacta el rol como 'residente, supervisión o contratista'; en el sistema el contratista
  emite como 'superintendente' (art. 125 fr. II), no como 'contratista' directo — confirmar el mapeo con el
  profe.
- Plazo de firma/aceptación por defecto = 2 días naturales, configurable de 1 a 60; confirmar días
  naturales vs. hábiles.
- La ficha vieja menciona arts. 122 y 125; el sistema cita además 123 fr. III/V/VI/VII y 53 — confirmar
  fundamento completo.

---

## HU-10 · Consulta y búsqueda de notas de bitácora

**Quién ve y quién hace:** El **Residente de obra** ejecuta. El Contratista / Superintendente y la
Supervisión **consultan** en solo-lectura (pueden filtrar y exportar; la consulta no se les bloquea). La
Dependencia y Finanzas **no tienen acceso** desde el menú. Nota: cualquier parte del contrato puede leer
las notas; lo que la Dependencia y Finanzas no ven es el enlace en su menú.

**Historia:**
- **Como** Residente del contrato (y, en solo-lectura, Contratista o Supervisión que participan en él)
- **Deseo** elegir un contrato en el que participo y buscar dentro de las notas de su bitácora combinando
  varios filtros a la vez (tipo de nota, rango de fechas, firmante/emisor, vínculo y palabra clave que
  ignora acentos y mayúsculas), ver los resultados en una tabla con su estado de aceptación, seleccionar
  varias notas y exportarlas a un archivo Excel
- **A fin de** encontrar rápido la nota que necesito y poder referenciarla en estimaciones o reportes

**Criterios de aceptación:**
1. Tras seleccionar un contrato del que participo, la búsqueda devuelve solo las notas de su bitácora que
   cumplen todos los filtros aplicados a la vez (tipo, rango de fechas, firmante/emisor, vínculo y palabra
   clave); la palabra clave ignora acentos y mayúsculas y busca en asunto, contenido, etiqueta y tipo.
2. Puedo seleccionar varias notas del resultado (una por una o 'seleccionar todas') y exportarlas a un
   archivo Excel con las columnas Folio, Fecha, Tipo, Emisor, Vínculo, Asunto, Contenido y Estado; el botón
   de exportar solo aparece cuando hay al menos una nota seleccionada.
3. Si el contrato no tiene la bitácora abierta, se muestra un aviso de que no hay notas que consultar (sin
   error duro).
4. Si no participo en el contrato, el sistema niega el acceso y la pantalla lo informa sin revelar las
   notas; la Dependencia y Finanzas no ven la pantalla en el menú.
5. Cada fila muestra el estado de aceptación de la nota (En plazo / Firmada / Aceptada tácita / Respondida
   / Anulada) y la fecha con hora; el Contratista y la Supervisión pueden consultar y filtrar en
   solo-lectura.

**Fundamento legal:** art. 125 RLOPSRM (un emisor por nota; el filtro 'firmante' opera sobre el emisor
real); art. 123 fr. III y fr. XII RLOPSRM (plazo de firma de notas y derivación del estado de aceptación
firmada/tácita).

**Pendientes / [validar profe]:**
- [validar profe] La ficha dice 'firmante' pero el sistema filtra por el emisor de la nota (no por quien
  firma). Confirmar si 'firmante' debe seguir mapeando al emisor o agregarse un filtro por firmantes
  reales.
- [validar profe] La búsqueda por palabra clave incluye la etiqueta y el tipo además de asunto y contenido
  (alcance mayor al literal de la ficha). Confirmar que es deseable.
- [validar profe] El export toma las notas seleccionadas de todo lo cargado, no solo de los resultados
  visibles tras filtrar (la selección persiste al cambiar filtros). Confirmar si debe limitarse a los
  resultados filtrados o limpiar la selección al re-filtrar.
- [validar profe] El criterio 1 (filtros combinados sobre datos reales) y el export a Excel todavía no
  están cubiertos por las pruebas automáticas (solo estructura/permisos); se validan a mano. Decidir si se
  requiere cobertura automatizada.
- [validar profe] El estado de aceptación se muestra y se exporta pero todavía no es filtrable; evaluar si
  debería ser un filtro adicional.

---

## HU-11 · Minutas, visitas y acuerdos

**Estado:** ✅ **Funcional** (sesión autónoma E2, 18-jun) — opera contra datos reales; antes era una maqueta
sin guardado real.

**Quién ve y quién hace:** El **Residente de obra** ejecuta. El Contratista / Superintendente y la
Supervisión solo **consultan**. La Dependencia y Finanzas **no tienen acceso**.

**Historia:**
- **Como** Residente de obra
- **Deseo** registrar minutas de reuniones (fecha, lugar, participantes, asunto y **PDF real** de la minuta),
  agendar visitas o inspecciones de campo (fecha, lugar, responsable, propósito), **vincular cada minuta o
  visita a una nota de la bitácora del contrato** y consultar la lista de acuerdos **derivada de esas
  minutas**, todo dentro de una pantalla con tres pestañas (Minutas, Agenda de visitas y Acuerdos)
- **A fin de** tener concentradas las reuniones, visitas y compromisos del contrato en un solo lugar para
  consulta

**Criterios de aceptación:**
1. La pantalla tiene 3 pestañas (Minutas, Agenda de visitas y Acuerdos), acotadas por **contrato** (selector);
   el Residente ejecuta y el Contratista y la Supervisión solo consultan (los formularios aparecen
   deshabilitados con un aviso de solo-consulta); la Dependencia y Finanzas no ven la pantalla.
2. Registrar una minuta exige fecha, lugar, participantes, asunto y archivo **PDF** seleccionado; el botón
   permanece deshabilitado hasta completarlos y, al registrar, **la minuta se guarda en el sistema** (ligada
   al contrato, con su autor tomado de la sesión) y se agrega arriba de la tabla con folio correlativo y
   resaltado verde. El **PDF se almacena de verdad** y se consulta con 👁 desde el listado.
3. Agendar una visita exige fecha, lugar, responsable y propósito; al agendar **la visita se guarda** (con su
   responsable tomado de la sesión) y se agrega con su folio y estado 'Agendada'.
4. La pestaña Acuerdos **deriva** de los acuerdos capturados en las minutas reales del contrato (ya no es una
   lista estática); muestra vacío si ninguna minuta trae acuerdos.
5. El botón 'Adjuntar como referencia en nota' abre un modal que lista las **notas reales de la bitácora del
   contrato** y, al confirmar, **el vínculo se guarda sin modificar la nota firmada** (es una referencia, no
   una edición).

**Fundamento legal (verificado contra el texto del RLOPSRM):**
- **Art. 123 fr. X RLOPSRM** — *"Cuando se requiera, se podrán ratificar en la Bitácora las instrucciones
  emitidas vía oficios, **minutas**, memoranda y circulares…"*: base literal del vínculo minuta/visita → nota.
  (Corrige la cita previa a **fr. III**, que es la **nota especial de apertura**, no la ratificación de
  minutas — error detectado y corregido en esta sesión.)
- **Art. 123 fr. VI RLOPSRM** — *"Se prohibirá la modificación de las notas ya firmadas…"*: por eso el vínculo
  no modifica la nota; solo deja una referencia en la minuta o visita.

**Pendientes / [validar profe]:**
- **[validar profe]** — el modal de vínculo lista **cualquier** nota del contrato (incluso las que aún no
  están firmadas). Si el profe exige que solo se vinculen notas **firmadas**, restringir el modal a las notas
  ya firmadas o aceptadas por vencimiento del plazo. Hoy se permite vincular cualquier nota del contrato (el
  vínculo es **referencial**, no una co-firma, así que no altera la nota). **Sin base legal literal para el
  matiz** — criterio del profe.
- **[validar profe]** — matiz **fr. X vs fr. II** del art. 123 (la fr. II describe los datos que debe contener
  cada nota). El sistema cita fr. X (ratificación de minutas); confirmar si el profe prefiere fundar también
  con fr. II.
- Subida del PDF de la **visita** (hoy la visita no adjunta PDF, solo la minuta) — definir si se requiere.

---

## HU-12 · Apertura del periodo e integración de la estimación

**Quién ve y quién hace:** El **Contratista / Superintendente** integra la estimación (y solo el
superintendente asignado a ese contrato puede hacerlo). El Residente de obra y la Supervisión solo
**consultan**. La Dependencia y Finanzas **no tienen acceso**.

**Historia:**
- **Como** Contratista / Superintendente asignado al contrato
- **Deseo** integrar la estimación del periodo como un expediente único (carátula financiera + números
  generadores con el precio unitario y la cantidad contratada de cada concepto + notas de bitácora ya
  firmadas que vinculo desde el buscador), capturando el volumen ejecutado por concepto y las deductivas,
  con una carátula que se previsualiza en vivo; al confirmar, el sistema calcula la carátula (subtotal,
  amortización del anticipo, 5 al millar, deductivas, retención por atraso y neto sin IVA), le asigna número
  correlativo y deja la estimación como 'Integrada', sin poderse editar después
- **A fin de** presentar la estimación como expediente del periodo conforme al art. 132 RLOPSRM, lista para
  que el contratista la presente (HU-13, que dispara el art. 54), la supervisión la revise/turne y la
  residencia la autorice/rechace (HU-15)

**Criterios de aceptación:**
1. Solo el superintendente asignado al contrato integra, y solo si el contrato tiene su PDF firmado ligado;
   si el anticipo supera el umbral (30% por defecto) se exige además la autorización del titular ligada
   (art. 50 fr. IV LOPSRM).
2. La carátula la calcula el sistema (fuente única de verdad, no editable después): subtotal = suma de
   cantidad × precio unitario; amortización = subtotal × % de anticipo (art. 143 fr. I RLOPSRM, proporcional
   al avance); 5 al millar = subtotal × 0.5% (art. 191 LFD); deductivas manuales; retención por atraso =
   pena × subtotal si hay pena pactada y la obra va atrasada (art. 138/139 RLOPSRM); neto = subtotal menos
   deducciones, sin IVA (art. 2 fr. XIX RLOPSRM) y nunca negativo. La pantalla solo muestra una vista previa
   en vivo.
3. El sistema bloquea si, por concepto, lo acumulado (lo previo más el periodo) excede lo contratado (art.
   118) o lo planeado en el programa hasta ese periodo (art. 45 ap. A fr. X + art. 52); la pantalla
   adelanta ambos topes con un semáforo y deshabilita 'Confirmar'.
4. El periodo no excede un mes calendario (art. 54) y no se traslapa con otra estimación no rechazada del
   contrato; el número es correlativo y se asigna de forma segura por contrato.
5. Solo se vinculan notas de bitácora ya firmadas del propio contrato (sin la apertura), validadas por el
   sistema; al integrar se guarda el expediente (carátula + generadores con sus datos + notas) y las fotos
   del avance físico y financiero, en estado inicial 'Integrada'.

**Fundamento legal:** art. 132 RLOPSRM (expediente de la estimación); art. 143 fr. I RLOPSRM (amortización
proporcional del anticipo); art. 138/139 RLOPSRM (penas convencionales / retención por atraso); art. 191 LFD (5 al
millar); art. 118 RLOPSRM (tope contratado por concepto); art. 45 ap. A fr. X RLOPSRM + art. 52 LOPSRM
(tope planeado del programa); art. 54 LOPSRM (periodo máximo 1 mes); art. 2 fr. XIX RLOPSRM (sin IVA); art.
46 / 46 Bis LOPSRM (deductivas económicas); art. 50 fr. IV LOPSRM (autorización del titular sobre el umbral
de anticipo).

**Pendientes / [validar profe]:**
- Registro fotográfico y soportes documentales del expediente (ficha vieja) todavía no están construidos.
  Diferidos.
- La 'apertura del periodo' de la ficha hoy se reduce a capturar el inicio y fin del periodo (no hay una
  acción formal de apertura separada de la integración).
- Definición de avance físico vs. financiero y la regla de disparo de la retención por atraso (global vs.
  por concepto, bruto vs. neto) [validar profe].
- CMIC / 2 al millar: configurable y diferido; tasa y aplicabilidad a confirmar.
- Bloqueo duro vs. alerta para el tope del programa (art. 45 ap. A fr. X / 52): hoy bloquea, pero está
  marcado [validar].
- Umbral del anticipo para exigir la autorización del titular (art. 50 fr. IV) y su configuración (30% por
  defecto) [validar profe].
- **Ambiente de estimación por bloques (FASE 5, cascarón):** existe una nueva pantalla "Nueva estimación (por
  bloques)" que presenta el flujo como pasos guiados (tipo el alta): nueva estimación → generadores →
  carátula automática → complementar → soportes/notas/fotos → cierre con candado → envío a revisión. Hoy es un
  **cascarón** que envuelve la captura existente; **los números generadores ya son funcionales en esta
  pantalla** (se capturan e integran aquí, art. 132 RLOPSRM). Lo único pendiente es el **bloque de captura
  dedicado** de generadores y el de **soportes/fotos** de ese ambiente guiado (a cargo del Equipo 3); mientras
  tanto, la integración y la presentación reales se hacen en esta pantalla (HU-12) y en HU-13.

---

## HU-13 · Envío / presentación de la estimación

**Quién ve y quién hace:** El **Contratista / Superintendente** presenta la estimación (y solo el
superintendente asignado a ese contrato puede hacerlo). El Residente de obra y la Supervisión solo
**consultan**. La Dependencia y Finanzas **no tienen acceso**.

**Historia:**
- **Como** Contratista / Superintendente asignado al contrato
- **Deseo** presentar formalmente una estimación que ya integré (estado 'Integrada'), de modo que el
  sistema selle la fecha y hora exacta del acto y la estimación pase a 'Presentada'
- **A fin de** dejar evidencia inmutable del momento de entrega y arrancar el plazo de revisión y
  autorización del art. 54 LOPSRM que ejecutan la Supervisión y la Residencia (HU-15)

**Criterios de aceptación:**
1. Solo el superintendente asignado al contrato puede presentar; al hacerlo el sistema sella la fecha y
   hora reales y el autor (tomado de la sesión) y pasa el estado de 'Integrada' a 'Presentada'. El Residente
   y la Supervisión solo consultan; cualquier otro rol recibe un aviso de acceso denegado.
2. Solo se puede presentar una estimación que esté 'Integrada': cualquier otro estado se rechaza, y una ya
   presentada no se vuelve a presentar (el botón desaparece y el sistema avisa 'La estimación ya fue
   presentada', evitando una doble presentación simultánea).
3. La pantalla muestra el acuse con la fecha y hora exacta ('Presentada el dd/mm/aaaa hh:mm').
4. Al quedar presentada, la pantalla muestra un semáforo del plazo de revisión/autorización de 15 días
   naturales (art. 54), calculado en vivo desde la presentación: 'Revisión (HU-15): día X de 15 / N días
   restantes / plazo vencido'.
5. El plazo de 6 días para presentar (desde el corte del periodo) es solo un aviso informativo ('Dentro /
   Fuera de los 6 días'); no deshabilita el botón ni impide presentar fuera de plazo.

**Fundamento legal:** art. 54 LOPSRM (plazo de presentación de 6 días y de revisión/autorización de 15
días).

**Pendientes / [validar profe]:**
- Notificación formal a la residencia y la supervisión (criterio 1 de la ficha vieja): hoy no existe como
  aviso automático; la difusión es por consulta del historial. [validar profe] si la 'notificación formal'
  del art. 54 requiere un aviso o asiento explícito.
- El plazo de 6 días para presentar no bloquea (la ficha vieja lo pedía como candado del botón). Se degradó
  a aviso informativo. [validar profe] si presentar fuera de los 6 días debe impedirse o solo advertirse.
- El plazo de 15 días se muestra como referencia visual pero no dispara ninguna acción automática al vencer
  (no hay afirmativa ficta ni autorización automática). [validar profe] la consecuencia legal del
  vencimiento.
- La ficha vieja decía plazo de revisión 'supervisión'; hoy abarca supervisión y residencia vía HU-15.
  [validar profe] redacción.

---

## HU-14 · Historial de estimaciones del contrato

**Quién ve y quién hace:** El **Residente de obra** ejecuta. El Contratista / Superintendente y la
Dependencia solo **consultan**. La Supervisión y Finanzas **no tienen acceso**. Nota: en la práctica
cualquier parte del contrato (incluida la dependencia y el superintendente) también puede consultar el
historial.

**Historia:**
- **Como** Residente de obra (ejecutor); el Contratista (superintendente del contrato) y la Dependencia
  también pueden consultar
- **Deseo** consultar, por contrato, el listado de todas sus estimaciones (en cualquier estado:
  Integrada / Presentada / Autorizada / Rechazada / Pagada) ordenadas por número, con su estado actual e
  importe neto, filtrarlas por periodo y por estado a la vez, abrir cada una en un panel de detalle
  resumido y exportar a Excel el resultado filtrado
- **A fin de** tener trazabilidad del ciclo de cobro del contrato, incluyendo las estimaciones rechazadas,
  para fiscalización

**Criterios de aceptación:**
1. Al seleccionar un contrato del que se es parte (o supervisión), se listan todas sus estimaciones
   ordenadas por número, incluyendo las rechazadas, mostrando estimación, periodo, estado (distintivo),
   importe neto y fecha de presentación.
2. Los filtros de periodo y estado operan a la vez: una estimación solo aparece si cumple ambos; las
   opciones de cada filtro salen de los datos cargados.
3. Al hacer clic en una fila se abre un panel lateral 'Expediente' (resumen) con periodo, estado, importe,
   fecha de presentación, fecha de revisión, fecha de pago y observaciones; se cierra con el botón o
   tocando fuera.
4. El botón 'Exportar historial' descarga un Excel con las filas filtradas (estimación, versión, periodo,
   estado, importe y fechas).
5. Un contrato sin estimaciones muestra un estado vacío sin error; un usuario sin participación recibe un
   aviso de sin acceso.

**Pendientes / [validar profe]:**
- [validar profe] La ficha vieja cita art. 130 RLOPSRM (tipos de estimación) y art. 138 (versionado); el
  sistema en HU-14 no cita ningún artículo.
- CA-3 'expediente completo': el panel es un resumen, no el expediente de HU-04. Decidir si CA-3 exige
  enlazar al expediente completo o el resumen basta.
- Fechas de revisión y pago en el panel: hoy el sistema solo registra las fechas de integración y
  presentación; las de autorización, rechazo y pago no se empujan, por lo que esas columnas salen vacías
  aunque el estado ya haya avanzado por HU-15/HU-21. Falta cablearlas para completar la línea de tiempo.
- Observaciones del panel: hoy siempre vacías; no se traen de HU-15. Decidir si HU-14 debe mostrarlas.
- Concepto de 'versiones rechazadas' (HU-16): el modelo no versiona (la columna Versión sale '—'); una
  rechazada aparece como estado, no como versión anterior vinculada. Confirmar si HU-14 debe mostrar el
  encadenamiento de versiones.

---

## HU-15 · Recepción, revisión técnica y autorización de la estimación

**Quién ve y quién hace:** Ejecutan el **Residente de obra** y la **Supervisión** (cada uno su parte: la
Supervisión registra observaciones y turna; la Residencia autoriza o rechaza). La Dependencia /
Contratante **consulta**. El Contratista / Superintendente y Finanzas **no tienen acceso**.

**Historia:**
- **Como** Supervisión y Residencia (revisión secuencial; la Dependencia consulta)
- **Deseo** recibir la estimación presentada, revisarla por secciones (carátula, números generadores y
  notas de bitácora vinculadas, leídas del detalle real de la estimación), registrar observaciones con tipo
  (aclaración / corrección / rechazo) y severidad (menor / mayor / crítica) ancladas a una sección, turnar
  de supervisión a residencia (con o sin observaciones), y que la residencia —solo después del turnado—
  autorice (estado → 'Autorizada') o rechace con motivo obligatorio (estado → 'Rechazada', generando una
  observación de rechazo dirigida al contratista)
- **A fin de** decidir sobre la estimación con revisión técnica trazable y controlando visualmente el plazo
  de 15 días naturales del art. 54 LOPSRM, en ejercicio de la responsabilidad de la residencia (art. 53
  LOPSRM)

**Criterios de aceptación:**
1. La vista carga la estimación presentada (o ya autorizada/rechazada) del contrato seleccionado y muestra
   carátula, números generadores y notas vinculadas del detalle real; las secciones 'fotos' y 'soportes' no
   se muestran porque todavía no hay archivos reales que exponer.
2. Solo la Supervisión asignada registra y elimina sus propias observaciones (con tipo y severidad por
   sección) mientras la estimación está presentada y aún no se turna; una vez turnada, su revisión queda
   cerrada.
3. La Supervisión turna a la Residencia solo si hay al menos una observación o marca explícitamente 'sin
   observaciones'; el turnado es requisito para resolver (intentar autorizar/rechazar sin turnar se
   rechaza), y el superintendente/contratista no puede autorizar.
4. Solo la Residencia asignada, y solo tras el turnado, autoriza (→ 'Autorizada') o rechaza con motivo
   obligatorio (→ 'Rechazada', insertando una observación de rechazo dirigida al contratista); las acciones
   se revalidan por rol y por la secuencia de estados.
5. Un semáforo en vivo desde la presentación muestra el día N de 15 (verde hasta 7, amarillo de 8 a 12, rojo
   más de 12); es informativo del art. 54 LOPSRM y no bloquea las acciones al vencer.

**Fundamento legal:** art. 54 LOPSRM (plazo de revisión); art. 53 LOPSRM (responsabilidad de la residencia
/ supervisión); art. 191 LFD (retención 5 al millar, citada en la carátula leída).

**Pendientes / [validar profe]:**
- ¿Las observaciones deben poder anclarse 'por concepto' (renglón del generador) y no solo por sección,
  como pedía la ficha? Hoy es por sección.
- ¿Es aceptable que las secciones 'registro fotográfico' y 'soportes' no se muestren (faltan archivos
  reales) aunque la ficha las nombra? El sistema ya las acepta.
- Los cortes del semáforo (7/12 días) son del prototipo, no de ley: confirmar con el profe los cortes
  verde/amarillo/rojo y si debe haber bloqueo al vencer (hoy solo informa).
- ¿El plazo de 15 días debe correr desde la presentación (como hoy) o desde una 'fecha de recepción'
  separada? En el flujo actual se asumió que presentación = recepción a revisión.
- Validar el emisor / la firma legal de la autorización y del rechazo (hoy solo se sella el estado y el
  autor de la observación, sin firma formal).

---

## HU-16 · Reingreso de estimación tras rechazo

**Quién ve y quién hace:** El **Contratista / Superintendente** ejecuta (y solo el superintendente del
contrato puede reingresar). El Residente de obra **consulta** (solo-lectura). La Supervisión, la
Dependencia y Finanzas **no tienen acceso** (no les aparece en el menú ni en el inicio).

**Historia:**
- **Como** Contratista / Superintendente
- **Deseo** abrir la pantalla de Reingreso, seleccionar un contrato y una estimación rechazada real, ver
  las observaciones reales del rechazo (las de HU-15) con su severidad y descargarlas en PDF o Excel,
  capturar una nota de atención a observaciones, confirmar con una casilla que las atendí, y al pulsar
  'Reingresar' crear una nueva versión real (un bloque completo independiente) vinculada a la rechazada, con
  su trazabilidad de versiones
- **A fin de** re-presentar la estimación corrigiendo lo observado, conservando la trazabilidad fiscal con
  la versión rechazada y sin reiniciar el plazo de presentación del art. 54 LOPSRM

**Criterios de aceptación:**
1. La vista carga con un selector de contrato → estimación rechazada (de su historial real, filtrando las
   rechazadas que aún no se reingresan). Con rol contratista el panel de reingreso es editable; con rol
   residente carga en solo-lectura; la Supervisión, la Dependencia y Finanzas no la ven.
2. La tabla 'Observaciones de la versión rechazada' lista las observaciones reales del rechazo
   (sección / tipo / severidad / descripción) y los botones 'Descargar PDF' y 'Descargar Excel' generan el
   archivo con esos datos reales.
3. El botón 'Reingresar estimación (nueva versión)' permanece deshabilitado hasta que la nota tenga texto y
   la casilla de confirmación esté marcada.
4. Al reingresar, el sistema crea de una sola vez una nueva estimación 'Integrada' como bloque completo
   independiente (con su propio número, copiando los generadores y la carátula de la rechazada) y la liga a
   la rechazada; aparece el aviso de reingreso y la tabla 'Trazabilidad de versiones' (rechazada →
   reingreso). La rechazada permanece rechazada (histórico vinculado). Cada rechazada se reingresa una sola
   vez (un segundo intento se rechaza).
5. El plazo de presentación (art. 54 LOPSRM) no se reinicia: la nueva versión nace sin sello de presentación
   propio y referencia el envío original de la rechazada. Solo el superintendente del contrato reingresa
   (la residencia no puede).

**Fundamento legal:** art. 54 LOPSRM (plazo de presentación que no se reinicia — [validar profe] la
semántica exacta); art. 132 RLOPSRM (trazabilidad fiscal de la versión rechazada / inmutabilidad de
estimaciones).

**Pendientes / [validar profe]:**
- [validar profe] Semántica exacta de 'no reiniciar el plazo de presentación' del art. 54 LOPSRM: hoy la
  nueva versión referencia la presentación de la rechazada, sin reabrir el contador. Confirmar regla legal.
- [validar profe] El reingreso copia la carátula y los generadores de la rechazada como bloque
  independiente (no recalcula montos). Confirmar si el reingreso debe permitir re-capturar cantidades
  corregidas (re-integrar vía HU-12) en lugar de copiar el bloque.
- [validar/PARA MAIKI] La 'nota de atención a observaciones' es hoy un control que no se guarda (no hay
  campo). Si debe quedar registrada, requiere una pequeña ampliación del modelo de datos.
- [validar profe] Confirmar si se mantienen los dos formatos de descarga (PDF y Excel) de las observaciones
  o se consolida en uno (coherencia con el expediente como un solo PDF).

---

## HU-17 · Tablero de estimaciones aceptadas y en proceso

**Quién ve y quién hace:** El **Residente de obra** ejecuta. El Contratista / Superintendente, la
Supervisión y la Dependencia solo **consultan**. Finanzas **no tiene acceso**. Nota: cada quien ve solo los
contratos en que participa; la Dependencia vería todos.

**Historia:**
- **Como** Residente de obra (ejecutor; el Contratista, la Supervisión y la Dependencia en consulta;
  Finanzas sin acceso)
- **Deseo** ver un tablero de solo-lectura con las estimaciones de los contratos donde participo (la
  Dependencia ve todas), excluyendo las rechazadas del listado, donde cada estimación muestra su línea de
  tiempo de 4 fases (Integrada → Presentada → Autorizada → Pagada), su estado, periodo, monto neto y
  responsable; con indicadores de cartera (número de contratos, monto estimado, pagado y pendiente, conteos
  y montos por estado, antigüedad promedio por estado), filtros de consulta (estado/periodo/responsable) y
  un panel 'Mis pendientes' acotado a mi rol
- **A fin de** saber qué estimación está en qué estado y qué requiere mi acción inmediata

**Criterios de aceptación:**
1. El listado 'Estimaciones aceptadas y en proceso' muestra solo los estados Integrada, Presentada,
   Autorizada y Pagada, y excluye las rechazadas; las rechazadas sí se cuentan en los contadores y métricas
   por estado.
2. Cada tarjeta de estimación muestra una línea de tiempo de 4 fases que marca como completadas las fases
   anteriores al estado actual y resalta el estado vigente, más el estado, periodo, monto neto cuadrado y
   el rol responsable de la siguiente acción.
3. Los indicadores de cartera los calcula el sistema: totales (contratos, monto estimado, monto pagado,
   monto pendiente), desglose por estado (cantidad, monto, antigüedad promedio) y desglose por contrato; la
   pantalla solo da formato.
4. El panel 'Mis pendientes' lista solo las estimaciones cuyo estado exige una acción que ejecuta el rol de
   la persona: el contratista presenta las integradas y reingresa las rechazadas; la supervisión/residencia
   revisa-autoriza las presentadas; Finanzas paga las autorizadas.
5. La visibilidad está acotada a los contratos donde la persona participa; la Dependencia vería todos, pero
   a Finanzas el sistema le oculta la pantalla.

**Fundamento legal:** art. 54 LOPSRM (periodo de la estimación y flujo presentar/autorizar).

**Pendientes / [validar profe]:**
- [validar profe] El 'avance' (físico vs. programado) que pedía la ficha vieja no se construyó en el
  tablero. Decidir si el tablero debe incorporar el avance físico o si ese indicador vive solo en
  HU-06/HU-07.
- [validar profe] Los estados 'en revisión' y 'en pago' de la ficha vieja no son estados propios del modelo
  (hay 5: Integrada / Presentada / Autorizada / Pagada / Rechazada). Hoy 'Presentada' cubre la revisión y
  'Autorizada' cubre el previo al pago. Confirmar si bastan las etiquetas/responsable o se requieren
  sub-estados dedicados.
- [validar profe] Los indicadores son de cartera (todos los contratos visibles del usuario), no de un único
  contrato seleccionado como sugería la ficha. Hay desglose por contrato, pero no un selector de contrato
  único. Confirmar el alcance esperado.
- ✅ **Corregido (hecho desactualizado):** el control de pago (HU-21) es **estricto** — solo se paga lo
  **autorizado** (art. 54 LOPSRM); el tablero refleja ese flujo. (La nota previa lo describía como permisivo;
  el pago se endureció en la oleada de pago.)

---

## HU-18 · Portafolio ejecutivo con semáforos

**Quién ve y quién hace:** La **Dependencia / Contratante** ejecuta. El Residente de obra y la Supervisión
**consultan** (solo-lectura). El Contratista / Superintendente y Finanzas **no tienen acceso**.

**Historia:**
- **Como** Dependencia / Contratante (con acceso de solo-lectura para la Residencia y la Supervisión; el
  Contratista y Finanzas sin acceso)
- **Deseo** ver una lista de contratos del portafolio donde cada renglón muestra un semáforo de 3 colores
  (verde / amarillo / rojo) calculado a partir de tres factores (desviación de avance vs. programado, días
  vencidos en plazos y pendientes sin atender), con contadores por color, un distintivo de variación del
  avance contra el mes anterior, agrupación por contratista / ejercicio fiscal / tipo de contratación, y un
  panel de detalle (avance físico, avance financiero, atrasos y penalizaciones) que se abre con doble clic
- **A fin de** identificar de un vistazo cuáles contratos requieren atención ejecutiva y abrir su detalle

**Criterios de aceptación:**
1. Cada renglón muestra un semáforo (verde si la suma es 1 o menos, amarillo 2-3, rojo 4 o más) obtenido al
   sumar 0/1/2 puntos de los tres factores (desviación de avance, días vencidos y pendientes sin atender),
   **calculado en el servidor a partir de datos reales del contrato** (no de datos de demostración) y
   acotado por participación: la Dependencia (que es quien ejecuta esta pantalla) ve todos los contratos; la
   Residencia y la Supervisión, solo aquellos en los que participan. Al pasar el cursor se ve el desglose de
   cada factor.
2. La cabecera muestra 4 contadores: total de contratos y conteo de contratos en verde, amarillo y rojo.
3. El doble clic sobre un renglón abre un panel de detalle con avance físico %, avance financiero %, atrasos
   (días vencidos) y penalizaciones ($), con botón Cerrar.
4. El control 'Agrupar por' reorganiza la tabla por Contratista, Ejercicio fiscal o Tipo de contratación
   (o Ninguno), mostrando un encabezado de grupo con su conteo.
5. Cada renglón muestra un distintivo de variación del avance vs. el mes anterior (↑/↓ N puntos o '=
   igual').

**Estado:** ✅ **Funcional** (integración HU-18, 17-jun). La pantalla está conectada al portafolio real: los
semáforos y los indicadores se derivan de los datos del contrato en el servidor, acotados por participación.
Quedan abiertas las decisiones de criterio que siguen.

**Pendientes / [validar profe]:**
- [validar profe] Qué se entiende por **avance físico** y contra qué se compara (avance real registrado vs.
  programado); hoy se deriva del avance por concepto registrado, falta confirmar la definición exacta.
- [validar profe] La comparación 'periodo actual vs. anterior' está solo como distintivo por fila, no como
  comparativa agregada del portafolio entre dos periodos seleccionables. Definir si se requiere selector de
  periodos y comparación a nivel grupo/total.
- ✅ **RESUELTO (criterio del equipo, 18-jun):** los cortes del semáforo se **fijaron como criterio del
  equipo** y se centralizaron (configurables) en `lib/umbrales-semaforo.js`: avance vs programado VERDE ≥95% /
  ÁMBAR 85-95% / ROJO <85% (= desviación ≤5 / ≤15 pp), días vencidos 0 / 1-10 / >10, pendientes ≤2. Sin base
  legal del número exacto; siguen siendo ajustables si el profe pide otros valores.
- [validar profe] El factor 'atrasos en plazos legales' hoy se simula con un número fijo; definir contra
  qué plazo legal real se computa (entrega de obra, autorización de estimación art. 54, etc.).
- [validar profe] Confirmar si la Residencia y la Supervisión deben tener acceso de solo-lectura (hoy lo
  tienen); la ficha vieja solo menciona a la Dependencia.

---

## HU-19 · Exportación de los 7 reportes definidos del contrato

**Quién ve y quién hace:** El **Residente de obra** ejecuta (es el único que descarga/exporta). El
Contratista / Superintendente, la Supervisión, la Dependencia y Finanzas solo **consultan** (ven la vista en
solo-lectura, con los botones de exportar deshabilitados).

**Historia:**
- **Como** Residente de obra
- **Deseo** seleccionar un contrato (de los que participo) y un periodo (Mensual, Trimestral o Acumulado), y
  descargar 6 de los 7 reportes definidos en su formato (PDF y/o Excel), generados a partir de los datos
  reales del contrato; el séptimo reporte (Observaciones) aparece en la lista pero su exportación está
  deshabilitada por falta de fuente a nivel contrato
- **A fin de** llevar la información del sistema a oficios, presentaciones o expedientes de auditoría, con
  valores que cuadran con lo que guarda el sistema (carátula, curva S, convenios) sin recalcularlos

**Criterios de aceptación:**
1. Tras seleccionar un contrato, los reportes 1 (Avance físico, PDF + Excel), 2 (Avance financiero, Excel),
   3 (Listado de estimaciones, Excel), 5 (Bitácora, PDF), 6 (Histórico de modificatorios, Excel) y 7
   (Penalizaciones, Excel) descargan un archivo real con un nombre que incluye el reporte, el periodo y la
   fecha.
2. El reporte 4 (Observaciones) se muestra en la lista pero su botón permanece deshabilitado con el aviso
   'Sin fuente — falta la consulta de observaciones a nivel contrato' (HU-15 solo las expone por
   estimación).
3. El selector de periodo (Mensual / Trimestral / Acumulado) solo acota el rango de fechas donde aplica y
   etiqueta el nombre del archivo; no cambia las columnas ni el contenido del reporte.
4. Solo el Residente ejecuta la exportación; el Contratista, la Supervisión, la Dependencia y Finanzas ven
   la vista en solo-lectura con aviso de consulta y todos los botones de exportar deshabilitados.
5. El reporte 5 (Bitácora) solo se exporta si el contrato tiene la bitácora abierta; si no, su botón se
   deshabilita con el aviso 'Sin bitácora aperturada'. Los reportes vuelcan tal cual los valores que guarda
   el sistema (carátula, pagos, convenios) y muestran el estado de la estimación con su etiqueta canónica
   (Integrada / Presentada / Autorizada / Rechazada / Pagada).

**Fundamento legal:** art. 54 LOPSRM (presentación de estimación / plazo, sello 'Presentada'); art. 59 / 59
Bis LOPSRM (convenios modificatorios y ajuste de costos); art. 102 LOPSRM (revisión SFP en convenios); art.
138/139 RLOPSRM (pena por atraso) [validar profe]; art. 191 LFD (retención 5 al millar); art. 46 / 46 Bis
LOPSRM (deductivas / penas convencionales).

**Pendientes / [validar profe]:**
- El reporte 4 (Observaciones) queda deshabilitado: no existe la consulta de observaciones a nivel
  contrato; una opción futura sería reunirlas estimación por estimación (fuera del alcance actual). La ficha
  pide los '7 reportes' pero hoy solo 6 exportan.
- Fundamento legal de la pena por atraso (art. 138/139 RLOPSRM): lo confirma el profe; el número cuadra
  exacto (derivado de la carátula) pero la cita legal está pendiente.
- Ancla del recorte por periodo (Mensual = último mes, Trimestral = último trimestre, anclado al dato más
  reciente): marcado [validar profe].
- El reporte de comprometido/disponible presupuestal depende de HU-20; hoy el resumen lo rotula
  'PENDIENTE'.
- Mejora opcional: exponer la pena por atraso directamente en el historial para leerla en vez de derivarla.

---

## HU-20 · Tránsito a pago: carga de soportes y verificación de suficiencia presupuestal

**Quién ve y quién hace:** Ejecutan el **Contratista / Superintendente** y **Finanzas**. El Residente de
obra y la Dependencia solo **consultan**. La Supervisión **no tiene acceso** (no le aparece ni en el menú
ni en el inicio).

**Estado:** ✅ **Funcional** (integrada en la sesión grande del 18-jun) — opera contra datos reales; antes
era un prototipo de demostración.

**Historia:**
- **Como** Contratista / Superintendente o Finanzas (ejecutan); el Residente y la Dependencia consultan; la
  Supervisión sin acceso
- **Deseo** seleccionar una estimación ya autorizada y gestionar su tránsito a pago sobre **datos reales**:
  (1) una verificación de suficiencia presupuestal que el sistema hace del lado del servidor ('disponible =
  techo − comprometido') y que **bloquea** la generación de la instrucción cuando el neto excede lo
  disponible (art. 24 LOPSRM); (2) un semáforo del plazo de 20 días anclado en la **fecha real de
  autorización** (tomada de la nota de autorización que queda en la bitácora), que avisa al entrar en ámbar;
  (3) un checklist de soportes (factura y CFDI, más el estado de la fianza de cumplimiento que se lee de las
  garantías del contrato) que condiciona la generación; y un botón que **genera la instrucción de pago de
  verdad** (se guarda, una por estimación) y notifica a Finanzas
- **A fin de** ejecutar el tránsito a pago con los controles legales reales (art. 24 y art. 54 LOPSRM),
  cuadrados al centavo y sin datos de demostración

**Criterios de aceptación (comportamiento actual del sistema):**
1. **(art. 24)** El sistema calcula, del lado del servidor, 'disponible = techo anual − comprometido' —el
   comprometido suma el neto de las estimaciones ya autorizadas y pagadas de esa dependencia y ejercicio,
   sin contar la actual— y **bloquea** la generación si el neto excede lo disponible. Si no hay techo
   cargado, también la bloquea e indica que falta el presupuesto (no inventa una cifra). El techo lo carga
   Finanzas en la propia pantalla.
2. **(art. 54)** Un semáforo del plazo de pago de 20 días naturales, anclado en la fecha real de
   autorización (tomada de la nota de autorización que queda en la bitácora). Se mide en **días vencidos**
   (días pasados de los 20): verde mientras está dentro del plazo (0 vencidos), ámbar de 1 a 10 días vencidos
   y rojo pasados los 10, con aviso al entrar en ámbar. Si el contrato no tenía bitácora al autorizar y no
   hay esa fecha, el semáforo queda **deshabilitado** con una etiqueta (no inventa la fecha); la fecha
   definitiva requiere un sello de autorización propio [PARA MAIKI].
3. La instrucción solo se genera cuando los soportes obligatorios están completos: factura y CFDI (se
   registra el folio, sin subir el archivo) y la **fianza de cumplimiento vigente**, que el sistema lee de
   las garantías del contrato. La subida del archivo en sí está deshabilitada con una etiqueta (todavía no
   hay dónde almacenarlo).
4. La generación exige que la estimación esté **autorizada** (verificado en el servidor), guarda la
   instrucción de verdad (monto = neto, redondeado al centavo, con la notificación a Finanzas sellada) y
   **no permite duplicarla**: el sistema solo admite una instrucción por estimación y rechaza un segundo intento.
5. **(art. 64 / 170)** Si el contrato ya tiene **finiquito elaborado** (estado 'cerrado'), la generación de
   una nueva instrucción de pago se **rechaza**: al determinarse el saldo del finiquito quedan extinguidos
   los derechos y obligaciones del contrato (art. 64 LOPSRM) y la relación de estimaciones queda fija en el
   documento de finiquito (art. 170 fr. VI RLOPSRM); el saldo se liquida por el finiquito.
6. La pantalla respeta el acceso por rol: el Contratista y Finanzas ejecutan; el Residente y la Dependencia
   ven en solo-lectura (sin botón de generar); la Supervisión no ve la pantalla.

**Fundamento legal (verificado contra el texto literal):** art. 24 LOPSRM (*"siempre y cuando cuenten
previamente con la suficiencia presupuestaria en la partida o partidas específicas"*); art. 54 LOPSRM
(*"deberán pagarse… en un plazo no mayor a veinte días naturales"*); art. 64 LOPSRM (finiquito —
*"extinguidos los derechos y obligaciones asumidos por ambas partes"*) y art. 170 RLOPSRM (contenido del
documento de finiquito, fr. VI relación de estimaciones). El art. 55 LOPSRM (gastos financieros por mora si
se excede el plazo) **no está implementado** en esta Etapa.

**[validar profe] resueltos en la integración (con base legal):**
- **Comprometido = Σ neto de autorizadas + pagadas** (dependencia/ejercicio, sin la actual). **Base:** art.
  24 LOPSRM exige suficiencia en la partida; la fórmula del "comprometido" es la interpretación conservadora
  estándar de presupuesto (compromiso = lo ya autorizado/erogado). El detalle exacto es **criterio del
  profe**; default conservador aplicado.
- **Cortes del semáforo:** ✅ resuelto como **criterio del equipo** (18-jun) — se miden en **días vencidos**
  del plazo de pago: verde 0 / ámbar 1-10 / rojo más de 10 (centralizados con el portafolio). El art. 54 solo
  fija el plazo de 20 días; los cortes son criterio del equipo, configurables si el profe pide otros.
- **Exigibilidad de la fianza:** el sistema la exige si hay una garantía de cumplimiento registrada en el
  contrato. **Base:** art. 48 fr. II LOPSRM (el cumplimiento se garantiza como regla general); si el
  contrato no la tiene registrada (caso de excepción, p. ej. art. 50), no bloquea. Default conservador.
- **Gate de finiquito (rechazar contrato 'cerrado'):** **resuelto con base legal** — art. 64 LOPSRM (extinción
  de obligaciones) + art. 170 RLOPSRM (la relación de estimaciones queda en el finiquito). Implementado en
  esta sesión.
- **Quién genera la instrucción / carga soportes (Contratista o Finanzas):** **sin base legal literal** —
  criterio del profe; default conservador = ambos roles ejecutores (coincide con la matriz de permisos).

**Pendientes / [PARA MAIKI]:**
- 🔴 **Ancla definitiva del plazo (art. 54):** hoy la fecha de autorización se toma de la nota de bitácora
  (solo existe si había bitácora abierta al autorizar). El ancla definitiva sería un sello de autorización
  propio de la estimación, fijado en el momento en que la residencia autoriza (HU-15); toca el núcleo
  congelado, así que lo integra Maiki.
- **Enlace entre el contrato y su presupuesto:** hoy se hace por el nombre de la dependencia y el ejercicio,
  sin una clave formal; conviene formalizarlo a futuro. [validar técnico, no legal].
- **Carga real del archivo de soportes** (factura/CFDI/fianza): hoy solo metadatos (no hay almacenamiento
  binario); marcado, no agregado en silencio.
- **Notificación a Finanzas:** sello dentro del sistema (Etapa 1); todavía sin correo real.

---

## HU-21 · Registro del pago efectuado

**Quién ve y quién hace:** **Finanzas** ejecuta (es el único que registra el pago). El Residente de obra y
la Dependencia solo **consultan**. El Contratista / Superintendente y la Supervisión **no tienen acceso**.

**Historia:**
- **Como** Finanzas
- **Deseo** registrar el pago efectuado de una estimación previamente integrada/presentada/autorizada del
  contrato, seleccionándola y aportando fecha de pago, referencia bancaria SPEI, folio fiscal CFDI y fecha
  de factura (y opcionalmente fecha de autorización y observaciones), tomando el importe automáticamente del
  neto de la estimación
- **A fin de** cerrar el ciclo de esa estimación dejándola en estado 'Pagada' de forma inmutable y
  auditable, vinculada a un pago real con la identidad de quien lo registró

**Criterios de aceptación:**
1. Al registrar el pago, la estimación seleccionada pasa a 'Pagada' en el mismo acto del registro.
2. El importe del pago no se teclea: el sistema lo fija igual al neto de la estimación; en la pantalla se
   muestra de solo-lectura.
3. No se paga dos veces la misma estimación: un segundo intento se rechaza.
4. Solo se paga una estimación en estado Integrada / Presentada / Autorizada; 'Pagada' y 'Rechazada' se
   rechazan.
5. La fecha de pago no puede ser anterior al día en que la estimación fue integrada; si lo es, se rechaza.
6. Son obligatorios la fecha de pago, la referencia bancaria SPEI, el folio fiscal CFDI y la fecha de
   factura; quien registra se toma de la sesión y se muestra por su nombre en la lista.
7. El pago es inmutable: una vez registrado no se puede modificar.
8. La consulta de pagos está limitada a quien participa en el contrato y muestra un indicador del plazo de
   20 días (art. 54) sin almacenarlo.

**Fundamento legal:** art. 54 LOPSRM (medios electrónicos de pago / plazo de pago); art. 191 LFD (citado en
el pie de página de HU-21); art. 118 RLOPSRM (citado en la pantalla como base del cuadre del importe).

**Pendientes / [validar profe]:**
- Endurecer el candado de estado a solo 'Autorizada' (hoy es permisivo: Integrada/Presentada/Autorizada) —
  decisión de Maiki/profe.
- Pago parcial vs. exacto: hoy el importe es el neto completo de la estimación; falta validar si procede el
  pago parcial.
- 'Actualizar el avance financiero del contrato' (ficha vieja): hoy solo se marca la estimación como
  pagada; no hay un acumulado financiero del contrato que se recalcule — definir si se requiere.
- Fundamento legal de que la fecha de pago no pueda ser anterior a la integración [validar con el profe].
- La fecha de autorización es provisional (pasará a HU-20); mientras tanto el plazo se ancla a la fecha de
  factura.
- Reescribir/activar las pruebas del formulario que hoy están en pausa tras la conversión a integración.

---

## Registro · Registro de usuario con aprobación

**Quién ve y quién hace:** Cualquier persona sin cuenta se **auto-registra** (público, sin sesión) y queda
'pendiente'. La aprobación o rechazo de solicitudes y el listado de pendientes los ejecuta exclusivamente la
**Dependencia / Contratante**; ningún otro rol entra a ese panel.

**Historia:**
- **Como** persona sin cuenta (que se auto-registra) y, del otro lado, la Dependencia que autoriza
- **Deseo** registrarme capturando nombre(s) y apellido(s) por separado, correo, rol que solicito
  (informativo), contraseña (mínimo 8 caracteres con confirmación) y, opcionalmente, mi empresa (elegida de
  un catálogo; si es nueva se da de alta), de modo que el sistema cree mi cuenta como 'pendiente' sin acceso
  ni rol; y que la Dependencia revise las solicitudes pendientes, asigne el rol efectivo (que puede diferir
  del solicitado), apruebe o rechace, quedando registrado quién aprobó y cuándo
- **A fin de** que solo las cuentas aprobadas por la Dependencia puedan ingresar, con el rol que la
  autoridad confirme, y que el nombre completo del usuario identifique sin ambigüedad a quien interviene en
  la bitácora

**Criterios de aceptación:**
1. Auto-registro público (sin sesión): captura nombre(s) + apellido(s) (ambos obligatorios, se exige nombre
   completo de al menos 2 palabras), correo (en minúsculas y único: un correo repetido se rechaza), rol
   solicitado (informativo), contraseña de 8 caracteres o más con confirmación, y empresa opcional. Crea la
   cuenta como 'pendiente', sin rol; no da acceso.
2. El inicio de sesión bloquea toda cuenta que no esté activa: avisa 'pendiente de aprobación por la
   dependencia' si está pendiente y 'tu solicitud fue rechazada' si lo fue; en ambos casos no entra.
3. Solo la Dependencia ve el listado de solicitudes pendientes y puede aprobar o rechazar; cualquier otro
   rol o sin sesión no accede al panel.
4. Al aprobar, la Dependencia debe elegir el rol efectivo (nunca se hereda el solicitado; si falta el rol,
   no deja aprobar): se fija el rol, la cuenta queda activa, y se registra quién aprobó y cuándo. Tras la
   aprobación la cuenta ya puede ingresar con el rol asignado.
5. Al rechazar, la cuenta queda 'rechazada' y sale de las pendientes; el solicitante recibe el mensaje de
   rechazo al intentar entrar.

**Fundamento legal:** art. 123 RLOPSRM.

**Pendientes / [validar profe]:**
- El umbral de 'nombre completo' (al menos 2 palabras) lo fijó la Fundación como regla operativa; no tiene
  artículo propio (la cita art. 123 RLOPSRM es por la trazabilidad en bitácora). [validar redacción con el
  profe]
- Existe una página de registro suelta sin enlace desde la interfaz ni cobertura de pruebas: decidir si se
  elimina o se enlaza (la versión viva es la que está dentro de la pantalla de inicio de sesión). [decisión
  Maiki]
- El bloque 'sin sesión / modo demostración' del panel de solicitudes es residuo del modo proyecto en
  retirada: revisar al remover ese modo.

---

## Por Firmar · Firma de aperturas de bitácora pendientes (bandeja "Por firmar")

**Quién ve y quién hace:** Es una bandeja transversal: cada quien firma su propia parte. Le aparece a quien
tiene aperturas de bitácora pendientes de firmar, es decir, a los firmantes del equipo del contrato:
**Residente de obra**, **Contratista / Superintendente** y **Supervisión**. La Dependencia y Finanzas
quedan fuera de esta pantalla.

**Historia:**
- **Como** firmante del equipo de un contrato (Residente, Superintendente/Contratista o Supervisión)
- **Deseo** ver en una bandeja 'Por firmar' las aperturas de bitácora donde soy firmante y todavía no
  firmo, y firmar mi propia parte desde mi cuenta
- **A fin de** que mi firma quede registrada con mi identidad y la fecha/hora, y que la apertura se marque
  como completa cuando todos los firmantes hayan firmado, habilitando la emisión de notas

**Criterios de aceptación:**
1. La bandeja lista solo las aperturas donde el usuario es firmante y aún no firmó, mostrando folio, objeto,
   su rol en la firma y la fecha de apertura; si no hay, muestra estado vacío.
2. Firmar registra la firma con la fecha/hora real y la identidad del usuario (tomada de la sesión, nunca
   enviada desde la pantalla); nadie puede firmar por otro.
3. Si el usuario no pertenece al equipo de esa apertura, se le niega el acceso; si ya había firmado, el
   sistema lo avisa.
4. El estado 'completa' se obtiene al leer: es completa cuando no quedan firmas pendientes (residente +
   superintendente + supervisión si aplica); al firmar, el sistema indica cuántas firmas faltan.
5. Mientras la apertura no esté firmada por todos, no se pueden emitir notas (candado del sistema, art. 123
   fr. III).

**Fundamento legal:** art. 123 fr. III RLOPSRM.

**Pendientes / [validar profe]:**
- La ficha vieja no tiene número de HU (es 'Por Firmar'); confirmar con el profe si se le asigna
  identificador formal o queda como sub-historia de HU-08.
- Confirmar matriz de acceso: el sistema no filtra por rol nominal (solo el equipo del contrato firma); la
  restricción de roles vive en la guarda de la pantalla (Residente / Contratista / Supervisión). Validar si
  la Dependencia y Finanzas deben quedar excluidas también del lado del servidor.
- Confirmar que la composición del equipo firmante (residente + superintendente + supervisión si existe) es
  la lista de 'firmantes autorizados' esperada por el profe (art. 123 fr. III).

---

## HU-22 · Sustitución de personas del roster (art. 125 fr. I g RLOPSRM) · 🆕 **NUEVA** (sin ficha previa)

**Quién ve y quién hace:** Ejecutan la **Dependencia / Contratante** y el **Residente de obra**. El
Contratista / Superintendente, la Supervisión y Finanzas **no acceden** a esta pantalla; el resto de las
partes solo consulta. En la práctica, también puede sustituir quien creó el contrato. Esta funcionalidad no
está en la matriz de permisos por rol (vive fuera del catálogo de HU).

**Historia:**
- **Como** Dependencia o Residente de obra asignado al contrato (el Contratista, la Supervisión y Finanzas
  no acceden)
- **Deseo** ver el equipo vigente del contrato (residente, superintendente, supervisión) con el historial
  de quién ocupó cada rol y desde cuándo, y registrar una sustitución eligiendo el rol, una nueva persona
  (de una lista de cuentas reales activas con el rol correcto) y un motivo obligatorio, de modo que el
  sistema cierre la asignación anterior conservándola en el histórico, cree la nueva como vigente ligada a
  la anterior, sincronice el acceso del contrato y, si la bitácora está abierta, asiente automáticamente la
  nota de sustitución (si no, la difiera)
- **A fin de** cumplir el art. 125 fr. I inciso g RLOPSRM sustituyendo a la persona sin borrarla,
  preservando la trazabilidad y la integridad de las firmas ya registradas (que conservan a su firmante
  original)

**Criterios de aceptación:**
1. Solo la Dependencia y el Residente ven el enlace y la pantalla de sustitución; al resto se le redirige.
   El sistema solo permite sustituir si el usuario es la Dependencia, el residente del contrato o quien lo
   creó.
2. La sustitución exige un rol válido, una persona nueva existente, activa y con el rol de cuenta esperado
   (residente → residente, superintendente → contratista, supervisión → supervisión) y un motivo no vacío;
   se rechaza si no cumple, o si la persona ya ocupa ese rol.
3. En un solo acto: cierra la asignación anterior (la deja en el histórico, nunca la borra), crea la nueva
   como vigente ligada a la anterior y con el autor tomado de la sesión, y sincroniza el acceso del
   contrato. El sistema garantiza una sola persona activa por rol e impide reasignaciones inconsistentes.
4. Con la bitácora abierta y un titular anterior, se asienta automáticamente una nota de sustitución; sin
   bitácora, la sustitución se realiza igual y la nota se difiere hasta abrir la bitácora.
5. La persona nueva siempre se elige de cuentas reales (no se teclea); si la lista está vacía, se avisa sin
   permitir captura. Una firma previa conserva a su firmante original.

**Fundamento legal:** art. 125 fr. I inciso g RLOPSRM; art. 123 fr. III RLOPSRM.

**Pendientes / [validar profe]:**
- Autoridad para sustituir: Dependencia, residente asignado o creador del contrato [validar con el profe].
- Emisor formal de la nota: hoy es quien ejecuta; [validar profe] si debe ser el residente.
- Convención entre el rol del equipo y el rol de la cuenta (superintendente = contratista) [validar con el
  profe].
- Funcionalidad sin ficha de HU previa: falta formalizarla.
- Nota diferida: la fila queda sin nota hasta abrir la bitácora; verificar que al asentarse quede
  vinculada.

---

## HU-23 · Catálogo de empresas (Oleada O3) · 🆕 **NUEVA** (sin ficha previa)

**Quién ve y quién hace:** Es una funcionalidad de implementación, sin permiso por rol: todos la usan al
registrarse o al crear un contrato. El catálogo y el registro con empresa son públicos (sin sesión): el alta
de la empresa la hace cualquier persona que se registra. El catálogo se consume desde tres lugares: el
autocompletado al registrarse (cualquiera, público), el aviso de 'misma empresa' al crear el contrato
(quien tenga acceso al alta, es decir el Residente de obra) y la búsqueda por empresa en el expediente
(quien tenga acceso al expediente). No existe un panel para administrar el catálogo: se llena solo, cuando
las personas eligen o crean su empresa al registrarse.

**Historia:**
- **Como** persona que se registra en el sistema (público), Residente de obra que da de alta un contrato, y
  cualquier rol que consulta el expediente
- **Deseo** que al registrarme elija mi empresa de un selector del catálogo único ('el primero la crea, los
  siguientes la eligen' — profe 09-jun), con la opción explícita 'registrar nueva empresa' solo si de
  verdad no existe; que el sistema deduplique por nombre normalizado fuerte como segunda red (mayúsculas y
  espacios + acentos + puntuación + sufijos de razón social tipo 'S.A. de C.V.'), que el alta del contrato
  muestre la empresa de la cuenta elegida y me avise (sin bloquear) cuando el superintendente y la
  supervisión son de la misma empresa, y que el expediente muestre la empresa de cada persona y permita
  buscar por empresa
- **A fin de** eliminar los duplicados de razón social ('patito' / 'PAT' / 'patito SA' como 3 empresas) que
  el profe señaló, dejar la empresa vinculada a cada persona como dicta 'catálogos: es lo de ley', y poder
  advertir cuando la supervisión no es un tercero independiente del contratista

**Criterios de aceptación:**
1. Registro con empresa: el campo es un selector del catálogo, no texto libre, así es imposible duplicar
   tecleando variantes. Se elige una empresa existente; la opción '➕ Registrar nueva empresa' revela un
   campo solo cuando de verdad no existe, y al enviarla queda en el catálogo, disponible para los demás.
2. Al elegir una empresa existente del selector no se duplica (se manda el nombre exacto del catálogo).
   Segunda red fuerte: si en la rama 'nueva' se teclea una variante con acentos, puntuación o sufijo de
   razón social ('Constructóra Demo' o 'Constructora Demo, S.A. de C.V.'), el sistema la resuelve a la misma
   empresa y avisa 'ya existe… selecciónala'.
3. El campo Empresa es opcional: si se deja vacío, el registro sigue funcionando y la persona queda sin
   empresa (retrocompatible).
4. Alta del contrato: cuando el superintendente y la supervisión comparten empresa se muestra el aviso de
   'misma empresa' con el nombre de la empresa y la leyenda de que la supervisión debe ser un tercero
   independiente; el aviso no bloquea el asistente y desaparece al cambiar la supervisión.
5. Expediente: muestra la empresa junto a cada persona del equipo y del histórico, y permite buscar por
   empresa, filtrando los bloques (jurídicos y equipo) que no contienen el término.

**Pendientes / [validar profe]:**
- El aviso de 'misma empresa' (superintendente vs. supervisión) hoy avisa pero no bloquea; el propio
  sistema lo marca '[validar con el profe]' por si debe ser bloqueo duro.
- La funcionalidad no cita artículos (la justificación 'catálogos: es lo de ley' es verbal del profe; no hay
  número de artículo) → sin cita legal verificable. Confirmar el fundamento legal del catálogo y de la regla
  supervisión = tercero independiente.
- Hay dos formularios de registro con la misma lógica de empresa; ambos comparten ya el normalizador
  fuerte. Confirmar si ambos deben coexistir o si uno es legado (duplicación a consolidar).
- Las reglas de normalización fuerte (qué sufijos de razón social se recortan, qué se funde) están [validar
  profe]; el cruce es conservador (no usa similitud difusa) para no fundir empresas legítimamente distintas.
  Para duplicados ya existentes hay un script de mantenimiento que repunta cada usuario a la empresa
  canónica y borra las duplicadas. Un índice único fuerte a nivel base de datos queda como mejora opcional
  para Maiki.
- La ampliación del registro para soportar empresa la marca la documentación de la oleada como 'tensión de
  alcance' (se pidió no tocar el núcleo de autenticación). Confirmar con Maiki que esa edición es
  aceptable.
- El catálogo de empresas es público (sin sesión) y expone todas las razones sociales; confirmar que eso es
  deseable (se asumió dato no sensible).

---

## HU-24 · Finiquito y cierre del contrato · 🆕 **NUEVA** (FASE 4, revisión profe 16-jun)

**Quién ve y quién hace:** La **Dependencia / Contratante** y el **Residente de obra** elaboran el finiquito
y cierran el contrato (la misma autoridad que registra convenios). El sistema revalida que solo ellos puedan
cerrarlo; los demás roles no ven la pantalla.

**Historia:**
- **Como** Dependencia / Contratante o Residente de obra
- **Deseo** elaborar el finiquito del contrato —el cálculo de lo que se le debe al contratista o de lo que él
  debe reintegrar— y con ello cerrar formalmente el contrato, dejando una nota en la bitácora
- **A fin de** dar por terminados los derechos y obligaciones de las partes conforme a la ley

**Criterios de aceptación:**
1. El sistema calcula el saldo del finiquito: toma el importe neto de las estimaciones ya autorizadas o
   pagadas, le resta lo ya pagado y el anticipo que aún no se ha recuperado (amortizado), y muestra si el
   saldo queda a favor del contratista (se le paga) o a favor de la dependencia (el contratista reintegra).
2. Al elaborar el finiquito se asienta una nota de finiquito en la bitácora y el contrato queda **cerrado**;
   el finiquito es inalterable y solo puede haber uno por contrato. Si el contrato no tiene bitácora abierta,
   primero hay que aperturarla.
3. El finiquito se puede ver e imprimir como documento con el contenido mínimo de ley (descripción del
   contrato, importes, saldo resultante y la declaración de que se extinguen las obligaciones de las partes).

**Fundamento legal:** art. 64 LOPSRM (elaboración del finiquito: créditos a favor y en contra, saldo
resultante, y acta que da por extinguidos los derechos y obligaciones); RLOPSRM arts. 168-172 (168 finiquito
y acta de recepción física; 169 notificación; 170 contenido mínimo del documento; 171 saldos a favor de cada
parte —plazos art. 54/55 LOPSRM—; 172 acta de extinción); art. 143 RLOPSRM (amortización del anticipo);
art. 66 LOPSRM (garantía por vicios ocultos que subsiste tras el finiquito).

**Pendientes / [validar profe]:**
- [validar profe] La fórmula base del saldo está verificada contra la ley, pero los conceptos que el profe
  aún no confirma —deductivas finales, sobrecosto, 5-al-millar pendiente— se dejan en un campo de **ajustes
  finales** parametrizable (default 0), no fijo. Confirmar cuáles entran y cómo se calculan.
- [validar profe] El finiquito exige que el contrato tenga bitácora abierta (porque se asienta como nota);
  confirmar si ese es el flujo deseado.
- [validar profe] La recepción física de los trabajos (acta previa al finiquito, art. 64) no se modela como
  un paso separado todavía; confirmar si se requiere.
