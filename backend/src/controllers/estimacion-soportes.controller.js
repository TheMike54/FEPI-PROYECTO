// SOPORTES DOCUMENTALES por concepto de la estimación (bug #4). Archivo NUEVO (NO congelado). Se monta
// como /api/estimacion-soportes. Complementa la EVIDENCIA FOTOGRÁFICA (estimacion-fotos, solo JPEG/PNG):
// aquí se admiten DOCUMENTOS de soporte técnico por concepto — PDF, XLS/XLSX, CSV/TXT e imágenes — que
// respaldan los números generadores (art. 132 RLOPSRM: la estimación se integra con la documentación que
// acredita la procedencia de su pago). Se guardan INLINE como BYTEA (disco de Render efímero; la BD sí
// persiste), igual que fotos/minutas/garantías. Acceso por participación (lib/acceso); `subido_por` del JWT.
//
// TABLA `estimacion_soportes_concepto` (aditiva, idempotente). NO se edita schema.sql (autor único Maiki):
// se asegura vía ensureSchema() al primer uso + queda registrada en backend/scripts/migracion_estimacion_soportes.sql
// para que Maiki la pliegue al schema canónico.
const { pool } = require('../db/pool');
const { esParteOSupervision } = require('../lib/acceso');

// --- ensureSchema idempotente (memoizado). Corre al primer request; no toca schema.sql. -----------------
let _ensured = null;
function ensureSchema() {
  if (_ensured) return _ensured;
  _ensured = pool.query(`
    CREATE TABLE IF NOT EXISTS estimacion_soportes_concepto (
      id                    SERIAL PRIMARY KEY,
      estimacion_id         INTEGER NOT NULL REFERENCES estimaciones(id) ON DELETE CASCADE,
      contrato_concepto_id  INTEGER REFERENCES contrato_conceptos(id) ON DELETE SET NULL,
      nombre                TEXT NOT NULL,
      descripcion           TEXT,
      tipo                  VARCHAR(20) NOT NULL,
      mime                  TEXT,
      tamano                INTEGER,
      contenido             BYTEA NOT NULL,
      subido_por            INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
      created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_est_soportes_estimacion ON estimacion_soportes_concepto(estimacion_id);
    CREATE INDEX IF NOT EXISTS idx_est_soportes_concepto   ON estimacion_soportes_concepto(contrato_concepto_id);
  `).catch((e) => { console.error('[estimacion-soportes ensureSchema]', e.message); _ensured = null; throw e; });
  return _ensured;
}
// Dispara la creación al cargar el módulo (no bloquea el arranque; si el pool aún no está, se reintenta al 1er request).
ensureSchema().catch(() => {});

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB (art. 132: documentación de soporte)

// Detecta el tipo real por MAGIC BYTES (binarios) o mimetype/extensión (texto sin firma). null = no permitido.
function detectarTipo(buffer, mimetype, nombre) {
  if (!buffer || buffer.length < 4) return null;
  const b = buffer;
  const ext = String(nombre || '').toLowerCase().split('.').pop();
  const isPDF  = b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46;          // %PDF
  const isPNG  = b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47;          // PNG
  const isJPEG = b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;                           // JPEG
  const isXLSlegacy = b[0] === 0xd0 && b[1] === 0xcf && b[2] === 0x11 && b[3] === 0xe0;     // OLE2 (.xls)
  const isZip  = b[0] === 0x50 && b[1] === 0x4b && (b[2] === 0x03 || b[2] === 0x05 || b[2] === 0x07); // PK (xlsx=zip)
  if (isPDF) return 'pdf';
  if (isPNG || isJPEG) return 'imagen';
  if (isXLSlegacy) return 'xls';
  if (isZip) return (ext === 'xlsx' || ext === 'xlsm') ? 'xlsx' : 'archivo';
  // Texto plano (CSV/TXT): sin firma fiable → se valida por mimetype/extensión + ausencia de bytes nulos.
  const pareceTexto = mimetype === 'text/csv' || mimetype === 'text/plain'
    || mimetype === 'application/vnd.ms-excel' || ext === 'csv' || ext === 'txt';
  if (pareceTexto && !b.slice(0, 512).includes(0x00)) {
    return (ext === 'csv' || mimetype === 'text/csv') ? 'csv' : 'txt';
  }
  return null;
}

