-- MIGRACIÓN ADITIVA IDEMPOTENTE — Oleada 3 bug #13: separación de funciones en convenios.
-- Persiste QUIÉN registró el convenio para impedir que la misma persona lo autorice.
-- Registro para que Maiki lo pliegue a schema.sql. El controller convenios.controller.js la asegura vía
-- ensureRegistradoPor() en tiempo de ejecución (no toca schema.sql). Legacy (NULL) = sin bloqueo.

ALTER TABLE convenios_modificatorios
  ADD COLUMN IF NOT EXISTS registrado_por INTEGER REFERENCES usuarios(id) ON DELETE SET NULL;
