-- ============================================================================
-- ITEM 3.3 (Oleada 3) — concepto_avance APPEND-ONLY (art. 123 fr. VI/VII/VIII RLOPSRM).
-- La bitácora y los datos que la respaldan son inmutables: corregir = registro NUEVO vinculado, nunca
-- editar/borrar. DDL ADITIVA E IDEMPOTENTE. NO se edita schema.sql; Maiki la replica + Render.
-- Espejo de sigecop_nota_inmutable (schema.sql). Aplicar local y luego con el runbook.
-- ============================================================================

ALTER TABLE concepto_avance ADD COLUMN IF NOT EXISTS estado      TEXT NOT NULL DEFAULT 'vigente';
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_concepto_avance_estado') THEN
    ALTER TABLE concepto_avance ADD CONSTRAINT chk_concepto_avance_estado CHECK (estado IN ('vigente','anulada'));
  END IF;
END $$;
ALTER TABLE concepto_avance ADD COLUMN IF NOT EXISTS reemplaza_a INTEGER REFERENCES concepto_avance(id) ON DELETE NO ACTION;
ALTER TABLE concepto_avance ADD COLUMN IF NOT EXISTS anulada_por INTEGER REFERENCES usuarios(id) ON DELETE SET NULL;
ALTER TABLE concepto_avance ADD COLUMN IF NOT EXISTS anulada_en  TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_concepto_avance_reemplaza ON concepto_avance(reemplaza_a);

-- Trigger de inmutabilidad: la ÚNICA mutación permitida es vigente -> anulada (sin tocar los datos del
-- avance: cantidad/concepto/periodo/nota). Cualquier otro UPDATE se rechaza. La corrección se hace con un
-- INSERT nuevo (reemplaza_a), no editando la fila.
CREATE OR REPLACE FUNCTION sigecop_avance_inmutable() RETURNS trigger AS $$
BEGIN
  -- Caso A: ANULACIÓN (corrección) — vigente→anulada, sin tocar los datos del avance.
  IF OLD.estado = 'vigente' AND NEW.estado = 'anulada'
     AND NEW.cantidad = OLD.cantidad
     AND NEW.contrato_concepto_id = OLD.contrato_concepto_id
     AND NEW.contrato_periodo_id IS NOT DISTINCT FROM OLD.contrato_periodo_id
     AND NEW.nota_id IS NOT DISTINCT FROM OLD.nota_id THEN
    RETURN NEW; -- anulación permitida (solo marca estado + anulada_por/anulada_en)
  END IF;
  -- Caso B: asentar la NOTA DIFERIDA — la fila sigue vigente; solo se liga su nota (nota_id NULL→valor),
  -- sin cambiar cantidad/concepto/periodo/estado. Es lo que hace abrirBitacora con el avance diferido.
  IF OLD.estado = 'vigente' AND NEW.estado = 'vigente'
     AND OLD.nota_id IS NULL AND NEW.nota_id IS NOT NULL
     AND NEW.cantidad = OLD.cantidad
     AND NEW.contrato_concepto_id = OLD.contrato_concepto_id
     AND NEW.contrato_periodo_id IS NOT DISTINCT FROM OLD.contrato_periodo_id THEN
    RETURN NEW; -- ligar la nota diferida permitido
  END IF;
  RAISE EXCEPTION 'concepto_avance es append-only (art. 123 fr. VI RLOPSRM): corregir = registro nuevo vinculado, no editar ni borrar (id=%)', OLD.id;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_concepto_avance_inmutable ON concepto_avance;
CREATE TRIGGER trg_concepto_avance_inmutable BEFORE UPDATE ON concepto_avance
  FOR EACH ROW EXECUTE FUNCTION sigecop_avance_inmutable();
