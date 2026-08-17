import Redis from 'ioredis';
import { env } from './env.js';

// In-memory fallback store when Redis server is offline/unavailable
const memoryCache = new Map();
let isRedisConnected = false;

export const redis = new Redis({
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  password: env.REDIS_PASSWORD || undefined,
  db: env.REDIS_DB,
  maxRetriesPerRequest: null,
  enableOfflineQueue: false,
  enableReadyCheck: false,
  lazyConnect: true,
  retryStrategy(times) {
    if (times > 3) {
      return null; // Stop retrying if Redis is not running locally
    }
    return Math.min(times * 300, 2000);
  },
});

// Attempt initial connection without crashing app startup
redis.connect().then(() => {
  isRedisConnected = true;
}).catch((err) => {
  if (env.NODE_ENV === 'development') {
    console.warn('ℹ️  [Redis] Offline — Operating with high-speed in-memory cache fallback.');
  }
});

redis.on('connect', () => {
  isRedisConnected = true;
  console.log('[Redis] Connected to Redis server.');
});

redis.on('ready', () => {
  isRedisConnected = true;
  console.log('[Redis] Connection is ready and healthy.');
});

redis.on('error', (err) => {
  isRedisConnected = false;
});

redis.on('close', () => {
  isRedisConnected = false;
});

/**
 * Health check helper for Redis
 */
export const checkRedisHealth = async () => {
  if (isRedisConnected && redis.status === 'ready') {
    try {
      const start = Date.now();
      const pingRes = await redis.ping();
      const latency = Date.now() - start;
      return {
        status: pingRes === 'PONG' ? 'UP' : 'DEGRADED',
        latency: `${latency}ms`,
        engine: 'Redis Cluster/Server',
      };
    } catch (err) {
      // Fall through to memory store check
    }
  }
  return {
    status: 'UP (Memory Fallback)',
    latency: '0ms',
    engine: 'In-Memory Cache (Standalone)',
    keysCount: memoryCache.size,
  };
};

/**
 * Cache helper: Get JSON parsed item
 */
export const getCache = async (key) => {
  if (isRedisConnected && redis.status === 'ready') {
    try {
      const data = await redis.get(key);
      return data ? JSON.parse(data) : null;
    } catch (err) {
      // Fallback to memoryCache on error
    }
  }
  const item = memoryCache.get(key);
  if (!item) return null;
  if (item.expiry && Date.now() > item.expiry) {
    memoryCache.delete(key);
    return null;
  }
  return item.value;
};

/**
 * Cache helper: Set JSON serialized item with TTL in seconds
 */
export const setCache = async (key, value, ttlSeconds = 300) => {
  if (isRedisConnected && redis.status === 'ready') {
    try {
      const serialized = JSON.stringify(value);
      await redis.set(key, serialized, 'EX', ttlSeconds);
      return;
    } catch (err) {
      // Fallback to memoryCache on error
    }
  }
  memoryCache.set(key, {
    value,
    expiry: ttlSeconds ? Date.now() + ttlSeconds * 1000 : null,
  });
};

/**
 * Cache helper: Delete item or pattern
 */
export const delCache = async (key) => {
  if (isRedisConnected && redis.status === 'ready') {
    try {
      await redis.del(key);
    } catch (err) {
      // Fallback
    }
  }
  memoryCache.delete(key);
};

/**
 * Invalidate cache by pattern
 */
export const invalidatePattern = async (pattern) => {
  if (isRedisConnected && redis.status === 'ready') {
    try {
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(...keys);
        console.log(`[Redis] Invalidated ${keys.length} keys matching pattern: ${pattern}`);
      }
    } catch (err) {
      // Fallback
    }
  }
  const regex = new RegExp('^' + pattern.replace('*', '.*') + '$');
  for (const key of memoryCache.keys()) {
    if (regex.test(key)) {
      memoryCache.delete(key);
    }
  }
};

/**
 * Graceful shutdown
 */
export const closeRedis = async () => {
  try {
    if (isRedisConnected && redis.status === 'ready') {
      await redis.quit();
    }
  } catch {
    // Ignore on shutdown
  }
  memoryCache.clear();
};
