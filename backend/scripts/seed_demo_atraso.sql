-- =====================================================================
-- SEED — 3 CONTRATOS DE PRUEBA CON ATRASO (PRUEBA-ATRASO-01/02/03).
-- Por la regla "fecha de inicio no-pasada", estos contratos se arman por SQL DIRECTO (fechas históricas
-- 2026-03..05), NO por el alta. Base idéntica a seed_demo_24 (monto $1,000,000; CONC-01/02/03 = 300k/300k/400k;
-- 3 periodos mensuales VENCIDOS), salvo lo que DEFINE el atraso: avance por debajo de lo programado + pena
-- convencional 5% (art. 46 Bis LOPSRM + 86-88 RLOPSRM, tope art. 90 = no excede la fianza de cumplimiento).
--
-- IDEMPOTENTE: borra/recrea SOLO folios PRUEBA-ATRASO-%. NO toca OP-2026-%, SOP-2026-% ni PRUEBA-HU-%.
-- Requiere: schema.sql + cuentas base (contratista@/residente@/supervision@/dependencia@/finanzas@).
-- Uso (LOCAL):  docker exec -i sigecop_db psql -U sigecop -d sigecop_db -v ON_ERROR_STOP=1 < backend/scripts/seed_demo_atraso.sql
--
-- MATH DEL ATRASO (cuadre EXACTO al centavo), pena = 5% (v_pena=0.05):
--   Estimación P1/CONC-01 con avance ejecutado=600 (programado=1000 → ATRASO):
--     subtotal = 600×300 = 180,000.00
--     (−) amortización 30% = 54,000.00
--     (−) 5 al millar (art. 191 LFD) = ROUND(180,000×0.005,2) = 900.00
--     (−) retención por ATRASO (art. 46 Bis) = ROUND(180,000×0.05,2) = 9,000.00
--     (=) NETO = 180,000 − 54,000 − 900 − 9,000 = 116,100.00
-- =====================================================================

-- (0) LIMPIEZA idempotente — SOLO PRUEBA-ATRASO-% (hijos en orden de FK; igual que seed_demo_24).
DO $$
DECLARE ids INTEGER[];
BEGIN
  SELECT array_agg(id) INTO ids FROM contratos WHERE folio LIKE 'PRUEBA-ATRASO-%';
  IF ids IS NOT NULL THEN
    DELETE FROM pagos                    WHERE contrato_id = ANY(ids);
    DELETE FROM estimaciones             WHERE contrato_id = ANY(ids);   -- cascada: generadores, notas, observaciones
    DELETE FROM concepto_avance          WHERE contrato_concepto_id IN (SELECT id FROM contrato_conceptos WHERE contrato_id = ANY(ids));
    DELETE FROM contrato_roster          WHERE contrato_id = ANY(ids);
    DELETE FROM convenios_modificatorios WHERE contrato_id = ANY(ids);
    DELETE FROM minutas                  WHERE contrato_id = ANY(ids);
    DELETE FROM visitas                  WHERE contrato_id = ANY(ids);
    DELETE FROM contratos                WHERE id = ANY(ids);            -- cascada: garantías, etc.
  END IF;
END $$;

-- =====================================================================
-- HELPERS (pg_temp; se descartan al cerrar la conexión). Mismo patrón que seed_demo_24, con pena parametrizable.
-- =====================================================================
CREATE OR REPLACE FUNCTION pg_temp.f_base_a(p_folio TEXT, p_objeto TEXT, p_pena NUMERIC) RETURNS INTEGER AS $$
DECLARE
  v_resid INTEGER; v_super INTEGER; v_superv INTEGER; v_dep INTEGER; v_nom_super TEXT; v_nom_dep TEXT;
  v_id INTEGER; c1 INTEGER; c2 INTEGER; c3 INTEGER; p1 INTEGER; p2 INTEGER; p3 INTEGER;
