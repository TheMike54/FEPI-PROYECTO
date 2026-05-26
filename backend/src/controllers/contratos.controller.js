const { query } = require('../db/pool');

const REQUIRED_FIELDS = [
  'folio', 'tipo', 'objeto', 'contratista', 'dependencia',
  'monto', 'plazoDias', 'fechaInicio', 'fechaTermino'
];

async function crearContrato(req, res) {
  try {
    const body = req.body || {};

    const faltantes = REQUIRED_FIELDS.filter(
      (f) => body[f] === undefined || body[f] === null || body[f] === ''
    );
    if (faltantes.length > 0) {
      return res.status(400).json({ error: 'Faltan campos requeridos', faltantes });
    }

    const monto = Number(body.monto);
    if (!Number.isFinite(monto) || monto <= 0) {
      return res.status(400).json({ error: 'monto debe ser un número mayor a 0' });
    }

    const plazoDias = Number(body.plazoDias);
    if (!Number.isInteger(plazoDias) || plazoDias <= 0) {
      return res.status(400).json({ error: 'plazoDias debe ser un entero mayor a 0' });
    }

    const { folio, tipo, objeto, contratista, dependencia, fechaInicio, fechaTermino } = body;

    const result = await query(
      `INSERT INTO contratos
         (folio, tipo, objeto, contratista, dependencia, monto, plazo_dias, fecha_inicio, fecha_termino, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [folio, tipo, objeto, contratista, dependencia, monto, plazoDias, fechaInicio, fechaTermino, req.user.id]
    );

    return res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'El folio ya existe' });
    }
    console.error('[crearContrato]', err);
    return res.status(500).json({ error: 'Error interno' });
  }
}

async function listarContratos(req, res) {
  try {
    const result = await query('SELECT * FROM contratos ORDER BY created_at DESC');
    return res.status(200).json(result.rows);
  } catch (err) {
    console.error('[listarContratos]', err);
    return res.status(500).json({ error: 'Error interno' });
  }
}

async function detalleContrato(req, res) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(404).json({ error: 'Contrato no encontrado' });
    }

    const result = await query('SELECT * FROM contratos WHERE id = $1', [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Contrato no encontrado' });
    }
    return res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error('[detalleContrato]', err);
    return res.status(500).json({ error: 'Error interno' });
  }
}

module.exports = { crearContrato, listarContratos, detalleContrato };
