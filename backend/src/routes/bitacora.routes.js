const express = require('express');
const { authMiddleware, requireRole } = require('../middlewares/auth.middleware');
const {
  abrirBitacora,
  firmarApertura,
  pendientesPorFirmar,
  bitacoraDeContrato,
  listarNotaTipos,
  emitirNota,
  listarNotas,
  anularNota,
  vincularNota
} = require('../controllers/bitacora.controller');

const router = express.Router();

router.use(authMiddleware);

// Apertura formal: solo el residente ASIGNADO al contrato (lo valida el controller).
router.post('/apertura', requireRole('residente'), abrirBitacora);

// Bandeja "por firmar" del usuario y firmar la propia parte (cualquier rol autenticado).
router.get('/pendientes', pendientesPorFirmar);
router.post('/:aperturaId/firmar', firmarApertura);

// HU-09: catálogo de tipos de nota (art. 125) para filtrar por rol en el UI.
router.get('/nota-tipos', listarNotaTipos);

// Lectura de la bitácora de un contrato: acotada por participación en el controller.
router.get('/contrato/:contratoId', bitacoraDeContrato);

// HU-09: notas tipificadas. Emitir/listar bajo una apertura; anular/vincular por id de nota.
// El emisor sale del JWT; el rol→tipo (art. 125) y el acceso por participación se validan
// en el controller (cualquier autenticado entra; el controller filtra quién puede qué).
router.post('/:aperturaId/notas', emitirNota);
router.get('/:aperturaId/notas', listarNotas);
router.post('/notas/:notaId/anular', anularNota);
router.post('/notas/:notaId/vincular', vincularNota);

module.exports = router;
