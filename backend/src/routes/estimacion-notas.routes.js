// P1-2 (26-jun) — Router NUEVO (NO congelado) para el vínculo nota↔generador de la estimación.
// Se monta en server.js como /api/estimacion-notas. Acceso por participación en el controller.
const express = require('express');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { asignarGenerador } = require('../controllers/estimacion-notas.controller');

const router = express.Router();
router.use(authMiddleware);

// PATCH /api/estimacion-notas/:estimacionId/:notaId  body { contrato_concepto_id: number|null }
router.patch('/:estimacionId/:notaId', asignarGenerador);

module.exports = router;
