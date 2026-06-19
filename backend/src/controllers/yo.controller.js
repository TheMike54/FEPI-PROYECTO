// FIX 2.4 (Oleada 2) — perfil del usuario autenticado para el dropdown "mi info / mi empresa". Archivo NUEVO.
// Devuelve nombre, correo, rol y la EMPRESA del usuario (nombre + tipo + estado), que hoy el front no recibe
// (el JWT solo lleva empresa_id; el email y el tipo/estado de la empresa no viajan en el token). Solo lectura,
// sobre el propio usuario (req.user del JWT) + LEFT JOIN empresas. No toca auth ni el catálogo público.
const { pool } = require('../db/pool');

// GET /api/yo
async function obtenerMiPerfil(req, res) {
  try {
    const r = await pool.query(
      `SELECT u.id, u.nombre, u.email, u.rol, u.empresa_id,
              e.nombre AS empresa_nombre, e.tipo AS empresa_tipo, e.estado AS empresa_estado
         FROM usuarios u
         LEFT JOIN empresas e ON e.id = u.empresa_id
        WHERE u.id = $1`,
      [req.user.id]
    );
    if (r.rowCount === 0) return res.status(404).json({ error: 'Usuario no encontrado' });
    const u = r.rows[0];
    return res.status(200).json({
      id: u.id, nombre: u.nombre, email: u.email, rol: u.rol,
      empresa: u.empresa_id
        ? { id: u.empresa_id, nombre: u.empresa_nombre, tipo: u.empresa_tipo, estado: u.empresa_estado }
        : null,
    });
  } catch (err) {
    console.error('[obtenerMiPerfil]', err);
    return res.status(500).json({ error: 'Error interno' });
  }
}

module.exports = { obtenerMiPerfil };
