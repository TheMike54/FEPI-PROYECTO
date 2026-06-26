# Cierre E2

**Fecha real del plan:** 18-jun-2026  
**Fase del proyecto:** Conversion de fianzas y minutas de maqueta a funciones operables

## Situacion / problema

Teniamos dos historias importantes incompletas para una revision funcional: fianzas y minutas/visitas. En fianzas necesitabamos registrar garantias reales por tipo, adjuntar PDF de poliza y controlar endosos. En minutas y visitas necesitabamos registrar acuerdos reales y vincularlos con la bitacora sin modificar notas ya firmadas.

Tambien detectamos una cita legal incorrecta para el vinculo de minutas con notas: habiamos usado la fraccion de apertura, cuando la fraccion aplicable era la relativa a ratificar instrucciones, acuerdos y minutas en bitacora.

## Acciones realizadas

Implementamos el registro funcional de garantias por tipo: cumplimiento, anticipo y vicios ocultos. Agregamos PDF de poliza, validaciones de monto, vigencia y una garantia por tipo. Tambien agregamos el manejo de endosos para ajustes derivados de modificaciones.

En minutas y visitas, permitimos registrar documentos, participantes, acuerdos y vincular una minuta o visita con una nota de bitacora. Hicimos el vinculo como relacion de referencia, no como edicion de la nota firmada. Ademas, corregimos la cita legal del vinculo de minutas a la fraccion correcta.

## Resultado

Convertimos fianzas y minutas en funciones con datos reales, documentos y controles. Logramos que el expediente y la bitacora mostraran mejor la trazabilidad entre garantias, acuerdos, visitas y notas.

## Trazabilidad legal

- LOPSRM art. 48: garantias de anticipo y cumplimiento.
- LOPSRM art. 66: garantia por vicios ocultos.
- RLOPSRM art. 91 y 98 fr. II: endosos de garantia.
- RLOPSRM art. 123 fr. VI: inmutabilidad de notas firmadas.
- RLOPSRM art. 123 fr. X: ratificacion en bitacora de instrucciones, acuerdos y minutas.

**Puntos [verificar]:** criterio final sobre si solo deben vincularse notas firmadas y alcance exacto del permiso del residente para gestionar garantias.
