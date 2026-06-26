# PLAN — Entregables del profe que aún FALTAN (deducidos de los audios)

> **Qué es esto:** propuesta para que **Maiki decida**. Inventario de los ENTREGABLES (documentos/artefactos
> académicos) que el profe **Carlos Silva** pidió en los audios y que **aún no tenemos o están incompletos**,
> con su **cita**, qué incluiría, cómo armarlo y el esfuerzo. **NO construí ninguno** (esta sesión es solo
> documentación). Fuente: `docs/audios/` (transcripciones + consolidados). Las citas son **aproximadas** (la
> transcripción de voz trae errores); antes de entregar, re-escuchar el audio citado.
>
> **Alcance:** separé los ENTREGABLES-documento de los **bugs/features del sistema** (esos viven en
> `docs/pendientes/` y en los planes de corrección). Aquí solo van artefactos que el profe revisa como documento.

---

## A. Análisis de riesgos CON SEGUIMIENTO SEMANAL + planes ejecutados + actas/registros  🔴 (el más insistido)

- **Qué pidió (cita):**
  - `Combinado_2026-06-25_2145.md` (25-jun): *"Análisis de riesgos lo queremos al menos de cuatro semanas a la fecha… los planes ejecutaron, escritos los planes y los resultados de esos planes por semana… co-escritos con un registro [de la junta]."*
  - `WhatsApp Audio 2026-05-25 at 7.48.42 PM` (25-may): *"les pedí que yo pueda ver semana a semana cómo va cambiando la probabilidad y el impacto. Semana 1, semana 2, semana 3… ustedes quedaron en la identificación y la ponderación. Falta el seguimiento."*
  - `WhatsApp Audio 2026-05-12` (12-may): *"Riesgos, ahí llevo pidiendo… no me he dado seguimiento de riesgos."*
  - `Combinado_2026-06-22_2008.md` (22-jun): *"llevan su reporte de riesgos, al día… los registros de ejecución de los planes… cada plan: el objetivo, los pasos del plan."*
- **Estado actual:** existe `referencias/Plan_Riesgos.xlsx` (identificación + ponderación) — **falta confirmar** si trae la **evolución semanal** de probabilidad/impacto y los **planes ejecutados con resultado por semana**. Casi seguro **incompleto** en lo semanal y en las actas.
- **Qué incluiría:**
  1. Matriz de riesgos: ID, descripción, categoría, **probabilidad e impacto por semana (S0→Sn)**, exposición y tendencia.
  2. Por cada riesgo activo: **plan de mitigación** (objetivo + pasos) y **resultado de ejecución por semana** (qué se hizo, qué cambió la probabilidad/impacto).
  3. **Acta/registro de la junta** donde se ejecutó/revisó cada plan (el profe fue explícito: "escritos no cuentan; co-escritos con un registro").
  4. Cobertura mínima **4 semanas** hacia atrás (ideal 3 meses).
- **Cómo armarlo:** partir del `Plan_Riesgos.xlsx` existente; reconstruir la línea semanal con la evidencia real del proyecto (los reportes de sesión de `reportes/` y `historial/` dan la materia prima: qué riesgo se materializó y cómo se mitigó, p. ej. "cambios de alcance del cliente", "deuda de documentación", "deploy a Render"). Redactar las actas a partir de las revisiones con el profe (fechas en los audios).
- **Esfuerzo:** **Alto** (4–6 h). Es el entregable estrella de la revisión final; conviene priorizarlo.

---

## B. Tres Requerimientos No Funcionales del proyecto + investigación ISO/IEC 25010 y FURPS  🟡

