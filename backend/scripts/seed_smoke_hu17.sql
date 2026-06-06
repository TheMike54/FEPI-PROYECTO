-- ===========================================================================
-- SEED de smoke para HU-17 (Tablero de estimaciones). Equipo 3.
--
-- Siembra dos contratos con estimaciones en VARIOS estados para ejercitar:
--   · agregación por estado / por contrato y montos (cuadre exacto),
--   · CA-1: la rechazada NO entra al grid (sí cuenta como métrica),
--   · "Mis pendientes" por rol (estado -> rol que actúa),
--   · ACOTAMIENTO por participación (un contrato donde el equipo seed NO es parte).
--
-- Idempotente: borra primero los contratos SMK17-* (la cascada limpia sus
-- estimaciones) y reinserta. NO toca datos ajenos. Estados insertados directo,
-- igual que el seed de HU-14: el INSERT no dispara el trigger de inmutabilidad
-- (es BEFORE UPDATE). Montos cuadrados: neto = subtotal - amort - retención -
-- deductivas; aquí anticipo=0, retención = subtotal*0.005 (5 al millar, art. 191 LFD).
-- ===========================================================================

DELETE FROM contratos WHERE folio IN ('SMK17-001', 'SMK17-002');

-- Contrato 1: el equipo seed ES parte (residente/superintendente/supervisión).
INSERT INTO contratos
  (folio, tipo, objeto, contratista, dependencia, monto, plazo_dias, fecha_inicio, fecha_termino,
   created_by, residente_id, superintendente_id, supervision_id, anticipo_pct)
SELECT
  'SMK17-001', 'Obra pública (precios unitarios)', 'Tablero HU-17 — smoke (equipo es parte)',
  'Contratista Demo S.A.', 'Secretaría de Obras Públicas (demo)', 1500000.00, 150,
  DATE '2026-02-01', DATE '2026-06-30',
  r.id, r.id, c.id, s.id, 0
FROM (SELECT id FROM usuarios WHERE email = 'residente@sigecop.test')   r,
     (SELECT id FROM usuarios WHERE email = 'contratista@sigecop.test') c,
     (SELECT id FROM usuarios WHERE email = 'supervision@sigecop.test') s;

-- Contrato 2: NINGUNA cuenta operativa (residente/contratista/supervisión) es parte
-- (todos los punteros = finanzas). Sirve para probar el acotamiento: los operativos
-- NO lo ven; dependencia/finanzas (ven todo) SÍ.
INSERT INTO contratos
  (folio, tipo, objeto, contratista, dependencia, monto, plazo_dias, fecha_inicio, fecha_termino,
   created_by, residente_id, superintendente_id, supervision_id, anticipo_pct)
SELECT
  'SMK17-002', 'Obra pública (precios unitarios)', 'Tablero HU-17 — smoke (ajeno al equipo)',
  'Otra Constructora S.A.', 'Otra dependencia (demo)', 800000.00, 90,
  DATE '2026-03-01', DATE '2026-05-31',
  f.id, f.id, f.id, f.id, 0
FROM (SELECT id FROM usuarios WHERE email = 'finanzas@sigecop.test') f;

-- Estimaciones del contrato 1 (numero 1..5), una por estado del ciclo.
INSERT INTO estimaciones
  (contrato_id, numero, periodo_inicio, periodo_fin, estado, anticipo_pct_snapshot,
   subtotal, amortizacion, retencion, deductivas, neto, integrada_por, integrada_en, enviada_en, enviada_por)
SELECT
  ct.id, v.numero, v.pi, v.pf, v.estado, 0,
  v.subtotal, 0, v.retencion, 0, v.neto,
  sup.id, v.integrada_en, v.enviada_en,
  CASE WHEN v.enviada_en IS NULL THEN NULL ELSE sup.id END
FROM (SELECT id FROM contratos WHERE folio = 'SMK17-001') ct,
     (SELECT id FROM usuarios WHERE email = 'contratista@sigecop.test') sup,
     (VALUES
       (1, DATE '2026-02-01', DATE '2026-02-28', 'pagada',     200000::numeric, 1000::numeric, 199000::numeric, NOW() - INTERVAL '40 days', NULL::timestamptz),
       (2, DATE '2026-03-01', DATE '2026-03-31', 'autorizada', 150000::numeric,  750::numeric, 149250::numeric, NOW() - INTERVAL '20 days', NULL::timestamptz),
       (3, DATE '2026-04-01', DATE '2026-04-30', 'enviada',    300000::numeric, 1500::numeric, 298500::numeric, NOW() - INTERVAL '10 days', NOW() - INTERVAL '5 days'),
       (4, DATE '2026-05-01', DATE '2026-05-31', 'integrada',  100000::numeric,  500::numeric,  99500::numeric, NOW() - INTERVAL '2 days',  NULL::timestamptz),
       (5, DATE '2026-06-01', DATE '2026-06-30', 'rechazada',   80000::numeric,  400::numeric,  79600::numeric, NOW() - INTERVAL '1 days',  NULL::timestamptz)
     ) AS v(numero, pi, pf, estado, subtotal, retencion, neto, integrada_en, enviada_en);

-- Estimaciones del contrato 2 (ajeno al equipo): una integrada + una pagada.
INSERT INTO estimaciones
  (contrato_id, numero, periodo_inicio, periodo_fin, estado, anticipo_pct_snapshot,
   subtotal, amortizacion, retencion, deductivas, neto, integrada_por, integrada_en, enviada_en, enviada_por)
SELECT
  ct.id, v.numero, v.pi, v.pf, v.estado, 0,
  v.subtotal, 0, v.retencion, 0, v.neto,
  fin.id, NOW() - INTERVAL '15 days', NULL, NULL
FROM (SELECT id FROM contratos WHERE folio = 'SMK17-002') ct,
     (SELECT id FROM usuarios WHERE email = 'finanzas@sigecop.test') fin,
     (VALUES
       (1, DATE '2026-03-01', DATE '2026-03-31', 'integrada', 50000::numeric, 250::numeric, 49750::numeric),
       (2, DATE '2026-04-01', DATE '2026-04-30', 'pagada',    60000::numeric, 300::numeric, 59700::numeric)
     ) AS v(numero, pi, pf, estado, subtotal, retencion, neto);
