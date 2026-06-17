const express = require('express');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { portafolio } = require('../controllers/portafolio.controller');

const router = express.Router();

// HU-18 (Equipo 3): portafolio ejecutivo con semáforos. SOLO LECTURA. Sin requireRole por rol
// global: el control es por PARTICIPACIÓN dentro del controller (lib/acceso.js), igual que el
// tablero HU-17 y los GET de estimaciones. La matriz de visibilidad por rol (PERMISOS) la aplica
// el frontend (dependencia 'E'; residente/supervisión 'C'); el backend acota por contrato.
router.use(authMiddleware);

router.get('/', portafolio);

module.exports = router;

// ============================================================================
// PARA MAIKI — montaje permanente en server.js (ZONA CONGELADA; lo integra Maiki).
// El smoke local montó esta ruta TEMPORALMENTE y se revirtió con `git checkout
// backend/server.js`; server.js NO va en este PR. Snippet a aplicar:
//
//   // (junto a los demás require de routers)
//   const portafolioRoutes = require('./src/routes/portafolio.routes');  // HU-18 (Equipo 3)
//
//   // (junto a los demás app.use, DESPUÉS de app.use(cors())) — solo lectura, acotado por participación
//   app.use('/api/portafolio', portafolioRoutes);
// ============================================================================
