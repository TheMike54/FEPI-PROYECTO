const express = require('express');
const { authMiddleware, requireRole } = require('../middlewares/auth.middleware');
const {
  crearContrato,
  listarContratos,
  detalleContrato
} = require('../controllers/contratos.controller');

const router = express.Router();

router.use(authMiddleware);

router.post('/', requireRole('residente'), crearContrato);
router.get('/', listarContratos);
router.get('/:id', detalleContrato);

module.exports = router;
