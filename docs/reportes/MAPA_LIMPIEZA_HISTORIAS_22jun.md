# Mapa de limpieza de historias (22-jun) — qué cambió en cada una

> Respaldo del original: docs/historial/requisitos/Historias_Usuario_ACTUALIZADAS_12jun_pre-limpieza-22jun.md
> Decisiones de diseño movidas a: docs/requisitos/CRITERIOS_ADOPTADOS_INTERNO.md
> Citas legales y comportamiento de los criterios: CONSERVADOS sin cambio.

## HU-00
- Extraje el bloque completo 'Criterios adoptados' (con su referencia al doc interno TABLA_VALIDAR_PROFE_RESUELTOS, 'ficha vieja', 'server-side', 'Criterio del equipo' y códigos B12/B13) y lo saqué del cuerpo de la sección.
- El cuerpo de la sección (encabezado, Quién ve y hace, Historia, Criterios de aceptación, Fundamento legal) se conservó VERBATIM: no contenía tecnicismos, metadatos ni nombres de archivos de código.
- Conservé exactos los 5 criterios de aceptación y la cita legal (art. 123 RLOPSRM).
- La sección final solo contiene: encabezado + Quién ve y hace + Historia/Deseo + Criterios de aceptación + Fundamento legal.

## HU-01
- Añadí al inicio una marca visible [DUDA para el profe] sobre 'precio alzado' (el profe lo leyó pero NO lo entendió ni confirmó pantalla); NO inventé definición.
- Nombré la pantalla real: 'Alta de contratos' (componente AltaContrato.jsx, ruta /contratos/alta) donde el texto decía genéricamente el asistente/formulario.
- Tecnicismo: 'todo de una sola vez' / 'de una sola vez (todo o nada)' → 'en una sola operación (todo o nada)'.
- Tecnicismo: 'queda inmutable' → 'queda definitivo' en el criterio 5.
- Renombré 'Quién ve y quién hace' → 'Quién ve y qué hace' (encabezado estándar).
- Extraje el bloque 'Criterios adoptados' completo a criterios_adoptados_md y lo quité de la sección; eliminé la referencia al doc interno (docs/reportes/TABLA_VALIDAR_PROFE_RESUELTOS_18jun.md).
- Conservé EXACTOS todos los criterios de aceptación (comportamiento) y TODAS las citas legales sin cambiar ningún artículo ni fracción.

## HU-02
- Quité la línea 'Estado: ✅ Funcional (sesión E2 18-jun)… ya no es maqueta' (meta/estado interno).
- Extraje el bloque 'Criterios adoptados' completo y lo saqué del cuerpo (va en criterios_adoptados_md).
- Quité 'y el nombre del archivo PDF' de la lista de datos de la póliza (ajuste pedido por el profe).
- Nombré la pantalla real: 'pantalla de Registro de fianzas y garantías' donde el texto decía 'una pantalla'.
- Quité los códigos internos de HU impresos al usuario: 'el alta del contrato (HU-01)' → 'el alta del contrato'; 'el expediente (HU-04)' → 'el expediente'.
- Conservé verbatim los 5 criterios de aceptación y todas las citas legales (art. 48, 66 LOPSRM; art. 98, 91 RLOPSRM).

## HU-03
- Criterio 1 y cuerpo 'Quién ve y quién hace': 'recibe un aviso de acceso denegado' -> 've la pantalla en modo solo consulta para su rol' (lo que el sistema realmente muestra).
- Criterio 6: eliminada la coletilla obsoleta 'Alcance Etapa 1 [validar]: el acto de autorizacion queda registrado; la modificacion material... diferir el efecto material hasta la autorizacion es un ajuste posterior coordinado con el equipo de estimaciones' (el profe pidio quitarla).
- Tecnicismo 'inmutable/inmutables' -> 'que ya no se puede modificar' / 'de forma definitiva' / 'sella de forma definitiva' (criterios 2, 4, 6, Historia y A-fin-de).
- Criterio 4: 'folio (capturado o asignado)' -> 'numero de folio (capturado o asignado)'.
- Criterio 4: 'no se edita ni se anula' -> 'ya no se puede modificar ni anular'.
- Bloque 'Criterios adoptados' extraido completo a criterios_adoptados_md y removido del cuerpo de la seccion.
- Conservados sin cambio TODOS los criterios de aceptacion (comportamiento) y TODAS las citas legales (art. 59, 59 Bis, 59 parr. 3, 99 p1/p5, 102, 118, 123 fr. XI, 45 fr. IX, 53 LOPSRM, DOF 14-11-2025).

