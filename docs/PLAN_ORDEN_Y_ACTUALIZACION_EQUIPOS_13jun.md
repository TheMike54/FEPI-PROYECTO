# PLAN v2 — Orden, doc maestro de continuidad, equipos y limpieza · 13 jun 2026

> **Para ejecutar con Claude Code, una FASE a la vez** (revisa e integra entre cada una).
> TODO local, sin commit/push. **NO se toca lógica de producción** salvo donde se indique explícitamente,
> y aun ahí solo de forma segura y reversible. La suite e2e (**258 passed · 8 skipped · 0 failed**) es la red:
> si baja, se revierte. Si hay una decisión de criterio, tomarla conservadora y documentarla; no preguntar.
> Cada fase trae su **PROMPT** listo para pegar.

Zona congelada (NO tocar nunca aquí): auth, G1-G8 del alta, lógica de cálculo de carátula, `permisos.js`,
`server.js`, triggers de inmutabilidad, `schema.sql` salvo aditivo idempotente.

---

## FASE 1 — Segundo barrido de orden de archivos (SEGURA · solo mover/renombrar)

**Objetivo:** dejar el repo ordenado (archivos sueltos recientes, backups en su carpeta, duplicados apartados).

**PROMPT:**
```
Soy Maiki. FASE 1 — segundo barrido de ORDEN de archivos. LOCAL, sin commit/push. NO toques código de producción (solo mover/renombrar/.gitignore). Suite 258/8/0 al final.
1) Inventaría los .md sueltos generados tras la sesión de orden (HU19_REPORTES_INTEGRACION, FIXES_AUDITORIAS, AUDITORIA_CODIGO_MUERTO, REPORTE_SESION_ORDEN, INTEGRACION_*, etc.) y acomódalos con git mv en la estructura docs/historial/ por fase (integraciones-equipos/, oleadas/, etc.) y las auditorías en docs/analisis-y-diseno/. Nombres sin espacios ni sufijos _1.
2) Duplicados residuales (con espacios o _1 de subidas manuales): conserva la versión canónica, MUEVE las copias a docs/historial/_duplicados/. No borres nada.
3) Backups/dumps sueltos en la raíz y backend/ (*.dump, render_backup_*.sql, backups de .xlsx): consolida en una carpeta clara (backend/backups/ para .dump; crea backups/ en raíz si hace falta) y verifica que TODOS estén en .gitignore (traen datos reales, no se versionan).
4) Actualiza docs/HISTORIAL_PROYECTO.md y README.md para que los enlaces sigan correctos.
5) Reporta árbol antes/después. Suite verde. NO push.
```

---

## FASE 2 — Documento maestro "LEER PRIMERO" + disciplina de sincronía (SEGURA · docs)

**Objetivo (lo que pediste):** un documento canónico del estado del sistema que Code **lea SIEMPRE primero**, y
la regla de que **lo actualice con cada cambio** y revise que **las historias concuerden con el sistema** (si algo
se modifica -> actualizar el doc y la historia; si se construye algo sin historia -> reportarlo o agregarla). El
mecanismo: `CLAUDE.md` (la raíz, que Code lee automáticamente) ordena leer y mantener `ESTADO_ACTUAL.md`.

