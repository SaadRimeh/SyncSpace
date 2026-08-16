import express from 'express';
import { checkDbHealth } from '../config/db.js';
import { checkRedisHealth } from '../config/redis.js';

const router = express.Router();

/**
 * @route GET /api/health
 * @desc Comprehensive system health check (PostgreSQL pool + Redis)
 */
router.get('/', async (req, res) => {
  const startTime = Date.now();
  
  const [dbHealth, redisHealth] = await Promise.all([
    checkDbHealth(),
    checkRedisHealth(),
  ]);

  const isHealthy = dbHealth.status === 'UP' && redisHealth.status === 'UP';
  const totalLatency = `${Date.now() - startTime}ms`;

  const statusCode = isHealthy ? 200 : 503;

  return res.status(statusCode).json({
    status: isHealthy ? 'OK' : 'SERVICE_UNAVAILABLE',
    service: 'SyncSpace API',
    uptime: `${Math.floor(process.uptime())}s`,
    timestamp: new Date().toISOString(),
    latency: totalLatency,
    dependencies: {
      database: dbHealth,
      redis: redisHealth,
    },
  });
});

export default router;
