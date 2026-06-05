const express = require('express');
const { authMiddleware, requireRole } = require('../middlewares/auth.middleware');
const {
  alertasDeContrato, crearAlerta, actualizarAlerta, eliminarAlerta
} = require('../controllers/alertas.controller');

const router = express.Router();

router.use(authMiddleware);

// Lectura: cualquier rol con acceso al contrato (acotada por participación en el
// controller, igual que pagosDeContrato).
router.get('/contrato/:contratoId', alertasDeContrato);

// Escritura: SOLO residente (único rol con nivel 'E' en HU-07, ver permisos.js);
// además, el controller exige participación en el contrato.
router.post('/', requireRole('residente'), crearAlerta);
router.patch('/:id', requireRole('residente'), actualizarAlerta);
router.delete('/:id', requireRole('residente'), eliminarAlerta);

module.exports = router;
