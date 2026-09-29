// ==============================================================================
// Ardab Market - Customer Notification Validators
// ==============================================================================

import { z } from 'zod';
import { isExpoPushToken } from '../../shared/services/pushNotification.service.js';

export const registerDeviceSchema = z.object({
  pushToken: z
    .string({ required_error: 'Push token is required' })
    .min(10, 'Push token must be at least 10 characters')
    .max(255, 'Push token cannot exceed 255 characters')
    .refine((token) => isExpoPushToken(token), {
      message: 'Invalid Expo push token format',
    }),
  platform: z.enum(['ANDROID', 'IOS', 'WEB']).default('ANDROID'),
  deviceId: z.string().max(128).optional().nullable(),
  appVersion: z.string().max(64).optional().nullable(),
});

export const notificationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  unread: z.enum(['true', 'false']).optional(),
});
