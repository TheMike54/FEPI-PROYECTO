// PASADA HU-03 (Fundación) — rutas de convenios modificatorios (art. 59 LOPSRM). Archivo NUEVO.
// Se monta en server.js como /api/convenios. La UI la construye E3 encima de este contrato.
const express = require('express');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { listarConvenios, detalleVersion, crearConvenio } = require('../controllers/convenios.controller');

const router = express.Router();
router.use(authMiddleware);  // toda la sección exige sesión; el acotamiento por participación y la autoridad van en el controller

router.get('/contrato/:id', listarConvenios);     // convenios + versiones del programa del contrato
router.post('/contrato/:id', crearConvenio);      // crear convenio (transaccional: re-cuadre + versionado)
router.get('/version/:versionId', detalleVersion); // snapshot (catálogo + celdas) de una versión del programa

module.exports = router;
