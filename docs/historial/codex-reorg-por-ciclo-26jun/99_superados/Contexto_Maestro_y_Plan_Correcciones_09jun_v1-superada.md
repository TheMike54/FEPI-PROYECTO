# SIGECOP — Contexto maestro y plan de correcciones (9 de junio de 2026)

> **Qué es este documento:** la fuente única de verdad después de la revisión del profesor (2 sesiones grabadas) y del testing interno del equipo (Word con capturas). Contiene: el contexto completo del proyecto desde el inicio, todos los hallazgos consolidados, propuestas de solución, y el plan de ejecución por oleadas con prompts listos para Claude Code.

-----

## 0. Resumen ejecutivo

- El profe **sí revisó** el sistema (dos sesiones; llegaron desde el alta hasta el inicio de estimaciones). **Validó mucho de lo construido** (matriz de programa, fecha+hora en notas, horas de firma, export a Excel, auto-cálculo de garantía de anticipo, flujo de firmas) y dejó **~20 hallazgos**: 6 grandes, el resto fixes y medianos.
- El equipo corrió la guía de pruebas E2E y dejó **~11 hallazgos** propios (varios coinciden con el profe).
- **Las 3 fechas que mandan:** clase **mañana miércoles 10**, el PostgreSQL gratis de Render **expira el 25**, y el profe mencionó entrega **~28 de junio**. → Hay que resolver la **continuidad de la base de datos** (el 25 < 28) además de las correcciones.
- **Los 6 temas grandes:** (1) catálogo de **empresas**, (2) **plan de amortización** (criterio de HU-01 que falta), (3) registro de avance **por periodo + nota de bitácora**, (4) **alertas sin umbral** (rediseño conceptual), (5) **flujo legal de la estimación** (el contratista presenta, el residente autoriza — hoy está invertido), (6) **generadores y soportes** de la estimación (esto es de E3: HU-15–20).
- La mayoría de los fixes son chicos y dan mucha señal: se pueden tener listos **antes de la clase de mañana** (Oleada 1).
- **Rediseño UI/UX aprobado (decisión de Maiki):** identidad **institucional guinda** (colorimetría 4T / gob.mx: guinda `#691C32`, dorado `#BC955C`) **+ mejoras de experiencia** (selector global de contrato con preselección, estados vacíos guiados con CTA, micro-UX). Estrategia de orden: **correcciones primero, vestido por capas** — el shell y las páginas estables se visten temprano (Oleada UI-A, justo después de O1) y cada pantalla con rediseño funcional pendiente se viste **una sola vez, dentro de su propia oleada** (regla de “tocar una vez”). Diseño completo en S11.

-----

## 1. El proyecto en una página

**SIGECOP** — Sistema de Gestión Técnico-Administrativa de Contratos de Obra Pública. Proyecto académico (FEPY) que implementa el ciclo de un contrato de obra pública mexicano conforme a **LOPSRM**, **RLOPSRM** y **LFD**: alta del contrato → bitácora → avance físico → estimaciones → pago → convenios modificatorios.

- **Stack:** React 18 + Vite + Tailwind · Node 20 + Express · PostgreSQL · Docker · desplegado en Render. Repo: `github.com/TheMike54/FEPI-PROYECTO`.
- **Roles del sistema** (cuentas demo, contraseña `Sigecop2026!`): residente@, contratista@ (superintendente), supervision@, dependencia@, finanzas@ — todos @sigecop.test — y la cuenta del profe ([csilvasa@ipn.mx](mailto:csilvasa@ipn.mx)).
- **Equipos:** **Maiki** = fundación (integra, despliega, es dueño de todo lo que entra a `main`); **Equipo 2** = bitácora/documental/avance; **Equipo 3** = ciclo de estimaciones/reportes. Los equipos entregan por PR; solo Maiki integra y pushea.
- **Método:** Claude chat (planeación/prompts) + Claude Code (ejecuta en local, sin commit/push; Maiki decide). Toda construcción cita el artículo de ley o se marca `[validar]` con el profe.

-----

## 2. Cómo llegamos aquí (cronología corta)

1. **Fundación (P1–P3):** auth, alta de contrato completa (catálogo de conceptos con cuadre al centavo, programa de obra con regla del 100%, garantías, jurídicos, PDF), bitácora (apertura/notas/firmas inmutables con folio correlativo), estimación con carátula calculada en servidor (G1–G8: bruto = Σvol×PU − amortización proporcional del anticipo art. 138 RLOPSRM − 5 al millar art. 191 LFD), pago, backend de convenios.
1. **Integración de equipos:** HU-02 sustitución (E2), HU-04 expediente (E2), HU-06 avance físico con candado art. 118 (E2), HU-07 alertas (E2), HU-13 envío de estimación (E3), HU-14 historial (E3), HU-05 curva de avance (E2), HU-17 tablero (E3). Patrón: Code revisa el PR (rebase, zona congelada, spec real), corre la suite, Maiki integra.
1. **Plan Maestro 1 (UI de estimación):** pantalla única con carátula viva, semáforo de plan por periodo, retención por atraso (pena × bruto), avance físico/financiero.
1. **Plan Maestro 2 (correcciones del testing de Maiki):** matriz mes-por-mes visible en detalle/expediente, validación de fecha de pago, garantía de anticipo auto-calculada, fecha+hora en notas, indicador de atrasos, **sustitución genera nota de bitácora automática** (con diferido si no hay bitácora abierta).
1. **HU-03 (Maiki la tomó):** Fase 1 = convenios de plazo con historial inmutable y avisos 25/50; Fase 2 = editor de matriz para convenios de monto/programa/mixto (deriva el monto al centavo, versiona el programa).
1. **Hoy:** ~17 HU funcionando end-to-end en Render. Quedan de los equipos: HU-11 + correcciones estructurales de bitácora (E2) y HU-15–20 (E3). El profe revisó el 8–9 de junio: este documento consolida esa revisión.

-----

## 3. Estado del sistema HOY

|HU                    |Qué hace                                                        |Estado                                                     |
|----------------------|----------------------------------------------------------------|-----------------------------------------------------------|
|00                    |Login                                                           |✅ Producción                                               |
|01                    |Alta de contrato (catálogo, programa, garantías, jurídicos, PDF)|✅ Producción — con correcciones de esta revisión           |
|02                    |Sustitución de personas + nota automática                       |✅ Producción — fixes de redacción pendientes               |
|03                    |Convenios: plazo + editor de matriz (monto/programa/mixto)      |✅ Producción — falta verse en expediente/bitácora          |
|04                    |Expediente                                                      |✅ Producción — fixes + plan de amortización pendiente      |
|05                    |Curva de avance                                                 |✅ Producción — debe iniciar en 0 + tooltips                |
|06                    |Registro de avance físico (art. 118)                            |✅ Producción — **rediseño: por periodo + nota**            |
|07                    |Alertas de atraso                                               |✅ Producción — **rediseño: sin umbral**                    |
|08/09/10              |Bitácora: apertura, notas+firmas+vincular, consulta             |✅ Producción — apertura narrativa pendiente (E2)           |
|12                    |Estimación (pantalla única)                                     |✅ Producción — **cambio de roles por ley** + número visible|
|13                    |Envío de estimación                                             |✅ Producción — se re-semantiza con el flujo legal          |
|14                    |Historial de estimaciones                                       |✅ Producción                                               |
|17                    |Tablero de estimaciones                                         |✅ Producción                                               |
|21                    |Pago                                                            |✅ Producción                                               |
|11, 15, 16, 18, 19, 20|(E2: HU-11; E3: generadores, soportes, reportes)                |⏳ Pendientes de los equipos                                |

-----

## 4. Reglas de trabajo (vigentes)

