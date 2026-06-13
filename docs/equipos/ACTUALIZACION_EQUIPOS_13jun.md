# SIGECOP — Actualización para los equipos E2 / E3 (13-jun-2026)

> `main` cambió **muchísimo** en ~1 semana (oleadas O0-O9, reskin UI, reconciliación del flujo de
> estimación, integraciones HU-15/HU-19). Si su rama está atrasada, **rebasen antes de seguir** o tendrán
> conflictos grandes y trabajarán sobre supuestos obsoletos. Fuente de verdad del estado:
> `docs/contexto-claude/ESTADO_ACTUAL.md`.

---

## 1. ⚠️ LO PRIMERO: rebasar sobre `main` actual

```bash
git fetch origin
git checkout feat/eX-tu-rama
git rebase origin/main          # o: git merge origin/main si prefieren
# resuelvan conflictos, corran la suite local, y sigan
```
`main` está en `d6abfdd`. Sus ramas (`feat/e2-*`, `feat/e3-*`) son de hace ~1 semana. **No abran PR sin
rebasar primero.**

---

## 2. Qué cambió (accionable)

### (a) 🔴 EL FLUJO DE ESTIMACIÓN SE INVIRTIÓ Y RECONCILIÓ (lo más importante)
El ciclo correcto HOY (art. 54 LOPSRM, reconciliado O7↔HU-15):

**contratista INTEGRA (HU-12) → contratista PRESENTA (HU-13) → supervisión OBSERVA/TURNA + residencia
AUTORIZA/RECHAZA (HU-15) → finanzas PAGA (HU-21).**

**Estados internos del esquema vs etiquetas de UI** (no confundir — el vocabulario está cruzado a propósito):

| Estado interno (`estimaciones.estado`) | Etiqueta UI | Quién lo produce |
|---|---|---|
| `integrada` | **Integrada** | contratista integra (HU-12) |
| `enviada` | **Presentada** | contratista presenta (HU-13) — endpoint sigue siendo `/enviar` |
| `autorizada` | **Autorizada** | residencia autoriza (HU-15, tras turnado de supervisión) |
| `rechazada` | **Rechazada** | residencia rechaza (HU-15) |
| `pagada` | **Pagada** | finanzas paga (HU-21) |

- Usen `frontend/src/data/estadoEstimacion.js` (`labelEstadoEstimacion`) para mostrar el estado — **no
  hardcodeen** "Enviada"/"Autorizada".
- Permisos (de `permisos.js`, congelado): HU-13 `contratista='E'`; HU-15 `residente='E'`, `supervision='E'`.
- El turnado **no es un estado**: se modela con `estimacion_observaciones.turnado_a='residencia'`.
- Gate de pago **permisivo** (`['integrada','enviada','autorizada']`) — `[validar profe]` endurecer luego.

### (b) Reskin UI institucional guinda
Hay un sistema de diseño en `frontend/src/components/ui/` (`AppShell`, `Card`, `Kpi`, `Badge`, `Modal`,
`Boton`, `Tabla`, `Breadcrumb`, `Toast`…) y `components/vista/` (`HeaderVista`, `SeccionCriterios`,
`RegionEditable`, `BannerContexto`). **Reutilícenlos** en vez de estilos sueltos; respeten los tokens
guinda. (Gotcha: tocar `tailwind.config` exige `docker restart sigecop_frontend`.)

### (c) Tablas nuevas en el esquema (ya migradas en Render)
`plan_amortizacion` (O2) · `empresas` + `usuarios.empresa_id` (O3) · `convenios_modificatorios.nota_id` +
`programa_version*` (HU-03/O6) · tipo de nota `'atraso'` en `bitacora_nota_tipos` (O-PROFE) · Etapa C en
`estimaciones` (`pena_convencional_pct` en contratos, `retencion_atraso`, `avance_fisico_pct`,
`avance_financiero_pct`) · `estimacion_observaciones` (HU-15) · `concepto_avance` (HU-06). El esquema es
**idempotente** y lo aplica `RUN_MIGRATIONS` en cada deploy. **No editen `schema.sql`**: pídanle a Maiki el
bloque de DDL (mira `docs/contexto-claude/Borrador_DDL_Tablas_Nuevas_SIGECOP.md`).

### (d) Reglas de negocio que cambiaron (decisiones del profe, O-PROFE)
- **Avance que excede lo programado del periodo → AVISA, no bloquea.** Solo bloquean: **art. 118** (acumulado
  por concepto > contratado, y > planeado A2) y conceptos fuera del catálogo.
- **Notas de CONSECUENCIA (atraso, convenio) las emite el RESIDENTE** (art. 53), no quien dispara el evento.
  Notas de HECHO (avance, sustitución) las emite quien ejecuta (JWT).
- **Amortización del anticipo = art. 138 RLOPSRM** (se corrigió la cita vieja 143→138).
- **Notas automáticas atómico/diferido:** un evento con bitácora abierta asienta su nota en la misma
  transacción; sin bitácora, se difiere y se asienta sola al `abrirBitacora`. Reusen `insertarNotaAtomica`.

