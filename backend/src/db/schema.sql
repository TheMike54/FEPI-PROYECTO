-- =====================================================================
-- SIGECOP - Schema inicial (Sprint 0)
-- Sistema de Gestión Técnico-Administrativa de Contratos de Obra Pública
-- =====================================================================

-- ENUMs ---------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE rol_usuario AS ENUM ('residente', 'contratista', 'supervision', 'dependencia', 'finanzas');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE tipo_nota_bitacora AS ENUM ('instruccion', 'acuerdo', 'solicitud', 'confirmacion', 'respuesta');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Tabla: usuarios ------------------------------------------------------
CREATE TABLE IF NOT EXISTS usuarios (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(150) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  rol rol_usuario NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email);

-- Tabla: contratos -----------------------------------------------------
CREATE TABLE IF NOT EXISTS contratos (
  id SERIAL PRIMARY KEY,
  folio VARCHAR(50) NOT NULL UNIQUE,
  tipo VARCHAR(80),
  objeto TEXT,
  contratista VARCHAR(200),
  dependencia VARCHAR(200),
  monto NUMERIC(14, 2),
  plazo_dias INTEGER,
  fecha_inicio DATE,
  fecha_termino DATE,
  pdf_path TEXT,
  created_by INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contratos_folio ON contratos(folio);
CREATE INDEX IF NOT EXISTS idx_contratos_created_by ON contratos(created_by);

-- Tabla: bitacora_aperturas -------------------------------------------
CREATE TABLE IF NOT EXISTS bitacora_aperturas (
  id SERIAL PRIMARY KEY,
  contrato_id INTEGER NOT NULL REFERENCES contratos(id) ON DELETE CASCADE,
  parte_1_firmante VARCHAR(200),
  parte_2_firmante VARCHAR(200),
  parte_3_firmante VARCHAR(200),
  fecha_apertura DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bitacora_aperturas_contrato ON bitacora_aperturas(contrato_id);

-- Tabla: bitacora_notas -----------------------------------------------
CREATE TABLE IF NOT EXISTS bitacora_notas (
  id SERIAL PRIMARY KEY,
  bitacora_id INTEGER NOT NULL REFERENCES bitacora_aperturas(id) ON DELETE CASCADE,
  tipo tipo_nota_bitacora NOT NULL,
  contenido TEXT NOT NULL,
  emisor_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  fecha TIMESTAMP NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bitacora_notas_bitacora ON bitacora_notas(bitacora_id);
CREATE INDEX IF NOT EXISTS idx_bitacora_notas_tipo ON bitacora_notas(tipo);

-- =====================================================================
-- SEED MÍNIMO PARA TESTING
-- password_hash es un placeholder; el Sprint 1 implementará bcrypt real
-- =====================================================================

INSERT INTO usuarios (nombre, email, password_hash, rol) VALUES
  ('Ing. Residente Demo', 'residente@sigecop.test', '$2a$10$PLACEHOLDER_HASH_RESIDENTE', 'residente'),
  ('Contratista Demo S.A.', 'contratista@sigecop.test', '$2a$10$PLACEHOLDER_HASH_CONTRATISTA', 'contratista'),
  ('Supervisión Externa Demo', 'supervision@sigecop.test', '$2a$10$PLACEHOLDER_HASH_SUPERVISION', 'supervision')
ON CONFLICT (email) DO NOTHING;

INSERT INTO contratos (folio, tipo, objeto, contratista, dependencia, monto, plazo_dias, fecha_inicio, fecha_termino, created_by)
SELECT
  'OP-2026-DEMO-001',
  'Obra pública (precios unitarios)',
  'Rehabilitación de pavimento - tramo demo Sprint 0',
  'Contratista Demo S.A.',
  'Secretaría de Obras Públicas (demo)',
  1500000.00,
  120,
  CURRENT_DATE,
  CURRENT_DATE + INTERVAL '120 days',
  (SELECT id FROM usuarios WHERE email = 'residente@sigecop.test')
WHERE NOT EXISTS (SELECT 1 FROM contratos WHERE folio = 'OP-2026-DEMO-001');
