// ==============================================================================
// Ardab Market - 404 Not Found Middleware
// ==============================================================================

import { ApiResponse } from '../utils/apiResponse.js';

export function notFoundMiddleware(req, res) {
  return ApiResponse.error(
    res,
    'RESOURCE_NOT_FOUND',
    `Route ${req.method} ${req.originalUrl} not found on this server.`,
    404
  );
}
