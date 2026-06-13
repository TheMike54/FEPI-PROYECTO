# HU-03 Convenios modificatorios (Fundación) — migración + endpoint

**Autor:** Maiki (Fundación) · **Fecha:** 2026-06-04 · **Sobre:** main `2d1870a` · **Tipo:** entregable interno.
**Alcance:** backend (migración + endpoint + versionado del programa). **La UI la construye E3** encima del contrato de endpoint documentado abajo.

## Fundamento legal (Nivel 1) — ⚠️ el límite NO es 25%

Verificado contra el **texto literal vigente** (`docs/legal/`): LOPSRM reforma DOF 14-11-2025, RLOPSRM DOF 24-02-2023.

| Cita | Qué dice (literal) | En el sistema |
|---|---|---|
| **art. 59 LOPSRM** | *"…podrán, **dentro de su presupuesto autorizado**, bajo su responsabilidad y por razones fundadas y explícitas, **modificar los contratos**… mediante convenios, **siempre y cuando no impliquen variaciones sustanciales al objeto del proyecto original**."* | Fundamento del convenio. **NO hay tope numérico** (el límite es presupuestal + cualitativo). |
| **art. 59 Bis LOPSRM** | *"Cuando la modificación… implique aumento o reducción por una **diferencia superior al cincuenta por ciento** del importe original… o del plazo… el contratista… podrá **solicitar el ajuste de costos indirectos y del financiamiento**…"* | `requiere_ajuste_costos` (flag, >50%). **NO es un tope.** |
| **RLOPSRM art. 102** | *"…cuando la modificación… implique aumento o reducción **superior al veinticinco por ciento**… deberán **revisar los indirectos y el financiamiento**… Será necesario solicitar… **autorización de la Secretaría de la Función Pública** en los casos: I… II… III…"* | `requiere_revision_sfp` (flag, >25%). **NO es un tope; el 25% del texto ANTERIOR fue removido de la ley.** |
| **RLOPSRM art. 99** | *"…el residente [debe] sustentarlo en un **dictamen técnico que funde y motive** las causas… Tratándose de fianza, el ajuste… conforme a la fracción II… del artículo 98."* | `motivo` (dictamen técnico) obligatorio; ajuste de fianza vía `garantia_endosos` (FK cerrada). |
| **RLOPSRM art. 100** | *"Las modificaciones… por igual en aumento que en reducción. Si se modifica el plazo… días naturales… % de variación… respecto del plazo original… si es al monto… vs el monto original. Las modificaciones al plazo serán **independientes** a las del monto."* | `delta_monto_pct` y `delta_plazo_pct` se calculan **por separado**. |

> **⚠️ RESPUESTA a "¿25%? ¿de monto y/o plazo?":** en el texto **vigente NO existe un tope del 25%** a la modificación. El 25% es el **disparador de revisión de indirectos/autorización SFP (RLOPSRM art. 102)** y el 50% el **umbral de ajuste de costos (art. 59 Bis)** — ninguno limita la magnitud. El sistema **clasifica** esos umbrales (flags) y aplica un **guardrail PARAMETRIZABLE** (`CONVENIO_LIMITE_VARIACION_PCT`, default 25%, `<=0` = sin tope) que **NO es un tope legal** — el profe lo ajusta. La "variación sustancial al objeto" es cualitativa → la confirma el profe. **No soy abogado.**

## Qué se construyó

1. **Esquema** (`schema.sql`, aditivo idempotente):
   - `convenios_modificatorios` — registro **inmutable** (trigger append-only) del convenio: tipo, fundamento (art59/art59bis), motivo, monto_anterior/nuevo, plazo_anterior/nuevo, delta_monto_pct/delta_plazo_pct, requiere_revision_sfp, requiere_ajuste_costos.
   - **Versionado del programa** (snapshots): `programa_version` (1 por versión; v1=original convenio_id NULL; índice único parcial = una vigente; trigger de transición controlada) + `programa_version_concepto` (catálogo snapshot) + `programa_version_celda` (celdas snapshot).
   - **Cierra la FK pendiente** `garantia_endosos.convenio_id → convenios_modificatorios(id)` (NO ACTION — ver decisiones; con saneo de huérfanos).
