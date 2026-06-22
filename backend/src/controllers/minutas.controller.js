// HU-11 (sesión autónoma E2 18-jun) — MINUTAS, VISITAS Y ACUERDOS. Archivo NUEVO. Cierra la maqueta
// (todo era useState) conectando minutas y visitas al backend real, con su PDF y el VÍNCULO a una nota de
// bitácora. Las tablas `minutas` (con pdf_* + nota_id) y `visitas` ya existían; el "adjuntar a nota" deja de
// ser informativo y persiste el vínculo (minutas/visitas.nota_id). Fundamento: art. 123 fr. X RLOPSRM
// ("se podrán ratificar en la Bitácora las instrucciones emitidas vía oficios, MINUTAS, memoranda y
// circulares…"). Inmutabilidad: vincular NO modifica la nota firmada (es una relación, no una edición;
// art. 123 fr. VI RLOPSRM — el trigger de inmutabilidad de la nota queda intacto).
const { pool } = require('../db/pool');
const { esParteOSupervision } = require('../lib/acceso');
const { contratoCerrado, msgCerrado } = require('../lib/gateCierre');

async function getContrato(client, id) {
  const c = await client.query(
    'SELECT id, folio, created_by, residente_id, superintendente_id, supervision_id, dependencia_id FROM contratos WHERE id = $1', [id]);
  return c.rowCount ? c.rows[0] : null;
}
// Autoridad de registro: el residente del contrato (HU-11 da 'E' al residente; contratista/supervisión 'C').
function puedeRegistrar(user, contrato) {
  return contrato.residente_id === user.id || contrato.created_by === user.id;
}
// La nota debe pertenecer a la bitácora del MISMO contrato (no se liga una nota ajena).
async function notaDelContrato(client, notaId, contratoId) {
  const r = await client.query(
    `SELECT bn.id FROM bitacora_notas bn JOIN bitacora_aperturas ba ON ba.id = bn.bitacora_id
      WHERE bn.id = $1 AND ba.contrato_id = $2`, [notaId, contratoId]);
  return r.rowCount > 0;
}

// ---------- MINUTAS ----------
// GET /api/minutas/contrato/:id — minutas del contrato (+ flag de PDF). Read, por participación.
async function listarMinutas(req, res) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'contrato inválido' });
    const contrato = await getContrato(pool, id);
    if (!contrato) return res.status(404).json({ error: 'Contrato no encontrado' });
    if (!esParteOSupervision(req.user, contrato)) return res.status(403).json({ error: 'No tienes acceso a las minutas de este contrato' });
    // FIX 1.2 — devolver el FOLIO de la nota (bn.numero), no solo el id interno, para mostrar "#folio".
    const r = await pool.query(
      `SELECT m.id, m.titulo, m.fecha, m.lugar, m.participantes, m.acuerdos, m.nota_id, m.registrada_por, m.created_at,
              (m.pdf_contenido IS NOT NULL) AS tiene_pdf, m.pdf_nombre,
              bn.numero AS nota_numero
         FROM minutas m
         LEFT JOIN bitacora_notas bn ON bn.id = m.nota_id
        WHERE m.contrato_id = $1 ORDER BY m.fecha DESC, m.id DESC`, [id]);
    return res.status(200).json({ contrato_id: id, minutas: r.rows });
  } catch (err) { console.error('[listarMinutas]', err); return res.status(500).json({ error: 'Error interno' }); }
}

// POST /api/minutas/contrato/:id — crear minuta. Body: { titulo, fecha, lugar?, participantes?, acuerdos?, nota_id? }.
async function crearMinuta(req, res) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'contrato inválido' });
    const contrato = await getContrato(pool, id);
    if (!contrato) return res.status(404).json({ error: 'Contrato no encontrado' });
    if (!puedeRegistrar(req.user, contrato)) return res.status(403).json({ error: 'Solo el residente asignado al contrato puede registrar minutas' });
    // FIX #3 (22-jun) — contrato cerrado (finiquito) = SOLO-LECTURA: no se registran actos nuevos (art. 64 LOPSRM).
    if (await contratoCerrado(pool, id)) return res.status(409).json({ error: msgCerrado('no se registran minutas') });
    const b = req.body || {};
    if (!b.titulo || !String(b.titulo).trim()) return res.status(400).json({ error: 'El asunto/título de la minuta es obligatorio' });
    if (!b.fecha) return res.status(400).json({ error: 'La fecha de la minuta es obligatoria' });
    // HU-11 (22-jun) — la historia exige lugar y participantes; antes solo el frontend los pedía → se validan también server-side.
    if (!b.lugar || !String(b.lugar).trim()) return res.status(400).json({ error: 'El lugar de la minuta es obligatorio' });
    if (!b.participantes || !String(b.participantes).trim()) return res.status(400).json({ error: 'Los participantes de la minuta son obligatorios' });
    const notaId = b.nota_id != null ? Number(b.nota_id) : null;
    if (notaId != null) { if (!(await notaDelContrato(pool, notaId, id))) return res.status(400).json({ error: 'La nota indicada no pertenece a la bitácora de este contrato' }); }
    const r = await pool.query(
      `INSERT INTO minutas (contrato_id, titulo, fecha, lugar, participantes, acuerdos, nota_id, registrada_por)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id, titulo, fecha, lugar, participantes, acuerdos, nota_id, created_at`,
      [id, String(b.titulo).trim(), b.fecha, b.lugar ? String(b.lugar).trim() : null,
       b.participantes ? String(b.participantes).trim() : null, b.acuerdos ? String(b.acuerdos).trim() : null, notaId, req.user.id]);
    return res.status(201).json(r.rows[0]);
  } catch (err) { console.error('[crearMinuta]', err); return res.status(500).json({ error: 'Error interno' }); }
}

