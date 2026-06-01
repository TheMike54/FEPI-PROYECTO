// HU-08 + identidad/firma: la apertura crea el acta-snapshot inmutable y deja una
// firma PENDIENTE por cada miembro del equipo del contrato. Cada quien firma despues
// desde SU cuenta (POST /:aperturaId/firmar). El estado "completa" se DERIVA.
const { pool } = require('../db/pool');
const { esParteOSupervision } = require('../lib/acceso');

// Construye el acta (primera nota): snapshot inmutable de los grupos del art. 122
// RLOPSRM, tomados del contrato + el roster de firmantes (identidad por cuenta).
function construirActa(contrato, roster, cronograma) {
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
    firmas: roster.map((m) => ({
      rol_en_firma: m.rol_en_firma,
      usuario_id: m.usuario_id,
      nombre: m.nombre,
      correo: m.correo
    }))
  };
}

// POST /api/bitacora/apertura — el residente asignado abre la bitácora: crea el
// acta y una firma PENDIENTE por miembro del equipo. NO firma ninguna aquí.
async function abrirBitacora(req, res) {
  const body = req.body || {};
  const contratoId = Number(body.contratoId);
  if (!Number.isInteger(contratoId) || contratoId <= 0) {
    return res.status(400).json({ error: 'contratoId inválido' });
  }
  const fechaEntregaSitio = body.fechaEntregaSitio;
  if (!fechaEntregaSitio) {
    return res.status(400).json({ error: 'Falta la fecha de entrega del sitio' });
  }

  let client;
  try {
    client = await pool.connect();
    try {
      await client.query('BEGIN');

      const cres = await client.query(
        `SELECT id, folio, objeto, contratista, dependencia, monto, plazo_dias, anticipo_pct,
                fecha_inicio, fecha_termino, residente_id, superintendente_id, supervision_id
           FROM contratos WHERE id = $1`,
        [contratoId]
      );
      if (cres.rowCount === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Contrato no encontrado' });
      }
      const contrato = cres.rows[0];

      // Solo el residente asignado a ESE contrato puede aperturar su bitácora.
      if (contrato.residente_id !== req.user.id) {
        await client.query('ROLLBACK');
        return res.status(403).json({ error: 'Solo el residente asignado a este contrato puede aperturar su bitácora' });
      }
      // Equipo mínimo: superintendente obligatorio.
      if (!contrato.superintendente_id) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'El contrato no tiene superintendente asignado; asigna el equipo antes de aperturar' });
      }

      // Miembros que firmarán (pendientes): residente + superintendente (+ supervisión).
      const miembros = [
        { usuario_id: contrato.residente_id, rol_en_firma: 'residente' },
        { usuario_id: contrato.superintendente_id, rol_en_firma: 'superintendente' }
      ];
      if (contrato.supervision_id) {
        miembros.push({ usuario_id: contrato.supervision_id, rol_en_firma: 'supervision' });
      }

      // Identidades (nombre/correo) para congelar en el acta.
      const ures = await client.query(
        'SELECT id, nombre, email FROM usuarios WHERE id = ANY($1)',
        [miembros.map((m) => m.usuario_id)]
      );
      const byId = new Map(ures.rows.map((u) => [u.id, u]));
      const roster = miembros.map((m) => {
        const u = byId.get(m.usuario_id) || {};
        return { ...m, nombre: u.nombre || null, correo: u.email || null };
      });

      const acta = construirActa(contrato, roster, {
        inicio: contrato.fecha_inicio,
        fin: contrato.fecha_termino,
        entregaSitio: fechaEntregaSitio
      });

      const ins = await client.query(
        `INSERT INTO bitacora_aperturas (contrato_id, fecha_apertura, acta, aperturada_por)
         VALUES ($1, $2, $3, $4)
         RETURNING id, contrato_id, fecha_apertura, apertura_en, acta, aperturada_por`,
        [contratoId, fechaEntregaSitio, JSON.stringify(acta), req.user.id]
      );
      const bitacora = ins.rows[0];

      for (const m of miembros) {
        await client.query(
          `INSERT INTO bitacora_firmantes (bitacora_id, usuario_id, rol_en_firma, firmado)
           VALUES ($1, $2, $3, false)`,
          [bitacora.id, m.usuario_id, m.rol_en_firma]
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
    if (err.code === '23505') return res.status(409).json({ error: 'Ya existe una bitácora para este contrato' });
    if (err.code === '23503') return res.status(404).json({ error: 'Contrato no encontrado' });
    console.error('[abrirBitacora]', err);
    return res.status(500).json({ error: 'Error interno' });
  }
}

