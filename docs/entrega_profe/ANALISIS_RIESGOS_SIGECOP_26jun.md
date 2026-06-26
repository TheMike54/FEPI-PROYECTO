# Análisis y seguimiento de riesgos — SIGECOP

**Proyecto:** SIGECOP — Sistema de Gestión Técnico-Administrativa de Contratos de Obra Pública (LOPSRM / RLOPSRM / LFD)
**Periodo cubierto:** **3 de febrero – 26 de junio de 2026** (formulación + desarrollo)
**Tipo de documento:** análisis de riesgos con seguimiento semanal y evidencia de planes ejecutados

> **Cómo leer este documento.** El proyecto tuvo **dos fases** y este análisis las cubre completas:
> **Fase 0 — Formulación** (feb–may): estudio de necesidades, marco legal, historias y maquetas; aquí
> identificamos los **primeros 12 riesgos** y los registramos en `Plan_Riesgos.xlsx`. **Fase 1 — Desarrollo**
> (may–jun): construcción real del sistema; aquí algunos riesgos de formulación se **materializaron o se
> cerraron**, y emergieron **riesgos de ejecución** propios del producto (cuadre financiero, inmutabilidad,
> pago sobre contrato cerrado, etc.). Seguimos los riesgos **semana a semana** y, en la fase de desarrollo,
> **enganchamos a cada semana el plan o la solución real** que movió cada riesgo (los planes viven en
> `docs/entrega_profe/planes_y_soluciones/`). Así el seguimiento no es teórico: cada cambio está respaldado
> por un documento con su fecha.
>
> **Continuidad.** Este documento **no parte de cero**: integra y extiende el `Plan_Riesgos.xlsx` que el
> equipo abrió el 10-may. Los riesgos de aquella fase se conservan con su clave original como **RF-01…RF-12**
> (Riesgo de Formulación) y se enlazan con los **RD-01…RD-12** (Riesgo de Desarrollo) en el puente de
> continuidad (§3).
>
> **Escala.** En desarrollo usamos **Probabilidad (P) e Impacto (I) en 1–5** (1 = muy bajo, 5 = muy alto);
> **Exposición = P × I** (1–25). En formulación conservamos la escala **cualitativa original** del
> `Plan_Riesgos` (Alta / Media / Baja). Tendencia: ↓ mejora · → estable · ↑ empeora. La ponderación numérica
> semanal es nuestra **reconstrucción**; los valores exactos quedan **[confirmar Maiki]**.

---

## 0. Fechas clave del proyecto (con evidencia)

> Reconstruimos el calendario real **a partir del historial de git y del propio `Plan_Riesgos.xlsx`**, no de
> memoria. Estas son las fechas que fijan el arranque del proyecto y del desarrollo.

| Hito | Fecha | Evidencia (de dónde la sacamos) |
|---|---|---|
| **Materia (FEPI)** inicia | enero 2026 | Calendario escolar (contexto; el proyecto SIGECOP se enmarca después). |
| **Encuadre del proyecto** SIGECOP | **3 de febrero 2026** | `Plan_Riesgos.xlsx`, hoja *Seguimiento_semanal*: «**Proyecto: 03/02–15/06/2026**». |
| **Repositorio GitHub** creado (`FEPI-PROYECTO`) | **9 de febrero 2026** | `git log --reverse`: primer commit `10190ea — 2026-02-09 19:37` «Add files via upload». |
| **Formulación** (documentos, sin código) | feb – mediados de may | git: feb (9 commits), mar (1), abr (2) — **todos** "Add files via upload" (PDFs de ley, tabla de necesidades, matriz de trazabilidad, diagrama de carriles). |
| **Seguimiento formal de riesgos** abierto | **10 de mayo 2026** | `Plan_Riesgos.xlsx`, hoja *Bitácora_seguimiento*: primeros asientos `10/05/2026`; *Seguimiento_semanal*: «seguimiento formal inició el 10/05/2026 (S14)». |
| **Arranque del DESARROLLO** (primer código) | **19 de mayo 2026** | `git log --reverse -- backend/`: «**Sprint 0: scaffold inicial — frontend React + backend Express + PostgreSQL + Docker**» (`2026-05-19 22:53`). |
| **Login real (JWT) y backend en Render** | 26 de mayo 2026 | git: "feat(backend): login real con bcrypt y JWT"; "feat(deploy): backend y PostgreSQL en Render". |
| **Cierre del periodo cubierto** (hoy) | **26 de junio 2026** | último commit `e5b01fa — 2026-06-26 13:17`; intensidad: may (70 commits), jun (140). |

