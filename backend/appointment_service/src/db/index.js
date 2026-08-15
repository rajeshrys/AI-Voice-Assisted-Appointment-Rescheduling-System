const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: (process.env.DB_HOST || 'localhost').trim(),
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: (process.env.DB_NAME || process.env.DB_DATABASE || 'postgres').trim(),
  user: (process.env.DB_USER || 'postgres').trim(),
  password: (process.env.DB_PASSWORD || 'postgres').trim(),
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle PG client in Appointment Service:', err);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
};
