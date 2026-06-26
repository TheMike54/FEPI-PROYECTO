-- ============================================================================
-- ITEM 3.5 (Oleada 3) — RE-SEED de cuentas ligadas a empresas (modelo 1 EMPRESA : N CUENTAS).
-- Para PROBAR el acotamiento por empresa: hoy el seed de schema.sql es 1 empresa : 1 cuenta y con UNA sola
-- dependencia no se puede demostrar "A-no-ve-B". Este script siembra una SEGUNDA dependencia y varias
-- personas por empresa. NO toca schema.sql. IDEMPOTENTE (re-ejecutable). art. 43 RLOPSRM (padrón).
-- Uso: `npm run reseed:cuentas`  (luego `npm run seed:demo` para los contratos).
-- Password de todas las cuentas: Sigecop2026!  (hash bcrypt reutilizado del seed demo).
-- ============================================================================

-- (0) Precondición: el esquema base debe existir.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'empresas')
     OR NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'usuarios' AND column_name = 'empresa_id') THEN
    RAISE EXCEPTION 'Aplica schema.sql primero (faltan la tabla empresas o usuarios.empresa_id)';
  END IF;
END $$;

-- (1) Asegura las empresas (3 demo + 3 nuevas). Idempotente por forma normalizada.
-- FIX idempotencia (26-jun): no re-crear la empresa demo si YA existe su nombre REAL (renombrado en un run
-- previo). Evita strays en re-runs (antes re-insertaba 'Dependencia Demo' etc. tras el rename).
INSERT INTO empresas (nombre)
SELECT v.nombre FROM (VALUES
  ('Dependencia Demo','Secretaría de Obras Públicas del Estado de Guerrero'),
  ('Constructora Demo','Constructora del Bajío, S.A. de C.V.'),
  ('Supervisión Externa Demo','Supervisión Técnica Integral, S.C.'),
  ('Dependencia Sur Demo','H. Ayuntamiento de Chilpancingo de los Bravo'),
  ('Constructora Patito SA de CV','Edificaciones del Norte, S.A. de C.V.'),
  ('Supervisión Técnica Sur Demo','Consultoría y Supervisión de Obra, S.C.')
) AS v(nombre, real)
WHERE NOT EXISTS (
  SELECT 1 FROM empresas e
  WHERE lower(btrim(regexp_replace(e.nombre, '\s+', ' ', 'g')))
      = lower(btrim(regexp_replace(v.nombre, '\s+', ' ', 'g')))
) AND NOT EXISTS (
  SELECT 1 FROM empresas e
  WHERE lower(btrim(regexp_replace(e.nombre, '\s+', ' ', 'g')))
      = lower(btrim(regexp_replace(v.real, '\s+', ' ', 'g')))
);

-- Tipos y estado de las empresas (las nuevas y el backfill de las demo).
UPDATE empresas SET tipo = 'dependencia'
  WHERE lower(btrim(regexp_replace(nombre, '\s+', ' ', 'g'))) IN ('dependencia demo', 'dependencia sur demo') AND tipo <> 'dependencia';
UPDATE empresas SET tipo = 'supervision'
  WHERE lower(btrim(regexp_replace(nombre, '\s+', ' ', 'g'))) IN ('supervisión externa demo', 'supervisión técnica sur demo') AND tipo <> 'supervision';
UPDATE empresas SET tipo = 'contratista'
  WHERE lower(btrim(regexp_replace(nombre, '\s+', ' ', 'g'))) IN ('constructora demo', 'constructora patito sa de cv') AND tipo <> 'contratista';
UPDATE empresas SET estado = 'validada' WHERE estado IS NULL OR estado = 'por_validar';

