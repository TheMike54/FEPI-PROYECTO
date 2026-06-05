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
          `SELECT id, nombre, email, rol, rol_solicitado, estado, created_at
             FROM usuarios WHERE estado = $1 ORDER BY created_at ASC`,
          [estado]
        )
      : await query(
          `SELECT id, nombre, email, rol, rol_solicitado, estado, created_at
             FROM usuarios ORDER BY created_at ASC`
        );

    return res.status(200).json(result.rows);
  } catch (err) {
    console.error('[listarUsuarios]', err);
    return res.status(500).json({ error: 'Error interno' });
  }
}

// GET /api/usuarios/asignables?rol=contratista|supervision|dependencia — cuentas aprobadas de
// ese rol, para que el residente arme el contrato. Solo datos públicos.
// Corrección profe (04-jun): se añade 'dependencia' para que en el alta la dependencia se
// SELECCIONE de una cuenta registrada (antes era texto libre). Misma query (filtra por rol+estado).
const ROLES_ASIGNABLES = ['contratista', 'supervision', 'dependencia'];
async function listarAsignables(req, res) {
  try {
    const { rol } = req.query;
    if (!ROLES_ASIGNABLES.includes(rol)) {
      return res.status(400).json({ error: 'rol debe ser contratista, supervision o dependencia' });
    }
    const result = await query(
      `SELECT id, nombre, email, rol
         FROM usuarios WHERE rol = $1 AND estado = 'activo' ORDER BY nombre ASC`,
      [rol]
    );
    return res.status(200).json(result.rows);
  } catch (err) {
    console.error('[listarAsignables]', err);
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

    // La dependencia DEBE indicar el rol a otorgar; nunca se hereda el rol_solicitado.
    const { rol } = req.body || {};
    if (!rol || !ROLES_VALIDOS.includes(rol)) {
      return res.status(400).json({ error: 'Debes indicar el rol a otorgar (rol válido requerido)' });
    }

    // Se asigna el rol efectivo, se activa y se deja traza de quién aprobó y cuándo.
    const result = await query(
      `UPDATE usuarios
          SET rol = $1, estado = 'activo', aprobado_por = $2, aprobado_en = NOW()
         WHERE id = $3
         RETURNING id, nombre, email, rol, estado, aprobado_por, aprobado_en`,
      [rol, req.user.id, id]
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

module.exports = { listarUsuarios, listarAsignables, aprobarUsuario, rechazarUsuario };
