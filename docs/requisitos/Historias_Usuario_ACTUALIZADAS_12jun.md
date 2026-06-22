# SIGECOP — Historias de Usuario

> Versión que refleja lo que el sistema **hace hoy**, redactada en lenguaje natural para leerse en voz alta
> durante la revisión. Las historias están **ordenadas por el flujo del sistema** (alta → fianzas → bitácora →
> avance → estimación → revisión → pago → convenio → finiquito → consultas) y **conservan su identidad**
> (HU-00…HU-24, Registro y Por Firmar; no se renumeran).
>
> Las decisiones de diseño internas del equipo (los antiguos bloques "Criterios adoptados") se trasladaron a
> `docs/requisitos/CRITERIOS_ADOPTADOS_INTERNO.md` para no mezclarlas con los requisitos. Cada historia conserva
> su **Fundamento legal**.
>
> **Roles:** Residente de obra · Contratista / Superintendente · Supervisión · Dependencia / Contratante · Finanzas.

---

## Índice (orden de flujo)

| # | ID | Título | Quién ejecuta |
|---|---|---|---|
| 1 | HU-00 | Inicio de sesión | Cualquier rol con cuenta activa (transversal) |
| 2 | Registro | Registro de usuario con aprobación | Cualquier persona (público); la Dependencia aprueba |
| 3 | HU-23 | Catálogo de empresas | Registro/uso: todos (público); padrón: Dependencia |
| 4 | HU-01 | Alta de contratos | Residente de obra |
| 5 | HU-02 | Registro de fianzas y garantías | Dependencia / Contratante |
| 6 | HU-22 | Sustitución de personas del equipo del contrato (art. 125 fr. I g RLOPSRM) | Dependencia y Residente de obra |
| 7 | HU-08 | Apertura formal de la bitácora del contrato | Residente de obra |
| 8 | Por Firmar | Firma de aperturas de bitácora pendientes (bandeja "Por firmar") | Quien tiene aperturas pendientes de firmar |
| 9 | HU-09 | Emisión y respuesta de notas de bitácora (de los tipos del art. 125), con firma | Residente, Contratista y Supervisión |
| 10 | HU-10 | Consulta y búsqueda de notas de bitácora | Residente de obra |
| 11 | HU-11 | Minutas, visitas y acuerdos | Residente de obra |
| 12 | HU-05 | Programa y curva de avance | Residente de obra |
| 13 | HU-06 | Registro de trabajos terminados por periodo | Contratista / Superintendente |
| 14 | HU-07 | Alertas de atraso por concepto | Residente de obra |
| 15 | HU-12 | Apertura del periodo e integración de la estimación | Contratista / Superintendente |
| 16 | HU-13 | Envío / presentación de la estimación | Contratista / Superintendente |
| 17 | HU-15 | Recepción, revisión técnica y autorización de la estimación | Residente y Supervisión |
| 18 | HU-16 | Reingreso de estimación tras rechazo | Contratista / Superintendente |
| 19 | HU-20 | Tránsito a pago: carga de soportes y verificación de suficiencia presupuestal | Contratista y Finanzas |
| 20 | HU-21 | Registro del pago efectuado | Finanzas |
| 21 | HU-03 | Trámite y aplicación de convenios modificatorios | Dependencia / Contratante |
| 22 | HU-24 | Finiquito y cierre del contrato | Dependencia / Contratante y Residente de obra |
| 23 | HU-04 | Consulta integrada del expediente contractual | Residente de obra |
| 24 | HU-14 | Historial de estimaciones del contrato | Residente de obra |
| 25 | HU-17 | Tablero de estimaciones aceptadas y en proceso | Residente de obra |
| 26 | HU-18 | Portafolio ejecutivo con semáforos | Dependencia / Contratante |
| 27 | HU-19 | Exportación de los 7 reportes definidos del contrato | Residente de obra |

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

---

## Registro · Registro de usuario con aprobación

**Quién ve y quién hace:** Cualquier persona sin cuenta se **auto-registra** (público, sin sesión) y queda
'pendiente'. La aprobación o rechazo de solicitudes y el listado de pendientes los ejecuta exclusivamente la
**Dependencia / Contratante** desde la pantalla "Solicitudes de registro"; ningún otro rol entra a ese panel.

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

---

---

## HU-23 · Catálogo de empresas

**Quién ve y quién hace:** El catálogo y el registro con empresa son públicos (sin necesidad de iniciar sesión): el alta de la empresa la hace cualquier persona que se registra, y se consulta desde el autocompletado al registrarse (cualquiera, público) y desde el aviso de 'misma empresa' al crear el contrato (quien tenga acceso al alta, es decir el Residente de obra). Además, existe una pantalla de administración del catálogo en forma de **Padrón de empresas**, administrada por la **Dependencia / Contratante** (pantalla "Padrón de empresas", en `/admin/empresas`, restringida a la Dependencia), donde se valida o fusiona cada empresa propuesta: el padrón se llena solo (cuando las personas eligen o crean su empresa al registrarse) y la Dependencia lo cura después.

**Historia:**
- **Como** persona que se registra en el sistema (público), Residente de obra que da de alta un contrato, y Dependencia / Contratante que administra el padrón
- **Deseo** que al registrarme elija mi empresa de un selector del catálogo único (el primero la crea, los siguientes la eligen), con la opción explícita 'registrar nueva empresa' solo si de verdad no existe; que el sistema detecte duplicados comparando el nombre sin distinguir mayúsculas, espacios, acentos, puntuación ni sufijos de razón social (tipo 'S.A. de C.V.'); que el alta del contrato muestre la empresa de la cuenta elegida y me avise (sin bloquear) cuando el superintendente y la supervisión son de la misma empresa; y que la Dependencia administre un **Padrón de empresas** (pantalla "Padrón de empresas", en `/admin/empresas`) con el flujo 'propone → valida / fusiona', el estado de cada empresa (por validar / validada), su tipo (contratista / supervisión / dependencia) y los conteos de uso
- **A fin de** eliminar los duplicados de razón social ('patito' / 'PAT' / 'patito SA' contados como 3 empresas distintas), dejar la empresa vinculada a cada persona como exige la ley en materia de catálogos, poder advertir cuando la supervisión no es un tercero independiente del contratista, y darle a la Dependencia el control formal del padrón (validar, fusionar duplicados, clasificar por tipo)

**Criterios de aceptación:**
1. Registro con empresa: el campo es un selector del catálogo, no texto libre, así es imposible duplicar tecleando variantes. Se elige una empresa existente; la opción '➕ Registrar nueva empresa' revela un campo solo cuando de verdad no existe, y al enviarla queda en el catálogo, disponible para los demás.
2. Al elegir una empresa existente del selector no se duplica (se manda el nombre exacto del catálogo). Detección reforzada de duplicados: si en la rama 'nueva' se teclea una variante con acentos, puntuación o sufijo de razón social ('Constructóra Demo' o 'Constructora Demo, S.A. de C.V.'), el sistema la reconoce como la misma empresa y avisa 'ya existe… selecciónala'.
3. El campo Empresa es obligatorio para el contratista y la supervisión: una cuenta de esos roles no se registra sin empresa. (Para roles que no la requieren, el registro funciona sin empresa y la persona queda sin empresa asociada.)
4. Alta del contrato: cuando el superintendente y la supervisión comparten empresa se muestra el aviso de 'misma empresa' con el nombre de la empresa y la leyenda de que la supervisión debe ser un tercero independiente; el aviso no bloquea el asistente y desaparece al cambiar la supervisión.
5. Expediente: muestra la empresa junto a cada persona del equipo y del histórico. El buscador del expediente hoy filtra solo por **tipo de documento** y **periodo**; la **búsqueda por empresa** NO está disponible en la pantalla y queda como mejora futura.
6. Padrón de empresas (Dependencia): la pantalla "Padrón de empresas" (en `/admin/empresas`, restringida a la Dependencia) lista las empresas con su estado (por validar / validada), su tipo (contratista / supervisión / dependencia) y los conteos de uso, con el flujo 'propone → valida / fusiona' para curar duplicados. Los demás roles no ven esta pantalla.

**Fundamento legal:** art. 43 RLOPSRM `[validar profe]` (registro/padrón de contratistas) y art. 74 Bis LOPSRM `[validar profe]` (registro único de proveedores y contratistas), citados por el sistema en el padrón de empresas; lo legal lo confirma el profe.

---

---

## HU-01 · Alta de contratos

> **[DUDA para el profe:** precisar a qué se refiere "precio alzado" y en qué pantalla aplica. El término aparece en el criterio 2 (contrato sin catálogo de conceptos, monto capturado a mano); conviene confirmar su definición y su lugar exacto en la pantalla de alta.**]**

**Quién ve y qué hace:** El **Residente de obra** da de alta el contrato. El Contratista / Superintendente, la Supervisión y la Dependencia solo lo **consultan**. Finanzas **no tiene acceso** a esta pantalla.

