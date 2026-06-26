# Análisis y seguimiento de riesgos — SIGECOP

**Proyecto:** SIGECOP — Sistema de Gestión Técnico-Administrativa de Contratos de Obra Pública (LOPSRM / RLOPSRM / LFD)
**Periodo cubierto:** 12 de mayo – 26 de junio de 2026 (7 semanas)
**Tipo de documento:** análisis de riesgos con seguimiento semanal y evidencia de planes ejecutados

> **Cómo leer este documento.** Identificamos los riesgos del proyecto, los seguimos **semana a semana** (cómo cambió
> su probabilidad e impacto) y, para cada semana, **enganchamos el plan o la solución real que ejecutamos** y que movió
> ese riesgo. De esa forma el seguimiento no es teórico: cada cambio de probabilidad/impacto está respaldado por un
> documento de trabajo con su fecha. Los planes citados viven en `docs/entrega_profe/planes_y_soluciones/`.
>
> **Escala.** Probabilidad (P) e Impacto (I) en 1–5 (1 = muy bajo, 5 = muy alto). **Exposición = P × I** (1–25).
> Tendencia: ↓ mejora · → estable · ↑ empeora. La ponderación numérica semanal es nuestra **reconstrucción** a partir
> de cuándo cada riesgo estuvo activo y cuándo lo mitigamos; los valores exactos quedan **[confirmar Maiki]**.

---

## 1. Calendario de semanas

| Semana | Fechas | Hito principal |
|---|---|---|
| W1 | 12–18 may | Arranque: estudio de factibilidad, arquitectura por bloques, primeras historias. |
| W2 | 19–25 may | Maquetas en React (vistas por historia) con datos dummy; planeación de sprints. |
| W3 | 26 may – 01 jun | Prototipo funcional; **1ª revisión grande del profe (01-jun)**: cuadre exacto, programa matricial, anticipo. |
| W4 | 02–08 jun | Fundación real: cuadre al centavo, programa concepto×periodo, convenios, sustitución de personas. |
| W5 | 09–15 jun | **2ª revisión (09-jun)**: empresas, amortización, flujo de estimación; oleadas de corrección; orden documental. |
| W6 | 16–22 jun | **Revisión 16-jun**: finiquito obligatorio; rediseño por ciclos; pre-entrega y diagnósticos. |
| W7 | 23–26 jun | Siete brechas, pruebas positivas/negativas, carátula GACM, rediseño del flujo de pago, datos de tiempo recorrido. |

> Nota honesta: la evidencia documental formal de planes/soluciones arranca en **W3 (01-jun)**; W1–W2 corresponden a la
> etapa de factibilidad y maquetas (se documentan en el historial del proyecto, no como planes-solución). El
> seguimiento de riesgos con evidencia fuerte cubre **W3 → W7 (5 semanas)**, por encima del mínimo de 4 solicitado.

---

## 2. Registro de revisiones con el profe (actas mínimas)

Cada revisión es el origen de los ajustes de la semana siguiente. Fechas tomadas de las sesiones de revisión.

