# PLAN — Sembrar datos demo en Render (preentrega) · 25-jun-2026

> **LÉEME ANTES DE EMPEZAR**
> 1. **Pega tu EXTERNAL Database URL real de Render** en `$RENDER_DB` (Dashboard → tu Postgres → Connections → *External Database URL*). Si `psql` se queja de SSL, agrégale `?sslmode=require` al final.
> 2. **El seed (Paso 3) va ANTES del backfill (Paso 4).** El seed hace `DELETE`-cascade de los `SOP-2026-%`, que también borra sus `contrato_documentos`; por eso el PDF se backfillea DESPUÉS. Si re-siembras, re-corre también el backfill.
> 3. **Ejecuta paso por paso.** Cada paso trae el comando completo y la salida esperada. No pases al siguiente si la salida no coincide.
> 4. Todo corre con `--single-transaction -v ON_ERROR_STOP=1`: si algo falla, hace **ROLLBACK total** y Render queda intacto (+ tienes el backup del Paso 1 como red).
> 5. El convenio v1/v2 + AD-01 + avance de `SOP-2026-001` **NO** se siembran aquí — se hacen **en vivo en la demo** (decisión: opción A).

## Prerrequisitos
- El stack local Docker arriba (se usa **solo el contenedor `sigecop_db` como cliente psql/pg_dump** que sale a Render; **no toca tu BD local**). Verifica: `docker ps` debe listar `sigecop_db`.
- Los dos scripts existen en `$SEEDDIR` (ver abajo). Su contenido íntegro está en el **Apéndice A y B** de este documento por si necesitas recrearlos.

## Variables (pega tu URL real de Render)
```powershell
# >>> PEGA AQUÍ tu EXTERNAL Database URL de Render (comillas SIMPLES = literal, no expande $) <<<
$RENDER_DB = 'postgresql://USUARIO:PASSWORD@HOST.oregon-postgres.render.com/DBNAME?sslmode=require'

# Carpeta donde están los dos scripts (seed corregido + backfill).
$SEEDDIR   = "C:\Users\migue\AppData\Local\Temp\claude\C--Users-migue-Downloads-Proyectofepy-sigecop\96b323b3-f86a-4a75-91f4-66377f9ef80b\scratchpad"
```
> Si la carpeta `$SEEDDIR` ya no existe (scratchpad limpiado), crea los dos archivos `seed_10_contratos.sql` y `backfill_pdf_contrato.sql` con el contenido del **Apéndice A y B**, déjalos en una carpeta y apunta `$SEEDDIR` a esa carpeta.

---

## Paso 1 — Backup FRESCO de Render (antes de tocar nada)
> Se escribe el dump **dentro del contenedor** y se copia al host con `docker cp` (bytes exactos). Evita que PowerShell lo guarde en UTF-16 con `>` y lo corrompa.
```powershell
docker exec sigecop_db pg_dump "$RENDER_DB" -f /tmp/bk_pre_seed.sql
docker cp sigecop_db:/tmp/bk_pre_seed.sql "C:\Users\migue\Downloads\backup_render_pre_seed_25jun.sql"
docker exec sigecop_db rm /tmp/bk_pre_seed.sql
Get-Item "C:\Users\migue\Downloads\backup_render_pre_seed_25jun.sql" | Select-Object Length
```
**Salida esperada:** el último comando imprime un `Length` de **varios millones** (varios MB). Si es 0 o muy chico, NO continúes (el backup falló; revisa la URL/SSL).
> Si `pg_dump` se queja de versión de servidor, usa la imagen que reporte Render: `docker run --rm postgres:16 pg_dump "$RENDER_DB" -f /tmp/bk.sql` (o la versión correspondiente) y ajusta el `docker cp` al contenedor efímero — o instala el `pg_dump` de esa versión.

---

## Paso 2 — Verificar qué hay en Render (no duplicar) + cuentas base
```powershell
docker exec -i sigecop_db psql "$RENDER_DB" -c "SELECT folio FROM contratos WHERE folio LIKE 'SOP-2026-%' OR folio LIKE 'PRUEBA-HU-%' ORDER BY folio;"
docker exec -i sigecop_db psql "$RENDER_DB" -c "SELECT email, rol FROM usuarios WHERE email IN ('residente@sigecop.test','contratista@sigecop.test','supervision@sigecop.test','dependencia@sigecop.test','finanzas@sigecop.test') ORDER BY email;"
```
**Salida esperada:**
- Primer SELECT: **0 filas** (deploy fresco) → el seed insertará limpio. *(Si saliera algún `SOP-2026-*`, no pasa nada: el seed los reemplaza — es idempotente.)*
- Segundo SELECT: **5 filas** (las 5 cuentas base, creadas por `schema.sql`). **Si faltan, NO sigas:** el seed aborta con `Faltan cuentas demo base`.

