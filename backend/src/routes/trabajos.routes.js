const express = require('express');
const multer = require('multer');
const { authMiddleware, requireRole } = require('../middlewares/auth.middleware');
const {
  trabajosDeContrato,
  registrarAvance,
  corregirAvance
} = require('../controllers/trabajos.controller');

const router = express.Router();

router.use(authMiddleware);

// H2-B2-1 (25-jun) — la(s) foto(s) de evidencia se suben EN LA MISMA petición que crea el avance (multipart).
// memoria (disco de Render efímero), solo JPEG/PNG, tope 5 MB por foto; el controller exige ≥1.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) =>
    (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png') ? cb(null, true) : cb(new Error('Solo se permiten imágenes JPEG o PNG')),
});
function subirFotosAvance(req, res, next) {
  upload.array('fotos', 10)(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ error: 'Una imagen supera el límite de 5 MB' });
      return res.status(400).json({ error: err.message || 'No se pudieron procesar las imágenes' });
    }
    next();
  });
}

// HU-06: lectura por participación (acotada en el controller con esParteOSupervision).
// Roles con acceso (permisos.js HU-06): contratista (E) + residente y supervisión (C).
// dependencia/finanzas (null) quedan fuera ya en el gate de rol.
router.get('/contrato/:contratoId', requireRole('contratista', 'residente', 'supervision'), trabajosDeContrato);

// Escritura: solo contratista (permisos.js HU-06: contratista = 'E'). El acotamiento por
// participación lo refuerza el controller (esParteOSupervision sobre el contrato del concepto).
router.post('/', requireRole('contratista'), subirFotosAvance, registrarAvance);
// FIX 3.3 — append-only: la corrección es un registro NUEVO vinculado (no PATCH/DELETE). art. 123 fr. VI RLOPSRM.
router.post('/:id/corregir', requireRole('contratista'), corregirAvance);

module.exports = router;
