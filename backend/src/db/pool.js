const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  user: process.env.DB_USER || 'sigecop',
  password: process.env.DB_PASSWORD || 'sigecop_dev_2026',
  database: process.env.DB_NAME || 'sigecop_db',
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000
});

pool.on('error', (err) => {
  console.error('[DB] Error inesperado en cliente del pool:', err);
});

module.exports = {
  pool,
  query: (text, params) => pool.query(text, params)
};
