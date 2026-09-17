// ==============================================================================
// Ardab Market - Operational Cities Routes
// ==============================================================================

import { Router } from 'express';
import { adminAuthMiddleware } from '../middleware/adminAuth.middleware.js';
import { requirePermission } from '../middleware/adminPermission.middleware.js';
import { ADMIN_PERMISSIONS } from '../constants/adminPermissions.js';
import { asyncHandler } from '../../shared/utils/asyncHandler.js';
import {
  listCitiesHandler,
  getCityByIdHandler,
  getCityHealthOverviewHandler,
  createCityHandler,
  updateCityHandler,
  toggleCityStatusHandler,
} from '../controllers/cities.controller.js';

const router = Router();

// Require admin authentication for all city routes
router.use(adminAuthMiddleware);

// ------------------------------------------------------------------------------
// City Listing (All authenticated admins can list cities)
// ------------------------------------------------------------------------------
router.get('/', asyncHandler(listCitiesHandler));
router.get('/health', asyncHandler(getCityHealthOverviewHandler));
router.get('/:id', asyncHandler(getCityByIdHandler));

// ------------------------------------------------------------------------------
// City Management (Requires maintenance management permission)
// ------------------------------------------------------------------------------
router.post(
  '/',
  requirePermission(ADMIN_PERMISSIONS.MAINTENANCE_MANAGE),
  asyncHandler(createCityHandler)
);

router.patch(
  '/:id',
  requirePermission(ADMIN_PERMISSIONS.MAINTENANCE_MANAGE),
  asyncHandler(updateCityHandler)
);

router.patch(
  '/:id/status',
  requirePermission(ADMIN_PERMISSIONS.MAINTENANCE_MANAGE),
  asyncHandler(toggleCityStatusHandler)
);

export default router;
