# Pruebas Negativas

**Fecha real del plan:** 24-jun-2026  
**Fase del proyecto:** Validacion de rechazos, bloqueos y reglas de seguridad funcional

## Situacion / problema

Necesitabamos comprobar no solo que el sistema aceptara el flujo correcto, sino que rechazara acciones indebidas. Reunimos casos donde el sistema debia bloquear: campos vacios, correos invalidos, duplicados, empresas mal clasificadas, garantias incorrectas, operaciones sobre contratos cerrados, notas fuera de regla, pagos improcedentes y datos que rompen trazabilidad.

Detectamos que algunos bloqueos existian solo en pantalla o no estaban aplicados de forma uniforme en todos los caminos.

## Acciones realizadas

Preparamos una bateria de pruebas negativas organizada por dominios: autenticacion y registro, empresas, alta, fianzas, bitacora, avance, estimacion, pago, convenios, expediente, reportes, finiquito y portafolio. En cada caso indicamos cuenta, pantalla, datos a capturar y resultado esperado.

Despues ejecutamos una revision de pruebas exhaustivas que confirmo treinta bugs. Entre los hallazgos mas importantes encontramos el pago permitido sobre contrato ya cerrado, la falta de PDF firmado en varios contratos de prueba, notas que podian mutar despues del cierre, errores de validacion en garantias y reportes que sumaban estimaciones rechazadas.

## Resultado

Dejamos el plan negativo como guia de verificacion y base de hallazgos reales. Nos sirvio para separar lo que ya bloqueaba correctamente de lo que todavia necesitaba correccion, especialmente en cierre, pago, bitacora y datos de demostracion.

## Trazabilidad legal

- LOPSRM art. 54: pago solo de estimaciones autorizadas.
- LOPSRM art. 64: contrato cerrado por finiquito.
- RLOPSRM art. 118: no estimar por encima de lo contratado.
- RLOPSRM art. 123 fr. VI: inmutabilidad de bitacora.
- RLOPSRM art. 132: soporte documental.

**Puntos [verificar]:** los casos marcados como bug conocido deben revisarse despues de cada correccion para confirmar que ya bloquean como se esperaba.