-- (2) Cuentas nuevas (password Sigecop2026!, hash reutilizado). estado 'activo' por DEFAULT.
INSERT INTO usuarios (nombre, email, password_hash, rol) VALUES
  -- Constructora Demo: 2 personas más (misma constructora) → 3 en total con contratista@
  ('Ing. Marco Superintendente 2', 'super2.demo@sigecop.test', '$2a$10$n4rhCkjJeeKM0GPpL8lUbenEoUFhckkQRHnui1SYG6z6/PbM.7qBy', 'contratista'),
  ('Ing. Laura Superintendente 3', 'super3.demo@sigecop.test', '$2a$10$n4rhCkjJeeKM0GPpL8lUbenEoUFhckkQRHnui1SYG6z6/PbM.7qBy', 'contratista'),
  -- Constructora Patito SA de CV: 2 personas
  ('Ing. Pedro Patito',  'patito1@sigecop.test', '$2a$10$n4rhCkjJeeKM0GPpL8lUbenEoUFhckkQRHnui1SYG6z6/PbM.7qBy', 'contratista'),
  ('Ing. Paola Patito',  'patito2@sigecop.test', '$2a$10$n4rhCkjJeeKM0GPpL8lUbenEoUFhckkQRHnui1SYG6z6/PbM.7qBy', 'contratista'),
  -- Dependencia Demo: 1 residente más
  ('Ing. Raúl Residente 2', 'residente2.demo@sigecop.test', '$2a$10$n4rhCkjJeeKM0GPpL8lUbenEoUFhckkQRHnui1SYG6z6/PbM.7qBy', 'residente'),
  -- Dependencia Sur Demo (SEGUNDA dependencia — clave para A-no-ve-B): 1 dependencia + 1 residente
  ('Lic. Diana Dependencia Sur', 'dependencia.sur@sigecop.test', '$2a$10$n4rhCkjJeeKM0GPpL8lUbenEoUFhckkQRHnui1SYG6z6/PbM.7qBy', 'dependencia'),
  ('Ing. Iván Residente Sur',     'residente.sur@sigecop.test',   '$2a$10$n4rhCkjJeeKM0GPpL8lUbenEoUFhckkQRHnui1SYG6z6/PbM.7qBy', 'residente'),
  -- Supervisión Externa Demo: 1 persona más
  ('Arq. Sergio Supervisión 2', 'superv2.demo@sigecop.test', '$2a$10$n4rhCkjJeeKM0GPpL8lUbenEoUFhckkQRHnui1SYG6z6/PbM.7qBy', 'supervision'),
  -- Supervisión Técnica Sur Demo: 1 persona
  ('Arq. Silvia Supervisión Sur', 'superv.sur@sigecop.test', '$2a$10$n4rhCkjJeeKM0GPpL8lUbenEoUFhckkQRHnui1SYG6z6/PbM.7qBy', 'supervision')
ON CONFLICT (email) DO NOTHING;

-- (3) Vincula cada cuenta a su empresa (match por nombre normalizado; solo si empresa_id IS NULL → no pisa).
UPDATE usuarios SET empresa_id = (SELECT id FROM empresas WHERE lower(btrim(regexp_replace(nombre,'\s+',' ','g'))) = 'constructora demo' LIMIT 1)
  WHERE email IN ('super2.demo@sigecop.test','super3.demo@sigecop.test') AND empresa_id IS NULL;
UPDATE usuarios SET empresa_id = (SELECT id FROM empresas WHERE lower(btrim(regexp_replace(nombre,'\s+',' ','g'))) = 'constructora patito sa de cv' LIMIT 1)
  WHERE email IN ('patito1@sigecop.test','patito2@sigecop.test') AND empresa_id IS NULL;
UPDATE usuarios SET empresa_id = (SELECT id FROM empresas WHERE lower(btrim(regexp_replace(nombre,'\s+',' ','g'))) = 'dependencia demo' LIMIT 1)
  WHERE email = 'residente2.demo@sigecop.test' AND empresa_id IS NULL;
UPDATE usuarios SET empresa_id = (SELECT id FROM empresas WHERE lower(btrim(regexp_replace(nombre,'\s+',' ','g'))) = 'dependencia sur demo' LIMIT 1)
  WHERE email IN ('dependencia.sur@sigecop.test','residente.sur@sigecop.test') AND empresa_id IS NULL;
UPDATE usuarios SET empresa_id = (SELECT id FROM empresas WHERE lower(btrim(regexp_replace(nombre,'\s+',' ','g'))) = 'supervisión externa demo' LIMIT 1)
  WHERE email = 'superv2.demo@sigecop.test' AND empresa_id IS NULL;
UPDATE usuarios SET empresa_id = (SELECT id FROM empresas WHERE lower(btrim(regexp_replace(nombre,'\s+',' ','g'))) = 'supervisión técnica sur demo' LIMIT 1)
  WHERE email = 'superv.sur@sigecop.test' AND empresa_id IS NULL;

-- ============================================================================
-- (4) AMPLIACIÓN 20-jun — más variedad para la demo y el acotamiento por empresa.
-- Sube a 3 dependencias / 3 contratistas / 3 supervisiones, con la regla 1 EMPRESA : N CUENTAS.
-- Mismo patrón idempotente (INSERT … WHERE NOT EXISTS / ON CONFLICT / UPDATE … WHERE empresa_id IS NULL).
-- Password de todas: Sigecop2026! (hash bcrypt reutilizado). Es ADITIVO: no pisa lo anterior.
-- ============================================================================

