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
  // Plazo de firma/aceptación de notas (art. 123 fr. III). Días naturales; default 2.
  const plazoFirmaDias = (body.plazoFirmaDias === undefined || body.plazoFirmaDias === null)
    ? 2 : Number(body.plazoFirmaDias);
  if (!Number.isInteger(plazoFirmaDias) || plazoFirmaDias < 1 || plazoFirmaDias > 60) {
    return res.status(400).json({ error: 'plazoFirmaDias debe ser un entero entre 1 y 60' });
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
        `INSERT INTO bitacora_aperturas (contrato_id, fecha_apertura, plazo_firma_dias, acta, aperturada_por)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, contrato_id, fecha_apertura, plazo_firma_dias, apertura_en, acta, aperturada_por`,
        [contratoId, fechaEntregaSitio, plazoFirmaDias, JSON.stringify(acta), req.user.id]
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

// ---------------------------------------------------------------------------
// HU-09: emisión y respuesta de notas tipificadas de bitácora.
// UN emisor por nota (art. 125): el rol del emisor se determina por su lugar en
// el equipo del contrato (residente_id/superintendente_id/supervision_id). El
// emisor SIEMPRE sale del JWT (req.user.id), nunca del body.
// ---------------------------------------------------------------------------

// Carga la apertura + el equipo del contrato y deduce el rol del usuario EN ESE
// contrato (null si no es parte firmante). { notFound:true } si no hay apertura.
async function cargarAperturaYRol(client, aperturaId, userId) {
  const a = await client.query(
    `SELECT a.id, a.contrato_id, a.plazo_firma_dias,
            c.created_by, c.residente_id, c.superintendente_id, c.supervision_id
       FROM bitacora_aperturas a
       JOIN contratos c ON c.id = a.contrato_id
      WHERE a.id = $1`,
    [aperturaId]
  );
  if (a.rowCount === 0) return { notFound: true };
  const row = a.rows[0];
  let rolEnContrato = null;
  if (row.residente_id === userId) rolEnContrato = 'residente';
  else if (row.superintendente_id === userId) rolEnContrato = 'superintendente';
  else if (row.supervision_id === userId) rolEnContrato = 'supervision';
  return { apertura: row, rolEnContrato };
}

// Matriz rol->tipo (art. 125) contra el catálogo bitacora_nota_tipos.
async function validarTipoParaRol(client, tipo, rolEnContrato) {
  const t = await client.query('SELECT rol_emisor FROM bitacora_nota_tipos WHERE clave = $1', [tipo]);
  if (t.rowCount === 0) return { ok: false, status: 400, error: 'Tipo de nota no reconocido' };
  const rolEmisor = t.rows[0].rol_emisor;
  if (rolEmisor !== null && rolEmisor !== rolEnContrato) {
    return { ok: false, status: 403, error: `Tu rol (${rolEnContrato}) no puede emitir notas de tipo "${tipo}"` };
  }
  return { ok: true };
}

// Inserta una nota con folio correlativo ATÓMICO por bitácora (advisory lock por
// bitácora + MAX+1; el UNIQUE(bitacora_id,numero) es la red). Debe ir dentro de una tx.
async function insertarNotaAtomica(client, { bitacoraId, tipo, asunto, contenido, emisorId, vinculadaA }) {
  await client.query('SELECT pg_advisory_xact_lock($1)', [bitacoraId]);
  const ins = await client.query(
    `INSERT INTO bitacora_notas (bitacora_id, numero, tipo, asunto, contenido, emisor_id, estado, firmado_en, vinculada_a)
     VALUES ($1, (SELECT COALESCE(MAX(numero),0)+1 FROM bitacora_notas WHERE bitacora_id = $1),
             $2, $3, $4, $5, 'emitida', NOW(), $6)
     RETURNING id, bitacora_id, numero, tipo, asunto, contenido, emisor_id, estado, vinculada_a, fecha, firmado_en`,
    [bitacoraId, tipo, asunto || null, contenido, emisorId, vinculadaA || null]
  );
  return ins.rows[0];
}

function leerCamposNota(body) {
  return {
    tipo: typeof body.tipo === 'string' ? body.tipo.trim() : '',
    asunto: typeof body.asunto === 'string' ? body.asunto.trim() : '',
    contenido: typeof body.contenido === 'string' ? body.contenido.trim() : ''
  };
}

// POST /api/bitacora/:aperturaId/notas — emite una nota nueva (firmada por el emisor al emitir).
async function emitirNota(req, res) {
  const aperturaId = Number(req.params.aperturaId);
  if (!Number.isInteger(aperturaId) || aperturaId <= 0) return res.status(400).json({ error: 'aperturaId inválido' });
  const { tipo, asunto, contenido } = leerCamposNota(req.body || {});
  if (!tipo) return res.status(400).json({ error: 'Falta el tipo de nota' });
  if (!contenido) return res.status(400).json({ error: 'Falta el contenido de la nota' });
  if (contenido.length > 5000) return res.status(400).json({ error: 'El contenido no puede exceder 5000 caracteres' });
  if (asunto.length > 200) return res.status(400).json({ error: 'El asunto no puede exceder 200 caracteres' });

  let client;
  try {
    client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { notFound, apertura, rolEnContrato } = await cargarAperturaYRol(client, aperturaId, req.user.id);
      if (notFound) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'El contrato no tiene bitácora aperturada' }); }
      if (!rolEnContrato) { await client.query('ROLLBACK'); return res.status(403).json({ error: 'No eres parte firmante de este contrato; no puedes emitir notas' }); }

      const v = await validarTipoParaRol(client, tipo, rolEnContrato);
      if (!v.ok) { await client.query('ROLLBACK'); return res.status(v.status).json({ error: v.error }); }

      const nota = await insertarNotaAtomica(client, { bitacoraId: apertura.id, tipo, asunto, contenido, emisorId: req.user.id });
      await client.query('COMMIT');
      return res.status(201).json(nota);
    } catch (e) {
      try { await client.query('ROLLBACK'); } catch (_) {}
      throw e;
    } finally { client.release(); }
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Folio de nota duplicado; reintenta' });
    console.error('[emitirNota]', err);
    return res.status(500).json({ error: 'Error interno' });
  }
}

