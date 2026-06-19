// FIX 2.5 (Oleada 2) — ruta de notas por firmar del usuario (GET /api/notas-pendientes). Archivo NUEVO. Se
// monta en server.js como /api/notas-pendientes. Acotado al propio usuario en el controller.
const express = require('express');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { notasPendientes } = require('../controllers/notas-pendientes.controller');

const router = express.Router();
router.use(authMiddleware);
router.get('/', notasPendientes);

module.exports = router;
