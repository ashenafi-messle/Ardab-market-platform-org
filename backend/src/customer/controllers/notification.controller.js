// ==============================================================================
// Ardab Market - Customer Notification Controller
// ==============================================================================

import {
  registerDeviceToken,
  unregisterDeviceToken,
  getCustomerNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  hideNotification,
} from '../services/notification.service.js';
import { ApiResponse } from '../../shared/utils/apiResponse.js';

export async function registerDevice(req, res, next) {
  try {
    const customerId = req.customer.id;
    const result = await registerDeviceToken(customerId, req.body);
    return ApiResponse.success(res, result, 'Push device registered successfully');
  } catch (error) {
    return next(error);
  }
}

export async function unregisterDevice(req, res, next) {
  try {
    const customerId = req.customer.id;
    const tokenOrId = req.params.id || req.body?.pushToken || req.body?.token;
    const result = await unregisterDeviceToken(customerId, tokenOrId);
    return ApiResponse.success(res, result, 'Push device unregistered successfully');
  } catch (error) {
    return next(error);
  }
}

export async function listNotifications(req, res, next) {
  try {
    const customerId = req.customer.id;
    const result = await getCustomerNotifications(customerId, req.query);
    return ApiResponse.success(res, result, 'Notifications retrieved successfully');
  } catch (error) {
    return next(error);
  }
}

export async function getCustomerUnreadCount(req, res, next) {
  try {
    const customerId = req.customer.id;
    const result = await getUnreadCount(customerId);
    return ApiResponse.success(res, result, 'Unread count retrieved successfully');
  } catch (error) {
    return next(error);
  }
}

export async function markNotificationAsRead(req, res, next) {
  try {
    const customerId = req.customer.id;
    const { id } = req.params;
    const result = await markAsRead(customerId, id);
    return ApiResponse.success(res, result, 'Notification marked as read');
  } catch (error) {
    return next(error);
  }
}

export async function markAllNotificationsAsRead(req, res, next) {
  try {
    const customerId = req.customer.id;
    const result = await markAllAsRead(customerId);
    return ApiResponse.success(res, result, 'All notifications marked as read');
  } catch (error) {
    return next(error);
  }
}

export async function deleteCustomerNotification(req, res, next) {
  try {
    const customerId = req.customer.id;
    const { id } = req.params;
    const result = await hideNotification(customerId, id);
    return ApiResponse.success(res, result, 'Notification removed from view');
  } catch (error) {
    return next(error);
  }
}
