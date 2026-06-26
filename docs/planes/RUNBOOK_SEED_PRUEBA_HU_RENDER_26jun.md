# RUNBOOK — Sembrar los 24 contratos PRUEBA-HU-XX en RENDER (26-jun-2026)

> **Objetivo:** dejar en Render los contratos `PRUEBA-HU-01 … PRUEBA-HU-24`, cada uno armado HASTA la etapa de su
> historia, IGUAL que en local, para que el equipo ejecute `docs/pruebas/PLAN_PRUEBAS_POSITIVAS_FINAL_26jun.md` y
> `..._NEGATIVAS_FINAL_26jun.md` (que referencian esos folios).
> **Lo ejecuta MAIKI** (Code no toca Render). Backup-gated. **Idempotente.**

## DECISIÓN (resuelta con evidencia) — CONVIVEN, no se reemplaza nada
- El script `backend/scripts/seed_demo_24.sql` **solo** borra/recrea `folio LIKE 'PRUEBA-HU-%'` (su limpieza,
  líneas 21-36, está acotada a esos ids). **NO toca `OP-2026-%`** (tu demo con el profe) **ni `SOP-2026-%`**.
- Por lo tanto: en Render **se AGREGAN/aseguran los PRUEBA-HU-XX y los OP-2026-XXXX quedan intactos** (conviven).
  **SOP-2026-001 tampoco se toca.** No hace falta reemplazar nada; no se requiere tu OK adicional.

## Script (único, idempotente, mismo que local)
- `backend/scripts/seed_demo_24.sql` — es el seed PRUEBA-HU. **No se creó un script aparte "para Render"** a
  propósito (una sola fuente de verdad = mismo estado en local y Render). Base idéntica: monto $1,000,000,
  conceptos CONC-01/02/03 (300k/300k/400k), 3 periodos mensuales vencidos, cuadre al centavo. Determinista →
  produce el MISMO estado en cualquier BD con las cuentas base.
- **Prerrequisito:** cuentas base `contratista@ / residente@ / supervision@ / dependencia@ sigecop.test`
  (+ empresas). Si faltan en Render, correr antes `reseed_cuentas.sql` (el seed aborta con mensaje claro si faltan).

---