// Estimación + columnas de acceso del contrato (para esParteOSupervision).
async function getEstimacionConContrato(db, estId) {
  const r = await db.query(
    `SELECT e.id, e.estado, c.id AS contrato_id, c.folio,
            c.created_by, c.residente_id, c.superintendente_id, c.supervision_id
       FROM estimaciones e JOIN contratos c ON c.id = e.contrato_id
      WHERE e.id = $1`,
    [estId]
  );
  return r.rowCount ? r.rows[0] : null;
}

// Soporte + acceso del contrato (para descargar/eliminar por participación).
async function getSoporteConContrato(db, soporteId) {
  const r = await db.query(
    `SELECT s.id, s.estimacion_id, s.nombre, s.mime, s.tamano, s.contenido, s.subido_por,
            c.created_by, c.residente_id, c.superintendente_id, c.supervision_id
       FROM estimacion_soportes_concepto s
       JOIN estimaciones e ON e.id = s.estimacion_id
       JOIN contratos c ON c.id = e.contrato_id
      WHERE s.id = $1`,
    [soporteId]
  );
  return r.rowCount ? r.rows[0] : null;
}

// GET /api/estimacion-soportes/estimacion/:estimacionId — METADATOS (no el binario) por participación.
async function listarSoportes(req, res) {
  try {
    await ensureSchema();
    const estId = Number(req.params.estimacionId);
    if (!Number.isInteger(estId) || estId <= 0) return res.status(400).json({ error: 'estimación inválida' });
    const est = await getEstimacionConContrato(pool, estId);
    if (!est) return res.status(404).json({ error: 'Estimación no encontrada' });
    if (!esParteOSupervision(req.user, est)) return res.status(403).json({ error: 'No tienes acceso a esta estimación' });
    const r = await pool.query(
      `SELECT s.id, s.contrato_concepto_id, cc.clave AS concepto_clave, cc.concepto AS concepto_nombre,
              s.nombre, s.descripcion, s.tipo, s.mime, s.tamano, s.subido_por, u.nombre AS subido_por_nombre, s.created_at
         FROM estimacion_soportes_concepto s
         LEFT JOIN contrato_conceptos cc ON cc.id = s.contrato_concepto_id
         LEFT JOIN usuarios u ON u.id = s.subido_por
        WHERE s.estimacion_id = $1 ORDER BY s.id`,
      [estId]
    );
    return res.status(200).json(r.rows);
  } catch (err) { console.error('[listarSoportes]', err); return res.status(500).json({ error: 'Error interno' }); }
}

