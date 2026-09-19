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
import attributeRoutes from './attribute.routes.js';
import sellerCategoryRoutes from './sellerCategory.routes.js';

import customerRoutes from './customer.routes.js';
import orderRoutes from './order.routes.js';
import deliveryRoutes from './delivery.routes.js';
import notificationRoutes from './notification.routes.js';
import supportRoutes from './support.routes.js';
import feedbackRoutes from './feedback.routes.js';
import securityRoutes from './security.routes.js';
import maintenanceRoutes from './maintenance.routes.js';
import citiesRoutes from './cities.routes.js';
import searchRoutes from './search.routes.js';

const adminRouter = Router();

// Health check endpoint for admin services
adminRouter.use('/health', healthRoutes);

// Shared Authentication routes for Super Admin & Sub Admin
adminRouter.use('/auth', authRoutes);

// Security & Super Admin Management
adminRouter.use('/security', securityRoutes);

// System & Operations: Notifications & Operational Alerts
adminRouter.use('/notifications', notificationRoutes);

// Maintenance & System Health Management
adminRouter.use('/maintenance', maintenanceRoutes);

// Operational Cities Management
adminRouter.use('/cities', citiesRoutes);

// Global Federated Search
adminRouter.use('/search', searchRoutes);

// Commercial Marketplace: Customers Management
adminRouter.use('/customers', customerRoutes);

// Commercial Marketplace: Incoming Orders & Operations
adminRouter.use('/orders', orderRoutes);

// Delivery Operations & Fleet Logistics
adminRouter.use('/deliveries', deliveryRoutes);

// Customer Support Operations
adminRouter.use('/support', supportRoutes);

// Feedback & Reputation Management
adminRouter.use('/feedback', feedbackRoutes);

// Commercial Marketplace: Suppliers & Agricultural Producers
adminRouter.use('/suppliers', supplierRoutes);

// Commercial Marketplace: Settlement Payment Methods
adminRouter.use('/payment-methods', paymentMethodRoutes);

// Commercial Marketplace: Products & Catalog
adminRouter.use('/products', productRoutes);

// Commercial Marketplace: Marketplace Categories
adminRouter.use('/categories', categoryRoutes);

// Commercial Marketplace: Category Attributes Library
adminRouter.use('/attributes', attributeRoutes);

// Commercial Marketplace: Seller Marketplace Categories
adminRouter.use('/sellers', sellerCategoryRoutes);
adminRouter.use('/suppliers', sellerCategoryRoutes);

export default adminRouter;
