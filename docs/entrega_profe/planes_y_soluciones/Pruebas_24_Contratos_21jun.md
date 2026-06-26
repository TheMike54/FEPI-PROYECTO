# Pruebas 24 Contratos

**Fecha real del plan:** 21-jun-2026  
**Fase del proyecto:** Revision funcional de contratos de demostracion y flujos principales

## Situacion / problema

Preparamos una revision exhaustiva sobre los contratos de demostracion para encontrar fallas antes de la preentrega. No buscabamos corregir de inmediato, sino confirmar que problemas eran reales y priorizarlos.

Confirmamos treinta errores. Los mas graves eran: estimaciones bloqueadas en la mayoria de contratos demo por falta de PDF firmado ligado al contrato, y posibilidad de pagar una estimacion autorizada de un contrato ya finiquitado. Tambien encontramos errores en fusion de empresas, garantias, bitacora, atrasos, reportes, portafolio, reingreso e historial de estimaciones.

## Acciones realizadas

Documentamos cada bug con dominio, pantalla, rol, pasos, resultado esperado, resultado obtenido y causa probable. Separamos los hallazgos por severidad y distinguimos los errores que podian generar un tache directo en la revision.

Tambien verificamos cada hallazgo contra comportamiento real o lectura del sistema para descartar falsos positivos. Cuando una prueba alteraba datos, dejamos constancia de que revertimos el dato de prueba.

## Resultado

Dejamos un mapa claro de riesgos para corregir antes de la entrega. Identificamos como bloqueos criticos sembrar o ligar PDF firmado en los contratos demo que lo necesitaban, y bloquear pagos sobre contratos cerrados para evitar doble liquidacion.

## Trazabilidad legal

- LOPSRM art. 54: autorizacion y pago de estimaciones.
- LOPSRM art. 64: finiquito y cierre del contrato.
- RLOPSRM art. 118: estimaciones contra cantidades contratadas.
- RLOPSRM art. 123 fr. VI: inmutabilidad y aceptacion de notas.
- RLOPSRM art. 132: soporte documental de estimaciones.
- RLOPSRM art. 143 fr. I: amortizacion proporcional.
