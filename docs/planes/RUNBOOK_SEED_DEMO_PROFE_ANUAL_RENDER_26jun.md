# RUNBOOK — Sembrar el contrato de DEMO ANUAL `DEMO-PROFE-ANUAL` en RENDER (26-jun-2026)

> **Objetivo:** dejar en Render UN contrato **anual** (`DEMO-PROFE-ANUAL`, 12 periodos mensuales) pre-armado
> **HASTA bitácora abierta**, con **AVANCE VACÍO**, para que en la demo EN VIVO el equipo **capture el avance +
> la(s) foto(s)** y luego **integre una estimación** de un periodo vencido. El avance vacío es a propósito: las
> fotos del avance (`avance_fotos`) viven en un dominio SEPARADO de las fotos/soportes de la estimación
> (`estimacion_fotos`/`estimacion_soportes`/`estimacion_notas`) — no se cruzan (ver §verificaciones).
> **Lo ejecuta MAIKI** (Code no toca Render). Backup-gated. **Idempotente.**

## DECISIÓN (resuelta con evidencia) — CONVIVEN, no se reemplaza nada
- El script `backend/scripts/seed_demo_profe_anual.sql` **solo** borra/recrea `folio LIKE 'DEMO-PROFE-ANUAL%'`
  (su limpieza, paso (0), está acotada a esos ids). **NO toca** `OP-2026-%`, `SOP-2026-%`, `PRUEBA-HU-%`,
  `PRUEBA-ATRASO-%` ni `PRUEBA-TR-%`.
- Por lo tanto: en Render **se AGREGA/asegura `DEMO-PROFE-ANUAL` y todo lo demás queda intacto** (conviven).
  No hace falta reemplazar nada; no se requiere OK adicional.

## Script (único, idempotente, mismo que local)
- `backend/scripts/seed_demo_profe_anual.sql` — **una sola fuente de verdad** (mismo estado en local y Render).
  Determinista → produce el MISMO estado en cualquier BD con las cuentas base. **Se AUTO-VERIFICA**: aborta con
  mensaje claro si el catálogo no cuadra a $12,000,000.00, si el programa no cuadra al 100% por concepto, si el
  plan de amortización ≠ anticipo, si el avance NO queda vacío, si no hay 12 periodos o si falta el PDF firmado.
- **Prerrequisito:** cuentas base `contratista@ / residente@ / supervision@ / dependencia@ sigecop.test`
  (+ `finanzas@`). Si faltan en Render, correr antes `reseed_cuentas.sql` (el seed aborta con mensaje claro si faltan).