async function getMinutaConContrato(client, minutaId) {
  const r = await client.query(
    `SELECT m.*, c.created_by, c.residente_id, c.superintendente_id, c.supervision_id, c.dependencia_id
       FROM minutas m JOIN contratos c ON c.id = m.contrato_id WHERE m.id = $1`, [minutaId]);
  return r.rowCount ? r.rows[0] : null;
}

// PATCH /api/minutas/:minutaId/nota — vincular (o desvincular con nota_id null) la minuta a una nota.
async function vincularNotaMinuta(req, res) {
  try {
    const mid = Number(req.params.minutaId);
    if (!Number.isInteger(mid) || mid <= 0) return res.status(400).json({ error: 'minuta inválida' });
    const m = await getMinutaConContrato(pool, mid);
    if (!m) return res.status(404).json({ error: 'Minuta no encontrada' });
    if (!puedeRegistrar(req.user, m)) return res.status(403).json({ error: 'Solo el residente asignado puede vincular la minuta a una nota' });
    const notaId = req.body?.nota_id != null ? Number(req.body.nota_id) : null;
    if (notaId != null && !(await notaDelContrato(pool, notaId, m.contrato_id))) return res.status(400).json({ error: 'La nota indicada no pertenece a la bitácora de este contrato' });
    await pool.query('UPDATE minutas SET nota_id = $1 WHERE id = $2', [notaId, mid]);
    return res.status(200).json({ id: mid, nota_id: notaId });
  } catch (err) { console.error('[vincularNotaMinuta]', err); return res.status(500).json({ error: 'Error interno' }); }
}

// POST /api/minutas/:minutaId/pdf — subir el PDF de la minuta (multipart, campo 'documento'). Reemplazable.
async function subirPdfMinuta(req, res) {
  try {
    const mid = Number(req.params.minutaId);
    if (!Number.isInteger(mid) || mid <= 0) return res.status(400).json({ error: 'minuta inválida' });
    if (!req.file || !req.file.buffer) return res.status(400).json({ error: 'Falta el archivo PDF (campo "documento")' });
    const { buffer, originalname, mimetype, size } = req.file;
    if (!(buffer.length >= 4 && buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46)) return res.status(400).json({ error: 'El archivo no es un PDF válido' });
    const m = await getMinutaConContrato(pool, mid);
    if (!m) return res.status(404).json({ error: 'Minuta no encontrada' });
    if (!puedeRegistrar(req.user, m)) return res.status(403).json({ error: 'Solo el residente asignado puede subir el PDF de la minuta' });
    await pool.query('UPDATE minutas SET pdf_nombre=$1, pdf_mime=$2, pdf_tamano=$3, pdf_contenido=$4 WHERE id=$5', [originalname, mimetype, size, buffer, mid]);
    return res.status(201).json({ id: mid, nombre: originalname, mime: mimetype, tamano: size });
  } catch (err) { console.error('[subirPdfMinuta]', err); return res.status(500).json({ error: 'Error interno' }); }
}

// GET /api/minutas/:minutaId/pdf — descargar/visualizar el PDF de la minuta (por participación).
async function descargarPdfMinuta(req, res) {
  try {
    const mid = Number(req.params.minutaId);
    if (!Number.isInteger(mid) || mid <= 0) return res.status(400).json({ error: 'minuta inválida' });
    const m = await getMinutaConContrato(pool, mid);
    if (!m) return res.status(404).json({ error: 'Minuta no encontrada' });
    if (!esParteOSupervision(req.user, m)) return res.status(403).json({ error: 'No tienes acceso a esta minuta' });
    if (!m.pdf_contenido) return res.status(404).json({ error: 'Esta minuta no tiene PDF cargado' });
    res.setHeader('Content-Type', m.pdf_mime || 'application/pdf');
    res.setHeader('Content-Length', m.pdf_tamano);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(m.pdf_nombre || 'minuta.pdf')}"`);
    return res.status(200).send(m.pdf_contenido);
  } catch (err) { console.error('[descargarPdfMinuta]', err); return res.status(500).json({ error: 'Error interno' }); }
}

