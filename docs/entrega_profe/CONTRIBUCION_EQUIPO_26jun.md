# Tabla de contribucion por integrante - SIGECOP

Resumen corto: la distribucion se calculo con evidencia documental disponible al 26 de junio de 2026. El mayor peso se asigno a aportes tecnicos verificables, pruebas/hallazgos y coordinacion real; la cantidad de mensajes se uso solo como senal secundaria. Donde no hay repo, commit log o reporte directo, la confianza se marca como media o baja.

> **Actualizacion 26-jun:** esta version incorpora el REGISTRO DE LLAMADAS y los ADJUNTOS tecnico-legales (no solo los mensajes de texto). Con ello se reubica a **Ivan al TOP 2**: fue el ejecutor en vivo de los planes de prueba junto con Maik y aporto la fundamentacion legal de las validaciones, trabajo que antes no se le atribuia porque su autoria no figuraba en el chat. No se bajo a nadie por debajo de su evidencia real; solo se reordeno por puntaje.

## Integrantes identificados en los chats

| Persona | Identificadores en el chat | Observacion |
|---|---|---|
| Maik / Maiki | `Maik`, mencionado como Maiki | Coordinacion general, fundacion, integracion y soporte. |
| Leo Becerra | `~ Leo Becerra`, `Leo` | Desarrollo de HUs de Equipo 3 y reportes de pruebas. |
| Gahel / Gadiel | `Gahel`, carpeta privada `+52 55 2320 1810` | Desarrollo de HUs de Equipo 3 y hallazgos finales. |
| Ronis | `Ronis` / `Roñis`, carpeta privada `WhatsApp Chat - Ronis` | Pruebas negativas, hallazgos y evidencia parcial de HU-11. |
| Ivan | `Ivan`, posible referencia como `Van` en reparto de contratos | Ejecutor en vivo de los planes de prueba junto con Maik, fundamentacion tecnico-legal de las validaciones (LOPSRM/RLOPSRM/LFD), coordinacion y horas sostenidas en la recta final; ademas organizacion y envio de materiales. |
| Aldo | `Aldo` | Evidencia inicial de material tecnico y participacion en pruebas, pero con poco entregable directo en las fuentes. |
| Sampayo | `~ Sampayo` | Aparece al inicio del grupo; no se encontro evidencia sustantiva de SIGECOP en las fuentes revisadas. |

## Parametros usados y pesos

| Parametro | Peso | Como se midio | Justificacion |
|---|---:|---|---|
| Participacion tecnica real | 40 | HUs, modulos, PRs, backend/frontend, integracion, archivos tocados, estado de HU en reportes. | Es el criterio principal porque sustenta producto funcionando, no solo comunicacion. |
| Pruebas, hallazgos y reportes | 25 | Reportes positivos/negativos, bugs concretos, planes de prueba, evidencia de ejecucion o validacion. | El cierre del proyecto dependio de detectar fallas y demostrar flujos. |
| Seguimiento y coordinacion | 20 | Resolver dudas, integrar, repartir trabajo, desbloquear cuentas/BD/GitHub, pedir/reportar avances. | Afecta directamente que el equipo pudiera entregar y probar. |
| Iniciativa y constancia | 10 | Participacion distribuida en fechas distintas, seguimiento a pendientes, entregas reiteradas. | Premia trabajo sostenido, no apariciones aisladas. |
| Volumen de chat como senal secundaria | 5 | Mensajes de proyecto aproximados y presencia en varios chats. | Solo ayuda a desempatar; muchos mensajes no equivalen a contribucion. |

## Tabla final de contribucion

