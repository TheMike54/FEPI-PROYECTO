// TODO Sprint 1: implementar login real con bcrypt + JWT.
// Endpoints relacionados: POST /api/auth/login

async function login(req, res) {
  // TODO: validar credenciales contra usuarios.password_hash y emitir JWT.
  return res.status(501).json({
    error: 'Not Implemented',
    endpoint: 'POST /api/auth/login',
    sprint: 1
  });
}

module.exports = { login };
