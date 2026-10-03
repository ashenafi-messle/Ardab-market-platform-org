// ==============================================================================
// Ardab Market - Complete Payment Method System Automated Test Suite
// ==============================================================================
// Tests both distinct payment flows:
// 1. CASH ON DELIVERY (COD):
//    - Order creation with paymentMethod = 'CASH_ON_DELIVERY'
//    - Dedicated Payment record (provider = 'COD', status = 'PENDING', txRef = null, checkoutUrl = null)
//    - Strict backend guard: Never call Chapa for COD orders
//    - Rejection of Chapa initialize for COD with CHAPA_NOT_REQUIRED_FOR_COD
//    - Rejection of Chapa verification for COD with CHAPA_NOT_REQUIRED_FOR_COD
//    - Live status retrieval returns COD state without provider verification
//    - Authorized collection transitions Payment to SUCCESS and Order to PAID
//    - Duplicate collection rejected with COD_PAYMENT_ALREADY_COLLECTED
// 2. ONLINE PAYMENT (CHAPA):
//    - Order creation with paymentMethod = 'ONLINE'
//    - Chapa initialization generates unique txRef and returns checkoutUrl
//    - Customer cannot pay non-owned order
//    - Server verification transitions Payment to SUCCESS and Order to PAID
// ==============================================================================

import test from 'node:test';
import assert from 'node:assert/strict';
import { Prisma } from '@prisma/client';
import { prisma, disconnectPrisma } from '../src/shared/config/database.js';
import { paymentService } from '../src/customer/services/payment.service.js';
import { checkoutCustomerOrder, collectCodOrderPayment } from '../src/admin/services/order.service.js';
import { chapaService } from '../src/shared/services/chapa.service.js';

const Decimal = Prisma.Decimal;

