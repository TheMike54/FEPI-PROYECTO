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
--     acta JSONB (la "primera nota" congelada con los datos minimos del art. 123 fr. III RLOPSRM)
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

-- Corrección profe (04-jun): la DEPENDENCIA del contrato pasa de texto libre a CUENTA registrada
-- (rol 'dependencia'). Puntero escalar de la parte contratante. NO firma la bitácora (art. 123
-- RLOPSRM: el residente la representa) → NO entra al contrato_roster. El texto `dependencia` se
-- conserva (lo deriva el controller del nombre de la cuenta) para la lista/detalle. Aditivo, SET NULL.
ALTER TABLE contratos ADD COLUMN IF NOT EXISTS dependencia_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_contratos_dependencia_id ON contratos(dependencia_id);

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

-- El hash de los usuarios demo corresponde a la contraseña Sigecop2026!
-- (algoritmo $2a$, cost 10, bcryptjs). El usuario 'dependencia' es el que aprueba
-- las solicitudes de registro; nace 'activo' por el DEFAULT de la columna estado.
-- alta-v2 (5.1): se añade la cuenta del profesor (csilvasa@ipn.mx, rol residente, misma
-- contraseña Sigecop2026! → reusa el hash del residente). Estas 5 cuentas existen en
-- AMBAS bases (local y Render). La cuenta de finanzas (Isha) es SOLO LOCAL y se crea con
-- scripts/crear-usuario.js (NO se versiona su contraseña). Ver docs/Cuentas_Prueba_SIGECOP.md.
-- Corrección profe (04-jun): los nombres demo se capturan COMPLETOS (nombre + apellidos), porque
-- el nombre aparece en la bitácora (art. 123 RLOPSRM). Son nombres de FIXTURE (no personas reales).
-- La cuenta del contratista ahora es una PERSONA (el superintendente que firma), no una razón social.
INSERT INTO usuarios (nombre, email, password_hash, rol) VALUES
  ('Ing. Iván Residente Demo', 'residente@sigecop.test', '$2a$10$n4rhCkjJeeKM0GPpL8lUbenEoUFhckkQRHnui1SYG6z6/PbM.7qBy', 'residente'),
  ('Arq. Carlos Contratista Demo', 'contratista@sigecop.test', '$2a$10$h7eLpWBwF5O3smp/egT3wupSylCFRXlwQQIeHbnvCdJOmM5xAhdgK', 'contratista'),
  ('Ing. Sofía Supervisión Demo', 'supervision@sigecop.test', '$2a$10$zpUoEVcL3IZhAtpS4kexoemneAaX93X7.A3kbLPYOBwgw51eZC33e', 'supervision'),
  ('Lic. Diana Dependencia Demo', 'dependencia@sigecop.test', '$2a$10$n4rhCkjJeeKM0GPpL8lUbenEoUFhckkQRHnui1SYG6z6/PbM.7qBy', 'dependencia'),
  ('Profesor (Sistemas)', 'csilvasa@ipn.mx', '$2a$10$n4rhCkjJeeKM0GPpL8lUbenEoUFhckkQRHnui1SYG6z6/PbM.7qBy', 'residente'),
  ('C.P. Fernando Finanzas Demo', 'finanzas@sigecop.test', '$2a$10$n4rhCkjJeeKM0GPpL8lUbenEoUFhckkQRHnui1SYG6z6/PbM.7qBy', 'finanzas')
ON CONFLICT (email) DO NOTHING;

-- Backfill idempotente para BASES YA SEMBRADAS con los nombres incompletos viejos (el INSERT de
-- arriba no las toca por ON CONFLICT). Solo actualiza si el nombre sigue siendo el demo viejo
-- (no pisa cambios manuales). Re-ejecutar no hace nada una vez completados.
UPDATE usuarios SET nombre = 'Ing. Iván Residente Demo'     WHERE email = 'residente@sigecop.test'   AND nombre = 'Ing. Residente Demo';
UPDATE usuarios SET nombre = 'Arq. Carlos Contratista Demo' WHERE email = 'contratista@sigecop.test' AND nombre = 'Contratista Demo S.A.';
UPDATE usuarios SET nombre = 'Ing. Sofía Supervisión Demo'  WHERE email = 'supervision@sigecop.test' AND nombre = 'Supervisión Externa Demo';
UPDATE usuarios SET nombre = 'Lic. Diana Dependencia Demo'  WHERE email = 'dependencia@sigecop.test' AND nombre = 'Dependencia Demo';
UPDATE usuarios SET nombre = 'C.P. Fernando Finanzas Demo'  WHERE email = 'finanzas@sigecop.test'    AND nombre = 'Finanzas Demo';

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
--     excepción legal. Regla del 100% (alta-v2): Σ planeado = contratado por concepto, validada
--     en SQL (lib/programa.js: guardarMatriz, tolerancia 0.0005). Fundamento RLOPSRM 45-A-X +
--     LOPSRM 52; el exceso sigue cubierto por art. 118.
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

-- =====================================================================
-- PASADA BITÁCORA (HU-08/09/10): apertura = nota #1, firma de notas, candado de
-- emisión server-side, tipos por rol EXACTOS (art. 125 RLOPSRM), datos mínimos de
-- apertura (art. 123 fr. III), y tag de búsqueda. ADITIVO e IDEMPOTENTE: aplica
-- sobre BD existente (Render) sin tocar contrato/alta/A2/estimación.
-- =====================================================================

-- (B1) Datos mínimos de la apertura — art. 123 fr. III RLOPSRM: la nota especial de
--      inicio relaciona "como mínimo... domicilios y teléfonos... y alcances descriptivos
--      de los trabajos y de las características del sitio donde se desarrollarán". Se
--      capturan en la apertura y se congelan también en el acta (snapshot inmutable).
ALTER TABLE bitacora_aperturas ADD COLUMN IF NOT EXISTS domicilio_dependencia TEXT;
ALTER TABLE bitacora_aperturas ADD COLUMN IF NOT EXISTS telefono_dependencia  TEXT;
ALTER TABLE bitacora_aperturas ADD COLUMN IF NOT EXISTS domicilio_contratista TEXT;
ALTER TABLE bitacora_aperturas ADD COLUMN IF NOT EXISTS telefono_contratista  TEXT;
ALTER TABLE bitacora_aperturas ADD COLUMN IF NOT EXISTS descripcion_trabajos  TEXT;
ALTER TABLE bitacora_aperturas ADD COLUMN IF NOT EXISTS caracteristicas_sitio TEXT;

