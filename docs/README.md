# docs/ — Índice de la documentación de SIGECOP

Documentación del proyecto **SIGECOP** (UAGRO, Etapa 1), organizada **por función**. Reorganizada el
**18-jun-2026** (ver `planes/PLAN_ORDENAMIENTO_DOCS_18jun.md`). **Nada se borró:** todo lo superado vive en
`historial/`. Una sola fuente por tipo: si dos docs compiten, **manda el de `estado/` / `requisitos/`** (y el
código manda sobre los docs).

> **Para retomar el proyecto en frío:** `estado/ESTADO_ACTUAL.md` (estado real del sistema) +
> `requisitos/Historias_Usuario_ACTUALIZADAS_12jun.md` (lo que debe hacer). Para los equipos:
> `equipos/SETUP_LOCAL.md` → `equipos/GUIA_TRABAJO_EQUIPOS.md` → su bloque en `equipos/Prompts_Accion_Equipos_SIGECOP.md`.

## Estructura

### `estado/` — Estado VIVO (lo que manda HOY)
| Archivo | Contenido |
|---|---|
| `ESTADO_ACTUAL.md` | **Documento CANÓNICO** del estado real del sistema (arquitectura, modelo de datos, flujos `archivo:función`, zona congelada, pendientes). |
| `HISTORIAL_PROYECTO.md` | Historia completa del proyecto, narrada y enlazada. |
| `PUNTO_DE_RETOMA_CLAUDE_18jun.md` | Handoff operativo "dónde me quedé". |
| `Borrador_DDL_Tablas_Nuevas_SIGECOP.md` | DDL anticipado de tablas nuevas (referencia, citada por CLAUDE.md). |
| `DECISIONES.md` | Bitácora de decisiones (parcialmente histórica). |

### `requisitos/` — Lo que el sistema DEBE hacer (historias, trazabilidad, accesos, requerimientos)
| Archivo | Contenido |
|---|---|
| `Historias_Usuario_ACTUALIZADAS_12jun.md` / `.xlsx` | **Historias CANÓNICAS** (criterios = comportamiento real). |
| `HISTORIAS_POR_CICLOS.md` | Vista por ciclos + clasificación TIPO A/B (wizard/paralelos). |
| `AUDITORIA_COHERENCIA_HU.md` | Auditoría criterio-por-criterio ficha ↔ código (evidencia `archivo:línea`). |
| `Matriz_Control_Accesos_SIGECOP.md` · `Matriz_Permisos_SIGECOP.xlsx` | Accesos HU × rol. |
| `Fichas_Trazabilidad.md` · `matriz_DEFINITIVA.xlsx` | Trazabilidad necesidades ↔ servicios ↔ HU. |
| `REQUERIMIENTOS_PROFE_CONSOLIDADO.md` | Todo lo que el profe ha pedido, con cita y estado. |
| `AUDITORIA_COBERTURA_PROFE.md` · `VALIDACIONES_PROFE_pendientes.md` | Inventario de `[validar profe]` legítimos + buzón de decisiones del profe. |
| `REPORTE_REESTRUCTURACION_HISTORIAS_POR_CICLOS.md` | Regla de oro + enfoque por ciclos. |
| `Historias_Usuario.xlsx` | Las 22 HU en formato del profe (foto previa). |

### `entrega_profe/` — Paquete para revisión del profesor (lectura directa, sin jerga interna)
| Archivo | Contenido |
|---|---|
| `README.md` | Índice del paquete (orden de lectura). |
| `MEMORIA_TECNICA_SIGECOP_26jun.md` | Memoria técnica consolidada del sistema (arquitectura, datos, módulos por HU, reglas de cálculo, base legal). |
| `MATRIZ_DE_PERMISOS_26jun.md` | Matriz de permisos por rol × HU + fundamento. |
| `planes_y_soluciones/` | Expediente cronológico de planes y soluciones (44 docs + `INDICE.md`), redactado como relato del equipo. |

### `pruebas/` — Cómo probar el sistema
| Archivo | Contenido |
|---|---|
| `PLAN_PRUEBAS_FINAL_MATCH_18jun.md` | **Plan de pruebas CANÓNICO** (tras el rediseño match-mockup): un contrato de punta a punta, valores exactos, 🟢/🔴. |
| `SEED_DEMO_SIGECOP.md` | Guion del seed demo + datos por HU. |
| `Guia_Pruebas_E2E_SIGECOP.md` | Cómo correr los e2e. |

