// ==============================================================================
// Ardab Market - Express Application Setup
// ==============================================================================

import express from 'express';
import helmet from 'helmet';
import cors from 'cors';

// Configurations
import { corsOptions, helmetOptions, REQUEST_BODY_LIMIT } from './shared/config/security.js';

// Middlewares
import { requestIdMiddleware } from './shared/middleware/requestId.middleware.js';
import { generalRateLimiter } from './shared/middleware/rateLimit.middleware.js';
import { notFoundMiddleware } from './shared/middleware/notFound.middleware.js';
import { errorMiddleware } from './shared/middleware/error.middleware.js';

// Utilities
import { logger } from './shared/utils/logger.js';
import { asyncHandler } from './shared/utils/asyncHandler.js';

// Routers & Controllers
import adminRouter from './admin/routes/index.js';
import authRoutes from './admin/routes/auth.routes.js';
import { getHealth, getLive, getReady } from './admin/controllers/health.controller.js';

export function createApp() {
  const app = express();

  // 1. Security Headers
  app.use(helmet(helmetOptions));

  // 2. Cross-Origin Resource Sharing
  app.use(cors(corsOptions));

  // 3. Request Body Parsing with Strict Size Limit
  app.use(express.json({ limit: REQUEST_BODY_LIMIT }));
  app.use(express.urlencoded({ extended: true, limit: REQUEST_BODY_LIMIT }));

  // 4. Request / Correlation ID
  app.use(requestIdMiddleware);

  // 5. Structured Request Logging
  app.use((req, res, next) => {
    const startTime = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      logger.info(`${req.method} ${req.originalUrl} [${res.statusCode}] - ${duration}ms`, {
        requestId: req.id,
        method: req.method,
        path: req.originalUrl,
        statusCode: res.statusCode,
        durationMs: duration,
        ip: req.headers['x-forwarded-for'] || req.socket?.remoteAddress,
      });
    });
    next();
  });

  // 6. Global General Rate Limiting
  app.use(generalRateLimiter);

  // 7. Core Health Endpoints (Accessible at /api/health, /health, /api/health/live, /api/health/ready)
  app.get('/health', asyncHandler(getHealth));
  app.get('/health/live', getLive);
  app.get('/health/ready', asyncHandler(getReady));
  app.get('/api/health', asyncHandler(getHealth));
  app.get('/api/health/live', getLive);
  app.get('/api/health/ready', asyncHandler(getReady));
  app.get('/api/v1/health', asyncHandler(getHealth));
  app.get('/api/v1/health/live', getLive);
  app.get('/api/v1/health/ready', asyncHandler(getReady));

  // 8. Role-Segregated Routers
  // Admin Backend Domain (Super Admin & Sub Admin)
  app.use('/api/admin', adminRouter);
  app.use('/api/v1/admin', adminRouter);

  // Frontend Backward Compatibility Aliases for Shared Admin Authentication
  // Maps /api/auth/* directly to admin auth routes
  app.use('/api/auth', authRoutes);
  app.use('/api/v1/auth', authRoutes);

  // Future Role Routers (prepared for customer, seller, delivery)
  // app.use('/api/customer', customerRouter);
  // app.use('/api/seller', sellerRouter);
  // app.use('/api/delivery', deliveryRouter);

  // 9. Standardized 404 Not Found Handler
  app.use(notFoundMiddleware);

  // 10. Centralized Error Handler
  app.use(errorMiddleware);

  return app;
}