---

## Paso 3 — Sembrar los 10 contratos (SIEMPRE antes del backfill)
```powershell
docker cp "$SEEDDIR\seed_10_contratos.sql" sigecop_db:/tmp/seed10.sql
docker exec -i sigecop_db psql "$RENDER_DB" -v ON_ERROR_STOP=1 --single-transaction -f /tmp/seed10.sql
```
**Salida esperada:**
- `NOTICE:  SEED 10: SOP-2026-001..010 sembrados.`
- Una tabla de verificación con **10 filas** (`SOP-2026-001`..`010`), y en cada una: `cuadra = t`, `conc = 3`, `per` = 2/3/4 según el contrato, `gar` = 2 ó 3, `roster = 3`, `bita = 1`, y `suma_plan = anticipo_esperado`.
- **Si ves cualquier `ERROR:`** → hizo ROLLBACK, no se sembró nada; Render quedó intacto. Revisa el mensaje y vuelve a intentar.

---

## Paso 4 — Backfill del PDF firmado (cierra el Bug #1) — DESPUÉS del seed
```powershell
docker cp "$SEEDDIR\backfill_pdf_contrato.sql" sigecop_db:/tmp/backfill.sql
docker exec -i sigecop_db psql "$RENDER_DB" -v ON_ERROR_STOP=1 --single-transaction -f /tmp/backfill.sql
```
**Salida esperada:** una tabla `folio | pdf_contrato` con **`pdf_contrato = 1`** para cada `SOP-2026-001..010` (10 filas). Esto liga el documento `tipo='contrato'` que exige el gate de integración de estimaciones (`estimaciones.controller.js:163`).

---

## Paso 5 — Verificación final
```powershell
docker exec -i sigecop_db psql "$RENDER_DB" -c "SELECT c.folio, c.monto, (SELECT count(*) FROM bitacora_aperturas b WHERE b.contrato_id=c.id) AS bitacora, (SELECT count(*) FROM contrato_documentos d WHERE d.contrato_id=c.id AND d.tipo='contrato') AS pdf, (c.monto=(SELECT COALESCE(SUM(ROUND(cc.cantidad*cc.pu,2)),0) FROM contrato_conceptos cc WHERE cc.contrato_id=c.id)) AS cuadra FROM contratos c WHERE c.folio LIKE 'SOP-2026-%' ORDER BY c.folio;"
docker exec sigecop_db rm -f /tmp/seed10.sql /tmp/backfill.sql
```
**Salida esperada:** **10 filas**, cada una con `bitacora = 1`, `pdf = 1`, `cuadra = t`. Si las 10 cumplen → seed y backfill OK: ya puedes hacer la demo (login con las 5 cuentas, `Sigecop2026!`; los 10 contratos con bitácora abierta y PDF ligado, listos para integrar estimaciones).

---

## En la demo (en vivo, opción A) — curva por etapas de `SOP-2026-001`
1. `dependencia@` → **Convenios** sobre `SOP-2026-001` → tipo **Monto** → editor de programa → **Ampliar / agregar adicional** `AD-01` "Señalamiento horizontal y vertical (balizamiento)", **5000 × $40 = $200,000** (monto $2,400,000 → $2,600,000), motivo con su oficio → registrar → **Autorizar**.
2. `contratista@` → **Avance** sobre `SOP-2026-001` → registrar un avance (con foto) en un periodo.
3. `residente@`/`dependencia@` → **Curva de avance** → se ven las etapas por versión del programa (curva versionada).

---

## Notas de seguridad
- **Idempotencia verificada** (dry-run local sobre clon Render-like con el convenio presente): seed + backfill aplican `exit 0`, re-ejecutados **no duplican** (10 contratos / 10 PDFs estables) y el seed corregido borra en cascada sin chocar con `programa_version→convenio`.
- **Rollback:** cada paso es transacción única con `ON_ERROR_STOP=1`; ante error, Render no cambia.
- **Orden duro:** Paso 3 (seed) → Paso 4 (backfill). Nunca al revés.

