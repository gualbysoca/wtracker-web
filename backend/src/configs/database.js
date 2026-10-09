// src/configs/database.js
// Wrapper de conexión a PostgreSQL usando pg (node-postgres)
// Centraliza la pool de conexiones para toda la aplicación

const { Pool } = require('pg');

const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME     || 'wtracker_db',
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD || '',
  max:      20,             // Máximo de conexiones en el pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('error', (err) => {
  console.error('[DB] Unexpected error on idle client:', err);
  process.exit(-1);
});

/**
 * Ejecuta una query con parámetros. Wrapper sobre pool.query para
 * centralizar manejo de errores y logging.
 */
const query = async (text, params) => {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    if (process.env.NODE_ENV === 'development') {
      console.log('[DB] Query executed', { text: text.substring(0, 60), duration, rows: result.rowCount });
    }
    return result;
  } catch (error) {
    console.error('[DB] Query error:', { text, error: error.message });
    throw error;
  }
};

/**
 * Obtiene un cliente del pool para transacciones manuales.
 * El llamador es responsable de liberar el cliente con client.release()
 */
const getClient = () => pool.connect();

module.exports = { query, getClient, pool };
