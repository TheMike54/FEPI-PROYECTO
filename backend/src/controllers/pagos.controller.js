// HU-21: registro del pago efectuado (variante mínima, sin estimación persistida aún).
// - El actor (registrado_por) SIEMPRE sale del JWT, nunca del body (CA-2).
// - estimacion_id queda NULL hasta que HU-12 persista estimaciones (diferido).
// - El indicador del plazo de 20 días naturales (art. 54 LOPSRM) se DERIVA en la
//   lectura (no se almacena).
const { pool } = require('../db/pool');
const { esParteOSupervision } = require('../lib/acceso');

const PATRON_FECHA = /^\d{4}-\d{2}-\d{2}$/;
function fechaValida(s) {
  if (typeof s !== 'string' || !PATRON_FECHA.test(s)) return false;
  const d = new Date(s + 'T00:00:00Z');
  return !Number.isNaN(d.getTime());
}
function limpiar(v) { return typeof v === 'string' ? v.trim() : ''; }
function aImporte(v) { return Number(String(v).replace(/[$,\s]/g, '')); }

// POST /api/pagos — SOLO finanzas (gate en la ruta). registrado_por = req.user.id (JWT).
async function registrarPago(req, res) {
  const body = req.body || {};
  const contratoId = Number(body.contrato_id);
  const estimacionRef = limpiar(body.estimacion_ref);
  const fechaPago = body.fecha_pago;
  const importe = aImporte(body.importe);
  const referencia = limpiar(body.referencia);
  const facturaCfdi = limpiar(body.factura_cfdi);
  const fechaFactura = body.fecha_factura;
  const fechaAutorizacionRaw = body.fecha_autorizacion;
  const observaciones = (typeof body.observaciones === 'string' && body.observaciones.trim())
    ? body.observaciones.trim() : null;

  // Validaciones con errores localizados (400).
  if (!Number.isInteger(contratoId) || contratoId <= 0) return res.status(400).json({ error: 'El contrato (contrato_id) es requerido' });
  if (!estimacionRef) return res.status(400).json({ error: 'La referencia de la estimación (estimacion_ref) es requerida' });
  if (estimacionRef.length > 60) return res.status(400).json({ error: 'La referencia de la estimación no puede exceder 60 caracteres' });
  if (!fechaValida(fechaPago)) return res.status(400).json({ error: 'La fecha de pago es requerida y debe tener formato AAAA-MM-DD válido' });
  if (!Number.isFinite(importe) || importe <= 0) return res.status(400).json({ error: 'El importe es requerido y debe ser mayor a 0' });
  if (!referencia) return res.status(400).json({ error: 'La referencia bancaria (SPEI) es requerida' });
  if (referencia.length > 100) return res.status(400).json({ error: 'La referencia bancaria no puede exceder 100 caracteres' });
  if (!facturaCfdi) return res.status(400).json({ error: 'El folio fiscal (factura_cfdi) es requerido' });
  if (facturaCfdi.length > 60) return res.status(400).json({ error: 'El folio fiscal no puede exceder 60 caracteres' });
  if (!fechaValida(fechaFactura)) return res.status(400).json({ error: 'La fecha de la factura es requerida y debe tener formato AAAA-MM-DD válido' });
  let fechaAutorizacion = null;
  if (fechaAutorizacionRaw !== undefined && fechaAutorizacionRaw !== null && fechaAutorizacionRaw !== '') {
    if (!fechaValida(fechaAutorizacionRaw)) return res.status(400).json({ error: 'La fecha de autorización, si se envía, debe tener formato AAAA-MM-DD válido' });
    fechaAutorizacion = fechaAutorizacionRaw;
  }
  if (observaciones && observaciones.length > 2000) return res.status(400).json({ error: 'Las observaciones no pueden exceder 2000 caracteres' });

  try {
    // El contrato debe existir → 404 localizado.
    const c = await pool.query('SELECT id FROM contratos WHERE id = $1', [contratoId]);
    if (c.rowCount === 0) return res.status(404).json({ error: 'El contrato indicado no existe' });

    const ins = await pool.query(
      `INSERT INTO pagos
         (contrato_id, estimacion_ref, fecha_pago, importe, referencia, factura_cfdi, fecha_factura, fecha_autorizacion, observaciones, registrado_por)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING id, contrato_id, estimacion_id, estimacion_ref, fecha_pago, importe, referencia,
                 factura_cfdi, fecha_factura, fecha_autorizacion, observaciones, registrado_por, created_at`,
      [contratoId, estimacionRef, fechaPago, importe, referencia, facturaCfdi, fechaFactura, fechaAutorizacion, observaciones, req.user.id]
    );
    return res.status(201).json(ins.rows[0]);
  } catch (err) {
    if (err.code === '23503') return res.status(404).json({ error: 'El contrato indicado no existe' }); // FK violada
    console.error('[registrarPago]', err);
    return res.status(500).json({ error: 'Error interno' });
  }
}

// GET /api/pagos/contrato/:contratoId — acotado por participación (reusa acceso.js);
// devuelve los pagos del contrato con el nombre de quien registró (CA-2) y el
// indicador DERIVADO del plazo de 20 días (art. 54 LOPSRM).
async function pagosDeContrato(req, res) {
  try {
    const contratoId = Number(req.params.contratoId);
    if (!Number.isInteger(contratoId) || contratoId <= 0) return res.status(400).json({ error: 'contratoId inválido' });

    const c = await pool.query(
      'SELECT id, created_by, residente_id, superintendente_id, supervision_id FROM contratos WHERE id = $1',
      [contratoId]
    );
    if (c.rowCount === 0) return res.status(404).json({ error: 'El contrato indicado no existe' });
    if (!esParteOSupervision(req.user, c.rows[0])) {
      return res.status(403).json({ error: 'No tienes acceso a los pagos de este contrato' });
    }

    // dias_transcurridos = fecha_pago - GREATEST(fecha_autorizacion, fecha_factura).
    // GREATEST ignora NULL: sin autorización (HU-20) cae a fecha_factura -> plazo provisional.
    const r = await pool.query(
      `SELECT p.id, p.contrato_id, p.estimacion_id, p.estimacion_ref, p.fecha_pago, p.importe,
              p.referencia, p.factura_cfdi, p.fecha_factura, p.fecha_autorizacion, p.observaciones,
              p.registrado_por, u.nombre AS registrado_por_nombre, p.created_at,
              (p.fecha_pago - GREATEST(p.fecha_autorizacion, p.fecha_factura)) AS dias_transcurridos,
              ((p.fecha_pago - GREATEST(p.fecha_autorizacion, p.fecha_factura)) <= 20) AS plazo_cumplido,
              (p.fecha_autorizacion IS NULL) AS base_provisional
         FROM pagos p
         LEFT JOIN usuarios u ON u.id = p.registrado_por
        WHERE p.contrato_id = $1
        ORDER BY p.fecha_pago`,
      [contratoId]
    );
    return res.status(200).json(r.rows);
  } catch (err) {
    console.error('[pagosDeContrato]', err);
    return res.status(500).json({ error: 'Error interno' });
  }
}

module.exports = { registrarPago, pagosDeContrato };
