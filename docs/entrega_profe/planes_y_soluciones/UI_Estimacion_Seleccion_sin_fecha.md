# UI de Estimacion y Seleccion

**Fecha real del plan:** Sin fecha registrada  
**Fase del proyecto:** Mejora de captura de estimaciones y eliminacion de referencias escritas manualmente

## Situacion / problema

Detectamos dos necesidades. La primera era hacer mas clara la captura de estimaciones: el usuario debia ver en una sola pantalla volumen ejecutado, caratula viva, avance fisico, avance financiero, plan del periodo y saldos. La segunda era eliminar campos donde escribiamos identificadores de cosas que ya existian, como folios, personas o notas, porque eso rompe trazabilidad.

Tambien dejamos prevista la retencion por atraso, pero marcamos que hacia falta confirmar con el profesor el porcentaje y la regla exacta de disparo.

## Acciones realizadas

En la etapa A construimos una pantalla unica de estimacion. La caratula recalcula al capturar volumen, muestra bruto, amortizacion, cinco al millar y neto. Tambien agregamos semaforo del plan por concepto para advertir si el volumen excede lo programado o disponible.

En la etapa B sustituimos capturas manuales por seleccion de entidades reales. Por ejemplo, en sustitucion de personal eliminamos el campo para teclear un identificador numerico y obligamos a elegir una cuenta existente del rol correcto. En bitacora agregamos una validacion explicita para que una nota vinculada pertenezca a la misma bitacora.

En la etapa C agregamos la estructura para retencion por atraso y avance fisico/financiero, con un porcentaje de pena configurable por contrato. Preparamos el calculo para restar la retencion cuando exista atraso y guardar los porcentajes de avance.

## Resultado

Dejamos la estimacion mas comprensible y menos propensa a error: el usuario ve el impacto economico antes de confirmar y seleccionamos los identificadores importantes desde registros existentes. Implementamos la retencion por atraso con criterios iniciales, pero su regla fina depende de confirmacion.

## Trazabilidad legal

- LOPSRM art. 54: estimaciones.
- RLOPSRM art. 45-A y 118: programa y limites contra cantidades contratadas.
- RLOPSRM art. 123 fr. VI: trazabilidad e inalterabilidad de bitacora.
- RLOPSRM art. 138 y 139: penas convencionales por atraso [verificar regla concreta].
- RLOPSRM art. 143 fr. I: amortizacion proporcional.
- LFD art. 191: cinco al millar.

**Puntos [verificar]:** porcentaje de pena por atraso, disparo global o por concepto, retencion sobre bruto o neto, y si la retencion se recupera en periodos posteriores.
