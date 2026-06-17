-- =====================================================================
-- SEED DEMO — PAQUETE DE DATOS DE PRUEBA (FASE 1, revisión profe 15-jun-2026)
-- "Generen datos dummy… formen su paquete de datos… debes poder probar con los datos que ya tienes"
-- (el profe, 15-jun). Carga DIRECTA en la base (sin pasar por la API ni sus gates) para poder
-- demostrar CUALQUIER historia sin capturar a mano cada vez.
--
-- NO es parte de schema.sql ni corre en los tests (no hay global-setup que lo ejecute). Se invoca a
-- demanda:  npm run seed:demo   (local: docker exec psql; Render: psql "$DATABASE_URL").
--
-- IDEMPOTENTE: borra los contratos demo por folio (cascada limpia todos los hijos; los triggers de
-- inmutabilidad son BEFORE UPDATE, no vetan DELETE) y los recrea limpios. Re-ejecutable N veces.
--
-- QUÉ DEJA CARGADO (ver docs/SEED_DEMO_SIGECOP.md para el guion de prueba por HU):
--   · OBRA-2026-DEMO-01  — contrato COMPLETO: 7 conceptos (fases de obra), programa 100%, anticipo
--       30% con plan de amortización PROPORCIONAL AL PROGRAMA (FASE 2, art. 143 fr. I), garantías,
--       jurídicos, PDF, roster, bitácora ABIERTA con apertura firmada + 2 notas (una firmada), y el
--       CICLO de estimación en TODOS los estados: #1 pagada, #2 autorizada, #3 presentada,
--       #4 integrada, #5 rechazada, #6 reingreso de la #5 (reemplaza_a). Cuadre EXACTO al centavo.
--   · OBRA-2026-ATRASO-01..04 — contratos EN ATRASO (programa con periodos pasados + avance bajo/
--       cero) para el tablero/alertas (HU-07/17/18). Comparten las MISMAS cuentas/empresas que el
--       contrato completo → demuestran que el catálogo de empresas (FASE 3) NO duplica.
--
-- Reusa las cuentas DEMO (resueltas POR EMAIL): residente/contratista(superintendente)/supervisión/
-- dependencia/finanzas @sigecop.test. Las empresas demo ya las siembra schema.sql.
-- [validar profe]: la tasa de pena convencional (0.10%) es de ejemplo; confírmala.
-- =====================================================================

-- (0) Idempotencia: borra los contratos demo y sus hijos. La cascada directa de `contratos` NO
-- basta: hay FKs deliberadamente NO ACTION (estimacion_generadores→contrato_conceptos,
-- pagos→estimaciones, concepto_avance/contrato_roster/estimacion_notas→bitacora_notas) que abortan
-- el borrado del padre si su referenciador sigue vivo. Por eso se borran los hijos en ORDEN de
-- dependencia antes del contrato (los triggers de inmutabilidad son BEFORE UPDATE, no vetan DELETE).
DO $$
DECLARE ids INTEGER[];
BEGIN
  SELECT array_agg(id) INTO ids FROM contratos WHERE folio IN (
    'OBRA-2026-DEMO-01',
    'OBRA-2026-ATRASO-01','OBRA-2026-ATRASO-02','OBRA-2026-ATRASO-03','OBRA-2026-ATRASO-04'
  );
  IF ids IS NOT NULL THEN
    DELETE FROM pagos WHERE contrato_id = ANY(ids);                         -- libera estimaciones
    DELETE FROM estimaciones WHERE contrato_id = ANY(ids);                  -- cascada: generadores, notas, observaciones
    DELETE FROM concepto_avance WHERE contrato_concepto_id IN
      (SELECT id FROM contrato_conceptos WHERE contrato_id = ANY(ids));     -- libera bitacora_notas
    DELETE FROM contrato_roster WHERE contrato_id = ANY(ids);              -- libera bitacora_notas
    DELETE FROM convenios_modificatorios WHERE contrato_id = ANY(ids);     -- libera bitacora_notas (nota_id NO ACTION)
    DELETE FROM contratos WHERE id = ANY(ids);                             -- cascada: el resto
  END IF;
