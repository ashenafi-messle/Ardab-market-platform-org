// ==============================================================================
// Ardab Market - Admin Root Router
// ==============================================================================
// Combines all Super Admin & Sub Admin routes.

import { Router } from 'express';
import healthRoutes from './health.routes.js';
import authRoutes from './auth.routes.js';
import supplierRoutes from './supplier.routes.js';
import paymentMethodRoutes from './paymentMethod.routes.js';
import productRoutes from './product.routes.js';
import categoryRoutes from './category.routes.js';
import sellerCategoryRoutes from './sellerCategory.routes.js';

import customerRoutes from './customer.routes.js';
import orderRoutes from './order.routes.js';
import deliveryRoutes from './delivery.routes.js';
import notificationRoutes from './notification.routes.js';

const adminRouter = Router();

// Health check endpoint for admin services
adminRouter.use('/health', healthRoutes);

// Shared Authentication routes for Super Admin & Sub Admin
adminRouter.use('/auth', authRoutes);

// System & Operations: Notifications & Operational Alerts
adminRouter.use('/notifications', notificationRoutes);

// Commercial Marketplace: Customers Management
adminRouter.use('/customers', customerRoutes);

// Commercial Marketplace: Incoming Orders & Operations
adminRouter.use('/orders', orderRoutes);

// Delivery Operations & Fleet Logistics
adminRouter.use('/deliveries', deliveryRoutes);

// Commercial Marketplace: Suppliers & Agricultural Producers
adminRouter.use('/suppliers', supplierRoutes);

// Commercial Marketplace: Settlement Payment Methods
adminRouter.use('/payment-methods', paymentMethodRoutes);

// Commercial Marketplace: Products & Catalog
adminRouter.use('/products', productRoutes);

// Commercial Marketplace: Marketplace Categories
adminRouter.use('/categories', categoryRoutes);

// Commercial Marketplace: Seller Marketplace Categories
adminRouter.use('/sellers', sellerCategoryRoutes);
adminRouter.use('/suppliers', sellerCategoryRoutes);

export default adminRouter;