- **Qué pidió (cita):** `Combinado_2026-06-22_1653.md` (22-jun) y `New Recording 39_transcript.txt` (≈28-may): *"voy a pedir mínimo tres requerimientos no funcionales que cumplan con esta estructura de tu proyecto… revisamos la ISO [25010], revisamos los FURPS… van a sacar un resumen o ideas de los requerimientos no funcionales."*
- **Estado actual:** **no tenemos** un documento de RNF + ISO 25010/FURPS.
- **⚠ A confirmar (Maiki):** estos dos audios tienen **estilo de clase teórica** (otra voz / actividad de la materia de requerimientos, C505/C506). Confirmar si el entregable es **del mismo profe/materia** que SIGECOP o de otra clase, antes de invertir.
- **Qué incluiría:** (1) resumen breve de **ISO/IEC 25010** y **FURPS**; (2) **mínimo 3 RNF** de SIGECOP con estructura: atributo (rendimiento/seguridad/usabilidad/portabilidad…), métrica, valor actual + objetivo, condición. Candidatos naturales de SIGECOP: seguridad (JWT/roles/`token_version`), integridad (cuadre al centavo, append-only), usabilidad (flujo por wizard).
- **Cómo armarlo:** investigación corta + mapear 3 atributos reales del sistema a métricas medibles.
- **Esfuerzo:** **Bajo–medio** (1.5–2 h).

---

## C. Planeación ágil: tabla de sprints por semana + velocidad + catálogo de historias con prioridad/complejidad/puntos  🟡

- **Qué pidió (cita):**
  - `WhatsApp Audio 2026-05-12` (12-may): *"haz un excel… todas tus historias, el origen de qué servicio viene… prioridad y complejidad… para hacer la primera estimación de tiempos."*
  - `WhatsApp Audio 2026-05-18` (18-may): *"¿por cuántos vas a hacer la tabla de los sprints por iteración? ¿cuál es tu velocidad?"*
  - `WhatsApp Audio 2026-05-25 at 7.48.42 PM` (25-may): *"muestren su planeación. ¿Dónde está? Semana 1, semana 2… no puede haber 9 sprints porque no hay 9 semanas."*
