// ==============================================================================
// Ardab Market - Centralized Order Lifecycle State Machine & Transition Rules
// ==============================================================================

import { ApiError } from '../../shared/utils/apiResponse.js';

export const ORDER_STATUS_TRANSITIONS = {
  PENDING: ['CONFIRMED', 'REJECTED', 'CANCELLED'],
  CONFIRMED: ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['READY_FOR_DELIVERY', 'CANCELLED'],
  READY_FOR_DELIVERY: ['ASSIGNED_TO_TRIP', 'CANCELLED'],
  ASSIGNED_TO_TRIP: ['PICKED_UP', 'CANCELLED'],
  PICKED_UP: ['IN_TRANSIT', 'CANCELLED'],
  IN_TRANSIT: ['DELIVERED', 'FAILED', 'RETURNED'],
  DELIVERED: [],
  CANCELLED: [],
  REJECTED: [],
  FAILED: ['RETURNED'],
  RETURNED: [],
};

/**
 * Validates whether transitioning from currentStatus to targetStatus is allowed.
 * Throws 400 Bad Request if invalid.
 *
 * @param {string} currentStatus
 * @param {string} targetStatus
 */
export function validateStatusTransition(currentStatus, targetStatus) {
  if (currentStatus === targetStatus) {
    throw ApiError.badRequest(`Order is already in ${currentStatus} status.`);
  }

  const allowed = ORDER_STATUS_TRANSITIONS[currentStatus] || [];
  if (!allowed.includes(targetStatus)) {
    throw ApiError.badRequest(
      `Invalid order status transition: Cannot change status from "${currentStatus}" to "${targetStatus}". Allowed next transitions: [${allowed.join(', ') || 'None (terminal state)'}].`,
      'INVALID_STATUS_TRANSITION'
    );
  }
}

/**
 * Determines which timestamp field to update based on the target order status.
 *
 * @param {string} targetStatus
 * @param {string|null} reason
 * @returns {object} Prisma update data slice
 */
export function getStatusTimestampUpdates(targetStatus, reason = null) {
  const now = new Date();
  const updates = {
    status: targetStatus,
  };

  switch (targetStatus) {
    case 'CONFIRMED':
      updates.confirmedAt = now;
      break;
    case 'PROCESSING':
      updates.processingAt = now;
      break;
    case 'READY_FOR_DELIVERY':
      updates.readyAt = now;
      break;
    case 'IN_TRANSIT':
      updates.dispatchedAt = now;
      break;
    case 'DELIVERED':
      updates.deliveredAt = now;
      break;
    case 'CANCELLED':
      updates.cancelledAt = now;
      if (reason) updates.cancelledReason = reason;
      break;
    case 'REJECTED':
      updates.rejectedAt = now;
      if (reason) updates.rejectedReason = reason;
      break;
    default:
      break;
  }

  return updates;
}
