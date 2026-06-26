-- reparto_extra.sql — 3 empresas dependencia NUEVAS + 10 cuentas NUEVAS. Idempotente. Password Sigecop2026!
-- (hash reutilizado). CORRER DESPUÉS de reseed_cuentas.sql. Persistido al repo desde el Apéndice A de
-- docs/pruebas/REPARTO_EQUIPO_RENDER_25jun.md (26-jun) para no depender del scratchpad. Validado en LOCAL.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='empresas')
     OR NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='usuarios' AND column_name='empresa_id') THEN
    RAISE EXCEPTION 'Aplica schema.sql primero (falta empresas o usuarios.empresa_id)';
  END IF;
END $$;

INSERT INTO empresas (nombre)
SELECT v.nombre FROM (VALUES
  ('Junta de Caminos del Estado de Guerrero'),
  ('Comisión de Agua Potable y Alcantarillado del Estado de Guerrero'),
  ('Instituto Guerrerense de la Infraestructura Física Educativa')
) AS v(nombre)
WHERE NOT EXISTS (SELECT 1 FROM empresas e
  WHERE lower(btrim(regexp_replace(e.nombre,'\s+',' ','g'))) = lower(btrim(regexp_replace(v.nombre,'\s+',' ','g'))));
UPDATE empresas SET tipo='dependencia'
  WHERE lower(btrim(regexp_replace(nombre,'\s+',' ','g'))) IN
    ('junta de caminos del estado de guerrero',
     'comisión de agua potable y alcantarillado del estado de guerrero',
     'instituto guerrerense de la infraestructura física educativa') AND tipo<>'dependencia';
UPDATE empresas SET estado='validada'
  WHERE lower(btrim(regexp_replace(nombre,'\s+',' ','g'))) IN
    ('junta de caminos del estado de guerrero',
     'comisión de agua potable y alcantarillado del estado de guerrero',
     'instituto guerrerense de la infraestructura física educativa') AND (estado IS NULL OR estado='por_validar');

INSERT INTO usuarios (nombre,email,password_hash,rol) VALUES
 ('Ing. Leticia Residente E4',  'residente4@sigecop.test',  '$2a$10$n4rhCkjJeeKM0GPpL8lUbenEoUFhckkQRHnui1SYG6z6/PbM.7qBy','residente'),
 ('Ing. Ramón Residente E5',    'residente5@sigecop.test',  '$2a$10$n4rhCkjJeeKM0GPpL8lUbenEoUFhckkQRHnui1SYG6z6/PbM.7qBy','residente'),
 ('Arq. Verónica Supervisión E4','superv4@sigecop.test',    '$2a$10$n4rhCkjJeeKM0GPpL8lUbenEoUFhckkQRHnui1SYG6z6/PbM.7qBy','supervision'),
 ('Arq. Vicente Supervisión E5', 'superv5@sigecop.test',    '$2a$10$n4rhCkjJeeKM0GPpL8lUbenEoUFhckkQRHnui1SYG6z6/PbM.7qBy','supervision'),
 ('Lic. Lucía Dependencia E4',  'dependencia4@sigecop.test','$2a$10$n4rhCkjJeeKM0GPpL8lUbenEoUFhckkQRHnui1SYG6z6/PbM.7qBy','dependencia'),
 ('Lic. Valeria Dependencia E5','dependencia5@sigecop.test','$2a$10$n4rhCkjJeeKM0GPpL8lUbenEoUFhckkQRHnui1SYG6z6/PbM.7qBy','dependencia'),
 ('Lic. Carmen Dependencia E6', 'dependencia6@sigecop.test','$2a$10$n4rhCkjJeeKM0GPpL8lUbenEoUFhckkQRHnui1SYG6z6/PbM.7qBy','dependencia'),
 ('C.P. Lorena Finanzas E4',    'finanzas4@sigecop.test',   '$2a$10$n4rhCkjJeeKM0GPpL8lUbenEoUFhckkQRHnui1SYG6z6/PbM.7qBy','finanzas'),
 ('C.P. Valentín Finanzas E5',  'finanzas5@sigecop.test',   '$2a$10$n4rhCkjJeeKM0GPpL8lUbenEoUFhckkQRHnui1SYG6z6/PbM.7qBy','finanzas'),
 ('C.P. Cinthia Finanzas E6',   'finanzas6@sigecop.test',   '$2a$10$n4rhCkjJeeKM0GPpL8lUbenEoUFhckkQRHnui1SYG6z6/PbM.7qBy','finanzas')
ON CONFLICT (email) DO NOTHING;

UPDATE usuarios SET empresa_id=(SELECT id FROM empresas WHERE lower(btrim(regexp_replace(nombre,'\s+',' ','g')))='junta de caminos del estado de guerrero' LIMIT 1)
  WHERE email IN ('dependencia4@sigecop.test','finanzas4@sigecop.test') AND empresa_id IS NULL;
UPDATE usuarios SET empresa_id=(SELECT id FROM empresas WHERE lower(btrim(regexp_replace(nombre,'\s+',' ','g')))='comisión de agua potable y alcantarillado del estado de guerrero' LIMIT 1)
  WHERE email IN ('residente4@sigecop.test','dependencia5@sigecop.test','finanzas5@sigecop.test') AND empresa_id IS NULL;
UPDATE usuarios SET empresa_id=(SELECT id FROM empresas WHERE lower(btrim(regexp_replace(nombre,'\s+',' ','g')))='instituto guerrerense de la infraestructura física educativa' LIMIT 1)
  WHERE email IN ('residente5@sigecop.test','dependencia6@sigecop.test','finanzas6@sigecop.test') AND empresa_id IS NULL;
UPDATE usuarios SET empresa_id=(SELECT id FROM empresas WHERE lower(btrim(regexp_replace(nombre,'\s+',' ','g')))='supervisión técnica integral, s.c.' LIMIT 1)
  WHERE email='superv4@sigecop.test' AND empresa_id IS NULL;
UPDATE usuarios SET empresa_id=(SELECT id FROM empresas WHERE lower(btrim(regexp_replace(nombre,'\s+',' ','g')))='consultoría y supervisión de obra, s.c.' LIMIT 1)
  WHERE email='superv5@sigecop.test' AND empresa_id IS NULL;

SELECT email, rol, estado, (SELECT nombre FROM empresas e WHERE e.id=u.empresa_id) AS empresa
FROM usuarios u WHERE email IN
 ('residente4@sigecop.test','residente5@sigecop.test','superv4@sigecop.test','superv5@sigecop.test',
  'dependencia4@sigecop.test','dependencia5@sigecop.test','dependencia6@sigecop.test',
  'finanzas4@sigecop.test','finanzas5@sigecop.test','finanzas6@sigecop.test')
ORDER BY rol, email;
