const express = require('express');
const { authMiddleware, requireRole } = require('../middlewares/auth.middleware');
const {
  listarUsuarios,
  aprobarUsuario,
  rechazarUsuario,
  listarAsignables
} = require('../controllers/usuarios.controller');

const router = express.Router();

router.use(authMiddleware);

// Cuentas asignables al equipo del contrato (contratista/supervision aprobadas).
// Lo consulta el RESIDENTE al armar el alta, por eso va ANTES del gate de dependencia.
router.get('/asignables', requireRole('residente'), listarAsignables);

// El resto de la administración de usuarios es exclusiva de la dependencia (autoridad).
router.use(requireRole('dependencia'));

router.get('/', listarUsuarios);
router.patch('/:id/aprobar', aprobarUsuario);
router.patch('/:id/rechazar', rechazarUsuario);

module.exports = router;
