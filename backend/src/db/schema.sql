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

-- Estado de la cuenta: las altas por auto-registro nacen 'pendiente' y no
-- pueden iniciar sesión hasta que la dependencia las aprueba ('activo').
DO $$ BEGIN
  CREATE TYPE usuario_estado AS ENUM ('pendiente', 'activo', 'rechazado');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Tabla: usuarios ------------------------------------------------------
CREATE TABLE IF NOT EXISTS usuarios (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(150) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  rol rol_usuario NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Columna de estado: idempotente y NO destructiva. El DEFAULT 'activo' hace que
-- TODOS los usuarios ya existentes (los demo + cualquier alta previa) queden
-- 'activo' y sigan logueando sin cambios. Solo los registros NUEVOS creados por
-- /api/auth/register nacen 'pendiente' (lo fijan explícitamente en el INSERT).
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS estado usuario_estado NOT NULL DEFAULT 'activo';

CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email);
CREATE INDEX IF NOT EXISTS idx_usuarios_estado ON usuarios(estado);

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
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
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
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bitacora_aperturas_contrato ON bitacora_aperturas(contrato_id);

-- Tabla: bitacora_notas -----------------------------------------------
CREATE TABLE IF NOT EXISTS bitacora_notas (
  id SERIAL PRIMARY KEY,
  bitacora_id INTEGER NOT NULL REFERENCES bitacora_aperturas(id) ON DELETE CASCADE,
  tipo tipo_nota_bitacora NOT NULL,
  contenido TEXT NOT NULL,
  emisor_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  fecha TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bitacora_notas_bitacora ON bitacora_notas(bitacora_id);
CREATE INDEX IF NOT EXISTS idx_bitacora_notas_tipo ON bitacora_notas(tipo);

-- =====================================================================
-- HU-01: persistencia completa del alta de contratos (Sprint 1)
-- Cambios ADITIVOS e idempotentes. No alteran usuarios/auth/registro salvo el
-- cambio de tipo de created_at a timestamptz (no afecta el comportamiento del
-- login: auth no lee created_at).
-- =====================================================================

-- (1) Migrar created_at/fecha 'naive' a TIMESTAMPTZ interpretando lo guardado
--     como UTC (el servidor de Postgres corre en UTC). Idempotente: solo
--     convierte si la columna aun es 'timestamp without time zone'.
DO $$ BEGIN
  IF (SELECT data_type FROM information_schema.columns
        WHERE table_name='usuarios' AND column_name='created_at') = 'timestamp without time zone' THEN
    ALTER TABLE usuarios ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC';
  END IF;
END $$;
DO $$ BEGIN
  IF (SELECT data_type FROM information_schema.columns
        WHERE table_name='contratos' AND column_name='created_at') = 'timestamp without time zone' THEN
    ALTER TABLE contratos ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC';
  END IF;
END $$;
DO $$ BEGIN
  IF (SELECT data_type FROM information_schema.columns
        WHERE table_name='bitacora_aperturas' AND column_name='created_at') = 'timestamp without time zone' THEN
    ALTER TABLE bitacora_aperturas ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC';
  END IF;
END $$;
DO $$ BEGIN
  IF (SELECT data_type FROM information_schema.columns
        WHERE table_name='bitacora_notas' AND column_name='fecha') = 'timestamp without time zone' THEN
    ALTER TABLE bitacora_notas ALTER COLUMN fecha TYPE TIMESTAMPTZ USING fecha AT TIME ZONE 'UTC';
  END IF;
END $$;
DO $$ BEGIN
  IF (SELECT data_type FROM information_schema.columns
        WHERE table_name='bitacora_notas' AND column_name='created_at') = 'timestamp without time zone' THEN
    ALTER TABLE bitacora_notas ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC';
  END IF;
END $$;

-- (2) Columnas nuevas del contrato: datos juridicos (1:1, JSONB), % de anticipo
--     escalar (lo usa HU-12) y placeholders JSONB para penalizacion/amortizacion
--     (hoy solo cajas de texto legal Art. 46 Bis / Art. 50 LOPSRM).
ALTER TABLE contratos ADD COLUMN IF NOT EXISTS datos_juridicos JSONB;
ALTER TABLE contratos ADD COLUMN IF NOT EXISTS anticipo_pct NUMERIC(5,2);
ALTER TABLE contratos ADD COLUMN IF NOT EXISTS penalizacion JSONB;
ALTER TABLE contratos ADD COLUMN IF NOT EXISTS amortizacion JSONB;
DO $$ BEGIN
  ALTER TABLE contratos ADD CONSTRAINT chk_contratos_anticipo_pct
    CHECK (anticipo_pct IS NULL OR (anticipo_pct >= 0 AND anticipo_pct <= 100));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- (3) Catalogo de conceptos. Normalizado: HU-06/HU-12 lo consultan por fila para
--     validar cantidad ejecutada <= contratada (art. 118 RLOPSRM). El importe no
--     se guarda (es cantidad*pu, derivado).
CREATE TABLE IF NOT EXISTS contrato_conceptos (
  id SERIAL PRIMARY KEY,
  contrato_id INTEGER NOT NULL REFERENCES contratos(id) ON DELETE CASCADE,
  orden INTEGER NOT NULL,
  concepto TEXT NOT NULL,
  unidad VARCHAR(20) NOT NULL,
  cantidad NUMERIC(14,3) NOT NULL CHECK (cantidad >= 0),
  pu NUMERIC(14,2) NOT NULL CHECK (pu >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (contrato_id, orden)
);
CREATE INDEX IF NOT EXISTS idx_contrato_conceptos_contrato ON contrato_conceptos(contrato_id);

-- (4) Programa de obra. Alimenta la curva S de HU-05. Fechas DATE (sin corrimiento).
CREATE TABLE IF NOT EXISTS contrato_actividades (
  id SERIAL PRIMARY KEY,
  contrato_id INTEGER NOT NULL REFERENCES contratos(id) ON DELETE CASCADE,
  orden INTEGER NOT NULL,
  actividad TEXT NOT NULL,
  inicio DATE NOT NULL,
  termino DATE NOT NULL,
  peso NUMERIC(5,2) NOT NULL CHECK (peso >= 0 AND peso <= 100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_contrato_actividades_fechas CHECK (termino >= inicio),
  UNIQUE (contrato_id, orden)
);
CREATE INDEX IF NOT EXISTS idx_contrato_actividades_contrato ON contrato_actividades(contrato_id);

-- (5) Garantias/fianzas. HU-02 (Sprint 6) alerta por vigencia (indice por fecha).
CREATE TABLE IF NOT EXISTS contrato_garantias (
  id SERIAL PRIMARY KEY,
  contrato_id INTEGER NOT NULL REFERENCES contratos(id) ON DELETE CASCADE,
  tipo VARCHAR(40) NOT NULL,
  afianzadora VARCHAR(200),
  poliza VARCHAR(60),
  monto NUMERIC(14,2) CHECK (monto IS NULL OR monto >= 0),
  vigencia DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (contrato_id, tipo)
);
CREATE INDEX IF NOT EXISTS idx_contrato_garantias_contrato ON contrato_garantias(contrato_id);
CREATE INDEX IF NOT EXISTS idx_contrato_garantias_vigencia ON contrato_garantias(vigencia);

-- (6) PDF firmado del contrato, guardado como BYTEA en la BD (el disco de Render
--     es efimero). Se liga DESPUES de crear el contrato via POST /contratos/:id/documento.
CREATE TABLE IF NOT EXISTS contrato_documentos (
  id SERIAL PRIMARY KEY,
  contrato_id INTEGER NOT NULL REFERENCES contratos(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  mime VARCHAR(100) NOT NULL,
  tamano INTEGER NOT NULL,
  contenido BYTEA NOT NULL,
  subido_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_contrato_documentos_contrato ON contrato_documentos(contrato_id);

-- =====================================================================
-- HU-08: apertura formal de la bitacora del contrato (Sprint 1)
-- Aditivo e idempotente. No altera contratos/usuarios/auth (a contratos solo se
-- le LEE para armar el acta; aperturada_por->usuarios es SET NULL).
-- =====================================================================

-- (1) Columnas nuevas en bitacora_aperturas: instante formal inmutable (apertura_en),
--     acta JSONB (la "primera nota" congelada con los 5 grupos del art. 122 RLOPSRM)
--     y quien apertura. fecha_apertura existente se reusa como fecha de entrega del sitio.
ALTER TABLE bitacora_aperturas ADD COLUMN IF NOT EXISTS apertura_en TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE bitacora_aperturas ADD COLUMN IF NOT EXISTS acta JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE bitacora_aperturas ADD COLUMN IF NOT EXISTS aperturada_por INTEGER REFERENCES usuarios(id) ON DELETE SET NULL;

-- Una bitacora UNICA por contrato. La tabla esta vacia (el endpoint era un stub
-- 501), asi que agregar el UNIQUE es seguro. Idempotente con guard EXPLICITO sobre
-- pg_constraint: re-correr "ADD CONSTRAINT ... UNIQUE" lanza 42P07 (el indice de
-- respaldo ya existe), NO 42710, asi que un EXCEPTION WHEN duplicate_object no basta.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_bitacora_aperturas_contrato') THEN
    ALTER TABLE bitacora_aperturas ADD CONSTRAINT uq_bitacora_aperturas_contrato UNIQUE (contrato_id);
  END IF;
END $$;

-- (2) Firmantes de las tres partes (residente, supervisor externo opcional,
--     superintendente). Firma conjunta = todas las partes que aplican, firmadas.
CREATE TABLE IF NOT EXISTS bitacora_firmantes (
  id SERIAL PRIMARY KEY,
  bitacora_id INTEGER NOT NULL REFERENCES bitacora_aperturas(id) ON DELETE CASCADE,
  parte SMALLINT NOT NULL,
  titulo VARCHAR(120) NOT NULL,
  firmante VARCHAR(200),
  cargo_label VARCHAR(60),
  cargo VARCHAR(200),
  correo VARCHAR(150),
  opcional BOOLEAN NOT NULL DEFAULT false,
  aplica BOOLEAN NOT NULL DEFAULT true,
  firmado BOOLEAN NOT NULL DEFAULT false,
  firmado_en TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (bitacora_id, parte)
);
CREATE INDEX IF NOT EXISTS idx_bitacora_firmantes_bitacora ON bitacora_firmantes(bitacora_id);

-- (3) Inmutabilidad: trigger BEFORE UPDATE que rechaza cualquier cambio a una
--     apertura/firmante ya registrados. Bloquea SOLO UPDATE; el DELETE en cascada
--     (al borrar el contrato) sigue permitido. Idempotente.
CREATE OR REPLACE FUNCTION sigecop_bitacora_inalterable() RETURNS trigger AS $func$
BEGIN
  RAISE EXCEPTION 'La bitacora aperturada es un evento formal inalterable y no puede modificarse';
END;
$func$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_bitacora_aperturas_inalterable ON bitacora_aperturas;
CREATE TRIGGER trg_bitacora_aperturas_inalterable
  BEFORE UPDATE ON bitacora_aperturas
  FOR EACH ROW EXECUTE FUNCTION sigecop_bitacora_inalterable();

-- El trigger de bitacora_firmantes ya NO es bloqueo total: la seccion
-- "IDENTIDAD, FIRMA Y ACCESO" (mas abajo) lo reemplaza por una transicion
-- controlada (pendiente -> firmado) ligada a la cuenta de cada firmante.

-- =====================================================================
-- IDENTIDAD, FIRMA Y ACCESO (Sprint 1+): equipo del contrato ligado a
-- cuentas, firmas de apertura por cuenta, PDF/firmas append-only y
-- trazabilidad de aprobacion de usuarios. Aditivo e idempotente.
-- =====================================================================

-- (1) Equipo del contrato: 3 miembros ligados a cuentas de usuarios.
--     residente_id = quien crea el contrato; superintendente_id (cuenta rol
--     'contratista') obligatorio en el alta; supervision_id (cuenta rol
--     'supervision') opcional. La validacion de rol/estado la hace el
--     controller; aqui solo se referencia la cuenta (SET NULL si se borra).
ALTER TABLE contratos ADD COLUMN IF NOT EXISTS residente_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL;
ALTER TABLE contratos ADD COLUMN IF NOT EXISTS superintendente_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL;
ALTER TABLE contratos ADD COLUMN IF NOT EXISTS supervision_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_contratos_residente ON contratos(residente_id);
CREATE INDEX IF NOT EXISTS idx_contratos_superintendente ON contratos(superintendente_id);
CREATE INDEX IF NOT EXISTS idx_contratos_supervision ON contratos(supervision_id);

-- (2) Firmantes de la apertura, ligados a CUENTA (cada quien firma desde la
--     suya). usuario_id + rol_en_firma reemplazan la captura de texto libre
--     (firmante/cargo/correo quedan en desuso). UNIQUE por (apertura, cuenta).
ALTER TABLE bitacora_firmantes ADD COLUMN IF NOT EXISTS usuario_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL;
ALTER TABLE bitacora_firmantes ADD COLUMN IF NOT EXISTS rol_en_firma TEXT;
-- Los campos de texto libre previos dejan de ser obligatorios.
ALTER TABLE bitacora_firmantes ALTER COLUMN parte DROP NOT NULL;
ALTER TABLE bitacora_firmantes ALTER COLUMN titulo DROP NOT NULL;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_bitacora_firmantes_rol') THEN
    ALTER TABLE bitacora_firmantes ADD CONSTRAINT chk_bitacora_firmantes_rol
      CHECK (rol_en_firma IS NULL OR rol_en_firma IN ('residente','superintendente','supervision'));
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_bitacora_firmantes_usuario') THEN
    ALTER TABLE bitacora_firmantes ADD CONSTRAINT uq_bitacora_firmantes_usuario UNIQUE (bitacora_id, usuario_id);
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_bitacora_firmantes_usuario ON bitacora_firmantes(usuario_id);

-- (3) Inmutabilidad de firma con transicion controlada: una firma ya firmada
--     es un candado; no se puede reasignar su identidad (usuario/rol/apertura);
--     SOLO se permite la transicion pendiente(false) -> firmado(true), que hace
--     la app al firmar. Reemplaza el bloqueo total que HU-08 ponia a firmantes.
--     Bloquea UPDATE indebido; el DELETE en cascada sigue permitido.
CREATE OR REPLACE FUNCTION sigecop_firma_transicion() RETURNS trigger AS $func$
BEGIN
  IF OLD.firmado = true THEN
    RAISE EXCEPTION 'La firma ya fue registrada y es inalterable';
  END IF;
  IF NEW.usuario_id IS DISTINCT FROM OLD.usuario_id
     OR NEW.rol_en_firma IS DISTINCT FROM OLD.rol_en_firma
     OR NEW.bitacora_id IS DISTINCT FROM OLD.bitacora_id THEN
    RAISE EXCEPTION 'No se puede reasignar la identidad de una firma';
  END IF;
  IF NOT (OLD.firmado = false AND NEW.firmado = true) THEN
    RAISE EXCEPTION 'Solo se permite la transicion de pendiente a firmado';
  END IF;
  RETURN NEW;
END;
$func$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_bitacora_firmantes_inalterable ON bitacora_firmantes;
DROP TRIGGER IF EXISTS trg_bitacora_firmantes_transicion ON bitacora_firmantes;
CREATE TRIGGER trg_bitacora_firmantes_transicion
  BEFORE UPDATE ON bitacora_firmantes
  FOR EACH ROW EXECUTE FUNCTION sigecop_firma_transicion();

-- (4) PDF firmado del contrato: append-only. Bloquea UPDATE (no se reemplaza);
--     el DELETE en cascada (al borrar el contrato) sigue permitido.
CREATE OR REPLACE FUNCTION sigecop_documento_inmutable() RETURNS trigger AS $func$
BEGIN
  RAISE EXCEPTION 'El documento firmado del contrato es inmutable y no puede reemplazarse';
END;
$func$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_contrato_documentos_append_only ON contrato_documentos;
CREATE TRIGGER trg_contrato_documentos_append_only
  BEFORE UPDATE ON contrato_documentos
  FOR EACH ROW EXECUTE FUNCTION sigecop_documento_inmutable();

-- (5) Registro/aprobacion de usuarios: el rol efectivo lo asigna la dependencia
--     al aprobar. El alta solo guarda 'rol_solicitado' (referencia) y deja 'rol'
--     NULL hasta la aprobacion. aprobado_por/aprobado_en dan trazabilidad.
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS rol_solicitado TEXT;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS aprobado_por INTEGER REFERENCES usuarios(id) ON DELETE SET NULL;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS aprobado_en TIMESTAMPTZ;
-- 'rol' pasa a NULLABLE: las altas nuevas nacen sin rol efectivo. Las cuentas
-- sembradas y previas conservan su rol (este ALTER no toca datos).
ALTER TABLE usuarios ALTER COLUMN rol DROP NOT NULL;

-- =====================================================================
-- SEED MÍNIMO PARA TESTING
-- Contraseña común de los 3 usuarios demo: Sigecop2026!
-- Hashes bcrypt reales (algoritmo $2a$, cost 10) generados con bcryptjs.
-- =====================================================================

-- El hash de los 4 usuarios demo corresponde a la contraseña Sigecop2026!
-- (algoritmo $2a$, cost 10, bcryptjs). El usuario 'dependencia' es el que aprueba
-- las solicitudes de registro; nace 'activo' por el DEFAULT de la columna estado.
INSERT INTO usuarios (nombre, email, password_hash, rol) VALUES
  ('Ing. Residente Demo', 'residente@sigecop.test', '$2a$10$n4rhCkjJeeKM0GPpL8lUbenEoUFhckkQRHnui1SYG6z6/PbM.7qBy', 'residente'),
  ('Contratista Demo S.A.', 'contratista@sigecop.test', '$2a$10$h7eLpWBwF5O3smp/egT3wupSylCFRXlwQQIeHbnvCdJOmM5xAhdgK', 'contratista'),
  ('Supervisión Externa Demo', 'supervision@sigecop.test', '$2a$10$zpUoEVcL3IZhAtpS4kexoemneAaX93X7.A3kbLPYOBwgw51eZC33e', 'supervision'),
  ('Dependencia Demo', 'dependencia@sigecop.test', '$2a$10$n4rhCkjJeeKM0GPpL8lUbenEoUFhckkQRHnui1SYG6z6/PbM.7qBy', 'dependencia')
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
