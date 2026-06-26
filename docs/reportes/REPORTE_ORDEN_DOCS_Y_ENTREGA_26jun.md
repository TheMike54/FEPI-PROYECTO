# REPORTE — Orden de documentación + integración de "adios" + plan de entregables (26-jun-2026)

> Sesión autónoma, **solo documentación**, en `main`, **sin push**. No se tocó código, schema, seeds ni zona
> congelada. `git mv` para lo trackeado (conserva historial); `mv` para lo no trackeado (Codex/adios y los
> gitignored). Nada se borró salvo **un duplicado EXACTO** (verificado por MD5).

---

## TAREA 1 — Orden de la documentación

### Mapa de movimientos (sueltos en `docs/` raíz → su carpeta)
| De | A | Método |
|---|---|---|
| `docs/RUNBOOK_BD_RENDER_21jun.md` | `docs/planes/RUNBOOK_BD_RENDER_21jun.md` | git mv |
| `docs/PENDIENTES_MAESTRO_25jun.md` | `docs/pendientes/PENDIENTES_MAESTRO_25jun.md` | git mv |
| `docs/al darle en la campanita y tengo al.md` | `docs/pendientes/OBSERVACIONES_PANTALLA_25jun.md` | git mv + rename |
| `docs/esto es lo q veop ahorita claude .png` | `docs/pendientes/captura_feedback_campanita_25jun.png` | git mv + rename |
| `docs/Screenshot 2026-06-24 071409.png` | `docs/referencias/captura_ui_24jun.png` | git mv + rename |
| `docs/WhatsApp Audio 2026-06-16 …_transcript.txt` | `docs/audios/…` | mv (gitignored) |
| `docs/BRIEF_SESION_AUTONOMA_26jun.md` | `docs/historial/sesiones/…` | mv (no trackeado) |
| `docs/BRIEF_SESION_AUTONOMA_2_26jun.md` | `docs/historial/sesiones/…` | mv (no trackeado) |

- **Carpeta nueva propuesta:** `docs/pendientes/` — backlog + feedback de pantalla (no encajaba en pruebas/reportes/planes; "lo que falta por resolver"). Si prefieres otra ubicación, dime.
- El `.md` "de la campanita" era **feedback de pantalla de Maiki** (notas por firmar, fotos de avance, ciclo de estimación, pago, convenios, curva, expediente, bitácora, reportes, portafolio, sustitución). Se renombró a `OBSERVACIONES_PANTALLA_25jun.md` y se agrupó con el backlog.

### NO movidos (a propósito) — requieren tu decisión
- **`docs/Historias_Usuario_SIGECOP.md`** — está **trackeado y MODIFICADO por ti (sin commitear)**. No lo moví ni lo commiteé para **no mezclar tu cambio en mi commit**. Revisa si es redundante con el canónico `requisitos/Historias_Usuario_ACTUALIZADAS_12jun.md` (y si quieres, lo reubico/fusiono después).
- **`docs/Cuentas_Prueba_SIGECOP.md`** — **gitignored (credenciales)**. Lo dejé intacto en `docs/` raíz (el README ya lo documenta ahí).
- **Movimiento previo de imágenes** (`docs/*.jpeg` → `docs/Referencias-estimaciones/`) que estaba **sin commitear desde antes de esta sesión**: no lo toqué (no es mío).
- **`docs/Referencias-estimaciones/` vs `docs/referencias/`** — nombres inconsistentes; se podría consolidar (`referencias/estimaciones/`), pero no lo hice por el enredo con el move de jpegs pendiente. **Lo dejo señalado.**

---

## TAREA 2 — Integración de `docs/adios/` (Codex) en `entrega_profe/`

`adios/` estaba **sin trackear** (214 archivos nuevos de Codex). Se **disolvió**: las partes-entregable a `entrega_profe/`,
los reportes de proceso a `reportes/`, y el archivo de proceso por-ciclo a `historial/`.

### Mapa de movimientos
| De (`docs/adios/…`) | A | Nota |
|---|---|---|
| `entrega_profe/planes_y_soluciones/` (45) | `docs/entrega_profe/planes_y_soluciones/` | Paquete limpio del profe (44 docs + `INDICE.md`). |
| `MEMORIA_TECNICA_SIGECOP_26jun.md` | `docs/entrega_profe/MEMORIA_TECNICA_SIGECOP_26jun.md` | Memoria técnica consolidada. |
| `MATRIZ_DE_PERMISOS_26jun.md` | **ELIMINADO** | **Dup EXACTO** (MD5 `1EE8597655D25113E636174ECDF08650`) = `entrega_profe/MATRIZ_DE_PERMISOS_26jun.md`, que **se conserva**. |
| `reportes/REPORTE_FINAL_ESTRUCTURA.md` | `docs/reportes/` | Reporte de proceso (el propio Codex lo ubicaba ahí). |
| `reportes/REPORTE_ULTIMOS_2_PROMPTS_26jun.md` | `docs/reportes/` | Reporte de proceso. |
| `00_…`,`01_…`,`02_…`,`03_…`,`04_…`,`05_…`,`06_…`,`07_…`,`99_superados`,`IA`,`README.md` | `docs/historial/codex-reorg-por-ciclo-26jun/` | Archivo de proceso **por ciclo**. |
| `docs/adios/` (vacío) | **eliminado** | — |

