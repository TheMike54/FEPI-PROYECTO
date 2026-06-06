-- Revierte el seed de smoke de HU-17. La cascada de contratos elimina sus
-- estimaciones (estimaciones.contrato_id ON DELETE CASCADE). Idempotente.
DELETE FROM contratos WHERE folio IN ('SMK17-001', 'SMK17-002');
