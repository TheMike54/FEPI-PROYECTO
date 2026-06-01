const express = require('express');
const { authMiddleware, requireRole } = require('../middlewares/auth.middleware');
const {
  abrirBitacora,
  firmarApertura,
  pendientesPorFirmar,
  bitacoraDeContrato
} = require('../controllers/bitacora.controller');

const router = express.Router();

router.use(authMiddleware);

// Apertura formal: solo el residente ASIGNADO al contrato (lo valida el controller).
router.post('/apertura', requireRole('residente'), abrirBitacora);

// Bandeja "por firmar" del usuario y firmar la propia parte (cualquier rol autenticado).
router.get('/pendientes', pendientesPorFirmar);
router.post('/:aperturaId/firmar', firmarApertura);

// Lectura de la bitácora de un contrato: acotada por participación en el controller.
router.get('/contrato/:contratoId', bitacoraDeContrato);

module.exports = router;