- **Zona congelada** (no regresar, solo extender): auth, G1–G8 de estimación, gating/cuadre del alta, inmutabilidad de bitácora/firmas, `permisos.js`, `server.js` (routers nuevos después de `cors()`).
- **Propiedad:** HU integrada en `main` = de Maiki. Los equipos no la tocan más; cambios posteriores = rebase sobre main + coordinación.
- **Las 8 lecciones obligatorias:** (1) selección, no texto libre; (2) inmutabilidad; (3) banner “solo consulta”; (4) fechas con hora; (5) acotado por participación + rol; (6) router tras cors; (7) al reescribir página, actualizar su spec; (8) citar artículo o `[validar]`.

-----

## 5. LA REVISIÓN DEL PROFE — hallazgos (P1…P20)

### Sesión 1 (alta → expediente)

**P1 — Catálogo de EMPRESAS (grande, lo que más machacó).**
No existe la entidad *empresa*; las personas flotan sueltas. El profe: *“Tú primero das de alta la empresa y luego vinculas”*, *“catálogos: es lo de ley”*. Si cada quien teclea su empresa, “patito”/“PAT”/“patito SASB” se vuelven 3 empresas distintas → redundancia, sin normalizar, imposible buscar (“todos los residentes que han sido de este contrato que pertenecen a esta empresa”). Mecánica que pidió: al **registrar a una persona** se capturan los datos de su empresa → si no existe, **se da de alta automáticamente**; el siguiente registro **ya la elige** del catálogo. Además: *contratista y supervisión no pueden ser de la misma empresa* (la supervisión es un tercero). Y la búsqueda por contratista del expediente requiere esto.

**P2 — Fecha de inicio del contrato debe aceptar fechas pasadas (fix).**
El profe quiso capturar inicio “hace una semana” y el sistema no dejó avanzar. Veredicto del propio equipo en vivo: *“la fecha de inicio que no deje [es el error]; lo demás sí”*. Un contrato que ya inició se captura con su fecha real.

**P3 — Registrar una dependencia a mitad del alta pierde lo capturado (fix UX).**
Existe el botón para dar de alta una dependencia nueva, pero al usarlo *“vas a tener que recargar la página y adiós a tus datos”*. Debe ser un modal/flujo que no destruya el estado del formulario del alta.

**P4 — Datos jurídicos: simplificar (mediano).**
*“La cédula la quitamos”* (coincide con lo que ya sabíamos: la cédula profesional no tiene base en LOPSRM/RLOPSRM). Quién firma un contrato realmente: **apoderado/representante legal de la dependencia, representante legal del contratista, los abogados de ambas partes** y, si acaso, órgano interno de control / función pública (~4 firmantes). “Datos jurídicos son los datos de la dependencia y la contraparte que firman” — idealmente ligados a las entidades (dependencia/empresa), no texto suelto.

**P5 — Garantías: dos validaciones (fix).**
(a) Si el monto capturado **excede el % esperado** (anticipo > % de anticipo del contrato; cumplimiento > 10% del monto), **avisar con la modal** acordada: *“me tendrás que decir: estás poniendo más del 30%”*. No bloquear: avisar. (b) **Bug confirmado en vivo:** el sistema **aceptó una garantía con vigencia vencida** (fecha de ayer). Validar vigencia.

**P6 — PLAN DE AMORTIZACIÓN (grande — criterio de HU-01 que falta).**
Está en los criterios de aceptación de HU-01 y no existe. El profe lo definió: *“es en qué mes voy a devolver el dinero [del anticipo]… muy parecido al programa de obra: por estimación, qué cantidad va a amortizar. No hay límites — puede amortizar todo en el primer pago o repartido”*. Se captura **en el alta** (matriz por periodo/estimación) y se muestra **en el expediente**. ⚠️ Implicación profunda: hoy la carátula amortiza **proporcional** (anticipo% × bruto, art. 138 RLOPSRM, que literalmente dice “proporcionalmente”). El plan libre del profe ≠ proporcional estricto → ver propuesta S2 y el `[validar]` correspondiente.

**P7 — Nota de apertura narrativa (confirmado; es la corrección estructural de E2).**
La apertura debe desplegar **una redacción** que jale automáticamente fecha, nombres y datos del contrato, **editable** para agregar texto. *“Les enseñé un ejemplo de una nota de apertura”*. (La nota actual fue “para que tuviéramos una bitácora”, hay que corregirla.)

**P8 — Vincular notas de bitácora a la ESTIMACIÓN (mediano).**
*“Son cinco notas, las elijo, ya quedan vinculadas: van a ser parte de esta estimación… un vínculo lógico. A nivel de presentación veo la estimación y se jalan sus notas de bitácora”*. Las notas firmadas son inmutables — solo se referencian. (Encaja con los documentos de la estimación del RLOPSRM — ver S6.)

**P9 — Diseño/formato de la NOTA (mediano).**
La nota exportada *“la escupieron y ya”*. Debe verse/imprimirse como **documento formal**: encabezado, contenido, firmantes con rol y hora — porque la copia de la nota **se adjunta a la estimación**.

**P10 — Validados ✅ (no tocar):** fecha+hora de creación de la nota; hora de cada firma; export a Excel de notas; filtros de búsqueda (fecha vacía = correcto si las notas son de hoy); matriz de programa “así bonito”; auto-cálculo de la garantía de anticipo; alta de dependencia con botón (solo falta P3).

**P11 — HU de sustitución sin documentar (proceso).**
La funcionalidad existe y funciona, pero **la historia no está escrita** en `Historias_Usuario.xlsx`. El profe la quiere especificada (le tocaba al encargado de historias).

**P12 — Expediente: 3 faltantes.**
(a) **Plan de amortización** (cuando exista, P6). (b) El **catálogo de conceptos no muestra el identificador/clave** de cada concepto — mostrarlo. (c) La **búsqueda por contratista** depende del catálogo de empresas (P1).

**P13 — Comentarios de diseño de BD (sin acción).**
“Están atascando todo en una sola tablota… yo hubiera guardado la referencia con un sistema de archivos [para el PDF]” — pero *“lo resolvieron; están resolviendo problemas”*. Lo dejó pasar. No se reestructura nada ahora.

### Sesión 2 (avance → estimaciones)

**P14 — HU-06 Registro de avance: POR PERIODO + NOTA + validación contra el programa (grande).**

- El registro debe ubicarse en un **periodo** del programa (selector “Periodo 1/2/3…”), **no fecha libre**: *“en lugar de la fecha, que diga periodo 1, periodo 2”*.
- Al elegir el concepto, **traer su programa** (solo el de ese concepto) como referencia, con atajo: *”¿Ejecutaste todo [lo del periodo]? Sí → te pone el número; No → capturas lo que reportas”*.
- **Validar contra lo programado del periodo (acumulado):** *”¿Cuánto te autoricé el mes 1? Mil. No puedo pagar más de eso; tendría que ser un modificatorio para adelantar”*. Mensajes: “en este periodo no está programado este concepto” / “excediste lo programado de este periodo — ¿tienes convenio modificatorio?”. Como los convenios **ya versionan el programa** (HU-03 F2), con convenio el programa vigente ya lo permite: la validación contra el **programa vigente** resuelve ambos mundos.
- **El registro genera/vincula una NOTA de bitácora:** *“formalmente esto es levantar una nota… el aviso es a través de una nota”* — texto tipo: “Se ejecutaron 1,000 m de malla conforme a lo previsto en el programa de obra”. Y el **registro** (no la nota) guarda las **evidencias** (fotos, planos): *“la nota no tiene fotos, es texto; tu registro tiene la evidencia”*.

**P15 — HU-07 Alertas: rediseño conceptual (grande).**

- **No se configura qué conceptos vigilar:** *“formalmente son TODOS los conceptos; todos es responsabilidad”*.
- **Sin umbral y sin porcentajes:** *“me tendría que decir: no has entregado 300 que te comprometiste — y el siguiente mes me actualiza el número de acuerdo a lo que tendría que haber hecho hasta ese momento”*. La alerta = **déficit en unidades** (programado acumulado − ejecutado acumulado) por concepto, recalculado por periodo.
- **No confundir atraso de concepto con avance de obra:** el avance de obra es del **contrato**, ponderado (su ejemplo: 1,000 de 15,000 = 6.66%; +3,000 → 26.6%, así se construye la curva). El atraso de un concepto es **parcial**. *“Sí puedes dar alarmas por concepto, pero no llamarle a eso avance de obra”*. La redacción de la HU en el Excel está mal (título por concepto, descripción por contrato) → corregirla.

