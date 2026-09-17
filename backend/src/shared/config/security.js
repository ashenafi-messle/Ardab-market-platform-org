// ==============================================================================
// Ardab Market - Security Configurations
// ==============================================================================
// Centralized security configurations for Helmet, CORS, and Rate Limiting.

import { env } from './env.js';
import { ApiError } from '../utils/apiResponse.js';

/**
 * Helmet Security Headers Configuration
 */
export const helmetOptions = {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'", 'https:', 'data:'],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
};

/**
 * CORS Configuration
 * Never allows "*" in production for authenticated APIs.
 */
export const corsOptions = {
  origin: (origin, callback) => {
    // Allow non-browser clients (Postman, health checks, curl) with no origin header
    if (!origin) {
      return callback(null, true);
    }

    if (env.CORS_ORIGINS.includes(origin)) {
      return callback(null, true);
    }

    // In development mode, allow localhost variations
    if (env.IS_DEVELOPMENT && /^http:\/\/localhost:\d+$/.test(origin)) {
      return callback(null, true);
    }

    return callback(
      ApiError.forbidden(`Origin '${origin}' not allowed by CORS policy`, 'CORS_ERROR'),
      false
    );
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Request-ID',
    'X-Idempotency-Key',
    'x-idempotency-key',
    'Accept',
    'X-Requested-With',
  ],
  exposedHeaders: ['X-Request-ID', 'X-Idempotency-Key', 'Content-Range', 'X-Total-Count'],
  maxAge: 86400, // 24 hours
};

/**
 * Request Size Limit
 */
export const REQUEST_BODY_LIMIT = '1mb';
