// TODO Sprint 1: implementar CRUD de contratos (HU-01).
// Endpoints relacionados:
//   POST   /api/contratos       crear contrato
//   GET    /api/contratos       listar contratos del usuario
//   GET    /api/contratos/:id   detalle de contrato

async function crearContrato(req, res) {
  // TODO: validar payload, insertar en tabla contratos, devolver registro creado.
  return res.status(501).json({
    error: 'Not Implemented',
    endpoint: 'POST /api/contratos',
    sprint: 1
  });
}

async function listarContratos(req, res) {
  // TODO: SELECT * FROM contratos WHERE created_by = req.user.id
  return res.status(501).json({
    error: 'Not Implemented',
    endpoint: 'GET /api/contratos',
    sprint: 1
  });
}

async function detalleContrato(req, res) {
  // TODO: SELECT * FROM contratos WHERE id = req.params.id
  return res.status(501).json({
    error: 'Not Implemented',
    endpoint: 'GET /api/contratos/:id',
    sprint: 1
  });
}

module.exports = { crearContrato, listarContratos, detalleContrato };