**Lectura.** El **repositorio** existe desde el **9-feb** y el **proyecto** se encuadra desde el **3-feb**,
pero hasta mediados de mayo solo hubo **formulación documental** (no código). El **desarrollo de software
arrancó el 19-may** con el andamiaje (Sprint 0). Por eso este análisis abre en febrero (Fase 0) y concentra
el seguimiento con evidencia fuerte de planes a partir del desarrollo (Fase 1). Coincide con el encuadre del
propio `Plan_Riesgos` (03-feb–15-jun), que aquí **extendemos hasta el 26-jun** porque el trabajo continuó
después del 15-jun.

---

## 1. Fase 0 — Formulación: riesgos identificados (heredados de `Plan_Riesgos.xlsx`)

> En la formulación el riesgo era **anticipatorio**: no había producto que pudiera fallar, sino decisiones de
> arranque que podían comprometer el cronograma (curva de aprendizaje, configuración, alcance del cliente,
> interpretación legal). El equipo los registró el **10-may** en `Plan_Riesgos.xlsx` con probabilidad,
> impacto, nivel, mitigación, dueño y estado. Los conservamos **íntegros** como **RF-01…RF-12** y añadimos
> una columna de **cierre / evolución** que cuenta qué pasó con cada uno al entrar al desarrollo.

| ID | Cat. | Riesgo (formulación) | P | I | Nivel | Cierre / evolución en desarrollo |
|---|---|---|---|---|---|---|
| **RF-01** | Técnico | Curva de aprendizaje de React excede el primer sprint | Media | Alto | Alto | **Cerrado** — las maquetas por historia (Sprints 1–9, 23–24 may) y el login real (26-may) salieron; el equipo subió la curva con plantilla base. |
| **RF-02** | Técnico | Configuración de Docker consume el Sprint 1 | Alta | Medio | Alto | **Cerrado** — `docker-compose` operativo (entorno local, 29-may); el scaffold del 19-may ya traía contenedores. |
| **RF-03** | Técnico | Modelo de datos inicial incompleto → migraciones tardías | Media | Alto | Alto | **Evolucionó** → riesgos de modelo en desarrollo (**RD-04** empresas/acceso, **RD-08** curva/convenios). Gestionado con **un solo `schema.sql`** (autor único) y migraciones **aditivas e idempotentes**. |
| **RF-04** | Técnico | Despliegue inicial en Render falla por configuración | Media | Medio | Medio | **Materializado y cerrado** — primer deploy con DATABASE_URL+SSL e init de esquema (26-may); resuelto temprano, no en el sprint final. |
| **RF-05** | Técnico/Infra | Render suspende el servicio en el plan gratuito | Alta | Bajo | Medio | **Persiste** → se traslada a **RD-03** (pérdida de BD / datos demo). Se administra con respaldo, re-seed y "calentar" la URL antes de cada demo. |
| **RF-06** | Equipo | Velocidad real < 9 pts/sprint | Media | Alto | Alto | **Vigilado / recalibrado** — la fase de implementación corrió a **~31 pts/semana** (ver Planeación de sprints); el plan se rebalanceó (18–19 may). |
| **RF-07** | Equipo | Conflictos de merge por trabajo paralelo | Alta | Bajo | Medio | **Controlado** — ramas por frente (`feat/e2-*`, `feat/e3-*`); **Maiki integra y es el único que despliega**; rebase frecuente sobre `main`. |
| **RF-08** | Equipo | Ausencia temporal de un integrante | Media | Alto | Alto | **Vigilado (permanente)** — documentación continua y sincronización diaria en GitHub como mitigación de fondo. |
| **RF-09** | Alcance | El cliente pide cambios mayores que rompen historias ya hechas | Alta | Alto | **Crítico** | **Materializado y recurrente** → es el riesgo dominante en desarrollo: **RD-01** (cambios de alcance del profe). Se materializó el 18-may y se repitió (01-jun, 09-jun, 16-jun, 25-jun). |
| **RF-10** | Alcance | El alcance crece más allá de lo escrito (scope creep) | Alta | Medio | Alto | **Controlado** — regla "no se programa nada sin historia aprobada"; el **finiquito** se agregó como **historia nueva (HU-24)**, no como cambio silencioso. Se refleja en **RD-10** (deuda de planeación). |
| **RF-11** | Legal | Mala interpretación de un artículo LOPSRM/RLOPSRM | Media | Medio | Medio | **Persiste** → **RD-11** (fundamentación legal). Verificación de citas contra el DOF; corrección 143↔138 de la amortización. |
| **RF-12** | Entrega | Maquetas no aprobadas a tiempo bloquean el sprint | Media | Medio | Medio | **Cerrado** — maquetas en React/HTML producidas y aprobadas (fase A, 19–24 may); regla "maqueta aprobada antes de programar" cumplida. |

