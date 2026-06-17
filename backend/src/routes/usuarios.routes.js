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

// Cuentas asignables al equipo del contrato (contratista/supervision/dependencia/residente aprobadas).
// Lo consulta el RESIDENTE al armar el alta y, además, la SUSTITUCIÓN del roster (HU-22), que la operan
// el residente Y la dependencia (App.jsx: /contratos/roster → roles ['dependencia','residente']). Por eso
// el gate incluye ambos (antes solo 'residente' → la dependencia recibía 403 y el selector salía vacío,
// bug P1 de la revisión 14-jun). Va ANTES del gate exclusivo de dependencia (líneas de abajo).
router.get('/asignables', requireRole('residente', 'dependencia'), listarAsignables);

// El resto de la administración de usuarios es exclusiva de la dependencia (autoridad).
router.use(requireRole('dependencia'));

router.get('/', listarUsuarios);
router.patch('/:id/aprobar', aprobarUsuario);
router.patch('/:id/rechazar', rechazarUsuario);

module.exports = router;