## PASOS (PowerShell + Docker contra Render) — en ORDEN
```powershell
$RENDER_DB = 'postgresql://USUARIO:PASSWORD@HOST.oregon-postgres.render.com/DBNAME?sslmode=require'
$REPO      = "C:\Users\migue\Downloads\Proyectofepy\sigecop"

# 1) BACKUP FRESCO (no continúes si pesa 0)
& "$REPO\backend\scripts\backup_render.ps1" -Etiqueta "pre_seed_pruebahu_26jun"

# 2) PRERREQUISITO — cuentas base (deben existir las 4; si 'faltan' → corre reseed_cuentas primero)
docker exec -i sigecop_db psql "$RENDER_DB" -c "SELECT email FROM usuarios WHERE email IN ('contratista@sigecop.test','residente@sigecop.test','supervision@sigecop.test','dependencia@sigecop.test') ORDER BY email;"
# (si faltan):  docker cp "$REPO\backend\scripts\reseed_cuentas.sql" sigecop_db:/tmp/r.sql ; docker exec -i sigecop_db psql "$RENDER_DB" -v ON_ERROR_STOP=1 --single-transaction -f /tmp/r.sql

# 3) ANTES — confirmar que OP-2026 / SOP-2026 NO se van a tocar (deben seguir igual tras el paso 4)
docker exec -i sigecop_db psql "$RENDER_DB" -c "SELECT left(folio,8) AS familia, count(*) FROM contratos WHERE folio LIKE 'OP-2026-%' OR folio LIKE 'SOP-2026-%' OR folio LIKE 'PRUEBA-HU-%' GROUP BY 1 ORDER BY 1;"

# 4) SEMBRAR los 24 PRUEBA-HU (idempotente; NO toca OP/SOP)
docker cp "$REPO\backend\scripts\seed_demo_24.sql" sigecop_db:/tmp/seed24.sql
docker exec -i sigecop_db psql "$RENDER_DB" -v ON_ERROR_STOP=1 -f /tmp/seed24.sql
docker exec sigecop_db rm -f /tmp/seed24.sql

# 5) DESPUÉS — tabla de verificación de etapa por HU (debe COINCIDIR con la de LOCAL, §tabla)
docker exec -i sigecop_db psql "$RENDER_DB" -c "
SELECT c.folio,
  (SELECT count(*) FROM bitacora_aperturas b WHERE b.contrato_id=c.id) AS bita,
  (SELECT count(DISTINCT ca.contrato_concepto_id) FROM concepto_avance ca JOIN contrato_conceptos cc ON cc.id=ca.contrato_concepto_id WHERE cc.contrato_id=c.id) AS av,
  (SELECT count(*) FROM estimaciones e WHERE e.contrato_id=c.id) AS est,
  COALESCE((SELECT string_agg(e.estado,',' ORDER BY e.numero) FROM estimaciones e WHERE e.contrato_id=c.id),'-') AS estados,
  (SELECT count(*) FROM convenios_modificatorios cm WHERE cm.contrato_id=c.id) AS conv,
  (SELECT count(*) FROM pagos p WHERE p.contrato_id=c.id) AS pagos
FROM contratos c WHERE c.folio LIKE 'PRUEBA-HU-%' ORDER BY c.folio;"

# 6) CONFIRMAR que OP/SOP siguen igual que en el paso 3 (mismo conteo de OP/SOP; solo cambió PRUEBA-HU)
docker exec -i sigecop_db psql "$RENDER_DB" -c "SELECT left(folio,8) AS familia, count(*) FROM contratos WHERE folio LIKE 'OP-2026-%' OR folio LIKE 'SOP-2026-%' OR folio LIKE 'PRUEBA-HU-%' GROUP BY 1 ORDER BY 1;"
```
> **Re-ejecutable:** correr el paso 4 otra vez **resetea** los PRUEBA-HU a su etapa limpia (útil porque la
> estimación/pago son append-only y "agotan" el contrato; re-sembrar antes de cada demo de HU-12, HU-21, etc.).

---

## §tabla — VERIFICACIÓN CRUZADA local ↔ Render
> **Local** = estado real medido hoy (`seed_demo_24.sql` recién corrido). **Render** = idéntico **por construcción**
> (mismo script determinista); el paso 5 del runbook debe reproducir EXACTAMENTE esta tabla. Formato de la celda:
> `bitácora / conceptos-con-avance / estimaciones:estados / convenios / pagos`.

