import Redis from 'ioredis';
import { env } from './env.js';

export const redis = new Redis({
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  password: env.REDIS_PASSWORD || undefined,
  db: env.REDIS_DB,
  maxRetriesPerRequest: null,
  enableReadyCheck: true,
  lazyConnect: true,
  retryStrategy(times) {
    const delay = Math.min(times * 200, 5000);
    if (env.NODE_ENV === 'development' && times <= 3) {
      console.warn(`[Redis] Attempting reconnect in ${delay}ms (Attempt #${times})...`);
    }
    return delay;
  },
});

// Attempt initial connection without blocking app startup
redis.connect().catch((err) => {
  console.warn('⚠️  [Redis] Initial connection failed (will retry in background):', err.message);
});

redis.on('connect', () => {
  console.log('[Redis] Connected to Redis server.');
});

redis.on('ready', () => {
  console.log('[Redis] Connection is ready and healthy.');
});

redis.on('error', (err) => {
  console.error('[Redis Error]:', err.message);
});

redis.on('close', () => {
  console.warn('[Redis] Connection closed.');
});

/**
 * Health check helper for Redis
 */
export const checkRedisHealth = async () => {
  try {
    const start = Date.now();
    const pingRes = await redis.ping();
    const latency = Date.now() - start;
    return {
      status: pingRes === 'PONG' ? 'UP' : 'DEGRADED',
      latency: `${latency}ms`,
    };
  } catch (err) {
    return {
      status: 'DOWN',
      error: err.message,
    };
  }
};

/**
 * Cache helper: Get JSON parsed item
 */
export const getCache = async (key) => {
  try {
    const data = await redis.get(key);
    return data ? JSON.parse(data) : null;
  } catch (err) {
    console.error(`[Redis Get Error] key: ${key}:`, err.message);
    return null;
  }
};

/**
 * Cache helper: Set JSON serialized item with TTL in seconds
 */
export const setCache = async (key, value, ttlSeconds = 300) => {
  try {
    const serialized = JSON.stringify(value);
    await redis.set(key, serialized, 'EX', ttlSeconds);
  } catch (err) {
    console.error(`[Redis Set Error] key: ${key}:`, err.message);
  }
};

/**
 * Cache helper: Delete item or pattern
 */
export const delCache = async (key) => {
  try {
    await redis.del(key);
  } catch (err) {
    console.error(`[Redis Del Error] key: ${key}:`, err.message);
  }
};

/**
 * Invalidate cache by pattern
 */
export const invalidatePattern = async (pattern) => {
  try {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
      console.log(`[Redis] Invalidated ${keys.length} keys matching pattern: ${pattern}`);
    }
  } catch (err) {
    console.error(`[Redis Invalidation Error] pattern: ${pattern}:`, err.message);
  }
};

/**
 * Graceful shutdown
 */
export const closeRedis = async () => {
  console.log('[Redis] Disconnecting client...');
  await redis.quit();
  console.log('[Redis] Client disconnected.');
};
