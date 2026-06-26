-- =====================================================================
-- SEED — CONTRATOS DE PRUEBA DE "TIEMPO RECORRIDO" (PRUEBA-TR-*).
-- Casos que NO se pueden armar por el alta (regla "fecha de inicio no-pasada"): notas/plazos/vigencias ya
-- vencidos, amortización multi-periodo, sustitución de personas con histórico, versiones de programa, etc.
-- Se siembran por SQL DIRECTO (los triggers de inmutabilidad son BEFORE UPDATE; el INSERT pasa).
-- Base idéntica a los demás demo ($1,000,000; CONC-01/02/03 = 300k/300k/400k; 3 periodos mensuales VENCIDOS),
-- SALVO lo que define cada caso (C7 tiene su propia base de $1,200,000 con concepto adicional).
--
-- IDEMPOTENTE: borra/recrea SOLO folios PRUEBA-TR-%. NO toca OP-2026-%, SOP-2026-%, PRUEBA-HU-% ni PRUEBA-ATRASO-%.
-- Requiere: schema.sql + cuentas base (residente@/contratista@/supervision@/dependencia@/finanzas@) y, para C5,
--           residente2.demo@ (entrante de la sustitución).
-- Uso (LOCAL):  docker exec -i sigecop_db psql -U sigecop -d sigecop_db -v ON_ERROR_STOP=1 < backend/scripts/seed_demo_tr.sql
--
-- LOS 7 CASOS:
--   C1 PRUEBA-TR-NOTA-VENCIDA    — aceptación tácita de nota (art. 123 fr. III RLOPSRM): plazo de firma vencido.
--   C2 PRUEBA-TR-FIANZA-VENCIDA  — fianza con vigencia caducada (art. 98 fr. I inc. c RLOPSRM).
--   C3 PRUEBA-TR-CONVENIO-PLAZO  — contrato LISTO para registrar→autorizar un convenio de plazo (art. 59 LOPSRM).
--   C4 PRUEBA-TR-AMORT-MULTI     — amortización del anticipo a lo largo de 3 estimaciones (art. 143 fr. I RLOPSRM).
--   C5 PRUEBA-TR-FIRMA-VIGENCIA  — regla temporal de firmas del roster (art. 125 RLOPSRM): entrante firma nota previa a su alta.
--   C6 PRUEBA-TR-REVISION-VENCIDA— plazo de revisión de estimación vencido (art. 54 LOPSRM, 15 días). *** POR REVISAR (ver nota) ***
--   C7 PRUEBA-TR-CURVA-HISTORICA — curva con histórico congelado: 2 versiones de programa por un convenio de monto (art. 59).
--
-- *** C6 — POR REVISAR ***: el plazo vencido SÍ es observable (semáforo ROJO "Vencido" + título "art. 54 LOPSRM"
--     en Revisión/Envío de estimación), PERO la consecuencia legal "afirmativa ficta" NO está rotulada en la UI
--     ni el estado se voltea (sigue "Presentada"). El dato queda sembrado; la observabilidad en pantalla debe
--     CONFIRMARSE antes de venderlo como caso firme. No ejecutar como caso firme hasta confirmarlo.
-- =====================================================================

-- (0) LIMPIEZA idempotente — SOLO PRUEBA-TR-% (hijos en orden de FK).
DO $$
DECLARE ids INTEGER[];
BEGIN
  SELECT array_agg(id) INTO ids FROM contratos WHERE folio LIKE 'PRUEBA-TR-%';
  IF ids IS NOT NULL THEN
    DELETE FROM pagos                    WHERE contrato_id = ANY(ids);
    DELETE FROM estimaciones             WHERE contrato_id = ANY(ids);   -- cascada: generadores, notas, observaciones
    DELETE FROM concepto_avance          WHERE contrato_concepto_id IN (SELECT id FROM contrato_conceptos WHERE contrato_id = ANY(ids));
    DELETE FROM programa_version          WHERE contrato_id = ANY(ids);  -- cascada: concepto/celda; ANTES de convenios (FK convenio_id)
    DELETE FROM contrato_roster          WHERE contrato_id = ANY(ids);
    DELETE FROM convenios_modificatorios WHERE contrato_id = ANY(ids);
    DELETE FROM minutas                  WHERE contrato_id = ANY(ids);
    DELETE FROM visitas                  WHERE contrato_id = ANY(ids);
    DELETE FROM contratos                WHERE id = ANY(ids);            -- cascada: garantías, bitácora, etc.
  END IF;