| Fecha | Tipo | Acuerdos / observaciones principales |
|---|---|---|
| 12-may | Revisión | Deduplicar servicios; una historia por servicio; máx. 2–3 criterios de aceptación; factibilidad por atributos del proyecto, no comerciales; estimación por puntos (Fibonacci). |
| 18-may | Revisión | Arquitectura por bloques; criterios como aseveraciones; inicio de sesión sin selector de rol; maquetas sobre la tecnología real; HU complejas en sprints tempranos. |
| 01-jun | Revisión (mayor) | Tres reversiones: **cuadre exacto al centavo** (sin tolerancia), **anticipo** como regla (con autorización si supera el límite), **programa = conceptos del catálogo en calendario**; sustitución de personas; apertura = nota #1. |
| 09-jun | Revisión | Catálogo de empresas (lo más insistido); amortización proporcional; alertas de atraso sin umbral manual; flujo de estimación en el orden legal (contratista presenta → residencia autoriza → pago). |
| 10-jun | Clase | Resolución de dudas: emisor de notas = residente; avance que excede el periodo = aviso (no bloqueo); tipo de nota "atraso". |
| 15-jun | Hoja de validación | Pago solo sobre estimación autorizada; amortización = art. 143 fr. I (no 138); carátula **sin IVA**; generadores y soportes (art. 132). |
| 16-jun | Revisión | **Finiquito obligatorio** ("sin finiquito no se cierra"); estimación por bloques; oficio del convenio en el expediente; presentar estimación por estado. |
| 21–22 jun | Revisión + lectura de historias | Operar siempre dentro de bitácora abierta (art. 122); contrato cerrado en solo lectura (art. 64); limpiar tecnicismos de las historias. |
| 24-jun | Pre-entrega | Curva versionada por convenio; checklist del art. 132; etiqueta "Adicional" (art. 101); ampliación de concepto con precio unitario heredado. |
| 25-jun | Pre-entrega | Carátula completa (importe del anticipo, acumulados, saldo, firmas); alta con empresa→persona real; sustitución a los tres roles con regla temporal de firmas; sesión única. |

> **[confirmar Maiki]:** no hay acta de reunión con el profe el ~25/26-may ni el 04-jun; en esas fechas hubo trabajo
> interno (correcciones de citas legales y fundación), no revisión. Si hubo junta, agregar su fecha.

---

## 3. Matriz de riesgos — evolución semanal de la exposición (P×I)

> Cada celda es **P/I** (probabilidad/impacto). La exposición = P×I. Reconstrucción **[confirmar Maiki]**.

| ID | Riesgo | Categoría | W1 | W2 | W3 | W4 | W5 | W6 | W7 | Tendencia / estado |
|---|---|---|---|---|---|---|---|---|---|---|
| R1 | Cambios de alcance del profe (re-trabajo por revisiones) | Gestión / requisitos | 3/3 | 3/3 | 5/4 | 4/4 | 4/3 | 3/3 | 2/3 | ↓ controlado (proceso de revisión→ajuste) |
| R2 | Cuadre financiero al centavo (monto/amortización/carátula) | Técnico / legal | 3/5 | 3/5 | 5/5 | 2/5 | 2/5 | 2/4 | 1/4 | ↓ mitigado (cálculo server-side) |
| R3 | Pérdida de la BD de trabajo (Render free) / dependencia de datos demo | Infraestructura | 2/4 | 3/4 | 3/4 | 3/4 | 2/4 | 3/4 | 2/4 | → recurrente (respaldo + re-seed) |
| R4 | Duplicidad de empresas / acceso no acotado por empresa-rol | Datos / seguridad | 3/3 | 3/3 | 3/4 | 3/4 | 4/4 | 2/3 | 1/3 | ↓ mitigado (padrón + deduplicación) |
| R5 | Pago sobre contrato cerrado / doble liquidación | Legal / integridad | 1/5 | 1/5 | 2/5 | 2/5 | 2/5 | 4/5 | 2/5 | ↓ en cierre (gate art. 64 + 1 pago/estimación) |
| R6 | Estimación bloqueada por falta de PDF firmado (en datos demo) | Datos / demo | 1/3 | 1/3 | 2/3 | 2/3 | 2/3 | 4/4 | 2/4 | ↓ operativo (probar con contrato propio) |
| R7 | Inmutabilidad de bitácora / registros mutables tras cierre | Legal / integridad | 2/4 | 2/4 | 4/4 | 2/4 | 2/4 | 3/4 | 2/4 | ↓ mitigado (triggers append-only) |
| R8 | Integridad de curva/convenios (pérdida de lectura histórica) | Técnico | 1/3 | 1/3 | 1/3 | 3/4 | 3/4 | 3/4 | 2/4 | ↓ mitigado (versionado del programa) |
| R9 | Sesión única / control de acceso | Seguridad | 2/3 | 2/3 | 2/3 | 2/3 | 2/3 | 4/3 | 1/3 | ↓ resuelto (last-login-wins) |
| R10 | Deuda de documentación / planeación no cerrada | Gestión | 2/2 | 3/3 | 3/3 | 4/3 | 3/3 | 4/3 | 2/3 | → en control (ordenamiento documental) |
| R11 | Fundamentación legal incorrecta (citas) | Legal | 2/3 | 2/3 | 3/4 | 3/4 | 3/4 | 2/3 | 1/3 | ↓ mitigado (verificación contra los textos) |

