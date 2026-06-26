# Entrega al profesor — SIGECOP

Paquete documental para revisión. Está pensado para lectura directa: empiece por la memoria técnica para
entender el sistema, consulte la matriz de permisos para ver quién hace qué, y revise el expediente de planes
y soluciones para seguir el trabajo realizado a lo largo del proyecto.

## Contenido

| Documento | Qué es |
|---|---|
| `MEMORIA_TECNICA_SIGECOP_26jun.md` | Memoria técnica consolidada del sistema: arquitectura, modelo de datos, roles y sesiones, módulos por historia de usuario, reglas de cálculo y base legal. |
| `MATRIZ_DE_PERMISOS_26jun.md` | Matriz de permisos por rol e historia de usuario (qué puede ver/hacer cada rol), con su fundamento. |
| `ANALISIS_RIESGOS_SIGECOP_26jun.md` | Análisis de riesgos con **seguimiento semanal** (evolución de probabilidad/impacto) y los planes ejecutados que mitigaron cada riesgo, semana a semana. |
| `PLANEACION_SPRINTS_SIGECOP_26jun.md` | Planeación ágil: catálogo de las 24 historias con prioridad, complejidad y **puntos**, tabla de **sprints** y velocidad del equipo. |
| `MODELO_DATOS_SIGECOP_26jun.md` | Modelo de datos: diagrama entidad-relación, entidades por dominio, relaciones con cardinalidad, reglas de inmutabilidad y diccionario de datos. |
| `CHANGELOG_REVISIONES_SIGECOP_26jun.md` | Changelog por revisión del profe: qué pidió → qué se ajustó, en orden cronológico. |
| `planes_y_soluciones/` | Expediente cronológico de los planes de trabajo y sus soluciones. Empiece por `planes_y_soluciones/INDICE.md`. |

> **Borradores 26-jun (para validar con Maiki):** `ANALISIS_RIESGOS`, `PLANEACION_SPRINTS`, `MODELO_DATOS` y
> `CHANGELOG_REVISIONES` son reconstrucciones a partir del historial real; donde no hubo evidencia dura quedó marcado
> `[confirmar Maiki]`. Pendiente (no construido): requerimientos no funcionales + ISO 25010/FURPS (falta confirmar si
> es de esta materia).

## Cómo leerlo

1. `MEMORIA_TECNICA_SIGECOP_26jun.md` — panorama completo del sistema.
2. `MATRIZ_DE_PERMISOS_26jun.md` — control de accesos por rol.
3. `planes_y_soluciones/INDICE.md` — índice cronológico; desde ahí se abre el documento de cada plan
   (situación/problema → acciones realizadas → resultado → trazabilidad legal).

> Cada documento de `planes_y_soluciones/` está redactado como relato del equipo. Donde no se encontró una
> fecha explícita o un artículo legal exacto, quedó marcado `[verificar]` para confirmarlo con el profesor.
