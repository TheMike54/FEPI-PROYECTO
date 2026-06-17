// HU-11 (sesión E2 18-jun) — rutas de MINUTAS, VISITAS Y ACUERDOS (art. 123 fr. X RLOPSRM). Archivo NUEVO.
// Se monta en server.js como /api/minutas. Participación/autoridad en el controller.
const express = require('express');
const multer = require('multer');
const { authMiddleware } = require('../middlewares/auth.middleware');
const {
  listarMinutas, crearMinuta, vincularNotaMinuta, subirPdfMinuta, descargarPdfMinuta,
  listarVisitas, crearVisita, vincularNotaVisita,
} = require('../controllers/minutas.controller');

const router = express.Router();
router.use(authMiddleware);

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

// Minutas
router.get('/contrato/:id', listarMinutas);
router.post('/contrato/:id', crearMinuta);
router.patch('/:minutaId/nota', vincularNotaMinuta);   // vincular minuta ↔ nota de bitácora
router.post('/:minutaId/pdf', subirPdf, subirPdfMinuta);
router.get('/:minutaId/pdf', descargarPdfMinuta);
// Visitas
router.get('/contrato/:id/visitas', listarVisitas);
router.post('/contrato/:id/visitas', crearVisita);
router.patch('/visita/:visitaId/nota', vincularNotaVisita);

module.exports = router;