---

## 4. Riesgos activos — plan de mitigación y resultado por semana

> Para cada riesgo: objetivo, pasos del plan y el resultado semanal **enganchado al plan/solución real** que lo movió.

### R1 · Cambios de alcance del profe
**Objetivo:** absorber las revisiones del profe sin re-trabajo descontrolado, convirtiendo cada observación en un ajuste trazable.
**Pasos:** (1) registrar cada revisión; (2) traducirla a un plan de corrección con fecha; (3) ejecutar y verificar contra el criterio del profe; (4) dejar el resultado documentado.
- **W3 (5/4):** la 1ª revisión grande (01-jun) pidió tres reversiones de fondo → ejecutamos `Revision_Sprint1_2_01jun.md` (alta con cuadre exacto, bitácora con apertura formal). Exposición alta porque tocó el núcleo.
- **W4 (4/4):** trasladamos esas reversiones a la fundación (cuadre, programa matricial, anticipo, sustitución) → `Validaciones_Formularios_05jun.md`, `Trabajo_Restante_05jun.md`.
- **W5 (4/3):** la 2ª revisión (09-jun) abrió ~20 hallazgos → los encauzamos en oleadas (`Correcciones_Post_Revision_Profesor_09jun.md`) sin desbordar el cronograma.
- **W6 (3/3):** la revisión del 16-jun pidió finiquito y rediseño por ciclos → `Plan_Grande_Implementacion_18jun.md`, `Rediseno_Match_Mockup_18jun.md`.
- **W7 (2/3):** las pre-entregas (24/25-jun) fueron afinación, no cambios de fondo → `Entrega_PreRevision_24jun.md`. Riesgo a la baja.

### R2 · Cuadre financiero al centavo
**Objetivo:** que el monto, la amortización, el 5 al millar y el neto cuadren **exactamente** y se deriven del sistema, no se tecleen.
**Pasos:** (1) derivar el monto del catálogo (Σ cantidad×PU); (2) amortización proporcional (art. 143 fr. I); (3) 5 al millar (art. 191 LFD); (4) carátula calculada server-side; (5) pruebas con valores exactos.
- **W3 (5/5):** el profe exigió quitar la tolerancia del monto → `Revision_Sprint1_2_01jun.md` lo convierte en valor derivado. Riesgo máximo esta semana.
- **W4 (2/5):** se implementa el cuadre exacto del catálogo y el programa concepto×periodo → baja la probabilidad, el impacto sigue alto por ser financiero.
- **W5 (2/5):** amortización proporcional con cuadre (art. 143 fr. I) y plan de pruebas con valores → `Correcciones_Post_Revision_Profesor_09jun.md`, `Pruebas_Valores_14jun.md`.
- **W6–W7 (2/4 → 1/4):** carátula tipo GACM y congelado del histórico financiero por versión → `Preentrega_Jueves_22jun.md`, `Siete_Brechas_Restantes_23jun.md`. Riesgo residual bajo.

### R3 · Pérdida de la BD de trabajo (Render free) / dependencia de datos demo
**Objetivo:** que una caída o reinicio del ambiente gratuito no borre el trabajo ni impida la demostración.
**Pasos:** (1) respaldo/continuidad de la BD; (2) scripts de datos demo re-ejecutables; (3) runbook de reconstrucción del ambiente.
- **W5 (2/4):** se identifica y mitiga el riesgo de perder la BD → `Correcciones_Post_Revision_Profesor_09jun.md` (respaldo y continuidad).
- **W6 (3/4):** vuelve como necesidad de datos demo consistentes → `Datos_Demo_Profesor_21jun.md`, `Reseed_Demo_Profesor_22jun.md`.
- **W7 (2/4):** se prepara el sembrado del ambiente de demostración → `Seed_Render_25jun.md`. Riesgo recurrente, controlado con re-seed.

