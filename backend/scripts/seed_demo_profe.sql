-- =====================================================================
-- SEED "DEMO DEL PROFE" (22-jun) — SOLO DATOS. No toca schema.sql, controllers ni backend.
-- Deja la BD demo limpia y realista para la revisión: sin basura de e2e, folios/nombres verosímiles,
-- FECHAS RELATIVAS A HOY (la matriz no sale toda roja), estados variados, 1 contrato CERRADO con finiquito,
-- garantías por vencer (rojo/ámbar/amarillo), "Por firmar" con pendientes, techo presupuestal 2026,
-- notas variadas y un convenio de monto con versión del programa.
--
-- Requisitos previos: schema.sql aplicado + reseed_cuentas.sql (empresas/cuentas realistas) ya corridos.
-- IDEMPOTENTE: re-ejecutable (purga basura y recrea los contratos OP-2026-%).
-- Mapa folio↔HU (qué abrir en la demo): docs/pruebas/MAPA_DEMO_PROFE.md
--
-- ⚠️ DESTRUCTIVO (marcado): la Parte 0 BORRA usuarios/empresas basura de pruebas. Haz backup antes en Render.
-- =====================================================================

-- =====================================================================
-- PARTE 0 — PURGA DE BASURA DE PRUEBAS  ⚠️ DESTRUCTIVO (pero acotado a residuo de e2e)
--   · 187 solicitudes pendientes (campana) + 379 usuarios con timestamp en el nombre (ninguno referenciado
--     por contrato, verificado) + 191 empresas con timestamp (todas referenciadas solo por esos usuarios).
--   Orden: primero los usuarios (FK usuarios.empresa_id es NO ACTION), luego las empresas huérfanas.
-- =====================================================================
DO $$
DECLARE n_u INTEGER; n_e INTEGER;
BEGIN
  -- (0.1) Suelta el FK: ningún usuario queda apuntando a una empresa basura (timestamp en el nombre).
  --       Solo afecta cuentas de e2e (las canónicas/realistas apuntan a empresas realistas, no timestamp).
  UPDATE usuarios SET empresa_id = NULL WHERE empresa_id IN (SELECT id FROM empresas WHERE nombre ~ '[0-9]{6,}');

  -- (0.2) Usuarios basura: nombre con ≥6 dígitos seguidos (timestamps de e2e) o cuentas pendientes de prueba.
  --       Guarda dura: NUNCA borrar una cuenta canónica ni una referenciada por un contrato.
  DELETE FROM usuarios u
   WHERE (u.nombre ~ '[0-9]{6,}'
          OR (u.estado = 'pendiente' AND u.email LIKE '%@sigecop.test'))
     AND NOT EXISTS (SELECT 1 FROM contratos c
                      WHERE u.id IN (c.created_by, c.residente_id, c.superintendente_id, c.supervision_id, c.dependencia_id))
     AND u.email NOT IN ('residente@sigecop.test','contratista@sigecop.test','supervision@sigecop.test',
                         'dependencia@sigecop.test','finanzas@sigecop.test');
  GET DIAGNOSTICS n_u = ROW_COUNT;

  -- (0.3) Empresas basura: nombre con timestamp (ya sin cuentas que las referencien tras 0.1).
  DELETE FROM empresas e
   WHERE e.nombre ~ '[0-9]{6,}'
     AND NOT EXISTS (SELECT 1 FROM usuarios u WHERE u.empresa_id = e.id);
  GET DIAGNOSTICS n_e = ROW_COUNT;

  RAISE NOTICE 'PURGA: % usuarios basura, % empresas basura eliminados.', n_u, n_e;
END $$;

-- =====================================================================
-- PARTE 1 — NOMBRES REALISTAS de las 5 cuentas canónicas (quitar "Demo"). Solo display; conserva ids/emails.
--   Estos nombres son los que se ven como Residente/Contratista/Dependencia/Finanzas en los contratos.
-- =====================================================================
UPDATE usuarios SET nombre='Ing. Carlos Méndez Rivera'     WHERE email='contratista@sigecop.test';
UPDATE usuarios SET nombre='Ing. Roberto Salazar Gómez'    WHERE email='residente@sigecop.test';
UPDATE usuarios SET nombre='Arq. Mónica Vázquez Lara'      WHERE email='supervision@sigecop.test';
UPDATE usuarios SET nombre='Lic. Diana Herrera Salgado'    WHERE email='dependencia@sigecop.test';
UPDATE usuarios SET nombre='C.P. Fernando Ríos Aguilar'    WHERE email='finanzas@sigecop.test';

-- =====================================================================
-- PARTE 2 — LIMPIEZA de los contratos demo (OP-2026-% y cualquier PRUEBA-HU-% viejo). Hijos en orden de FK.
-- =====================================================================
DO $$
DECLARE ids INTEGER[];
BEGIN
  SELECT array_agg(id) INTO ids FROM contratos WHERE folio LIKE 'OP-2026-%' OR folio LIKE 'PRUEBA-HU-%';
  IF ids IS NOT NULL THEN
    DELETE FROM finiquitos               WHERE contrato_id = ANY(ids);
    DELETE FROM pagos                    WHERE contrato_id = ANY(ids);
    DELETE FROM estimaciones             WHERE contrato_id = ANY(ids);   -- cascada: generadores/notas/observaciones
    DELETE FROM concepto_avance          WHERE contrato_concepto_id IN (SELECT id FROM contrato_conceptos WHERE contrato_id = ANY(ids));
    DELETE FROM contrato_roster          WHERE contrato_id = ANY(ids);
    DELETE FROM garantia_endosos         WHERE garantia_id IN (SELECT id FROM contrato_garantias WHERE contrato_id = ANY(ids));
    DELETE FROM programa_version_celda    WHERE programa_version_id IN (SELECT id FROM programa_version WHERE contrato_id = ANY(ids));
    DELETE FROM programa_version_concepto WHERE programa_version_id IN (SELECT id FROM programa_version WHERE contrato_id = ANY(ids));
    DELETE FROM convenios_modificatorios WHERE contrato_id = ANY(ids);   -- antes de programa_version (FK convenio_id)
    DELETE FROM programa_version         WHERE contrato_id = ANY(ids);
    DELETE FROM minutas                  WHERE contrato_id = ANY(ids);
    DELETE FROM visitas                  WHERE contrato_id = ANY(ids);
    DELETE FROM contratos                WHERE id = ANY(ids);            -- cascada: garantías, conceptos, periodos, programa_obra, plan_amort, bitácora
  END IF;
