const express = require('express');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { abrirBitacora } = require('../controllers/bitacora.controller');

const router = express.Router();

router.use(authMiddleware);

router.post('/apertura', abrirBitacora);

module.exports = router;
