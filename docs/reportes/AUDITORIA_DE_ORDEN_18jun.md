# AUDITORÍA DE ORDEN — ¿en qué punto está TODO? (solo lectura) · 18-jun-2026

> Encargo de Maiki: entender el estado real antes de seguir. **Solo lectura + este documento.** Nada movido,
> nada cambiado. Datos obtenidos con `find`/`grep`/`git`, no de memoria. Local, sin push.

---

## SECCIÓN 1 — INVENTARIO DE DOCUMENTOS

**Conteo real:** ~140 `.md`. **87 ya están archivados** en `docs/historial/**` (fundacion 24, oleadas 13,
contexto 7, revisiones-profe 7, planes 3, integraciones 3, sesiones 2, _duplicados 1) → **VIEJOS, ya bien
guardados, no confunden**. La "zona viva" que importa hoy son ~53 `.md` fuera de `historial/`. Tabla de ESA
zona (✅ VIGENTE / 🟡 vigente-pero-redundante / 🗄️ SUPERADO → mover a historial):

### docs/ (raíz)
| Archivo | Estado | De qué trata (1 línea) |
|---|---|---|
| `README.md` | ✅ VIGENTE | Índice/entrada de `docs/`. |
| `HISTORIAL_PROYECTO.md` | ✅ VIGENTE | Bitácora narrativa del proyecto. |
| `PUNTO_DE_RETOMA_CLAUDE_18jun.md` | ✅ VIGENTE | Handoff operativo "dónde me quedé". |
| `REPORTE_EJECUCION_PLAN_GRANDE_18jun.md` | ✅ VIGENTE | Reporte de cierre Fase 6 (toda la ronda). |
| `PLAN_PRUEBAS_FINAL_WIZARDS_18jun.md` | ✅ VIGENTE (canónico de pruebas) | Plan de pruebas E2E definitivo con wizards. |
| `INTERPRETACION_DE_HALLAZGOS.md` | ✅ VIGENTE | Hallazgos verificados que alimentan el plan maestro. |
| `REPORTE_REESTRUCTURACION_HISTORIAS_POR_CICLOS.md` | ✅ VIGENTE | Regla de oro + enfoque de historias por ciclos. |
| `Cuentas_Prueba_SIGECOP.md` | ✅ VIGENTE | Cuentas demo (gitignored si tiene claves). |
| `SEED_DEMO_SIGECOP.md` | ✅ VIGENTE | Guion del seed demo. |
| `AUDITORIA_COBERTURA_PROFE.md` | ✅ VIGENTE | Inventario clasificado de los `[validar profe]` legítimos del profe. |
| `REQUERIMIENTOS_PROFE_CONSOLIDADO.md` | ✅ VIGENTE | Consolidado de audios del profe. |
| `VALIDACIONES_PROFE_pendientes.md` | ✅ VIGENTE | Lista de decisiones que SÍ le tocan al profe. |
| `PLAN_PRUEBAS_VALORES_FINAL_18jun.md` | 🟡 SUPERADO | Plan de pruebas PRE-wizards (lo reemplaza `..._FINAL_WIZARDS_18jun`). |
| `GUION_PRUEBA_COMPLETO_18jun.md` | 🗄️ SUPERADO | Guion de prueba previo (lo cubre el plan de wizards). |
| `GUION_PRUEBA_FUNCIONES_NUEVAS.md` | 🗄️ SUPERADO | Guion parcial previo. |
| `PLAN_GRANDE_IMPLEMENTACION_18jun.md` | 🗄️ SUPERADO | Plan BLOQUE 1-4 (lo orquesta `PLAN_MAESTRO_EJECUCION`). |
| `PLAN_ENTREGA_24jun.md` | 🟡 vigente parcial | Plan de entrega; útil pero solapa con el handoff. |
| `ANALISIS_REVISION_PROFE_16jun.md` | 🗄️ SUPERADO | Análisis previo a la revisión 16-jun. |
| `ANALISIS_EMPRESAS_quien_administra.md` | 🗄️ SUPERADO | Análisis de quién administra empresas (ya implementado). |