-- (B2) Catálogo de tipos = lista EXACTA del art. 125 RLOPSRM por rol (fr. I residente a–k;
--      fr. II superintendente a–g; fr. III supervisión a–d) + apertura/cierre + 'otro'
--      (art. 125, último párrafo). Se agrega `activo` para OCULTAR del selector los tipos
--      "coarse" previos (autorizacion/aprobacion/solicitud/aviso) SIN romper la FK de notas
--      ya emitidas con ellos (siguen resolviendo su etiqueta en consultas).
ALTER TABLE bitacora_nota_tipos ADD COLUMN IF NOT EXISTS activo BOOLEAN NOT NULL DEFAULT true;

INSERT INTO bitacora_nota_tipos (clave, etiqueta, rol_emisor, orden) VALUES
  -- Residente — art. 125 fr. I a) … k) (autoriza / aprueba):
  ('res_modificaciones',       'Autorización de modificaciones (proyecto ejecutivo, procedimiento, calidad, programa)', 'residente', 101),
  ('res_estimaciones',         'Autorización de estimaciones',                                                          'residente', 102),
  ('res_ajuste_costos',        'Aprobación de ajuste de costos',                                                        'residente', 103),
  ('res_conceptos_extra',      'Aprobación de conceptos no previstos y cantidades adicionales',                         'residente', 104),
  ('res_convenios',            'Autorización de convenios modificatorios',                                              'residente', 105),
  ('res_terminacion_rescision','Terminación anticipada o rescisión administrativa del contrato',                        'residente', 106),
  ('res_sustitucion',          'Sustitución del superintendente, del residente anterior o de la supervisión',          'residente', 107),
  ('res_suspension',           'Suspensión de trabajos',                                                                'residente', 108),
  ('res_conciliacion',         'Conciliaciones y, en su caso, convenios respectivos',                                   'residente', 109),
  ('res_caso_fortuito',        'Caso fortuito o fuerza mayor que afecta el programa de ejecución',                       'residente', 110),
  ('res_terminacion',          'Terminación de los trabajos',                                                           'residente', 111),
  -- Superintendente — art. 125 fr. II a) … g) (solicita / avisa):
  ('sup_modificaciones',       'Solicitud de modificaciones (proyecto ejecutivo, procedimiento, calidad, programa)',    'superintendente', 201),
  ('sup_estimaciones',         'Solicitud de aprobación de estimaciones',                                               'superintendente', 202),
  ('sup_falta_pago',           'Falta o atraso en el pago de estimaciones',                                             'superintendente', 203),
  ('sup_ajuste_costos',        'Solicitud de ajuste de costos',                                                         'superintendente', 204),
  ('sup_conceptos_extra',      'Solicitud de conceptos no previstos y cantidades adicionales',                          'superintendente', 205),
  ('sup_convenios',            'Solicitud de convenios modificatorios',                                                 'superintendente', 206),
  ('sup_aviso_terminacion',    'Aviso de terminación de los trabajos',                                                  'superintendente', 207)
ON CONFLICT (clave) DO NOTHING;

-- Supervisión (art. 125 fr. III a–d) ya era granular (avance/calidad/seguridad/junta) → se
-- conserva. apertura/cierre/otro se conservan. Se OCULTAN (no se borran) los coarse previos.
UPDATE bitacora_nota_tipos SET activo = false WHERE clave IN ('autorizacion','aprobacion','solicitud','aviso');
-- Reordenar supervisión y especiales para que queden agrupados al final del selector.
UPDATE bitacora_nota_tipos SET orden = 301 WHERE clave = 'avance';
UPDATE bitacora_nota_tipos SET orden = 302 WHERE clave = 'calidad';
UPDATE bitacora_nota_tipos SET orden = 303 WHERE clave = 'seguridad';
UPDATE bitacora_nota_tipos SET orden = 304 WHERE clave = 'junta';
UPDATE bitacora_nota_tipos SET orden = 400 WHERE clave = 'apertura';
UPDATE bitacora_nota_tipos SET orden = 401 WHERE clave = 'cierre';
UPDATE bitacora_nota_tipos SET orden = 999 WHERE clave = 'otro';

-- (B3) Tag de búsqueda por nota (lo pidió el profe: como los tipos van embebidos en el
--      texto, un tag estructurado hace la búsqueda eficiente). Opcional; lo captura el emisor.
ALTER TABLE bitacora_notas ADD COLUMN IF NOT EXISTS tag VARCHAR(60);
CREATE INDEX IF NOT EXISTS idx_bitacora_notas_tag ON bitacora_notas(tag);

-- (B4) Firmas de NOTAS — distintas de la firma conjunta de la APERTURA (que vive en
--      bitacora_firmantes). art. 123 fr. III: "se establecerá un plazo máximo para la firma
--      de las notas... se tendrán por aceptadas una vez vencido el plazo". Cada parte del
--      contrato que NO es el emisor puede firmar (aceptar) la nota. Append-only (UNIQUE por
--      nota+usuario; UPDATE bloqueado). La aceptación tácita al vencer el plazo se sigue
--      DERIVANDO en la consulta (no requiere fila).
CREATE TABLE IF NOT EXISTS bitacora_nota_firmas (
  id SERIAL PRIMARY KEY,
  nota_id INTEGER NOT NULL REFERENCES bitacora_notas(id) ON DELETE CASCADE,
  usuario_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  rol_en_firma TEXT,
  firmado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (nota_id, usuario_id)
);
CREATE INDEX IF NOT EXISTS idx_bitacora_nota_firmas_nota ON bitacora_nota_firmas(nota_id);

CREATE OR REPLACE FUNCTION sigecop_nota_firma_inmutable() RETURNS trigger AS $func$
BEGIN
  RAISE EXCEPTION 'La firma de una nota de bitácora es append-only y no puede modificarse';
END;
$func$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_bitacora_nota_firmas_inmutable ON bitacora_nota_firmas;
CREATE TRIGGER trg_bitacora_nota_firmas_inmutable
  BEFORE UPDATE ON bitacora_nota_firmas
  FOR EACH ROW EXECUTE FUNCTION sigecop_nota_firma_inmutable();