END $$;

-- =====================================================================
-- (A) CONTRATO COMPLETO — OBRA-2026-DEMO-01
-- =====================================================================
DO $$
DECLARE
  v_resid  INTEGER; v_super INTEGER; v_superv INTEGER; v_dep INTEGER; v_fin INTEGER;
  v_nom_resid TEXT; v_nom_super TEXT; v_nom_superv TEXT;
  v_id INTEGER;
  c1 INTEGER; c2 INTEGER; c3 INTEGER; c4 INTEGER; c5 INTEGER; c6 INTEGER; c7 INTEGER;
  p1 INTEGER; p2 INTEGER; p3 INTEGER; p4 INTEGER; p5 INTEGER; p6 INTEGER; p7 INTEGER;
  v_bita INTEGER; v_nota1 INTEGER; v_nota2 INTEGER; v_nota3 INTEGER; v_conv INTEGER;
  e1 INTEGER; e2 INTEGER; e3 INTEGER; e4 INTEGER; e5 INTEGER; e6 INTEGER;
BEGIN
  SELECT id, nombre INTO v_resid,  v_nom_resid  FROM usuarios WHERE email='residente@sigecop.test';
  SELECT id, nombre INTO v_super,  v_nom_super  FROM usuarios WHERE email='contratista@sigecop.test';
  SELECT id, nombre INTO v_superv, v_nom_superv FROM usuarios WHERE email='supervision@sigecop.test';
  SELECT id INTO v_dep FROM usuarios WHERE email='dependencia@sigecop.test';
  SELECT id INTO v_fin FROM usuarios WHERE email='finanzas@sigecop.test';
  IF v_resid IS NULL OR v_super IS NULL OR v_superv IS NULL OR v_dep IS NULL OR v_fin IS NULL THEN
    RAISE EXCEPTION 'Faltan cuentas demo; aplica schema.sql (RUN_MIGRATIONS) primero.';
  END IF;

  -- Contrato. monto = Σ ROUND(cant×pu) del catálogo = 2,500,000.00. Anticipo 30% (= 750,000.00).
  -- pena convencional 0.10% (fracción 0.0010, art. 46 Bis LOPSRM / 86-90 RLOPSRM) [validar profe].
  INSERT INTO contratos (folio, tipo, objeto, ubicacion, contratista, dependencia, monto, plazo_dias,
                         fecha_inicio, fecha_termino, created_by, datos_juridicos, anticipo_pct,
                         residente_id, superintendente_id, supervision_id, dependencia_id,
                         ciclo_estimacion, pena_convencional_pct)
  VALUES ('OBRA-2026-DEMO-01', 'Obra pública sobre la base de precios unitarios',
          'Construcción de edificio de laboratorios (demo SIGECOP)',
          -- FASE 2 (profe 16-jun): ubicación de la obra → se redacta en la nota de apertura.
          'Av. Lázaro Cárdenas s/n, Ciudad Universitaria, Chilpancingo, Guerrero',
          v_nom_super, (SELECT nombre FROM usuarios WHERE id=v_dep),
          2500000.00, 211, DATE '2025-12-01', DATE '2026-06-30', v_resid,
          '{"licitacion":"LO-DEMO-2025-001","fecha_fallo":"2025-11-15","ramo":"Obra educativa"}'::jsonb,
          30.00, v_resid, v_super, v_superv, v_dep, 'mensual', 0.0010)
  RETURNING id INTO v_id;

  -- Catálogo: 7 conceptos = fases de obra (las que dictó el profe). Σ importes = 2,500,000.00.
  INSERT INTO contrato_conceptos (contrato_id, clave, orden, concepto, unidad, cantidad, pu) VALUES
    (v_id,'CONC-01',1,'Estudio de mecánica de suelos','est',     1.000,    100000.00) RETURNING id INTO c1;
  INSERT INTO contrato_conceptos (contrato_id, clave, orden, concepto, unidad, cantidad, pu) VALUES
    (v_id,'CONC-02',2,'Remoción y movimiento de tierras','m3',  2000.000,     150.00) RETURNING id INTO c2;
  INSERT INTO contrato_conceptos (contrato_id, clave, orden, concepto, unidad, cantidad, pu) VALUES
    (v_id,'CONC-03',3,'Cimentación','m3',                        500.000,    1200.00) RETURNING id INTO c3;
  INSERT INTO contrato_conceptos (contrato_id, clave, orden, concepto, unidad, cantidad, pu) VALUES
    (v_id,'CONC-04',4,'Instalaciones eléctricas','lote',           1.000,  400000.00) RETURNING id INTO c4;
  INSERT INTO contrato_conceptos (contrato_id, clave, orden, concepto, unidad, cantidad, pu) VALUES
    (v_id,'CONC-05',5,'Instalaciones hidrosanitarias','lote',      1.000,  300000.00) RETURNING id INTO c5;
  INSERT INTO contrato_conceptos (contrato_id, clave, orden, concepto, unidad, cantidad, pu) VALUES
    (v_id,'CONC-06',6,'Cableado estructurado','lote',              1.000,  200000.00) RETURNING id INTO c6;
  INSERT INTO contrato_conceptos (contrato_id, clave, orden, concepto, unidad, cantidad, pu) VALUES
    (v_id,'CONC-07',7,'Acabados','m2',                         1000.000,     600.00) RETURNING id INTO c7;

  -- 7 periodos mensuales (Dic-2025 .. Jun-2026).
  INSERT INTO contrato_periodos (contrato_id,numero,inicio,fin) VALUES (v_id,1,DATE '2025-12-01',DATE '2025-12-31') RETURNING id INTO p1;
  INSERT INTO contrato_periodos (contrato_id,numero,inicio,fin) VALUES (v_id,2,DATE '2026-01-01',DATE '2026-01-31') RETURNING id INTO p2;
  INSERT INTO contrato_periodos (contrato_id,numero,inicio,fin) VALUES (v_id,3,DATE '2026-02-01',DATE '2026-02-28') RETURNING id INTO p3;
  INSERT INTO contrato_periodos (contrato_id,numero,inicio,fin) VALUES (v_id,4,DATE '2026-03-01',DATE '2026-03-31') RETURNING id INTO p4;
  INSERT INTO contrato_periodos (contrato_id,numero,inicio,fin) VALUES (v_id,5,DATE '2026-04-01',DATE '2026-04-30') RETURNING id INTO p5;
  INSERT INTO contrato_periodos (contrato_id,numero,inicio,fin) VALUES (v_id,6,DATE '2026-05-01',DATE '2026-05-31') RETURNING id INTO p6;
  INSERT INTO contrato_periodos (contrato_id,numero,inicio,fin) VALUES (v_id,7,DATE '2026-06-01',DATE '2026-06-30') RETURNING id INTO p7;

  -- Programa de obra: cada concepto 100% en su periodo (Σ por concepto = contratado).
  INSERT INTO programa_obra (contrato_concepto_id, contrato_periodo_id, cantidad) VALUES
    (c1,p1,1.000),(c2,p2,2000.000),(c3,p3,500.000),(c4,p4,1.000),(c5,p5,1.000),(c6,p6,1.000),(c7,p7,1000.000);

  -- Plan de amortización PROPORCIONAL AL PROGRAMA (FASE 2, art. 143 fr. I): amort[k]=programado[k]×30%.
  -- Σ = 750,000.00 (= anticipo). 30k+90k+180k+120k+90k+60k+180k.
  INSERT INTO plan_amortizacion (contrato_id, periodo_numero, monto) VALUES
    (v_id,1,30000.00),(v_id,2,90000.00),(v_id,3,180000.00),(v_id,4,120000.00),
    (v_id,5,90000.00),(v_id,6,60000.00),(v_id,7,180000.00);

  -- Garantías (≤ monto del contrato; vigencias futuras).
  INSERT INTO contrato_garantias (contrato_id, tipo, afianzadora, poliza, monto, vigencia) VALUES
    (v_id,'cumplimiento','Afianzadora Demo, S.A.','FZA-CUMP-DEMO-01', 250000.00, DATE '2027-06-30'),
    (v_id,'anticipo',    'Afianzadora Demo, S.A.','FZA-ANT-DEMO-01',  750000.00, DATE '2027-06-30'),
    (v_id,'vicios_ocultos','Afianzadora Demo, S.A.','FZA-VIC-DEMO-01',250000.00, DATE '2028-06-30');

  -- PDF firmado del contrato (bytes %PDF mínimos; el gate del art. 50 está en la API, no aquí).
  INSERT INTO contrato_documentos (contrato_id, nombre, mime, tamano, contenido, tipo)
  VALUES (v_id, 'Contrato OBRA-2026-DEMO-01 (firmado).pdf', 'application/pdf', 15,
          decode('255044462d312e340a25e2e3cfd30a','hex'), 'contrato');

  -- Roster (art. 125): residente / superintendente / supervisión activos (la dependencia no firma).
  INSERT INTO contrato_roster (contrato_id, rol, usuario_id, vigencia_desde, motivo, registrado_por) VALUES
    (v_id,'residente',      v_resid,  DATE '2025-12-01','Asignación inicial (alta del contrato)', v_resid),
    (v_id,'superintendente',v_super,  DATE '2025-12-01','Asignación inicial (alta del contrato)', v_resid),
    (v_id,'supervision',    v_superv, DATE '2025-12-01','Asignación inicial (alta del contrato)', v_resid);

  -- Bitácora ABIERTA con apertura FIRMADA por las 3 partes (art. 123 RLOPSRM).
  INSERT INTO bitacora_aperturas (contrato_id, aperturada_por, fecha_apertura, apertura_en,
                                  descripcion_trabajos)
  VALUES (v_id, v_resid, DATE '2025-12-01', TIMESTAMPTZ '2025-12-01 09:00:00-06',
          'Construcción de edificio de laboratorios (demo).')
  RETURNING id INTO v_bita;
  INSERT INTO bitacora_firmantes (bitacora_id, parte, firmante, usuario_id, rol_en_firma, aplica, firmado, firmado_en) VALUES
    (v_bita,1,v_nom_resid,  v_resid,  'residente',      true,true,TIMESTAMPTZ '2025-12-01 09:30:00-06'),
    (v_bita,2,v_nom_super,  v_super,  'superintendente',true,true,TIMESTAMPTZ '2025-12-01 09:30:00-06'),
    (v_bita,3,v_nom_superv, v_superv, 'supervision',    true,true,TIMESTAMPTZ '2025-12-01 09:30:00-06');

  -- Nota #1 apertura (emisor residente) y nota #2 de avance (emisor superintendente), ambas firmadas.
  INSERT INTO bitacora_notas (bitacora_id, tipo, numero, contenido, emisor_id, estado, fecha)
  VALUES (v_bita,'apertura',1,'Apertura de bitácora electrónica de la obra (demo).', v_resid,'emitida',TIMESTAMPTZ '2025-12-01 09:30:00-06')
  RETURNING id INTO v_nota1;
  INSERT INTO bitacora_notas (bitacora_id, tipo, numero, contenido, emisor_id, estado, fecha, tag)
  VALUES (v_bita,'avance',2,'Se concluye el estudio de mecánica de suelos (CONC-01); inicia la remoción de tierras.', v_super,'emitida',TIMESTAMPTZ '2025-12-28 17:00:00-06','avance')
  RETURNING id INTO v_nota2;
  -- Firmas de ambas notas (3 partes) → quedan "firmadas".
  INSERT INTO bitacora_nota_firmas (nota_id, usuario_id, rol_en_firma) VALUES
    (v_nota1,v_resid,'residente'),(v_nota1,v_super,'superintendente'),(v_nota1,v_superv,'supervision'),
    (v_nota2,v_resid,'residente'),(v_nota2,v_super,'superintendente'),(v_nota2,v_superv,'supervision');

  -- CONVENIO MODIFICATORIO de PLAZO (HU-03, art. 59 LOPSRM): nota de consecuencia emitida por el
  -- residente (art. 53) + registro del convenio (211 → 241 días). La nota se liga al convenio
  -- (nota_id) y el contrato refleja el nuevo plazo. Demuestra HU-03 sin capturar a mano.
  INSERT INTO bitacora_notas (bitacora_id, tipo, numero, contenido, emisor_id, estado, fecha, tag)
  VALUES (v_bita,'res_convenios',3,'Se formaliza convenio modificatorio de plazo: se amplía la vigencia del contrato de 211 a 241 días por causas no imputables al contratista (art. 59 LOPSRM).', v_resid,'emitida',TIMESTAMPTZ '2026-03-15 12:00:00-06','convenio')
  RETURNING id INTO v_nota3;
  INSERT INTO bitacora_nota_firmas (nota_id, usuario_id, rol_en_firma) VALUES
    (v_nota3,v_resid,'residente'),(v_nota3,v_super,'superintendente'),(v_nota3,v_superv,'supervision');
  INSERT INTO convenios_modificatorios (contrato_id, numero, tipo, fundamento, motivo, fecha,
                                        plazo_anterior_dias, plazo_nuevo_dias, delta_plazo_pct,
                                        autorizado_por, nota_id)
  VALUES (v_id, 1, 'plazo', 'art59', 'Ampliación de plazo por lluvias atípicas (causa no imputable al contratista).',
          DATE '2026-03-15', 211, 241, ROUND((241-211)::numeric/211*100, 2), v_dep, v_nota3)
  RETURNING id INTO v_conv;
  -- El contrato refleja el nuevo plazo (metadato; no cambia la matriz/periodos ni el cuadre).
  UPDATE contratos SET plazo_dias = 241, fecha_termino = (DATE '2025-12-01' + 240) WHERE id = v_id;

  -- FASE 0C (profe 16-jun): OFICIO DE APROBACIÓN del convenio (soporte de que fue aprobado, art. 59/99
  -- RLOPSRM). Se guarda en contrato_documentos ligado al convenio (convenio_id, tipo='oficio_convenio').
  -- PDF mínimo (%PDF). Así el expediente muestra "📎 Ver oficio" en el convenio del contrato demo.
  INSERT INTO contrato_documentos (contrato_id, convenio_id, nombre, mime, tamano, contenido, tipo)
  VALUES (v_id, v_conv, 'Oficio de aprobación CM-001 (DEMO).pdf', 'application/pdf', 15,
          decode('255044462d312e340a25e2e3cfd30a','hex'), 'oficio_convenio');

  -- Avance físico (HU-06): cada concepto ejecutado al 100% en su periodo (contrato on-track → sin
  -- atraso falso). Coherente con el programa (Σ ejecutado = Σ programado por concepto).
  INSERT INTO concepto_avance (contrato_concepto_id, contrato_periodo_id, cantidad, fecha, registrado_por) VALUES
    (c1,p1,1.000,   DATE '2025-12-28', v_super),
    (c2,p2,2000.000,DATE '2026-01-29', v_super),
    (c3,p3,500.000, DATE '2026-02-26', v_super),
    (c4,p4,1.000,   DATE '2026-03-30', v_super),
    (c5,p5,1.000,   DATE '2026-04-29', v_super),
    (c6,p6,1.000,   DATE '2026-05-29', v_super),
    (c7,p7,1000.000,DATE '2026-06-12', v_super);

  -- CICLO DE ESTIMACIÓN — una estimación por concepto/periodo, carátula al CENTAVO:
  --   subtotal − ROUND(subtotal×30%,2) − ROUND(subtotal×0.005,2) = neto (sin deductivas ni atraso).
  -- #1 PAGADA  (CONC-01, 100,000 → neto 69,500.00)
  INSERT INTO estimaciones (contrato_id,numero,periodo_inicio,periodo_fin,estado,anticipo_pct_snapshot,
                            subtotal,amortizacion,retencion,deductivas,neto,integrada_por,integrada_en,
                            enviada_en,enviada_por)
  VALUES (v_id,1,DATE '2025-12-01',DATE '2025-12-31','pagada',30.00,
          100000.00,30000.00,500.00,0.00,69500.00,v_super,TIMESTAMPTZ '2026-01-02 10:00:00-06',
          TIMESTAMPTZ '2026-01-03 10:00:00-06',v_super) RETURNING id INTO e1;
  INSERT INTO estimacion_generadores (estimacion_id,contrato_concepto_id,cantidad_periodo,cantidad_anterior_acum,pu_snapshot)
  VALUES (e1,c1,1.0000,0.0000,100000.00);
  INSERT INTO pagos (contrato_id,estimacion_id,estimacion_ref,fecha_pago,importe,referencia,factura_cfdi,fecha_factura,registrado_por)
  VALUES (v_id,e1,'EST-1',DATE '2026-01-20',69500.00,'SPEI-DEMO-0001','CFDI-DEMO-0001',DATE '2026-01-15',v_fin);
  -- Liga la nota de avance firmada a la estimación #1 (HU-12).
  INSERT INTO estimacion_notas (estimacion_id, nota_id) VALUES (e1, v_nota2);

  -- #2 AUTORIZADA (CONC-02, 300,000 → neto 208,500.00) + turnado de supervisión a residencia.
  INSERT INTO estimaciones (contrato_id,numero,periodo_inicio,periodo_fin,estado,anticipo_pct_snapshot,
                            subtotal,amortizacion,retencion,deductivas,neto,integrada_por,integrada_en,
                            enviada_en,enviada_por)
  VALUES (v_id,2,DATE '2026-01-01',DATE '2026-01-31','autorizada',30.00,
          300000.00,90000.00,1500.00,0.00,208500.00,v_super,TIMESTAMPTZ '2026-02-02 10:00:00-06',
          TIMESTAMPTZ '2026-02-03 10:00:00-06',v_super) RETURNING id INTO e2;
  INSERT INTO estimacion_generadores (estimacion_id,contrato_concepto_id,cantidad_periodo,cantidad_anterior_acum,pu_snapshot)
  VALUES (e2,c2,2000.0000,0.0000,150.00);
  INSERT INTO estimacion_observaciones (estimacion_id,seccion,tipo,severidad,descripcion,estado,turnado_a,autor_id)
  VALUES (e2,'caratula','aclaracion','menor','Revisada por supervisión; se turna a la residencia para autorización.','solventada','residencia',v_superv);

  -- #3 PRESENTADA (enviada) (CONC-03, 600,000 → neto 417,000.00).
  INSERT INTO estimaciones (contrato_id,numero,periodo_inicio,periodo_fin,estado,anticipo_pct_snapshot,
                            subtotal,amortizacion,retencion,deductivas,neto,integrada_por,integrada_en,
                            enviada_en,enviada_por)
  VALUES (v_id,3,DATE '2026-02-01',DATE '2026-02-28','enviada',30.00,
          600000.00,180000.00,3000.00,0.00,417000.00,v_super,TIMESTAMPTZ '2026-03-02 10:00:00-06',
          TIMESTAMPTZ '2026-03-03 10:00:00-06',v_super) RETURNING id INTO e3;
  INSERT INTO estimacion_generadores (estimacion_id,contrato_concepto_id,cantidad_periodo,cantidad_anterior_acum,pu_snapshot)
  VALUES (e3,c3,500.0000,0.0000,1200.00);

  -- #4 INTEGRADA (CONC-04, 400,000 → neto 278,000.00).
  INSERT INTO estimaciones (contrato_id,numero,periodo_inicio,periodo_fin,estado,anticipo_pct_snapshot,
                            subtotal,amortizacion,retencion,deductivas,neto,integrada_por,integrada_en)
  VALUES (v_id,4,DATE '2026-03-01',DATE '2026-03-31','integrada',30.00,
          400000.00,120000.00,2000.00,0.00,278000.00,v_super,TIMESTAMPTZ '2026-04-02 10:00:00-06') RETURNING id INTO e4;
  INSERT INTO estimacion_generadores (estimacion_id,contrato_concepto_id,cantidad_periodo,cantidad_anterior_acum,pu_snapshot)
  VALUES (e4,c4,1.0000,0.0000,400000.00);

  -- #5 RECHAZADA (CONC-05, 300,000 → neto 208,500.00) + observación de rechazo a contratista.
  INSERT INTO estimaciones (contrato_id,numero,periodo_inicio,periodo_fin,estado,anticipo_pct_snapshot,
                            subtotal,amortizacion,retencion,deductivas,neto,integrada_por,integrada_en,
                            enviada_en,enviada_por)
  VALUES (v_id,5,DATE '2026-04-01',DATE '2026-04-30','rechazada',30.00,
          300000.00,90000.00,1500.00,0.00,208500.00,v_super,TIMESTAMPTZ '2026-05-02 10:00:00-06',
          TIMESTAMPTZ '2026-05-03 10:00:00-06',v_super) RETURNING id INTO e5;
  INSERT INTO estimacion_generadores (estimacion_id,contrato_concepto_id,cantidad_periodo,cantidad_anterior_acum,pu_snapshot)
  VALUES (e5,c5,1.0000,0.0000,300000.00);
  INSERT INTO estimacion_observaciones (estimacion_id,seccion,tipo,severidad,descripcion,estado,turnado_a,autor_id)
  VALUES (e5,'generadores','rechazo','mayor','Los números generadores no coinciden con lo ejecutado; se devuelve para corrección.','abierta','contratista',v_resid);

  -- #6 REINGRESO de la #5 (HU-16: nueva versión integrada ligada por reemplaza_a; copia carátula y
  --    generadores; NO reinicia el plazo del art. 54 LOPSRM. El ciclo de estimación es art. 54
  --    LOPSRM y su expediente art. 132 RLOPSRM). neto 208,500.00.
  INSERT INTO estimaciones (contrato_id,numero,periodo_inicio,periodo_fin,estado,anticipo_pct_snapshot,
                            subtotal,amortizacion,retencion,deductivas,neto,integrada_por,integrada_en,reemplaza_a)
  VALUES (v_id,6,DATE '2026-04-01',DATE '2026-04-30','integrada',30.00,
          300000.00,90000.00,1500.00,0.00,208500.00,v_super,TIMESTAMPTZ '2026-05-10 10:00:00-06',e5) RETURNING id INTO e6;
  INSERT INTO estimacion_generadores (estimacion_id,contrato_concepto_id,cantidad_periodo,cantidad_anterior_acum,pu_snapshot)
  VALUES (e6,c5,1.0000,0.0000,300000.00);

  RAISE NOTICE 'SEED DEMO completo: contrato % (OBRA-2026-DEMO-01), estimaciones #1..#6 sembradas.', v_id;