| Folio | Etapa esperada (HU) | Local (bita/av/est:estados/conv/pago) | Render (correr §runbook) | ¿Coincide? |
|---|---|---|---|---|
| PRUEBA-HU-01 | Alta — base, sin bitácora | 0/0/0:- /0/0 | = local | ✅ por construcción |
| PRUEBA-HU-02 | Fianzas — base + endoso | 0/0/0:- /0/0 | = local | ✅ |
| PRUEBA-HU-03 | Convenios — bitácora + convenio | 1/0/0:- /1/0 | = local | ✅ |
| PRUEBA-HU-04 | Expediente — bitácora+avance+est pagada | 1/1/1:pagada /0/1 | = local | ✅ |
| PRUEBA-HU-05 | Curva — avance al corriente (3 conc.) | 0/3/0:- /0/0 | = local | ✅ |
| PRUEBA-HU-06 | Avance — bitácora + avance parcial | 1/1/0:- /0/0 | = local | ✅ |
| PRUEBA-HU-07 | Atrasos — bitácora + avance déficit | 1/1/0:- /0/0 | = local | ✅ |
| PRUEBA-HU-08 | Apertura — base sin bitácora | 0/0/0:- /0/0 | = local | ✅ |
| PRUEBA-HU-09 | Notas — bitácora abierta | 1/0/0:- /0/0 | = local | ✅ |
| PRUEBA-HU-10 | Consulta notas — bitácora + nota | 1/0/0:- /0/0 | = local | ✅ |
| PRUEBA-HU-11 | Minutas — bitácora + minuta/visita | 1/0/0:- /0/0 | = local | ✅ |
| **PRUEBA-HU-12** | **Integrar — bitácora+avance, SIN estimación** | 1/1/0:- /0/0 | = local | ✅ **integrable** |
| PRUEBA-HU-13 | Presentar — estimación integrada | 1/1/1:integrada /0/0 | = local | ✅ |
| PRUEBA-HU-14 | Historial — 3 est (pagada,autorizada,enviada) | 1/3/3:pagada,autorizada,enviada /0/1 | = local | ✅ |
| PRUEBA-HU-15 | Revisión — estimación enviada | 1/1/1:enviada /0/0 | = local | ✅ |
| PRUEBA-HU-16 | (Reingreso retirada) — estimación rechazada | 1/1/1:rechazada /0/0 | = local | ✅ |
| PRUEBA-HU-17 | Tablero — 2 est (pagada,autorizada) | 1/2/2:pagada,autorizada /0/1 | = local | ✅ |
| PRUEBA-HU-18 | Portafolio — avance al corriente | 0/2/0:- /0/0 | = local | ✅ |
| PRUEBA-HU-19 | Reportes — bitácora + estimación pagada | 1/1/1:pagada /0/1 | = local | ✅ |
| PRUEBA-HU-20 | Tránsito a pago — estimación autorizada | 1/1/1:autorizada /0/0 | = local | ✅ |
| PRUEBA-HU-21 | Registro de pago — estimación autorizada | 1/1/1:autorizada /0/0 | = local | ✅ |
| PRUEBA-HU-22 | Roster — base (roster cargado) | 0/0/0:- /0/0 | = local | ✅ |
| PRUEBA-HU-23 | Padrón — base | 0/0/0:- /0/0 | = local | ✅ |
| **PRUEBA-HU-24** | **Finiquito — bitácora+avance×3 + 3 est PAGADAS** | 1/3/3:pagada,pagada,pagada /0/3 | = local | ✅ **finiquitable** |

> **Cómo validar coincidencia:** la salida del paso 5 (Render) debe ser **fila por fila igual** a la columna
> "Local" de arriba. Si alguna difiere, re-correr el paso 4 (idempotente) y volver a medir.

### Confirmación de EJECUTABILIDAD por HU (la prueba de cada HU SÍ se puede hacer)
- **HU-12 integrable:** CONC-01 contratada=1000, avance=1000, ya_estimado=0 → `disponible=1000` (periodo P1 vencido). ✅ (verificado en local).
- **HU-24 finiquitable:** 3 estimaciones **pagadas** + 3 pagos → saldo 0. ✅
- **HU-20 / HU-21 pagable:** estimación en estado **'autorizada'** (`PAGABLES={'autorizada'}`). ✅
- **HU-13 presentable:** estimación **'integrada'**. ✅ · **HU-15 revisable:** estimación **'enviada'**. ✅
- **HU-08 abrir bitácora:** base **sin** bitácora. ✅ · **HU-09/10/11:** bitácora abierta. ✅
- **HU-03 convenio:** bitácora abierta (puede registrar/autorizar convenio). ✅
- **HU-06 avance / HU-07 atraso / HU-05 curva:** avance pre-cargado en su forma. ✅
- **HU-22 sustitución:** roster cargado (3 roles). ✅ · **HU-02 fianzas:** pólizas + endoso. ✅

---

## Notas de seguridad
- **No ejecuté nada contra Render** (Code no toca producción). Local re-sembrado y medido como referencia.
- Backup fresco ya existe de hoy (`sigecop_render_20260626_002301_pre_autonoma2_26jun.dump`); aun así el paso 1 hace
  uno nuevo etiquetado antes de escribir.
- El seed es **aditivo para todo lo que no es PRUEBA-HU** y **destructivo-recreador solo de PRUEBA-HU** (idempotente).
- **SOP-2026-001 y los OP-2026-XXXX de tu demo no se tocan.**

---

## §B — Contratos de ATRASO en Render (`PRUEBA-ATRASO-01/02/03`)

> Mismo principio: el script `backend/scripts/seed_demo_atraso.sql` borra/recrea **solo** `folio LIKE
> 'PRUEBA-ATRASO-%'`. **NO toca OP-2026-%, SOP-2026-% ni PRUEBA-HU-%.** Conviven con todo. Idempotente,
> determinista. Pena convencional 5% (art. 46 Bis LOPSRM). Re-ejecutar = resetear (estimación/pago append-only).