### R4 · Duplicidad de empresas / acceso no acotado por empresa-rol
**Objetivo:** que no existan empresas "patito" duplicadas y que cada quien vea solo lo suyo.
**Pasos:** (1) padrón de empresas; (2) deduplicación (normalización de razón social); (3) contrato ligado a la empresa; (4) acotamiento por participación y rol.
- **W4 (3/4):** los formularios permitían capturar la empresa como texto libre → `Validaciones_Formularios_05jun.md` empieza a estructurar.
- **W5 (4/4):** el profe lo marca como prioritario → `Empresas_Consolidacion_15jun.md` (padrón con selección/alta, deduplicación, contrato ligado). Pico de atención.
- **W6–W7 (2/3 → 1/3):** se refuerza empresa contratista/supervisora en el contrato y roles acotados → `Preentrega_Jueves_22jun.md`, `Plan_Grande_Implementacion_18jun.md`.

### R5 · Pago sobre contrato cerrado / doble liquidación
**Objetivo:** que un contrato finiquitado quede en solo lectura y que no se pague dos veces la misma estimación.
**Pasos:** (1) gate de contrato cerrado (art. 64); (2) un solo pago por estimación; (3) verificación en pruebas negativas.
- **W6 (4/5):** la revisión exhaustiva confirma que un contrato cerrado seguía aceptando registros y pagos → `Pruebas_24_Contratos_21jun.md`, `Plan_Grande_Implementacion_18jun.md` (finiquito en modo consulta). Pico crítico.
- **W7 (2/5):** las pruebas negativas reconfirman y se cierra el gate art. 64 → `Pruebas_Negativas_24jun.md`. Riesgo a la baja, con verificación tras cada corrección.

### R6 · Estimación bloqueada por falta de PDF firmado (en datos demo)
**Objetivo:** que la demostración no se trabe porque un contrato demo no tiene su PDF de contrato ligado.
**Pasos:** (1) detectar los contratos demo sin PDF; (2) sembrar/ligar el PDF; (3) demostrar el flujo feliz sobre un contrato creado de inicio a fin.
- **W6 (4/4):** se confirma como uno de los bugs más graves → `Pruebas_24_Contratos_21jun.md`.
- **W7 (2/4):** se decide probar el flujo positivo con un contrato propio completo → `Pruebas_Positivas_24jun.md`. Queda **[confirmar Maiki]** que todos los contratos demo del profe tengan su PDF ligado.

### R7 · Inmutabilidad de bitácora / registros mutables tras cierre
**Objetivo:** que las notas, firmas, estimaciones y pagos sean append-only y no se alteren tras su emisión/cierre.
**Pasos:** (1) triggers de inmutabilidad; (2) corregir = registro nuevo vinculado; (3) gate de solo lectura tras finiquito.
- **W3 (4/4):** la sustitución borraba historia y las notas eran editables → `Revision_Sprint1_2_01jun.md` (notas firmadas inmutables, historial por rol).
- **W6 (3/4):** se corrige el vínculo minuta-nota por referencia (no edición) → `Cierre_E2_18jun.md`.
- **W7 (2/4):** las pruebas negativas reconfirman casos de notas mutables tras cierre → `Pruebas_Negativas_24jun.md` (a re-verificar tras cada corrección).

### R8 · Integridad de curva / convenios (pérdida de lectura histórica)
**Objetivo:** que un convenio modificatorio no borre el avance ya mostrado ni mezcle conceptos originales con adicionales.
**Pasos:** (1) versionar el programa; (2) congelar el histórico financiero por versión; (3) marcar los conceptos adicionales (art. 101).
- **W4 (3/4):** los convenios mezclaban original con adicional → `Validaciones_Formularios_05jun.md` (separar monto/plazo, versionar, marcar adicional).
- **W7 (3/4 → 2/4):** se congela el % financiero histórico por versión de la curva → `Siete_Brechas_Restantes_23jun.md`, `Entrega_PreRevision_24jun.md`.

