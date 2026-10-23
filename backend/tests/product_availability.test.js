// ==============================================================================
// Ardab Market - Product Availability & Sold Out Integration Test Suite
// ==============================================================================

import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/shared/config/database.js';
import { generateAdminToken } from '../src/admin/services/auth.service.js';
import { generateCustomerToken } from '../src/customer/services/customerAuth.service.js';
import { ADMIN_ROLES } from '../src/admin/constants/adminRoles.js';
import { paymentService } from '../src/customer/services/payment.service.js';

const app = createApp();

test('Product Availability & Sold Out Production Suite', async (suite) => {
  let superAdminToken = null;
  let subAdminToken = null;
  let customerToken = null;
  let testCustomer = null;
  let testSupplier = null;
  let testCategory = null;
  let testProduct = null;
  let testOrder = null;

  suite.before(async () => {
    // 1. Get or create seeded admins
    const superAdmin = await prisma.adminUser.findFirst({
      where: { role: 'SUPER_ADMIN' },
    });
    superAdminToken = generateAdminToken({
      id: superAdmin ? superAdmin.id : 'df61c5d7-3f2d-40e3-aea6-6b527a6d353a',
      email: superAdmin ? superAdmin.email : 'admin@ardabmarket.com',
      name: superAdmin ? superAdmin.name : 'Super Admin',
      role: ADMIN_ROLES.SUPER_ADMIN,
    });

    const subAdmin = await prisma.adminUser.findFirst({
      where: { role: 'SUB_ADMIN' },
    });
    subAdminToken = generateAdminToken({
      id: subAdmin ? subAdmin.id : 'subadmin-uuid-1',
      email: subAdmin ? subAdmin.email : 'subadmin@ardabmarket.com',
      name: subAdmin ? subAdmin.name : 'Sub Admin',
      role: ADMIN_ROLES.SUB_ADMIN,
    });

    // 2. Create test customer
    testCustomer = await prisma.customer.create({
      data: {
        customerCode: `CUST-AVL-${Date.now().toString().slice(-6)}`,
        phone: `+251911${Math.floor(100000 + Math.random() * 900000)}`,
        fullName: 'Availability Test Customer',
        email: `avail_cust_${Date.now()}@test.com`,
        status: 'ACTIVE',
      },
    });
    customerToken = generateCustomerToken(testCustomer);

    // 3. Create test supplier
    testSupplier = await prisma.supplier.create({
      data: {
        name: 'Availability Agro Supplier',
        companyName: 'Availability Agro PLC',
        email: 'avail_supplier@test.com',
        phone: '+251922999888',
        city: 'Addis Ababa',
        address: 'Bole Hub',
        status: 'ACTIVE',
        verificationStatus: 'VERIFIED',
      },
    });

    // 4. Create test category
    testCategory = await prisma.marketplaceCategory.create({
      data: {
        name: 'Availability Test Grains',
        slug: `avail-test-grains-${Date.now()}`,
        isActive: true,
      },
    });

    // 5. Create test product
    testProduct = await prisma.product.create({
      data: {
        itemCode: `TEST-AVL-${Date.now().toString().slice(-6)}`,
        name: 'Premium Teff Grain',
        description: 'Fresh highland teff',
        sellerId: testSupplier.id,
        marketplaceCategoryId: testCategory.id,
        unit: 'kg',
        weight: 5.0,
        sellingPrice: 250.0,
        status: 'ACTIVE',
        isSoldOut: false,
        cityAvailability: ['All Cities'],
      },
    });
  });

  suite.after(async () => {
    try {
      if (testOrder?.id) {
        await prisma.orderActivity.deleteMany({ where: { orderId: testOrder.id } });
        await prisma.orderDeliveryAddress.deleteMany({ where: { orderId: testOrder.id } });
        await prisma.orderItem.deleteMany({ where: { orderId: testOrder.id } });
        await prisma.payment.deleteMany({ where: { orderId: testOrder.id } });
        await prisma.order.deleteMany({ where: { id: testOrder.id } });
      }
      if (testProduct?.id) {
        await prisma.product.deleteMany({ where: { id: testProduct.id } });
      }
      if (testCategory?.id) {
        await prisma.marketplaceCategory.deleteMany({ where: { id: testCategory.id } });
      }
      if (testSupplier?.id) {
        await prisma.supplier.deleteMany({ where: { id: testSupplier.id } });
      }
      if (testCustomer?.id) {
        await prisma.customer.deleteMany({ where: { id: testCustomer.id } });
      }
    } catch {
      // Ignore cleanup errors
    }
  });

  // ----------------------------------------------------------------------------
  // SECTION 1: Super Admin Availability Endpoint & RBAC
  // ----------------------------------------------------------------------------
  await suite.test('1.1 Super Admin can mark a product Sold Out', async () => {
    const res = await request(app)
      .patch(`/api/products/${testProduct.id}/availability`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ isSoldOut: true });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.isSoldOut, true);
    assert.equal(res.body.data.isAvailable, false);
    assert.equal(res.body.data.availabilityStatus, 'SOLD_OUT');

    // Confirm in DB
    const inDb = await prisma.product.findUnique({ where: { id: testProduct.id } });
    assert.equal(inDb.isSoldOut, true);
  });

  await suite.test('1.2 Super Admin can restore product availability', async () => {
    const res = await request(app)
      .patch(`/api/products/${testProduct.id}/availability`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ isSoldOut: false });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.isSoldOut, false);
    assert.equal(res.body.data.isAvailable, true);
    assert.equal(res.body.data.availabilityStatus, 'AVAILABLE');

    const inDb = await prisma.product.findUnique({ where: { id: testProduct.id } });
    assert.equal(inDb.isSoldOut, false);
  });

  await suite.test('1.3 Unauthenticated request is rejected with 401', async () => {
    const res = await request(app)
      .patch(`/api/products/${testProduct.id}/availability`)
      .send({ isSoldOut: true });

    assert.equal(res.status, 401);
  });

  await suite.test('1.4 Non-Super Admin (Sub Admin) request is rejected with 403', async () => {
    const res = await request(app)
      .patch(`/api/products/${testProduct.id}/availability`)
      .set('Authorization', `Bearer ${subAdminToken}`)
      .send({ isSoldOut: true });

    assert.equal(res.status, 403);
  });

  await suite.test('1.5 Invalid product ID format is rejected with 400', async () => {
    const res = await request(app)
      .patch('/api/products/not-a-valid-uuid/availability')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ isSoldOut: true });

    assert.equal(res.status, 400);
  });

  await suite.test('1.6 Non-existent product ID returns 404', async () => {
    const res = await request(app)
      .patch('/api/products/00000000-0000-0000-0000-000000000000/availability')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ isSoldOut: true });

    assert.equal(res.status, 404);
  });

  await suite.test('1.7 Missing or invalid isSoldOut body returns 400', async () => {
    const res = await request(app)
      .patch(`/api/products/${testProduct.id}/availability`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({});

    assert.equal(res.status, 400);
  });

  await suite.test('1.8 Audit log entry is recorded for availability changes', async () => {
    // Mark it sold out
    await request(app)
      .patch(`/api/products/${testProduct.id}/availability`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ isSoldOut: true });

    const auditLog = await prisma.auditLog.findFirst({
      where: {
        entity: 'Product',
        entityId: testProduct.id,
        action: 'PRODUCT_AVAILABILITY_CHANGED',
      },
      orderBy: { timestamp: 'desc' },
    });

    assert.ok(auditLog, 'Audit log must be created for availability change');
    assert.match(auditLog.changesSummary, /isSoldOut/);
  });

  // ----------------------------------------------------------------------------
  // SECTION 2: Customer Web & Mobile Catalog Visibility
  // ----------------------------------------------------------------------------
  await suite.test('2.1 Customer Web Catalog returns isSoldOut and availabilityStatus', async () => {
    // Ensure product is marked sold out
    await prisma.product.update({
      where: { id: testProduct.id },
      data: { isSoldOut: true },
    });

    const res = await request(app)
      .get(`/api/customer/products/${testProduct.id}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.isSoldOut, true);
    assert.equal(res.body.data.isAvailable, false);
    assert.equal(res.body.data.availabilityStatus, 'SOLD_OUT');
  });

  await suite.test('2.2 Customer Mobile Catalog returns isSoldOut and availabilityStatus', async () => {
    const res = await request(app)
      .get(`/api/customer-mobile/products/${testProduct.id}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.isSoldOut, true);
    assert.equal(res.body.data.isAvailable, false);
    assert.equal(res.body.data.availabilityStatus, 'SOLD_OUT');
  });

  // ----------------------------------------------------------------------------
  // SECTION 3: Backend Checkout Boundary Enforcement
  // ----------------------------------------------------------------------------
  await suite.test('3.1 Order creation rejects Sold Out product with 400 and PRODUCT_SOLD_OUT', async () => {
    // Product is currently sold out (isSoldOut = true)
    const orderPayload = {
      items: [
        {
          productId: testProduct.id,
          quantity: 2,
        },
      ],
      deliveryAddress: {
        recipientName: 'Abebe Kebede',
        phone: '+251911999888',
        city: 'Addis Ababa',
        addressLine: 'Bole Subcity, Woreda 03, House 123',
      },
      paymentMethod: 'CASH_ON_DELIVERY',
    };

    const res = await request(app)
      .post('/api/customer/orders/checkout')
      .set('Authorization', `Bearer ${customerToken}`)
      .send(orderPayload);

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'PRODUCT_SOLD_OUT');
  });

  await suite.test('3.2 Restoring availability allows successful order placement', async () => {
    // Restore availability
    await request(app)
      .patch(`/api/products/${testProduct.id}/availability`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ isSoldOut: false });

    const orderPayload = {
      items: [
        {
          productId: testProduct.id,
          quantity: 2,
        },
      ],
      deliveryAddress: {
        recipientName: 'Abebe Kebede',
        phone: '+251911999888',
        city: 'Addis Ababa',
        addressLine: 'Bole Subcity, Woreda 03, House 123',
      },
      paymentMethod: 'ONLINE',
    };

    const res = await request(app)
      .post('/api/customer/orders/checkout')
      .set('Authorization', `Bearer ${customerToken}`)
      .send(orderPayload);

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.id);
    testOrder = res.body.data;
  });

  await suite.test('3.3 Chapa payment initialization rejects order if item becomes Sold Out', async () => {
    assert.ok(testOrder?.id, 'testOrder must exist');

    // Super Admin marks the product Sold Out after order creation
    await request(app)
      .patch(`/api/products/${testProduct.id}/availability`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ isSoldOut: true });

    // Customer attempts to initialize online payment for this order
    await assert.rejects(
      async () => {
        await paymentService.initializePayment({
          customerId: testCustomer.id,
          orderId: testOrder.id,
          platform: 'web',
        });
      },
      (err) => {
        assert.equal(err.statusCode, 400);
        assert.equal(err.code, 'PRODUCT_SOLD_OUT');
        return true;
      }
    );
  });
});