### `legal/` — Leyes y análisis legal
| Archivo | Contenido |
|---|---|
| `LOPSRM.pdf` · `Reg_LOPSRM.pdf` · `LFD.pdf` + `*_utf8.txt`/`*.txt` | Textos fuente (Ley, Reglamento, LFD) + extracciones de texto greppables. |
| `Cobertura_Legal_LOPSRM.md` · `Cobertura_Legal_Reglamento.md` · `Auditoria_Legal_SIGECOP.md` | Cobertura/auditoría de validaciones por artículo. |
| `Fundamento_Legal_Validaciones_HU-01.docx` | Fundamento del alta. |

### `planes/` — Planes VIGENTES
| Archivo | Contenido |
|---|---|
| `PLAN_REDISENO_MATCH_MOCKUP_18jun.md` | Plan del rediseño match-mockup (ejecutado). |
| `PLAN_ORDENAMIENTO_DOCS_18jun.md` | Plan de esta reorganización de docs. |
| `PLAN_ENTREGA_24jun.md` | Plan de entrega (24-jun). |
| `RUNBOOK_BD_RENDER_21jun.md` | Runbook de reconstrucción de la BD en Render (backup → DROP SCHEMA → schema → reseed). |
| `PLAN_ENTREGABLES_PROFE_26jun.md` | Propuesta de los entregables que aún faltan del profe (deducidos de los audios). |

### `reportes/` — Reportes y auditorías VIGENTES
`REPORTE_REDISENO_MATCH_MOCKUP_18jun` · `REPORTE_EJECUCION_PLAN_GRANDE_18jun` · `AUDITORIA_DE_ORDEN_18jun` ·
`ESTUDIO_FACTIBILIDAD_WIZARDS_PARALELOS_18jun` · `EVALUACION_MATCH_PROTOTIPO_CICLOS_18jun` ·
`AUDITORIA_LEGAL_HISTORIAS_18jun` · `INTERPRETACION_DE_HALLAZGOS` · `OLEADA1/2/3_FIXES_18jun` ·
`TABLA_VALIDAR_PROFE_RESUELTOS_18jun` + sus capturas (`screens-*/`).

### `mockups/` — `sigecop-prototipo-ciclos.html` (el único mockup válido).

### `equipos/` — Partición, prompts y guías de los 3 frentes
`Plan_Particion_3Equipos_SIGECOP.md` · `Prompts_Accion_Equipos_SIGECOP.md` · `GUIA_TRABAJO_EQUIPOS.md` ·
`SETUP_LOCAL.md` · `ACTUALIZACION_EQUIPOS_13jun.md`.

### `referencias/` — Material de consulta
Diagramas (`Arquitectura_SIGECOP.svg`, `diagrama_arquitectura.png`), entregables académicos
(`Estudio_Factibilidad_Tecnica_SIGECOP.docx`, `Plan_Pruebas_Sprints_1-3_SIGECOP.docx`, `Plan_Riesgos.xlsx`),
`Acordeon_Defensa_SIGECOP.md` (gitignored) y `comandos usuario.txt` (gitignored).

### `pendientes/` — Backlog y feedback de pantalla (lo que falta por resolver)
| Archivo | Contenido |
|---|---|
| `PENDIENTES_MAESTRO_25jun.md` | Backlog maestro de pendientes. |
| `OBSERVACIONES_PANTALLA_25jun.md` | Observaciones/bugs vistos en pantalla por Maiki (notas para firmar, fotos de avance, ciclo de estimación, pago, convenios, curva, expediente, bitácora, reportes, portafolio, sustitución). |
| `captura_feedback_campanita_25jun.png` | Captura que acompaña las observaciones. |

### `historial/` — TODO lo superado (nada se borró)
`fundacion/` · `oleadas/` · `contexto/` (contextos viejos) · `revisiones-profe/` · `planes/` (planes ejecutados) ·
`sesiones/` (reportes de sesión consolidados + briefs) · `integraciones-equipos/` · `analisis-y-diseno/` (maquetas
viejas, auditoría de código muerto) · `pruebas/` (planes/guiones de prueba superados) · `_duplicados/` ·
`codex-reorg-por-ciclo-26jun/` (reorganización por ciclo hecha con Codex; **archivo paralelo** que solapa los
subdirectorios de arriba — vista alternativa, conservada para que Maiki decida si la adopta como canónica).

---

## Fuera de control de versiones (gitignored — NO subir)
- `Cuentas_Prueba_SIGECOP.md` (raíz de `docs/`) · `referencias/Acordeon_Defensa_SIGECOP.md` · `referencias/comandos usuario.txt`
- `audios/*_transcript.txt` (transcripciones de los audios del profe) · `backups/` (raíz del repo) · locks de Office (`~$*`)

> **Material de referencia / curso:** carpeta `/FEPI` en la raíz del repo (PDFs de la materia; ajena a este flujo).
> **Runbook de backup:** `backend/scripts/backup_render.md` (vive junto al script).
