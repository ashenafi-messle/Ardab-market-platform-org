// ==============================================================================
// Ardab Market - Request / Correlation ID Middleware
// ==============================================================================

import crypto from 'crypto';

export function requestIdMiddleware(req, res, next) {
  const correlationId = req.headers['x-request-id'] || crypto.randomUUID();
  req.id = correlationId;
  res.setHeader('X-Request-ID', correlationId);
  next();
}
