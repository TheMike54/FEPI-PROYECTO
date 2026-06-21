// (PLAN GRANDE BLOQUE 1) Rutas de ADMINISTRACIÓN del padrón de empresas. Archivo NUEVO. La DEPENDENCIA
// valida/administra el padrón de contratistas/supervisión (art. 43 RLOPSRM / art. 74 Bis LOPSRM); el
// catálogo público (autocomplete del registro) sigue en /api/auth/empresas. Se monta en server.js.
const express = require('express');
const { authMiddleware, requireRole } = require('../middlewares/auth.middleware');
const {
  listarPadron, listarPorValidar, listarDependencias, validarEmpresa, fusionarEmpresa, listarPersonas,
} = require('../controllers/empresas.controller');

const router = express.Router();
router.use(authMiddleware);
router.use(requireRole('dependencia')); // SOLO la dependencia administra el padrón

router.get('/padron', listarPadron);
router.get('/por-validar', listarPorValidar);
router.get('/dependencias', listarDependencias);
router.get('/:id/personas', listarPersonas);   // cuentas de la empresa (1 empresa : N cuentas) — solo lectura
router.post('/:id/validar', validarEmpresa);
router.post('/:id/fusionar', fusionarEmpresa);

module.exports = router;
