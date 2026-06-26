# Documentacion SIGECOP ordenada por ciclo

Esta carpeta aplica la organizacion por ciclo de trabajo acordada.

## Como navegar

1. `00_contexto_maestro`: punto de entrada, auditoria de documentos y respaldos de contexto.
2. `01_fundacion_01-05jun`: correcciones fundacionales, alta, bitacora, convenios, soporte a equipos y Plan 2.
3. `02_plan_maestro_09-10jun`: contexto maestro del 09-jun, oleadas O0-O9, UI y ajustes del profe.
4. `03_orden_limpieza_11-14jun`: orden, limpieza, codigo muerto, post-pruebas y revision 15-16jun.
5. `04_plan_grande_18jun`: plan grande, auditorias 18jun, oleadas fixes, redisenos, reportes y diagnostico 19jun.
6. `05_preentrega_21-23jun`: preentrega, datos demo, hallazgos, resoluciones y sesiones autonomas.
7. `06_entrega_pruebas_24-25jun`: entrega, pruebas positivas/negativas, B4, seed Render y bugs 25jun.
8. `07_soporte_pruebas_y_demo`: guiones, matrices, hojas de validacion, analisis transversales y plan UI.
9. `IA`: indice de documentos dirigidos a IA, sin moverlos de sus ciclos.
10. `99_superados`: documentos explicitamente superados.

## Regla para archivos hibridos

Cada archivo vive en un solo ciclo principal. Cuando tambien pertenece conceptualmente a otro ciclo, se documenta en el `README.md` del ciclo relacionado como referencia externa.

## Regla para archivos dirigidos a IA

Los archivos dirigidos a IA conservan su ubicacion por ciclo. `IA/` funciona como indice central con enlaces a los documentos IA directa e IA mixta.

## Pendientes tecnicos en raiz

Estos archivos quedaron fuera de `docs/` porque el entorno no permitio crear/copiar binarios o parches crudos desde shell, y `apply_patch` no puede mover archivos no UTF-8/binarios:

- `OLEADA1_fixes_revision_profe_09jun.patch` -> destino previsto: `02_plan_maestro_09-10jun`
- `SNAPSHOT_O1+UI1_pre-UI2_10jun.patch` -> destino previsto: `02_plan_maestro_09-10jun`
- `ola.docx` -> destino previsto: `07_soporte_pruebas_y_demo`
- `SIGECOP — Sistema de Gestión de Contratos de Obra Pública.pdf` -> destino previsto: `00_contexto_maestro`
