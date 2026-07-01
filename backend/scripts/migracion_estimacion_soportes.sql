-- MIGRACIÓN ADITIVA IDEMPOTENTE — soportes documentales por concepto de la estimación (bug #4).
-- Registro para que Maiki lo pliegue a schema.sql (autor único). El controller
-- estimacion-soportes.controller.js la asegura vía ensureSchema() en tiempo de ejecución (no toca schema.sql).
-- Probar 2-3× en local: la 2ª pasada debe ser NO-OP (IF NOT EXISTS).

CREATE TABLE IF NOT EXISTS estimacion_soportes_concepto (
  id                    SERIAL PRIMARY KEY,
  estimacion_id         INTEGER NOT NULL REFERENCES estimaciones(id) ON DELETE CASCADE,
  contrato_concepto_id  INTEGER REFERENCES contrato_conceptos(id) ON DELETE SET NULL,
  nombre                TEXT NOT NULL,
  descripcion           TEXT,
  tipo                  VARCHAR(20) NOT NULL,   -- pdf | xlsx | xls | csv | txt | imagen | archivo
  mime                  TEXT,
  tamano                INTEGER,
  contenido             BYTEA NOT NULL,         -- inline (Render efímero; la BD persiste)
  subido_por            INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_est_soportes_estimacion ON estimacion_soportes_concepto(estimacion_id);
CREATE INDEX IF NOT EXISTS idx_est_soportes_concepto   ON estimacion_soportes_concepto(contrato_concepto_id);
