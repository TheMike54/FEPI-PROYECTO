const express = require('express');
const { login, register } = require('../controllers/auth.controller');
// O3: catálogo de empresas para el autocomplete del registro. El registro es PÚBLICO y este
// router es el único público (no lleva authMiddleware), así que el catálogo cuelga aquí —
// se evita tocar server.js (no se monta un router nuevo). Login/JWT intactos.
const { listarEmpresas } = require('../controllers/empresas.controller');

const router = express.Router();

router.post('/login', login);
router.post('/register', register);
// GET público: lista id+nombre de empresas (datos no sensibles) para el datalist del registro.
router.get('/empresas', listarEmpresas);

module.exports = router;
