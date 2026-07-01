// FIX 2.5 (Oleada 2) — NOTAS de bitácora que el usuario debe FIRMAR (para la campana unificada). Archivo
// NUEVO (NO el bitacora.controller congelado). Una nota la firman las PARTES del contrato (residente +
// superintendente + supervisión); el emisor firma al emitir. El usuario debe firmar si: es parte del roster,
// no es el emisor, no la ha firmado, la nota no está anulada, no es la apertura (esa va por su propia vía) y
// su plazo de firma no ha vencido (art. 123 fr. III RLOPSRM). Solo lectura, acotado al propio usuario.
const { pool } = require('../db/pool');
// LENTE DE SIMULACIÓN — SOLO LECTURA: "hoy" simulado opcional (?fecha_ref) para decidir qué notas siguen
// DENTRO del plazo de firma (art. 123 fr. III RLOPSRM). Al avanzar el tiempo simulado, las notas cuyo plazo
// ya venció salen de "por firmar" (se tienen por aceptadas tácitamente). No hay sello aquí: la firma real
// (firmarNota) usa NOW() real; esto solo cambia la LECTURA de la campana.
const { fechaRefDe } = require('../lib/fechaRef');

// GET /api/notas-pendientes
async function notasPendientes(req, res) {
  try {
    const fechaRef = fechaRefDe(req); // simulada o null (=> hoy real)
    const r = await pool.query(
      `SELECT n.id, n.numero, n.tipo, tp.etiqueta AS tipo_etiqueta, n.asunto, n.fecha,
              c.id AS contrato_id, c.folio AS contrato_folio
         FROM bitacora_notas n
         JOIN bitacora_aperturas ba ON ba.id = n.bitacora_id
         JOIN contratos c ON c.id = ba.contrato_id
         LEFT JOIN bitacora_nota_tipos tp ON tp.clave = n.tipo
        WHERE n.estado <> 'anulada'
          AND n.tipo <> 'apertura'
          AND $1 IN (c.residente_id, c.superintendente_id, c.supervision_id)
          AND n.emisor_id IS DISTINCT FROM $1
          AND NOT EXISTS (SELECT 1 FROM bitacora_nota_firmas nf WHERE nf.nota_id = n.id AND nf.usuario_id = $1)
          AND COALESCE($2::timestamptz, NOW()) <= n.fecha + make_interval(days => ba.plazo_firma_dias)
        ORDER BY n.fecha DESC`,
      [req.user.id, fechaRef]
    );
    return res.status(200).json(r.rows);
  } catch (err) {
    console.error('[notasPendientes]', err);
    return res.status(500).json({ error: 'Error interno' });
  }
}

module.exports = { notasPendientes };
