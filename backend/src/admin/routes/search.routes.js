// ==============================================================================
// Ardab Market - Global Search Routes
// ==============================================================================

import { Router } from 'express';
import { adminAuthMiddleware } from '../middleware/adminAuth.middleware.js';
import { asyncHandler } from '../../shared/utils/asyncHandler.js';
import { globalSearchHandler } from '../controllers/search.controller.js';

const router = Router();

// Require admin authentication — any authenticated admin can search
router.use(adminAuthMiddleware);

/**
 * GET /api/admin/search?q=<query>&types=orders,customers&limit=5
 */
router.get('/', asyncHandler(globalSearchHandler));

export default router;
