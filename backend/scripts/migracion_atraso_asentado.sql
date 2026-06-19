-- ============================================================================
-- FIX 1.5 (Oleada 1) — Idempotencia del asiento de ATRASO en bitácora.
-- DDL ADITIVA E IDEMPOTENTE. Va al final de schema.sql (autor único: Maiki) y se
-- aplica en Render con el runbook (--single-transaction -v ON_ERROR_STOP=1).
-- Aquí, como migración aparte, para probar en local sin tocar schema.sql.
--
-- Problema: asentarAtraso (alertas.controller) podía generar la MISMA nota de atraso
-- (concepto, periodo) varias veces → bitácora con consecuencias duplicadas. El registro
-- de bitácora es append-only (art. 123 RLOPSRM): un solo asiento por (concepto, periodo).
-- ============================================================================

CREATE TABLE IF NOT EXISTS atraso_asentado (
  id                   SERIAL PRIMARY KEY,
  contrato_concepto_id INTEGER NOT NULL REFERENCES contrato_conceptos(id) ON DELETE CASCADE,
  periodo_numero       INTEGER NOT NULL,                       -- número del periodo del contrato; 0 = ninguno arrancó
  nota_id              INTEGER REFERENCES bitacora_notas(id) ON DELETE NO ACTION,
  asentado_por         INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Idempotencia: un solo asiento de atraso por (concepto, periodo). El INSERT que lo viole recibe 23505 → 409.
CREATE UNIQUE INDEX IF NOT EXISTS uq_atraso_asentado
  ON atraso_asentado (contrato_concepto_id, periodo_numero);
CREATE INDEX IF NOT EXISTS idx_atraso_asentado_nota ON atraso_asentado(nota_id);