**P16 — HU-05 Curva de avance: 2 fixes.**
(a) **Las curvas deben iniciar en 0** en t=0: hoy la programada arranca en ~4% (*“no has hecho nada; el programado va en cero; en el primer periodo es el primer avance”* — el primer punto del programa cae al cierre del periodo 1, no en el origen). (b) **Tooltips interactivos:** *“el graficador te debe dar el valor cuando pongas el mouse”*.

**P17 — HU-12 Estimación: número visible ligado al periodo (fix).**
La carátula debe mostrar **“Estimación No. N”**: *”¿cuál estoy presentando? Tiene que ser número… la 8 corresponde a tal mes, porque está relacionado con el programa de obra”*.

**P18 — GENERADORES y SOPORTES (grande — es el corazón de lo pendiente de E3).**
*“Te faltan los generadores. Los generadores te crean esto [el concentrado]: en el generador ves qué concepto entra en esta estimación, cuántos ya están ejecutados, cuántos ejecutaste en este periodo, el precio unitario, y una foto (si es obra, de la obra; si es documento, del documento). Cuando llenas todos los generadores se llena el concentrado y después la carátula — la carátula son los números finales.”* Más los **soportes**: *“la carpetota: generadores, su resumen, su carátula y después documentos”*. El registro fotográfico “quedó en boceto”. → Esto mapea directo a las HU-15–20 de E3; el profe: *“por eso les pedí que revisaran las estimaciones”*.

**P19 — Fechas (riesgo de calendario).**
El profe a la coordinadora: *“yo creo que hasta como por el 28 me entreguen algo”* → entrega ~**28 de junio**. **El PostgreSQL gratis de Render expira el 25.** Hay que garantizar continuidad de la BD más allá del 25 (ver Oleada 0). Además: **mañana miércoles 10 hay clase** (la revisión continúa).

**P20 — Sesiones en la demo (nota, no bug).**
La confusión de “no hay contratos” con la cuenta del profe fue por cookies/cuentas compartidas y por el **acotamiento por participación funcionando** (el contrato lo creó la cuenta residente del equipo; el profe no es parte). Para demos: entrar con la cuenta correcta o hacer al profe parte del contrato.

-----

## 6. LAS PRUEBAS DEL EQUIPO (Word) — hallazgos (W1…W11)

**W1 — Pasos 1–3 ✅** (login, alta, apertura): verdes.

**W2 — Roster: “Asignación inicial” no es un motivo (fix).**
En el histórico, la fila inicial muestra *“Asignación inicial (alta del contrato)”* en la columna **Motivo**. Pedido: separar — una columna **Origen/Evento** (alta del contrato | sustitución) y **Motivo** solo para los cambios reales.

**W3 — Nota automática de sustitución: 3 fixes de redacción.**
(a) El **título es genérico**: “Sustitución del superintendente, del residente anterior o de la supervisión” → debe decir **quién** se sustituyó: “Sustitución de superintendente: Arq. Carlos → luis perez”. (b) La redacción liga el **motivo a la persona nueva** (“Persona nueva: luis perez. Motivo: …”) → el motivo es **del cambio de la anterior**; redactar narrativo: “Se sustituye a [anterior] como [rol] por [motivo]; entra [nueva] a partir de [fecha]”. (c) La fecha sale **en inglés** (“Sat Jun 06”) → formatear en español.

**W4 — Expediente: 3 hallazgos.**
(a) La tabla de roster repite el problema del motivo (W2). (b) El **encabezado del expediente muestra al contratista ORIGINAL** (Arq. Carlos) aunque ya fue sustituido (luis perez es el vigente) → ese label debe leer al **vigente del roster**. (c) **Los descargables del expediente son prototipo** (los PDF dicen “prototipo”/no traen nada) y “Exportar expediente” no funciona. Propuesta del equipo (buena): **un solo PDF** con toda la información del expediente, en vez de muchos PDFs sueltos. → Aceptada como diseño (ver S8).

**W5 — Avance (coincide con P14).**
(a) Hoy **permite guardar un avance “sin periodo”** (fuera de las fechas de los periodos) → con el rediseño por periodo (P14) esto desaparece: el periodo se **selecciona**, siempre hay periodo. (b) ¿Se puede ligar más de un avance a la misma nota? → con P14 cada registro genera **su** nota (1:1); varios registros del mismo periodo pueden citarse entre sí vinculando notas (mecanismo existente). (c) “¿No se debe crear una nota al registrar?” → **sí** (P14, el profe lo confirmó).

**W6 — Alertas (complementa P15).**
(a) **Notificar a los roles al iniciar sesión** (badge/banner de “tienes N conceptos con déficit”). (b) ¿Pausar/eliminar alertas según ley? → con el rediseño P15 ya no hay alertas configurables que pausar: el déficit **es un hecho** calculado; a lo sumo “marcar como visto”. La bitácora/expediente no se altera (`[validar]` si quieren silenciado explícito). (c) **Vincular el atraso a una nota** → sí: botón “asentar en bitácora” que genera nota del atraso (patrón de la nota de sustitución).

**W7 — Estimación: ¿quién la hace? (CORRECCIÓN LEGAL — coincide con el profe).**
El equipo detectó que la guía decía “residente crea la estimación” pero *“el residente solo puede leer y el contratista es el que puede hacerlas”*. **Tienen razón conforme a la ley:** el art. 54 LOPSRM establece que **las estimaciones las presenta el CONTRATISTA a la residencia de obra** (acompañadas de la documentación que acredita la procedencia del pago) y **la residencia las revisa y autoriza** en un plazo. El flujo actual del sistema (residente integra → contratista envía) está **invertido**. Además el propio profe navegó la estimación **como contratista**. → Cambio de flujo: ver S5. (Cita exacta del art. 54 a verificar contra el PDF, pero la dirección es de alta certeza.) (b) “¿Al crear estimación se crea una nota?” → la relación correcta es la inversa: la estimación **referencia** notas existentes como soporte (P8/S6); y opcionalmente una nota de presentación `[validar]`.

**W8 — Paso 11 (envío) ✅** — funciona; se re-semantiza con S5.

**W9 — Pasos 12–13 parciales, 15 dependiente:** el equipo los liga a **HU-15 no disponible** (módulos de estimación de E3). Paso 14 (curva) ✅ funciona (con los fixes P16 pendientes).

**W10 — Paso 16: el “error” del convenio NO es bug.**
La alerta “La variación de plazo (66.67%) excede el límite configurado (25%)” es el **guardrail del 25% funcionando** (art. 59 LOPSRM: los convenios no deben rebasar el 25% del monto **o del plazo**): el contrato de prueba tenía plazo ~45 días y +30 días = 66.7%. Acciones: (a) explicar al equipo, (b) **corregir la guía de pruebas** (usar una ampliación ≤25% del plazo del contrato de prueba, p. ej. +10 días sobre 45), (c) sigue el `[validar]` con el profe: ¿25% tope duro (hoy bloquea) o disparador de revisión?

**W11 — ¿El convenio debe verse en expediente y bitácora?**
**Sí a ambos** (propuesta): el convenio es un hecho relevante del contrato → **nota de bitácora automática** al registrarlo (mismo patrón que la sustitución, Pase 2.3) y **sección de convenios en el expediente** (HU-04) con su historial y versiones del programa. Fundamento general: la bitácora asienta los eventos relevantes (art. 123/125 RLOPSRM) y el convenio forma parte del expediente del contrato — `[verificar artículo exacto contra PDF]`.

-----

## 7. Lo que quedó VALIDADO (no tocar)

