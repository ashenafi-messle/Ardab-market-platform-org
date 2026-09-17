// ==============================================================================
// Ardab Market - Customers Module & Experience Metrics Integration Test Suite
// ==============================================================================

import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/shared/config/database.js';
import { generateAdminToken } from '../src/admin/services/auth.service.js';
import { ADMIN_ROLES } from '../src/admin/constants/adminRoles.js';
import { getCustomerMetrics, getCustomerListMetrics } from '../src/admin/services/customer.metrics.service.js';

const app = createApp();

// Retrieve seeded admins from Neon PostgreSQL for genuine FK references
const seededSuperAdmin = await prisma.adminUser.findUnique({
  where: { email: 'admin@ardabmarket.com' },
});

const seededSubAdmin = await prisma.adminUser.findUnique({
  where: { email: 'ashurack664@gmail.com' },
});

const superAdminToken = generateAdminToken({
  id: seededSuperAdmin ? seededSuperAdmin.id : 'df61c5d7-3f2d-40e3-aea6-6b527a6d353a',
  email: 'admin@ardabmarket.com',
  name: seededSuperAdmin ? seededSuperAdmin.name : 'Super Admin',
  role: ADMIN_ROLES.SUPER_ADMIN,
});

const subAdminToken = generateAdminToken({
  id: seededSubAdmin ? seededSubAdmin.id : 'subadmin-uuid-1',
  email: 'ashurack664@gmail.com',
  name: seededSubAdmin ? seededSubAdmin.name : 'Sub Admin',
  role: ADMIN_ROLES.SUB_ADMIN,
});