-- =====================================================================
-- PASADA SOPORTE EQUIPOS (HU-02/06/07/11/13/15/16/20) — SOLO ESQUEMA.
-- Tablas y columnas de soporte para DESBLOQUEAR a Equipo 2 y Equipo 3. La LÓGICA
-- (endpoints, validaciones, máquinas de estado, semáforos) la construye CADA
-- EQUIPO encima; aquí va SOLO el esquema: tablas, FKs, constraints e índices.
-- ADITIVO e IDEMPOTENTE: aplica sobre la BD existente (local/Render) sin reescribir
-- datos (CREATE TABLE IF NOT EXISTS / ADD COLUMN IF NOT EXISTS / guards sobre
-- pg_constraint). NO toca la lógica del core (alta, A2, estimación, bitácora): en
-- particular, las 3 columnas nuevas de `estimaciones` quedan FUERA del trigger
-- sigecop_estimacion_inmutable A PROPÓSITO (ver HU-13/16). Fundamento Nivel 1
-- verificado contra el TEXTO LITERAL en docs/legal/ (LOPSRM reforma DOF 14-11-2025;
-- RLOPSRM DOF 24-02-2023). NO incluye HU-03 (convenios) — esa muta el core del
-- programa y va en su propia pasada.
-- =====================================================================

