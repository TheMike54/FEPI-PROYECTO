const express = require('express');
const { authMiddleware, requireRole } = require('../middlewares/auth.middleware');
const {
  listarUsuarios,
  aprobarUsuario,
  rechazarUsuario
} = require('../controllers/usuarios.controller');

const router = express.Router();

// Toda la administración de usuarios es exclusiva de la dependencia (autoridad).
router.use(authMiddleware);
router.use(requireRole('dependencia'));

router.get('/', listarUsuarios);
router.patch('/:id/aprobar', aprobarUsuario);
router.patch('/:id/rechazar', rechazarUsuario);

module.exports = router;
