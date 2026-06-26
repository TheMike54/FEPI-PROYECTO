# Correcciones Post Revision del Profesor

**Fecha real del plan:** 09-jun-2026  
**Fase del proyecto:** Correccion de observaciones centrales y estabilizacion de datos

## Situacion / problema

Despues de la revision del profesor, identificamos varios puntos que podian afectar la demostracion y la validez del sistema. Detectamos riesgo de perder la base de datos de trabajo, falta de robustez en el catalogo de empresas, un plan de amortizacion poco claro, alertas de atraso dependientes de umbrales manuales y un flujo de estimacion invertido: debia iniciar con la presentacion del contratista y terminar con autorizacion del residente.

Tambien encontramos detalles visibles: fechas de inicio pasadas, garantias vencidas, unidades faltantes, cambios de personal que no explicaban bien el motivo, expediente sin algunos datos de catalogo, curva de avance que no iniciaba correctamente y estimaciones con encabezados poco claros.

## Acciones realizadas

Preparamos respaldo y continuidad de la base de datos para no depender de un ambiente temporal. Despues corregimos los puntos visibles de alta, garantias, sustituciones, expediente, curva y estimaciones.

Implementamos el plan de amortizacion del anticipo con distribucion proporcional y validacion de cuadre. En empresas, agregamos registro y seleccion desde catalogo para evitar duplicidades. En avances, cambiamos la captura por periodo y la conectamos con nota de bitacora. En alertas, derivamos el atraso automaticamente comparando lo programado contra lo ejecutado, en unidades, sin pedir al usuario un umbral manual.

En estimaciones ajustamos el flujo legal: el contratista presenta la estimacion, el residente la revisa y autoriza, y el pago solo procede despues de autorizacion. Tambien exigimos que las notas ligadas fueran firmadas y preparamos una vista imprimible de notas. Finalmente, mejoramos el expediente para imprimir una version consolidada, con encabezado y secciones visibles.

## Resultado

Dejamos el sistema mas coherente con el proceso real de obra publica. Calculamos alertas desde el programa, ordenamos las estimaciones conforme al flujo correcto, hicimos visibles convenios y notas en bitacora y expediente, y dejamos documentos principales listos para consulta o impresion.

## Trazabilidad legal

- LOPSRM art. 52: programa de ejecucion y seguimiento.
- LOPSRM art. 54: presentacion, revision, autorizacion y pago de estimaciones.
- RLOPSRM art. 118: limites de estimacion contra cantidades contratadas.
- RLOPSRM art. 123 fr. VI: notas firmadas no deben modificarse.
- RLOPSRM art. 132: soportes de estimacion.
- RLOPSRM art. 143 fr. I: amortizacion proporcional del anticipo.