**Bitácora de la formulación (eventos reales registrados en `Plan_Riesgos.xlsx`).** Esta es la evidencia de
que los riesgos se gestionaron desde antes del código:

| Fecha | Riesgo | Evento |
|---|---|---|
| 10-may | RF-01, RF-06, RF-09, RF-10 | Se **abre** el seguimiento formal de riesgos al revisar el stack y el plan iterativo. |
| 12-may | RF-01, RF-10, RF-02 | RF-01 y RF-10 pasan a **Mitigando** (semana de tutoriales + regla de "solo historias aprobadas"); se detecta RF-02 (Docker no estimado). |
| 13-may | RF-02…RF-05, RF-07, RF-08, RF-11, RF-12 | Tanda de identificación al elaborar el **estudio de factibilidad técnica** y revisar la matriz definitiva. |
| 18-may | **RF-09 → Materializado** | Revisión del cliente: quitar selector de rol (HU-00), separar modificatorios del alta, ampliar HU-01 (garantías/penas/amortización), criterios como aseveraciones, velocidad a 9 pts/sprint. |
| 19-may | RF-09, RF-06, RF-11, RF-12 | Tres olas de corrección sobre matriz/historias/factibilidad/maquetas; plan rebalanceado a 9 pts/sprint × 9 sprints; auditoría de citas legales contra el DOF. **Mismo día: Sprint 0 (scaffold) → inicia el desarrollo.** |

---

## 2. Calendario unificado (Fase 0 + Fase 1)

| Fase | Semana | Fechas | Hito principal |
|---|---|---|---|
| **0 · Formulación** | F-feb/abr | 3 feb – 3 may | Repo creado (9-feb); estudio de necesidades, marco legal, matriz de trazabilidad, primeras historias (solo documentos). |
| **0 · Formulación** | F-S14 | 4–10 may | **Se abre `Plan_Riesgos.xlsx` (10-may)**: se identifican los 12 riesgos. |
| **0 · Formulación** | F-S15 | 11–18 may | Revisiones del profe **12-may** y **18-may** (historias, arquitectura por bloques, Fibonacci); **RF-09 se materializa**. |
| **1 · Desarrollo** | **W1** | 19–25 may | **Sprint 0 (19-may): scaffold React+Express+PostgreSQL+Docker — primer código**; maquetas por historia (Sprints 1–9). |
| **1 · Desarrollo** | **W2** | 26 may – 01 jun | Login real (JWT) + deploy en Render; CRUD HU-01; prototipo funcional. **1ª revisión grande (01-jun).** |
| **1 · Desarrollo** | **W3** | 02–08 jun | Fundación real: cuadre al centavo, programa concepto×periodo, convenios, sustitución de personas. |
| **1 · Desarrollo** | **W4** | 09–15 jun | **2ª revisión (09-jun)**: empresas, amortización, flujo de estimación; oleadas de corrección; hoja de validación (15-jun). |
| **1 · Desarrollo** | **W5** | 16–22 jun | **Revisión 16-jun**: finiquito obligatorio; rediseño por ciclos; pre-entrega y diagnósticos (21–22 jun). |
| **1 · Desarrollo** | **W6** | 23–26 jun | Siete brechas, pruebas positivas/negativas, carátula GACM, rediseño del flujo de pago, datos de tiempo recorrido; pre-entregas 24/25-jun. |

