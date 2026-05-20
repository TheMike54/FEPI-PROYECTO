const express = require('express');
const { authMiddleware } = require('../middlewares/auth.middleware');
const {
  crearContrato,
  listarContratos,
  detalleContrato
} = require('../controllers/contratos.controller');

const router = express.Router();

router.use(authMiddleware);

router.post('/', crearContrato);
router.get('/', listarContratos);
router.get('/:id', detalleContrato);

module.exports = router;
