-- =====================================================================
-- MIGRACIÓN — Evidencia fotográfica de la estimación (art. 132 fr. IV RLOPSRM).
-- Añade el BINARIO a la tabla `estimacion_fotos` (que ya existe en schema.sql con solo metadatos).
-- ADITIVA e IDEMPOTENTE (ADD COLUMN IF NOT EXISTS): no altera ni borra nada existente.
--
-- ZONA CONGELADA: `schema.sql` lo edita SOLO Maiki. Este bloque NO lo toca: se aplica APARTE.
--   · LOCAL: ya aplicado (21-jun) para poder probar — `docker exec -i sigecop_db psql -U sigecop -d sigecop_db -f -`.
--   · RENDER: NO aplicar todavía. Va en la FASE DE BD, con backup, junto con el schema completo y el seed.
--     Maiki: integrar estas 4 columnas a `schema.sql` (junto a la tabla estimacion_fotos, líneas ~597-604) y
--     re-aplicar el schema a Render — o correr este archivo tal cual contra la DATABASE_URL de Render.
-- =====================================================================

ALTER TABLE estimacion_fotos ADD COLUMN IF NOT EXISTS mime        TEXT;
ALTER TABLE estimacion_fotos ADD COLUMN IF NOT EXISTS tamano      INTEGER;
ALTER TABLE estimacion_fotos ADD COLUMN IF NOT EXISTS contenido   BYTEA;
ALTER TABLE estimacion_fotos ADD COLUMN IF NOT EXISTS subido_por  INTEGER REFERENCES usuarios(id);

-- Verificación: las columnas nuevas deben aparecer.
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name='estimacion_fotos' ORDER BY ordinal_position;
