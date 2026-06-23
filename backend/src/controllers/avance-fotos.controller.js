// EVIDENCIA FOTOGRÁFICA del AVANCE (HU-06, art. 132 fr. IV / 122 RLOPSRM). Archivo NUEVO (NO congelado).
// Se monta como /api/avance-fotos. FIX 22-jun (profe): el profe pidió pedir y GUARDAR la foto AL REGISTRAR
// el avance. Mismo patrón ya probado en estimacion-fotos: binario INLINE como BYTEA (disco de Render
// efímero, la BD persiste), solo JPEG/PNG, acceso por participación, `subido_por` del JWT (nunca del body).
// La foto cuelga del registro de avance (concepto_avance); no toca la curva ni la carátula.
const { pool } = require('../db/pool');
const { esParteOSupervision } = require('../lib/acceso');

// Avance + columnas de acceso del contrato (vía concepto_avance → contrato_concepto → contrato).
async function getAvanceConContrato(db, avanceId) {
  const r = await db.query(
    `SELECT ca.id AS avance_id, c.id AS contrato_id, c.created_by, c.residente_id,
            c.superintendente_id, c.supervision_id
       FROM concepto_avance ca
       JOIN contrato_conceptos cc ON cc.id = ca.contrato_concepto_id
       JOIN contratos c ON c.id = cc.contrato_id
      WHERE ca.id = $1`,
    [avanceId]
  );
  return r.rowCount ? r.rows[0] : null;
}

async function getFotoConContrato(db, fotoId) {
  const r = await db.query(
    `SELECT f.id, f.avance_id, f.nombre, f.mime, f.tamano, f.contenido, f.subido_por,
            c.created_by, c.residente_id, c.superintendente_id, c.supervision_id
       FROM avance_fotos f
       JOIN concepto_avance ca ON ca.id = f.avance_id
       JOIN contrato_conceptos cc ON cc.id = ca.contrato_concepto_id
       JOIN contratos c ON c.id = cc.contrato_id
      WHERE f.id = $1`,
    [fotoId]
  );
  return r.rowCount ? r.rows[0] : null;
}

function esImagenValida(buffer) {
  if (!buffer || buffer.length < 4) return false;
  const jpeg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;            // JPEG
  const png  = buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47; // PNG
  return jpeg || png;
}

// GET /api/avance-fotos/avance/:avanceId — metadatos de las fotos del registro de avance.
async function listarFotos(req, res) {
  try {
    const avanceId = Number(req.params.avanceId);
    if (!Number.isInteger(avanceId) || avanceId <= 0) return res.status(400).json({ error: 'avance inválido' });
    const av = await getAvanceConContrato(pool, avanceId);
    if (!av) return res.status(404).json({ error: 'Avance no encontrado' });
    if (!esParteOSupervision(req.user, av)) return res.status(403).json({ error: 'No tienes acceso a este contrato' });
    const r = await pool.query(
      `SELECT id, nombre, descripcion, mime, tamano, subido_por, created_at, (contenido IS NOT NULL) AS tiene_foto
         FROM avance_fotos WHERE avance_id = $1 ORDER BY id`,
      [avanceId]
    );
    return res.status(200).json(r.rows);
  } catch (err) { console.error('[avance listarFotos]', err); return res.status(500).json({ error: 'Error interno' }); }
}

// POST /api/avance-fotos/avance/:avanceId — subir una foto (multipart, campo 'documento'). subido_por = JWT.
async function subirFoto(req, res) {
  try {
    const avanceId = Number(req.params.avanceId);
    if (!Number.isInteger(avanceId) || avanceId <= 0) return res.status(400).json({ error: 'avance inválido' });
    if (!req.file || !req.file.buffer) return res.status(400).json({ error: 'Falta la imagen (campo "documento")' });
    const { buffer, originalname, mimetype, size } = req.file;
    if (!esImagenValida(buffer)) return res.status(400).json({ error: 'El archivo no es una imagen JPEG/PNG válida' });
    const av = await getAvanceConContrato(pool, avanceId);
    if (!av) return res.status(404).json({ error: 'Avance no encontrado' });
    if (!esParteOSupervision(req.user, av)) return res.status(403).json({ error: 'No participas en este contrato' });
    const descripcion = (req.body && typeof req.body.descripcion === 'string') ? req.body.descripcion.slice(0, 300) : null;
    const r = await pool.query(
      `INSERT INTO avance_fotos (avance_id, nombre, descripcion, mime, tamano, contenido, subido_por)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id, nombre, descripcion, mime, tamano, subido_por, created_at`,
      [avanceId, originalname || 'foto.jpg', descripcion, mimetype, size, buffer, req.user.id]
    );
    return res.status(201).json({ ...r.rows[0], tiene_foto: true });
  } catch (err) { console.error('[avance subirFoto]', err); return res.status(500).json({ error: 'Error interno' }); }
}

// GET /api/avance-fotos/archivo/:fotoId — sirve el binario (inline) por participación.
async function descargarFoto(req, res) {
  try {
    const fotoId = Number(req.params.fotoId);
    if (!Number.isInteger(fotoId) || fotoId <= 0) return res.status(400).json({ error: 'foto inválida' });
    const f = await getFotoConContrato(pool, fotoId);
    if (!f) return res.status(404).json({ error: 'Foto no encontrada' });
    if (!esParteOSupervision(req.user, f)) return res.status(403).json({ error: 'No tienes acceso a esta foto' });
    if (!f.contenido) return res.status(404).json({ error: 'La foto no tiene contenido' });
    res.setHeader('Content-Type', f.mime || 'image/jpeg');
    res.setHeader('Content-Length', f.tamano);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(f.nombre || 'foto.jpg')}"`);
    return res.status(200).send(f.contenido);
  } catch (err) { console.error('[avance descargarFoto]', err); return res.status(500).json({ error: 'Error interno' }); }
}

// DELETE /api/avance-fotos/:fotoId — elimina una foto (por participación).
async function eliminarFoto(req, res) {
  try {
    const fotoId = Number(req.params.fotoId);
    if (!Number.isInteger(fotoId) || fotoId <= 0) return res.status(400).json({ error: 'foto inválida' });
    const f = await getFotoConContrato(pool, fotoId);
    if (!f) return res.status(404).json({ error: 'Foto no encontrada' });
    if (!esParteOSupervision(req.user, f)) return res.status(403).json({ error: 'No participas en este contrato' });
    await pool.query('DELETE FROM avance_fotos WHERE id = $1', [fotoId]);
    return res.status(200).json({ ok: true, id: fotoId });
  } catch (err) { console.error('[avance eliminarFoto]', err); return res.status(500).json({ error: 'Error interno' }); }
}

module.exports = { listarFotos, subirFoto, descargarFoto, eliminarFoto };
