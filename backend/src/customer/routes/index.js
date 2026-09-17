// ==============================================================================
// Ardab Market - Customer Domain Root Router
// ==============================================================================

import { Router } from 'express';
import customerAuthRoutes from './auth.routes.js';
import customerOrderRoutes from './order.routes.js';

const customerRouter = Router();

// Mount Customer Mobile Authentication routes (/api/customer/auth/*)
customerRouter.use('/auth', customerAuthRoutes);

// Mount Customer Mobile Order & Checkout routes (/api/customer/orders/*)
customerRouter.use('/orders', customerOrderRoutes);

export default customerRouter;
