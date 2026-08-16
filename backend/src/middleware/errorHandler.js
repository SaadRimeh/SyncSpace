import { env } from '../config/env.js';

/**
 * 404 Not Found Handler
 */
export const notFoundHandler = (req, res, next) => {
  res.status(404).json({
    status: 404,
    error: 'Not Found',
    message: `Cannot find ${req.method} ${req.originalUrl} on this server.`,
  });
};

/**
 * Centralized Global Error Handler
 */
export const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || 'Internal Server Error';

  console.error(`[Error] ${req.method} ${req.url}:`, {
    status: statusCode,
    message,
    stack: env.NODE_ENV === 'development' ? err.stack : undefined,
  });

  res.status(statusCode).json({
    status: statusCode,
    error: err.name || 'Error',
    message,
    ...(env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};