> **Nota de método (honesta).** La evidencia documental **formal de planes-solución** vive en la fase de
> **desarrollo** (W1→W6). En **formulación** la evidencia es el `Plan_Riesgos.xlsx`, las historias, la matriz
> de trazabilidad y las maquetas (no hay "plan-solución" porque aún no había sistema que corregir). Por eso
> la matriz de exposición **P×I semana a semana** (§4) cubre el **desarrollo**, y la formulación se documenta
> con su tabla cualitativa (§1).
>
> **Ajuste de numeración.** Reanclamos las semanas de desarrollo al **scaffold real (19-may = W1)**. La
> versión anterior de este documento numeraba desde el 12-may; corregido aquí porque el **primer código** es
> del 19-may (el 12–18 may pertenece a la formulación tardía: revisiones del profe, aún sin código).

---

## 3. Puente de continuidad — de los riesgos de formulación a los de desarrollo

> Para que no parezca "armado de golpe": cada riesgo de desarrollo **viene de** un riesgo de formulación o es
> **nuevo** (emergió porque el producto ya existía y podía fallar de formas que en el papel no se ven).

| Riesgo de desarrollo (RD) | Origen |
|---|---|
| **RD-01** Cambios de alcance del profe (re-trabajo por revisiones) | **Continúa de RF-09** (cliente pide cambios mayores). |
| **RD-02** Cuadre financiero al centavo (monto/amortización/carátula) | **Nuevo** (emerge con la implementación del cálculo). |
| **RD-03** Pérdida de la BD (Render free) / dependencia de datos demo | **Continúa de RF-05** (Render sleep) + RF-04 (deploy). |
| **RD-04** Duplicidad de empresas / acceso no acotado por empresa-rol | **Evoluciona de RF-03** (modelo de datos) + observación del profe (09-jun). |
| **RD-05** Pago sobre contrato cerrado / doble liquidación | **Nuevo** (emerge al implementar pago y cierre). |
| **RD-06** Estimación bloqueada por falta de PDF firmado (datos demo) | **Nuevo** (emerge en pruebas con contratos demo). |
| **RD-07** Inmutabilidad de bitácora / registros mutables tras cierre | **Nuevo** (emerge con bitácora, notas y triggers). |
| **RD-08** Integridad de curva / convenios (lectura histórica) | **Evoluciona de RF-03** (modelo) — versionado del programa. |
| **RD-09** Sesión única / control de acceso | **Nuevo** (criterio que pide el profe en pre-entrega). |
| **RD-10** Deuda de documentación / planeación no cerrada | **Continúa de RF-10 / RF-12** (gestión y entregables). |
| **RD-11** Fundamentación legal incorrecta (citas) | **Continúa de RF-11** (interpretación legal). |
| **RD-12** Penas por atraso: porcentaje/disparo/base por confirmar | **Nuevo** (en observación; deriva de la regla legal aún abierta). |

---

## 4. Registro de revisiones con el profe (actas mínimas)

Cada revisión es el origen de los ajustes de la semana siguiente. Fechas tomadas de las sesiones de revisión
y de la bitácora del `Plan_Riesgos`.

| Fecha | Tipo | Acuerdos / observaciones principales |
|---|---|---|
| 12-may | Revisión (formulación) | Deduplicar servicios; una historia por servicio; máx. 2–3 criterios de aceptación; factibilidad por atributos del proyecto, no comerciales; estimación por puntos (Fibonacci). |
| 18-may | Revisión (formulación) | Arquitectura por bloques; criterios como aseveraciones; inicio de sesión sin selector de rol; maquetas sobre la tecnología real; HU complejas en sprints tempranos. **(RF-09 materializado.)** |
| 01-jun | Revisión (mayor) | Tres reversiones: **cuadre exacto al centavo** (sin tolerancia), **anticipo** como regla (con autorización si supera el límite), **programa = conceptos del catálogo en calendario**; sustitución de personas; apertura = nota #1. |
| 09-jun | Revisión | Catálogo de empresas (lo más insistido); amortización proporcional; alertas de atraso sin umbral manual; flujo de estimación en el orden legal (contratista presenta → residencia autoriza → pago). |
| 10-jun | Clase | Resolución de dudas: emisor de notas = residente; avance que excede el periodo = aviso (no bloqueo); tipo de nota "atraso". |
| 15-jun | Hoja de validación | Pago solo sobre estimación autorizada; amortización = art. 143 fr. I (no 138); carátula **sin IVA**; generadores y soportes (art. 132). |
| 16-jun | Revisión | **Finiquito obligatorio** ("sin finiquito no se cierra"); estimación por bloques; oficio del convenio en el expediente; presentar estimación por estado. |
| 21–22 jun | Revisión + lectura de historias | Operar siempre dentro de bitácora abierta (art. 122); contrato cerrado en solo lectura (art. 64); limpiar tecnicismos de las historias. |
| 24-jun | Pre-entrega | Curva versionada por convenio; checklist del art. 132; etiqueta "Adicional" (art. 101); ampliación de concepto con precio unitario heredado. |
| 25-jun | Pre-entrega | Carátula completa (importe del anticipo, acumulados, saldo, firmas); alta con empresa→persona real; sustitución a los tres roles con regla temporal de firmas; sesión única. |

