-- =====================================================================
-- SEED 24 CONTRATOS DE PRUEBA — uno por HU (PRUEBA-HU-01 … PRUEBA-HU-24).
-- "Experimento controlado": los 24 comparten la MISMA base IDÉNTICA (mismo monto, mismos 3 conceptos,
-- mismo programa, mismas empresas/cuentas, mismas fechas). LO ÚNICO que varía es el ESTADO del ciclo que
-- demuestra cada HU (bitácora, avance, estimación, pago, convenio, finiquito). Así el profe NO puede decir
-- "este salió distinto por los datos": la única diferencia es la etapa.
--
-- Requiere: schema.sql aplicado (cuentas base) + reseed_cuentas.sql (empresas realistas 1:N).
-- Uso:  psql … -f seed_demo_24.sql     (o `npm run seed:demo24` si se agrega el script).
-- IDEMPOTENTE: borra los folios PRUEBA-HU-% (hijos en orden de FK NO ACTION) y los recrea. Re-ejecutable.
--
-- BASE IDÉNTICA (cuadre EXACTO al centavo):
--   Monto = 1,000,000.00 = CONC-01 (300,000) + CONC-02 (300,000) + CONC-03 (400,000). Anticipo 30% (300,000).
--   3 periodos mensuales VENCIDOS (mar/abr/may 2026): C1→P1, C2→P2, C3→P3 (100% cada uno).
--   Plan de amortización proporcional (art. 143 fr. I): 90,000 / 90,000 / 120,000 (Σ 300,000).
--   Estimación por concepto/periodo: subtotal − ROUND(subtotal*0.30,2) − ROUND(subtotal*0.005,2) = neto.
--     C1/P1 y C2/P2 (300,000) → neto 208,500.00 · C3/P3 (400,000) → neto 278,000.00
--   Pena convencional 0.10% (parametrizable; art. 46 Bis LOPSRM + 86-88 RLOPSRM + tope art. 90).
-- =====================================================================

-- (0) LIMPIEZA idempotente de los folios PRUEBA-HU-% (hijos en orden de dependencia; FKs NO ACTION).
DO $$
DECLARE ids INTEGER[];
BEGIN
  SELECT array_agg(id) INTO ids FROM contratos WHERE folio LIKE 'PRUEBA-HU-%';
  IF ids IS NOT NULL THEN
    DELETE FROM pagos                  WHERE contrato_id = ANY(ids);
    DELETE FROM estimaciones           WHERE contrato_id = ANY(ids);   -- cascada: generadores, notas, observaciones
    DELETE FROM concepto_avance        WHERE contrato_concepto_id IN (SELECT id FROM contrato_conceptos WHERE contrato_id = ANY(ids));
    DELETE FROM contrato_roster        WHERE contrato_id = ANY(ids);
    DELETE FROM convenios_modificatorios WHERE contrato_id = ANY(ids);
    DELETE FROM minutas                WHERE contrato_id = ANY(ids);
    DELETE FROM visitas                WHERE contrato_id = ANY(ids);
    DELETE FROM contratos              WHERE id = ANY(ids);            -- cascada: el resto (garantías, etc.)
  END IF;
END $$;

-- =====================================================================
-- HELPERS (pg_temp = sesión local; se descartan al cerrar la conexión).
-- =====================================================================