- **Estado actual:** existe `requisitos/Historias_Usuario.xlsx` — **falta confirmar** si tiene columnas de prioridad/complejidad/**puntos** y si hay una **tabla de sprints con velocidad**. Probablemente **incompleto**.
- **Qué incluiría:** (1) catálogo de las 24 HU con origen (servicio), prioridad, complejidad y **puntos**; (2) **tabla de sprints** (qué HU por sprint, puntos por sprint, velocidad del equipo), priorizando lo trascendente primero (el profe reclamó que el registro de pago quedó al final).
- **Cómo armarlo:** sobre el Excel de historias existente; los sprints reales se reconstruyen del `HISTORIAL_PROYECTO.md`.
- **Esfuerzo:** **Medio** (2–3 h).

---

## D. Control de cambios / changelog por revisión (entregar ajustes en cada sesión)  🟡

- **Qué pidió (cita):** `WhatsApp Audio 2026-06-09 at 2.07.44 PM` (9-jun): *"traigan siempre un txt donde traigan los cambios, entregan ajustes y listo… que esto no sea infinito."* Reforzado en `Combinado_2026-06-22_2008.md`: *"deben tener versiones… un histórico."*
- **Estado actual:** tenemos `estado/HISTORIAL_PROYECTO.md` y los reportes de sesión — **pero no** un changelog corto y limpio "por revisión" para entregar en mano.
- **Qué incluiría:** un documento breve (por fecha de revisión: qué pidió el profe → qué se ajustó), derivado del historial. Sirve para no re-abrir temas cerrados.
- **Cómo armarlo:** condensar `HISTORIAL_PROYECTO.md` + los reportes a una tabla cronológica de "pedido → ajuste".
- **Esfuerzo:** **Bajo** (1 h).

---

## E. Modelo de datos / Diagrama Entidad-Relación como documento entregable  🟡

- **Qué pidió (cita):** `WhatsApp Audio 2026-05-25 at 7.48.42 PM` (25-may): *"que me definas todos tus atributos, tus entidades… hay que ver un bosquejo de todo… históricos 1:N para sustituciones."*
- **Estado actual:** tenemos el `schema.sql` (código) y `estado/Borrador_DDL_Tablas_Nuevas_SIGECOP.md` — **falta** un **diagrama E-R / modelo de datos** legible como documento (no código).
- **Qué incluiría:** diagrama E-R (o modelo relacional + diccionario de datos) de las entidades principales: contrato y sus secciones, modificatorios, roster con histórico 1:N, estimaciones/generadores, bitácora/notas, garantías, pagos.
- **Cómo armarlo:** derivar del `schema.sql` real (fuente de verdad) a un diagrama.
- **Esfuerzo:** **Medio** (2–3 h).

---

## Entregables que YA TENEMOS (cobertura — para no rehacerlos)

| Entregable pedido | Dónde está | Nota |
|---|---|---|
| Historias de Usuario corregidas (24) | `requisitos/Historias_Usuario_ACTUALIZADAS_12jun.md` (+ `.xlsx`) | Canónicas; alinear formato final con el sistema. La copia suelta `docs/Historias_Usuario_SIGECOP.md` está modificada — Maiki: revisar si es redundante. |
| Matriz de trazabilidad Servicios↔HU | `requisitos/Fichas_Trazabilidad.md` · `requisitos/matriz_DEFINITIVA.xlsx` | Verificar cobertura total. |
| Matriz de permisos por rol × HU | `entrega_profe/MATRIZ_DE_PERMISOS_26jun.md` | Limpia, lista. |
| Estudio de factibilidad técnica | `referencias/Estudio_Factibilidad_Tecnica_SIGECOP.docx` | Verificar que evalúe herramientas por **criterios del proyecto**, no comerciales. |
| Diagrama de arquitectura | `referencias/Arquitectura_SIGECOP.svg` · `referencias/diagrama_arquitectura.png` | Verificar que esté a **nivel de bloques/módulos** (6 módulos + accesos). |
| Scripts de prueba / datos dummy | `backend/scripts/seed_demo_24.sql`, `seed_demo_atraso.sql`, `seed_demo_tr.sql` + `planes/RUNBOOK_*` + `pruebas/` | Fuerte; uno por estado/HU. |
| Demo de flujo completo extremo a extremo | `pruebas/PLAN_PRUEBAS_POSITIVAS_DESDE_CERO_26jun.md` | Guion listo. |
| Lista de pendientes | `pendientes/PENDIENTES_MAESTRO_25jun.md` | Al día. |
| HU nuevas: Sustitución (art. 125) y Finiquito (art. 64) | `requisitos/Historias_Usuario_ACTUALIZADAS_12jun.md` (HU-22, HU-24) | Documentadas e implementadas. |
| Memoria técnica del sistema | `entrega_profe/MEMORIA_TECNICA_SIGECOP_26jun.md` | Lista. |
| Entorno montado + gestión de configuración | Render (deploy) + GitHub | Operativo. |
| Expediente de planes y soluciones | `entrega_profe/planes_y_soluciones/` (44 + índice) | Listo para el profe. |

---

## Dudosos / a confirmar con el profe (no construir sin confirmar)

| Tema | Cita | Por qué dudoso |
|---|---|---|
| Presentación/exposición del proyecto | `WhatsApp Audio 2026-06-09 at 6.41.32 PM`: *"que el 13 y 14 expongan… no, mejor como el 28 me entregan algo."* | El profe declinó las fechas; se concretó como pre-entrega 24 + revisión final, no como slides formales. |
| Cuadernillo de pruebas funcionales formales | `WhatsApp Audio 2026-05-18`: *"si pones 'pruebas funcionales' te comprometes a más; mejor 'criterios de aceptación'."* | Él mismo lo **relajó**: basta con criterios de aceptación en las historias. |
| Control de versiones/histórico de las historias | `Combinado_2026-06-22_2008.md`: *"ya no te lo puedo exigir la entrega… pero deberías tenerlo."* | Lo eximió de la entrega, aunque insiste en que deberían tenerlo (cubierto en parte por D). |
| RNF + ISO 25010/FURPS (entregable B) | (ver B) | Confirmar si es del profe de SIGECOP o de la materia de requerimientos. |

---

## Recomendación de prioridad para la revisión final

1. **A — Análisis de riesgos con seguimiento semanal + actas** (lo más pedido, lo más visible). 🔴
2. **C — Planeación de sprints + puntos** y **E — modelo E-R**, si hay tiempo. 🟡
3. **D — changelog** (rápido, alto valor de "cierre"). 🟡
4. **B — RNF/ISO/FURPS** solo tras confirmar materia. 🟡

> Todo lo anterior es **propuesta**. Las citas deben re-verificarse contra el audio antes de entregar; los archivos
> binarios (`.xlsx`/`.docx`/`.svg`) hay que abrirlos para confirmar si ya cubren lo pedido o solo lo inician.
