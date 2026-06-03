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
-- HU-09: emisión y respuesta de notas tipificadas de bitácora (Sprint 2)
-- Aditivo e idempotente. bitacora_notas estaba vacía y sin uso: se reemplaza el
-- ENUM rígido de 5 tipos por un CATÁLOGO de referencia (eventos del art. 125
-- RLOPSRM por rol) y se le agregan folio, asunto, vínculo, estado y firma del
-- emisor. UN emisor por nota (art. 125), NO firma conjunta de tres.
-- =====================================================================

-- (1) Catálogo de tipos = eventos del art. 125 RLOPSRM agrupados por el rol que
--     los registra (residente: autoriza/aprueba; superintendente: solicita/avisa;
--     supervisión: avance/calidad/seguridad/juntas) + apertura/cierre + 'otro'
--     (art. 125, último párrafo: cualesquiera otros relevantes). rol_emisor NULL =
--     cualquier parte del roster puede emitirlo.
CREATE TABLE IF NOT EXISTS bitacora_nota_tipos (
  clave VARCHAR(40) PRIMARY KEY,
  etiqueta VARCHAR(120) NOT NULL,
  rol_emisor VARCHAR(20),
  orden INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT chk_bitacora_nota_tipos_rol
    CHECK (rol_emisor IS NULL OR rol_emisor IN ('residente','superintendente','supervision'))
);

INSERT INTO bitacora_nota_tipos (clave, etiqueta, rol_emisor, orden) VALUES
  ('autorizacion', 'Autorización (modificaciones, estimaciones, convenios)',          'residente',       10),
  ('aprobacion',   'Aprobación (ajuste de costos, conceptos/cantidades adicionales)', 'residente',       20),
  ('apertura',     'Apertura de bitácora',                                            'residente',       30),
  ('cierre',       'Cierre de bitácora',                                              'residente',       40),
  ('solicitud',    'Solicitud (modificaciones, estimaciones, ajuste de costos)',      'superintendente', 50),
  ('aviso',        'Aviso (terminación de trabajos, atraso de pagos)',                'superintendente', 60),
  ('avance',       'Avance físico y financiero',                                      'supervision',     70),
  ('calidad',      'Resultado de pruebas de calidad',                                 'supervision',     80),
  ('seguridad',    'Seguridad, higiene y protección al ambiente',                     'supervision',     90),
  ('junta',        'Acuerdos de juntas de trabajo',                                   'supervision',    100),
  ('otro',         'Otro (evento no tipificado)',                                     NULL,             110)
ON CONFLICT (clave) DO NOTHING;

-- (2) Plazo de firma/aceptación CONFIGURABLE por contrato (art. 123 fr. III: "plazo
--     máximo para la firma de las notas... se tendrán por aceptadas una vez vencido
--     el plazo"). Días naturales; default 2 para Etapa 1 (días hábiles = futuro).
ALTER TABLE bitacora_aperturas ADD COLUMN IF NOT EXISTS plazo_firma_dias INTEGER NOT NULL DEFAULT 2;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_bitacora_aperturas_plazo') THEN
    ALTER TABLE bitacora_aperturas ADD CONSTRAINT chk_bitacora_aperturas_plazo
      CHECK (plazo_firma_dias >= 1 AND plazo_firma_dias <= 60);
  END IF;
END $$;

-- (3) bitacora_notas: catálogo en vez de ENUM + folio/asunto/vínculo/estado/firma.
--     La tabla estaba vacía, así que convertir el ENUM a texto es seguro (USING ::text).
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
              WHERE table_name='bitacora_notas' AND column_name='tipo' AND udt_name='tipo_nota_bitacora') THEN
    ALTER TABLE bitacora_notas ALTER COLUMN tipo TYPE VARCHAR(40) USING tipo::text;
  END IF;
END $$;

ALTER TABLE bitacora_notas ADD COLUMN IF NOT EXISTS numero INTEGER;
ALTER TABLE bitacora_notas ADD COLUMN IF NOT EXISTS asunto VARCHAR(200);
ALTER TABLE bitacora_notas ADD COLUMN IF NOT EXISTS vinculada_a INTEGER REFERENCES bitacora_notas(id) ON DELETE SET NULL;
ALTER TABLE bitacora_notas ADD COLUMN IF NOT EXISTS estado VARCHAR(20) NOT NULL DEFAULT 'emitida';
ALTER TABLE bitacora_notas ADD COLUMN IF NOT EXISTS firmado_en TIMESTAMPTZ;