**PROMPT:**
```
Soy Maiki. FASE 2 — documento maestro de continuidad + disciplina de sincronía. LOCAL, sin commit/push. Solo lectura del código + escribir docs y CLAUDE.md. NO toques producción. Suite 258/8/0 al final.

A) Refresca/expande docs/contexto-claude/ESTADO_ACTUAL.md como el UNICO documento canónico del estado del sistema, leído de la realidad (código/git, no de lo que "debería"). Debe contener, conciso y técnico:
   - Cómo levantarlo (local + Render, cuentas demo, suite).
   - Arquitectura y estructura de carpetas real; dónde vive cada cosa.
   - Modelo de datos por dominio + triggers de inmutabilidad.
   - Flujos críticos con archivo:función: gating del alta (G1-G8), ciclo de estimación reconciliado (contratista presenta -> supervisión revisa/turna -> residencia autoriza -> finanzas paga), notas automáticas (atómico/diferido), carátula viva.
   - Matriz de roles/permisos (de permisos.js real).
   - Catálogo de HU 00-23 con estado (funcional/parcial/pendiente) y fundamento legal.
   - Zona congelada (qué no tocar).
   - Pendientes y [validar profe] abiertos.
   Pon en la cabecera la fecha y el commit de main.

B) Actualiza CLAUDE.md (raíz) con una REGLA PERMANENTE clara al inicio:
   - "ANTES de cualquier tarea, lee docs/contexto-claude/ESTADO_ACTUAL.md y docs/analisis-y-diseno/Historias_Usuario_ACTUALIZADAS."
   - "DESPUES de cualquier cambio que altere comportamiento o agregue funcionalidad: actualiza ESTADO_ACTUAL.md, y revisa que la(s) historia(s) afectada(s) concuerden con el sistema; si construiste algo sin historia, agrégala (siguiente número libre, sin renumerar las viejas) o repórtalo; si una historia ya no concuerda, actualízala. Citar artículo de ley o marcar [validar]."
   - Resumen de la zona congelada y del método de trabajo (Maiki integra/despliega; equipos por PR; Code en local sin push; oleadas).
   Mantén el contenido legal existente de CLAUDE.md (cita art. 138, etc.).

C) Verifica que ESTADO_ACTUAL.md y las Historias_Usuario_ACTUALIZADAS concuerden HOY (rápida pasada de coherencia); anota discrepancias. Suite verde. NO push.
```

---

## FASE 3 — Actualización para los equipos E2/E3 (SEGURA · docs)

**Objetivo:** ponerlos al día (van ~1 semana atrás; `main` cambió muchísimo) para que rebasen y sus HU encajen.

**PROMPT:**
```
Soy Maiki. FASE 3 — documento de actualización para los equipos. LOCAL, sin commit/push. Solo docs. Apóyate en ESTADO_ACTUAL.md (Fase 2) y el historial; verifica contra git.
Genera docs/equipos/ACTUALIZACION_EQUIPOS_13jun.md con:
1) AVISO central: main cambió muchísimo en ~1 semana; DEBEN git fetch + rebasar su rama sobre origin/main actual antes de seguir o tendrán conflictos grandes y supuestos obsoletos.
2) Qué cambió, accionable: (a) FLUJO DE ESTIMACION INVERTIDO — contratista presenta (HU-13) -> supervisión revisa/observa/turna (HU-15) -> residencia autoriza (HU-15) -> finanzas paga (HU-21); estados internos vs etiquetas. (b) Reskin UI guinda: usar los componentes de frontend/src/components/ui/. (c) Tablas nuevas (plan_amortizacion, empresas+usuarios.empresa_id, convenios.nota_id, tipo nota 'atraso'); esquema idempotente; Render ya migrado. (d) Reglas: avance excede periodo AVISA no bloquea (solo art.118/conceptos fuera de catálogo bloquean); notas de consecuencia (atraso/convenio) las emite el residente; amortización = art.138. (e) Zona congelada.
3) Pendientes por equipo: E3 -> HU-16 (desbloqueada), HU-18, HU-20, GENERADORES Y SOPORTES (RLOPSRM art.132, lo que el profe reclama), R4 de HU-19. E2 -> apertura narrativa de bitácora, vincular minuta<->nota (HU-11, minutas.nota_id huérfana), tipos de nota por rol.
4) Cómo entregar: por PR sobre main actual; solo Maiki integra; citar artículo o [validar]; suite verde antes del PR. Deadline: BD Render ~25 jun, entrega ~28 jun.
Genera también una versión corta "mensaje para pegar en el chat del equipo" (5-8 líneas). NO push.
```

---

## FASE 4 — Código muerto dudoso: PREPARAR decisión (SEGURA · no borra)