Matriz de programa mes-por-mes ✅ · fecha+hora de creación en notas ✅ · hora de cada firma ✅ · export de notas a Excel ✅ · filtros de búsqueda de notas ✅ · auto-cálculo de garantía de anticipo ✅ · flujo de firmas multi-rol ✅ · alta de dependencia nueva con botón ✅ (solo P3) · candado de doble apertura de bitácora ✅ · acotamiento por participación ✅ (P20: hasta confundió al profe — funciona).

-----

## 8. Tabla maestra consolidada

|#       |Hallazgo                                                                        |Tipo       |Dueño            |Tamaño|Oleada                     |
|--------|--------------------------------------------------------------------------------|-----------|-----------------|------|---------------------------|
|P2      |Fecha de inicio: aceptar pasadas                                                |Fix        |Maiki            |XS    |1                          |
|P5b     |Garantía con vigencia vencida                                                   |Fix (bug)  |Maiki            |XS    |1                          |
|P5a     |Modal si garantía excede %                                                      |Fix        |Maiki            |S     |1                          |
|W2/W4a  |Origen vs Motivo en roster (2 vistas)                                           |Fix        |Maiki            |XS    |1                          |
|W3      |Nota de sustitución: título/redacción/fecha-es                                  |Fix        |Maiki            |XS    |1                          |
|W4b     |Encabezado del expediente = vigente                                             |Fix        |Maiki            |XS    |1                          |
|P12b    |Clave de concepto en catálogo del expediente                                    |Fix        |Maiki            |XS    |1                          |
|P16     |Curva desde 0 + tooltips                                                        |Fix        |Maiki            |S     |1                          |
|P17     |“Estimación No. N” en carátula                                                  |Fix        |Maiki            |XS    |1                          |
|W10     |Corregir guía de pruebas (paso 16)                                              |Doc        |Claude chat      |XS    |1                          |
|P3      |Alta de dependencia sin perder estado                                           |Fix UX     |Maiki            |S     |1–2                        |
|P6      |Plan de amortización (alta + expediente)                                        |Grande     |Maiki            |M     |2                          |
|P1      |Catálogo de empresas                                                            |Grande     |Maiki            |M–L   |3                          |
|P4      |Datos jurídicos simplificados (sin cédula)                                      |Mediano    |Maiki            |S–M   |3                          |
|P14/W5  |Avance por periodo + nota + validación                                          |Grande     |Maiki            |M     |4                          |
|P15/W6  |Alertas v2 (sin umbral, déficit en unidades)                                    |Grande     |Maiki            |M     |5                          |
|W11     |Convenio → nota + expediente                                                    |Mediano    |Maiki            |S     |6                          |
|W7      |Flujo legal de estimación (contratista presenta / residente autoriza)           |Grande     |Maiki            |M     |7 (diseño se valida mañana)|
|P8      |Vincular notas a estimación                                                     |Mediano    |Maiki            |S–M   |8                          |
|P9      |Formato de documento de la nota                                                 |Mediano    |Maiki            |S     |8                          |
|W4c     |Expediente: un solo PDF real                                                    |Mediano    |Maiki            |M     |9                          |
|P6-FaseB|Usar el plan de amortización en la carátula                                     |Grande     |Maiki            |M     |10 (tras `[validar]`)      |
|UI-A    |Design system guinda + AppShell + selector global de contrato + páginas estables|UX/Visual  |Maiki            |M     |UI-A (tras O1)             |
|UI-B    |Barrido de consistencia + micro-UX (toasts, validación inline, skeletons, es-MX)|UX/Visual  |Maiki            |S     |UI-B (final)               |
|P18     |Generadores + soportes                                                          |Grande     |**E3** (HU-15–20)|L     |paralelo YA                |
|P7      |Apertura narrativa                                                              |Estructural|**E2**           |M     |paralelo YA                |
|P11     |Escribir HU de sustitución en Excel                                             |Proceso    |**E2/equipo**    |XS    |paralelo YA                |
|P15c    |Corregir redacción de HU-07 en Excel                                            |Proceso    |equipo           |XS    |paralelo                   |
|P19     |Continuidad de BD Render (25 < 28)                                              |Infra      |Maiki            |S     |**0 (YA)**                 |

-----

## 9. Propuestas de solución (diseño)

### S1 — Oleada 1: el paquete de fixes (todo junto, bajo riesgo)

Frontend + validaciones, **sin DDL** salvo indicado:

- **Fecha de inicio:** quitar la restricción “≥ hoy” del alta (solo inicio; mantener coherencia inicio<fin y las demás validaciones).
- **Garantías:** (a) rechazar vigencia vencida (`vigencia ≥ hoy` al capturar, con mensaje); (b) modal de confirmación si `monto > pct_esperado × monto_contrato` (anticipo: % del contrato; cumplimiento: 10%) — avisa, no bloquea.
- **Origen vs Motivo:** en roster (HU-02) y expediente (HU-04), columna nueva “Evento” = `Alta del contrato | Sustitución`; “Motivo” queda vacío para el alta. Sin DDL (se deriva: la fila inicial no tiene sustitución asociada).
- **Nota de sustitución:** título específico (“Sustitución de {rol}: {anterior} → {nueva}”); cuerpo narrativo (“Se sustituye a {anterior} como {rol}. Motivo del cambio: {motivo}. Entra {nueva} a partir de {fecha}.”); fecha con `toLocaleDateString('es-MX', …)`.
- **Encabezado del expediente:** leer el superintendente **vigente** del roster (mismo endpoint del Pase 2.3), no el texto/puntero del alta.
- **Catálogo en expediente:** añadir columna “Clave”.
- **Curva (HU-05):** anteponer el punto (t=fecha_inicio, 0%) a las tres series; el periodo N grafica a su **cierre**; tooltips con valor (Recharts `<Tooltip>` con formato %).
- **Carátula:** “Estimación No. {n} — Periodo {p} ({mes})” prominente.

### S2 — Plan de amortización (P6)

**Fase A (Oleada 2, sin tocar G):** tabla aditiva `plan_amortizacion(contrato_id, periodo_numero, monto)` (o %); paso nuevo en el alta tipo matriz (reusa el patrón del programa): por periodo, cuánto se amortiza; **validación: Σ = monto del anticipo** (si anticipo = 0, paso se omite); default precargado **proporcional** (el usuario lo edita libre — “no hay límites” por periodo). Lectura en expediente (HU-04).
**Fase B (Oleada 10, tras `[validar]`):** la carátula usa `plan[periodo]` en vez de `anticipo% × bruto`. ⚠️ **Conflicto a informar al profe:** el art. 138 RLOPSRM indica amortización **proporcional** con cargo a cada estimación; el plan libre la generaliza. Propuesta al profe: *“plan editable con default proporcional; ¿la carátula obedece al plan?”* — hasta su OK, la carátula sigue proporcional (los números no cambian sin aviso).

### S3 — Catálogo de empresas (P1)

DDL aditivo: `empresas(id, nombre UNIQUE normalizado, rfc?, tipo?)` + `usuarios.empresa_id NULL`.

- **Registro de usuario:** campo Empresa con **autocomplete sobre el catálogo**; si no existe → “¿Registrar ‘{nombre}’ como empresa nueva?” (alta automática, el principio exacto del profe). Normalizar (trim/случай) para matar “patito/PAT”.
- **Backfill:** las cuentas demo se asignan a 3 empresas semilla (Dependencia Demo / Constructora Demo / Supervisión Externa Demo).
- **Validación en alta de contrato:** aviso si superintendente y supervisión comparten empresa (*“la supervisión es un tercero”*) — aviso, no bloqueo `[validar]`.
- **Expediente:** mostrar empresa junto a cada persona; **búsqueda por contratista/empresa**.
- `permisos.js` no cambia (no es una HU nueva, es un atributo transversal).

### S4 — Avance por periodo + nota (P14/W5)