-- FK del tipo al catálogo (tabla vacía: no hay filas que la violen).
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_bitacora_notas_tipo') THEN
    ALTER TABLE bitacora_notas ADD CONSTRAINT fk_bitacora_notas_tipo
      FOREIGN KEY (tipo) REFERENCES bitacora_nota_tipos(clave);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_bitacora_notas_estado') THEN
    ALTER TABLE bitacora_notas ADD CONSTRAINT chk_bitacora_notas_estado
      CHECK (estado IN ('emitida','anulada'));
  END IF;
END $$;

-- Folio correlativo por bitácora, sin saltos ni duplicados (art. 123 fr. V).
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_bitacora_notas_folio') THEN
    ALTER TABLE bitacora_notas ADD CONSTRAINT uq_bitacora_notas_folio UNIQUE (bitacora_id, numero);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_bitacora_notas_vinculada ON bitacora_notas(vinculada_a);

-- (4) Inmutabilidad de notas (espejo de sigecop_*): una nota 'emitida' es inalterable
--     (art. 123 fr. VI); SOLO se permite la transición emitida -> anulada (flujo de
--     anulación por error, art. 123 fr. VII). Correcciones/respuestas = notas
--     vinculadas nuevas. Bloquea UPDATE; NO se bloquea DELETE (preserva el borrado en
--     cascada del contrato); la no-eliminación se cuida en la app (sin endpoint de borrar).
CREATE OR REPLACE FUNCTION sigecop_nota_inmutable() RETURNS trigger AS $func$
BEGIN
  IF OLD.estado = 'anulada' THEN
    RAISE EXCEPTION 'La nota ya está anulada y es inalterable';
  END IF;
  IF NEW.bitacora_id IS DISTINCT FROM OLD.bitacora_id
     OR NEW.numero IS DISTINCT FROM OLD.numero
     OR NEW.tipo IS DISTINCT FROM OLD.tipo
     OR NEW.asunto IS DISTINCT FROM OLD.asunto
     OR NEW.contenido IS DISTINCT FROM OLD.contenido
     OR NEW.emisor_id IS DISTINCT FROM OLD.emisor_id
     OR NEW.vinculada_a IS DISTINCT FROM OLD.vinculada_a
     OR NEW.fecha IS DISTINCT FROM OLD.fecha
     OR NEW.firmado_en IS DISTINCT FROM OLD.firmado_en
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Una nota de bitácora es inalterable (art. 123 fr. VI RLOPSRM); use una nota vinculada para corregir';
  END IF;
  IF NOT (OLD.estado = 'emitida' AND NEW.estado = 'anulada') THEN
    RAISE EXCEPTION 'Solo se permite anular una nota emitida, no editarla';
  END IF;
  RETURN NEW;
END;
$func$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_bitacora_notas_inmutable ON bitacora_notas;
CREATE TRIGGER trg_bitacora_notas_inmutable
  BEFORE UPDATE ON bitacora_notas
  FOR EACH ROW EXECUTE FUNCTION sigecop_nota_inmutable();

