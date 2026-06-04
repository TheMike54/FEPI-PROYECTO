# Auditoría de coherencia interna y vocabulario — SIGECOP (Fase 3)

**Fecha:** 24 de mayo de 2026
**Fase:** 3 (coherencia interna y vocabulario)
**Documentos auditados:** Estudio de Factibilidad, Historias de Usuario, matriz_DEFINITIVA, Plan de Riesgos.
**Comando:** `/auditar`

---

## Qué busca esta fase

A diferencia de F1 (citas legales correctas) y F2 (cobertura legal), la Fase 3 revisa cada documento contra sí mismo y contra los criterios de estilo del profesor: contradicciones internas, vocabulario rechazado (HTTP vs API REST, "pruebas funcionales" vs "criterios de aceptación", criterios en formato pregunta, escalas alto/medio/bajo vs métricas, menciones al profesor dentro de documentos, brochures, promesas mayores que entregas) y ambigüedades.

---

## Resumen por documento

| Documento | Resultado | Hallazgos |
|-----------|-----------|-----------|
| Estudio de Factibilidad Técnica | ✅ Muy sólido | 1 menor (vocabulario brochure) |
| Historias de Usuario | ✅ Impecable | 0 |
| matriz_DEFINITIVA | ✅ Limpio | 0 |
| Plan de Riesgos | ⚠️ Revisar | 2 (escalas sin definir, menciones al profesor) |

**Conclusión:** tres de los cuatro documentos están en muy buen estado. El Plan de Riesgos concentra los dos hallazgos accionables de esta fase.

---

## Estudio de Factibilidad Técnica — ✅ muy sólido

Lo que está bien (verificado):
- **Vocabulario correcto:** usa "API REST" (3 veces), "orquestador" (4), "transversal" (2), "capas" (58). Cero "HTTP", cero "pruebas funcionales".
- **Métricas en vez de escalas:** la curva de aprendizaje se expresa en días ("3–5 días"), los costos en USD ("0 USD/año"), los criterios en escala 1–5. No usa alto/medio/bajo para evaluar.
- **Coherencia con decisiones cerradas:** el "flujo de una petición típica" describe Vista → Backend (vía API REST) → orquestador → Control de Accesos → PostgreSQL. La vista nunca accede directo a la BD; el texto afirma "cada capa cumple su función exclusiva y ninguna invade el territorio de otra". Coincide exacto con la arquitectura acordada.
- **Honestidad técnica:** reconoce explícitamente que las alternativas evaluadas son técnicamente similares y evita "la justificación inflada habitual de los estudios comerciales". Esto es lo opuesto a un brochure y el profesor lo premia.

**Hallazgo F3-E1 (menor):** una frase dice "tres tecnologías líderes para construir interfaces web". "Líderes" es un leve toque de brochure.
**Recomendación:** opcional, cambiar a "tres tecnologías ampliamente usadas". Prioridad baja.

---

## Historias de Usuario — ✅ impecable

Verificado en las 22 HU:
- **Número de criterios:** todas tienen 2 o 3 criterios de aceptación. Ninguna excede el máximo de 3.
- **Formato aseveración:** ninguna CA está en formato pregunta. Todas son aseveraciones verificables.
- **Vocabulario:** sin "HTTP", sin "pruebas funcionales", sin escalas alto/medio/bajo, sin menciones al profesor.

Sin hallazgos.

---

## matriz_DEFINITIVA — ✅ limpio

- **Coherencia estructural:** 21 servicios mapeados 1:1 con 21 HU. Sin servicios huérfanos ni HU sin servicio.
- **Sin menciones al profesor.**
- (Recordatorio: en la Fase de aplicación previa se le agregaron los arts. 53 y 118, y se corrigió la materia mal etiquetada del art. 53.)

Sin hallazgos nuevos en esta fase.

---

## Plan de Riesgos — ⚠️ 2 hallazgos accionables

### Hallazgo F3-R1 — Escalas Alto/Medio/Bajo sin definición operativa
**Situación:** los 12 riesgos se evalúan con Probabilidad (Alta/Media/Baja), Impacto (Alto/Medio/Bajo) y Nivel (Crítico/Alto/Medio). No existe una tabla que defina qué significa cada nivel.
**Tensión a resolver:** en gestión de riesgos, las escalas cualitativas son convención estándar (ISO 31000, PMBOK), así que no son un error de fondo. PERO el profesor rechaza las escalas alto/medio/bajo cuando no están ancladas a un criterio, porque resultan subjetivas ("¿Impacto Alto comparado con qué?").
**Recomendación (nivel 2 del árbol — decisión del usuario):** mantener las escalas (son lo correcto para riesgos) PERO **agregar una tabla de criterios** que defina cada nivel con una métrica, por ejemplo:
   - Probabilidad Alta = >60% de ocurrir durante el proyecto; Media = 30–60%; Baja = <30%.
   - Impacto Alto = retrasa la entrega más de 1 semana o exige rehacer una HU completa; Medio = retraso de 1–5 días; Bajo = absorbible dentro del sprint.
Esto convierte la escala subjetiva en una escala con criterio medible — que es justo lo que el profesor pide, sin inventar una precisión falsa (no tendría sentido poner "probabilidad 47%"). Certeza ALTA sobre la mejora; la decisión de los umbrales exactos es tuya.

### Hallazgo F3-R2 — Menciones directas al profesor dentro del documento
**Situación:** el profesor es nombrado explícitamente en varios lugares:
- **R-09** está titulado "El profesor solicita cambios mayores que rompen historias ya implementadas" (aparece en Índice, Riesgos_actuales y Matriz_Riesgo_Servicio).
- **R-05** mitigación: "Documentar al profesor que este comportamiento corresponde al plan gratuito…".
- **R-12** descripción: "Si el profesor tarda en revisar las maquetas…".
- **Bitácora_seguimiento:** varias notas como "audio del profesor del 12 may / 18 may".
**Por qué importa:** el profesor rechaza ser mencionado dentro de los documentos del proyecto. Además, en lenguaje de gestión de proyectos, su rol es el de **cliente / sponsor / parte evaluadora**, no "el profesor".
**Recomendación:** reformular todas las menciones a términos neutrales y profesionales, conservando el riesgo (que es real y legítimo). Ejemplos:
   - R-09 → "Solicitud de cambios mayores de alcance por parte del cliente que rompen historias ya implementadas".
   - R-05 → "Documentar al cliente que este comportamiento corresponde al plan gratuito…".
   - R-12 → "Si la aprobación de maquetas se retrasa…".
   - Bitácora → "feedback del cliente del 12 may", etc.
Certeza ALTA. **Prioridad alta** — es el hallazgo más visible de esta fase, porque toca directamente algo que el profesor castiga.

---

## Recomendaciones priorizadas (Fase 3)

| Prioridad | Documento | Acción |
|-----------|-----------|--------|
| **Alta** | Plan de Riesgos | Reformular menciones al profesor → "cliente / parte evaluadora" (F3-R2) |
| Media | Plan de Riesgos | Agregar tabla de criterios que defina cada nivel de probabilidad/impacto (F3-R1) |
| Baja | Estudio de Factibilidad | Cambiar "tecnologías líderes" → "ampliamente usadas" (F3-E1) |

---

## Estado del plan de auditoría tras la Fase 3

- F1 — Verificación de citas: ✅ Completa
- F2 — Cobertura legal: ✅ Completa
- F3 — Coherencia interna y vocabulario: ✅ Completa (este reporte)
- F4 — Aplicar hallazgos pendientes: ⬜ por hacer (F3-R2, F3-R1, F3-E1 + los de F2 de prioridad media y H-2 de F1)