**Historia:**
- **Como** Residente de obra
- **Deseo** dar de alta un contrato en la pantalla *Alta de contratos*, mediante un asistente de 7 pasos (datos generales; catálogo de conceptos; programa de obra como matriz concepto × periodo; datos jurídicos; garantías, penalizaciones y % de anticipo; plan de amortización del anticipo; y el PDF firmado), donde el monto se calcula solo a partir del catálogo y casi todo se valida en pantalla y se vuelve a verificar al guardar
- **A fin de** tener el expediente del contrato en línea, íntegro y consultable solo por los actores que son parte del contrato

**Criterios de aceptación:**
1. El alta guarda el contrato completo en una sola operación (todo o nada): la cabecera más sus bloques (conceptos, programa de obra, garantías, plan de amortización y el equipo inicial). El número de folio es único: si se repite, el sistema lo rechaza. Solo el Residente de obra puede crear contratos.
2. El monto del contrato no se teclea: el sistema lo calcula sumando cantidad × precio unitario de cada concepto del catálogo (sin IVA), cuadrando exacto al centavo. Cada concepto exige una clave única que captura el usuario, descripción, unidad, cantidad mayor a cero y precio unitario mayor a cero. Si es a precio alzado (sin catálogo), el monto se captura a mano (mayor a cero).
3. La fecha de término la calcula el sistema a partir del inicio y el plazo (no se confía en lo que mande la pantalla). El programa de obra es una matriz concepto × periodo (mensual o quincenal) cuyos periodos genera el sistema; cada concepto debe sumar exactamente lo contratado (cuadre al 100%) y nada queda fuera del plazo.
4. El equipo se liga a cuentas reales validadas por rol y estado: superintendente (cuenta de contratista aprobada, obligatorio) y dependencia (cuenta de dependencia aprobada, obligatorio); la supervisión es opcional. Las garantías obligatorias se exigen: cumplimiento siempre, y anticipo si el % de anticipo es mayor a cero, cada una con monto mayor a cero, sin pasar del monto del contrato y con vigencia no vencida.
5. El PDF firmado del contrato es obligatorio para registrar y, una vez subido, ya no se reemplaza (queda definitivo); solo lo sube el residente asignado y solo lo consultan los actores que son parte. Si el anticipo supera el 30%, se exige además un segundo PDF de autorización del anticipo (umbral a validar con el profe). Con anticipo mayor a cero se captura un plan de amortización por periodo que (a) suma exactamente el anticipo al centavo (art. 138 párr. 3 RLOPSRM) y (b) **se liga al programa de obra (art. 143 fr. I RLOPSRM): ningún periodo amortiza más que su importe programado y todo periodo con obra programada amortiza algo** (rechaza el plan que deja todo al último periodo). El plan se precarga proporcional al programa y se valida en pantalla y al guardar.

**Fundamento legal:** art. 45 fr. IX RLOPSRM (el catálogo con sus importes ES el presupuesto: monto derivado); art. 45 ap. A fr. X RLOPSRM (programa de obra conforme al catálogo, del total de los conceptos); art. 52 LOPSRM (programa como base para medir el avance / cuadre 100%); art. 54 LOPSRM (ciclo de estimación / periodos); art. 118 RLOPSRM (lo planeado por concepto no excede lo contratado); art. 50 fr. IV LOPSRM (anticipo sobre el umbral requiere autorización escrita del titular); art. 139 RLOPSRM (anticipo mayor al 50% se informa a la SFP); art. 50 fr. V LOPSRM (anticipo 100% solo en plurianual que inicia en el último trimestre); art. 138 párr. 3 RLOPSRM (programa/forma de aplicación del anticipo = el plan; el plan suma el anticipo) y art. 143 fr. I RLOPSRM (amortización proporcional del anticipo, ligada al programa; saldo a la estimación final, art. 143 fr. III-d); art. 46 Bis LOPSRM + arts. 86-88 RLOPSRM, tope art. 90 (penas convencionales por atraso); art. 191 LFD (retención del 5 al millar, citada en la vista); art. 47 y art. 48 fr. I y II LOPSRM (fianzas de anticipo y cumplimiento obligatorias); art. 46 fr. I y IV LOPSRM y art. 61 RLOPSRM (datos jurídicos: firmante de la dependencia y representante legal del contratista); art. 123 RLOPSRM (la dependencia no firma la bitácora → no entra al equipo firmante); art. 125 RLOPSRM (histórico de personas / sustituir-no-borrar, sembrado desde el alta).

---

---

## HU-02 · Registro de fianzas y garantías

**Quién ve y quién hace:** La **Dependencia / Contratante** captura y edita las fianzas. El Residente de
obra y Finanzas solo **consultan**. El Contratista / Superintendente y la Supervisión **no tienen acceso**.

**Historia:**
- **Como** Dependencia / Contratante (el Residente y Finanzas solo consultan; Contratista y Supervisión sin
  acceso)
- **Deseo** capturar y editar en la pantalla de Registro de fianzas y garantías las pólizas de fianza del
  contrato (tipo, afianzadora, número de póliza, monto, fecha de emisión y de vencimiento), y ver para cada
  una un distintivo de color y unos contadores según los días que faltan para su vencimiento
- **A fin de** tener a la vista y gestionar el estado de vigencia de las garantías del contrato

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
5. Las garantías capturadas en el alta del contrato y las que se agregan aquí son las mismas: esta
   pantalla las gestiona (lee, agrega, edita, endosa) y se muestran de solo-lectura en el expediente.

**Fundamento legal:** art. 48 LOPSRM (qué se garantiza: el anticipo —fr. I— y el cumplimiento del contrato
—fr. II—, dentro de los 15 días naturales del fallo); art. 66 LOPSRM (garantía por defectos y vicios ocultos);
art. 98 RLOPSRM (forma de la fianza y previsiones mínimas de la póliza); art. 91 RLOPSRM (garantía de
cumplimiento de al menos el 10% del monto y su **ajuste/ampliación** por modificación de monto o plazo, que
es el **endoso**).

---

## HU-22 · Sustitución de personas del equipo del contrato (art. 125 fr. I g RLOPSRM)

**Quién ve y quién hace:** Ejecutan la **Dependencia / Contratante** y el **Residente de obra**, desde la pantalla "Roster / sustitución" (ruta /contratos/roster). El Contratista / Superintendente, la Supervisión y Finanzas **no acceden** a esta pantalla; el resto de las partes solo consulta. En la práctica, también puede sustituir quien creó el contrato.

**Historia:**
- **Como** Dependencia o Residente de obra asignado al contrato (el Contratista, la Supervisión y Finanzas no acceden)
- **Deseo** ver el equipo vigente del contrato (residente, superintendente, supervisión) con el historial de quién ocupó cada rol y desde cuándo, y registrar una sustitución eligiendo el rol, una nueva persona (de una lista de cuentas reales activas con el rol correcto) y un motivo obligatorio, de modo que el sistema cierre la asignación anterior conservándola en el histórico, cree la nueva como vigente ligada a la anterior, actualice quién tiene acceso al contrato y, si la bitácora está abierta, asiente automáticamente la nota de sustitución (si no, la deje pendiente hasta abrir la bitácora)
- **A fin de** cumplir el art. 125 fr. I inciso g RLOPSRM sustituyendo a la persona sin borrarla, preservando la trazabilidad y la integridad de las firmas ya registradas (que conservan a su firmante original)

**Criterios de aceptación:**
1. Solo la Dependencia y el Residente ven el enlace y la pantalla de sustitución; al resto se le redirige. El sistema solo permite sustituir si el usuario es la Dependencia, el residente del contrato o quien lo creó.
2. La sustitución exige un rol válido, una persona nueva existente, activa y con el rol de cuenta esperado (residente → residente, superintendente → contratista, supervisión → supervisión) y un motivo no vacío; se rechaza si no cumple, o si la persona ya ocupa ese rol.
3. En un solo acto: cierra la asignación anterior (la deja en el histórico, nunca la borra), crea la nueva como vigente ligada a la anterior y con el autor tomado de la sesión, y actualiza quién tiene acceso al contrato. El sistema garantiza una sola persona activa por rol y evita que queden dos titulares activos del mismo rol al mismo tiempo.
4. Con la bitácora abierta y un titular anterior, se asienta automáticamente una nota de sustitución; sin bitácora, la sustitución se realiza igual y la nota queda pendiente hasta abrir la bitácora.
5. La persona nueva siempre se elige de cuentas reales (no se teclea); si la lista está vacía, se avisa sin permitir captura. Una firma previa conserva a su firmante original.

**Fundamento legal:** art. 125 fr. I inciso g RLOPSRM; art. 123 fr. III RLOPSRM.

---

---

## HU-08 · Apertura formal de la bitácora del contrato

**Quién ve y quién hace:** El **Residente de obra** abre la bitácora (y solo el residente asignado a ese contrato puede hacerlo). El Contratista / Superintendente y la Supervisión **consultan** y luego firman su parte desde 'Por firmar'. La Dependencia y Finanzas **no tienen acceso** a la vista.

