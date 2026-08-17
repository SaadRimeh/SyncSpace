import { ZodError } from 'zod';

/**
 * Middleware factory for validating incoming requests with Zod schemas
 * @param {import('zod').ZodSchema} schema
 * @param {'body' | 'query' | 'params'} source
 */
export const validate = (schema, source = 'body') => {
  return async (req, res, next) => {
    try {
      const parsed = await schema.parseAsync(req[source]);
      req[source] = parsed;
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const details = err.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        }));

        return res.status(400).json({
          status: 400,
          error: 'Validation Error',
          message: 'Invalid request data provided.',
          details,
        });
      }
      next(err);
    }
  };
};
