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
import supplierRoutes from './admin/routes/supplier.routes.js';
import paymentMethodRoutes from './admin/routes/paymentMethod.routes.js';
import productRoutes from './admin/routes/product.routes.js';
import categoryRoutes from './admin/routes/category.routes.js';
import attributeRoutes from './admin/routes/attribute.routes.js';
import sellerCategoryRoutes from './admin/routes/sellerCategory.routes.js';
import customerRoutes from './admin/routes/customer.routes.js';
import orderRoutes from './admin/routes/order.routes.js';
import deliveryRoutes from './admin/routes/delivery.routes.js';
import notificationRoutes from './admin/routes/notification.routes.js';
import supportRoutes from './admin/routes/support.routes.js';
import feedbackRoutes from './admin/routes/feedback.routes.js';
import securityRoutes from './admin/routes/security.routes.js';
import customerRouter from './customer/routes/index.js';
import { getHealth, getLive, getReady } from './admin/controllers/health.controller.js';

export function createApp() {
  const app = express();

  // 0. Trust Proxy (Render, AWS, Nginx reverse proxy support)
  app.set('trust proxy', 1);

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

  // Commercial Marketplace Aliases for Super Admin Frontend
  app.use('/api/products', productRoutes);
  app.use('/api/v1/products', productRoutes);
  app.use('/api/categories', categoryRoutes);
  app.use('/api/v1/categories', categoryRoutes);
  app.use('/api/attributes', attributeRoutes);
  app.use('/api/v1/attributes', attributeRoutes);
  app.use('/api/sellers', sellerCategoryRoutes);
  app.use('/api/v1/sellers', sellerCategoryRoutes);
  app.use('/api/suppliers', sellerCategoryRoutes);
  app.use('/api/v1/suppliers', sellerCategoryRoutes);
  app.use('/api/suppliers', supplierRoutes);
  app.use('/api/v1/suppliers', supplierRoutes);
  app.use('/api/payment-methods', paymentMethodRoutes);
  app.use('/api/v1/payment-methods', paymentMethodRoutes);
  app.use('/api/customers', customerRoutes);
  app.use('/api/v1/customers', customerRoutes);
  app.use('/api/orders', orderRoutes);
  app.use('/api/v1/orders', orderRoutes);
  app.use('/api/deliveries', deliveryRoutes);
  app.use('/api/v1/deliveries', deliveryRoutes);
  app.use('/api/notifications', notificationRoutes);
  app.use('/api/v1/notifications', notificationRoutes);

  // Customer Support Management Aliases
  app.use('/api/subadmin/support', supportRoutes);
  app.use('/api/v1/subadmin/support', supportRoutes);
  app.use('/api/support', supportRoutes);
  app.use('/api/v1/support', supportRoutes);

  // Feedback & Reputation Management Aliases
  app.use('/api/subadmin/feedback', feedbackRoutes);
  app.use('/api/v1/subadmin/feedback', feedbackRoutes);
  app.use('/api/feedback', feedbackRoutes);
  app.use('/api/v1/feedback', feedbackRoutes);

  // Security & Super Admin Control Center Aliases
  app.use('/api/subadmin/security', securityRoutes);
  app.use('/api/v1/subadmin/security', securityRoutes);
  app.use('/api/security', securityRoutes);
  app.use('/api/v1/security', securityRoutes);

  // Customer Mobile App Routes
  app.use('/api/customer', customerRouter);
  app.use('/api/v1/customer', customerRouter);
  // app.use('/api/seller', sellerRouter);
  // app.use('/api/delivery', deliveryRouter);

  // 9. Standardized 404 Not Found Handler
  app.use(notFoundMiddleware);

  // 10. Centralized Error Handler
  app.use(errorMiddleware);

  return app;
}
