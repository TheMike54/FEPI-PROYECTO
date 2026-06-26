# BRIEF — Sesión autónoma #2 (entrega final 26-jun)

> **Modo:** sesión AUTÓNOMA (Claude ultracode). Patrón: **auditar → confirmar mis hallazgos son reales → proponer plan → ejecutarlo → entregar reporte** para que Maiki lo revise.
> **Rama:** continúa en `entrega-final-26jun` (NO crear rama nueva; NO push, NO deploy — eso lo hace Maiki).
> **Insumos a leer ANTES (ya están en el repo):**
> - `docs/` → **historias de usuario** (vienen en ORDEN DE CICLO del sistema, no numérico — respétalo).
> - `docs/pruebas/` → **PLAN_PRUEBAS_MATCH_FINAL_18jun** (este es el FORMATO ORO de plan de pruebas) y **catálogo campo sistema** (referencia de campos, está **desactualizado** → hay que actualizarlo).
> - `docs/audios/Combinado_2026-06-25_2145.md` (los audios del profe).
> - `documentos/legal/` (RLOPSRM, LOPSRM, LFD).
> - `docs/pruebas/REPORTE_SESION_AUTONOMA_26jun.md` (lo hecho en la sesión #1).

---

## 0. REGLAS DE SEGURIDAD — NO NEGOCIABLES

1. **BACKUP FRESCO PRIMERO** (`backup_render.ps1`), verificado, fuera del repo. Sin backup, no se escribe en ninguna base.
2. **Base viva = solo LOCAL en esta sesión.** Todo seed/migración se prueba contra local; para Render dejas runbook backup-gated. NADA destructivo autónomo contra Render.
3. **Idempotente y aditivo.** Schema `IF NOT EXISTS`; seeds con `ON CONFLICT`/guards; nunca `TRUNCATE`/`DELETE` masivo. Re-correr debe ser seguro.
4. **NO romper lo que ya jala.** La sesión #1 dejó features funcionando (carátula, empresas, token_version, etc.). Si un cambio los desestabiliza, **revierte y repórtalo**. `vite build` + backend limpio antes de cada commit.
5. **Zona congelada** (`auth.controller`, `auth.middleware`, `acceso.js`, `estimaciones.controller`, `contratos.controller::crearContrato`): editable si es necesario, pero **reporta cada edición una por una** y corre tests después.
6. **Marco legal:** cada validación cita **artículo + fracción** de `documentos/legal/`. Lo que no esté literal en la ley = **decisión Nivel 2**: decídela, impleméntala y repórtala.

---

## 1. FASE 0 — AUDITORÍA: confirma que MIS hallazgos son reales

Antes de ejecutar nada, verifica contra el código/base si estos hallazgos de Maiki son reales y cuál es la causa raíz. Entrega una tabla **hallazgo → real/no → causa raíz**:

1. **Fecha de inicio sigue permitiendo fechas PASADAS.** El reporte #1 dijo "validado", pero solo bloquea años 2000–2100, no `fechaInicio < hoy`. Confirmar.
2. **Estimación NO se puede integrar en el contrato de prueba HU12.** Dice *"excede lo planeado / cantidad acumulada excede lo contratado / no hay disponibles por el periodo"* — y pasa en TODOS los periodos. Diagnostica por qué (matriz de programa agotada / contrato ya estimado al 100% / seed mal armado). **Este es crítico: Maiki va a abrir ese contrato para demostrarle al profe cómo se integra una estimación.**
3. **Historial de estimación → "Exportar historial" sale SIN FORMATO.** Diagnostica (¿plantilla faltante? ¿solo en contratos viejos? ¿columnas crudas?).
4. **Empresas:** ver Tarea 2 — confirmar contra los audios qué reglas de empresa aplican por rol.

---

## 2. TAREAS A EJECUTAR

### T1 · Bugs reales (arreglar lo confirmado en Fase 0)
- **T1a — Bloquear fecha de inicio pasada** en el alta (cliente + `crearContrato`): `fechaInicio` no puede ser anterior a hoy. **Nivel 2** (la ley no fija "no pasado"; es criterio anti-fecha-incoherente; apoyo art. 31 fr. V LOPSRM, plazo en días naturales). ⚠️ **IMPORTANTE:** los **seeds de demo escriben fechas históricas por SQL directo** (no por el API), así que esta validación NO debe impedir armar contratos de prueba mid-ciclo. No metas el chequeo en la capa que usa el seed.
- **T1b — Historial sin formato:** dale el formato correcto al export (consistente con el resto de documentos imprimibles del sistema). Diagnostica si es por contrato viejo o por plantilla.
- **T1c — HU12 estimación no integra:** arréglalo vía el re-armado de contratos de prueba (T3) + corrige la causa raíz si es un bug del cálculo de "disponible por periodo", no solo del dato.

### T2 · Empresas — verificar contra los audios y rematar
Releé los audios y confirma estas reglas (decide con base en lo que diga el profe, cita el timestamp):
- **Contratista (superintendente) y dependencia → misma empresa / su empresa**, con el **selector de empresa ubicado DEBAJO de "dependencia / cuenta contratante"** (el profe lo dijo explícito).
- **Supervisión → PUEDE ser de otra empresa** (tercero independiente — el profe: *"la dependencia firma un contrato con la contratista y otro con el supervisor"*). **NO la fuerces a misma empresa.** (Confírmalo en el audio antes de tocar.)
- **Mostrar PERSONAS, no cuentas:** en TODOS los puntos donde se elige o muestra a alguien (alta, firmas, roster, bitácora) debe verse el **nombre de la persona**, no el correo/cuenta del sistema. Remata los lugares donde todavía se vea la cuenta.
- Confirma en el audio **si la dependencia también va atada a una empresa** (Maiki tiene la duda) y ajusta según lo que diga el profe.

### T3 · Contratos de prueba PRE-LLENADOS por ciclo/HU  ← **lo más importante**
Hoy cada HU tiene su contrato, pero **lo que va ANTES de esa HU en el ciclo está vacío**, así que el profe no puede demostrar la historia. Hay que pre-llenar **todo el ciclo hasta el punto de cada HU**.
- Lee las **historias de usuario en orden de ciclo** (en `docs/`). El ciclo es, a grandes rasgos: alta de contrato → bitácora (se abre) → notas → avance/seguimiento → estimación → tránsito de pago → convenios modificatorios → cierre/finiquito (y atrasos donde aplique).
- Para el contrato de **cada HU**, deja **pre-llenado TODO lo anterior** en el ciclo, con datos coherentes (fianzas, catálogo, programa, bitácora abierta + notas, avances, estimaciones integradas, pagos, etc. según hasta dónde llegue esa HU).
  - Si la HU es **cierre/finiquito** → TODO lleno: fianzas, ciclo completo, estimaciones, bitácora, avance, pagos, convenios, **atrasos**.
  - Si la HU es **convenios modificatorios** → todo lo previo lleno, listo para que el profe SOLO haga el convenio.
  - Si la HU es **avance/seguimiento (HU5)** → alta + bitácora + notas listas para registrar avance.
- **Atrasos:** cuando una HU los requiera, genéralos correctamente (periodo + avance esperado vs registrado), NO falseando solo una fecha.
- **Restricción dura:** seed **idempotente**, validado en **local**, con **SELECT de verificación** del estado esperado por contrato. Para Render → runbook. **SOP-2026-001 no se toca** (reservado para la demo del convenio).
- **Entrega:** scripts en `backend/scripts/` + en el reporte, una tabla *"contrato HUx → hasta qué etapa quedó pre-llenado + cómo verificarlo en pantalla"*.

### T4 · Actualizar documentación (que coincida con el sistema ya cambiado)
- **Plan de pruebas positivas y negativas:** regenéralos **uno a uno en FORMATO** al `PLAN_PRUEBAS_MATCH_FINAL_18jun` (mismo nivel de detalle: qué poner en CADA campo del sistema). Deben reflejar los cambios de las sesiones #1 y #2.
- **Historias de usuario:** si el profe mencionó algo en los audios y/o el sistema cambió, actualízalas para que coincidan (sin perder el orden de ciclo).
- **Catálogo campo sistema:** actualízalo al estado actual del sistema (incluye los campos nuevos: selector de empresa, nota↔generador, etc.).

### T5 · Ordenar archivos del repo
- **`catálogo campo sistema` → muévelo a una carpeta de CONTEXTO** (p. ej. `docs/contexto/`), no en `pruebas/`. Agrega un puntero en `CLAUDE.md` para que Code lo lea cada sesión (y no gaste tokens re-auditando el sistema).
- **`docs/pruebas/` = SOLO planes de prueba.** Saca de ahí lo que no sea plan de prueba (reportes de sesión, planes de resolución, etc.) a una carpeta adecuada (`docs/reportes/` o `docs/contexto/` según corresponda).
- Usa `git mv` para conservar historial. **Actualiza todas las referencias** (CLAUDE.md, enlaces cruzados entre docs) para que nada quede roto.

---

## 3. ENTREGABLES
- Commits en `entrega-final-26jun` (agrupados por tarea, mensajes claros).
- `docs/reportes/REPORTE_SESION_AUTONOMA_2_26jun.md` con: tabla de Fase 0 (hallazgos reales/no + causa), qué se hizo por tarea con cita legal, ediciones a zona congelada una por una, decisiones Nivel 2, la tabla de contratos-de-prueba (etapa + cómo verificar), el mapa de archivos movidos, y el **runbook de Render** actualizado (backup → merge/deploy → seeds de contratos → verificación).
- **Lista explícita de lo que Maiki DEBE verificar en pantalla** (Code no ve la UI): los 4 hallazgos, el alta con fecha de hoy (crea) y con fecha pasada (rechaza), y al menos 3 contratos de prueba demostrables de punta a punta.

---

## 4. RECORDATORIO
- **NO push / NO deploy.** Maiki revisa, hace el merge y corre el runbook.
- Entregable académico **P4** (riesgos + planes con acta + resultados) sigue pendiente — es humano, no Code; solo recuérdalo en el reporte.
