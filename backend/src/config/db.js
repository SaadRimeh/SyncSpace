import pg from 'pg';
import { env } from './env.js';

const { Pool } = pg;

export const pool = new Pool({
  host: env.PGHOST,
  port: env.PGPORT,
  database: env.PGDATABASE,
  user: env.PGUSER,
  password: env.PGPASSWORD,
  max: env.PG_MAX_POOL_SIZE,
  idleTimeoutMillis: env.PG_IDLE_TIMEOUT_MS,
  connectionTimeoutMillis: env.PG_CONNECTION_TIMEOUT_MS,
});

// Event listeners for connection lifecycle
pool.on('connect', (client) => {
  if (env.NODE_ENV === 'development') {
    console.log(`[PostgreSQL] New client connected to pool. Total clients: ${pool.totalCount}`);
  }
});

pool.on('error', (err, client) => {
  console.error('[PostgreSQL] Unexpected error on idle client:', err.message);
});

pool.on('remove', () => {
  if (env.NODE_ENV === 'development') {
    console.log(`[PostgreSQL] Client removed from pool. Remaining: ${pool.totalCount}`);
  }
});

/**
 * Execute a query with connection pooling & latency logging
 * @param {string} text - SQL query string
 * @param {Array} params - Parameterized query values
 */
export const query = async (text, params = []) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    if (env.NODE_ENV === 'development') {
      console.log(`[PostgreSQL Query] (${duration}ms):`, { text, rows: res.rowCount });
    }
    return res;
  } catch (error) {
    const duration = Date.now() - start;
    console.error(`[PostgreSQL Error] (${duration}ms) query: "${text}":`, error.message);
    throw error;
  }
};

/**
 * Acquire a dedicated client for multi-statement transactions
 */
export const getClient = async () => {
  const client = await pool.connect();
  return client;
};

/**
 * Health check helper
 */
export const checkDbHealth = async () => {
  try {
    const res = await pool.query('SELECT 1 AS healthy, NOW() AS timestamp;');
    return {
      status: 'UP',
      timestamp: res.rows[0].timestamp,
      totalCount: pool.totalCount,
      idleCount: pool.idleCount,
      waitingCount: pool.waitingCount,
    };
  } catch (err) {
    return {
      status: 'DOWN',
      error: err.message,
    };
  }
};

/**
 * Graceful shutdown
 */
export const closePool = async () => {
  console.log('[PostgreSQL] Closing connection pool...');
  await pool.end();
  console.log('[PostgreSQL] Connection pool closed.');
};