END $$;

-- =====================================================================
-- HELPERS (pg_temp; se descartan al cerrar la conexión). Mismo patrón que seed_demo_24/atraso.
-- =====================================================================

-- f_base_tr: base IDÉNTICA a los demás demo ($1,000,000; CONC-01/02/03 = 300k/300k/400k; 3 periodos vencidos).
CREATE OR REPLACE FUNCTION pg_temp.f_base_tr(p_folio TEXT, p_objeto TEXT) RETURNS INTEGER AS $$
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
          '{"licitacion":"LO-PRUEBA-TR-2026","fecha_fallo":"2026-02-15","ramo":"Obra educativa"}'::jsonb,
          30.00, v_resid, v_super, v_superv, v_dep, 'mensual', 0.0010)
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

-- f_bitacora_tr: abre la bitácora FIRMADA por las 3 partes (nota #1 apertura firmada). plazo_firma_dias parametrizable
-- (p.ej. 2 = la nota vieja se vuelve tácita; 30 = generoso, para que la nota vieja NO sea tácita y la regla de
-- vigencia de firmas sí pueda morder en C5). Devuelve el id de la apertura.
CREATE OR REPLACE FUNCTION pg_temp.f_bitacora_tr(p_contrato INTEGER, p_plazo INTEGER) RETURNS INTEGER AS $$
DECLARE
  v_resid INTEGER; v_super INTEGER; v_superv INTEGER; v_nr TEXT; v_ns TEXT; v_nsv TEXT; v_bita INTEGER; v_nota INTEGER;
BEGIN
  SELECT residente_id, superintendente_id, supervision_id INTO v_resid, v_super, v_superv FROM contratos WHERE id=p_contrato;
  SELECT nombre INTO v_nr  FROM usuarios WHERE id=v_resid;
  SELECT nombre INTO v_ns  FROM usuarios WHERE id=v_super;
  SELECT nombre INTO v_nsv FROM usuarios WHERE id=v_superv;
  INSERT INTO bitacora_aperturas (contrato_id, aperturada_por, fecha_apertura, apertura_en, plazo_firma_dias, descripcion_trabajos)
    VALUES (p_contrato, v_resid, DATE '2026-03-01', TIMESTAMPTZ '2026-03-01 09:00:00-06', p_plazo, 'Obra de prueba "tiempo recorrido" (demo controlada).')
    RETURNING id INTO v_bita;
  INSERT INTO bitacora_firmantes (bitacora_id, parte, firmante, usuario_id, rol_en_firma, aplica, firmado, firmado_en) VALUES
    (v_bita,1,v_nr, v_resid, 'residente',      true,true,TIMESTAMPTZ '2026-03-01 09:30:00-06'),
    (v_bita,2,v_ns, v_super, 'superintendente',true,true,TIMESTAMPTZ '2026-03-01 09:30:00-06'),
    (v_bita,3,v_nsv,v_superv,'supervision',    true,true,TIMESTAMPTZ '2026-03-01 09:30:00-06');
  INSERT INTO bitacora_notas (bitacora_id, tipo, numero, contenido, emisor_id, estado, fecha)
    VALUES (v_bita,'apertura',1,'Apertura de bitácora electrónica de la obra (demo tiempo recorrido).', v_resid,'emitida',TIMESTAMPTZ '2026-03-01 09:30:00-06')
    RETURNING id INTO v_nota;
  INSERT INTO bitacora_nota_firmas (nota_id, usuario_id, rol_en_firma) VALUES
    (v_nota,v_resid,'residente'),(v_nota,v_super,'superintendente'),(v_nota,v_superv,'supervision');
  RETURN v_bita;
END $$ LANGUAGE plpgsql;

-- f_avance_tr: registra avance ejecutado (fecha = fin del periodo). Igual que seed_demo_24.f_avance.
CREATE OR REPLACE FUNCTION pg_temp.f_avance_tr(p_contrato INTEGER, p_clave TEXT, p_periodo INTEGER, p_cant NUMERIC) RETURNS VOID AS $$
DECLARE v_cc INTEGER; v_pid INTEGER; v_super INTEGER;
BEGIN
  SELECT id INTO v_cc FROM contrato_conceptos WHERE contrato_id=p_contrato AND clave=p_clave;
  SELECT id INTO v_pid FROM contrato_periodos WHERE contrato_id=p_contrato AND numero=p_periodo;
  SELECT superintendente_id INTO v_super FROM contratos WHERE id=p_contrato;
  INSERT INTO concepto_avance (contrato_concepto_id, contrato_periodo_id, cantidad, fecha, registrado_por)
    VALUES (v_cc, v_pid, p_cant, (SELECT fin FROM contrato_periodos WHERE id=v_pid), v_super);
END $$ LANGUAGE plpgsql;

-- f_estim_tr: estimación de un concepto/periodo (cuadre al centavo, SIN retención por atraso). enviada_en explícito
-- (p_enviada): permite sembrar una estimación "presentada hace N días" para el semáforo del plazo de revisión (C6).
CREATE OR REPLACE FUNCTION pg_temp.f_estim_tr(p_contrato INTEGER, p_numero INTEGER, p_clave TEXT, p_periodo INTEGER, p_estado TEXT, p_enviada TIMESTAMPTZ) RETURNS INTEGER AS $$
DECLARE
  v_cc INTEGER; v_cant NUMERIC; v_pu NUMERIC; v_ini DATE; v_fin DATE; v_super INTEGER; v_resid INTEGER; v_superv INTEGER; v_fin_u INTEGER;
  v_sub NUMERIC; v_amort NUMERIC; v_ret NUMERIC; v_neto NUMERIC; v_env TIMESTAMPTZ; v_integ TIMESTAMPTZ; v_id INTEGER;
BEGIN
  SELECT id, cantidad, pu INTO v_cc, v_cant, v_pu FROM contrato_conceptos WHERE contrato_id=p_contrato AND clave=p_clave;
  SELECT inicio, fin INTO v_ini, v_fin FROM contrato_periodos WHERE contrato_id=p_contrato AND numero=p_periodo;
  SELECT superintendente_id, residente_id, supervision_id INTO v_super, v_resid, v_superv FROM contratos WHERE id=p_contrato;
  SELECT id INTO v_fin_u FROM usuarios WHERE email='finanzas@sigecop.test';
  v_sub  := ROUND(v_cant*v_pu,2);
  v_amort:= ROUND(v_sub*0.30,2);
  v_ret  := ROUND(v_sub*0.005,2);
  v_neto := v_sub - v_amort - v_ret;
  v_env  := CASE WHEN p_estado IN ('enviada','autorizada','rechazada','pagada') THEN p_enviada ELSE NULL END;
  v_integ:= CASE WHEN v_env IS NOT NULL THEN v_env - INTERVAL '1 day' ELSE TIMESTAMPTZ '2026-06-02 10:00:00-06' END;

  INSERT INTO estimaciones (contrato_id,numero,periodo_inicio,periodo_fin,estado,anticipo_pct_snapshot,
                            subtotal,amortizacion,retencion,deductivas,neto,integrada_por,integrada_en,enviada_en,enviada_por)
  VALUES (p_contrato,p_numero,v_ini,v_fin,p_estado,30.00,v_sub,v_amort,v_ret,0.00,v_neto,
          v_super, v_integ, v_env, CASE WHEN v_env IS NULL THEN NULL ELSE v_super END)
  RETURNING id INTO v_id;
  INSERT INTO estimacion_generadores (estimacion_id,contrato_concepto_id,cantidad_periodo,cantidad_anterior_acum,pu_snapshot)
    VALUES (v_id,v_cc,v_cant,0.0000,v_pu);
  IF p_estado='autorizada' THEN
    INSERT INTO estimacion_observaciones (estimacion_id,seccion,tipo,severidad,descripcion,estado,turnado_a,autor_id)
      VALUES (v_id,'caratula','aclaracion','menor','Revisada por supervisión; turnada a residencia y autorizada.','solventada','residencia',v_superv);
  END IF;
  RETURN v_id;
END $$ LANGUAGE plpgsql;

-- f_curva_historica (C7): contrato PROPIO de $1,200,000 con concepto adicional, DOS versiones de programa
-- (v1 original $1,000,000 congelada + v2 vigente $1,200,000 por convenio de monto autorizado) y avances
-- repartidos por la bisagra (fecha del convenio = 2026-04-15). Enciende la "curva por etapas" (histórico + vigente).
CREATE OR REPLACE FUNCTION pg_temp.f_curva_historica(p_folio TEXT) RETURNS INTEGER AS $$
DECLARE
  v_resid INTEGER; v_super INTEGER; v_superv INTEGER; v_dep INTEGER; v_nom_super TEXT; v_nom_dep TEXT;
  v_id INTEGER; c1 INTEGER; c2 INTEGER; c3 INTEGER; p1 INTEGER; p2 INTEGER; p3 INTEGER;
  v_conv INTEGER; v_v1 INTEGER; v_v2 INTEGER;
BEGIN
  SELECT id, nombre INTO v_super, v_nom_super FROM usuarios WHERE email='contratista@sigecop.test';
  SELECT id INTO v_resid  FROM usuarios WHERE email='residente@sigecop.test';
  SELECT id INTO v_superv FROM usuarios WHERE email='supervision@sigecop.test';
  SELECT id, nombre INTO v_dep, v_nom_dep FROM usuarios WHERE email='dependencia@sigecop.test';

  -- Contrato (monto VIGENTE = 1,200,000; CONC-03 es adicional del convenio).
  INSERT INTO contratos (folio, tipo, objeto, ubicacion, contratista, dependencia, monto, plazo_dias,
                         fecha_inicio, fecha_termino, created_by, datos_juridicos, anticipo_pct,
                         residente_id, superintendente_id, supervision_id, dependencia_id,
                         ciclo_estimacion, pena_convencional_pct)
  VALUES (p_folio, 'Obra pública sobre la base de precios unitarios',
          'PRUEBA TR · Curva con histórico congelado (convenio de monto)',
          'Ciudad Universitaria, Chilpancingo, Guerrero',
          v_nom_super, v_nom_dep, 1200000.00, 180, DATE '2026-03-01', DATE '2026-08-27', v_resid,
          '{"licitacion":"LO-PRUEBA-TR-CURVA-2026","fecha_fallo":"2026-02-15","ramo":"Obra educativa"}'::jsonb,
          30.00, v_resid, v_super, v_superv, v_dep, 'mensual', 0.0010)
  RETURNING id INTO v_id;

  INSERT INTO contrato_conceptos (contrato_id, clave, orden, concepto, unidad, cantidad, pu, es_adicional)
    VALUES (v_id,'CONC-01',1,'Terracerías y movimiento de tierras','m3',1000.000,600.00,false) RETURNING id INTO c1;
  INSERT INTO contrato_conceptos (contrato_id, clave, orden, concepto, unidad, cantidad, pu, es_adicional)
    VALUES (v_id,'CONC-02',2,'Cimentación','m3',50.000,8000.00,false) RETURNING id INTO c2;
  INSERT INTO contrato_conceptos (contrato_id, clave, orden, concepto, unidad, cantidad, pu, es_adicional)
    VALUES (v_id,'CONC-03',3,'Obra adicional (convenio de monto)','lote',100.000,2000.00,true) RETURNING id INTO c3;

  INSERT INTO contrato_periodos (contrato_id,numero,inicio,fin) VALUES (v_id,1,DATE '2026-03-01',DATE '2026-03-31') RETURNING id INTO p1;
  INSERT INTO contrato_periodos (contrato_id,numero,inicio,fin) VALUES (v_id,2,DATE '2026-04-01',DATE '2026-04-30') RETURNING id INTO p2;
  INSERT INTO contrato_periodos (contrato_id,numero,inicio,fin) VALUES (v_id,3,DATE '2026-05-01',DATE '2026-05-31') RETURNING id INTO p3;

  -- Programa VIVO (cuadra a 1,200,000): CONC-01 400/350/250 · CONC-02 20/20/10 · CONC-03 -/40/60.
  INSERT INTO programa_obra (contrato_concepto_id, contrato_periodo_id, cantidad) VALUES
    (c1,p1,400.000),(c1,p2,350.000),(c1,p3,250.000),
    (c2,p1,20.000),(c2,p2,20.000),(c2,p3,10.000),
    (c3,p2,40.000),(c3,p3,60.000);
  INSERT INTO plan_amortizacion (contrato_id, periodo_numero, monto) VALUES
    (v_id,1,120000.00),(v_id,2,120000.00),(v_id,3,120000.00);   -- anticipo 30% de 1,200,000 = 360,000
  INSERT INTO contrato_garantias (contrato_id, tipo, afianzadora, poliza, monto, vigencia) VALUES
    (v_id,'cumplimiento','Afianzadora Aserta, S.A.','FZA-CUMP-'||p_folio,120000.00, DATE '2027-08-31'),
    (v_id,'anticipo',    'Afianzadora Aserta, S.A.','FZA-ANT-'||p_folio, 360000.00, DATE '2027-08-31'),
    (v_id,'vicios_ocultos','Afianzadora Aserta, S.A.','FZA-VIC-'||p_folio,120000.00,DATE '2028-08-31');
  INSERT INTO contrato_roster (contrato_id, rol, usuario_id, vigencia_desde, motivo, registrado_por) VALUES
    (v_id,'residente',      v_resid,  DATE '2026-03-01','Asignación inicial (alta del contrato)', v_resid),
    (v_id,'superintendente',v_super,  DATE '2026-03-01','Asignación inicial (alta del contrato)', v_resid),
    (v_id,'supervision',    v_superv, DATE '2026-03-01','Asignación inicial (alta del contrato)', v_resid);

  PERFORM pg_temp.f_bitacora_tr(v_id, 2);

  -- Convenio de MONTO AUTORIZADO que respalda a v2 (realismo; la curva no exige su estado, pero producción siempre lo crea).
  INSERT INTO convenios_modificatorios (contrato_id, numero, folio, tipo, fundamento, motivo, fecha,
                                        monto_anterior, monto_nuevo, plazo_anterior_dias, plazo_nuevo_dias,
                                        delta_monto_pct, delta_plazo_pct, requiere_revision_sfp, requiere_ajuste_costos,
                                        estado, autorizado_por, autorizado_en, created_at, nota_id)
  VALUES (v_id, 1, 'CM-001', 'monto', 'art59',
          '[Oficio de soporte: OF-DEMO-CM-001] Ampliación por concepto adicional (CONC-03).', DATE '2026-04-15',
          1000000.00, 1200000.00, 180, 180, 20.00, NULL, false, false,
          'autorizado', v_dep, TIMESTAMPTZ '2026-04-15 12:00:00-06', TIMESTAMPTZ '2026-04-15 12:00:00-06', NULL)
  RETURNING id INTO v_conv;

  -- v1 ORIGINAL congelada (vigente=false por el índice parcial "una vigente por contrato"; supersedido el día del convenio).
  INSERT INTO programa_version (contrato_id, numero, convenio_id, monto, plazo_dias, vigente, created_at, supersedido_en)
    VALUES (v_id, 1, NULL, 1000000.00, 180, false, TIMESTAMPTZ '2026-04-15 12:00:00-06', TIMESTAMPTZ '2026-04-15 12:00:00-06')
    RETURNING id INTO v_v1;
  INSERT INTO programa_version_concepto (programa_version_id, clave, concepto, unidad, cantidad, pu, orden, es_adicional) VALUES
    (v_v1,'CONC-01','Terracerías y movimiento de tierras','m3',1000.000,600.0000,1,false),
    (v_v1,'CONC-02','Cimentación','m3',50.000,8000.0000,2,false);
  INSERT INTO programa_version_celda (programa_version_id, concepto_clave, periodo_numero, periodo_inicio, periodo_fin, cantidad) VALUES
    (v_v1,'CONC-01',1,DATE '2026-03-01',DATE '2026-03-31',400.000),
    (v_v1,'CONC-01',2,DATE '2026-04-01',DATE '2026-04-30',350.000),
    (v_v1,'CONC-01',3,DATE '2026-05-01',DATE '2026-05-31',250.000),
    (v_v1,'CONC-02',1,DATE '2026-03-01',DATE '2026-03-31',20.000),
    (v_v1,'CONC-02',2,DATE '2026-04-01',DATE '2026-04-30',20.000),
    (v_v1,'CONC-02',3,DATE '2026-05-01',DATE '2026-05-31',10.000);

  -- v2 VIGENTE (incluye CONC-03 adicional).
  INSERT INTO programa_version (contrato_id, numero, convenio_id, monto, plazo_dias, vigente, created_at, supersedido_en)
    VALUES (v_id, 2, v_conv, 1200000.00, 180, true, TIMESTAMPTZ '2026-04-15 12:00:00-06', NULL)
    RETURNING id INTO v_v2;
  INSERT INTO programa_version_concepto (programa_version_id, clave, concepto, unidad, cantidad, pu, orden, es_adicional) VALUES
    (v_v2,'CONC-01','Terracerías y movimiento de tierras','m3',1000.000,600.0000,1,false),
    (v_v2,'CONC-02','Cimentación','m3',50.000,8000.0000,2,false),
    (v_v2,'CONC-03','Obra adicional (convenio de monto)','lote',100.000,2000.0000,3,true);
  INSERT INTO programa_version_celda (programa_version_id, concepto_clave, periodo_numero, periodo_inicio, periodo_fin, cantidad) VALUES
    (v_v2,'CONC-01',1,DATE '2026-03-01',DATE '2026-03-31',400.000),
    (v_v2,'CONC-01',2,DATE '2026-04-01',DATE '2026-04-30',350.000),
    (v_v2,'CONC-01',3,DATE '2026-05-01',DATE '2026-05-31',250.000),
    (v_v2,'CONC-02',1,DATE '2026-03-01',DATE '2026-03-31',20.000),
    (v_v2,'CONC-02',2,DATE '2026-04-01',DATE '2026-04-30',20.000),
    (v_v2,'CONC-02',3,DATE '2026-05-01',DATE '2026-05-31',10.000),
    (v_v2,'CONC-03',2,DATE '2026-04-01',DATE '2026-04-30',40.000),
    (v_v2,'CONC-03',3,DATE '2026-05-01',DATE '2026-05-31',60.000);

  -- Avances repartidos por la bisagra (fecha del convenio 2026-04-15): P1 (03-31) cae en v1; P2 (04-30) cae en v2.
  PERFORM pg_temp.f_avance_tr(v_id,'CONC-01',1,400.000);   -- histórico (v1)
  PERFORM pg_temp.f_avance_tr(v_id,'CONC-02',1,20.000);    -- histórico (v1)
  PERFORM pg_temp.f_avance_tr(v_id,'CONC-01',2,350.000);   -- vigente   (v2)
  PERFORM pg_temp.f_avance_tr(v_id,'CONC-03',2,40.000);    -- vigente   (v2, concepto adicional)
  RETURN v_id;
END $$ LANGUAGE plpgsql;

-- =====================================================================
-- LOS 7 CONTRATOS DE TIEMPO RECORRIDO
-- =====================================================================
DO $$
DECLARE
  v_id INTEGER; v_bita INTEGER; v_super INTEGER; v_resid INTEGER; v_ent INTEGER; v_sal_row INTEGER;
BEGIN
  -- ---------------------------------------------------------------
  -- C1 · PRUEBA-TR-NOTA-VENCIDA — aceptación TÁCITA (art. 123 fr. III RLOPSRM).
  -- Apertura con plazo de firma = 2 días; una nota tipo 'aviso' (emisor superintendente) fechada hace 5 días,
  -- sin firma de contraparte → NOW() > fecha + 2 días → la consulta la deriva "Aceptada (tácita)".
  -- ---------------------------------------------------------------
  v_id   := pg_temp.f_base_tr('PRUEBA-TR-NOTA-VENCIDA','PRUEBA TR · Aceptación tácita de nota (plazo de firma vencido)');
  v_bita := pg_temp.f_bitacora_tr(v_id, 2);
  SELECT superintendente_id INTO v_super FROM contratos WHERE id=v_id;
  INSERT INTO bitacora_notas (bitacora_id, tipo, numero, contenido, emisor_id, estado, fecha)
    VALUES (v_bita,'aviso',2,'Aviso de avance de obra para conocimiento de la residencia (demo de aceptación tácita).',
            v_super,'emitida', NOW() - INTERVAL '5 days');

  -- ---------------------------------------------------------------
  -- C2 · PRUEBA-TR-FIANZA-VENCIDA — fianza con vigencia caducada (art. 98 fr. I inc. c RLOPSRM).
  -- Base + se vence la fianza de CUMPLIMIENTO (vigencia 2026-01-15). La captura por el alta/HU-02 rechaza
  -- una vigencia vencida (por eso solo se siembra por SQL).
  -- ---------------------------------------------------------------
  v_id := pg_temp.f_base_tr('PRUEBA-TR-FIANZA-VENCIDA','PRUEBA TR · Fianza de cumplimiento con vigencia caducada');
  UPDATE contrato_garantias SET vigencia = DATE '2026-01-15', poliza = 'FZA-CUMP-VENCIDA-'||v_id
    WHERE contrato_id = v_id AND tipo = 'cumplimiento';

  -- ---------------------------------------------------------------
  -- C3 · PRUEBA-TR-CONVENIO-PLAZO — contrato LISTO para registrar→autorizar un convenio de plazo (art. 59 LOPSRM).
  -- Se deja la base + bitácora abierta (SIN convenio) para demostrar el flujo registrar→autorizar EN VIVO.
  -- ---------------------------------------------------------------
  v_id := pg_temp.f_base_tr('PRUEBA-TR-CONVENIO-PLAZO','PRUEBA TR · Convenio de plazo por registrar/autorizar');
  PERFORM pg_temp.f_bitacora_tr(v_id, 2);

  -- ---------------------------------------------------------------
  -- C4 · PRUEBA-TR-AMORT-MULTI — amortización del anticipo a lo largo de 3 estimaciones (art. 143 fr. I RLOPSRM).
  -- 3 estimaciones AUTORIZADAS (CONC-01/02/03 en P1/P2/P3). Amortización acumulada 90k→180k→300k;
  -- saldo del anticipo 300k → 210k → 120k → 0.
  -- ---------------------------------------------------------------
  v_id := pg_temp.f_base_tr('PRUEBA-TR-AMORT-MULTI','PRUEBA TR · Amortización del anticipo multi-periodo');
  PERFORM pg_temp.f_bitacora_tr(v_id, 2);
  PERFORM pg_temp.f_avance_tr(v_id,'CONC-01',1,1000.000);
  PERFORM pg_temp.f_avance_tr(v_id,'CONC-02',2,200.000);
  PERFORM pg_temp.f_avance_tr(v_id,'CONC-03',3,1.000);
  PERFORM pg_temp.f_estim_tr(v_id,1,'CONC-01',1,'autorizada', TIMESTAMPTZ '2026-06-03 10:00:00-06');  -- amort 90,000 · acum 90,000
  PERFORM pg_temp.f_estim_tr(v_id,2,'CONC-02',2,'autorizada', TIMESTAMPTZ '2026-06-04 10:00:00-06');  -- amort 90,000 · acum 180,000
  PERFORM pg_temp.f_estim_tr(v_id,3,'CONC-03',3,'autorizada', TIMESTAMPTZ '2026-06-05 10:00:00-06');  -- amort 120,000 · acum 300,000

  -- ---------------------------------------------------------------
  -- C5 · PRUEBA-TR-FIRMA-VIGENCIA — regla temporal de firmas del roster (art. 125 RLOPSRM).
  -- Sustitución del residente: SALIENTE (residente@) hasta hoy-7; ENTRANTE (residente2.demo@) desde hoy-7.
  -- Apertura con plazo de firma generoso (30) para que las notas viejas NO sean tácitas y la regla de
  -- vigencia sí muerda. Nota #2 (hoy-12): el entrante NO puede firmarla (anterior a su alta) → 409.
  -- Nota #3 (hoy-3): el entrante SÍ puede firmarla (dentro de su vigencia) → 201 (contraprueba 🟢).
  -- ---------------------------------------------------------------
  v_id := pg_temp.f_base_tr('PRUEBA-TR-FIRMA-VIGENCIA','PRUEBA TR · Firma fuera del periodo de vigencia (sustitución)');
  v_bita := pg_temp.f_bitacora_tr(v_id, 30);
  SELECT id INTO v_ent FROM usuarios WHERE email='residente2.demo@sigecop.test';
  IF v_ent IS NULL THEN RAISE EXCEPTION 'Falta la cuenta residente2.demo@sigecop.test (entrante de C5).'; END IF;
  SELECT superintendente_id, residente_id INTO v_super, v_resid FROM contratos WHERE id=v_id;
  -- Reemplazar el roster del residente por SALIENTE + ENTRANTE (histórico de sustitución).
  DELETE FROM contrato_roster WHERE contrato_id=v_id AND rol='residente';
  INSERT INTO contrato_roster (contrato_id, rol, usuario_id, vigencia_desde, vigencia_hasta, motivo, registrado_por)
    VALUES (v_id,'residente', v_resid, (NOW()-INTERVAL '30 days')::date, (NOW()-INTERVAL '7 days')::date,
            'Residente saliente (sustituido por art. 125 RLOPSRM).', v_resid)
    RETURNING id INTO v_sal_row;
  INSERT INTO contrato_roster (contrato_id, rol, usuario_id, vigencia_desde, vigencia_hasta, sustituye_a, motivo, registrado_por)
    VALUES (v_id,'residente', v_ent, (NOW()-INTERVAL '7 days')::date, NULL, v_sal_row,
            'Residente entrante (sustitución art. 125 RLOPSRM).', v_resid);
  UPDATE contratos SET residente_id = v_ent WHERE id = v_id;   -- caché de puntero al vigente
  -- Nota #2 vieja (hoy-12): fuera de la vigencia del entrante → 409 al intentar firmar.
  INSERT INTO bitacora_notas (bitacora_id, tipo, numero, contenido, emisor_id, estado, fecha)
    VALUES (v_bita,'aviso',2,'Aviso emitido ANTES del alta del residente entrante (no debe poder firmarlo).',
            v_super,'emitida', NOW() - INTERVAL '12 days');
  -- Nota #3 reciente (hoy-3): dentro de la vigencia del entrante → 201 (contraprueba 🟢).
  INSERT INTO bitacora_notas (bitacora_id, tipo, numero, contenido, emisor_id, estado, fecha)
    VALUES (v_bita,'aviso',3,'Aviso emitido DESPUÉS del alta del residente entrante (sí puede firmarlo).',
            v_super,'emitida', NOW() - INTERVAL '3 days');

  -- ---------------------------------------------------------------
  -- C6 · PRUEBA-TR-REVISION-VENCIDA — plazo de revisión de estimación vencido (art. 54 LOPSRM, 15 días). *** POR REVISAR ***
  -- Estimación PRESENTADA (enviada) hace 16 días, sin autorizar → el semáforo del plazo de revisión muestra "Vencido".
  -- OJO: la "afirmativa ficta" NO está rotulada en la UI ni el estado cambia (sigue "Presentada"). Confirmar en pantalla.
  -- ---------------------------------------------------------------
  v_id := pg_temp.f_base_tr('PRUEBA-TR-REVISION-VENCIDA','PRUEBA TR · Plazo de revisión de estimación vencido (art. 54)');
  PERFORM pg_temp.f_bitacora_tr(v_id, 2);
  PERFORM pg_temp.f_avance_tr(v_id,'CONC-01',1,1000.000);
  PERFORM pg_temp.f_estim_tr(v_id,1,'CONC-01',1,'enviada', NOW() - INTERVAL '16 days');  -- presentada hace 16 días → semáforo "Vencido"

  -- ---------------------------------------------------------------
  -- C7 · PRUEBA-TR-CURVA-HISTORICA — curva con histórico congelado (2 versiones de programa por convenio de monto).
  -- ---------------------------------------------------------------
  PERFORM pg_temp.f_curva_historica('PRUEBA-TR-CURVA-HISTORICA');

  RAISE NOTICE 'SEED TR: contratos PRUEBA-TR-* sembrados (C1..C7).';
END $$;

-- =====================================================================
-- (V) VERIFICACIÓN
-- =====================================================================
SELECT c.folio, c.monto,
       (SELECT count(*) FROM bitacora_aperturas b WHERE b.contrato_id=c.id)        AS bita,
       (SELECT count(*) FROM estimaciones e WHERE e.contrato_id=c.id)              AS est,
       COALESCE((SELECT string_agg(e.estado,',' ORDER BY e.numero) FROM estimaciones e WHERE e.contrato_id=c.id),'-') AS estados,
       (SELECT count(*) FROM programa_version pv WHERE pv.contrato_id=c.id)        AS versiones,
       (SELECT count(*) FROM contrato_roster cr WHERE cr.contrato_id=c.id AND cr.rol='residente') AS res_roster,
       (SELECT count(*) FROM convenios_modificatorios cm WHERE cm.contrato_id=c.id) AS convenios
  FROM contratos c WHERE c.folio LIKE 'PRUEBA-TR-%' ORDER BY c.folio;

-- Detalle C1/C5 (notas) y C2 (fianza vencida) y C6 (estimación presentada hace N días).
SELECT c.folio, n.numero, n.tipo, n.fecha::date AS nota_fecha,
       (NOW() > n.fecha + make_interval(days => ba.plazo_firma_dias)) AS plazo_vencido
  FROM bitacora_notas n
  JOIN bitacora_aperturas ba ON ba.id = n.bitacora_id
  JOIN contratos c ON c.id = ba.contrato_id
 WHERE c.folio IN ('PRUEBA-TR-NOTA-VENCIDA','PRUEBA-TR-FIRMA-VIGENCIA') AND n.tipo <> 'apertura'
 ORDER BY c.folio, n.numero;

SELECT c.folio, g.tipo, g.vigencia, (g.vigencia < CURRENT_DATE) AS vencida
  FROM contrato_garantias g JOIN contratos c ON c.id=g.contrato_id
 WHERE c.folio='PRUEBA-TR-FIANZA-VENCIDA' ORDER BY g.tipo;

SELECT c.folio, e.numero, e.estado, e.enviada_en::date AS presentada,
       (CURRENT_DATE - e.enviada_en::date) AS dias_desde_envio
  FROM estimaciones e JOIN contratos c ON c.id=e.contrato_id
 WHERE c.folio='PRUEBA-TR-REVISION-VENCIDA' ORDER BY e.numero;
