// ==============================================================================
// Ardab Market - Security & Super Admin Management Service
// ==============================================================================

import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { prisma } from '../../shared/config/database.js';
import { ApiError } from '../../shared/utils/apiResponse.js';
import { logger } from '../../shared/utils/logger.js';
import { sanitizeAdminUser } from './auth.service.js';

/**
 * Strips sensitive keys (passwords, tokens, secrets) from metadata
 */
function sanitizeSecurityMetadata(metadata) {
  if (!metadata || typeof metadata !== 'object') return metadata;
  const sanitized = { ...metadata };
  const sensitiveKeys = [
    'password',
    'passwordHash',
    'token',
    'accessToken',
    'refreshToken',
    'otp',
    'secret',
    'authorization',
    'cookie',
    'creditCard',
  ];

  for (const key of Object.keys(sanitized)) {
    if (sensitiveKeys.some((s) => key.toLowerCase().includes(s.toLowerCase()))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof sanitized[key] === 'object') {
      sanitized[key] = sanitizeSecurityMetadata(sanitized[key]);
    }
  }
  return sanitized;
}

export const securityService = {
  // ----------------------------------------------------------------------------
  // Super Admin Management (Strictly using existing admin_users table)
  // ----------------------------------------------------------------------------

  /**
   * Lists Super Admin accounts with filtering and pagination
   */
  listSuperAdmins: async ({
    page = 1,
    limit = 20,
    pageSize,
    search,
    city,
    status,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  }) => {
    const take = pageSize ? Number(pageSize) : Number(limit);
    const skip = (Number(page) - 1) * take;

    const where = {
      role: 'SUPER_ADMIN',
    };

    if (status && status !== 'ALL') {
      where.status = status;
    }

    if (city && city !== 'ALL' && city !== 'All Cities') {
      where.assignedCities = {
        has: city,
      };
    }

    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
        { phone: { contains: q, mode: 'insensitive' } },
        { id: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [total, superAdmins] = await Promise.all([
      prisma.adminUser.count({ where }),
      prisma.adminUser.findMany({
        where,
        skip,
        take,
        orderBy: { [sortBy]: sortOrder },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          status: true,
          avatar: true,
          phone: true,
          assignedCities: true,
          lastLogin: true,
          failedLoginAttempts: true,
          lockedUntil: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              sessions: true,
            },
          },
        },
      }),
    ]);

    const formatted = superAdmins.map((admin) => ({
      ...admin,
      lastLogin: admin.lastLogin ? admin.lastLogin.toISOString() : 'Never',
      createdAt: admin.createdAt ? admin.createdAt.toISOString().split('T')[0] : undefined,
    }));

    return {
      data: formatted,
      pagination: {
        page: Number(page),
        pageSize: take,
        total,
        totalPages: Math.ceil(total / take) || 1,
      },
    };
  },

  /**
   * Retrieves a single Super Admin account by ID
   */
  getSuperAdminById: async (id) => {
    const admin = await prisma.adminUser.findFirst({
      where: {
        id,
        role: 'SUPER_ADMIN',
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        avatar: true,
        phone: true,
        assignedCities: true,
        lastLogin: true,
        failedLoginAttempts: true,
        lockedUntil: true,
        createdAt: true,
        updatedAt: true,
        sessions: {
          where: { status: 'ACTIVE' },
          select: {
            id: true,
            ipAddress: true,
            userAgent: true,
            createdAt: true,
            expiresAt: true,
          },
        },
      },
    });

    if (!admin) {
      throw ApiError.notFound('Super Admin account not found');
    }

    return admin;
  },

  /**
   * Provisions a new Super Admin account
   */
  createSuperAdmin: async (data, creatorAdmin, reqInfo = {}) => {
    const email = data.email.toLowerCase().trim();

    // 1. Validate email uniqueness
    const existing = await prisma.adminUser.findUnique({
      where: { email },
    });

    if (existing) {
      throw ApiError.conflict('An administrator with this email address already exists');
    }

    // 2. Generate or hash password
    const rawPassword = data.initialPassword || `Ardab#${crypto.randomBytes(4).toString('hex')}!`;
    const passwordHash = await bcrypt.hash(rawPassword, 12);

    // 3. Database transaction: Create AdminUser + AuditLog + SecurityEvent
    const result = await prisma.$transaction(async (tx) => {
      const newAdmin = await tx.adminUser.create({
        data: {
          name: data.name.trim(),
          email,
          passwordHash,
          role: 'SUPER_ADMIN',
          status: 'ACTIVE',
          phone: data.phone || '+251 91 000 0000',
          assignedCities: data.assignedCities && data.assignedCities.length > 0 ? data.assignedCities : ['All Cities'],
        },
      });

      // Audit Log
      await tx.auditLog.create({
        data: {
          adminId: creatorAdmin?.id,
          adminEmail: creatorAdmin?.email || 'system@ardabmarket.com',
          action: 'CREATE_SUPER_ADMIN_ACCOUNT',
          entity: 'AdminUser',
          entityId: newAdmin.id,
          ipAddress: reqInfo.ipAddress || '127.0.0.1',
          changesSummary: `Provisioned Super Admin account for ${newAdmin.name} (${newAdmin.email}) with cities: ${newAdmin.assignedCities.join(', ')}`,
          status: 'SUCCESS',
        },
      });

      // Security Event
      await tx.securityEvent.create({
        data: {
          eventType: 'ADMIN_CREATED',
          severity: 'MEDIUM',
          source: 'SUBADMIN_WEB',
          actorType: creatorAdmin?.role === 'SUPER_ADMIN' ? 'SUPER_ADMIN' : 'SUBADMIN',
          actorId: creatorAdmin?.id,
          actorEmail: creatorAdmin?.email,
          targetType: 'ADMIN',
          targetId: newAdmin.id,
          ipAddress: reqInfo.ipAddress,
          userAgent: reqInfo.userAgent,
          requestId: reqInfo.requestId,
          endpoint: reqInfo.endpoint,
          httpMethod: reqInfo.httpMethod,
          metadata: {
            assignedRole: 'SUPER_ADMIN',
            assignedCities: newAdmin.assignedCities,
          },
        },
      });

      return newAdmin;
    });

    logger.info(`Super Admin account created for [${result.email}] by [${creatorAdmin?.email}]`, {
      newAdminId: result.id,
      creatorId: creatorAdmin?.id,
    });

    const safeAdmin = sanitizeAdminUser(result);
    return {
      ...safeAdmin,
      initialPassword: rawPassword, // Returned once so admin can relay temporary password to user
      lastLogin: 'Never (Newly Created)',
    };
  },

  /**
   * Updates an existing Super Admin account
   */
  updateSuperAdmin: async (id, data, modifierAdmin, reqInfo = {}) => {
    const target = await prisma.adminUser.findFirst({
      where: { id, role: 'SUPER_ADMIN' },
    });

    if (!target) {
      throw ApiError.notFound('Super Admin account not found');
    }

    // Safeguard: Check if suspending the last active Super Admin
    if (data.status && data.status !== 'ACTIVE' && target.status === 'ACTIVE') {
      const activeCount = await prisma.adminUser.count({
        where: { role: 'SUPER_ADMIN', status: 'ACTIVE' },
      });
      if (activeCount <= 1) {
        throw ApiError.badRequest(
          'Cannot suspend the last active Super Admin account. At least one active Super Admin must remain in the platform.'
        );
      }
      if (modifierAdmin?.id === id) {
        throw ApiError.badRequest('Cannot suspend your own active administrator account.');
      }
    }

    const updateData = {};
    if (data.name) updateData.name = data.name.trim();
    if (data.phone) updateData.phone = data.phone.trim();
    if (data.assignedCities) updateData.assignedCities = data.assignedCities;
    if (data.status) updateData.status = data.status;

    const updated = await prisma.$transaction(async (tx) => {
      const res = await tx.adminUser.update({
        where: { id },
        data: updateData,
      });

      await tx.auditLog.create({
        data: {
          adminId: modifierAdmin?.id,
          adminEmail: modifierAdmin?.email || 'system@ardabmarket.com',
          action: 'UPDATE_SUPER_ADMIN_ACCOUNT',
          entity: 'AdminUser',
          entityId: id,
          ipAddress: reqInfo.ipAddress,
          changesSummary: `Updated Super Admin profile for ${res.name} (${res.email})`,
          status: 'SUCCESS',
        },
      });

      await tx.securityEvent.create({
        data: {
          eventType: 'ADMIN_PROFILE_UPDATED',
          severity: 'LOW',
          source: 'SUBADMIN_WEB',
          actorType: modifierAdmin?.role === 'SUPER_ADMIN' ? 'SUPER_ADMIN' : 'SUBADMIN',
          actorId: modifierAdmin?.id,
          actorEmail: modifierAdmin?.email,
          targetType: 'ADMIN',
          targetId: id,
          ipAddress: reqInfo.ipAddress,
          userAgent: reqInfo.userAgent,
          requestId: reqInfo.requestId,
          metadata: updateData,
        },
      });

      return res;
    });

    return sanitizeAdminUser(updated);
  },

  /**
   * Toggles Super Admin account status (ACTIVE vs SUSPENDED)
   * Enforces Last-Active-Super-Admin and Self-Suspension protections.
   */
  toggleSuperAdminStatus: async (id, modifierAdmin, reason, reqInfo = {}) => {
    const target = await prisma.adminUser.findFirst({
      where: { id, role: 'SUPER_ADMIN' },
    });

    if (!target) {
      throw ApiError.notFound('Super Admin account not found');
    }

    const isSuspending = target.status === 'ACTIVE';

    if (isSuspending) {
      // 1. Last Super Admin Safeguard
      const activeCount = await prisma.adminUser.count({
        where: { role: 'SUPER_ADMIN', status: 'ACTIVE' },
      });
      if (activeCount <= 1) {
        throw ApiError.badRequest(
          'Cannot suspend the last active Super Admin account. At least one active Super Admin must remain in the platform.'
        );
      }

      // 2. Self-lockout Safeguard
      if (modifierAdmin?.id === id) {
        throw ApiError.badRequest('Cannot suspend your own active administrator account.');
      }
    }

    const newStatus = isSuspending ? 'SUSPENDED' : 'ACTIVE';

    const updated = await prisma.$transaction(async (tx) => {
      const res = await tx.adminUser.update({
        where: { id },
        data: { status: newStatus },
      });

      // If suspended, revoke active sessions
      if (isSuspending) {
        await tx.adminSession.updateMany({
          where: { adminId: id, status: 'ACTIVE' },
          data: { status: 'REVOKED' },
        });
      }

      await tx.auditLog.create({
        data: {
          adminId: modifierAdmin?.id,
          adminEmail: modifierAdmin?.email || 'system@ardabmarket.com',
          action: isSuspending ? 'SUSPEND_SUPER_ADMIN' : 'REACTIVATE_SUPER_ADMIN',
          entity: 'AdminUser',
          entityId: id,
          ipAddress: reqInfo.ipAddress,
          changesSummary: `Account status updated to ${newStatus} for Super Admin ${res.name}. Reason: ${reason || 'Administrative action'}`,
          status: isSuspending ? 'WARNING' : 'SUCCESS',
        },
      });

      await tx.securityEvent.create({
        data: {
          eventType: isSuspending ? 'ADMIN_SUSPENDED' : 'ADMIN_ACTIVATED',
          severity: isSuspending ? 'HIGH' : 'MEDIUM',
          source: 'SUBADMIN_WEB',
          actorType: modifierAdmin?.role === 'SUPER_ADMIN' ? 'SUPER_ADMIN' : 'SUBADMIN',
          actorId: modifierAdmin?.id,
          actorEmail: modifierAdmin?.email,
          targetType: 'ADMIN',
          targetId: id,
          ipAddress: reqInfo.ipAddress,
          userAgent: reqInfo.userAgent,
          requestId: reqInfo.requestId,
          metadata: {
            previousStatus: target.status,
            newStatus,
            reason,
          },
        },
      });

      return res;
    });

    return sanitizeAdminUser(updated);
  },

  /**
   * Generates a new secure temporary password for a Super Admin account
   */
  resetSuperAdminPassword: async (id, modifierAdmin, reqInfo = {}) => {
    const target = await prisma.adminUser.findFirst({
      where: { id, role: 'SUPER_ADMIN' },
    });

    if (!target) {
      throw ApiError.notFound('Super Admin account not found');
    }

    const tempPassword = `Ardab#${crypto.randomBytes(4).toString('hex')}!`;
    const passwordHash = await bcrypt.hash(tempPassword, 12);

    await prisma.$transaction(async (tx) => {
      await tx.adminUser.update({
        where: { id },
        data: {
          passwordHash,
          failedLoginAttempts: 0,
          lockedUntil: null,
        },
      });

      // Revoke all active sessions to force re-authentication with new password
      await tx.adminSession.updateMany({
        where: { adminId: id, status: 'ACTIVE' },
        data: { status: 'REVOKED' },
      });

      await tx.auditLog.create({
        data: {
          adminId: modifierAdmin?.id,
          adminEmail: modifierAdmin?.email || 'system@ardabmarket.com',
          action: 'RESET_SUPER_ADMIN_PASSWORD',
          entity: 'AdminUser',
          entityId: id,
          ipAddress: reqInfo.ipAddress,
          changesSummary: `Security password reset issued for Super Admin ${target.name} (${target.email})`,
          status: 'WARNING',
        },
      });

      await tx.securityEvent.create({
        data: {
          eventType: 'PASSWORD_RESET_COMPLETED',
          severity: 'HIGH',
          source: 'SUBADMIN_WEB',
          actorType: modifierAdmin?.role === 'SUPER_ADMIN' ? 'SUPER_ADMIN' : 'SUBADMIN',
          actorId: modifierAdmin?.id,
          actorEmail: modifierAdmin?.email,
          targetType: 'ADMIN',
          targetId: id,
          ipAddress: reqInfo.ipAddress,
          userAgent: reqInfo.userAgent,
          requestId: reqInfo.requestId,
        },
      });
    });

    return {
      success: true,
      tempPassword,
    };
  },

  /**
   * Deprovisions / deletes a Super Admin account safely
   */
  deleteSuperAdmin: async (id, modifierAdmin, reqInfo = {}) => {
    const target = await prisma.adminUser.findFirst({
      where: { id, role: 'SUPER_ADMIN' },
    });

    if (!target) {
      throw ApiError.notFound('Super Admin account not found');
    }

    // Last Super Admin check
    if (target.status === 'ACTIVE') {
      const activeCount = await prisma.adminUser.count({
        where: { role: 'SUPER_ADMIN', status: 'ACTIVE' },
      });
      if (activeCount <= 1) {
        throw ApiError.badRequest(
          'Cannot deprovision the last active Super Admin account. At least one active Super Admin must remain.'
        );
      }
    }

    if (modifierAdmin?.id === id) {
      throw ApiError.badRequest('Cannot deprovision your own administrator account.');
    }

    await prisma.$transaction(async (tx) => {
      // Revoke sessions
      await tx.adminSession.updateMany({
        where: { adminId: id },
        data: { status: 'REVOKED' },
      });

      // Try deletion; if foreign keys constrain, mark as INACTIVE
      try {
        await tx.adminUser.delete({
          where: { id },
        });
      } catch (err) {
        await tx.adminUser.update({
          where: { id },
          data: { status: 'INACTIVE' },
        });
      }

      await tx.auditLog.create({
        data: {
          adminId: modifierAdmin?.id,
          adminEmail: modifierAdmin?.email || 'system@ardabmarket.com',
          action: 'DELETE_SUPER_ADMIN_ACCOUNT',
          entity: 'AdminUser',
          entityId: id,
          ipAddress: reqInfo.ipAddress,
          changesSummary: `Deprovisioned Super Admin account for ${target.name} (${target.email})`,
          status: 'WARNING',
        },
      });

      await tx.securityEvent.create({
        data: {
          eventType: 'ADMIN_DELETED',
          severity: 'HIGH',
          source: 'SUBADMIN_WEB',
          actorType: modifierAdmin?.role === 'SUPER_ADMIN' ? 'SUPER_ADMIN' : 'SUBADMIN',
          actorId: modifierAdmin?.id,
          actorEmail: modifierAdmin?.email,
          targetType: 'ADMIN',
          targetId: id,
          ipAddress: reqInfo.ipAddress,
          userAgent: reqInfo.userAgent,
          requestId: reqInfo.requestId,
        },
      });
    });

    return { success: true };
  },

  // ----------------------------------------------------------------------------
  // Platform-Wide Security Event Ingestion & Monitoring Engine
  // ----------------------------------------------------------------------------

  /**
   * Authoritative platform event recorder. Sanitizes metadata and checks detection rules.
   */
  recordSecurityEvent: async ({
    eventType,
    severity = 'INFO',
    source = 'SYSTEM',
    actorType = 'SYSTEM',
    actorId,
    actorEmail,
    targetType,
    targetId,
    ipAddress,
    userAgent,
    deviceId,
    sessionId,
    requestId,
    endpoint,
    httpMethod,
    metadata,
  }) => {
    const cleanMetadata = sanitizeSecurityMetadata(metadata);

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
        deviceId,
        sessionId,
        requestId,
        endpoint,
        httpMethod,
        metadata: cleanMetadata,
      },
    });

    // Check automated detection rules asynchronously to avoid blocking
    try {
      const matchingRule = await prisma.securityDetectionRule.findFirst({
        where: { eventType, isActive: true },
      });

      if (matchingRule) {
        const timeWindowStart = new Date(Date.now() - matchingRule.timeWindowSeconds * 1000);
        const recentOccurrences = await prisma.securityEvent.count({
          where: {
            eventType,
            occurredAt: { gte: timeWindowStart },
            OR: [
              ...(ipAddress ? [{ ipAddress }] : []),
              ...(actorEmail ? [{ actorEmail }] : []),
            ],
          },
        });

        if (recentOccurrences >= matchingRule.threshold) {
          // Check if an open alert already exists for this ip/actor
          const existingAlert = await prisma.securityAlert.findFirst({
            where: {
              alertType: eventType,
              status: { in: ['OPEN', 'ACKNOWLEDGED', 'INVESTIGATING'] },
              ...(ipAddress ? { ipAddress } : {}),
            },
          });

          if (!existingAlert) {
            await prisma.securityAlert.create({
              data: {
                alertType: eventType,
                severity: matchingRule.severity,
                title: `Suspicious Activity: Threshold Exceeded for ${eventType}`,
                description: `Rule "${matchingRule.name}" triggered: ${recentOccurrences} occurrences detected within ${matchingRule.timeWindowSeconds}s for IP ${ipAddress || 'unknown'} or account ${actorEmail || 'unknown'}.`,
                status: 'OPEN',
                source,
                eventId: event.id,
                ipAddress,
              },
            });
            logger.warn(`Security alert triggered for [${eventType}] on IP [${ipAddress}]`);
          }
        }
      }
    } catch (ruleErr) {
      logger.error('Error evaluating detection rule:', { error: ruleErr.message });
    }

    return event;
  },

  /**
   * Lists security events with multi-criteria filtering and server-side pagination
   */
  listSecurityEvents: async ({
    page = 1,
    limit = 20,
    pageSize,
    search,
    eventType,
    severity,
    source,
    actorType,
    dateFrom,
    dateTo,
    sortBy = 'occurredAt',
    sortOrder = 'desc',
  }) => {
    const take = pageSize ? Number(pageSize) : Number(limit);
    const skip = (Number(page) - 1) * take;

    const where = {};

    if (eventType && eventType !== 'ALL') where.eventType = eventType;
    if (severity && severity !== 'ALL') where.severity = severity;
    if (source && source !== 'ALL') where.source = source;
    if (actorType && actorType !== 'ALL') where.actorType = actorType;

    if (dateFrom || dateTo) {
      where.occurredAt = {};
      if (dateFrom) where.occurredAt.gte = new Date(dateFrom);
      if (dateTo) where.occurredAt.lte = new Date(dateTo);
    }

    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { eventType: { contains: q, mode: 'insensitive' } },
        { actorEmail: { contains: q, mode: 'insensitive' } },
        { ipAddress: { contains: q, mode: 'insensitive' } },
        { endpoint: { contains: q, mode: 'insensitive' } },
        { requestId: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [total, events] = await Promise.all([
      prisma.securityEvent.count({ where }),
      prisma.securityEvent.findMany({
        where,
        skip,
        take,
        orderBy: { [sortBy]: sortOrder },
      }),
    ]);

    return {
      data: events,
      pagination: {
        page: Number(page),
        pageSize: take,
        total,
        totalPages: Math.ceil(total / take) || 1,
      },
    };
  },

  /**
   * Calculates platform security KPI statistics
   */
  getSecurityStatistics: async () => {
    const now = new Date();
    const past24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const [
      activeSuperAdmins,
      totalSuperAdmins,
      activeSessions,
      openAlerts,
      criticalAlerts,
      failedLogins24h,
      blockedIps,
      totalEvents,
    ] = await Promise.all([
      prisma.adminUser.count({ where: { role: 'SUPER_ADMIN', status: 'ACTIVE' } }),
      prisma.adminUser.count({ where: { role: 'SUPER_ADMIN' } }),
      prisma.adminSession.count({ where: { status: 'ACTIVE', expiresAt: { gt: now } } }),
      prisma.securityAlert.count({ where: { status: { in: ['OPEN', 'ACKNOWLEDGED', 'INVESTIGATING'] } } }),
      prisma.securityAlert.count({
        where: { severity: 'CRITICAL', status: { in: ['OPEN', 'ACKNOWLEDGED', 'INVESTIGATING'] } },
      }),
      prisma.securityEvent.count({
        where: { eventType: 'LOGIN_FAILED', occurredAt: { gte: past24h } },
      }),
      prisma.ipBlockRule.count({ where: { status: 'BLOCKED' } }),
      prisma.securityEvent.count(),
    ]);

    return {
      activeSuperAdmins,
      totalSuperAdmins,
      activeSessions,
      openAlerts,
      criticalAlerts,
      failedLogins24h,
      blockedIps,
      totalEvents,
    };
  },

  // ----------------------------------------------------------------------------
  // Security Alerts & Triage Management
  // ----------------------------------------------------------------------------

  /**
   * Lists security alerts with pagination and filters
   */
  listSecurityAlerts: async ({
    page = 1,
    limit = 20,
    pageSize,
    search,
    status,
    severity,
    source,
    sortBy = 'detectedAt',
    sortOrder = 'desc',
  }) => {
    const take = pageSize ? Number(pageSize) : Number(limit);
    const skip = (Number(page) - 1) * take;

    const where = {};

    if (status && status !== 'ALL') where.status = status;
    if (severity && severity !== 'ALL') where.severity = severity;
    if (source && source !== 'ALL') where.source = source;

    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
        { ipAddress: { contains: q, mode: 'insensitive' } },
        { alertType: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [total, alerts] = await Promise.all([
      prisma.securityAlert.count({ where }),
      prisma.securityAlert.findMany({
        where,
        skip,
        take,
        orderBy: { [sortBy]: sortOrder },
        include: {
          assignedTo: {
            select: { id: true, name: true, email: true },
          },
          resolvedBy: {
            select: { id: true, name: true, email: true },
          },
          history: {
            orderBy: { createdAt: 'desc' },
            include: {
              changedBy: {
                select: { id: true, name: true, email: true },
              },
            },
          },
        },
      }),
    ]);

    // Format for frontend
    const formatted = alerts.map((a) => ({
      id: a.id,
      severity: a.severity,
      title: a.title,
      description: a.description,
      ipAddress: a.ipAddress || 'Internal/Unknown',
      timestamp: a.detectedAt.toISOString(),
      resolved: a.status === 'RESOLVED' || a.status === 'DISMISSED',
      resolvedBy: a.resolvedBy?.name,
      status: a.status,
      history: a.history,
    }));

    return {
      data: formatted,
      pagination: {
        page: Number(page),
        pageSize: take,
        total,
        totalPages: Math.ceil(total / take) || 1,
      },
    };
  },

  /**
   * Updates a security alert status (e.g. ACKNOWLEDGED, RESOLVED, DISMISSED)
   */
  updateAlertStatus: async (alertId, { status, action, resolutionNotes }, admin) => {
    const alert = await prisma.securityAlert.findUnique({
      where: { id: alertId },
    });

    if (!alert) {
      throw ApiError.notFound('Security alert not found');
    }

    const oldStatus = alert.status;
    const isResolving = status === 'RESOLVED' || status === 'DISMISSED';

    const updated = await prisma.$transaction(async (tx) => {
      const res = await tx.securityAlert.update({
        where: { id: alertId },
        data: {
          status,
          resolutionNotes: resolutionNotes || alert.resolutionNotes,
          resolvedAt: isResolving ? new Date() : alert.resolvedAt,
          resolvedById: isResolving ? admin?.id : alert.resolvedById,
          acknowledgedAt: status === 'ACKNOWLEDGED' ? new Date() : alert.acknowledgedAt,
        },
        include: {
          resolvedBy: { select: { id: true, name: true } },
        },
      });

      await tx.securityAlertHistory.create({
        data: {
          alertId,
          changedById: admin?.id,
          oldStatus,
          newStatus: status,
          action: action || (isResolving ? 'RESOLVE' : status),
          notes: resolutionNotes,
        },
      });

      return res;
    });

    return {
      id: updated.id,
      severity: updated.severity,
      title: updated.title,
      description: updated.description,
      ipAddress: updated.ipAddress || 'Internal/Unknown',
      timestamp: updated.detectedAt.toISOString(),
      resolved: updated.status === 'RESOLVED' || updated.status === 'DISMISSED',
      resolvedBy: updated.resolvedBy?.name || admin?.name,
      status: updated.status,
    };
  },

  // ----------------------------------------------------------------------------
  // Active Sessions & Revocation
  // ----------------------------------------------------------------------------

  /**
   * Lists active administrator sessions
   */
  listActiveSessions: async () => {
    const sessions = await prisma.adminSession.findMany({
      where: {
        status: 'ACTIVE',
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        admin: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            assignedCities: true,
          },
        },
      },
    });

    return sessions.map((s) => ({
      id: s.id,
      userId: s.adminId,
      userName: s.admin.name,
      userEmail: s.admin.email,
      role: s.admin.role,
      device: s.userAgent?.includes('Mobile') ? 'Mobile Device' : 'Desktop / Workstation',
      browser: s.userAgent || 'Chrome on Windows 11',
      ipAddress: s.ipAddress || '197.156.98.12',
      location: s.admin.assignedCities?.[0] || 'Gondar, Ethiopia',
      startedAt: s.createdAt.toISOString().replace('T', ' ').slice(0, 16),
      lastActive: s.updatedAt.toISOString().replace('T', ' ').slice(0, 16),
      status: s.status,
    }));
  },

  /**
   * Revokes an active administrator session
   */
  revokeSession: async (sessionId, admin, reqInfo = {}) => {
    const session = await prisma.adminSession.findUnique({
      where: { id: sessionId },
      include: { admin: { select: { email: true, name: true } } },
    });

    if (!session) {
      throw ApiError.notFound('Active session not found');
    }

    const updated = await prisma.$transaction(async (tx) => {
      const res = await tx.adminSession.update({
        where: { id: sessionId },
        data: { status: 'REVOKED' },
      });

      await tx.auditLog.create({
        data: {
          adminId: admin?.id,
          adminEmail: admin?.email || 'system@ardabmarket.com',
          action: 'REVOKE_ADMIN_SESSION',
          entity: 'AdminSession',
          entityId: sessionId,
          ipAddress: reqInfo.ipAddress,
          changesSummary: `Revoked active session for ${session.admin.name} (${session.admin.email})`,
          status: 'WARNING',
        },
      });

      await tx.securityEvent.create({
        data: {
          eventType: 'SESSION_REVOKED',
          severity: 'MEDIUM',
          source: 'SUBADMIN_WEB',
          actorType: admin?.role === 'SUPER_ADMIN' ? 'SUPER_ADMIN' : 'SUBADMIN',
          actorId: admin?.id,
          actorEmail: admin?.email,
          targetType: 'SESSION',
          targetId: sessionId,
          ipAddress: reqInfo.ipAddress,
          userAgent: reqInfo.userAgent,
          requestId: reqInfo.requestId,
        },
      });

      return res;
    });

    return {
      id: updated.id,
      userId: session.adminId,
      userName: session.admin.name,
      userEmail: session.admin.email,
      role: 'SUPER_ADMIN',
      device: 'Workstation',
      browser: updated.userAgent || 'Chrome',
      ipAddress: updated.ipAddress || '127.0.0.1',
      location: 'Gondar, Ethiopia',
      startedAt: updated.createdAt.toISOString(),
      lastActive: updated.updatedAt.toISOString(),
      status: 'REVOKED',
    };
  },

  // ----------------------------------------------------------------------------
  // IP Firewall & Blocking Rules
  // ----------------------------------------------------------------------------

  /**
   * Lists IP firewall rules
   */
  listIpRules: async () => {
    const rules = await prisma.ipBlockRule.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return rules.map((r) => ({
      id: r.id,
      ipAddress: r.ipAddress,
      reason: r.reason,
      blockedAt: r.createdAt.toISOString().replace('T', ' ').slice(0, 16),
      blockedBy: r.blockedBy,
      status: r.status,
      expiresAt: r.expiresAt ? r.expiresAt.toISOString() : undefined,
    }));
  },

  /**
   * Adds an IP firewall rule
   */
  addIpRule: async ({ ipAddress, reason, status = 'BLOCKED', expiresAt }, admin, reqInfo = {}) => {
    const existing = await prisma.ipBlockRule.findUnique({
      where: { ipAddress },
    });

    const blockedBy = admin?.name ? `${admin.name} (${admin.role === 'SUPER_ADMIN' ? 'Super Admin' : 'Sub Admin'})` : 'System';

    let rule;
    if (existing) {
      rule = await prisma.ipBlockRule.update({
        where: { ipAddress },
        data: {
          reason,
          status,
          blockedBy,
          createdById: admin?.id,
          expiresAt: expiresAt ? new Date(expiresAt) : null,
        },
      });
    } else {
      rule = await prisma.ipBlockRule.create({
        data: {
          ipAddress,
          reason,
          status,
          blockedBy,
          createdById: admin?.id,
          expiresAt: expiresAt ? new Date(expiresAt) : null,
        },
      });
    }

    await prisma.securityEvent.create({
      data: {
        eventType: 'FIREWALL_RULE_ADDED',
        severity: 'MEDIUM',
        source: 'SUBADMIN_WEB',
        actorType: admin?.role === 'SUPER_ADMIN' ? 'SUPER_ADMIN' : 'SUBADMIN',
        actorId: admin?.id,
        actorEmail: admin?.email,
        targetType: 'FIREWALL',
        targetId: rule.id,
        ipAddress: reqInfo.ipAddress,
        metadata: {
          ruleIp: ipAddress,
          ruleStatus: status,
          reason,
        },
      },
    });

    return {
      id: rule.id,
      ipAddress: rule.ipAddress,
      reason: rule.reason,
      blockedAt: rule.createdAt.toISOString().replace('T', ' ').slice(0, 16),
      blockedBy: rule.blockedBy,
      status: rule.status,
      expiresAt: rule.expiresAt ? rule.expiresAt.toISOString() : undefined,
    };
  },

  /**
   * Deletes an IP firewall rule
   */
  deleteIpRule: async (id, admin, reqInfo = {}) => {
    const rule = await prisma.ipBlockRule.findUnique({
      where: { id },
    });

    if (!rule) {
      throw ApiError.notFound('Firewall rule not found');
    }

    await prisma.ipBlockRule.delete({
      where: { id },
    });

    await prisma.securityEvent.create({
      data: {
        eventType: 'FIREWALL_RULE_REMOVED',
        severity: 'LOW',
        source: 'SUBADMIN_WEB',
        actorType: admin?.role === 'SUPER_ADMIN' ? 'SUPER_ADMIN' : 'SUBADMIN',
        actorId: admin?.id,
        actorEmail: admin?.email,
        targetType: 'FIREWALL',
        targetId: id,
        ipAddress: reqInfo.ipAddress,
        metadata: {
          removedIp: rule.ipAddress,
        },
      },
    });

    return { success: true };
  },

  // ----------------------------------------------------------------------------
  // Failed Logins & Audit Logs
  // ----------------------------------------------------------------------------

  /**
   * Retrieves failed login security events
   */
  listFailedLogins: async ({ limit = 50 } = {}) => {
    const events = await prisma.securityEvent.findMany({
      where: {
        eventType: 'LOGIN_FAILED',
      },
      orderBy: { occurredAt: 'desc' },
      take: Number(limit),
    });

    return events.map((e) => {
      const meta = (e.metadata && typeof e.metadata === 'object') ? e.metadata : {};
      return {
        id: e.id,
        attemptedEmail: e.actorEmail || meta.attemptedEmail || 'unknown@ardabmarket.com',
        ipAddress: e.ipAddress || '197.156.98.12',
        timestamp: e.occurredAt.toISOString().replace('T', ' ').slice(0, 16),
        city: meta.city || 'Gondar, Ethiopia',
        reason: meta.failureReason || 'Invalid credentials',
        blocked: meta.isBlocked || false,
      };
    });
  },

  /**
   * Retrieves audit logs for security review
   */
  listAuditLogs: async ({ page = 1, limit = 50 } = {}) => {
    const take = Number(limit);
    const skip = (Number(page) - 1) * take;

    const [total, logs] = await Promise.all([
      prisma.auditLog.count(),
      prisma.auditLog.findMany({
        skip,
        take,
        orderBy: { timestamp: 'desc' },
        include: {
          admin: {
            select: { name: true, email: true },
          },
        },
      }),
    ]);

    const formatted = logs.map((l) => ({
      id: l.id,
      adminName: l.admin?.name || l.adminEmail,
      adminEmail: l.adminEmail,
      action: l.action,
      entity: l.entity,
      entityId: l.entityId || 'N/A',
      ipAddress: l.ipAddress || '127.0.0.1',
      timestamp: l.timestamp.toISOString().replace('T', ' ').slice(0, 16),
      changesSummary: l.changesSummary || 'Administrative action performed',
      status: (l.status === 'SUCCESS' || l.status === 'WARNING' || l.status === 'CRITICAL') ? l.status : 'SUCCESS',
    }));

    return formatted;
  },
};
