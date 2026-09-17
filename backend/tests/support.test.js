// ==============================================================================
// Ardab Market - Customer Support Module Integration Test Suite
// ==============================================================================

import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/shared/config/database.js';
import { generateAdminToken } from '../src/admin/services/auth.service.js';
import { ADMIN_ROLES } from '../src/admin/constants/adminRoles.js';

const app = createApp();

// Retrieve seeded admins from Neon PostgreSQL for genuine FK references
let seededSuperAdmin = await prisma.adminUser.findUnique({
  where: { email: 'admin@ardabmarket.com' },
});
if (!seededSuperAdmin) {
  seededSuperAdmin = await prisma.adminUser.findFirst({
    where: { role: ADMIN_ROLES.SUPER_ADMIN },
  });
}

let seededSubAdmin = await prisma.adminUser.findUnique({
  where: { email: 'ashurack664@gmail.com' },
});
if (!seededSubAdmin) {
  seededSubAdmin = await prisma.adminUser.findFirst({
    where: { role: ADMIN_ROLES.SUB_ADMIN },
  });
}

const superAdminToken = generateAdminToken({
  id: seededSuperAdmin ? seededSuperAdmin.id : 'df61c5d7-3f2d-40e3-aea6-6b527a6d353a',
  email: seededSuperAdmin ? seededSuperAdmin.email : 'admin@ardabmarket.com',
  name: seededSuperAdmin ? seededSuperAdmin.name : 'Super Admin',
  role: ADMIN_ROLES.SUPER_ADMIN,
});

const subAdminToken = generateAdminToken({
  id: seededSubAdmin ? seededSubAdmin.id : 'subadmin-uuid-1',
  email: seededSubAdmin ? seededSubAdmin.email : 'ashurack664@gmail.com',
  name: seededSubAdmin ? seededSubAdmin.name : 'Sub Admin',
  role: ADMIN_ROLES.SUB_ADMIN,
});

const dispatcherToken = generateAdminToken({
  id: 'mock-dispatcher-id',
  email: 'dispatcher@ardabmarket.com',
  name: 'Dispatcher User',
  role: ADMIN_ROLES.DISPATCHER,
});

// Create or find a test customer for support tickets
let testCustomer = await prisma.customer.findFirst({
  where: { email: 'support.tester@ardabtest.com' },
});
if (!testCustomer) {
  testCustomer = await prisma.customer.create({
    data: {
      customerCode: `CUST-99${Date.now().toString().slice(-4)}`,
      fullName: 'Test Support Customer',
      phone: `+2519${Date.now().toString().slice(-8)}`,
      email: 'support.tester@ardabtest.com',
      city: 'Gondar',
      status: 'ACTIVE',
    },
  });
}

