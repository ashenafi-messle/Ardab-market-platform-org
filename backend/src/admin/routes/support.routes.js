// ==============================================================================
// Ardab Market - Customer Support Module Routes
// ==============================================================================

import { Router } from 'express';
import { adminAuthMiddleware } from '../middleware/adminAuth.middleware.js';
import { requirePermission } from '../middleware/adminPermission.middleware.js';
import { ADMIN_PERMISSIONS } from '../constants/adminPermissions.js';
import { validate } from '../../shared/middleware/validate.middleware.js';
import { asyncHandler } from '../../shared/utils/asyncHandler.js';
import {
  listTicketsHandler,
  getSupportStatisticsHandler,
  listCategoriesHandler,
  getTicketByIdHandler,
  createTicketHandler,
  replyToTicketHandler,
  addInternalNoteHandler,
  updateTicketStatusHandler,
  assignTicketHandler,
  retryEmailDeliveryHandler,
} from '../controllers/support.controller.js';
import {
  supportQuerySchema,
  ticketParamsSchema,
  emailRetryParamsSchema,
  createTicketSchema,
  replyMessageSchema,
  internalNoteSchema,
  updateStatusSchema,
  assignTicketSchema,
} from '../validators/support.validator.js';

const router = Router();

// Require admin authentication for all support endpoints
router.use(adminAuthMiddleware);

/**
 * @route   GET /api/subadmin/support/statistics
 * @desc    Get KPI counters for support dashboard
 * @access  support:view
 */
router.get(
  '/statistics',
  requirePermission(ADMIN_PERMISSIONS.SUPPORT_VIEW),
  asyncHandler(getSupportStatisticsHandler)
);

/**
 * @route   GET /api/subadmin/support/categories
 * @desc    Get active support categories
 * @access  support:view
 */
router.get(
  '/categories',
  requirePermission(ADMIN_PERMISSIONS.SUPPORT_VIEW),
  asyncHandler(listCategoriesHandler)
);

/**
 * @route   GET /api/subadmin/support/tickets
 * @desc    List support tickets with pagination, search, and filters
 * @access  support:view
 */
router.get(
  '/tickets',
  requirePermission(ADMIN_PERMISSIONS.SUPPORT_VIEW),
  validate({ query: supportQuerySchema }),
  asyncHandler(listTicketsHandler)
);

/**
 * @route   POST /api/subadmin/support/tickets
 * @desc    Create a new support ticket
 * @access  support:manage
 */
router.post(
  '/tickets',
  requirePermission(ADMIN_PERMISSIONS.SUPPORT_MANAGE),
  validate({ body: createTicketSchema }),
  asyncHandler(createTicketHandler)
);

/**
 * @route   GET /api/subadmin/support/tickets/:id
 * @desc    Get detailed ticket with messages, history, and email logs
 * @access  support:view
 */
router.get(
  '/tickets/:id',
  requirePermission(ADMIN_PERMISSIONS.SUPPORT_VIEW),
  validate({ params: ticketParamsSchema }),
  asyncHandler(getTicketByIdHandler)
);

/**
 * @route   POST /api/subadmin/support/tickets/:id/reply
 * @desc    Post public admin reply and email the customer
 * @access  support:manage
 */
router.post(
  '/tickets/:id/reply',
  requirePermission(ADMIN_PERMISSIONS.SUPPORT_MANAGE),
  validate({ params: ticketParamsSchema, body: replyMessageSchema }),
  asyncHandler(replyToTicketHandler)
);

/**
 * @route   POST /api/subadmin/support/tickets/:id/internal-note
 * @desc    Add staff internal note (never emailed or shown to customer)
 * @access  support:manage
 */
router.post(
  '/tickets/:id/internal-note',
  requirePermission(ADMIN_PERMISSIONS.SUPPORT_MANAGE),
  validate({ params: ticketParamsSchema, body: internalNoteSchema }),
  asyncHandler(addInternalNoteHandler)
);

/**
 * @route   PATCH /api/subadmin/support/tickets/:id/status
 * @desc    Update ticket lifecycle status
 * @access  support:resolve
 */
router.patch(
  '/tickets/:id/status',
  requirePermission(ADMIN_PERMISSIONS.SUPPORT_RESOLVE),
  validate({ params: ticketParamsSchema, body: updateStatusSchema }),
  asyncHandler(updateTicketStatusHandler)
);

/**
 * @route   PATCH /api/subadmin/support/tickets/:id/assign
 * @desc    Assign or unassign ticket to an admin user
 * @access  support:assign
 */
router.patch(
  '/tickets/:id/assign',
  requirePermission(ADMIN_PERMISSIONS.SUPPORT_ASSIGN),
  validate({ params: ticketParamsSchema, body: assignTicketSchema }),
  asyncHandler(assignTicketHandler)
);

/**
 * @route   POST /api/subadmin/support/tickets/:id/emails/:emailLogId/retry
 * @desc    Retry email notification for a message
 * @access  support:manage
 */
router.post(
  '/tickets/:id/emails/:emailLogId/retry',
  requirePermission(ADMIN_PERMISSIONS.SUPPORT_MANAGE),
  validate({ params: emailRetryParamsSchema }),
  asyncHandler(retryEmailDeliveryHandler)
);

export default router;