| Posicion | Persona | Puntaje por parametro | Total | Evidencia concreta | Confianza |
|---:|---|---|---:|---|---|
| 1 | Maik / Maiki | Tecnico 39/40; Pruebas 23/25; Coordinacion 20/20; Constancia 10/10; Chat 4/5 | 96 | Los reportes de estado `00003321-SIGECOP Estado HU.pdf` y `00003329-SIGECOP_Estado_HU.pdf` atribuyen a Fundacion/Maiki la integracion o responsabilidad de login, alta de contrato, bitacora HU-08/09/10, HU-12, HU-21, A2 y soporte de tablas. En el chat principal reparte equipos/HUs, reglas de PR y zonas congeladas (4-jun), da cuentas de prueba, resuelve Git/BD/Claude, comparte planes y pide pruebas. Tambien aparece como coautor de hallazgos con Ivan (`"txt que hice con el Ivan"`, 24-jun) y como quien valida/integra reportes de otros. | Alta |
| 2 | Ivan | Tecnico 25/40; Pruebas 24/25; Coordinacion 19/20; Constancia 9/10; Chat 2/5 | 79 | Re-evaluado con el REGISTRO DE LLAMADAS y los ADJUNTOS (antes su autoria no figuraba en el chat de texto). (1) EJECUCION DE PRUEBAS (sube fuerte): fue quien EJECUTABA los planes de prueba en vivo mientras Maik hacia las modificaciones de codigo; buena parte de los hallazgos/observaciones entregados (los `.txt` de pruebas y las observaciones de los planes) salieron de esa ejecucion CONJUNTA Maik+Ivan — Maik lo confirma (`"txt que hice con el Ivan"`, 24-jun). (2) FUNDAMENTACION TECNICO-LEGAL (ya no es 7/40): el 16-jun entrego `message_respondido.txt` (validaciones resueltas con fundamento en LOPSRM/RLOPSRM/LFD y la regla "Ley 2025 prevalece sobre Reglamento 2023") y `Leyes_completas_en_Markdown.zip` (leyes convertidas a Markdown), base legal de las validaciones del sistema. (3) COLABORACION EN VIVO (recta final): decenas de horas de trabajo conjunto con Maik — 7h (12-jun), 5h (14-jun), 4h (16-jun), 5h y 7h (17-jun), 6h (21-jun), 5h (24-jun), entre muchas otras; en esas llamadas se ejecutaban los planes de prueba. (4) Ademas crea/gestiona el chat, comparte `Historias_Usuario.xlsx` y el 26-jun envia los planes finales (`PLAN_PRUEBAS_NEGATIVAS/POSITIVAS_FINAL_26jun`, `..._DESDE_CERO`) con cuentas asignadas. No programo HUs directamente, por eso Tecnico (25) queda debajo de los desarrolladores de HU (Leo/Gahel/Maik); pero la ejecucion de pruebas + la fundamentacion legal + las horas sostenidas lo colocan en el TOP 2. | Alta |
| 3 | Leo Becerra | Tecnico 33/40; Pruebas 23/25; Coordinacion 11/20; Constancia 8/10; Chat 3/5 | 78 | En chat privado con Maik reporta HU-14 subida a GitHub con controller, routes, seed, `HistorialEstimaciones.jsx`, `api.js` y montaje en `server.js` (4-jun); corrige spec HU-14 a flujo real con seed y pruebas 9/9; reporta HU-13, HU-17 y HU-19 subidas. En pruebas entrega `ResumenPruebasPositivas _Becerra_Lugo_Leonardo.pdf`, `ResumenPruebasPositivas2_Becerra_Lugo_Leonardo.pdf` y `ResumenUltimate _Becerra_Lugo_Leonardo.docx`, con bugs concretos de alta de contrato, sesion expirada, apertura de bitacora, redondeo de avance y flujo de pruebas. En grupo aporta observaciones de HU-15, HU-20, HU-03, HU-19 y HU-22 tras revision del profesor. (La ejecucion de los planes COMPARTIDOS fue conjunta Maik+Ivan; los reportes propios firmados de Leo conservan su merito.) | Alta |
| 4 | Gahel / Gadiel | Tecnico 34/40; Pruebas 12/25; Coordinacion 9/20; Constancia 7/10; Chat 3/5 | 65 | En chat privado reporta HU-15 lista con PR `feat/e3-hu-15`, archivos `estimaciones-ciclo.routes.js`, `RevisionEstimacion.jsx`, `api.js`, `hu-15-revision.spec.js`, smoke backend y control de acceso (10-jun). Despues reporta HU-16, HU-18 y HU-20 listas, con detalle tecnico de portafolio server-side, endpoint `/api/portafolio`, rutas, controllers, e2e y build verde. Al cierre entrega `vista positivas.txt` con hallazgos de HU-8/11 y HU-12. La evidencia de implementacion es fuerte, pero la evidencia de pruebas finales es menor que la de Leo/Ronis. | Alta |
| 5 | Ronis | Tecnico 10/40; Pruebas 22/25; Coordinacion 6/20; Constancia 6/10; Chat 3/5 | 47 | En chat privado Maik le pide historias y Ronis reporta que "segun ya esta hu-11" (17-jun), aunque no se encontro PR o archivo tecnico que lo confirme. En cierre de pruebas acuerda revisar negativas, confirma que hizo negativas y entrega hallazgos en `sigecop.txt`, `sigecop (2).txt` y `completo 2.txt`: HU-23 empresa sin elegir/duplicada, HU-01 folios duplicados, HU-12 estimaciones mayores a un mes, HU-03 convenio sin bitacora abierta, HU-21 pago de contrato cerrado, HU-06 avance en contrato cerrado/vencido y HU-03 convenio >25% sin aviso. | Media-alta |
| 6 | Aldo | Tecnico 8/40; Pruebas 7/25; Coordinacion 3/20; Constancia 3/10; Chat 1/5 | 22 | Hay evidencia temprana de aportes de insumos: comparte fotos sobre "Generadores", "Estimaciones", "conceptos", "caratula" y "Reporte fotografico" (2-jun), que se relacionan con contenido funcional/legal del sistema. En cierre se le asigna revisar pruebas positivas junto con Leo/Aldo segun chat, y Maik dice tener algo de Ivan, Aldo y Leo; sin embargo, no se encontro un reporte final claramente firmado por Aldo ni evidencia de HU programada. | Baja-media |
| 7 | Sampayo | Tecnico 0/40; Pruebas 0/25; Coordinacion 1/20; Constancia 1/10; Chat 0/5 | 2 | Solo aparece como integrante inicial del grupo y con participacion minima; no se encontro evidencia concreta de HU, pruebas, reportes, bugs o coordinacion de SIGECOP en las fuentes disponibles. | Baja |

