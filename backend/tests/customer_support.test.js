// ==============================================================================
// Ardab Market - Customer Support End-to-End Integration Test Suite
// ==============================================================================

import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/shared/config/database.js';
import { generateCustomerToken } from '../src/customer/services/customerAuth.service.js';
import { generateAdminToken } from '../src/admin/services/auth.service.js';
import { ADMIN_ROLES } from '../src/admin/constants/adminRoles.js';

const app = createApp();

test('Customer Support Full E2E Test Suite', async (suite) => {
  let customerA = null;
  let customerB = null;
  let customerTokenA = null;
  let customerTokenB = null;
  let subAdminToken = null;
  let createdTicketId = null;
  let createdTicketNumber = null;
  let customerAOrder = null;
  let customerBOrder = null;
  let testCategory = null;

  suite.before(async () => {
    // 1. Create or retrieve active Customer A
    customerA = await prisma.customer.create({
      data: {
        customerCode: `CUST-A-${Date.now().toString().slice(-4)}`,
        fullName: 'Support Customer Alpha',
        phone: `+25191${Date.now().toString().slice(-7)}`,
        email: `customer.a.${Date.now()}@ardabtest.com`,
        city: 'Gondar',
        status: 'ACTIVE',
      },
    });
    customerTokenA = generateCustomerToken(customerA);

    // 2. Create or retrieve active Customer B (for IDOR attack tests)
    customerB = await prisma.customer.create({
      data: {
        customerCode: `CUST-B-${Date.now().toString().slice(-4)}`,
        fullName: 'Support Customer Beta',
        phone: `+25192${Date.now().toString().slice(-7)}`,
        email: `customer.b.${Date.now()}@ardabtest.com`,
        city: 'Bahir Dar',
        status: 'ACTIVE',
      },
    });
    customerTokenB = generateCustomerToken(customerB);

    // 3. Create sample order for Customer A
    customerAOrder = await prisma.order.create({
      data: {
        orderNumber: `ORD-TEST-A-${Date.now().toString().slice(-4)}`,
        customerId: customerA.id,
        status: 'CONFIRMED',
        totalAmount: 1500,
        subtotal: 1400,
        deliveryFee: 100,
        city: 'Gondar',
      },
    });

    // 4. Create sample order for Customer B
    customerBOrder = await prisma.order.create({
      data: {
        orderNumber: `ORD-TEST-B-${Date.now().toString().slice(-4)}`,
        customerId: customerB.id,
        status: 'CONFIRMED',
        totalAmount: 2500,
        subtotal: 2400,
        deliveryFee: 100,
        city: 'Bahir Dar',
      },
    });

    // 5. Ensure an active Support Category exists
    testCategory = await prisma.supportCategory.findFirst({
      where: { isActive: true },
    });
    if (!testCategory) {
      testCategory = await prisma.supportCategory.create({
        data: {
          name: 'Delivery & Shipping',
          description: 'Issues related to orders, delivery times, or drivers',
          isActive: true,
        },
      });
    }

    // 6. Sub Admin Token
    let seededSubAdmin = await prisma.adminUser.findFirst({
      where: { role: ADMIN_ROLES.SUB_ADMIN },
    });
    if (!seededSubAdmin) {
      seededSubAdmin = await prisma.adminUser.findFirst({
        where: { role: ADMIN_ROLES.SUPER_ADMIN },
      });
    }
    subAdminToken = generateAdminToken({
      id: seededSubAdmin ? seededSubAdmin.id : 'admin-uuid-subadmin',
      email: seededSubAdmin ? seededSubAdmin.email : 'subadmin@ardabmarket.com',
      name: seededSubAdmin ? seededSubAdmin.name : 'Sub Admin',
      role: ADMIN_ROLES.SUB_ADMIN,
    });
  });

  suite.after(async () => {
    try {
      const custIds = [customerA?.id, customerB?.id].filter(Boolean);
      if (custIds.length > 0) {
        const tickets = await prisma.supportTicket.findMany({
          where: { customerId: { in: custIds } },
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
        await prisma.customerActivity.deleteMany({ where: { customerId: { in: custIds } } });
        await prisma.order.deleteMany({ where: { customerId: { in: custIds } } });
        await prisma.customer.deleteMany({ where: { id: { in: custIds } } });
      }
    } catch {
      // Cleanup best effort
    }
  });

  // --------------------------------------------------------------------------
  // TEST 1: Public category access
  // --------------------------------------------------------------------------
  await suite.test('GET /api/customer/support/categories returns active categories', async () => {
    const res = await request(app).get('/api/customer/support/categories');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(Array.isArray(res.body.data));
    assert.ok(res.body.data.length > 0);
  });

  // --------------------------------------------------------------------------
  // TEST 2: Authentication enforcement
  // --------------------------------------------------------------------------
  await suite.test('Unauthenticated request to support endpoints is rejected with 401', async () => {
    const res = await request(app).get('/api/customer/support/requests');
    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.success, false);
  });

  // --------------------------------------------------------------------------
  // TEST 3: Validation - Reject invalid order ownership
  // --------------------------------------------------------------------------
  await suite.test('Customer A cannot reference Customer B order (rejected with 400)', async () => {
    const res = await request(app)
      .post('/api/customer/support/requests')
      .set('Authorization', `Bearer ${customerTokenA}`)
      .send({
        subject: 'Inquiry about someone else order',
        message: 'Where is this order?',
        orderId: customerBOrder.id, // Belongs to Customer B!
      });

    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.success, false);
    assert.match(res.body.error.message, /not belong to your account/i);
  });

  // --------------------------------------------------------------------------
  // TEST 4: Validation - Reject invalid category
  // --------------------------------------------------------------------------
  await suite.test('Reject non-existent category with 400', async () => {
    const res = await request(app)
      .post('/api/customer/support/requests')
      .set('Authorization', `Bearer ${customerTokenA}`)
      .send({
        subject: 'Valid Subject Line',
        message: 'Valid message body here',
        categoryId: 'non-existent-uuid-12345',
      });

    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.success, false);
  });

  // --------------------------------------------------------------------------
  // TEST 5: Customer A creates a valid support ticket with own order
  // --------------------------------------------------------------------------
  await suite.test('Customer A creates valid support request with own order', async () => {
    const res = await request(app)
      .post('/api/customer/support/requests')
      .set('Authorization', `Bearer ${customerTokenA}`)
      .send({
        subject: 'Late delivery inquiry',
        message: 'Hello, when will my package arrive?',
        orderId: customerAOrder.id,
        categoryId: testCategory.id,
        priority: 'NORMAL',
      });

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.data.id);
    createdTicketId = res.body.data.id;
    createdTicketNumber = res.body.data.ticketNumber;

    assert.ok(res.body.data.ticketNumber.startsWith('ARD-SUP-'));
    assert.strictEqual(res.body.data.status, 'OPEN');

    // Verify in database that ticket exists with correct customerId
    const dbTicket = await prisma.supportTicket.findUnique({
      where: { id: createdTicketId },
      include: { messages: true },
    });
    assert.ok(dbTicket);
    assert.strictEqual(dbTicket.customerId, customerA.id);
    assert.strictEqual(dbTicket.orderId, customerAOrder.id);
    assert.strictEqual(dbTicket.messages.length, 1);
    assert.strictEqual(dbTicket.messages[0].senderType, 'CUSTOMER');
    assert.strictEqual(dbTicket.messages[0].isInternal, false);
  });

  // --------------------------------------------------------------------------
  // TEST 6: Customer A lists own requests
  // --------------------------------------------------------------------------
  await suite.test('Customer A can list own support requests with pagination', async () => {
    const res = await request(app)
      .get('/api/customer/support/requests')
      .set('Authorization', `Bearer ${customerTokenA}`)
      .query({ page: 1, pageSize: 10 });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(Array.isArray(res.body.data));
    assert.strictEqual(res.body.pagination.total, 1);
    assert.strictEqual(res.body.data[0].id, createdTicketId);
    assert.strictEqual(res.body.data[0].orderNumber, customerAOrder.orderNumber);
    assert.strictEqual(res.body.data[0].hasUnreadReply, false);
  });

  // --------------------------------------------------------------------------
  // TEST 7: IDOR Protection - Customer B cannot view Customer A request
  // --------------------------------------------------------------------------
  await suite.test('Customer B cannot view Customer A ticket (404/IDOR guard)', async () => {
    const res = await request(app)
      .get(`/api/customer/support/requests/${createdTicketId}`)
      .set('Authorization', `Bearer ${customerTokenB}`);

    assert.strictEqual(res.status, 404);
    assert.strictEqual(res.body.success, false);
  });

  // --------------------------------------------------------------------------
  // TEST 8: IDOR Protection - Customer B cannot reply to Customer A ticket
  // --------------------------------------------------------------------------
  await suite.test('Customer B cannot reply to Customer A ticket (404/IDOR guard)', async () => {
    const res = await request(app)
      .post(`/api/customer/support/requests/${createdTicketId}/messages`)
      .set('Authorization', `Bearer ${customerTokenB}`)
      .send({ message: 'I am attacking Customer A ticket' });

    assert.strictEqual(res.status, 404);
    assert.strictEqual(res.body.success, false);
  });

  // --------------------------------------------------------------------------
  // TEST 9: Sub Admin sees Customer A ticket in Sub Admin support list
  // --------------------------------------------------------------------------
  await suite.test('Sub Admin sees Customer A ticket in Sub Admin dashboard', async () => {
    const res = await request(app)
      .get('/api/subadmin/support/tickets')
      .set('Authorization', `Bearer ${subAdminToken}`)
      .query({ search: createdTicketNumber });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    const ticketsList = Array.isArray(res.body.data) ? res.body.data : res.body.data?.items || [];
    const found = ticketsList.find((t) => t.ticketNumber === createdTicketNumber);
    assert.ok(found, 'Ticket must be found in subadmin list');
    assert.strictEqual(found.customerName, customerA.fullName);
  });

  // --------------------------------------------------------------------------
  // TEST 10: Sub Admin replies to Customer A ticket
  // --------------------------------------------------------------------------
  await suite.test('Sub Admin replies to Customer A ticket', async () => {
    const res = await request(app)
      .post(`/api/subadmin/support/tickets/${createdTicketId}/reply`)
      .set('Authorization', `Bearer ${subAdminToken}`)
      .send({
        body: 'Hello! Your package has been dispatched and will arrive today by 3 PM.',
      });

    assert.strictEqual(res.status, 200);

    // Verify ticket status transitioned to WAITING_FOR_CUSTOMER in database
    const dbTicket = await prisma.supportTicket.findUnique({
      where: { id: createdTicketId },
    });
    assert.strictEqual(dbTicket.status, 'WAITING_FOR_CUSTOMER');
    assert.ok(dbTicket.lastAgentMessageAt);
  });

  // --------------------------------------------------------------------------
  // TEST 11: Sub Admin adds an internal note (MUST be hidden from customer)
  // --------------------------------------------------------------------------
  await suite.test('Sub Admin adds internal note (must be invisible to customer)', async () => {
    const res = await request(app)
      .post(`/api/subadmin/support/tickets/${createdTicketId}/internal-note`)
      .set('Authorization', `Bearer ${subAdminToken}`)
      .send({
        body: 'Internal Note: Checked with driver Abebe. Package is in van #4.',
      });

    assert.strictEqual(res.status, 200);
  });

  // --------------------------------------------------------------------------
  // TEST 12: Customer A views conversation - internal note is hidden & admin reply is visible
  // --------------------------------------------------------------------------
  await suite.test('Customer A views conversation: sees admin reply, internal note is hidden', async () => {
    const res = await request(app)
      .get(`/api/customer/support/requests/${createdTicketId}`)
      .set('Authorization', `Bearer ${customerTokenA}`);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    const ticket = res.body.data;

    // Must see initial message + admin reply = 2 messages
    assert.strictEqual(ticket.messages.length, 2);

    // Verify messages content
    const adminMsg = ticket.messages.find((m) => m.senderType === 'SUBADMIN');
    assert.ok(adminMsg);
    assert.match(adminMsg.body, /arrive today by 3 PM/);
    assert.strictEqual(adminMsg.senderName, 'Ardab Support');
    assert.strictEqual(adminMsg.isSelf, false);

    // Verify internal note is NOT in the messages array
    const internalMsg = ticket.messages.find((m) => m.body.includes('Internal Note'));
    assert.strictEqual(internalMsg, undefined, 'Internal staff notes must NEVER be exposed to customer');
  });

  // --------------------------------------------------------------------------
  // TEST 13: Customer A replies back to Sub Admin
  // --------------------------------------------------------------------------
  await suite.test('Customer A replies to ticket; transitions from WAITING_FOR_CUSTOMER to IN_PROGRESS', async () => {
    const res = await request(app)
      .post(`/api/customer/support/requests/${createdTicketId}/messages`)
      .set('Authorization', `Bearer ${customerTokenA}`)
      .send({
        message: 'Thank you for the update! I will be waiting at home.',
      });

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.isSelf, true);

    // Verify database state: status transitioned to IN_PROGRESS
    const dbTicket = await prisma.supportTicket.findUnique({
      where: { id: createdTicketId },
    });
    assert.strictEqual(dbTicket.status, 'IN_PROGRESS');
  });

  // --------------------------------------------------------------------------
  // TEST 14: Sub Admin views ticket detail: sees all 3 public messages + 1 internal note
  // --------------------------------------------------------------------------
  await suite.test('Sub Admin sees customer reply in Sub Admin view', async () => {
    const res = await request(app)
      .get(`/api/subadmin/support/tickets/${createdTicketId}`)
      .set('Authorization', `Bearer ${subAdminToken}`);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    // Sub Admin sees all messages including internal note
    assert.ok(res.body.data.messages.length >= 4);
    const latestReply = res.body.data.messages[res.body.data.messages.length - 1];
    assert.match(latestReply.body, /waiting at home/);
  });

  // --------------------------------------------------------------------------
  // TEST 15: Customer Activity log verification
  // --------------------------------------------------------------------------
  await suite.test('CustomerActivity audit events exist for ticket creation and reply', async () => {
    const activities = await prisma.customerActivity.findMany({
      where: { customerId: customerA.id },
      orderBy: { createdAt: 'desc' },
    });

    const createdAct = activities.find((a) => a.action === 'SUPPORT_TICKET_CREATED');
    const repliedAct = activities.find((a) => a.action === 'SUPPORT_TICKET_REPLIED');

    assert.ok(createdAct, 'SUPPORT_TICKET_CREATED activity must be recorded');
    assert.ok(repliedAct, 'SUPPORT_TICKET_REPLIED activity must be recorded');
  });
});