> **[confirmar Maiki]:** no hay acta de reunión con el profe el ~25/26-may ni el 04-jun; en esas fechas hubo
> trabajo interno (corrección de citas legales y fundación), no revisión. Si hubo junta, agregar su fecha.

---

## 5. Matriz de riesgos de desarrollo — evolución semanal de la exposición (P×I)

> Cada celda es **P/I** (probabilidad/impacto). La exposición = P×I. Las columnas son las semanas de
> **desarrollo** (W1 = 19-may … W6 = 23–26 jun). Reconstrucción **[confirmar Maiki]**.

| ID | Riesgo | Categoría | W1 | W2 | W3 | W4 | W5 | W6 | Tendencia / estado |
|---|---|---|---|---|---|---|---|---|---|
| RD-01 | Cambios de alcance del profe (re-trabajo) | Gestión / requisitos | 3/3 | 5/4 | 4/4 | 4/3 | 3/3 | 2/3 | ↓ controlado (proceso revisión→ajuste) |
| RD-02 | Cuadre financiero al centavo | Técnico / legal | 3/5 | 5/5 | 2/5 | 2/5 | 2/4 | 1/4 | ↓ mitigado (cálculo server-side) |
| RD-03 | Pérdida de la BD (Render free) / datos demo | Infraestructura | 3/4 | 3/4 | 3/4 | 2/4 | 3/4 | 2/4 | → recurrente (respaldo + re-seed) |
| RD-04 | Duplicidad de empresas / acceso no acotado | Datos / seguridad | 3/3 | 3/4 | 3/4 | 4/4 | 2/3 | 1/3 | ↓ mitigado (padrón + deduplicación) |
| RD-05 | Pago sobre contrato cerrado / doble liquidación | Legal / integridad | 1/5 | 2/5 | 2/5 | 2/5 | 4/5 | 2/5 | ↓ en cierre (gate art. 64 + 1 pago/estimación) |
| RD-06 | Estimación bloqueada por falta de PDF (demo) | Datos / demo | 1/3 | 2/3 | 2/3 | 2/3 | 4/4 | 2/4 | ↓ operativo (probar con contrato propio) |
| RD-07 | Inmutabilidad de bitácora / registros mutables | Legal / integridad | 2/4 | 4/4 | 2/4 | 2/4 | 3/4 | 2/4 | ↓ mitigado (triggers append-only) |
| RD-08 | Integridad de curva / convenios | Técnico | 1/3 | 1/3 | 3/4 | 3/4 | 3/4 | 2/4 | ↓ mitigado (versionado del programa) |
| RD-09 | Sesión única / control de acceso | Seguridad | 2/3 | 2/3 | 2/3 | 2/3 | 4/3 | 1/3 | ↓ resuelto (last-login-wins) |
| RD-10 | Deuda de documentación / planeación | Gestión | 3/3 | 3/3 | 4/3 | 3/3 | 4/3 | 2/3 | → en control (ordenamiento documental) |
| RD-11 | Fundamentación legal incorrecta (citas) | Legal | 2/3 | 3/4 | 3/4 | 3/4 | 2/3 | 1/3 | ↓ mitigado (verificación vs. textos) |

> Los riesgos de **formulación que persisten** se siguen aquí bajo su clave de desarrollo: RF-05→RD-03,
> RF-09→RD-01, RF-11→RD-11 (ver §3). Los que se **cerraron** (RF-01, RF-02, RF-04, RF-12) no se replican en
> esta matriz porque ya no estaban activos al avanzar el desarrollo.

---

