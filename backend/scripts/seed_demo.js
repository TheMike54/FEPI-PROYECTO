#!/usr/bin/env node
// Wrapper de scripts/seed_demo.sql — lo ejecuta contra la BD usando pool.js (local DB_* o, si está
// definida, Render DATABASE_URL). Pensado para `npm run seed:demo`. Idempotente (el SQL borra y
// recrea los contratos demo). El multi-statement corre en una transacción implícita: si algo falla,
// revierte todo. Ver docs/SEED_DEMO_SIGECOP.md.
const fs = require('fs');
const path = require('path');
const { pool } = require('../src/db/pool');

async function main() {
  const sqlPath = path.join(__dirname, 'seed_demo.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');
  try {
    await pool.query(sql);
    console.log('✓ seed_demo aplicado: OBRA-2026-DEMO-01 (completo) + OBRA-2026-ATRASO-01..04 (atraso).');
  } catch (e) {
    console.error('✗ Error aplicando seed_demo.sql:', e.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main();
