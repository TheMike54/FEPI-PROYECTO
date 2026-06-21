// EVIDENCIA FOTOGRÁFICA de la estimación (art. 132 fr. IV RLOPSRM). Archivo NUEVO (NO congelado).
// Se monta en server.js como /api/estimacion-fotos. multer en memoria (NO disco: Render es efímero), solo
// imágenes JPEG/PNG, tope 5 MB (el cliente además redimensiona con <canvas> antes de subir). Participación
// y autoría se validan en el controller.
const express = require('express');
const multer = require('multer');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { listarFotos, subirFoto, descargarFoto, eliminarFoto } = require('../controllers/estimacion-fotos.controller');

const router = express.Router();
router.use(authMiddleware);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) =>
    (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png')
      ? cb(null, true)
      : cb(new Error('Solo se permiten imágenes JPEG o PNG')),
});
function subirImagen(req, res, next) {
  upload.single('documento')(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ error: 'La imagen supera el límite de 5 MB' });
      return res.status(400).json({ error: err.message || 'No se pudo procesar la imagen' });
    }
    next();
  });
}

router.get('/estimacion/:estimacionId', listarFotos);
router.post('/estimacion/:estimacionId', subirImagen, subirFoto);
router.get('/archivo/:fotoId', descargarFoto);
router.delete('/:fotoId', eliminarFoto);

module.exports = router;
