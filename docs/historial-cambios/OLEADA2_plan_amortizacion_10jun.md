# Oleada O2 — Plan de amortización del anticipo (criterio de HU-01) — 10 jun 2026

> Ejecuta el prompt O2 del plan (P6 de la revisión del profe: *"es en qué mes voy a devolver el dinero…
> muy parecido al programa de obra… No hay límites"*). **LOCAL, sin commit/push.**
> Ley: el anticipo se amortiza con cargo a las estimaciones (**art. 143 fr. I RLOPSRM**, que indica
> "proporcionalmente"); el profe pidió plan **editable**. **FASE A: la carátula (G2) NO cambia** —
> sigue amortizando proporcional. `[Fase B pendiente de validar con el profe]` (comentado en el DDL,
> el controller, el paso del alta y el bloque del expediente).
> ⚠️ El árbol también trae O1+UI-1+UI-2 sin commitear (snapshots .patch en historial-cambios para separar).

## Qué se construyó

1. **DDL aditivo e idempotente** (`schema.sql`, al final): `plan_amortizacion(id, contrato_id FK CASCADE, periodo_numero CHECK>0, monto NUMERIC(18,2) CHECK>=0, UNIQUE(contrato_id, periodo_numero))` + índice. **Ya aplicado a la BD local** con psql (re-ejecutable).
2. **Backend** (`contratos.controller.js`, bloque aditivo en `crearContrato`, transaccional):
   - Valida el plan recibido: periodos en rango, sin repetidos, montos ≥ 0 y **Σ = ROUND(monto × %anticipo, 2) EXACTA al centavo** → si no, **400 citando el art. 143**.
   - **Si el payload NO trae plan y hay anticipo, DERIVA el default proporcional** (n−1 cuotas iguales + ajuste de redondeo en la última) → **retrocompatible**: los contratos creados por API (specs de estimación, seeds) siguen funcionando y quedan con plan.
   - Lectura: `GET /api/contratos/:id/plan-amortizacion` en `programa.controller.js` (NO congelado), acotado por participación — mismo patrón que el programa. Una línea aditiva en `contratos.routes.js`.
3. **Alta (HU-01)**: paso nuevo **"Plan de amortización"** (índice 5, entre Garantías y PDF firmado, que pasa al 6):
   - Matriz por periodo (patrón del programa) con **default proporcional precargado** y **editable libre** ("no hay límites"); fila de suma + semáforo `plan-cuadra`/`plan-descuadre`; botón **"Restablecer proporcional"**; construido con los componentes guinda de UI-1 (`Tabla`, `Boton`) y aviso `[Fase B…]` en guinda-soft.
   - **Gate duro** en `validarPaso(5)`: cada periodo con monto válido ≥ 0 y **Σ = anticipo al centavo**; el backend revalida.
   - El plan se **re-precarga proporcional** si cambian % de anticipo, monto del contrato o periodos (el plan deriva de los tres; una edición vieja dejaría de cuadrar).
   - **Si anticipo = 0 el paso SE OMITE**: la pestaña se oculta (`Tab.jsx` ganó soporte `oculta` con numeración visible corrida) y la navegación lo salta en ambos sentidos (`irAPaso`); el paso omitido es **auto-válido**, así que el gating estrictamente secuencial **se extiende sin relajarse** (los índices de pasos no se mueven).
4. **Expediente (HU-04)**: bloque **"Plan de amortización del anticipo"** (lectura) vía el endpoint propio: tabla periodo/fechas/monto + total (= anticipo) + nota de Fase A/Fase B. Buscable en el buscador del expediente.

## Decisiones (y por qué)

1. **El paso omitido no mueve índices**: ocultar la pestaña + salto en la navegación, en vez de un arreglo dinámico de pasos. El gating del alta (pasoMaxAlcanzado, validación de prefijo) está keyed por índice y ya tuvo un susto de regresión — extenderlo con un paso auto-válido es el cambio mínimo que no lo relaja.
2. **El backend deriva el proporcional si no recibe plan**: sin esto, TODOS los contratos creados por API (decenas de specs y seeds, p. ej. el contrato guía de estimación con anticipo 30%) habrían empezado a fallar con 400. Derivar = mismo default que el alta, y deja a los contratos "viejos" con plan consultable.
3. **Default proporcional al centavo**: n−1 cuotas `ROUND(anticipo/n, 2)` y la última absorbe el ajuste — espejo exacto frontend/backend, Σ siempre exacta (sin tolerancia, regla de la casa).
4. **Re-precarga al cambiar anticipo/monto/periodos**: predecible y siempre válido; la alternativa (conservar ediciones que ya no cuadran) deja al usuario con un descuadre inexplicable.
5. **Lectura en `programa.controller.js` y no en `detalleContrato`**: mismo criterio que el roster (Pase 2.3) — el endpoint congelado no se toca; el bloque del expediente consume el endpoint propio.
6. **G2 intacto**: ni una línea de `estimaciones.controller.js`. La amortización de la carátula sigue siendo proporcional hasta el OK del profe (el art. 143 dice "proporcionalmente"; que él decida si el sistema obedece al plan — pregunta #1 de la lista [validar]).

## Tests (lección 7)

- **Nuevo** `o2-plan-amortizacion.spec.js` (4 escenarios): default proporcional cuadra / editar descuadra y bloquea / restablecer desbloquea · plan editado (todo en P1) se **persiste tal cual** (verificado por API) · sin anticipo la pestaña no existe y Siguiente/Atrás saltan el paso · API sin plan deriva proporcional + API con plan descuadrado → 400 con art. 143.
- **Actualizados** (el paso nuevo es intencional): `alta-v5-navegacion-lineal` (3c) y `alta-v4-gating` (a, a2) — un Siguiente extra por el plan (que ya cuadra por default).
- Pre-vuelo de los 3 specs: **15/15 verde**. **Suite completa: 214 passed · 8 skipped (fixme conocidos) · 0 failed (6.6 min)** — los 210 previos intactos + 4 nuevos de O2. `vite build` ✓.

## Runbook de integración (Maiki)

1. **Migración en Render** (¡hay DDL!): runbook de siempre — backup (`backup_render.ps1`), `psql --single-transaction -v ON_ERROR_STOP=1` con el bloque nuevo de `schema.sql` (o el deploy con `RUN_MIGRATIONS=true` la aplica: es `CREATE TABLE IF NOT EXISTS`), verificar, push.
2. Localmente tras pull: la tabla ya está en la BD local; `docker restart sigecop_backend` (controllers cambiaron).
3. Suite completa + smoke: alta con anticipo (paso nuevo, editar plan, guardar) → expediente (bloque nuevo); alta sin anticipo (el paso no aparece).
4. **Para la clase**: mostrar P6 resuelto y plantear la pregunta #1 de la lista [validar]: ¿la carátula debe obedecer al plan capturado (Fase B) o mantenerse proporcional (art. 143 literal)?
