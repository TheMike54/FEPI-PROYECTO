# Empresas: Consolidacion

**Fecha real del plan:** 15-jun-2026  
**Fase del proyecto:** Consolidacion del padron de empresas y su relacion con usuarios y contratos

## Situacion / problema

El profesor habia observado que no debiamos capturar la empresa como texto suelto cada vez. Detectamos que, si cada persona escribia la razon social a mano, podiamos duplicar contratistas o supervisores con nombres ligeramente distintos. Eso afectaba el alta, el expediente, el control de acceso y la lectura del contrato.

Tambien necesitabamos distinguir entre empresa y persona: una empresa puede tener varias personas, y el contrato debe saber que empresa participa como contratista o supervision.

## Acciones realizadas

Trabajamos el padron de empresas para que el usuario pudiera elegir una empresa existente o registrar una nueva cuando correspondiera. Reforzamos la deduplicacion para evitar registros repetidos por diferencias menores en el nombre. Tambien relacionamos el contrato con la empresa participante, no solo con la persona.

Agregamos soporte para garantias y minutas como funciones reales: garantias por tipo, PDF de poliza, endosos y minutas o visitas vinculadas a notas de bitacora sin alterar las notas firmadas.

## Resultado

Dejamos el sistema mejor preparado para trabajar con empresas reales: elegimos del padron, evitamos duplicidad, mostramos la empresa correcta en el expediente y convertimos fianzas y minutas en funciones operables.

## Trazabilidad legal

- RLOPSRM art. 43: registro y seguimiento de contratistas.
- LOPSRM art. 48 y 66: garantias de cumplimiento, anticipo y vicios ocultos.
- RLOPSRM art. 91 y 98 fr. II: endosos o ajustes de garantia.
- RLOPSRM art. 123 fr. VI y X: inmutabilidad de notas y relacion con minutas.

**Puntos [verificar]:** criterio final sobre si el residente puede gestionar garantias y si la nota vinculada a una minuta debe estar firmada previamente.
