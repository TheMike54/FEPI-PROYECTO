const jwt = require('jsonwebtoken');

// TODO Sprint 1: implementar verificación real de JWT, lectura de header
// Authorization: Bearer <token>, validación de expiración y rol.
function authMiddleware(req, res, next) {
  // Esqueleto: por ahora deja pasar todas las peticiones.
  // En Sprint 1 reemplazar por verificación con jwt.verify(token, process.env.JWT_SECRET).
  return next();
}

function requireRole(...rolesPermitidos) {
  return (req, res, next) => {
    // TODO Sprint 1: comparar req.user.rol contra rolesPermitidos
    return next();
  };
}

module.exports = { authMiddleware, requireRole };
