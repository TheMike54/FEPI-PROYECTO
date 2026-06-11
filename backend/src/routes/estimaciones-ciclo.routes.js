// HU-14 (Equipo 3) — rutas del ciclo de cobro de estimaciones. Archivo NUEVO del
// dominio E3: NO toca estimaciones.routes.js (HU-12, congelado). Maiki lo monta en
// server.js como /api/estimaciones-ciclo (ver bloque "PARA FUNDACIÓN" del PR).
const express = require('express');
const { authMiddleware } = require('../middlewares/auth.middleware');
const {
  historialEstimaciones,
  enviarEstimacion,
  revisionEstimacion,
  crearObservacion,
  eliminarObservacion,
  turnarEstimacion,
  autorizarEstimacion,
  rechazarEstimacion
} = require('../controllers/estimaciones-ciclo.controller');

const router = express.Router();

// Toda la sección exige sesión válida. El acotamiento por participación se hace en el
// controller (reusa lib/acceso: esParteOSupervision), igual que HU-12.
router.use(authMiddleware);

// Historial del contrato: cada estimación con su estado y sus transiciones (cronológico).
router.get('/contrato/:contratoId/historial', historialEstimaciones);

// HU-13: PRESENTACIÓN de la estimación por el contratista (sella enviada_en/por = la presentación,
// estado integrada -> enviada). El acotamiento (solo el superintendente del contrato) se hace en el
// controller. El path /enviar se conserva por compatibilidad de API. La autorización real va en HU-15.
router.post('/estimacion/:id/enviar', enviarEstimacion);

// HU-15: recepción/revisión/autorización. Lectura por participación + gating de acción por
// rol (supervisión=registra/turna, residencia=autoriza/rechaza) en el controller.
router.get('/estimacion/:id/revision', revisionEstimacion);
router.post('/estimacion/:id/observaciones', crearObservacion);
router.delete('/estimacion/:id/observaciones/:obsId', eliminarObservacion);
router.post('/estimacion/:id/turnar', turnarEstimacion);
router.post('/estimacion/:id/autorizar', autorizarEstimacion);
router.post('/estimacion/:id/rechazar', rechazarEstimacion);

module.exports = router;