// POST /api/estimacion-soportes/estimacion/:estimacionId — subir un soporte documental (multipart 'documento').
// body opcional: descripcion, contrato_concepto_id. append-only. subido_por = JWT.
async function subirSoporte(req, res) {
  try {
    await ensureSchema();
    const estId = Number(req.params.estimacionId);
    if (!Number.isInteger(estId) || estId <= 0) return res.status(400).json({ error: 'estimación inválida' });
    if (!req.file || !req.file.buffer) return res.status(400).json({ error: 'Falta el archivo (campo "documento")' });
    const { buffer, originalname, mimetype, size } = req.file;
    if (size > MAX_BYTES) return res.status(400).json({ error: 'El archivo supera el límite de 10 MB' });
    const tipo = detectarTipo(buffer, mimetype, originalname);
    if (!tipo) return res.status(400).json({ error: 'Tipo de archivo no permitido. Se aceptan PDF, XLS/XLSX, CSV/TXT o imágenes JPEG/PNG.' });

    const est = await getEstimacionConContrato(pool, estId);
    if (!est) return res.status(404).json({ error: 'Estimación no encontrada' });
    if (!esParteOSupervision(req.user, est)) return res.status(403).json({ error: 'No participas en este contrato' });

    const descripcion = (req.body && typeof req.body.descripcion === 'string') ? req.body.descripcion.slice(0, 500) : null;
    // contrato_concepto_id OPCIONAL. Si se envía y NO pertenece al contrato → 400 explícito (bug #26: no se
    // degrada en silencio a "soporte general"). Solo se permite null cuando NO se envía concepto.
    let conceptoId = null;
    if (req.body && req.body.contrato_concepto_id != null && String(req.body.contrato_concepto_id).trim() !== '') {
      conceptoId = Number(req.body.contrato_concepto_id);
      if (!Number.isInteger(conceptoId) || conceptoId <= 0) return res.status(400).json({ error: 'contrato_concepto_id inválido' });
      const ok = await pool.query('SELECT 1 FROM contrato_conceptos WHERE id=$1 AND contrato_id=$2', [conceptoId, est.contrato_id]);
      if (ok.rowCount === 0) return res.status(400).json({ error: 'El concepto indicado no pertenece a este contrato' });
    }
    const r = await pool.query(
      `INSERT INTO estimacion_soportes_concepto (estimacion_id, contrato_concepto_id, nombre, descripcion, tipo, mime, tamano, contenido, subido_por)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING id, estimacion_id, contrato_concepto_id, nombre, descripcion, tipo, mime, tamano, subido_por, created_at`,
      [estId, conceptoId, originalname || 'soporte', descripcion, tipo, mimetype, size, buffer, req.user.id]
    );
    return res.status(201).json(r.rows[0]);
  } catch (err) { console.error('[subirSoporte]', err); return res.status(500).json({ error: 'Error interno' }); }
}

// GET /api/estimacion-soportes/archivo/:soporteId — sirve el binario (inline) por participación.
async function descargarSoporte(req, res) {
  try {
    await ensureSchema();
    const soporteId = Number(req.params.soporteId);
    if (!Number.isInteger(soporteId) || soporteId <= 0) return res.status(400).json({ error: 'soporte inválido' });
    const s = await getSoporteConContrato(pool, soporteId);
    if (!s) return res.status(404).json({ error: 'Soporte no encontrado' });
    if (!esParteOSupervision(req.user, s)) return res.status(403).json({ error: 'No tienes acceso a este soporte' });
    if (!s.contenido) return res.status(404).json({ error: 'El soporte no tiene contenido' });
    res.setHeader('Content-Type', s.mime || 'application/octet-stream');
    res.setHeader('Content-Length', s.tamano);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(s.nombre || 'soporte')}"`);
    return res.status(200).send(s.contenido);
  } catch (err) { console.error('[descargarSoporte]', err); return res.status(500).json({ error: 'Error interno' }); }
}

// DELETE /api/estimacion-soportes/:soporteId — elimina un soporte (por participación). El soporte es un
// adjunto; la estimación (carátula) no se toca. Simetría con estimacion-fotos.
async function eliminarSoporte(req, res) {
  try {
    await ensureSchema();
    const soporteId = Number(req.params.soporteId);
    if (!Number.isInteger(soporteId) || soporteId <= 0) return res.status(400).json({ error: 'soporte inválido' });
    const s = await getSoporteConContrato(pool, soporteId);
    if (!s) return res.status(404).json({ error: 'Soporte no encontrado' });
    if (!esParteOSupervision(req.user, s)) return res.status(403).json({ error: 'No participas en este contrato' });
    await pool.query('DELETE FROM estimacion_soportes_concepto WHERE id = $1', [soporteId]);
    return res.status(200).json({ ok: true, id: soporteId });
  } catch (err) { console.error('[eliminarSoporte]', err); return res.status(500).json({ error: 'Error interno' }); }
}

module.exports = { listarSoportes, subirSoporte, descargarSoporte, eliminarSoporte, ensureSchema };
