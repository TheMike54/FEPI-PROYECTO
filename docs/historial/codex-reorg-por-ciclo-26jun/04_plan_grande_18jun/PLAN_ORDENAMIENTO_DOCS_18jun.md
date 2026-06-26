# PLAN DE ORDENAMIENTO DE DOCUMENTOS — SIGECOP · 18-jun-2026 (solo el PLAN, NO ejecutar)

> Encargo de Maiki: inventariar **TODOS** los documentos del proyecto (no solo `docs/`), proponer la **mejor
> estructura de carpetas** y decir **qué va dónde / qué se consolida / qué se manda a `historial/`**. **NO se
> mueve nada** — esto es para que Maiki lo revise y apruebe. Inventario hecho con `find` real (excluyendo
> `node_modules`/`.git`/`dist`). Complementa y hace ACCIONABLE la `docs/reportes/AUDITORIA_DE_ORDEN_18jun.md`.

## 0. Resumen
- **~150 documentos** del proyecto (sin `node_modules`). De ellos, **~55 ya están en `docs/historial/`** (bien
  archivados — no se tocan). La "zona viva" son ~75 archivos en `docs/` (raíz y subcarpetas) + algunos fuera de
  `docs/` (raíz del repo, `FEPI/`, `backend/scripts/`).
- **Problema:** la raíz de `docs/` mezcla estado-vivo, pruebas, planes viejos y análisis; hay 3 planes de
  pruebas solapados y ~10 reportes de sesión ya consolidados. Cuesta saber "cuál manda".
- **Meta:** carpetas por **función** (estado vivo · requisitos · legal · pruebas · planes · reportes · mockups ·
  referencias · historial), **una sola fuente por tipo**, y todo lo superado en `historial/`.

---

## 1. ESTRUCTURA PROPUESTA (criterio: por función, una fuente por tipo)

