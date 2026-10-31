// ==============================================================================
// Ardab Market - Agent Integration Request & Notification Aggregation Service
// ==============================================================================
// Enforces:
// 1. Strict one-active-agent-per-customer rule (DB-enforced and transaction-safe)
// 2. Lookup against verified active agent registry (returns "Unknown agent" for missing/inactive)
// 3. Concurrency-safe atomic approval and rejection
// 4. One aggregate notification per agent for pending requests
// ==============================================================================

import { prisma } from '../../shared/config/database.js';
import { ApiError } from '../../shared/utils/apiResponse.js';
import { logger } from '../../shared/utils/logger.js';
import { EmailService } from '../../shared/services/email/email.service.js';
import { normalizeEmail } from './agent.service.js';

/**
 * Creates or retrieves customer integration request
 */
export async function createIntegrationRequest(customerId, agentEmail) {
  const normalizedEmail = normalizeEmail(agentEmail);

  if (!normalizedEmail) {
    throw ApiError.badRequest('Please provide a valid agent email address.', 'INVALID_EMAIL');
  }

  // 1. Verify against authorized agent registry
  const agent = await prisma.agent.findFirst({
    where: {
      email: { equals: normalizedEmail, mode: 'insensitive' },
    },
  });

  if (!agent) {
    throw ApiError.notFound(
      'Unknown agent. Please check the email address and try again.',
      'UNKNOWN_AGENT'
    );
  }

  if (agent.status !== 'ACTIVE') {
    throw ApiError.badRequest(
      'This agent is currently inactive and cannot accept new connections.',
      'AGENT_INACTIVE'
    );
  }

  // 2. Check if customer already has an active approved relationship
  const currentRelationship = await prisma.customerAgentRelationship.findUnique({
    where: { customerId },
    include: {
      agent: {
        select: { id: true, name: true, email: true, phone: true, status: true },
      },
    },
  });

  if (currentRelationship) {
    throw ApiError.badRequest(
      'You already have an approved agent. Only one active integration is allowed at a time.',
      'ALREADY_INTEGRATED'
    );
  }

  // 3. Check for existing PENDING request to prevent duplicate submissions
  const existingPending = await prisma.agentIntegrationRequest.findFirst({
    where: {
      customerId,
      status: 'PENDING',
    },
    include: {
      agent: {
        select: { id: true, name: true, email: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (existingPending) {
    return {
      status: 'PENDING',
      isNew: false,
      message: 'Your agent integration request is awaiting admin confirmation.',
      requestId: existingPending.id,
      agentName: existingPending.agent.name,
      requestDate: existingPending.createdAt,
      request: existingPending,
      agent: {
        id: existingPending.agent.id,
        name: existingPending.agent.name,
        email: existingPending.agent.email,
      },
    };
  }

  // 4. Create new pending integration request
  const newRequest = await prisma.agentIntegrationRequest.create({
    data: {
      customerId,
      agentId: agent.id,
      status: 'PENDING',
    },
    include: {
      customer: {
        select: { id: true, fullName: true, customerCode: true, phone: true },
      },
      agent: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  // 5. Update or create aggregate notification for Super Admin
  await syncAggregateAgentNotification(agent.id, agent.name);

  logger.info(`[IntegrationRequest] Customer ${customerId} requested integration with Agent ${agent.id}`);

  return {
    status: 'PENDING',
    isNew: true,
    message: 'Your agent integration request is awaiting admin confirmation.',
    requestId: newRequest.id,
    agentName: agent.name,
    requestDate: newRequest.createdAt,
    request: newRequest,
    agent: {
      id: agent.id,
      name: agent.name,
      email: agent.email,
    },
  };
}

/**
 * Returns current customer integration state
 */
export async function getCustomerIntegrationState(customerId) {
  // 1. Check for active approved relationship
  const relationship = await prisma.customerAgentRelationship.findUnique({
    where: { customerId },
    include: {
      agent: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          status: true,
        },
      },
    },
  });

  if (relationship && relationship.agent) {
    return {
      status: 'APPROVED',
      agent: {
        id: relationship.agent.id,
        name: relationship.agent.name,
        email: relationship.agent.email,
        phone: relationship.agent.phone,
        status: relationship.agent.status,
        connectedAt: relationship.approvedAt,
      },
    };
  }

  // 2. Check for latest request (PENDING or REJECTED)
  const latestRequest = await prisma.agentIntegrationRequest.findFirst({
    where: { customerId },
    orderBy: { createdAt: 'desc' },
    include: {
      agent: {
        select: { name: true, email: true },
      },
    },
  });

  if (latestRequest) {
    if (latestRequest.status === 'PENDING') {
      return {
        status: 'PENDING',
        requestId: latestRequest.id,
        agentName: latestRequest.agent?.name || 'Ardab Market Agent',
        requestDate: latestRequest.createdAt,
        agent: latestRequest.agent,
        request: latestRequest,
      };
    }

    if (latestRequest.status === 'REJECTED') {
      return {
        status: 'REJECTED',
        requestId: latestRequest.id,
        agentName: latestRequest.agent?.name || 'Ardab Market Agent',
        requestDate: latestRequest.createdAt,
        rejectionReason: latestRequest.rejectionReason,
        agent: latestRequest.agent,
        request: latestRequest,
      };
    }
  }

  return {
    status: 'NONE',
  };
}

/**
 * Lists integration requests for Super Admin review
 */
export async function listIntegrationRequests({
  page = 1,
  limit = 20,
  status = null,
  agentId = null,
  search = '',
}) {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const skip = (pageNum - 1) * limitNum;

  const where = {};

  if (status && ['PENDING', 'APPROVED', 'REJECTED', 'REVOKED'].includes(status.toUpperCase())) {
    where.status = status.toUpperCase();
  }

  if (agentId) {
    where.agentId = agentId;
  }

  if (search && search.trim()) {
    const s = search.trim();
    where.OR = [
      { agent: { name: { contains: s, mode: 'insensitive' } } },
      { agent: { email: { contains: s, mode: 'insensitive' } } },
      { customer: { fullName: { contains: s, mode: 'insensitive' } } },
      { customer: { customerCode: { contains: s, mode: 'insensitive' } } },
      { customer: { phone: { contains: s } } },
    ];
  }

  const [total, pendingTotal, rawRequests] = await Promise.all([
    prisma.agentIntegrationRequest.count({ where }),
    prisma.agentIntegrationRequest.count({ where: { status: 'PENDING' } }),
    prisma.agentIntegrationRequest.findMany({
      where,
      skip,
      take: limitNum,
      orderBy: { createdAt: 'desc' },
      include: {
        customer: {
          select: {
            id: true,
            customerCode: true,
            fullName: true,
            phone: true,
            city: true,
          },
        },
        agent: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            status: true,
          },
        },
        reviewedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    }),
  ]);

  const requests = rawRequests.map((r) => ({
    id: r.id,
    customerId: r.customerId,
    customer: r.customer,
    agentId: r.agentId,
    agent: r.agent,
    status: r.status,
    rejectionReason: r.rejectionReason,
    reviewedBy: r.reviewedBy,
    reviewedAt: r.reviewedAt,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  }));

  return {
    requests,
    pendingTotal,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    },
  };
}

/**
 * Concurrency-safe atomic approval of an integration request
 */
export async function approveIntegrationRequest(requestId, adminUser) {
  return await prisma
    .$transaction(
      async (tx) => {
        // 1. Fetch request with row lock intention
        const req = await tx.agentIntegrationRequest.findUnique({
          where: { id: requestId },
          include: {
            agent: true,
            customer: true,
          },
        });

        if (!req) {
          throw ApiError.notFound('Integration request not found.');
        }

        if (req.status !== 'PENDING') {
          throw ApiError.badRequest(
            `Cannot approve request with current status "${req.status}". Only PENDING requests can be approved.`,
            'REQUEST_NOT_PENDING'
          );
        }

        if (!req.agent) {
          throw ApiError.badRequest('The requested agent record no longer exists.', 'AGENT_NOT_FOUND');
        }

        const now = new Date();

        // 2. Ensure customer has at most ONE active approved relationship
        // If an existing relationship exists, replace it atomically
        await tx.customerAgentRelationship.deleteMany({
          where: { customerId: req.customerId },
        });

        // 3. Create current active relationship
        const relationship = await tx.customerAgentRelationship.create({
          data: {
            customerId: req.customerId,
            agentId: req.agentId,
            requestId: req.id,
            approvedById: adminUser.id,
            approvedAt: now,
          },
        });

        // 4. Update request status to APPROVED
        const updatedRequest = await tx.agentIntegrationRequest.update({
          where: { id: requestId },
          data: {
            status: 'APPROVED',
            reviewedById: adminUser.id,
            reviewedAt: now,
          },
          include: {
            agent: { select: { id: true, name: true, email: true, phone: true } },
            customer: { select: { id: true, fullName: true, customerCode: true } },
          },
        });

        // 5. Create in-app AgentNotification record (also serves as notification tracking / outbox)
        const notification = await tx.agentNotification.create({
          data: {
            agentId: req.agentId,
            type: 'CUSTOMER_INTEGRATION_APPROVED',
            title: 'Customer Integration Approved',
            message: `Customer ${req.customer?.fullName || 'A customer'} (${req.customer?.customerCode || 'N/A'}) has been connected to your agent profile.`,
            metadata: JSON.stringify({
              requestId: req.id,
              customerId: req.customerId,
              customerName: req.customer?.fullName || 'Valued Customer',
              customerCode: req.customer?.customerCode,
              approvedAt: now.toISOString(),
              emailDeliveryStatus: 'PENDING',
              attempts: 0,
            }),
          },
        });

        // 6. Audit Log
        await tx.auditLog.create({
          data: {
            adminId: adminUser.id,
            adminEmail: adminUser.email || 'superadmin@ardabmarket.com',
            action: 'AGENT_REQUEST_APPROVED',
            entity: 'AgentIntegrationRequest',
            entityId: requestId,
            changesSummary: `Approved integration between Customer "${req.customer?.fullName || req.customerId}" and Agent "${req.agent.name}".`,
            status: 'SUCCESS',
          },
        });

        return {
          request: updatedRequest,
          relationship,
          notification,
          agentEmail: req.agent.email,
          agentName: req.agent.name,
          customerName: req.customer?.fullName || 'Valued Customer',
          customerCode: req.customer?.customerCode,
          approvedAt: now,
        };
      },
      { maxWait: 15000, timeout: 25000 }
    )
    .then(async (res) => {
      // 7. Reconcile aggregate notification for this agent
      await syncAggregateAgentNotification(res.request.agent.id, res.request.agent.name).catch((err) => {
        logger.warn(`Failed to sync aggregate notification for agent ${res.request.agent.id}: ${err.message}`);
      });

      // 8. Reliable post-commit email notification
      let emailResult = { success: false, status: 'PENDING' };
      try {
        emailResult = await sendAgentApprovalEmailSafely({
          notificationId: res.notification?.id,
          agentEmail: res.agentEmail,
          agentName: res.agentName,
          customerName: res.customerName,
          customerCode: res.customerCode,
          approvedAt: res.approvedAt,
        });
      } catch (emailErr) {
        logger.error(`[AgentApprovalEmail] Post-commit email dispatch failed: ${emailErr.message}`, {
          requestId,
          agentEmail: res.agentEmail,
        });
        emailResult = { success: false, status: 'FAILED', error: emailErr.message };
      }

      return {
        request: res.request,
        relationship: res.relationship,
        notification: res.notification,
        notificationStatus: emailResult.status,
      };
    });
}

/**
 * Safely dispatches the approval notification email to the agent's registered email.
 * This runs AFTER the database transaction has committed, ensuring the integration
 * state is never dependent on external email network status.
 */
export async function sendAgentApprovalEmailSafely({
  notificationId,
  agentEmail,
  agentName,
  customerName,
  customerCode,
  approvedAt,
}) {
  if (!agentEmail) {
    logger.warn(`[AgentApprovalEmail] No authoritative email found for agent in notification ${notificationId}`);
    return { success: false, status: 'SKIPPED_NO_EMAIL' };
  }

  try {
    const result = await EmailService.sendAgentIntegrationApprovedEmail({
      toEmail: agentEmail,
      agentName,
      customerName,
      customerCode,
      approvedAt,
    });

    const isSuccess = !!result?.success;
    const deliveryStatus = isSuccess ? 'DELIVERED' : 'FAILED';

    if (notificationId) {
      await prisma.agentNotification
        .update({
          where: { id: notificationId },
          data: {
            metadata: JSON.stringify({
              emailDeliveryStatus: deliveryStatus,
              messageId: result?.messageId || null,
              attempts: 1,
              deliveredAt: isSuccess ? new Date().toISOString() : null,
              lastAttemptAt: new Date().toISOString(),
              error: result?.error || null,
            }),
          },
        })
        .catch((updateErr) => {
          logger.warn(`[AgentApprovalEmail] Failed to update AgentNotification delivery status: ${updateErr.message}`);
        });
    }

    if (!isSuccess) {
      logger.warn(
        `[AgentApprovalEmail] Email provider did not accept message for ${agentEmail}: ${result?.error || 'Provider rejected'}`
      );
    } else {
      logger.info(`[AgentApprovalEmail] Approval email delivered successfully to ${agentEmail}`);
    }

    return {
      success: isSuccess,
      status: deliveryStatus,
      messageId: result?.messageId,
      error: result?.error,
    };
  } catch (err) {
    logger.error(`[AgentApprovalEmail] Error dispatching email to ${agentEmail}: ${err.message}`);

    if (notificationId) {
      await prisma.agentNotification
        .update({
          where: { id: notificationId },
          data: {
            metadata: JSON.stringify({
              emailDeliveryStatus: 'FAILED',
              attempts: 1,
              lastAttemptAt: new Date().toISOString(),
              error: err.message,
            }),
          },
        })
        .catch(() => {});
    }

    return {
      success: false,
      status: 'FAILED',
      error: err.message,
    };
  }
}

/**
 * Retries failed agent approval email notifications safely with backoff
 */
export async function retryPendingAgentApprovalEmails(maxRetries = 3) {
  const pendingNotifications = await prisma.agentNotification.findMany({
    where: {
      type: 'CUSTOMER_INTEGRATION_APPROVED',
      metadata: { contains: '"emailDeliveryStatus":"FAILED"' },
    },
    include: {
      agent: { select: { id: true, name: true, email: true } },
    },
    take: 10,
  });

  const results = [];
  for (const notif of pendingNotifications) {
    try {
      let meta = {};
      try {
        meta = JSON.parse(notif.metadata || '{}');
      } catch {}
      const attempts = meta.attempts || 0;
      if (attempts >= maxRetries) {
        continue;
      }

      const res = await sendAgentApprovalEmailSafely({
        notificationId: notif.id,
        agentEmail: notif.agent.email,
        agentName: notif.agent.name,
        customerName: meta.customerName || 'Valued Customer',
        customerCode: meta.customerCode,
        approvedAt: meta.approvedAt,
      });
      results.push({ notificationId: notif.id, result: res });
    } catch (e) {
      logger.error(`Error retrying email for notification ${notif.id}: ${e.message}`);
    }
  }
  return results;
}

/**
 * Concurrency-safe atomic rejection of an integration request
 */
export async function rejectIntegrationRequest(requestId, rejectionReason = null, adminUser) {
  return await prisma
    .$transaction(
      async (tx) => {
        const req = await tx.agentIntegrationRequest.findUnique({
          where: { id: requestId },
          include: {
            agent: true,
            customer: true,
          },
        });

        if (!req) {
          throw ApiError.notFound('Integration request not found.');
        }

        if (req.status !== 'PENDING') {
          throw ApiError.badRequest(
            `Cannot reject request with status "${req.status}". Only PENDING requests can be rejected.`,
            'REQUEST_NOT_PENDING'
          );
        }

        const now = new Date();

        const updatedRequest = await tx.agentIntegrationRequest.update({
          where: { id: requestId },
          data: {
            status: 'REJECTED',
            rejectionReason: rejectionReason ? rejectionReason.trim() : null,
            reviewedById: adminUser.id,
            reviewedAt: now,
          },
          include: {
            agent: { select: { id: true, name: true, email: true } },
            customer: { select: { id: true, fullName: true, customerCode: true } },
          },
        });

        // Audit Log
        await tx.auditLog.create({
          data: {
            adminId: adminUser.id,
            adminEmail: adminUser.email || 'superadmin@ardabmarket.com',
            action: 'AGENT_REQUEST_REJECTED',
            entity: 'AgentIntegrationRequest',
            entityId: requestId,
            changesSummary: `Rejected integration request for Customer "${req.customer.fullName}" to Agent "${req.agent.name}". Reason: ${rejectionReason || 'None specified'}.`,
            status: 'SUCCESS',
          },
        });

        return updatedRequest;
      },
      { maxWait: 15000, timeout: 25000 }
    )
    .then(async (res) => {
      // Reconcile aggregate notification
      await syncAggregateAgentNotification(res.agent.id, res.agent.name);
    return res;
  });
}

/**
 * Maintains ONE aggregate notification per agent for pending requests (Section 6)
 */
export async function syncAggregateAgentNotification(agentId, agentName) {
  try {
    const pendingCount = await prisma.agentIntegrationRequest.count({
      where: {
        agentId,
        status: 'PENDING',
      },
    });

    const aggregateTitle = `Agent Integration Requests: ${agentName}`;
    const entityType = 'AGENT_INTEGRATION_REQUEST';

    // Find existing aggregate notification for this agent
    const existingNotification = await prisma.notification.findFirst({
      where: {
        entityType,
        entityId: agentId,
        isActive: true,
      },
    });

    if (pendingCount > 0) {
      const message = `${pendingCount} customer${pendingCount === 1 ? ' has' : 's have'} requested integration with Agent ${agentName}.`;

      if (existingNotification) {
        // Update existing notification to prevent spamming
        await prisma.notification.update({
          where: { id: existingNotification.id },
          data: {
            title: aggregateTitle,
            message,
            metadata: JSON.stringify({ agentId, agentName, pendingCount, lastUpdated: new Date().toISOString() }),
            updatedAt: new Date(),
          },
        });
      } else {
        // Create new aggregate notification
        await prisma.notification.create({
          data: {
            type: 'OPERATIONAL_ALERT',
            category: 'CUSTOMER',
            severity: 'INFO',
            priority: 'NORMAL',
            isAlert: true,
            title: aggregateTitle,
            message,
            entityType,
            entityId: agentId,
            actionUrl: `/agents?tab=requests&agentId=${agentId}`,
            metadata: JSON.stringify({ agentId, agentName, pendingCount, createdAt: new Date().toISOString() }),
            targetRole: 'SUPER_ADMIN',
            isActive: true,
          },
        });
      }
    } else if (existingNotification) {
      // If count reached 0, mark aggregate notification inactive
      await prisma.notification.update({
        where: { id: existingNotification.id },
        data: {
          isActive: false,
          metadata: JSON.stringify({ agentId, agentName, pendingCount: 0, resolvedAt: new Date().toISOString() }),
        },
      });
    }
  } catch (err) {
    logger.warn(`[AggregateNotification] Error syncing notification for agent ${agentId}:`, err);
  }
}
