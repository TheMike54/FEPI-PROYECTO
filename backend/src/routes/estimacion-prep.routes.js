const express = require('express');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { preparacionEstimacion } = require('../controllers/estimacion-prep.controller');

const router = express.Router();
router.use(authMiddleware);

// SOLO LECTURA (Etapa A): datos derivados para la pantalla única de estimación (semáforo de plan,
// saldos, barras de avance). Acotado por participación en el controller. No hay escritura.
router.get('/contrato/:contratoId', preparacionEstimacion);

module.exports = router;
