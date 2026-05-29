// backend/scripts/crear-usuario.js
// Uso: node scripts/crear-usuario.js "Nombre" correo contraseña rol
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

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

// Auto-detectar SSL: la BD de Render requiere SSL; local no.
const url = process.env.DATABASE_URL || '';
const isRemote = !/(localhost|127\.0\.0\.1)/.test(url);
const pool = new Pool({
  connectionString: url,
  ssl: isRemote ? { rejectUnauthorized: false } : false,
});

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
