import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { redis } from '../config/redis.js';
import { env } from '../config/env.js';

/**
 * Returns a RedisStore instance if Redis is connected, otherwise returns undefined
 * so express-rate-limit uses its built-in in-memory store.
 */
const getStore = (prefix) => {
  if (redis.status === 'ready') {
    try {
      return new RedisStore({
        sendCommand: (...args) => redis.call(...args),
        prefix,
      });
    } catch {
      return undefined;
    }
  }
  return undefined;
};

// Distributed rate limiter using Redis (or in-memory store in standalone)
export const apiLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS, // 15 minutes by default
  max: env.RATE_LIMIT_MAX_REQUESTS, // Limit each IP to max requests per window
  standardHeaders: true, // Return standard rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  store: getStore('rl:global:'),
  message: {
    status: 429,
    error: 'Too Many Requests',
    message: 'Too many requests created from this IP, please try again after 15 minutes.',
  },
});

// Stricter rate limiter for authentication routes (prevent brute-force)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 attempts per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  store: getStore('rl:auth:'),
  message: {
    status: 429,
    error: 'Too Many Requests',
    message: 'Too many authentication attempts, please try again later.',
  },
});
