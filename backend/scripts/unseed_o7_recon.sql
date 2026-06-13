-- =====================================================================
-- REVERTIR los contratos que crea el spec o7-flujo-estimacion (folios
-- E2E-RECON-<ts>-<rand>). Idempotente; no toca cuentas demo ni otros
-- contratos. Se ejecuta en el afterAll del spec para que la BD de prueba
-- NO acumule rechazadas/contratos entre corridas (espejo del unseed de
-- hu-14/hu-17).
--
-- ORDEN (importa por las FKs):
--   1) pagos: pagos.estimacion_id es ON DELETE NO ACTION -> hay que borrar
--      los pagos antes que las estimaciones a las que apuntan.
--   2) estimaciones: cascadean a sus generadores/observaciones/notas/fotos.
--      (un DELETE directo del contrato NO basta: estimacion_generadores.
--      contrato_concepto_id es NO ACTION y choca con la cascada hacia
--      contrato_conceptos).
--   3) contratos: recién ahora cascadea limpio a conceptos/programa/etc.
-- =====================================================================
DELETE FROM pagos
 WHERE contrato_id IN (SELECT id FROM contratos WHERE folio LIKE 'E2E-RECON-%');

DELETE FROM estimaciones
 WHERE contrato_id IN (SELECT id FROM contratos WHERE folio LIKE 'E2E-RECON-%');

DELETE FROM contratos WHERE folio LIKE 'E2E-RECON-%';

-- Verifica que ya no quede nada.
SELECT count(*) AS contratos_recon_restantes
  FROM contratos WHERE folio LIKE 'E2E-RECON-%';
