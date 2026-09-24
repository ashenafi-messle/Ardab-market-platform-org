// ==============================================================================
// Ardab Market - Customer Mobile Domain Root Router
// ==============================================================================

import { Router } from 'express';
import customerMobileAuthRoutes from './auth.routes.js';

const customerMobileRouter = Router();

// Mount Customer Mobile Authentication routes (/api/customer-mobile/auth/*)
customerMobileRouter.use('/auth', customerMobileAuthRoutes);

export default customerMobileRouter;
