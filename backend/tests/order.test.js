// ==============================================================================
// Ardab Market - Incoming Orders Module Integration Test Suite
// ==============================================================================

import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/shared/config/database.js';
import { generateAdminToken } from '../src/admin/services/auth.service.js';
import { generateCustomerToken } from '../src/customer/services/customerAuth.service.js';
import { ADMIN_ROLES } from '../src/admin/constants/adminRoles.js';
import { generateNextOrderNumber } from '../src/admin/services/orderCode.service.js';
import { getOrderSummary } from '../src/admin/services/order.metrics.service.js';

const app = createApp();

// Fetch seeded admin records
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

test('Incoming Orders Module Test Suite', async (suite) => {
  let testSupplierId = null;
  let testCategoryId = null;
  let testProductId = null;
  let testProduct2Id = null;
  let testCustomerId = null;
  let testCustomerToken = null;
  let createdOrderId = null;
  let secondaryOrderId = null;

  suite.before(async () => {
    // 1. Create a test supplier
    const supplier = await prisma.supplier.create({
      data: {
        companyName: `Test Agro Producer ${Date.now()}`,
        name: 'Ato Abebe Tesfaye',
        phone: `+251911${Math.floor(100000 + Math.random() * 900000)}`,
        email: `supplier_${Date.now()}@ardabmarket.com`,
        city: 'Gondar',
        address: 'Kebele 18 Hub',
        status: 'ACTIVE',
      },
    });
    testSupplierId = supplier.id;

    // 2. Create a test marketplace category
    const category = await prisma.marketplaceCategory.create({
      data: {
        name: `Cereals & Pulses ${Date.now()}`,
        slug: `cereals-pulses-${Date.now()}`,
        isActive: true,
      },
    });
    testCategoryId = category.id;

    // 3. Create active test products with known prices and weights
    // Product 1: 500 ETB, 25 kg
    const product1 = await prisma.product.create({
      data: {
        itemCode: `PRD-ORD-1-${Date.now()}`,
        name: 'Premium Gondar White Teff (25kg)',
        sellerId: testSupplierId,
        marketplaceCategoryId: testCategoryId,
        unit: 'Bag (25kg)',
        weight: 25.0,
        costPrice: 420.0,
        sellingPrice: 500.0,
        status: 'ACTIVE',
        cityAvailability: ['Gondar', 'Bahir Dar'],
      },
    });
    testProductId = product1.id;

    // Product 2: 200 ETB, 10 kg
    const product2 = await prisma.product.create({
      data: {
        itemCode: `PRD-ORD-2-${Date.now()}`,
        name: 'Organic Red Kidney Beans (10kg)',
        sellerId: testSupplierId,
        marketplaceCategoryId: testCategoryId,
        unit: 'Bag (10kg)',
        weight: 10.0,
        costPrice: 160.0,
        sellingPrice: 200.0,
        status: 'ACTIVE',
        cityAvailability: ['Gondar', 'Bahir Dar'],
      },
    });
    testProduct2Id = product2.id;

    // 4. Create an active customer
    const customer = await prisma.customer.create({
      data: {
        customerCode: `CUST-T-${Date.now().toString().slice(-6)}`,
        fullName: 'Meskerem Tadesse',
        phone: `+251922${Math.floor(100000 + Math.random() * 900000)}`,
        email: `meskerem_${Date.now()}@ardabmarket.com`,
        city: 'Gondar',
        status: 'ACTIVE',
      },
    });
    testCustomerId = customer.id;
    testCustomerToken = generateCustomerToken(customer);
  });

  suite.after(async () => {
    try {
      if (testCustomerId) {
        await prisma.order.deleteMany({ where: { customerId: testCustomerId } });
        await prisma.customerActivity.deleteMany({ where: { customerId: testCustomerId } });
        await prisma.customer.delete({ where: { id: testCustomerId } });
      }
      if (testProductId || testProduct2Id) {
        await prisma.product.deleteMany({
          where: { id: { in: [testProductId, testProduct2Id].filter(Boolean) } },
        });
      }
      if (testCategoryId) {
        await prisma.marketplaceCategory.delete({ where: { id: testCategoryId } });
      }
      if (testSupplierId) {
        await prisma.supplier.delete({ where: { id: testSupplierId } });
      }
    } catch (e) {
      console.warn('Cleanup error in order test suite:', e.message);
    }
  });

  // ============================================================================
  // Suite 1: Sequential Order Number Generation
  // ============================================================================
  await suite.test('1. Sequential Order Number Generation', async (t) => {
    await t.test('generateNextOrderNumber produces format ORD-YYYY-XXXXXX', async () => {
      const orderNum1 = await generateNextOrderNumber();
      const orderNum2 = await generateNextOrderNumber();

      const regex = /^ORD-\d{4}-\d{6}$/;
      assert.ok(regex.test(orderNum1), `orderNum1 "${orderNum1}" does not match ORD-YYYY-XXXXXX`);
      assert.ok(regex.test(orderNum2), `orderNum2 "${orderNum2}" does not match ORD-YYYY-XXXXXX`);
      assert.notEqual(orderNum1, orderNum2, 'Consecutive order numbers must be unique');
    });
  });

  // ============================================================================
  // Suite 2: Customer Mobile Checkout & Authoritative Calculations
  // ============================================================================
  await suite.test('2. Customer Mobile Checkout & Authoritative Calculations', async (t) => {
    await t.test('POST /api/customer/orders/checkout calculates authoritative weight and total from database', async () => {
      const idempotencyKey = `idem-${Date.now()}`;
      // Order:
      // Item 1: 2 x 500 ETB (25kg each) = 1,000 ETB, 50kg
      // Item 2: 3 x 200 ETB (10kg each) = 600 ETB, 30kg
      // Subtotal = 1,600 ETB
      // Total weight = 80kg
      // Delivery fee = 150 base + (80 - 50) * 5 = 150 + 150 = 300 ETB
      // Grand total = 1,900 ETB
      const res = await request(app)
        .post('/api/customer/orders/checkout')
        .set('Authorization', `Bearer ${testCustomerToken}`)
        .send({
          customerId: testCustomerId,
          idempotencyKey,
          items: [
            { productId: testProductId, quantity: 2 },
            { productId: testProduct2Id, quantity: 3 },
          ],
          deliveryAddress: {
            recipientName: 'Meskerem Tadesse',
            phone: '+251922334455',
            city: 'Gondar',
            deliveryZone: 'Arada Central',
            neighborhood: 'Piazza',
            addressLine: 'Near Central Post Office, House 452',
            latitude: 12.6075,
            longitude: 37.4647,
          },
          paymentMethod: 'TELEBIRR',
          customerNote: 'Please deliver before 4 PM',
        });

      assert.equal(res.status, 201);
      assert.equal(res.body.success, true);
      assert.ok(res.body.data.id);
      assert.ok(res.body.data.orderNumber.startsWith('ORD-'));
      assert.equal(res.body.data.status, 'PENDING');
      assert.equal(res.body.data.city, 'Gondar');

      // Authoritative financial calculations
      assert.equal(res.body.data.subtotalEtb, 1600);
      assert.equal(res.body.data.totalWeightKg, 80);
      assert.equal(res.body.data.deliveryFeeEtb, 300);
      assert.equal(res.body.data.totalEtb, 1900);

      // Snapshots verification
      assert.equal(res.body.data.items.length, 2);
      const item1 = res.body.data.items.find((i) => i.productId === testProductId);
      assert.equal(item1.productName, 'Premium Gondar White Teff (25kg)');
      assert.equal(item1.quantity, 2);
      assert.equal(item1.unitPriceEtb, 500);
      assert.equal(item1.unitWeightKg, 25);
      assert.equal(item1.totalWeightKg, 50);
      assert.equal(item1.totalPriceEtb, 1000);

      // Delivery Address snapshot
      assert.ok(res.body.data.deliveryAddressSnapshot);
      assert.equal(res.body.data.deliveryAddressSnapshot.recipientName, 'Meskerem Tadesse');
      assert.equal(res.body.data.deliveryAddressSnapshot.neighborhood, 'Piazza');

      // Activity log
      assert.ok(res.body.data.timeline.length >= 1);
      assert.equal(res.body.data.timeline[0].status, 'PENDING');

      createdOrderId = res.body.data.id;
    });

    await t.test('Duplicate checkout with same idempotencyKey returns existing order without creating duplicate', async () => {
      const idempotencyKey = `idem-repeat-${Date.now()}`;

      const res1 = await request(app)
        .post('/api/customer/orders/checkout')
        .set('Authorization', `Bearer ${testCustomerToken}`)
        .send({
          customerId: testCustomerId,
          idempotencyKey,
          items: [{ productId: testProductId, quantity: 1 }],
          deliveryAddress: {
            recipientName: 'Meskerem Tadesse',
            phone: '+251922334455',
            city: 'Gondar',
            addressLine: 'House 123',
          },
        });
      assert.equal(res1.status, 201);
      secondaryOrderId = res1.body.data.id;

      // Repeat identical request
      const res2 = await request(app)
        .post('/api/customer/orders/checkout')
        .set('Authorization', `Bearer ${testCustomerToken}`)
        .send({
          customerId: testCustomerId,
          idempotencyKey,
          items: [{ productId: testProductId, quantity: 1 }],
          deliveryAddress: {
            recipientName: 'Meskerem Tadesse',
            phone: '+251922334455',
            city: 'Gondar',
            addressLine: 'House 123',
          },
        });

      assert.equal(res2.status, 201);
      assert.equal(res2.body.data.id, secondaryOrderId, 'Must return the existing order without creating duplicate');
    });

    await t.test('Historical product snapshots remain immutable when catalog product changes later', async () => {
      // Modify test product price and name in the catalog
      await prisma.product.update({
        where: { id: testProductId },
        data: {
          name: 'MODIFIED PRODUCT NAME SHOULD NOT AFFECT OLD ORDERS',
          sellingPrice: 9999.0,
          weight: 99.0,
        },
      });

      // Retrieve the previously created order
      const res = await request(app)
        .get(`/api/orders/${createdOrderId}`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      assert.equal(res.status, 200);
      const snapshotItem = res.body.data.items.find((i) => i.productId === testProductId);
      // Snapshot must preserve the original name and price
      assert.equal(snapshotItem.productName, 'Premium Gondar White Teff (25kg)');
      assert.equal(snapshotItem.unitPriceEtb, 500);
      assert.equal(snapshotItem.unitWeightKg, 25);
      assert.equal(res.body.data.subtotalEtb, 1600);
    });

    await t.test('Rejects checkout for unauthenticated customer with 401', async () => {
      const res = await request(app)
        .post('/api/customer/orders/checkout')
        .send({
          items: [{ productId: testProductId, quantity: 1 }],
          deliveryAddress: {
            recipientName: 'Guest User',
            phone: '+251911000000',
            city: 'Gondar',
            addressLine: 'Guest Line',
          },
        });

      assert.equal(res.status, 401);
      assert.equal(res.body.success, false);
    });

    await t.test('Rejects checkout for inactive/suspended customer with 403 or 400', async () => {
      const suspendedCustomer = await prisma.customer.create({
        data: {
          customerCode: `CUST-SUS-${Date.now().toString().slice(-6)}`,
          fullName: 'Suspended User',
          phone: `+251933${Math.floor(100000 + Math.random() * 900000)}`,
          status: 'SUSPENDED',
          city: 'Gondar',
        },
      });

      const suspendedToken = generateCustomerToken(suspendedCustomer);

      const res = await request(app)
        .post('/api/customer/orders/checkout')
        .set('Authorization', `Bearer ${suspendedToken}`)
        .send({
          customerId: suspendedCustomer.id,
          items: [{ productId: testProductId, quantity: 1 }],
          deliveryAddress: {
            recipientName: 'Suspended User',
            phone: '+251933112233',
            city: 'Gondar',
            addressLine: 'Address line',
          },
        });

      assert.ok([400, 403].includes(res.status));

      // Cleanup
      await prisma.customer.delete({ where: { id: suspendedCustomer.id } });
    });
  });

  // ============================================================================
  // Suite 3: Security, RBAC & Authorization
  // ============================================================================
  await suite.test('3. Security, RBAC & Authorization', async (t) => {
    await t.test('GET /api/orders rejects unauthenticated requests with 401', async () => {
      const res = await request(app).get('/api/orders');
      assert.equal(res.status, 401);
      assert.equal(res.body.success, false);
    });

    await t.test('GET /api/orders rejects unauthorized role without order permissions with 403', async () => {
      const res = await request(app)
        .get('/api/orders')
        .set('Authorization', `Bearer ${subAdminToken}`);

      assert.equal(res.status, 403);
      assert.equal(res.body.success, false);
    });

    await t.test('GET /api/orders allows Super Admin with 200', async () => {
      const res = await request(app)
        .get('/api/orders')
        .set('Authorization', `Bearer ${superAdminToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(Array.isArray(res.body.data));
    });
  });

  // ============================================================================
  // Suite 4: Controlled Lifecycle State Transitions & Audit Trail
  // ============================================================================
  await suite.test('4. Controlled Lifecycle State Transitions & Audit Trail', async (t) => {
    await t.test('Super Admin confirms order: PENDING -> CONFIRMED', async () => {
      const res = await request(app)
        .post(`/api/orders/${createdOrderId}/confirm`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.data.status, 'CONFIRMED');
      assert.ok(res.body.data.confirmedAt);
    });

    await t.test('Super Admin moves order to processing: CONFIRMED -> PROCESSING', async () => {
      const res = await request(app)
        .post(`/api/orders/${createdOrderId}/process`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.data.status, 'PROCESSING');
      assert.ok(res.body.data.processingAt);
    });

    await t.test('Super Admin stages order for delivery: PROCESSING -> READY_FOR_DELIVERY', async () => {
      const res = await request(app)
        .post(`/api/orders/${createdOrderId}/ready`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.data.status, 'READY_FOR_DELIVERY');
      assert.ok(res.body.data.readyAt);
    });

    await t.test('Invalid transition: READY_FOR_DELIVERY -> PENDING is strictly rejected with 400', async () => {
      const res = await request(app)
        .patch(`/api/orders/${createdOrderId}/status`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ status: 'PENDING' });

      assert.equal(res.status, 400);
      assert.equal(res.body.error.code, 'INVALID_STATUS_TRANSITION');
    });

    await t.test('Cancelling order requires a valid reason and records OrderActivity & AuditLog', async () => {
      // Rejection without reason fails validation
      const failedRes = await request(app)
        .post(`/api/orders/${createdOrderId}/cancel`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({});

      assert.equal(failedRes.status, 400);

      // Cancel with reason succeeds
      const res = await request(app)
        .post(`/api/orders/${createdOrderId}/cancel`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ reason: 'Customer requested cancellation due to travel schedule.' });

      assert.equal(res.status, 200);
      assert.equal(res.body.data.status, 'CANCELLED');
      assert.equal(res.body.data.cancelledReason, 'Customer requested cancellation due to travel schedule.');

      // Verify AuditLog
      const audit = await prisma.auditLog.findFirst({
        where: { entity: 'Order', entityId: createdOrderId },
        orderBy: { timestamp: 'desc' },
      });
      assert.ok(audit);
      assert.equal(audit.action, 'ORDER_STATUS_TRANSITION');
      assert.ok(audit.changesSummary.includes('CANCELLED'));
    });

    await t.test('Terminal state: CANCELLED order cannot be re-opened or transitioned', async () => {
      const res = await request(app)
        .post(`/api/orders/${createdOrderId}/confirm`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      assert.equal(res.status, 400);
      assert.equal(res.body.error.code, 'INVALID_STATUS_TRANSITION');
    });

    await t.test('Rejecting order: PENDING -> REJECTED with reason', async () => {
      // Create fresh pending order
      const freshOrderRes = await request(app)
        .post('/api/customer/orders/checkout')
        .set('Authorization', `Bearer ${testCustomerToken}`)
        .send({
          customerId: testCustomerId,
          items: [{ productId: testProduct2Id, quantity: 1 }],
          deliveryAddress: {
            recipientName: 'Test Recipient',
            phone: '+251911223344',
            city: 'Gondar',
            addressLine: 'Test Address',
          },
        });
      const pendingOrderId = freshOrderRes.body.data.id;

      const rejectRes = await request(app)
        .post(`/api/orders/${pendingOrderId}/reject`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ reason: 'Out of stock at Gondar agricultural hub.' });

      assert.equal(rejectRes.status, 200);
      assert.equal(rejectRes.body.data.status, 'REJECTED');
      assert.equal(rejectRes.body.data.rejectedReason, 'Out of stock at Gondar agricultural hub.');

      // Cleanup
      await prisma.order.delete({ where: { id: pendingOrderId } });
    });
  });

  // ============================================================================
  // Suite 5: Queries, Search, Filters, Bulk Status & Metrics
  // ============================================================================
  await suite.test('5. Queries, Search, Filters, Bulk Status & Metrics', async (t) => {
    await t.test('GET /api/orders/summary returns aggregated counts', async () => {
      const res = await request(app)
        .get('/api/orders/summary?city=Gondar')
        .set('Authorization', `Bearer ${superAdminToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(typeof res.body.data.totalOrders === 'number');
      assert.ok(typeof res.body.data.pendingOrders === 'number');
      assert.ok(typeof res.body.data.processingOrders === 'number');
      assert.ok(typeof res.body.data.todayOrders === 'number');
    });

    await t.test('GET /api/orders supports search by customer name', async () => {
      const res = await request(app)
        .get('/api/orders?search=Meskerem')
        .set('Authorization', `Bearer ${superAdminToken}`);

      assert.equal(res.status, 200);
      assert.ok(res.body.data.length >= 1);
      assert.ok(res.body.data.some((o) => o.customerName.includes('Meskerem')));
    });

    await t.test('GET /api/orders/:id/activity returns chronological events', async () => {
      const res = await request(app)
        .get(`/api/orders/${createdOrderId}/activity`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      assert.equal(res.status, 200);
      assert.ok(Array.isArray(res.body.data));
      assert.ok(res.body.data.length >= 4); // Placed, Confirmed, Processing, Ready, Cancelled
    });

    await t.test('POST /api/orders/bulk-status updates multiple orders in transaction', async () => {
      // Create two pending orders for bulk test
      const o1 = await request(app)
        .post('/api/customer/orders/checkout')
        .set('Authorization', `Bearer ${testCustomerToken}`)
        .send({
          customerId: testCustomerId,
          items: [{ productId: testProduct2Id, quantity: 1 }],
          deliveryAddress: {
            recipientName: 'Bulk User 1',
            phone: '+251911998877',
            city: 'Gondar',
            addressLine: 'Bulk Line 1',
          },
        });
      const o2 = await request(app)
        .post('/api/customer/orders/checkout')
        .set('Authorization', `Bearer ${testCustomerToken}`)
        .send({
          customerId: testCustomerId,
          items: [{ productId: testProduct2Id, quantity: 1 }],
          deliveryAddress: {
            recipientName: 'Bulk User 2',
            phone: '+251911998878',
            city: 'Gondar',
            addressLine: 'Bulk Line 2',
          },
        });

      const id1 = o1.body.data.id;
      const id2 = o2.body.data.id;

      const bulkRes = await request(app)
        .post('/api/orders/bulk-status')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          ids: [id1, id2],
          status: 'CONFIRMED',
        });

      assert.equal(bulkRes.status, 200);
      assert.equal(bulkRes.body.data.count, 2);

      // Verify both orders are now CONFIRMED
      const check1 = await prisma.order.findUnique({ where: { id: id1 } });
      const check2 = await prisma.order.findUnique({ where: { id: id2 } });
      assert.equal(check1.status, 'CONFIRMED');
      assert.equal(check2.status, 'CONFIRMED');

      // Cleanup
      await prisma.order.deleteMany({ where: { id: { in: [id1, id2] } } });
    });
  });
});
