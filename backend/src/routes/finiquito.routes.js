// HU-24 (FASE 4) — rutas del FINIQUITO y cierre del contrato (art. 64 LOPSRM / 168-172 RLOPSRM).
// Archivo NUEVO. Se monta en server.js como /api/finiquito. El acotamiento por participación y la
// autoridad (dependencia/residente) van en el controller; el cálculo del saldo es server-side.
const express = require('express');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { prepararFiniquito, cerrarFiniquito } = require('../controllers/finiquito.controller');

const router = express.Router();
router.use(authMiddleware);

router.get('/contrato/:id', prepararFiniquito);   // PREP read-only: desglose del saldo + estado del cierre
router.post('/contrato/:id', cerrarFiniquito);    // elabora el finiquito + nota de bitácora + cierra el contrato

module.exports = router;