- UI HU-06: reemplazar fecha libre por **selector de periodo** (del programa vigente); al elegir concepto, mostrar **su renglón del programa** (programado por periodo + acumulado + ejecutado acumulado); toggle *“Ejecuté todo lo programado del periodo”* → autollenar.
- **Validación servidor (además del art. 118 total):** `ejecutado_acumulado + nuevo ≤ programado_acumulado_al_periodo` **del programa vigente** (así un convenio que adelanta volumen lo permite automáticamente). Mensajes: “no programado en este periodo” / “excede lo programado; requiere convenio modificatorio (art. 59)”. **Bloquea** (consistente con el semáforo G5 de la estimación) — `[validar]` si el profe prefiere aviso.
- **Nota automática:** mismo patrón del Pase 2.3 (folio atómico, diferido si no hay bitácora): *“Avance de trabajos — {concepto}: se ejecutaron {cantidad} {unidad} en el periodo {p}, conforme al programa de obra.”* Registro liga `nota_id`.
- **Evidencias (Fase B):** tabla `avance_evidencias(registro_id, archivo, descripcion)` con upload (reusa el mecanismo del PDF del alta); la nota es texto, la evidencia vive en el registro.
- DDL: `periodo_numero` y `nota_id` en la tabla de avances (aditivo); evidencias en fase B.

### S5 — Flujo legal de la estimación (W7) — **diseño para validar con el profe MAÑANA, construir después**

Ley (art. 54 LOPSRM, verificar literal): el **contratista presenta** la estimación con su documentación; la **residencia revisa y autoriza**. Cambio propuesto **sin migrar datos** (se conservan los estados internos, cambian etiquetas y actores):

- **HU-12 (captura/integración)** pasa a **contratista** (= “Formular y presentar estimación”); el residente queda en consulta. El semáforo y G1–G8 no cambian (el servidor calcula igual).
- **HU-13** se convierte en **“Revisar y autorizar”** del **residente** (estado interno `enviada` se re-etiqueta “Autorizada”; sella `autorizada_por/en` = columnas existentes `enviada_*`).
- **HU-21 Pago** paga lo **autorizado** (sin cambios de fondo).
- Cambios: `permisos.js` (zona congelada — lo toca fundación con cuidado: HU-12 contratista=‘E’, residente=‘C’; HU-13 residente=‘E’, contratista=‘C’), etiquetas de UI, candados espejo (participación: superintendente presenta SU contrato; residente autoriza el SUYO), specs.
- **Por qué validar primero:** invierte quién hace qué en el módulo más blindado; 30 minutos del profe evitan rehacerlo. Si mañana no se puede validar, se construye igual citando art. 54 con etiqueta `[Nivel 1 — ley clara]`.

### S6 — Vincular notas a la estimación + formato de nota (P8/P9)

- Tabla puente `estimacion_notas(estimacion_id, nota_id)`; al **presentar** la estimación (S5), selector multi de **notas firmadas** del contrato (“notas que soportan esta estimación”); la vista de la estimación las lista y enlaza. Inmutables: solo referencia.
- **Vista documento de la nota:** plantilla imprimible (encabezado: contrato/folio/fecha-hora · cuerpo · firmantes con rol y hora) + botón “Ver como documento / imprimir” (print CSS). Sirve además como el “PDF de la nota” que se adjunta a la carpeta de la estimación (P18).

### S7 — Alertas v2 (P15/W6)

- **Quitar la configuración por concepto/umbral.** El panel pasa a ser **automático**: tabla de TODOS los conceptos del contrato con `déficit = programado_acumulado(periodo actual) − ejecutado_acumulado` (solo filas con déficit > 0), **en unidades**, recalculado al consultar (sin cron). El “umbral” desaparece.
- **Aviso al iniciar sesión:** badge/banner “Tienes N conceptos con déficit en M contratos” (respeta participación).
- **“Asentar en bitácora”:** botón que genera nota del atraso (patrón sustitución) — el vínculo atraso↔nota que pidió el equipo.
- Conservación: la tabla vieja de alertas configuradas se deja de usar (se oculta la config); no se borra nada.
- Separación conceptual: este panel es “atraso por concepto”; el **avance de obra** (ponderado) ya vive en HU-05/HU-12 — renombrar labels para no mezclarlos (y corregir la HU en el Excel).

### S8 — Expediente: un solo PDF real (W4c)

Aceptar la propuesta del equipo: **un PDF único** “Expediente del contrato” con todos los bloques (generales, catálogo con claves, programa vigente + versiones, plan de amortización, garantías, jurídicos, roster/sustituciones, convenios, resumen de estimaciones). Implementación pragmática: vista de impresión consolidada (print CSS) o generación server-side. Se eliminan los botones “prototipo”.

### S9 — Convenios visibles (W11)

Nota automática al registrar convenio (patrón 2.3): *“Convenio modificatorio {folio}: {tipo}, variación {x}%. Motivo: {motivo}.”* + sección “Convenios modificatorios” en el expediente (historial + link a versiones del programa). `[verificar artículo exacto de bitácora/expediente contra PDF]`.

### S10 — Para E3 (generadores) y E2 (bitácora) — specs claras

- **E3 (HU-15–20):** generador por concepto (concepto, acumulado previo, ejecutado del periodo, PU, importe, **evidencia foto/documento**) → al completar generadores se llena el **concentrado** (la captura de volúmenes existente) → la **carátula** ya la calcula el servidor (G1–G8, **no tocar**). + **Soportes**: la “carpeta” de la estimación (generadores + resumen + carátula + documentos adjuntos). Integrarse al flujo S5 (los llena el **contratista** al presentar). Entregar por PR sobre main actual.
- **E2:** apertura narrativa (P7: plantilla autogenerada + texto editable), vincular lineal, tipos de nota por rol, HU-11, y **escribir** las HU de sustitución (P11) y corregir la redacción de HU-07 (P15) en el Excel.

### S11 — Rediseño UI/UX “SIGECOP institucional” (aprobado: Opción A, guinda 4T)

**Por qué este orden (evaluación):** los fixes de O1 van primero porque son para la clase de mañana. El **shell** (sidebar + topbar + tokens) se viste inmediatamente después (UI-A) porque envuelve **todas** las páginas → máximo cambio visual con mínimo riesgo. Las pantallas con rediseño funcional pendiente (alta+amortización O2, avance O4, alertas O5, estimación O7) **no se visten en UI-A**: se construyen ya con el design system **en su propia oleada** — vestirlas hoy y reconstruirlas la semana próxima sería pagar el trabajo dos veces. Cierra UI-B con el barrido de consistencia.

**Tokens (la fuente de verdad para `tailwind.config` + `index.css`):**

- Guinda primario `#691C32` · guinda oscuro (sidebar) `#4E1525` · dorado acento `#BC955C`
- Fondo de página `#F4F2EE` · superficie `#FFFFFF` · borde `#DDD8CF`
- Texto principal `#3B3732` · texto secundario `#857F76`
- Semánticos: éxito `#0F6E56` / fondo `#E1F5EE` · advertencia `#854F0B` / `#FAEEDA` · peligro `#A32D2D` / `#FCEBEB` · info institucional `#691C32` / `#F7ECEF`
- Estética **flat institucional**: sin gradientes ni sombras decorativas; radios 8px; títulos peso 500; el item activo del sidebar lleva **borde izquierdo dorado**.

**Componentes compartidos** (`frontend/src/components/ui/`): `AppShell` (sidebar guinda oscuro con grupos e iconos + topbar guinda con título, **selector global de contrato**, chip de rol y usuario), `PageHeader` (breadcrumb + título + chips de estado; **envuelve HeaderVista/AvisoSoloLectura existentes — el banner solo-consulta se conserva**), `Card`, `KpiCard`, `Badge` de estado (Vigente / Pagada / Presentada / Autorizada / En atraso / Por firmar), `Tabla` (encabezado gris claro, montos a la derecha, folio en 500), `EmptyState` (icono + mensaje + CTA), `Toast`.

**Mejoras de experiencia (lo funcional, todo aditivo):**

