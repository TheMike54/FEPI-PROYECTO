// backend/scripts/crear-usuario.js
// Uso: node scripts/crear-usuario.js "Nombre" correo contraseña rol
require('dotenv').config();
const bcrypt = require('bcryptjs');
// Reutiliza la MISMA logica de conexion que el backend (src/db/pool.js):
// con DATABASE_URL -> Render con SSL; sin ella -> DB_HOST/DB_PORT/... locales.
// El require va despues de dotenv.config() para que el pool lea el .env ya cargado.
const { pool } = require('../src/db/pool');

const [, , nombre, email, password, rol] = process.argv;

if (!nombre || !email || !password || !rol) {
  console.error('Uso: node scripts/crear-usuario.js "Nombre Completo" correo@dominio.com contraseña rol');
  console.error('Roles: residente | contratista | supervision | dependencia | finanzas');
  process.exit(1);
}

const ROLES = ['residente', 'contratista', 'supervision', 'dependencia', 'finanzas'];
if (!ROLES.includes(rol)) {
  console.error(`Rol invalido: "${rol}". Debe ser uno de: ${ROLES.join(', ')}`);
  process.exit(1);
}

(async () => {
  try {
    const hash = await bcrypt.hash(password, 10);
    const { rows } = await pool.query(
      `INSERT INTO usuarios (nombre, email, password_hash, rol)
       VALUES ($1, $2, $3, $4)
       RETURNING id, nombre, email, rol, created_at`,
      [nombre, email.toLowerCase(), hash, rol]
    );
    console.log('Usuario creado:', rows[0]);
  } catch (e) {
    if (e.code === '23505') console.error('Ese correo ya esta registrado.');
    else console.error('Error:', e.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
})();