### R9 · Sesión única / control de acceso
**Objetivo:** que una cuenta tenga una sola sesión activa (la más reciente cierra la anterior).
**Pasos:** (1) versión de token por usuario; (2) expulsar la sesión vieja al iniciar una nueva.
- **W6 (4/3):** el profe lo pide como criterio de la pre-entrega → `Preentrega_Jueves_22jun.md`.
- **W7 (1/3):** queda aplicado (last-login-wins). Riesgo resuelto.

### R10 · Deuda de documentación / planeación no cerrada
**Objetivo:** que la documentación refleje el sistema real y que los planes no queden abiertos sin resultado.
**Pasos:** (1) ordenar reportes por tema y fecha; (2) depurar duplicados; (3) cerrar cada plan con su resultado.
- **W5 (3/3):** archivos sueltos sin lectura clara → `Orden_Actualizacion_Equipos_13jun.md`.
- **W6 (4/3):** se acumulan planes "sin entregable asociado" (varios del 18–22 jun) → `Ordenamiento_Documentos_18jun.md` (pico de deuda).
- **W7 (2/3):** ordenamiento documental general y limpieza de historias. Riesgo en control; este mismo documento es parte de la mitigación.

### R11 · Fundamentación legal incorrecta
**Objetivo:** que cada validación cite el artículo correcto de LOPSRM/RLOPSRM/LFD.
**Pasos:** (1) verificar las citas contra los textos; (2) corregir las erróneas; (3) marcar lo interpretativo para confirmación.
- **W5 (3/4):** se detecta y corrige la cita de amortización (art. 143 fr. I, no 138) → `Correcciones_Post_Revision_Profesor_09jun.md` y la hoja de validación del 15-jun.
- **W6 (2/3):** se corrige la cita del vínculo minuta-nota a art. 123 fr. X → `Cierre_E2_18jun.md`. Riesgo a la baja.

---

## 5. Riesgos en observación (sin cerrar)

| ID | Riesgo | Estado | Nota |
|---|---|---|---|
| R12 | Penas por atraso: porcentaje, disparo y base aún por confirmar | Abierto | Estructura configurable lista; la regla concreta es **[confirmar Maiki / profe]** (arts. 46 Bis LOPSRM, 86–88 RLOPSRM). |
| R6 | PDF firmado ligado en TODOS los contratos demo del profe | Abierto | **[confirmar Maiki]** antes de la revisión final. |
| R7 | Notas mutables tras cierre reconfirmadas en pruebas negativas | En verificación | Re-verificar tras cada corrección (auditoría general 26-jun). |

---

## 6. Conclusión del seguimiento

A lo largo de siete semanas, el riesgo dominante fue el **re-trabajo por las revisiones del profe (R1)**, que mantuvimos
bajo control convirtiendo cada observación en un plan de corrección con su resultado. Los riesgos de mayor impacto
—**cuadre financiero (R2)** e **integridad legal/append-only (R5, R7)**— se redujeron por diseño (cálculo server-side,
triggers de inmutabilidad, gate de contrato cerrado). El riesgo más persistente es el de **infraestructura gratuita
(R3)**, que no desaparece sino que se administra con respaldo y re-seed. Quedan en observación las **penas por atraso
(R12)** y la verificación final de datos demo (R6). La exposición global del proyecto bajó de forma sostenida de W3 a
W7, conforme el sistema pasó de prototipo a aplicación con reglas legales verificadas.

> Los valores semanales de probabilidad/impacto son una **reconstrucción** basada en cuándo cada riesgo estuvo activo
> y cuándo lo mitigamos; antes de entregar conviene que Maiki ajuste los números finos contra el `Plan_Riesgos`
> existente para no contradecir la ponderación ya registrada.
