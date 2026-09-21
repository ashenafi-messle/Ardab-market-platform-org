// ==============================================================================
// Ardab Market - Cross-Platform Security, Customer Deletion & Search Tests
// ==============================================================================

import test from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../src/shared/config/database.js';
import { loginCustomer } from '../src/customer/services/customerAuth.service.js';
import { deleteCustomerCompletely } from '../src/admin/services/customer.service.js';
import { normalizeEthiopianPhone } from '../src/shared/utils/phone.util.js';
import { listProducts } from '../src/admin/services/product.service.js';
import bcrypt from 'bcryptjs';

test('CROSS-PLATFORM INTEGRATION TEST SUITE', async (t) => {
  const timestamp = Date.now();
  const testEmail = `test.cross.${timestamp}@ardabtest.com`;
  const rawPhone = '0912345678';
  const canonicalE164 = '+251912345678';
  const testPassword = 'Password123!';
  const passwordHash = await bcrypt.hash(testPassword, 10);

  let customerId = null;

  t.before(async () => {
    // Create test customer
    const customer = await prisma.customer.create({
      data: {
        customerCode: `TEST-${timestamp.toString().slice(-6)}`,
        fullName: 'Cross Platform Test Customer',
        email: testEmail,
        phone: canonicalE164,
        passwordHash,
        status: 'ACTIVE',
        verificationStatus: 'VERIFIED',
      },
    });
    customerId = customer.id;
  });

  t.after(async () => {
    // Cleanup any lingering records
    if (customerId) {
      await prisma.securityEvent.deleteMany({ where: { actorId: customerId } }).catch(() => {});
      await prisma.customerActivity.deleteMany({ where: { customerId } }).catch(() => {});
      await prisma.customer.deleteMany({ where: { id: customerId } }).catch(() => {});
    }
  });

  await t.test('1. Phone Normalization utility handles all Ethiopian formats', async () => {
    const p1 = normalizeEthiopianPhone('0912345678');
    const p2 = normalizeEthiopianPhone('+251912345678');
    const p3 = normalizeEthiopianPhone('251912345678');
    const p4 = normalizeEthiopianPhone('0712345678');

    assert.equal(p1.e164, '+251912345678');
    assert.equal(p1.local, '0912345678');
    assert.equal(p2.e164, '+251912345678');
    assert.equal(p3.e164, '+251912345678');
    assert.equal(p4.e164, '+251712345678');
    assert.ok(p1.variants.includes('+251912345678'));
    assert.ok(p1.variants.includes('0912345678'));
  });

  await t.test('2. Customer Login succeeds with Email', async () => {
    const res = await loginCustomer({
      identifier: testEmail,
      password: testPassword,
      ipAddress: '127.0.0.1',
      userAgent: 'TestBrowser',
    });

    assert.ok(res.token, 'Must return JWT token');
    assert.equal(res.customer.email, testEmail);

    // Verify security event logged
    const secEvent = await prisma.securityEvent.findFirst({
      where: {
        actorId: customerId,
        eventType: 'CUSTOMER_LOGIN_SUCCESS',
      },
    });
    assert.ok(secEvent, 'Must record CUSTOMER_LOGIN_SUCCESS in security_events');
    assert.equal(secEvent.source, 'CUSTOMER_WEB');
  });

  await t.test('3. Customer Login succeeds with Local Phone (09...) matching Canonical (+251...) in DB', async () => {
    const res = await loginCustomer({
      identifier: '0912345678',
      password: testPassword,
      ipAddress: '127.0.0.1',
      userAgent: 'TestBrowser',
    });

    assert.ok(res.token, 'Must return JWT token for local phone variant');
    assert.equal(res.customer.id, customerId);
  });

  await t.test('4. Customer Login fails with invalid password and logs security event', async () => {
    let threw = false;
    try {
      await loginCustomer({
        identifier: testEmail,
        password: 'WrongPassword!',
        ipAddress: '127.0.0.1',
        userAgent: 'TestBrowser',
      });
    } catch (err) {
      threw = true;
    }
    assert.ok(threw, 'Should throw ApiError.unauthorized');

    const failEvent = await prisma.securityEvent.findFirst({
      where: {
        actorId: customerId,
        eventType: 'CUSTOMER_LOGIN_FAILED',
      },
      orderBy: { occurredAt: 'desc' },
    });
    assert.ok(failEvent, 'Must record CUSTOMER_LOGIN_FAILED in security_events');
    assert.equal(failEvent.severity, 'MEDIUM');
  });

  await t.test('5. Suspended Customer cannot log in and logs security alert event', async () => {
    await prisma.customer.update({
      where: { id: customerId },
      data: { status: 'SUSPENDED' },
    });

    let threw = false;
    try {
      await loginCustomer({
        identifier: testEmail,
        password: testPassword,
        ipAddress: '127.0.0.1',
      });
    } catch (err) {
      threw = true;
      assert.equal(err.code, 'ACCOUNT_SUSPENDED');
    }
    assert.ok(threw, 'Suspended customer must be rejected');

    const suspEvent = await prisma.securityEvent.findFirst({
      where: {
        actorId: customerId,
        eventType: 'CUSTOMER_ACCOUNT_SUSPENDED_LOGIN_ATTEMPT',
      },
    });
    assert.ok(suspEvent, 'Must record CUSTOMER_ACCOUNT_SUSPENDED_LOGIN_ATTEMPT in security_events');
  });

  await t.test('6. Super Admin completely deletes customer and cleanses records transactionally', async () => {
    // Add child address and score event
    await prisma.customerAddress.create({
      data: {
        customerId,
        recipientName: 'Test Recipient',
        phone: canonicalE164,
        city: 'Gondar',
        addressLine: 'Kebele 01',
      },
    });

    await prisma.customerScoreEvent.create({
      data: {
        customerId,
        type: 'ACCOUNT_REGISTRATION',
        points: 50,
        source: 'LOYALTY_PROGRAM',
      },
    });

    const adminUser = { id: null, email: 'superadmin@ardabmarket.com' };
    const result = await deleteCustomerCompletely(customerId, adminUser, '127.0.0.1');

    assert.equal(result.success, true);

    // Verify child records deleted
    const addresses = await prisma.customerAddress.count({ where: { customerId } });
    const scoreEvents = await prisma.customerScoreEvent.count({ where: { customerId } });
    const customer = await prisma.customer.findUnique({ where: { id: customerId } });

    assert.equal(addresses, 0, 'Addresses must be deleted');
    assert.equal(scoreEvents, 0, 'Score events must be deleted');
    assert.equal(customer, null, 'Customer record must be completely deleted when no orders exist');

    // Verify security event logged
    const delEvent = await prisma.securityEvent.findFirst({
      where: {
        targetId: customerId,
        eventType: 'CUSTOMER_DELETED',
      },
    });
    assert.ok(delEvent, 'Must record CUSTOMER_DELETED in security_events');
    assert.equal(delEvent.source, 'SUPERADMIN_WEB');
  });

  await t.test('7. Product Catalog search does not throw and handles empty queries gracefully', async () => {
    const res1 = await listProducts({ search: 'Coffee', status: 'ACTIVE' });
    assert.ok(Array.isArray(res1.items), 'Must return items array');

    const res2 = await listProducts({ search: 'NonExistentProductXYZ12345', status: 'ACTIVE' });
    assert.ok(Array.isArray(res2.items), 'Must return items array even if empty');
    assert.equal(res2.items.length, 0);
  });
});
