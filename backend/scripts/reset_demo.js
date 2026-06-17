#!/usr/bin/env node
// Wrapper de scripts/reset_demo.sql — ⚠️ DESTRUCTIVO de los DATOS DEMO (no del esquema ni de datos
// ajenos). Borra los contratos OBRA-2026-% (paquete del seed) y deja la base lista para recargar con
// `npm run seed:demo`. Usa pool.js (local DB_* o, si está definida, Render DATABASE_URL). El
// multi-statement corre en una transacción implícita: si algo falla, revierte todo. Idempotente.
// Detalle/seguridad y el bloque OPCIONAL del guion: ver scripts/reset_demo.sql y
// docs/GUION_PRUEBA_FUNCIONES_NUEVAS.md.
const fs = require('fs');
const path = require('path');
const { pool } = require('../src/db/pool');

async function main() {
  const sql = fs.readFileSync(path.join(__dirname, 'reset_demo.sql'), 'utf8');
  try {
    await pool.query(sql);
    console.log('✓ reset_demo aplicado: datos demo (OBRA-2026-%) borrados. Recarga con: npm run seed:demo');
  } catch (e) {
    console.error('✗ Error aplicando reset_demo.sql:', e.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main();
