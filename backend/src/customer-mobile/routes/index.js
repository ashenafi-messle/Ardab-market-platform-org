// ==============================================================================
// Ardab Market - Customer Mobile Domain Root Router
// ==============================================================================

import { Router } from 'express';
import customerMobileAuthRoutes from './auth.routes.js';
import customerMobileCatalogRoutes from './catalog.routes.js';
import customerOrderRoutes from '../../customer/routes/order.routes.js';
import customerNotificationRoutes from '../../customer/routes/notification.routes.js';

const customerMobileRouter = Router();

// Mount Customer Mobile Authentication routes (/api/customer-mobile/auth/*)
customerMobileRouter.use('/auth', customerMobileAuthRoutes);

// Mount Customer Mobile Catalog routes (/api/customer-mobile/products, /api/customer-mobile/categories, etc.)
customerMobileRouter.use('/', customerMobileCatalogRoutes);
customerMobileRouter.use('/catalog', customerMobileCatalogRoutes);

// Mount Customer Orders routes (/api/customer-mobile/orders/*)
customerMobileRouter.use('/orders', customerOrderRoutes);

// Mount Customer Notifications routes (/api/customer-mobile/notifications/*)
customerMobileRouter.use('/notifications', customerNotificationRoutes);

export default customerMobileRouter;
