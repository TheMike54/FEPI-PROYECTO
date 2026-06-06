-- =====================================================================
-- SEED LOCAL para smoke de HU-03 (Convenios modificatorios, Fundación) — NO es
-- parte de schema.sql. Script aparte, idempotente y RE-EJECUTABLE.
--
-- Crea lo mínimo para el ciclo de convenio de PLAZO + lectura de versiones:
--   · 1 contrato SMOKE-HU03-001 con equipo (residente/superintendente/supervisión)
--     · plazo_dias = 180, monto = 100000.00 (= Σ cant×pu del catálogo)
--   · catálogo de 2 conceptos CON clave (CONC-01: 100×600, CONC-02: 50×800)
--   · 2 periodos (Ene/Feb 2026) + programa_obra que cuadra al 100% por concepto
--   · 1 versión v1 del programa (snapshot ORIGINAL, convenio_id NULL, vigente) +
--     sus snapshots de catálogo y celdas — en producción la crea perezosamente el
--     primer convenio que toca el programa; aquí se siembra para EJERCITAR la lectura
--     (GET /convenios/version/:id) ya en la Fase 1 (que solo crea convenios de plazo).
--
-- RE-EJECUTABLE: si el contrato ya existe, RESETEA plazo/monto/equipo y BORRA los
-- convenios y las versiones (un convenio de plazo de una corrida previa mutó el plazo
-- y dejó una fila inmutable). Así la precondición "plazo 180, sin convenios, v1 vigente"
-- se restablece. El borrado es válido: el trigger de inmutabilidad es BEFORE UPDATE
-- (no veta DELETE); corregir un convenio sigue siendo "convenio nuevo" en la app.
--
-- Reusa cuentas DEMO existentes (no crea credenciales): residente/contratista
-- (superintendente)/supervisión, RESUELTAS POR EMAIL (no por id posicional). La regla de
-- creación del backend es rol='dependencia' OR residente_id OR created_by → dependencia@
-- sigecop.test crea; el residente (parte) entra en SOLO-CONSULTA por permisos.js (HU-03
-- residente='C').
-- =====================================================================
DO $$
DECLARE
  v_resid   INTEGER;
  v_super   INTEGER;
  v_superv  INTEGER;
  v_contrato_id  INTEGER;
  v_c1 INTEGER;
  v_c2 INTEGER;
  v_p1 INTEGER;
  v_p2 INTEGER;
  v_ver INTEGER;