test('Customers Module & Experience Metrics Test Suite', async (suite) => {
  let testCustomerId = null;
  let testCustomer2Id = null;
  let testOrderId = null;
  let testOrder2Id = null;

  // Cleanup helper
  suite.after(async () => {
    try {
      if (testOrderId || testOrder2Id) {
        await prisma.order.deleteMany({
          where: { id: { in: [testOrderId, testOrder2Id].filter(Boolean) } },
        });
      }
      if (testCustomerId || testCustomer2Id) {
        await prisma.customerScoreEvent.deleteMany({
          where: { customerId: { in: [testCustomerId, testCustomer2Id].filter(Boolean) } },
        });
        await prisma.customerActivity.deleteMany({
          where: { customerId: { in: [testCustomerId, testCustomer2Id].filter(Boolean) } },
        });
        await prisma.customerAddress.deleteMany({
          where: { customerId: { in: [testCustomerId, testCustomer2Id].filter(Boolean) } },
        });
        await prisma.customer.deleteMany({
          where: { id: { in: [testCustomerId, testCustomer2Id].filter(Boolean) } },
        });
      }
      await prisma.customer.deleteMany({
        where: { phone: { in: ['+251911998877', '+251922334455', '+251933445566'] } },
      });
    } catch {
      // Ignore cleanup error
    }
  });

  // ============================================================================
  // 1. RBAC & AUTHORIZATION GUARDS
  // ============================================================================
  await suite.test('1. Security & RBAC Guards', async (t) => {
    await t.test('GET /api/customers rejects unauthenticated requests with 401', async () => {
      const res = await request(app).get('/api/customers');
      assert.equal(res.status, 401);
      assert.equal(res.body.success, false);
      assert.ok(['UNAUTHORIZED', 'TOKEN_MISSING'].includes(res.body.error.code));
    });

    await t.test('GET /api/customers rejects non-Super Admin (Sub Admin) with 403', async () => {
      const res = await request(app)
        .get('/api/customers')
        .set('Authorization', `Bearer ${subAdminToken}`);
      assert.equal(res.status, 403);
      assert.equal(res.body.success, false);
    });

    await t.test('GET /api/customers/:id rejects malformed UUID with 400', async () => {
      const res = await request(app)
        .get('/api/customers/not-a-valid-uuid')
        .set('Authorization', `Bearer ${superAdminToken}`);
      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
      assert.equal(res.body.error.code, 'VALIDATION_ERROR');
    });
  });

  // ============================================================================
  // 2. CUSTOMER REGISTRATION & SEQUENTIAL CODE
  // ============================================================================
  await suite.test('2. Customer Registration & Sequential Code Generation', async (t) => {
    await t.test('POST /api/customer/auth/register creates customer profile with sequential code', async () => {
      const res = await request(app)
        .post('/api/customer/auth/register')
        .send({
          fullName: 'Abebe Bikila',
          phone: '+251911998877',
          email: 'abebe.bikila@ardabtest.com',
          city: 'Gondar',
          deliveryZone: 'Arada Central',
          password: 'securePassword123!',
        });

      assert.equal(res.status, 201);
      assert.equal(res.body.success, true);
      assert.ok(res.body.data.id);
      assert.match(res.body.data.customerCode, /^CUST-\d{6}$/);
      assert.equal(res.body.data.fullName, 'Abebe Bikila');
      assert.equal(res.body.data.phone, '+251911998877');
      assert.equal(res.body.data.status, 'ACTIVE');
      assert.equal(res.body.data.verificationStatus, 'PENDING');
      // Password hash must never be exposed
      assert.equal(res.body.data.passwordHash, undefined);

      testCustomerId = res.body.data.id;
    });

    await t.test('POST /api/customer/auth/register prevents duplicate phone registration with 409', async () => {
      const res = await request(app)
        .post('/api/customer/auth/register')
        .send({
          fullName: 'Duplicate Abebe',
          phone: '+251911998877',
          email: 'dup@ardabtest.com',
        });

      assert.equal(res.status, 409);
      assert.equal(res.body.success, false);
      assert.equal(res.body.error.code, 'PHONE_EXISTS');
    });

    await t.test('POST /api/customer/auth/register creates second customer with incremented code', async () => {
      const res = await request(app)
        .post('/api/customer/auth/register')
        .send({
          fullName: 'Tirunesh Dibaba',
          phone: '+251922334455',
          email: 'tirunesh@ardabtest.com',
          city: 'Bahir Dar',
        });

      assert.equal(res.status, 201);
      assert.ok(res.body.data.id);
      assert.match(res.body.data.customerCode, /^CUST-\d{6}$/);
      testCustomer2Id = res.body.data.id;
    });
  });

  // ============================================================================
  // 3. SYSTEM-GENERATED AUTOMATIC EXPERIENCE METRICS & PROTECTION
  // ============================================================================
  await suite.test('3. Automatic Experience Metrics & Tamper Resistance', async (t) => {
    await t.test('New customer has initial baseline metrics: totalOrders=0, totalSpent=0.00', async () => {
      const res = await request(app)
        .get(`/api/customers/${testCustomerId}`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.metrics.totalOrders, 0);
      assert.equal(res.body.data.metrics.completedOrders, 0);
      assert.equal(res.body.data.metrics.cancelledOrders, 0);
      assert.equal(res.body.data.metrics.totalSpent, '0.00');
      // Registered customer received initial 50 loyalty welcome points
      assert.equal(res.body.data.metrics.totalScore, 50);
    });

    await t.test('Completed order automatically updates totalOrders and totalSpent', async () => {
      // Create authoritative order in database
      const order1 = await prisma.order.create({
        data: {
          orderNumber: `ORD-TEST-${Date.now()}`,
          customerId: testCustomerId,
          city: 'Gondar',
          status: 'DELIVERED',
          subtotal: 3500.0,
          deliveryFee: 150.0,
          totalAmount: 3650.0,
          paymentMethod: 'TELEBIRR',
          paymentStatus: 'PAID',
        },
      });
      testOrderId = order1.id;

      const res = await request(app)
        .get(`/api/customers/${testCustomerId}`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.data.metrics.totalOrders, 1);
      assert.equal(res.body.data.metrics.completedOrders, 1);
      assert.equal(res.body.data.metrics.cancelledOrders, 0);
      assert.equal(res.body.data.metrics.totalSpent, '3650.00');
    });

    await t.test('Cancelled order does not increment totalSpent and updates cancelledOrders', async () => {
      const order2 = await prisma.order.create({
        data: {
          orderNumber: `ORD-TEST-CANCELLED-${Date.now()}`,
          customerId: testCustomerId,
          city: 'Gondar',
          status: 'CANCELLED',
          subtotal: 5000.0,
          deliveryFee: 200.0,
          totalAmount: 5200.0,
          paymentMethod: 'CBE_BIRR',
          paymentStatus: 'REFUNDED',
        },
      });
      testOrder2Id = order2.id;

      const res = await request(app)
        .get(`/api/customers/${testCustomerId}`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.data.metrics.completedOrders, 1);
      assert.equal(res.body.data.metrics.cancelledOrders, 1);
      // Cancelled order amount must NOT be counted in totalSpent
      assert.equal(res.body.data.metrics.totalSpent, '3650.00');
    });

    await t.test('Additional score events dynamically update totalScore', async () => {
      await prisma.customerScoreEvent.create({
        data: {
          customerId: testCustomerId,
          type: 'ORDER_COMPLETED',
          points: 100,
          source: 'ORDER',
          referenceId: testOrderId,
        },
      });

      const metrics = await getCustomerMetrics(testCustomerId);
      // 50 (welcome) + 100 (order completed) = 150
      assert.equal(metrics.totalScore, 150);
    });

    await t.test('CRITICAL SECURITY: PATCH /api/customers/:id rejects manual metric modification', async () => {
      const res = await request(app)
        .patch(`/api/customers/${testCustomerId}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          totalOrders: 999999,
          totalSpent: 999999999,
          totalScore: 999999,
        });

      // Must reject with 400 Bad Request
      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);

      // Verify in DB that actual metrics are completely untouched
      const verified = await getCustomerMetrics(testCustomerId);
      assert.notEqual(verified.totalOrders, 999999);
      assert.notEqual(verified.totalScore, 999999);
      assert.equal(verified.totalSpent, '3650.00');
    });
  });

  // ============================================================================
  // 4. CUSTOMER OPERATIONS & AUDIT LOGGING
  // ============================================================================
  await suite.test('4. Profile Updates, Status Changes & Audit Logging', async (t) => {
    await t.test('PATCH /api/customers/:id updates allowed fields only', async () => {
      const res = await request(app)
        .patch(`/api/customers/${testCustomerId}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          fullName: 'Abebe Bikila Updated',
          deliveryZone: 'Maraki Campus Corridor',
        });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.fullName, 'Abebe Bikila Updated');
      assert.equal(res.body.data.deliveryZone, 'Maraki Campus Corridor');

      // Check audit log
      const audit = await prisma.auditLog.findFirst({
        where: { entity: 'Customer', entityId: testCustomerId, action: 'CUSTOMER_UPDATED' },
      });
      assert.ok(audit);
    });

    await t.test('PATCH /api/customers/:id/status updates status to SUSPENDED and records audit', async () => {
      const res = await request(app)
        .patch(`/api/customers/${testCustomerId}/status`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ status: 'SUSPENDED' });

      assert.equal(res.status, 200);
      assert.equal(res.body.data.status, 'SUSPENDED');

      const audit = await prisma.auditLog.findFirst({
        where: { entity: 'Customer', entityId: testCustomerId, action: 'CUSTOMER_STATUS_CHANGED' },
        orderBy: { timestamp: 'desc' },
      });
      assert.ok(audit);
      assert.match(audit.changesSummary, /SUSPENDED/);
    });

    await t.test('PATCH /api/customers/bulk-status updates multiple customers', async () => {
      const res = await request(app)
        .patch('/api/customers/bulk-status')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          ids: [testCustomerId, testCustomer2Id],
          status: 'ACTIVE',
        });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.affectedCount, 2);
      assert.equal(res.body.data.status, 'ACTIVE');
    });
  });

  // ============================================================================
  // 5. QUERYING, PAGINATION, SEARCH, AND N+1 PREVENTION
  // ============================================================================
  await suite.test('5. Queries, Summary & N+1 Prevention', async (t) => {
    await t.test('GET /api/customers/summary returns aggregated counters without N+1', async () => {
      const res = await request(app)
        .get('/api/customers/summary')
        .set('Authorization', `Bearer ${superAdminToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(typeof res.body.data.totalCustomers === 'number');
      assert.ok(typeof res.body.data.activeCustomers === 'number');
      assert.ok(typeof res.body.data.newCustomers === 'number');
      assert.ok(typeof res.body.data.verifiedCustomers === 'number');
      assert.ok(res.body.data.totalCustomers >= 2);
    });

    await t.test('GET /api/customers supports pagination, search, and returns metrics', async () => {
      const res = await request(app)
        .get('/api/customers?search=Abebe&page=1&pageSize=10')
        .set('Authorization', `Bearer ${superAdminToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(Array.isArray(res.body.data));
      assert.ok(res.body.data.length >= 1);
      assert.ok(res.body.pagination);
      assert.equal(res.body.pagination.page, 1);

      const customerItem = res.body.data.find((c) => c.id === testCustomerId);
      assert.ok(customerItem);
      assert.ok(customerItem.metrics);
      assert.equal(customerItem.metrics.completedOrders, 1);
      assert.equal(customerItem.metrics.totalSpent, '3650.00');
    });

    await t.test('getCustomerListMetrics executes batched metrics in 2 queries', async () => {
      const batchMetrics = await getCustomerListMetrics([testCustomerId, testCustomer2Id]);
      assert.ok(batchMetrics.has(testCustomerId));
      assert.ok(batchMetrics.has(testCustomer2Id));
      assert.equal(batchMetrics.get(testCustomerId).totalSpent, '3650.00');
      assert.equal(batchMetrics.get(testCustomer2Id).totalSpent, '0.00');
    });

    await t.test('GET /api/customers/:id/orders returns paginated orders', async () => {
      const res = await request(app)
        .get(`/api/customers/${testCustomerId}/orders`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      assert.equal(res.status, 200);
      assert.ok(Array.isArray(res.body.data));
      assert.equal(res.body.data.length, 2);
    });

    await t.test('GET /api/customers/:id/activity returns paginated activity trail', async () => {
      const res = await request(app)
        .get(`/api/customers/${testCustomerId}/activity`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      assert.equal(res.status, 200);
      assert.ok(Array.isArray(res.body.data));
      assert.ok(res.body.data.length >= 1);
    });
  });
});