**Historia:**
- **Como** Residente de obra asignado al contrato
- **Deseo** abrir la bitácora electrónica única del contrato seleccionando el equipo ya ligado a sus cuentas (residente y superintendente obligatorios; supervisión si existe), capturando la fecha de entrega del sitio, el plazo de firma de notas (en días naturales, 2 por defecto) y los datos mínimos del art. 123 fr. III (domicilios y teléfonos de ambas partes, alcance de los trabajos y características del sitio); al confirmar, el sistema deja constancia de un acta definitiva (que ya no se puede modificar), la registra como nota #1 'apertura', deja una firma pendiente por cada miembro del equipo y asienta automáticamente cualquier sustitución, avance o convenio previo que aún no tuviera nota
- **A fin de** habilitar el registro formal e inalterable de eventos del contrato; la bitácora queda 'completa' solo cuando todas las partes firman desde su propia cuenta en 'Por firmar', y hasta entonces no pueden emitirse notas posteriores (art. 46 y 52 Bis LOPSRM; arts. 122-123 fr. III RLOPSRM)

**Criterios de aceptación:**
1. Existe una sola bitácora por contrato (un intento de duplicarla se rechaza). Solo el residente asignado a ese contrato la abre; el equipo (residente y superintendente obligatorios, supervisión opcional) se toma de las cuentas del contrato, sin nombres libres; sin superintendente asignado, la apertura se rechaza.
2. La apertura registra el momento exacto de apertura (inalterable) y fija la fecha de apertura igual a la fecha de inicio del contrato; la fecha de entrega del sitio (capturada) se conserva aparte en el acta. El acta y las firmas ya no se pueden modificar.
3. La primera nota (acta de apertura, folio #1, tipo 'apertura') deja constancia definitiva de: identificación del contrato, objeto, datos financieros (monto, anticipo, plazo), cronograma (inicio / término / entrega del sitio), datos mínimos del art. 123 fr. III (domicilios, teléfonos, alcance de trabajos, características del sitio) y el registro de firmantes con su rol y cuenta.
4. Al abrir se crea una firma pendiente por cada miembro; nadie firma en la apertura. Cada parte firma después desde su cuenta ('Por firmar'); la apertura queda completa cuando no quedan firmas pendientes. No se pueden emitir notas posteriores hasta que la apertura esté firmada por todos.
5. Al abrir, si hubo sustituciones de personas, avances de trabajos o convenios registrados antes y sin nota, el sistema asienta sus notas automáticamente (con un número de folio consecutivo posterior al #1) en el mismo acto.

**Fundamento legal:** art. 46 LOPSRM; art. 52 Bis LOPSRM; art. 122 RLOPSRM; art. 123 fr. III RLOPSRM; art. 123 fr. VI RLOPSRM; art. 125 fr. I g RLOPSRM (asiento de sustitución diferida).

---

---

## Por Firmar · Firma de aperturas de bitácora pendientes (bandeja "Por firmar")

**Quién ve y quién hace:** Es una bandeja transversal: cada quien firma su propia parte. Le aparece a quien tiene aperturas de bitácora pendientes de firmar, es decir, a los firmantes del equipo del contrato: **Residente de obra**, **Contratista / Superintendente** y **Supervisión**. La Dependencia y Finanzas quedan fuera de esta pantalla.

**Historia:**
- **Como** firmante del equipo de un contrato (Residente, Superintendente/Contratista o Supervisión)
- **Deseo** ver en la bandeja "Por firmar" las aperturas de bitácora donde soy firmante y todavía no firmo, y firmar mi propia parte desde mi cuenta
- **A fin de** que mi firma quede registrada con mi identidad y la fecha/hora, y que la apertura se marque como completa cuando todos los firmantes hayan firmado, habilitando la emisión de notas

**Criterios de aceptación:**
1. La bandeja lista solo las aperturas donde el usuario es firmante y aún no firmó, mostrando folio, objeto, su rol en la firma y la fecha de apertura; si no hay, muestra estado vacío.
2. Firmar registra la firma con la fecha/hora real y la identidad del usuario, que el sistema toma de su sesión y no se captura en la pantalla; nadie puede firmar por otro.
3. Si el usuario no pertenece al equipo de esa apertura, se le niega el acceso; si ya había firmado, el sistema lo avisa.
4. Una apertura queda como "completa" cuando no quedan firmas pendientes (residente + superintendente + supervisión si aplica); al firmar, el sistema indica cuántas firmas faltan.
5. Mientras la apertura no esté firmada por todos, no se pueden emitir notas (candado del sistema, art. 123 fr. III).

**Fundamento legal:** art. 123 fr. III RLOPSRM.

---

---

## HU-09 · Emisión y respuesta de notas de bitácora (de los tipos del art. 125), con firma

**Quién ve y quién hace:** Ejecutan el **Residente de obra**, el **Contratista / Superintendente** y la
**Supervisión**, cada quien según su lugar en el equipo del contrato. La Dependencia y Finanzas **no tienen
acceso** a emitir; si son parte del contrato pueden leer la bitácora, pero no emiten notas. El sistema
reconoce el lugar de cada persona dentro del contrato; por eso el contratista emite como Superintendente.

**Historia:**
- **Como** Residente, Superintendente (Contratista) o Supervisión, según el lugar que ocupo en el equipo
  del contrato
- **Deseo** emitir notas de bitácora del tipo que me corresponde según mi lugar en el contrato (el catálogo
  del art. 125 RLOPSRM, más 'otro' para eventos que no encajan en ese catálogo), firmándolas
  automáticamente desde mi cuenta al emitirlas; responder o vincular notas previas y, si me equivoqué,
  anular mi nota generando una correctiva 'dice / debe decir', sin poder editar nunca la original; y que las
  demás partes puedan firmar (aceptar) mis notas, o que se acepten solas al vencer el plazo
- **A fin de** documentar formalmente los eventos del contrato de forma trazable, definitiva y auditable
  (art. 123 fr. V y VI RLOPSRM)

**Criterios de aceptación:**
1. En la pantalla **Emisión de notas**, el selector de tipos muestra solo los tipos del art. 125 vigentes
   que corresponden a mi lugar en el contrato (residente / superintendente / supervisión) más 'otro'; el
   sistema rechaza cualquier tipo que no me corresponda.
2. No se puede emitir ninguna nota hasta que la apertura (nota #1) esté firmada por todos; mientras falten
   firmas, el botón está deshabilitado y el sistema lo impide.
3. Cada nota recibe un número de folio consecutivo sin saltos ni duplicados, fecha y hora, y queda firmada
   por su emisor (tomado de la sesión) al emitirla; puede vincularse a una nota previa de la misma bitácora.
4. Una nota emitida es definitiva: lo único permitido es anularla, y solo lo hace su emisor, generando una
   nota correctiva vinculada 'dice / debe decir'; no se puede anular la nota de apertura ni una nota ya
   respondida por otra parte.
5. Las partes distintas del emisor pueden firmar (aceptar) la nota; si se completan todas las firmas del
   equipo, la nota queda 'firmada', y si vence el plazo de firma sin completarse se marca 'aceptada
   (tácita)'.

**Fundamento legal:** art. 122 RLOPSRM; art. 123 fr. III RLOPSRM; art. 123 fr. V RLOPSRM; art. 123 fr. VI
RLOPSRM; art. 123 fr. VII RLOPSRM; art. 125 RLOPSRM (fr. I residente, fr. II superintendente, fr. III
supervisión, último párrafo 'otros'); art. 53 LOPSRM (las notas de consecuencia las avala el residente).

---

## HU-10 · Consulta y búsqueda de notas de bitácora

**Quién ve y qué hace:** El **Residente de obra** ejecuta. El Contratista / Superintendente y la
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
1. En la pantalla **Consulta de notas**, tras seleccionar un contrato del que participo, la búsqueda
   devuelve solo las notas de su bitácora que cumplen todos los filtros aplicados a la vez (tipo, rango de
   fechas, firmante/emisor, vínculo y palabra clave); la palabra clave ignora acentos y mayúsculas y busca
   en asunto, contenido, etiqueta y tipo.
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

---

---

## HU-11 · Minutas, visitas y acuerdos

**Quién ve y quién hace:** El **Residente de obra** ejecuta. El Contratista / Superintendente y la Supervisión solo **consultan**. La Dependencia y Finanzas **no tienen acceso**.

**Historia:**
- **Como** Residente de obra
- **Deseo** registrar minutas de reuniones (fecha, lugar, participantes, asunto y, de manera opcional, el archivo PDF de la minuta), agendar visitas o inspecciones de campo (fecha, lugar, responsable, propósito), **vincular cada minuta o visita a una nota de la bitácora del contrato** y consultar la lista de acuerdos **derivada de esas minutas**, todo dentro de la pantalla "Minutas y visitas", organizada en tres pestañas (Minutas, Agenda de visitas y Acuerdos)
- **A fin de** tener concentradas las reuniones, visitas y compromisos del contrato en un solo lugar para consulta

**Criterios de aceptación:**
1. La pantalla "Minutas y visitas" tiene 3 pestañas (Minutas, Agenda de visitas y Acuerdos), acotadas por **contrato** (selector); el Residente ejecuta y el Contratista y la Supervisión solo consultan (los formularios aparecen deshabilitados con un aviso de solo-consulta); la Dependencia y Finanzas no ven la pantalla.
2. Registrar una minuta exige fecha, lugar, participantes y asunto; el archivo PDF de la minuta es **opcional**. El botón permanece deshabilitado hasta completar los datos obligatorios y, al registrar, **la minuta se guarda en el sistema** (ligada al contrato, con su autor tomado de la sesión) y se agrega arriba de la tabla con su número de minuta. Si se adjuntó PDF, **se almacena de verdad** y se consulta con 👁 desde el listado.
3. Agendar una visita exige fecha, lugar, responsable y propósito; al agendar **la visita se guarda** y se agrega con su número de visita y estado 'Programada'.
4. La pestaña Acuerdos **deriva** de los acuerdos capturados en las minutas reales del contrato; muestra vacío si ninguna minuta trae acuerdos.
5. El botón 'Adjuntar como referencia en nota' abre una ventana que lista las **notas reales de la bitácora del contrato** y, al confirmar, **el vínculo se guarda sin modificar la nota firmada** (es una referencia, no una edición).

**Fundamento legal (verificado contra el texto del RLOPSRM):**
- **Art. 123 fr. X RLOPSRM** — *"Cuando se requiera, se podrán ratificar en la Bitácora las instrucciones emitidas vía oficios, **minutas**, memoranda y circulares…"*: base literal del vínculo minuta/visita → nota.
- **Art. 123 fr. VI RLOPSRM** — *"Se prohibirá la modificación de las notas ya firmadas…"*: por eso el vínculo no modifica la nota; solo deja una referencia en la minuta o visita.

---

## HU-05 · Programa y curva de avance

**Quién ve y quién hace:** El **Residente de obra** ejecuta. El Contratista / Superintendente, la Supervisión y la Dependencia solo **consultan** (la pantalla se muestra en solo lectura). Finanzas **no tiene acceso** (no le aparece ni en el menú ni en el inicio).

**Historia:**
- **Como** Residente de obra (ejecuta); el Contratista, la Supervisión y la Dependencia consultan en solo lectura; Finanzas sin acceso
- **Deseo** seleccionar un contrato y ver su programa de obra como matriz concepto × periodo (tipo Gantt con cuatro colores: ejecutado, atraso, por venir y no programado), la curva S con tres líneas acumuladas (programado, ejecutado y financiero) que arrancan en 0% al inicio del contrato y se cortan en hoy, los indicadores clave (programado / ejecutado / financiero a hoy y la desviación), el catálogo de conceptos con su % de avance, y filtros por concepto y por rango de periodo (Todo / Últimos 3 / Último)
- **A fin de** identificar a tiempo las desviaciones entre lo planeado, lo ejecutado y lo cobrado, para decidir oportunamente

**Criterios de aceptación:**
1. Al seleccionar un contrato, la matriz concepto × periodo colorea cada celda en cuatro estados: ejecutado (verde), atraso = programado vencido sin ejecutar (rojo), por venir (ámbar) y no programado (gris), con su leyenda.
2. La curva S grafica tres líneas acumuladas en %: programado (llega al 100%), ejecutado y financiero. Las tres parten de un Inicio en 0% y las de ejecutado/financiero se detienen en el periodo de hoy (con un marcador). Cada punto muestra su valor al pasar el cursor.
3. El filtro por concepto deja una sola fila en la matriz y el catálogo y recalcula las curvas; el filtro por periodo (Todo / Últimos 3 / Último) recorta columnas y curvas sin alterar los acumulados.
4. El sistema calcula y muestra el % de avance físico global (ejecutado sobre contratado) en la cabecera y el % por concepto en el catálogo y la matriz, más los indicadores de programado / ejecutado / financiero a hoy y la desviación (ejecutado − programado) con color.
5. El financiero se calcula a nivel contrato (pagos efectuados hasta el corte, sobre el monto) y no se desglosa por concepto en esta Etapa; todos los cálculos derivan de datos reales acotados a los contratos en que la persona participa.

---

## HU-06 · Registro de trabajos terminados por periodo

**Quién ve y quién hace:** El **Contratista / Superintendente** registra el avance. El Residente de obra y la Supervisión solo **consultan**. La Dependencia y Finanzas **no tienen acceso**.

**Historia:**
- **Como** Contratista / Superintendente
- **Deseo** registrar, por periodo del programa, la cantidad ejecutada de cada concepto del catálogo, viendo en la misma pantalla el avance acumulado y el porcentaje contra lo contratado, donde cada captura genera automáticamente su nota de bitácora de tipo 'avance' (o la difiere si la bitácora aún no está abierta) y puedo CORREGIR una captura (se anula la entrada anterior y se registra una nueva vinculada; no se edita ni se elimina, corregir = registro nuevo ligado)
- **A fin de** alimentar la curva de avance ejecutado y la integración de la estimación con respaldo documental, sin poder registrar más de lo contratado (art. 118 RLOPSRM)

**Criterios de aceptación:**
1. Para capturar avance debo elegir un concepto del catálogo y un periodo del programa (de un selector, no una fecha libre); el periodo es obligatorio y debe existir en el contrato. La cantidad admite hasta 3 decimales antes de validar y guardar.
2. El sistema acumula el avance ejecutado por concepto (suma de todas las capturas) y muestra lo contratado, lo ejecutado acumulado y el % de avance por concepto; en la pantalla Registrar avance (/seguimiento/trabajos-terminados) muestra además lo programado, lo ejecutado y lo disponible del periodo elegido.
3. Bloqueo (art. 118 RLOPSRM): rechaza la captura cuando lo ejecutado acumulado del concepto más la nueva cantidad excede lo contratado. Es el único bloqueo.
4. Aviso no bloqueante: si el avance excede lo programado del periodo o el concepto no estaba programado, se registra igual y se muestra un aviso para verificar monto o conceptos (adelantar a precios pactados no requiere convenio).
5. Cada captura con cantidad mayor a cero genera una nota de bitácora automática de tipo 'avance' ligada al avance; si no hay bitácora abierta, la nota se difiere y se asienta sola al abrir la bitácora. La captura no se edita ni se elimina: corregir un error anula la entrada anterior y registra una nueva vinculada (con nota 'dice / debe decir', art. 123 fr. VI/VII RLOPSRM), revalidando el art. 118.
6. Acceso: solo el Contratista captura y corrige; el Residente y la Supervisión consultan; la Dependencia y Finanzas sin acceso. Todo limitado a quien participa en el contrato; el autor de la captura se toma de la sesión.

**Fundamento legal:** art. 118 RLOPSRM (cantidad sobre lo contratado sin orden no es pagable → bloqueo); art. 125 fr. II RLOPSRM (la nota automática del avance se cita así); art. 45 ap. A fr. X RLOPSRM / art. 52 LOPSRM (programa por periodo).

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
  canales, con un cálculo que se obtiene en pantalla a partir del programa vigente

**Criterios de aceptación:**
1. Al seleccionar un contrato (en el que la persona participa; un contrato ajeno se rechaza), el panel
   lista automáticamente solo los conceptos con déficit (lo programado acumulado al periodo vigente menos
   lo ejecutado acumulado), en las unidades del concepto, sin umbrales ni porcentajes.
2. El 'periodo vigente' es el último periodo cuyo inicio ya pasó; si el contrato aún no arranca su primer
   periodo, no se muestra ningún atraso. Un concepto que va al corriente o adelantado nunca produce un
   falso atraso.
3. El residente puede 'Asentar en bitácora' un atraso: genera una nota de tipo 'atraso' que, una vez
   asentada, queda definitiva (ya no se puede modificar) y recibe un número de folio consecutivo; exige
   que la bitácora esté abierta y que el concepto siga teniendo déficit en ese momento. El emisor de la
   nota es el residente del contrato (art. 53 LOPSRM).
4. La Supervisión (parte del contrato) ve la tabla en solo-lectura, sin el botón 'Asentar'. El Contratista,
   la Dependencia y Finanzas no tienen acceso a la vista ni al aviso.
5. Al iniciar sesión, el Residente y la Supervisión con atrasos ven un aviso dentro de la aplicación
   (banner en Inicio y un número en la campana) con el conteo de conceptos y contratos con déficit. Los
   roles sin acceso a esta pantalla no lo ven.

**Fundamento legal:** art. 52 LOPSRM (citado en el contenido de la nota de atraso); art. 45 ap. A fr. X
RLOPSRM (citado en el contenido de la nota); art. 123 RLOPSRM (asiento del sistema en bitácora; exige
bitácora abierta); art. 53 LOPSRM (emisor de la nota de consecuencia = residente).

---

---

## HU-12 · Apertura del periodo e integración de la estimación

**Quién ve y quién hace:** El **Contratista / Superintendente** integra la estimación (y solo el superintendente asignado a ese contrato puede hacerlo). El Residente de obra y la Supervisión solo **consultan**. La Dependencia y Finanzas **no tienen acceso**.

**Historia:**
- **Como** Contratista / Superintendente asignado al contrato
- **Deseo** integrar la estimación del periodo como un expediente único (carátula financiera + números generadores con el precio unitario y la cantidad contratada de cada concepto + notas de bitácora ya firmadas que vinculo desde el buscador), capturando el volumen ejecutado por concepto y las deductivas, viendo cómo se va calculando la carátula en pantalla (vista previa); al confirmar, el sistema calcula la carátula (subtotal, amortización del anticipo, 5 al millar, deductivas, retención por atraso y neto sin IVA), le asigna su número de folio consecutivo y deja la estimación como 'Integrada', ya definitiva (no se puede modificar después)
- **A fin de** presentar la estimación como expediente del periodo conforme al art. 132 RLOPSRM, lista para que el contratista la presente (disparando el art. 54), la supervisión la revise/turne y la residencia la autorice/rechace

**Criterios de aceptación:**
1. Solo el superintendente asignado al contrato integra, y solo si el contrato tiene su PDF firmado ligado; si el anticipo supera el umbral (30% por defecto) se exige además la autorización del titular ligada (art. 50 fr. IV LOPSRM).
2. La carátula la calcula el sistema (es la única fuente de verdad y ya no se puede modificar después): subtotal = suma de cantidad × precio unitario; amortización = subtotal × % de anticipo (art. 143 fr. I RLOPSRM, proporcional al avance); 5 al millar = subtotal × 0.5% (art. 191 LFD); deductivas manuales; retención por atraso = pena × subtotal si hay pena pactada y la obra va atrasada (art. 46 Bis LOPSRM + arts. 86-88 RLOPSRM, tope art. 90); neto = subtotal menos deducciones, sin IVA (art. 2 fr. XIX RLOPSRM) y nunca negativo. La pantalla solo muestra una vista previa en pantalla.
3. El sistema bloquea si, por concepto, lo acumulado (lo previo más el periodo) excede lo contratado (art. 118) o lo planeado en el programa hasta ese periodo (art. 45 ap. A fr. X + art. 52); la pantalla adelanta ambos topes con un semáforo y deshabilita 'Confirmar'.
4. El periodo no excede un mes calendario (art. 54) y no se traslapa con otra estimación no rechazada del contrato; el número de folio es consecutivo y se asigna de forma segura por contrato.
5. Solo se vinculan notas de bitácora ya firmadas del propio contrato (sin la apertura), validadas por el sistema; al integrar se guarda el expediente (carátula + generadores con sus datos + notas) en estado inicial 'Integrada'. El registro fotográfico del avance físico y financiero no se guarda en este paso: se carga y se consulta por estimación desde el Expediente (HU-04).

**Fundamento legal:** art. 132 RLOPSRM (expediente de la estimación); art. 143 fr. I RLOPSRM (amortización proporcional del anticipo); art. 46 Bis LOPSRM + arts. 86-88 RLOPSRM, tope art. 90 (penas convencionales / retención por atraso); art. 191 LFD (5 al millar); art. 118 RLOPSRM (tope contratado por concepto); art. 45 ap. A fr. X RLOPSRM + art. 52 LOPSRM (tope planeado del programa); art. 54 LOPSRM (periodo máximo 1 mes); art. 2 fr. XIX RLOPSRM (sin IVA); art. 46 / 46 Bis LOPSRM (deductivas económicas); art. 50 fr. IV LOPSRM (autorización del titular sobre el umbral de anticipo).

---

---

## HU-13 · Envío / presentación de la estimación

**Quién ve y quién hace:** El **Contratista / Superintendente** presenta la estimación (y solo el
superintendente asignado a ese contrato puede hacerlo). El Residente de obra y la Supervisión solo
**consultan**. La Dependencia y Finanzas **no tienen acceso**.

**Historia:**
- **Como** Contratista / Superintendente asignado al contrato
- **Deseo** presentar formalmente una estimación que ya integré (estado 'Integrada'), de modo que el
  sistema selle la fecha y hora exacta del acto y la estimación pase a 'Presentada'
- **A fin de** dejar evidencia definitiva del momento de entrega y arrancar el plazo de revisión y
  autorización del art. 54 LOPSRM que ejecutan la Supervisión y la Residencia

**Criterios de aceptación:**
1. Solo el superintendente asignado al contrato puede presentar; al hacerlo el sistema sella la fecha y
   hora reales y el autor (tomado de la sesión) y pasa el estado de 'Integrada' a 'Presentada'. El Residente
   y la Supervisión solo consultan; cualquier otro rol recibe un aviso de acceso denegado.
2. Solo se puede presentar una estimación que esté 'Integrada': cualquier otro estado se rechaza, y una ya
   presentada no se vuelve a presentar (el botón desaparece y el sistema avisa 'La estimación ya fue
   presentada', evitando una doble presentación simultánea).
3. La pantalla de envío de la estimación muestra el acuse con la fecha y hora exacta ('Presentada el
   dd/mm/aaaa hh:mm').
4. Al quedar presentada, la pantalla muestra un semáforo del plazo de revisión/autorización de 15 días
   naturales (art. 54), calculado en vivo desde la presentación: 'Revisión: día X de 15 / N días
   restantes / plazo vencido'.
5. El plazo de 6 días para presentar (desde el corte del periodo) es solo un aviso informativo ('Dentro /
   Fuera de los 6 días'); no deshabilita el botón ni impide presentar fuera de plazo.

**Fundamento legal:** art. 54 LOPSRM (plazo de presentación de 6 días y de revisión/autorización de 15
días).

---

---

## Recepción, revisión técnica y autorización de la estimación

**Quién ve y quién hace:** Ejecutan el **Residente de obra** y la **Supervisión** (cada uno su parte: la Supervisión registra observaciones y turna; la Residencia autoriza o rechaza). La Dependencia / Contratante **consulta**. El Contratista / Superintendente y Finanzas **no tienen acceso**.

**Historia:**
- **Como** Supervisión y Residencia (revisión secuencial; la Dependencia consulta)
- **Deseo** recibir la estimación presentada, revisarla por secciones (carátula, números generadores y notas de bitácora vinculadas, leídas del detalle real de la estimación), registrar observaciones con tipo (aclaración / corrección / rechazo) y severidad (menor / mayor / crítica) ancladas a una sección, turnar de supervisión a residencia (con o sin observaciones), y que la residencia —solo después del turnado— autorice (la estimación queda Autorizada) o rechace con motivo obligatorio (la estimación queda Rechazada, generando una observación de rechazo dirigida al contratista)
- **A fin de** decidir sobre la estimación con revisión técnica trazable y controlando visualmente el plazo de 15 días naturales del art. 54 LOPSRM, en ejercicio de la responsabilidad de la residencia (art. 53 LOPSRM)

**Criterios de aceptación:**
1. La pantalla de Revisión / autorización de estimaciones (/estimaciones/revision) carga la estimación presentada (o ya autorizada/rechazada) del contrato seleccionado y muestra carátula, números generadores y notas vinculadas del detalle real; las secciones 'fotos' y 'soportes' no se muestran porque todavía no hay archivos reales que exponer.
2. Solo la Supervisión asignada registra y elimina sus propias observaciones (con tipo y severidad por sección) mientras la estimación está presentada y aún no se turna; una vez turnada, su revisión queda cerrada.
3. La Supervisión turna a la Residencia solo si hay al menos una observación o marca explícitamente 'sin observaciones'; el turnado es requisito para resolver (intentar autorizar/rechazar sin turnar se rechaza), y el superintendente/contratista no puede autorizar.
4. Solo la Residencia asignada, y solo tras el turnado, autoriza (la estimación queda Autorizada) o rechaza con motivo obligatorio (la estimación queda Rechazada, insertando una observación de rechazo dirigida al contratista); las acciones se revalidan por rol y por la secuencia del proceso.
5. Un semáforo en vivo desde la presentación muestra el día N de 15 (verde hasta 7, amarillo de 8 a 12, rojo más de 12); es informativo del art. 54 LOPSRM y no bloquea las acciones al vencer.

**Fundamento legal:** art. 54 LOPSRM (plazo de revisión); art. 53 LOPSRM (responsabilidad de la residencia / supervisión); art. 191 LFD (retención 5 al millar, citada en la carátula leída).

---

## HU-16 · Reingreso de estimación tras rechazo

**Quién ve y quién hace:** El **Contratista / Superintendente** ejecuta (y solo el superintendente del
contrato puede reingresar). El Residente de obra **consulta** (solo-lectura). La Supervisión, la
Dependencia y Finanzas **no tienen acceso** (no les aparece en el menú ni en el inicio).

**Historia:**
- **Como** Contratista / Superintendente
- **Deseo** abrir la pantalla de Reingreso de estimación, sobre el contrato activo ver una estimación
  rechazada real, ver las observaciones reales del rechazo (las de la revisión técnica) con su severidad y
  descargarlas en PDF o Excel, capturar una nota de atención a observaciones, confirmar con una casilla que
  las atendí, y al pulsar 'Reingresar' crear una nueva versión real, vinculada a la rechazada, con su
  trazabilidad de versiones
- **A fin de** re-presentar la estimación corrigiendo lo observado, conservando la trazabilidad fiscal con
  la versión rechazada y sin reiniciar el plazo de presentación del art. 54 LOPSRM

**Criterios de aceptación:**
1. La pantalla de Reingreso de estimación carga sobre el contrato activo y permite elegir una estimación
   rechazada de su historial real (filtrando las rechazadas que aún no se reingresan). Con rol contratista el
   panel de reingreso es editable; con rol residente carga en solo-lectura; la Supervisión, la Dependencia y
   Finanzas no la ven.
2. La tabla 'Observaciones de la versión rechazada' lista las observaciones reales del rechazo
   (sección / tipo / severidad / descripción) y los botones 'Descargar PDF' y 'Descargar Excel' generan el
   archivo con esos datos reales.
3. El botón 'Reingresar estimación (nueva versión)' permanece deshabilitado hasta que la nota tenga texto y
   la casilla de confirmación esté marcada.
4. Al reingresar, el sistema crea una nueva estimación 'Integrada' (con su propio número, copiando los
   generadores y la carátula de la rechazada) y la liga a la rechazada; aparece el aviso de reingreso y la
   tabla 'Trazabilidad de versiones' (rechazada → reingreso). La rechazada permanece rechazada (histórico
   ligado). Cada rechazada se reingresa una sola vez (un segundo intento se rechaza).
5. El plazo de presentación (art. 54 LOPSRM) no se reinicia: la nueva versión nace sin sello de presentación
   propio y referencia el envío original de la rechazada. Solo el superintendente del contrato reingresa
   (la residencia no puede).

**Fundamento legal:** art. 54 LOPSRM (plazo de presentación que no se reinicia tras reingreso: el reingreso
no reabre el contador). La trazabilidad de las versiones es criterio de diseño del equipo (las versiones no
se editan ni se eliminan; corregir = registro nuevo ligado), por analogía con la inmutabilidad de la
bitácora (art. 123 fr. VI RLOPSRM: no se modifican las notas firmadas); no se funda en el art. 132 (que solo
lista los documentos de la estimación).

---

---

## HU-20 · Tránsito a pago: carga de soportes y verificación de suficiencia presupuestal

**Quién ve y quién hace:** Ejecutan el **Contratista / Superintendente** y **Finanzas**. El Residente de obra y la Dependencia solo **consultan**. La Supervisión **no tiene acceso** (no le aparece ni en el menú ni en el inicio).

**Historia:**
- **Como** Contratista / Superintendente o Finanzas (ejecutan); el Residente y la Dependencia consultan; la Supervisión sin acceso
- **Deseo** seleccionar una estimación ya autorizada y gestionar su tránsito a pago, desde la pantalla **"Tránsito a pago"**: (1) una verificación de suficiencia presupuestal que el sistema calcula del lado del servidor ('disponible = techo − comprometido') y que **bloquea** la generación de la instrucción cuando el neto excede lo disponible (art. 24 LOPSRM); (2) un semáforo del plazo de 20 días anclado en la **fecha real de autorización** (tomada de la nota de autorización que queda en la bitácora), que avisa al entrar en ámbar; (3) un checklist de soportes (factura y CFDI, más el estado de la fianza de cumplimiento que se lee de las garantías del contrato) que condiciona la generación; y un botón que **genera la instrucción de pago** (se guarda, una por estimación) y notifica a Finanzas
- **A fin de** ejecutar el tránsito a pago con los controles legales reales (art. 24 y art. 54 LOPSRM), cuadrados al centavo

**Criterios de aceptación (comportamiento actual del sistema):**
1. **(art. 24 párr. 2)** El sistema calcula, del lado del servidor, 'disponible = techo anual − comprometido' —el comprometido suma el neto de las estimaciones ya autorizadas y pagadas de esa dependencia y ejercicio, sin contar la actual— y **bloquea** la generación si el neto excede lo disponible. Si no hay techo cargado, también la bloquea e indica que falta el presupuesto (no inventa una cifra). Al cargar el techo, la **partida presupuestal específica es obligatoria** (la ley ata la suficiencia a la *"partida o partidas específicas"*, art. 24 párr. 2 LOPSRM): Finanzas captura la partida y el techo en la propia pantalla, y el sistema vincula el techo a la dependencia por su **cuenta**. Un contrato sin dependencia asociada no puede verificar la suficiencia y lo indica sin error.
2. **(art. 54)** Un semáforo del plazo de pago de 20 días naturales, anclado en la fecha real de autorización (tomada de la nota de autorización que queda en la bitácora). El plazo del semáforo arranca cuando hay autorización **y** la factura está presentada. Se mide en **días vencidos** (días pasados de los 20): verde mientras está dentro del plazo (0 vencidos), ámbar de 1 a 10 días vencidos y rojo pasados los 10, con aviso al entrar en ámbar. Si el contrato no tenía bitácora al autorizar y no hay esa fecha, el semáforo queda **deshabilitado** con una etiqueta (no inventa la fecha).
3. La instrucción solo se genera cuando los soportes obligatorios están completos: factura y CFDI (se registra el número de folio, sin subir el archivo) y la **fianza de cumplimiento vigente**, que el sistema lee de las garantías del contrato. La subida del archivo en sí está deshabilitada con una etiqueta (todavía no hay dónde almacenarlo).
4. La generación exige que la estimación esté **autorizada** (verificado en el servidor), guarda la instrucción de pago (monto = neto, redondeado al centavo, con la notificación a Finanzas sellada) y **no permite duplicarla**: el sistema solo admite una instrucción por estimación y rechaza un segundo intento.
5. **(art. 64 / 170)** Si el contrato ya tiene **finiquito elaborado** (estado 'cerrado'), la generación de una nueva instrucción de pago se **rechaza**: al determinarse el saldo del finiquito quedan extinguidos los derechos y obligaciones del contrato (art. 64 LOPSRM) y la relación de estimaciones queda fija en el documento de finiquito (art. 170 fr. VI RLOPSRM); el saldo se liquida por el finiquito.
6. La pantalla respeta el acceso por rol: el Contratista y Finanzas ejecutan; el Residente y la Dependencia ven en solo-lectura (sin botón de generar); la Supervisión no ve la pantalla.

**Fundamento legal (verificado contra el texto literal):** art. 24 LOPSRM (*"siempre y cuando cuenten previamente con la suficiencia presupuestaria en la partida o partidas específicas"*); art. 54 LOPSRM (*"deberán pagarse… en un plazo no mayor a veinte días naturales"*); art. 64 LOPSRM (finiquito — *"extinguidos los derechos y obligaciones asumidos por ambas partes"*) y art. 170 RLOPSRM (contenido del documento de finiquito, fr. VI relación de estimaciones). El art. 55 LOPSRM (gastos financieros por mora si se excede el plazo) **no está implementado** en esta Etapa.

---

---

## HU-21 · Registro del pago efectuado

**Quién ve y quién hace:** **Finanzas** ejecuta (es el único que registra el pago). El Residente de obra y la Dependencia solo **consultan**. El Contratista / Superintendente y la Supervisión **no tienen acceso**.

**Historia:**
- **Como** Finanzas
- **Deseo** registrar el pago efectuado de una estimación previamente AUTORIZADA por la residencia (art. 54 LOPSRM) del contrato, seleccionándola en la pantalla Registro del pago y aportando fecha de pago, referencia bancaria SPEI, folio fiscal CFDI y fecha de factura (y opcionalmente fecha de autorización y observaciones), tomando el importe automáticamente del neto de la estimación
- **A fin de** cerrar el ciclo de esa estimación dejándola en estado 'Pagada' de forma definitiva (ya no se puede modificar) y auditable, vinculada a un pago real con la identidad de quien lo registró

**Criterios de aceptación:**
1. Al registrar el pago, la estimación seleccionada pasa a 'Pagada' en el mismo acto del registro.
2. El importe del pago no se teclea: el sistema lo fija igual al neto de la estimación; en la pantalla se muestra de solo-lectura.
3. No se paga dos veces la misma estimación: un segundo intento se rechaza.
4. Solo se paga una estimación AUTORIZADA por la residencia (art. 54 LOPSRM); cualquier otro estado (Integrada / Presentada / Rechazada / Pagada) se rechaza.
5. La fecha de pago no puede ser anterior al día en que la estimación fue integrada; si lo es, se rechaza.
6. Son obligatorios la fecha de pago, la referencia bancaria SPEI, el folio fiscal CFDI y la fecha de factura; quien registra se toma de la sesión y se muestra por su nombre en la lista.
7. El pago es definitivo: una vez registrado ya no se puede modificar.
8. La consulta de pagos está limitada a quien participa en el contrato y muestra un indicador del plazo de 20 días (art. 54) sin almacenarlo.

**Fundamento legal:** art. 54 LOPSRM (medios electrónicos de pago / plazo de pago); art. 191 LFD.

---

## HU-03 · Trámite y aplicación de convenios modificatorios

**Quién ve y quién hace:** La **Dependencia / Contratante** registra los convenios. El Residente de obra,
el Contratista / Superintendente y la Supervisión solo **consultan**. Finanzas **no tiene acceso**. En la
práctica el sistema también deja registrar al residente asignado al contrato o a quien lo creó; cualquier
otro rol que intente registrar ve la pantalla en modo solo consulta para su rol.

**Historia:**
- **Como** Dependencia / Contratante (o el residente asignado / quien creó el contrato)
- **Deseo** registrar un convenio modificatorio del contrato de tipo monto, plazo, programa o mixto:
  capturo el tipo, el motivo (dictamen técnico) y, según el tipo, el catálogo y el programa nuevos
  completos (el sistema calcula el monto solo, no lo tecleo) o el nuevo plazo; al registrarlo, si toca el
  programa el sistema guarda una versión nueva que ya no se puede modificar y deja la anterior como
  sustituida, ajusta el monto y el plazo vigentes del contrato, asienta una nota automática en la bitácora
  y marca cuándo la variación exige revisión de la SFP (más del 25%) o da derecho a ajuste de costos (más
  del 50%)
- **A fin de** documentar formalmente los cambios al contrato conforme al art. 59 LOPSRM (y dejar visible
  el derecho del art. 59 Bis cuando aplica), preservar el histórico de versiones del programa de forma que
  ya no se puede modificar, y poder consultar qué cambió, cuándo, por quién y por qué

**Criterios de aceptación:**
1. Solo la Dependencia, el residente asignado o quien creó el contrato puede registrar convenios; las demás
   partes solo consultan. Cualquier otro rol que lo intente ve la pantalla en modo solo consulta para su rol.
2. Al registrar un convenio que toca el programa (monto/programa/mixto), el sistema guarda una versión
   nueva del programa que ya no se puede modificar, la marca como vigente y deja la anterior como sustituida
   sin alterarla. Un convenio de plazo puro actualiza el plazo y la fecha de término del contrato, pero no
   crea una nueva versión del programa.
3. El monto y los porcentajes de variación los calcula el sistema (suma de cantidad × precio unitario, al
   centavo); el usuario nunca teclea el monto. El sistema rechaza el convenio si el catálogo nuevo no
   incluye todos los conceptos, tiene claves repetidas, descuadra el programa o reduce un concepto por
   debajo de lo ya estimado (art. 118 RLOPSRM). Si la variación de monto o plazo supera el límite
   configurable (25% por defecto), el sistema **avisa, no bloquea**: registra el convenio y marca el aviso de
   variación (referido al art. 59 LOPSRM; el 25% es referencia administrativa de revisión, art. 102 RLOPSRM).
4. Cada convenio queda guardado de forma definitiva con número de folio (capturado o asignado), tipo,
   motivo/dictamen (art. 99 RLOPSRM), fecha y hora, autor (tomado de la sesión) y las marcas de "requiere
   revisión de la SFP" (más del 25%, art. 102 RLOPSRM) y "requiere ajuste de costos" (más del 50%, art. 59
   Bis); ya no se puede modificar ni anular (corregir = convenio nuevo).
5. Al registrar el convenio se asienta una nota automática en la bitácora del contrato (de inmediato si
   está abierta, diferida si todavía no); las versiones del programa se pueden consultar revisando su
   contenido concepto × periodo.
6. **(art. 59 párr. 3 + art. 99 p5 RLOPSRM — acto de autorización)** Registrar y autorizar son actos
   distintos. El convenio nace en estado **"registrado / pendiente de autorización"** (lo sustenta el
   residente/dependencia, art. 99 p1). La **AUTORIZACIÓN** la realiza después el **servidor facultado**
   (rol Dependencia): el sistema la sella de forma definitiva (quién autoriza y cuándo) y solo entonces el
   convenio queda "autorizado". Si la variación de monto o plazo **supera el 25%** (art. 102 RLOPSRM), la
   autorización exige que el **oficio/soporte de aprobación** ya esté cargado; si falta, se rechaza con ese
   motivo. Re-autorizar un convenio ya autorizado se rechaza (acto único).

**Fundamento legal:** art. 59 LOPSRM; art. 59 Bis LOPSRM; **art. 59 párr. 3 LOPSRM (autorización por el
servidor facultado)**; art. 99 RLOPSRM (p1 sustento del residente, p5 suscripción del facultado); art. 102
RLOPSRM; art. 123 fr. XI RLOPSRM (asiento del convenio en la bitácora como asunto trascendente); art. 45 fr. IX RLOPSRM. La regla de NO reducir un concepto por debajo de lo ya estimado es **criterio de diseño del equipo** (sin cita legal directa: el art. 118 trata trabajos excedentes, no reducciones).

---

## HU-24 · Finiquito y cierre del contrato

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
   el finiquito es definitivo (ya no se puede modificar) y solo puede haber uno por contrato. Si el contrato
   no tiene bitácora abierta, primero hay que aperturarla.
3. El finiquito se puede ver e imprimir como documento con el contenido mínimo de ley (descripción del
   contrato, importes, saldo resultante y la declaración de que se extinguen las obligaciones de las partes).

**Fundamento legal:** art. 64 LOPSRM (elaboración del finiquito: créditos a favor y en contra, saldo
resultante, y acta que da por extinguidos los derechos y obligaciones); RLOPSRM arts. 168-172 (168 finiquito
y acta de recepción física; 169 notificación; 170 contenido mínimo del documento; 171 saldos a favor de cada
parte —plazos art. 54/55 LOPSRM—; 172 acta de extinción); art. 143 RLOPSRM (amortización del anticipo);
art. 66 LOPSRM (garantía por vicios ocultos que subsiste tras el finiquito).

---

## HU-04 · Consulta integrada del expediente contractual

**Quién ve y quién hace:** El **Residente de obra** consulta el expediente como ejecutor. El Contratista /
Superintendente, la Supervisión y la Dependencia también lo **consultan** (solo lectura). Finanzas **no
tiene acceso**. Además, el sistema solo deja entrar a quien es parte o supervisión de ese contrato; a
cualquier otro le niega el acceso.

**Historia:**
- **Como** Residente de obra (ejecuta); el Contratista, la Supervisión y la Dependencia consultan en
  solo lectura; Finanzas sin acceso
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
2. El bloque de configuración muestra el superintendente vigente tomado del equipo del contrato (art. 125).
3. El buscador filtra los bloques por dos campos: **tipo de documento** y **periodo**. Los bloques que no
   coinciden se ocultan solo en pantalla, no en el PDF.
4. El expediente completo se exporta como un solo PDF con 'Exportar expediente (PDF)': oculta lo accesorio
   de la pantalla y fuerza a abrir los bloques que estuvieran colapsados u ocultos por la búsqueda. No hay
   descarga individual por bloque.
5. El resumen de estimaciones lista número, periodo, estado del ciclo (con su etiqueta) y el total neto
   sumado de todas las estimaciones del contrato.

**Fundamento legal:** art. 45 fr. IX RLOPSRM (clave del concepto en el catálogo); art. 59 LOPSRM / art. 99
RLOPSRM (convenios modificatorios); art. 125 RLOPSRM (sustitución de personas / equipo); art. 138 fr. I
RLOPSRM (plan de amortización del anticipo); art. 123 fr. III RLOPSRM (nota de sustitución) y art. 123 fr. XI
RLOPSRM (nota de convenio, asunto trascendente).

---

## HU-14 · Historial de estimaciones del contrato

**Quién ve y quién hace:** El **Residente de obra** ejecuta. El Contratista / Superintendente y la
Dependencia solo **consultan**. La Supervisión y Finanzas **no tienen acceso**. En la práctica cualquier
parte del contrato (incluida la dependencia y el superintendente) también puede consultar el historial.

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
1. Al seleccionar un contrato del que se es parte (o supervisión), la pantalla **Historial de estimaciones**
   lista todas sus estimaciones ordenadas por número, incluyendo las rechazadas, mostrando estimación,
   periodo, estado (con un distintivo visual), importe neto y fecha de presentación (la fecha en que la
   estimación se envió/presentó).
2. Los filtros de periodo y estado operan a la vez: una estimación solo aparece si cumple ambos; las
   opciones de cada filtro salen de los datos cargados.
3. Al hacer clic en una fila se abre un panel lateral 'Expediente' (un resumen del expediente, no el
   expediente completo) que muestra los datos reales: periodo, estado, importe y fecha de presentación. Los
   campos fecha de revisión, fecha de pago y observaciones se muestran como espacios vacíos ('—') hasta que
   existan sus sellos: hoy el sistema solo registra las fechas de integración y presentación, por lo que la
   revisión, el pago y las observaciones aún no se reflejan. El panel se cierra con el botón o tocando fuera.
4. El botón 'Exportar historial' descarga un Excel con las filas filtradas (estimación, versión, periodo,
   estado, importe y fechas); el filtro y el export funcionan sobre los datos cargados. La columna 'versión'
   sale '—' porque una estimación no se versiona: una rechazada aparece como un estado, no como una versión
   anterior. Las fechas de revisión y pago quedan vacías, igual que en el panel del criterio 3.
5. Un contrato sin estimaciones muestra un estado vacío sin error; un usuario sin participación recibe un
   aviso de sin acceso.

**Fundamento legal:** HU-14 es una vista de consulta; el fundamento legal del ciclo de la estimación vive
en las historias de integración, revisión/autorización y reingreso de la estimación.

---

---

## HU-17 · Tablero de estimaciones aceptadas y en proceso

**Quién ve y quién hace:** El **Residente de obra** ejecuta. El Contratista / Superintendente, la Supervisión y la Dependencia solo **consultan**. Finanzas **no tiene acceso**. Nota: cada quien ve solo los contratos en que participa; la Dependencia ve todos.

**Historia:**
- **Como** Residente de obra (ejecutor; el Contratista, la Supervisión y la Dependencia en consulta; Finanzas sin acceso)
- **Deseo** ver un tablero de solo lectura con las estimaciones de los contratos donde participo (la Dependencia ve todas), excluyendo las rechazadas del listado, donde cada estimación muestra su línea de tiempo de 4 fases (Integrada → Presentada → Autorizada → Pagada), su estado, periodo, monto neto y responsable; con indicadores de cartera (número de contratos, monto estimado, pagado y pendiente, conteos y montos por estado, antigüedad promedio por estado), filtros de consulta (estado/periodo/responsable) y un panel 'Mis pendientes' acotado a mi rol
- **A fin de** saber qué estimación está en qué estado y qué requiere mi acción inmediata

**Criterios de aceptación:**
1. El listado 'Estimaciones aceptadas y en proceso' muestra solo los estados Integrada, Presentada, Autorizada y Pagada, y excluye las rechazadas; las rechazadas sí se cuentan en los contadores y métricas por estado.
2. Cada tarjeta de estimación muestra una línea de tiempo de 4 fases que marca como completadas las fases anteriores al estado actual y resalta el estado vigente, más el estado, periodo, monto neto cuadrado y el rol responsable de la siguiente acción.
3. Los indicadores de cartera los calcula el sistema: totales (contratos, monto estimado, monto pagado, monto pendiente), desglose por estado (cantidad, monto, antigüedad promedio) y desglose por contrato; la pantalla solo da formato.
4. El panel 'Mis pendientes' lista solo las estimaciones cuyo estado exige una acción que ejecuta el rol de la persona: el contratista presenta las integradas y reingresa las rechazadas; la supervisión/residencia revisa-autoriza las presentadas; Finanzas paga las autorizadas.
5. La visibilidad está acotada a los contratos donde la persona participa; la Dependencia ve todos, pero a Finanzas el sistema le oculta la pantalla.

**Fundamento legal:** art. 54 LOPSRM (periodo de la estimación y flujo presentar/autorizar).

---

---

## HU-18 · Portafolio ejecutivo con semáforos

**Quién ve y quién hace:** La **Dependencia / Contratante** ejecuta. El Residente de obra y la Supervisión
**consultan** (solo-lectura). El Contratista / Superintendente y Finanzas **no tienen acceso**.

**Historia:**
- **Como** Dependencia / Contratante (con acceso de solo-lectura para la Residencia y la Supervisión; el
  Contratista y Finanzas sin acceso)
- **Deseo** ver una lista de contratos del portafolio donde cada renglón muestra un semáforo de 3 colores
  (verde / amarillo / rojo) calculado a partir de tres factores (desviación del avance frente a lo
  programado, días vencidos en plazos y pendientes sin atender), con contadores por color, un distintivo de
  variación del avance contra el mes anterior, agrupación por contratista o por ejercicio fiscal, y un panel
  de detalle (avance físico, avance financiero, atrasos y penalizaciones) que se abre con doble clic
- **A fin de** identificar de un vistazo cuáles contratos requieren atención ejecutiva y abrir su detalle

**Criterios de aceptación:**
1. Cada renglón muestra un semáforo (verde, amarillo o rojo) que combina los tres factores (desviación del
   avance, días vencidos y pendientes sin atender): a mayor problema acumulado, el color pasa de verde a
   amarillo y de amarillo a rojo. El semáforo **se calcula en el servidor a partir de los datos reales del
   contrato** y se acota por participación: la Dependencia (que es quien ejecuta esta pantalla) ve todos los
   contratos; la Residencia y la Supervisión, solo aquellos en los que participan. Al pasar el cursor se ve el
   desglose de cada factor.
2. La cabecera muestra 4 contadores: total de contratos y conteo de contratos en verde, amarillo y rojo.
3. El doble clic sobre un renglón abre un panel de detalle con avance físico %, avance financiero %, atrasos
   (días vencidos) y penalizaciones ($), con botón Cerrar.
4. El control 'Agrupar por' reorganiza la tabla por Contratista o por Ejercicio fiscal (o Ninguno),
   mostrando un encabezado de grupo con su conteo.
5. Cada renglón muestra un distintivo de variación del avance vs. el mes anterior (↑/↓ N puntos o '=
   igual').

**Fundamento legal:** El factor de atrasos en plazos toma como referencia el plazo de autorización de la
estimación (art. 54 LOPSRM).

---

## HU-19 · Exportación de los 7 reportes definidos del contrato

**Quién ve y quién hace:** El **Residente de obra** ejecuta (es el único que descarga/exporta). El
Contratista / Superintendente, la Supervisión, la Dependencia y Finanzas solo **consultan** (ven la vista en
solo-lectura, con los botones de exportar deshabilitados).

**Historia:**
- **Como** Residente de obra
- **Deseo** seleccionar un contrato (de los que participo) y un periodo (Mensual, Trimestral o Acumulado), y
  descargar los 7 reportes definidos en su formato (PDF y/o Excel), generados a partir de los datos reales
  del contrato (el reporte 4, Observaciones, se genera con la consulta de observaciones a nivel contrato)
- **A fin de** llevar la información del sistema a oficios, presentaciones o expedientes de auditoría, con
  valores que cuadran con lo que guarda el sistema (carátula, curva S, convenios) sin recalcularlos

**Criterios de aceptación:**
1. Tras seleccionar un contrato, los 7 reportes —1 (Avance físico, PDF + Excel), 2 (Avance financiero,
   Excel), 3 (Listado de estimaciones, Excel), 4 (Observaciones, Excel), 5 (Bitácora, PDF), 6 (Histórico de
   modificatorios, Excel) y 7 (Penalizaciones, Excel)— descargan un archivo real con un nombre que incluye
   el reporte, el periodo y la fecha. El reporte 5 (Bitácora) solo descarga si la bitácora está abierta (ver
   cr. 5).
2. El reporte 4 (Observaciones) se genera a partir de la consulta de observaciones a nivel contrato (que
   reúne las observaciones de la revisión técnica de la estimación).
3. El selector de periodo (Mensual / Trimestral / Acumulado) solo acota el rango de fechas donde aplica y
   etiqueta el nombre del archivo; no cambia las columnas ni el contenido del reporte.
4. Solo el Residente ejecuta la exportación; el Contratista, la Supervisión, la Dependencia y Finanzas ven
   la vista en solo-lectura con aviso de consulta y todos los botones de exportar deshabilitados.
5. El reporte 5 (Bitácora) solo se exporta si el contrato tiene la bitácora abierta; si no, su botón se
   deshabilita con el aviso 'Sin bitácora aperturada'. Los reportes vuelcan tal cual los valores que guarda
   el sistema (carátula, pagos, convenios) y muestran el estado de la estimación con su etiqueta canónica
   (Integrada / Presentada / Autorizada / Rechazada / Pagada).

**Fundamento legal:** art. 54 LOPSRM (presentación de estimación / plazo, sello 'Presentada'); art. 59 / 59
Bis LOPSRM (convenios modificatorios y ajuste de costos); art. 102 RLOPSRM (revisión SFP en convenios); art.
46 Bis LOPSRM + arts. 86-88 RLOPSRM (pena por atraso); art. 191 LFD (retención 5 al millar);
art. 46 / 46 Bis LOPSRM (deductivas / penas convencionales).

---

---