2. **Endpoint + controller** (`convenios.controller.js`/`routes.js`, montado en `server.js`): crear convenio (transaccional), listar convenios + versiones, detalle de una versión.
3. **Re-cuadre del programa**: reusa `guardarMatriz(client, contratoId, celdas, {convenioId})` de A2 (exento del freeze por convenio).

## Diseño del versionado y el re-cuadre

El programa **vigente** sigue en `programa_obra` (A2 **intacto**). Cada convenio que toca el programa, en **una transacción** (lock `pg_advisory_xact_lock(2, contratoId)` al inicio):

1. **Snapshot perezoso de v1** (estado VIVO actual) si el contrato aún no tiene versiones → preserva el original (convenio_id NULL).
2. Registra el **convenio** (inmutable) con su fundamento y deltas.
3. **Muta el catálogo** `contrato_conceptos` (UPDATE por clave / INSERT conceptos nuevos) — porque la regla del 100% cuadra contra `cc.cantidad`.
4. **Recalcula `contratos.monto`** canónicamente: `Σ ROUND(cantidad×pu,2)` desde el catálogo VIVO (mismo motor SQL que el alta → cuadre al centavo).
5. **Re-cuadra** el programa: `guardarMatriz({convenioId})` valida `Σ planeado = cc.cantidad NUEVA` (re-cuadre a Σ = monto nuevo).
6. **Crea la versión nueva** (snapshot del estado ya modificado) y **supersede** la anterior (`vigente=false`). El orden supersede→insert evita 2 vigentes.

**Inmutabilidad / preservación:** una versión **nunca se sobrescribe ni se borra** (trigger: identidad congelada, solo `vigente` true→false). v1 queda como snapshot permanente.

## ⭐ Inmunidad de estimaciones previas (verificado)

Una estimación ya integrada es **inmune** a un convenio: 3 capas — `estimacion_generadores` guarda **snapshots** (`pu_snapshot`, `cantidad_periodo`, `cantidad_anterior_acum`), la FK a concepto es **NO ACTION**, y la carátula está **congelada por trigger**. **El controller de convenio NO toca `estimaciones`/`estimacion_generadores`.** Verificado: tras un convenio, `subtotal`/`neto`/generador de la estimación previa quedan idénticos.

## Revisión adversarial (workflow de 4 dimensiones) — hallazgos incorporados

Un workflow de revisión (versionado/inmutabilidad, inmunidad/re-cuadre/monto, citas legales, idempotencia/concurrencia/seguridad) confirmó lo central (versionado correcto, sin deadlock —lock re-entrante—, orden de migración OK, sin inyección SQL, inmunidad garantizada) y encontró **6 mejoras, todas aplicadas y re-probadas**:

1. **[ALTO] Saneo de huérfanos eliminado.** El `UPDATE garantia_endosos SET convenio_id=NULL …` chocaba con el trigger append-only de la tabla → habría abortado el deploy en Render si hubiera filas. No puede haber huérfanos (la FK los previene) → se quitó.
2. **[medio] `fundamento` siempre `art59`.** El convenio se funda en art. 59; el art. 59 Bis es un *derecho adicional* (flag `requiere_ajuste_costos`), no un cambio de fundamento.
3. **[medio] Monto canónico único.** `monto_nuevo` del convenio se toma del catálogo VIVO recalculado (igual que `contratos.monto` y el snapshot), no del payload → cero divergencia.
4. **[medio] Claves duplicadas en el body → rechazadas** (inflaban el monto y la clasificación del registro inmutable).
5. **[bajo] Delta de monto en SQL NUMERIC** (evita el borde de umbral por flotante JS).
6. **[bajo] Convenio de plazo no versiona** el programa (no cambió) — evita una versión con plazo nuevo y periodos viejos; **clave-NULL** (contratos legacy) → rechazo con mensaje claro.

## Decisiones (Nivel 2 — tu veto)