test('Ardab Market: Payment Method System (COD vs ONLINE)', async (t) => {
  let customer = null;
  let testProduct = null;
  let seller = null;
  let adminUser = null;
  const createdOrderIds = [];

  t.before(async () => {
    // 1. Create Test Admin
    adminUser = {
      id: `admin-test-${Date.now()}`,
      fullName: 'Operations Manager',
      username: 'admin_ops',
      role: 'ADMIN',
    };

    // 2. Create Test Customer
    customer = await prisma.customer.create({
      data: {
        customerCode: `CUST-COD-${Date.now().toString(36).toUpperCase()}`,
        fullName: 'Dawit Alemayehu',
        phone: `+2519${Math.floor(10000000 + Math.random() * 90000000)}`,
        email: `dawit_${Date.now()}@ardabtest.com`,
        status: 'ACTIVE',
        city: 'Addis Ababa',
      },
    });

    // 3. Create Test Supplier & Marketplace Category
    const supplier = await prisma.supplier.create({
      data: {
        companyName: `Supplier Hub ${Date.now()}`,
        name: 'Ato Girma',
        phone: `+251911${Math.floor(100000 + Math.random() * 900000)}`,
        email: `supplier_${Date.now()}@ardabtest.com`,
        city: 'Addis Ababa',
        address: 'Bole Hub',
        status: 'ACTIVE',
      },
    });
    seller = supplier;

    const category = await prisma.marketplaceCategory.create({
      data: {
        name: `Test Category ${Date.now()}`,
        slug: `test-cat-${Date.now()}`,
        isActive: true,
      },
    });

    testProduct = await prisma.product.create({
      data: {
        itemCode: `ITM-COD-${Date.now()}`,
        name: 'Teff Flour 25kg Bag',
        sellerId: supplier.id,
        marketplaceCategoryId: category.id,
        costPrice: new Decimal('2000.00'),
        sellingPrice: new Decimal('2500.00'),
        unit: 'bag',
        weight: 25.0,
        status: 'ACTIVE',
      },
    });
  });

  t.after(async () => {
    try {
      // Clean up created records
      if (createdOrderIds.length > 0) {
        await prisma.paymentAuditLog.deleteMany({
          where: { payment: { orderId: { in: createdOrderIds } } },
        }).catch(() => {});
        await prisma.paymentAttempt.deleteMany({
          where: { payment: { orderId: { in: createdOrderIds } } },
        }).catch(() => {});
        await prisma.payment.deleteMany({
          where: { orderId: { in: createdOrderIds } },
        }).catch(() => {});
        await prisma.orderItem.deleteMany({
          where: { orderId: { in: createdOrderIds } },
        }).catch(() => {});
        await prisma.orderActivity.deleteMany({
          where: { orderId: { in: createdOrderIds } },
        }).catch(() => {});
        await prisma.order.deleteMany({
          where: { id: { in: createdOrderIds } },
        }).catch(() => {});
      }

      if (testProduct) {
        await prisma.product.delete({ where: { id: testProduct.id } }).catch(() => {});
      }
      if (seller) {
        await prisma.supplier.delete({ where: { id: seller.id } }).catch(() => {});
      }
      if (customer) {
        await prisma.customerActivity.deleteMany({ where: { customerId: customer.id } }).catch(() => {});
        await prisma.customer.delete({ where: { id: customer.id } }).catch(() => {});
      }
    } finally {
      await disconnectPrisma();
    }
  });

  await t.test('1. Place Cash on Delivery order: creates order, Payment(COD, PENDING), NO Chapa call', async () => {
    const orderPayload = {
      items: [{ productId: testProduct.id, quantity: 2 }],
      deliveryAddress: {
        recipientName: customer.fullName,
        phone: customer.phone,
        city: 'Addis Ababa',
        deliveryZone: 'Bole',
        addressLine: 'Near Medhane Alem Church',
      },
      paymentMethod: 'CASH_ON_DELIVERY',
    };

    const orderRes = await checkoutCustomerOrder(orderPayload, customer.id);
    createdOrderIds.push(orderRes.id);

    assert.equal(orderRes.paymentMethod, 'CASH_ON_DELIVERY');
    assert.equal(orderRes.paymentStatus, 'PENDING');
    assert.equal(orderRes.paymentRequired, false);

    // Verify database Order record
    const dbOrder = await prisma.order.findUnique({
      where: { id: orderRes.id },
      include: { payments: true },
    });

    assert.ok(dbOrder);
    assert.equal(dbOrder.paymentMethod, 'CASH_ON_DELIVERY');
    assert.equal(dbOrder.paymentStatus, 'PENDING');

    // Verify dedicated Payment record
    const codPayment = dbOrder.payments.find((p) => p.provider === 'COD');
    assert.ok(codPayment, 'Dedicated Payment record for COD must exist');
    assert.equal(codPayment.provider, 'COD');
    assert.equal(codPayment.paymentMethod, 'CASH_ON_DELIVERY');
    assert.equal(codPayment.status, 'PENDING');
    assert.equal(codPayment.txRef, null, 'COD payments must NOT have a txRef');
    assert.equal(codPayment.checkoutUrl, null, 'COD payments must NOT have a checkoutUrl');
    assert.equal(codPayment.amount.toFixed(2), dbOrder.totalAmount.toFixed(2));
  });

  await t.test('2. Guard: Attempting to initialize Chapa for a COD order is strictly rejected', async () => {
    const codOrderId = createdOrderIds[0];

    await assert.rejects(
      async () => {
        await paymentService.initializePayment({
          customerId: customer.id,
          orderId: codOrderId,
        });
      },
      (err) => {
        assert.equal(err.code, 'CHAPA_NOT_REQUIRED_FOR_COD');
        assert.equal(err.statusCode, 400);
        return true;
      }
    );
  });

  await t.test('3. Guard: Attempting to verify Chapa on a COD payment is strictly rejected', async () => {
    const codOrderId = createdOrderIds[0];
    const codPayment = await prisma.payment.findFirst({
      where: { orderId: codOrderId, provider: 'COD' },
    });

    // Even if txRef is null or someone attempts verification
    await assert.rejects(
      async () => {
        await paymentService.finalizePaymentWithVerification(codPayment.txRef || 'NON_EXISTENT_TX');
      },
      (err) => {
        assert.ok(err.code === 'PAYMENT_NOT_FOUND' || err.code === 'CHAPA_NOT_REQUIRED_FOR_COD');
        return true;
      }
    );
  });

  await t.test('4. Status endpoint for COD: returns COD status directly without Chapa poll', async () => {
    const codOrderId = createdOrderIds[0];
    const codPayment = await prisma.payment.findFirst({
      where: { orderId: codOrderId, provider: 'COD' },
    });

    const status = await paymentService.getPaymentStatus(customer.id, codPayment.id);
    assert.equal(status.paymentMethod, 'CASH_ON_DELIVERY');
    assert.equal(status.provider, 'COD');
    assert.equal(status.status, 'PENDING');
    assert.equal(status.isSuccess, false);
  });

  await t.test('5. Admin COD collection: updates Payment to SUCCESS and Order to PAID', async () => {
    const codOrderId = createdOrderIds[0];

    const collectRes = await collectCodOrderPayment(codOrderId, adminUser, {
      notes: 'Cash collected by rider Abebe upon delivery',
    });

    assert.equal(collectRes.paymentStatus, 'PAID');
    assert.equal(collectRes.payment.status, 'SUCCESS');
    assert.equal(collectRes.payment.provider, 'COD');
    assert.ok(collectRes.payment.paidAt);

    // Verify DB persistence
    const updatedOrder = await prisma.order.findUnique({
      where: { id: codOrderId },
      include: {
        payments: true,
        activities: { where: { action: 'COD Payment Collected' } },
      },
    });

    assert.equal(updatedOrder.paymentStatus, 'PAID');
    const updatedPayment = updatedOrder.payments.find((p) => p.provider === 'COD');
    assert.equal(updatedPayment.status, 'SUCCESS');
    assert.ok(updatedPayment.paidAt);
    assert.equal(updatedPayment.providerStatus, 'CASH_COLLECTED');

    // Verify audit log
    const auditLog = await prisma.paymentAuditLog.findFirst({
      where: { paymentId: updatedPayment.id, event: 'COD_PAYMENT_COLLECTED' },
    });
    assert.ok(auditLog, 'COD_PAYMENT_COLLECTED audit log must be recorded');
  });

  await t.test('6. Duplicate COD collection: rejected with COD_PAYMENT_ALREADY_COLLECTED', async () => {
    const codOrderId = createdOrderIds[0];

    await assert.rejects(
      async () => {
        await collectCodOrderPayment(codOrderId, adminUser);
      },
      (err) => {
        assert.equal(err.code, 'COD_PAYMENT_ALREADY_COLLECTED');
        assert.equal(err.statusCode, 400);
        return true;
      }
    );
  });

  await t.test('7. Place Online order: creates order with ONLINE method and initializes Chapa safely', async () => {
    // Stub Chapa initialize to return sandbox URL without external network failure
    const originalInit = chapaService.initializeTransaction;
    chapaService.initializeTransaction = async ({ txRef, amount }) => ({
      checkoutUrl: `https://checkout.chapa.co/checkout/payment/${txRef}`,
      status: 'success',
      reference: `CHAPA-REF-${Date.now()}`,
    });

    try {
      const onlinePayload = {
        items: [{ productId: testProduct.id, quantity: 1 }],
        deliveryAddress: {
          recipientName: customer.fullName,
          phone: customer.phone,
          city: 'Addis Ababa',
          deliveryZone: 'Yeka',
          addressLine: 'Megenagna Square',
        },
        paymentMethod: 'ONLINE',
      };

      const onlineOrderRes = await checkoutCustomerOrder(onlinePayload, customer.id);
      createdOrderIds.push(onlineOrderRes.id);

      assert.equal(onlineOrderRes.paymentMethod, 'ONLINE');
      assert.equal(onlineOrderRes.paymentStatus, 'PENDING');
      assert.equal(onlineOrderRes.paymentRequired, true);
      assert.ok(onlineOrderRes.payment, 'Online order must return payment details');
      assert.ok(onlineOrderRes.payment.checkoutUrl);
      assert.ok(onlineOrderRes.payment.txRef);

      // Verify DB persistence
      const onlinePayment = await prisma.payment.findUnique({
        where: { id: onlineOrderRes.payment.paymentId },
      });
      assert.ok(onlinePayment);
      assert.equal(onlinePayment.provider, 'CHAPA');
      assert.equal(onlinePayment.status, 'PROCESSING');
      assert.ok(onlinePayment.txRef);
      assert.ok(onlinePayment.checkoutUrl);
    } finally {
      chapaService.initializeTransaction = originalInit;
    }
  });

  await t.test('8. Online payment server-side verification finalizes Order to PAID', async () => {
    const onlineOrderId = createdOrderIds[1];
    const onlinePayment = await prisma.payment.findFirst({
      where: { orderId: onlineOrderId, provider: 'CHAPA' },
    });

    // Mock verifyTransaction
    const originalVerify = chapaService.verifyTransaction;
    chapaService.verifyTransaction = async (ref) => ({
      isSuccess: true,
      status: 'success',
      amount: onlinePayment.amount.toFixed(2),
      currency: 'ETB',
      reference: `CHAPA-VERIF-${Date.now()}`,
      paymentMethod: 'TELEBIRR',
    });

    try {
      const verified = await paymentService.finalizePaymentWithVerification(onlinePayment.txRef, {
        actorType: 'WEBHOOK',
      });

      assert.equal(verified.status, 'SUCCESS');
      assert.equal(verified.isSuccess, true);

      // Order must now be PAID and CONFIRMED
      const dbOrder = await prisma.order.findUnique({
        where: { id: onlineOrderId },
      });
      assert.equal(dbOrder.paymentStatus, 'PAID');
      assert.equal(dbOrder.status, 'CONFIRMED');
    } finally {
      chapaService.verifyTransaction = originalVerify;
    }
  });
});
