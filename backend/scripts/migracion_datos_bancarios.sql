-- MIGRACIÓN ADITIVA IDEMPOTENTE — Oleada 4 bugs #10/#17/#18: fuente estructurada de datos bancarios del
-- contratista (los captura/valida Finanzas; la instrucción de pago los lee de aquí). Por empresa, append-only.
-- Registro para que Maiki lo pliegue a schema.sql. El controller instruccion-pago.controller.js la asegura
-- vía ensureBancarios() en tiempo de ejecución (no toca schema.sql).

CREATE TABLE IF NOT EXISTS contratista_datos_bancarios (
  id           SERIAL PRIMARY KEY,
  empresa_id   INTEGER NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  clabe        VARCHAR(18) NOT NULL,   -- 18 dígitos + dígito de control (validado server-side)
  banco        TEXT NOT NULL,
  titular      TEXT NOT NULL,
  cuenta       TEXT,
  vigente      BOOLEAN NOT NULL DEFAULT true,
  validado_por INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,  -- finanzas
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- Una sola fila VIGENTE por empresa (append-only: la anterior deja de ser vigente).
CREATE UNIQUE INDEX IF NOT EXISTS uq_datos_bancarios_vigente ON contratista_datos_bancarios(empresa_id) WHERE vigente;
