// ==============================================================================
// Ardab Market - Notifications & Operational Alerts Routes
// ==============================================================================

import { Router } from 'express';
import {
  listNotificationsHandler,
  getNotificationSummaryHandler,
  getNotificationByIdHandler,
  createNotificationHandler,
  markAsReadHandler,
  markAllAsReadHandler,
  bulkMarkAsReadHandler,
  acknowledgeAlertHandler,
  bulkAcknowledgeAlertsHandler,
} from '../controllers/notification.controller.js';
import { adminAuthMiddleware } from '../middleware/adminAuth.middleware.js';
import { requirePermission } from '../middleware/adminPermission.middleware.js';
import { ADMIN_PERMISSIONS } from '../constants/adminPermissions.js';
import { validate } from '../../shared/middleware/validate.middleware.js';
import {
  notificationQuerySchema,
  createNotificationSchema,
  acknowledgeAlertSchema,
  bulkMarkAsReadSchema,
  bulkAcknowledgeSchema,
} from '../validators/notification.validator.js';
import { asyncHandler } from '../../shared/utils/asyncHandler.js';

const router = Router();

// Protect all notification routes with admin authentication
router.use(adminAuthMiddleware);

/**
 * @route   GET /api/notifications/summary
 * @desc    Get summary KPI metrics, unread counters, and recent operational alerts
 * @access  All Authenticated Admins
 */
router.get(
  '/summary',
  requirePermission(ADMIN_PERMISSIONS.NOTIFICATIONS_VIEW),
  asyncHandler(getNotificationSummaryHandler)
);

/**
 * @route   GET /api/notifications
 * @desc    List notifications and operational alerts with filters and pagination
 * @access  All Authenticated Admins
 */
router.get(
  '/',
  requirePermission(ADMIN_PERMISSIONS.NOTIFICATIONS_VIEW),
  validate(notificationQuerySchema, 'query'),
  asyncHandler(listNotificationsHandler)
);

/**
 * @route   POST /api/notifications
 * @desc    Manually dispatch or emit an operational alert/notification
 * @access  Super Admin, Sub Admin, Operations Manager
 */
router.post(
  '/',
  requirePermission(ADMIN_PERMISSIONS.NOTIFICATIONS_MANAGE),
  validate(createNotificationSchema),
  asyncHandler(createNotificationHandler)
);

/**
 * @route   POST /api/notifications/mark-all-read
 * @desc    Mark all unread notifications as read for current admin
 * @access  All Authenticated Admins
 */
router.post(
  '/mark-all-read',
  requirePermission(ADMIN_PERMISSIONS.NOTIFICATIONS_VIEW),
  asyncHandler(markAllAsReadHandler)
);

/**
 * @route   POST /api/notifications/bulk-read
 * @desc    Bulk mark specified notifications as read
 * @access  All Authenticated Admins
 */
router.post(
  '/bulk-read',
  requirePermission(ADMIN_PERMISSIONS.NOTIFICATIONS_VIEW),
  validate(bulkMarkAsReadSchema),
  asyncHandler(bulkMarkAsReadHandler)
);

/**
 * @route   POST /api/notifications/bulk-acknowledge
 * @desc    Bulk acknowledge multiple operational alerts
 * @access  Admins with alert acknowledgement permission
 */
router.post(
  '/bulk-acknowledge',
  requirePermission(ADMIN_PERMISSIONS.ALERTS_ACKNOWLEDGE),
  validate(bulkAcknowledgeSchema),
  asyncHandler(bulkAcknowledgeAlertsHandler)
);

/**
 * @route   GET /api/notifications/:id
 * @desc    Get details of a single notification
 * @access  All Authenticated Admins
 */
router.get(
  '/:id',
  requirePermission(ADMIN_PERMISSIONS.NOTIFICATIONS_VIEW),
  asyncHandler(getNotificationByIdHandler)
);

/**
 * @route   PATCH /api/notifications/:id/read
 * @desc    Mark a notification as read
 * @access  All Authenticated Admins
 */
router.patch(
  '/:id/read',
  requirePermission(ADMIN_PERMISSIONS.NOTIFICATIONS_VIEW),
  asyncHandler(markAsReadHandler)
);

/**
 * @route   POST /api/notifications/:id/acknowledge
 * @desc    Formally acknowledge an operational alert with notes & audit trail
 * @access  Admins with alert acknowledgement permission
 */
router.post(
  '/:id/acknowledge',
  requirePermission(ADMIN_PERMISSIONS.ALERTS_ACKNOWLEDGE),
  validate(acknowledgeAlertSchema),
  asyncHandler(acknowledgeAlertHandler)
);

export default router;