BEGIN
  -- (0) Resuelve las cuentas demo POR EMAIL: el e2e loguea por email y el acceso compara
  --     contra usuarios.id (esParteOSupervision); amarrar por email — no por id 1/2/3 —
  --     evita que un reorden del seed de cuentas apunte el contrato a usuarios equivocados.
  SELECT id INTO v_resid  FROM usuarios WHERE email = 'residente@sigecop.test';
  SELECT id INTO v_super  FROM usuarios WHERE email = 'contratista@sigecop.test';
  SELECT id INTO v_superv FROM usuarios WHERE email = 'supervision@sigecop.test';
  IF v_resid IS NULL OR v_super IS NULL OR v_superv IS NULL THEN
    RAISE EXCEPTION 'Cuentas demo (residente/contratista/supervision) ausentes; corre el seed de schema.sql primero';
  END IF;

  -- (1) Contrato (idempotente por folio). Si ya existe, RESETEA la precondición.
  SELECT id INTO v_contrato_id FROM contratos WHERE folio = 'SMOKE-HU03-001';
  IF v_contrato_id IS NULL THEN
    INSERT INTO contratos (folio, tipo, objeto, contratista, dependencia, monto, plazo_dias,
                           fecha_inicio, fecha_termino, anticipo_pct, created_by,
                           residente_id, superintendente_id, supervision_id)
    VALUES ('SMOKE-HU03-001', 'Obra pública', 'Contrato semilla para smoke HU-03 (convenios)',
            'Contratista Demo S.A.', 'Dependencia Demo', 100000.00, 180,
            DATE '2026-01-01', DATE '2026-06-30', 0.00, v_resid,
            v_resid, v_super, v_superv)
    RETURNING id INTO v_contrato_id;
  ELSE
    UPDATE contratos
       SET monto = 100000.00, plazo_dias = 180,
           fecha_inicio = DATE '2026-01-01', fecha_termino = DATE '2026-06-30',
           residente_id = v_resid, superintendente_id = v_super, supervision_id = v_superv
     WHERE id = v_contrato_id;
  END IF;

  -- (2) Catálogo: 2 conceptos CON clave (idempotente por contrato_id + orden).
  SELECT id INTO v_c1 FROM contrato_conceptos WHERE contrato_id = v_contrato_id AND orden = 1;
  IF v_c1 IS NULL THEN
    INSERT INTO contrato_conceptos (contrato_id, clave, orden, concepto, unidad, cantidad, pu)
    VALUES (v_contrato_id, 'CONC-01', 1, 'Excavación (smoke HU-03)', 'm3', 100.000, 600.00)
    RETURNING id INTO v_c1;
  ELSE
    UPDATE contrato_conceptos SET clave='CONC-01', concepto='Excavación (smoke HU-03)',
           unidad='m3', cantidad=100.000, pu=600.00 WHERE id = v_c1;
  END IF;

  SELECT id INTO v_c2 FROM contrato_conceptos WHERE contrato_id = v_contrato_id AND orden = 2;
  IF v_c2 IS NULL THEN
    INSERT INTO contrato_conceptos (contrato_id, clave, orden, concepto, unidad, cantidad, pu)
    VALUES (v_contrato_id, 'CONC-02', 2, 'Relleno compactado (smoke HU-03)', 'm3', 50.000, 800.00)
    RETURNING id INTO v_c2;
  ELSE
    UPDATE contrato_conceptos SET clave='CONC-02', concepto='Relleno compactado (smoke HU-03)',
           unidad='m3', cantidad=50.000, pu=800.00 WHERE id = v_c2;
  END IF;

  -- (3) Periodos del ciclo (idempotente por contrato_id + numero).
  SELECT id INTO v_p1 FROM contrato_periodos WHERE contrato_id = v_contrato_id AND numero = 1;
  IF v_p1 IS NULL THEN
    INSERT INTO contrato_periodos (contrato_id, numero, inicio, fin)
    VALUES (v_contrato_id, 1, DATE '2026-01-01', DATE '2026-01-31') RETURNING id INTO v_p1;
  END IF;
  SELECT id INTO v_p2 FROM contrato_periodos WHERE contrato_id = v_contrato_id AND numero = 2;
  IF v_p2 IS NULL THEN
    INSERT INTO contrato_periodos (contrato_id, numero, inicio, fin)
    VALUES (v_contrato_id, 2, DATE '2026-02-01', DATE '2026-02-28') RETURNING id INTO v_p2;
  END IF;

  -- (4) programa_obra: celdas que CUADRAN al 100% por concepto (Σ planeado = contratado).
  --     CONC-01 (100): P1=60 + P2=40.   CONC-02 (50): P1=20 + P2=30.
  INSERT INTO programa_obra (contrato_concepto_id, contrato_periodo_id, cantidad) VALUES
    (v_c1, v_p1, 60.000), (v_c1, v_p2, 40.000),
    (v_c2, v_p1, 20.000), (v_c2, v_p2, 30.000)
  ON CONFLICT (contrato_concepto_id, contrato_periodo_id) DO UPDATE SET cantidad = EXCLUDED.cantidad;

  -- (5) RESET de convenios/versiones (re-runnable). Borra versiones primero (su FK
  --     convenio_id es NO ACTION) y luego los convenios; deja el plazo ya reseteado en (1).
  DELETE FROM programa_version WHERE contrato_id = v_contrato_id;
  DELETE FROM convenios_modificatorios WHERE contrato_id = v_contrato_id;

  -- (6) Snapshot v1 del programa (ORIGINAL). En producción lo crea el 1.er convenio que
  --     toca el programa; aquí se siembra para que la lectura de versiones tenga dato.
  INSERT INTO programa_version (contrato_id, numero, convenio_id, monto, plazo_dias, vigente)
  VALUES (v_contrato_id, 1, NULL, 100000.00, 180, true) RETURNING id INTO v_ver;

  INSERT INTO programa_version_concepto (programa_version_id, clave, concepto, unidad, cantidad, pu, orden)
  SELECT v_ver, clave, concepto, unidad, cantidad, pu, orden
    FROM contrato_conceptos WHERE contrato_id = v_contrato_id ORDER BY orden;

  INSERT INTO programa_version_celda (programa_version_id, concepto_clave, periodo_numero, periodo_inicio, periodo_fin, cantidad)
  SELECT v_ver, cc.clave, cp.numero, cp.inicio, cp.fin, po.cantidad
    FROM programa_obra po
    JOIN contrato_conceptos cc ON cc.id = po.contrato_concepto_id
    JOIN contrato_periodos  cp ON cp.id = po.contrato_periodo_id
   WHERE cc.contrato_id = v_contrato_id;

  RAISE NOTICE 'SEED HU-03 listo: contrato_id=%, conceptos=[%,%], periodos=[%,%], version_v1=%',
    v_contrato_id, v_c1, v_c2, v_p1, v_p2, v_ver;
END $$;

-- Verificación rápida de lo sembrado.
SELECT c.id AS contrato_id, c.folio, c.plazo_dias, c.monto,
       (SELECT count(*) FROM convenios_modificatorios cm WHERE cm.contrato_id = c.id) AS convenios,
       (SELECT count(*) FROM programa_version pv WHERE pv.contrato_id = c.id) AS versiones
  FROM contratos c
 WHERE c.folio = 'SMOKE-HU03-001';