### Qué deja sembrado (cuadrado al centavo)
| Dato | Valor |
|---|---|
| Folio | `DEMO-PROFE-ANUAL` |
| Monto (= Σ ROUND(cant×pu,2)) | **$12,000,000.00** (CONC-01 3.5M · CONC-02 4.5M · CONC-03 4.0M) |
| Anticipo | **30%** EXACTO → $3,600,000.00 (no dispara el requisito de PDF de autorización: el gate es `> 30`) |
| Plan de amortización | Σ = $3,600,000.00, proporcional al programa (art. 143 fr. I RLOPSRM) |
| Periodos | **12 mensuales** (P1 jul-2025 … P12 jun-2026); P1..P11 **VENCIDOS** hoy, P12 en curso |
| Programa de obra | concepto×periodo, Σ por concepto = contratado (curva S a lo largo del año) |
| Garantías | cumplimiento 1.2M · anticipo 3.6M · vicios ocultos 1.2M (vigencias 2027/2028) |
| Bitácora | **ABIERTA y firmada** por las 3 partes (nota #1 = apertura) |
| PDF firmado | **LIGADO** (`contrato_documentos` tipo='contrato') — **sin esto, integrar estimación = 409** |
| Avance / Estimaciones / Pagos | **VACÍOS** (los captura el profe EN VIVO) |
| `pena_convencional_pct` | **NULL** a propósito → carátula 100% predecible (neto = subtotal − 30% − 5 al millar, sin retención por atraso sorpresa) |

---

## PASOS (PowerShell + Docker contra Render) — en ORDEN
```powershell
$RENDER_DB = 'postgresql://USUARIO:PASSWORD@HOST.oregon-postgres.render.com/DBNAME?sslmode=require'
$REPO      = "C:\Users\migue\Downloads\Proyectofepy\sigecop"

# 1) BACKUP FRESCO (no continúes si pesa 0)
& "$REPO\backend\scripts\backup_render.ps1" -Etiqueta "pre_seed_demo_profe_anual_26jun"

# 2) PRERREQUISITO — cuentas base (deben existir las 4; si faltan → corre reseed_cuentas primero)
docker exec -i sigecop_db psql "$RENDER_DB" -c "SELECT email FROM usuarios WHERE email IN ('contratista@sigecop.test','residente@sigecop.test','supervision@sigecop.test','dependencia@sigecop.test') ORDER BY email;"
# (si faltan):  docker cp "$REPO\backend\scripts\reseed_cuentas.sql" sigecop_db:/tmp/r.sql ; docker exec -i sigecop_db psql "$RENDER_DB" -v ON_ERROR_STOP=1 --single-transaction -f /tmp/r.sql

# 3) ANTES — conteo de familias (para verificar que las OTRAS NO se tocan tras el paso 4)
docker exec -i sigecop_db psql "$RENDER_DB" -c "SELECT CASE WHEN folio LIKE 'DEMO-PROFE-ANUAL%' THEN 'DEMO-PROFE-ANUAL' WHEN folio LIKE 'OP-2026-%' THEN 'OP-2026' WHEN folio LIKE 'SOP-2026-%' THEN 'SOP-2026' WHEN folio LIKE 'PRUEBA-HU-%' THEN 'PRUEBA-HU' WHEN folio LIKE 'PRUEBA-ATRASO-%' THEN 'PRUEBA-ATRASO' WHEN folio LIKE 'PRUEBA-TR-%' THEN 'PRUEBA-TR' END AS familia, count(*) FROM contratos WHERE folio LIKE 'DEMO-PROFE-ANUAL%' OR folio LIKE 'OP-2026-%' OR folio LIKE 'SOP-2026-%' OR folio LIKE 'PRUEBA-HU-%' OR folio LIKE 'PRUEBA-ATRASO-%' OR folio LIKE 'PRUEBA-TR-%' GROUP BY 1 ORDER BY 1;"

# 4) SEMBRAR el contrato de demo anual (idempotente; el script se AUTO-VERIFICA y aborta si algo no cuadra)
docker cp "$REPO\backend\scripts\seed_demo_profe_anual.sql" sigecop_db:/tmp/seed_anual.sql
docker exec -i sigecop_db psql "$RENDER_DB" -v ON_ERROR_STOP=1 -f /tmp/seed_anual.sql
docker exec sigecop_db rm -f /tmp/seed_anual.sql

# 5) DESPUÉS — verificación de estado (debe COINCIDIR con la tabla §verificación de abajo)
docker exec -i sigecop_db psql "$RENDER_DB" -c "
SELECT c.folio, c.monto, c.anticipo_pct, c.ciclo_estimacion, c.fecha_inicio, c.fecha_termino, c.estado,
  (SELECT count(*) FROM contrato_conceptos cc WHERE cc.contrato_id=c.id) AS conc,
  (SELECT count(*) FROM contrato_periodos cp WHERE cp.contrato_id=c.id) AS periodos,
  (SELECT count(*) FROM bitacora_aperturas b WHERE b.contrato_id=c.id) AS bita,
  (SELECT count(*) FROM contrato_documentos d WHERE d.contrato_id=c.id AND d.tipo='contrato') AS pdf,
  (SELECT count(*) FROM concepto_avance ca JOIN contrato_conceptos cc ON cc.id=ca.contrato_concepto_id WHERE cc.contrato_id=c.id) AS avance,
  (SELECT count(*) FROM estimaciones e WHERE e.contrato_id=c.id) AS est,
  (SELECT count(*) FROM pagos p WHERE p.contrato_id=c.id) AS pagos
FROM contratos c WHERE c.folio='DEMO-PROFE-ANUAL';"

# 6) CONFIRMAR que las OTRAS familias siguen con el mismo conteo del paso 3 (solo cambió DEMO-PROFE-ANUAL)
docker exec -i sigecop_db psql "$RENDER_DB" -c "SELECT CASE WHEN folio LIKE 'DEMO-PROFE-ANUAL%' THEN 'DEMO-PROFE-ANUAL' WHEN folio LIKE 'OP-2026-%' THEN 'OP-2026' WHEN folio LIKE 'SOP-2026-%' THEN 'SOP-2026' WHEN folio LIKE 'PRUEBA-HU-%' THEN 'PRUEBA-HU' WHEN folio LIKE 'PRUEBA-ATRASO-%' THEN 'PRUEBA-ATRASO' WHEN folio LIKE 'PRUEBA-TR-%' THEN 'PRUEBA-TR' END AS familia, count(*) FROM contratos WHERE folio LIKE 'DEMO-PROFE-ANUAL%' OR folio LIKE 'OP-2026-%' OR folio LIKE 'SOP-2026-%' OR folio LIKE 'PRUEBA-HU-%' OR folio LIKE 'PRUEBA-ATRASO-%' OR folio LIKE 'PRUEBA-TR-%' GROUP BY 1 ORDER BY 1;"
```
> **Re-ejecutable / RESET antes de cada demo:** correr el paso 4 otra vez **resetea** el contrato a su estado
> prístino (avance vacío, sin estimación). Útil porque avance/estimación/pago son **append-only**: una vez que
> el equipo ensaya el flujo, el contrato queda "usado"; re-sembrar lo deja limpio para la siguiente pasada.

---

## §verificación — estado esperado en Render (= LOCAL por construcción)
> **Local** = medido hoy (`seed_demo_profe_anual.sql` corrido 2 veces, exit 0, conteos idénticos). **Render** =
> idéntico por construcción (mismo script determinista); el paso 5 debe reproducir EXACTAMENTE esta fila.

| Folio | monto | anticipo | ciclo | inicio→término | conc | periodos | bitácora | pdf | avance | est | pagos |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `DEMO-PROFE-ANUAL` | 12000000.00 | 30.00 | mensual | 2025-07-01 → 2026-06-30 | 3 | 12 | 1 | 1 | **0** | **0** | **0** |

**Cuadre (paso 5 ampliado, opcional):**
- `SELECT SUM(ROUND(cantidad*pu,2)) FROM contrato_conceptos cc JOIN contratos c ON c.id=cc.contrato_id WHERE c.folio='DEMO-PROFE-ANUAL';` → **12000000.00**
- `SELECT SUM(monto) FROM plan_amortizacion pa JOIN contratos c ON c.id=pa.contrato_id WHERE c.folio='DEMO-PROFE-ANUAL';` → **3600000.00**
- Σ programa por concepto = contratado (CONC-01 10000 · CONC-02 3000 · CONC-03 1600).
- Periodos vencidos hoy: P1..P11 = `t`, P12 = `f`.

---

## §en vivo — QUÉ HARÁ EL PROFE / EL EQUIPO (guion)
1. **Login** como **`contratista@sigecop.test`** (es el *superintendente* del contrato — el único que puede
   registrar avance e integrar la estimación).
2. **Capturar avance (HU-06)** de un **periodo VENCIDO** (recomendado **P11 = mayo-2026**, o cualquiera de
   P1..P11): elegir el concepto del periodo (p. ej. en P11 corresponde **CONC-03**, planeado 300 m²), capturar la
   cantidad ejecutada y **adjuntar al menos 1 foto** (la foto es **OBLIGATORIA**, el backend rechaza sin foto).
   - ⚠ Como el contrato arrancó en 2025, registrar un avance de un mes ya cerrado muestra un **aviso cosmético
     "registro tardío"** (no bloquea; es correcto: estás cargando el histórico del año).
3. **Integrar la estimación (HU-12)** de **ese mismo periodo vencido**: el sistema valida contra lo **planeado**
   (programa), no contra el avance; el PDF firmado ya está ligado, así que **integra sin error (201)**.
   - ⚠ **No estimar P12** (junio-2026, en curso): el sistema lo bloquea con 409 "solo se estima un periodo ya
     vencido" (art. 54). Usar P1..P11.
   - ⚠ Las cantidades del **generador se teclean a mano** (el front las prellena en 0; no se auto-jalan del
     avance). Tope = lo planeado/contratado del periodo.
4. (Opcional, sigue el ciclo) presentar → revisar/autorizar → tránsito a pago → registrar pago.

**La curva de avance (HU-05)** se ve bien desde el inicio: **planeada** subiendo a lo largo del año y **ejecutada
en 0%** (con indicador de "atraso") hasta que capturen; al capturar, la ejecutada empieza a subir.

---

## Notas de seguridad
- **No se ejecutó nada contra Render** (Code no toca producción). Probado en LOCAL: **2 pasadas exit 0, conteos
  idénticos** + **prueba viva por API** (login contratista → integrar estimación de P1 con avance vacío → **HTTP
  201**, carátula neto $364,875.00; luego re-seed dejó el contrato prístino).
- El seed es **aditivo para todo lo que no es `DEMO-PROFE-ANUAL`** y **destructivo-recreador solo de ese folio**.
- **OP-2026 / SOP-2026 / PRUEBA-HU / PRUEBA-ATRASO / PRUEBA-TR no se tocan.**
- Backup fresco etiquetado en el paso 1 ANTES de escribir.
