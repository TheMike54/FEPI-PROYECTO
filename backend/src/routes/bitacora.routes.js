const express = require('express');
const { authMiddleware, requireRole } = require('../middlewares/auth.middleware');
const { abrirBitacora, bitacoraDeContrato, ROLES_BITACORA_LECTURA } = require('../controllers/bitacora.controller');

const router = express.Router();

router.use(authMiddleware);

// Apertura formal: solo el residente (permisos.js HU-08 residente='E').
router.post('/apertura', requireRole('residente'), abrirBitacora);

// Lectura de la bitácora de un contrato: roles con acceso a HU-08.
router.get('/contrato/:contratoId', requireRole(...ROLES_BITACORA_LECTURA), bitacoraDeContrato);

module.exports = router;
