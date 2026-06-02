const express = require('express');
const { authMiddleware, requireRole } = require('../middlewares/auth.middleware');
const {
  integrarEstimacion,
  estimacionesDeContrato,
  detalleEstimacion,
  avanceDeContrato
} = require('../controllers/estimaciones.controller');

const router = express.Router();

router.use(authMiddleware);

// HU-12: integra la estimación. Defensa en profundidad: requireRole('contratista')
// (el superintendente siempre es una cuenta de rol contratista) ANTES del control real,
// que es de IDENTIDAD: el controller valida que el actor sea el superintendente ASIGNADO
// al contrato (req.user.id === superintendente_id). El requireRole es redundante a
// propósito (la identidad es más fuerte), pero deja explícito el gate por rol.
router.post('/', requireRole('contratista'), integrarEstimacion);

// Lectura acotada por participación en el controller (reusa acceso.js). El avance
// (azúcar para el preview) va ANTES de '/:id' para no ser engullido por él.
router.get('/contrato/:contratoId/avance', avanceDeContrato);
router.get('/contrato/:contratoId', estimacionesDeContrato);
router.get('/:id', detalleEstimacion);

module.exports = router;
