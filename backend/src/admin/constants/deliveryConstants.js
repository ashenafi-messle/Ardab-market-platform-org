// ==============================================================================
// Ardab Market - Deliveries & Logistics Constants
// ==============================================================================

/**
 * Standard Ardab heavy cargo truck payload capacity limit.
 * Every delivery vehicle in the Ardab fleet is configured for a max of 5,000 KG.
 */
export const STANDARD_VEHICLE_CAPACITY_KG = 5000;

/**
 * Controlled delivery lifecycle statuses.
 */
export const DELIVERY_STATUS = {
  PENDING: 'PENDING',
  READY_FOR_ASSIGNMENT: 'READY_FOR_ASSIGNMENT',
  ASSIGNED: 'ASSIGNED',
  OUT_FOR_DELIVERY: 'OUT_FOR_DELIVERY',
  DELIVERED: 'DELIVERED',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED',
};

/**
 * Centralized lifecycle transition state machine.
 */
export const DELIVERY_STATUS_TRANSITIONS = {
  PENDING: ['READY_FOR_ASSIGNMENT', 'CANCELLED'],
  READY_FOR_ASSIGNMENT: ['ASSIGNED', 'PENDING', 'CANCELLED'],
  ASSIGNED: ['OUT_FOR_DELIVERY', 'READY_FOR_ASSIGNMENT', 'CANCELLED'],
  OUT_FOR_DELIVERY: ['DELIVERED', 'FAILED', 'CANCELLED'],
  DELIVERED: [], // Terminal state
  FAILED: ['READY_FOR_ASSIGNMENT', 'CANCELLED'], // Reschedule or cancel
  CANCELLED: [], // Terminal state
};

/**
 * Controlled structured reasons for delivery failure.
 */
export const FAILURE_REASONS = [
  'Customer unavailable at destination',
  'Incorrect delivery address or contact number',
  'Customer refused delivery consignment',
  'Severe vehicle mechanical breakdown',
  'Adverse weather or road blockage',
  'Other operational constraint',
];

/**
 * Controlled structured reasons for delivery cancellation.
 */
export const CANCELLATION_REASONS = [
  'Order cancelled by customer',
  'Consignment items damaged prior to dispatch',
  'Duplicate delivery dispatch entry',
  'Customer requested change of fulfillment date',
  'Delivery route unreachable',
  'Other administrative cancellation',
];
