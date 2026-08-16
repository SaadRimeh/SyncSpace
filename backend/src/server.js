import app from './app.js';
import { env } from './config/env.js';
import { closePool, checkDbHealth } from './config/db.js';
import { closeRedis, checkRedisHealth } from './config/redis.js';

const PORT = env.PORT || 5000;

// Start server
const server = app.listen(PORT, async () => {
  console.log(`\n🚀 [SyncSpace API] Server running on port ${PORT} in ${env.NODE_ENV} mode.`);
  console.log(`📡 Health Check URL: http://localhost:${PORT}/api/health\n`);

  // Initial connectivity tests
  const dbHealth = await checkDbHealth();
  if (dbHealth.status === 'UP') {
    console.log('✅ [PostgreSQL] Database pool connection verified.');
  } else {
    console.warn('⚠️  [PostgreSQL] Initial connection warning:', dbHealth.error);
  }

  const redisHealth = await checkRedisHealth();
  if (redisHealth.status === 'UP') {
    console.log('✅ [Redis] Cache connection verified.');
  } else {
    console.warn('⚠️  [Redis] Initial connection warning:', redisHealth.error);
  }
});

// Graceful Shutdown Handler
const gracefulShutdown = async (signal) => {
  console.log(`\n🛑 [SyncSpace API] Received ${signal}. Starting graceful shutdown...`);
  
  server.close(async () => {
    console.log('🔌 [HTTP] Closed all incoming connections.');
    try {
      await closePool();
      await closeRedis();
      console.log('✨ [SyncSpace API] Graceful shutdown complete.');
      process.exit(0);
    } catch (err) {
      console.error('❌ Error during shutdown:', err);
      process.exit(1);
    }
  });

  // Force close after 10s timeout
  setTimeout(() => {
    console.error('⚠️  Forced shutdown after timeout.');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('💥 Uncaught Exception:', err);
  process.exit(1);
});