1. **Selector global de contrato** en la topbar: `ContratoContexto` nuevo (React context + localStorage) con los contratos visibles del usuario. Las páginas **conservan** su selector local, pero lo **inicializan desde el contexto** (preselección) y al cambiarlo lo actualizan. Resultado: ya no se re-elige el contrato en cada vista (lo que sufrió el profe en la demo), sin romper nada. Cero rutas ni API nuevas. *(Esto absorbe en versión ligera la HU “login-contrato” que estaba pospuesta.)*
1. **Estados vacíos guiados:** cada vista sin datos ofrece el siguiente paso con botón (sin bitácora → “Abrir bitácora”; sin estimaciones → “Presentar estimación”; sin contratos → “Registrar contrato”), respetando permisos (el CTA solo aparece si el rol puede ejecutarlo).
1. **Micro-UX (UI-B):** toasts de éxito/error con un solo componente; validación inline junto al campo; skeletons de carga; helper único de formato es-MX para moneda y fechas.
1. **Regla dura:** conservar **todos los `data-testid`** (la suite no se rompe); si cambian selectores de navegación del sidebar, actualizar los helpers de los specs (lección 7). Contraste AA del guinda con blanco; foco visible.

-----

## 10. PLAN DE EJECUCIÓN por oleadas

> Regla de siempre: Code construye LOCAL sin commit/push, entrega doc + suite verde; Maiki revisa, integra y despliega. Cada oleada = una sesión de Code con su prompt.

### Oleada 0 — HOY: continuidad de la base (no negociable)

La entrega es ~28 jun y la BD gratis muere el 25. Acciones: (1) **backup automatizable**: script `pg_dump` contra la BD de Render documentado en un runbook (correrlo diario desde ya); (2) decidir el camino: **plan de pago del Postgres en Render** (lo más simple) o **nueva instancia gratuita + restore** el 24–25 (cambiar `DATABASE_URL` y redeploy). Recomendación: si hay presupuesto mínimo, pagar el mes; si no, ensayar el restore AHORA (no el 24).

**Prompt O0:**

```
Soy Maiki. Tarea de infraestructura URGENTE (no toca código de la app): continuidad de la BD de Render.
La instancia PostgreSQL gratuita expira el 25 jun y la entrega es ~28 jun.
1) Crea backend/scripts/backup_render.md (runbook) + script pg_dump parametrizado por DATABASE_URL
   (formato custom -Fc), y el comando de restore (pg_restore) a una instancia nueva.
2) Ensayo: dump de la BD local de Docker y restore a una BD vacía local; verifica conteos de tablas clave.
3) Documenta el plan B completo: crear instancia nueva en Render, restore, actualizar DATABASE_URL, redeploy, smoke.
NO toques la BD de producción sin que yo lo corra. Entrega el runbook y el script. Sin commit/push.
```

### Oleada 1 — HOY/mañana temprano: paquete de fixes (S1) → señal inmediata para la clase

**Prompt O1:**

```
Soy Maiki. Paquete de FIXES de la revisión del profe (8-9 jun) + testing del equipo. LOCAL, sin commit/push, sobre main actual. Sin DDL. No tocar G1-G8 ni permisos.js ni server.js.
1) ALTA: la fecha de inicio del contrato debe ACEPTAR fechas pasadas (quitar restricción >= hoy SOLO del inicio; mantener inicio < fin y el resto).
2) GARANTÍAS: (a) rechazar vigencia vencida (vigencia >= hoy) con mensaje claro; (b) modal de confirmación si el monto excede el % esperado (anticipo: % de anticipo del contrato; cumplimiento: 10% del monto) — avisa y deja continuar si confirman.
3) ROSTER (HU-02) y EXPEDIENTE (HU-04): separar columna "Evento" (Alta del contrato | Sustitución) de "Motivo" (vacío para el alta). Derivado en frontend, sin DDL.
4) NOTA DE SUSTITUCIÓN (roster.controller): título específico "Sustitución de {rol}: {anterior} → {nueva}"; cuerpo narrativo "Se sustituye a {anterior} como {rol}. Motivo del cambio: {motivo}. Entra {nueva} a partir de {fecha}."; fechas en español (es-MX), nada de "Sat Jun".
5) EXPEDIENTE: el encabezado del contrato debe mostrar al superintendente VIGENTE del roster (no el original). Añadir columna "Clave" al catálogo de conceptos del expediente.
6) HU-05 CURVA: las 3 series inician en (fecha_inicio, 0%); cada periodo grafica a su CIERRE; añadir tooltips con valor (%) al pasar el mouse.
7) HU-12 CARÁTULA: mostrar "Estimación No. {n} — Periodo {p}" prominente.
Tests: actualizar/añadir specs de lo tocado (lección 7). Suite completa verde. Doc + runbook. NO push.
```

**Y de Claude chat (yo):** corrijo la guía de pruebas (paso 16 con variación ≤25% + nota explicativa del guardrail) en cuanto confirmes.

### Oleada UI-A — el cambio de cara (tras O1, antes/junto a O2)

**Prompt UI-A:**

```
Soy Maiki. REDISEÑO UI/UX "SIGECOP institucional" — Fase A: design system + shell + páginas estables. LOCAL, sin commit/push, sobre main actual. NO tocar lógica de negocio, endpoints, validaciones, permisos.js ni G1-G8: esto es presentación + UX aditiva.

DESIGN SYSTEM (tokens en tailwind.config + index.css):
- guinda primario #691C32 · guinda oscuro (sidebar) #4E1525 · dorado acento #BC955C
- fondo de página #F4F2EE · superficie #FFFFFF · borde #DDD8CF
- texto #3B3732 (principal) / #857F76 (secundario)
- semánticos: éxito #0F6E56 (fondo #E1F5EE) · advertencia #854F0B (#FAEEDA) · peligro #A32D2D (#FCEBEB) · info institucional #691C32 (#F7ECEF)
- estética FLAT institucional: sin gradientes ni sombras decorativas; radio 8px; títulos peso 500; item activo del sidebar con borde izquierdo dorado.

1) COMPONENTES (frontend/src/components/ui/): AppShell (sidebar #4E1525 con grupos e iconos; topbar #691C32 con "SIGECOP · Gestión de contratos de obra pública", SELECTOR GLOBAL DE CONTRATO, chip de rol y usuario), PageHeader (breadcrumb + título + chips; envuelve HeaderVista/AvisoSoloLectura existentes — el banner solo-consulta SE CONSERVA), Card, KpiCard, Badge de estado, Tabla (encabezado gris claro, montos a la derecha, folio en peso 500), EmptyState (icono + mensaje + botón CTA), Toast.
2) SELECTOR GLOBAL DE CONTRATO (aditivo): ContratoContexto nuevo (React context + localStorage) con los contratos visibles del usuario (endpoint existente de "mis contratos"/listado). Vive en la topbar. Las páginas que hoy tienen selector local LO CONSERVAN pero inicializan su valor desde el contexto (preselección) y al cambiar localmente actualizan el contexto. Cero rutas nuevas, cero API nueva.
3) MIGRAR a este diseño SOLO las páginas sin rediseño funcional pendiente: Login, Registrados/Detalle de contrato, Consulta de expediente, Bitácora (apertura/emisión/consulta), Historial de estimaciones, Tablero de estimaciones, Curva de avance, Convenios modificatorios. NO migrar todavía: Alta de contrato (O2 le añade plan de amortización), Registro de avance (O4), Alertas (O5), Estimación/Envío (O7) — esas se visten en su propia oleada.
4) ESTADOS VACÍOS guiados con CTA: sin bitácora → "Abrir bitácora"; sin estimaciones → "Presentar estimación"; sin contratos → "Registrar contrato". El CTA solo aparece si el rol tiene permiso de ejecutar esa acción.
5) NO ROMPER LA SUITE: conservar TODOS los data-testid existentes; si cambia la navegación del sidebar, actualizar los helpers de navegación de los specs (lección 7). Contraste AA del guinda sobre blanco; foco visible en inputs y botones.
Tests: suite completa verde + spec ligero del selector global (preselección persiste entre páginas). Doc + runbook. NO push.
```

