// ==============================================================================
// Ardab Market - Customer Mobile Domain Root Router
// ==============================================================================

import { Router } from 'express';
import customerMobileAuthRoutes from './auth.routes.js';
import customerMobileCatalogRoutes from './catalog.routes.js';
import customerOrderRoutes from '../../customer/routes/order.routes.js';
import customerNotificationRoutes from '../../customer/routes/notification.routes.js';
import customerWishlistRoutes from '../../customer/routes/wishlist.routes.js';
import customerAddressRoutes from '../../customer/routes/address.routes.js';
import customerProfileRoutes from '../../customer/routes/profile.routes.js';
import customerSecurityRoutes from '../../customer/routes/security.routes.js';
import customerSupportRoutes from '../../customer/routes/support.routes.js';

const customerMobileRouter = Router();

// Mount Customer Mobile Authentication routes (/api/customer-mobile/auth/*)
customerMobileRouter.use('/auth', customerMobileAuthRoutes);

// Mount Profile routes (/api/customer-mobile/profile/*)
customerMobileRouter.use('/profile', customerProfileRoutes);

// Mount Security routes (/api/customer-mobile/security/*)
customerMobileRouter.use('/security', customerSecurityRoutes);

// Mount Address routes (/api/customer-mobile/addresses/*)
customerMobileRouter.use('/addresses', customerAddressRoutes);

// Mount Wishlist routes (/api/customer-mobile/wishlist/*)
customerMobileRouter.use('/wishlist', customerWishlistRoutes);

// Mount Support routes (/api/customer-mobile/support/*)
customerMobileRouter.use('/support', customerSupportRoutes);

// Mount Customer Mobile Catalog routes (/api/customer-mobile/products, /api/customer-mobile/categories, etc.)
customerMobileRouter.use('/', customerMobileCatalogRoutes);
customerMobileRouter.use('/catalog', customerMobileCatalogRoutes);

// Mount Customer Orders routes (/api/customer-mobile/orders/*)
customerMobileRouter.use('/orders', customerOrderRoutes);

// Mount Customer Notifications routes (/api/customer-mobile/notifications/*)
customerMobileRouter.use('/notifications', customerNotificationRoutes);

export default customerMobileRouter;
