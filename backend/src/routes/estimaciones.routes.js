const express = require('express');
const { authMiddleware } = require('../middlewares/auth.middleware');
const {
  integrarEstimacion,
  estimacionesDeContrato,
  detalleEstimacion,
  avanceDeContrato
} = require('../controllers/estimaciones.controller');

const router = express.Router();

router.use(authMiddleware);

// HU-12: integra la estimación. No hay gate por rol global: el controller valida que
// el actor sea el superintendente ASIGNADO al contrato (req.user.id === superintendente_id).
router.post('/', integrarEstimacion);

// Lectura acotada por participación en el controller (reusa acceso.js). El avance
// (azúcar para el preview) va ANTES de '/:id' para no ser engullido por él.
router.get('/contrato/:contratoId/avance', avanceDeContrato);
router.get('/contrato/:contratoId', estimacionesDeContrato);
router.get('/:id', detalleEstimacion);

module.exports = router;