END $$;

-- =====================================================================
-- PARTE 3 — HELPERS (pg_temp; se descartan al cerrar la conexión). FECHAS RELATIVAS A HOY.
--   Programa de 3 periodos: P1 [hoy-60 .. hoy-31] (vencido), P2 [hoy-30 .. hoy-1] (en curso),
--   P3 [hoy .. hoy+29] (por venir). → la matriz muestra verde (ejecutado) + ámbar (por venir) + rojo (atraso real).
-- =====================================================================
CREATE OR REPLACE FUNCTION pg_temp.f_base(p_folio TEXT, p_objeto TEXT, p_contratista_email TEXT DEFAULT 'contratista@sigecop.test') RETURNS INTEGER AS $$
DECLARE
  v_resid INTEGER; v_super INTEGER; v_superv INTEGER; v_dep INTEGER; v_nom_super TEXT; v_nom_dep TEXT;
  v_id INTEGER; c1 INTEGER; c2 INTEGER; c3 INTEGER; p1 INTEGER; p2 INTEGER; p3 INTEGER;
  d0 DATE := CURRENT_DATE - 60;     -- inicio ~2 meses antes de hoy
  d_term DATE := CURRENT_DATE + 29; -- término ~1 mes después de hoy
BEGIN
  SELECT id, nombre INTO v_super, v_nom_super FROM usuarios WHERE email=p_contratista_email;
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
          'Ciudad Universitaria, Chilpancingo de los Bravo, Guerrero',
          v_nom_super, v_nom_dep, 1000000.00, 90, d0, d_term, v_resid,
          '{"licitacion":"LO-911037999-E12-2026","fecha_fallo":"2026-01-30","ramo":"Obra pública educativa"}'::jsonb,
          30.00, v_resid, v_super, v_superv, v_dep, 'mensual', 0.0010)
  RETURNING id INTO v_id;

  INSERT INTO contrato_conceptos (contrato_id, clave, orden, concepto, unidad, cantidad, pu)
    VALUES (v_id,'CONC-01',1,'Terracerías y movimiento de tierras','m3',1000.000,300.00) RETURNING id INTO c1;
  INSERT INTO contrato_conceptos (contrato_id, clave, orden, concepto, unidad, cantidad, pu)
    VALUES (v_id,'CONC-02',2,'Cimentación','m3',200.000,1500.00) RETURNING id INTO c2;
  INSERT INTO contrato_conceptos (contrato_id, clave, orden, concepto, unidad, cantidad, pu)
    VALUES (v_id,'CONC-03',3,'Estructura y obra negra','lote',1.000,400000.00) RETURNING id INTO c3;

  INSERT INTO contrato_periodos (contrato_id,numero,inicio,fin) VALUES (v_id,1,d0,        d0+29) RETURNING id INTO p1;
  INSERT INTO contrato_periodos (contrato_id,numero,inicio,fin) VALUES (v_id,2,d0+30, d0+59) RETURNING id INTO p2;
  INSERT INTO contrato_periodos (contrato_id,numero,inicio,fin) VALUES (v_id,3,d0+60, d_term) RETURNING id INTO p3;

  INSERT INTO programa_obra (contrato_concepto_id, contrato_periodo_id, cantidad) VALUES
    (c1,p1,1000.000),(c2,p2,200.000),(c3,p3,1.000);

  INSERT INTO plan_amortizacion (contrato_id, periodo_numero, monto) VALUES
    (v_id,1,90000.00),(v_id,2,90000.00),(v_id,3,120000.00);

  -- Garantías: por defecto vigencias futuras (verdes). Algunos contratos las ajustan después (por vencer).
  INSERT INTO contrato_garantias (contrato_id, tipo, afianzadora, poliza, monto, vigencia) VALUES
    (v_id,'cumplimiento',  'Afianzadora Aserta, S.A.','FZA-CUMP-'||p_folio,100000.00, CURRENT_DATE + 365),
    (v_id,'anticipo',      'Afianzadora Aserta, S.A.','FZA-ANT-'||p_folio, 300000.00, CURRENT_DATE + 365),
    (v_id,'vicios_ocultos','Afianzadora Aserta, S.A.','FZA-VIC-'||p_folio,100000.00, CURRENT_DATE + 730);

  INSERT INTO contrato_roster (contrato_id, rol, usuario_id, vigencia_desde, motivo, registrado_por) VALUES
    (v_id,'residente',      v_resid,  d0,'Asignación inicial (alta del contrato)', v_resid),
    (v_id,'superintendente',v_super,  d0,'Asignación inicial (alta del contrato)', v_resid),
    (v_id,'supervision',    v_superv, d0,'Asignación inicial (alta del contrato)', v_resid);

  RETURN v_id;
