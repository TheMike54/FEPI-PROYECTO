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
