// ==============================================================================
// Ardab Market - Super Admin Agent Management Routes
// ==============================================================================

import { Router } from 'express';
import { adminAuthMiddleware } from '../middleware/adminAuth.middleware.js';
import { requireRole } from '../middleware/adminPermission.middleware.js';
import { validate } from '../../shared/middleware/validate.middleware.js';
import { asyncHandler } from '../../shared/utils/asyncHandler.js';
import { handleNationalIdUpload } from '../../shared/services/agentDocument.service.js';
import {
  createAgentSchema,
  updateAgentSchema,
} from '../validators/agent.validator.js';
import {
  createAgentHandler,
  updateAgentHandler,
  listAgentsHandler,
  getAgentByIdHandler,
  getAgentCustomersHandler,
  getAgentOrdersHandler,
  getAgentCommissionsHandler,
  getAgentDashboardStatsHandler,
  getAgentNationalIdHandler,
} from '../controllers/agent.controller.js';

const agentRoutes = Router();

// Strict Super Admin RBAC for all agent management endpoints
agentRoutes.use(adminAuthMiddleware);
agentRoutes.use(requireRole('SUPER_ADMIN'));

/**
 * @route   GET /api/admin/agents/stats
 * @desc    Get agent system summary statistics
 */
agentRoutes.get('/stats', asyncHandler(getAgentDashboardStatsHandler));

/**
 * @route   GET /api/admin/agents
 * @desc    List registered agents with pagination, search, and metrics
 */
agentRoutes.get('/', asyncHandler(listAgentsHandler));

/**
 * @route   POST /api/admin/agents
 * @desc    Register a new agent with verified profile and national ID document
 */
agentRoutes.post(
  '/',
  handleNationalIdUpload,
  validate({ body: createAgentSchema }),
  asyncHandler(createAgentHandler)
);

/**
 * @route   GET /api/admin/agents/:id
 * @desc    Get detailed agent profile
 */
agentRoutes.get('/:id', asyncHandler(getAgentByIdHandler));

/**
 * @route   PATCH /api/admin/agents/:id
 * @desc    Update agent profile, status, commission policy, or national ID
 */
agentRoutes.patch(
  '/:id',
  handleNationalIdUpload,
  validate({ body: updateAgentSchema }),
  asyncHandler(updateAgentHandler)
);

/**
 * @route   GET /api/admin/agents/:id/national-id
 * @desc    Secure, authenticated access to agent national ID document
 */
agentRoutes.get('/:id/national-id', asyncHandler(getAgentNationalIdHandler));

/**
 * @route   GET /api/admin/agents/:id/customers
 * @desc    Get customers integrated with this agent
 */
agentRoutes.get('/:id/customers', asyncHandler(getAgentCustomersHandler));

/**
 * @route   GET /api/admin/agents/:id/orders
 * @desc    Get orders attributed to this agent
 */
agentRoutes.get('/:id/orders', asyncHandler(getAgentOrdersHandler));

/**
 * @route   GET /api/admin/agents/:id/commissions
 * @desc    Get commission ledger entries for this agent
 */
agentRoutes.get('/:id/commissions', asyncHandler(getAgentCommissionsHandler));

export default agentRoutes;