## Nota de metodo

1. Se revisaron los chats exportados de WhatsApp: grupo `Fepy`, chats privados de Leo, Gahel/Gadiel y Ronis, y sus adjuntos principales.
2. Se cruzo el chat con material real disponible: reportes de estado de HU, planes de prueba, reportes de pruebas positivas, archivos `.txt` de hallazgos y documentos de reparto de contratos.
3. No se encontro un repositorio Git local ni historial de commits en esta carpeta; por eso, cuando una contribucion tecnica solo esta sustentada por chat/PR mencionado y no por commit local, se mantiene la confianza como alta solo si el mensaje incluye HU, rama, archivos y resultado de pruebas.
4. La cantidad de mensajes no se uso como criterio principal. Sirvio solo como senal de presencia/constancia y desempate.
5. Los puntajes son relativos al conjunto de evidencias revisadas, no una calificacion academica absoluta. Si aparece commit log, PRs reales o reportes faltantes, la tabla debe actualizarse.
6. **Registro de llamadas (no solo mensajes de texto):** se incorporo el historial de llamadas de trabajo. En la recta final hubo decenas de horas de trabajo conjunto Maik+Ivan (llamadas de 4 a 7 h entre el 12 y el 24-jun), en las que se EJECUTABAN los planes de prueba. Esto sustenta el alza de Ivan en Pruebas, Coordinacion y Constancia.
7. **Adjuntos tecnico-legales:** se incorporaron los archivos de Ivan `message_respondido.txt` y `Leyes_completas_en_Markdown.zip` (16-jun) como evidencia de fundamentacion legal de las validaciones (LOPSRM/RLOPSRM/LFD; "Ley 2025 prevalece sobre Reglamento 2023"). Esto sustenta el alza en Participacion tecnica real (de 7 a 25).
8. **Aclaracion de autoria de pruebas:** la ejecucion de los planes de prueba fue mayoritariamente CONJUNTA Maik+Ivan; antes no se atribuia a Ivan porque su autoria no figuraba en el chat de texto. Por eso Ivan sube al TOP 2. No se resto merito a quienes entregaron reportes propios firmados: Leo (`ResumenPruebas*_Becerra_Lugo_Leonardo`) y Ronis (`sigecop.txt`, `completo 2.txt`) conservan sus puntajes y su evidencia.

## Limitaciones

- Algunas evidencias estan en imagenes, audios o videos adjuntos que no se transcribieron completamente; solo se usaron cuando el chat o documentos extraidos daban contexto verificable.
- Hay nombres que pueden ser apodos o variantes (`Gahel/Gadiel`, `Van/Ivan`). No se fusionaron personas salvo cuando el chat lo hacia razonable; cualquier alias dudoso se marco en observaciones.
- Para Aldo y Sampayo la evidencia es insuficiente para defender un puntaje alto. No se les atribuyeron aportes no sustentados.
