const express = require('express');
const { authMiddleware, requireRole } = require('../middlewares/auth.middleware');
const {
  trabajosDeContrato,
  registrarAvance,
  actualizarAvance,
  eliminarAvance
} = require('../controllers/trabajos.controller');

const router = express.Router();

router.use(authMiddleware);

// HU-06: lectura por participación (acotada en el controller con esParteOSupervision).
// Roles con acceso (permisos.js HU-06): contratista (E) + residente y supervisión (C).
// dependencia/finanzas (null) quedan fuera ya en el gate de rol.
router.get('/contrato/:contratoId', requireRole('contratista', 'residente', 'supervision'), trabajosDeContrato);

// Escritura: solo contratista (permisos.js HU-06: contratista = 'E'). El acotamiento por
// participación lo refuerza el controller (esParteOSupervision sobre el contrato del concepto).
router.post('/', requireRole('contratista'), registrarAvance);
router.patch('/:id', requireRole('contratista'), actualizarAvance);
router.delete('/:id', requireRole('contratista'), eliminarAvance);

module.exports = router;
