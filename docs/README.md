# docs/ — Índice de la documentación de SIGECOP

Documentación del proyecto **SIGECOP** (UAGRO, Etapa 1). Organizada por tipo.
La raíz de `docs/` solo contiene los índices/entregables vivos —este **README**, el
**[HISTORIAL_PROYECTO.md](HISTORIAL_PROYECTO.md)** (historia completa, narrada y enlazada),
**[REQUERIMIENTOS_PROFE_CONSOLIDADO.md](REQUERIMIENTOS_PROFE_CONSOLIDADO.md)** (todo lo que el profe
ha pedido, con cita y estado) y **[SEED_DEMO_SIGECOP.md](SEED_DEMO_SIGECOP.md)** (paquete de datos de
prueba + guion por HU)— más los archivos personales gitignorados; todo lo demás vive en una subcarpeta.

> **Para los equipos:** empiecen por `equipos/SETUP_LOCAL.md` (levantar el stack) →
> `equipos/GUIA_TRABAJO_EQUIPOS.md` (git/PR día a día) → su bloque en
> `equipos/Prompts_Accion_Equipos_SIGECOP.md`.
>
> **Para entender qué pasó y cuándo:** [HISTORIAL_PROYECTO.md](HISTORIAL_PROYECTO.md).

---

## Estructura

### `equipos/` — Partición, prompts y guías de trabajo de los 3 frentes
| Archivo | Contenido |
|---|---|
| `Plan_Particion_3Equipos_SIGECOP.md` | Plan completo: partición por dominio, fundación congelada, decisiones D-1…D-10, esquema, CI. |
| `Prompts_Accion_Equipos_SIGECOP.md` | Prompts listos para pegar por equipo (Fundación / Equipo 2 / Equipo 3) + base legal verificada. |
| `GUIA_TRABAJO_EQUIPOS.md` | Guía git/PR día a día (Windows + PowerShell), para quien nunca usó git. |
| `SETUP_LOCAL.md` | Levantar el stack local (Docker, Node, DBeaver, cuentas demo). |

### `contexto-claude/` — Contexto/estado VIGENTE del proyecto (para Claude y para el equipo)
| Archivo | Contenido |
|---|---|
| `SIGECOP_contexto_respaldo.md` | Respaldo de contexto para retomar en frío (la copia más completa; versiones previas en `historial/contexto/`). |
| `Contexto_Maestro_y_Plan_Correcciones_09jun.md` | Contexto maestro post-revisión del profe (hallazgos P/W, plan O0-O10, lista [validar]). |
| `Guia_Pruebas_E2E_SIGECOP.md` | Guía de demo/pruebas manuales de las HU integradas (versión actual). |
| `Plan_General_Trabajo_Restante.md` | Hoja de ruta al deadline del 25-jun (BD de Render). |
| `PLAN_CORRECCIONES_POST_PRUEBAS_14jun.md` | Plan de correcciones del ciclo 14-jun (BUG / BRECHA-LEY / [VALIDAR] / UX), derivado del análisis de la revisión de Maiki. |
| `PLAN_PRUEBAS_VALORES.md` | Guion manual E2E con valores pre-cuadrados (dataset OBRA-2026-PRUEBA-01) leídos del código. |
| `DECISIONES.md` | Bitácora de decisiones de la fase prototipo. ⚠️ Parcialmente desactualizada. |
| `Borrador_DDL_Tablas_Nuevas_SIGECOP.md` | DDL anticipado de tablas de los equipos (referencia citada por CLAUDE.md). |

### `legal/` — Leyes y análisis legal
| Archivo | Contenido |
|---|---|
| `LOPSRM.pdf`, `Reg_LOPSRM.pdf`, `LFD.pdf` | Textos legales fuente (Ley, Reglamento, Ley Federal de Derechos). |
| `Cobertura_Legal_LOPSRM.md`, `Cobertura_Legal_Reglamento.md` | Cobertura de validaciones contra cada artículo. |
| `Auditoria_Legal_SIGECOP.md` | Auditoría legal del sistema. |
| `Fundamento_Legal_Validaciones_HU-01.docx` | Fundamento legal de las validaciones del alta (HU-01). |

### `historial/` — Registro de TODO lo ejecutado (nada se borró; ver [HISTORIAL_PROYECTO.md](HISTORIAL_PROYECTO.md))
| Subcarpeta | Contenido |
|---|---|
| `fundacion/` | Pasadas de fundación de Maiki (A2, ALTA v2–v5, BITÁCORA v2, auditorías, ETAPA A/B/C, PLAN2, sustitución, convenios…), cada `*_Maiki.md` con su `*_DIFFS.patch`. |
| `oleadas/` | Oleadas O0–O9, O-PROFE y reskin UI-1/UI-2 (09–10 jun). |
| `revisiones-profe/` | Análisis de las revisiones del profe, hojas de reunión y contexto maestro superado (+ material gitignorado). Incluye el ciclo 14-jun: `Hoja_Validacion_Profe_Lunes.md` + `Respuestas_Hoja_Validacion_Profe_Lunes.md` (validación legal punto por punto), `ANALISIS_REVISION_ola.md` y las evidencias `ola.docx` / `SIGECOP — …Obra Pública.pdf`. |
| `integraciones-equipos/` | Integración de los PR de E3: HU-15 y HU-19 (11-jun) y HU-16 reingreso (14-jun). |
| `sesiones/` | Reportes de sesiones de orden/mantenimiento (REPORTE_SESION_ORDEN, FIXES_AUDITORIAS). |
| `planes/` | Planes ya ejecutados (Plan maestro UI estimación, Plan maestro 2, paralelización inicial). |
| `contexto/` | Versiones superadas de contextos/guías. |
| `_duplicados/` | Copias byte-a-byte apartadas (no borradas). |