## HU-04
- Criterio 2: quité 'con respaldo al dato del alta si hiciera falta' (meta/interna).
- Criterio 3: quité el paréntesis '(se quitaron los filtros de folio, contratista, empresa y objeto porque…)'; quedó solo 'el buscador filtra por tipo de documento y periodo'.
- Extraje el bloque 'Criterios adoptados' completo a criterios_adoptados_md y lo quité del cuerpo de la sección.
- Quité la referencia a documento interno '(ver docs/reportes/TABLA_VALIDAR_PROFE_RESUELTOS_18jun.md)' del encabezado del bloque extraído.
- Normalicé 'solo-lectura' a 'solo lectura' (sin guion) en el encabezado e historia.
- Conservé exactos los 5 criterios de aceptación y todas las citas legales (45-IX, 59 LOPSRM, 99, 125, 138-I, 123-III, 123-XI RLOPSRM).

## HU-05
- Extraje el bloque completo 'Criterios adoptados' (con la referencia interna a docs/reportes/TABLA_VALIDAR_PROFE_RESUELTOS_18jun.md y las menciones a 'ficha vieja') y lo quité de la sección; va aparte en criterios_adoptados_md.
- Reemplacé el tecnicismo '(ven un aviso de solo-lectura)' por 'la pantalla se muestra en solo lectura' en 'Quién ve y quién hace'.
- Conservé EXACTOS los 5 criterios de aceptación (comportamiento intacto) y la Historia completa.
- La sección no tiene citas legales ni línea 'Fundamento legal' (el propio texto aclara que esta vista no cita ley); no se inventó ninguna.
- El cuerpo ya estaba en lenguaje llano; no hubo otros tecnicismos (append-only, folio, FK, etc.) que reescribir.

## HU-06
- Extraído el bloque completo 'Criterios adoptados' y retirado del cuerpo de la sección (devuelto en criterios_adoptados_md).
- Tecnicismo 'append-only' reescrito en la Historia y en el criterio 5 a 'no se edita ni se elimina; corregir = registro nuevo ligado'.
- 'se redondea a 3 decimales' → 'admite hasta 3 decimales' en el criterio 1.
- Pantalla ambigua nombrada en el criterio 2: 'el formulario' → 'la pantalla Registrar avance (/seguimiento/trabajos-terminados)'.
- Eliminada la referencia interna '(HU-05)' en el 'A fin de' de la Historia (código interno al usuario).
- Conservados intactos los 6 criterios de aceptación, el aviso no bloqueante (criterio 4) y todas las citas legales (art. 118, 123 fr. VI/VII, 125 fr. II, 45 ap. A fr. X RLOPSRM, art. 52 LOPSRM).

## HU-07
- Extraje el bloque 'Criterios adoptados' completo (con su referencia a TABLA_VALIDAR_PROFE_RESUELTOS) y lo quité del cuerpo de la sección.
- Criterio 3: 'nota inmutable' -> 'nota que, una vez asentada, queda definitiva (ya no se puede modificar)'.
- Criterio 3: 'folio correlativo' -> 'número de folio consecutivo'.
- Deseo (A fin de): 'cálculo que se obtiene en vivo del programa vigente' -> 'cálculo que se obtiene en pantalla a partir del programa vigente'.
- Conservé exactos los 5 criterios de aceptación, el comportamiento y todas las citas legales (52 LOPSRM, 45 ap. A fr. X RLOPSRM, 123 RLOPSRM, 53 LOPSRM).