---

## Apéndice A — `seed_10_contratos.sql` (versión corregida, íntegra)
> Esta es la fuente de verdad del script del Paso 3. Si `$SEEDDIR` no lo tiene, guarda este bloque como `seed_10_contratos.sql`.
```sql
-- =====================================================================
-- SEED 10 CONTRATOS DE PRUEBA — folios SOP-2026-001 .. SOP-2026-010.
-- Alta COMPLETA (datos generales, catálogo, programa por periodos, jurídicos, garantías, plan de
-- amortización, roster) + BITÁCORA ABIERTA con ACTA DE INICIO firmada por las 3 partes.
-- Datos realistas (obras reales de Guerrero), cuadre EXACTO al centavo (Σ ROUND(cant×pu,2) = monto).
-- Equipo: residente@/contratista@(superintendente)/supervision@/dependencia@ (cuentas BASE).
-- IDEMPOTENTE: borra SOP-2026-% y recrea. NO toca el resto de contratos.
-- =====================================================================

-- IDEMPOTENTE: borra los SOP-2026-% con UN SOLO DELETE. El CASCADE de contratos limpia TODOS los
-- hijos (conceptos, periodos, programa_obra, garantías, roster, plan_amortización, bitácora,
-- convenios_modificatorios, programa_version, concepto_avance, estimaciones, pagos, documentos…).
-- Las FK NO ACTION entre hijos (p. ej. programa_version -> convenios_modificatorios) se validan al
-- FINAL del statement, cuando ambos lados ya se borraron por cascada -> no chocan. (El borrado a
-- pedazos en statements separados sí chocaba: al borrar el convenio, programa_version aún existía.)
DELETE FROM contratos WHERE folio LIKE 'SOP-2026-%';

-- Alta completa parametrizada (conceptos vía arrays paralelos; periodos mensuales contiguos desde inicio).
CREATE OR REPLACE FUNCTION pg_temp.f_alta10(
  p_folio TEXT, p_objeto TEXT, p_ubicacion TEXT, p_monto NUMERIC, p_inicio DATE, p_anticipo_pct NUMERIC,
  p_claves TEXT[], p_descs TEXT[], p_unidades TEXT[], p_cants NUMERIC[], p_pus NUMERIC[], p_nper INT, p_licitacion TEXT
) RETURNS INTEGER AS $$
DECLARE
  v_resid INT; v_super INT; v_superv INT; v_dep INT; v_nom_super TEXT; v_nom_dep TEXT;
  v_id INT; v_fin DATE; v_plazo INT; v_anticipo NUMERIC; v_nconc INT; i INT; k INT;
  v_cc INT; v_pid INT; cc_ids INT[] := ARRAY[]::INT[]; per_ids INT[] := ARRAY[]::INT[];
  v_plan_resto NUMERIC; v_plan_k NUMERIC;
BEGIN
  SELECT id, nombre INTO v_super, v_nom_super FROM usuarios WHERE email='contratista@sigecop.test';
  SELECT id INTO v_resid  FROM usuarios WHERE email='residente@sigecop.test';
  SELECT id INTO v_superv FROM usuarios WHERE email='supervision@sigecop.test';
  SELECT id, nombre INTO v_dep, v_nom_dep FROM usuarios WHERE email='dependencia@sigecop.test';
  IF v_resid IS NULL OR v_super IS NULL OR v_superv IS NULL OR v_dep IS NULL THEN
    RAISE EXCEPTION 'Faltan cuentas demo base; aplica schema.sql.';
  END IF;
  v_fin   := (p_inicio + (p_nper||' month')::interval - INTERVAL '1 day')::date;
  v_plazo := v_fin - p_inicio;
  v_anticipo := ROUND(p_monto * p_anticipo_pct/100, 2);
  v_nconc := array_length(p_claves,1);

  INSERT INTO contratos (folio,tipo,objeto,ubicacion,contratista,dependencia,monto,plazo_dias,fecha_inicio,fecha_termino,
                         created_by,datos_juridicos,anticipo_pct,residente_id,superintendente_id,supervision_id,dependencia_id,
                         ciclo_estimacion,pena_convencional_pct)
  VALUES (p_folio,'Obra pública sobre la base de precios unitarios',p_objeto,p_ubicacion,v_nom_super,v_nom_dep,p_monto,v_plazo,p_inicio,v_fin,
          v_resid, jsonb_build_object('licitacion',p_licitacion,'fecha_fallo',to_char(p_inicio - INTERVAL '20 days','YYYY-MM-DD'),'ramo','Obra pública estatal'),
          p_anticipo_pct,v_resid,v_super,v_superv,v_dep,'mensual',0.0010)
  RETURNING id INTO v_id;

  FOR i IN 1..v_nconc LOOP
    INSERT INTO contrato_conceptos (contrato_id,clave,orden,concepto,unidad,cantidad,pu)
      VALUES (v_id,p_claves[i],i,p_descs[i],p_unidades[i],p_cants[i],p_pus[i]) RETURNING id INTO v_cc;
    cc_ids := array_append(cc_ids, v_cc);
  END LOOP;

  FOR k IN 1..p_nper LOOP
    INSERT INTO contrato_periodos (contrato_id,numero,inicio,fin)
      VALUES (v_id,k,(p_inicio + ((k-1)||' month')::interval)::date,(p_inicio + (k||' month')::interval - INTERVAL '1 day')::date)
      RETURNING id INTO v_pid;
    per_ids := array_append(per_ids, v_pid);
  END LOOP;

  FOR i IN 1..v_nconc LOOP
    k := ((i-1) % p_nper) + 1;
    INSERT INTO programa_obra (contrato_concepto_id,contrato_periodo_id,cantidad) VALUES (cc_ids[i], per_ids[k], p_cants[i]);
  END LOOP;

  IF v_anticipo > 0 THEN
    v_plan_resto := v_anticipo;
    FOR k IN 1..p_nper LOOP
      IF k < p_nper THEN v_plan_k := ROUND(v_anticipo/p_nper,2); ELSE v_plan_k := v_plan_resto; END IF;
      INSERT INTO plan_amortizacion (contrato_id,periodo_numero,monto) VALUES (v_id,k,v_plan_k);
      v_plan_resto := v_plan_resto - v_plan_k;
    END LOOP;
  END IF;

  INSERT INTO contrato_garantias (contrato_id,tipo,afianzadora,poliza,monto,vigencia) VALUES
    (v_id,'cumplimiento','Afianzadora Aserta, S.A.','FZA-CUMP-'||p_folio,ROUND(p_monto*0.10,2),(v_fin + INTERVAL '1 year')::date),
    (v_id,'vicios_ocultos','Afianzadora Aserta, S.A.','FZA-VIC-'||p_folio,ROUND(p_monto*0.10,2),(v_fin + INTERVAL '2 year')::date);
  IF v_anticipo > 0 THEN
    INSERT INTO contrato_garantias (contrato_id,tipo,afianzadora,poliza,monto,vigencia)
      VALUES (v_id,'anticipo','Afianzadora Aserta, S.A.','FZA-ANT-'||p_folio,v_anticipo,(v_fin + INTERVAL '1 year')::date);
  END IF;

  INSERT INTO contrato_roster (contrato_id,rol,usuario_id,vigencia_desde,motivo,registrado_por) VALUES
    (v_id,'residente',      v_resid,  p_inicio,'Asignación inicial (alta del contrato)', v_resid),
    (v_id,'superintendente',v_super,  p_inicio,'Asignación inicial (alta del contrato)', v_resid),
    (v_id,'supervision',    v_superv, p_inicio,'Asignación inicial (alta del contrato)', v_resid);

  RETURN v_id;
END $$ LANGUAGE plpgsql;

-- Apertura de bitácora con ACTA DE INICIO firmada por las 3 partes.
CREATE OR REPLACE FUNCTION pg_temp.f_bita10(p_contrato INT) RETURNS VOID AS $$
DECLARE v_resid INT; v_super INT; v_superv INT; v_nr TEXT; v_ns TEXT; v_nsv TEXT; v_bita INT; v_nota INT; v_ini DATE; v_obj TEXT;
BEGIN
  SELECT residente_id,superintendente_id,supervision_id,fecha_inicio,objeto INTO v_resid,v_super,v_superv,v_ini,v_obj FROM contratos WHERE id=p_contrato;
  SELECT nombre INTO v_nr  FROM usuarios WHERE id=v_resid;
  SELECT nombre INTO v_ns  FROM usuarios WHERE id=v_super;
  SELECT nombre INTO v_nsv FROM usuarios WHERE id=v_superv;
  INSERT INTO bitacora_aperturas (contrato_id,aperturada_por,fecha_apertura,apertura_en,descripcion_trabajos)
    VALUES (p_contrato,v_resid,v_ini,(v_ini::timestamptz + INTERVAL '9 hour'),v_obj) RETURNING id INTO v_bita;
  INSERT INTO bitacora_firmantes (bitacora_id,parte,firmante,usuario_id,rol_en_firma,aplica,firmado,firmado_en) VALUES
    (v_bita,1,v_nr, v_resid, 'residente',      true,true,(v_ini::timestamptz + INTERVAL '9 hour 30 min')),
    (v_bita,2,v_ns, v_super, 'superintendente',true,true,(v_ini::timestamptz + INTERVAL '9 hour 30 min')),
    (v_bita,3,v_nsv,v_superv,'supervision',    true,true,(v_ini::timestamptz + INTERVAL '9 hour 30 min'));
  INSERT INTO bitacora_notas (bitacora_id,tipo,numero,contenido,emisor_id,estado,fecha)
    VALUES (v_bita,'apertura',1,
      'ACTA DE INICIO DE LOS TRABAJOS. En esta fecha se da formal inicio a la obra relativa a: '||v_obj||
      '. Se hace constar la entrega física del sitio al contratista, la disponibilidad del inmueble y, en su caso, el trámite del anticipo. Las partes abren la bitácora electrónica y firman de conformidad (art. 123 LOPSRM; arts. 122-125 RLOPSRM).',
      v_resid,'emitida',(v_ini::timestamptz + INTERVAL '9 hour 30 min')) RETURNING id INTO v_nota;
  INSERT INTO bitacora_nota_firmas (nota_id,usuario_id,rol_en_firma) VALUES
    (v_nota,v_resid,'residente'),(v_nota,v_super,'superintendente'),(v_nota,v_superv,'supervision');
END $$ LANGUAGE plpgsql;

-- ===================== LOS 10 CONTRATOS =====================
DO $$
DECLARE v INT;
BEGIN
  v := pg_temp.f_alta10('SOP-2026-001','Pavimentación con carpeta asfáltica de la Av. Costera Miguel Alemán, tramo K0+000–K1+200','Acapulco de Juárez, Guerrero',2400000.00,DATE '2026-04-01',30.00,
    ARRAY['CONC-01','CONC-02','CONC-03'],ARRAY['Limpieza, trazo y nivelación','Base hidráulica compactada','Carpeta asfáltica en caliente'],ARRAY['m2','m3','m2'],ARRAY[12000.000,1600.000,12000.000],ARRAY[20.00,600.00,100.00],3,'LO-912001-E1-2026'); PERFORM pg_temp.f_bita10(v);

  v := pg_temp.f_alta10('SOP-2026-002','Construcción de aula didáctica de usos múltiples en la Escuela Primaria "Vicente Guerrero"','Chilpancingo de los Bravo, Guerrero',1500000.00,DATE '2026-05-01',20.00,
    ARRAY['CONC-01','CONC-02','CONC-03'],ARRAY['Cimentación de concreto reforzado','Estructura y muros de mampostería','Acabados e instalaciones'],ARRAY['m3','lote','lote'],ARRAY[150.000,1.000,1.000],ARRAY[2000.00,700000.00,500000.00],3,'LO-912002-E2-2026'); PERFORM pg_temp.f_bita10(v);

  v := pg_temp.f_alta10('SOP-2026-003','Construcción de red de drenaje sanitario en la colonia Ampliación 24 de Febrero','Iguala de la Independencia, Guerrero',3200000.00,DATE '2026-03-15',30.00,
    ARRAY['CONC-01','CONC-02','CONC-03'],ARRAY['Excavación de zanjas en material tipo II','Suministro y tendido de tubería PVC sanitaria','Pozos de visita y relleno compactado'],ARRAY['m3','ml','pza'],ARRAY[4000.000,2000.000,30.000],ARRAY[300.00,700.00,20000.00],4,'LO-912003-E1-2026'); PERFORM pg_temp.f_bita10(v);

  v := pg_temp.f_alta10('SOP-2026-004','Rehabilitación del puente vehicular sobre el arroyo El Naranjo','Taxco de Alarcón, Guerrero',5000000.00,DATE '2026-04-15',30.00,
    ARRAY['CONC-01','CONC-02','CONC-03'],ARRAY['Demolición y retiro de estructura existente','Estructura de concreto reforzado','Superestructura, losa y barandales'],ARRAY['lote','m3','lote'],ARRAY[1.000,700.000,1.000],ARRAY[800000.00,4000.00,1400000.00],4,'LO-912004-E1-2026'); PERFORM pg_temp.f_bita10(v);

  v := pg_temp.f_alta10('SOP-2026-005','Construcción de barda perimetral en la Escuela Secundaria Técnica No. 45','Zihuatanejo de Azueta, Guerrero',850000.00,DATE '2026-06-01',10.00,
    ARRAY['CONC-01','CONC-02','CONC-03'],ARRAY['Cimentación y dados de concreto','Muro de block hueco','Castillos, cadenas y acabado'],ARRAY['m3','m2','lote'],ARRAY[50.000,1000.000,1.000],ARRAY[3000.00,500.00,200000.00],2,'LO-912005-E3-2026'); PERFORM pg_temp.f_bita10(v);

  v := pg_temp.f_alta10('SOP-2026-006','Ampliación de red eléctrica y alumbrado público en la colonia Renacimiento','Acapulco de Juárez, Guerrero',1800000.00,DATE '2026-05-15',20.00,
    ARRAY['CONC-01','CONC-02','CONC-03'],ARRAY['Canalización subterránea y registros','Suministro y montaje de postes y cableado','Luminarias LED y conexión a red'],ARRAY['ml','pza','pza'],ARRAY[1500.000,60.000,60.000],ARRAY[200.00,15000.00,10000.00],3,'LO-912006-E2-2026'); PERFORM pg_temp.f_bita10(v);

  v := pg_temp.f_alta10('SOP-2026-007','Construcción de cancha de usos múltiples con techumbre en la Unidad Deportiva','Chilpancingo de los Bravo, Guerrero',2100000.00,DATE '2026-03-20',15.00,
    ARRAY['CONC-01','CONC-02','CONC-03'],ARRAY['Plataforma y terracería compactada','Firme de concreto y cancha','Techumbre metálica y gradas'],ARRAY['m2','m2','lote'],ARRAY[2000.000,1500.000,1.000],ARRAY[300.00,600.00,600000.00],4,'LO-912007-E2-2026'); PERFORM pg_temp.f_bita10(v);

  v := pg_temp.f_alta10('SOP-2026-008','Rehabilitación integral del mercado municipal "Benito Juárez"','Iguala de la Independencia, Guerrero',4200000.00,DATE '2026-04-01',30.00,
    ARRAY['CONC-01','CONC-02','CONC-03'],ARRAY['Demolición y obras preliminares','Albañilería y reforzamiento estructural','Instalaciones y acabados'],ARRAY['lote','m2','m2'],ARRAY[1.000,1200.000,1200.000],ARRAY[600000.00,2000.00,1000.00],4,'LO-912008-E1-2026'); PERFORM pg_temp.f_bita10(v);

  v := pg_temp.f_alta10('SOP-2026-009','Construcción de clínica de salud rural de primer nivel','Tlapa de Comonfort, Guerrero',3600000.00,DATE '2026-05-10',20.00,
    ARRAY['CONC-01','CONC-02','CONC-03'],ARRAY['Cimentación y estructura de concreto','Albañilería y cancelería','Instalaciones especiales (gases médicos y eléctrica)'],ARRAY['m3','m2','lote'],ARRAY[300.000,900.000,1.000],ARRAY[3000.00,2000.00,900000.00],3,'LO-912009-E1-2026'); PERFORM pg_temp.f_bita10(v);

  v := pg_temp.f_alta10('SOP-2026-010','Pavimentación con concreto hidráulico de la calle Hidalgo, centro','Ometepec, Guerrero',2750000.00,DATE '2026-06-10',10.00,
    ARRAY['CONC-01','CONC-02','CONC-03'],ARRAY['Preliminares, trazo y demolición','Base estabilizada con cal','Losa de concreto hidráulico MR-45'],ARRAY['m2','m3','m2'],ARRAY[5000.000,1500.000,5000.000],ARRAY[50.00,500.00,350.00],3,'LO-912010-E3-2026'); PERFORM pg_temp.f_bita10(v);

  RAISE NOTICE 'SEED 10: SOP-2026-001..010 sembrados.';
END $$;

-- ===================== VERIFICACIÓN (cuadre + completitud) =====================
SELECT c.folio, c.monto,
       (SELECT COALESCE(SUM(ROUND(cc.cantidad*cc.pu,2)),0) FROM contrato_conceptos cc WHERE cc.contrato_id=c.id) AS suma_conceptos,
       (c.monto = (SELECT COALESCE(SUM(ROUND(cc.cantidad*cc.pu,2)),0) FROM contrato_conceptos cc WHERE cc.contrato_id=c.id)) AS cuadra,
       c.anticipo_pct,
       (SELECT COALESCE(SUM(pa.monto),0) FROM plan_amortizacion pa WHERE pa.contrato_id=c.id) AS suma_plan,
       ROUND(c.monto*c.anticipo_pct/100,2) AS anticipo_esperado,
       (SELECT count(*) FROM contrato_conceptos cc WHERE cc.contrato_id=c.id) AS conc,
       (SELECT count(*) FROM contrato_periodos p WHERE p.contrato_id=c.id) AS per,
       (SELECT count(*) FROM contrato_garantias g WHERE g.contrato_id=c.id) AS gar,
       (SELECT count(*) FROM contrato_roster r WHERE r.contrato_id=c.id) AS roster,
       (SELECT count(*) FROM bitacora_aperturas b WHERE b.contrato_id=c.id) AS bita,
       c.fecha_inicio, c.fecha_termino
  FROM contratos c WHERE c.folio LIKE 'SOP-2026-%' ORDER BY c.folio;
```