### docs/contexto-claude/
| Archivo | Estado | 1 línea |
|---|---|---|
| `ESTADO_ACTUAL.md` | ✅ **CANÓNICO (estado vivo)** | **El único doc de estado del sistema.** |
| `Borrador_DDL_Tablas_Nuevas_SIGECOP.md` | ✅ VIGENTE | DDL anticipado (referencia para Maiki). |
| `PLAN_PRUEBAS_VALORES.md` | 🗄️ SUPERADO | Plan de pruebas más viejo aún. |
| `PLAN_CORRECCIONES_POST_PRUEBAS_14jun.md` | 🗄️ SUPERADO | Correcciones post-pruebas (ya ejecutadas). |
| `Contexto_Maestro_y_Plan_Correcciones_09jun.md` | 🗄️ SUPERADO | Contexto viejo (lo reemplaza ESTADO_ACTUAL). |
| `DECISIONES.md` | 🟡 vigente parcial | Bitácora de decisiones; útil pero envejecida. |
| `Plan_General_Trabajo_Restante.md` | 🗄️ SUPERADO | Plan de trabajo restante viejo. |
| `SIGECOP_contexto_respaldo.md` | 🗄️ SUPERADO | Respaldo de contexto viejo. |
| `Guia_Pruebas_E2E_SIGECOP.md` | 🟡 vigente parcial | Guía de cómo correr e2e (sigue útil). |

### docs/planes/
| Archivo | Estado | 1 línea |
|---|---|---|
| `PLAN_MAESTRO_EJECUCION_18jun.md` | ✅ VIGENTE (ejecutado) | Orquesta Fases 0-6; ya ejecutado. |
| `PLAN_MITIGACION_HALLAZGOS_18jun.md` | ✅ VIGENTE (ejecutado) | Oleadas 1-3 de bugs/ley. |
| `PLAN_REDISENO_BLOQUES_WIZARD_18jun.md` | ✅ VIGENTE (ejecutado) | Diseño de los wizards. |
| `_BLUEPRINTS_OLEADA3_18jun.md` | ✅ VIGENTE (ejecutado) | Blueprints quirúrgicos de Oleada 3. |
| `PLAN_AMBIENTES_SISTEMA.md` | 🗄️ SUPERADO | Plan de "7 ambientes" (origen de los cascarones; ya superado por los wizards). |
| `PLAN_REVISION_PROFE_15jun.md` | 🗄️ SUPERADO | Plan de revisión 15-jun (ejecutado). |
| `PLAN_REVISION_PROFE_16jun.md` | 🗄️ SUPERADO | Plan de revisión 16-jun (ejecutado). |
| `PLAN_SESION_AUTONOMA_EMPRESAS_15jun.md` | 🗄️ SUPERADO | Plan sesión empresas (ejecutado). |
| `PLAN_SESION_AUTONOMA_E2_18jun.md` | 🗄️ SUPERADO | Plan sesión E2 (ejecutado). |
| `PLAN_PULIDO_UX_14jun.md` | 🗄️ SUPERADO | Plan de pulido UX (ejecutado). |
| `PLAN_ORDEN_Y_ACTUALIZACION_EQUIPOS_13jun.md` | 🗄️ SUPERADO | Plan de orden equipos (ejecutado). |

### docs/reportes/
| Archivo | Estado | 1 línea |
|---|---|---|
| `OLEADA1_FIXES_18jun.md` / `OLEADA2_FIXES_18jun.md` / `OLEADA3_FIXES_18jun.md` | ✅ VIGENTE | Reportes de las 3 oleadas de esta ronda. |
| `EVALUACION_MATCH_PROTOTIPO_CICLOS_18jun.md` | ✅ VIGENTE | Evaluación de match con el mockup (la última, válida). |
| `EVALUACION_MATCH_MOCKUP_18jun.md` | 🟡 SUPERADO | Evaluación previa (con los 2 mockups; ya solo vale el de ciclos). |
| `TABLA_VALIDAR_PROFE_RESUELTOS_18jun.md` | ✅ VIGENTE | Tabla maestra de `[validar profe]` resueltos. |
| `AUDITORIA_DE_ORDEN_18jun.md` | ✅ VIGENTE | **Este documento.** |
| `REPORTE_PLAN_GRANDE_18jun.md` | 🗄️ SUPERADO | Reporte previo (lo reemplaza `REPORTE_EJECUCION_PLAN_GRANDE`). |
| `REPORTE_SESION_GRANDE_18jun.md` · `REPORTE_SESION_AUTONOMA_E2_18jun.md` · `REPORTE_SESION_AUTONOMA_EMPRESAS.md` · `REPORTE_BLOQUES_3_4_18jun.md` · `REPORTE_ACOTAMIENTO_EMPRESA_18jun.md` · `REPORTE_DISENO_NAV_BLOQUE4_18jun.md` · `REPORTE_PULIDO_UX_14jun.md` · `REPORTE_SESION_AUTONOMA_EMPRESAS.md` · `REPORTE_LIMPIEZA.md` · `ANALISIS_PROFESOR_DETALLADO.md` | 🗄️ SUPERADO (valor histórico) | Reportes de sesiones previas; consolidados en `REPORTE_EJECUCION_PLAN_GRANDE`. |

