# REPORTE — Ejecución del rediseño "match con el mockup" (F0–F6) · 18-jun-2026

> Ejecución autónoma del plan `docs/planes/PLAN_REDISENO_MATCH_MOCKUP_18jun.md`, de corrido F0→F6, con
> checkpoint (build + suite completa verde) entre cada fase. **LOCAL, sin push.** Mockup objetivo:
> `docs/mockups/sigecop-prototipo-ciclos.html`.

## Resultado: llegué hasta F6 (TODAS las fases). Suite final **340 passed · 8 skipped · 0 failed**.
- Baseline al inicio: 338/8/0. Final: **340/8/0** (+2 tests nuevos del 4º paso de pago).
- **Ningún checkpoint quedó rojo** → no hubo parada segura; las 7 fases pasaron de corrido.

| Fase | Qué hice | Checkpoint (suite) |
|---|---|---|
| F0 | Doc: clasificación TIPO A/B + regla de oro en `HISTORIAS_POR_CICLOS.md` | 338/8/0 (baseline) |
| F1 | Quité los 6 "Recorrido por bloques" del Sidebar | 338/8/0 |
| F2 | Avance/Conv/Fin/Exp (pantalla/visor) — `AmbienteAvance` ya tenía Curva/Alertas en paralelo (verificación) | 338/8/0 |
| F3 | Bitácora: el padre del flujo lleva al WIZARD `/bitacora/ambiente` (solo `Sidebar.jsx`) | 338/8/0 |
| F4 | Estimación: bloque "EN PARALELO" (Revisión/Reingreso/Historial/Tablero) dentro del wizard | 338/8/0 |
| F5 | **Sidebar PLANO** (sin acordeón ni sub-items; promoción de huérfanos conservada) | 338/8/0 |
| F6 | **Pago: HU-21 "Registrar pago" como 4º paso** (form compartido, gate finanzas, ruta conservada) | **340/8/0** |

## Capturas vs mockup (`docs/reportes/screens-match-mockup/`)
- `sidebar-plano.png` — **lista plana**: CICLOS (Alta · Fianzas · Ciclo de estimación `HU 12–16` · Bitácora `HU 08–11` · Avance `HU 05–07` · Pago `HU 20–21` · Convenios · Cierre/finiquito · Expediente) · VISTAS EJECUTIVAS (Portafolio · Tablero · Reportes · Ciclo de vida) · ADMINISTRACIÓN. **Sin acordeón.** = mockup.
- `ciclo-estimacion.png` — wizard de 5 pasos (Periodo→Generadores→Carátula→Soportes→Integrar) **+ bloque "EN PARALELO (LECTURA / OTRO ACTOR — NO SE BLOQUEAN)"** con Revisión(15)/Reingreso(16)/Historial(14)/Tablero(17). = mockup.
- `ciclo-bitacora.png` — wizard (Apertura→Firma→Emitir) + nota "Consultar(10)/Minutas(11) en paralelo, siempre accesibles". = mockup.
- `ciclo-avance.png` — pantalla "Registrar avance" + Curva/Alertas en paralelo.
- `ciclo-pago.png` — sidebar plano **filtrado por rol** (finanzas: Fianzas · Pago y tránsito · Reportes). La barra de **4 pasos** (Suficiencia→Soportes→Instrucción→**Registrar pago**) aparece al elegir una estimación autorizada — verificada por `pago-wizard.spec.js` (el contrato de la captura no tenía autorizada).

## Specs reescritos / añadidos
- **F1 (navegación por URL):** `ambiente-bitacora`, `ambiente-avance`, `ambiente-pago`, `ambiente-convenio`, `ambiente-finiquito`, `ambiente-expediente` → `page.goto` (su item "Recorrido" se quitó del sidebar; la ruta sigue).
- **F5 (presencia de sub-items):** quité las aserciones de presencia-en-sidebar de los sub-items ahora ocultos (viven dentro del ciclo) en `hu-05, hu-06, hu-07, hu-08, hu-09, hu-10, hu-11, hu-13, hu-14, hu-15, hu-16, hu-21` (12 specs); la navegación la cubre el helper. Reescribí `nav-modo-sistema` (grupo "Flujos"→"Ciclos"; rango HU del ciclo de estimación) y `nav-diseno-screens` (test de acordeón → test de sidebar plano).
- **F5 (helper):** `e2e/_helpers.js` → `goToViaSidebar` ahora hace **fallback a `page.goto`** cuando la vista ya no es item del sidebar (vive dentro de su ciclo). `sidebarLinkFor` intacto (sigue asertando presencia real). De-risker que evitó tocar ~50 specs de navegación.
- **F6 (cobertura):** `pago-wizard.spec.js` +2 tests del 4º paso (finanzas SÍ registra; contratista ve el form pero el botón está gateado).

## Archivos de producto tocados (frontend) — y qué NO se tocó
**Tocados (presentación/UI, permitido por el plan):**
- `frontend/src/components/layout/Sidebar.jsx` (F1/F3/F5) — navegación; el gating sigue por `nivelDe`/roles (lee `permisos.js`, **no lo modifica**).
- `frontend/src/pages/IntegracionEstimacion.jsx` (F4) — bloque "en paralelo".
- `frontend/src/pages/TransitoPago.jsx` (F6) — 4º paso embebido.
- `frontend/src/pages/RegistroPago.jsx` (F6) — usa el form compartido (misma ruta /pagos/registro, mismos testids).
- `frontend/src/components/pagos/RegistroPagoForm.jsx` (F6, **NUEVO**) — form de HU-21 reutilizable; **única fuente del POST `/api/pagos`** (vía `api.registrarPago`, sin duplicar); botón gateado a `rol==='finanzas'`.

**ZONA CONGELADA — INTACTA (verificado):** NO se tocó `permisos.js`, `auth.middleware.js`, `lib/acceso.js`, NINGÚN controller ni su lógica, los candados server-side, `schema.sql`, ni las **rutas de `App.jsx`**. El rediseño es **100% presentación/navegación + tests**; **cero backend** en F0–F6. El stepper es ESPEJO del candado server-side (TIPO A), no el candado.

## Regla de oro TIPO B (verificada)
Las vistas siempre-accesibles **nunca** quedaron tras un candado: Consultar(10)/Minutas(11) en la sección paralela incondicional de Bitácora; Historial(14)/Revisión(15)/Reingreso(16)/Tablero(17) en el bloque "en paralelo" de Estimación; Curva(05)/Alertas(07) en Avance; Expediente(04) como visor. Para roles que ven un sub-HU pero **no** el padre del ciclo (p. ej. dependencia ve Historial/Revisión/Curva), el Sidebar **promueve** ese hijo a item plano → **no se pierde ningún acceso** (mismo comportamiento que el acordeón anterior; gating idéntico).

## Pendiente para Maiki
- **Integrar** (commit/push) este rediseño junto con lo de la ronda previa (Oleada 3 + wizards + 4 DDL). Todo LOCAL.
- Decidir si re-capturar `ciclo-pago.png` con una estimación autorizada sembrada (cosmético; la funcionalidad ya está probada por `pago-wizard.spec`).

*Ejecución autónoma, local sin push. Suite final 340/8/0. Sin tocar zona congelada.*
