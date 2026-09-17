// ==============================================================================
// Ardab Market - Centralized Delivery Lifecycle State Machine & Transition Rules
// ==============================================================================

import { ApiError } from '../../shared/utils/apiResponse.js';
import { DELIVERY_STATUS_TRANSITIONS } from '../constants/deliveryConstants.js';

/**
 * Validates whether transitioning from currentStatus to targetStatus is allowed.
 * Throws ApiError.badRequest if invalid.
 *
 * @param {string} currentStatus
 * @param {string} targetStatus
 */
export function validateStatusTransition(currentStatus, targetStatus) {
  if (currentStatus === targetStatus) {
    throw ApiError.badRequest(`Delivery is already in ${currentStatus} status.`);
  }

  const allowed = DELIVERY_STATUS_TRANSITIONS[currentStatus] || [];
  if (!allowed.includes(targetStatus)) {
    throw ApiError.badRequest(
      `Invalid delivery status transition: Cannot change status from "${currentStatus}" to "${targetStatus}". Allowed next transitions: [${allowed.join(', ') || 'None (terminal state)'}].`,
      'INVALID_STATUS_TRANSITION'
    );
  }
}

/**
 * Determines which timestamp and metadata fields to update based on the target delivery status.
 *
 * @param {string} targetStatus
 * @param {string|null} reason
 * @returns {object} Prisma update data slice
 */
export function getStatusTimestampUpdates(targetStatus, reason = null) {
  const now = new Date();
  const updates = {
    status: targetStatus,
    updatedAt: now,
  };

  switch (targetStatus) {
    case 'OUT_FOR_DELIVERY':
      updates.dispatchedAt = now;
      break;
    case 'DELIVERED':
      updates.deliveredAt = now;
      break;
    case 'FAILED':
      updates.failedAt = now;
      if (reason) updates.failureReason = reason;
      break;
    case 'CANCELLED':
      updates.cancelledAt = now;
      if (reason) updates.cancellationReason = reason;
      break;
    default:
      break;
  }

  return updates;
}