## HU-08
- Extraje el bloque 'Criterios adoptados' completo a criterios_adoptados_md y lo quité de la sección.
- Reemplacé 'congela un acta inmutable' por 'deja constancia de un acta definitiva (que ya no se puede modificar)'.
- 'inmutable'/'inmutables' → 'definitiva' / 'ya no se pueden modificar' (c2, c3, Deseo).
- 'numeradas después de la #1' → 'con un número de folio consecutivo posterior al #1' (c5).
- Quité la referencia al doc interno (TABLA_VALIDAR_PROFE_RESUELTOS_18jun.md) del encabezado del bloque de criterios.
- Quité 'hallazgo del profe, audio 2026-06-01', 'como decía la ficha vieja' y 'Criterio del equipo (default conservador)'.
- En criterios adoptados, 'append-only' → 'no se editan ni se eliminan; corregir = registro nuevo ligado'; 'inmutabilidad' → 'carácter definitivo'; quité el código interno '(A10)'.
- Eliminé la línea meta sobre las pruebas automáticas que probaban un formulario viejo de demostración.
- Conservé intactos los 5 criterios de aceptación y todas las citas legales (art. 46, 52 Bis LOPSRM; 122, 123 fr. III, fr. V, fr. VI, 125 fr. I g RLOPSRM).

## HU-09
- Titulo: 'notas tipificadas' -> 'notas de bitacora (de los tipos del art. 125), con firma'.
- Cuerpo 'Quien ve': quite la palabra 'Nota:' y la frase '(no su rol generico)'; redactado llano conservando que el contratista emite como Superintendente.
- Deseo: 'eventos no tipificados' -> 'eventos que no encajan en ese catalogo'.
- A fin de: 'inmutable' -> 'definitiva' (conserva art. 123 fr. V y VI).
- Criterio 1: nombre la pantalla real 'Emision de notas' (componente EmisionNotas.jsx, ruta /bitacora/notas) para quitar ambiguedad; conserve la cita art. 125.
- Criterio 3: 'folio correlativo' -> 'numero de folio consecutivo'.
- Criterio 4: 'es inmutable' -> 'es definitiva'.
- Extraje el bloque 'Criterios adoptados' completo y lo quite de la seccion.
- CONSERVE intactas todas las citas: art. 122, 123 fr. III/V/VI/VII, 125 (fr. I/II/III + ultimo parrafo), 53 LOPSRM. No cambie art. 125 ni art. 123 fr. III (ambas correctas segun instruccion).

## HU-10
- Encabezado del bloque de roles corregido de 'Quién ve y quién hace' a 'Quién ve y qué hace'.
- Criterio 1: nombré la pantalla real 'Consulta de notas' (componente ConsultaNotas.jsx, ruta /bitacora/consulta) en lugar de dejar 'la búsqueda' sin contexto de pantalla.
- Extraje completo el bloque 'Criterios adoptados' (con su referencia interna a TABLA_VALIDAR_PROFE_RESUELTOS_18jun.md y el lenguaje 'criterio del equipo / default conservador') y lo quité del cuerpo de la sección.
- Conservé verbatim los 5 criterios de aceptación y todas las citas legales (art. 125, art. 123 fr. III y fr. XII RLOPSRM); no hubo tecnicismos adicionales que traducir en el cuerpo.

## HU-11
- Quité la línea de Estado ("✅ Funcional (sesión autónoma E2, 18-jun)… antes era una maqueta sin guardado real").
- Nombré la pantalla real: "Minutas y visitas" (componente MinutasVisitas.jsx, ruta /bitacora/minutas), en lugar de "una pantalla con tres pestañas".
- PDF de la minuta ahora se describe como OPCIONAL (verificado: el código no lo exige en datosOk), no obligatorio.
- Quité la promesa de "resaltado verde" y cambié "folio correlativo" → "su número de minuta" / "su número de visita".
- Estado de la visita: cambié 'Agendada' → 'Programada' (etiqueta real del sistema, ESTADO_VIS).
- "modal" → "ventana" en el criterio 5.
- Quité la nota meta del fundamento legal art. 123 fr. X ("Corrige la cita previa a fr. III… error detectado y corregido en esta sesión"); conservé la cita y la frase literal de ley intactas.
- Extraje completo el bloque "Criterios adoptados" a criterios_adoptados_md y lo quité de la sección.
- Conservé todos los criterios de aceptación y todas las citas legales (art. 123 fr. X y fr. VI RLOPSRM) sin cambios.