test('Customer Support Module Test Suite', async (suite) => {
  let testTicketId = null;
  let testTicketCode = null;
  let testEmailLogId = null;

  suite.after(async () => {
    try {
      if (testCustomer) {
        const tickets = await prisma.supportTicket.findMany({
          where: { customerId: testCustomer.id },
          select: { id: true },
        });
        const ticketIds = tickets.map((t) => t.id);
        if (ticketIds.length > 0) {
          await prisma.supportEmailLog.deleteMany({ where: { ticketId: { in: ticketIds } } });
          await prisma.supportTicketAssignmentHistory.deleteMany({ where: { ticketId: { in: ticketIds } } });
          await prisma.supportTicketStatusHistory.deleteMany({ where: { ticketId: { in: ticketIds } } });
          await prisma.supportMessage.deleteMany({ where: { ticketId: { in: ticketIds } } });
          await prisma.supportTicket.deleteMany({ where: { id: { in: ticketIds } } });
        }
        await prisma.customer.deleteMany({ where: { id: testCustomer.id } });
      }
    } catch {
      // Ignore cleanup error
    }
  });

  // ============================================================================
  // 1. RBAC & SECURITY GUARDS
  // ============================================================================
  await suite.test('1. RBAC & Security Guards', async (t) => {
    await t.test('GET /api/subadmin/support/tickets rejects unauthenticated requests with 401', async () => {
      const res = await request(app).get('/api/subadmin/support/tickets');
      assert.equal(res.status, 401);
      assert.equal(res.body.success, false);
    });

    await t.test('GET /api/subadmin/support/tickets rejects DISPATCHER (insufficient permissions) with 403', async () => {
      const res = await request(app)
        .get('/api/subadmin/support/tickets')
        .set('Authorization', `Bearer ${dispatcherToken}`);
      assert.equal(res.status, 403);
      assert.equal(res.body.success, false);
      assert.equal(res.body.error.code, 'INSUFFICIENT_PERMISSIONS');
    });

    await t.test('GET /api/subadmin/support/tickets allows SUB_ADMIN', async () => {
      const res = await request(app)
        .get('/api/subadmin/support/tickets')
        .set('Authorization', `Bearer ${subAdminToken}`);
      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
    });
  });

  // ============================================================================
  // 2. SUPPORT CATEGORIES & STATISTICS
  // ============================================================================
  await suite.test('2. Support Categories & Statistics', async (t) => {
    await t.test('GET /api/subadmin/support/categories returns list of active categories', async () => {
      const res = await request(app)
        .get('/api/subadmin/support/categories')
        .set('Authorization', `Bearer ${subAdminToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(Array.isArray(res.body.data));
      assert.ok(res.body.data.length >= 1, 'Categories should have at least 1 seeded entry');
      const names = res.body.data.map((c) => c.name);
      assert.ok(names.some((n) => /order/i.test(n) || /delivery/i.test(n) || /account/i.test(n)));
    });

    await t.test('GET /api/subadmin/support/statistics returns KPI metrics', async () => {
      const res = await request(app)
        .get('/api/subadmin/support/statistics')
        .set('Authorization', `Bearer ${subAdminToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(typeof res.body.data.totalTickets === 'number');
      assert.ok(typeof res.body.data.openTickets === 'number');
      assert.ok(typeof res.body.data.pendingTickets === 'number');
      assert.ok(typeof res.body.data.resolvedTickets === 'number');
      assert.ok(typeof res.body.data.closedTickets === 'number');
    });
  });

  // ============================================================================
  // 3. TICKET CREATION
  // ============================================================================
  await suite.test('3. Ticket Creation', async (t) => {
    await t.test('POST /api/subadmin/support/tickets creates a ticket with sequential number and initial message', async () => {
      const res = await request(app)
        .post('/api/subadmin/support/tickets')
        .set('Authorization', `Bearer ${subAdminToken}`)
        .send({
          customerId: testCustomer.id,
          subject: 'Late Delivery Inquiry for Gondar Order',
          description: 'The driver has not arrived yet for order delivery.',
          priority: 'HIGH',
          city: 'Gondar',
        });

      assert.equal(res.status, 201);
      assert.equal(res.body.success, true);
      assert.ok(res.body.data.id);
      assert.match(res.body.data.ticketNumber, /^ARD-SUP-\d{8}-\d{6}$/);
      assert.equal(res.body.data.status, 'OPEN');
      assert.equal(res.body.data.priority, 'HIGH');
      assert.equal(res.body.data.customerId, testCustomer.id);
      assert.equal(res.body.data.description, 'The driver has not arrived yet for order delivery.');

      testTicketId = res.body.data.id;
      testTicketCode = res.body.data.ticketNumber;
    });

    await t.test('POST /api/subadmin/support/tickets validates required fields', async () => {
      const res = await request(app)
        .post('/api/subadmin/support/tickets')
        .set('Authorization', `Bearer ${subAdminToken}`)
        .send({
          subject: 'Ab', // too short
        });

      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
      assert.equal(res.body.error.code, 'VALIDATION_ERROR');
    });
  });

  // ============================================================================
  // 4. LISTING & SEARCHING TICKETS
  // ============================================================================
  await suite.test('4. Listing & Filtering Tickets', async (t) => {
    await t.test('GET /api/subadmin/support/tickets retrieves paginated tickets', async () => {
      const res = await request(app)
        .get('/api/subadmin/support/tickets')
        .set('Authorization', `Bearer ${subAdminToken}`)
        .query({ page: 1, pageSize: 10 });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(Array.isArray(res.body.data));
      assert.ok(res.body.pagination);
      assert.ok(res.body.pagination.total >= 1);
    });

    await t.test('GET /api/subadmin/support/tickets filters by status and search', async () => {
      const res = await request(app)
        .get('/api/subadmin/support/tickets')
        .set('Authorization', `Bearer ${subAdminToken}`)
        .query({ status: 'OPEN', search: testTicketCode });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(res.body.data.length >= 1);
      assert.equal(res.body.data[0].id, testTicketId);
    });
  });

  // ============================================================================
  // 5. TICKET DETAILS
  // ============================================================================
  await suite.test('5. Ticket Details Retrieval', async (t) => {
    await t.test('GET /api/subadmin/support/tickets/:id returns full ticket relation tree', async () => {
      const res = await request(app)
        .get(`/api/subadmin/support/tickets/${testTicketId}`)
        .set('Authorization', `Bearer ${subAdminToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.id, testTicketId);
      assert.equal(res.body.data.customerId, testCustomer.id);
      assert.ok(Array.isArray(res.body.data.messages));
      assert.ok(Array.isArray(res.body.data.statusHistory));
    });
  });

  // ============================================================================
  // 6. OFFICIAL REPLY & AUTOMATIC EMAIL RESOLUTION
  // ============================================================================
  await suite.test('6. Official Admin Reply & Email Notification', async (t) => {
    await t.test('POST /api/subadmin/support/tickets/:id/reply posts reply and sends customer email', async () => {
      const idempotencyKey = `idem-test-${Date.now()}`;
      const replyText = 'Hello Abebe, we have contacted the driver and your delivery is arriving within 15 minutes.';

      const res = await request(app)
        .post(`/api/subadmin/support/tickets/${testTicketId}/reply`)
        .set('Authorization', `Bearer ${subAdminToken}`)
        .set('X-Idempotency-Key', idempotencyKey)
        .send({
          body: replyText,
        });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(res.body.data.message);
      assert.equal(res.body.data.message.body, replyText);
      assert.equal(res.body.data.message.senderType, 'SUBADMIN');
      assert.equal(res.body.data.message.isInternal, false);
      assert.ok(res.body.data.emailDelivery);
      assert.equal(res.body.data.emailDelivery.recipientEmail, testCustomer.email);
      assert.ok(['SENT', 'FAILED', 'PENDING'].includes(res.body.data.emailDelivery.status));

      testEmailLogId = res.body.data.emailDelivery.id;

      // Check idempotency replay
      const replayRes = await request(app)
        .post(`/api/subadmin/support/tickets/${testTicketId}/reply`)
        .set('Authorization', `Bearer ${subAdminToken}`)
        .set('X-Idempotency-Key', idempotencyKey)
        .send({
          body: replyText,
        });

      assert.equal(replayRes.status, 200);
      assert.equal(replayRes.body.data.message.id, res.body.data.message.id);
    });
  });

  // ============================================================================
  // 7. INTERNAL NOTE (MUST NEVER BE EMAILED TO CUSTOMER)
  // ============================================================================
  await suite.test('7. Internal Team Note Strict Isolation', async (t) => {
    await t.test('POST /api/subadmin/support/tickets/:id/internal-note posts internal note without sending email', async () => {
      const noteText = 'Internal note: driver phone was busy on first try, reached warehouse manager.';

      const emailLogsCountBefore = await prisma.supportEmailLog.count({
        where: { ticketId: testTicketId },
      });

      const res = await request(app)
        .post(`/api/subadmin/support/tickets/${testTicketId}/internal-note`)
        .set('Authorization', `Bearer ${subAdminToken}`)
        .send({
          body: noteText,
        });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.body, noteText);
      assert.equal(res.body.data.isInternal, true);
      assert.equal(res.body.data.senderType, 'SUBADMIN');

      const emailLogsCountAfter = await prisma.supportEmailLog.count({
        where: { ticketId: testTicketId },
      });

      // Crucial requirement: Internal notes must NEVER create email logs or trigger emails!
      assert.equal(
        emailLogsCountAfter,
        emailLogsCountBefore,
        'Internal note must strictly never generate an email log or send an email'
      );
    });
  });

  // ============================================================================
  // 8. TICKET ASSIGNMENT & STATUS TRANSITIONS
  // ============================================================================
  await suite.test('8. Ticket Assignment & Status Lifecycle', async (t) => {
    await t.test('PATCH /api/subadmin/support/tickets/:id/assign reassigns ticket to Subadmin', async () => {
      const res = await request(app)
        .patch(`/api/subadmin/support/tickets/${testTicketId}/assign`)
        .set('Authorization', `Bearer ${subAdminToken}`)
        .send({
          assignedSubadminId: seededSubAdmin ? seededSubAdmin.id : null,
        });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      if (seededSubAdmin) {
        assert.equal(res.body.data.assignedSubadminId, seededSubAdmin.id);

        // Verify assignment history audit log was created
        const history = await prisma.supportTicketAssignmentHistory.findFirst({
          where: { ticketId: testTicketId, assignedToId: seededSubAdmin.id },
        });
        assert.ok(history, 'Assignment history entry must exist');
      }
    });

    await t.test('PATCH /api/subadmin/support/tickets/:id/status updates status to RESOLVED', async () => {
      const res = await request(app)
        .patch(`/api/subadmin/support/tickets/${testTicketId}/status`)
        .set('Authorization', `Bearer ${subAdminToken}`)
        .send({
          status: 'RESOLVED',
          notes: 'Customer confirmed package arrived safely.',
        });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.status, 'RESOLVED');
      assert.ok(res.body.data.resolvedAt);

      // Verify status history audit log was created
      const statusHistory = await prisma.supportTicketStatusHistory.findFirst({
        where: { ticketId: testTicketId, newStatus: 'RESOLVED' },
      });
      assert.ok(statusHistory, 'Status history entry must exist');
      assert.equal(statusHistory.reason, 'Customer confirmed package arrived safely.');
    });
  });

  // ============================================================================
  // 9. EMAIL RETRY
  // ============================================================================
  await suite.test('9. Email Delivery Retry', async (t) => {
    await t.test('POST /api/subadmin/support/tickets/:id/emails/:emailLogId/retry re-attempts email delivery', async () => {
      if (!testEmailLogId) {
        return;
      }

      const res = await request(app)
        .post(`/api/subadmin/support/tickets/${testTicketId}/emails/${testEmailLogId}/retry`)
        .set('Authorization', `Bearer ${subAdminToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(res.body.data.attempts >= 1);
    });
  });
});
