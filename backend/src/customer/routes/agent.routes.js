// ==============================================================================
// Ardab Market - Customer Agent Referral & Integration Routes
// ==============================================================================

import { Router } from 'express';
import { customerAuthMiddleware } from '../middleware/customerAuth.middleware.js';
import { validate } from '../../shared/middleware/validate.middleware.js';
import { asyncHandler } from '../../shared/utils/asyncHandler.js';
import { customerIntegrationRequestSchema } from '../../admin/validators/agent.validator.js';
import {
  getCustomerIntegrationStateHandler,
  createCustomerIntegrationRequestHandler,
} from '../../admin/controllers/agentIntegration.controller.js';

const customerAgentRoutes = Router();

// Customer authentication required for all agent integration interactions
customerAgentRoutes.use(customerAuthMiddleware);

/**
 * @route   GET /api/customer/agent (or /api/customer-mobile/agent)
 * @desc    Get authenticated customer's current integration state (APPROVED, PENDING, REJECTED, or NONE)
 */
customerAgentRoutes.get('/', asyncHandler(getCustomerIntegrationStateHandler));
customerAgentRoutes.get('/current', asyncHandler(getCustomerIntegrationStateHandler));

/**
 * @route   POST /api/customer/agent/integration-requests
 * @desc    Submit an integration request using the agent's registered email
 */
customerAgentRoutes.post(
  '/integration-requests',
  validate({ body: customerIntegrationRequestSchema }),
  asyncHandler(createCustomerIntegrationRequestHandler)
);

export default customerAgentRoutes;