-- (4.1) Tres empresas nuevas (1 dependencia, 1 contratista, 1 supervisión).
INSERT INTO empresas (nombre)
SELECT v.nombre FROM (VALUES
  ('Dependencia Norte Demo','Universidad Autónoma de Guerrero'),
  ('Constructora del Pacífico SA de CV','Grupo Constructor Pacífico, S.A. de C.V.'),
  ('Supervisión Integral del Norte','Ingeniería y Control de Calidad del Sur, S.C.')
) AS v(nombre, real)
WHERE NOT EXISTS (
  SELECT 1 FROM empresas e
  WHERE lower(btrim(regexp_replace(e.nombre, '\s+', ' ', 'g')))
      = lower(btrim(regexp_replace(v.nombre, '\s+', ' ', 'g')))
) AND NOT EXISTS (
  SELECT 1 FROM empresas e
  WHERE lower(btrim(regexp_replace(e.nombre, '\s+', ' ', 'g')))
      = lower(btrim(regexp_replace(v.real, '\s+', ' ', 'g')))
);

-- (4.2) Tipo y estado de las empresas nuevas.
UPDATE empresas SET tipo = 'dependencia'
  WHERE lower(btrim(regexp_replace(nombre, '\s+', ' ', 'g'))) = 'dependencia norte demo' AND tipo <> 'dependencia';
UPDATE empresas SET tipo = 'contratista'
  WHERE lower(btrim(regexp_replace(nombre, '\s+', ' ', 'g'))) = 'constructora del pacífico sa de cv' AND tipo <> 'contratista';
UPDATE empresas SET tipo = 'supervision'
  WHERE lower(btrim(regexp_replace(nombre, '\s+', ' ', 'g'))) = 'supervisión integral del norte' AND tipo <> 'supervision';
UPDATE empresas SET estado = 'validada'
  WHERE lower(btrim(regexp_replace(nombre, '\s+', ' ', 'g')))
        IN ('dependencia norte demo','constructora del pacífico sa de cv','supervisión integral del norte')
    AND (estado IS NULL OR estado = 'por_validar');

-- (4.3) Cuentas nuevas (password Sigecop2026!, hash reutilizado). estado 'activo' por DEFAULT.
INSERT INTO usuarios (nombre, email, password_hash, rol) VALUES
  -- Dependencia Norte Demo (3.ª dependencia → refuerza A-no-ve-B): dependencia + residente + finanzas
  ('Lic. Norma Dependencia Norte', 'dep2@sigecop.test',             '$2a$10$n4rhCkjJeeKM0GPpL8lUbenEoUFhckkQRHnui1SYG6z6/PbM.7qBy', 'dependencia'),
  ('Ing. Néstor Residente Norte',  'residente.norte@sigecop.test',  '$2a$10$n4rhCkjJeeKM0GPpL8lUbenEoUFhckkQRHnui1SYG6z6/PbM.7qBy', 'residente'),
  ('C.P. Nadia Finanzas Norte',    'finanzas.norte@sigecop.test',   '$2a$10$n4rhCkjJeeKM0GPpL8lUbenEoUFhckkQRHnui1SYG6z6/PbM.7qBy', 'finanzas'),
  -- Dependencia Sur Demo: 1 finanzas más (para cubrir finanzas en más de una dependencia)
  ('C.P. Susana Finanzas Sur',     'finanzas.sur@sigecop.test',     '$2a$10$n4rhCkjJeeKM0GPpL8lUbenEoUFhckkQRHnui1SYG6z6/PbM.7qBy', 'finanzas'),
  -- Constructora del Pacífico (3.ª constructora): 2 superintendentes
  ('Ing. Patricia Pacífico',       'pacifico1@sigecop.test',        '$2a$10$n4rhCkjJeeKM0GPpL8lUbenEoUFhckkQRHnui1SYG6z6/PbM.7qBy', 'contratista'),
  ('Ing. Pablo Pacífico',          'pacifico2@sigecop.test',        '$2a$10$n4rhCkjJeeKM0GPpL8lUbenEoUFhckkQRHnui1SYG6z6/PbM.7qBy', 'contratista'),
  -- Supervisión Integral del Norte (3.ª supervisión): 1 persona
  ('Arq. Nadia Supervisión Norte', 'superv.norte@sigecop.test',     '$2a$10$n4rhCkjJeeKM0GPpL8lUbenEoUFhckkQRHnui1SYG6z6/PbM.7qBy', 'supervision')
