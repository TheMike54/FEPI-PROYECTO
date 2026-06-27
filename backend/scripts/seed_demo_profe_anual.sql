-- =====================================================================
-- SEED — CONTRATO DE DEMO ANUAL PARA EL PROFE (DEMO-PROFE-ANUAL).
-- Un contrato ANUAL (12 periodos mensuales) PRE-ARMADO HASTA "bitácora abierta",
-- con AVANCE VACÍO a propósito: en la demo EN VIVO el equipo captura el avance +
-- la(s) foto(s) y luego integra una estimación de un periodo VENCIDO.
--
-- POR QUÉ AVANCE VACÍO: las fotos del AVANCE (tabla avance_fotos, colgada de
-- concepto_avance) viven en un dominio SEPARADO de los soportes/fotos de la
-- ESTIMACIÓN (estimacion_fotos/estimacion_soportes/estimacion_notas). Dejar el
-- avance vacío y capturarlo en vivo evita cualquier confusión de "qué foto es de
-- qué" durante la demo. (No hay JOIN que las cruce; ver reporte de verificación.)
--
-- LO QUE QUEDA LISTO (para que el flujo en vivo NO falle):
--   · Catálogo de 3 conceptos cuadrado al centavo (monto = Σ ROUND(cantidad×pu,2)).
--   · Programa de obra concepto×periodo cuadrado al 100% por concepto, con forma de
--     curva S a lo largo del año (terracerías al inicio, estructura al medio,
--     acabados al final).
--   · Anticipo 30% con plan de amortización cuadrado (Σ = anticipo, proporcional al
--     programa, art. 143 fr. I RLOPSRM).
--   · Garantías vigentes (cumplimiento/anticipo/vicios ocultos).
--   · Bitácora ABIERTA y firmada por las 3 partes (nota #1 = apertura firmada).
--   · PDF FIRMADO del contrato LIGADO (contrato_documentos tipo='contrato'): SIN
--     esto, integrar una estimación falla con 409 "El contrato no tiene su PDF
--     firmado ligado" (gate en estimaciones.controller::integrarEstimacion). <<— CLAVE.
--   · anticipo = 30% EXACTO: NO dispara el requisito de "anticipo_autorizacion"
--     (el gate es anticipo > 30, no >=).
--
-- LO QUE NO TRAE (lo hace el profe/equipo EN VIVO):
--   · concepto_avance (avance físico)  · avance_fotos  · estimaciones  · pagos.
--
-- FECHAS: inicio 2025-07-01, 12 periodos mensuales. A la fecha de la demo (jun-2026)
--   P1..P11 están TOTALMENTE VENCIDOS y P12 (jun-2026) en curso → se puede estimar un
--   periodo vencido sin chocar con reglas de fecha. (Usa P1..P11 en la demo.)
--
-- IDEMPOTENTE: borra/recrea SOLO el folio 'DEMO-PROFE-ANUAL%'. NO toca OP-2026-%,
--   SOP-2026-%, PRUEBA-HU-%, PRUEBA-ATRASO-%, ni PRUEBA-TR-%. Re-ejecutable (probado
--   2 veces, exit 0, sin duplicados). Se siembra por SQL DIRECTO (los triggers de
--   inmutabilidad son BEFORE UPDATE; el INSERT pasa).
--
-- Requiere: schema.sql aplicado + cuentas base (residente@ / contratista@ /
--   supervision@ / dependencia@ / finanzas@).
-- Uso (LOCAL):
--   docker exec -i sigecop_db psql -U sigecop -d sigecop_db -v ON_ERROR_STOP=1 < backend/scripts/seed_demo_profe_anual.sql
-- =====================================================================

-- (0) LIMPIEZA idempotente — SOLO DEMO-PROFE-ANUAL% (hijos en orden de FK NO ACTION).
DO $$
DECLARE ids INTEGER[];
BEGIN
  SELECT array_agg(id) INTO ids FROM contratos WHERE folio LIKE 'DEMO-PROFE-ANUAL%';
  IF ids IS NOT NULL THEN
    DELETE FROM pagos                    WHERE contrato_id = ANY(ids);
    DELETE FROM estimaciones             WHERE contrato_id = ANY(ids);   -- cascada: generadores, notas, observaciones, fotos
    DELETE FROM concepto_avance          WHERE contrato_concepto_id IN (SELECT id FROM contrato_conceptos WHERE contrato_id = ANY(ids));  -- cascada: avance_fotos
    DELETE FROM programa_version         WHERE contrato_id = ANY(ids);   -- cascada: concepto/celda
    DELETE FROM contrato_roster          WHERE contrato_id = ANY(ids);
    DELETE FROM convenios_modificatorios WHERE contrato_id = ANY(ids);
    DELETE FROM minutas                  WHERE contrato_id = ANY(ids);
    DELETE FROM visitas                  WHERE contrato_id = ANY(ids);
    DELETE FROM contratos                WHERE id = ANY(ids);            -- cascada: garantías, bitácora, documentos, periodos, conceptos, plan
  END IF;
END $$;

-- =====================================================================
-- (1) CONSTRUCCIÓN del contrato DEMO-PROFE-ANUAL.
-- =====================================================================
DO $$
DECLARE
  v_resid INTEGER; v_super INTEGER; v_superv INTEGER; v_dep INTEGER;
  v_nom_super TEXT; v_nom_dep TEXT;
  v_id INTEGER; c1 INTEGER; c2 INTEGER; c3 INTEGER;
  v_bita INTEGER; v_nota INTEGER;
  v_pdf BYTEA;
  -- periodos
  pid INTEGER[] := ARRAY[]::INTEGER[];
  v_pid INTEGER;
  -- cuadre
  v_suma_conceptos NUMERIC; v_anticipo NUMERIC; v_suma_plan NUMERIC; v_avance_cnt INTEGER;
  v_prog_desc INTEGER;
BEGIN
  -- Cuentas base
  SELECT id, nombre INTO v_super, v_nom_super FROM usuarios WHERE email='contratista@sigecop.test';
  SELECT id INTO v_resid  FROM usuarios WHERE email='residente@sigecop.test';
  SELECT id INTO v_superv FROM usuarios WHERE email='supervision@sigecop.test';
  SELECT id, nombre INTO v_dep, v_nom_dep FROM usuarios WHERE email='dependencia@sigecop.test';
  IF v_resid IS NULL OR v_super IS NULL OR v_superv IS NULL OR v_dep IS NULL THEN
    RAISE EXCEPTION 'Faltan cuentas demo; aplica schema.sql (cuentas base) primero.';
  END IF;

  -- ---- Contrato (anticipo 30% EXACTO; pena_convencional_pct NULL para una carátula
  --      en vivo 100% predecible: neto = subtotal − amortización(30%) − 5 al millar,
  --      sin retención por atraso sorpresa cualquiera sea el periodo que estimen). ----
  INSERT INTO contratos (folio, tipo, objeto, ubicacion, contratista, dependencia, monto, plazo_dias,
                         fecha_inicio, fecha_termino, created_by, datos_juridicos, anticipo_pct,
                         residente_id, superintendente_id, supervision_id, dependencia_id,
                         ciclo_estimacion, pena_convencional_pct)
  VALUES ('DEMO-PROFE-ANUAL', 'Obra pública sobre la base de precios unitarios',
          'DEMO PROFE · Construcción anual (contrato de 12 meses para demostración en vivo)',
          'Ciudad Universitaria, Chilpancingo, Guerrero',
          v_nom_super, v_nom_dep, 12000000.00, 365, DATE '2025-07-01', DATE '2026-06-30', v_resid,
          '{"licitacion":"LO-DEMO-PROFE-ANUAL-2025","fecha_fallo":"2025-06-15","ramo":"Obra educativa"}'::jsonb,
          30.00, v_resid, v_super, v_superv, v_dep, 'mensual', NULL)
  RETURNING id INTO v_id;

  -- ---- Catálogo de 3 conceptos (Σ ROUND(cant×pu,2) = 12,000,000.00) ----
  INSERT INTO contrato_conceptos (contrato_id, clave, orden, concepto, unidad, cantidad, pu)
    VALUES (v_id,'CONC-01',1,'Terracerías y movimiento de tierras','m3',10000.000, 350.00)  RETURNING id INTO c1; -- 3,500,000.00
  INSERT INTO contrato_conceptos (contrato_id, clave, orden, concepto, unidad, cantidad, pu)
    VALUES (v_id,'CONC-02',2,'Cimentación y estructura','m3', 3000.000,1500.00)              RETURNING id INTO c2; -- 4,500,000.00
  INSERT INTO contrato_conceptos (contrato_id, clave, orden, concepto, unidad, cantidad, pu)
    VALUES (v_id,'CONC-03',3,'Instalaciones y acabados','m2', 1600.000,2500.00)              RETURNING id INTO c3; -- 4,000,000.00

  -- ---- 12 periodos mensuales (P1=jul-2025 … P12=jun-2026) ----
  v_pid := NULL;
  INSERT INTO contrato_periodos (contrato_id,numero,inicio,fin) VALUES (v_id, 1,DATE '2025-07-01',DATE '2025-07-31') RETURNING id INTO v_pid; pid := pid || v_pid;
  INSERT INTO contrato_periodos (contrato_id,numero,inicio,fin) VALUES (v_id, 2,DATE '2025-08-01',DATE '2025-08-31') RETURNING id INTO v_pid; pid := pid || v_pid;
  INSERT INTO contrato_periodos (contrato_id,numero,inicio,fin) VALUES (v_id, 3,DATE '2025-09-01',DATE '2025-09-30') RETURNING id INTO v_pid; pid := pid || v_pid;
  INSERT INTO contrato_periodos (contrato_id,numero,inicio,fin) VALUES (v_id, 4,DATE '2025-10-01',DATE '2025-10-31') RETURNING id INTO v_pid; pid := pid || v_pid;
  INSERT INTO contrato_periodos (contrato_id,numero,inicio,fin) VALUES (v_id, 5,DATE '2025-11-01',DATE '2025-11-30') RETURNING id INTO v_pid; pid := pid || v_pid;
  INSERT INTO contrato_periodos (contrato_id,numero,inicio,fin) VALUES (v_id, 6,DATE '2025-12-01',DATE '2025-12-31') RETURNING id INTO v_pid; pid := pid || v_pid;
  INSERT INTO contrato_periodos (contrato_id,numero,inicio,fin) VALUES (v_id, 7,DATE '2026-01-01',DATE '2026-01-31') RETURNING id INTO v_pid; pid := pid || v_pid;
  INSERT INTO contrato_periodos (contrato_id,numero,inicio,fin) VALUES (v_id, 8,DATE '2026-02-01',DATE '2026-02-28') RETURNING id INTO v_pid; pid := pid || v_pid;
  INSERT INTO contrato_periodos (contrato_id,numero,inicio,fin) VALUES (v_id, 9,DATE '2026-03-01',DATE '2026-03-31') RETURNING id INTO v_pid; pid := pid || v_pid;
  INSERT INTO contrato_periodos (contrato_id,numero,inicio,fin) VALUES (v_id,10,DATE '2026-04-01',DATE '2026-04-30') RETURNING id INTO v_pid; pid := pid || v_pid;
  INSERT INTO contrato_periodos (contrato_id,numero,inicio,fin) VALUES (v_id,11,DATE '2026-05-01',DATE '2026-05-31') RETURNING id INTO v_pid; pid := pid || v_pid;
  INSERT INTO contrato_periodos (contrato_id,numero,inicio,fin) VALUES (v_id,12,DATE '2026-06-01',DATE '2026-06-30') RETURNING id INTO v_pid; pid := pid || v_pid;
  -- pid[n] = id del periodo n.

  -- ---- Programa de obra concepto×periodo (Σ por concepto = contratado; curva S) ----
  --  CONC-01 (Σ 10,000): frente al inicio.   CONC-02 (Σ 3,000): al medio.   CONC-03 (Σ 1,600): al final.
  INSERT INTO programa_obra (contrato_concepto_id, contrato_periodo_id, cantidad) VALUES
    -- CONC-01: P1..P6 = 1500+2500+2500+2000+1000+500 = 10,000
    (c1,pid[1],1500.000),(c1,pid[2],2500.000),(c1,pid[3],2500.000),(c1,pid[4],2000.000),(c1,pid[5],1000.000),(c1,pid[6],500.000),
    -- CONC-02: P3..P9 = 200+400+600+600+500+400+300 = 3,000
    (c2,pid[3],200.000),(c2,pid[4],400.000),(c2,pid[5],600.000),(c2,pid[6],600.000),(c2,pid[7],500.000),(c2,pid[8],400.000),(c2,pid[9],300.000),
    -- CONC-03: P7..P12 = 150+250+300+350+300+250 = 1,600
    (c3,pid[7],150.000),(c3,pid[8],250.000),(c3,pid[9],300.000),(c3,pid[10],350.000),(c3,pid[11],300.000),(c3,pid[12],250.000);

  -- ---- Plan de amortización (Σ = 3,600,000 = 30% del monto; proporcional al programa) ----
  --  amort[i] = 0.30 × valor_programado_periodo[i]  (cada uno ≤ su importe programado → R3; >0 donde hay obra → R2).
  INSERT INTO plan_amortizacion (contrato_id, periodo_numero, monto) VALUES
    (v_id, 1,157500.00),(v_id, 2,262500.00),(v_id, 3,352500.00),(v_id, 4,390000.00),
    (v_id, 5,375000.00),(v_id, 6,322500.00),(v_id, 7,337500.00),(v_id, 8,367500.00),
    (v_id, 9,360000.00),(v_id,10,262500.00),(v_id,11,225000.00),(v_id,12,187500.00);

  -- ---- Garantías vigentes (cumplimiento/anticipo/vicios ocultos) ----
  INSERT INTO contrato_garantias (contrato_id, tipo, afianzadora, poliza, monto, vigencia) VALUES
    (v_id,'cumplimiento',  'Afianzadora Aserta, S.A.','FZA-CUMP-DEMO-PROFE-ANUAL', 1200000.00, DATE '2027-06-30'),
    (v_id,'anticipo',      'Afianzadora Aserta, S.A.','FZA-ANT-DEMO-PROFE-ANUAL',  3600000.00, DATE '2027-06-30'),
    (v_id,'vicios_ocultos','Afianzadora Aserta, S.A.','FZA-VIC-DEMO-PROFE-ANUAL',  1200000.00, DATE '2028-06-30');

  -- ---- Roster (art. 125): residente / superintendente / supervisión, desde el inicio ----
  INSERT INTO contrato_roster (contrato_id, rol, usuario_id, vigencia_desde, motivo, registrado_por) VALUES
    (v_id,'residente',      v_resid,  DATE '2025-07-01','Asignación inicial (alta del contrato)', v_resid),
    (v_id,'superintendente',v_super,  DATE '2025-07-01','Asignación inicial (alta del contrato)', v_resid),
    (v_id,'supervision',    v_superv, DATE '2025-07-01','Asignación inicial (alta del contrato)', v_resid);

  -- ---- Bitácora ABIERTA y FIRMADA por las 3 partes (nota #1 = apertura) ----
  INSERT INTO bitacora_aperturas (contrato_id, aperturada_por, fecha_apertura, apertura_en, plazo_firma_dias, descripcion_trabajos)
    VALUES (v_id, v_resid, DATE '2025-07-01', TIMESTAMPTZ '2025-07-01 09:00:00-06', 2,
            'Construcción anual (demo en vivo): terracerías, cimentación/estructura e instalaciones/acabados, 12 periodos mensuales.')
    RETURNING id INTO v_bita;
  INSERT INTO bitacora_firmantes (bitacora_id, parte, firmante, usuario_id, rol_en_firma, aplica, firmado, firmado_en) VALUES
    (v_bita,1,(SELECT nombre FROM usuarios WHERE id=v_resid),  v_resid,  'residente',      true,true,TIMESTAMPTZ '2025-07-01 09:30:00-06'),
    (v_bita,2,(SELECT nombre FROM usuarios WHERE id=v_super),  v_super,  'superintendente',true,true,TIMESTAMPTZ '2025-07-01 09:30:00-06'),
    (v_bita,3,(SELECT nombre FROM usuarios WHERE id=v_superv), v_superv, 'supervision',    true,true,TIMESTAMPTZ '2025-07-01 09:30:00-06');
  INSERT INTO bitacora_notas (bitacora_id, tipo, numero, contenido, emisor_id, estado, fecha)
    VALUES (v_bita,'apertura',1,'Apertura de la bitácora electrónica de la obra (demo anual para revisión en vivo).',
            v_resid,'emitida',TIMESTAMPTZ '2025-07-01 09:30:00-06')
    RETURNING id INTO v_nota;
  INSERT INTO bitacora_nota_firmas (nota_id, usuario_id, rol_en_firma) VALUES
    (v_nota,v_resid,'residente'),(v_nota,v_super,'superintendente'),(v_nota,v_superv,'supervision');

  -- ---- PDF FIRMADO del contrato LIGADO (sin esto, integrar estimación → 409). ----
  --  PDF mínimo válido (1 página) generado para la demo; el gate solo exige que exista
  --  la fila tipo='contrato'. tamano = octet_length del binario.
  v_pdf := decode('255044462d312e340a312030206f626a0a3c3c202f54797065202f436174616c6f67202f5061676573203220302052203e3e0a656e646f626a0a322030206f626a0a3c3c202f54797065202f5061676573202f4b696473205b33203020525d202f436f756e742031203e3e0a656e646f626a0a332030206f626a0a3c3c202f54797065202f50616765202f506172656e74203220302052202f4d65646961426f78205b30203020363132203739325d202f5265736f7572636573203c3c202f466f6e74203c3c202f4631203420302052203e3e203e3e202f436f6e74656e7473203520302052203e3e0a656e646f626a0a342030206f626a0a3c3c202f54797065202f466f6e74202f53756274797065202f5479706531202f42617365466f6e74202f48656c766574696361203e3e0a656e646f626a0a352030206f626a0a3c3c202f4c656e677468203838203e3e0a73747265616d0a4254202f463120313820546620373220373230205464202853494745434f50202d20436f6e747261746f2044454d4f2d50524f46452d414e55414c2028504446206669726d61646f2064652064656d6f292920546a2045540a656e6473747265616d0a656e646f626a0a787265660a3020360a303030303030303030302036353533352066200a30303030303030303039203030303030206e200a30303030303030303538203030303030206e200a30303030303030313135203030303030206e200a30303030303030323431203030303030206e200a30303030303030333131203030303030206e200a747261696c65720a3c3c202f53697a652036202f526f6f74203120302052203e3e0a7374617274787265660a3434390a2525454f46','hex');
  INSERT INTO contrato_documentos (contrato_id, nombre, mime, tamano, contenido, tipo)
    VALUES (v_id, 'Contrato-DEMO-PROFE-ANUAL-firmado.pdf', 'application/pdf', octet_length(v_pdf), v_pdf, 'contrato');

  -- =====================================================================
  -- (2) ASSERCIONES de cuadre — el seed se AUTO-VERIFICA (falla si algo no cuadra).
  -- =====================================================================
  -- Monto = Σ ROUND(cantidad×pu,2)
  SELECT SUM(ROUND(cantidad*pu,2)) INTO v_suma_conceptos FROM contrato_conceptos WHERE contrato_id=v_id;
  IF v_suma_conceptos <> 12000000.00 THEN
    RAISE EXCEPTION 'DESCUADRE catálogo: Σ ROUND(cant×pu)=% <> 12,000,000.00', v_suma_conceptos;
  END IF;
  -- Σ programa por concepto = contratado por concepto (regla del 100%)
  SELECT count(*) INTO v_prog_desc
    FROM contrato_conceptos cc
    LEFT JOIN (SELECT contrato_concepto_id cid, SUM(cantidad) s FROM programa_obra GROUP BY 1) po ON po.cid=cc.id
   WHERE cc.contrato_id=v_id AND COALESCE(po.s,0) <> cc.cantidad;
  IF v_prog_desc > 0 THEN
    RAISE EXCEPTION 'DESCUADRE programa: % concepto(s) con Σ planeado <> contratado', v_prog_desc;
  END IF;
  -- Σ plan de amortización = anticipo (30% del monto)
  v_anticipo := ROUND(12000000.00*0.30,2);
  SELECT COALESCE(SUM(monto),0) INTO v_suma_plan FROM plan_amortizacion WHERE contrato_id=v_id;
  IF v_suma_plan <> v_anticipo THEN
    RAISE EXCEPTION 'DESCUADRE amortización: Σ plan=% <> anticipo %', v_suma_plan, v_anticipo;
  END IF;
  -- AVANCE debe quedar VACÍO (lo captura el profe en vivo)
  SELECT count(*) INTO v_avance_cnt FROM concepto_avance ca
    JOIN contrato_conceptos cc ON cc.id=ca.contrato_concepto_id WHERE cc.contrato_id=v_id;
  IF v_avance_cnt <> 0 THEN
    RAISE EXCEPTION 'El avance NO está vacío (% filas); debe quedar vacío para la demo', v_avance_cnt;
  END IF;
  -- 12 periodos
  IF (SELECT count(*) FROM contrato_periodos WHERE contrato_id=v_id) <> 12 THEN
    RAISE EXCEPTION 'No hay 12 periodos';
  END IF;
  -- PDF firmado ligado (gate de integración)
  IF NOT EXISTS (SELECT 1 FROM contrato_documentos WHERE contrato_id=v_id AND tipo='contrato') THEN
    RAISE EXCEPTION 'Falta el PDF firmado (contrato_documentos tipo=contrato); integrar estimación fallaría';
  END IF;

  RAISE NOTICE 'SEED DEMO-PROFE-ANUAL: contrato % sembrado (12 periodos, avance vacío, bitácora abierta, PDF firmado ligado, cuadre OK).', v_id;
END $$;

-- =====================================================================
-- (V) VERIFICACIÓN (se imprime al correr con psql)
-- =====================================================================

-- (V1) Resumen del contrato.
SELECT c.folio, c.monto, c.anticipo_pct, c.ciclo_estimacion, c.fecha_inicio, c.fecha_termino, c.estado,
       (SELECT count(*) FROM contrato_conceptos cc WHERE cc.contrato_id=c.id)                                   AS conceptos,
       (SELECT count(*) FROM contrato_periodos cp WHERE cp.contrato_id=c.id)                                    AS periodos,
       (SELECT count(*) FROM bitacora_aperturas b WHERE b.contrato_id=c.id)                                     AS bitacora_abierta,
       (SELECT count(*) FROM contrato_documentos d WHERE d.contrato_id=c.id AND d.tipo='contrato')              AS pdf_firmado,
       (SELECT count(*) FROM concepto_avance ca JOIN contrato_conceptos cc ON cc.id=ca.contrato_concepto_id
          WHERE cc.contrato_id=c.id)                                                                            AS avance_filas,
       (SELECT count(*) FROM estimaciones e WHERE e.contrato_id=c.id)                                           AS estimaciones,
       (SELECT count(*) FROM pagos p WHERE p.contrato_id=c.id)                                                  AS pagos
  FROM contratos c WHERE c.folio = 'DEMO-PROFE-ANUAL';

-- (V2) Cuadre al centavo: catálogo, programa por concepto y plan de amortización.
SELECT 'catalogo'  AS chequeo, SUM(ROUND(cc.cantidad*cc.pu,2)) AS valor, 12000000.00 AS esperado
  FROM contrato_conceptos cc JOIN contratos c ON c.id=cc.contrato_id WHERE c.folio='DEMO-PROFE-ANUAL'
UNION ALL
SELECT 'plan_amortizacion', SUM(pa.monto), 3600000.00
  FROM plan_amortizacion pa JOIN contratos c ON c.id=pa.contrato_id WHERE c.folio='DEMO-PROFE-ANUAL';

-- (V2b) Σ programa = contratado por concepto (debe coincidir col a col).
SELECT cc.clave, cc.cantidad AS contratado, COALESCE(SUM(po.cantidad),0) AS planeado,
       (cc.cantidad = COALESCE(SUM(po.cantidad),0)) AS cuadra
  FROM contrato_conceptos cc
  JOIN contratos c ON c.id=cc.contrato_id
  LEFT JOIN programa_obra po ON po.contrato_concepto_id=cc.id
 WHERE c.folio='DEMO-PROFE-ANUAL'
 GROUP BY cc.clave, cc.cantidad ORDER BY cc.clave;

-- (V3) Periodos: cuáles están VENCIDOS hoy (para la demo, usa los vencidos).
SELECT cp.numero, cp.inicio, cp.fin, (cp.fin < CURRENT_DATE) AS vencido
  FROM contrato_periodos cp JOIN contratos c ON c.id=cp.contrato_id
 WHERE c.folio='DEMO-PROFE-ANUAL' ORDER BY cp.numero;

-- (V4) Curva planeada (valor por periodo + acumulado). La EJECUTADA arranca en 0
--      hasta que capturen avance en vivo.
SELECT cp.numero,
       SUM(po.cantidad*cc.pu) AS valor_periodo,
       SUM(SUM(po.cantidad*cc.pu)) OVER (ORDER BY cp.numero) AS acumulado_planeado
  FROM programa_obra po
  JOIN contrato_periodos cp ON cp.id=po.contrato_periodo_id
  JOIN contrato_conceptos cc ON cc.id=po.contrato_concepto_id
  JOIN contratos c ON c.id=cc.contrato_id
 WHERE c.folio='DEMO-PROFE-ANUAL'
 GROUP BY cp.numero ORDER BY cp.numero;