-- f_base: crea la BASE IDÉNTICA para un folio y devuelve el id del contrato.
CREATE OR REPLACE FUNCTION pg_temp.f_base(p_folio TEXT, p_objeto TEXT) RETURNS INTEGER AS $$
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
          '{"licitacion":"LO-PRUEBA-2026","fecha_fallo":"2026-02-15","ramo":"Obra educativa"}'::jsonb,
          30.00, v_resid, v_super, v_superv, v_dep, 'mensual', 0.0010)
  RETURNING id INTO v_id;

  -- 3 conceptos IDÉNTICOS (Σ = 1,000,000.00).
  INSERT INTO contrato_conceptos (contrato_id, clave, orden, concepto, unidad, cantidad, pu)
    VALUES (v_id,'CONC-01',1,'Terracerías y movimiento de tierras','m3',1000.000,300.00) RETURNING id INTO c1;
  INSERT INTO contrato_conceptos (contrato_id, clave, orden, concepto, unidad, cantidad, pu)
    VALUES (v_id,'CONC-02',2,'Cimentación','m3',200.000,1500.00) RETURNING id INTO c2;
  INSERT INTO contrato_conceptos (contrato_id, clave, orden, concepto, unidad, cantidad, pu)
    VALUES (v_id,'CONC-03',3,'Estructura y obra negra','lote',1.000,400000.00) RETURNING id INTO c3;

  -- 3 periodos mensuales VENCIDOS (mar/abr/may 2026).
  INSERT INTO contrato_periodos (contrato_id,numero,inicio,fin) VALUES (v_id,1,DATE '2026-03-01',DATE '2026-03-31') RETURNING id INTO p1;
  INSERT INTO contrato_periodos (contrato_id,numero,inicio,fin) VALUES (v_id,2,DATE '2026-04-01',DATE '2026-04-30') RETURNING id INTO p2;
  INSERT INTO contrato_periodos (contrato_id,numero,inicio,fin) VALUES (v_id,3,DATE '2026-05-01',DATE '2026-05-31') RETURNING id INTO p3;

  -- Programa: cada concepto 100% en su periodo.
  INSERT INTO programa_obra (contrato_concepto_id, contrato_periodo_id, cantidad) VALUES
    (c1,p1,1000.000),(c2,p2,200.000),(c3,p3,1.000);

  -- Plan de amortización proporcional al programa (Σ = 300,000.00).
  INSERT INTO plan_amortizacion (contrato_id, periodo_numero, monto) VALUES
    (v_id,1,90000.00),(v_id,2,90000.00),(v_id,3,120000.00);

  -- Garantías (≤ monto; vigencias futuras).
  INSERT INTO contrato_garantias (contrato_id, tipo, afianzadora, poliza, monto, vigencia) VALUES
    (v_id,'cumplimiento','Afianzadora Aserta, S.A.','FZA-CUMP-'||p_folio,100000.00, DATE '2027-05-31'),
    (v_id,'anticipo',    'Afianzadora Aserta, S.A.','FZA-ANT-'||p_folio, 300000.00, DATE '2027-05-31'),
    (v_id,'vicios_ocultos','Afianzadora Aserta, S.A.','FZA-VIC-'||p_folio,100000.00,DATE '2028-05-31');

  -- Roster (art. 125): residente / superintendente / supervisión (la dependencia no firma).
  INSERT INTO contrato_roster (contrato_id, rol, usuario_id, vigencia_desde, motivo, registrado_por) VALUES
    (v_id,'residente',      v_resid,  DATE '2026-03-01','Asignación inicial (alta del contrato)', v_resid),
    (v_id,'superintendente',v_super,  DATE '2026-03-01','Asignación inicial (alta del contrato)', v_resid),
    (v_id,'supervision',    v_superv, DATE '2026-03-01','Asignación inicial (alta del contrato)', v_resid);

  RETURN v_id;
END $$ LANGUAGE plpgsql;

