// FIX 2.2 (Oleada 2) — ruta de observaciones por contrato (GET /api/observaciones/contrato/:id). Archivo
// NUEVO. Se monta en server.js como /api/observaciones. Participación en el controller.
const express = require('express');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { listarObservacionesContrato } = require('../controllers/observaciones.controller');

const router = express.Router();
router.use(authMiddleware);
router.get('/contrato/:id', listarObservacionesContrato);

module.exports = router;