END $$;

-- =====================================================================
-- (B) CONTRATOS EN ATRASO — OBRA-2026-ATRASO-01..04 (para tablero/alertas HU-07/17/18)
--     Periodos en el PASADO + avance bajo/cero → la lectura DERIVA el atraso. Comparten cuentas/
--     empresas con el contrato completo (demuestra que el catálogo de empresas no duplica, FASE 3).
-- =====================================================================
DO $$
DECLARE
  v_resid INTEGER; v_super INTEGER; v_superv INTEGER; v_dep INTEGER; v_nom_super TEXT; v_nom_dep TEXT;
  rec RECORD; v_id INTEGER; v_cc INTEGER; v_pid INTEGER; k INTEGER; v_per NUMERIC; v_acum NUMERIC; v_ini DATE; v_fin DATE;
BEGIN
  SELECT id, nombre INTO v_super, v_nom_super FROM usuarios WHERE email='contratista@sigecop.test';
  SELECT id INTO v_resid  FROM usuarios WHERE email='residente@sigecop.test';
  SELECT id INTO v_superv FROM usuarios WHERE email='supervision@sigecop.test';
  SELECT id, nombre INTO v_dep, v_nom_dep FROM usuarios WHERE email='dependencia@sigecop.test';

  FOR rec IN SELECT * FROM (VALUES
    ('OBRA-2026-ATRASO-01','Pavimentación de vialidades de acceso','Pavimentación con concreto hidráulico','m2',1000.000,1000.00,DATE '2026-01-01',5,0.000),
    ('OBRA-2026-ATRASO-02','Red de drenaje sanitario','Tubería de drenaje sanitario','m',800.000,1000.00,DATE '2026-02-01',4,400.000),
    ('OBRA-2026-ATRASO-03','Barda perimetral y control de acceso','Barda perimetral de mampostería','m',1500.000,1000.00,DATE '2026-03-01',4,300.000),
    ('OBRA-2026-ATRASO-04','Rehabilitación de aulas (edificio B)','Rehabilitación integral de aulas','m2',2000.000,1000.00,DATE '2025-11-01',7,600.000)
  ) AS t(folio,objeto,concepto,unidad,cantidad,pu,inicio,nper,ejec)
  LOOP
    INSERT INTO contratos (folio, tipo, objeto, ubicacion, contratista, dependencia, monto, plazo_dias,
                           fecha_inicio, fecha_termino, created_by, anticipo_pct,
                           residente_id, superintendente_id, supervision_id, dependencia_id,
                           ciclo_estimacion, pena_convencional_pct)
    VALUES (rec.folio, 'Obra pública sobre la base de precios unitarios', rec.objeto,
            'Ciudad Universitaria, Chilpancingo, Guerrero',  -- FASE 2: ubicación de la obra
            v_nom_super, v_nom_dep, ROUND(rec.cantidad*rec.pu,2), rec.nper*30,
            rec.inicio, (rec.inicio + (rec.nper||' months')::interval - INTERVAL '1 day')::date, v_resid,
            0.00, v_resid, v_super, v_superv, v_dep, 'mensual', 0.0010)
    RETURNING id INTO v_id;

    INSERT INTO contrato_conceptos (contrato_id, clave, orden, concepto, unidad, cantidad, pu)
    VALUES (v_id,'CONC-01',1,rec.concepto,rec.unidad,rec.cantidad,rec.pu) RETURNING id INTO v_cc;

    -- Periodos mensuales + programa: reparte la cantidad por igual (la última absorbe el residuo).
    v_per := ROUND(rec.cantidad/rec.nper,3);
    v_acum := 0;
    FOR k IN 1..rec.nper LOOP
      v_ini := (rec.inicio + ((k-1)||' months')::interval)::date;
      v_fin := (rec.inicio + (k||' months')::interval - INTERVAL '1 day')::date;
      INSERT INTO contrato_periodos (contrato_id,numero,inicio,fin) VALUES (v_id,k,v_ini,v_fin) RETURNING id INTO v_pid;
      IF k < rec.nper THEN
        INSERT INTO programa_obra (contrato_concepto_id, contrato_periodo_id, cantidad) VALUES (v_cc,v_pid,v_per);
        v_acum := v_acum + v_per;
      ELSE
        INSERT INTO programa_obra (contrato_concepto_id, contrato_periodo_id, cantidad) VALUES (v_cc,v_pid,ROUND(rec.cantidad-v_acum,3));
      END IF;
    END LOOP;

    -- Avance ejecutado BAJO/CERO en el primer periodo → deficit = programado(periodos vencidos) − ejecutado > 0.
    IF rec.ejec > 0 THEN
      INSERT INTO concepto_avance (contrato_concepto_id, contrato_periodo_id, cantidad, fecha, registrado_por)
      VALUES (v_cc,(SELECT id FROM contrato_periodos WHERE contrato_id=v_id AND numero=1),rec.ejec,rec.inicio,v_super);
    END IF;

    RAISE NOTICE 'SEED DEMO atraso: % (id=%) cantidad=% ejecutado=%', rec.folio, v_id, rec.cantidad, rec.ejec;
  END LOOP;
END $$;

-- (C) Verificación rápida de lo sembrado.
SELECT c.folio, c.monto, c.anticipo_pct,
       (SELECT count(*) FROM contrato_conceptos cc WHERE cc.contrato_id=c.id) AS conceptos,
       (SELECT count(*) FROM contrato_periodos cp WHERE cp.contrato_id=c.id)  AS periodos,
       (SELECT count(*) FROM estimaciones e WHERE e.contrato_id=c.id)         AS estimaciones,
       (SELECT count(*) FROM plan_amortizacion pa WHERE pa.contrato_id=c.id)  AS plan
  FROM contratos c
 WHERE c.folio LIKE 'OBRA-2026-%'
 ORDER BY c.folio;
