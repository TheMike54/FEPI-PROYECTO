const fs = require('fs');
const path = require('path');
const { pool } = require('./pool');

async function initDb() {
  const schemaPath = path.join(__dirname, 'schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf8');
  // 5.3 (endurecer migraciones): aplica el schema dentro de UNA transacción (BEGIN/COMMIT).
  // Antes corría en autocommit (pool.query múltiple): si una sentencia intermedia fallaba,
  // las anteriores ya quedaban aplicadas → BD a medio migrar. Con la transacción, cualquier
  // fallo hace ROLLBACK total y el arranque/deploy aborta limpio (equivale a
  // `psql --single-transaction -v ON_ERROR_STOP=1`). Todo el DDL del schema es transaccional
  // (no hay CREATE INDEX CONCURRENTLY). El schema es idempotente: re-ejecutarlo no cambia nada.
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');
    console.log('[DB] Schema aplicado (idempotente, transaccional).');
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (_) { /* el client pudo morir */ }
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { initDb };
