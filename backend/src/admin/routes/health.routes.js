// ==============================================================================
// Ardab Market - Admin Health Routes
// ==============================================================================

import { Router } from 'express';
import { getHealth, getLive, getReady } from '../controllers/health.controller.js';
import { asyncHandler } from '../../shared/utils/asyncHandler.js';

const router = Router();

router.get('/', asyncHandler(getHealth));
router.get('/health', asyncHandler(getHealth));
router.get('/live', getLive);
router.get('/ready', asyncHandler(getReady));

export default router;
