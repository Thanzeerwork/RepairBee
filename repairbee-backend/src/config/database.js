const { Pool } = require('pg');
const env = require('./env');
const logger = require('../utils/logger');

const pool = new Pool({
  connectionString: env.DATABASE_URL,
  min: env.DB_POOL_MIN,
  max: env.DB_POOL_MAX,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  // Required for Supabase SSL
  ssl: env.isProd ? { rejectUnauthorized: false } : false,
});

// Log pool events
pool.on('connect', () => {
  logger.debug('New database connection established');
});

pool.on('error', (err) => {
  logger.error('Unexpected database pool error', { error: err.message });
});

/**
 * Execute a query with optional parameters.
 * @param {string} text - SQL query text
 * @param {Array} params - Query parameters
 * @returns {Promise<import('pg').QueryResult>}
 */
async function query(text, params) {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    logger.debug('Executed query', { text: text.substring(0, 80), duration, rows: result.rowCount });
    return result;
  } catch (error) {
    logger.error('Query error', { text: text.substring(0, 80), error: error.message });
    throw error;
  }
}

/**
 * Get a client from the pool for transactions.
 * @returns {Promise<import('pg').PoolClient>}
 */
async function getClient() {
  const client = await pool.query ? pool.connect() : null;
  return await pool.connect();
}

/**
 * Execute multiple queries in a transaction.
 * @param {Function} callback - Receives client, must return a value
 * @returns {Promise<any>}
 */
async function transaction(callback) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Test the database connection.
 */
async function testConnection() {
  try {
    const result = await query('SELECT NOW() as current_time');
    logger.info(`✅ Database connected: ${result.rows[0].current_time}`);
    return true;
  } catch (error) {
    logger.error('❌ Database connection failed', { error: error.message });
    return false;
  }
}

module.exports = {
  pool,
  query,
  getClient,
  transaction,
  testConnection,
};