// Construye el payload de notas (identidad del emisor, tipo, folio, estado, vínculo
// y estado de ACEPTACIÓN derivado: tácita si venció el plazo sin respuesta de
// contraparte) para una apertura YA resuelta y con acceso verificado. Lo comparten
// listarNotas (por aperturaId) y notasDeContrato (por contratoId, base de HU-10).
// `apertura` trae id, contrato_id, plazo_firma_dias y el equipo del contrato
// (residente_id/superintendente_id/supervision_id) para derivar mi_rol.
async function construirPayloadNotas(apertura, userId) {
  // Rol del usuario EN ESTE contrato (null si solo es ve-todo: dependencia/finanzas).
  // Permite al UI filtrar los tipos emitibles sin exponer el equipo completo.
  let miRol = null;
  if (apertura.residente_id === userId) miRol = 'residente';
  else if (apertura.superintendente_id === userId) miRol = 'superintendente';
  else if (apertura.supervision_id === userId) miRol = 'supervision';

  const r = await pool.query(
    `SELECT n.id, n.numero, n.tipo, tp.etiqueta AS tipo_etiqueta, tp.rol_emisor,
            n.asunto, n.contenido, n.estado, n.vinculada_a, n.fecha, n.firmado_en,
            n.emisor_id, u.nombre AS emisor_nombre, u.email AS emisor_correo,
            (NOW() > n.fecha + make_interval(days => $2::int)) AS plazo_vencido,
            EXISTS (SELECT 1 FROM bitacora_notas m
                     WHERE m.vinculada_a = n.id AND m.emisor_id IS DISTINCT FROM n.emisor_id) AS respondida
       FROM bitacora_notas n
       LEFT JOIN bitacora_nota_tipos tp ON tp.clave = n.tipo
       LEFT JOIN usuarios u ON u.id = n.emisor_id
      WHERE n.bitacora_id = $1
      ORDER BY n.numero`,
    [apertura.id, apertura.plazo_firma_dias]
  );

  const notas = r.rows.map((n) => {
    let aceptacion;
    if (n.estado === 'anulada') aceptacion = 'anulada';
    else if (n.respondida) aceptacion = 'respondida';
    else if (n.plazo_vencido) aceptacion = 'aceptada_tacita';
    else aceptacion = 'en_plazo';
    return { ...n, aceptacion };
  });

  return {
    apertura_id: apertura.id,
    contrato_id: apertura.contrato_id,
    plazo_firma_dias: apertura.plazo_firma_dias,
    mi_rol: miRol,
    notas
  };
}

