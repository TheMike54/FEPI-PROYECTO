# Oleada O5 — HU-07 v2: atraso por concepto, automático y en UNIDADES — 10 jun 2026

> Ejecuta el prompt O5 (P15 del profe). **LOCAL, sin commit/push**, sobre `main` (con O1+UI+O2+O3+O4
> integrados). Componentes guinda (UI-1). **NO se tocó `permisos.js`, `server.js`, G1-G8 ni la
> inmutabilidad de bitácora/firmas.** **SIN DDL, SIN migración** (como O4).

## Rediseño del profe (P15): de "alerta con umbral" a "atraso medido"

La HU-07 era una **configuración** de alertas: el residente definía un **umbral %** por concepto y un canal,
y el sistema "disparaba" cuando el avance real caía bajo el umbral. El profe lo rehízo: el atraso **no se
configura, se mide**. Para el contrato elegido se listan **automáticamente** TODOS los conceptos con

```
déficit = programado_acumulado(al periodo VIGENTE)  −  ejecutado_acumulado     (> 0, en UNIDADES del concepto)
```

sin umbral, sin %, sin canal y sin cron (se recalcula al consultar). El profe insistió además en **separar**
este "Atraso por concepto" del **"Avance de obra" ponderado** (curva HU-05 / estimaciones) — son cosas
distintas y no deben mezclarse.

| | Antes (HU-07 v1) | O5 (v2) |
|---|---|---|
| Origen | config manual (umbral % + canal por concepto) | **automático** (todos los conceptos del contrato) |
| Medida | % avance vs umbral | **déficit en UNIDADES** del concepto |
| Disparo | avance < umbral | **déficit > 0** (programado al periodo − ejecutado) |
| Periodo | — | **periodo VIGENTE** (último con `inicio <= hoy`) |
| Aviso login | — | **badge/banner** "N conceptos con déficit en M contratos" |
| Asentar atraso | — | **nota de bitácora** por fila (tag `atraso`) |

## Decisiones de alcance (consultadas con Maiki)

1. **"Asentar en bitácora" exige bitácora abierta** (no se difiere). Un atraso es una cantidad **derivada en
   vivo**, no un hecho persistido como la sustitución (Pase 2.3) o el avance (O4); diferirlo dejaría la
   pregunta "¿qué déficit se asienta al abrir, el del clic o el recalculado?". Solución: el asiento es un
   **snapshot del momento** → si no hay bitácora, **409 informativo** ("ábrela para asentar"). **Sin tabla nueva.**
2. **Tipo de nota = `'otro'` + `tag='atraso'`** (no un tipo nuevo). `bitacora_notas.tipo` tiene FK a
   `bitacora_nota_tipos`, así que un tipo inventado violaría la FK; añadir uno sería **DDL/seed** (4ª migración
   pendiente tras O2/O3). Se reusa el tipo genérico `otro` con `tag='atraso'` y asunto claro — **SEPARADO** del
   `avance` para la búsqueda, y **sin migración**. `[validar profe]` si prefiere un tipo dedicado más adelante.

## El cálculo (núcleo, server-side)

- **periodo vigente** = el de mayor número con `inicio <= CURRENT_DATE` (`periodoActualDe`). Si ninguno arrancó
  → `paNum = 0` → programado acumulado 0 → **no hay atraso** (nada que medir todavía).
- **programado_acumulado** = `Σ programa_obra.cantidad` del concepto en periodos con `numero <= paNum`. Es el
  **programa VIGENTE**: los convenios reescriben `programa_obra` en vivo (`guardarMatriz`), igual que en O4 →
  un convenio que redistribuye volumen cambia el atraso **solo**, sin código extra.
- **ejecutado_acumulado** = `Σ concepto_avance.cantidad` del concepto (**TOTAL**, todos los periodos). Tomar el
  total —y no acotarlo al periodo— hace que (a) "ir adelantado" NUNCA produzca un falso atraso y (b) el avance
  sin periodo (la matriz se regenera con `SET NULL`) siga contando. El déficit solo aparece cuando lo ejecutado
  va por debajo de lo que tocaba al periodo. Fundamento: el programa es la base del avance (LOPSRM art. 52;
  RLOPSRM art. 45 ap. A fr. X).
- **Solo filas con `déficit > 0`**, cuantizado a 3 decimales (escala `NUMERIC(14,3)`), en la **unidad** del concepto.

## Backend (controllers de dominio — NO zona congelada)

- **`alertas.controller.js` reescrito**:
  - `alertasDeContrato` (`GET /api/alertas/contrato/:id`) → ahora devuelve `{ periodo_actual, total_conceptos,
    total_atrasos, atrasos:[{concepto_label, unidad, programado_acumulado, ejecutado_acumulado, deficit}] }`,
    acotado por participación (`esParteOSupervision`, igual que antes).
  - `resumenAtrasos` (`GET /api/alertas/resumen`) → `{ conceptos, contratos }` con déficit, **acotado por
    participación** (una sola consulta con CTE: por contrato accesible, su periodo vigente y el déficit por concepto).
  - `asentarAtraso` (`POST /api/alertas/contrato/:id/asentar`, body `{contrato_concepto_id}`) → recalcula el
    déficit del concepto; **409** si no hay atraso o no hay bitácora abierta; si procede, asienta la nota con
    `insertarNotaAtomica` (folio atómico, tipo `otro`, tag `atraso`, emisor del JWT) — append-only como todas.
  - **Se retiró** la config (`crearAlerta`/`actualizarAlerta`/`eliminarAlerta` + helpers de umbral/canal).
- **`alertas.routes.js`**: `GET /resumen`, `GET /contrato/:id`, `POST /contrato/:id/asentar` (`requireRole('residente')`).
  Se quitaron `POST /`, `PATCH /:id`, `DELETE /:id`.
