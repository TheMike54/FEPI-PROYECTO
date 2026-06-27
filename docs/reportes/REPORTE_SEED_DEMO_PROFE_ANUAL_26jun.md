# REPORTE — Seed de DEMO ANUAL para el profe (`DEMO-PROFE-ANUAL`) · 26-jun-2026

> **Qué se hizo:** un seed SQL (`backend/scripts/seed_demo_profe_anual.sql`) que siembra UN contrato **anual**
> (12 periodos mensuales) pre-armado **hasta bitácora abierta**, con **avance vacío**, para que en la demo EN
> VIVO el equipo capture avance + foto e integre una estimación. **Solo datos/SQL + runbook. NO se tocó código,
> schema ni zona congelada.** Trabajo en `main`, **LOCAL sin push, NO ejecutado contra Render.**
>
> **Entregables:** (1) `backend/scripts/seed_demo_profe_anual.sql` · (2) runbook backup-gated
> `docs/planes/RUNBOOK_SEED_DEMO_PROFE_ANUAL_RENDER_26jun.md` · (3) este reporte.

## Cómo se probó (LOCAL)
- **2 pasadas** con `psql -v ON_ERROR_STOP=1` → **exit 0** ambas; **conteos idénticos** (sin duplicados):
  1 contrato · 3 conceptos · 12 periodos · 19 celdas de programa · 12 renglones de plan · 3 garantías ·
  1 documento (PDF) · 1 nota (apertura) · **0 avance**.
- El seed **se auto-verifica** (aborta si algo no cuadra). Salida de las assertions: `cuadre OK`.
- **Prueba viva por API** (la que hará el profe): login `contratista@` → `GET /api/estimacion-prep` (P1) →
  `POST /api/estimaciones` con avance vacío → **HTTP 201**, estado `integrada`, carátula:
  subtotal 525,000.00 − amortización 157,500.00 (30%) − retención 2,625.00 (5 al millar) = **neto 364,875.00**
  (sin retención por atraso). Luego **re-seed** dejó el contrato prístino (avance=0, estimaciones=0, pdf=1).
- Las **otras familias quedaron intactas** tras correr el seed: SOP-2026 = 10, PRUEBA-HU = 24, PRUEBA-ATRASO = 3,
  PRUEBA-TR = 7 (sin cambios).

---

## Tabla de verificación

| Campo | Valor sembrado | Verificado |
|---|---|---|
| **Folio** | `DEMO-PROFE-ANUAL` (idempotente: el seed resetea solo `DEMO-PROFE-ANUAL%`) | ✅ |
| **Periodos** | **12 mensuales** (P1 jul-2025 … P12 jun-2026); **P1..P11 VENCIDOS** hoy, P12 en curso | ✅ |
| **Monto** | **$12,000,000.00** = Σ ROUND(cant×pu,2): CONC-01 $3.5M + CONC-02 $4.5M + CONC-03 $4.0M | ✅ cuadra al centavo |
| **Programa** | concepto×periodo, Σ por concepto = contratado (CONC-01 10000 m³ · CONC-02 3000 m³ · CONC-03 1600 m²), curva S | ✅ 100% por concepto |
| **Anticipo** | **30%** EXACTO = $3,600,000.00 (no dispara el PDF de autorización: el gate es `>30`) | ✅ |
| **Plan amortización** | Σ = $3,600,000.00, proporcional al programa (art. 143 fr. I RLOPSRM); ≤ importe del periodo y >0 donde hay obra | ✅ cuadra |
| **Garantías** | cumplimiento $1.2M (vig. 2027-06-30) · anticipo $3.6M (2027-06-30) · vicios ocultos $1.2M (2028-06-30) | ✅ vigentes |
| **Bitácora** | **ABIERTA y firmada** por las 3 partes; nota #1 = apertura firmada | ✅ |
| **PDF firmado** | LIGADO (`contrato_documentos` tipo='contrato', PDF mínimo válido) — habilita integrar estimación | ✅ |
| **Estado de avance** | **VACÍO** (0 filas en `concepto_avance`, 0 en `avance_fotos`) | ✅ a propósito |
| **Estimaciones / Pagos** | **ninguna / ninguno** | ✅ |
| **pena_convencional_pct** | **NULL** (carátula en vivo predecible, sin retención por atraso sorpresa) | ✅ decisión documentada |

### Curva planeada sembrada (la ejecutada arranca en 0)
| Periodo | Valor planeado | Acumulado |
|---|---|---|
| P1 jul-25 | 525,000 | 525,000 |
| P2 ago-25 | 875,000 | 1,400,000 |
| P3 sep-25 | 1,175,000 | 2,575,000 |
| P4 oct-25 | 1,300,000 | 3,875,000 |
| P5 nov-25 | 1,250,000 | 5,125,000 |
| P6 dic-25 | 1,075,000 | 6,200,000 |
| P7 ene-26 | 1,125,000 | 7,325,000 |
| P8 feb-26 | 1,225,000 | 8,550,000 |
| P9 mar-26 | 1,200,000 | 9,750,000 |
| P10 abr-26 | 875,000 | 10,625,000 |
| P11 may-26 | 750,000 | 11,375,000 |
| P12 jun-26 | 625,000 | **12,000,000** |