---

## Apéndice B — `backfill_pdf_contrato.sql` (íntegro)
> Fuente de verdad del script del Paso 4. Si `$SEEDDIR` no lo tiene, guarda este bloque como `backfill_pdf_contrato.sql`.
```sql
-- =====================================================================
-- BACKFILL del PDF firmado (documento tipo='contrato') para los contratos demo.
-- Cierra el Bug #1: el gate de integración de estimaciones
--   (estimaciones.controller.js:163  ->  SELECT 1 FROM contrato_documentos WHERE contrato_id=$1 AND tipo='contrato')
-- sólo exige que EXISTA una fila tipo='contrato' ligada; NO valida el contenido.
-- Insertamos un PDF mínimo válido (bytes "%PDF-1.4\n%%EOF\n") para que descargas no rompan.
-- IDEMPOTENTE: el NOT EXISTS evita duplicar y respeta el índice parcial uq_contrato_doc_singleton
--   (contrato_id, tipo) WHERE tipo IN ('contrato','anticipo_autorizacion'). El trigger append-only
--   es BEFORE UPDATE, no afecta el INSERT.
-- ORDEN: correr SIEMPRE DESPUÉS de seed_10_contratos.sql (su DELETE-first hace CASCADE a
--   contrato_documentos; si se re-siembra, re-correr este backfill).
-- =====================================================================
INSERT INTO contrato_documentos (contrato_id, nombre, mime, tamano, contenido, tipo)
SELECT c.id,
       'contrato_firmado_'||c.folio||'.pdf',
       'application/pdf',
       octet_length(decode('255044462d312e340a2525454f460a','hex')),
       decode('255044462d312e340a2525454f460a','hex'),
       'contrato'
FROM contratos c
WHERE (c.folio LIKE 'SOP-2026-%' OR c.folio LIKE 'PRUEBA-HU-%')
  AND NOT EXISTS (
    SELECT 1 FROM contrato_documentos d WHERE d.contrato_id = c.id AND d.tipo = 'contrato'
  );

-- Verificación: cada contrato demo debe quedar con exactamente 1 PDF tipo='contrato'.
SELECT c.folio, count(d.id) FILTER (WHERE d.tipo='contrato') AS pdf_contrato
FROM contratos c LEFT JOIN contrato_documentos d ON d.contrato_id=c.id
WHERE c.folio LIKE 'SOP-2026-%' OR c.folio LIKE 'PRUEBA-HU-%'
GROUP BY c.folio ORDER BY c.folio;
```
