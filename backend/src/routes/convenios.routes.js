// PASADA HU-03 (Fundación) — rutas de convenios modificatorios (art. 59 LOPSRM). Archivo NUEVO.
// Se monta en server.js como /api/convenios. La UI la construye E3 encima de este contrato.
const express = require('express');
const multer = require('multer');
const { authMiddleware } = require('../middlewares/auth.middleware');
const {
  listarConvenios, detalleVersion, crearConvenio,
  subirOficioConvenio, descargarOficioConvenio
} = require('../controllers/convenios.controller');

const router = express.Router();
router.use(authMiddleware);  // toda la sección exige sesión; el acotamiento por participación y la autoridad van en el controller

// FASE 0C (profe 16-jun) — OFICIO DE APROBACIÓN del convenio en BYTEA (disco de Render efímero, como
// contrato_documentos). Límite 10 MB y solo PDF por mimetype; el controller revalida los magic bytes %PDF.
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
      if (err.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ error: 'El PDF supera el límite de 10 MB' });
      return res.status(400).json({ error: err.message || 'No se pudo procesar el archivo' });
    }
    next();
  });
}

router.get('/contrato/:id', listarConvenios);     // convenios + versiones del programa del contrato
router.post('/contrato/:id', crearConvenio);      // crear convenio (transaccional: re-cuadre + versionado)
router.get('/version/:versionId', detalleVersion); // snapshot (catálogo + celdas) de una versión del programa

// Oficio de aprobación del convenio (FASE 0C): subir (PDF, append-only) y visualizar.
router.post('/:convenioId/oficio', subirPdf, subirOficioConvenio);
router.get('/:convenioId/oficio', descargarOficioConvenio);

module.exports = router;
