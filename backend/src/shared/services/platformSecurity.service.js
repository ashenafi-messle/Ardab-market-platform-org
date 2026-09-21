// ==============================================================================
// Ardab Market - Central Security Event Recording Service
// ==============================================================================
// Unified cross-platform security telemetry recorder for:
// - CUSTOMER_WEB
// - SUBADMIN_WEB
// - SUPERADMIN_WEB
// - AUTH_SERVICE
// - SYSTEM
// Strictly protects confidential credentials: passwords, tokens, hashes are never logged.

import { prisma } from '../config/database.js';
import { logger } from '../utils/logger.js';

/**
 * Sanitizes arbitrary metadata object to ensure zero credentials or tokens are logged.
 */
function sanitizeMetadata(metadata) {
  if (!metadata || typeof metadata !== 'object') return {};
  const clean = { ...metadata };

  const sensitiveKeys = [
    'password',
    'passwordHash',
    'currentPassword',
    'newPassword',
    'confirmPassword',
    'token',
    'rawToken',
    'verificationToken',
    'resetToken',
    'accessToken',
    'secret',
    'clientSecret',
    'authorization',
  ];

  for (const key of Object.keys(clean)) {
    if (sensitiveKeys.some((s) => key.toLowerCase().includes(s.toLowerCase()))) {
      clean[key] = '[REDACTED]';
    }
  }

  return clean;
}

/**
 * Record a platform-wide security event to the central security_events table.
 *
 * @param {Object} params
 * @param {string} params.eventType - e.g. 'CUSTOMER_LOGIN_SUCCESS', 'CUSTOMER_LOGIN_FAILED', 'CUSTOMER_SUSPENDED'
 * @param {string} [params.severity='INFO'] - 'INFO' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
 * @param {string} [params.source='SYSTEM'] - 'CUSTOMER_WEB' | 'SUBADMIN_WEB' | 'SUPERADMIN_WEB' | 'API' | 'AUTH_SERVICE' | 'SYSTEM'
 * @param {string} [params.actorType='SYSTEM'] - 'CUSTOMER' | 'SELLER' | 'SUBADMIN' | 'SUPER_ADMIN' | 'SYSTEM' | 'ANONYMOUS'
 * @param {string} [params.actorId]
 * @param {string} [params.actorEmail]
 * @param {string} [params.targetType] - e.g. 'Customer', 'AdminUser', 'Order'
 * @param {string} [params.targetId]
 * @param {string} [params.ipAddress]
 * @param {string} [params.userAgent]
 * @param {string} [params.sessionId]
 * @param {string} [params.requestId]
 * @param {string} [params.endpoint]
 * @param {string} [params.httpMethod]
 * @param {Object} [params.metadata]
 */
export async function logPlatformSecurityEvent({
  eventType,
  severity = 'INFO',
  source = 'SYSTEM',
  actorType = 'SYSTEM',
  actorId = null,
  actorEmail = null,
  targetType = null,
  targetId = null,
  ipAddress = null,
  userAgent = null,
  sessionId = null,
  requestId = null,
  endpoint = null,
  httpMethod = null,
  metadata = null,
}) {
  try {
    const cleanMeta = sanitizeMetadata(metadata);

    const event = await prisma.securityEvent.create({
      data: {
        eventType,
        severity,
        source,
        actorType,
        actorId,
        actorEmail,
        targetType,
        targetId,
        ipAddress,
        userAgent,
        sessionId,
        requestId,
        endpoint,
        httpMethod,
        metadata: cleanMeta,
      },
    });

    return event;
  } catch (err) {
    // Non-blocking: never fail the primary business request if telemetry recording hits an error
    logger.error('Failed to log central security event', {
      error: err.message,
      eventType,
      source,
      actorEmail,
    });
    return null;
  }
}
