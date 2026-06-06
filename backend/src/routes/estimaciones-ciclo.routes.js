// HU-14 (Equipo 3) — rutas del ciclo de cobro de estimaciones. Archivo NUEVO del
// dominio E3: NO toca estimaciones.routes.js (HU-12, congelado). Maiki lo monta en
// server.js como /api/estimaciones-ciclo (ver bloque "PARA FUNDACIÓN" del PR).
const express = require('express');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { historialEstimaciones, enviarEstimacion } = require('../controllers/estimaciones-ciclo.controller');

const router = express.Router();

// Toda la sección exige sesión válida. El acotamiento por participación se hace en el
// controller (reusa lib/acceso: esParteOSupervision), igual que HU-12.
router.use(authMiddleware);

// Historial del contrato: cada estimación con su estado y sus transiciones (cronológico).
router.get('/contrato/:contratoId/historial', historialEstimaciones);

// HU-13: envío de la estimación (sella enviada_en/por, estado integrada -> enviada).
// El acotamiento (solo el superintendente del contrato) se hace en el controller.
router.post('/estimacion/:id/enviar', enviarEstimacion);

module.exports = router;
