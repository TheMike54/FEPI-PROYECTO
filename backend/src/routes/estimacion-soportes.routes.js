// SOPORTES DOCUMENTALES de la estimación (bug #4). Archivo NUEVO (NO congelado). Se monta en server.js como
// /api/estimacion-soportes. multer en memoria (Render efímero), tope 10 MB. El fileFilter deja pasar un set
// amplio; el tipo REAL se valida por magic bytes en el controller (detectarTipo).
const express = require('express');
const multer = require('multer');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { listarSoportes, subirSoporte, descargarSoporte, eliminarSoporte } = require('../controllers/estimacion-soportes.controller');

const router = express.Router();
router.use(authMiddleware);

const MIMES_OK = new Set([
  'application/pdf',
  'image/jpeg', 'image/png',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // xlsx
  'application/vnd.ms-excel',                                          // xls / csv (algunos navegadores)
  'text/csv', 'text/plain',
  'application/octet-stream',                                          // fallback de algunos navegadores; se revalida por magic bytes
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) =>
    MIMES_OK.has(file.mimetype)
      ? cb(null, true)
      : cb(new Error('Tipo de archivo no permitido. Se aceptan PDF, XLS/XLSX, CSV/TXT o imágenes JPEG/PNG.')),
});
function subirArchivo(req, res, next) {
  upload.single('documento')(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ error: 'El archivo supera el límite de 10 MB' });
      return res.status(400).json({ error: err.message || 'No se pudo procesar el archivo' });
    }
    next();
  });
}

router.get('/estimacion/:estimacionId', listarSoportes);
router.post('/estimacion/:estimacionId', subirArchivo, subirSoporte);
router.get('/archivo/:soporteId', descargarSoporte);
router.delete('/:soporteId', eliminarSoporte);

module.exports = router;