ON CONFLICT (email) DO NOTHING;

-- (4.4) Vincula cada cuenta nueva a su empresa (solo si empresa_id IS NULL → no pisa).
UPDATE usuarios SET empresa_id = (SELECT id FROM empresas WHERE lower(btrim(regexp_replace(nombre,'\s+',' ','g'))) = 'dependencia norte demo' LIMIT 1)
  WHERE email IN ('dep2@sigecop.test','residente.norte@sigecop.test','finanzas.norte@sigecop.test') AND empresa_id IS NULL;
UPDATE usuarios SET empresa_id = (SELECT id FROM empresas WHERE lower(btrim(regexp_replace(nombre,'\s+',' ','g'))) = 'dependencia sur demo' LIMIT 1)
  WHERE email = 'finanzas.sur@sigecop.test' AND empresa_id IS NULL;
UPDATE usuarios SET empresa_id = (SELECT id FROM empresas WHERE lower(btrim(regexp_replace(nombre,'\s+',' ','g'))) = 'constructora del pacífico sa de cv' LIMIT 1)
  WHERE email IN ('pacifico1@sigecop.test','pacifico2@sigecop.test') AND empresa_id IS NULL;
UPDATE usuarios SET empresa_id = (SELECT id FROM empresas WHERE lower(btrim(regexp_replace(nombre,'\s+',' ','g'))) = 'supervisión integral del norte' LIMIT 1)
  WHERE email = 'superv.norte@sigecop.test' AND empresa_id IS NULL;

-- ============================================================================
-- (5) NOMBRES REALISTAS (PLAN_DATOS_DEMO_PROFE_21jun) — renombra las 9 empresas demo a nombres realistas
-- mexicanos AL FINAL (tras crearlas y vincular las cuentas por nombre demo). Solo cambia el DISPLAY; conserva
-- el empresa_id de cada cuenta. IDEMPOTENTE: si ya están renombradas, los WHERE por nombre demo no matchean.
-- 3 dependencias / 3 contratistas / 3 supervisiones. (schema.sql siembra 3 base con nombre demo → aquí se renombran.)
-- ============================================================================
-- FIX idempotencia (26-jun): cada rename corre SOLO si el nombre destino aún NO existe. Antes, en un
-- re-run el bloque INSERT de arriba re-creaba 'Dependencia Demo' (porque ya había sido renombrada) y este
-- UPDATE chocaba con el índice único uq_empresas_nombre_norm de la 'Secretaría…' ya existente (500/abortaba
-- la transacción). El guard NOT EXISTS(destino) lo vuelve seguro de re-ejecutar.
DO $$
DECLARE
  pares TEXT[] := ARRAY[
    'dependencia demo','Secretaría de Obras Públicas del Estado de Guerrero',
    'dependencia sur demo','H. Ayuntamiento de Chilpancingo de los Bravo',
    'dependencia norte demo','Universidad Autónoma de Guerrero',
    'constructora demo','Constructora del Bajío, S.A. de C.V.',
    'constructora patito sa de cv','Edificaciones del Norte, S.A. de C.V.',
    'constructora del pacífico sa de cv','Grupo Constructor Pacífico, S.A. de C.V.',
    'supervisión externa demo','Supervisión Técnica Integral, S.C.',
    'supervisión técnica sur demo','Consultoría y Supervisión de Obra, S.C.',
    'supervisión integral del norte','Ingeniería y Control de Calidad del Sur, S.C.'
  ];
  i INT;
  norm_demo TEXT; real_name TEXT;
BEGIN
  FOR i IN 1 .. array_length(pares,1)/2 LOOP
    norm_demo := pares[i*2-1];
    real_name := pares[i*2];
    UPDATE empresas SET nombre = real_name
      WHERE lower(btrim(regexp_replace(nombre,'\s+',' ','g'))) = norm_demo
        AND NOT EXISTS (SELECT 1 FROM empresas e2
          WHERE lower(btrim(regexp_replace(e2.nombre,'\s+',' ','g'))) = lower(btrim(regexp_replace(real_name,'\s+',' ','g'))));
  END LOOP;
END $$;

-- Verificación rápida (informativa): cuántas cuentas por empresa.
-- SELECT e.nombre, e.tipo, count(u.id) FROM empresas e LEFT JOIN usuarios u ON u.empresa_id=e.id GROUP BY e.id ORDER BY e.nombre;
