// ==============================================================================
// Ardab Market - Notifications & Operational Alerts HTTP Controller
// ==============================================================================

import { ApiResponse } from '../../shared/utils/apiResponse.js';
import {
  listNotifications,
  getNotificationSummary,
  getNotificationById,
  createNotification,
  markAsRead,
  markAllAsRead,
  bulkMarkAsRead,
  acknowledgeAlert,
  bulkAcknowledgeAlerts,
} from '../services/notification.service.js';

function getRequestAdmin(req) {
  return req.user || req.adminUser || req.admin || null;
}

/**
 * GET /api/notifications
 * Lists notifications and alerts with filters, pagination, and tabs.
 */
export async function listNotificationsHandler(req, res) {
  const result = await listNotifications({
    adminUser: getRequestAdmin(req),
    query: req.query,
  });

  return ApiResponse.paginated(
    res,
    result.items,
    result.pagination,
    'Notifications retrieved successfully.'
  );
}

/**
 * GET /api/notifications/summary
 * Retrieves notification counts, unread counter, and active alerts.
 */
export async function getNotificationSummaryHandler(req, res) {
  const summary = await getNotificationSummary({
    adminUser: getRequestAdmin(req),
  });

  return ApiResponse.success(
    res,
    summary,
    'Notification summary metrics retrieved successfully.'
  );
}

/**
 * GET /api/notifications/:id
 * Retrieves details for a specific notification or alert.
 */
export async function getNotificationByIdHandler(req, res) {
  const notification = await getNotificationById({
    id: req.params.id,
    adminUser: getRequestAdmin(req),
  });

  return ApiResponse.success(res, notification, 'Notification retrieved successfully.');
}

/**
 * POST /api/notifications
 * Creates a new notification or operational alert (Admin or system event).
 */
export async function createNotificationHandler(req, res) {
  const notification = await createNotification(req.body, getRequestAdmin(req));

  return ApiResponse.success(
    res,
    notification,
    'Notification created successfully.',
    201
  );
}

/**
 * PATCH /api/notifications/:id/read
 * Marks a notification as read for the calling admin.
 */
export async function markAsReadHandler(req, res) {
  const result = await markAsRead({
    id: req.params.id,
    adminUser: getRequestAdmin(req),
  });

  return ApiResponse.success(res, result, 'Notification marked as read.');
}

/**
 * POST /api/notifications/mark-all-read
 * Marks all notifications (or within a category) as read.
 */
export async function markAllAsReadHandler(req, res) {
  const { category } = req.body || {};
  const result = await markAllAsRead({
    adminUser: getRequestAdmin(req),
    category,
  });

  return ApiResponse.success(
    res,
    result,
    `Marked ${result.updatedCount} notification(s) as read.`
  );
}

/**
 * POST /api/notifications/bulk-read
 * Bulk marks selected notifications as read.
 */
export async function bulkMarkAsReadHandler(req, res) {
  const { notificationIds } = req.body;
  const result = await bulkMarkAsRead({
    notificationIds,
    adminUser: getRequestAdmin(req),
  });

  return ApiResponse.success(
    res,
    result,
    `Marked ${result.updatedCount} notification(s) as read.`
  );
}

/**
 * POST /api/notifications/:id/acknowledge
 * Formally acknowledges an operational alert.
 */
export async function acknowledgeAlertHandler(req, res) {
  const ipAddress = req.ip || req.connection?.remoteAddress;
  const result = await acknowledgeAlert({
    id: req.params.id,
    adminUser: getRequestAdmin(req),
    notes: req.body?.notes,
    ipAddress,
  });

  return ApiResponse.success(
    res,
    result,
    'Operational alert formally acknowledged and recorded to audit trail.'
  );
}

/**
 * POST /api/notifications/bulk-acknowledge
 * Bulk acknowledges multiple operational alerts.
 */
export async function bulkAcknowledgeAlertsHandler(req, res) {
  const ipAddress = req.ip || req.connection?.remoteAddress;
  const result = await bulkAcknowledgeAlerts({
    notificationIds: req.body.notificationIds,
    adminUser: getRequestAdmin(req),
    notes: req.body?.notes,
    ipAddress,
  });

  return ApiResponse.success(
    res,
    result,
    `Bulk acknowledged ${result.updatedCount} operational alert(s).`
  );
}
