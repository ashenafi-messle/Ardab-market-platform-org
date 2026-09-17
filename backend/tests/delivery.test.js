// ==============================================================================
// Ardab Market - Deliveries Module Integration Test Suite
// ==============================================================================

import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/shared/config/database.js';
import { generateAdminToken } from '../src/admin/services/auth.service.js';
import { ADMIN_ROLES } from '../src/admin/constants/adminRoles.js';
import { generateNextDeliveryNumber, generateNextTripNumber } from '../src/admin/services/deliveryCode.service.js';

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

test('Deliveries Module Integration Test Suite', async (suite) => {
  let testCustomerId = null;
  let testSupplierId = null;
  let testCategoryId = null;
  let testProductId = null;
  let testOrderId = null;
  let secondaryOrderId = null;
  let testDeliveryId = null;
  let secondaryDeliveryId = null;
  let testVehicleId = null;
  let testDriverId = null;
  let testTripId = null;

  suite.before(async () => {
    // 1. Create a test customer
    const customer = await prisma.customer.create({
      data: {
        customerCode: `CST-DEL-${Date.now()}`,
        fullName: 'Abebe Delivery Customer',
        phone: `+251911${Math.floor(100000 + Math.random() * 900000)}`,
        email: `del_cust_${Date.now()}@test.com`,
        city: 'Gondar',
        deliveryZone: 'Arada Central',
        status: 'ACTIVE',
      },
    });
    testCustomerId = customer.id;

    // 2. Create supplier & category & product
    const supplier = await prisma.supplier.create({
      data: {
        companyName: `Del Agro Producer ${Date.now()}`,
        name: 'Ato Delivery Farmer',
        phone: `+251912${Math.floor(100000 + Math.random() * 900000)}`,
        city: 'Gondar',
        address: 'Kebele 18 Hub',
        status: 'ACTIVE',
      },
    });
    testSupplierId = supplier.id;

    const category = await prisma.marketplaceCategory.create({
      data: {
        name: `Del Grains ${Date.now()}`,
        slug: `del-grains-${Date.now()}`,
        isActive: true,
      },
    });
    testCategoryId = category.id;

    const product = await prisma.product.create({
      data: {
        itemCode: `ITM-DEL-${Date.now()}`,
        name: 'Highland White Teff (50kg Bag)',
        marketplaceCategoryId: category.id,
        sellerId: supplier.id,
        unit: 'Quintal',
        weight: 50.0,
        costPrice: 6500.0,
        sellingPrice: 7500.0,
        status: 'ACTIVE',
      },
    });
    testProductId = product.id;

    // 3. Create Orders for delivery tests
    const order1 = await prisma.order.create({
      data: {
        orderNumber: `ORD-DEL1-${Date.now()}`,
        customerId: customer.id,
        city: 'Gondar',
        deliveryZone: 'Arada Central',
        deliveryAddress: 'Kebele 03, House 412',
        status: 'CONFIRMED',
        subtotal: 15000.0,
        deliveryFee: 250.0,
        totalAmount: 15250.0,
        totalWeight: 100.0, // 2 x 50kg
        paymentStatus: 'PAID',
        items: {
          create: [
            {
              productId: product.id,
              productNameSnapshot: product.name,
              itemCodeSnapshot: product.itemCode,
              unitSnapshot: product.unit,
              unitPrice: 7500.0,
              quantity: 2,
              weightPerUnit: 50.0,
              totalWeight: 100.0,
              subtotal: 15000.0,
              sellerIdSnapshot: supplier.id,
              sellerNameSnapshot: supplier.companyName,
            },
          ],
        },
        deliveryAddressSnapshot: {
          create: {
            recipientName: 'Abebe Delivery Customer',
            phone: customer.phone,
            city: 'Gondar',
            deliveryZone: 'Arada Central',
            neighborhood: 'Kebele 03',
            addressLine: 'Kebele 03, House 412',
            latitude: 12.603,
            longitude: 37.452,
          },
        },
      },
    });
    testOrderId = order1.id;

    const order2 = await prisma.order.create({
      data: {
        orderNumber: `ORD-DEL2-${Date.now()}`,
        customerId: customer.id,
        city: 'Gondar',
        deliveryZone: 'Maraki Campus Zone',
        deliveryAddress: 'Maraki Main Gate',
        status: 'CONFIRMED',
        subtotal: 22500.0,
        deliveryFee: 300.0,
        totalAmount: 22800.0,
        totalWeight: 150.0,
        paymentStatus: 'PENDING',
        items: {
          create: [
            {
              productId: product.id,
              productNameSnapshot: product.name,
              itemCodeSnapshot: product.itemCode,
              unitSnapshot: product.unit,
              unitPrice: 7500.0,
              quantity: 3,
              weightPerUnit: 50.0,
              totalWeight: 150.0,
              subtotal: 22500.0,
            },
          ],
        },
      },
    });
    secondaryOrderId = order2.id;

    // 4. Retrieve or create vehicle and driver for Gondar
    let vehicle = await prisma.vehicle.findFirst({ where: { city: 'Gondar' } });
    if (!vehicle) {
      vehicle = await prisma.vehicle.create({
        data: {
          plateNumber: `ET-3-T${Date.now().toString().slice(-4)}`,
          model: 'Isuzu NPR Cargo 5T',
          city: 'Gondar',
          capacityKg: 5000.0,
          status: 'AVAILABLE',
        },
      });
    }
    testVehicleId = vehicle.id;

    let driver = await prisma.driver.findFirst({ where: { city: 'Gondar' } });
    if (!driver) {
      driver = await prisma.driver.create({
        data: {
          driverCode: `DRV-T${Date.now().toString().slice(-4)}`,
          fullName: 'Test Gondar Driver',
          phone: '+251911998877',
          city: 'Gondar',
          status: 'AVAILABLE',
        },
      });
    }
    testDriverId = driver.id;

    // 5. Create a test Trip in Gondar
    const tripNumber = await generateNextTripNumber();
    const trip = await prisma.trip.create({
      data: {
        tripNumber,
        city: 'Gondar',
        vehicleId: vehicle.id,
        driverId: driver.id,
        status: 'PLANNING',
        maxCapacityKg: 5000.0,
        totalWeightKg: 0.0,
        pickupHub: 'Gondar Central Distribution Hub',
        deliveryZones: ['Arada Central', 'Maraki Campus Zone'],
      },
    });
    testTripId = trip.id;
  });

  suite.after(async () => {
    // Cleanup created test records safely
    if (testDeliveryId) {
      await prisma.deliveryActivity.deleteMany({ where: { deliveryId: testDeliveryId } });
      await prisma.delivery.deleteMany({ where: { id: testDeliveryId } });
    }
    if (secondaryDeliveryId) {
      await prisma.deliveryActivity.deleteMany({ where: { deliveryId: secondaryDeliveryId } });
      await prisma.delivery.deleteMany({ where: { id: secondaryDeliveryId } });
    }
    if (testTripId) {
      await prisma.trip.deleteMany({ where: { id: testTripId } });
    }
    if (testOrderId) {
      await prisma.orderActivity.deleteMany({ where: { orderId: testOrderId } });
      await prisma.orderDeliveryAddress.deleteMany({ where: { orderId: testOrderId } });
      await prisma.orderItem.deleteMany({ where: { orderId: testOrderId } });
      await prisma.order.deleteMany({ where: { id: testOrderId } });
    }
    if (secondaryOrderId) {
      await prisma.orderItem.deleteMany({ where: { orderId: secondaryOrderId } });
      await prisma.order.deleteMany({ where: { id: secondaryOrderId } });
    }
    if (testProductId) {
      await prisma.product.deleteMany({ where: { id: testProductId } });
    }
    if (testCategoryId) {
      await prisma.marketplaceCategory.deleteMany({ where: { id: testCategoryId } });
    }
    if (testSupplierId) {
      await prisma.supplier.deleteMany({ where: { id: testSupplierId } });
    }
    if (testCustomerId) {
      await prisma.customer.deleteMany({ where: { id: testCustomerId } });
    }
  });

  await suite.test('1. GET /api/deliveries/summary - Dynamic KPI metric aggregation', async () => {
    const res = await request(app)
      .get('/api/deliveries/summary?city=Gondar')
      .set('Authorization', `Bearer ${superAdminToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok('totalDeliveries' in res.body.data);
    assert.ok('pendingDeliveries' in res.body.data);
    assert.ok('readyDeliveries' in res.body.data);
    assert.ok('assignedDeliveries' in res.body.data);
    assert.ok('outForDelivery' in res.body.data);
    assert.ok('deliveredToday' in res.body.data);
    assert.ok('failedDeliveries' in res.body.data);
  });

  await suite.test('2. POST /api/deliveries - Create delivery for an order with destination snapshot', async () => {
    const res = await request(app)
      .post('/api/deliveries')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        orderId: testOrderId,
        deliveryNotes: 'Urgent morning fulfillment',
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.deliveryNumber.startsWith('DEL-'));
    assert.equal(res.body.data.orderId, testOrderId);
    assert.equal(res.body.data.status, 'PENDING');
    assert.equal(res.body.data.city, 'Gondar');
    assert.equal(res.body.data.recipientName, 'Abebe Delivery Customer');
    assert.equal(res.body.data.deliveryFee, 250);

    testDeliveryId = res.body.data.id;
  });

  await suite.test('3. POST /api/deliveries - Rejects duplicate delivery creation for same order', async () => {
    const res = await request(app)
      .post('/api/deliveries')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        orderId: testOrderId,
      });

    assert.equal(res.status, 409);
    assert.equal(res.body.success, false);
  });

  await suite.test('4. GET /api/deliveries - Server-side pagination, search, and filtering', async () => {
    const res = await request(app)
      .get(`/api/deliveries?city=Gondar&status=PENDING&pageSize=10`)
      .set('Authorization', `Bearer ${superAdminToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(Array.isArray(res.body.data));
    assert.ok(res.body.pagination);
    assert.equal(res.body.pagination.page, 1);

    const found = res.body.data.find((d) => d.id === testDeliveryId);
    assert.ok(found, 'Created test delivery must appear in list');
    assert.equal(found.status, 'PENDING');
  });

  await suite.test('5. GET /api/deliveries/:id - Retrieves full details with order items snapshot', async () => {
    const res = await request(app)
      .get(`/api/deliveries/${testDeliveryId}`)
      .set('Authorization', `Bearer ${superAdminToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.id, testDeliveryId);
    assert.equal(res.body.data.order.totalWeight, 100);
    assert.equal(res.body.data.order.items.length, 1);
    assert.equal(res.body.data.order.items[0].productName, 'Highland White Teff (50kg Bag)');
    assert.ok(res.body.data.activities.length >= 1);
  });

  await suite.test('6. POST /api/deliveries/:id/prepare - Transitions PENDING to READY_FOR_ASSIGNMENT', async () => {
    const res = await request(app)
      .post(`/api/deliveries/${testDeliveryId}/prepare`)
      .set('Authorization', `Bearer ${superAdminToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.status, 'READY_FOR_ASSIGNMENT');
  });

  await suite.test('7. GET /api/deliveries/trips-available - Lists available vehicle trips under 5,000 KG', async () => {
    const res = await request(app)
      .get('/api/deliveries/trips-available?city=Gondar')
      .set('Authorization', `Bearer ${superAdminToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(Array.isArray(res.body.data));

    const trip = res.body.data.find((t) => t.id === testTripId);
    assert.ok(trip, 'Test trip must appear in available trips');
    assert.equal(trip.capacityKg, 5000);
    assert.equal(trip.remainingCapacityKg, 5000);
  });

  await suite.test('8. POST /api/deliveries/:id/assign-trip - Enforces 5,000 KG vehicle capacity & city check', async () => {
    // 8a. Test city mismatch rejection
    const mockTripOtherCity = await prisma.trip.create({
      data: {
        tripNumber: `TRP-BD-${Date.now()}`,
        city: 'Bahir Dar',
        status: 'PLANNING',
        maxCapacityKg: 5000.0,
      },
    });

    const mismatchRes = await request(app)
      .post(`/api/deliveries/${testDeliveryId}/assign-trip`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ tripId: mockTripOtherCity.id });

    assert.equal(mismatchRes.status, 400);
    assert.ok(mismatchRes.body.error.message.includes('City mismatch'));
    await prisma.trip.delete({ where: { id: mockTripOtherCity.id } });

    // 8b. Valid assignment to matching Gondar trip
    const validRes = await request(app)
      .post(`/api/deliveries/${testDeliveryId}/assign-trip`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ tripId: testTripId });

    assert.equal(validRes.status, 200);
    assert.equal(validRes.body.success, true);
    assert.equal(validRes.body.data.status, 'ASSIGNED');
    assert.equal(validRes.body.data.tripId, testTripId);
    assert.ok(validRes.body.data.trip);

    // Verify trip totalWeightKg was incremented by delivery weight (100 kg)
    const updatedTrip = await prisma.trip.findUnique({ where: { id: testTripId } });
    assert.equal(Number(updatedTrip.totalWeightKg), 100);

    // Verify order status synchronized to ASSIGNED_TO_TRIP
    const updatedOrder = await prisma.order.findUnique({ where: { id: testOrderId } });
    assert.equal(updatedOrder.status, 'ASSIGNED_TO_TRIP');
  });

  await suite.test('9. POST /api/deliveries/:id/dispatch - Transitions ASSIGNED to OUT_FOR_DELIVERY', async () => {
    const res = await request(app)
      .post(`/api/deliveries/${testDeliveryId}/dispatch`)
      .set('Authorization', `Bearer ${superAdminToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.status, 'OUT_FOR_DELIVERY');
    assert.ok(res.body.data.dispatchedAt);

    // Verify order synchronized to IN_TRANSIT
    const updatedOrder = await prisma.order.findUnique({ where: { id: testOrderId } });
    assert.equal(updatedOrder.status, 'IN_TRANSIT');
  });

  await suite.test('10. POST /api/deliveries/:id/complete - Completes delivery and fulfills order', async () => {
    const res = await request(app)
      .post(`/api/deliveries/${testDeliveryId}/complete`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        proofOfDeliveryUrl: 'https://res.cloudinary.com/ardab/pod/sign-test.jpg',
        notes: 'Signed and accepted by recipient',
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.status, 'DELIVERED');
    assert.ok(res.body.data.deliveredAt);
    assert.equal(res.body.data.proofOfDeliveryUrl, 'https://res.cloudinary.com/ardab/pod/sign-test.jpg');

    // Verify order status synchronized to DELIVERED
    const updatedOrder = await prisma.order.findUnique({ where: { id: testOrderId } });
    assert.equal(updatedOrder.status, 'DELIVERED');
    assert.ok(updatedOrder.deliveredAt);
  });

  await suite.test('11. State Machine Constraint - DELIVERED cannot transition back to PENDING', async () => {
    const res = await request(app)
      .post(`/api/deliveries/${testDeliveryId}/prepare`)
      .set('Authorization', `Bearer ${superAdminToken}`);

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.ok(res.body.error.message.includes('Invalid delivery status transition'));
  });

  await suite.test('12. POST /api/deliveries/:id/fail - Records failure with structured reason', async () => {
    // Create second delivery for order2
    const createRes = await request(app)
      .post('/api/deliveries')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ orderId: secondaryOrderId });

    assert.equal(createRes.status, 201);
    secondaryDeliveryId = createRes.body.data.id;

    // Advance to OUT_FOR_DELIVERY
    await prisma.delivery.update({
      where: { id: secondaryDeliveryId },
      data: { status: 'OUT_FOR_DELIVERY' },
    });

    const failRes = await request(app)
      .post(`/api/deliveries/${secondaryDeliveryId}/fail`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        reason: 'Customer unavailable at destination',
        notes: 'Attempted phone call 3 times, no response',
      });

    assert.equal(failRes.status, 200);
    assert.equal(failRes.body.success, true);
    assert.equal(failRes.body.data.status, 'FAILED');
    assert.equal(failRes.body.data.failureReason, 'Customer unavailable at destination');
    assert.ok(failRes.body.data.failedAt);

    // Verify order status is FAILED
    const updatedOrder = await prisma.order.findUnique({ where: { id: secondaryOrderId } });
    assert.equal(updatedOrder.status, 'FAILED');
  });

  await suite.test('13. POST /api/deliveries/:id/cancel - Cancels delivery with reason', async () => {
    const cancelRes = await request(app)
      .post(`/api/deliveries/${secondaryDeliveryId}/cancel`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        reason: 'Customer requested change of fulfillment date',
      });

    assert.equal(cancelRes.status, 200);
    assert.equal(cancelRes.body.success, true);
    assert.equal(cancelRes.body.data.status, 'CANCELLED');
    assert.equal(cancelRes.body.data.cancellationReason, 'Customer requested change of fulfillment date');
    assert.ok(cancelRes.body.data.cancelledAt);

    // Verify order status is CANCELLED
    const updatedOrder = await prisma.order.findUnique({ where: { id: secondaryOrderId } });
    assert.equal(updatedOrder.status, 'CANCELLED');
  });

  await suite.test('14. RBAC & Security - Sub Admin without deliveries permission is rejected', async () => {
    const res = await request(app)
      .get('/api/deliveries')
      .set('Authorization', `Bearer ${subAdminToken}`);

    // Sub admin does not have deliveries:view
    assert.equal(res.status, 403);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'INSUFFICIENT_PERMISSIONS');
  });

  await suite.test('15. GET /api/deliveries/:id/activity - Timeline history verification', async () => {
    const res = await request(app)
      .get(`/api/deliveries/${testDeliveryId}/activity`)
      .set('Authorization', `Bearer ${superAdminToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(Array.isArray(res.body.data));
    assert.ok(res.body.data.length >= 3, 'Must record multiple lifecycle events');

    const actions = res.body.data.map((a) => a.action);
    assert.ok(actions.some((a) => a.includes('created')));
    assert.ok(actions.some((a) => a.includes('Assigned')));
    assert.ok(actions.some((a) => a.includes('Completed')));
  });
});
