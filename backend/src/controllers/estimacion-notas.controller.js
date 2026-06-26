// P1-2 (26-jun) — Vínculo NOTA DE BITÁCORA ↔ GENERADOR (concepto) de una estimación. Archivo NUEVO
// (NO zona congelada). Se monta en server.js como /api/estimacion-notas. Permite asignar la nota de
// entrega a un generador específico (o dejarla como nota GENERAL de la estimación con concepto = null),
// para cerrar el hueco "soporte por generador" que pidió el profe ("dame la nota donde entregaron eso").
// La nota en sí es inmutable; aquí solo se etiqueta el vínculo ya existente (estimacion_notas). Acceso por
// participación (lib/acceso.js), igual que el resto del dominio de estimaciones.
const { pool } = require('../db/pool');
const { esParteOSupervision } = require('../lib/acceso');

// PATCH /api/estimacion-notas/:estimacionId/:notaId   body { contrato_concepto_id: number | null }
async function asignarGenerador(req, res) {
  const estimacionId = Number(req.params.estimacionId);
  const notaId = Number(req.params.notaId);
  if (!Number.isInteger(estimacionId) || estimacionId <= 0) return res.status(400).json({ error: 'estimacionId inválido' });
  if (!Number.isInteger(notaId) || notaId <= 0) return res.status(400).json({ error: 'notaId inválido' });
  const raw = req.body ? req.body.contrato_concepto_id : null;
  const conceptoId = (raw === null || raw === undefined || raw === '') ? null : Number(raw);
  if (conceptoId !== null && (!Number.isInteger(conceptoId) || conceptoId <= 0)) return res.status(400).json({ error: 'contrato_concepto_id inválido' });
  try {
    // Acceso: traer el contrato de la estimación y validar participación/supervisión.
    const e = await pool.query(
      `SELECT e.id, e.contrato_id, c.created_by, c.residente_id, c.superintendente_id, c.supervision_id
         FROM estimaciones e JOIN contratos c ON c.id = e.contrato_id WHERE e.id = $1`,
      [estimacionId]
    );
    if (e.rowCount === 0) return res.status(404).json({ error: 'Estimación no encontrada' });
    const row = e.rows[0];
    if (!esParteOSupervision(req.user, row)) return res.status(403).json({ error: 'No tienes acceso a esta estimación' });
    // La nota debe estar vinculada a esta estimación.
    const link = await pool.query('SELECT 1 FROM estimacion_notas WHERE estimacion_id = $1 AND nota_id = $2', [estimacionId, notaId]);
    if (link.rowCount === 0) return res.status(404).json({ error: 'La nota no está vinculada a esta estimación' });
    // El generador (si no es null) debe pertenecer al MISMO contrato de la estimación (no cross-contract).
    if (conceptoId !== null) {
      const cc = await pool.query('SELECT 1 FROM contrato_conceptos WHERE id = $1 AND contrato_id = $2', [conceptoId, row.contrato_id]);
      if (cc.rowCount === 0) return res.status(400).json({ error: 'El generador (concepto) no pertenece al contrato de la estimación' });
    }
    await pool.query(
      'UPDATE estimacion_notas SET contrato_concepto_id = $3 WHERE estimacion_id = $1 AND nota_id = $2',
      [estimacionId, notaId, conceptoId]
    );
    return res.status(200).json({ ok: true, estimacion_id: estimacionId, nota_id: notaId, contrato_concepto_id: conceptoId });
  } catch (err) {
    console.error('[asignarGenerador]', err);
    return res.status(500).json({ error: 'Error interno' });
  }
}

module.exports = { asignarGenerador };
