const express = require('express');
const { authMiddleware, requireRole } = require('../middlewares/auth.middleware');
const { registrarPago, pagosDeContrato } = require('../controllers/pagos.controller');

const router = express.Router();

router.use(authMiddleware);

// HU-21: registro del pago efectuado. SOLO finanzas (requireRole genérico existente).
router.post('/', requireRole('finanzas'), registrarPago);

// Lectura de los pagos de un contrato: acotada por participación en el controller.
router.get('/contrato/:contratoId', pagosDeContrato);

module.exports = router;