// GET /api/bitacora/:aperturaId/notas — lista las notas de UNA apertura (por id).
// Acotada por participación.
async function listarNotas(req, res) {
  try {
    const aperturaId = Number(req.params.aperturaId);
    if (!Number.isInteger(aperturaId) || aperturaId <= 0) return res.status(400).json({ error: 'aperturaId inválido' });

    const a = await pool.query(
      `SELECT a.id, a.contrato_id, a.plazo_firma_dias,
              c.created_by, c.residente_id, c.superintendente_id, c.supervision_id
         FROM bitacora_aperturas a
         JOIN contratos c ON c.id = a.contrato_id
        WHERE a.id = $1`,
      [aperturaId]
    );
    if (a.rowCount === 0) return res.status(404).json({ error: 'El contrato no tiene bitácora aperturada' });
    const apertura = a.rows[0];
    if (!esParteOSupervision(req.user, apertura)) {
      return res.status(403).json({ error: 'No tienes acceso a este contrato' });
    }
    return res.status(200).json(await construirPayloadNotas(apertura, req.user.id));
  } catch (err) {
    console.error('[listarNotas]', err);
    return res.status(500).json({ error: 'Error interno' });
  }
}

// GET /api/bitacora/contrato/:contratoId/notas — resuelve la (única) apertura del
// contrato y devuelve sus notas. Azúcar de HU-10: el UI maneja contratos, no
// aperturaId. El acceso se verifica sobre el CONTRATO (participación) ANTES de
// revelar si tiene bitácora, igual que las demás lecturas por contrato.
async function notasDeContrato(req, res) {
  try {
    const contratoId = Number(req.params.contratoId);
    if (!Number.isInteger(contratoId) || contratoId <= 0) return res.status(400).json({ error: 'contratoId inválido' });

    const c = await pool.query(
      'SELECT id, created_by, residente_id, superintendente_id, supervision_id FROM contratos WHERE id = $1',
      [contratoId]
    );
    if (c.rowCount === 0) return res.status(404).json({ error: 'Contrato no encontrado' });
    if (!esParteOSupervision(req.user, c.rows[0])) {
      return res.status(403).json({ error: 'No tienes acceso a este contrato' });
    }

    const a = await pool.query(
      'SELECT id, contrato_id, plazo_firma_dias FROM bitacora_aperturas WHERE contrato_id = $1',
      [contratoId]
    );
    if (a.rowCount === 0) return res.status(404).json({ error: 'El contrato no tiene bitácora aperturada' });

    // Mezcla explícita: id/plazo de la apertura + equipo del contrato. (No usar
    // spread de c.rows[0]: su `id` es el del contrato y pisaría el de la apertura.)
    const apertura = {
      id: a.rows[0].id,
      contrato_id: a.rows[0].contrato_id,
      plazo_firma_dias: a.rows[0].plazo_firma_dias,
      residente_id: c.rows[0].residente_id,
      superintendente_id: c.rows[0].superintendente_id,
      supervision_id: c.rows[0].supervision_id
    };
    return res.status(200).json(await construirPayloadNotas(apertura, req.user.id));
  } catch (err) {
    console.error('[notasDeContrato]', err);
    return res.status(500).json({ error: 'Error interno' });
  }
}

// POST /api/bitacora/notas/:notaId/anular — SOLO el emisor anula su nota (por error,
// art. 123 fr. VII) y genera una nota correctiva consecutiva "dice/debe decir" que
// referencia la original. La original pasa a 'anulada' (no se edita).
async function anularNota(req, res) {
  const notaId = Number(req.params.notaId);
  if (!Number.isInteger(notaId) || notaId <= 0) return res.status(400).json({ error: 'notaId inválido' });
  const contenido = typeof (req.body || {}).contenido === 'string' ? req.body.contenido.trim() : '';
  if (!contenido) return res.status(400).json({ error: 'Falta el texto de corrección (dice / debe decir)' });
  if (contenido.length > 5000) return res.status(400).json({ error: 'El contenido no puede exceder 5000 caracteres' });

  let client;
  try {
    client = await pool.connect();
    try {
      await client.query('BEGIN');
      const nres = await client.query(
        'SELECT id, bitacora_id, numero, tipo, emisor_id, estado FROM bitacora_notas WHERE id = $1 FOR UPDATE',
        [notaId]
      );
      if (nres.rowCount === 0) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Nota no encontrada' }); }
      const nota = nres.rows[0];
      if (nota.emisor_id !== req.user.id) { await client.query('ROLLBACK'); return res.status(403).json({ error: 'Solo el emisor puede anular su nota' }); }
      if (nota.estado !== 'emitida') { await client.query('ROLLBACK'); return res.status(409).json({ error: 'La nota ya está anulada' }); }

      const resp = await client.query(
        'SELECT 1 FROM bitacora_notas WHERE vinculada_a = $1 AND emisor_id IS DISTINCT FROM $2 LIMIT 1',
        [notaId, req.user.id]
      );
      if (resp.rowCount > 0) { await client.query('ROLLBACK'); return res.status(409).json({ error: 'La nota ya fue respondida por otra parte; no puede anularse' }); }

      await client.query("UPDATE bitacora_notas SET estado = 'anulada' WHERE id = $1", [notaId]);

      const correctiva = await insertarNotaAtomica(client, {
        bitacoraId: nota.bitacora_id,
        tipo: nota.tipo,
        asunto: `Corrección (dice/debe decir) de la nota #${nota.numero}`,
        contenido,
        emisorId: req.user.id,
        vinculadaA: notaId
      });

      await client.query('COMMIT');
      return res.status(201).json({ anulada_id: notaId, correctiva });
    } catch (e) {
      try { await client.query('ROLLBACK'); } catch (_) {}
      throw e;
    } finally { client.release(); }
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Folio de nota duplicado; reintenta' });
    console.error('[anularNota]', err);
    return res.status(500).json({ error: 'Error interno' });
  }
}