## HU-12
- Extraje el bloque 'Criterios adoptados' completo a criterios_adoptados_md y lo quité de la sección.
- Quité la referencia a HU-13 y HU-15 como códigos internos impresos: 'que dispara el art. 54' pasó a '(disparando el art. 54)' y se eliminó '(HU-13...)' y '(HU-15)' del 'A fin de'.
- Reescribí tecnicismos: 'número correlativo'→'número de folio consecutivo'; 'sin poderse editar después'→'ya definitiva (no se puede modificar después)'; 'se previsualiza en vivo'→'viendo cómo se va calculando la carátula en pantalla (vista previa)'; 'no editable después'→'ya no se puede modificar después'; 'La pantalla solo muestra una vista previa en vivo'→'...en pantalla'; 'el número es correlativo y se asigna de forma segura'→'el número de folio es consecutivo y se asigna de forma segura'.
- AJUSTE FOTOS (criterio 5): quité 'y las fotos del avance físico y financiero' del guardado al integrar y añadí frase final indicando que el registro fotográfico no se guarda en este paso, sino que se carga y consulta por estimación desde el Expediente (HU-04).
- Conservé EXACTOS los 5 criterios de aceptación (comportamiento) y TODAS las citas legales (132, 143-I, 46 Bis, 86-88, tope 90, 191 LFD, 118, 45-A-X, 52, 54, 2-XIX, 46, 50-IV) sin cambiarlas.
- La sección final solo contiene: encabezado + 'Quién ve y quién hace' + Historia/'Deseo...' + Criterios de aceptación + Fundamento legal.
- Pantalla real: el wizard de integración corresponde a 'Integración del periodo' (/estimaciones/integracion); como el cuerpo no decía 'el formulario/la pantalla' de forma ambigua, no fue necesario nombrarla inline.

## HU-13
- Extraje el bloque 'Criterios adoptados' completo a criterios_adoptados_md y lo quité del cuerpo de la sección.
- Quité el código interno 'HU-15' en la línea 'A fin de…' de la Historia (ahora solo dice que el plazo lo ejecutan la Supervisión y la Residencia).
- Quité '(HU-15)' del semáforo del criterio 4: ahora 'Revisión: día X de 15…', conservando el comportamiento.
- Cambié 'evidencia inmutable' por 'evidencia definitiva' en la Historia.
- Nombré la pantalla real: 'La pantalla de envío de la estimación' en el criterio 3 (componente EnvioEstimacion).
- En los Criterios adoptados quité la referencia al doc interno (TABLA_VALIDAR_PROFE_RESUELTOS), las menciones a 'ficha vieja' / 'se degradó' / 'criterio del equipo (default conservador)' y las atribuciones internas, conservando el significado de cada criterio y sus citas legales.
- Conservé exactos los 5 criterios de aceptación y todas las citas (art. 54, 53).

## HU-14
- Extraje el bloque 'Criterios adoptados' completo a criterios_adoptados_md y lo quité de la sección.
- Quité de 'Quién ve' la muletilla 'Nota:' dejando la aclaración como frase normal (mismo contenido).
- CA-1: nombré la pantalla real ('Historial de estimaciones') donde el texto solo describía el listado, y aclaré que 'fecha de presentación' es la fecha de envío/presentación real.
- CA-3: reescribí 'placeholders vacíos' como 'espacios vacíos', aclaré que el panel 'Expediente' es un resumen (no el expediente completo), y eliminé los nombres de columnas de BD (autorizada_en / pagada_en / 'tabla de transiciones que llene...') y la referencia a HU-15, conservando el comportamiento (hoy solo se registran integración y presentación).
- CA-4: reemplacé 'porque el modelo no versiona (ver cr. adoptados)' por una explicación en lenguaje de negocio (una estimación no se versiona; la rechazada aparece como estado, no como versión anterior).
- Añadí un apartado 'Fundamento legal' en lenguaje llano indicando que HU-14 es consulta y el fundamento del ciclo vive en las historias de integración, revisión/autorización y reingreso, sin imprimir códigos HU-12/15/16 al usuario.
- Apliqué el ajuste específico: 'Fecha de presentación' = fecha de envío real; el panel es un resumen del expediente; quité nombres de columnas de BD y 'falta cablearlas'.
- No cambié ningún comportamiento de los criterios ni citas legales (HU-14 no cita artículos).

