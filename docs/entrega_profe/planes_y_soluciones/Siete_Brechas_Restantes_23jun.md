# Siete Brechas Restantes

**Fecha real del plan:** 23-jun-2026  
**Fase del proyecto:** Cierre de brechas visibles antes de la entrega

## Situacion / problema

Identificamos siete brechas que podian afectar la revision final. La curva de avance perdia lectura historica cuando un convenio cambiaba el monto, no distinguiamos los conceptos adicionales, no podiamos imprimir la caratula, finanzas recapturaba datos que ya venian de la solicitud, el contratista no recibia una notificacion clara para promover cobro, el portafolio no advertia pagos sin respaldo de avance y el historial no mostraba sellos de fecha suficientes.

Nuestro objetivo fue priorizar lo que el profesor podia ver directamente durante la revision, sin convertir cada mejora en un rediseno completo.

## Acciones realizadas

Implementamos la caratula imprimible y distinguimos conceptos adicionales en estimacion y expediente. Agregamos la notificacion para que el contratista sepa que una estimacion autorizada ya puede promoverse a cobro. En la curva, congelamos el porcentaje financiero historico por version para que un convenio no redujera artificialmente el avance ya mostrado.

Tambien agregamos una bandera en portafolio para detectar pagos sin respaldo suficiente de avance fisico, cerramos la instruccion de pago al registrar el pago y derivamos fechas de autorizacion, rechazo y pago para el historial con los datos ya disponibles.

## Resultado

Atendimos las siete brechas en una version minima y verificable. Ahora mostramos los conceptos adicionales, podemos imprimir la caratula, conservamos la lectura historica de la curva, damos mejor seguimiento al cobro y advertimos en portafolio riesgos que antes no mostrabamos.

## Trazabilidad legal

- LOPSRM art. 54: revision, autorizacion y pago de estimaciones.
- RLOPSRM art. 101: conceptos adicionales deben administrarse y distinguirse.
- RLOPSRM art. 102: variaciones mayores al veinticinco por ciento.
- RLOPSRM art. 132: documentacion soporte de estimaciones.
- RLOPSRM art. 143 fr. I: amortizacion proporcional.
- LFD art. 191: retencion del cinco al millar.

**Puntos [verificar]:** umbral exacto para "pago sin respaldo de avance" y si el profesor esperaba una orden de pago automatica o mantener la promocion por el contratista.