-- =====================================================================
-- HU-21: registro del pago efectuado (Sprint 2, variante mínima)
-- Aditivo e idempotente. Persiste el dinero EJERCIDO (pago ya realizado).
-- estimacion_id queda NULL hasta que HU-12 persista estimaciones (CA-1b diferido);
-- el pago es inalterable (append-only) por trigger, como notas/acta/PDF.
-- =====================================================================
CREATE TABLE IF NOT EXISTS pagos (
  id                 SERIAL PRIMARY KEY,
  contrato_id        INTEGER NOT NULL REFERENCES contratos(id) ON DELETE CASCADE,
  estimacion_id      INTEGER,                                    -- FK a estimaciones cuando exista HU-12 (diferido, CA-1b); NULL por ahora
  estimacion_ref     VARCHAR(60) NOT NULL,                       -- folio/periodo de la estimación (texto, provisional)
  fecha_pago         DATE NOT NULL,                              -- día del pago efectuado
  importe            NUMERIC(14,2) NOT NULL CHECK (importe > 0), -- captura libre (transitorio); se derivará del neto autorizado en HU-12
  referencia         VARCHAR(100) NOT NULL,                      -- clave de rastreo SPEI (art. 54: medios electrónicos)
  factura_cfdi       VARCHAR(60) NOT NULL,                       -- folio fiscal CFDI (precondición del plazo, art. 54)
  fecha_factura      DATE NOT NULL,                              -- fecha de la factura (disparador del plazo de 20 días)
  fecha_autorizacion DATE,                                       -- provisional; la posee HU-20. Para derivar el plazo de 20 días
  observaciones      TEXT,
  registrado_por     INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,  -- del JWT (CA-2)
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pagos_contrato ON pagos(contrato_id);

-- Append-only: un pago registrado es inalterable (auditoría).
-- BEFORE UPDATE solamente (NO bloquear DELETE, para preservar el ON DELETE CASCADE del contrato), igual que el patrón de notas.
CREATE OR REPLACE FUNCTION sigecop_pago_inmutable() RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Un pago registrado es inalterable (registro de auditoria).';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_pago_inmutable ON pagos;
CREATE TRIGGER trg_pago_inmutable
  BEFORE UPDATE ON pagos
  FOR EACH ROW EXECUTE FUNCTION sigecop_pago_inmutable();

-- =====================================================================
-- HU-12 (Fase 1): dominio financiero — estimaciones (Sprint 3)
-- Aditivo e idempotente. La estimación es un EXPEDIENTE (art. 132 RLOPSRM):
-- carátula materializada + números generadores + notas de bitácora vinculadas
-- (art. 132 fr. I-II) + soportes/fotos (esqueleto; carga real DIFERIDA). El neto se
-- calcula server-side al integrar (fuente única de verdad) y queda CONGELADO por
-- trigger; el ESTADO sí puede AVANZAR (autorizada/pagada en HUs posteriores).
-- Activa además el FK diferido pagos.estimacion_id -> estimaciones (D12.9 / CA-1b).
-- =====================================================================

-- (1) Cabecera + carátula materializada. Un correlativo por contrato (UNIQUE). Los
--     importes se guardan YA calculados server-side: la carátula es la fuente única
--     de verdad y, una vez integrada, es inalterable (trigger más abajo).
CREATE TABLE IF NOT EXISTS estimaciones (
  id                    SERIAL PRIMARY KEY,
  contrato_id           INTEGER NOT NULL REFERENCES contratos(id) ON DELETE CASCADE,
  numero                INTEGER NOT NULL,                  -- correlativo por contrato (lo genera el controller; el UNIQUE lo blinda)
  periodo_inicio        DATE NOT NULL,
  periodo_fin           DATE NOT NULL,
  estado                VARCHAR(20) NOT NULL DEFAULT 'integrada',  -- ciclo: integrada -> enviada -> autorizada -> pagada (o rechazada); el estado puede AVANZAR
  anticipo_pct_snapshot NUMERIC(5,2)  NOT NULL,            -- % de anticipo del contrato congelado al integrar (art. 50 LOPSRM / art. 143 RLOPSRM)
  subtotal              NUMERIC(14,2) NOT NULL,            -- Σ (cantidad_periodo × pu_snapshot) de los generadores
  amortizacion          NUMERIC(14,2) NOT NULL,            -- subtotal × anticipo_pct/100 (amortización proporcional, art. 143 fr. I RLOPSRM)
  retencion             NUMERIC(14,2) NOT NULL,            -- subtotal × 0.005 (5 al millar, art. 191 LFD)
  deductivas            NUMERIC(14,2) NOT NULL DEFAULT 0,  -- captura manual en Etapa 1 (penas convencionales / retenciones a estimaciones, art. 46 Bis LOPSRM)
  neto                  NUMERIC(14,2) NOT NULL,            -- subtotal − amortizacion − retencion − deductivas (SIN IVA; cf. art. 2 fr. XIX RLOPSRM "monto ejercido sin IVA")
  integrada_por         INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,  -- del JWT (CA-1)
  integrada_en          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_estimaciones_numero    UNIQUE (contrato_id, numero),
  CONSTRAINT chk_estimaciones_periodo  CHECK (periodo_fin >= periodo_inicio),
  CONSTRAINT chk_estimaciones_estado   CHECK (estado IN ('integrada','enviada','autorizada','pagada','rechazada')),
  CONSTRAINT chk_estimaciones_anticipo CHECK (anticipo_pct_snapshot >= 0 AND anticipo_pct_snapshot <= 100),
  -- Componentes de la carátula no-negativos; el neto NO se acota por signo a
  -- propósito (en periodos atípicos las deducciones podrían igualarlo/excederlo).
  CONSTRAINT chk_estimaciones_montos   CHECK (subtotal >= 0 AND amortizacion >= 0 AND retencion >= 0 AND deductivas >= 0)
);
CREATE INDEX IF NOT EXISTS idx_estimaciones_contrato ON estimaciones(contrato_id);

-- (2) Números generadores del periodo. Snapshots (pu_snapshot, cantidad_anterior_acum)
--     para que la estimación sea inmutable aunque cambie el catálogo. El importe
--     (cantidad_periodo × pu_snapshot) es DERIVADO; no se almacena. cantidad_periodo
--     > 0: un renglón generador solo existe si el concepto tuvo avance en el periodo.
CREATE TABLE IF NOT EXISTS estimacion_generadores (
  id                     SERIAL PRIMARY KEY,
  estimacion_id          INTEGER NOT NULL REFERENCES estimaciones(id) ON DELETE CASCADE,
  -- NO ACTION (no RESTRICT): protege el snapshot ante un borrado directo del concepto
  -- sin romper la cascada del contrato (NO ACTION difiere el chequeo a fin de
  -- sentencia, cuando el generador ya cayó por la cascada de estimaciones).
  contrato_concepto_id   INTEGER NOT NULL REFERENCES contrato_conceptos(id) ON DELETE NO ACTION,
  cantidad_periodo       NUMERIC(14,4) NOT NULL CHECK (cantidad_periodo > 0),
  cantidad_anterior_acum NUMERIC(14,4) NOT NULL DEFAULT 0 CHECK (cantidad_anterior_acum >= 0),  -- acumulado previo congelado (base de CA-3: acumulado ≤ contratado, art. 118 RLOPSRM)
  pu_snapshot            NUMERIC(14,2) NOT NULL CHECK (pu_snapshot >= 0),                         -- PU del catálogo congelado al integrar
  CONSTRAINT uq_estimacion_generadores_concepto UNIQUE (estimacion_id, contrato_concepto_id)     -- un renglón por concepto y estimación
);
CREATE INDEX IF NOT EXISTS idx_estimacion_generadores_estimacion ON estimacion_generadores(estimacion_id);
CREATE INDEX IF NOT EXISTS idx_estimacion_generadores_concepto ON estimacion_generadores(contrato_concepto_id);

-- (3) Notas de bitácora vinculadas a la estimación (N:M, art. 132 fr. II RLOPSRM).
--     nota_id NO ACTION: la nota es inmutable (solo muere por cascada del contrato);
--     el chequeo diferido no rompe esa cascada (el vínculo cae con la estimación).
CREATE TABLE IF NOT EXISTS estimacion_notas (
  estimacion_id INTEGER NOT NULL REFERENCES estimaciones(id) ON DELETE CASCADE,
  nota_id       INTEGER NOT NULL REFERENCES bitacora_notas(id) ON DELETE NO ACTION,
  PRIMARY KEY (estimacion_id, nota_id)
);
CREATE INDEX IF NOT EXISTS idx_estimacion_notas_estimacion ON estimacion_notas(estimacion_id);
CREATE INDEX IF NOT EXISTS idx_estimacion_notas_nota ON estimacion_notas(nota_id);

-- (4) Soportes documentales y registro fotográfico (esqueleto, art. 132 fr. IV
--     RLOPSRM). La carga real de archivos (BYTEA) queda DIFERIDA, como el prototipo;
--     aquí solo viven las filas-metadatos.
CREATE TABLE IF NOT EXISTS estimacion_soportes (
  id            SERIAL PRIMARY KEY,
  estimacion_id INTEGER NOT NULL REFERENCES estimaciones(id) ON DELETE CASCADE,
  nombre        TEXT NOT NULL,
  descripcion   TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_estimacion_soportes_estimacion ON estimacion_soportes(estimacion_id);

CREATE TABLE IF NOT EXISTS estimacion_fotos (
  id            SERIAL PRIMARY KEY,
  estimacion_id INTEGER NOT NULL REFERENCES estimaciones(id) ON DELETE CASCADE,
  nombre        TEXT,
  descripcion   TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_estimacion_fotos_estimacion ON estimacion_fotos(estimacion_id);

-- (5) Inmutabilidad. Tras integrar, la CARÁTULA/contenido de la estimación es
--     inalterable (art. 132 RLOPSRM); el ESTADO sí puede AVANZAR (autorizada por
--     HU-15, pagada por la reconexión de HU-21). Espejo de sigecop_nota_inmutable:
--     compara columna por columna con IS DISTINCT FROM y deja 'estado' libre. La
--     dirección del estado (máquina de estados) se valida en la app/HUs futuras.
CREATE OR REPLACE FUNCTION sigecop_estimacion_inmutable() RETURNS trigger AS $func$
BEGIN
  IF NEW.contrato_id              IS DISTINCT FROM OLD.contrato_id
     OR NEW.numero                IS DISTINCT FROM OLD.numero
     OR NEW.periodo_inicio        IS DISTINCT FROM OLD.periodo_inicio
     OR NEW.periodo_fin           IS DISTINCT FROM OLD.periodo_fin
     OR NEW.anticipo_pct_snapshot IS DISTINCT FROM OLD.anticipo_pct_snapshot
     OR NEW.subtotal              IS DISTINCT FROM OLD.subtotal
     OR NEW.amortizacion          IS DISTINCT FROM OLD.amortizacion
     OR NEW.retencion             IS DISTINCT FROM OLD.retencion
     OR NEW.deductivas            IS DISTINCT FROM OLD.deductivas
     OR NEW.neto                  IS DISTINCT FROM OLD.neto
     OR NEW.integrada_por         IS DISTINCT FROM OLD.integrada_por
     OR NEW.integrada_en          IS DISTINCT FROM OLD.integrada_en THEN
    RAISE EXCEPTION 'La carátula de una estimación integrada es inalterable (art. 132 RLOPSRM); solo puede avanzar su estado';
  END IF;
  RETURN NEW;
END;
$func$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_estimacion_inmutable ON estimaciones;
CREATE TRIGGER trg_estimacion_inmutable
  BEFORE UPDATE ON estimaciones
  FOR EACH ROW EXECUTE FUNCTION sigecop_estimacion_inmutable();

-- Generadores: append-only. BEFORE UPDATE bloquea (no se editan tras integrar); el
-- DELETE en cascada se preserva (no se intercepta DELETE), igual que pagos/notas.
CREATE OR REPLACE FUNCTION sigecop_estimacion_generador_inmutable() RETURNS trigger AS $func$
BEGIN
  RAISE EXCEPTION 'Un numero generador de estimacion es inalterable (append-only).';
END;
$func$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_estimacion_generador_inmutable ON estimacion_generadores;
CREATE TRIGGER trg_estimacion_generador_inmutable
  BEFORE UPDATE ON estimacion_generadores
  FOR EACH ROW EXECUTE FUNCTION sigecop_estimacion_generador_inmutable();

-- (6) Activa el FK diferido pagos.estimacion_id -> estimaciones (D12.9 / CA-1b). Los
--     pagos existentes tienen estimacion_id NULL -> la FK (nullable) se cumple. ON
--     DELETE NO ACTION a propósito: un SET NULL haría UPDATE sobre pagos y dispararía
--     su trigger append-only (el borrado fallaría); CASCADE borraría el registro de
--     auditoría. NO ACTION protege el pago y, como el borrado del contrato elimina
--     pago y estimación en el MISMO statement, el chequeo a fin de sentencia no
--     bloquea esa cascada. Guard idempotente sobre pg_constraint.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_pagos_estimacion') THEN
    ALTER TABLE pagos ADD CONSTRAINT fk_pagos_estimacion
      FOREIGN KEY (estimacion_id) REFERENCES estimaciones(id) ON DELETE NO ACTION;
  END IF;
END $$;

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

-- =====================================================================
-- Paquete A1: catálogo con cuadre EXACTO + clave de concepto capturable.
-- Aditivo e idempotente. SOLO esquema: la lógica de derivar el monto, quitar la
-- tolerancia ±$1 y unificar el motor de redondeo (Σ-ROUND del lado SQL) va en los
-- controllers (A1.2). Fundamento: art. 45 fr. IX RLOPSRM (el catálogo con sus
-- importes ES el presupuesto del contrato; cada concepto con su clave) y art. 185
-- RLOPSRM (PU = importe por unidad de concepto).
-- =====================================================================

-- (1) Clave del concepto, CAPTURADA por el usuario (no un autonumérico ciego, art.
--     45 fr. IX). Nullable: los contratos existentes quedan con clave NULL; la
--     obligatoriedad para ALTAS NUEVAS la valida la app (un NOT NULL global rompería
--     los existentes). UNIQUE por contrato — varios NULL NO colisionan en un UNIQUE,
--     así que los conceptos viejos sin clave conviven sin chocar.
ALTER TABLE contrato_conceptos ADD COLUMN IF NOT EXISTS clave VARCHAR(40);
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_contrato_conceptos_clave') THEN
    ALTER TABLE contrato_conceptos ADD CONSTRAINT uq_contrato_conceptos_clave UNIQUE (contrato_id, clave);
  END IF;
END $$;

-- (2) Ensanche de la escala del PU a NUMERIC(16,4): 12 dígitos enteros (los MISMOS
--     que NUMERIC(14,2), 16-4 = 12 = 14-2) + 4 decimales. Permite afinar el PU para
--     acercar el importe al objetivo sin descuadrar. NO se usa (14,4): eso recortaría
--     la parte entera a 10 dígitos (riesgo de overflow 22003). No-destructivo: 33333.33
--     se reinterpreta como 33333.3300 (mismo valor NUMERIC). Se ensancha TAMBIÉN el
--     snapshot de estimaciones, o un PU de 4 decimales se TRUNCARÍA a 2 al integrar
--     (descuadre carátula vs detalle). ALTER ... TYPE es DDL: NO dispara los triggers
--     append-only de fila (sigecop_*_inmutable). Guard por information_schema para no
--     re-escribir la tabla en cada arranque (idempotencia), como las migraciones
--     timestamptz de arriba.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
              WHERE table_name = 'contrato_conceptos' AND column_name = 'pu'
                AND (numeric_precision <> 16 OR numeric_scale <> 4)) THEN
    ALTER TABLE contrato_conceptos ALTER COLUMN pu TYPE NUMERIC(16,4);
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
              WHERE table_name = 'estimacion_generadores' AND column_name = 'pu_snapshot'
                AND (numeric_precision <> 16 OR numeric_scale <> 4)) THEN
    ALTER TABLE estimacion_generadores ALTER COLUMN pu_snapshot TYPE NUMERIC(16,4);
  END IF;
END $$;

-- =====================================================================
-- Paquete A2: PROGRAMA DE OBRA = matriz CONCEPTO × PERIODO.
-- Aditivo e idempotente. Reemplaza el modelo VIEJO de `contrato_actividades`
-- (texto libre con %peso) por el programa REAL: los conceptos del catálogo (A1)
-- repartidos en los periodos del ciclo de ejecución. (`contrato_actividades` se
-- DEPRECA — ya no la escribe el alta — pero NO se borra: conserva datos viejos.)
-- Fundamento Nivel 1 (literal, RLOPSRM/LOPSRM): art. 45 fr. X (programa de ejecución
-- conforme al catálogo, calendarizado y cuantificado por periodos); art. 54 (la
-- estimación es cíclica: cada 30 o 15 días); art. 118 (no se planea/estima más de lo
-- contratado). El monto a cobrar por periodo = Σ (cantidad_celda × pu) — el programa
-- es lo que permite VALIDAR las estimaciones (palabras del profesor, audio 2026-06-01).
-- =====================================================================

-- (1) Ciclo de estimación del contrato: 'mensual' o 'quincenal' (art. 54: cada 30/15
--     días). Lo elige el usuario al configurar el contrato. Nullable: los contratos
--     viejos quedan NULL; las altas nuevas CON programa lo exigen (lo valida la app).
ALTER TABLE contratos ADD COLUMN IF NOT EXISTS ciclo_estimacion VARCHAR(10);
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_contratos_ciclo') THEN
    ALTER TABLE contratos ADD CONSTRAINT chk_contratos_ciclo
      CHECK (ciclo_estimacion IS NULL OR ciclo_estimacion IN ('mensual','quincenal'));
  END IF;
END $$;

-- (2) Periodos del ciclo = COLUMNAS de la matriz. Los genera el backend con el algoritmo
--     de periodos (lib/programa.js: generarPeriodos), un mosaico contiguo sin huecos ni
--     solapes; cada periodo cumple por construcción periodo_fin <= masUnMes(inicio), así
--     ES un periodo válido de estimación (art. 54) y alinea con HU-12.
CREATE TABLE IF NOT EXISTS contrato_periodos (
  id          SERIAL PRIMARY KEY,
  contrato_id INTEGER NOT NULL REFERENCES contratos(id) ON DELETE CASCADE,
  numero      INTEGER NOT NULL CHECK (numero >= 1),       -- 1..N en orden cronológico
  inicio      DATE NOT NULL,
  fin         DATE NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_contrato_periodos_numero UNIQUE (contrato_id, numero),
  CONSTRAINT chk_contrato_periodos_fechas CHECK (fin >= inicio)
);
CREATE INDEX IF NOT EXISTS idx_contrato_periodos_contrato ON contrato_periodos(contrato_id);

-- (3) programa_obra = CELDAS de la matriz (tabla HOJA). Celda = cantidad PLANEADA del
--     concepto en el periodo, en la MISMA escala que el catálogo (NUMERIC(14,3)). NO es
--     append-only: la matriz se EDITA por DELETE+INSERT (lib/programa.js: guardarMatriz)
--     hasta que el contrato tiene su primera estimación; después se congela salvo enmienda
--     por convenio (art. 99) — ese freeze es de aplicación, no un trigger, para permitir la
--     excepción legal. La invariante Σ planeado <= contratado (art. 118) se valida en SQL.
CREATE TABLE IF NOT EXISTS programa_obra (
  id                   SERIAL PRIMARY KEY,
  contrato_concepto_id INTEGER NOT NULL REFERENCES contrato_conceptos(id) ON DELETE CASCADE,
  contrato_periodo_id  INTEGER NOT NULL REFERENCES contrato_periodos(id)  ON DELETE CASCADE,
  cantidad             NUMERIC(14,3) NOT NULL CHECK (cantidad >= 0),  -- no negativos ("menos dos metros no existe")
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_programa_obra_celda UNIQUE (contrato_concepto_id, contrato_periodo_id)  -- una celda por (concepto, periodo)
);
CREATE INDEX IF NOT EXISTS idx_programa_obra_concepto ON programa_obra(contrato_concepto_id);
CREATE INDEX IF NOT EXISTS idx_programa_obra_periodo  ON programa_obra(contrato_periodo_id);

-- =====================================================================
-- Paquete 4.x: CORRECCIÓN DEL ALTA DE CONTRATOS (independiente de A2).
-- Aditivo e idempotente.
-- =====================================================================

-- (4.2) Ensanche de contratos.monto NUMERIC(14,2) -> NUMERIC(18,2). El 14,2 topa en
--   < 10^12 (≈1 billón): una obra grande (Σ importes ≥ 10^12, p. ej. 1,000,000 m² ×
--   $1,500,000) desbordaba con error crudo 22003. 18,2 = 16 enteros (< 10^16), holgura
--   para cualquier contrato real. No-destructivo (reinterpreta el valor). Guard por
--   information_schema para no reescribir la tabla en cada arranque (como las migraciones
--   de A1). El cast del monto derivado en contratos.controller.js también pasó a (18,2).
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
              WHERE table_name = 'contratos' AND column_name = 'monto'
                AND (numeric_precision <> 18 OR numeric_scale <> 2)) THEN
    ALTER TABLE contratos ALTER COLUMN monto TYPE NUMERIC(18,2);
  END IF;