## 6. Riesgos de desarrollo — plan de mitigación y resultado por semana

> Para cada riesgo: objetivo, pasos del plan y el resultado semanal **enganchado al plan/solución real** que
> lo movió. (W1 = 19-may … W6 = 23–26 jun.)

### RD-01 · Cambios de alcance del profe  *(continúa de RF-09)*
**Objetivo:** absorber las revisiones del profe sin re-trabajo descontrolado, convirtiendo cada observación en un ajuste trazable.
**Pasos:** (1) registrar cada revisión; (2) traducirla a un plan de corrección con fecha; (3) ejecutar y verificar contra el criterio del profe; (4) dejar el resultado documentado.
- **W2 (5/4):** la 1ª revisión grande (01-jun) pidió tres reversiones de fondo → ejecutamos `Revision_Sprint1_2_01jun.md` (alta con cuadre exacto, bitácora con apertura formal). Exposición alta porque tocó el núcleo.
- **W3 (4/4):** trasladamos esas reversiones a la fundación (cuadre, programa matricial, anticipo, sustitución) → `Validaciones_Formularios_05jun.md`, `Trabajo_Restante_05jun.md`.
- **W4 (4/3):** la 2ª revisión (09-jun) abrió ~20 hallazgos → los encauzamos en oleadas (`Correcciones_Post_Revision_Profesor_09jun.md`) sin desbordar el cronograma.
- **W5 (3/3):** la revisión del 16-jun pidió finiquito y rediseño por ciclos → `Plan_Grande_Implementacion_18jun.md`, `Rediseno_Match_Mockup_18jun.md`.
- **W6 (2/3):** las pre-entregas (24/25-jun) fueron afinación, no cambios de fondo → `Entrega_PreRevision_24jun.md`. Riesgo a la baja.

### RD-02 · Cuadre financiero al centavo  *(nuevo)*
**Objetivo:** que el monto, la amortización, el 5 al millar y el neto cuadren **exactamente** y se deriven del sistema, no se tecleen.
**Pasos:** (1) derivar el monto del catálogo (Σ cantidad×PU); (2) amortización proporcional (art. 143 fr. I); (3) 5 al millar (art. 191 LFD); (4) carátula calculada server-side; (5) pruebas con valores exactos.
- **W2 (5/5):** el profe exigió quitar la tolerancia del monto → `Revision_Sprint1_2_01jun.md` lo convierte en valor derivado. Riesgo máximo esta semana.
- **W3 (2/5):** se implementa el cuadre exacto del catálogo y el programa concepto×periodo → baja la probabilidad, el impacto sigue alto por ser financiero.
- **W4 (2/5):** amortización proporcional con cuadre (art. 143 fr. I) y plan de pruebas con valores → `Correcciones_Post_Revision_Profesor_09jun.md`, `Pruebas_Valores_14jun.md`.
- **W5–W6 (2/4 → 1/4):** carátula tipo GACM y congelado del histórico financiero por versión → `Preentrega_Jueves_22jun.md`, `Siete_Brechas_Restantes_23jun.md`. Riesgo residual bajo.

### RD-03 · Pérdida de la BD (Render free) / dependencia de datos demo  *(continúa de RF-05)*
**Objetivo:** que una caída o reinicio del ambiente gratuito no borre el trabajo ni impida la demostración.
**Pasos:** (1) respaldo/continuidad de la BD; (2) scripts de datos demo re-ejecutables; (3) runbook de reconstrucción del ambiente.
- **W4 (2/4):** se identifica y mitiga el riesgo de perder la BD → `Correcciones_Post_Revision_Profesor_09jun.md` (respaldo y continuidad).
- **W5 (3/4):** vuelve como necesidad de datos demo consistentes → `Datos_Demo_Profesor_21jun.md`, `Reseed_Demo_Profesor_22jun.md`.
- **W6 (2/4):** se prepara el sembrado del ambiente de demostración → `Seed_Render_25jun.md`. Riesgo recurrente, controlado con re-seed.