```powershell
$RENDER_DB = 'postgresql://USUARIO:PASSWORD@HOST.oregon-postgres.render.com/DBNAME?sslmode=require'
$REPO      = "C:\Users\migue\Downloads\Proyectofepy\sigecop"

# 1) BACKUP FRESCO (no continúes si pesa 0)
& "$REPO\backend\scripts\backup_render.ps1" -Etiqueta "pre_seed_atraso_26jun"

# 2) ANTES — confirmar conteo de familias (OP/SOP/PRUEBA-HU/PRUEBA-ATRASO) para verificar que NO se tocan las otras
docker exec -i sigecop_db psql "$RENDER_DB" -c "SELECT CASE WHEN folio LIKE 'OP-2026-%' THEN 'OP-2026' WHEN folio LIKE 'SOP-2026-%' THEN 'SOP-2026' WHEN folio LIKE 'PRUEBA-ATRASO-%' THEN 'PRUEBA-ATRASO' WHEN folio LIKE 'PRUEBA-HU-%' THEN 'PRUEBA-HU' END AS familia, count(*) FROM contratos WHERE folio LIKE 'OP-2026-%' OR folio LIKE 'SOP-2026-%' OR folio LIKE 'PRUEBA-HU-%' OR folio LIKE 'PRUEBA-ATRASO-%' GROUP BY 1 ORDER BY 1;"

# 3) SEMBRAR los 3 contratos de atraso (idempotente; NO toca OP/SOP/PRUEBA-HU)
docker cp "$REPO\backend\scripts\seed_demo_atraso.sql" sigecop_db:/tmp/seed_atraso.sql
docker exec -i sigecop_db psql "$RENDER_DB" -v ON_ERROR_STOP=1 -f /tmp/seed_atraso.sql
docker exec sigecop_db rm -f /tmp/seed_atraso.sql

# 4) DESPUÉS — verificación (debe COINCIDIR con LOCAL): pena 0.0500; ATRASO-02/03 ret_atraso 9000.00, neto 116100.00
docker exec -i sigecop_db psql "$RENDER_DB" -c "
SELECT c.folio, c.pena_convencional_pct AS pena,
       (SELECT count(*) FROM bitacora_aperturas b WHERE b.contrato_id=c.id) AS bita,
       COALESCE((SELECT string_agg(e.estado,',' ORDER BY e.numero) FROM estimaciones e WHERE e.contrato_id=c.id),'-') AS estados,
       COALESCE((SELECT SUM(e.retencion_atraso) FROM estimaciones e WHERE e.contrato_id=c.id),0) AS ret_atraso,
       COALESCE((SELECT SUM(e.neto) FROM estimaciones e WHERE e.contrato_id=c.id),0) AS neto,
       (SELECT count(*) FROM pagos p WHERE p.contrato_id=c.id) AS pagos
  FROM contratos c WHERE c.folio LIKE 'PRUEBA-ATRASO-%' ORDER BY c.folio;"

# 5) CONFIRMAR que OP/SOP/PRUEBA-HU siguen con el mismo conteo del paso 2 (solo cambió PRUEBA-ATRASO)
docker exec -i sigecop_db psql "$RENDER_DB" -c "SELECT CASE WHEN folio LIKE 'OP-2026-%' THEN 'OP-2026' WHEN folio LIKE 'SOP-2026-%' THEN 'SOP-2026' WHEN folio LIKE 'PRUEBA-ATRASO-%' THEN 'PRUEBA-ATRASO' WHEN folio LIKE 'PRUEBA-HU-%' THEN 'PRUEBA-HU' END AS familia, count(*) FROM contratos WHERE folio LIKE 'OP-2026-%' OR folio LIKE 'SOP-2026-%' OR folio LIKE 'PRUEBA-HU-%' OR folio LIKE 'PRUEBA-ATRASO-%' GROUP BY 1 ORDER BY 1;"
```

