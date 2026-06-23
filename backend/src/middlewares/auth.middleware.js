const jwt = require('jsonwebtoken');
const { query } = require('../db/pool');

async function authMiddleware(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Token no proporcionado' });
  }

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }

  // FIX 22-jun (profe): SESIÓN ÚNICA. El token trae `tv` (token_version) emitido en el login; si no
  // coincide con el actual del usuario, la sesión fue reemplazada por un login posterior → 401.
  // Retrocompat: un token viejo SIN `tv` se acepta (no rompe sesiones emitidas antes del cambio).
  // Fail-open ante error de BD / columna ausente (el chequeo de sesión no debe tumbar la app).
  if (payload && payload.tv !== undefined) {
    try {
      const r = await query('SELECT token_version FROM usuarios WHERE id = $1', [payload.id]);
      if (!r.rowCount || r.rows[0].token_version !== payload.tv) {
        return res.status(401).json({ error: 'Tu sesión se cerró porque iniciaste sesión en otro dispositivo. Vuelve a iniciar sesión.', sesionReemplazada: true });
      }
    } catch (e) {
      console.error('[authMiddleware token_version]', e.message);
    }
  }

  req.user = payload;
  return next();
}

function requireRole(...rolesPermitidos) {
  return (req, res, next) => {
    if (!req.user || !rolesPermitidos.includes(req.user.rol)) {
      return res.status(403).json({ error: 'Rol no autorizado' });
    }
    return next();
  };
}

module.exports = { authMiddleware, requireRole };
