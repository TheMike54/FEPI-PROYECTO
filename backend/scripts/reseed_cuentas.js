#!/usr/bin/env node
// ITEM 3.5 (Oleada 3) — Wrapper de scripts/reseed_cuentas.sql. Siembra el modelo 1 EMPRESA : N CUENTAS para
// probar el acotamiento por empresa (segunda dependencia + varias personas por empresa). IDEMPOTENTE, NO
// destructivo (solo INSERT/UPDATE sobre empresas/usuarios; ON CONFLICT/WHERE NOT EXISTS). Usa pool.js (local
// DB_* o, si está definida, Render DATABASE_URL). Orden de uso: `npm run reseed:cuentas` y luego
// `npm run seed:demo` (contratos). Ver docs/reportes/OLEADA3_FIXES_18jun.md.
const fs = require('fs');
const path = require('path');
const { pool } = require('../src/db/pool');

async function main() {
  const sql = fs.readFileSync(path.join(__dirname, 'reseed_cuentas.sql'), 'utf8');
  try {
    await pool.query(sql);
    const r = await pool.query(
      `SELECT e.nombre, e.tipo, count(u.id)::int AS cuentas
         FROM empresas e LEFT JOIN usuarios u ON u.empresa_id = e.id
        GROUP BY e.id, e.nombre, e.tipo ORDER BY e.nombre`
    );
    console.log('✓ reseed_cuentas aplicado (1 empresa : N cuentas). Cuentas por empresa:');
    for (const row of r.rows) console.log(`  · ${row.nombre} [${row.tipo}] → ${row.cuentas} cuenta(s)`);
    console.log('Siguiente: npm run seed:demo (contratos). Password de todas: Sigecop2026!');
  } catch (e) {
    console.error('✗ Error aplicando reseed_cuentas.sql:', e.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main();
