// backend/scripts/borrar-usuario.js
// Uso: node scripts/borrar-usuario.js correo@dominio.com
//
// Borrado SEGURO de un usuario. Solo elimina si el usuario NO tiene registros
// asociados. Descubre dinamicamente que tablas referencian usuarios(id) leyendo
// el catalogo de Postgres, asi se adapta solo cuando el esquema crezca en sprints
// futuros (no hay lista de tablas hardcodeada que mantener).
require('dotenv').config();
// Reutiliza la MISMA logica de conexion que el backend (src/db/pool.js):
// con DATABASE_URL -> Render con SSL; sin ella -> DB_HOST/DB_PORT/... locales.
// El require va despues de dotenv.config() para que el pool lea el .env ya cargado.
const { pool } = require('../src/db/pool');

const [, , emailArg] = process.argv;

if (!emailArg) {
  console.error('Uso: node scripts/borrar-usuario.js correo@dominio.com');
  process.exit(1);
}
const email = emailArg.toLowerCase();

// FKs que apuntan a usuarios(id): tabla hija, columna referenciante y regla ON DELETE.
const FK_QUERY = `
  SELECT c.conrelid::regclass::text AS tabla,
         att.attname               AS columna,
         CASE c.confdeltype
           WHEN 'a' THEN 'NO ACTION'
           WHEN 'r' THEN 'RESTRICT'
           WHEN 'c' THEN 'CASCADE'
           WHEN 'n' THEN 'SET NULL'
           WHEN 'd' THEN 'SET DEFAULT'
         END                       AS on_delete
  FROM pg_constraint c
  JOIN pg_attribute att
    ON att.attrelid = c.conrelid
   AND att.attnum = ANY (c.conkey)
  WHERE c.contype = 'f'
    AND c.confrelid = 'usuarios'::regclass
  ORDER BY tabla, columna;
`;

(async () => {
  try {
    // 1) Localizar al usuario por correo.
    const u = await pool.query(
      'SELECT id, nombre, email, rol, estado FROM usuarios WHERE email = $1',
      [email]
    );
    if (u.rowCount === 0) {
      console.error(`Usuario no encontrado: ${email}`);
      process.exit(1);
    }
    const usuario = u.rows[0];
    console.log(`Usuario: id=${usuario.id}  ${usuario.nombre}  <${usuario.email}>  rol=${usuario.rol}  estado=${usuario.estado}`);

    // 2) Descubrir que tablas referencian usuarios(id) (inspeccion del esquema).
    const fks = (await pool.query(FK_QUERY)).rows;
    console.log('Referencias a usuarios(id):');
    if (fks.length === 0) console.log('  (ninguna)');
    else for (const fk of fks) console.log(`  - ${fk.tabla}.${fk.columna}  ON DELETE ${fk.on_delete}`);

    // 3) Contar registros del usuario en cada tabla referenciante.
    //    (tabla/columna provienen del catalogo, no del usuario -> sin inyeccion.)
    const conDatos = [];
    for (const fk of fks) {
      const sql = `SELECT COUNT(*)::int AS n FROM ${fk.tabla} WHERE "${fk.columna}" = $1`;
      const n = (await pool.query(sql, [usuario.id])).rows[0].n;
      if (n > 0) conDatos.push({ ...fk, n });
    }

    // 4) Si tiene datos asociados -> NO borrar; sugerir desactivar.
    if (conDatos.length > 0) {
      console.error(`\nNO se borra: "${usuario.nombre}" (id ${usuario.id}) tiene datos asociados:`);
      for (const d of conDatos) console.error(`  - ${d.n} registro(s) en ${d.tabla}.${d.columna}`);
      console.error('\nSugerencia: desactivalo en vez de borrarlo (conserva la trazabilidad):');
      console.error(`  UPDATE usuarios SET estado='rechazado' WHERE email='${email}';`);
      process.exit(2);
    }

    // 5) Sin datos asociados -> borrar.
    const del = await pool.query(
      'DELETE FROM usuarios WHERE email = $1 RETURNING id, nombre, email, rol',
      [email]
    );
    console.log('\nUsuario borrado:', del.rows[0]);
  } catch (e) {
    // Red de seguridad: si alguna FK fuese RESTRICT/NO ACTION, el DELETE lanza 23503.
    if (e.code === '23503') {
      console.error('NO se borro: el usuario tiene registros dependientes (FK 23503). Desactivalo en su lugar.');
    } else {
      console.error('Error:', e.message);
    }
    process.exit(1);
  } finally {
    await pool.end();
  }
})();
