// HU-02 (sesión autónoma E2 18-jun) — FIANZAS Y GARANTÍAS. Archivo NUEVO. Cierra la maqueta de
// RegistroFianzas.jsx conectándola al backend real (las garantías ya persistían desde el alta HU-01;
// faltaba gestionarlas/leerlas/endosarlas por esta pantalla y guardar el PDF).
// Fundamento: art. 48 LOPSRM (garantía de anticipo fr. I y de cumplimiento fr. II, dentro de los 15 días
// naturales del fallo); art. 66 LOPSRM (vicios ocultos); art. 91 RLOPSRM (garantía de cumplimiento ≥10% del
// monto y su AJUSTE/ampliación por modificación de monto o plazo = el ENDOSO; el propio art. 91 remite a la
// fr. II y último párrafo del art. 98 RLOPSRM para el ajuste de la fianza — misma base que cita la cabecera
// de la tabla garantia_endosos en schema.sql, no son fundamentos distintos).
const { pool } = require('../db/pool');
const { esParteOSupervision } = require('../lib/acceso');
const { contratoCerrado, msgCerrado } = require('../lib/gateCierre');

const numOrNull = (v) => { if (v === '' || v == null) return null; const n = Number(v); return Number.isFinite(n) ? n : null; };

// Vigencia vencida: criterio idéntico al alta (hoy UTC − 1 día, para no rechazar por desfase de zona horaria).
function vigenciaVencida(iso) {
  if (!iso) return false;
  const v = new Date(`${String(iso).slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(v.getTime())) return false;
  const h = new Date();
  const limite = new Date(Date.UTC(h.getUTCFullYear(), h.getUTCMonth(), h.getUTCDate()) - 86400000);
  return v < limite;
}

// Validación de una garantía (misma regla que crearContrato: tipo, monto>0, monto≤contrato, vigencia no vencida).
function validarGarantia({ tipo, monto, vigencia }, montoContrato) {
  if (!tipo || !String(tipo).trim()) return 'El tipo de garantía es obligatorio (art. 48 LOPSRM)';
  const gm = numOrNull(monto);
  if (gm === null || gm <= 0) return 'El monto afianzado debe ser mayor a 0';
  if (montoContrato != null && gm > Number(montoContrato)) return `El monto (${gm}) no puede exceder el monto del contrato (${montoContrato})`;
  if (vigencia && vigenciaVencida(vigencia)) return 'La vigencia de la póliza no puede estar vencida (art. 48 LOPSRM)';
  return null;
}

async function getContrato(client, id) {
  const c = await client.query(
    'SELECT id, folio, monto, created_by, residente_id, superintendente_id, supervision_id, dependencia_id FROM contratos WHERE id = $1', [id]);
  return c.rowCount ? c.rows[0] : null;
}
// Autoridad de GESTIÓN (= convenios/finiquito): la dependencia o el residente/creador del contrato. HU-02 da
// 'E' a la dependencia; el residente la creó vía el alta. Los demás (contratista/supervisión) solo consultan.
function puedeGestionar(user, contrato) {
  return user.rol === 'dependencia' || contrato.residente_id === user.id || contrato.created_by === user.id;
}
async function getGarantiaConContrato(client, garantiaId) {
  const g = await client.query(
    `SELECT g.*, c.monto AS contrato_monto, c.created_by, c.residente_id, c.superintendente_id, c.supervision_id, c.dependencia_id
       FROM contrato_garantias g JOIN contratos c ON c.id = g.contrato_id WHERE g.id = $1`, [garantiaId]);
  return g.rowCount ? g.rows[0] : null;
}

// GET /api/garantias/contrato/:id — garantías del contrato (con sus endosos y el flag de PDF). Read, por participación.
async function listarGarantias(req, res) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'contrato inválido' });
    const contrato = await getContrato(pool, id);
    if (!contrato) return res.status(404).json({ error: 'Contrato no encontrado' });
    if (!esParteOSupervision(req.user, contrato)) return res.status(403).json({ error: 'No tienes acceso a las garantías de este contrato' });
    const gs = await pool.query(
      `SELECT id, tipo, afianzadora, poliza, monto, vigencia, created_at,
              (pdf_contenido IS NOT NULL) AS tiene_pdf, pdf_nombre
         FROM contrato_garantias WHERE contrato_id = $1 ORDER BY created_at`, [id]);
    const ids = gs.rows.map((g) => g.id);
    let endosos = [];
    if (ids.length) {
      endosos = (await pool.query(
        `SELECT e.id, e.garantia_id, e.motivo, e.nuevo_monto, e.nueva_vigencia, e.observaciones, e.created_at,
                u.nombre AS registrado_por_nombre
           FROM garantia_endosos e LEFT JOIN usuarios u ON u.id = e.registrado_por
          WHERE e.garantia_id = ANY($1) ORDER BY e.created_at`, [ids])).rows;
    }
    const porGarantia = new Map(ids.map((i) => [i, []]));
    for (const e of endosos) porGarantia.get(e.garantia_id)?.push(e);
    const garantias = gs.rows.map((g) => ({ ...g, endosos: porGarantia.get(g.id) || [] }));
    return res.status(200).json({ contrato_id: id, contrato_monto: contrato.monto, garantias });
  } catch (err) { console.error('[listarGarantias]', err); return res.status(500).json({ error: 'Error interno' }); }
}

// POST /api/garantias/contrato/:id — crear una garantía. Body: { tipo, afianzadora, poliza, monto, vigencia }.
async function crearGarantia(req, res) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'contrato inválido' });
    const contrato = await getContrato(pool, id);
    if (!contrato) return res.status(404).json({ error: 'Contrato no encontrado' });
    if (!puedeGestionar(req.user, contrato)) return res.status(403).json({ error: 'Solo la dependencia o el residente asignado puede registrar garantías' });
    // FIX #3 (22-jun) — contrato cerrado (finiquito) = SOLO-LECTURA (art. 64 LOPSRM).
    if (await contratoCerrado(pool, id)) return res.status(409).json({ error: msgCerrado('no se registran garantías') });
    const b = req.body || {};
    const err = validarGarantia(b, contrato.monto);
    if (err) return res.status(400).json({ error: err });
    // P1 (22-jun) — canonicalizar `tipo` a clave (minúsculas + guion bajo) para que el UNIQUE(contrato_id,tipo) muerda
    // aunque el alta mande 'Cumplimiento' y HU-02 'cumplimiento' (antes eran strings distintos → permitían 2 del mismo
    // tipo). NO se toca el schema ni el índice (zona congelada): solo se normaliza antes de grabar.
    const tipoNorm = String(b.tipo || '').trim().toLowerCase().replace(/\s+/g, '_');
    try {
      const r = await pool.query(
        `INSERT INTO contrato_garantias (contrato_id, tipo, afianzadora, poliza, monto, vigencia, registrado_por)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id, tipo, afianzadora, poliza, monto, vigencia, created_at`,
        [id, tipoNorm, b.afianzadora ? String(b.afianzadora).trim() : null,
         b.poliza ? String(b.poliza).trim() : null, numOrNull(b.monto), b.vigencia || null, req.user.id]);
      return res.status(201).json(r.rows[0]);
    } catch (e) {
      // UNIQUE (contrato_id, tipo): una sola garantía por tipo (art. 48 LOPSRM: una de anticipo, una de cumplimiento).
      if (e && e.code === '23505') return res.status(409).json({ error: `El contrato ya tiene una garantía de tipo "${b.tipo}"; edítala en vez de crear otra (una por tipo, art. 48 LOPSRM).` });
      throw e;
    }
  } catch (err) { console.error('[crearGarantia]', err); return res.status(500).json({ error: 'Error interno' }); }
}

// PUT /api/garantias/:garantiaId — editar una garantía (contrato_garantias es editable: sin trigger append-only).
async function editarGarantia(req, res) {
  try {
    const gid = Number(req.params.garantiaId);
    if (!Number.isInteger(gid) || gid <= 0) return res.status(400).json({ error: 'garantía inválida' });
    const g = await getGarantiaConContrato(pool, gid);
    if (!g) return res.status(404).json({ error: 'Garantía no encontrada' });
    if (!puedeGestionar(req.user, g)) return res.status(403).json({ error: 'Solo la dependencia o el residente asignado puede editar garantías' });
    const b = req.body || {};
    const err = validarGarantia(b, g.contrato_monto);
    if (err) return res.status(400).json({ error: err });
    try {
      const r = await pool.query(
        `UPDATE contrato_garantias SET tipo=$1, afianzadora=$2, poliza=$3, monto=$4, vigencia=$5
          WHERE id=$6 RETURNING id, tipo, afianzadora, poliza, monto, vigencia, created_at`,
        [String(b.tipo).trim(), b.afianzadora ? String(b.afianzadora).trim() : null,
         b.poliza ? String(b.poliza).trim() : null, numOrNull(b.monto), b.vigencia || null, gid]);
      return res.status(200).json(r.rows[0]);
    } catch (e) {
      if (e && e.code === '23505') return res.status(409).json({ error: `El contrato ya tiene una garantía de tipo "${b.tipo}" (una por tipo, art. 48 LOPSRM).` });
      throw e;
    }
  } catch (err) { console.error('[editarGarantia]', err); return res.status(500).json({ error: 'Error interno' }); }
}

// POST /api/garantias/:garantiaId/endoso — registrar un endoso (ajuste de garantía, art. 91 RLOPSRM).
// Append-only (la tabla tiene trigger BEFORE UPDATE de inmutabilidad). Body: { motivo, nuevo_monto?, nueva_vigencia?, observaciones?, convenio_id? }.
async function registrarEndoso(req, res) {
  try {
    const gid = Number(req.params.garantiaId);
    if (!Number.isInteger(gid) || gid <= 0) return res.status(400).json({ error: 'garantía inválida' });
    const g = await getGarantiaConContrato(pool, gid);
    if (!g) return res.status(404).json({ error: 'Garantía no encontrada' });
    if (!puedeGestionar(req.user, g)) return res.status(403).json({ error: 'Solo la dependencia o el residente asignado puede registrar endosos' });
    // FIX #3 (22-jun) — contrato cerrado (finiquito) = SOLO-LECTURA (art. 64 LOPSRM).
    if (await contratoCerrado(pool, g.contrato_id)) return res.status(409).json({ error: msgCerrado('no se registran endosos') });
    const b = req.body || {};
    const MOTIVOS = ['ampliacion_monto', 'prorroga_vigencia', 'mixto', 'otro'];
    const motivo = MOTIVOS.includes(b.motivo) ? b.motivo : 'otro';
    const nuevoMonto = numOrNull(b.nuevo_monto);
    if (nuevoMonto !== null && nuevoMonto < 0) return res.status(400).json({ error: 'El nuevo monto no puede ser negativo' });
    if (b.nueva_vigencia && vigenciaVencida(b.nueva_vigencia)) return res.status(400).json({ error: 'La nueva vigencia no puede estar vencida' });
    // FIX 1.3 — el endoso debe traer el dato que su MOTIVO ajusta (art. 91 RLOPSRM, que remite al art. 98 fr. II
    // y último párrafo): un endoso de ampliación de monto sin nuevo_monto, o de prórroga sin nueva_vigencia, o
    // un endoso totalmente vacío, no ajustan la fianza y se rechazan.
    const exigeMonto = motivo === 'ampliacion_monto' || motivo === 'mixto';
    const exigeVigencia = motivo === 'prorroga_vigencia' || motivo === 'mixto';
    if (exigeMonto && !(nuevoMonto > 0)) return res.status(400).json({ error: 'Un endoso por ampliación de monto requiere el nuevo monto afianzado mayor a 0 (art. 91 RLOPSRM).' });
    if (exigeVigencia && !b.nueva_vigencia) return res.status(400).json({ error: 'Un endoso por prórroga de vigencia requiere la nueva vigencia de la póliza (art. 91 RLOPSRM).' });
    if (nuevoMonto === null && !b.nueva_vigencia) return res.status(400).json({ error: 'El endoso no modifica nada: indica el nuevo monto afianzado y/o la nueva vigencia (art. 91 RLOPSRM).' });
    const r = await pool.query(
      `INSERT INTO garantia_endosos (garantia_id, convenio_id, motivo, nuevo_monto, nueva_vigencia, observaciones, registrado_por)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id, garantia_id, motivo, nuevo_monto, nueva_vigencia, observaciones, created_at`,
      [gid, numOrNull(b.convenio_id), motivo, nuevoMonto, b.nueva_vigencia || null,
       b.observaciones ? String(b.observaciones).trim() : null, req.user.id]);
    return res.status(201).json(r.rows[0]);
  } catch (err) { console.error('[registrarEndoso]', err); return res.status(500).json({ error: 'Error interno' }); }
}

// POST /api/garantias/:garantiaId/pdf — subir el PDF de la póliza (multipart, campo 'documento'). Reemplazable.
async function subirPdfGarantia(req, res) {
  try {
    const gid = Number(req.params.garantiaId);
    if (!Number.isInteger(gid) || gid <= 0) return res.status(400).json({ error: 'garantía inválida' });
    if (!req.file || !req.file.buffer) return res.status(400).json({ error: 'Falta el archivo PDF (campo "documento")' });
    const { buffer, originalname, mimetype, size } = req.file;
    if (!(buffer.length >= 4 && buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46)) {
      return res.status(400).json({ error: 'El archivo no es un PDF válido' });
    }
    const g = await getGarantiaConContrato(pool, gid);
    if (!g) return res.status(404).json({ error: 'Garantía no encontrada' });
    if (!puedeGestionar(req.user, g)) return res.status(403).json({ error: 'Solo la dependencia o el residente asignado puede subir el PDF de la póliza' });
    await pool.query(
      'UPDATE contrato_garantias SET pdf_nombre=$1, pdf_mime=$2, pdf_tamano=$3, pdf_contenido=$4 WHERE id=$5',
      [originalname, mimetype, size, buffer, gid]);
    return res.status(201).json({ id: gid, nombre: originalname, mime: mimetype, tamano: size });
  } catch (err) { console.error('[subirPdfGarantia]', err); return res.status(500).json({ error: 'Error interno' }); }
}

// GET /api/garantias/:garantiaId/pdf — descargar/visualizar el PDF de la póliza (por participación).
async function descargarPdfGarantia(req, res) {
  try {
    const gid = Number(req.params.garantiaId);
    if (!Number.isInteger(gid) || gid <= 0) return res.status(400).json({ error: 'garantía inválida' });
    const g = await getGarantiaConContrato(pool, gid);
    if (!g) return res.status(404).json({ error: 'Garantía no encontrada' });
    if (!esParteOSupervision(req.user, g)) return res.status(403).json({ error: 'No tienes acceso a esta garantía' });
    if (!g.pdf_contenido) return res.status(404).json({ error: 'Esta garantía no tiene PDF cargado' });
    res.setHeader('Content-Type', g.pdf_mime || 'application/pdf');
    res.setHeader('Content-Length', g.pdf_tamano);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(g.pdf_nombre || 'poliza.pdf')}"`);
    return res.status(200).send(g.pdf_contenido);
  } catch (err) { console.error('[descargarPdfGarantia]', err); return res.status(500).json({ error: 'Error interno' }); }
}

module.exports = { listarGarantias, crearGarantia, editarGarantia, registrarEndoso, subirPdfGarantia, descargarPdfGarantia };
