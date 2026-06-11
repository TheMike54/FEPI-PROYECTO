const express = require('express');
const { authMiddleware, requireRole } = require('../middlewares/auth.middleware');
const {
  alertasDeContrato, resumenAtrasos, asentarAtraso
} = require('../controllers/alertas.controller');

const router = express.Router();

router.use(authMiddleware);

// HU-07 v2 (O5): atraso por concepto AUTOMÁTICO (sin config/umbral). Solo lectura + asentar en bitácora.

// AVISO al iniciar sesión (badge): conteo de conceptos/contratos con déficit, acotado por participación.
router.get('/resumen', resumenAtrasos);

// Panel de atraso del contrato: cualquier rol con acceso (acotado por participación en el controller).
router.get('/contrato/:contratoId', alertasDeContrato);

// Asentar el atraso de un concepto en la bitácora: SOLO residente (único nivel 'E' en HU-07, ver
// permisos.js). El controller exige además participación y que el concepto tenga déficit > 0.
router.post('/contrato/:contratoId/asentar', requireRole('residente'), asentarAtraso);

module.exports = router;