### RD-04 · Duplicidad de empresas / acceso no acotado por empresa-rol  *(evoluciona de RF-03)*
**Objetivo:** que no existan empresas "patito" duplicadas y que cada quien vea solo lo suyo.
**Pasos:** (1) padrón de empresas; (2) deduplicación (normalización de razón social); (3) contrato ligado a la empresa; (4) acotamiento por participación y rol.
- **W3 (3/4):** los formularios permitían capturar la empresa como texto libre → `Validaciones_Formularios_05jun.md` empieza a estructurar.
- **W4 (4/4):** el profe lo marca como prioritario → `Empresas_Consolidacion_15jun.md` (padrón con selección/alta, deduplicación, contrato ligado). Pico de atención.
- **W5–W6 (2/3 → 1/3):** se refuerza empresa contratista/supervisora en el contrato y roles acotados → `Preentrega_Jueves_22jun.md`, `Plan_Grande_Implementacion_18jun.md`.

### RD-05 · Pago sobre contrato cerrado / doble liquidación  *(nuevo)*
**Objetivo:** que un contrato finiquitado quede en solo lectura y que no se pague dos veces la misma estimación.
**Pasos:** (1) gate de contrato cerrado (art. 64); (2) un solo pago por estimación; (3) verificación en pruebas negativas.
- **W5 (4/5):** la revisión exhaustiva confirma que un contrato cerrado seguía aceptando registros y pagos → `Pruebas_24_Contratos_21jun.md`, `Plan_Grande_Implementacion_18jun.md` (finiquito en modo consulta). Pico crítico.
- **W6 (2/5):** las pruebas negativas reconfirman y se cierra el gate art. 64 → `Pruebas_Negativas_24jun.md`. Riesgo a la baja, con verificación tras cada corrección.

### RD-06 · Estimación bloqueada por falta de PDF firmado (en datos demo)  *(nuevo)*
**Objetivo:** que la demostración no se trabe porque un contrato demo no tiene su PDF de contrato ligado.
**Pasos:** (1) detectar los contratos demo sin PDF; (2) sembrar/ligar el PDF; (3) demostrar el flujo feliz sobre un contrato creado de inicio a fin.
- **W5 (4/4):** se confirma como uno de los bugs más graves → `Pruebas_24_Contratos_21jun.md`.
- **W6 (2/4):** se decide probar el flujo positivo con un contrato propio completo → `Pruebas_Positivas_24jun.md`. Queda **[confirmar Maiki]** que todos los contratos demo del profe tengan su PDF ligado.

### RD-07 · Inmutabilidad de bitácora / registros mutables tras cierre  *(nuevo)*
**Objetivo:** que las notas, firmas, estimaciones y pagos sean append-only y no se alteren tras su emisión/cierre.
**Pasos:** (1) triggers de inmutabilidad; (2) corregir = registro nuevo vinculado; (3) gate de solo lectura tras finiquito.
- **W2 (4/4):** la sustitución borraba historia y las notas eran editables → `Revision_Sprint1_2_01jun.md` (notas firmadas inmutables, historial por rol).
- **W5 (3/4):** se corrige el vínculo minuta-nota por referencia (no edición) → `Cierre_E2_18jun.md`.
- **W6 (2/4):** las pruebas negativas reconfirman casos de notas mutables tras cierre → `Pruebas_Negativas_24jun.md` (a re-verificar tras cada corrección).

### RD-08 · Integridad de curva / convenios (pérdida de lectura histórica)  *(evoluciona de RF-03)*
**Objetivo:** que un convenio modificatorio no borre el avance ya mostrado ni mezcle conceptos originales con adicionales.
**Pasos:** (1) versionar el programa; (2) congelar el histórico financiero por versión; (3) marcar los conceptos adicionales (art. 101).
- **W3 (3/4):** los convenios mezclaban original con adicional → `Validaciones_Formularios_05jun.md` (separar monto/plazo, versionar, marcar adicional).
- **W6 (3/4 → 2/4):** se congela el % financiero histórico por versión de la curva → `Siete_Brechas_Restantes_23jun.md`, `Entrega_PreRevision_24jun.md`.

### RD-09 · Sesión única / control de acceso  *(nuevo)*
**Objetivo:** que una cuenta tenga una sola sesión activa (la más reciente cierra la anterior).
**Pasos:** (1) versión de token por usuario; (2) expulsar la sesión vieja al iniciar una nueva.
- **W5 (4/3):** el profe lo pide como criterio de la pre-entrega → `Preentrega_Jueves_22jun.md`.
- **W6 (1/3):** queda aplicado (last-login-wins). Riesgo resuelto.