### (e) Zona congelada (NO tocar — pídanselo a Maiki)
`auth`, `permisos.js`, `server.js`, `schema.sql` (salvo aditivo idempotente vía Maiki), triggers de
inmutabilidad, G1-G8 del alta, lógica de cálculo de la carátula, `SesionContext.jsx`, `App.jsx`,
controllers/routes de **auth/usuarios/contratos/estimaciones**. *(Nota: `estimaciones-ciclo` y
`estimacion-prep` SÍ son suyos, E3.)*

---

## 3. Pendientes por equipo

### Equipo 3 (estimaciones / pagos / reportes)
- **HU-16 Reingreso (desbloqueada):** hoy `ReingresoEstimacion.jsx` es maqueta (dummy, sin backend) y el
  rechazo de HU-15 deja la estimación en `'rechazada'` **terminal**. Falta `POST` de reingreso que inserte
  una estimación nueva con `reemplaza_a=<id rechazada>` (la columna YA existe) copiando el catálogo como
  bloque independiente, sin reabrir el plazo del art. 54.
- **HU-18 Portafolio:** `PortafolioEjecutivo.jsx` opera sobre 5 contratos hardcodeados. Falta endpoint +
  cableado `api.js` para derivar semáforos de datos reales (avance, plazos legales, penalizaciones).
- **HU-20 Tránsito a pago:** `TransitoPago.jsx` es prototipo; **toda la HU necesita backend**. La DDL
  (`presupuesto_anual`, `instruccion_pago`) YA existe pero ningún controller la usa: falta suficiencia
  presupuestal server-side (Σ pagado+neto ≤ techo, art. 24), persistir la instrucción y notificar a Finanzas.
- **GENERADORES Y SOPORTES (art. 132 RLOPSRM — lo que el profe reclama):** `estimacion_generadores` ya se
  guarda; `estimacion_soportes`/`estimacion_fotos` son **esqueleto BYTEA diferido** (no se suben archivos).
  Falta la carga real de números generadores detallados y soportes/fotos por estimación.
- **R4 de HU-19 (observaciones):** el reporte 4 está deshabilitado; falta un GET de observaciones **a nivel
  contrato** (HU-15 las expone solo por estimación).

### Equipo 2 (bitácora / documental / avance)
- **Apertura narrativa de bitácora:** completar los datos/forma de la apertura según art. 123 RLOPSRM.
- **Vincular minuta ↔ nota (HU-11):** `MinutasVisitas.jsx` es maqueta sin backend; la columna
  `minutas.nota_id` está **huérfana**. Falta controller/route de minutas/visitas + el vínculo real a una
  nota de bitácora (HU-09).
- **Tipos de nota por rol:** revisar el catálogo `bitacora_nota_tipos` (art. 125) y que cada rol vea los
  suyos. (Ojo: los specs de HU-08 están desactualizados/`test.fixme` — conviene reescribirlos.)

---

## 4. Cómo entregar
- **Por PR sobre `main` actual** (rebasado). **Solo Maiki integra y despliega.** Nadie commitea a `main`.
- **Cita el artículo** de ley en cada validación, o marca **`[validar]`** si es interpretativo.
- **Suite verde antes del PR** (objetivo `258 passed · 8 skipped · 0 failed`); corran local (en CI no corren
  los e2e, solo `vite build`).
- **Deadline:** la BD de Render (plan free) expira **~25-jun**; entrega objetivo **~28-jun**.

---

## 5. Mensaje corto para pegar en el chat del equipo

```
📢 Equipos E2/E3: main cambió MUCHÍSIMO esta semana. ANTES de seguir:
1) git fetch && rebasen su rama sobre origin/main (d6abfdd) — si no, conflictos grandes.
2) Cambio clave: el flujo de estimación se invirtió → contratista INTEGRA (HU-12) y PRESENTA (HU-13) →
   supervisión observa/turna + residencia autoriza/rechaza (HU-15) → finanzas paga (HU-21).
   Estados internos: integrada/enviada/autorizada/rechazada/pagada; etiquetas: Integrada/Presentada/
   Autorizada/Rechazada/Pagada (usen estadoEstimacion.js, no hardcodeen).
3) Hay sistema de diseño guinda en components/ui/ — reúsenlo. Tablas nuevas ya migradas (no toquen schema.sql).
4) Reglas nuevas: avance que excede el periodo AVISA (no bloquea; solo art.118 bloquea); notas de atraso/
   convenio las emite el RESIDENTE (art.53); amortización = art.138.
5) Pendientes: E3 → HU-16 (ya desbloqueada), HU-18, HU-20, generadores/soportes (art.132), R4 de HU-19.
   E2 → apertura narrativa, vincular minuta↔nota (HU-11), tipos de nota por rol.
6) Entregar por PR sobre main rebasado, suite verde, citar artículo o [validar]. Solo Maiki integra.
   Deadline BD Render ~25-jun, entrega ~28-jun. Estado completo: docs/contexto-claude/ESTADO_ACTUAL.md
```
