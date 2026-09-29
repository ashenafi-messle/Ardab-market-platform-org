// ==============================================================================
// Ardab Market - Expo Push Notification Dispatcher Service
// ==============================================================================

import { prisma } from '../config/database.js';
import { logger } from '../utils/logger.js';

const EXPO_PUSH_API_URL = 'https://exp.host/--/api/v2/push/send';
const EXPO_PUSH_BATCH_SIZE = 100;

/**
 * Validates whether a token matches the Expo push token pattern
 * @param {string} token
 * @returns {boolean}
 */
export function isExpoPushToken(token) {
  if (typeof token !== 'string') return false;
  const trimmed = token.trim();
  if (trimmed.length > 255 || trimmed.length < 10) return false;

  return (
    /^(ExponentPushToken|ExpoPushToken)\[[a-zA-Z0-9_\-\.]+\]$/.test(trimmed) ||
    /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(trimmed)
  );
}

/**
 * Masks a push token for safe, GDPR-compliant logging
 * @param {string} token
 * @returns {string}
 */
export function maskPushToken(token) {
  if (!token || typeof token !== 'string') return '[empty-token]';
  if (token.length <= 16) return '***';
  return `${token.slice(0, 15)}...${token.slice(-6)}`;
}

/**
 * Sends a list of push messages to Expo Push API in batches of 100.
 * Handles ticket responses, logs deliveries, and deactivates invalid tokens.
 * NEVER throws an exception that breaks caller operations.
 *
 * @param {Array<{
 *   notificationId: string,
 *   customerPushTokenId: string,
 *   token: string,
 *   title: string,
 *   body: string,
 *   data?: object,
 *   channelId?: string,
 *   sound?: string,
 *   badge?: number
 * }>} pushItems
 * @returns {Promise<{ sentCount: number, errorCount: number, invalidTokens: string[] }>}
 */
export async function sendPushNotifications(pushItems) {
  if (!Array.isArray(pushItems) || pushItems.length === 0) {
    return { sentCount: 0, errorCount: 0, invalidTokens: [] };
  }

  const results = {
    sentCount: 0,
    errorCount: 0,
    invalidTokens: [],
  };

  // 1. Filter out invalid tokens beforehand
  const validItems = [];
  for (const item of pushItems) {
    if (!item.token || !isExpoPushToken(item.token)) {
      results.errorCount++;
      if (item.customerPushTokenId) {
        // Mark as invalid token in DB
        prisma.customerPushToken
          .update({
            where: { id: item.customerPushTokenId },
            data: { isActive: false },
          })
          .catch((err) => {
            logger.warn('Failed to deactivate invalid token format', { error: err.message });
          });
      }
      continue;
    }
    validItems.push(item);
  }

  if (validItems.length === 0) {
    return results;
  }

  // 2. Chunk valid items into batches of 100 (Expo API limit)
  const chunks = [];
  for (let i = 0; i < validItems.length; i += EXPO_PUSH_BATCH_SIZE) {
    chunks.push(validItems.slice(i, i + EXPO_PUSH_BATCH_SIZE));
  }

  const headers = {
    'Accept': 'application/json',
    'Accept-Encoding': 'gzip, deflate',
    'Content-Type': 'application/json',
  };

  if (process.env.EXPO_ACCESS_TOKEN) {
    headers['Authorization'] = `Bearer ${process.env.EXPO_ACCESS_TOKEN}`;
  }

  for (const chunk of chunks) {
    const payload = chunk.map((item) => ({
      to: item.token,
      sound: item.sound || 'default',
      title: item.title,
      body: item.body,
      data: item.data || {},
      channelId: item.channelId || 'general',
      badge: item.badge !== undefined ? item.badge : 1,
    }));

    try {
      const response = await fetch(EXPO_PUSH_API_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error('[PUSH SERVICE] Expo Push API HTTP error', {
          status: response.status,
          statusText: response.statusText,
          response: errorText,
        });

        // Record failed delivery for all items in this chunk
        const deliveryRecords = chunk.map((item) => ({
          notificationId: item.notificationId,
          customerPushTokenId: item.customerPushTokenId,
          status: 'FAILED',
          errorCode: `HTTP_${response.status}`,
          errorMessage: `Expo HTTP ${response.status}: ${errorText.slice(0, 200)}`,
        }));

        await prisma.notificationDelivery.createMany({
          data: deliveryRecords,
        }).catch(() => {});

        results.errorCount += chunk.length;
        continue;
      }

      const resJson = await response.json();
      const tickets = resJson.data || [];

      const deliveryRecords = [];
      const tokensToDeactivate = [];

      for (let i = 0; i < chunk.length; i++) {
        const item = chunk[i];
        const ticket = tickets[i];

        if (ticket && ticket.status === 'ok') {
          results.sentCount++;
          deliveryRecords.push({
            notificationId: item.notificationId,
            customerPushTokenId: item.customerPushTokenId,
            status: 'SENT',
            ticketId: ticket.id || null,
            providerMessageId: ticket.id || null,
            sentAt: new Date(),
          });
        } else {
          results.errorCount++;
          const ticketError = ticket?.details?.error || ticket?.message || 'UNKNOWN_ERROR';
          const isInvalidToken =
            ticketError === 'DeviceNotRegistered' ||
            ticketError === 'InvalidCredentials';

          if (isInvalidToken) {
            results.invalidTokens.push(item.token);
            if (item.customerPushTokenId) {
              tokensToDeactivate.push(item.customerPushTokenId);
            }
          }

          deliveryRecords.push({
            notificationId: item.notificationId,
            customerPushTokenId: item.customerPushTokenId,
            status: isInvalidToken ? 'INVALID_TOKEN' : 'FAILED',
            errorCode: ticketError,
            errorMessage: ticket?.message || 'Push delivery rejected by provider',
          });
        }
      }

      // Persist delivery audit records
      if (deliveryRecords.length > 0) {
        await prisma.notificationDelivery.createMany({
          data: deliveryRecords,
        }).catch((err) => {
          logger.warn('[PUSH SERVICE] Failed to record delivery receipts', { error: err.message });
        });
      }

      // Automatically deactivate uninstalled or unregistered push tokens
      if (tokensToDeactivate.length > 0) {
        await prisma.customerPushToken.updateMany({
          where: { id: { in: tokensToDeactivate } },
          data: { isActive: false },
        }).catch((err) => {
          logger.warn('[PUSH SERVICE] Failed to deactivate invalid push tokens', { error: err.message });
        });
        logger.info('[PUSH SERVICE] Deactivated invalid customer push tokens', {
          count: tokensToDeactivate.length,
        });
      }
    } catch (networkError) {
      logger.error('[PUSH SERVICE] Network exception connecting to Expo Push API', {
        error: networkError.message,
      });

      // Push failure must never crash or rollback the business flow
      results.errorCount += chunk.length;
    }
  }

  return results;
}