-- ---------------------------------------------------------------------
-- HU-02 (Equipo 2) — garantia_endosos: endosos/ajustes de las fianzas ya
-- registradas en contrato_garantias (HU-01). Fundamento LITERAL: art. 98 fr. II
-- RLOPSRM ("En caso de la celebración de convenios para ampliar el monto o el
-- plazo de ejecución del contrato, se deberá realizar la modificación
-- correspondiente a la fianza") + art. 98 último párrafo ("Las modificaciones a
-- las fianzas deberán formalizarse con la participación que corresponda a la
-- afianzadora") + art. 99 último párrafo RLOPSRM (remite a art. 98 fr. II).
-- HISTÓRICO APPEND-ONLY: cada endoso es un registro inmutable (trigger BEFORE
-- UPDATE), como notas/pagos. Las alertas de vigencia 30/15/5 se DERIVAN en lectura
-- de contrato_garantias.vigencia (sin tabla).
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS garantia_endosos (
  id             SERIAL PRIMARY KEY,
  garantia_id    INTEGER NOT NULL REFERENCES contrato_garantias(id) ON DELETE CASCADE,
  -- FK a convenios_modificatorios cuando exista (HU-03, otra pasada). Hoy INTEGER
  -- "suelto", mismo idioma que pagos.estimacion_id antes de HU-12: el endoso por
  -- convenio (art. 98 fr. II) podrá amarrarse con un ALTER guardado cuando HU-03
  -- cree la tabla. NO se referencia ahora para no romper la migración (tabla ausente).
  convenio_id    INTEGER,
  motivo         VARCHAR(30) NOT NULL DEFAULT 'otro'
                   CHECK (motivo IN ('ampliacion_monto','prorroga_vigencia','mixto','otro')),
  nuevo_monto    NUMERIC(14,2) CHECK (nuevo_monto IS NULL OR nuevo_monto >= 0),
  nueva_vigencia DATE,
  observaciones  TEXT,
  registrado_por INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,  -- del JWT
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_garantia_endosos_garantia ON garantia_endosos(garantia_id);

CREATE OR REPLACE FUNCTION sigecop_garantia_endoso_inmutable() RETURNS trigger AS $func$
BEGIN
  RAISE EXCEPTION 'Un endoso de garantia es un registro historico inmutable (append-only)';
END;
$func$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_garantia_endosos_inmutable ON garantia_endosos;
CREATE TRIGGER trg_garantia_endosos_inmutable
  BEFORE UPDATE ON garantia_endosos
  FOR EACH ROW EXECUTE FUNCTION sigecop_garantia_endoso_inmutable();

-- ---------------------------------------------------------------------
-- HU-06 (Equipo 2) — concepto_avance: cantidad EJECUTADA por concepto del
-- catálogo, opcionalmente imputada a un periodo del programa (A2) y respaldada por
-- una nota de bitácora. Alimenta la curva ejecutada (HU-05). Fundamento LITERAL:
-- art. 118 RLOPSRM (trabajos por mayor valor del contratado, sin orden escrita, NO
-- dan derecho a pago) → invariante "Σ cantidad por concepto ≤ cantidad contratada"
-- (contrato_conceptos.cantidad). Ese tope es CRUCE DE FILAS (no expresable como
-- CHECK de una fila): lo valida el controller HU-06 (como HU-12 ya valida el
-- exceso). En el esquema: CHECK cantidad >= 0 (sin negativos) + FKs a la fundación.
-- NO append-only (la HU-06 define su flujo de captura/corrección; candidato a
-- trigger append-only en su fase de lógica).
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS concepto_avance (
  id                   SERIAL PRIMARY KEY,
  contrato_concepto_id INTEGER NOT NULL REFERENCES contrato_conceptos(id) ON DELETE CASCADE,  -- FK a FUNDACIÓN (el contrato llega vía el concepto)
  -- Periodo del programa (A2) al que se imputa el avance, para la curva programado
  -- (programa_obra) vs ejecutado (HU-05). SET NULL (NO cascade) a propósito: A2 edita
  -- la matriz por DELETE+INSERT (lib/programa.js: guardarMatriz) y puede regenerar
  -- contrato_periodos; con SET NULL el avance SOBREVIVE a la regeneración (pierde el
  -- vínculo, no el dato) y la HU-05/06 re-imputa. Nullable: avance no alineado a un periodo.
  contrato_periodo_id  INTEGER REFERENCES contrato_periodos(id) ON DELETE SET NULL,
  -- Nota de bitácora que respalda el avance (art. 125 fr. II "entrega de concepto").
  -- NO ACTION: la nota es inmutable y solo muere por la cascada del contrato (mismo
  -- idioma que estimacion_notas.nota_id); evita un UPDATE/SET-NULL sobre el vínculo.
  nota_id              INTEGER REFERENCES bitacora_notas(id) ON DELETE NO ACTION,
  cantidad             NUMERIC(14,3) NOT NULL CHECK (cantidad >= 0),  -- misma escala que el catálogo; sin negativos (art. 118 / "menos dos metros no existe")
  fecha                DATE NOT NULL DEFAULT CURRENT_DATE,
  observaciones        TEXT,
  registrado_por       INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,  -- del JWT
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_concepto_avance_concepto ON concepto_avance(contrato_concepto_id);
CREATE INDEX IF NOT EXISTS idx_concepto_avance_periodo  ON concepto_avance(contrato_periodo_id);
CREATE INDEX IF NOT EXISTS idx_concepto_avance_nota     ON concepto_avance(nota_id);

-- ---------------------------------------------------------------------
-- HU-07 (Equipo 2) — alerta_atraso: CONFIGURACIÓN de alertas de atraso por
-- concepto (umbral). El DISPARO (avance ejecutado < planeado) se DERIVA en lectura
-- cruzando programa_obra (planeado, A2) vs concepto_avance (ejecutado, HU-06): no se
-- almacenan instancias de alerta. Fundamento: el programa por periodos es art. 45
-- apartado A fr. X RLOPSRM (base contra la que se mide el atraso) y la consecuencia
-- del atraso son las penas convencionales del art. 46 Bis LOPSRM; el mecanismo de
-- alerta in-app en sí es operativo [sin fundamento legal literal específico]. Canal
-- 'sistema' (in-app) en Etapa 1; 'correo' depende de D-9 (notificaciones = Etapa 2).
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS alerta_atraso (
  id                   SERIAL PRIMARY KEY,
  contrato_concepto_id INTEGER NOT NULL REFERENCES contrato_conceptos(id) ON DELETE CASCADE,  -- FK a FUNDACIÓN
  umbral_pct           NUMERIC(5,2) NOT NULL CHECK (umbral_pct >= 0 AND umbral_pct <= 100),
  canal                VARCHAR(20) NOT NULL DEFAULT 'sistema' CHECK (canal IN ('sistema','correo')),
  activa               BOOLEAN NOT NULL DEFAULT true,
  creada_por           INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_alerta_atraso_concepto ON alerta_atraso(contrato_concepto_id);

-- ---------------------------------------------------------------------
-- HU-11 (Equipo 2) — minutas y visitas/inspecciones (FK a la fundación). minutas:
-- PDF en BYTEA (disco de Render efímero, como contrato_documentos). Fundamento
-- (minuta = registro de junta de trabajo): art. 125 fr. III inciso d) RLOPSRM
-- ("acuerdos de juntas de trabajo" que registra la supervisión; ya está en el
-- catálogo de tipos). La agenda de visitas/inspecciones es operativa [sin
-- fundamento legal literal específico]. Documental/EDITABLE: SIN trigger de
-- inmutabilidad (la HU-11 decide si una minuta firmada se congela).
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS minutas (
  id            SERIAL PRIMARY KEY,
  contrato_id   INTEGER NOT NULL REFERENCES contratos(id) ON DELETE CASCADE,  -- FK a FUNDACIÓN
  titulo        VARCHAR(200) NOT NULL,
  fecha         DATE NOT NULL DEFAULT CURRENT_DATE,
  lugar         VARCHAR(200),
  acuerdos      TEXT,
  -- Nota de bitácora a la que se adjunta la minuta como referencia (HU-09). NO
  -- ACTION: la nota es inmutable y solo muere por la cascada del contrato.
  nota_id       INTEGER REFERENCES bitacora_notas(id) ON DELETE NO ACTION,
  pdf_nombre    TEXT,
  pdf_mime      VARCHAR(100),
  pdf_tamano    INTEGER CHECK (pdf_tamano IS NULL OR pdf_tamano >= 0),
  pdf_contenido BYTEA,
  registrada_por INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_minutas_contrato ON minutas(contrato_id);
CREATE INDEX IF NOT EXISTS idx_minutas_nota     ON minutas(nota_id);

CREATE TABLE IF NOT EXISTS visitas (
  id               SERIAL PRIMARY KEY,
  contrato_id      INTEGER NOT NULL REFERENCES contratos(id) ON DELETE CASCADE,  -- FK a FUNDACIÓN
  tipo             VARCHAR(20) NOT NULL DEFAULT 'visita' CHECK (tipo IN ('visita','inspeccion')),
  fecha_programada DATE NOT NULL,
  fecha_realizada  DATE,
  proposito        TEXT,
  resultado        TEXT,
  estado           VARCHAR(20) NOT NULL DEFAULT 'agendada' CHECK (estado IN ('agendada','realizada','cancelada')),
  registrada_por   INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_visitas_contrato ON visitas(contrato_id);

-- ---------------------------------------------------------------------
-- HU-13 / HU-16 (Equipo 3) — columnas de CICLO en estimaciones:
--   HU-13 envío: enviada_en / enviada_por = sello que arranca el plazo del art. 54
--     LOPSRM (el contratista presenta dentro de 6 días naturales de la fecha de
--     corte; la residencia revisa/autoriza dentro de 15 días naturales siguientes
--     a la presentación).
--   HU-16 reingreso: reemplaza_a (self-FK) = la estimación rechazada que esta nueva
--     versión sustituye (el reingreso NO reinicia el plazo de presentación).
-- DISCIPLINA (núcleo intacto): estas columnas NO se agregan al trigger
-- sigecop_estimacion_inmutable. Ese trigger congela la carátula comparando una LISTA
-- FIJA de columnas y deja libre lo NO listado; al ser columnas nuevas, son mutables
-- por el controller (UPDATE estado + sellos) SIN tocar la lógica del core. La
-- inmutabilidad "una sola vez" (NULL→valor) la hace el controller HU-13/16. El
-- estado 'rechazada' ya existe en chk_estimaciones_estado.
-- ---------------------------------------------------------------------
ALTER TABLE estimaciones ADD COLUMN IF NOT EXISTS enviada_en  TIMESTAMPTZ;
ALTER TABLE estimaciones ADD COLUMN IF NOT EXISTS enviada_por INTEGER REFERENCES usuarios(id) ON DELETE SET NULL;
-- reemplaza_a SET NULL (no cascade): si la rechazada se borrara (solo por cascada de
-- contrato), el reingreso sobrevive con el puntero nulo. SET NULL toca SOLO reemplaza_a
-- (columna NO protegida por el trigger) → el trigger devuelve NEW sin bloquear.
ALTER TABLE estimaciones ADD COLUMN IF NOT EXISTS reemplaza_a INTEGER REFERENCES estimaciones(id) ON DELETE SET NULL;
-- Una estimación rechazada se reemplaza por A LO SUMO un reingreso (varios NULL
-- conviven en un UNIQUE). Guard idempotente sobre pg_constraint.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_estimaciones_reemplaza_a') THEN
    ALTER TABLE estimaciones ADD CONSTRAINT uq_estimaciones_reemplaza_a UNIQUE (reemplaza_a);
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_estimaciones_reemplaza_a ON estimaciones(reemplaza_a);

-- ---------------------------------------------------------------------
-- ETAPA C (Fundación) — Retención por ATRASO (penas convencionales, art. 138/139 RLOPSRM) +
-- avance físico/financiero snapshot en la estimación. Migración ADITIVA e idempotente.
--   · contratos.pena_convencional_pct: % de pena por atraso pactado POR CONTRATO (fracción 0–1,
--     ej. 0.05 = 5%). NULLABLE: NULL = sin pena pactada → retención por atraso = $0.
--     [validar tasa/regla de disparo (global vs por concepto; sobre bruto vs neto) con el profe].
--   · estimaciones.retencion_atraso: monto retenido por atraso en ESTA estimación (snapshot inmutable).
--   · estimaciones.avance_fisico_pct / avance_financiero_pct: % de avance al integrar (snapshot).
-- ---------------------------------------------------------------------
ALTER TABLE contratos ADD COLUMN IF NOT EXISTS pena_convencional_pct NUMERIC(5,4);
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_contratos_pena_pct') THEN
    ALTER TABLE contratos ADD CONSTRAINT chk_contratos_pena_pct
      CHECK (pena_convencional_pct IS NULL OR (pena_convencional_pct >= 0 AND pena_convencional_pct <= 1));
  END IF;
END $$;
ALTER TABLE estimaciones ADD COLUMN IF NOT EXISTS retencion_atraso      NUMERIC(14,2) NOT NULL DEFAULT 0;
ALTER TABLE estimaciones ADD COLUMN IF NOT EXISTS avance_fisico_pct     NUMERIC(7,4);
ALTER TABLE estimaciones ADD COLUMN IF NOT EXISTS avance_financiero_pct NUMERIC(7,4);
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_estimaciones_retencion_atraso') THEN
    ALTER TABLE estimaciones ADD CONSTRAINT chk_estimaciones_retencion_atraso CHECK (retencion_atraso >= 0);
  END IF;
END $$;

-- ---------------------------------------------------------------------
-- HU-15 (Equipo 3) — estimacion_observaciones: observaciones de la revisión, por
-- sección, con tipo/severidad y ciclo de vida (abierta→solventada). El turnado
-- supervisión→residencia y el semáforo de 15 días (art. 54 párr. 1 LOPSRM: la
-- residencia revisa/autoriza dentro de 15 días naturales) los controla el controller
-- (rol + máquina de estados + fecha real de recepción). EDITABLE (estado avanza):
-- SIN trigger de inmutabilidad.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS estimacion_observaciones (
  id            SERIAL PRIMARY KEY,
  estimacion_id INTEGER NOT NULL REFERENCES estimaciones(id) ON DELETE CASCADE,  -- FK a FUNDACIÓN
  seccion       VARCHAR(20) NOT NULL CHECK (seccion IN ('caratula','generadores','fotos','soportes','notas')),
  tipo          VARCHAR(20) NOT NULL CHECK (tipo IN ('aclaracion','correccion','rechazo')),
  severidad     VARCHAR(10) NOT NULL DEFAULT 'menor' CHECK (severidad IN ('menor','mayor','critica')),
  descripcion   TEXT NOT NULL,
  estado        VARCHAR(20) NOT NULL DEFAULT 'abierta' CHECK (estado IN ('abierta','solventada')),
  turnado_a     VARCHAR(20) CHECK (turnado_a IS NULL OR turnado_a IN ('supervision','residencia','contratista')),
  autor_id      INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  solventada_en TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_estimacion_observaciones_est ON estimacion_observaciones(estimacion_id);

-- ---------------------------------------------------------------------
-- HU-20 (Equipo 3) — tránsito a pago: presupuesto_anual + instruccion_pago.
-- Fundamento LITERAL:
--   suficiencia presupuestaria = art. 24 párr. 2 LOPSRM ("podrán convocar, adjudicar
--   o contratar... siempre y cuando cuenten previamente con la suficiencia
--   presupuestaria en la partida o partidas específicas").
--   plazo de pago = art. 54 párr. 2 LOPSRM (pago en plazo no mayor a 20 días naturales
--   desde que la residencia autoriza y el contratista presenta factura).
-- presupuesto_anual = techo por (ejercicio, dependencia). El bloqueo presupuestal
-- (Σ pagado + neto ≤ techo) y el semáforo de 20 días los DERIVA el controller.
-- EDITABLE (el techo se ajusta): SIN trigger.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS presupuesto_anual (
  id          SERIAL PRIMARY KEY,
  ejercicio   INTEGER NOT NULL CHECK (ejercicio >= 2000 AND ejercicio <= 2100),  -- año fiscal
  dependencia VARCHAR(200) NOT NULL,
  partida     VARCHAR(60),                                  -- clave presupuestal (descriptiva)
  techo       NUMERIC(18,2) NOT NULL CHECK (techo >= 0),    -- misma escala que contratos.monto
  descripcion TEXT,
  creado_por  INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_presupuesto_anual UNIQUE (ejercicio, dependencia)
);

-- instruccion_pago = orden formal de pago al autorizar la estimación; antecede al
-- pago efectivo (HU-21). UNA por estimación (UNIQUE). monto = snapshot del neto
-- autorizado. El estado avanza (emitida→notificada→cumplida/cancelada). Reconecta el
-- ciclo HU-20 → pagos.estimacion_id (HU-21, hoy nullable). EDITABLE en su ciclo: SIN
-- trigger de inmutabilidad (el congelamiento del contenido financiero lo hará el
-- controller HU-20; candidato a trigger "congela-contenido-deja-estado" como
-- sigecop_estimacion_inmutable en su fase de lógica).
CREATE TABLE IF NOT EXISTS instruccion_pago (
  id                     SERIAL PRIMARY KEY,
  estimacion_id          INTEGER NOT NULL REFERENCES estimaciones(id) ON DELETE CASCADE,        -- FK a FUNDACIÓN
  presupuesto_anual_id   INTEGER REFERENCES presupuesto_anual(id) ON DELETE SET NULL,           -- partida cargada (suficiencia art. 24)
  monto                  NUMERIC(18,2) CHECK (monto IS NULL OR monto >= 0),                     -- snapshot del neto autorizado
  factura_cfdi           VARCHAR(60),                                                            -- folio fiscal CFDI (precondición del plazo, art. 54)
  soportes_ok            BOOLEAN NOT NULL DEFAULT false,                                         -- todos los soportes obligatorios cargados
  estado                 VARCHAR(20) NOT NULL DEFAULT 'emitida'
                           CHECK (estado IN ('emitida','notificada','cumplida','cancelada')),
  fecha_instruccion      DATE NOT NULL DEFAULT CURRENT_DATE,
  instruida_por          INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,                    -- del JWT
  notificado_finanzas_en TIMESTAMPTZ,                                                            -- sello de notificación a Finanzas (in-app, Etapa 1)
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_instruccion_pago_estimacion UNIQUE (estimacion_id)
);
CREATE INDEX IF NOT EXISTS idx_instruccion_pago_estimacion  ON instruccion_pago(estimacion_id);
CREATE INDEX IF NOT EXISTS idx_instruccion_pago_presupuesto ON instruccion_pago(presupuesto_anual_id);

-- =====================================================================
-- PASADA F (Fundación) — SUSTITUCIÓN DE PERSONAS DEL ROSTER (art. 125 fr. I g RLOPSRM).
-- Fundamento Nivel 1 (literal, RLOPSRM art. 125 fr. I inciso g): al residente le
-- corresponde registrar en la Bitácora "La SUSTITUCIÓN del superintendente, del anterior
-- residente y de la supervisión". → Se SUSTITUYE, NO se borra: el histórico se conserva.
-- ADITIVO e IDEMPOTENTE: aplica sobre la BD existente (local/Render) sin reescribir datos.
--
-- DISEÑO: `contrato_roster` = histórico/versionado 1:N de (contrato, rol) → persona.
--   · El roster VIGENTE se DERIVA: la fila con vigencia_hasta IS NULL por (contrato, rol)
--     (índice único PARCIAL garantiza UNA sola activa).
--   · Los punteros escalares contratos.{residente_id,superintendente_id,supervision_id}
--     siguen siendo el CACHÉ que lee lib/acceso.js (congelado); el endpoint de sustitución
--     los sincroniza en UN SOLO punto, transaccional (cache↔roster nunca deriva).
--   · NO se borra a nadie: usuario_id es ON DELETE RESTRICT (no se puede eliminar una
--     persona referenciada en el roster — solo sustituirla).
--   · INMUTABILIDAD: la identidad de una asignación (contrato/rol/persona/inicio/sustituye_a)
--     es inalterable por trigger; SOLO se permite CERRARLA una vez (vigencia_hasta NULL→fecha).
--   · Las FIRMAS de la bitácora se atan a usuario_id (cuenta) con sus propios triggers de
--     inmutabilidad: este esquema NO toca bitacora_*, así una firma pasada conserva al
--     firmante ORIGINAL; la sustitución solo afecta firmas FUTURAS.
-- =====================================================================

CREATE TABLE IF NOT EXISTS contrato_roster (
  id             SERIAL PRIMARY KEY,
  contrato_id    INTEGER NOT NULL REFERENCES contratos(id) ON DELETE CASCADE,
  rol            VARCHAR(20) NOT NULL CHECK (rol IN ('residente','superintendente','supervision')),
  -- RESTRICT: la persona NO se borra, se sustituye (requisito art. 125 fr. I g).
  usuario_id     INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
  vigencia_desde DATE NOT NULL DEFAULT CURRENT_DATE,
  vigencia_hasta DATE,                                            -- NULL = asignación ACTIVA (vigente)
  motivo         TEXT,                                            -- razón de la sustitución que creó esta fila
  -- A qué asignación anterior reemplaza (traza la cadena). NO ACTION (no SET NULL): un SET NULL
  -- dispararía UPDATE y chocaría con el trigger de inmutabilidad; en la cascada del contrato
  -- ambas filas mueren en el mismo statement, así el chequeo diferido pasa.
  sustituye_a    INTEGER REFERENCES contrato_roster(id) ON DELETE NO ACTION,
  -- nota de bitácora (art. 125 fr. I g) que documenta la sustitución, registrada aparte por el
  -- residente (HU-09). Opcional; NO ACTION porque la nota es inmutable.
  nota_id        INTEGER REFERENCES bitacora_notas(id) ON DELETE NO ACTION,
  registrado_por INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,  -- del JWT (quién ejecutó la sustitución)
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_contrato_roster_vigencia CHECK (vigencia_hasta IS NULL OR vigencia_hasta >= vigencia_desde)
);
-- UNA sola persona ACTIVA por (contrato, rol): índice único PARCIAL (las cerradas no cuentan).
CREATE UNIQUE INDEX IF NOT EXISTS uq_contrato_roster_activo ON contrato_roster(contrato_id, rol) WHERE vigencia_hasta IS NULL;
CREATE INDEX IF NOT EXISTS idx_contrato_roster_contrato ON contrato_roster(contrato_id);
CREATE INDEX IF NOT EXISTS idx_contrato_roster_usuario ON contrato_roster(usuario_id);
CREATE INDEX IF NOT EXISTS idx_contrato_roster_sustituye ON contrato_roster(sustituye_a);

-- Inmutabilidad con transición controlada (espejo de sigecop_firma_transicion): la identidad
-- de una asignación no se reasigna; SOLO se permite cerrarla (NULL→fecha) UNA vez. Bloquea
-- UPDATE indebido; el DELETE en cascada del contrato sigue permitido (no se intercepta DELETE).
CREATE OR REPLACE FUNCTION sigecop_roster_transicion() RETURNS trigger AS $func$
BEGIN
  IF NEW.contrato_id    IS DISTINCT FROM OLD.contrato_id
     OR NEW.rol         IS DISTINCT FROM OLD.rol
     OR NEW.usuario_id  IS DISTINCT FROM OLD.usuario_id
     OR NEW.vigencia_desde IS DISTINCT FROM OLD.vigencia_desde
     OR NEW.sustituye_a IS DISTINCT FROM OLD.sustituye_a
     OR NEW.created_at  IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Una asignación del roster es inmutable; la sustitución crea una fila NUEVA, no se reasigna (art. 125 fr. I g RLOPSRM)';
  END IF;
  IF OLD.vigencia_hasta IS NOT NULL THEN
    RAISE EXCEPTION 'La asignación ya fue cerrada y es inalterable';
  END IF;
  RETURN NEW;  -- permite cerrar (vigencia_hasta NULL→fecha) y ajustar metadatos (motivo/nota/registrado_por)
END;
$func$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_contrato_roster_transicion ON contrato_roster;
CREATE TRIGGER trg_contrato_roster_transicion
  BEFORE UPDATE ON contrato_roster
  FOR EACH ROW EXECUTE FUNCTION sigecop_roster_transicion();

-- SEED del roster desde los punteros escalares EXISTENTES (idempotente, NO destructivo):
-- una fila ACTIVA por cada puntero presente, si el (contrato, rol) aún no tiene activa. Así la
-- BD de Render (con sus contratos ya creados) queda con el roster derivable sin perder datos.
INSERT INTO contrato_roster (contrato_id, rol, usuario_id, vigencia_desde, motivo)
SELECT c.id, 'residente', c.residente_id, COALESCE(c.fecha_inicio, c.created_at::date, CURRENT_DATE), 'Asignación inicial (alta del contrato)'
  FROM contratos c
 WHERE c.residente_id IS NOT NULL
   AND NOT EXISTS (SELECT 1 FROM contrato_roster r WHERE r.contrato_id = c.id AND r.rol = 'residente' AND r.vigencia_hasta IS NULL);
INSERT INTO contrato_roster (contrato_id, rol, usuario_id, vigencia_desde, motivo)
SELECT c.id, 'superintendente', c.superintendente_id, COALESCE(c.fecha_inicio, c.created_at::date, CURRENT_DATE), 'Asignación inicial (alta del contrato)'
  FROM contratos c
 WHERE c.superintendente_id IS NOT NULL
   AND NOT EXISTS (SELECT 1 FROM contrato_roster r WHERE r.contrato_id = c.id AND r.rol = 'superintendente' AND r.vigencia_hasta IS NULL);
INSERT INTO contrato_roster (contrato_id, rol, usuario_id, vigencia_desde, motivo)
SELECT c.id, 'supervision', c.supervision_id, COALESCE(c.fecha_inicio, c.created_at::date, CURRENT_DATE), 'Asignación inicial (alta del contrato)'
  FROM contratos c
 WHERE c.supervision_id IS NOT NULL
   AND NOT EXISTS (SELECT 1 FROM contrato_roster r WHERE r.contrato_id = c.id AND r.rol = 'supervision' AND r.vigencia_hasta IS NULL);

-- =====================================================================
-- PASADA HU-03 (Fundación) — CONVENIOS MODIFICATORIOS + versionado del programa.
-- Fundamento Nivel 1 (literal, LOPSRM art. 59, reforma DOF 14-11-2025): "Las dependencias y
-- entidades, podrán, dentro de su presupuesto autorizado, bajo su responsabilidad y por razones
-- fundadas y explícitas, modificar los contratos sobre la base de precios unitario… mediante
-- convenios, siempre y cuando no impliquen variaciones sustanciales al objeto del proyecto original."
-- ⚠️ VERIFICADO: el texto VIGENTE NO impone tope numérico (25%). El 25% vive en RLOPSRM art. 102
-- (disparador de revisión de indirectos/SFP, NO tope) y el 50% en LOPSRM art. 59 Bis (derecho a
-- ajuste de costos, NO tope). El límite real = presupuesto autorizado + cualitativo ("variación
-- sustancial al objeto"). El sistema CLASIFICA esos umbrales y aplica un guardrail PARAMETRIZABLE
-- (NO un tope legal). RLOPSRM art. 99 (dictamen técnico del residente) y art. 98 fr. II (ajuste de
-- fianza). ADITIVO e IDEMPOTENTE.
-- =====================================================================

-- (1) Convenios modificatorios: registro INMUTABLE de la modificación + su fundamento.
CREATE TABLE IF NOT EXISTS convenios_modificatorios (
  id                  SERIAL PRIMARY KEY,
  contrato_id         INTEGER NOT NULL REFERENCES contratos(id) ON DELETE CASCADE,
  numero              INTEGER NOT NULL,                          -- correlativo por contrato
  folio               VARCHAR(50),                               -- folio del convenio (capturado/derivado)
  tipo                VARCHAR(20) NOT NULL CHECK (tipo IN ('monto','plazo','programa','mixto')),
  fundamento          VARCHAR(20) NOT NULL DEFAULT 'art59' CHECK (fundamento IN ('art59','art59bis')),
  motivo              TEXT NOT NULL,                             -- razones fundadas y explícitas / dictamen técnico (art. 99 RLOPSRM)
  fecha               DATE NOT NULL DEFAULT CURRENT_DATE,
  monto_anterior      NUMERIC(18,2),
  monto_nuevo         NUMERIC(18,2),
  plazo_anterior_dias INTEGER,
  plazo_nuevo_dias    INTEGER,
  delta_monto_pct     NUMERIC(8,2),                              -- % variación de monto vs original (art. 100 RLOPSRM)
  delta_plazo_pct     NUMERIC(8,2),                              -- % variación de plazo vs original (independiente del monto)
  requiere_revision_sfp BOOLEAN NOT NULL DEFAULT false,         -- RLOPSRM art. 102 (>25% en supuestos fr. I-III)
  requiere_ajuste_costos BOOLEAN NOT NULL DEFAULT false,        -- LOPSRM art. 59 Bis (>50% → ajuste de indirectos/financiamiento)
  autorizado_por      INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,  -- del JWT
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_convenios_numero UNIQUE (contrato_id, numero),
  CONSTRAINT chk_convenios_montos CHECK (monto_nuevo IS NULL OR monto_nuevo >= 0),
  CONSTRAINT chk_convenios_plazo  CHECK (plazo_nuevo_dias IS NULL OR plazo_nuevo_dias > 0)
);
CREATE INDEX IF NOT EXISTS idx_convenios_contrato ON convenios_modificatorios(contrato_id);

-- Inmutabilidad: un convenio registrado es un evento formal append-only (como notas/pagos).
CREATE OR REPLACE FUNCTION sigecop_convenio_inmutable() RETURNS trigger AS $func$
BEGIN
  RAISE EXCEPTION 'Un convenio modificatorio registrado es inalterable (art. 59 LOPSRM / art. 99 RLOPSRM)';
END;
$func$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_convenio_inmutable ON convenios_modificatorios;
CREATE TRIGGER trg_convenio_inmutable
  BEFORE UPDATE ON convenios_modificatorios
  FOR EACH ROW EXECUTE FUNCTION sigecop_convenio_inmutable();

-- (2) VERSIONADO del programa de obra. El programa VIGENTE vive en programa_obra (A2, sin cambios);
--     cada versión se SNAPSHOTEA aquí (catálogo + celdas) cuando un convenio lo supersede. v1 = el
--     programa original (convenio_id NULL), snapshoteado perezosamente en el primer convenio.
--     NUNCA se sobrescribe ni se borra una versión: las versiones son inmutables (solo `vigente`
--     transiciona true→false al ser superseded).
CREATE TABLE IF NOT EXISTS programa_version (
  id            SERIAL PRIMARY KEY,
  contrato_id   INTEGER NOT NULL REFERENCES contratos(id) ON DELETE CASCADE,
  numero        INTEGER NOT NULL,                               -- 1 = original (A2); 2,3… por convenio
  -- El convenio que CREÓ esta versión; NULL = versión original (v1). NO ACTION (no SET NULL): un
  -- SET NULL dispararía UPDATE y chocaría con el trigger de inmutabilidad de la versión; en la
  -- cascada del contrato ambas mueren en el mismo statement (chequeo diferido pasa).
  convenio_id   INTEGER REFERENCES convenios_modificatorios(id) ON DELETE NO ACTION,
  monto         NUMERIC(18,2),                                  -- snapshot del monto del contrato en esta versión
  plazo_dias    INTEGER,                                        -- snapshot del plazo en esta versión
  vigente       BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  supersedido_en TIMESTAMPTZ,
  CONSTRAINT uq_programa_version_numero UNIQUE (contrato_id, numero)
);
-- UNA sola versión vigente por contrato (índice único PARCIAL).
CREATE UNIQUE INDEX IF NOT EXISTS uq_programa_version_vigente ON programa_version(contrato_id) WHERE vigente;
CREATE INDEX IF NOT EXISTS idx_programa_version_contrato ON programa_version(contrato_id);

-- Inmutabilidad de la versión: identidad congelada; SOLO se permite cerrarla (vigente true→false).
CREATE OR REPLACE FUNCTION sigecop_programa_version_transicion() RETURNS trigger AS $func$
BEGIN
  IF NEW.contrato_id IS DISTINCT FROM OLD.contrato_id
     OR NEW.numero    IS DISTINCT FROM OLD.numero
     OR NEW.convenio_id IS DISTINCT FROM OLD.convenio_id
     OR NEW.monto     IS DISTINCT FROM OLD.monto
     OR NEW.plazo_dias IS DISTINCT FROM OLD.plazo_dias
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Una versión del programa es inmutable; un convenio crea una versión NUEVA (art. 59 LOPSRM)';
  END IF;
  IF OLD.vigente = false THEN
    RAISE EXCEPTION 'La versión ya fue superseded y es inalterable';
  END IF;
  RETURN NEW;  -- permite vigente true→false + supersedido_en
END;
$func$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_programa_version_transicion ON programa_version;
CREATE TRIGGER trg_programa_version_transicion
  BEFORE UPDATE ON programa_version
  FOR EACH ROW EXECUTE FUNCTION sigecop_programa_version_transicion();

-- (2a) Snapshot del CATÁLOGO de la versión (filas de la matriz).
CREATE TABLE IF NOT EXISTS programa_version_concepto (
  id                  SERIAL PRIMARY KEY,
  programa_version_id INTEGER NOT NULL REFERENCES programa_version(id) ON DELETE CASCADE,
  clave               VARCHAR(40),
  concepto            TEXT,
  unidad              VARCHAR(20),
  cantidad            NUMERIC(14,3),
  pu                  NUMERIC(16,4),
  orden               INTEGER
);
CREATE INDEX IF NOT EXISTS idx_programa_version_concepto_ver ON programa_version_concepto(programa_version_id);

-- (2b) Snapshot de las CELDAS de la versión (concepto × periodo). Referencia el concepto por clave
--      dentro de la versión (self-contained, no FK al catálogo vivo que el convenio puede cambiar).
CREATE TABLE IF NOT EXISTS programa_version_celda (
  id                  SERIAL PRIMARY KEY,
  programa_version_id INTEGER NOT NULL REFERENCES programa_version(id) ON DELETE CASCADE,
  concepto_clave      VARCHAR(40),
  periodo_numero      INTEGER,
  periodo_inicio      DATE,
  periodo_fin         DATE,
  cantidad            NUMERIC(14,3)
);
CREATE INDEX IF NOT EXISTS idx_programa_version_celda_ver ON programa_version_celda(programa_version_id);

-- (3) Cierra la FK pendiente garantia_endosos.convenio_id → convenios_modificatorios(id). NO ACTION
--     (NO SET NULL): garantia_endosos es append-only (trigger sigecop_garantia_endoso_inmutable); un
--     SET NULL dispararía un UPDATE que el trigger bloquearía. En la cascada del contrato, endoso y
--     convenio mueren juntos (chequeo diferido pasa). SIN saneo de huérfanos: un UPDATE de saneo
--     dispararía el MISMO trigger append-only y abortaría el deploy si hubiera filas; y no puede haber
--     huérfanos (convenio_id solo se poblará con un id válido, ahora que esta FK lo enforza). Si por
--     datos legacy existieran, el ADD CONSTRAINT fallaría de forma honesta (señal, no corrupción).
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_garantia_endosos_convenio') THEN
    ALTER TABLE garantia_endosos ADD CONSTRAINT fk_garantia_endosos_convenio
      FOREIGN KEY (convenio_id) REFERENCES convenios_modificatorios(id) ON DELETE NO ACTION;
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_garantia_endosos_convenio ON garantia_endosos(convenio_id);

-- =====================================================================
-- PASADA HU-12/HU-21 (Fundación) — ENDURECIMIENTO del ciclo estimación→pago.
-- No-doble-pago: UN pago por estimación. UNIQUE PARCIAL (los pagos legacy con
-- estimacion_id NULL conviven; los nuevos amarran a una estimación real). ADITIVO/
-- IDEMPOTENTE. El amarre pago↔estimación, el importe=neto y el avance de estado a
-- 'pagada' los enforza el controller (pagos.controller.js).
-- =====================================================================
CREATE UNIQUE INDEX IF NOT EXISTS uq_pagos_estimacion ON pagos(estimacion_id) WHERE estimacion_id IS NOT NULL;
