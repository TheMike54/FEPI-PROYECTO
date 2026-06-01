const express = require('express');
const multer = require('multer');
const { authMiddleware, requireRole } = require('../middlewares/auth.middleware');
const {
  crearContrato,
  listarContratos,
  detalleContrato,
  subirDocumento,
  documentoMeta,
  descargarDocumento,
  ROLES_DOC_LECTURA
} = require('../controllers/contratos.controller');

const router = express.Router();

// Subida del PDF firmado EN MEMORIA (se guarda como BYTEA en la BD, no en disco,
// porque el disco de Render es efimero). Limite 10 MB y solo PDF por mimetype; el
// controller revalida los magic bytes %PDF.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') return cb(null, true);
    return cb(new Error('Solo se permiten archivos PDF'));
  }
});

// Envuelve multer para devolver 400 JSON (en vez de propagar el error crudo).
function subirPdf(req, res, next) {
  upload.single('documento')(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'El PDF excede el límite de 10 MB' });
      }
      return res.status(400).json({ error: err.message || 'No se pudo procesar el archivo' });
    }
    return next();
  });
}

router.use(authMiddleware);

router.post('/', requireRole('residente'), crearContrato);
router.get('/', listarContratos);
router.get('/:id', detalleContrato);

// PDF firmado: se liga DESPUES de crear el contrato. Subida solo residente;
// lectura para los roles con acceso a HU-01.
router.post('/:id/documento', requireRole('residente'), subirPdf, subirDocumento);
router.get('/:id/documento/meta', requireRole(...ROLES_DOC_LECTURA), documentoMeta);
router.get('/:id/documento', requireRole(...ROLES_DOC_LECTURA), descargarDocumento);

module.exports = router;