> **Regla global desde que UI-A se integra:** toda oleada posterior (O2–O10) construye/rediseña sus pantallas **ya con el design system** (tokens guinda + componentes de `components/ui/`). Añadir esta línea al final de cada prompt: *“Usa el design system SIGECOP (tokens guinda + componentes compartidos de components/ui) en todo lo que toques; conserva los data-testid.”*

### Oleada 2 — Plan de amortización Fase A (S2)

**Prompt O2:**

```
Soy Maiki. PLAN DE AMORTIZACIÓN (criterio faltante de HU-01, pedido del profe). LOCAL, sin commit/push.
Ley: el anticipo se amortiza con cargo a las estimaciones (art. 138 RLOPSRM, que indica "proporcionalmente" — el profe pidió plan editable; la carátula NO cambia en esta fase).
1) DDL ADITIVO: tabla plan_amortizacion(contrato_id, periodo_numero, monto NUMERIC) — idempotente.
2) ALTA: si el contrato tiene anticipo > 0, paso nuevo "Plan de amortización" (matriz por periodo, patrón del programa): default precargado PROPORCIONAL entre periodos, editable libre por periodo; validación: la suma = monto del anticipo (al centavo). Si anticipo = 0, el paso se omite.
3) EXPEDIENTE (HU-04): sección "Plan de amortización" en lectura.
4) NO tocar el cálculo de la carátula (G2 sigue proporcional). Deja un comentario [Fase B pendiente de validar con el profe].
Zona congelada intacta salvo el paso nuevo del alta (gating del alta se EXTIENDE, no se relaja). Tests + suite verde. Doc + runbook. NO push.
```

### Oleada 3 — Catálogo de empresas (S3)

**Prompt O3:**

```
Soy Maiki. CATÁLOGO DE EMPRESAS (pedido fuerte del profe). LOCAL, sin commit/push.
1) DDL ADITIVO: empresas(id, nombre UNIQUE, creado_en) + usuarios.empresa_id INTEGER NULL REFERENCES empresas(id). Normaliza nombre (trim, colapsa espacios) para evitar duplicados tipo "patito"/"PAT ".
2) SEED/BACKFILL: 3 empresas demo (Dependencia Demo, Constructora Demo, Supervisión Externa Demo) y asigna las cuentas demo.
3) REGISTRO de usuario: campo Empresa con autocomplete del catálogo; si no existe, confirmar "¿Registrar '{nombre}' como nueva empresa?" → alta automática y vínculo (el principio del profe: el primero la registra, el siguiente la elige).
4) ALTA de contrato: AVISO (no bloqueo) si superintendente y supervisión pertenecen a la misma empresa ("la supervisión es un tercero") [validar].
5) Mostrar empresa junto a las personas en expediente y roster; búsqueda por empresa/contratista en el expediente.
6) NO tocar permisos.js ni auth core (empresa_id viaja en los SELECT, no en el JWT).
Tests reales (registro con empresa nueva y existente; aviso de misma empresa; búsqueda) + suite verde. Doc + runbook. NO push.
```

*(P4 — jurídicos simplificados — puede ir aquí o como mini-pase: quitar cédula, campos = apoderado legal dependencia / representante legal contratista / abogados; cuando exista P1, sugerir desde las entidades.)*

### Oleada 4 — Avance por periodo + nota (S4)

**Prompt O4:**

```
Soy Maiki. HU-06 v2: registro de avance POR PERIODO + NOTA + validación contra el programa vigente (pedido del profe). LOCAL, sin commit/push.
1) DDL ADITIVO: periodo_numero INTEGER y nota_id INTEGER NULL en la tabla de avances.
2) UI: selector de PERIODO (del programa vigente del contrato) en lugar de fecha libre; al elegir concepto, mostrar SU renglón del programa (programado por periodo, acumulado, ejecutado acumulado); toggle "Ejecuté todo lo programado del periodo" que autollenará la cantidad.
3) VALIDACIÓN SERVIDOR (además del candado art. 118 total, que NO se toca): ejecutado_acumulado + nuevo <= programado_acumulado al periodo seleccionado, calculado sobre el PROGRAMA VIGENTE (así un convenio modificatorio que adelantó volumen lo permite). Mensajes: "concepto no programado en este periodo" / "excede lo programado del periodo — requiere convenio modificatorio (art. 59 LOPSRM)". Bloquea (consistente con G5) [validar con profe si prefiere aviso].
4) NOTA AUTOMÁTICA (patrón Pase 2.3: folio atómico, diferido si no hay bitácora abierta, sin doble asiento): "Avance de trabajos — {concepto}: se ejecutaron {cantidad} {unidad} en el periodo {p}, conforme al programa de obra." Liga nota_id al registro. Emisor = quien registra (contratista) [validar].
5) Fase B (NO ahora, solo deja el diseño en el doc): evidencias adjuntas al registro (fotos/planos).
Tests: registro dentro del periodo OK + nota creada; excede periodo → bloquea; concepto no programado → bloquea; con convenio que amplía → pasa; diferido sin bitácora. Suite verde. Doc + runbook. NO push.
```

### Oleada 5 — Alertas v2 (S7)

**Prompt O5:**

```
Soy Maiki. HU-07 v2: alertas SIN umbral, TODOS los conceptos, déficit en UNIDADES (rediseño del profe). LOCAL, sin commit/push.
1) El panel de alertas pasa a ser AUTOMÁTICO: para el contrato seleccionado, tabla de todos los conceptos con déficit = programado_acumulado(al periodo actual, programa VIGENTE) − ejecutado_acumulado, SOLO filas con déficit > 0, expresado en unidades del concepto (sin % ni umbral). Se recalcula al consultar.
2) Quitar/ocultar la configuración de alertas por concepto y el umbral (no borrar tablas; dejar de usarlas).
3) AVISO al iniciar sesión: badge/banner "Tienes N conceptos con déficit en M contratos" (acotado por participación, roles residente/supervisión).
4) Botón "Asentar en bitácora" por fila: genera nota del atraso (patrón 2.3): "Atraso registrado — {concepto}: déficit de {cantidad} {unidad} respecto del programa al periodo {p}."
5) Renombrar labels para separar "Atraso por concepto" (este panel) del "Avance de obra" (curva/estimación) — no mezclar conceptos.
6) El indicador "N en atraso" del detalle del contrato (Pase 4) se recablea a este cálculo.
Tests + suite verde. Doc + runbook. NO push.
```

### Oleada 6 — Convenios visibles (S9)

**Prompt O6:**

```
Soy Maiki. Convenios visibles en bitácora y expediente (hallazgo del equipo, consistente con el patrón del sistema). LOCAL, sin commit/push.
1) Al registrar un convenio (cualquier tipo): NOTA AUTOMÁTICA de bitácora (patrón 2.3, con diferido): "Convenio modificatorio {folio}: {tipo}; variación {x}% sobre {monto|plazo}. Motivo: {motivo}." Liga nota_id al convenio (columna aditiva).
2) EXPEDIENTE (HU-04): sección "Convenios modificatorios" (historial inmutable + link a versiones del programa).
Tests + suite verde. Doc + runbook. NO push.
```

### Oleada 7 — Flujo legal de la estimación (S5) — **presentar diseño al profe mañana; construir tras OK (o citando art. 54 si no aparece)**

**Prompt O7:**

