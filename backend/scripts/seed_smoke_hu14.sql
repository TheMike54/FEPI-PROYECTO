-- =====================================================================
-- SEED LOCAL para smoke de HU-14 (Equipo 3) — NO es parte de schema.sql.
-- Script aparte, idempotente y re-ejecutable. Crea lo MÍNIMO para ver el
-- historial: 1 contrato con equipo (incl. superintendente) + 1 estimación
-- en estado 'integrada' (con integrada_en/por), más 1 concepto y su generador
-- para que la estimación sea coherente.
--
-- Reusa cuentas DEMO existentes (no crea credenciales):
--   · created_by / residente_id   = 1  (Ing. Residente Demo)
--   · superintendente_id          = 2  (Contratista Demo S.A.) — el superintendente
--                                       es una cuenta de rol 'contratista' (regla HU-12)
--   · supervision_id              = 3  (Supervisión Externa Demo)
--   · integrada_por               = 2  (el superintendente integra)
--
-- Respeta los NOT NULL/CHECK reales y los triggers de inmutabilidad:
--   · estimaciones / estimacion_generadores: trigger es BEFORE UPDATE → este script
--     solo hace INSERT (nunca UPDATE de esas filas), así no lo dispara.
--   · contratos no tiene trigger de inmutabilidad → el UPDATE de re-ejecución es seguro.
-- Carátula consistente con la fórmula server-side de HU-12:
--   subtotal     = ROUND(50 × 1000, 2)        = 50000.00
--   amortización = ROUND(50000 × 30/100, 2)   = 15000.00   (anticipo 30%)
--   retención    = ROUND(50000 × 0.005, 2)    =   250.00   (5 al millar, art. 191 LFD)
--   neto         = 50000 − 15000 − 250 − 0    = 34750.00
-- =====================================================================
DO $$
DECLARE
  v_resid   INTEGER := 1;
  v_super   INTEGER := 2;
  v_superv  INTEGER := 3;
  v_contrato_id   INTEGER;
  v_concepto_id   INTEGER;
  v_estimacion_id INTEGER;
BEGIN
  -- (1) Contrato (idempotente por folio). Si ya existe, asegura equipo y anticipo.
  SELECT id INTO v_contrato_id FROM contratos WHERE folio = 'SMOKE-HU14-001';
  IF v_contrato_id IS NULL THEN
    INSERT INTO contratos (folio, tipo, objeto, contratista, dependencia, monto, plazo_dias,
                           fecha_inicio, fecha_termino, anticipo_pct, created_by,
                           residente_id, superintendente_id, supervision_id)
    VALUES ('SMOKE-HU14-001', 'Obra pública', 'Contrato semilla para smoke HU-14',
            'Contratista Demo S.A.', 'Dependencia Demo', 100000.00, 90,
            DATE '2026-01-01', DATE '2026-03-31', 30.00, v_resid,
            v_resid, v_super, v_superv)
    RETURNING id INTO v_contrato_id;
  ELSE
    UPDATE contratos
       SET residente_id = v_resid, superintendente_id = v_super,
           supervision_id = v_superv, anticipo_pct = 30.00
     WHERE id = v_contrato_id;
  END IF;

  -- (2) Concepto del catálogo (idempotente por contrato_id + orden).
  SELECT id INTO v_concepto_id FROM contrato_conceptos
   WHERE contrato_id = v_contrato_id AND orden = 1;
  IF v_concepto_id IS NULL THEN
    INSERT INTO contrato_conceptos (contrato_id, orden, concepto, unidad, cantidad, pu)
    VALUES (v_contrato_id, 1, 'Concepto semilla (smoke HU-14)', 'm3', 100.000, 1000.00)
    RETURNING id INTO v_concepto_id;
  END IF;

  -- (3) Estimación integrada (idempotente por contrato_id + numero).
  SELECT id INTO v_estimacion_id FROM estimaciones
   WHERE contrato_id = v_contrato_id AND numero = 1;
  IF v_estimacion_id IS NULL THEN
    INSERT INTO estimaciones (contrato_id, numero, periodo_inicio, periodo_fin, estado,
                              anticipo_pct_snapshot, subtotal, amortizacion, retencion,
                              deductivas, neto, integrada_por, integrada_en)
    VALUES (v_contrato_id, 1, DATE '2026-01-01', DATE '2026-01-31', 'integrada',
            30.00, 50000.00, 15000.00, 250.00, 0.00, 34750.00, v_super, NOW())
    RETURNING id INTO v_estimacion_id;

    -- (4) Generador del periodo (solo en la creación; INSERT no dispara el trigger).
    INSERT INTO estimacion_generadores (estimacion_id, contrato_concepto_id,
                                        cantidad_periodo, cantidad_anterior_acum, pu_snapshot)
    VALUES (v_estimacion_id, v_concepto_id, 50.0000, 0.0000, 1000.00);
  END IF;

  RAISE NOTICE 'SEED HU-14 listo: contrato_id=%, concepto_id=%, estimacion_id=%',
    v_contrato_id, v_concepto_id, v_estimacion_id;
END $$;

-- Verificación rápida de lo sembrado.
SELECT c.id AS contrato_id, c.folio, c.residente_id, c.superintendente_id, c.supervision_id,
       e.id AS estimacion_id, e.numero, e.estado, e.neto, e.integrada_por, e.integrada_en
  FROM contratos c
  JOIN estimaciones e ON e.contrato_id = c.id
 WHERE c.folio = 'SMOKE-HU14-001'
 ORDER BY e.numero;
