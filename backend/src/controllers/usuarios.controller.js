const { query } = require('../db/pool');

const ESTADOS_VALIDOS = ['pendiente', 'activo', 'rechazado'];
const ROLES_VALIDOS = ['residente', 'contratista', 'supervision', 'dependencia', 'finanzas'];

// GET /api/usuarios?estado=pendiente — lista usuarios, opcionalmente por estado.
async function listarUsuarios(req, res) {
  try {
    const { estado } = req.query;

    if (estado !== undefined && !ESTADOS_VALIDOS.includes(estado)) {
      return res.status(400).json({ error: 'estado inválido' });
    }

    const result = estado
      ? await query(
          `SELECT id, nombre, email, rol, estado, created_at
             FROM usuarios WHERE estado = $1 ORDER BY created_at ASC`,
          [estado]
        )
      : await query(
          `SELECT id, nombre, email, rol, estado, created_at
             FROM usuarios ORDER BY created_at ASC`
        );

    return res.status(200).json(result.rows);
  } catch (err) {
    console.error('[listarUsuarios]', err);
    return res.status(500).json({ error: 'Error interno' });
  }
}

// PATCH /api/usuarios/:id/aprobar  body { rol } — fija el rol definitivo y activa.
async function aprobarUsuario(req, res) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const { rol } = req.body || {};
    if (rol !== undefined && !ROLES_VALIDOS.includes(rol)) {
      return res.status(400).json({ error: 'rol inválido' });
    }

    // Si llega rol, se actualiza; si no, se conserva el rol solicitado.
    const result = rol
      ? await query(
          `UPDATE usuarios SET rol = $1, estado = 'activo'
             WHERE id = $2 RETURNING id, nombre, email, rol, estado`,
          [rol, id]
        )
      : await query(
          `UPDATE usuarios SET estado = 'activo'
             WHERE id = $1 RETURNING id, nombre, email, rol, estado`,
          [id]
        );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    return res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error('[aprobarUsuario]', err);
    return res.status(500).json({ error: 'Error interno' });
  }
}

// PATCH /api/usuarios/:id/rechazar — marca la solicitud como rechazada.
async function rechazarUsuario(req, res) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const result = await query(
      `UPDATE usuarios SET estado = 'rechazado'
         WHERE id = $1 RETURNING id, nombre, email, rol, estado`,
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    return res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error('[rechazarUsuario]', err);
    return res.status(500).json({ error: 'Error interno' });
  }
}

module.exports = { listarUsuarios, aprobarUsuario, rechazarUsuario };
