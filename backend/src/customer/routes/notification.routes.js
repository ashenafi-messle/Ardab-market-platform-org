// ==============================================================================
// Ardab Market - Customer Notifications Route Map
// ==============================================================================

import { Router } from 'express';
import { customerAuthMiddleware } from '../middleware/customerAuth.middleware.js';
import { validate } from '../../shared/middleware/validate.middleware.js';
import {
  registerDeviceSchema,
  notificationQuerySchema,
} from '../validators/notification.validator.js';
import {
  registerDevice,
  unregisterDevice,
  listNotifications,
  getCustomerUnreadCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteCustomerNotification,
} from '../controllers/notification.controller.js';

const router = Router();

// All customer notification endpoints require customer authentication
router.use(customerAuthMiddleware);

// Device Push Token Management
router.post('/devices', validate(registerDeviceSchema), registerDevice);
router.delete('/devices/:id', unregisterDevice);
router.delete('/devices', unregisterDevice);

// Notification List & Unread Counter
router.get('/', validate(notificationQuerySchema, 'query'), listNotifications);
router.get('/unread-count', getCustomerUnreadCount);

// Read State Operations
router.patch('/read-all', markAllNotificationsAsRead);
router.patch('/:id/read', markNotificationAsRead);

// Soft Delete / Hide from view
router.delete('/:id', deleteCustomerNotification);

export default router;
