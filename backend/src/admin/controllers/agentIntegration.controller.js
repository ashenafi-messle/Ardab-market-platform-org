// ==============================================================================
// Ardab Market - Agent Integration Request Controller
// ==============================================================================

import { ApiResponse, ApiError } from '../../shared/utils/apiResponse.js';
import {
  createIntegrationRequest,
  getCustomerIntegrationState,
  listIntegrationRequests,
  approveIntegrationRequest,
  rejectIntegrationRequest,
} from '../services/agentIntegration.service.js';

/**
 * POST /api/customer/agent/integration-requests
 * Customer submits a connection request with an agent by registered email
 */
export async function createCustomerIntegrationRequestHandler(req, res) {
  const customerId = req.customer?.id;
  if (!customerId) {
    throw ApiError.unauthorized('Customer authentication required.');
  }

  const result = await createIntegrationRequest(customerId, req.body.agentEmail);
  const statusCode = result.isNew ? 201 : 200;
  return ApiResponse.success(res, result, result.message, statusCode);
}

/**
 * GET /api/customer/agent
 * Customer checks their active integrated agent or pending/rejected status
 */
export async function getCustomerIntegrationStateHandler(req, res) {
  const customerId = req.customer?.id;
  if (!customerId) {
    throw ApiError.unauthorized('Customer authentication required.');
  }

  const result = await getCustomerIntegrationState(customerId);
  return ApiResponse.success(res, result, 'Agent integration state retrieved.');
}

/**
 * GET /api/admin/agent-integration-requests
 * Super Admin lists all integration requests with filtering and search
 */
export async function listIntegrationRequestsHandler(req, res) {
  const result = await listIntegrationRequests(req.query);
  return ApiResponse.paginated(
    res,
    result.requests,
    result.pagination,
    'Integration requests retrieved.',
    200,
    { pendingTotal: result.pendingTotal }
  );
}

/**
 * POST /api/admin/agent-integration-requests/:id/approve
 * Super Admin approves a pending integration request
 */
export async function approveIntegrationRequestHandler(req, res) {
  const result = await approveIntegrationRequest(req.params.id, req.user);
  return ApiResponse.success(
    res,
    {
      ...result.request,
      relationship: result.relationship,
      notification: result.notification,
      notificationStatus: result.notificationStatus,
    },
    'Customer agent integration approved successfully.'
  );
}

/**
 * POST /api/admin/agent-integration-requests/:id/reject
 * Super Admin rejects a pending integration request
 */
export async function rejectIntegrationRequestHandler(req, res) {
  const result = await rejectIntegrationRequest(
    req.params.id,
    req.body.rejectionReason,
    req.user
  );
  return ApiResponse.success(res, result, 'Customer agent integration request rejected.');
}