### docs/analisis-y-diseno/ · docs/legal/ · docs/equipos/ · docs/referencias/
| Archivo | Estado | 1 línea |
|---|---|---|
| `analisis-y-diseno/Historias_Usuario_ACTUALIZADAS_12jun.md` | ✅ **CANÓNICO** | Requisitos vigentes (criterios = sistema real). |
| `analisis-y-diseno/HISTORIAS_POR_CICLOS.md` | ✅ VIGENTE | Vista por ciclos + checklist de conservación. |
| `analisis-y-diseno/AUDITORIA_COHERENCIA_HU.md` | ✅ VIGENTE | Auditoría criterio-por-criterio de HU. |
| `analisis-y-diseno/Matriz_Control_Accesos_SIGECOP.md` · `Fichas_Trazabilidad.md` | 🟡 vigente parcial | Matriz de accesos / trazabilidad (referencia). |
| `analisis-y-diseno/AUDITORIA_CODIGO_MUERTO.md` · `DECISION_CODIGO_MUERTO_13jun.md` | 🗄️ SUPERADO | Auditoría de código muerto (ya decidida). |
| `legal/Auditoria_Legal_SIGECOP.md` · `Cobertura_Legal_LOPSRM.md` · `Cobertura_Legal_Reglamento.md` | ✅ VIGENTE (referencia legal) | Cobertura legal (referencia). |
| `equipos/*` (5) | 🟡 vigente parcial | Docs de partición por 3 equipos; útiles si vuelven los equipos. |
| `referencias/Acordeon_Defensa_SIGECOP.md` | ✅ VIGENTE | Acordeón de defensa para la entrega. |

### Propuesta (NO ejecutada — tú decides)
- **Canónicos / estado vivo (NO tocar):** `ESTADO_ACTUAL.md` (estado), `Historias_Usuario_ACTUALIZADAS_12jun.md`
  + `HISTORIAS_POR_CICLOS.md` (requisitos), `legal/*` (ley), `PLAN_PRUEBAS_FINAL_WIZARDS_18jun.md` (pruebas),
  `PUNTO_DE_RETOMA_CLAUDE_18jun.md` + `REPORTE_EJECUCION_PLAN_GRANDE_18jun.md` (handoff/cierre),
  `AUDITORIA_COBERTURA_PROFE.md` + `TABLA_VALIDAR_PROFE_RESUELTOS_18jun.md` (validar-profe), `Cuentas`/`SEED`.
- **Consolidar:** los ~10 reportes de sesión de `docs/reportes/` ya están consolidados en
  `REPORTE_EJECUCION_PLAN_GRANDE_18jun.md` → ese es el único "registro de esfuerzo" que hace falta.
- **Mover a `docs/historial/` (cuando digas):** los 🗄️ SUPERADO de arriba (planes ya ejecutados, reportes de
  sesión consolidados, guiones de prueba viejos, contextos viejos). Estimado: ~22 archivos.
- **Regla para no repetir el desorden:** un solo doc de estado (`ESTADO_ACTUAL.md`), un solo plan de pruebas
  (`..._FINAL_WIZARDS`), un solo reporte de cierre por ronda; lo demás nace ya en `docs/historial/`.

---

## SECCIÓN 2 — ESTADO DE LOS 3 PLANES (con evidencia git)

> **Evidencia base (git):** último commit = `dd6ef8b` (BLOQUE 3/4 empresas+navegación). El trabajo de ESTA
> ronda está **sin commitear**: `git status` = **60 modificados (M) + 36 nuevos (??) + 2 borrados (D)**.
> **Todo LOCAL, nada integrado/pusheado.**