BEGIN
  SELECT id, nombre INTO v_super, v_nom_super FROM usuarios WHERE email='contratista@sigecop.test';
  SELECT id INTO v_resid  FROM usuarios WHERE email='residente@sigecop.test';
  SELECT id INTO v_superv FROM usuarios WHERE email='supervision@sigecop.test';
  SELECT id, nombre INTO v_dep, v_nom_dep FROM usuarios WHERE email='dependencia@sigecop.test';
  IF v_resid IS NULL OR v_super IS NULL OR v_superv IS NULL OR v_dep IS NULL THEN
    RAISE EXCEPTION 'Faltan cuentas demo; aplica schema.sql y reseed_cuentas.sql primero.';
  END IF;

  INSERT INTO contratos (folio, tipo, objeto, ubicacion, contratista, dependencia, monto, plazo_dias,
                         fecha_inicio, fecha_termino, created_by, datos_juridicos, anticipo_pct,
                         residente_id, superintendente_id, supervision_id, dependencia_id,
                         ciclo_estimacion, pena_convencional_pct)
  VALUES (p_folio, 'Obra pública sobre la base de precios unitarios', p_objeto,
          'Ciudad Universitaria, Chilpancingo, Guerrero',
          v_nom_super, v_nom_dep, 1000000.00, 90, DATE '2026-03-01', DATE '2026-05-31', v_resid,
          '{"licitacion":"LO-PRUEBA-ATRASO-2026","fecha_fallo":"2026-02-15","ramo":"Obra educativa"}'::jsonb,
          30.00, v_resid, v_super, v_superv, v_dep, 'mensual', p_pena)
  RETURNING id INTO v_id;

  INSERT INTO contrato_conceptos (contrato_id, clave, orden, concepto, unidad, cantidad, pu)
    VALUES (v_id,'CONC-01',1,'Terracerías y movimiento de tierras','m3',1000.000,300.00) RETURNING id INTO c1;
  INSERT INTO contrato_conceptos (contrato_id, clave, orden, concepto, unidad, cantidad, pu)
    VALUES (v_id,'CONC-02',2,'Cimentación','m3',200.000,1500.00) RETURNING id INTO c2;
  INSERT INTO contrato_conceptos (contrato_id, clave, orden, concepto, unidad, cantidad, pu)
    VALUES (v_id,'CONC-03',3,'Estructura y obra negra','lote',1.000,400000.00) RETURNING id INTO c3;

  INSERT INTO contrato_periodos (contrato_id,numero,inicio,fin) VALUES (v_id,1,DATE '2026-03-01',DATE '2026-03-31') RETURNING id INTO p1;
  INSERT INTO contrato_periodos (contrato_id,numero,inicio,fin) VALUES (v_id,2,DATE '2026-04-01',DATE '2026-04-30') RETURNING id INTO p2;
  INSERT INTO contrato_periodos (contrato_id,numero,inicio,fin) VALUES (v_id,3,DATE '2026-05-01',DATE '2026-05-31') RETURNING id INTO p3;

  INSERT INTO programa_obra (contrato_concepto_id, contrato_periodo_id, cantidad) VALUES
    (c1,p1,1000.000),(c2,p2,200.000),(c3,p3,1.000);
  INSERT INTO plan_amortizacion (contrato_id, periodo_numero, monto) VALUES
    (v_id,1,90000.00),(v_id,2,90000.00),(v_id,3,120000.00);
  INSERT INTO contrato_garantias (contrato_id, tipo, afianzadora, poliza, monto, vigencia) VALUES
    (v_id,'cumplimiento','Afianzadora Aserta, S.A.','FZA-CUMP-'||p_folio,100000.00, DATE '2027-05-31'),
    (v_id,'anticipo',    'Afianzadora Aserta, S.A.','FZA-ANT-'||p_folio, 300000.00, DATE '2027-05-31'),
    (v_id,'vicios_ocultos','Afianzadora Aserta, S.A.','FZA-VIC-'||p_folio,100000.00,DATE '2028-05-31');
  INSERT INTO contrato_roster (contrato_id, rol, usuario_id, vigencia_desde, motivo, registrado_por) VALUES
    (v_id,'residente',      v_resid,  DATE '2026-03-01','Asignación inicial (alta del contrato)', v_resid),
    (v_id,'superintendente',v_super,  DATE '2026-03-01','Asignación inicial (alta del contrato)', v_resid),
    (v_id,'supervision',    v_superv, DATE '2026-03-01','Asignación inicial (alta del contrato)', v_resid);
  RETURN v_id;
END $$ LANGUAGE plpgsql;

-- Bitácora abierta + firmada (idéntico a seed_demo_24.f_bitacora).
CREATE OR REPLACE FUNCTION pg_temp.f_bitacora_a(p_contrato INTEGER) RETURNS INTEGER AS $$
DECLARE
  v_resid INTEGER; v_super INTEGER; v_superv INTEGER; v_nr TEXT; v_ns TEXT; v_nsv TEXT; v_bita INTEGER; v_nota INTEGER;
