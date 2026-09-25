// ==============================================================================
// Ardab Market - Customer Mobile Domain Root Router
// ==============================================================================

import { Router } from 'express';
import customerMobileAuthRoutes from './auth.routes.js';
import customerMobileCatalogRoutes from './catalog.routes.js';

const customerMobileRouter = Router();

// Mount Customer Mobile Authentication routes (/api/customer-mobile/auth/*)
customerMobileRouter.use('/auth', customerMobileAuthRoutes);

// Mount Customer Mobile Catalog routes (/api/customer-mobile/products, /api/customer-mobile/categories, etc.)
customerMobileRouter.use('/', customerMobileCatalogRoutes);
customerMobileRouter.use('/catalog', customerMobileCatalogRoutes);

export default customerMobileRouter;