## HU-15
- Nombré la pantalla real en el criterio 1: 'la vista' → 'la pantalla de Revisión / autorización de estimaciones (/estimaciones/revision)'.
- Quité la notación técnica de estados: "estado → 'Autorizada'" → "la estimación queda Autorizada" y "estado → 'Rechazada'" → "la estimación queda Rechazada" (en Historia y criterio 4).
- Criterio 4: 'por la secuencia de estados' → 'por la secuencia del proceso' (lenguaje de negocio).
- Extraje el bloque 'Criterios adoptados' completo a criterios_adoptados_md y lo quité del cuerpo de la sección.
- Limpié el encabezado quitando el código interno 'HU-15 ·'.
- Conservé exactos todos los criterios de aceptación, el comportamiento y todas las citas legales (art. 54, 53 LOPSRM; art. 191 LFD).

## HU-16
- Pantalla nombrada: 'la pantalla'/'la vista' -> 'pantalla de Reingreso de estimación' (sobre el contrato activo). Quitado el 'selector de contrato' del deseo y del criterio 1: el contrato se hereda del contrato activo, no se selecciona.
- Quitado 'bloque completo independiente' (deseo y criterio 4) y 'de una sola vez'/'crea de una sola vez' (criterio 4) -> redacción de negocio sin tecnicismo.
- Tecnicismo: 'append-only' -> 'las versiones no se editan ni se eliminan; corregir = registro nuevo ligado'; 'inmutabilidad/trazabilidad ... (append-only)' reescrito en negocio.
- '(las de HU-15)' -> '(las de la revisión técnica)': quitado el código interno HU-15.
- 'histórico vinculado' -> 'histórico ligado'.
- Bloque 'Criterios adoptados' extraído completo y retirado de la sección; quitada la atribucion a docs/reportes/TABLA_VALIDAR_PROFE_RESUELTOS_18jun.md y los codigos internos 'A18/B9/B10' conservados solo como criterio del equipo.
- Quitado 'PARA MAIKI:' del bloque de criterios adoptados y 'a cargo de Maiki' -> redaccion neutra.
- Quitado del fundamento legal el codigo interno 'A18' y la atribucion al equipo reformulada en lenguaje llano; conservadas EXACTAS todas las citas (art. 54 LOPSRM, art. 123 fr. VI RLOPSRM, art. 132) y todo el comportamiento de los criterios de aceptacion.

## HU-17
- Extraje el bloque 'Criterios adoptados' completo a su archivo aparte y lo quité del cuerpo de la sección.
- Quité la referencia al doc interno 'TABLA_VALIDAR_PROFE_RESUELTOS_18jun.md' del encabezado del bloque extraído.
- En 'Quién ve y quién hace' y en CA-5: 'la Dependencia vería todos/vería todas' → 'la Dependencia ve todos/ve todas' (texto narrativo, sin cambiar comportamiento).
- No había tecnicismos de la lista 1, ni marcas de estado, ni códigos HU impresos en el cuerpo (las referencias a HU-13/15/21 que señalaba el hallazgo no aparecen en el cuerpo de esta sección; solo HU-06/HU-07 y HU-21 viven dentro del bloque Criterios adoptados, ya extraído).
- La pantalla ya estaba nombrada de forma concreta ('Tablero de estimaciones', listado 'Estimaciones aceptadas y en proceso', panel 'Mis pendientes'); no requirió desambiguación.
- Conservé EXACTOS los 5 criterios de aceptación y la única cita legal (art. 54 LOPSRM).

## HU-18
- Quité el bloque '**Estado:** ✅ Funcional (integración HU-18, 17-jun)...' (meta interna) del cuerpo.
- Extraje completo el bloque 'Criterios adoptados' y lo saqué de la sección (va en criterios_adoptados_md).
- Criterio 1: quité la fórmula interna del semáforo (suma 1 o menos = verde, 2-3 amarillo, 4 o más rojo; 0/1/2 puntos por factor) y lo reescribí en lenguaje llano conservando el comportamiento; cambié 'no de datos de demostración' por redacción llana ('a partir de los datos reales del contrato').
- Criterio 4 y la Historia: quité el agrupador 'Tipo de contratación'; ahora solo Contratista / Ejercicio fiscal / Ninguno.
- 'desviación de avance vs. programado' → 'desviación del avance frente a lo programado' (lenguaje llano), conservando significado.
- Moví la cita legal art. 54 LOPSRM (plazo de autorización de la estimación, factor de atrasos) a un bloque 'Fundamento legal' al final, sin alterar la cita.
- No toqué ningún criterio de aceptación en su comportamiento ni ninguna cita legal.

