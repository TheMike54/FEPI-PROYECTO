# docs/ — Índice de la documentación de SIGECOP

Documentación del proyecto **SIGECOP** (UAGRO, Etapa 1). Organizada por tipo.
La raíz de `docs/` solo contiene este índice; todo lo demás vive en una subcarpeta.

> **Para los equipos:** empiecen por `equipos/SETUP_LOCAL.md` (levantar el stack) →
> `equipos/GUIA_TRABAJO_EQUIPOS.md` (git/PR día a día) → su bloque en
> `equipos/Prompts_Accion_Equipos_SIGECOP.md`.

---

## Estructura

### `equipos/` — Partición, prompts y guías de trabajo de los 3 frentes
| Archivo | Contenido |
|---|---|
| `Plan_Particion_3Equipos_SIGECOP.md` | Plan completo: partición por dominio, fundación congelada, decisiones D-1…D-10, esquema, CI. |
| `Plan_Paralelizacion_Equipo_SIGECOP.md` | Modelo de integración (1 integrador), partición por dominio, secuencia de arranque. |
| `Prompts_Accion_Equipos_SIGECOP.md` | Prompts listos para pegar por equipo (Fundación / Equipo 2 / Equipo 3) + base legal verificada. |
| `GUIA_TRABAJO_EQUIPOS.md` | Guía git/PR día a día (Windows + PowerShell), para quien nunca usó git. |
| `SETUP_LOCAL.md` | Levantar el stack local (Docker, Node, DBeaver, cuentas demo). |

### `contexto-claude/` — Contexto/estado del proyecto (para Claude y para el equipo)
| Archivo | Contenido |
|---|---|
| `SIGECOP_contexto_respaldo.md` | Respaldo de contexto del proyecto. |
| `ESTADO_ACTUAL.md` | Estado REAL del sistema (auditoría read-only): qué HU son reales vs prototipo, A2, modo proyecto. |
| `DECISIONES.md` | Bitácora de decisiones. ⚠️ Parcialmente desactualizado (ver §2 de `ESTADO_ACTUAL.md`). |
| `Borrador_DDL_Tablas_Nuevas_SIGECOP.md` | Borrador de DDL de las tablas nuevas (NO aplicado a `schema.sql`). |
| `Auditoria_Coherencia_F3.md` | Auditoría de coherencia. |

### `legal/` — Leyes y análisis legal
| Archivo | Contenido |
|---|---|
| `LOPSRM.pdf`, `Reg_LOPSRM.pdf`, `LFD.pdf` | Textos legales fuente (Ley, Reglamento, Ley Federal de Derechos). |
| `Cobertura_Legal_LOPSRM.md`, `Cobertura_Legal_Reglamento.md` | Cobertura de validaciones contra cada artículo. |
| `Auditoria_Legal_SIGECOP.md` | Auditoría legal del sistema. |
| `Fundamento_Legal_Validaciones_HU-01.docx` | Fundamento legal de las validaciones del alta (HU-01). |

### `historial-cambios/` — Entregables de cada pasada de fundación (resumen `_Maiki.md` + `_DIFFS.patch`)
A2 (programa de obra) · CORRECCION_ALTA_4x · ALTA_v2 / v3 / v4 / v5 · BITACORA_v2 · BUGFIX_alta_bitacora · REGRESION_gating_alta.

### `analisis-y-diseno/` — Entregables académicos, matrices, maquetas y diagramas
| Archivo | Contenido |
|---|---|
| `Estudio_Factibilidad_Tecnica_SIGECOP.docx` | Estudio de factibilidad técnica. |
| `Historias_Usuario.xlsx` | 22 HU + plan de iteraciones. |
| `matriz_DEFINITIVA.xlsx` | Trazabilidad necesidades ↔ servicios ↔ módulos ↔ HU. |
| `Fichas_Trazabilidad.md` | Estado por HU (trazabilidad). |
| `Matriz_Control_Accesos_SIGECOP.md` | Matriz de control de accesos. |
| `Matriz_Control_Accesos_SIGECOP (1).md` | ⚠️ Copia duplicada de la anterior — conservada, pendiente de decidir cuál se queda. |
| `Matriz_Permisos_SIGECOP.xlsx` | Matriz de permisos HU × rol. |
| `Plan_Pruebas_Sprints_1-3_SIGECOP.docx` | Plan de pruebas (sprints 1–3). |
| `Plan_Riesgos.xlsx` | Registro y seguimiento de riesgos. |
| `Maquetas_SIGECOP.html`, `Maquetas_SIGECOP.pptx` | Maquetas (interactivas / presentación). |
| `diagrama_arquitectura.png`, `Arquitectura_SIGECOP.svg` | Diagramas de arquitectura. |

---

## Fuera de control de versiones (gitignored — NO subir)

Estos archivos existen en disco dentro de `docs/` pero **están en `.gitignore`** y no se versionan
(contraseñas, material interno que nombra al profe, backups, transcripciones, locks de Office):

`Cuentas_Prueba_SIGECOP.md` · `comandos usuario.txt` · `Acordeon_Defensa_SIGECOP.md` ·
`Revision_Profesor_Sprint1-2_Analisis_y_Plan.md` (+ copia `(1)`) ·
`WhatsApp Audio …_transcript.txt` · `Historias_Usuario_BACKUP_20260601.xlsx` · `~$*` (locks de Office).

> **Material de referencia / fases tempranas:** carpeta `/FEPI` en la raíz del repo.
