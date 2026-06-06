-- =====================================================================
-- REVERTIR el seed de smoke de HU-03. Idempotente; no toca cuentas demo ni
-- otros contratos.
--
-- Orden: las VERSIONES del programa referencian convenios (FK convenio_id NO ACTION),
-- así que se borran primero las versiones, luego los convenios y al final el contrato
-- (que cascadea conceptos, periodos y programa_obra). Borrar el contrato directamente
-- también funcionaría (cascada en el mismo statement), pero el orden explícito evita
-- depender del chequeo diferido del FK NO ACTION.
-- =====================================================================
DELETE FROM programa_version
 WHERE contrato_id IN (SELECT id FROM contratos WHERE folio = 'SMOKE-HU03-001');

DELETE FROM convenios_modificatorios
 WHERE contrato_id IN (SELECT id FROM contratos WHERE folio = 'SMOKE-HU03-001');

DELETE FROM contratos WHERE folio = 'SMOKE-HU03-001';

-- Verifica que ya no quede nada.
SELECT count(*) AS contratos_smoke_restantes
  FROM contratos WHERE folio = 'SMOKE-HU03-001';
