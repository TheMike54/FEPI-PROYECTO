const express = require('express');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { tableroEstimaciones } = require('../controllers/tablero.controller');

const router = express.Router();

// HU-17: tablero de estimaciones. Solo lectura. No hay requireRole por rol global:
// el control es por PARTICIPACIÓN dentro del controller (esParteOSupervision),
// igual que los GET de estimaciones. La matriz de visibilidad por rol (PERMISOS)
// la aplica el frontend (oculta la HU a finanzas); el backend acota por contrato.
router.use(authMiddleware);

router.get('/estimaciones', tableroEstimaciones);

module.exports = router;