// ---------- VISITAS ----------
// GET /api/minutas/contrato/:id/visitas — visitas del contrato.
async function listarVisitas(req, res) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'contrato inválido' });
    const contrato = await getContrato(pool, id);
    if (!contrato) return res.status(404).json({ error: 'Contrato no encontrado' });
    if (!esParteOSupervision(req.user, contrato)) return res.status(403).json({ error: 'No tienes acceso a las visitas de este contrato' });
    // FIX 1.2 — folio de la nota vinculada (bn.numero) para mostrar "#folio" en vez del id interno.
    const r = await pool.query(
      `SELECT vi.id, vi.tipo, vi.fecha_programada, vi.fecha_realizada, vi.lugar, vi.responsable, vi.proposito,
              vi.resultado, vi.estado, vi.nota_id, vi.created_at,
              bn.numero AS nota_numero
         FROM visitas vi
         LEFT JOIN bitacora_notas bn ON bn.id = vi.nota_id
        WHERE vi.contrato_id = $1 ORDER BY vi.fecha_programada DESC, vi.id DESC`, [id]);
    return res.status(200).json({ contrato_id: id, visitas: r.rows });
  } catch (err) { console.error('[listarVisitas]', err); return res.status(500).json({ error: 'Error interno' }); }
}

// POST /api/minutas/contrato/:id/visitas — agendar visita. Body: { fecha_programada, lugar?, responsable?, proposito? }.
async function crearVisita(req, res) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'contrato inválido' });
    const contrato = await getContrato(pool, id);
    if (!contrato) return res.status(404).json({ error: 'Contrato no encontrado' });
    if (!puedeRegistrar(req.user, contrato)) return res.status(403).json({ error: 'Solo el residente asignado al contrato puede agendar visitas' });
    // FIX #3 (22-jun) — contrato cerrado (finiquito) = SOLO-LECTURA (art. 64 LOPSRM).
    if (await contratoCerrado(pool, id)) return res.status(409).json({ error: msgCerrado('no se agendan visitas') });
    const b = req.body || {};
    if (!b.fecha_programada) return res.status(400).json({ error: 'La fecha programada de la visita es obligatoria' });
    // HU-11 (22-jun) — la historia exige lugar, responsable y propósito; antes solo el frontend → se validan server-side.
    if (!b.lugar || !String(b.lugar).trim()) return res.status(400).json({ error: 'El lugar de la visita es obligatorio' });
    if (!b.responsable || !String(b.responsable).trim()) return res.status(400).json({ error: 'El responsable de la visita es obligatorio' });
    if (!b.proposito || !String(b.proposito).trim()) return res.status(400).json({ error: 'El propósito de la visita es obligatorio' });
    const r = await pool.query(
      `INSERT INTO visitas (contrato_id, tipo, fecha_programada, lugar, responsable, proposito, estado, registrada_por)
       VALUES ($1,$2,$3,$4,$5,$6,'agendada',$7) RETURNING id, tipo, fecha_programada, lugar, responsable, proposito, estado, created_at`,
      [id, b.tipo ? String(b.tipo).slice(0, 20) : 'visita', b.fecha_programada,
       b.lugar ? String(b.lugar).trim() : null, b.responsable ? String(b.responsable).trim() : null, b.proposito ? String(b.proposito).trim() : null, req.user.id]);
    return res.status(201).json(r.rows[0]);
  } catch (err) { console.error('[crearVisita]', err); return res.status(500).json({ error: 'Error interno' }); }
}

// PATCH /api/minutas/visita/:visitaId/nota — vincular la visita a una nota de bitácora del contrato.
async function vincularNotaVisita(req, res) {
  try {
    const vid = Number(req.params.visitaId);
    if (!Number.isInteger(vid) || vid <= 0) return res.status(400).json({ error: 'visita inválida' });
    const v = await pool.query(
      `SELECT vi.id, vi.contrato_id, c.created_by, c.residente_id, c.superintendente_id, c.supervision_id, c.dependencia_id
         FROM visitas vi JOIN contratos c ON c.id = vi.contrato_id WHERE vi.id = $1`, [vid]);
    if (v.rowCount === 0) return res.status(404).json({ error: 'Visita no encontrada' });
    const row = v.rows[0];
    if (!puedeRegistrar(req.user, row)) return res.status(403).json({ error: 'Solo el residente asignado puede vincular la visita a una nota' });
    const notaId = req.body?.nota_id != null ? Number(req.body.nota_id) : null;
    if (notaId != null && !(await notaDelContrato(pool, notaId, row.contrato_id))) return res.status(400).json({ error: 'La nota indicada no pertenece a la bitácora de este contrato' });
    await pool.query('UPDATE visitas SET nota_id = $1 WHERE id = $2', [notaId, vid]);
    return res.status(200).json({ id: vid, nota_id: notaId });
  } catch (err) { console.error('[vincularNotaVisita]', err); return res.status(500).json({ error: 'Error interno' }); }
}

module.exports = {
  listarMinutas, crearMinuta, vincularNotaMinuta, subirPdfMinuta, descargarPdfMinuta,
  listarVisitas, crearVisita, vincularNotaVisita,
};
