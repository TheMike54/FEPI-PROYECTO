// HU-08: apertura formal de la bitacora del contrato (art. 46 LOPSRM, 122 RLOPSRM).
// La apertura es un acto unico del residente: captura las 3 firmas en una sola
// transaccion. El acta JSONB es la "primera nota" congelada (5 grupos del art. 122).
const { pool } = require('../db/pool');

// Roles con acceso de LECTURA a la bitacora (permisos.js HU-08: residente 'E',
// contratista/supervision 'C'). La apertura (POST) queda solo para residente.
const ROLES_BITACORA_LECTURA = ['residente', 'contratista', 'supervision'];

// Construye el acta (primera nota): snapshot inmutable de los 5 grupos obligatorios
// del criterio c, tomados del contrato + los firmantes.
function construirActa(contrato, firmantes, cronograma) {
  return {
    identificacion: {
      folio: contrato.folio,
      dependencia: contrato.dependencia,
      contratista: contrato.contratista
    },
    objeto: contrato.objeto,
    datos_financieros: {
      monto: contrato.monto,
      anticipo_pct: contrato.anticipo_pct,
      plazo_dias: contrato.plazo_dias
    },
    cronograma: {
      inicio: cronograma.inicio,
      fin: cronograma.fin,
      entrega_sitio: cronograma.entregaSitio
    },
    firmas: firmantes
      .filter((f) => f.aplica)
      .map((f) => ({ parte: f.parte, titulo: f.titulo, firmante: f.firmante, cargo: f.cargo, firmado_en: f.firmadoEn }))
  };
}

async function abrirBitacora(req, res) {
  const body = req.body || {};

  const contratoId = Number(body.contratoId);
  if (!Number.isInteger(contratoId) || contratoId <= 0) {
    return res.status(400).json({ error: 'contratoId inválido' });
  }
  const { fechaEntregaSitio, fechaInicioCronograma, fechaFinCronograma } = body;
  if (!fechaEntregaSitio || !fechaInicioCronograma || !fechaFinCronograma) {
    return res.status(400).json({ error: 'Faltan fechas: entrega del sitio, inicio y término del cronograma' });
  }

  const firmantesIn = Array.isArray(body.firmantes) ? body.firmantes : [];
  if (firmantesIn.length === 0) {
    return res.status(400).json({ error: 'Se requieren los firmantes de las partes' });
  }
  // Firma conjunta: cada parte que aplica debe tener firmante y estar firmada.
  for (const f of firmantesIn) {
    if (f.aplica === false) continue;
    if (!f.firmante || !String(f.firmante).trim()) {
      return res.status(400).json({ error: `La parte ${f.parte} (${f.titulo || ''}) requiere firmante` });
    }
    if (f.firmado !== true) {
      return res.status(400).json({ error: `Falta la firma de la parte ${f.parte} (${f.titulo || ''}). La apertura requiere la firma conjunta.` });
    }
  }

  let client;
  try {
    client = await pool.connect();
    try {
      await client.query('BEGIN');

      // El contrato es la fuente autoritativa del acta.
      const cres = await client.query(
        'SELECT folio, objeto, contratista, dependencia, monto, plazo_dias, anticipo_pct FROM contratos WHERE id = $1',
        [contratoId]
      );
      if (cres.rowCount === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Contrato no encontrado' });
      }
      const contrato = cres.rows[0];

      // Sello de firma = momento de la apertura (acto unico).
      const firmadoEn = new Date().toISOString();
      const firmantes = firmantesIn.map((f) => {
        const aplica = f.aplica !== false;
        const firmado = aplica && f.firmado === true;
        return {
          parte: Number(f.parte),
          titulo: f.titulo || '',
          firmante: aplica ? (f.firmante || null) : null,
          cargoLabel: f.cargoLabel || null,
          cargo: aplica ? (f.cargo || null) : null,
          correo: aplica ? (f.correo || null) : null,
          opcional: f.opcional === true,
          aplica,
          firmado,
          firmadoEn: firmado ? firmadoEn : null
        };
      });

      const acta = construirActa(contrato, firmantes, {
        inicio: fechaInicioCronograma,
        fin: fechaFinCronograma,
        entregaSitio: fechaEntregaSitio
      });

      const ins = await client.query(
        `INSERT INTO bitacora_aperturas (contrato_id, fecha_apertura, acta, aperturada_por)
         VALUES ($1, $2, $3, $4)
         RETURNING id, contrato_id, fecha_apertura, apertura_en, acta, aperturada_por`,
        [contratoId, fechaEntregaSitio, JSON.stringify(acta), req.user.id]
      );
      const bitacora = ins.rows[0];

      for (const f of firmantes) {
        await client.query(
          `INSERT INTO bitacora_firmantes
             (bitacora_id, parte, titulo, firmante, cargo_label, cargo, correo, opcional, aplica, firmado, firmado_en)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
          [bitacora.id, f.parte, f.titulo, f.firmante, f.cargoLabel, f.cargo, f.correo, f.opcional, f.aplica, f.firmado, f.firmadoEn]
        );
      }

      await client.query('COMMIT');
      return res.status(201).json(bitacora);
    } catch (e) {
      try { await client.query('ROLLBACK'); } catch (_) { /* el client pudo morir */ }
      throw e;
    } finally {
      client.release();
    }
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Ya existe una bitácora para este contrato' });
    }
    if (err.code === '23503') {
      return res.status(404).json({ error: 'Contrato no encontrado' });
    }
    console.error('[abrirBitacora]', err);
    return res.status(500).json({ error: 'Error interno' });
  }
}

// GET /api/bitacora/contrato/:contratoId — bitácora + firmantes, o 404 si no hay.
async function bitacoraDeContrato(req, res) {
  try {
    const contratoId = Number(req.params.contratoId);
    if (!Number.isInteger(contratoId) || contratoId <= 0) {
      return res.status(400).json({ error: 'contratoId inválido' });
    }
    const a = await pool.query(
      `SELECT id, contrato_id, fecha_apertura, apertura_en, acta, aperturada_por, created_at
         FROM bitacora_aperturas WHERE contrato_id = $1`,
      [contratoId]
    );
    if (a.rowCount === 0) {
      return res.status(404).json({ error: 'El contrato no tiene bitácora aperturada' });
    }
    const bitacora = a.rows[0];
    const f = await pool.query(
      `SELECT parte, titulo, firmante, cargo_label, cargo, correo, opcional, aplica, firmado, firmado_en
         FROM bitacora_firmantes WHERE bitacora_id = $1 ORDER BY parte`,
      [bitacora.id]
    );
    return res.status(200).json({ ...bitacora, firmantes: f.rows });
  } catch (err) {
    console.error('[bitacoraDeContrato]', err);
    return res.status(500).json({ error: 'Error interno' });
  }
}

module.exports = { abrirBitacora, bitacoraDeContrato, ROLES_BITACORA_LECTURA };