- **`bitacora.controller.js`**: `textoNotaAtraso({concepto, unidad, cantidad, periodoNumero})` (exportado) — *"Atraso
  registrado — {concepto}: déficit de {cantidad} {unidad} respecto del programa al periodo {p}."* + cola legal.
  Cambio **aditivo** (no toca la inmutabilidad ni el flujo de firmas).
- **`alerta_atraso`** (la tabla de config) se **conserva** pero ya **no se usa** (instrucción: no borrar tablas).

## Frontend (componentes guinda UI-1)

- **`AlertasAtraso.jsx` reescrito**: sin formulario de umbral/canal. Selector de contrato → tabla automática
  (Concepto · Unidad · Programado acum · Ejecutado acum · **Déficit**) solo con filas en atraso; línea del
  **periodo vigente**; botón **"Asentar en bitácora"** por fila (solo residente, `!soloLectura`); caja que
  **separa** explícitamente este panel del *Avance de obra* (link a la curva HU-05). `?contrato=` (Pase 4) intacto.
- **`AltaContrato.jsx` (ModalDetalleContrato, Pase 4 recableado)**: el indicador "N conceptos en atraso" ahora
  lee `total_atrasos` del nuevo endpoint (antes contaba alertas disparadas). Gating por rol/participación intacto.
- **`Inicio.jsx`**: banner **"Tienes N conceptos con déficit en M contratos"** (`banner-atrasos`), gateado por
  acceso a HU-07 (residente/supervisión), enlazado al panel.
- **`AppShell.jsx`**: la campana muestra el **conteo** de conceptos con déficit (`campana-atrasos`) y enlaza al
  panel — solo para roles con acceso a HU-07; para el resto sigue presentacional.
- **`dummy.js`**: HU-07 renombrada a **"Atraso por concepto"** (menú + Inicio), descripción actualizada.
- **`api.js`**: `resumenAtrasos` + `asentarAtraso`; se quitaron `crearAlerta/toggleAlerta/eliminarAlerta`.

## Tests (lección 7)

- **`hu-07-alertas-atraso.spec.js` reescrito** (16): déficit correcto al periodo + concepto al 100% no aparece ·
  asentar con bitácora crea la nota (`tag=atraso`, "Atraso registrado · déficit de 90") · asentar sin bitácora →
  409 · asentar sin déficit → 409 · **acotamiento 403** (lectura, cuenta no parte) · **asentar bloqueado a rol de
  consulta** (supervisión → 403) · **contrato futuro → periodo_actual null** · resumen del badge acotado · UI:
  tabla + asentar en vivo · **banner + campana** al login (residente) · solo consulta (supervisión, sin botón) ·
  sin acceso (contratista/dependencia/finanzas).
- **`detalle-indicador-atraso.spec.js` actualizado**: sin `POST /api/alertas` (retirado); el indicador cuenta el
  **déficit** sembrado por SQL; el deep-link abre el panel (`tabla-atrasos`/`fila-atraso` en vez de `lista-disparadas`).
- Smoke de API (script efímero) 16/16 verde (cálculo, acotamiento 403, asentar con/sin bitácora, sin déficit).
- **Suite completa: 232 passed · 8 skipped · 0 failed** (corrida completa 230 + 2 tests añadidos por la revisión
  adversarial, verificados 16/16 en su spec). Son los 222 de O4 + 10 netos de HU-07 (la spec pasó de 6 a 16 tests).
  Cero regresiones (O1/O2/O3/O4, roster, Pase 4). `vite build` ✓.

## Revisión adversarial (4 lentes en paralelo)

Se corrió un workflow de revisión por lentes independientes sobre el diff O5: **matemática del déficit ✓**,
**seguridad/acotamiento ✓**, **inmutabilidad/regresión ✓** (cero hallazgos de producto en las tres). El lente de
*specs* señaló 4 huecos de cobertura (ningún bug de producto): 2 se desestimaron como falsos positivos (el revisor
no sabía que la BD demo **acumula** contratos del residente, así que los asserts del badge/banner usan `>=` monótono
a propósito); 2 se **incorporaron** (asentar bloqueado a rol de consulta → 403; contrato futuro → `periodo_actual` null).

## Runbook de integración (Maiki)

1. **Sin migración** (no hay DDL): solo `docker restart sigecop_backend` tras pull (cambiaron `alertas.controller`,
   `alertas.routes`, `bitacora.controller`). El frontend recarga con Vite.
2. Smoke: elegir un contrato con avance < programado → ver el déficit en unidades; abrir bitácora y "Asentar"
   (aparece la nota tag `atraso`); intentar asentar sin bitácora (409); login residente con déficit → banner + campana.
3. **Para el profe**: P15 resuelto (atraso medido en unidades, separado del avance ponderado). Pendientes
   `[validar]`: (a) emisor de la nota de atraso (residente del JWT vs. emisor formal); (b) ¿tipo de nota dedicado
   `atraso` en el catálogo en vez de `otro`+tag? (c) la tabla `alerta_atraso` queda inerte (¿se elimina en una
   limpieza futura o se reaprovecha?).

## Archivos tocados

Backend: `alertas.controller.js` (reescrito), `alertas.routes.js` (reescrito), `bitacora.controller.js`
(`textoNotaAtraso` + export). Frontend: `AlertasAtraso.jsx` (reescrito), `pages/AltaContrato.jsx` (indicador Pase 4),
`pages/Inicio.jsx` (banner), `components/ui/AppShell.jsx` (campana), `data/dummy.js` (rótulo HU-07), `services/api.js`.
Tests: `hu-07-alertas-atraso.spec.js` (reescrito), `detalle-indicador-atraso.spec.js` (actualizado). **Sin DDL.**