BEGIN
  SELECT residente_id, superintendente_id, supervision_id INTO v_resid, v_super, v_superv FROM contratos WHERE id=p_contrato;
  SELECT nombre INTO v_nr  FROM usuarios WHERE id=v_resid;
  SELECT nombre INTO v_ns  FROM usuarios WHERE id=v_super;
  SELECT nombre INTO v_nsv FROM usuarios WHERE id=v_superv;
  INSERT INTO bitacora_aperturas (contrato_id, aperturada_por, fecha_apertura, apertura_en, descripcion_trabajos)
    VALUES (p_contrato, v_resid, DATE '2026-03-01', TIMESTAMPTZ '2026-03-01 09:00:00-06', 'Obra de prueba CON ATRASO (demo controlada).')
    RETURNING id INTO v_bita;
  INSERT INTO bitacora_firmantes (bitacora_id, parte, firmante, usuario_id, rol_en_firma, aplica, firmado, firmado_en) VALUES
    (v_bita,1,v_nr, v_resid, 'residente',      true,true,TIMESTAMPTZ '2026-03-01 09:30:00-06'),
    (v_bita,2,v_ns, v_super, 'superintendente',true,true,TIMESTAMPTZ '2026-03-01 09:30:00-06'),
    (v_bita,3,v_nsv,v_superv,'supervision',    true,true,TIMESTAMPTZ '2026-03-01 09:30:00-06');
  INSERT INTO bitacora_notas (bitacora_id, tipo, numero, contenido, emisor_id, estado, fecha)
    VALUES (v_bita,'apertura',1,'Apertura de bitácora electrónica de la obra (demo con atraso).', v_resid,'emitida',TIMESTAMPTZ '2026-03-01 09:30:00-06')
    RETURNING id INTO v_nota;
  INSERT INTO bitacora_nota_firmas (nota_id, usuario_id, rol_en_firma) VALUES
    (v_nota,v_resid,'residente'),(v_nota,v_super,'superintendente'),(v_nota,v_superv,'supervision');
  RETURN v_bita;
END $$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION pg_temp.f_avance_a(p_contrato INTEGER, p_clave TEXT, p_periodo INTEGER, p_cant NUMERIC) RETURNS VOID AS $$
DECLARE v_cc INTEGER; v_pid INTEGER; v_super INTEGER;
BEGIN
  SELECT id INTO v_cc FROM contrato_conceptos WHERE contrato_id=p_contrato AND clave=p_clave;
  SELECT id INTO v_pid FROM contrato_periodos WHERE contrato_id=p_contrato AND numero=p_periodo;
  SELECT superintendente_id INTO v_super FROM contratos WHERE id=p_contrato;
  INSERT INTO concepto_avance (contrato_concepto_id, contrato_periodo_id, cantidad, fecha, registrado_por)
    VALUES (v_cc, v_pid, p_cant, (SELECT fin FROM contrato_periodos WHERE id=v_pid), v_super);
END $$ LANGUAGE plpgsql;

-- Estimación CON retención por ATRASO (art. 46 Bis). p_cant = lo ejecutado (< programado del periodo).
CREATE OR REPLACE FUNCTION pg_temp.f_estim_atraso(p_contrato INTEGER, p_numero INTEGER, p_clave TEXT, p_periodo INTEGER, p_estado TEXT, p_cant NUMERIC) RETURNS INTEGER AS $$
DECLARE
  v_cc INTEGER; v_pu NUMERIC; v_ini DATE; v_fin DATE; v_super INTEGER; v_fin_u INTEGER; v_pena NUMERIC;
  v_sub NUMERIC; v_amort NUMERIC; v_ret NUMERIC; v_ret_atraso NUMERIC; v_neto NUMERIC; v_env TIMESTAMPTZ; v_id INTEGER;