- **Nuevo:** `docs/entrega_profe/README.md` — índice del paquete (orden de lectura: memoria → matriz → planes_y_soluciones).
- **`adios/IA/`** (IA_DIRECTA/IA_MIXTA) NO fue a `entrega_profe/`: es un **índice interno** que apunta a la estructura por-ciclo → se quedó con el archivo de proceso (no es material del profe, "sin tics de IA").

### ⚠ Decisión pendiente para Maiki — solape con `historial/`
`historial/codex-reorg-por-ciclo-26jun/` es la **reorganización por ciclo** que hizo Codex y **solapa** los
subdirectorios ya existentes de `historial/` (`fundacion/`, `oleadas/`, `planes/`, `contexto/`, …). Es una **vista
alternativa** del mismo material. **No borré la existente** (regla: conservar). **Recomendación:** elige UNA
organización canónica para `historial/` y deja la otra como referencia (o pídeme consolidar). Las copias dentro de
`codex-reorg-…` pueden tener enlaces internos viejos (es una foto a un punto en el tiempo).

---

## Referencias actualizadas (para no dejar enlaces rotos)
| Archivo | Cambio |
|---|---|
| `estado/ESTADO_ACTUAL.md` | `docs/RUNBOOK_BD_RENDER_21jun.md` → `docs/planes/RUNBOOK_BD_RENDER_21jun.md` |
| `estado/HISTORIAL_PROYECTO.md` | idem RUNBOOK |
| `planes/PLAN_RESOLUCION_PENDIENTES_25jun.md` | RUNBOOK → `planes/…` y PENDIENTES → `pendientes/…` |
| `historial/sesiones/BRIEF_SESION_AUTONOMA_26jun.md` | PENDIENTES → `pendientes/…` |
| `historial/planes/PLAN_REVISION_PROFE_16jun.md` | audio → `docs/audios/WhatsApp Audio 2026-06-16…` (2 ocurrencias) |
| `README.md` | + sección `entrega_profe/`, + sección `pendientes/`, RUNBOOK en `planes/`, `codex-reorg-…` en `historial/` |

---

## TAREA 3 — Plan de entregables que faltan del profe
Generado: **`docs/planes/PLAN_ENTREGABLES_PROFE_26jun.md`** (propuesta, NO construido). Deducido de `docs/audios/`
con 3 lecturas independientes + cita por entregable. Resumen del hueco real:

- 🔴 **A. Análisis de riesgos con SEGUIMIENTO semanal + planes ejecutados + actas** — el más insistido (25-jun, 25-may). Tenemos `Plan_Riesgos.xlsx` pero falta lo semanal y las actas.
- 🟡 **B. 3 RNF + ISO 25010/FURPS** (a confirmar si es de esta materia).
- 🟡 **C. Planeación de sprints + puntos/velocidad** (sobre el Excel de historias).
- 🟡 **D. Changelog por revisión** (condensar el historial).
- 🟡 **E. Modelo E-R / diseño de BD como documento** (derivar del schema).
- ✅ **Ya cubiertos:** historias, trazabilidad, matriz de permisos, factibilidad, arquitectura, **scripts/datos dummy**, demo extremo-a-extremo, pendientes, HU sustitución/finiquito, memoria técnica, entorno montado.
- **Dudosos** (no construir sin confirmar): presentación/slides, cuadernillo de pruebas formales, control de versiones de historias.

---

## Estado final / dónde paré
- TAREA 1, 2 y 3 **completas**. No me detuve por ninguna regla de seguridad.
- `docs/` raíz quedó con solo 3 archivos legítimos: `README.md` (índice), `Cuentas_Prueba_SIGECOP.md` (gitignored),
  `Historias_Usuario_SIGECOP.md` (modificado por ti — pendiente tu decisión).
- Commit en `main`, **sin push**. No toqué código/schema/seeds/zona congelada/BD.

### Lo que necesito de ti (Maiki)
1. ¿`historial/codex-reorg-por-ciclo-26jun/` se adopta como historial canónico o se queda como referencia? (solapa el actual).
2. `Historias_Usuario_SIGECOP.md` (modificado): ¿lo reubico a `requisitos/` / lo fusiono / lo dejas?
3. ¿Consolido `Referencias-estimaciones/` dentro de `referencias/`?
4. ¿La carpeta nueva `pendientes/` te sirve o prefieres otra ubicación?