```
docs/
  README.md                      ← índice/mapa de la carpeta (se actualiza)
  estado/                        ← ESTADO VIVO (lo que manda HOY)
  requisitos/                    ← historias + trazabilidad + accesos (lo que el sistema DEBE hacer)
  legal/                         ← leyes (PDF/txt) + coberturas + auditorías legales
  pruebas/                       ← plan de pruebas canónico + seed + cuentas + guía e2e
  planes/                        ← planes VIGENTES (en curso o de referencia activa)
  reportes/                      ← reportes VIGENTES (cierre de la ronda actual + evaluaciones)
  mockups/                       ← el mockup válido
  equipos/                       ← documentos de partición por equipos
  referencias/                   ← material de consulta (acordeón de defensa, PDFs de curso)
  historial/                     ← TODO lo superado (ya existe; se le suma lo de §3)
```
**Criterio:** (1) **estado/** y **requisitos/** son los canónicos — primero que cualquiera lee. (2) **pruebas/**
junta lo que se usa para probar (hoy disperso en raíz + contexto-claude). (3) **planes/** y **reportes/** solo
**vigentes**; lo ejecutado/superado baja a **historial/**. (4) `contexto-claude/` desaparece como carpeta: su
contenido vivo va a `estado/`, lo viejo a `historial/`. (5) Nada se borra: lo superado se **archiva**.

---

## 2. INVENTARIO + DESTINO PROPUESTO (zona viva)

> Leyenda destino: **estado/** · **requisitos/** · **legal/** · **pruebas/** · **planes/** · **reportes/** ·
> **mockups/** · **equipos/** · **referencias/** · **historial/** (archivar) · **(queda)** sin moverse.
> Estado: ✅ vigente · 🗄️ superado.

### 2.1 `docs/` (raíz)
| Archivo | De qué trata | Estado | Destino |
|---|---|---|---|
| `README.md` | Índice de docs | ✅ | (queda, actualizar) |
| `HISTORIAL_PROYECTO.md` | Bitácora narrativa del proyecto | ✅ | **estado/** |
| `PUNTO_DE_RETOMA_CLAUDE_18jun.md` | Handoff "dónde me quedé" | ✅ | **estado/** |
| `INTERPRETACION_DE_HALLAZGOS.md` | Hallazgos verificados que alimentan el plan | ✅ | **estado/** o **reportes/** |
| `REPORTE_REESTRUCTURACION_HISTORIAS_POR_CICLOS.md` | Regla de oro + enfoque por ciclos | ✅ | **requisitos/** |
| `REPORTE_EJECUCION_PLAN_GRANDE_18jun.md` | Cierre de la ronda Plan Grande | ✅ | **reportes/** |
| `PLAN_PRUEBAS_FINAL_MATCH_18jun.md` | **Plan de pruebas CANÓNICO** (tras match-mockup) | ✅ | **pruebas/** |
| `PLAN_PRUEBAS_FINAL_WIZARDS_18jun.md` | Plan de pruebas pre-match | 🗄️ | **historial/** (lo reemplaza MATCH) |
| `PLAN_PRUEBAS_VALORES_FINAL_18jun.md` | Plan de pruebas pre-wizards | 🗄️ | **historial/** |
| `GUION_PRUEBA_COMPLETO_18jun.md` · `GUION_PRUEBA_FUNCIONES_NUEVAS.md` | Guiones de prueba previos | 🗄️ | **historial/** |
| `SEED_DEMO_SIGECOP.md` | Guion del seed demo | ✅ | **pruebas/** |
| `Cuentas_Prueba_SIGECOP.md` | Cuentas demo | ✅ | **pruebas/** (gitignored si trae claves) |
| `AUDITORIA_COBERTURA_PROFE.md` | Inventario de `[validar profe]` legítimos | ✅ | **requisitos/** o **estado/** |
| `REQUERIMIENTOS_PROFE_CONSOLIDADO.md` | Consolidado de audios del profe | ✅ | **requisitos/** |
| `VALIDACIONES_PROFE_pendientes.md` | Buzón de decisiones del profe | ✅ | **requisitos/** |
| `PLAN_ENTREGA_24jun.md` | Plan de entrega 24-jun | ✅ parcial | **planes/** |
| `PLAN_GRANDE_IMPLEMENTACION_18jun.md` | Plan BLOQUE 1-4 (orquestado por PLAN_MAESTRO) | 🗄️ | **historial/** |
| `ANALISIS_REVISION_PROFE_16jun.md` · `ANALISIS_EMPRESAS_quien_administra.md` | Análisis previos (ya implementados) | 🗄️ | **historial/** |

### 2.2 `docs/contexto-claude/` → disolver
| Archivo | De qué trata | Estado | Destino |
|---|---|---|---|
| `ESTADO_ACTUAL.md` | **Documento CANÓNICO de estado** | ✅ **canónico** | **estado/** |
| `Borrador_DDL_Tablas_Nuevas_SIGECOP.md` | DDL anticipado (referencia para Maiki) | ✅ | **estado/** o **legal/**→**referencias/** |
| `DECISIONES.md` | Bitácora de decisiones | ✅ parcial | **estado/** |
| `Guia_Pruebas_E2E_SIGECOP.md` | Cómo correr e2e | ✅ parcial | **pruebas/** |
| `PLAN_PRUEBAS_VALORES.md` | Plan de pruebas más viejo | 🗄️ | **historial/** |
| `PLAN_CORRECCIONES_POST_PRUEBAS_14jun.md` | Correcciones ya ejecutadas | 🗄️ | **historial/** |
| `Contexto_Maestro_y_Plan_Correcciones_09jun.md` | Contexto viejo (lo reemplaza ESTADO_ACTUAL) | 🗄️ | **historial/** |
| `Plan_General_Trabajo_Restante.md` · `SIGECOP_contexto_respaldo.md` | Plan/respaldo viejos | 🗄️ | **historial/** |

### 2.3 `docs/analisis-y-diseno/` → `requisitos/` (lo vivo)
| Archivo | De qué trata | Estado | Destino |
|---|---|---|---|
| `Historias_Usuario_ACTUALIZADAS_12jun.md` | **Requisitos CANÓNICOS** | ✅ **canónico** | **requisitos/** |
| `HISTORIAS_POR_CICLOS.md` | Vista por ciclos + TIPO A/B | ✅ | **requisitos/** |
| `AUDITORIA_COHERENCIA_HU.md` | Auditoría criterio-por-criterio + evidencia técnica | ✅ | **requisitos/** |
| `Matriz_Control_Accesos_SIGECOP.md` · `Fichas_Trazabilidad.md` | Matriz de accesos / trazabilidad | ✅ ref | **requisitos/** |
| `Maquetas_SIGECOP.html` | Maquetas viejas (NO es el mockup válido) | 🗄️ | **historial/** |
| `Estudio_Factibilidad_Tecnica_SIGECOP.docx` · `Plan_Pruebas_Sprints_1-3_SIGECOP.docx` | Entregables académicos previos | ✅ ref | **referencias/** o (queda) |
| `AUDITORIA_CODIGO_MUERTO.md` · `DECISION_CODIGO_MUERTO_13jun.md` | Auditoría de código muerto (ya decidida) | 🗄️ | **historial/** |

### 2.4 `docs/planes/` (dejar solo VIGENTES; archivar ejecutados)
| Archivo | Estado | Destino |
|---|---|---|
| `PLAN_REDISENO_MATCH_MOCKUP_18jun.md` | ✅ (ejecutado, referencia de la ronda) | **planes/** (queda) |
| `PLAN_ORDENAMIENTO_DOCS_18jun.md` (este) | ✅ | **planes/** (queda) |
| `PLAN_MAESTRO_EJECUCION_18jun.md` · `PLAN_MITIGACION_HALLAZGOS_18jun.md` · `PLAN_REDISENO_BLOQUES_WIZARD_18jun.md` · `_BLUEPRINTS_OLEADA3_18jun.md` | ✅ ejecutados | **historial/** (tras integrar) |
| `PLAN_AMBIENTES_SISTEMA.md` · `PLAN_REVISION_PROFE_15jun.md` · `PLAN_REVISION_PROFE_16jun.md` · `PLAN_SESION_AUTONOMA_E2_18jun.md` · `PLAN_SESION_AUTONOMA_EMPRESAS_15jun.md` · `PLAN_PULIDO_UX_14jun.md` · `PLAN_ORDEN_Y_ACTUALIZACION_EQUIPOS_13jun.md` | 🗄️ ejecutados | **historial/** |

### 2.5 `docs/reportes/` (dejar VIGENTES; consolidar los de sesión)
| Archivo | Estado | Destino |
|---|---|---|
| `REPORTE_REDISENO_MATCH_MOCKUP_18jun.md` · `AUDITORIA_DE_ORDEN_18jun.md` · `ESTUDIO_FACTIBILIDAD_WIZARDS_PARALELOS_18jun.md` · `EVALUACION_MATCH_PROTOTIPO_CICLOS_18jun.md` · `AUDITORIA_LEGAL_HISTORIAS_18jun.md` (Task 1) | ✅ | **reportes/** (quedan) |
| `OLEADA1_FIXES_18jun.md` · `OLEADA2_FIXES_18jun.md` · `OLEADA3_FIXES_18jun.md` · `TABLA_VALIDAR_PROFE_RESUELTOS_18jun.md` | ✅ | **reportes/** (quedan) |
| `EVALUACION_MATCH_MOCKUP_18jun.md` | 🗄️ (lo reemplaza el de PROTOTIPO_CICLOS) | **historial/** |
| `REPORTE_PLAN_GRANDE_18jun.md` · `REPORTE_SESION_GRANDE_18jun.md` · `REPORTE_SESION_AUTONOMA_E2_18jun.md` · `REPORTE_SESION_AUTONOMA_EMPRESAS.md` · `REPORTE_BLOQUES_3_4_18jun.md` · `REPORTE_ACOTAMIENTO_EMPRESA_18jun.md` · `REPORTE_DISENO_NAV_BLOQUE4_18jun.md` · `REPORTE_PULIDO_UX_14jun.md` · `REPORTE_LIMPIEZA.md` · `ANALISIS_PROFESOR_DETALLADO.md` | 🗄️ (consolidados en `REPORTE_EJECUCION_PLAN_GRANDE`) | **historial/** |

### 2.6 `docs/legal/` (queda; solo reordenar internamente)
- **Quedan (✅):** `LOPSRM.pdf`, `Reg_LOPSRM.pdf`, `LFD.pdf`, los `.txt` (utf8/layout), `Cobertura_Legal_LOPSRM.md`, `Cobertura_Legal_Reglamento.md`, `Auditoria_Legal_SIGECOP.md`, `Fundamento_Legal_Validaciones_HU-01.docx`.
- Sugerencia menor: subcarpeta `legal/fuentes/` para los `.txt`/`.pdf` y dejar las coberturas/auditorías en `legal/`. (Opcional.)

### 2.7 `docs/equipos/`, `docs/referencias/`, `docs/mockups/`
- **equipos/** (5 archivos): ✅ útiles si vuelven los equipos → **equipos/** (quedan).
- **referencias/Acordeon_Defensa_SIGECOP.md**: ✅ → **referencias/** (queda).
- **mockups/sigecop-prototipo-ciclos.html**: ✅ **único válido** → **mockups/** (queda).

### 2.8 Fuera de `docs/` (raíz del repo y otros)
| Archivo | De qué trata | Estado | Destino propuesto |
|---|---|---|---|
| `CLAUDE.md` (raíz) | Instrucciones del proyecto | ✅ | (queda — debe vivir en la raíz) |
| `README.md` (raíz) | README del repo | ✅ | (queda) |
| `frontend/index.html` | HTML de Vite | ✅ código | (queda — no es doc) |
| `backend/scripts/backup_render.md` | Runbook de backup en Render | ✅ | **pruebas/** o `docs/operacion/` (o queda junto al script) |
| `FEPI/*.pdf` (5: Conceptos Ley OP, Deducciones/penalizaciones, LOPSRM síntesis, Mapa ISR, Penalizaciones) | Material de consulta del curso (FEPI) | ✅ ref | **referencias/** (subcarpeta `referencias/fepi/`) o dejar en `FEPI/` si es de otra materia |

### 2.9 `docs/historial/**` (~55 archivos)
- **YA están archivados** (fundacion, oleadas, contexto, revisiones-profe, planes, integraciones-equipos, sesiones, _duplicados). **Estado: 🗄️ correctos. Acción: ninguna** (solo recibirán lo que baje de §2.1–2.5).

---

## 3. CONSOLIDACIONES (no perder info, evitar duplicados)
1. **Plan de pruebas:** dejar **uno** canónico → `PLAN_PRUEBAS_FINAL_MATCH_18jun.md` (en `pruebas/`). Los otros 3
   (`_FINAL_WIZARDS`, `_VALORES_FINAL`, `contexto-claude/PLAN_PRUEBAS_VALORES`) + los 2 `GUION_PRUEBA_*` →
   `historial/` (la math es la misma; solo cambió la navegación).
2. **Reportes de sesión:** los ~10 de `reportes/` ya están consolidados en `REPORTE_EJECUCION_PLAN_GRANDE_18jun.md`
   → ese queda; los demás a `historial/`.
3. **Estado:** un solo doc vivo (`estado/ESTADO_ACTUAL.md`); los contextos viejos de `contexto-claude/` → `historial/`.
4. **Evaluaciones de match:** queda `EVALUACION_MATCH_PROTOTIPO_CICLOS`; la `EVALUACION_MATCH_MOCKUP` (con los 2
   mockups viejos) → `historial/`.

## 4. Estimación y orden de ejecución (cuando lo apruebes)
- **Riesgo:** 🟢 BAJO (mover archivos no afecta código). **Único cuidado:** los `.md` que enlazan a otros por
  ruta relativa (p. ej. `CLAUDE.md` cita `docs/estado/ESTADO_ACTUAL.md`) — al mover, **actualizar esos
  punteros** (CLAUDE.md, README de docs, y las referencias cruzadas). Lo hago con `git mv` (conserva historia) y
  una pasada de búsqueda/reemplazo de rutas.
- **Orden sugerido:** (1) crear carpetas `estado/ requisitos/ pruebas/`; (2) `git mv` de los ✅ a su carpeta;
  (3) `git mv` de los 🗄️ a `historial/` (con subcarpeta por tipo); (4) actualizar punteros en `CLAUDE.md` +
  `docs/README.md`; (5) verificar que no quedaron enlaces rotos (`grep` de rutas viejas).
- **Estimado:** ~30–40 `git mv` + ~10 ediciones de punteros. ~1 h.

> **NO ejecutado.** Cuando apruebes (total o parcial — p. ej. "solo consolida pruebas y baja reportes de
> sesión"), lo hago con `git mv` y actualizando los punteros, local sin push. La decisión de mover `FEPI/`
> (¿es de este proyecto o de otra materia?) y de gitignorar `Cuentas_Prueba` la confirmas tú.
