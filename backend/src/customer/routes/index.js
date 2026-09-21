// ==============================================================================
// Ardab Market - Customer Domain Root Router
// ==============================================================================

import { Router } from 'express';
import customerAuthRoutes from './auth.routes.js';
import customerOrderRoutes from './order.routes.js';
import customerCatalogRoutes from './catalog.routes.js';
import { customerTelemetryMiddleware } from '../../shared/middleware/customerTelemetry.middleware.js';

const customerRouter = Router();

// Apply unified customer web app telemetry recorder
customerRouter.use(customerTelemetryMiddleware);

// Mount Customer Authentication routes (/api/customer/auth/*)
customerRouter.use('/auth', customerAuthRoutes);

// Mount Customer Order & Checkout routes (/api/customer/orders/*)
customerRouter.use('/orders', customerOrderRoutes);

// Mount Customer Catalog, Cities, Reviews, and Public Marketplace routes (/api/customer/catalog/* and /api/customer/*)
customerRouter.use('/catalog', customerCatalogRoutes);
customerRouter.use('/', customerCatalogRoutes);

export default customerRouter;