// POST /api/bitacora/:aperturaId/firmar — el usuario del token firma SU parte.
// 403 si no es firmante; 409 si ya firmó; si no, transición pendiente -> firmado.
async function firmarApertura(req, res) {
  try {
    const aperturaId = Number(req.params.aperturaId);
    if (!Number.isInteger(aperturaId) || aperturaId <= 0) {
      return res.status(400).json({ error: 'aperturaId inválido' });
    }

    const f = await pool.query(
      'SELECT id, firmado FROM bitacora_firmantes WHERE bitacora_id = $1 AND usuario_id = $2',
      [aperturaId, req.user.id]
    );
    if (f.rowCount === 0) return res.status(403).json({ error: 'No eres firmante de esta apertura' });
    if (f.rows[0].firmado) return res.status(409).json({ error: 'Ya firmaste esta apertura' });

    const upd = await pool.query(
      `UPDATE bitacora_firmantes SET firmado = true, firmado_en = NOW()
        WHERE bitacora_id = $1 AND usuario_id = $2 AND firmado = false
        RETURNING id, firmado, firmado_en`,
      [aperturaId, req.user.id]
    );
    if (upd.rowCount === 0) return res.status(409).json({ error: 'Ya firmaste esta apertura' });

    const est = await pool.query(
      'SELECT count(*) FILTER (WHERE NOT firmado) AS pendientes FROM bitacora_firmantes WHERE bitacora_id = $1',
      [aperturaId]
    );
    const pendientes = Number(est.rows[0].pendientes);
    return res.status(200).json({ firmado: true, firmado_en: upd.rows[0].firmado_en, completa: pendientes === 0, pendientes });
  } catch (err) {
    console.error('[firmarApertura]', err);
    return res.status(500).json({ error: 'Error interno' });
  }
}

// GET /api/bitacora/pendientes — bandeja "por firmar" del usuario del token.
async function pendientesPorFirmar(req, res) {
  try {
    const r = await pool.query(
      `SELECT a.id AS apertura_id, a.contrato_id, c.folio, c.objeto, f.rol_en_firma, a.apertura_en
         FROM bitacora_firmantes f
         JOIN bitacora_aperturas a ON a.id = f.bitacora_id
         JOIN contratos c ON c.id = a.contrato_id
        WHERE f.usuario_id = $1 AND f.firmado = false
        ORDER BY a.apertura_en DESC`,
      [req.user.id]
    );
    return res.status(200).json(r.rows);
  } catch (err) {
    console.error('[pendientesPorFirmar]', err);
    return res.status(500).json({ error: 'Error interno' });
  }
}

// GET /api/bitacora/contrato/:contratoId — bitácora + firmantes (con identidad) +
// estado derivado. Acotada por participación en el contrato.
async function bitacoraDeContrato(req, res) {
  try {
    const contratoId = Number(req.params.contratoId);
    if (!Number.isInteger(contratoId) || contratoId <= 0) {
      return res.status(400).json({ error: 'contratoId inválido' });
    }
    const c = await pool.query(
      'SELECT id, created_by, residente_id, superintendente_id, supervision_id FROM contratos WHERE id = $1',
      [contratoId]
    );
    if (c.rowCount === 0) return res.status(404).json({ error: 'Contrato no encontrado' });
    if (!esParteOSupervision(req.user, c.rows[0])) {
      return res.status(403).json({ error: 'No tienes acceso a este contrato' });
    }

    const a = await pool.query(
      `SELECT id, contrato_id, fecha_apertura, apertura_en, acta, aperturada_por, created_at
         FROM bitacora_aperturas WHERE contrato_id = $1`,
      [contratoId]
    );
    if (a.rowCount === 0) return res.status(404).json({ error: 'El contrato no tiene bitácora aperturada' });
    const bitacora = a.rows[0];

    const f = await pool.query(
      `SELECT f.usuario_id, f.rol_en_firma, f.firmado, f.firmado_en, u.nombre, u.email
         FROM bitacora_firmantes f
         LEFT JOIN usuarios u ON u.id = f.usuario_id
        WHERE f.bitacora_id = $1
        ORDER BY f.id`,
      [bitacora.id]
    );
    const firmantes = f.rows;
    const completa = firmantes.length > 0 && firmantes.every((x) => x.firmado);
    return res.status(200).json({ ...bitacora, firmantes, completa });
  } catch (err) {
    console.error('[bitacoraDeContrato]', err);
    return res.status(500).json({ error: 'Error interno' });
  }
}

module.exports = { abrirBitacora, firmarApertura, pendientesPorFirmar, bitacoraDeContrato };
