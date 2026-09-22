// ==============================================================================
// Ardab Market - Customer Domain Root Router
// ==============================================================================

import { Router } from 'express';
import customerAuthRoutes from './auth.routes.js';
import customerOrderRoutes from './order.routes.js';
import customerWishlistRoutes from './wishlist.routes.js';
import customerCatalogRoutes from './catalog.routes.js';
import { customerTelemetryMiddleware } from '../../shared/middleware/customerTelemetry.middleware.js';

import customerSupportRoutes from './support.routes.js';
import customerReviewRoutes, { productReviewSubRouter, productLevelReviewRouter } from './review.routes.js';

const customerRouter = Router();

// Apply unified customer web app telemetry recorder
customerRouter.use(customerTelemetryMiddleware);

// Mount Customer Authentication routes (/api/customer/auth/*)
customerRouter.use('/auth', customerAuthRoutes);

// Mount Customer Support routes (/api/customer/support/*)
customerRouter.use('/support', customerSupportRoutes);

// Mount Customer Order routes (/api/customer/orders/*)
// Includes: checkout, list, detail, cancel
customerRouter.use('/orders', customerOrderRoutes);

// Mount Customer Wishlist routes (/api/customer/wishlist/*)
// All routes require authentication
customerRouter.use('/wishlist', customerWishlistRoutes);

// Mount Customer Personal Reviews routes (/api/customer/reviews/*)
customerRouter.use('/reviews', customerReviewRoutes);

// Mount Product Reviews and Eligibility routes (/api/customer/products/:productId/...)
customerRouter.use('/products/:productId', productLevelReviewRouter);
customerRouter.use('/catalog/products/:productId', productLevelReviewRouter);
customerRouter.use('/products/:productId/reviews', productReviewSubRouter);
customerRouter.use('/catalog/products/:productId/reviews', productReviewSubRouter);

// Mount Customer Catalog, Cities, Reviews, and Public Marketplace routes
customerRouter.use('/catalog', customerCatalogRoutes);
customerRouter.use('/', customerCatalogRoutes);

export default customerRouter;
