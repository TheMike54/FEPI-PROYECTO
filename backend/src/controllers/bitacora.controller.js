// TODO Sprint 1: implementar apertura formal de bitácora (HU-08).
// Fundamento legal: Art. 46 último párrafo LOPSRM, arts. 122-123 RLOPSRM.

async function abrirBitacora(req, res) {
  // TODO: insertar en bitacora_aperturas, asociar firmantes de las 3 partes,
  //       enviar notificación a contratista y supervisión.
  return res.status(501).json({
    error: 'Not Implemented',
    endpoint: 'POST /api/bitacora/apertura',
    sprint: 1
  });
}

module.exports = { abrirBitacora };
