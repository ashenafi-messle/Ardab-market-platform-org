// ==============================================================================
// Ardab Market - Customer Security Controller
// ==============================================================================

import { ApiResponse } from '../../shared/utils/apiResponse.js';
import {
  changeCustomerPassword,
  listCustomerSessions,
  revokeCustomerSession,
  revokeOtherCustomerSessions,
  requestCustomerAccountDeletion,
} from '../services/security.service.js';

/**
 * PATCH /api/customer/security/password
 * Changes customer password.
 */
export async function changePasswordHandler(req, res) {
  const customerId = req.customer.id;
  const ipAddress = req.headers['x-forwarded-for'] || req.socket?.remoteAddress;
  const { currentPassword, newPassword } = req.body;

  const result = await changeCustomerPassword(
    customerId,
    currentPassword,
    newPassword,
    ipAddress
  );

  return ApiResponse.success(res, result, 'Password changed successfully');
}

/**
 * GET /api/customer/security/sessions
 * Lists active sessions for authenticated customer.
 */
export async function listSessionsHandler(req, res) {
  const customerId = req.customer.id;
  const sessions = await listCustomerSessions(customerId);
  return ApiResponse.success(res, sessions, 'Active sessions retrieved');
}

/**
 * DELETE /api/customer/security/sessions/:sessionId
 * Revokes a single session.
 */
export async function revokeSessionHandler(req, res) {
  const customerId = req.customer.id;
  const { sessionId } = req.params;
  const result = await revokeCustomerSession(customerId, sessionId);
  return ApiResponse.success(res, result, 'Session revoked successfully');
}

/**
 * POST /api/customer/security/sessions/revoke-others
 * Signs out other devices.
 */
export async function revokeOtherSessionsHandler(req, res) {
  const customerId = req.customer.id;
  const result = await revokeOtherCustomerSessions(customerId);
  return ApiResponse.success(res, result, 'Other sessions revoked successfully');
}

/**
 * POST /api/customer/security/delete-account
 * Requests account closure.
 */
export async function requestDeletionHandler(req, res) {
  const customerId = req.customer.id;
  const { reason } = req.body || {};
  const result = await requestCustomerAccountDeletion(customerId, reason);
  return ApiResponse.success(res, result, result.message);
}
