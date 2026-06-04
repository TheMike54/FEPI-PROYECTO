-- =====================================================================
-- REVERTIR el seed de smoke de HU-14. Idempotente; no toca cuentas demo ni
-- otros contratos.
--
-- OJO con el orden: un DELETE directo del contrato NO basta. El FK
-- estimacion_generadores.contrato_concepto_id es ON DELETE NO ACTION, así que
-- la cascada del contrato hacia contrato_conceptos choca con los generadores.
-- Hay que borrar primero las estimaciones (que SÍ cascadean a sus generadores);
-- recién entonces el borrado del contrato cascadea limpio a sus conceptos.
-- =====================================================================
DELETE FROM estimaciones
 WHERE contrato_id IN (SELECT id FROM contratos WHERE folio = 'SMOKE-HU14-001');

DELETE FROM contratos WHERE folio = 'SMOKE-HU14-001';

-- Verifica que ya no quede nada.
SELECT count(*) AS contratos_smoke_restantes
  FROM contratos WHERE folio = 'SMOKE-HU14-001';