## HU-19
- Quité el bloque completo 'Criterios adoptados' (extraído aparte) y su referencia al doc interno TABLA_VALIDAR_PROFE_RESUELTOS_18jun.md.
- Eliminé del cr. 2 la frase meta 'Antes estaba deshabilitado por falta de fuente a nivel contrato; esa fuente ya existe' (ajuste específico pedido).
- Reformulé en la Historia '(el reporte 4, Observaciones, ya exporta...)' a redacción neutra de negocio, sin el tono de 'ya estaba/se arregló'.
- En el cr. 2 reemplacé 'revisión técnica de HU-15' por 'revisión técnica de la estimación' para no exponer el código interno HU-15 al usuario.
- Conservé exactos los 5 criterios de aceptación y todas las citas legales (art. 54, 59/59 Bis LOPSRM, 102 RLOPSRM, 46 Bis + 86-88 RLOPSRM, 191 LFD, 46/46 Bis LOPSRM).

## HU-20
- Quité la marca de estado ("✅ Funcional", "antes era un prototipo de demostración").
- Nombré la pantalla real: "Tránsito a pago" (componente TransitoPago.jsx, ruta /pagos/transito) donde el texto decía "el sistema"/"la pantalla".
- Traduje tecnicismos a lenguaje llano: "folio"→"número de folio", "snapshot/redondeo al centavo"→"redondeado al centavo", quité "FK", "dato legado", "no por el nombre escrito, que se rompería al renombrarla".
- CA-2: añadí el segundo gatillo del plazo (art. 54): el semáforo arranca cuando hay autorización Y factura presentada. Quité la coletilla interna "la fecha definitiva requiere un sello de autorización propio (PARA MAIKI…)".
- Extraje el bloque "Criterios adoptados" completo a criterios_adoptados_md y lo quité de la sección.
- Eliminé el bloque "Pendientes / [PARA MAIKI]" entero (va a interno).
- Eliminé la mención al "enlace por nombre" (el sistema ya enlaza por la cuenta de la dependencia).
- Conservé EXACTOS los 6 criterios de aceptación y TODAS las citas legales (art. 24, 54, 64, 170, 55, 48, 50).

## HU-21
- Nombré la pantalla real: 'Registro del pago' (/pagos/registro) en lugar de dejarla implícita en el 'Deseo'.
- 'inmutable' → lenguaje llano: en el 'A fin de' a 'de forma definitiva (ya no se puede modificar)' y en el criterio 7 a 'El pago es definitivo: una vez registrado ya no se puede modificar'.
- Quité del Fundamento legal la cita 'art. 118 RLOPSRM (citado en la pantalla como base del cuadre del importe)' porque la pantalla NO cita el art. 118 (cita 54-55 LOPSRM / 127-128 RLOPSRM / 191 LFD).
- Quité la glosa interna 'citado en el pie de página de HU-21' del art. 191 LFD, dejando solo la cita legal.
- Extraje el bloque 'Criterios adoptados' completo a criterios_adoptados_md y lo eliminé de la sección.
- Conservé EXACTOS los 8 criterios de aceptación y las citas legales (art. 54 LOPSRM, art. 191 LFD).
- Nota: la línea meta 'la fecha de autorización es provisional (pasará a HU-20)' solo vive dentro del bloque 'Criterios adoptados' (que se extrae completo), así que no aparece en la sección final.

## Registro
- Extraje el bloque 'Criterios adoptados' completo (con las 3 referencias internas, [decisión Maiki] y modo demostración) a criterios_adoptados_md y lo quité del cuerpo de la sección.
- Nombré la pantalla real del panel de la Dependencia: 'Solicitudes de registro' en 'Quién ve y quién hace' (antes decía solo 'ese panel').
- Conservé EXACTOS los 5 criterios de aceptación, la Historia/Deseo/A fin de y la cita legal 'art. 123 RLOPSRM'. No cambié comportamiento ni citas.

