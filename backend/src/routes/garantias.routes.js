// HU-02 (sesión E2 18-jun) — rutas de FIANZAS Y GARANTÍAS (art. 48 LOPSRM / 91 RLOPSRM). Archivo NUEVO.
// Se monta en server.js como /api/garantias. Participación/autoridad en el controller.
const express = require('express');
const multer = require('multer');
const { authMiddleware } = require('../middlewares/auth.middleware');
const {
  listarGarantias, crearGarantia, editarGarantia, registrarEndoso, subirPdfGarantia, descargarPdfGarantia,
} = require('../controllers/garantias.controller');

const router = express.Router();
router.use(authMiddleware);

// PDF de la póliza en BYTEA (disco de Render efímero). 10 MB, solo PDF; el controller revalida %PDF.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => (file.mimetype === 'application/pdf' ? cb(null, true) : cb(new Error('Solo se permiten archivos PDF'))),
});
function subirPdf(req, res, next) {
  upload.single('documento')(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ error: 'El PDF supera el límite de 10 MB' });
      return res.status(400).json({ error: err.message || 'No se pudo procesar el archivo' });
    }
    next();
  });
}

router.get('/contrato/:id', listarGarantias);          // garantías del contrato (+ endosos + flag PDF)
router.post('/contrato/:id', crearGarantia);           // crear garantía
router.put('/:garantiaId', editarGarantia);            // editar garantía
router.post('/:garantiaId/endoso', registrarEndoso);   // endoso (ajuste, art. 91 RLOPSRM, append-only)
router.post('/:garantiaId/pdf', subirPdf, subirPdfGarantia);  // subir PDF de la póliza
router.get('/:garantiaId/pdf', descargarPdfGarantia);  // descargar/visualizar el PDF

module.exports = router;
