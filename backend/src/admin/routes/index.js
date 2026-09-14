// ==============================================================================
// Ardab Market - Admin Root Router
// ==============================================================================
// Combines all Super Admin & Sub Admin routes.

import { Router } from 'express';
import healthRoutes from './health.routes.js';
import authRoutes from './auth.routes.js';

const adminRouter = Router();

// Health check endpoint for admin services
adminRouter.use('/health', healthRoutes);

// Shared Authentication routes for Super Admin & Sub Admin
adminRouter.use('/auth', authRoutes);

export default adminRouter;
