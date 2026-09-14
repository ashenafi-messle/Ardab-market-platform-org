// ==============================================================================
// Ardab Market - Centralized Error Handling Middleware
// ==============================================================================
// Captures all operational, validation, authentication, and database errors.
// Prevents leaking internal stack traces, database credentials, or SQL queries in production.

import { ApiError, ApiResponse } from '../utils/apiResponse.js';
import { logger } from '../utils/logger.js';
import { env } from '../config/env.js';

export function errorMiddleware(err, req, res, next) {
  // If response has already started streaming, delegate to Express default handler
  if (res.headersSent) {
    return next(err);
  }

  // 1. Operational ApiError instances
  if (err instanceof ApiError) {
    return ApiResponse.error(res, err.code, err.message, err.statusCode, err.details);
  }

  // 2. Malformed JSON Body Syntax Error
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return ApiResponse.error(res, 'MALFORMED_JSON', 'Invalid JSON payload received in request body.', 400);
  }

  // 3. JWT Authentication Errors
  if (err.name === 'JsonWebTokenError') {
    return ApiResponse.error(res, 'INVALID_TOKEN', 'Authentication token is invalid.', 401);
  }
  if (err.name === 'TokenExpiredError') {
    return ApiResponse.error(res, 'TOKEN_EXPIRED', 'Authentication token has expired. Please log in again.', 401);
  }

  // 4. Prisma Known Database Request Errors
  if (err.code && typeof err.code === 'string' && err.code.startsWith('P')) {
    logger.error(`Prisma Database Error [${err.code}]`, {
      message: err.message,
      requestId: req.id,
      path: req.originalUrl,
    });

    switch (err.code) {
      case 'P2002': {
        const target = err.meta?.target ? ` on field (${err.meta.target})` : '';
        return ApiResponse.error(
          res,
          'DUPLICATE_RESOURCE',
          `A record with this identifier already exists${target}.`,
          409
        );
      }
      case 'P2025':
        return ApiResponse.error(res, 'RECORD_NOT_FOUND', 'The requested record was not found.', 404);
      case 'P2003':
        return ApiResponse.error(
          res,
          'FOREIGN_KEY_VIOLATION',
          'Related resource constraint failed.',
          400
        );
      default:
        return ApiResponse.error(
          res,
          'DATABASE_ERROR',
          'A database error occurred while processing your request.',
          500
        );
    }
  }

  // 5. Unhandled / Unexpected Errors
  logger.error('Unhandled Application Exception', {
    name: err.name,
    message: err.message,
    stack: env.IS_DEVELOPMENT ? err.stack : undefined,
    requestId: req.id,
    method: req.method,
    path: req.originalUrl,
  });

  const message = env.IS_PRODUCTION
    ? 'An unexpected error occurred. Please try again later.'
    : err.message || 'Internal server error';

  const details = env.IS_DEVELOPMENT ? { stack: err.stack } : null;

  return ApiResponse.error(res, 'INTERNAL_SERVER_ERROR', message, 500, details);
}