END $$;

-- (4.4) Tipo de documento del contrato: 'contrato' (PDF firmado, compatibilidad) o
--   'anticipo_autorizacion' (autorización escrita del titular cuando el anticipo supera el
--   umbral, art. 50 fr. IV LOPSRM). Permite DOS PDFs por contrato (uno por tipo), cada uno
--   inmutable (el trigger append-only existente bloquea UPDATE; el control de "uno por tipo"
--   lo hace el controller + el UNIQUE de abajo). Las filas existentes quedan 'contrato'.
ALTER TABLE contrato_documentos ADD COLUMN IF NOT EXISTS tipo VARCHAR(40) NOT NULL DEFAULT 'contrato';
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_contrato_documentos_tipo') THEN
    ALTER TABLE contrato_documentos ADD CONSTRAINT chk_contrato_documentos_tipo
      CHECK (tipo IN ('contrato','anticipo_autorizacion'));
  END IF;
END $$;
-- Un documento por (contrato, tipo). Las filas previas (≤1 por contrato, ahora 'contrato')
-- no violan el UNIQUE. Guard explícito sobre pg_constraint (idempotente).
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_contrato_documentos_tipo') THEN
    ALTER TABLE contrato_documentos ADD CONSTRAINT uq_contrato_documentos_tipo UNIQUE (contrato_id, tipo);
  END IF;
END $$;