-- f_bitacora: abre la bitácora FIRMADA por las 3 partes (nota #1 apertura firmada). Devuelve el id.
CREATE OR REPLACE FUNCTION pg_temp.f_bitacora(p_contrato INTEGER) RETURNS INTEGER AS $$
DECLARE
  v_resid INTEGER; v_super INTEGER; v_superv INTEGER; v_nr TEXT; v_ns TEXT; v_nsv TEXT; v_bita INTEGER; v_nota INTEGER;
BEGIN
  SELECT residente_id, superintendente_id, supervision_id INTO v_resid, v_super, v_superv FROM contratos WHERE id=p_contrato;
  SELECT nombre INTO v_nr  FROM usuarios WHERE id=v_resid;
  SELECT nombre INTO v_ns  FROM usuarios WHERE id=v_super;
  SELECT nombre INTO v_nsv FROM usuarios WHERE id=v_superv;
  INSERT INTO bitacora_aperturas (contrato_id, aperturada_por, fecha_apertura, apertura_en, descripcion_trabajos)
    VALUES (p_contrato, v_resid, DATE '2026-03-01', TIMESTAMPTZ '2026-03-01 09:00:00-06', 'Obra de prueba (demo controlada).')
    RETURNING id INTO v_bita;
  INSERT INTO bitacora_firmantes (bitacora_id, parte, firmante, usuario_id, rol_en_firma, aplica, firmado, firmado_en) VALUES
    (v_bita,1,v_nr, v_resid, 'residente',      true,true,TIMESTAMPTZ '2026-03-01 09:30:00-06'),
    (v_bita,2,v_ns, v_super, 'superintendente',true,true,TIMESTAMPTZ '2026-03-01 09:30:00-06'),
    (v_bita,3,v_nsv,v_superv,'supervision',    true,true,TIMESTAMPTZ '2026-03-01 09:30:00-06');
  INSERT INTO bitacora_notas (bitacora_id, tipo, numero, contenido, emisor_id, estado, fecha)
    VALUES (v_bita,'apertura',1,'Apertura de bitácora electrónica de la obra (demo).', v_resid,'emitida',TIMESTAMPTZ '2026-03-01 09:30:00-06')
    RETURNING id INTO v_nota;
  INSERT INTO bitacora_nota_firmas (nota_id, usuario_id, rol_en_firma) VALUES
    (v_nota,v_resid,'residente'),(v_nota,v_super,'superintendente'),(v_nota,v_superv,'supervision');
  RETURN v_bita;
END $$ LANGUAGE plpgsql;

-- f_avance: registra avance ejecutado de un concepto en un periodo.
CREATE OR REPLACE FUNCTION pg_temp.f_avance(p_contrato INTEGER, p_clave TEXT, p_periodo INTEGER, p_cant NUMERIC) RETURNS VOID AS $$
DECLARE v_cc INTEGER; v_pid INTEGER; v_super INTEGER;
BEGIN
  SELECT id INTO v_cc FROM contrato_conceptos WHERE contrato_id=p_contrato AND clave=p_clave;
  SELECT id INTO v_pid FROM contrato_periodos WHERE contrato_id=p_contrato AND numero=p_periodo;
  SELECT superintendente_id INTO v_super FROM contratos WHERE id=p_contrato;
  INSERT INTO concepto_avance (contrato_concepto_id, contrato_periodo_id, cantidad, fecha, registrado_por)
    VALUES (v_cc, v_pid, p_cant, (SELECT fin FROM contrato_periodos WHERE id=v_pid), v_super);
END $$ LANGUAGE plpgsql;

-- f_estim: crea una estimación de un concepto/periodo en el estado dado, con cuadre al centavo. Devuelve id.
--   estados: integrada | enviada | autorizada | rechazada | pagada. (pagada → pago; rechazada → observación.)
CREATE OR REPLACE FUNCTION pg_temp.f_estim(p_contrato INTEGER, p_numero INTEGER, p_clave TEXT, p_periodo INTEGER, p_estado TEXT) RETURNS INTEGER AS $$
DECLARE
  v_cc INTEGER; v_cant NUMERIC; v_pu NUMERIC; v_ini DATE; v_fin DATE; v_super INTEGER; v_resid INTEGER; v_superv INTEGER; v_fin_u INTEGER;
  v_sub NUMERIC; v_amort NUMERIC; v_ret NUMERIC; v_neto NUMERIC; v_env TIMESTAMPTZ; v_id INTEGER;
BEGIN
  SELECT id, cantidad, pu INTO v_cc, v_cant, v_pu FROM contrato_conceptos WHERE contrato_id=p_contrato AND clave=p_clave;
  SELECT inicio, fin INTO v_ini, v_fin FROM contrato_periodos WHERE contrato_id=p_contrato AND numero=p_periodo;
  SELECT superintendente_id, residente_id, supervision_id INTO v_super, v_resid, v_superv FROM contratos WHERE id=p_contrato;
  SELECT id INTO v_fin_u FROM usuarios WHERE email='finanzas@sigecop.test';
  v_sub  := ROUND(v_cant*v_pu,2);
  v_amort:= ROUND(v_sub*0.30,2);
  v_ret  := ROUND(v_sub*0.005,2);
  v_neto := v_sub - v_amort - v_ret;
  v_env  := CASE WHEN p_estado IN ('enviada','autorizada','rechazada','pagada') THEN TIMESTAMPTZ '2026-06-03 10:00:00-06' ELSE NULL END;

  INSERT INTO estimaciones (contrato_id,numero,periodo_inicio,periodo_fin,estado,anticipo_pct_snapshot,
                            subtotal,amortizacion,retencion,deductivas,neto,integrada_por,integrada_en,enviada_en,enviada_por)
  VALUES (p_contrato,p_numero,v_ini,v_fin,p_estado,30.00,v_sub,v_amort,v_ret,0.00,v_neto,
          v_super, TIMESTAMPTZ '2026-06-02 10:00:00-06', v_env, CASE WHEN v_env IS NULL THEN NULL ELSE v_super END)
  RETURNING id INTO v_id;
  INSERT INTO estimacion_generadores (estimacion_id,contrato_concepto_id,cantidad_periodo,cantidad_anterior_acum,pu_snapshot)
    VALUES (v_id,v_cc,v_cant,0.0000,v_pu);

  IF p_estado='pagada' THEN
    INSERT INTO pagos (contrato_id,estimacion_id,estimacion_ref,fecha_pago,importe,referencia,factura_cfdi,fecha_factura,registrado_por)
      VALUES (p_contrato,v_id,'EST-'||p_numero,DATE '2026-06-10',v_neto,'SPEI-'||p_numero,'CFDI-'||p_numero,DATE '2026-06-08',v_fin_u);
  ELSIF p_estado='rechazada' THEN
    INSERT INTO estimacion_observaciones (estimacion_id,seccion,tipo,severidad,descripcion,estado,turnado_a,autor_id)
      VALUES (v_id,'generadores','rechazo','mayor','Los números generadores no coinciden con lo ejecutado; se devuelve para corrección.','abierta','contratista',v_resid);
  ELSIF p_estado='autorizada' THEN
    INSERT INTO estimacion_observaciones (estimacion_id,seccion,tipo,severidad,descripcion,estado,turnado_a,autor_id)
      VALUES (v_id,'caratula','aclaracion','menor','Revisada por supervisión; turnada a residencia y autorizada.','solventada','residencia',v_superv);
  END IF;
  RETURN v_id;
END $$ LANGUAGE plpgsql;

-- =====================================================================
-- LOS 24 CONTRATOS (base idéntica; varía solo el ESTADO).
-- =====================================================================
DO $$
DECLARE v_id INTEGER; v_bita INTEGER; v_nota INTEGER; v_conv INTEGER; v_resid INTEGER; v_dep INTEGER; v_super INTEGER;
BEGIN
  -- HU-01 Alta: contrato recién dado de alta (base, sin bitácora ni estimaciones).
  PERFORM pg_temp.f_base('PRUEBA-HU-01','PRUEBA HU-01 · Alta de contrato (recién capturado)');

  -- HU-02 Fianzas: base + un ENDOSO en la fianza de cumplimiento (art. 91 RLOPSRM).
  v_id := pg_temp.f_base('PRUEBA-HU-02','PRUEBA HU-02 · Fianzas y garantías (con endoso)');
  SELECT residente_id INTO v_resid FROM contratos WHERE id=v_id;
  INSERT INTO garantia_endosos (garantia_id, motivo, nueva_vigencia, observaciones, registrado_por)
    SELECT g.id,'prorroga_vigencia',DATE '2028-05-31','Prórroga de la fianza (art. 91 RLOPSRM).',v_resid
      FROM contrato_garantias g WHERE g.contrato_id=v_id AND g.tipo='cumplimiento';

  -- HU-03 Convenios: base + bitácora + convenio de plazo registrado (nota res_convenios).
  v_id := pg_temp.f_base('PRUEBA-HU-03','PRUEBA HU-03 · Convenio modificatorio de plazo');
  v_bita := pg_temp.f_bitacora(v_id);
  SELECT residente_id, dependencia_id INTO v_resid, v_dep FROM contratos WHERE id=v_id;
  INSERT INTO bitacora_notas (bitacora_id, tipo, numero, contenido, emisor_id, estado, fecha, tag)
    VALUES (v_bita,'res_convenios',2,'Convenio modificatorio de plazo: se amplía de 90 a 120 días por causas no imputables al contratista (art. 59 LOPSRM).', v_resid,'emitida',TIMESTAMPTZ '2026-05-15 12:00:00-06','convenio')
    RETURNING id INTO v_nota;
  INSERT INTO convenios_modificatorios (contrato_id, numero, tipo, fundamento, motivo, fecha, plazo_anterior_dias, plazo_nuevo_dias, delta_plazo_pct, autorizado_por, nota_id)
    VALUES (v_id,1,'plazo','art59','Ampliación de plazo por lluvias atípicas.',DATE '2026-05-15',90,120,ROUND((120-90)::numeric/90*100,2),v_dep,v_nota);

  -- HU-04 Expediente: base + bitácora + 1 estimación pagada (algo que mostrar en el expediente).
  v_id := pg_temp.f_base('PRUEBA-HU-04','PRUEBA HU-04 · Expediente integral del contrato');
  PERFORM pg_temp.f_bitacora(v_id);
  PERFORM pg_temp.f_avance(v_id,'CONC-01',1,1000.000);
  PERFORM pg_temp.f_estim(v_id,1,'CONC-01',1,'pagada');

  -- HU-05 Curva de avance: base + avance AL CORRIENTE (3 conceptos al 100%).
  v_id := pg_temp.f_base('PRUEBA-HU-05','PRUEBA HU-05 · Programa y curva de avance (al corriente)');
  PERFORM pg_temp.f_avance(v_id,'CONC-01',1,1000.000);
  PERFORM pg_temp.f_avance(v_id,'CONC-02',2,200.000);
  PERFORM pg_temp.f_avance(v_id,'CONC-03',3,1.000);

  -- HU-06 Registrar trabajos: base + bitácora + avance parcial del periodo 1 (listo para registrar/corregir).
  v_id := pg_temp.f_base('PRUEBA-HU-06','PRUEBA HU-06 · Registro de trabajos por periodo');
  PERFORM pg_temp.f_bitacora(v_id);
  PERFORM pg_temp.f_avance(v_id,'CONC-01',1,600.000);

  -- HU-07 Alertas de atraso: base + bitácora + avance MUY BAJO (déficit) → atraso por concepto.
  v_id := pg_temp.f_base('PRUEBA-HU-07','PRUEBA HU-07 · Atraso por concepto (déficit)');
  PERFORM pg_temp.f_bitacora(v_id);
  PERFORM pg_temp.f_avance(v_id,'CONC-01',1,100.000);   -- programado 1000, ejecutado 100 → déficit 900

  -- HU-08 Apertura de bitácora: base SIN bitácora (listo para abrirla).
  PERFORM pg_temp.f_base('PRUEBA-HU-08','PRUEBA HU-08 · Bitácora por abrir (sin apertura)');

  -- HU-09 Emisión de notas: base + bitácora abierta y firmada (listo para emitir notas).
  v_id := pg_temp.f_base('PRUEBA-HU-09','PRUEBA HU-09 · Bitácora abierta para emitir notas');
  PERFORM pg_temp.f_bitacora(v_id);

  -- HU-10 Consulta de notas: base + bitácora + una nota de avance firmada (además de la apertura).
  v_id := pg_temp.f_base('PRUEBA-HU-10','PRUEBA HU-10 · Consulta y búsqueda de notas');
  v_bita := pg_temp.f_bitacora(v_id);
  SELECT residente_id, superintendente_id, supervision_id INTO v_resid, v_super, v_dep FROM contratos WHERE id=v_id; -- v_dep reusa supervision
  INSERT INTO bitacora_notas (bitacora_id, tipo, numero, contenido, emisor_id, estado, fecha, tag)
    VALUES (v_bita,'avance',2,'Se concluye la terracería del CONC-01; inicia cimentación.', v_super,'emitida',TIMESTAMPTZ '2026-03-28 17:00:00-06','avance')
    RETURNING id INTO v_nota;
  INSERT INTO bitacora_nota_firmas (nota_id, usuario_id, rol_en_firma) VALUES
    (v_nota,v_resid,'residente'),(v_nota,v_super,'superintendente'),(v_nota,v_dep,'supervision');

  -- HU-11 Minutas y visitas: base + bitácora + 1 minuta + 1 visita agendada.
  v_id := pg_temp.f_base('PRUEBA-HU-11','PRUEBA HU-11 · Minutas, visitas y acuerdos');
  PERFORM pg_temp.f_bitacora(v_id);
  SELECT residente_id INTO v_resid FROM contratos WHERE id=v_id;
  INSERT INTO minutas (contrato_id, titulo, fecha, lugar, participantes, acuerdos, registrada_por)
    VALUES (v_id,'Reunión de avance (abril)',DATE '2026-04-20','Sala de juntas — Residencia','Residente, Superintendente, Supervisión','Acelerar la cimentación para no atrasar el periodo 2.',v_resid);
  INSERT INTO visitas (contrato_id, tipo, fecha_programada, lugar, responsable, proposito, estado)
    VALUES (v_id,'visita',DATE '2026-04-25','Frente de obra — cimentación','Supervisión','Verificar la cimentación antes de colar.','agendada');

  -- HU-12 Integrar estimación: base + bitácora + avance del periodo 1, SIN estimación (listo para integrar).
  v_id := pg_temp.f_base('PRUEBA-HU-12','PRUEBA HU-12 · Periodo listo para integrar estimación');
  PERFORM pg_temp.f_bitacora(v_id);
  PERFORM pg_temp.f_avance(v_id,'CONC-01',1,1000.000);

  -- HU-13 Presentar estimación: base + estimación #1 INTEGRADA (lista para presentar).
  v_id := pg_temp.f_base('PRUEBA-HU-13','PRUEBA HU-13 · Estimación integrada lista para presentar');
  PERFORM pg_temp.f_bitacora(v_id);
  PERFORM pg_temp.f_avance(v_id,'CONC-01',1,1000.000);
  PERFORM pg_temp.f_estim(v_id,1,'CONC-01',1,'integrada');

  -- HU-14 Historial: base + estimaciones en varios estados (#1 pagada, #2 autorizada, #3 presentada).
  v_id := pg_temp.f_base('PRUEBA-HU-14','PRUEBA HU-14 · Historial de estimaciones (varios estados)');
  PERFORM pg_temp.f_bitacora(v_id);
  PERFORM pg_temp.f_avance(v_id,'CONC-01',1,1000.000);
  PERFORM pg_temp.f_avance(v_id,'CONC-02',2,200.000);
  PERFORM pg_temp.f_avance(v_id,'CONC-03',3,1.000);
  PERFORM pg_temp.f_estim(v_id,1,'CONC-01',1,'pagada');
  PERFORM pg_temp.f_estim(v_id,2,'CONC-02',2,'autorizada');
  PERFORM pg_temp.f_estim(v_id,3,'CONC-03',3,'enviada');

  -- HU-15 Revisión/autorización: base + estimación #1 PRESENTADA (enviada), esperando revisión.
  v_id := pg_temp.f_base('PRUEBA-HU-15','PRUEBA HU-15 · Estimación presentada esperando revisión');
  PERFORM pg_temp.f_bitacora(v_id);
  PERFORM pg_temp.f_avance(v_id,'CONC-01',1,1000.000);
  PERFORM pg_temp.f_estim(v_id,1,'CONC-01',1,'enviada');

  -- HU-16 Reingreso: base + estimación #1 RECHAZADA (lista para reingreso).
  v_id := pg_temp.f_base('PRUEBA-HU-16','PRUEBA HU-16 · Estimación rechazada para reingreso');
  PERFORM pg_temp.f_bitacora(v_id);
  PERFORM pg_temp.f_avance(v_id,'CONC-01',1,1000.000);
  PERFORM pg_temp.f_estim(v_id,1,'CONC-01',1,'rechazada');

  -- HU-17 Tablero: base + estimaciones (#1 pagada, #2 autorizada) para la cartera.
  v_id := pg_temp.f_base('PRUEBA-HU-17','PRUEBA HU-17 · Tablero de estimaciones (cartera)');
  PERFORM pg_temp.f_bitacora(v_id);
  PERFORM pg_temp.f_avance(v_id,'CONC-01',1,1000.000);
  PERFORM pg_temp.f_avance(v_id,'CONC-02',2,200.000);
  PERFORM pg_temp.f_estim(v_id,1,'CONC-01',1,'pagada');
  PERFORM pg_temp.f_estim(v_id,2,'CONC-02',2,'autorizada');

  -- HU-18 Portafolio: base + avance al corriente (semáforo verde en la cartera).
  v_id := pg_temp.f_base('PRUEBA-HU-18','PRUEBA HU-18 · Portafolio ejecutivo (semáforo)');
  PERFORM pg_temp.f_avance(v_id,'CONC-01',1,1000.000);
  PERFORM pg_temp.f_avance(v_id,'CONC-02',2,200.000);

  -- HU-19 Reportes: base + bitácora + estimación pagada (datos para los 7 reportes).
  v_id := pg_temp.f_base('PRUEBA-HU-19','PRUEBA HU-19 · Exportación de reportes');
  PERFORM pg_temp.f_bitacora(v_id);
  PERFORM pg_temp.f_avance(v_id,'CONC-01',1,1000.000);
  PERFORM pg_temp.f_estim(v_id,1,'CONC-01',1,'pagada');

  -- HU-20 Tránsito a pago: base + estimación #1 AUTORIZADA (lista para tránsito a pago).
  v_id := pg_temp.f_base('PRUEBA-HU-20','PRUEBA HU-20 · Estimación autorizada lista para tránsito a pago');
  PERFORM pg_temp.f_bitacora(v_id);
  PERFORM pg_temp.f_avance(v_id,'CONC-01',1,1000.000);
  PERFORM pg_temp.f_estim(v_id,1,'CONC-01',1,'autorizada');

  -- HU-21 Registro de pago: base + estimación #1 AUTORIZADA (lista para registrar el pago).
  v_id := pg_temp.f_base('PRUEBA-HU-21','PRUEBA HU-21 · Estimación autorizada lista para registrar pago');
  PERFORM pg_temp.f_bitacora(v_id);
  PERFORM pg_temp.f_avance(v_id,'CONC-01',1,1000.000);
  PERFORM pg_temp.f_estim(v_id,1,'CONC-01',1,'autorizada');

  -- HU-22 Roster/sustitución: base (roster ya cargado, listo para sustituir una persona).
  PERFORM pg_temp.f_base('PRUEBA-HU-22','PRUEBA HU-22 · Roster del contrato (listo para sustitución)');

  -- HU-23 Padrón de empresas: base (las empresas son el catálogo; el contrato solo aporta una más a la cartera).
  PERFORM pg_temp.f_base('PRUEBA-HU-23','PRUEBA HU-23 · Padrón de empresas');

  -- HU-24 Finiquito: base + bitácora + las 3 estimaciones PAGADAS (todo cobrado) → listo para finiquito.
  v_id := pg_temp.f_base('PRUEBA-HU-24','PRUEBA HU-24 · Contrato listo para finiquito (todo pagado)');
  PERFORM pg_temp.f_bitacora(v_id);
  PERFORM pg_temp.f_avance(v_id,'CONC-01',1,1000.000);
  PERFORM pg_temp.f_avance(v_id,'CONC-02',2,200.000);
  PERFORM pg_temp.f_avance(v_id,'CONC-03',3,1.000);
  PERFORM pg_temp.f_estim(v_id,1,'CONC-01',1,'pagada');
  PERFORM pg_temp.f_estim(v_id,2,'CONC-02',2,'pagada');
  PERFORM pg_temp.f_estim(v_id,3,'CONC-03',3,'pagada');

  RAISE NOTICE 'SEED 24: contratos PRUEBA-HU-01..24 sembrados.';
END $$;

-- (C) Verificación: los 24 con su monto (idéntico) y el estado de su ciclo.
SELECT c.folio, c.monto, c.anticipo_pct,
       (SELECT count(*) FROM contrato_conceptos cc WHERE cc.contrato_id=c.id) AS conc,
       (SELECT count(*) FROM estimaciones e WHERE e.contrato_id=c.id)         AS est,
       (SELECT string_agg(e.estado, ',' ORDER BY e.numero) FROM estimaciones e WHERE e.contrato_id=c.id) AS estados,
       (SELECT count(*) FROM bitacora_aperturas b WHERE b.contrato_id=c.id)   AS bita
  FROM contratos c WHERE c.folio LIKE 'PRUEBA-HU-%' ORDER BY c.folio;