END $$ LANGUAGE plpgsql;

-- f_bitacora: abre la bitácora FIRMADA por las 3 partes (nota #1 apertura firmada).
CREATE OR REPLACE FUNCTION pg_temp.f_bitacora(p_contrato INTEGER, p_firmada BOOLEAN DEFAULT true) RETURNS INTEGER AS $$
DECLARE v_resid INTEGER; v_super INTEGER; v_superv INTEGER; v_nr TEXT; v_ns TEXT; v_nsv TEXT; v_bita INTEGER; v_nota INTEGER;
  d0 DATE := CURRENT_DATE - 60;
BEGIN
  SELECT residente_id, superintendente_id, supervision_id INTO v_resid, v_super, v_superv FROM contratos WHERE id=p_contrato;
  SELECT nombre INTO v_nr FROM usuarios WHERE id=v_resid;
  SELECT nombre INTO v_ns FROM usuarios WHERE id=v_super;
  SELECT nombre INTO v_nsv FROM usuarios WHERE id=v_superv;
  INSERT INTO bitacora_aperturas (contrato_id, aperturada_por, fecha_apertura, apertura_en, descripcion_trabajos)
    VALUES (p_contrato, v_resid, d0, (d0 + TIME '09:00')::timestamptz, 'Apertura de la bitácora electrónica de la obra.')
    RETURNING id INTO v_bita;
  -- Si p_firmada=false → las firmas quedan PENDIENTES (para demostrar "Por firmar").
  INSERT INTO bitacora_firmantes (bitacora_id, parte, firmante, usuario_id, rol_en_firma, aplica, firmado, firmado_en) VALUES
    (v_bita,1,v_nr, v_resid, 'residente',      true, p_firmada, CASE WHEN p_firmada THEN (d0 + TIME '09:30')::timestamptz END),
    (v_bita,2,v_ns, v_super, 'superintendente',true, p_firmada, CASE WHEN p_firmada THEN (d0 + TIME '09:30')::timestamptz END),
    (v_bita,3,v_nsv,v_superv,'supervision',    true, p_firmada, CASE WHEN p_firmada THEN (d0 + TIME '09:30')::timestamptz END);
  -- La nota #1 de apertura solo se asienta cuando la bitácora ya está firmada (coherente con el sistema).
  IF p_firmada THEN
    INSERT INTO bitacora_notas (bitacora_id, tipo, numero, contenido, emisor_id, estado, fecha)
      VALUES (v_bita,'apertura',1,'Apertura de bitácora electrónica de la obra.', v_resid,'emitida',(d0 + TIME '09:30')::timestamptz)
      RETURNING id INTO v_nota;
    INSERT INTO bitacora_nota_firmas (nota_id, usuario_id, rol_en_firma) VALUES
      (v_nota,v_resid,'residente'),(v_nota,v_super,'superintendente'),(v_nota,v_superv,'supervision');
  END IF;
  RETURN v_bita;
END $$ LANGUAGE plpgsql;

-- f_avance: avance ejecutado de un concepto en un periodo (fecha = fin del periodo).
CREATE OR REPLACE FUNCTION pg_temp.f_avance(p_contrato INTEGER, p_clave TEXT, p_periodo INTEGER, p_cant NUMERIC) RETURNS VOID AS $$
DECLARE v_cc INTEGER; v_pid INTEGER; v_super INTEGER; v_fin DATE;
BEGIN
  SELECT id INTO v_cc FROM contrato_conceptos WHERE contrato_id=p_contrato AND clave=p_clave;
  SELECT id, fin INTO v_pid, v_fin FROM contrato_periodos WHERE contrato_id=p_contrato AND numero=p_periodo;
  SELECT superintendente_id INTO v_super FROM contratos WHERE id=p_contrato;
  INSERT INTO concepto_avance (contrato_concepto_id, contrato_periodo_id, cantidad, fecha, registrado_por)
    VALUES (v_cc, v_pid, p_cant, LEAST(v_fin, CURRENT_DATE), v_super);
END $$ LANGUAGE plpgsql;

-- f_estim: estimación de un concepto/periodo en el estado dado (cuadre al centavo). FECHAS RELATIVAS.
CREATE OR REPLACE FUNCTION pg_temp.f_estim(p_contrato INTEGER, p_numero INTEGER, p_clave TEXT, p_periodo INTEGER, p_estado TEXT) RETURNS INTEGER AS $$
DECLARE
  v_cc INTEGER; v_cant NUMERIC; v_pu NUMERIC; v_ini DATE; v_fin DATE; v_super INTEGER; v_resid INTEGER; v_superv INTEGER; v_fin_u INTEGER;
  v_sub NUMERIC; v_amort NUMERIC; v_ret NUMERIC; v_neto NUMERIC; v_env TIMESTAMPTZ; v_id INTEGER;
  v_integ TIMESTAMPTZ := (CURRENT_DATE - 6)::timestamptz;   -- integrada hace 6 días
BEGIN
  SELECT id, cantidad, pu INTO v_cc, v_cant, v_pu FROM contrato_conceptos WHERE contrato_id=p_contrato AND clave=p_clave;
  SELECT inicio, fin INTO v_ini, v_fin FROM contrato_periodos WHERE contrato_id=p_contrato AND numero=p_periodo;
  SELECT superintendente_id, residente_id, supervision_id INTO v_super, v_resid, v_superv FROM contratos WHERE id=p_contrato;
  SELECT id INTO v_fin_u FROM usuarios WHERE email='finanzas@sigecop.test';
  v_sub := ROUND(v_cant*v_pu,2); v_amort := ROUND(v_sub*0.30,2); v_ret := ROUND(v_sub*0.005,2); v_neto := v_sub - v_amort - v_ret;
  -- presentada hace 3 días → semáforo de revisión de 15 días en VERDE (no vencido).
  v_env := CASE WHEN p_estado IN ('enviada','autorizada','rechazada','pagada') THEN (CURRENT_DATE - 3)::timestamptz ELSE NULL END;

  INSERT INTO estimaciones (contrato_id,numero,periodo_inicio,periodo_fin,estado,anticipo_pct_snapshot,
                            subtotal,amortizacion,retencion,deductivas,neto,integrada_por,integrada_en,enviada_en,enviada_por)
  VALUES (p_contrato,p_numero,v_ini,v_fin,p_estado,30.00,v_sub,v_amort,v_ret,0.00,v_neto,
          v_super, v_integ, v_env, CASE WHEN v_env IS NULL THEN NULL ELSE v_super END)
  RETURNING id INTO v_id;
  INSERT INTO estimacion_generadores (estimacion_id,contrato_concepto_id,cantidad_periodo,cantidad_anterior_acum,pu_snapshot)
    VALUES (v_id,v_cc,v_cant,0.0000,v_pu);

  IF p_estado='pagada' THEN
    INSERT INTO pagos (contrato_id,estimacion_id,estimacion_ref,fecha_pago,importe,referencia,factura_cfdi,fecha_factura,registrado_por)
      VALUES (p_contrato,v_id,'EST-'||p_numero,CURRENT_DATE-1,v_neto,'SPEI-'||lpad(p_numero::text,4,'0'),'CFDI-'||lpad(p_numero::text,4,'0'),CURRENT_DATE-2,v_fin_u);
  ELSIF p_estado='rechazada' THEN
    INSERT INTO estimacion_observaciones (estimacion_id,seccion,tipo,severidad,descripcion,estado,turnado_a,autor_id)
      VALUES (v_id,'generadores','rechazo','mayor','Los números generadores no coinciden con lo ejecutado; se devuelve para corrección.','abierta','contratista',v_resid);
  ELSIF p_estado='autorizada' THEN
    INSERT INTO estimacion_observaciones (estimacion_id,seccion,tipo,severidad,descripcion,estado,turnado_a,autor_id)
      VALUES (v_id,'caratula','aclaracion','menor','Revisada por supervisión y autorizada por la residencia.','solventada','residencia',v_superv);
  END IF;
  RETURN v_id;
END $$ LANGUAGE plpgsql;

-- f_nota: asienta una nota de bitácora ya firmada (emisor según el tipo). Usa el siguiente folio.
CREATE OR REPLACE FUNCTION pg_temp.f_nota(p_bita INTEGER, p_tipo TEXT, p_contenido TEXT, p_dias_atras INTEGER, p_tag TEXT DEFAULT NULL) RETURNS VOID AS $$
DECLARE v_emisor INTEGER; v_resid INTEGER; v_super INTEGER; v_superv INTEGER; v_num INTEGER; v_nota INTEGER; v_rol TEXT;
BEGIN
  SELECT c.residente_id, c.superintendente_id, c.supervision_id INTO v_resid, v_super, v_superv
    FROM bitacora_aperturas b JOIN contratos c ON c.id=b.contrato_id WHERE b.id=p_bita;
  SELECT rol_emisor INTO v_rol FROM bitacora_nota_tipos WHERE clave=p_tipo;
  v_emisor := CASE v_rol WHEN 'superintendente' THEN v_super WHEN 'supervision' THEN v_superv ELSE v_resid END;
  SELECT COALESCE(MAX(numero),0)+1 INTO v_num FROM bitacora_notas WHERE bitacora_id=p_bita;
  INSERT INTO bitacora_notas (bitacora_id, tipo, numero, contenido, emisor_id, estado, fecha, tag)
    VALUES (p_bita, p_tipo, v_num, p_contenido, v_emisor, 'emitida', (CURRENT_DATE - p_dias_atras)::timestamptz, p_tag)
    RETURNING id INTO v_nota;
  INSERT INTO bitacora_nota_firmas (nota_id, usuario_id, rol_en_firma) VALUES
    (v_nota,v_resid,'residente'),(v_nota,v_super,'superintendente'),(v_nota,v_superv,'supervision');
END $$ LANGUAGE plpgsql;

-- f_finiquito: cierra el contrato (saldo derivado de estimaciones/pagos) + nota + estado='cerrado'.
CREATE OR REPLACE FUNCTION pg_temp.f_finiquito(p_contrato INTEGER, p_bita INTEGER) RETURNS VOID AS $$
DECLARE v_neto NUMERIC; v_pag NUMERIC; v_amort NUMERIC; v_ant NUMERIC; v_saldo NUMERIC; v_afav TEXT; v_ejec NUMERIC;
  v_resid INTEGER; v_num INTEGER; v_nota INTEGER;
BEGIN
  SELECT residente_id INTO v_resid FROM contratos WHERE id=p_contrato;
  SELECT COALESCE(SUM(neto),0), COALESCE(SUM(amortizacion),0) INTO v_neto, v_amort
    FROM estimaciones WHERE contrato_id=p_contrato AND estado IN ('autorizada','pagada');
  SELECT COALESCE(SUM(importe),0) INTO v_pag FROM pagos WHERE contrato_id=p_contrato;
  v_ant := GREATEST(0, ROUND((SELECT monto*anticipo_pct/100 FROM contratos WHERE id=p_contrato),2) - v_amort);
  v_saldo := v_neto - v_pag - v_ant;
  v_afav := CASE WHEN v_saldo > 0.005 THEN 'contratista' WHEN v_saldo < -0.005 THEN 'dependencia' ELSE 'ninguno' END;
  SELECT COALESCE(SUM(ca.cantidad*cc.pu),0) INTO v_ejec
    FROM concepto_avance ca JOIN contrato_conceptos cc ON cc.id=ca.contrato_concepto_id
    WHERE cc.contrato_id=p_contrato AND ca.estado='vigente';
  -- Nota de bitácora del finiquito (art. 64 LOPSRM; emisor = residente, art. 53).
  SELECT COALESCE(MAX(numero),0)+1 INTO v_num FROM bitacora_notas WHERE bitacora_id=p_bita;
  INSERT INTO bitacora_notas (bitacora_id, tipo, numero, contenido, emisor_id, estado, fecha, tag)
    VALUES (p_bita,'finiquito',v_num,'Finiquito de los trabajos: saldo conciliado y cierre del contrato (art. 64 LOPSRM / 170 RLOPSRM).',v_resid,'emitida',(CURRENT_DATE)::timestamptz,'finiquito')
    RETURNING id INTO v_nota;
  INSERT INTO bitacora_nota_firmas (nota_id, usuario_id, rol_en_firma)
    SELECT v_nota, usuario_id, rol_en_firma FROM bitacora_firmantes WHERE bitacora_id=p_bita;
  INSERT INTO finiquitos (contrato_id, importe_neto_aprobado, total_pagado, anticipo_no_amortizado, ajustes_finales,
                          saldo, a_favor_de, importe_real_ejecutado, observaciones, nota_id, elaborado_por)
    VALUES (p_contrato, v_neto, v_pag, v_ant, 0.00, v_saldo, v_afav, v_ejec,
            'Finiquito elaborado en la demo (todas las estimaciones pagadas).', v_nota, v_resid);
  UPDATE contratos SET estado='cerrado', cerrado_en=NOW() WHERE id=p_contrato;
END $$ LANGUAGE plpgsql;

-- =====================================================================
-- PARTE 4 — LOS 24 CONTRATOS REALISTAS (OP-2026-0001..0024). Mapa folio↔HU en docs/pruebas/MAPA_DEMO_PROFE.md
-- =====================================================================
DO $$
DECLARE v_id INTEGER; v_bita INTEGER; v_dep INTEGER; v_v1 INTEGER; v_v2 INTEGER; v_conv INTEGER; cc1 INTEGER;
BEGIN
  -- OP-0001 (HU-01 Alta): recién dado de alta, sin bitácora.
  PERFORM pg_temp.f_base('OP-2026-0001','Construcción de aulas didácticas en la Facultad de Ingeniería, UAGRO');

  -- OP-0002 (HU-02 Fianzas): + endoso + GARANTÍAS POR VENCER (rojo ~3 / ámbar ~12 / amarillo ~25 días).
  v_id := pg_temp.f_base('OP-2026-0002','Rehabilitación de la red hidrosanitaria del edificio administrativo');
  SELECT residente_id INTO v_dep FROM contratos WHERE id=v_id;
  INSERT INTO garantia_endosos (garantia_id, motivo, nueva_vigencia, observaciones, registrado_por)
    SELECT g.id,'prorroga_vigencia',CURRENT_DATE+400,'Prórroga de la fianza de cumplimiento (art. 91 RLOPSRM).',v_dep
      FROM contrato_garantias g WHERE g.contrato_id=v_id AND g.tipo='cumplimiento';
  UPDATE contrato_garantias SET vigencia=CURRENT_DATE+3  WHERE contrato_id=v_id AND tipo='anticipo';        -- rojo
  UPDATE contrato_garantias SET vigencia=CURRENT_DATE+12 WHERE contrato_id=v_id AND tipo='cumplimiento';    -- ámbar
  UPDATE contrato_garantias SET vigencia=CURRENT_DATE+25 WHERE contrato_id=v_id AND tipo='vicios_ocultos';  -- amarillo

  -- OP-0003 (HU-03 Convenios): bitácora + CONVENIO DE MONTO con versión del programa (v1 sustituida + v2 vigente).
  v_id := pg_temp.f_base('OP-2026-0003','Ampliación del laboratorio de cómputo y cableado estructurado');
  v_bita := pg_temp.f_bitacora(v_id);
  SELECT dependencia_id INTO v_dep FROM contratos WHERE id=v_id;
  -- v1: snapshot del programa ORIGINAL (queda sustituida).
  INSERT INTO programa_version (contrato_id, numero, convenio_id, monto, plazo_dias, vigente, supersedido_en)
    VALUES (v_id,1,NULL,1000000.00,90,false,NOW()) RETURNING id INTO v_v1;
  INSERT INTO programa_version_concepto (programa_version_id, clave, concepto, unidad, cantidad, pu, orden)
    SELECT v_v1, clave, concepto, unidad, cantidad, pu, orden FROM contrato_conceptos WHERE contrato_id=v_id;
  INSERT INTO programa_version_celda (programa_version_id, concepto_clave, periodo_numero, periodo_inicio, periodo_fin, cantidad)
    SELECT v_v1, cc.clave, p.numero, p.inicio, p.fin, po.cantidad
      FROM programa_obra po JOIN contrato_conceptos cc ON cc.id=po.contrato_concepto_id
                            JOIN contrato_periodos p ON p.id=po.contrato_periodo_id
     WHERE cc.contrato_id=v_id;
  -- Modificación (convenio de monto): CONC-01 sube de 1000 a 1200 m3 (+60,000) → monto 1,060,000.
  SELECT id INTO cc1 FROM contrato_conceptos WHERE contrato_id=v_id AND clave='CONC-01';
  UPDATE contrato_conceptos SET cantidad=1200.000 WHERE id=cc1;
  UPDATE programa_obra SET cantidad=1200.000 WHERE contrato_concepto_id=cc1;
  UPDATE contratos SET monto=1060000.00 WHERE id=v_id;
  -- Convenio + nota + v2 vigente (programa modificado).
  PERFORM pg_temp.f_nota(v_bita,'res_convenios','Convenio modificatorio de monto: se incrementa el volumen de terracerías (CONC-01) por condiciones del terreno (art. 59 LOPSRM).',5,'convenio');
  INSERT INTO convenios_modificatorios (contrato_id, numero, folio, tipo, fundamento, motivo, fecha,
                                        monto_anterior, monto_nuevo, delta_monto_pct, autorizado_por,
                                        nota_id)
    VALUES (v_id,1,'CM-001','monto','art59','Incremento de volumen de terracerías por condiciones del terreno.',CURRENT_DATE-5,
            1000000.00,1060000.00,6.00,v_dep,
            (SELECT id FROM bitacora_notas WHERE bitacora_id=v_bita AND tipo='res_convenios' ORDER BY numero DESC LIMIT 1))
    RETURNING id INTO v_conv;
  INSERT INTO programa_version (contrato_id, numero, convenio_id, monto, plazo_dias, vigente)
    VALUES (v_id,2,v_conv,1060000.00,90,true) RETURNING id INTO v_v2;
  INSERT INTO programa_version_concepto (programa_version_id, clave, concepto, unidad, cantidad, pu, orden)
    SELECT v_v2, clave, concepto, unidad, cantidad, pu, orden FROM contrato_conceptos WHERE contrato_id=v_id;
  INSERT INTO programa_version_celda (programa_version_id, concepto_clave, periodo_numero, periodo_inicio, periodo_fin, cantidad)
    SELECT v_v2, cc.clave, p.numero, p.inicio, p.fin, po.cantidad
      FROM programa_obra po JOIN contrato_conceptos cc ON cc.id=po.contrato_concepto_id
                            JOIN contrato_periodos p ON p.id=po.contrato_periodo_id
     WHERE cc.contrato_id=v_id;

  -- OP-0004 (HU-04 Expediente): bitácora + avance + 1 estimación pagada (algo que mostrar).
  v_id := pg_temp.f_base('OP-2026-0004','Construcción de la barda perimetral y caseta de control de acceso');
  v_bita := pg_temp.f_bitacora(v_id);
  PERFORM pg_temp.f_avance(v_id,'CONC-01',1,1000.000);
  PERFORM pg_temp.f_estim(v_id,1,'CONC-01',1,'pagada');

  -- OP-0005 (HU-05 Curva): avance al corriente (P1 verde + P2 con avance + P3 por venir ámbar) + 1 pago (curva financiera).
  v_id := pg_temp.f_base('OP-2026-0005','Pavimentación con concreto hidráulico de andadores del campus');
  v_bita := pg_temp.f_bitacora(v_id);
  PERFORM pg_temp.f_avance(v_id,'CONC-01',1,1000.000);
  PERFORM pg_temp.f_avance(v_id,'CONC-02',2,150.000);   -- parcial en el periodo en curso
  PERFORM pg_temp.f_estim(v_id,1,'CONC-01',1,'pagada'); -- para que la curva financiera no salga plana

  -- OP-0006 (HU-06 Trabajos): programa con CONC-01 repartido 600/400 entre P1 y P2 → habilita el AVISO no bloqueante.
  v_id := pg_temp.f_base('OP-2026-0006','Suministro y colocación de impermeabilizante en azoteas');
  v_bita := pg_temp.f_bitacora(v_id);
  SELECT id INTO cc1 FROM contrato_conceptos WHERE contrato_id=v_id AND clave='CONC-01';
  DELETE FROM programa_obra WHERE contrato_concepto_id=cc1;  -- re-reparte CONC-01: 600 en P1, 400 en P2
  INSERT INTO programa_obra (contrato_concepto_id, contrato_periodo_id, cantidad)
    SELECT cc1, p.id, x.c FROM (VALUES (1,600.000),(2,400.000)) AS x(per,c)
      JOIN contrato_periodos p ON p.contrato_id=v_id AND p.numero=x.per;
  PERFORM pg_temp.f_avance(v_id,'CONC-01',1,500.000);   -- avance parcial (deja margen para registrar más / ver aviso)

  -- OP-0007 (HU-07 Atraso): bitácora + avance MUY bajo en el periodo en curso → déficit real.
  v_id := pg_temp.f_base('OP-2026-0007','Construcción de la subestación eléctrica y acometida');
  v_bita := pg_temp.f_bitacora(v_id);
  PERFORM pg_temp.f_avance(v_id,'CONC-01',1,150.000);   -- programado 1000, ejecutado 150 → déficit

  -- OP-0008 (HU-08 Apertura): SIN bitácora (listo para abrirla en vivo).
  PERFORM pg_temp.f_base('OP-2026-0008','Habilitación de aula magna y sistema audiovisual');

  -- OP-0009 (HU-09 Notas): bitácora firmada + NOTAS VARIADAS (avance, aviso, calidad).
  v_id := pg_temp.f_base('OP-2026-0009','Construcción de sanitarios y módulo de regaderas');
  v_bita := pg_temp.f_bitacora(v_id);
  PERFORM pg_temp.f_nota(v_bita,'avance','Se concluye la terracería de CONC-01 al 100%; inicia cimentación.',40,'avance');
  PERFORM pg_temp.f_nota(v_bita,'aviso','Se solicita a la residencia la revisión del nivel de desplante por hallazgo de roca.',30,NULL);
  PERFORM pg_temp.f_nota(v_bita,'calidad','Prueba de laboratorio del concreto f''c=250: resultado conforme.',20,NULL);

  -- OP-0010 (HU-10 Consulta de notas): bitácora + nota de avance (buscador con resultados).
  v_id := pg_temp.f_base('OP-2026-0010','Rehabilitación de fachada e impermeabilización del edificio central');
  v_bita := pg_temp.f_bitacora(v_id);
  PERFORM pg_temp.f_nota(v_bita,'avance','Avance de cimentación al 60%; sin incidencias.',25,'avance');
  PERFORM pg_temp.f_nota(v_bita,'junta','Minuta de junta de obra: se acuerda reforzar el frente de cimentación.',18,NULL);

  -- OP-0011 (HU-11 Minutas/visitas): bitácora + 1 minuta + 1 visita PROGRAMADA a futuro.
  v_id := pg_temp.f_base('OP-2026-0011','Construcción de estacionamiento y obra exterior');
  v_bita := pg_temp.f_bitacora(v_id);
  SELECT residente_id INTO v_dep FROM contratos WHERE id=v_id;
  INSERT INTO minutas (contrato_id, titulo, fecha, lugar, participantes, acuerdos, registrada_por)
    VALUES (v_id,'Reunión de avance mensual',CURRENT_DATE-15,'Sala de juntas de la Residencia','Residente, Superintendente y Supervisión','Acelerar la cimentación para no afectar el periodo en curso.',v_dep);
  INSERT INTO visitas (contrato_id, tipo, fecha_programada, lugar, responsable, proposito, estado)
    VALUES (v_id,'visita',CURRENT_DATE+7,'Frente de obra — cimentación','Supervisión','Verificar armado y niveles antes del colado.','agendada');

  -- OP-0012 (HU-12 Integrar): bitácora + avance del periodo 1, SIN estimación (listo para integrar).
  v_id := pg_temp.f_base('OP-2026-0012','Construcción de cisterna y sistema de bombeo');
  v_bita := pg_temp.f_bitacora(v_id);
  PERFORM pg_temp.f_avance(v_id,'CONC-01',1,1000.000);

  -- OP-0013 (HU-13 Presentar): estimación #1 INTEGRADA (lista para presentar).
  v_id := pg_temp.f_base('OP-2026-0013','Construcción de comedor universitario y cocina');
  v_bita := pg_temp.f_bitacora(v_id);
  PERFORM pg_temp.f_avance(v_id,'CONC-01',1,1000.000);
  PERFORM pg_temp.f_estim(v_id,1,'CONC-01',1,'integrada');

  -- OP-0014 (HU-14 Historial): #1 pagada, #2 autorizada, #3 presentada.
  v_id := pg_temp.f_base('OP-2026-0014','Construcción de biblioteca y sala de lectura');
  v_bita := pg_temp.f_bitacora(v_id);
  PERFORM pg_temp.f_avance(v_id,'CONC-01',1,1000.000);
  PERFORM pg_temp.f_avance(v_id,'CONC-02',2,200.000);
  PERFORM pg_temp.f_avance(v_id,'CONC-03',3,1.000);
  PERFORM pg_temp.f_estim(v_id,1,'CONC-01',1,'pagada');
  PERFORM pg_temp.f_estim(v_id,2,'CONC-02',2,'autorizada');
  PERFORM pg_temp.f_estim(v_id,3,'CONC-03',3,'enviada');

  -- OP-0015 (HU-15 Revisión): estimación #1 PRESENTADA (enviada), esperando revisión.
  v_id := pg_temp.f_base('OP-2026-0015','Construcción de gimnasio techado y vestidores');
  v_bita := pg_temp.f_bitacora(v_id);
  PERFORM pg_temp.f_avance(v_id,'CONC-01',1,1000.000);
  PERFORM pg_temp.f_estim(v_id,1,'CONC-01',1,'enviada');

  -- OP-0016 (HU-16 Reingreso): estimación #1 RECHAZADA (lista para reingreso).
  v_id := pg_temp.f_base('OP-2026-0016','Construcción de auditorio al aire libre y foro');
  v_bita := pg_temp.f_bitacora(v_id);
  PERFORM pg_temp.f_avance(v_id,'CONC-01',1,1000.000);
  PERFORM pg_temp.f_estim(v_id,1,'CONC-01',1,'rechazada');

  -- OP-0017 (HU-17 Tablero): #1 pagada, #2 autorizada (cartera).
  v_id := pg_temp.f_base('OP-2026-0017','Construcción de centro de cómputo y servidores');
  v_bita := pg_temp.f_bitacora(v_id);
  PERFORM pg_temp.f_avance(v_id,'CONC-01',1,1000.000);
  PERFORM pg_temp.f_avance(v_id,'CONC-02',2,200.000);
  PERFORM pg_temp.f_estim(v_id,1,'CONC-01',1,'pagada');
  PERFORM pg_temp.f_estim(v_id,2,'CONC-02',2,'autorizada');

  -- OP-0018 (HU-18 Portafolio): avance al corriente (semáforo verde).
  v_id := pg_temp.f_base('OP-2026-0018','Construcción de enfermería y servicio médico universitario');
  v_bita := pg_temp.f_bitacora(v_id);
  PERFORM pg_temp.f_avance(v_id,'CONC-01',1,1000.000);
  PERFORM pg_temp.f_avance(v_id,'CONC-02',2,180.000);

  -- OP-0019 (HU-19 Reportes): bitácora + estimación pagada (datos para los 7 reportes).
  v_id := pg_temp.f_base('OP-2026-0019','Construcción de talleres de mantenimiento y almacén');
  v_bita := pg_temp.f_bitacora(v_id);
  PERFORM pg_temp.f_avance(v_id,'CONC-01',1,1000.000);
  PERFORM pg_temp.f_estim(v_id,1,'CONC-01',1,'pagada');

  -- OP-0020 (HU-20 Tránsito a pago): estimación #1 AUTORIZADA (lista para tránsito a pago).
  v_id := pg_temp.f_base('OP-2026-0020','Construcción de andén de carga y patio de maniobras');
  v_bita := pg_temp.f_bitacora(v_id);
  PERFORM pg_temp.f_avance(v_id,'CONC-01',1,1000.000);
  PERFORM pg_temp.f_estim(v_id,1,'CONC-01',1,'autorizada');

  -- OP-0021 (HU-21 Registro de pago): estimación #1 AUTORIZADA (lista para registrar el pago).
  v_id := pg_temp.f_base('OP-2026-0021','Construcción de cafetería y áreas de convivencia');
  v_bita := pg_temp.f_bitacora(v_id);
  PERFORM pg_temp.f_avance(v_id,'CONC-01',1,1000.000);
  PERFORM pg_temp.f_estim(v_id,1,'CONC-01',1,'autorizada');

  -- OP-0022 (HU-22 Roster): base + apertura SIN firmar (también demuestra "Por firmar").
  v_id := pg_temp.f_base('OP-2026-0022','Construcción de caseta de vigilancia y control vehicular');
  PERFORM pg_temp.f_bitacora(v_id, false);   -- bitácora con firmas PENDIENTES

  -- OP-0023 (HU-23 Padrón): base + apertura SIN firmar (2.º contrato para "Por firmar").
  v_id := pg_temp.f_base('OP-2026-0023','Rehabilitación de la planta de tratamiento de agua');
  PERFORM pg_temp.f_bitacora(v_id, false);

  -- OP-0024 (HU-24 Finiquito): las 3 estimaciones PAGADAS + FINIQUITO → contrato CERRADO.
  v_id := pg_temp.f_base('OP-2026-0024','Construcción del edificio de posgrado e investigación');
  v_bita := pg_temp.f_bitacora(v_id);
  PERFORM pg_temp.f_avance(v_id,'CONC-01',1,1000.000);
  PERFORM pg_temp.f_avance(v_id,'CONC-02',2,200.000);
  PERFORM pg_temp.f_avance(v_id,'CONC-03',3,1.000);
  PERFORM pg_temp.f_estim(v_id,1,'CONC-01',1,'pagada');
  PERFORM pg_temp.f_estim(v_id,2,'CONC-02',2,'pagada');
  PERFORM pg_temp.f_estim(v_id,3,'CONC-03',3,'pagada');
  PERFORM pg_temp.f_finiquito(v_id, v_bita);

  RAISE NOTICE 'SEED demo del profe: OP-2026-0001..0024 sembrados (1 cerrado, garantías por vencer, por-firmar, convenio de monto).';
END $$;

-- =====================================================================
-- PARTE 5 — TECHO PRESUPUESTAL 2026 (para que el Tránsito a pago NO se atore).
--   UNIQUE real = (ejercicio, dependencia_id, partida). INSERT guardado (idempotente, sin ON CONFLICT).
-- =====================================================================
INSERT INTO presupuesto_anual (ejercicio, dependencia, partida, techo, descripcion, dependencia_id, creado_por)
SELECT 2026, u.nombre, '62201 — Edificación no habitacional', 50000000.00,
       'Techo presupuestal del ejercicio 2026 para obra pública educativa.', u.id, u.id
  FROM usuarios u
 WHERE u.email='dependencia@sigecop.test'
   AND NOT EXISTS (SELECT 1 FROM presupuesto_anual p
                    WHERE p.ejercicio=2026 AND p.dependencia_id=u.id
                      AND p.partida='62201 — Edificación no habitacional');

-- =====================================================================
-- PARTE 6 — VERIFICACIÓN (informativa).
-- =====================================================================
SELECT 'empresas basura restantes' AS check, count(*)::text FROM empresas WHERE nombre ~ '[0-9]{6,}'
UNION ALL SELECT 'usuarios pendientes', count(*)::text FROM usuarios WHERE estado='pendiente'
UNION ALL SELECT 'contratos OP-2026', count(*)::text FROM contratos WHERE folio LIKE 'OP-2026-%'
UNION ALL SELECT 'contratos cerrados', count(*)::text FROM contratos WHERE estado='cerrado'
UNION ALL SELECT 'finiquitos', count(*)::text FROM finiquitos
UNION ALL SELECT 'techo presupuestal 2026', count(*)::text FROM presupuesto_anual WHERE ejercicio=2026
UNION ALL SELECT 'aperturas sin firmar', count(*)::text FROM bitacora_aperturas b WHERE EXISTS (SELECT 1 FROM bitacora_firmantes f WHERE f.bitacora_id=b.id AND NOT f.firmado)
UNION ALL SELECT 'versiones de programa', count(*)::text FROM programa_version;

SELECT c.folio, c.objeto, c.monto, c.estado,
       (SELECT string_agg(e.estado, ',' ORDER BY e.numero) FROM estimaciones e WHERE e.contrato_id=c.id) AS estimaciones
  FROM contratos c WHERE c.folio LIKE 'OP-2026-%' ORDER BY c.folio;
