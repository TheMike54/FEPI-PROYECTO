const express = require('express');
const multer = require('multer');
const { authMiddleware, requireRole } = require('../middlewares/auth.middleware');
const {
  estadoTransito, cargarSoporte, generarInstruccion, consultarPresupuesto, crearPresupuesto, colaCobro, porCobrar,
  subirArchivoCobro, listarArchivosCobro, descargarArchivoCobro,
} = require('../controllers/instruccion-pago.controller');

const router = express.Router();

// FOLLOW-ON b (22-jun): carga binaria del CFDI / oficio en la promoción de cobro. multer en MEMORIA (Render
// efímero → BYTEA en BD), solo PDF, tope 10 MB. El magic-bytes %PDF se revalida en el controller.
const uploadPdf = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => (file.mimetype === 'application/pdf' ? cb(null, true) : cb(new Error('Solo se permiten archivos PDF'))),
});
function subirPdfCobro(req, res, next) {
  uploadPdf.single('documento')(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ error: 'El PDF supera el límite de 10 MB' });
      return res.status(400).json({ error: err.message || 'No se pudo procesar el archivo' });
    }
    next();
  });
}

// HU-20 (Equipo 3): tránsito a pago. SOLO el control de PARTICIPACIÓN va en el controller
// (lib/acceso.js), igual que tablero/portafolio; la matriz por rol (PERMISOS) la aplica el
// frontend (contratista 'E', finanzas 'E', residente/dependencia 'C'). El POST de presupuesto
// sí exige rol global finanzas (carga del techo anual).
router.use(authMiddleware);

// FIX 22-jun (profe): COLA GLOBAL de solicitudes de cobro para finanzas (todas las instrucciones 'emitida').
router.get('/cola', colaCobro);
// G5 (23-jun): estimaciones autorizadas SIN instrucción aún (notificación "ve a presentar documentos a cobro").
router.get('/por-cobrar', porCobrar);

// Presupuesto (techo art. 24). Carga = finanzas; consulta = cualquier sesión (acota la UI).
router.get('/presupuesto', consultarPresupuesto);
router.post('/presupuesto', requireRole('finanzas'), crearPresupuesto);

// Tránsito por estimación.
router.get('/estimacion/:id', estadoTransito);
router.post('/estimacion/:id/soportes', cargarSoporte);
// FOLLOW-ON b (22-jun): carga binaria de soportes de cobro (CFDI / oficio) por el contratista; descarga por Finanzas.
router.get('/estimacion/:id/archivos', listarArchivosCobro);
router.post('/estimacion/:id/archivo', subirPdfCobro, subirArchivoCobro);
router.get('/archivo/:archivoId', descargarArchivoCobro);
router.post('/estimacion/:id', generarInstruccion);

module.exports = router;

// ============================================================================
// PARA MAIKI — montaje permanente en server.js (ZONA CONGELADA; lo integra Maiki).
// El smoke local montó esta ruta TEMPORALMENTE y se revirtió con `git checkout
// backend/server.js`; server.js NO va en este PR. Snippet a aplicar:
//
//   // (junto a los demás require de routers)
//   const instruccionPagoRoutes = require('./src/routes/instruccion-pago.routes');  // HU-20 (Equipo 3)
//
//   // (junto a los demás app.use, DESPUÉS de app.use(cors())) — solo lectura + escritura acotada
//   app.use('/api/instruccion-pago', instruccionPagoRoutes);
//
// ----------------------------------------------------------------------------
// PARA MAIKI — CA-2 (ancla canónica del plazo de pago, art. 54/55 LOPSRM):
// Hoy el plazo se ancla en la NOTA de bitácora de autorización (derivado de
// estimacion_notas.fecha, sin columna nueva — criterio del equipo, default conservador; el plazo
// es del art. 54 LOPSRM); solo
// existe si el contrato tenía bitácora abierta al autorizar. El ancla canónica sería un sello en
// la estimación. Cambios (esquema + autorizar de HU-15, ambos congelados → Maiki):
//   ALTER TABLE estimaciones ADD COLUMN IF NOT EXISTS autorizada_en  TIMESTAMPTZ;
//   ALTER TABLE estimaciones ADD COLUMN IF NOT EXISTS autorizada_por INTEGER REFERENCES usuarios(id);
//   -- y en autorizarEstimacion (estimaciones-ciclo.controller.js), en el mismo UPDATE:
//   --   SET estado='autorizada', autorizada_en = NOW(), autorizada_por = $usuario
// Con el sello, estadoTransito puede preferir estimaciones.autorizada_en sobre la nota.
// ============================================================================