```
Soy Maiki. FLUJO LEGAL de la estimación (art. 54 LOPSRM: el CONTRATISTA presenta; la RESIDENCIA revisa y autoriza). Cambio de actores SIN migrar datos (estados internos se conservan; cambian etiquetas, permisos y candados). LOCAL, sin commit/push.
1) permisos.js (zona congelada — lo toco yo, fundación): HU-12 → contratista 'E', residente 'C'; HU-13 → residente 'E', contratista 'C'. Resto igual.
2) HU-12 "Formular y presentar estimación": la captura de volúmenes la hace el CONTRATISTA (superintendente del contrato, candado de participación espejo); G1-G8 NO cambian (el servidor calcula igual); el estado interno 'integrada' se etiqueta "Presentada".
3) HU-13 "Revisar y autorizar": la ejecuta el RESIDENTE del contrato; el estado interno 'enviada' se etiqueta "Autorizada"; reusar columnas enviada_en/enviada_por como sello de autorización (renombrar solo etiquetas de UI, no columnas).
4) HU-21 Pago: paga lo "Autorizado" (solo etiquetas).
5) HU-14/HU-17: actualizar etiquetas de estados en historial y tablero.
6) Actualizar TODAS las specs afectadas (lección 7) y la doc.
Tests del flujo completo con los roles nuevos + suite verde. Doc + runbook con tabla "antes → después". NO push.
```

### Oleada 8 — Notas↔estimación + formato de nota (S6)

**Prompt O8:**

```
Soy Maiki. (a) VINCULAR NOTAS a la estimación y (b) FORMATO de documento de la nota (pedidos del profe). LOCAL, sin commit/push.
a) DDL ADITIVO: estimacion_notas(estimacion_id, nota_id, UNIQUE). Al PRESENTAR la estimación (flujo nuevo), selector múltiple de notas FIRMADAS del contrato ("notas que soportan esta estimación"); la vista de la estimación lista sus notas con link. Solo referencia lógica: las notas no cambian.
b) Vista "documento" de la nota: plantilla imprimible (encabezado con contrato/folio/fecha y hora; cuerpo; firmantes con rol y hora de firma) + botón "Ver como documento / Imprimir" (print CSS). 
Tests + suite verde. Doc + runbook. NO push.
```

### Oleada 9 — Expediente PDF único (S8)

**Prompt O9:**

```
Soy Maiki. EXPEDIENTE: reemplazar los descargables "prototipo" por UN solo PDF real (propuesta del equipo aceptada). LOCAL, sin commit/push.
1) Vista de impresión consolidada del expediente (print CSS) con TODOS los bloques: datos generales (con superintendente vigente), catálogo con claves, programa vigente (+ referencia a versiones), plan de amortización, garantías, jurídicos, roster y sustituciones, convenios, resumen de estimaciones (números y estados).
2) Botón único "Exportar expediente (PDF)" → window.print de esa vista. Eliminar los botones prototipo.
Tests + suite verde. Doc + runbook. NO push.
```

### Oleada 10 — Plan de amortización Fase B (solo tras `[validar]` del profe)

La carátula toma la amortización del plan (`plan[periodo]`) en lugar del proporcional. Toca G2: se hace solo con el OK explícito (el art. 138 dice “proporcionalmente”; que el profe decida la regla del sistema).

### Oleada UI-B — barrido final de consistencia (antes del smoke E2E)

**Prompt UI-B:**

```
Soy Maiki. REDISEÑO UI/UX — Fase B: barrido final de consistencia. LOCAL, sin commit/push.
1) Auditar que TODAS las páginas (incluidas las rediseñadas en O2–O9) usan los tokens y componentes del design system (components/ui); migrar las que hayan quedado fuera.
2) Micro-UX: toasts de éxito/error con el componente único; validación inline junto al campo en todos los formularios; skeletons de carga simples en tablas y cards; helper único de formato es-MX para moneda ($1,000,000.00) y fechas (sin "Sat Jun") aplicado en toda la app.
3) Revisión de contraste y foco visible en toda la app; estados vacíos consistentes; títulos y breadcrumbs uniformes.
4) data-testid intactos; suite completa verde. Entrega un checklist página por página en el doc. NO push.
```

### En PARALELO desde hoy — los equipos (es lo más grande que falta)

- **E3 → HU-15–20 (URGENTE):** mandarles la spec S10 (generadores → concentrado → carátula; carpeta de soportes; lo llena el contratista). El profe ya los regañó por esto (“por eso les pedí que revisaran las estimaciones”).
- **E2 →** apertura narrativa (P7) + vincular lineal + tipos por rol + HU-11; y de proceso: **escribir la HU de sustitución** y **corregir la redacción de HU-07** en `Historias_Usuario.xlsx`.

-----

## 11. Para el profe (lista `[validar]` actualizada)

**Resueltos por esta revisión (ya decididos por él):** datos jurídicos simplificados sin cédula ✓ · apertura narrativa ✓ (cómo) · programa mes-por-mes ✓ · fecha/hora en notas ✓ · sustitución con nota automática ✓ (concepto) · plan de amortización: existe y es editable ✓.

**Nuevos / siguen abiertos:**

1. **Amortización en la carátula:** ¿obedece al plan capturado o se mantiene proporcional (art. 138 RLOPSRM dice “proporcionalmente”)? — define la Fase B.
1. **Convenios 25%:** ¿tope duro (hoy bloquea) o disparador de revisión? (El bloqueo del equipo en pruebas fue este guardrail.)
1. **Avance que excede el periodo:** ¿bloquear (como hoy se propone) o avisar y permitir?
1. **Emisor de las notas automáticas** (sustitución/avance/convenio/atraso): ¿quien ejecuta o forzar residente (art. 125 fr. I g)?
1. **Folio diferido** cuando no hay bitácora abierta: ¿satisface art. 123 fr. V/VI?
1. **Alertas:** ¿“marcar visto”/silenciar es aceptable o el déficit siempre visible?
1. **Misma empresa contratista–supervisión:** ¿aviso o bloqueo?
1. **Flujo legal de la estimación (S5):** confirmar el mapeo contratista-presenta / residente-autoriza antes de construir (o se construye por art. 54).
1. (Anteriores que siguen: IVA, regla 100% exacta, dependencia-no-firma, anular nota ya-conforme, Obra+tablero por definir, login-contrato UX.)

-----

## 12. Riesgos y calendario

|Riesgo                                                       |Mitigación                                                                                                            |
|-------------------------------------------------------------|----------------------------------------------------------------------------------------------------------------------|
|**BD Render expira 25 jun; entrega ~28**                     |Oleada 0 HOY: backup + plan de restore o upgrade. Ensayar el restore, no improvisarlo el 24.                          |
|Volumen de oleadas vs días restantes                         |O1 da señal inmediata; O2–O6 son acotadas; O7 espera 30 min del profe; lo demás se prioriza con él.                   |
|**E3 (generadores) es el faltante más visible para el profe**|Spec S10 enviada hoy + seguimiento diario; es SU entregable, no absorberlo salvo emergencia.                          |
|Cambio de flujo (S5) en el módulo más blindado               |Diseño sin migración de datos; etiquetas+permisos+candados; validar con el profe mañana.                              |
|Defaults sin validar                                         |Todo marcado `[validar]`; reversible (guardrail por env, plan con default proporcional, bloqueos consistentes con G5).|

**Calendario sugerido:** HOY: O0 + lanzar O1 + mensajes a E2/E3. **MIÉ 10 (clase):** mostrar O1, validar S5 y los `[validar]` Top-3 (amortización en carátula, 25%, exceso de periodo). **11–12:** **Oleada UI-A** (el cambio de cara completo) + O2. **13–15:** O3, O4. **16–18:** O5, O6, O7. **19–22:** O8, O9, **Oleada UI-B** + integrar PRs de E2/E3 conforme lleguen. **23–24:** migración/upgrade de BD + smoke E2E completo con la guía. **25–28:** colchón y entrega.

-----

*Notas de verificación legal: las citas de los arts. 54 LOPSRM (presentación/autorización de estimaciones), 132 RLOPSRM (documentos/generadores de la estimación) y 143 RLOPSRM (amortización proporcional) son de alta confianza pero deben verificarse contra el texto literal de los PDF antes de citarlas al profe — pásalos a Code o súbelos aquí y las confirmo palabra por palabra.*