## Por Firmar
- Extraje el bloque 'Criterios adoptados' completo (con su referencia a docs/reportes/TABLA_VALIDAR_PROFE_RESUELTOS_18jun.md) y lo saqué de la sección.
- Criterio 2: 'tomada de la sesion, nunca enviada desde la pantalla' -> 'que el sistema toma de su sesion y no se captura en la pantalla' (mismo significado, lenguaje llano).
- Criterio 4: reescribí 'El estado complete se obtiene al leer: es completa cuando...' (tecnicismo de maquina de estados) a 'Una apertura queda como complete cuando...' en lenguaje de negocio, conservando la condicion (residente + superintendente + supervision si aplica) y el aviso de firmas faltantes.
- Historia 'Deseo': cambie comillas simples por dobles en "Por firmar" por consistencia; sin cambio de contenido.
- Conservé EXACTOS los 5 criterios de aceptacion (comportamiento) y la cita legal art. 123 fr. III RLOPSRM.

## HU-22
- Quitada la marca de estado del encabezado ("🆕 NUEVA (sin ficha previa)") y simplificado el título a "Sustitución de personas del equipo del contrato".
- Nombrada la pantalla real: "Roster / sustitución" (ruta /contratos/roster) en "Quién ve y quién hace".
- Eliminada la frase meta-interna "Esta funcionalidad no está en la matriz de permisos por rol (vive fuera del catálogo de HU)".
- "sincronice el acceso del contrato" → "actualice quién tiene acceso al contrato" (Historia y criterio 3).
- "si no, la difiera" / "se difiere" → "la deje pendiente hasta abrir la bitácora" (Historia y criterio 4), en lenguaje llano.
- "impide reasignaciones inconsistentes" → "evita que queden dos titulares activos del mismo rol al mismo tiempo" (criterio 3).
- Extraído el bloque "Criterios adoptados" completo y retirado del cuerpo de la sección.
- Conservados verbatim los 5 criterios de aceptación (comportamiento) y todas las citas legales (art. 125 fr. I g, art. 123 fr. III, mapeos de rol).

## HU-23
- Quité del encabezado las marcas de estado e internas: '(Oleada O3)', '🆕 NUEVA', '(sin ficha previa)'.
- Extraje completo el bloque 'Criterios adoptados' (6 viñetas) a criterios_adoptados_md y lo saqué de la sección.
- Tecnicismos a lenguaje llano: 'normalizado fuerte/segunda red' -> 'detecta duplicados comparando el nombre sin distinguir mayúsculas, espacios, acentos, puntuación ni sufijos'; 'retrocompatible' -> redactado en negocio; 'inerte' + 'follow-on' -> 'no está disponible en la pantalla y queda como mejora futura'.
- Criterio 3: cambiado de 'El campo Empresa es opcional' a OBLIGATORIO para contratista y supervisión (REGLA 1), conservando el caso sin empresa solo para roles que no la requieren.
- Quité atribuciones/meta con fecha y referencias internas: '— profe 09-jun', 'que el profe señaló', '(ver HU-04 cr. 3)'.
- Nombré la pantalla real del padrón: 'Padrón de empresas' en /admin/empresas (componente EmpresasPadron.jsx), en lugar de 'panel de administración'.
- Conservé exactos los 6 criterios de aceptación (comportamiento) y las dos citas legales (art. 43 RLOPSRM, art. 74 Bis LOPSRM con sus [validar profe]).

## HU-24
- Quité del encabezado las marcas de estado/meta: "· 🆕 **NUEVA** (FASE 4, revisión profe 16-jun)".
- Cambié "el finiquito es inalterable" por "el finiquito es definitivo (ya no se puede modificar)" en el criterio 2 (mismo significado, lenguaje llano).
- Extraje el bloque completo "Criterios adoptados" (con B8, "default conservador", "follow-on", "hardcodea") y lo saqué del cuerpo de la sección; va en criterios_adoptados_md.
- Conservé EXACTOS los 3 criterios de aceptación y TODAS las citas legales del Fundamento legal (arts. 64/66 LOPSRM, 168-172 y 143 RLOPSRM, 54/55 LOPSRM).
- No tocué la sección "Quién ve y quién hace" ni la Historia (ya estaban en lenguaje de negocio, sin pantallas ambiguas).

