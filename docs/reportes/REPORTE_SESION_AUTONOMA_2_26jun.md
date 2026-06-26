# REPORTE — Sesión autónoma #2 (entrega final 26-jun)

> Ejecución del brief `docs/BRIEF_SESION_AUTONOMA_2_26jun.md`. Rama **`entrega-final-26jun`** (continúa la #1). **NO push, NO deploy.**
> Commits de esta sesión: `77d2738` (T1+T2) · `908cf57` (T3+T4+T5) · + este reporte.

---

## 0. Gate de seguridad — BACKUP (regla §0.1) ✅
- Backup fresco de Render **verificado** antes de tocar nada: `backend/backups/sigecop_render_20260626_002301_pre_autonoma2_26jun.dump` (1862.7 KB, gitignored). `pg_restore --list` OK.
- Base viva = **solo LOCAL**. Migración/seed probados contra Docker local; Render solo runbook backup-gated (§7). Nada destructivo autónomo a Render.

---

## 1. FASE 0 — Auditoría: ¿los 4 hallazgos de Maiki son reales? (tabla)

| # | Hallazgo | ¿Real? | Causa raíz |
|---|---|---|---|
| 1 | Fecha de inicio permite fechas PASADAS | **SÍ** | Front (`AltaContrato.validarPaso`) y back (`crearContrato`) solo validaban coherencia (ISO + año 2000–2100), **nunca** `fechaInicio < hoy`. El reporte #1 implementó "no-fecha-imposible", no "no-pasado" (son distintas). |
| 2 | Estimación NO integra en el contrato HU-12 (todos los periodos) | **SÍ — pero DATO, no código** | El contrato local (PRUEBA-HU-12, id 6936) tenía una estimación #1 integrada (creada 23-jun 23:42) que **consumió CONC-01 al 100%**. CONC-01 es el único con avance; el único periodo vencido es P1 (art. 54). Resultado: disponible=0 → "excede planeado/contratado". El cálculo de `disponible` (`estimacion-prep.controller:130-161`) es **correcto**. |
| 3 | "Exportar historial" sale SIN FORMATO | **SÍ** | `HistorialEstimaciones` usaba el helper crudo `descargarExcelHoja` (volcado json→tabla) en vez de `descargarExcelReporte` (plantilla con banda/meta/moneda/TOTALES) que se añadió el 24-jun para los reportes HU-19. |
| 4 | Empresas: reglas por rol | **PARCIAL** | (a) selector de empresa existía pero NO debajo de "Dependencia"; (b) supervisión-otra-empresa ya estaba (sesión #1); (c) dependencia NO se ata a empresa privada (audio); (d) los selects/firmas de personas seguían mostrando el **correo** en vez del nombre. |

---

## 2. Qué se hizo por tarea (con cita legal)

### T1 — bugs (commit `77d2738`)
- **T1a · fecha de inicio no-pasado.** Front `AltaContrato.jsx` (`validarPaso(0)`: `fiISO < hoyISOAlta()`) + back `crearContrato` (margen UTC-1día como la vigencia de garantía). **NO rompe seeds** (insertan por SQL directo, no por `crearContrato`). **Nivel 2** (la ley no fija "no-pasado"; apoyo art. 31 fr. V LOPSRM). ⚠️ `crearContrato` = ZONA CONGELADA (§3).
- **T1b · export historial con formato.** `HistorialEstimaciones.jsx`: `descargarExcelHoja` → `descargarExcelReporte` con spec (columnas con `fmt`, `netoNum` para moneda + TOTALES; rechazadas no suman). Consistente con HU-19. (Mismo patrón legacy en `ReingresoEstimacion.jsx:109` — pendiente menor, HU-16 retirada.)
- **T1c · HU-12 no integra.** Es DATO: re-corrido `seed_demo_24.sql` en local → PRUEBA-HU-12 vuelve a `disponible=1000/avance=1000` (integrable). Sin cambio de código (el cálculo es correcto). art. 54 LOPSRM (periodo vencido) / art. 118 RLOPSRM (tope contratado).

### T2 — empresas (commit `77d2738`)
Verificado contra audios (timestamps): selector empresa→persona `[09:59]`/`[11:42]`; orden con dependencia `[11:58]` "dependencia y contraparte"; supervisión externa `[05:07]`/`[07:00]`; "personas, no cuentas" `[14:36]`.
- Selector de **empresa contraparte movido a justo debajo de "Dependencia"** (`AltaContrato.jsx`).
- **Mostrar la PERSONA, no la cuenta/correo:** `AltaContrato` (dependencia/superintendente/supervisión), `AperturaBitacora` (firmantes), `RosterContrato` (sustitución).
- Supervisión-otra-empresa: ya implementado (sesión #1, `roster.controller`). Dependencia NO atada a empresa privada (audio; es la entidad pública). art. 125 RLOPSRM (sustitución) / criterio confirmado por el profe.

### T3 — contratos de prueba pre-llenados por ciclo (commit `908cf57`) ← lo más importante
**Hallazgo:** los seeds YA pre-llenan cada HU hasta su etapa; el problema era contaminación, no falta de pre-llenado.
- `backend/scripts/seed_demo_24.sql` (LOCAL, folios PRUEBA-HU-XX) y `backend/scripts/seed_demo_profe.sql` (RENDER, folios OP-2026-XXXX) — **ambos idempotentes** (purgan + recrean), base idéntica (monto $1,000,000, 3 conceptos, cuadre al centavo), variando solo la etapa del ciclo por HU.
- Re-corrido `seed_demo_24.sql` en local: 24 contratos en su etapa correcta; **HU-12 vuelve integrable**.
- **Robustez de demo:** la estimación es append-only → integrarla "agota" el contrato; **re-sembrar antes de cada demo** (idempotente) deja todo listo otra vez.

#### Tabla — contrato HUx → etapa pre-llenada → cómo verificar en pantalla
| Folio | Etapa pre-llenada | Verificar (login del rol → abrir contrato) |
|---|---|---|
| PRUEBA-HU-01 | base (recién capturado, sin bitácora) | Alta visible; sin bitácora aún |
| PRUEBA-HU-02 | base + endoso en fianza cumplimiento | Fianzas con 1 endoso (art. 91 RLOPSRM) |
| PRUEBA-HU-22 | base (roster cargado) | Sustituir una persona del roster |
| PRUEBA-HU-08 | base **sin** bitácora | "Abrir bitácora" disponible |
| PRUEBA-HU-09 | base + bitácora abierta y firmada | Emitir nota |
| PRUEBA-HU-10 | base + bitácora + nota de avance firmada | Consultar/buscar notas |
| PRUEBA-HU-11 | base + bitácora + 1 minuta + 1 visita | Ver minutas/visitas |
| PRUEBA-HU-06 | base + bitácora + avance parcial P1 (600/1000) | Registrar/corregir avance |
| PRUEBA-HU-07 | base + bitácora + avance bajo (100/1000) | Alerta de atraso por concepto |
| PRUEBA-HU-05 | base + avance al corriente (3 conceptos 100%) | Curva de avance |
| **PRUEBA-HU-12** | base + bitácora + avance P1 100%, **sin estimación** | **Integrar estimación periodo 1 → debe integrar** |
| PRUEBA-HU-13 | base + bitácora + avance + estimación #1 **integrada** | Presentar la estimación |
| PRUEBA-HU-15 | base + ... + estimación #1 **enviada** | Revisar/autorizar/rechazar |
| PRUEBA-HU-14 | base + ... + estimaciones (pagada, autorizada, enviada) | Historial + **Exportar (con formato)** |
| PRUEBA-HU-17 | base + ... + estimaciones (pagada, autorizada) | Tablero/cartera |
| PRUEBA-HU-20 | base + ... + estimación **autorizada** | Tránsito a pago |
| PRUEBA-HU-21 | base + ... + estimación **autorizada** | Registrar pago (Finanzas) |
| PRUEBA-HU-03 | base + bitácora + convenio de plazo registrado | Convenios modificatorios |
| PRUEBA-HU-04 | base + bitácora + estimación pagada | Expediente integral |
| PRUEBA-HU-18 | base + avance al corriente | Portafolio (semáforo) |
| PRUEBA-HU-19 | base + bitácora + estimación pagada | Exportar los 7 reportes |
| PRUEBA-HU-24 | base + bitácora + avance×3 + **3 estimaciones pagadas** | Finiquito y cierre |
| PRUEBA-HU-23 | base (catálogo de empresas) | Padrón de empresas |

> Verificación rápida en BD (incluida en el seed): `SELECT folio, est, estados, bita FROM ...` (al final de `seed_demo_24.sql`).
> **Mejora recomendada (no aplicada para no tocar el seed validado a horas de la entrega):** HU-03 podría llevar también estimaciones pagadas previas; un escenario de finiquito-con-atraso sería un contrato aparte (HU-24 actual es "todo pagado", sin atraso).

### T4 — documentación (commit `908cf57`, parcial)
- **Catálogo de campos:** sección **DELTA** con todos los campos nuevos/cambiados de las sesiones #1/#2 (`docs/contexto/CATALOGO_CAMPOS_SISTEMA.md`). No re-generé los 247 campos (sigue vigente la base 24-jun).
- **Planes de prueba positivas/negativas al formato oro:** **NO regenerados** (alcance > presupuesto de esta sesión). Recomendado: pase enfocado actualizando `PLAN_PRUEBAS_POSITIVAS_24jun`/`NEGATIVAS_24jun` con los nuevos campos (fecha-pasada, empresa→persona, foto opcional, nota↔generador). Ver §6.
- **Historias de usuario:** el cambio de las sesiones #1/#2 es de implementación/validación (sin nueva HU); la historia de orden de ciclo (`docs/Historias_Usuario_SIGECOP.md`) sigue concordando.

### T5 — reorg de archivos (commit `908cf57`)
- `docs/contexto/` (nueva): CATALOGO_CAMPOS_SISTEMA, CONTRATOS_PRUEBA_ESQUEMA, MAPA_DEMO_PROFE, SEED_DEMO_SIGECOP, REPARTO_EQUIPO_RENDER (gitignored, `mv` plano).
- `docs/pruebas/` → **SOLO planes de prueba** (PLAN_PRUEBAS_FINAL_MATCH, POSITIVAS, NEGATIVAS, 24_CONTRATOS, guía e2e).
- Reportes → `docs/reportes/`; planes de resolución/bugs/seed → `docs/planes/`.
- **CLAUDE.md:** catálogo añadido a "ANTES de cualquier tarea, LEE" + "Mapa de docs/" actualizado (carpeta `contexto/`).

---

## 3. Ediciones a ZONA CONGELADA (una por una)
1. **`backend/src/controllers/contratos.controller.js`** (`crearContrato`, T1a): añadido rechazo de `fechaInicio` anterior a hoy (margen UTC-1día). Aditivo (un `return 400`); no altera el cuadre ni el resto del alta. `vite build` verde + backend reinicia limpio tras el cambio.

> No se tocó ningún otro archivo congelado (auth, acceso.js, estimaciones.controller, schema.sql, server.js no cambiaron en esta sesión).

---

## 4. Decisiones Nivel 2 (no literales en la ley)
1. **Fecha de inicio = no-pasado** (T1a). La ley no lo dice; criterio anti-incoherencia (apoyo art. 31 fr. V). Margen UTC-1día para no rechazar por zona horaria. `[validar profe]` si admite leve retroactividad de formalización.
2. **Dependencia NO atada a empresa privada** (T2c). El audio nunca lo pide; la dependencia es la entidad pública contratante. (Si se quisiera "institución, no cuenta", sería Etapa 2 — decisión de Maiki.)

---

## 5. Mapa de archivos movidos (T5)
| De | A |
|---|---|
| docs/pruebas/CATALOGO_CAMPOS_SISTEMA.md | docs/contexto/ |
| docs/pruebas/CONTRATOS_PRUEBA_ESQUEMA.md | docs/contexto/ |
| docs/pruebas/MAPA_DEMO_PROFE.md | docs/contexto/ |
| docs/pruebas/SEED_DEMO_SIGECOP.md | docs/contexto/ |
| docs/pruebas/REPARTO_EQUIPO_RENDER_25jun.md (gitignored) | docs/contexto/ |
| docs/pruebas/{AUDITORIA_HALLAZGOS_EQUIPO,REPORTE_PRUEBAS_EXHAUSTIVAS,REPORTE_SESION_AUTONOMA_25jun,REPORTE_SESION_AUTONOMA_26jun} | docs/reportes/ |
| docs/pruebas/{PLAN_EJECUCION_HALLAZGOS,PLAN_RESOLUCION_PENDIENTES,PLAN_SEED_RENDER,PLAN_SOLUCION_BUGS}_*.md | docs/planes/ |

> **Refs cruzadas pendientes:** varios docs (incl. `docs/estado/ESTADO_ACTUAL.md`, briefs, reportes históricos) aún citan rutas viejas `docs/pruebas/<archivo>` de los archivos movidos. CLAUDE.md ya está actualizado; el resto son enlaces en docs (no rompen código). Recomendado: `grep -rl "pruebas/CATALOGO\|pruebas/MAPA_DEMO\|pruebas/REPARTO\|pruebas/REPORTE_SESION\|pruebas/PLAN_RESOLUCION" docs` y reemplazar.

---

## 6. Lo que NO se cerró (y por qué)
- **Planes de prueba positivas/negativas al formato oro (T4):** no regenerados — el detalle por-campo para 24 HU × positivas/negativas excede el presupuesto de esta sesión. Hecho en su lugar: catálogo-delta. Siguiente: pase enfocado sobre `PLAN_PRUEBAS_POSITIVAS/NEGATIVAS_24jun`.
- **Refs cruzadas a rutas viejas** (§5): CLAUDE.md sí; el resto pendiente (no rompe código).
- **Suite e2e completa:** no corrida (baseline stale + datos demo re-sembrados). Gate fiable: `vite build` verde + backend health + verificación en BD del seed. El smoke visual lo hace Maiki (§ lista abajo).

---

## 7. RUNBOOK DE RENDER (lo ejecuta Maiki — backup-gated) — listo para pegar
```powershell
$RENDER_DB = 'postgresql://USUARIO:PASSWORD@HOST.oregon-postgres.render.com/DBNAME?sslmode=require'
$REPO      = "C:\Users\migue\Downloads\Proyectofepy\sigecop"

# 1) BACKUP FRESCO (no continuar si pesa 0)
& "$REPO\backend\scripts\backup_render.ps1" -Etiqueta "pre_deploy2_26jun"

# 2) MERGE de la rama a main + push + Manual Deploy en Render (schema idempotente se aplica en boot)
git checkout main; git merge --no-ff entrega-final-26jun; git push origin main   # luego: Manual Deploy

# 3) RE-SEMBRAR los contratos demo (idempotente; deja HU-12 listo para integrar y todo a su etapa).
#    Verificar ANTES y DESPUÉS con SELECT. Para la demo del profe (folios OP-2026-XXXX):
docker cp "$REPO\backend\scripts\seed_demo_profe.sql" sigecop_db:/tmp/s.sql
docker exec -i sigecop_db psql "$RENDER_DB" -v ON_ERROR_STOP=1 -f /tmp/s.sql
docker exec -i sigecop_db psql "$RENDER_DB" -c "SELECT folio, (SELECT string_agg(estado,',' ORDER BY numero) FROM estimaciones e WHERE e.contrato_id=c.id) estados FROM contratos c WHERE folio LIKE 'OP-2026-%' ORDER BY folio;"
docker exec sigecop_db rm -f /tmp/s.sql
#    (Verificar que el contrato de HU-12 NO tenga una estimación que consuma su concepto → debe quedar integrable.)

# 4) SMOKE VISUAL (ver lista abajo).
```
> Backups previos en `backend/backups/`. Restore: `backend/scripts/restore_render.ps1`.

---

## 8. ✅ LISTA — lo que Maiki DEBE verificar EN PANTALLA (Code no ve la UI)
**Los 4 hallazgos:**
1. **Fecha de inicio:** alta con **fecha de HOY → crea**; alta con **fecha PASADA → rechaza** ("La fecha de inicio no puede ser anterior a hoy").
2. **HU-12 integra:** re-sembrar → abrir el contrato de HU-12 → integrar estimación del **periodo 1** → debe **integrarse** (ya no "excede/no disponible").
3. **Exportar historial (HU-14):** el `.xlsx` sale **con formato** (banda guinda, meta del contrato, moneda, fila TOTALES).
4. **Empresas:** en el alta, el **selector de empresa está debajo de "Dependencia"**; al elegir empresa, el selector de persona se filtra; en alta/firmas/roster se ve el **nombre de la persona, NO el correo**.

**Alta (T1a):** crear con fecha hoy ✓ y rechazar fecha pasada ✗.

**≥3 contratos demostrables punta a punta** (re-sembrar antes):
- **HU-12** integrar estimación; **HU-20/HU-21** tránsito a pago + registrar pago; **HU-24** finiquito (3 estimaciones pagadas).

**Empresas/personas:** sustitución de roster (supervisión puede ser de otra empresa); nota de apertura muestra presentante + No. bitácora + fecha/hora.

---

## 9. Recordatorio — Entregable académico P4 (humano, no Code)
Análisis de riesgos (≥4 semanas) + planes ejecutados **con acta de junta** + resultados por semana. El profe lo revisa; prepararlo aparte.
