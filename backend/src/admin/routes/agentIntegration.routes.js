// ==============================================================================
// Ardab Market - Super Admin Agent Integration Review Routes
// ==============================================================================

import { Router } from 'express';
import { adminAuthMiddleware } from '../middleware/adminAuth.middleware.js';
import { requireRole } from '../middleware/adminPermission.middleware.js';
import { validate } from '../../shared/middleware/validate.middleware.js';
import { asyncHandler } from '../../shared/utils/asyncHandler.js';
import { reviewRequestSchema } from '../validators/agent.validator.js';
import {
  listIntegrationRequestsHandler,
  approveIntegrationRequestHandler,
  rejectIntegrationRequestHandler,
} from '../controllers/agentIntegration.controller.js';

const agentIntegrationRoutes = Router();

agentIntegrationRoutes.use(adminAuthMiddleware);
agentIntegrationRoutes.use(requireRole('SUPER_ADMIN'));

/**
 * @route   GET /api/admin/agent-integration-requests
 * @desc    List reviewable integration requests with filtering and search
 */
agentIntegrationRoutes.get('/', asyncHandler(listIntegrationRequestsHandler));

/**
 * @route   POST /api/admin/agent-integration-requests/:id/approve
 * @desc    Approve a pending customer agent integration request
 */
agentIntegrationRoutes.post('/:id/approve', asyncHandler(approveIntegrationRequestHandler));

/**
 * @route   POST /api/admin/agent-integration-requests/:id/reject
 * @desc    Reject a pending customer agent integration request
 */
agentIntegrationRoutes.post(
  '/:id/reject',
  validate({ body: reviewRequestSchema }),
  asyncHandler(rejectIntegrationRequestHandler)
);

export default agentIntegrationRoutes;
