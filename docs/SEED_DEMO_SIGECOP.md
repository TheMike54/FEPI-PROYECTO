# SEED DEMO — Paquete de datos de prueba (SIGECOP)

> **Origen:** revisión del profe del **15-jun-2026** (FASE 1 de `docs/planes/PLAN_REVISION_PROFE_15jun.md`).
> El profe pidió, literal: *"generen datos dummy… formen su paquete de datos… debes poder probar con
> los datos que ya tienes"* sin capturar un contrato a mano cada vez, y *"hagan ese registro en la
> base directa"*. Este seed carga **directo en la BD** (sin pasar por la API ni sus gates) un paquete
> coherente y **cuadrado al centavo** para demostrar **cualquier** historia de usuario.

Archivos: `backend/scripts/seed_demo.sql` (el SQL) · `backend/scripts/seed_demo.js` (wrapper npm).

---

## Cómo correrlo

**Idempotente y re-ejecutable** (borra y recrea los contratos demo; no duplica). **NO corre en los
tests** (no hay global-setup que lo invoque), así que no altera los conteos de la suite.

### Local (stack en Docker arriba)
```bash
# Opción A — wrapper npm dentro del contenedor del backend (DB_HOST=db):
docker exec sigecop_backend npm run seed:demo

# Opción B — psql directo, piping el archivo:
docker exec -i sigecop_db psql -U sigecop -d sigecop_db -v ON_ERROR_STOP=1 < backend/scripts/seed_demo.sql
```

### Render (producción — solo Maiki; `DATABASE_URL` en el entorno)
```bash
# En el shell del servicio backend de Render (DATABASE_URL ya está en env):
npm run seed:demo
# o, con el runbook de migración:  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f scripts/seed_demo.sql
```

Cuentas demo (contraseña común `Sigecop2026!`): `residente@`, `contratista@`, `supervision@`,
`dependencia@`, `finanzas@sigecop.test`.

---

## Qué deja cargado

### 1) `OBRA-2026-DEMO-01` — contrato COMPLETO (el de la demo)
Construcción de edificio de laboratorios. Monto **$2,500,000.00**, anticipo **30%** ($750,000.00),
ciclo mensual, **7 periodos** (dic-2025 a jun-2026). Las **7 fases de obra** que dictó el profe:

| Clave | Concepto | Cantidad | P.U. | Importe |
|---|---|---:|---:|---:|
| CONC-01 | Estudio de mecánica de suelos | 1 est | $100,000.00 | $100,000.00 |
| CONC-02 | Remoción y movimiento de tierras | 2,000 m³ | $150.00 | $300,000.00 |
| CONC-03 | Cimentación | 500 m³ | $1,200.00 | $600,000.00 |
| CONC-04 | Instalaciones eléctricas | 1 lote | $400,000.00 | $400,000.00 |
| CONC-05 | Instalaciones hidrosanitarias | 1 lote | $300,000.00 | $300,000.00 |
| CONC-06 | Cableado estructurado | 1 lote | $200,000.00 | $200,000.00 |
| CONC-07 | Acabados | 1,000 m² | $600.00 | $600,000.00 |
| | **Total** | | | **$2,500,000.00** |

Trae: **programa de obra al 100%** (cada concepto en su periodo), **plan de amortización
proporcional al programa** (FASE 2, art. 143 fr. I), garantías (cumplimiento/anticipo/vicios), datos
jurídicos, **PDF firmado**, **roster** (residente/superintendente/supervisión), **bitácora abierta**
con apertura firmada por las 3 partes + 3 notas (apertura + avance + convenio, firmadas), **1 convenio
modificatorio de plazo** (HU-03, art. 59: 211→241 días, ligado a su nota), avance físico, y el
**ciclo de estimación en TODOS los estados** (el plazo final del contrato es 241 días por el convenio):

| # | Concepto | Subtotal | Amortización (30%) | 5 al millar | **Neto** | Estado |
|---:|---|---:|---:|---:|---:|---|
| 1 | CONC-01 | $100,000.00 | $30,000.00 | $500.00 | **$69,500.00** | **Pagada** (con pago de Finanzas) |
| 2 | CONC-02 | $300,000.00 | $90,000.00 | $1,500.00 | **$208,500.00** | **Autorizada** (turnada por supervisión) |
| 3 | CONC-03 | $600,000.00 | $180,000.00 | $3,000.00 | **$417,000.00** | **Presentada** |
| 4 | CONC-04 | $400,000.00 | $120,000.00 | $2,000.00 | **$278,000.00** | **Integrada** |
| 5 | CONC-05 | $300,000.00 | $90,000.00 | $1,500.00 | **$208,500.00** | **Rechazada** (observación a contratista) |
| 6 | CONC-05 | $300,000.00 | $90,000.00 | $1,500.00 | **$208,500.00** | **Reingreso** de la #5 (`reemplaza_a`) |

Fórmula (server-side, sin IVA): `neto = subtotal − ROUND(subtotal×30%,2) − ROUND(subtotal×0.005,2)`.

