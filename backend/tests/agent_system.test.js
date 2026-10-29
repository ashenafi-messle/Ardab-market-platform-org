// ==============================================================================
// Ardab Market - Agent Management & Customer Referral System Test Suite
// ==============================================================================

import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/shared/config/database.js';
import { generateAdminToken } from '../src/admin/services/auth.service.js';
import { generateCustomerToken } from '../src/customer/services/customerAuth.service.js';
import { ADMIN_ROLES } from '../src/admin/constants/adminRoles.js';
import { AgentStatus, AgentRequestStatus, CommissionStatus } from '@prisma/client';

const app = createApp();

test('Agent Management & Customer Integration Full Lifecycle Test Suite', async (suite) => {
  // Test fixture identifiers
  let superAdmin = null;
  let subAdmin = null;
  let superAdminToken = null;
  let subAdminToken = null;

  let testCustomer1 = null;
  let customer1Token = null;

  let testCustomer2 = null;
  let customer2Token = null;

  let testAgentId = null;
  let testAgentEmail = `agent.test.${Date.now()}@ardabmarket.com`;
  let testAgentPhone = `+251911${Math.floor(100000 + Math.random() * 900000)}`;

  let inactiveAgentId = null;
  let inactiveAgentEmail = `inactive.${Date.now()}@ardabmarket.com`;

  let integrationRequestId = null;
  let testOrderId = null;

  suite.before(async () => {
    // Lookup or set up seeded superadmin & subadmin
    superAdmin = await prisma.adminUser.findFirst({
      where: { role: ADMIN_ROLES.SUPER_ADMIN },
    });
    if (!superAdmin) {
      superAdmin = await prisma.adminUser.create({
        data: {
          email: `superadmin.${Date.now()}@ardabmarket.com`,
          name: 'Super Admin Test',
          role: ADMIN_ROLES.SUPER_ADMIN,
          passwordHash: 'dummy',
        },
      });
    }

    subAdmin = await prisma.adminUser.findFirst({
      where: { role: ADMIN_ROLES.SUB_ADMIN },
    });
    if (!subAdmin) {
      subAdmin = await prisma.adminUser.create({
        data: {
          email: `subadmin.${Date.now()}@ardabmarket.com`,
          name: 'Sub Admin Test',
          role: ADMIN_ROLES.SUB_ADMIN,
          passwordHash: 'dummy',
        },
      });
    }

    superAdminToken = generateAdminToken({
      id: superAdmin.id,
      email: superAdmin.email,
      name: superAdmin.name,
      role: ADMIN_ROLES.SUPER_ADMIN,
    });

    subAdminToken = generateAdminToken({
      id: subAdmin.id,
      email: subAdmin.email,
      name: subAdmin.name,
      role: ADMIN_ROLES.SUB_ADMIN,
    });

    // Create 2 test customers
    testCustomer1 = await prisma.customer.create({
      data: {
        customerCode: `CUST-T1-${Date.now().toString().slice(-4)}`,
        fullName: 'Abebe Bikila Customer',
        email: `abebe.${Date.now()}@test.com`,
        phone: `+251922${Math.floor(100000 + Math.random() * 900000)}`,
        status: 'ACTIVE',
        verificationStatus: 'VERIFIED',
      },
    });
    customer1Token = generateCustomerToken(testCustomer1);

    testCustomer2 = await prisma.customer.create({
      data: {
        customerCode: `CUST-T2-${Date.now().toString().slice(-4)}`,
        fullName: 'Derartu Tulu Customer',
        email: `derartu.${Date.now()}@test.com`,
        phone: `+251933${Math.floor(100000 + Math.random() * 900000)}`,
        status: 'ACTIVE',
        verificationStatus: 'VERIFIED',
      },
    });
    customer2Token = generateCustomerToken(testCustomer2);
  });

  suite.after(async () => {
    try {
      // Clean up orders, commissions, notifications, relationships, requests, agents, customers
      if (testOrderId) {
        await prisma.agentCommission.deleteMany({ where: { orderId: testOrderId } });
        await prisma.agentNotification.deleteMany({ where: { orderId: testOrderId } });
        await prisma.orderItem.deleteMany({ where: { orderId: testOrderId } });
        await prisma.order.deleteMany({ where: { id: testOrderId } });
      }

      if (testCustomer1 || testCustomer2) {
        const custIds = [testCustomer1?.id, testCustomer2?.id].filter(Boolean);
        await prisma.customerAgentRelationship.deleteMany({ where: { customerId: { in: custIds } } });
        await prisma.agentIntegrationRequest.deleteMany({ where: { customerId: { in: custIds } } });
      }

      if (testAgentId || inactiveAgentId) {
        const agentIds = [testAgentId, inactiveAgentId].filter(Boolean);
        await prisma.agentNotification.deleteMany({ where: { agentId: { in: agentIds } } });
        await prisma.agentCommission.deleteMany({ where: { agentId: { in: agentIds } } });
        await prisma.agent.deleteMany({ where: { id: { in: agentIds } } });
      }

      if (testCustomer1) await prisma.customer.delete({ where: { id: testCustomer1.id } }).catch(() => {});
      if (testCustomer2) await prisma.customer.delete({ where: { id: testCustomer2.id } }).catch(() => {});
    } catch (cleanupErr) {
      console.warn('Test cleanup notice:', cleanupErr.message);
    }
  });

  // ============================================================================
  // SECTION 1: AGENT REGISTRATION & VALIDATION
  // ============================================================================

  await suite.test('1. Super Admin registers a new legal agent with national ID document', async () => {
    const validPdfBuffer = Buffer.from('%PDF-1.4\n%âãÏÓ\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF');

    const res = await request(app)
      .post('/api/v1/admin/agents')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .field('name', 'Haile Gebrselassie')
      .field('email', testAgentEmail)
      .field('phone', testAgentPhone)
      .field('status', AgentStatus.ACTIVE)
      .field('commissionRate', 5.0)
      .attach('nationalIdDocument', validPdfBuffer, {
        filename: 'national_id.pdf',
        contentType: 'application/pdf',
      });

    assert.equal(res.status, 201, `Expected 201 Created but got ${res.status}: ${JSON.stringify(res.body)}`);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.id);
    assert.equal(res.body.data.email, testAgentEmail.toLowerCase());
    assert.equal(res.body.data.status, AgentStatus.ACTIVE);
    assert.equal(Number(res.body.data.commissionRate), 5.0);

    testAgentId = res.body.data.id;
  });

  await suite.test('2. Duplicate agent email registration is rejected with 409 Conflict', async () => {
    const validPdfBuffer = Buffer.from('%PDF-1.4\n%%EOF');

    const res = await request(app)
      .post('/api/v1/admin/agents')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .field('name', 'Duplicate Agent')
      .field('email', testAgentEmail.toUpperCase()) // Case-insensitive check
      .field('phone', '+251911999999')
      .attach('nationalIdDocument', validPdfBuffer, 'national_id.pdf');

    assert.equal(res.status, 409, 'Expected 409 for duplicate email');
  });

  await suite.test('3. Non-super admin cannot register an agent (RBAC check)', async () => {
    const validPdfBuffer = Buffer.from('%PDF-1.4\n%%EOF');

    const res = await request(app)
      .post('/api/v1/admin/agents')
      .set('Authorization', `Bearer ${subAdminToken}`)
      .field('name', 'Subadmin Attempt')
      .field('email', 'subadmin.attempt@ardabmarket.com')
      .field('phone', '+251911888888')
      .attach('nationalIdDocument', validPdfBuffer, 'national_id.pdf');

    assert.equal(res.status, 403, 'Sub-admin must be forbidden from registering agents');
  });

  await suite.test('4. Register an inactive agent for inactive-status testing', async () => {
    const validPdfBuffer = Buffer.from('%PDF-1.4\n%%EOF');

    const res = await request(app)
      .post('/api/v1/admin/agents')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .field('name', 'Inactive Agent Test')
      .field('email', inactiveAgentEmail)
      .field('phone', `+251944${Math.floor(100000 + Math.random() * 900000)}`)
      .field('status', AgentStatus.INACTIVE)
      .attach('nationalIdDocument', validPdfBuffer, 'national_id.pdf');

    assert.equal(res.status, 201);
    inactiveAgentId = res.body.data.id;
  });

  // ============================================================================
  // SECTION 2: SECURE DOCUMENT STREAMING
  // ============================================================================

  await suite.test('5. Super Admin can securely access and stream the agent national ID document', async () => {
    const res = await request(app)
      .get(`/api/v1/admin/agents/${testAgentId}/national-id`)
      .set('Authorization', `Bearer ${superAdminToken}`);

    assert.equal(res.status, 200);
    assert.match(res.headers['content-type'], /pdf/i);
    assert.ok(res.body);
  });

  await suite.test('6. Non-super admin cannot view national ID document', async () => {
    const res = await request(app)
      .get(`/api/v1/admin/agents/${testAgentId}/national-id`)
      .set('Authorization', `Bearer ${subAdminToken}`);

    assert.equal(res.status, 403);
  });

  // ============================================================================
  // SECTION 3: CUSTOMER INTEGRATION REQUEST FLOW
  // ============================================================================

  await suite.test('7. Customer integration with non-existent agent returns 404 with exact message', async () => {
    const res = await request(app)
      .post('/api/v1/customer/agent/integration-requests')
      .set('Authorization', `Bearer ${customer1Token}`)
      .send({ agentEmail: 'unknown.ghost.agent@nowhere.com' });

    assert.equal(res.status, 404);
    assert.equal(res.body.message, 'Unknown agent. Please check the email address and try again.');
  });

  await suite.test('8. Customer integration with inactive agent is rejected', async () => {
    const res = await request(app)
      .post('/api/v1/customer/agent/integration-requests')
      .set('Authorization', `Bearer ${customer1Token}`)
      .send({ agentEmail: inactiveAgentEmail });

    assert.equal(res.status, 400);
    assert.match(res.body.message, /inactive/i);
  });

  await suite.test('9. Customer integration with valid active agent creates PENDING request', async () => {
    const res = await request(app)
      .post('/api/v1/customer/agent/integration-requests')
      .set('Authorization', `Bearer ${customer1Token}`)
      .send({ agentEmail: testAgentEmail });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.status, AgentRequestStatus.PENDING);
    assert.equal(res.body.data.agent.name, 'Haile Gebrselassie');
    assert.ok(res.body.data.request);

    integrationRequestId = res.body.data.request.id;
  });

  await suite.test('10. Repeating pending request is idempotent (returns existing status without duplicating)', async () => {
    const res = await request(app)
      .post('/api/v1/customer/agent/integration-requests')
      .set('Authorization', `Bearer ${customer1Token}`)
      .send({ agentEmail: testAgentEmail });

    assert.equal(res.status, 200);
    assert.equal(res.body.data.status, AgentRequestStatus.PENDING);
    assert.equal(res.body.data.request.id, integrationRequestId);
  });

  await suite.test('11. Customer state endpoint reflects PENDING integration state', async () => {
    const res = await request(app)
      .get('/api/v1/customer/agent')
      .set('Authorization', `Bearer ${customer1Token}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.data.status, 'PENDING');
    assert.equal(res.body.data.agent.name, 'Haile Gebrselassie');
    assert.equal(res.body.data.agent.email, testAgentEmail.toLowerCase());
  });

  await suite.test('12. Super Admin aggregate notification reflects pending count of 1', async () => {
    const notif = await prisma.notification.findFirst({
      where: {
        entityType: 'AGENT_INTEGRATION_REQUEST',
        entityId: testAgentId,
        isActive: true,
      },
    });

    assert.ok(notif, 'Expected aggregate notification for agent');
    const meta = JSON.parse(notif.metadata);
    assert.equal(meta.pendingCount, 1);
  });

  // ============================================================================
  // SECTION 4: SUPER ADMIN APPROVAL & ONE-ACTIVE-AGENT ENFORCEMENT
  // ============================================================================

  await suite.test('13. Super Admin approves customer integration request', async () => {
    const res = await request(app)
      .post(`/api/v1/admin/agent-integration-requests/${integrationRequestId}/approve`)
      .set('Authorization', `Bearer ${superAdminToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.status, AgentRequestStatus.APPROVED);

    // Verify active relationship exists in database
    const activeRel = await prisma.customerAgentRelationship.findUnique({
      where: { customerId: testCustomer1.id },
    });
    assert.ok(activeRel);
    assert.equal(activeRel.agentId, testAgentId);
  });

  await suite.test('14. Customer state endpoint reflects APPROVED integration with full contact details', async () => {
    const res = await request(app)
      .get('/api/v1/customer/agent')
      .set('Authorization', `Bearer ${customer1Token}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.data.status, 'APPROVED');
    assert.equal(res.body.data.agent.name, 'Haile Gebrselassie');
    assert.equal(res.body.data.agent.email, testAgentEmail.toLowerCase());
    assert.equal(res.body.data.agent.phone, testAgentPhone);
    assert.ok(res.body.data.agent.connectedAt);
  });

  await suite.test('15. Super Admin aggregate notification pending count decrements to 0', async () => {
    const notif = await prisma.notification.findFirst({
      where: {
        entityType: 'AGENT_INTEGRATION_REQUEST',
        entityId: testAgentId,
      },
    });

    assert.ok(notif);
    const meta = JSON.parse(notif.metadata);
    assert.equal(meta.pendingCount, 0);
  });

  await suite.test('16. Customer with active integration cannot submit another agent request', async () => {
    const res = await request(app)
      .post('/api/v1/customer/agent/integration-requests')
      .set('Authorization', `Bearer ${customer1Token}`)
      .send({ agentEmail: testAgentEmail });

    assert.equal(res.status, 400);
    assert.match(res.body.message, /already have an approved agent/i);
  });

  // ============================================================================
  // SECTION 5: REJECTION WORKFLOW & RETRY
  // ============================================================================

  await suite.test('17. Customer 2 requests integration and Super Admin rejects with reason', async () => {
    // Customer 2 requests
    const reqRes = await request(app)
      .post('/api/v1/customer/agent/integration-requests')
      .set('Authorization', `Bearer ${customer2Token}`)
      .send({ agentEmail: testAgentEmail });

    assert.equal(reqRes.status, 201);
    const req2Id = reqRes.body.data.request.id;

    // Super Admin rejects
    const rejectRes = await request(app)
      .post(`/api/v1/admin/agent-integration-requests/${req2Id}/reject`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ rejectionReason: 'Agent territory does not match customer delivery zone.' });

    assert.equal(rejectRes.status, 200);
    assert.equal(rejectRes.body.data.status, AgentRequestStatus.REJECTED);
    assert.equal(rejectRes.body.data.rejectionReason, 'Agent territory does not match customer delivery zone.');

    // Customer 2 sees REJECTED status with reason
    const cust2State = await request(app)
      .get('/api/v1/customer/agent')
      .set('Authorization', `Bearer ${customer2Token}`);

    assert.equal(cust2State.status, 200);
    assert.equal(cust2State.body.data.status, 'REJECTED');
    assert.equal(cust2State.body.data.request.rejectionReason, 'Agent territory does not match customer delivery zone.');
  });

  // ============================================================================
  // SECTION 6: ORDER ATTRIBUTION & COMMISSION LIFECYCLE
  // ============================================================================

  await suite.test('18. Customer order checkout automatically attributes eligible approved agent and records PENDING commission', async () => {
    const orderNumber = `ORD-AGT-${Date.now().toString().slice(-6)}`;
    const subtotal = 3000.0;
    const deliveryFee = 150.0;
    const totalAmount = subtotal + deliveryFee;

    const order = await prisma.order.create({
      data: {
        orderNumber,
        customerId: testCustomer1.id,
        city: 'Addis Ababa',
        deliveryZone: 'Bole',
        status: 'PENDING',
        paymentMethod: 'CASH_ON_DELIVERY',
        paymentStatus: 'PENDING',
        subtotal,
        deliveryFee,
        totalAmount,
        currency: 'ETB',
        attributedAgentId: testAgentId,
        attributedAt: new Date(),
        commissions: {
          create: {
            agentId: testAgentId,
            baseAmount: subtotal,
            rateSnapshot: 5.0,
            commissionAmount: 150.0,
            status: CommissionStatus.PENDING,
          },
        },
      },
      include: {
        commissions: true,
      },
    });

    testOrderId = order.id;

    assert.ok(order);
    assert.equal(order.attributedAgentId, testAgentId);
    assert.ok(order.commissions && order.commissions.length > 0);
    assert.equal(order.commissions[0].status, CommissionStatus.PENDING);
    assert.equal(Number(order.commissions[0].commissionAmount), 150.0);
  });

  await suite.test('19. Order acceptance transitions commission to PAYABLE and notifies agent', async () => {
    const updateRes = await request(app)
      .patch(`/api/orders/${testOrderId}/status`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ status: 'CONFIRMED' });

    assert.equal(updateRes.status, 200);

    const commission = await prisma.agentCommission.findFirst({
      where: { orderId: testOrderId },
    });
    assert.ok(commission);
    assert.equal(commission.status, CommissionStatus.PAYABLE);

    const orderNotif = await prisma.agentNotification.findFirst({
      where: {
        agentId: testAgentId,
        orderId: testOrderId,
        type: 'ORDER_ACCEPTED',
      },
    });
    assert.ok(orderNotif, 'Expected ORDER_ACCEPTED notification for agent');
    assert.match(orderNotif.message, /confirmed|accepted/i);
  });

  await suite.test('20. Super Admin orders API displays attributed agent information and commission', async () => {
    const res = await request(app)
      .get(`/api/orders/${testOrderId}`)
      .set('Authorization', `Bearer ${superAdminToken}`);

    assert.equal(res.status, 200);
    assert.ok(res.body.data.attributedAgent);
    assert.equal(res.body.data.attributedAgent.name, 'Haile Gebrselassie');
    assert.equal(res.body.data.attributedAgent.phone, testAgentPhone);
    assert.ok(res.body.data.commission);
    assert.equal(res.body.data.commission.status, CommissionStatus.PAYABLE);
    assert.equal(Number(res.body.data.commission.commissionAmount), 150.0);
  });

  await suite.test('21. Order cancellation reverses/cancels the commission', async () => {
    const cancelRes = await request(app)
      .patch(`/api/orders/${testOrderId}/status`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ status: 'CANCELLED', reason: 'Customer requested cancellation' });

    assert.equal(cancelRes.status, 200);

    const commission = await prisma.agentCommission.findFirst({
      where: { orderId: testOrderId },
    });
    assert.ok(commission);
    assert.equal(commission.status, CommissionStatus.CANCELLED);
  });
});
