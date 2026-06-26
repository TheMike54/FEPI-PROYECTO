# Rediseno Match Mockup

**Fecha real del plan:** 18-jun-2026  
**Fase del proyecto:** Alineacion de navegacion y pantallas con el prototipo de ciclos

## Situacion / problema

La navegacion no reflejaba con suficiente claridad el flujo real del sistema. Teniamos recorridos por bloques, submenus y accesos dispersos que hacian dificil explicar que cada modulo pertenece a un ciclo: alta, fianzas, estimacion, bitacora, avance, pago, convenios, cierre y expediente.

Ademas, necesitabamos que algunas vistas de consulta permanecieran accesibles aunque no fueran pasos obligatorios de un flujo, por ejemplo historial, revision, reingreso, tablero, minutas y consulta de notas.

## Acciones realizadas

Reorganizamos la navegacion para convertirla en una lista mas plana y centrada en ciclos. Ocultamos recorridos repetidos y movimos vistas secundarias a bloques paralelos dentro de su ciclo correspondiente.

En estimacion agregamos un bloque de actividades paralelas para revision, reingreso, historial y tablero. En bitacora dejamos el flujo principal de apertura, firma y emision, con consulta y minutas disponibles sin bloquear. En pago agregamos el registro de pago como paso final del ciclo. Verificamos que los roles siguieran viendo solo lo que les corresponde.

## Resultado

Dejamos la interfaz mas parecida al prototipo de ciclos: menos menu fragmentado, mas lectura por proceso y mejor continuidad entre pantallas. El usuario puede seguir el ciclo principal sin perder acceso a consultas o actividades paralelas.

## Trazabilidad legal

No identificamos una fraccion legal nueva por el rediseno visual. El cambio apoya flujos ya fundamentados:

- LOPSRM art. 54: estimaciones y pagos.
- RLOPSRM art. 123: bitacora.
- RLOPSRM art. 132: documentacion de estimaciones.