BEGIN
  SELECT id, pu INTO v_cc, v_pu FROM contrato_conceptos WHERE contrato_id=p_contrato AND clave=p_clave;
  SELECT inicio, fin INTO v_ini, v_fin FROM contrato_periodos WHERE contrato_id=p_contrato AND numero=p_periodo;
  SELECT superintendente_id, COALESCE(pena_convencional_pct,0) INTO v_super, v_pena FROM contratos WHERE id=p_contrato;
  SELECT id INTO v_fin_u FROM usuarios WHERE email='finanzas@sigecop.test';
  v_sub        := ROUND(p_cant*v_pu,2);
  v_amort      := ROUND(v_sub*0.30,2);
  v_ret        := ROUND(v_sub*0.005,2);                 -- 5 al millar (art. 191 LFD)
  v_ret_atraso := ROUND(v_sub*v_pena,2);                -- pena por atraso (art. 46 Bis LOPSRM)
  v_neto       := v_sub - v_amort - v_ret - v_ret_atraso;
  v_env        := CASE WHEN p_estado IN ('enviada','autorizada','rechazada','pagada') THEN TIMESTAMPTZ '2026-06-03 10:00:00-06' ELSE NULL END;

  INSERT INTO estimaciones (contrato_id,numero,periodo_inicio,periodo_fin,estado,anticipo_pct_snapshot,
                            subtotal,amortizacion,retencion,retencion_atraso,deductivas,neto,integrada_por,integrada_en,enviada_en,enviada_por)
  VALUES (p_contrato,p_numero,v_ini,v_fin,p_estado,30.00,v_sub,v_amort,v_ret,v_ret_atraso,0.00,v_neto,
          v_super, TIMESTAMPTZ '2026-06-02 10:00:00-06', v_env, CASE WHEN v_env IS NULL THEN NULL ELSE v_super END)
  RETURNING id INTO v_id;
  INSERT INTO estimacion_generadores (estimacion_id,contrato_concepto_id,cantidad_periodo,cantidad_anterior_acum,pu_snapshot)
    VALUES (v_id,v_cc,p_cant,0.0000,v_pu);
  IF p_estado='pagada' THEN
    INSERT INTO pagos (contrato_id,estimacion_id,estimacion_ref,fecha_pago,importe,referencia,factura_cfdi,fecha_factura,registrado_por)
      VALUES (p_contrato,v_id,'EST-'||p_numero,DATE '2026-06-10',v_neto,'SPEI-A'||p_numero,'CFDI-A'||p_numero,DATE '2026-06-08',v_fin_u);
  END IF;
  RETURN v_id;
END $$ LANGUAGE plpgsql;

-- =====================================================================
-- LOS 3 CONTRATOS CON ATRASO
-- =====================================================================
DO $$
DECLARE v_id INTEGER;
BEGIN
  -- ATRASO-01 — Atraso en AVANCE/SEGUIMIENTO (HU-07): avance MUY por debajo de lo programado, sin estimación.
  v_id := pg_temp.f_base_a('PRUEBA-ATRASO-01','PRUEBA ATRASO-01 · Atraso por concepto (alerta HU-07)', 0.05);
  PERFORM pg_temp.f_bitacora_a(v_id);
  PERFORM pg_temp.f_avance_a(v_id,'CONC-01',1,100.000);   -- programado 1000, ejecutado 100 → déficit 900

  -- ATRASO-02 — Atraso CON ESTIMACIÓN: estimación #1 integrada con RETENCIÓN POR ATRASO en la carátula.
  v_id := pg_temp.f_base_a('PRUEBA-ATRASO-02','PRUEBA ATRASO-02 · Estimación con retención por atraso', 0.05);
  PERFORM pg_temp.f_bitacora_a(v_id);
  PERFORM pg_temp.f_avance_a(v_id,'CONC-01',1,600.000);   -- programado 1000, ejecutado 600 → atrasado
  PERFORM pg_temp.f_estim_atraso(v_id,1,'CONC-01',1,'integrada',600.000); -- neto 116,100.00 (ret. atraso 9,000)

  -- ATRASO-03 — Atraso hasta FINIQUITO: estimación #1 PAGADA (con retención por atraso) + bitácora → finiquitable.
  v_id := pg_temp.f_base_a('PRUEBA-ATRASO-03','PRUEBA ATRASO-03 · Finiquito con pena por atraso (art. 46 Bis)', 0.05);
  PERFORM pg_temp.f_bitacora_a(v_id);
  PERFORM pg_temp.f_avance_a(v_id,'CONC-01',1,600.000);
  PERFORM pg_temp.f_estim_atraso(v_id,1,'CONC-01',1,'pagada',600.000);    -- pagada → pago 116,100.00; listo para finiquito

  RAISE NOTICE 'SEED ATRASO: contratos PRUEBA-ATRASO-01/02/03 sembrados.';
END $$;

-- (V) Verificación: los 3 con su atraso y la retención por atraso aplicada.
SELECT c.folio, c.pena_convencional_pct AS pena,
       (SELECT count(*) FROM bitacora_aperturas b WHERE b.contrato_id=c.id) AS bita,
       (SELECT count(*) FROM estimaciones e WHERE e.contrato_id=c.id)       AS est,
       COALESCE((SELECT string_agg(e.estado,',' ORDER BY e.numero) FROM estimaciones e WHERE e.contrato_id=c.id),'-') AS estados,
       COALESCE((SELECT SUM(e.retencion_atraso) FROM estimaciones e WHERE e.contrato_id=c.id),0) AS ret_atraso_total,
       COALESCE((SELECT SUM(e.neto) FROM estimaciones e WHERE e.contrato_id=c.id),0) AS neto_total,
       (SELECT count(*) FROM pagos p WHERE p.contrato_id=c.id)              AS pagos
  FROM contratos c WHERE c.folio LIKE 'PRUEBA-ATRASO-%' ORDER BY c.folio;