### §B tabla — verificación cruzada local ↔ Render (atraso)
| Folio | Etapa | Atraso esperado | Local (pena/est:estados/ret_atraso/neto/pagos) | Render | ¿Coincide? |
|---|---|---|---|---|---|
| PRUEBA-ATRASO-01 | Avance (HU-07) | déficit 900 en CONC-01 P1 | 0.05 / 0:- / 0 / 0 / 0 (bitácora=1, avance bajo) | = local | ✅ por construcción |
| PRUEBA-ATRASO-02 | Estimación integrada | retención atraso **$9,000.00** | 0.05 / 1:integrada / **9000.00** / 116100.00 / 0 | = local | ✅ |
| PRUEBA-ATRASO-03 | Estimación pagada → finiquito | pena aplicada + finiquitable | 0.05 / 1:pagada / **9000.00** / 116100.00 / 1 | = local | ✅ |

> Validado en LOCAL (2 pasadas exit=0, salida idéntica). Render = idéntico por construcción (mismo script determinista);
> el paso 4 debe reproducir la columna "Local". **No ejecuté contra Render.**

---

## §C — Contratos de TIEMPO RECORRIDO en Render (`PRUEBA-TR-*`)

> Mismo principio: el script `backend/scripts/seed_demo_tr.sql` borra/recrea **solo** `folio LIKE 'PRUEBA-TR-%'`.
> **NO toca OP-2026-%, SOP-2026-%, PRUEBA-HU-% ni PRUEBA-ATRASO-%.** Conviven con todo. Idempotente.
> **Para uso interno de Maiki** (no es el set "limpio" del profe).
> ⚠ **Requisitos en Render:** (1) la cuenta **`residente2.demo@sigecop.test`** debe existir (es el *entrante* de C5);
> si no está, créala antes (mismo método que las demás demo). (2) Varios casos usan **fechas relativas** ("hace N días"):
> re-sembrar **el mismo día** de la demo para que el plazo de revisión (C6), la nota tácita (C1) y la vigencia de
> firmas (C5) queden en la ventana correcta.

