require('dotenv').config();

const express = require('express');
const cors = require('cors');

const authRoutes = require('./src/routes/auth.routes');
const usuariosRoutes = require('./src/routes/usuarios.routes');
const contratosRoutes = require('./src/routes/contratos.routes');
const bitacoraRoutes = require('./src/routes/bitacora.routes');
const pagosRoutes = require('./src/routes/pagos.routes');
const estimacionesRoutes = require('./src/routes/estimaciones.routes');
const rosterRoutes = require('./src/routes/roster.routes');  // Pasada F: sustitución de personas (art. 125 fr. I g)
const conveniosRoutes = require('./src/routes/convenios.routes');  // Pasada HU-03: convenios modificatorios (art. 59 LOPSRM)
const alertasRoutes = require('./src/routes/alertas.routes');
const estimacionPrepRoutes = require('./src/routes/estimacion-prep.routes');  // Etapa A: solo-lectura para la pantalla única de estimación
const estimacionesCicloRoutes = require('./src/routes/estimaciones-ciclo.routes');  // HU-14 (Equipo 3): historial del ciclo de cobro
const trabajosRoutes = require('./src/routes/trabajos.routes');  // HU-06 (Equipo 2): registro de trabajos terminados (avance por concepto, art. 118)
const tableroRoutes = require('./src/routes/tablero.routes');  // HU-17 (Equipo 3): tablero agregado de estimaciones (solo lectura, acotado por participación)
const portafolioRoutes = require('./src/routes/portafolio.routes');  // HU-18 (Equipo 3): portafolio ejecutivo con semáforos (solo lectura, acotado por participación)
const finiquitoRoutes = require('./src/routes/finiquito.routes');  // HU-24 (FASE 4): finiquito y cierre del contrato (art. 64 LOPSRM / 168-172 RLOPSRM)
const garantiasRoutes = require('./src/routes/garantias.routes');  // HU-02 (sesión E2): fianzas y garantías (art. 48 LOPSRM / 91 RLOPSRM)
const minutasRoutes = require('./src/routes/minutas.routes');  // HU-11 (sesión E2): minutas, visitas y acuerdos (art. 123 fr. X RLOPSRM)
const instruccionPagoRoutes = require('./src/routes/instruccion-pago.routes');  // HU-20 (Equipo 3): tránsito a pago (suficiencia art. 24 + instrucción de pago)
const empresasRoutes = require('./src/routes/empresas.routes');  // PLAN GRANDE BLOQUE 1: administración del padrón de empresas (solo dependencia)
const yoRoutes = require('./src/routes/yo.routes');  // OLEADA 2 (FIX 2.4): perfil propio para el dropdown "mi info / mi empresa"
const observacionesRoutes = require('./src/routes/observaciones.routes');  // OLEADA 2 (FIX 2.2): observaciones por contrato para el reporte #4 de HU-19
const notasPendientesRoutes = require('./src/routes/notas-pendientes.routes');  // OLEADA 2 (FIX 2.5): notas por firmar para la campana unificada
const estimacionFotosRoutes = require('./src/routes/estimacion-fotos.routes');  // EVIDENCIA FOTOGRÁFICA (art. 132 fr. IV RLOPSRM) — montaje aditivo, diff para Maiki
const avanceFotosRoutes = require('./src/routes/avance-fotos.routes');  // FIX 22-jun: evidencia fotográfica del AVANCE (HU-06) — montaje aditivo
const estimacionNotasRoutes = require('./src/routes/estimacion-notas.routes');  // P1-2 (26-jun): vínculo nota↔generador — montaje aditivo
const estimacionSoportesRoutes = require('./src/routes/estimacion-soportes.routes');  // Oleada 1 bug #4: SOPORTES documentales por concepto (PDF/XLS/CSV/imagen) — montaje aditivo, diff para Maiki
const { initDb } = require('./src/db/init');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:5173' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'sigecop-backend',
    timestamp: new Date().toISOString()
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/contratos', contratosRoutes);
app.use('/api/bitacora', bitacoraRoutes);
app.use('/api/pagos', pagosRoutes);
app.use('/api/estimaciones', estimacionesRoutes);
app.use('/api/roster', rosterRoutes);
app.use('/api/convenios', conveniosRoutes);
app.use('/api/alertas', alertasRoutes);
app.use('/api/estimacion-prep', estimacionPrepRoutes);
app.use('/api/estimaciones-ciclo', estimacionesCicloRoutes);
// HU-06 montado DESPUÉS de app.use(cors()) (línea 22): los headers de CORS deben aplicar a /api/trabajos
// (lección de HU-07). Lectura por participación + escritura solo contratista (gate en trabajos.routes).
app.use('/api/trabajos', trabajosRoutes);
// HU-17 montado DESPUÉS de app.use(cors()) (línea 23): los headers de CORS deben aplicar a
// /api/tablero. Solo lectura; el acotamiento por participación lo hace el controller.
app.use('/api/tablero', tableroRoutes);
// HU-18 (Equipo 3): portafolio ejecutivo. Solo lectura; acotado por participación en el controller.
app.use('/api/portafolio', portafolioRoutes);
// HU-24 (FASE 4): finiquito y cierre del contrato. Acotado por participación / autoridad en el controller.
app.use('/api/finiquito', finiquitoRoutes);
// HU-02 (sesión E2): fianzas y garantías. Acotado por participación / autoridad en el controller.
app.use('/api/garantias', garantiasRoutes);
// HU-11 (sesión E2): minutas, visitas y acuerdos. Acotado por participación / autoridad en el controller.
app.use('/api/minutas', minutasRoutes);
// HU-20 (Equipo 3): tránsito a pago. Lectura + escritura acotada por participación; techo presupuestal = rol finanzas.
app.use('/api/instruccion-pago', instruccionPagoRoutes);
// PLAN GRANDE BLOQUE 1: administración del padrón de empresas. Solo la dependencia (requireRole en el router).
app.use('/api/empresas', empresasRoutes);
app.use('/api/yo', yoRoutes);  // OLEADA 2 (FIX 2.4 — montaje aditivo, diff para Maiki)
app.use('/api/observaciones', observacionesRoutes);  // OLEADA 2 (FIX 2.2 — montaje aditivo, diff para Maiki)
app.use('/api/notas-pendientes', notasPendientesRoutes);  // OLEADA 2 (FIX 2.5 — montaje aditivo, diff para Maiki)
// EVIDENCIA FOTOGRÁFICA de la estimación (art. 132 fr. IV RLOPSRM). Controller/route NUEVOS (no congelados);
// fotos en BYTEA. Montaje ADITIVO — diff para Maiki (igual que los 3 de arriba). Requiere la migración
// backend/scripts/migracion_estimacion_fotos.sql (4 columnas en estimacion_fotos).
app.use('/api/estimacion-fotos', estimacionFotosRoutes);
app.use('/api/avance-fotos', avanceFotosRoutes);  // FIX 22-jun: evidencia fotográfica del avance (HU-06)
app.use('/api/estimacion-notas', estimacionNotasRoutes);  // P1-2 (26-jun): vínculo nota↔generador de la estimación
// Oleada 1 bug #4: SOPORTES documentales por concepto de la estimación (PDF/XLS/CSV/TXT/imagen, BYTEA).
// Controller/route NUEVOS (no congelados). La tabla estimacion_soportes_concepto se asegura vía ensureSchema()
// (aditiva idempotente); registro en backend/scripts/migracion_estimacion_soportes.sql para plegar al schema.
app.use('/api/estimacion-soportes', estimacionSoportesRoutes);

app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

app.use((err, req, res, next) => {
  console.error('[ERROR]', err);
  res.status(err.status || 500).json({
    error: err.message || 'Error interno del servidor'
  });
});

async function start() {
  if (process.env.RUN_MIGRATIONS === 'true') {
    try {
      await initDb();
    } catch (err) {
      console.error('[DB] Error aplicando schema:', err);
      process.exit(1);
    }
  }

  app.listen(PORT, () => {
    console.log(`[SIGECOP] Backend escuchando en http://localhost:${PORT}`);
    console.log(`[SIGECOP] Health: http://localhost:${PORT}/api/health`);
  });
}

start();