1. **Sin tope 25% duro.** El texto vigente no lo tiene. Guardrail parametrizable (`CONVENIO_LIMITE_VARIACION_PCT`, default 25%, configurable/desactivable). Flags `requiere_revision_sfp` (art.102) y `requiere_ajuste_costos` (art.59 Bis). **Confirmar con el profe** si quieren un tope de negocio.
2. **art. 118 al reducir:** un convenio NO puede bajar `cc.cantidad` por debajo de lo **ya estimado** (Σ cantidad_periodo de estimaciones no rechazadas) → rechazado.
3. **`garantia_endosos.convenio_id` y `programa_version.convenio_id` = NO ACTION** (no SET NULL): ambas tablas tienen trigger append-only/transición; un SET NULL dispararía un UPDATE que el trigger bloquearía. **Corrige al borrador** (que decía SET NULL, escrito antes del trigger de endosos). Trade-off: borrar un contrato con convenios exige borrar versiones/convenios antes (igual que ya pasa con estimaciones; en prod los contratos no se borran).
4. **`tipo plazo`**: actualiza plazo/fecha_término + versiona, pero la **regeneración de periodos** por cambio de plazo queda **follow-on** (E3 coordina el re-mapeo de celdas a periodos nuevos); el programa conserva los periodos vigentes.
5. **Reuso de `guardarMatriz({convenioId})`** (el hook que A2 dejó para "enmienda por convenio") en vez de duplicar la lógica del 100%.

## Pruebas (local)

| Prueba | Resultado |
|---|---|
| Migración idempotente (`psql --single-transaction` ×2) + datos intactos + FK cerrada | ✅ exit 0 |
| Convenio de monto +10% (10000→11000): `contratos.monto`=11000, programa A1 re-cuadra a Σ=120, **v1 preservado** (A1=100), v2 vigente (A1=120) | ✅ HTTP 201 |
| **Estimación previa NO cambia** tras el convenio (subtotal 1500, neto 1492.50, generador 30) | ✅ inmune |
| Convenio que excede el guardrail (+81%) → rechazado | ✅ HTTP 400 |
| Convenio que viola art. 118 (reducir bajo lo estimado) → rechazado | ✅ HTTP 400 |
| Convenio **inmutable** una vez registrado (UPDATE → trigger) | ✅ EXCEPTION |
| Suite Playwright completa (post-fixes de la revisión) | **148 passed · 8 skipped · 0 failed** → verde, sin regresión, 8 fixme intactos |

## Runbook de migración

**Local (probado):**
```bash
docker exec -i sigecop_db pg_dump -U sigecop -d sigecop_db > backup_local_$(date +%Y%m%dT%H%M%S).sql
docker exec -i sigecop_db psql -U sigecop -d sigecop_db --single-transaction -v ON_ERROR_STOP=1 < backend/src/db/schema.sql   # 2× = exit 0
docker restart sigecop_backend && curl -s localhost:4000/api/health
```
**Render (al integrar a `main`):**
1. **Backup** (`pg_dump`, DATABASE_URL en `backend/.env`).
2. **Aplicar** `psql "$DATABASE_URL" --single-transaction -v ON_ERROR_STOP=1 -f backend/src/db/schema.sql` → **exit 0**. Orden garantizado: la tabla `convenios_modificatorios` se crea ANTES del `ALTER` que cierra la FK de garantías (mismo archivo). El saneo de huérfanos protege el `ADD CONSTRAINT`.
3. **Verificar** código viejo sobre esquema nuevo (tablas/endpoints nuevos, nadie los lee aún) + `/api/health` + login real.
4. **Push a `main`** → auto-deploy (`RUN_MIGRATIONS=true` re-aplica idempotente).
5. **Solo tú despliegas.** Opcional: setear `CONVENIO_LIMITE_VARIACION_PCT` en Render (default 25; `0` = sin guardrail).

---

# 📄 Contrato del endpoint para Equipo 3 (UI de HU-03)

Base: `/api/convenios`. **Todas** exigen `Authorization: Bearer <JWT>` y se acotan por participación (residente/contratista/supervisión solo sus contratos; dependencia/finanzas todos). **Crear** convenio: solo **dependencia o residente asignado**.