### `analisis-y-diseno/` — Entregables académicos, matrices, maquetas y diagramas
| Archivo | Contenido |
|---|---|
| `Estudio_Factibilidad_Tecnica_SIGECOP.docx` | Estudio de factibilidad técnica. |
| `Historias_Usuario_ACTUALIZADAS_12jun.md` / `.xlsx` | **Versión vigente** de las historias: criterios que reflejan lo que el sistema HACE HOY (HU-00..21 + Registro/Por Firmar conservados + HU-22 roster, HU-23 empresas). |
| `AUDITORIA_COHERENCIA_HU.md` | Auditoría criterio-por-criterio ficha ↔ código (✅/🟡/❌ con evidencia `archivo:línea`); brechas y recomendaciones. |
| `AUDITORIA_CODIGO_MUERTO.md` | Barrido de código muerto clasificado por riesgo (lo eliminado + dudosos para decisión). |
| `Historias_Usuario.xlsx` | Las 22 HU formato del profe — **foto previa** (la actualizada es `Historias_Usuario_ACTUALIZADAS_12jun.*`); se conserva intacta. |
| `matriz_DEFINITIVA.xlsx` | Trazabilidad necesidades ↔ servicios ↔ módulos ↔ HU. |
| `Fichas_Trazabilidad.md` | Estado por HU (trazabilidad). ⚠️ Foto vieja del estado. |
| `Matriz_Control_Accesos_SIGECOP.md` | Matriz completa de accesos 21 HU × 5 roles (la versión corta superada quedó en `historial/contexto/`). |
| `Matriz_Permisos_SIGECOP.xlsx` | Matriz de permisos HU × rol. |
| `Plan_Pruebas_Sprints_1-3_SIGECOP.docx` | Plan de pruebas (sprints 1–3). |
| `Plan_Riesgos.xlsx` | Registro y seguimiento de riesgos. |
| `Maquetas_SIGECOP.html`, `Maquetas_SIGECOP.pptx` | Maquetas (interactivas / presentación). |
| `diagrama_arquitectura.png`, `Arquitectura_SIGECOP.svg` | Diagramas de arquitectura. |

### `planes/` — Planes de trabajo por sesión (working plans)
| Archivo | Contenido |
|---|---|
| `PLAN_REVISION_PROFE_15jun.md` | Plan de las 3 fases de la revisión del 15-jun (seed, amortización, empresas). |
| `PLAN_SESION_AUTONOMA_EMPRESAS_15jun.md` | Plan de la sesión autónoma: empresas catálogo seleccionable + consolidar requerimientos. |
| `PLAN_PULIDO_UX_14jun.md` | Plan de pulido UX (solo presentación). |
| `PLAN_ORDEN_Y_ACTUALIZACION_EQUIPOS_13jun.md` | Plan de reorganización de docs + actualización de historias + limpieza. |

### `reportes/` — Reportes y análisis (outputs de sesiones)
| Archivo | Contenido |
|---|---|
| `ANALISIS_PROFESOR_DETALLADO.md` | Síntesis del estilo/criterios del profe (4 audios tempranos). |
| `REPORTE_PULIDO_UX_14jun.md` | Reporte del pulido UX. |
| `REPORTE_LIMPIEZA.md` | Reporte de la limpieza de código muerto. |
| `REPORTE_SESION_AUTONOMA_EMPRESAS.md` | Reporte de la sesión autónoma de empresas (selector + seed). |

### `referencias/` — Material de referencia y utilidades
| Archivo | Contenido |
|---|---|
| `Acordeon_Defensa_SIGECOP.md` | Acordeón de defensa de Maiki (personal, gitignored). |
| `comandos usuario.txt` | Comandos de utilidad (crear/borrar usuario, local y Render). |

### `audios/` — Transcripciones de las revisiones del profe (gitignored)
Transcripciones `*_transcript.txt` de los audios del profe (12, 18, 25, 26-may; 01, 04, 09, 15-jun) y de
otras materias. Fuente de `REQUERIMIENTOS_PROFE_CONSOLIDADO.md`. **Gitignored** (nombran al profe).

### Otras
`capturas-ui1/`, `capturas-ui2/` (capturas del reskin guinda) · `Referencias-estimaciones/` (formatos
de carátula GACM/NAICM del profe, fotos).

---

## Fuera de control de versiones (gitignored — NO subir)

Estos archivos existen en disco pero **están en `.gitignore`** y no se versionan
(contraseñas, material interno que nombra al profe, backups, transcripciones, locks de Office):

- `Cuentas_Prueba_SIGECOP.md` (raíz de docs/) · `referencias/comandos usuario.txt` · `referencias/Acordeon_Defensa_SIGECOP.md`
- `audios/*_transcript.txt` (transcripciones de los audios del profe)
- `historial/revisiones-profe/Revision_Profesor_Sprint1-2_Analisis_y_Plan.md` y
  `…audio_profe_revision_01jun_transcript.txt` · `historial/_duplicados/Revision_Profesor_…_copia-exacta.md`
- `backups/` (raíz del repo): respaldos de la BD de Render (`render_backup_*.sql/.json`) y de las
  Historias (`*_BACKUP_*.xlsx`) · `~$*` (locks de Office)

> **Material de referencia / fases tempranas:** carpeta `/FEPI` en la raíz del repo.
