-- =====================================================================
-- REVERTIR el seed de smoke de HU-13. Idempotente; no toca cuentas demo ni
-- otros contratos.
--
-- OJO con el orden (igual que HU-14): el FK estimacion_generadores.contrato_concepto_id
-- es ON DELETE NO ACTION, así que hay que borrar primero las estimaciones (que SÍ
-- cascadean a sus generadores) y recién entonces el contrato (que cascadea a conceptos).
-- =====================================================================
DELETE FROM estimaciones
 WHERE contrato_id IN (SELECT id FROM contratos WHERE folio = 'SMOKE-HU13-001');

DELETE FROM contratos WHERE folio = 'SMOKE-HU13-001';

-- Verifica que ya no quede nada.
SELECT count(*) AS contratos_smoke_restantes
  FROM contratos WHERE folio = 'SMOKE-HU13-001';
