// FIX 2.2 (Oleada 2) — observaciones de las estimaciones de UN contrato, para el reporte #4 de HU-19
// (listado de observaciones de revisión, HU-15). Archivo NUEVO. Hoy ese reporte está deshabilitado por
// falta de una fuente a nivel contrato. Acotado por participación (esParteOSupervision). Solo lectura.
const { pool } = require('../db/pool');
const { esParteOSupervision } = require('../lib/acceso');

// GET /api/observaciones/contrato/:id
async function listarObservacionesContrato(req, res) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'contrato inválido' });
    const c = await pool.query(
      'SELECT id, created_by, residente_id, superintendente_id, supervision_id, dependencia_id FROM contratos WHERE id = $1',
      [id]
    );
    if (c.rowCount === 0) return res.status(404).json({ error: 'Contrato no encontrado' });
    if (!esParteOSupervision(req.user, c.rows[0])) {
      return res.status(403).json({ error: 'No tienes acceso a las observaciones de este contrato' });
    }
    const r = await pool.query(
      `SELECT o.id, o.estimacion_id, e.numero AS estimacion_numero, o.seccion, o.tipo, o.severidad,
              o.descripcion, o.estado, o.turnado_a, o.autor_id, u.nombre AS autor_nombre,
              o.created_at, o.solventada_en
         FROM estimacion_observaciones o
         JOIN estimaciones e ON e.id = o.estimacion_id
         LEFT JOIN usuarios u ON u.id = o.autor_id
        WHERE e.contrato_id = $1
        ORDER BY e.numero, o.created_at, o.id`,
      [id]
    );
    return res.status(200).json({ contrato_id: id, observaciones: r.rows });
  } catch (err) {
    console.error('[listarObservacionesContrato]', err);
    return res.status(500).json({ error: 'Error interno' });
  }
}

module.exports = { listarObservacionesContrato };
