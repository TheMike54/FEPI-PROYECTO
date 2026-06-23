// EVIDENCIA FOTOGRÁFICA de la estimación (art. 132 fr. IV RLOPSRM: "...fotografías..."). Archivo NUEVO (NO
// congelado). Se monta como /api/estimacion-fotos. Las fotos se guardan INLINE como BYTEA en PostgreSQL —el
// mismo patrón ya probado para los PDFs (minutas/garantías)— porque el disco de Render es efímero y la BD sí
// persiste. La carátula/cuadre NO se tocan: la foto es un adjunto colgado de la estimación. Acceso por
// participación (lib/acceso); `subido_por` sale del JWT, nunca del body.
const { pool } = require('../db/pool');
const { esParteOSupervision } = require('../lib/acceso');

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

// Foto + acceso del contrato (para descargar/eliminar por participación).
async function getFotoConContrato(db, fotoId) {
  const r = await db.query(
    `SELECT f.id, f.estimacion_id, f.nombre, f.mime, f.tamano, f.contenido, f.subido_por,
            c.created_by, c.residente_id, c.superintendente_id, c.supervision_id
       FROM estimacion_fotos f
       JOIN estimaciones e ON e.id = f.estimacion_id
       JOIN contratos c ON c.id = e.contrato_id
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

// GET /api/estimacion-fotos/estimacion/:estimacionId — METADATOS (no el binario) de las fotos de la estimación.
async function listarFotos(req, res) {
  try {
    const estId = Number(req.params.estimacionId);
    if (!Number.isInteger(estId) || estId <= 0) return res.status(400).json({ error: 'estimación inválida' });
    const est = await getEstimacionConContrato(pool, estId);
    if (!est) return res.status(404).json({ error: 'Estimación no encontrada' });
    if (!esParteOSupervision(req.user, est)) return res.status(403).json({ error: 'No tienes acceso a esta estimación' });
    const r = await pool.query(
      `SELECT id, contrato_concepto_id, nombre, descripcion, mime, tamano, subido_por, created_at,
              (contenido IS NOT NULL) AS tiene_foto
         FROM estimacion_fotos WHERE estimacion_id = $1 ORDER BY id`,
      [estId]
    );
    return res.status(200).json(r.rows);
  } catch (err) { console.error('[listarFotos]', err); return res.status(500).json({ error: 'Error interno' }); }
}

// POST /api/estimacion-fotos/estimacion/:estimacionId — subir una foto (multipart, campo 'documento'). La foto
// es evidencia del avance; la carátula no cambia. subido_por = JWT.
async function subirFoto(req, res) {
  try {
    const estId = Number(req.params.estimacionId);
    if (!Number.isInteger(estId) || estId <= 0) return res.status(400).json({ error: 'estimación inválida' });
    if (!req.file || !req.file.buffer) return res.status(400).json({ error: 'Falta la imagen (campo "documento")' });
    const { buffer, originalname, mimetype, size } = req.file;
    if (!esImagenValida(buffer)) return res.status(400).json({ error: 'El archivo no es una imagen JPEG/PNG válida' });
    const est = await getEstimacionConContrato(pool, estId);
    if (!est) return res.status(404).json({ error: 'Estimación no encontrada' });
    if (!esParteOSupervision(req.user, est)) return res.status(403).json({ error: 'No participas en este contrato' });
    const descripcion = (req.body && typeof req.body.descripcion === 'string') ? req.body.descripcion.slice(0, 300) : null;
    // FIX 22-jun (profe): foto POR GENERADOR/concepto (formato GACM: una foto de actividad por concepto).
    // contrato_concepto_id es OPCIONAL; si se envía, se valida que sea un concepto del contrato de la estimación.
    let conceptoId = Number(req.body?.contrato_concepto_id) || null;
    if (conceptoId) {
      const ok = await pool.query('SELECT 1 FROM contrato_conceptos WHERE id=$1 AND contrato_id=$2', [conceptoId, est.contrato_id]);
      if (ok.rowCount === 0) conceptoId = null; // no pertenece al contrato → se guarda como foto general
    }
    const r = await pool.query(
      `INSERT INTO estimacion_fotos (estimacion_id, contrato_concepto_id, nombre, descripcion, mime, tamano, contenido, subido_por)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id, contrato_concepto_id, nombre, descripcion, mime, tamano, subido_por, created_at`,
      [estId, conceptoId, originalname || 'foto.jpg', descripcion, mimetype, size, buffer, req.user.id]
    );
    return res.status(201).json({ ...r.rows[0], tiene_foto: true });
  } catch (err) { console.error('[subirFoto]', err); return res.status(500).json({ error: 'Error interno' }); }
}

// GET /api/estimacion-fotos/archivo/:fotoId — sirve el binario (inline) por participación.
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
  } catch (err) { console.error('[descargarFoto]', err); return res.status(500).json({ error: 'Error interno' }); }
}

// DELETE /api/estimacion-fotos/:fotoId — elimina una foto (por participación). La estimación no se modifica
// (la foto es un adjunto; el trigger de inmutabilidad de `estimaciones` no se dispara).
async function eliminarFoto(req, res) {
  try {
    const fotoId = Number(req.params.fotoId);
    if (!Number.isInteger(fotoId) || fotoId <= 0) return res.status(400).json({ error: 'foto inválida' });
    const f = await getFotoConContrato(pool, fotoId);
    if (!f) return res.status(404).json({ error: 'Foto no encontrada' });
    if (!esParteOSupervision(req.user, f)) return res.status(403).json({ error: 'No participas en este contrato' });
    await pool.query('DELETE FROM estimacion_fotos WHERE id = $1', [fotoId]);
    return res.status(200).json({ ok: true, id: fotoId });
  } catch (err) { console.error('[eliminarFoto]', err); return res.status(500).json({ error: 'Error interno' }); }
}

module.exports = { listarFotos, subirFoto, descargarFoto, eliminarFoto };