### a) PLAN GRANDE (wizards + Oleada 3 legal) — ✅ EJECUTADO · 🟠 SOLO LOCAL (sin integrar)
- **Oleada 3 (ley, 5/5):** hecha. Evidencia (`git status` / archivos):
  - `M backend/src/controllers/instruccion-pago.controller.js` (3.1 partida+FK)
  - `M backend/src/controllers/convenios.controller.js` + `M convenios.routes.js` (3.2 autorización)
  - `?? backend/scripts/migracion_hu20_partida_fk.sql` · `?? migracion_convenio_autorizacion.sql` ·
    `?? avance_append_only.sql` (3.3) — **las 4 DDL aplicadas en BD local, verificado** (auditoría #3 de la sesión anterior).
- **Fases 3-6 (wizards):** hechas. Evidencia:
  - `M frontend/src/pages/IntegracionEstimacion.jsx` (wizard estimación 5 pasos)
  - `M frontend/src/pages/TransitoPago.jsx` (wizard pago 3 pasos)
  - `M frontend/src/pages/AmbienteBitacora.jsx` · `M AmbienteAvance.jsx` (wizards bitácora/avance)
  - `M frontend/src/components/layout/Sidebar.jsx` (quitó "Recorrido" SOLO de estimación)
  - Specs nuevos/reescritos (`hu20-partida-fk`, `convenio-autorizacion`, `pago-wizard`, etc.).
- **Suite:** 338 passed · 8 skipped · 0 failed (corrida limpia).
- **Falta:** que **Maiki integre** (commit/push de los M+?? + las 4 DDL a `schema.sql` + Render) y decida los `[validar]`.

### b) PLAN DE ERRORES (bugs + resolver todos los [validar profe] con la ley) — ✅ COMPLETO
- **Bugs:** Oleadas 1-2 (sesiones previas, commiteadas: `b5f0a68`, `dd6ef8b`) + Oleada 3 (esta ronda, local).
- **`[validar profe]`:** **CERO en código vivo y en las historias** (ver Sección 3, con grep). Los que quedan
  en docs son **decisiones legítimas del profe** (inventario en `AUDITORIA_COBERTURA_PROFE.md` §5.c) +
  meta-referencias. Evidencia: commits `6724e9e`, `864564d`, `dd6ef8b` (BLOQUE 3 "validar a cero — 159 marcas").
- **Pendiente:** solo lo que por diseño le toca al profe (no son bugs) + 2 `[validar]` NUEVOS de alcance de esta
  ronda (ITEM 3.1 multi-partida; ITEM 3.2 diferir efecto del convenio).

### c) PLAN DE DISEÑO (match con `sigecop-prototipo-ciclos.html`) — 🟡 A MEDIAS
- **Hecho:** la **sustancia** (wizards con stepper) para Alta/Estimación/Pago/Bitácora; Estimación 100%
  consolidada (padre=wizard, sin "Recorrido"). Evidencia: los 4 wizards + `HISTORIAS_POR_CICLOS.md`.
- **Falta:** (1) **quitar "Recorrido por bloques"** de los otros 5-6 flujos (residuo en `Sidebar.jsx` L56-74);
  (2) opcional: **sidebar plano** + "en paralelo" interno (el armazón del mockup). Evidencia/análisis:
  `EVALUACION_MATCH_PROTOTIPO_CICLOS_18jun.md` (riesgo: 31 specs asertan el sidebar → aplanar es ROJO a 6 días).
- **Estado:** decisión tuya — recomendado solo quitar el residuo (VERDE); aplanar = post-entrega.

---

## SECCIÓN 3 — AUDITORÍA DE `[validar profe]` (grep real)

> Comandos: `grep -rniE "\[validar profe" backend/src frontend/src docs` (refinado, sin `docs/historial` ni
> `.patch`). **Fecha del grep: 18-jun, sobre el árbol local actual.**

### 3.1 — En CÓDIGO: **CERO marcas reales** ✅
- Única coincidencia: `backend/src/controllers/empresas.controller.js:172` →
  `console.error('[validarEmpresa]', err)`. Es un **tag de log** (`[validarEmpresa]`), **NO** un `[validar
  profe]`. → **No hay ninguna decisión legal pendiente marcada en el código.**

### 3.2 — En las HISTORIAS (`Historias_Usuario_ACTUALIZADAS_12jun.md`): **CERO `[validar profe]`** ✅
- El grep de `[validar profe]` **no devuelve** ese archivo. Solo tiene **un `[validar]`** (sin "profe"), en la
  línea ~274, que es la **nota de alcance Etapa 1 del convenio (ITEM 3.2)** que añadí esta ronda — no es una
  decisión legal abierta, es un aviso de alcance.

### 3.3 — En DOCS canónicos: las 90 coincidencias de `[validar profe]` son de DOS tipos (ninguna es un bug abierto)
**(A) Meta-referencias / instrucciones de proceso** (la mayoría) — frases que *hablan* del mecanismo, no marcas vivas:
- `ESTADO_ACTUAL.md` (varias): "resolvió todos los `[validar profe]`", "**`[validar profe]` a CERO** … 159
  marcas resueltas", "cita el artículo o marca `[validar profe]`" (texto de la regla permanente).
- `PLAN_MAESTRO_EJECUCION`, `PLAN_REVISION_PROFE_15/16jun`, `PLAN_SESION_AUTONOMA_*`, `PLAN_AMBIENTES_SISTEMA`,
  `PLAN_GRANDE_IMPLEMENTACION`, `_BLUEPRINTS_OLEADA3` → **instrucciones** de planes ("marca `[validar profe]`
  si…") o el inventario de su resolución. No son marcas vivas en el sistema.
- Reportes (`REPORTE_SESION_GRANDE`, `REPORTE_BLOQUES_3_4`, `TABLA_VALIDAR_PROFE_RESUELTOS`) → documentan que se
  **resolvieron** ("[validar profe] removido", "a CERO").

**(B) Decisiones LEGÍTIMAS del profe — por diseño, NO son bugs** (inventariadas, no "olvidos"):
| Dónde | Decisión que le toca al profe | ¿Resuelta? |
|---|---|---|
| `AUDITORIA_COBERTURA_PROFE.md` §4/§5.c | Carátula que NO obedece el plan de amortización editado; emisor exacto de notas de consecuencia; etc. | Documentadas como "del profe" (no las decide Code). |
| `REQUERIMIENTOS_PROFE_CONSOLIDADO.md` §8 + `SEED_DEMO_SIGECOP.md:126` | **CMIC / 2 al millar** (aplicabilidad y tasa) y la **tasa de pena convencional** (0.10% es ejemplo). | Parametrizables; el profe fija el valor/aplicabilidad. |
| `VALIDACIONES_PROFE_pendientes.md` | Lista explícita de lo que el profe debe confirmar. | Es el "buzón" de decisiones del profe (correcto que exista). |
| `contexto-claude/Plan_General_Trabajo_Restante.md:69` · `PLAN_PRUEBAS_VALORES.md:404-405` | Comportamiento de contexto de sesión; pago permisivo / reingreso copia carátula. | **Ya cerradas** en docs nuevos (`..._FINAL`); estas son las copias viejas (🗄️). |

**(C) `[validar]` NUEVOS de esta ronda (alcance, no ley)** — los puse yo, son para tu decisión:
- `OLEADA3_FIXES_18jun.md:99` + `REPORTE_EJECUCION_PLAN_GRANDE_18jun.md:120/122` + `ESTADO_ACTUAL.md:170` +
  `HISTORIAS_POR_CICLOS`/`Historias_…:274`:
  - **ITEM 3.2** — ¿diferir el *efecto material* del convenio hasta autorizar? (hoy aplica al registrar).
  - **ITEM 3.1** — multi-partida real por contrato (`contratos.partida_id`, congelado).

### Conclusión Sección 3
- **NO queda ningún `[validar profe]` sin resolver en código ni en las historias** (verificado por grep).
- Lo que el grep encuentra son: **meta-referencias** (proceso), el **inventario legítimo de decisiones del
  profe** (CMIC/2-al-millar, tasa de pena, fórmula de finiquito fina — por diseño le tocan a él) y **2
  `[validar]` de alcance** que abrí esta ronda (ITEM 3.1/3.2). Ninguna es un bug abierto.
- Cada resolución de los 159 originales está citada en `docs/reportes/TABLA_VALIDAR_PROFE_RESUELTOS_18jun.md`
  con su artículo verificado contra `docs/legal/`.

---

*Auditoría leída del árbol local (find/grep/git), no de memoria. Nada movido ni cambiado. Tú decides qué
consolidar/mover (Sección 1) y qué plan retomar (Sección 2). El plan de diseño es lo único "a medias"; los
otros dos están hechos (Plan Grande, local sin integrar) o completos (Plan de errores).*