### 1) `POST /api/convenios/contrato/:id` — crear un convenio

**Body** (JSON):
```jsonc
{
  "tipo": "monto",            // 'monto' | 'plazo' | 'programa' | 'mixto'
  "motivo": "string",         // OBLIGATORIO — razones fundadas / dictamen técnico (art. 99 RLOPSRM)
  "folio": "CM-001",          // opcional (si falta, se deriva CM-00N)
  // Para tipo monto/programa/mixto: catálogo NUEVO COMPLETO (todas las claves existentes + nuevas) y programa NUEVO cuadrado:
  "conceptos": [ { "clave":"A1", "concepto":"...", "unidad":"m2", "cantidad":120, "pu":50 }, ... ],
  "celdas":    [ { "clave":"A1", "periodoNumero":1, "cantidad":70 }, ... ],   // Σ por concepto DEBE = cantidad nueva (regla 100%)
  // Para tipo plazo/mixto:
  "plazo_nuevo_dias": 90
}
```
**201** (éxito):
```jsonc
{ "ok":true, "contrato_id":164, "convenio_id":1, "numero":1, "tipo":"monto", "fundamento":"art59",
  "monto_anterior":"10000.00", "monto_nuevo":"11000.00", "plazo_anterior_dias":60, "plazo_nuevo_dias":60,
  "delta_monto_pct":10.0, "requiere_revision_sfp":false, "requiere_ajuste_costos":false, "programa_version_id":2 }
```
**Errores** (400, salvo donde se indique): `tipo inválido`; `motivo obligatorio`; catálogo/celdas faltantes; `clave/cantidad/pu` inválidos; **catálogo nuevo no incluye todos los conceptos existentes**; **art. 118** (reducir bajo lo estimado); **variación excede el guardrail**; descuadre del programa (`PROGRAMA_DESCUADRE`, con `detalles`); 403 (sin autoridad); 404 (contrato); 409 (descuadre/ajeno/concurrencia).

### 2) `GET /api/convenios/contrato/:id` — convenios + versiones
**200:** `{ contrato_id, convenios:[ {id, numero, folio, tipo, fundamento, motivo, monto_anterior, monto_nuevo, plazo_*, delta_*, requiere_revision_sfp, requiere_ajuste_costos, autorizado_por, autorizado_por_nombre, fecha} ], versiones:[ {id, numero, convenio_id, monto, plazo_dias, vigente, created_at, supersedido_en} ] }`

### 3) `GET /api/convenios/version/:versionId` — snapshot de una versión del programa
**200:** `{ version:{...}, conceptos:[ {clave, concepto, unidad, cantidad, pu, orden} ], celdas:[ {concepto_clave, periodo_numero, periodo_inicio, periodo_fin, cantidad} ] }` — para que E3 renderice cualquier versión (v1, v2…).

> **Para E3:** el endpoint re-cuadra el programa por ti (reusa A2). Envía el catálogo nuevo **completo** + el programa **cuadrado** (Σ por concepto = cantidad nueva). Las estimaciones previas NO se tocan. El versionado lo gestiona el backend (no envíes versiones). El ajuste de fianza por convenio (art. 98 fr. II) se registra aparte como endoso (`garantia_endosos`, HU-02) con el `convenio_id` (FK ya cerrada).

## Archivos tocados

| Archivo | |
|---|---|
| `backend/src/db/schema.sql` | M — sección HU-03 (4 tablas + 2 triggers + cierre FK garantía) |
| `backend/src/controllers/convenios.controller.js` | **nuevo** |
| `backend/src/routes/convenios.routes.js` | **nuevo** |
| `backend/server.js` | M — montaje (2 líneas) |

**Pendiente / follow-on:** UI (E3); regeneración de periodos por convenio de plazo; auto-generar el endoso de fianza (art. 98 fr. II) al aprobar un convenio de monto/plazo; modelar "presupuesto autorizado" del contrato para el límite cuantitativo real del art. 59.

**Suite:** **148 passed · 8 skipped · 0 failed** (verde, sin regresión). `node --check` OK; migración idempotente 2× post-fixes.
