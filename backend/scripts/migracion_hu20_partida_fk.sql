-- ============================================================================
-- ITEM 3.1 (Oleada 3) — HU-20: partida presupuestal OBLIGATORIA + join por FK dependencia_id.
-- Fundamento: art. 24 párr. 2 LOPSRM (Última Reforma DOF 14-11-2025), verificado literal en
-- docs/legal/lopsrm.txt (líneas 774-776): "...siempre y cuando cuenten previamente con la
-- suficiencia presupuestaria en la PARTIDA O PARTIDAS ESPECÍFICAS y se sujeten al calendario de
-- gasto correspondiente." La ley ata la suficiencia a la PARTIDA específica, no a un techo genérico.
--
-- El uso de dependencia_id (FK a usuarios.id, ya existente en contratos) en vez del texto
-- contratos.dependencia es decisión de INTEGRIDAD REFERENCIAL (no legal): el texto se deriva del
-- nombre de la cuenta (contratos.controller.js: const dependencia = dep.nombre), por lo que un
-- renombre rompe el join silenciosamente. La FK es el id estable.
--
-- ADITIVA E IDEMPOTENTE. NO se edita schema.sql (congelado): Maiki replica este bloque al final de
-- schema.sql tras validar en local, y lo aplica en Render con el runbook
-- (psql --single-transaction -v ON_ERROR_STOP=1). Probar 2-3 veces en local antes de Render.
-- ============================================================================

-- 1) Columna FK estable a la dependencia (cuenta rol 'dependencia').
ALTER TABLE presupuesto_anual
  ADD COLUMN IF NOT EXISTS dependencia_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_presupuesto_anual_dependencia_id ON presupuesto_anual(dependencia_id);

-- 2) Backfill: resolver dependencia_id desde el texto (nombre de la cuenta dependencia), normalizando
--    espacios y mayúsculas (mismo criterio de comparación que el resto del sistema).
UPDATE presupuesto_anual p SET dependencia_id = u.id
  FROM usuarios u
 WHERE p.dependencia_id IS NULL
   AND u.rol = 'dependencia'
   AND lower(btrim(regexp_replace(u.nombre, '\s+', ' ', 'g'))) =
       lower(btrim(regexp_replace(p.dependencia, '\s+', ' ', 'g')));

-- 3) Partida OBLIGATORIA a nivel dato. Placeholder auditable antes del NOT NULL para no fallar con
--    datos viejos (hoy presupuesto_anual puede estar vacío; el placeholder es defensivo).
UPDATE presupuesto_anual SET partida = 'SIN_PARTIDA_MIGRACION'
 WHERE partida IS NULL OR btrim(partida) = '';
ALTER TABLE presupuesto_anual ALTER COLUMN partida SET NOT NULL;

-- 4) Mover la unicidad de (ejercicio, dependencia) a (ejercicio, dependencia_id, partida).
--    Guard sobre pg_constraint (idempotente).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_presupuesto_anual') THEN
    ALTER TABLE presupuesto_anual DROP CONSTRAINT uq_presupuesto_anual;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_presupuesto_anual_fk_partida') THEN
    ALTER TABLE presupuesto_anual
      ADD CONSTRAINT uq_presupuesto_anual_fk_partida UNIQUE (ejercicio, dependencia_id, partida);
  END IF;
END $$;

-- NOTA: el ON CONFLICT del controller (crearPresupuesto) pasa a (ejercicio, dependencia_id, partida);
-- el texto `dependencia` se conserva DENORMALIZADO (para listados/legacy). Etapa 1 mantiene el
-- invariante de 1 partida por (ejercicio, dependencia); multi-partida real por contrato exigiría
-- contratos.partida_id (CONGELADO) = follow-on para Maiki.