### 2) `OBRA-2026-ATRASO-01..04` — contratos EN ATRASO (para el tablero/alertas)
Periodos en el **pasado** + avance **bajo/cero** → el sistema **deriva el atraso** en lectura
(HU-07 panel de déficit, HU-17 tablero, HU-18 portafolio). Comparten las **mismas cuentas/empresas**
que el contrato completo → demuestran que el **catálogo de empresas (FASE 3) NO duplica**.

| Folio | Concepto | Monto | Inicio | Periodos | Ejecutado | Déficit (unidades) |
|---|---|---:|---|---:|---:|---:|
| ATRASO-01 | Pavimentación | $1,000,000 | 2026-01-01 | 5 | 0 / 1,000 m² | 1,000 |
| ATRASO-02 | Drenaje sanitario | $800,000 | 2026-02-01 | 4 | 400 / 800 m | 400 |
| ATRASO-03 | Barda perimetral | $1,500,000 | 2026-03-01 | 4 | 300 / 1,500 m | 1,200 |
| ATRASO-04 | Rehabilitación de aulas | $2,000,000 | 2025-11-01 | 7 | 600 / 2,000 m² | 1,400 |

---

## Guion de prueba por HU (qué cuenta, qué pantalla, qué se ve)

> Inicia sesión con la cuenta indicada (todas `Sigecop2026!`) y abre la pantalla. El dato ya está
> cargado: **no captures nada**, solo verifica.

| HU | Cuenta | Pantalla | Qué se ve |
|---|---|---|---|
| HU-00 Login | cualquiera | Inicio | Entra sin elegir rol (usuario/contraseña); el rol se deduce. |
| HU-01 Alta / expediente | residente | Contratos → OBRA-2026-DEMO-01 | Contrato completo: catálogo, programa, garantías, jurídicos, plan, PDF. |
| **HU-03 Convenios** | residente | Convenios → OBRA-2026-DEMO-01 | Convenio de **plazo** (211→241 días) con su nota de bitácora ligada. |
| HU-04 Expediente | residente | Expediente → OBRA-2026-DEMO-01 | Bloques + empresa del equipo + roster + estimaciones + **convenio**; **Exportar PDF** (1 solo doc). |
| HU-05 Curva de avance | residente | Programa/Curva → DEMO-01 | Curva S programado vs ejecutado (físico 100%). |
| HU-06 Trabajos terminados | contratista | Avance por periodo → DEMO-01 | Avance registrado por concepto/periodo. |
| **HU-07 Alertas de atraso** | residente | Alertas → ATRASO-01..04 | **Panel de déficit por concepto** (unidades) + badge al login. |
| HU-08/09/10 Bitácora | residente | Bitácora → DEMO-01 | Bitácora **abierta**, apertura firmada, 2 notas **firmadas** (apertura, avance). |
| **HU-12 Integración estimación** | contratista | Estimaciones → DEMO-01 | Estimación **#4 Integrada**; nota firmada ligada a la #1. |
| **HU-13 Presentación** | contratista | Estimaciones → #3 | Estimación **Presentada** (art. 54). |
| HU-14 Historial | residente | Historial → DEMO-01 | Línea de tiempo de las estimaciones. |
| **HU-15 Revisión/autorización** | residente | Revisión → #2 / #5 | **#2 Autorizada**, **#5 Rechazada** con observación. |
| **HU-16 Reingreso** | contratista | Estimaciones → #6 | **Reingreso** de la #5 (nueva versión integrada, `reemplaza_a`). |
| **HU-17 Tablero** | residente | Tablero | Estimaciones por estado (pagada/autorizada/presentada/integrada/rechazada) + contratos en atraso. |
| HU-18 Portafolio | dependencia | Portafolio | Semáforos de salud (los ATRASO-* salen en rojo). |
| HU-19 Reportes | residente | Reportes → DEMO-01 | Exporta los 7 reportes (carátula, generadores, etc.). |
| **HU-21 Pago** | finanzas | Pagos → DEMO-01 | Estimación **#1 Pagada** (pago registrado, importe = neto $69,500). |
| HU-22 Roster | residente | Roster → DEMO-01 | Residente/superintendente/supervisión vigentes. |
| **HU-23 Empresas** | — | Registro | La empresa se **elige de un selector** del catálogo (no se teclea). "➕ Registrar nueva" solo si no existe; al teclear una variante ("Constructora Demo SA de CV") avisa **"ya existe… selecciónala"** (no duplica, FASE 1). |

---

## Notas

- **[validar profe]:** la tasa de pena convencional sembrada (0.10%) es de ejemplo.
- La fecha "hoy" del sistema es **2026-06-15**; los periodos del paquete están calibrados respecto a
  esa fecha (los ATRASO-* tienen periodos vencidos para disparar alertas). Si se corre mucho después,
  el contrato completo seguirá coherente, pero conviene revisar las fechas si cambia el contexto.
- Para **limpiar** el paquete sin recargar: `DELETE FROM contratos WHERE folio LIKE 'OBRA-2026-%';`
  (la cascada + el orden del propio seed se encargan de los hijos; ver el bloque (0) del SQL).
- Las **empresas** demo las siembra `schema.sql`; este seed reutiliza las cuentas, así que todos los
  contratos del paquete cuelgan de la misma "Constructora Demo" (no se generan empresas nuevas).