// POST /api/bitacora/notas/:notaId/vincular — una parte del roster crea una nota
// NUEVA (respuesta/adición/resolución, art. 123 fr. VIII y XII) que referencia la
// original; la original queda intacta. El tipo se valida contra el rol del que responde.
async function vincularNota(req, res) {
  const notaId = Number(req.params.notaId);
  if (!Number.isInteger(notaId) || notaId <= 0) return res.status(400).json({ error: 'notaId inválido' });
  const { tipo, asunto, contenido } = leerCamposNota(req.body || {});
  if (!tipo) return res.status(400).json({ error: 'Falta el tipo de nota' });
  if (!contenido) return res.status(400).json({ error: 'Falta el contenido de la respuesta' });
  if (contenido.length > 5000) return res.status(400).json({ error: 'El contenido no puede exceder 5000 caracteres' });
  if (asunto.length > 200) return res.status(400).json({ error: 'El asunto no puede exceder 200 caracteres' });

  let client;
  try {
    client = await pool.connect();
    try {
      await client.query('BEGIN');
      const orig = await client.query('SELECT id, bitacora_id FROM bitacora_notas WHERE id = $1', [notaId]);
      if (orig.rowCount === 0) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Nota a vincular no encontrada' }); }
      const bitacoraId = orig.rows[0].bitacora_id;

      const { notFound, apertura, rolEnContrato } = await cargarAperturaYRol(client, bitacoraId, req.user.id);
      if (notFound) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'El contrato no tiene bitácora aperturada' }); }
      if (!rolEnContrato) { await client.query('ROLLBACK'); return res.status(403).json({ error: 'No eres parte firmante de este contrato; no puedes responder notas' }); }

      const v = await validarTipoParaRol(client, tipo, rolEnContrato);
      if (!v.ok) { await client.query('ROLLBACK'); return res.status(v.status).json({ error: v.error }); }

      const nota = await insertarNotaAtomica(client, {
        bitacoraId: apertura.id, tipo, asunto, contenido, emisorId: req.user.id, vinculadaA: notaId
      });
      await client.query('COMMIT');
      return res.status(201).json(nota);
    } catch (e) {
      try { await client.query('ROLLBACK'); } catch (_) {}
      throw e;
    } finally { client.release(); }
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Folio de nota duplicado; reintenta' });
    console.error('[vincularNota]', err);
    return res.status(500).json({ error: 'Error interno' });
  }
}

// GET /api/bitacora/nota-tipos — catálogo de tipos (art. 125) para que el UI filtre
// por rol. Único requisito: estar autenticado (el router ya lo exige).
async function listarNotaTipos(req, res) {
  try {
    const r = await pool.query('SELECT clave, etiqueta, rol_emisor, orden FROM bitacora_nota_tipos ORDER BY orden');
    return res.status(200).json(r.rows);
  } catch (err) {
    console.error('[listarNotaTipos]', err);
    return res.status(500).json({ error: 'Error interno' });
  }
}

module.exports = {
  abrirBitacora,
  firmarApertura,
  pendientesPorFirmar,
  bitacoraDeContrato,
  listarNotaTipos,
  emitirNota,
  listarNotas,
  notasDeContrato,
  anularNota,
  vincularNota
};
