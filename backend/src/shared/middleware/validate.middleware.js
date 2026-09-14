// ==============================================================================
// Ardab Market - Request Validation Middleware (Zod)
// ==============================================================================
// Validates body, query parameters, and route parameters against Zod schemas.

import { ApiError } from '../utils/apiResponse.js';

/**
 * Creates an Express middleware to validate request components with Zod schemas.
 *
 * @param {Object} schemas - Schema mapping: { body?: ZodSchema, query?: ZodSchema, params?: ZodSchema }
 */
export function validate(schemas = {}) {
  return async (req, res, next) => {
    try {
      if (schemas.params) {
        req.params = await schemas.params.parseAsync(req.params);
      }
      if (schemas.query) {
        req.query = await schemas.query.parseAsync(req.query);
      }
      if (schemas.body) {
        req.body = await schemas.body.parseAsync(req.body);
      }
      return next();
    } catch (error) {
      if (error.name === 'ZodError') {
        const details = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
          rule: err.code,
        }));
        return next(
          ApiError.badRequest('Invalid request payload or parameters', 'VALIDATION_ERROR', details)
        );
      }
      return next(error);
    }
  };
}
