# Revision Sprint 1-2

**Fecha real del plan:** 01-jun-2026  
**Fase del proyecto:** Correccion temprana de criterios funcionales, legales y de captura

## Situacion / problema

Revisamos los primeros avances del sistema y detectamos que varias pantallas todavia permitian operar de una forma demasiado libre para un sistema de obra publica. En el alta de contrato habia datos precargados o poco controlados, el monto podia quedar con tolerancias, el programa de obra no estaba expresado como matriz de conceptos por periodo, y algunas garantias no bloqueaban con suficiente claridad cuando faltaba soporte documental.

Tambien detectamos que la bitacora no estaba alineada con sus reglas legales: la apertura debia ser la primera nota, con folio consecutivo y con los datos minimos del contrato. Ademas, necesitabamos que la sustitucion de residentes, superintendentes o supervision conservara historial, no que reemplazara datos como si la persona anterior nunca hubiera participado.

## Acciones realizadas

Corregimos el alta para que iniciara limpia, sin datos de demostracion, y para que el usuario capturara los datos reales del contrato, incluyendo folio, conceptos, claves, unidades, importes y documentos. Reforzamos el cuadre exacto del catalogo de conceptos al centavo y sustituimos la captura libre del programa por una matriz concepto-periodo.

Completamos el flujo de garantias y documentos: exigimos PDF firmado en el momento correspondiente, agregamos control para anticipos que requieren autorizacion, mejoramos la navegacion secuencial del alta y dejamos vistas de consulta para revisar lo registrado sin alterar informacion.

En bitacora, hicimos que la apertura quedara como nota 1, con folio consecutivo, firma y datos minimos. Separamos los tipos de nota por rol y nos aseguramos de que las notas firmadas no se modificaran directamente. Para sustituciones, implementamos un historial de personas por rol: una persona activa por rol, registro del reemplazo, motivo y conservacion de firmas o actuaciones anteriores.

## Resultado

Dejamos el alta mas cercana al comportamiento esperado para obra publica: sin datos falsos, con importes exactos, programa verificable, documentos visibles y validaciones antes de guardar. Dejamos la bitacora con apertura formal, folios consecutivos, reglas de firma y correccion mediante nuevas notas. Logramos que la sustitucion de personal dejara de borrar historia y conservara trazabilidad por contrato.

## Trazabilidad legal

- LOPSRM art. 46: contenido minimo del contrato.
- LOPSRM art. 48: garantias de anticipo y cumplimiento.
- LOPSRM art. 50: reglas del anticipo y autorizacion cuando aplica.
- LOPSRM art. 66: garantia por vicios ocultos.
- RLOPSRM art. 45-A: programa de ejecucion y relacion con conceptos.
- RLOPSRM art. 99, 100 y 102: convenios, porcentajes y dictamen cuando aplica.
- RLOPSRM art. 122, 123 fr. III, V, VI y VII: bitacora, apertura, folios, inmutabilidad y correcciones.
- RLOPSRM art. 125: responsabilidades de residente, superintendente y supervision en la bitacora.
