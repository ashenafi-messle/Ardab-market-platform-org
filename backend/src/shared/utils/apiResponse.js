// ==============================================================================
// Ardab Market - Standard API Response & Error Classes
// ==============================================================================

/**
 * Standard Operational API Error
 */
export class ApiError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', details = null) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message = 'Invalid request', code = 'BAD_REQUEST', details = null) {
    return new ApiError(message, 400, code, details);
  }

  static unauthorized(message = 'Authentication required', code = 'UNAUTHORIZED') {
    return new ApiError(message, 401, code);
  }

  static forbidden(message = 'Access forbidden: Insufficient permissions', code = 'FORBIDDEN') {
    return new ApiError(message, 403, code);
  }

  static notFound(message = 'Resource not found', code = 'NOT_FOUND') {
    return new ApiError(message, 404, code);
  }

  static conflict(message = 'Resource conflict', code = 'CONFLICT') {
    return new ApiError(message, 409, code);
  }

  static tooManyRequests(message = 'Too many requests', code = 'TOO_MANY_REQUESTS') {
    return new ApiError(message, 429, code);
  }

  static internal(message = 'Internal server error', code = 'INTERNAL_SERVER_ERROR') {
    return new ApiError(message, 500, code);
  }

  static serviceUnavailable(message = 'Service temporarily unavailable', code = 'SERVICE_UNAVAILABLE') {
    return new ApiError(message, 503, code);
  }
}

/**
 * Standard API Response Builder
 */
export class ApiResponse {
  static success(res, data = null, message = null, statusCode = 200, meta = null) {
    const payload = {
      success: true,
      data,
    };
    if (message) {
      payload.message = message;
    }
    if (meta && typeof meta === 'object') {
      Object.assign(payload, meta);
    }
    return res.status(statusCode).json(payload);
  }

  static paginated(res, data = [], pagination = {}, message = null, statusCode = 200, meta = null) {
    let resolvedStatusCode = statusCode;
    let resolvedMeta = meta;

    // Defensively handle when caller passes a meta object as the 5th parameter instead of an integer status code
    if (typeof statusCode === 'object' && statusCode !== null) {
      resolvedMeta = statusCode;
      resolvedStatusCode = 200;
    }

    const payload = {
      success: true,
      data,
      pagination,
    };
    if (message) {
      payload.message = message;
    }
    if (resolvedMeta && typeof resolvedMeta === 'object') {
      Object.assign(payload, resolvedMeta);
      payload.meta = resolvedMeta;
    }

    const finalStatusCode =
      typeof resolvedStatusCode === 'number' && resolvedStatusCode >= 100 && resolvedStatusCode <= 599
        ? resolvedStatusCode
        : 200;

    return res.status(finalStatusCode).json(payload);
  }

  static error(res, code = 'INTERNAL_ERROR', message = 'An error occurred', statusCode = 500, details = null) {
    const errorPayload = {
      code,
      message,
    };
    if (details) {
      errorPayload.details = details;
    }
    return res.status(statusCode).json({
      success: false,
      code,
      message,
      error: errorPayload,
    });
  }
}
