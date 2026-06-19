// FIX 2.4 (Oleada 2) — ruta del perfil propio (GET /api/yo). Archivo NUEVO. Se monta en server.js como
// /api/yo. Solo requiere sesión válida (cualquier rol ve SU propio perfil).
const express = require('express');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { obtenerMiPerfil } = require('../controllers/yo.controller');

const router = express.Router();
router.use(authMiddleware);
router.get('/', obtenerMiPerfil);

module.exports = router;