### Qué hará el profe EN VIVO
1. Login `contratista@sigecop.test` (superintendente del contrato).
2. **Capturar avance (HU-06)** de un periodo **VENCIDO** (recomendado **P11**) con **foto obligatoria**.
3. **Integrar la estimación (HU-12)** de ese mismo periodo vencido → integra sin error (PDF ya ligado).
4. (Opcional) seguir el ciclo: presentar → autorizar → tránsito a pago → registrar pago.

---

## Las 3 VERIFICACIONES CRÍTICAS (respondidas)

### ✅ 1) Con AVANCE VACÍO, ¿el sistema permite integrar una estimación de un periodo vencido?
**SÍ — probado EN VIVO (HTTP 201) y confirmado por lectura de código adversarial.**
- `integrarEstimacion` **nunca consulta `concepto_avance`**: las validaciones son contra **lo CONTRATADO**
  (`contrato_conceptos`, art. 118 — `estimaciones.controller.js:238-256`) y **lo PLANEADO** (`programa_obra`,
  art. 45 — `:265-285`); las cantidades salen del **body del usuario** (`:96-106`). No hay gate de avance previo.
- El único bloqueo extra es el **PDF firmado** (`contrato_documentos` tipo='contrato', `:163-164`) — **el seed lo
  liga** → no falla. Y el anticipo de **30% no dispara** el PDF de autorización (el gate es `>30`, `:166`).
- **Matiz 1 (camino legal):** el periodo debe estar **VENCIDO** (`periodo_fin < CURRENT_DATE`, `:79-82`). P1..P11
  son integrables; **P12 (en curso) devuelve 409** → en la demo estimar P1..P11, no P12.
- **Matiz 2 (cosmético):** sin avance, el front prellena los generadores en **0**; el presentador **teclea** las
  cantidades a mano (tope = planeado/contratado) para habilitar "Integrar".

### ✅ 2) ¿La curva se ve bien con 12 periodos y avance en 0?
**SÍ — sin crash, 500 ni pantalla en blanco; riesgo nulo.**
- `CurvaAvance.jsx` (en `frontend/src/pages/`) compone la curva en cliente desde 3 lecturas; con avance vacío el
  backend devuelve `COALESCE(...,0)` y arrays vacíos (`trabajos.controller.js:147-204`), sin división por cero.
- Dibuja la **planeada** en curva S subiendo a 100% y la **ejecutada plana en 0%** hasta el marcador "hoy"; el KPI
  muestra "Atraso" (visualmente sólido para demostrar). Todos los guards (`denom>0`, `cont>0`, `montoCorte>0`,
  `datos.length>0`) protegen el caso vacío (`CurvaAvance.jsx:374-377,396,398-399,63,99-109`).

### ✅ 3) Al capturar avance + foto en vivo, ¿esa foto NO aparece en los soportes/notas de la estimación?
**NO se cruza — aislamiento total por diseño de datos; riesgo nulo.**
- **Tablas y FKs distintas:** `avance_fotos.avance_id → concepto_avance(id)` (`schema.sql:621-623`) vs
  `estimacion_fotos` colgada de `estimacion_id` (con `contrato_concepto_id`, `schema.sql:635`). `avance_fotos`
  **no tiene** `contrato_concepto_id` → ni esa llave comparten.
- **Endpoints/controllers separados, sin ningún JOIN entre ambas:** `/api/avance-fotos` (solo `avance_fotos`) vs
  `/api/estimacion-fotos` (solo `estimacion_fotos`). `estimacion-prep` lee `concepto_avance` SOLO para el `SUM`
  del % físico (`estimacion-prep.controller.js:76-99`), nunca fotos.
- El paso 4 del wizard de estimación ("Soportes y notas") **ni siquiera monta `FotosEstimacion`**: muestra solo
  notas de bitácora + checklist art. 132 (`IntegracionEstimacion.jsx:1054-1094`). La única foto que aparece en
  el expediente/carátula de una estimación es la subida **explícitamente** contra esa estimación.

> **Dato adicional (foto del avance):** la foto del avance es **OBLIGATORIA validada en backend** (400 sin foto,
> `trabajos.controller.js:237-239`, magic bytes JPEG/PNG) y se guarda **en la misma transacción** que el avance
> en `avance_fotos` (`:344-351`). Dejar el avance vacío evita que cualquier foto preexista antes de la demo.

---

## Método (ultracode)
- Lectura previa obligatoria (CLAUDE.md): `ESTADO_ACTUAL.md` + esquema + controllers de estimación/avance/curva.
- **Workflow de verificación adversarial** (8 agentes: investigar → refutar → sintetizar): las 3 afirmaciones
  quedaron **SOSTENIDAS** (ningún refutador las rompió).
- **Prueba viva por API** contra el stack local (login + prep + integración real) como prueba de oro de la #1.

## Pendiente para Maiki
- Revisar el diff (1 archivo nuevo de seed + 2 docs; **nada de código/schema/zona congelada**).
- Cuando quieras la demo en Render: seguir el runbook `RUNBOOK_SEED_DEMO_PROFE_ANUAL_RENDER_26jun.md`
  (backup → cp + psql → verificación → confirmar familias intactas). Re-sembrar para resetear antes de cada demo.
- (Opcional) anotar el nuevo seed en `ESTADO_ACTUAL.md` junto a `seed_demo_24` / `seed_demo_tr` si quieres
  dejarlo registrado como dato demo permanente.