### RD-10 · Deuda de documentación / planeación no cerrada  *(continúa de RF-10 / RF-12)*
**Objetivo:** que la documentación refleje el sistema real y que los planes no queden abiertos sin resultado.
**Pasos:** (1) ordenar reportes por tema y fecha; (2) depurar duplicados; (3) cerrar cada plan con su resultado.
- **W4 (3/3):** archivos sueltos sin lectura clara → `Orden_Actualizacion_Equipos_13jun.md`.
- **W5 (4/3):** se acumulan planes "sin entregable asociado" (varios del 18–22 jun) → `Ordenamiento_Documentos_18jun.md` (pico de deuda).
- **W6 (2/3):** ordenamiento documental general y limpieza de historias. Riesgo en control; este mismo documento es parte de la mitigación.

### RD-11 · Fundamentación legal incorrecta  *(continúa de RF-11)*
**Objetivo:** que cada validación cite el artículo correcto de LOPSRM/RLOPSRM/LFD.
**Pasos:** (1) verificar las citas contra los textos; (2) corregir las erróneas; (3) marcar lo interpretativo para confirmación.
- **W4 (3/4):** se detecta y corrige la cita de amortización (art. 143 fr. I, no 138) → `Correcciones_Post_Revision_Profesor_09jun.md` y la hoja de validación del 15-jun.
- **W5 (2/3):** se corrige la cita del vínculo minuta-nota a art. 123 fr. X → `Cierre_E2_18jun.md`. Riesgo a la baja.

---

## 7. Riesgos en observación (sin cerrar)

| ID | Riesgo | Estado | Nota |
|---|---|---|---|
| RD-12 | Penas por atraso: porcentaje, disparo y base aún por confirmar | Abierto | Estructura configurable lista (`UI_Estimacion_Seleccion`); la regla concreta es **[confirmar Maiki / profe]** (arts. 46 Bis LOPSRM, 86–88 RLOPSRM; 138–139 RLOPSRM por verificar). |
| RD-06 | PDF firmado ligado en TODOS los contratos demo del profe | Abierto | **[confirmar Maiki]** antes de la revisión final. |
| RD-07 | Notas mutables tras cierre reconfirmadas en pruebas negativas | En verificación | Re-verificar tras cada corrección (auditoría general 26-jun). |
| RF-08 | Ausencia temporal de un integrante | Vigilado (permanente) | Heredado de formulación; mitigado con documentación continua y sincronización diaria. |

---

## 8. Conclusión del seguimiento

El proyecto se gestionó por riesgos **desde la formulación**: el 10-may, antes de escribir código, el equipo
abrió `Plan_Riesgos.xlsx` con 12 riesgos anticipatorios. La mayoría de los **técnicos de arranque** (React,
Docker, primer deploy, maquetas) se **cerraron** en las primeras semanas de desarrollo; los que **persistieron**
—**cambios de alcance del cliente (RF-09 → RD-01)**, **infraestructura gratuita (RF-05 → RD-03)** y
**interpretación legal (RF-11 → RD-11)**— marcaron el seguimiento de toda la fase de desarrollo.

En el desarrollo el riesgo dominante fue el **re-trabajo por las revisiones del profe (RD-01)**, que mantuvimos
bajo control convirtiendo cada observación en un plan de corrección con su resultado. Los riesgos de mayor
impacto que **emergieron con el producto** —**cuadre financiero (RD-02)**, **pago sobre contrato cerrado
(RD-05)** e **inmutabilidad (RD-07)**— se redujeron por diseño (cálculo server-side, gate del art. 64,
triggers de inmutabilidad). El más persistente sigue siendo la **infraestructura gratuita (RD-03)**, que no
desaparece sino que se administra con respaldo y re-seed. Quedan en observación las **penas por atraso
(RD-12)** y la verificación final de datos demo (RD-06). La exposición global del proyecto bajó de forma
sostenida conforme el sistema pasó de prototipo a aplicación con reglas legales verificadas.

> Los valores semanales de probabilidad/impacto son una **reconstrucción** basada en cuándo cada riesgo
> estuvo activo y cuándo lo mitigamos. Antes de entregar conviene que **Maiki ajuste los números finos** y
> confirme que la lectura de continuidad (RF→RD) concuerda con la ponderación ya registrada en
> `Plan_Riesgos.xlsx`.
