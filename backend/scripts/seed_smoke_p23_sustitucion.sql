-- =====================================================================
-- SEED LOCAL para smoke del Pase 2.3 (sustitución de personas → nota de bitácora + expediente).
-- NO es parte de schema.sql. Idempotente.
--
-- Crea UNA cuenta SUSTITUTA activa de rol 'contratista' (para poder sustituir al superintendente:
-- el rol de roster 'superintendente' exige una cuenta de tipo 'contratista', y el seed de schema
-- solo trae UNA cuenta contratista). El resto de cuentas (residente/contratista/dependencia) ya
-- las siembra schema.sql. Los CONTRATOS de prueba los crea el propio spec por API (alta real),
-- así que aquí solo hace falta la cuenta sustituta.
--
-- Reusa el hash bcrypt de 'Sigecop2026!' (el mismo de residente/dependencia/finanzas en schema.sql)
-- para que la cuenta pueda LOGUEAR en el e2e y el spec resuelva su id por login (no se hardcodea).
--
-- BLOQUE 3c (REGLA 4): la cuenta sustituta debe pertenecer a la MISMA empresa que el superintendente
-- saliente (contratista@sigecop.test = "Constructora Demo"), porque la sustitución reemplaza a la
-- PERSONA, no a la empresa del contrato (el guard de roster.controller exige misma empresa). Se hereda
-- su empresa_id por subconsulta (robusto, no se hardcodea el id). Sin esto, el sustituto quedaría sin
-- empresa y el guard rechazaría la sustitución (409).
-- =====================================================================
INSERT INTO usuarios (nombre, email, password_hash, rol, estado, empresa_id)
VALUES ('Arq. Sustituto Contratista Demo', 'sustituto.contratista@sigecop.test',
        '$2a$10$n4rhCkjJeeKM0GPpL8lUbenEoUFhckkQRHnui1SYG6z6/PbM.7qBy', 'contratista', 'activo',
        (SELECT empresa_id FROM usuarios WHERE email = 'contratista@sigecop.test'))
ON CONFLICT (email) DO UPDATE SET rol = 'contratista', estado = 'activo',
        empresa_id = (SELECT empresa_id FROM usuarios WHERE email = 'contratista@sigecop.test');

-- Verificación.
SELECT id, email, rol, estado FROM usuarios WHERE email = 'sustituto.contratista@sigecop.test';
