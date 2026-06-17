-- =====================================================================
-- RESET DEMO — ⚠️ DESTRUCTIVO de los DATOS DEMO (no del esquema ni de datos ajenos).
--
-- Borra SOLO el paquete de datos demo y deja la base lista para recargar el seed:
--   (A) los contratos cuyo folio empieza con 'OBRA-2026-' (los que crea seed_demo.sql) y TODOS sus
--       hijos, en ORDEN de FK (hay FKs NO ACTION que abortan el borrado del padre si su referenciador
--       sigue vivo: estimacion_generadores→contrato_conceptos, pagos→estimaciones,
--       concepto_avance/contrato_roster/convenios.nota_id→bitacora_notas).
--   (B) [OPCIONAL, comentado] artefactos del guion de prueba manual
--       (docs/GUION_PRUEBA_FUNCIONES_NUEVAS.md): contratos 'GUION-%' y cuentas 'guion.%@sigecop.test'
--       que quedaron PENDIENTES. Descoméntalo solo si corriste ese guion.
--
-- NO toca: el esquema, las 5 cuentas demo (residente@/contratista@/supervision@/dependencia@/
-- finanzas@sigecop.test), las empresas del catálogo (Dependencia/Constructora/Supervisión Externa Demo),
-- ni ningún contrato/cuenta que no empiece con esos prefijos. Idempotente y re-ejecutable.
-- Los triggers de inmutabilidad son BEFORE UPDATE: NO vetan DELETE.
--
-- Cómo correrlo (LOCAL):
--   docker exec sigecop_backend npm run reset:demo
--   -- o:  docker exec -i sigecop_db psql -U sigecop -d sigecop_db -v ON_ERROR_STOP=1 -f /app/scripts/reset_demo.sql
-- Luego recargar:  docker exec sigecop_backend npm run seed:demo
-- =====================================================================

-- (A) Contratos del seed: folio 'OBRA-2026-%'
DO $$
DECLARE ids INTEGER[]; folios TEXT;
BEGIN
  SELECT array_agg(id), string_agg(folio, ', ' ORDER BY folio)
    INTO ids, folios
    FROM contratos WHERE folio LIKE 'OBRA-2026-%';
  IF ids IS NULL THEN
    RAISE NOTICE 'reset_demo (A): no hay contratos OBRA-2026-%% que borrar.';
  ELSE
    DELETE FROM pagos WHERE contrato_id = ANY(ids);                         -- libera estimaciones
    DELETE FROM estimaciones WHERE contrato_id = ANY(ids);                  -- cascada: generadores/notas/observaciones
    DELETE FROM concepto_avance WHERE contrato_concepto_id IN
      (SELECT id FROM contrato_conceptos WHERE contrato_id = ANY(ids));     -- libera bitacora_notas
    DELETE FROM contrato_roster WHERE contrato_id = ANY(ids);              -- libera bitacora_notas
    DELETE FROM convenios_modificatorios WHERE contrato_id = ANY(ids);     -- libera bitacora_notas (nota_id NO ACTION)
    DELETE FROM contratos WHERE id = ANY(ids);                             -- cascada: el resto
    RAISE NOTICE 'reset_demo (A): % contrato(s) borrado(s): %', array_length(ids, 1), folios;
  END IF;
END $$;

-- (B) OPCIONAL — artefactos del guion de prueba manual. DESCOMENTA este bloque solo si corriste
--     docs/GUION_PRUEBA_FUNCIONES_NUEVAS.md y quieres limpiar sus contratos/cuentas de prueba.
--     Es seguro: 'GUION-%' y 'guion.%@sigecop.test' son prefijos exclusivos del guion; las cuentas
--     solo se borran si quedaron en estado 'pendiente' (nunca toca las 5 cuentas demo ni cuentas reales).
-- DO $$
-- DECLARE gids INTEGER[];
-- BEGIN
--   SELECT array_agg(id) INTO gids FROM contratos WHERE folio LIKE 'GUION-%';
--   IF gids IS NOT NULL THEN
--     DELETE FROM pagos WHERE contrato_id = ANY(gids);
--     DELETE FROM estimaciones WHERE contrato_id = ANY(gids);
--     DELETE FROM concepto_avance WHERE contrato_concepto_id IN (SELECT id FROM contrato_conceptos WHERE contrato_id = ANY(gids));
--     DELETE FROM contrato_roster WHERE contrato_id = ANY(gids);
--     DELETE FROM convenios_modificatorios WHERE contrato_id = ANY(gids);
--     DELETE FROM contratos WHERE id = ANY(gids);
--     RAISE NOTICE 'reset_demo (B): % contrato(s) GUION-%% borrado(s).', array_length(gids, 1);
--   END IF;
--   DELETE FROM usuarios WHERE email LIKE 'guion.%@sigecop.test' AND estado = 'pendiente';
--   RAISE NOTICE 'reset_demo (B): cuentas de prueba guion.%%@sigecop.test (pendientes) borradas.';
-- END $$;

-- Verificación: no deben quedar contratos demo.
SELECT
  (SELECT count(*) FROM contratos WHERE folio LIKE 'OBRA-2026-%') AS contratos_demo_restantes,
  (SELECT count(*) FROM contratos WHERE folio LIKE 'GUION-%')     AS contratos_guion_restantes;
