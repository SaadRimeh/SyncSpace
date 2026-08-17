import { verifyToken } from '../utils/jwt.js';
import { findById } from '../models/userModel.js';
import { getCache, setCache, delCache } from '../config/redis.js';

const SESSION_TTL_SECONDS = 900; // 15 minutes cache for sub-millisecond auth checks

/**
 * Cache key generator for user session
 */
export const getUserSessionKey = (userId) => `session:user:${userId}`;

/**
 * Invalidate cached user session in Redis
 */
export const invalidateUserSession = async (userId) => {
  if (!userId) return;
  await delCache(getUserSessionKey(userId));
};

/**
 * Proactively cache user session in Redis
 */
export const cacheUserSession = async (user) => {
  if (!user || !user.id) return;
  await setCache(getUserSessionKey(user.id), user, SESSION_TTL_SECONDS);
};

/**
 * Authentication Middleware: Validates JWT and attaches user to request
 */
export const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        status: 401,
        error: 'Unauthorized',
        message: 'Authentication required. No token provided.',
      });
    }

    const token = authHeader.split(' ')[1];
    let decoded;

    try {
      decoded = verifyToken(token);
    } catch (tokenErr) {
      return res.status(401).json({
        status: 401,
        error: 'Unauthorized',
        message: tokenErr.name === 'TokenExpiredError' ? 'Token expired. Please login again.' : 'Invalid authentication token.',
      });
    }

    const userId = decoded.userId || decoded.id;
    if (!userId) {
      return res.status(401).json({
        status: 401,
        error: 'Unauthorized',
        message: 'Malformed token payload.',
      });
    }

    // 1. Check Redis Cache for ultra-low latency (sub-50ms constraint)
    const cachedUser = await getCache(getUserSessionKey(userId));
    if (cachedUser) {
      req.user = cachedUser;
      return next();
    }

    // 2. Cache miss: Fetch from PostgreSQL Pool
    const user = await findById(userId);
    if (!user) {
      return res.status(401).json({
        status: 401,
        error: 'Unauthorized',
        message: 'User account not found or has been deleted.',
      });
    }

    // 3. Cache session for subsequent requests
    await cacheUserSession(user);

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
};
