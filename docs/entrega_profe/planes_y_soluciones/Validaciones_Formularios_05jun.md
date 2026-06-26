# Validaciones de Formularios

**Fecha real del plan:** 05-jun-2026  
**Fase del proyecto:** Validacion de captura y mejora de convenios

## Situacion / problema

Detectamos que algunos formularios dejaban avanzar al usuario aunque faltaran datos necesarios o aunque la informacion no estuviera suficientemente ligada al contrato. El caso principal fue el de convenios: no bastaba con registrar un ajuste, teniamos que conservar su fundamento, su version del contrato y sus efectos sobre monto, plazo y catalogo.

El riesgo era que modificaramos informacion original sin trazabilidad, o que mezclaramos cantidades nuevas con conceptos originales sin distinguir que parte pertenecia al contrato inicial y que parte venia del convenio.

## Acciones realizadas

Reforzamos el flujo de convenios para registrar monto y plazo como variaciones separadas, conservar versiones y proteger la informacion previa. Agregamos el motivo o dictamen tecnico como parte del registro, y tratamos la garantia o endoso como parte de la trazabilidad del cambio.

Tambien separamos el efecto de los convenios sobre conceptos: marcamos las cantidades o conceptos adicionales como adicionales para que pudieran identificarse despues en estimaciones, programa y expediente.

## Resultado

Dejamos los convenios con mayor control: analizamos monto y plazo por separado, evitamos sustituir silenciosamente la informacion original, y logramos distinguir los conceptos adicionales del catalogo base.

## Trazabilidad legal

- LOPSRM art. 59: modificaciones a contratos por razones fundadas y explicitas.
- LOPSRM art. 59 Bis: supuestos de variacion superior al cincuenta por ciento.
- RLOPSRM art. 99: dictamen tecnico que funde y motive el convenio.
- RLOPSRM art. 100: monto y plazo se consideran de forma independiente.
- RLOPSRM art. 102: revision cuando la modificacion supera el veinticinco por ciento.
