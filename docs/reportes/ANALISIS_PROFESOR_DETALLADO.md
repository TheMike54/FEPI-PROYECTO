# Análisis detallado del profesor "po" — Proyecto SIGECOP

> **Documento de respaldo.** Sintetiza el análisis de 4 audios del profesor (3h 15min totales) revisados durante el desarrollo del proyecto. El usuario ya no cuenta con los audios anteriores en archivo; este documento preserva el análisis para futuros entregables.
>
> **Audios analizados:**
> - 28 abril 2026 (10:19 PM) — Revisión inicial de matriz, 56 servicios
> - 12 mayo 2026 (12:23 AM) — Revisión de servicios, 42 servicios
> - 12 mayo 2026 (5:53 PM) — Servicios + HU + criterios + factibilidad
> - 18 mayo 2026 (7:54 PM) — **Audio más reciente, único disponible para el usuario**

---

## Índice

1. [Filosofía subyacente: los 4 principios](#1-filosofía-subyacente)
2. [Lo que PREMIA — con citas textuales](#2-lo-que-premia)
3. [Lo que CASTIGA — con citas textuales](#3-lo-que-castiga)
4. [Estilo de feedback](#4-estilo-de-feedback)
5. [Cronología por audio](#5-cronología-por-audio)
6. [Predicciones para próximas revisiones](#6-predicciones)
7. [Checklist práctico antes de entregar](#7-checklist)

---

## 1. Filosofía subyacente

Después de procesar los 4 audios, está claro que el profesor enseña una sola cosa de fondo: **gestión profesional de proyectos de software**. Cada corrección puntual viene de un principio más grande. Identifiqué 4 principios:

### Principio 1 — "Lo que escribes es contrato"

Las palabras técnicas tienen consecuencias. No prometas más de lo que vas a entregar.

> *"Tú lo escribiste. Yo no lo escribí. Estos son tus pensamientos. Tú me pusiste aquí que va a haber tal cosa, y cuando reviso no hay tal cosa."*
> — Audio 28 abril

> *"Pones 'pruebas funcionales' y ya te comprometiste a más cosas."*
> — Audio 18 mayo

> *"Por usar la palabra ya te comprometiste a más cosas."*
> — Audio 18 mayo

### Principio 2 — "Si no acuerdas, puedo pedirte lo que quiera"

Los acuerdos previos son la única defensa contra el scope creep.

> *"Tú vas a arriesgarte en la vida real. Si te arriesgas, te cuesta dinero. ¿Si alguien te dice no quiero que toda la plantilla sea responsiva y quiero que cambie de color de acuerdo a los sentimientos que yo tenga? Y tú no escribiste que eso no era parte de tu propuesta. ¿Te vas a arriesgar a eso?"*
> — Audio 28 abril

> *"Yo puedo abusar en ese sentido, cuando no hay nada puedo pedirte lo que se me pegue la gana."*
> — Audio 12 mayo PM

> *"Esa es la bronca de los proyectos, no establecer acuerdos. Por eso crecen tan grandes que el alcance se va y nunca acabas."*
> — Audio 28 abril

### Principio 3 — "Iteración con validación frecuente"

Prefiere entregas pequeñas semanales sobre entrega final grande.

> *"Vas sacando cinco historias. Las acordamos. Las repartes. El siguiente lunes llegas a otros cinco y a la par el martes revisamos las que ya habíamos quedado."*
> — Audio 28 abril

> *"El problema fue que no me entregaron nada y me quisieron entregar todo el último día. Entonces qué reviso. Lo que está escrito."*
> — Audio 28 abril

> *"Tratar de acomodar los más importantes, los más trascendentes en las primeras iteraciones."*
> — Audio 18 mayo

### Principio 4 — "Decisiones basadas en evidencia, no en gusto"

La forma de presentar la decisión importa más que la decisión misma. Esta es la **frase clave del profesor**:

> *"Muchas veces el punto es lo que sé usar y lo pones como curva de aprendizaje. La curva de aprendizaje de PHP es de dos semanas, la de esto es de un mes, ¿cuál voy a elegir? La de dos semanas porque necesito entregar."*
> — Audio 12 mayo PM

Esta cita es ORO. El profesor LITERALMENTE enseña cómo convertir tu sesgo personal en criterio técnico válido. "Sabemos usar React" no es válido. "Curva de aprendizaje de React: 5–7 días vs Angular: 14+ días" sí lo es.

Su versión negativa:

> *"No es válido que me digas porque es lo que sé usar. En teoría tuviste que haber revisado en el mercado."*
> — Audio 12 mayo PM

---

## 2. Lo que PREMIA — con citas textuales

### 2.1 Especificidad sobre genericidad

Le molesta el "rectángulo genérico que dice CAPA DE LÓGICA". Quiere ver QUÉ contiene cada bloque.

> *"Módulo uno tiene el contexto que, lo ideal sería que hubieras separado y puesto módulo uno la descripción y abajo todos sus servicios."*
> — Audio 28 abril

> *"Es demasiado abstracto y genérico... Tengo una arquitectura basada en tres capas. Sí, está bien, pero ya necesito que visualicemos a nivel de bloque. Yo no, está a nivel de bloques que tú me digas cómo estás organizando."*
> — Audio 18 mayo

### 2.2 Métricas cuantitativas

> *"Es que esto es demasiado subjetivo. Todo eso es de comercial, no hay nada realmente porque miren aquí... entraron al brochure y copiaron el brochure y lo pusieron."*
> — Audio 18 mayo

> *"¿Cuántos procesadores, GB de RAM, espacio en disco?... ¿Cuántos registros maneja? ¿Cuántos usuarios concurrentes?"*
> — Audio 18 mayo

### 2.3 Verbos de acción sobre narrativas

> *"Yo no quiero que me narres procesos, quiero que me digas qué haces. Quita lo primero porque realmente es choro y vas a decir ¿qué hace?"*
> — Audio 12 mayo PM

Esto explica por qué las descripciones de servicios deben empezar con verbos: "Permite registrar...", "Muestra...", "Genera..."

### 2.4 Coherencia interna entre documentos

Le importa que necesidades, servicios e historias se rastreen unas a otras.

> *"Si tú lees la sub 11, no hay nada en tu propuesta que la solucione."*
> — Audio 12 mayo PM

> *"Si yo no tengo una historia, un servicio sin historias quiere decir que no implementaste servicio."*
> — Audio 12 mayo PM

### 2.5 Realismo sobre optimismo

> *"Si tú dices que vas a hacer 20 puntos a la semana no lo vas a lograr porque no tienen experiencia."*
> — Audio 12 mayo PM

> *"Son 3 días útiles por sprint... Tendrás que generar al menos 3 puntos por día × 3 personas = 9 puntos por sprint."*
> — Audio 18 mayo

### 2.6 Fundamento legal específico

No basta con citar el número del artículo: hay que leer el contenido.

> *"¿Cuál es el fundamento? El artículo. Y léeme el artículo."*
> — Audio 12 mayo PM

### 2.7 Atributos del PROYECTO, no del producto

La evaluación tecnológica debe medirse contra lo que necesita el proyecto, no contra el brochure del producto.

> *"Ah, porque maneja 80 mil usuarios... ¿Quién te pidió 80 mil usuarios? ¿Cuántos usuarios va a tener esto? Seis."*
> — Audio 12 mayo PM

> *"Atributos comerciales. Ah, es que este es libre y este es de paga. Eso no."*
> — Audio 12 mayo PM

### 2.8 Honestidad técnica disfrazada de criterio

(La frase clave, repetida aquí porque es la más importante)

> *"Muchas veces el punto es lo que sé usar y lo pones como curva de aprendizaje. La curva de aprendizaje de PHP es de dos semanas, la de esto es de un mes, ¿cuál voy a elegir? La de dos semanas porque necesito entregar."*
> — Audio 12 mayo PM

> *"Lo que está en el mercado es muy similar y lo que sabemos usar es esto, por eso nos inclinamos por esta solución."*
> — Audio 18 mayo (la frase que sugirió textualmente)

### 2.9 Consolidación de módulos pequeños

No le gustan los módulos con 1 servicio. Prefiere agrupar.

> *"¿Tiene sentido tener un módulo con un servicio? ¿No podrías ponerle el 503 al 601?... Yo metería todo lo que tiene que ver estimaciones, metería el 601 y el 801 y me quedaría nada más entonces con seis módulos."*
> — Audio 12 mayo PM

### 2.10 Máximo 2-3 criterios de aceptación por HU

> *"Yo pondría máximo dos o tres criterios."*
> — Audio 12 mayo PM

> *"Entonces, entre más criterios de aceptación tengas, realmente más complejo, porque tienes que diseñar todas las pruebas. Diseña las pruebas que sean las mínimas indispensables."*
> — Audio 12 mayo PM

### 2.11 Cada servicio debe tener al menos una HU

> *"Si yo no tengo una historia, un servicio sin historias quiere decir que no implementaste servicio. Hay una justificación, si no la hay, entonces no lo hiciste simplemente."*
> — Audio 12 mayo PM

### 2.12 Datos dummy para no bloquear desarrollo

> *"Generas datos, dum, un script, llenas la base con lo que necesitas y él ya puede probar."*
> — Audio 12 mayo PM

### 2.13 Maquetas simples al principio, en tecnología real al implementar

> *"Una maqueta muy simple, una vista la puedes generar rápido hasta en un PowerPoint, algo, lo que tú quieras."*
> — Audio 12 mayo PM (al inicio del proyecto)

> *"Lo ideal sería que lo trabajaran con la tecnología, que estuviera hueco, pero que estuviera sobre la tecnología."*
> — Audio 18 mayo (para el Sprint 1)

### 2.14 Aprendizaje progresivo del equipo

> *"Express deja al equipo elegir cada pieza. Se aprenden los conceptos desde abajo, no como cajas negras."*
> — Audio 18 mayo (cuando comentó la elección Node.js+Express)

---

## 3. Lo que CASTIGA — con citas textuales

### 3.1 Brochures comerciales como criterios

> *"Entraron al brochure y copiaron el brochure."*
> — Audio 18 mayo

> *"Atributos comerciales. Ah, es que este es libre y este es de paga. Eso no."*
> — Audio 12 mayo PM

### 3.2 Servicios con nombres que no coinciden con su narrativa

> *"Aquí pusiste 'Registro de anticipo, retenciones y deductivas' y tu narrativa no me dice eso."*
> — Audio 12 mayo PM

### 3.3 Validaciones prematuras (invadir responsabilidades de otros roles)

> *"El contratista puede hacer su estimación como se le pegue la gana. Si él pone 5, son 5 las que está poniendo."*
> — Audio 12 mayo PM

### 3.4 Argumentos técnicos incorrectos

> *"Tu argumento contra MySQL es incorrecto."*
> — Audio 18 mayo (refiriéndose a que MySQL maneja integridad igual que PostgreSQL)

Mejor decir poco y correcto, que mucho con errores.

### 3.5 Falta de revisión propia

> *"¿Quién revisó esto? No es culpa del tiempo. Es del capitán... Como yo les decía a mi equipo de trabajo cuando llegamos: si es un acierto, es mío. Si es un error, es de ustedes. Por ser el jefe."*
> — Audio 12 mayo AM

### 3.6 Servicios duplicados o mal segmentados

> *"¿Por qué rompieron el servicio en uno y dos? Es el mismo contrato."*
> — Audio 12 mayo AM

> *"Por eso están saliendo números muy grandes, porque en alta yo digo aquí carga esto, carga el otro, carga el otro. En todo caso si era otro servicio para las actualizaciones."*
> — Audio 12 mayo AM

### 3.7 Promesas no cumplidas en el alcance

> *"Si la HU dice filtros por concepto y periodo, debe tener ambos filtros."*
> — Audio 18 mayo

> *"Aquí dice que subí las pólizas... ¿dónde está el respaldo documental? Donde está la póliza propiamente, le das un clic y puedo ver el PDF... le pones un ojito para ver."*
> — Audio 18 mayo

### 3.8 Genericidad en diagramas

> *"Demasiado abstracto y genérico... como tener un mapa de México sin estados."*
> — Audio 18 mayo (paráfrasis del concepto)

### 3.9 Entregar todo al final sin acuerdos previos

> *"El problema fue que no me entregaron nada y me quisieron entregar todo el último día sin acuerdos de nada. Entonces qué reviso. Lo que está escrito."*
> — Audio 28 abril

### 3.10 Atributos no medibles

> *"Tamaño de comunidad activa. ¿Cómo lo mides? Eso no es métrica."*
> — Audio 18 mayo

---

## 4. Estilo de feedback

Patrones de cómo da retroalimentación:

1. **Pregunta antes de criticar.** Siempre pregunta "¿por qué?" o "¿qué quiere decir esto?" antes de decir que está mal. Te da chance de explicarte.

2. **Compara con la realidad profesional.** Usa escenarios del mundo real:
   > *"Si tu cliente te dice X, ¿qué haces?"*

3. **Da ejemplos concretos de cómo debería ser.** No solo critica, propone solución específica.

4. **Reconoce lo positivo cuando aplica.** "Está bien, pero...", "Esto sí tiene sentido, pero..."

5. **Compara con otros grupos.** "El otro equipo ya hizo X la semana pasada." No es para presionar negativamente, es referencia.

6. **Tiene paciencia con errores conceptuales.** Explica varias veces hasta que entienden.

7. **Es severo con descuidos obvios.** "¿Quién revisó esto?", "Por ser el jefe".

8. **Habla en plural cuando enseña** (incluyente), pero **en segunda persona cuando responsabiliza** (señalamiento directo).

9. **Cita la ley/normatividad cuando es relevante.** Si dices "art. X", debes haber leído el contenido.

10. **Usa humor en momentos de tensión.** Cuando hay errores tontos, suaviza con bromas: "A los buena onda se les comen el mundo".

---

## 5. Cronología por audio

### Audio 1 — 28 de abril (10:19 PM) — Revisión inicial

**Contexto:** El equipo había entregado una matriz con 56 servicios sin acordar alcance previo.

**Lo que pidió:**
- Reorganizar matriz: módulo arriba, descripción, servicios abajo
- Reformular servicios mal segmentados (ej. "Sección jurídica" tenía propósito poco claro)
- Diferenciar carga de "elementos jurídicos" vs cargar cláusulas literalmente
- Definir QUIÉN es el usuario de cada servicio (no genérico "stakeholder")

**Cita clave:**
> *"Ese es el meollo de los proyectos: no establecer acuerdos. Por eso crecen tan grandes que el alcance se va y nunca acabas."*

### Audio 2 — 12 de mayo (12:23 AM) — Deduplicación de servicios

**Contexto:** Servicios bajaron de 56 a 42, pero seguían siendo demasiados y fragmentados.

**Lo que pidió:**
- Fusionar servicios que pertenecen al mismo flujo (alta de contrato = un solo servicio, no 7)
- Eliminar servicios redundantes
- Consolidar módulos pequeños
- Target: ~24-25 servicios totales

**Cita clave:**
> *"¿Por qué rompieron el servicio en uno y dos? Es el mismo contrato. Es el alta nada más. Si bueno, yo es que por eso están saliendo números muy grandes."*

### Audio 3 — 12 de mayo (5:53 PM) — Servicios + HU + Factibilidad

**Contexto:** Sesión de 55 minutos donde introduce conceptos clave: historias de usuario, criterios de aceptación, estudio de factibilidad, user points.

**Lo que enseñó:**
- Formato HU (Como/Deseo/A fin de)
- Criterios de aceptación como pruebas funcionales mínimas (máx 2-3)
- Cada servicio debe tener al menos 1 HU
- Estudio de factibilidad técnico (no comercial)
- User points en Fibonacci
- Velocidad realista del equipo
- Datos dummy para no bloquear desarrollo
- Atributos del proyecto, no del producto

**Citas clave:**
> *"Como residente deseo dar de alta un contrato nuevo, capturando los datos generales, [...] a fin de tener el soporte documental en línea."*
>
> *"Los criterios de aceptación, ponlo como si fueran pruebas funcionales. Sabes que sí, si no llenaron todos los campos, no vas a guardar nada."*
>
> *"La curva de aprendizaje de PHP es de dos semanas, la de esto es de un mes, ¿cuál voy a elegir? La de dos semanas porque necesito entregar."*

### Audio 4 — 18 de mayo (7:54 PM) — Revisión post-entrega ⭐ (único que el usuario aún tiene)

**Contexto:** Sesión de 62 minutos. El equipo entregó el primer paquete completo (Estudio de Factibilidad, Historias, Maquetas, Matriz, Plan de Riesgos). El profesor lo revisó completo y dejó 20+ observaciones específicas.

**Lo que pidió (ya aplicado en las 3 olas de correcciones):**

1. **Diagrama de arquitectura específico** (no abstracto): bloques por rol, orquestador, API REST, servicios comunes vs especializados
2. **Criterios de aceptación como aseveraciones**, no preguntas
3. **HU-00 sin selector de rol** — solo usuario y contraseña
4. **CA agregado en HU-00** sobre campos vacíos
5. **HU-01 con garantías, penalizaciones (5 al millar), plan de amortización del anticipo**
6. **HU-02 con botón "ver PDF"** en cada póliza
7. **Criterios de evaluación cuantitativos** (no comerciales)
8. **Comparativas de Docker y GitHub** con alternativas
9. **Argumento contra MySQL corregido** (ambos manejan integridad)
10. **Plan de iteraciones realista** (9 pts/sprint, no 11)
11. **HU más complejas en sprints tempranos**
12. **Maquetas en React para Sprint 1** (no HTML estático)
13. **Sprint 1 con entorno completo montado**

**Citas clave (de este audio, que el usuario sí tiene):**
> *"Ni siquiera selecciona tu rol. No. Usuario, contraseña. Y tú ya checas el rol adentro."*
>
> *"Aquí dice que subí las pólizas... ¿dónde está el respaldo documental? Le pones un ojito para ver."*
>
> *"Sabes qué, lo que está en el mercado es muy similar y lo que sabemos usar es esto, por eso nos inclinamos por esta solución."*
>
> *"Tendrás que generar al menos entre 3 días, 3 puntos por persona × 3 personas = 9 puntos por sprint."*

---

## 6. Predicciones para próximas revisiones

Basado en sus patrones, en la próxima retroalimentación probablemente preguntará:

| Pregunta esperada | Origen del patrón |
|---|---|
| *"¿Y la maqueta React funciona?"* | Audio 18 mayo: pidió maquetas en tecnología real para Sprint 1 |
| *"¿Cuánto se tardaron en hacer la HU-X?"* | Para validar velocidad estimada vs real |
| *"¿Ya están los servidores montados?"* | Sprint 1 con entorno listo |
| *"Léeme el flujo completo de la HU-Y"* | Verificar coherencia interna documento-maqueta |
| *"¿Cuál es el fundamento del art. X?"* | Leer el artículo, no solo citarlo |
| *"¿Quién hizo qué?"* | Asignaciones explícitas por integrante |
| *"¿Cómo van con la entrega?"* | Le importa la cronología real, no la planeada |

Es probable también que pida:
- Datos dummy ya cargados en la base de datos
- Por lo menos 1 HU funcionando end-to-end (vista → backend → BD)
- Pruebas funcionales reales (no solo los criterios escritos)

---

## 7. Checklist práctico antes de entregar

Antes de mandar cualquier entregable al profesor, verificar:

### Vocabulario
- [ ] ¿Uso "API REST" en lugar de "HTTP" para protocolos de aplicación?
- [ ] ¿Uso "criterios de aceptación" en lugar de "pruebas funcionales"?
- [ ] ¿Mis aseveraciones son afirmaciones, no preguntas?
- [ ] ¿Las descripciones de servicios empiezan con verbos de acción (Permite, Muestra, Genera, Registra)?
- [ ] ¿Cada término técnico es el correcto, no uno aproximado?

### Métricas
- [ ] ¿Cada comparativa tiene números (días, GB, USD, registros, peticiones/seg)?
- [ ] ¿Eliminé las escalas "alto / medio / bajo"?
- [ ] ¿Mis estimaciones de tiempo son realistas (3 días útiles por sprint, 9 pts máx)?
- [ ] ¿Cité el artículo legal por número Y leí su contenido?

### Alternativas
- [ ] ¿Cada decisión tecnológica enumera al menos 2 alternativas descartadas?
- [ ] ¿Justifico por qué cada alternativa no aplica?
- [ ] ¿Reconozco honestamente cuando elijo por curva conocida vs por superioridad técnica?

### Especificidad
- [ ] ¿Mis diagramas tienen bloques específicos, no rectángulos genéricos?
- [ ] ¿Mis maquetas muestran TODO lo prometido en la HU correspondiente?
- [ ] ¿Mis tablas tienen contenido cuantificable en cada celda?

### Coherencia interna
- [ ] ¿Cada necesidad está cubierta por algún servicio?
- [ ] ¿Cada servicio tiene al menos una HU?
- [ ] ¿Lo que dice la HU está reflejado en la maqueta?
- [ ] ¿Las palabras del servicio coinciden con su narrativa?

### Alcance
- [ ] ¿Tengo máximo 3 CA por HU?
- [ ] ¿Estoy prometiendo solo lo que voy a entregar?
- [ ] ¿Mis módulos tienen al menos 2-3 servicios cada uno (no módulos de 1 servicio)?

### Honestidad
- [ ] ¿Reconocí explícitamente cuando elegí por curva de aprendizaje?
- [ ] ¿Estoy ocultando alguna limitación que se va a ver después?
- [ ] ¿Hay argumentos técnicos que un experto pueda refutar?

### Iteración
- [ ] ¿Mi plan tiene entregas semanales acotadas?
- [ ] ¿Las HU más complejas están en sprints tempranos?
- [ ] ¿El Sprint 1 ya tiene el entorno completo montado?

---

## Resumen ultracorto

**El profesor te enseña a ser un Project Manager profesional.** Cada corrección puntual viene de un principio: acota alcance, escribe acuerdos, itera con validación, decide con evidencia. Si cumples los 4, las correcciones puntuales casi desaparecen solas.

**Su frase clave (de mayo 12 PM):**
> *"Muchas veces el punto es lo que sé usar y lo pones como curva de aprendizaje."*

Esta es la traducción exacta de cómo presentar tus sesgos como criterios técnicos válidos. Memorízala.

**Lo que más castiga:** brochures, generic-speak, promesas que no cumples, falta de revisión propia.

**Lo que más premia:** métricas, alternativas evaluadas, honestidad técnica, coherencia entre documentos, entregas iterativas.