**Objetivo:** dejar listo el sí/no para Maiki, sin borrar todavía.

**PROMPT:**
```
Soy Maiki. FASE 4 — preparar la decisión de código muerto dudoso. LOCAL, sin commit/push. NO borres nada en esta fase. Re-verifica (por si alguna oleada los cableó) y deja en docs/ una tabla "borrar/conservar" con recomendación de cada uno:
- Componentes UI huérfanos sin importadores: Card.jsx, Badge.jsx, CardCriterioAceptacion.jsx.
- Wrapper api.health sin caller.
- (NO incluir BadgeSprint.jsx — stub intencional, se conserva.)
Para cada uno: ¿0 importadores hoy? evidencia (grep) + recomendación. Suite verde (no debería cambiar). NO push.
```
> Tras esto, Maiki decide. Si dice "borra X", una micro-fase: Code borra solo esos, corre la suite, y si queda verde, listo.

---

## FASE 5 — Limpieza / optimización de mantenibilidad (RIESGO MEDIO · LA ULTIMA, con cuidado)

**Objetivo (lo que pediste):** que el código sea más limpio y eficiente DE PROGRAMAR (no de runtime), para que las
próximas modificaciones no sean un relajo. **Mismo comportamiento, mejor estructura.**

> ADVERTENCIA: refactor amplio antes de la entrega puede meter bugs sutiles. Por eso: SOLO lo de bajo riesgo ahora
> (frontend, helpers duplicados, código muerto ya decidido); el refactor profundo de controllers/lógica, **mejor
> DESPUES de la demo del profe**. Incremental, suite verde tras CADA tanda, revertir en rojo.

**PROMPT (ejecutar al final, idealmente tras la demo):**
```
Soy Maiki. FASE 5 — limpieza de MANTENIBILIDAD, comportamiento idéntico. LOCAL, sin commit/push. NO toques zona congelada (G1-G8, permisos.js, server.js, schema.sql, triggers, lógica de cálculo de carátula, auth). Trabaja en tandas pequeñas; corre la suite tras CADA tanda; si algo se pone rojo, revierte esa tanda. Suite final 258/8/0.
Alcance permitido (bajo riesgo):
1) Borrar el código muerto que Maiki ya autorizó (de la Fase 4).
2) DRY en frontend: extraer helpers duplicados (formato de moneda, fechas, etiquetas de estado — reusar estadoEstimacion.js; buscar lógica copiada entre páginas) a utilidades compartidas, sin cambiar comportamiento ni testids.
3) Consistencia: imports sin usar, nombres inconsistentes, componentes casi-duplicados que se puedan unificar SIN tocar su comportamiento.
4) En backend, SOLO refactors seguros y locales (extraer una función repetida idéntica, renombrar variable local, quitar import muerto) — NADA que cambie queries, validaciones, cálculos ni el flujo. Si un refactor de backend toca lógica o no estás seguro de que es 100% equivalente, NO lo hagas: anótalo como recomendación post-entrega.
Documenta cada tanda (qué unificaste, por qué es equivalente) en docs/REPORTE_LIMPIEZA.md, y una lista de "refactors mayores recomendados para después de la entrega". NO push.
```

---

## ORDEN SUGERIDO Y CIERRE
1. Fase 1 (orden) -> revisar/commitear.
2. Fase 2 (doc maestro + disciplina) -> revisar/commitear. **Desde aquí, toda sesión futura de Code lee ESTADO_ACTUAL primero y lo mantiene.**
3. Fase 3 (equipos) -> revisar; mandar la actualización a E2/E3.
4. Fase 4 (preparar dead code) -> Maiki decide.
5. **PRUEBAS MANUALES** (plan aparte) — de aquí salen ajustes finales.
6. Fase 5 (limpieza) — al final, idealmente tras la demo.

Tras cada fase: git add -A && git commit && git push (no hay DDL en ninguna). Suite verde antes de cada push.