```powershell
$RENDER_DB = 'postgresql://USUARIO:PASSWORD@HOST.oregon-postgres.render.com/DBNAME?sslmode=require'
$REPO      = "C:\Users\migue\Downloads\Proyectofepy\sigecop"

# 1) BACKUP FRESCO (no continúes si pesa 0)
& "$REPO\backend\scripts\backup_render.ps1" -Etiqueta "pre_seed_tr_26jun"

# 1b) Confirmar que existe la cuenta entrante de C5 (debe devolver 1 fila)
docker exec -i sigecop_db psql "$RENDER_DB" -c "SELECT id,email FROM usuarios WHERE email='residente2.demo@sigecop.test';"

# 2) ANTES — conteo de familias (para verificar que NO se tocan las otras)
docker exec -i sigecop_db psql "$RENDER_DB" -c "SELECT CASE WHEN folio LIKE 'OP-2026-%' THEN 'OP-2026' WHEN folio LIKE 'SOP-2026-%' THEN 'SOP-2026' WHEN folio LIKE 'PRUEBA-ATRASO-%' THEN 'PRUEBA-ATRASO' WHEN folio LIKE 'PRUEBA-TR-%' THEN 'PRUEBA-TR' WHEN folio LIKE 'PRUEBA-HU-%' THEN 'PRUEBA-HU' END AS familia, count(*) FROM contratos WHERE folio LIKE 'OP-2026-%' OR folio LIKE 'SOP-2026-%' OR folio LIKE 'PRUEBA-HU-%' OR folio LIKE 'PRUEBA-ATRASO-%' OR folio LIKE 'PRUEBA-TR-%' GROUP BY 1 ORDER BY 1;"

# 3) SEMBRAR los 7 contratos de tiempo recorrido (idempotente; NO toca OP/SOP/PRUEBA-HU/PRUEBA-ATRASO)
docker cp "$REPO\backend\scripts\seed_demo_tr.sql" sigecop_db:/tmp/seed_tr.sql
docker exec -i sigecop_db psql "$RENDER_DB" -v ON_ERROR_STOP=1 -f /tmp/seed_tr.sql
docker exec sigecop_db rm -f /tmp/seed_tr.sql

# 4) DESPUÉS — verificación (debe COINCIDIR con LOCAL): versiones C7=2, roster C5=2, fianza C2 vencida, est C6=enviada
docker exec -i sigecop_db psql "$RENDER_DB" -c "
SELECT c.folio, c.monto,
       (SELECT count(*) FROM bitacora_aperturas b WHERE b.contrato_id=c.id) AS bita,
       COALESCE((SELECT string_agg(e.estado,',' ORDER BY e.numero) FROM estimaciones e WHERE e.contrato_id=c.id),'-') AS estados,
       (SELECT count(*) FROM programa_version pv WHERE pv.contrato_id=c.id) AS versiones,
       (SELECT count(*) FROM contrato_roster cr WHERE cr.contrato_id=c.id AND cr.rol='residente') AS res_roster,
       (SELECT count(*) FROM convenios_modificatorios cm WHERE cm.contrato_id=c.id) AS convenios
  FROM contratos c WHERE c.folio LIKE 'PRUEBA-TR-%' ORDER BY c.folio;"

# 5) CONFIRMAR que OP/SOP/PRUEBA-HU/PRUEBA-ATRASO siguen con el mismo conteo del paso 2 (solo cambió PRUEBA-TR)
docker exec -i sigecop_db psql "$RENDER_DB" -c "SELECT CASE WHEN folio LIKE 'OP-2026-%' THEN 'OP-2026' WHEN folio LIKE 'SOP-2026-%' THEN 'SOP-2026' WHEN folio LIKE 'PRUEBA-ATRASO-%' THEN 'PRUEBA-ATRASO' WHEN folio LIKE 'PRUEBA-TR-%' THEN 'PRUEBA-TR' WHEN folio LIKE 'PRUEBA-HU-%' THEN 'PRUEBA-HU' END AS familia, count(*) FROM contratos WHERE folio LIKE 'OP-2026-%' OR folio LIKE 'SOP-2026-%' OR folio LIKE 'PRUEBA-HU-%' OR folio LIKE 'PRUEBA-ATRASO-%' OR folio LIKE 'PRUEBA-TR-%' GROUP BY 1 ORDER BY 1;"
```

### §C tabla — verificación cruzada local ↔ Render (tiempo recorrido)
| Folio | Caso | Local (monto / bita / est:estados / versiones / roster-res / convenios) | Render | ¿Coincide? |
|---|---|---|---|---|
| PRUEBA-TR-NOTA-VENCIDA | C1 nota tácita | 1000000 / 1 / 0:- / 0 / 1 / 0 (nota #2 plazo_vencido=t) | = local | ✅ por construcción |
| PRUEBA-TR-FIANZA-VENCIDA | C2 fianza caducada | 1000000 / 0 / 0:- / 0 / 1 / 0 (cumplimiento vig. 2026-01-15) | = local | ✅ |
| PRUEBA-TR-CONVENIO-PLAZO | C3 convenio listo | 1000000 / 1 / 0:- / 0 / 1 / 0 | = local | ✅ |
| PRUEBA-TR-AMORT-MULTI | C4 amortización multi | 1000000 / 1 / 3:autorizada,autorizada,autorizada / 0 / 1 / 0 | = local | ✅ |
| PRUEBA-TR-FIRMA-VIGENCIA | C5 firma fuera de vigencia | 1000000 / 1 / 0:- / 0 / **2** / 0 (saliente+entrante) | = local | ✅ |
| 🟥 PRUEBA-TR-REVISION-VENCIDA | **C6 — ⚠ POR REVISAR** | 1000000 / 1 / 1:enviada / 0 / 1 / 0 (enviada hace 16 días) | = local | ✅ dato; *observabilidad de afirmativa ficta pendiente* |
| PRUEBA-TR-CURVA-HISTORICA | C7 curva histórico | 1200000 / 1 / 0:- / **2** / 1 / **1** | = local | ✅ |

> Validado en LOCAL (2 pasadas exit=0, salida idéntica, sin duplicados). Render = idéntico por construcción
> (mismo script determinista), salvo las fechas relativas que dependen del día de ejecución. **No ejecuté contra Render.**
