// PASADA F (Fundación) — rutas del roster del contrato (sustitución de personas, art. 125
// fr. I g RLOPSRM). Archivo NUEVO. Se monta en server.js como /api/roster.
const express = require('express');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { leerRoster, sustituirPersona } = require('../controllers/roster.controller');

const router = express.Router();

// Toda la sección exige sesión válida. El acotamiento por participación y la autoridad para
// sustituir se validan en el controller (reusa lib/acceso: esParteOSupervision).
router.use(authMiddleware);

router.get('/contrato/:id', leerRoster);                 // roster vigente (derivado) + histórico
router.post('/contrato/:id/sustituir', sustituirPersona); // cierra anterior + crea nueva + sync caché

module.exports = router;
