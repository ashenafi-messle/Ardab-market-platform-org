// ==============================================================================
// Ardab Market - Supplier & Payment Method Integration Test Suite
// ==============================================================================

import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/shared/config/database.js';
import { generateAdminToken } from '../src/admin/services/auth.service.js';
import { ADMIN_ROLES } from '../src/admin/constants/adminRoles.js';

const app = createApp();

// Retrieve seeded admins from Neon PostgreSQL for genuine FK references in audit logs
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

test('Supplier & Payment Method Comprehensive Test Suite', async (suite) => {
  let testPaymentMethodActiveId = null;
  let testPaymentMethodInactiveId = null;
  let testSupplierId = null;

  // Cleanup helper
  suite.after(async () => {
    try {
      if (testSupplierId) {
        await prisma.supplier.deleteMany({ where: { id: testSupplierId } });
      }
      await prisma.supplier.deleteMany({
        where: {
          companyName: { in: ['Test Union Agro', 'Test Producer PLC', 'Test Oil Mills', 'Test Coffee Enterprise'] },
        },
      });
      if (testPaymentMethodActiveId || testPaymentMethodInactiveId) {
        await prisma.paymentMethod.deleteMany({
          where: { id: { in: [testPaymentMethodActiveId, testPaymentMethodInactiveId].filter(Boolean) } },
        });
      }
    } catch {
      // Ignore cleanup error
    }
  });

  // ============================================================================
  // 1. PAYMENT METHODS CONFIGURATION
  // ============================================================================
  await suite.test('1. Payment Methods: Create, Update, Status & Security', async (t) => {
    await t.test('POST /api/payment-methods requires Super Admin authorization', async () => {
      // Unauthenticated
      const resNoAuth = await request(app).post('/api/payment-methods').send({
        name: 'Telebirr Commercial',
      });
      assert.equal(resNoAuth.status, 401);

      // Forbidden (Sub Admin)
      const resForbidden = await request(app)
        .post('/api/payment-methods')
        .set('Authorization', `Bearer ${subAdminToken}`)
        .send({
          name: 'Telebirr Commercial',
        });
      assert.equal(resForbidden.status, 403);
    });

    await t.test('POST /api/payment-methods successfully creates active payment method', async () => {
      const res = await request(app)
        .post('/api/payment-methods')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          name: 'Commercial Bank of Ethiopia (CBE)',
          provider: 'Bank Transfer',
          accountName: 'Ardab Market Operations',
          accountNumber: '1000998877665',
          description: 'Official settlement CBE account for agricultural suppliers',
          isActive: true,
        });

      assert.equal(res.status, 201);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.name, 'Commercial Bank of Ethiopia (CBE)');
      assert.equal(res.body.data.isActive, true);
      testPaymentMethodActiveId = res.body.data.id;
    });

    await t.test('POST /api/payment-methods successfully creates inactive payment method', async () => {
      const res = await request(app)
        .post('/api/payment-methods')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          name: 'Legacy Microfinance Co',
          provider: 'Direct Debit',
          accountName: 'Ardab Settlement',
          accountNumber: '998877665544',
          isActive: false,
        });

      assert.equal(res.status, 201);
      assert.equal(res.body.data.isActive, false);
      testPaymentMethodInactiveId = res.body.data.id;
    });

    await t.test('GET /api/payment-methods?active=true returns active methods and omits sensitive account numbers', async () => {
      const res = await request(app)
        .get('/api/payment-methods?active=true')
        .set('Authorization', `Bearer ${superAdminToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(Array.isArray(res.body.data));

      const activeFound = res.body.data.find((m) => m.id === testPaymentMethodActiveId);
      assert.ok(activeFound, 'Active payment method should be returned');
      assert.equal(activeFound.accountNumber, undefined, 'Sensitive accountNumber must be omitted for registration listing');

      const inactiveFound = res.body.data.find((m) => m.id === testPaymentMethodInactiveId);
      assert.equal(inactiveFound, undefined, 'Inactive payment method should not be returned when active=true');
    });

    await t.test('PATCH /api/payment-methods/:id/status toggles status', async () => {
      const res = await request(app)
        .patch(`/api/payment-methods/${testPaymentMethodActiveId}/status`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ isActive: false });

      assert.equal(res.status, 200);
      assert.equal(res.body.data.isActive, false);

      // Revert back to active
      await request(app)
        .patch(`/api/payment-methods/${testPaymentMethodActiveId}/status`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ isActive: true });
    });
  });

  // ============================================================================
  // 2. SUPPLIER REGISTRATION & VALIDATION
  // ============================================================================
  await suite.test('2. Supplier Registration: Validation, Email, Payment Method & Security', async (t) => {
    await t.test('POST /api/suppliers requires Super Admin authorization', async () => {
      // Unauthenticated
      const resNoAuth = await request(app).post('/api/suppliers').send({});
      assert.equal(resNoAuth.status, 401);

      // Sub Admin forbidden
      const resForbidden = await request(app)
        .post('/api/suppliers')
        .set('Authorization', `Bearer ${subAdminToken}`)
        .send({
          companyName: 'Test Agro',
          name: 'Manager',
          phone: '+251 91 123 4567',
          city: 'Gondar',
          address: 'Main Road',
        });
      assert.equal(resForbidden.status, 403);
    });

    await t.test('POST /api/suppliers strictly rejects legacy top-level bankAccountNumber payload', async () => {
      const res = await request(app)
        .post('/api/suppliers')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          companyName: 'Test Producer PLC',
          name: 'Dawit Lema',
          phone: '+251 91 100 2000',
          city: 'Gondar',
          address: 'Kebele 04, Gondar',
          bankAccountNumber: '1000293848123', // REMOVED TOP-LEVEL FIELD
          paymentMethods: [{ paymentMethod: 'Commercial Bank of Ethiopia', accountNumber: '1000293848123' }],
        });

      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
      assert.equal(res.body.error.code, 'VALIDATION_ERROR');
    });

    await t.test('POST /api/suppliers rejects request when paymentMethods is omitted or empty', async () => {
      // Omitted paymentMethods
      const resOmitted = await request(app)
        .post('/api/suppliers')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          companyName: 'Test Producer PLC',
          name: 'Dawit Lema',
          phone: '+251 91 100 2000',
          city: 'Bahir Dar',
          address: 'Kebele 08, Bahir Dar',
        });

      assert.equal(resOmitted.status, 400);
      assert.equal(resOmitted.body.success, false);

      // Empty array paymentMethods
      const resEmpty = await request(app)
        .post('/api/suppliers')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          companyName: 'Test Producer PLC',
          name: 'Dawit Lema',
          phone: '+251 91 100 2000',
          city: 'Bahir Dar',
          address: 'Kebele 08, Bahir Dar',
          paymentMethods: [],
        });

      assert.equal(resEmpty.status, 400);
      assert.equal(resEmpty.body.success, false);
    });

    await t.test('POST /api/suppliers rejects paymentMethod with missing or empty accountNumber', async () => {
      const res = await request(app)
        .post('/api/suppliers')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          companyName: 'Test Producer PLC',
          name: 'Dawit Lema',
          phone: '+251 91 100 2000',
          city: 'Bahir Dar',
          address: 'Kebele 08, Bahir Dar',
          paymentMethods: [{ paymentMethod: 'Telebirr', accountNumber: '' }],
        });

      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
    });

    await t.test('POST /api/suppliers rejects paymentMethod with missing or empty paymentMethod name', async () => {
      const res = await request(app)
        .post('/api/suppliers')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          companyName: 'Test Producer PLC',
          name: 'Dawit Lema',
          phone: '+251 91 100 2000',
          city: 'Bahir Dar',
          address: 'Kebele 08, Bahir Dar',
          paymentMethods: [{ paymentMethod: '', accountNumber: '1000293848123' }],
        });

      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
    });

    await t.test('POST /api/suppliers creates supplier with 1 payment method & account number (email omitted -> null)', async () => {
      const res = await request(app)
        .post('/api/suppliers')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          companyName: 'Test Union Agro',
          name: 'Abebe Tesfaye',
          phone: '+251 91 888 7766',
          // email omitted
          city: 'Gondar',
          category: 'Grains & Teff',
          tinNumber: '0098765432',
          address: 'Arada Commercial Zone, Gondar',
          paymentMethods: [
            { paymentMethod: 'Commercial Bank of Ethiopia (CBE)', accountNumber: '1000293848123' },
          ],
        });

      assert.equal(res.status, 201);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.companyName, 'Test Union Agro');
      assert.equal(res.body.data.email, null, 'Omitted email must be saved as NULL');
      assert.equal(res.body.data.city, 'Gondar');
      assert.ok(Array.isArray(res.body.data.paymentMethods));
      assert.equal(res.body.data.paymentMethods.length, 1);
      assert.equal(res.body.data.paymentMethods[0].paymentMethod, 'Commercial Bank of Ethiopia (CBE)');
      assert.equal(res.body.data.paymentMethods[0].accountNumber, '1000293848123');
      assert.equal(res.body.data.paymentMethods[0].isPrimary, true);

      testSupplierId = res.body.data.id;
    });

    await t.test('POST /api/suppliers creates supplier with multiple payment methods and account numbers', async () => {
      const res = await request(app)
        .post('/api/suppliers')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          companyName: 'Test Oil Mills',
          name: 'Hiwot Alemu',
          phone: '+251 92 333 4455',
          email: 'hiwot@testoilmills.et',
          city: 'Addis Ababa',
          category: 'Edible Oils & Seeds',
          address: 'Bole Sub-City, Addis Ababa',
          paymentMethods: [
            { paymentMethod: 'Commercial Bank of Ethiopia (CBE)', accountNumber: '1000293848123', isPrimary: true },
            { paymentMethod: 'Telebirr', accountNumber: '0911223344', isPrimary: false },
            { paymentMethod: 'Dashen Bank / Amole', accountNumber: '500291823901', isPrimary: false },
          ],
        });

      assert.equal(res.status, 201);
      assert.equal(res.body.data.email, 'hiwot@testoilmills.et');
      assert.equal(res.body.data.paymentMethods.length, 3);
      assert.equal(res.body.data.paymentMethods[0].paymentMethod, 'Commercial Bank of Ethiopia (CBE)');
      assert.equal(res.body.data.paymentMethods[1].paymentMethod, 'Telebirr');
      assert.equal(res.body.data.paymentMethods[2].paymentMethod, 'Dashen Bank / Amole');

      // Cleanup
      await prisma.supplier.delete({ where: { id: res.body.data.id } });
    });

    await t.test('POST /api/suppliers creates supplier with valid email and flexible city hub', async () => {
      const res = await request(app)
        .post('/api/suppliers')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          companyName: 'Test Coffee Enterprise',
          name: 'Yared Bekele',
          phone: '+251 93 111 2233',
          email: 'yared@testcoffee.et',
          city: 'Hawassa', // flexible city outside the old 3 hardcoded
          category: 'Coffee & Spices',
          address: 'Industrial Zone, Hawassa',
          paymentMethods: [
            { paymentMethod: 'Awash Bank', accountNumber: '0132049182012' },
          ],
        });

      assert.equal(res.status, 201);
      assert.equal(res.body.data.email, 'yared@testcoffee.et');
      assert.equal(res.body.data.city, 'Hawassa');
      assert.equal(res.body.data.paymentMethods.length, 1);

      // Cleanup
      await prisma.supplier.delete({ where: { id: res.body.data.id } });
    });
  });

  // ============================================================================
  // 3. SUPPLIER LIST, DETAILS & UPDATES
  // ============================================================================
  await suite.test('3. Supplier Queries & Updates', async (t) => {
    await t.test('GET /api/suppliers returns paginated supplier list with payment methods', async () => {
      const res = await request(app)
        .get('/api/suppliers?page=1&pageSize=10')
        .set('Authorization', `Bearer ${superAdminToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(Array.isArray(res.body.data.items));
      assert.ok(res.body.data.pagination);

      const found = res.body.data.items.find((s) => s.id === testSupplierId);
      assert.ok(found);
      assert.equal(found.companyName, 'Test Union Agro');
      assert.equal(found.email, null);
      assert.ok(Array.isArray(found.paymentMethods));
      assert.equal(found.paymentMethods.length, 1);
      assert.equal(found.paymentMethods[0].paymentMethod, 'Commercial Bank of Ethiopia (CBE)');
      assert.equal(found.paymentMethods[0].accountNumber, '1000293848123');
    });

    await t.test('GET /api/suppliers/:id returns full supplier details with payment methods', async () => {
      const res = await request(app)
        .get(`/api/suppliers/${testSupplierId}`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.data.id, testSupplierId);
      assert.equal(res.body.data.companyName, 'Test Union Agro');
      assert.ok(Array.isArray(res.body.data.paymentMethods));
      assert.equal(res.body.data.paymentMethods[0].paymentMethod, 'Commercial Bank of Ethiopia (CBE)');
    });

    await t.test('PATCH /api/suppliers/:id can set and change email', async () => {
      // Add email
      const res1 = await request(app)
        .patch(`/api/suppliers/${testSupplierId}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ email: 'info@testunionagro.et' });

      assert.equal(res1.status, 200);
      assert.equal(res1.body.data.email, 'info@testunionagro.et');

      // Remove email (set to null)
      const res2 = await request(app)
        .patch(`/api/suppliers/${testSupplierId}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ email: null });

      assert.equal(res2.status, 200);
      assert.equal(res2.body.data.email, null);
    });

    await t.test('PATCH /api/suppliers/:id can update payment methods list', async () => {
      const res = await request(app)
        .patch(`/api/suppliers/${testSupplierId}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          paymentMethods: [
            { paymentMethod: 'Commercial Bank of Ethiopia (CBE)', accountNumber: '1000999999999', isPrimary: true },
            { paymentMethod: 'Telebirr', accountNumber: '0922334455', isPrimary: false },
          ],
        });

      assert.equal(res.status, 200);
      assert.equal(res.body.data.paymentMethods.length, 2);
      assert.equal(res.body.data.paymentMethods[1].paymentMethod, 'Telebirr');
    });

    await t.test('PATCH /api/suppliers/:id/status updates supplier status', async () => {
      const res = await request(app)
        .patch(`/api/suppliers/${testSupplierId}/status`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ status: 'SUSPENDED' });

      assert.equal(res.status, 200);
      assert.equal(res.body.data.status, 'SUSPENDED');

      // Revert to ACTIVE
      const res2 = await request(app)
        .patch(`/api/suppliers/${testSupplierId}/status`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ status: 'ACTIVE' });

      assert.equal(res2.status, 200);
      assert.equal(res2.body.data.status, 'ACTIVE');
    });

    await t.test('Audit log is recorded for supplier operations', async () => {
      const logs = await prisma.auditLog.findMany({
        where: { entity: 'Supplier', entityId: testSupplierId },
      });

      assert.ok(logs.length >= 2, 'Audit logs must be created for supplier create and update');
      const createLog = logs.find((l) => l.action === 'SUPPLIER_CREATE');
      assert.ok(createLog, 'SUPPLIER_CREATE audit log must exist');
    });
  });

  // ============================================================================
  // 4. SUPPLIER DELETION: PERMISSIONS, INTEGRITY & AUDIT LOGGING
  // ============================================================================
  await suite.test('4. Supplier Deletion: Permissions, Integrity & Audit Logging', async (t) => {
    let unreferencedSupplierId = null;
    let referencedSupplierId = null;
    let testCategoryId = null;
    let testProductId = null;

    // Helper: Create an unreferenced supplier with payment methods
    const unrefSup = await prisma.supplier.create({
      data: {
        companyName: `Delete Unreferenced ${Date.now()}`,
        name: 'Temporary Supplier',
        phone: `+251911${Math.floor(100000 + Math.random() * 900000)}`,
        city: 'Gondar',
        address: 'Gondar Warehouse 1',
        paymentMethods: {
          create: [
            { paymentMethod: 'CBE', accountNumber: '100011112222', isPrimary: true },
          ],
        },
      },
    });
    unreferencedSupplierId = unrefSup.id;

    // Helper: Create a supplier with a linked product
    const refSup = await prisma.supplier.create({
      data: {
        companyName: `Delete Referenced ${Date.now()}`,
        name: 'Referenced Supplier',
        phone: `+251912${Math.floor(100000 + Math.random() * 900000)}`,
        city: 'Bahir Dar',
        address: 'Bahir Dar Station',
      },
    });
    referencedSupplierId = refSup.id;

    const cat = await prisma.marketplaceCategory.create({
      data: {
        name: `Test Cat For Sup ${Date.now()}`,
        slug: `test-cat-sup-${Date.now()}`,
        isActive: true,
      },
    });
    testCategoryId = cat.id;

    const prod = await prisma.product.create({
      data: {
        itemCode: `ITM-SUP-${Date.now()}`,
        name: 'Teff 100kg Bag',
        marketplaceCategoryId: cat.id,
        sellerId: refSup.id,
        sellingPrice: 8000,
        status: 'ACTIVE',
      },
    });
    testProductId = prod.id;

    await t.test('DELETE /api/suppliers/:id requires Super Admin authorization', async () => {
      // Unauthenticated -> 401
      const resNoAuth = await request(app).delete(`/api/suppliers/${unreferencedSupplierId}`);
      assert.equal(resNoAuth.status, 401);

      // Sub Admin -> 403 Forbidden
      const resSubAdmin = await request(app)
        .delete(`/api/suppliers/${unreferencedSupplierId}`)
        .set('Authorization', `Bearer ${subAdminToken}`);
      assert.equal(resSubAdmin.status, 403);
      assert.equal(resSubAdmin.body.success, false);
      assert.equal(resSubAdmin.body.code, 'ROLE_FORBIDDEN');
    });

    await t.test('DELETE /api/suppliers/:id validates UUID parameter format', async () => {
      const res = await request(app)
        .delete('/api/suppliers/not-a-valid-uuid')
        .set('Authorization', `Bearer ${superAdminToken}`);

      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
    });

    await t.test('DELETE /api/suppliers/:id returns 404 if supplier does not exist', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      const res = await request(app)
        .delete(`/api/suppliers/${nonExistentId}`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      assert.equal(res.status, 404);
      assert.equal(res.body.success, false);
      assert.equal(res.body.code, 'SUPPLIER_NOT_FOUND');
    });

    await t.test('DELETE /api/suppliers/:id blocks deletion with 409 Conflict when products are linked', async () => {
      const res = await request(app)
        .delete(`/api/suppliers/${referencedSupplierId}`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      assert.equal(res.status, 409);
      assert.equal(res.body.success, false);
      assert.equal(res.body.code, 'SUPPLIER_HAS_DEPENDENT_PRODUCTS');
      assert.match(res.body.message, /product/i);

      // Verify supplier was NOT deleted from DB
      const stillExists = await prisma.supplier.findUnique({
        where: { id: referencedSupplierId },
      });
      assert.ok(stillExists, 'Supplier with products must not be deleted');
    });

    await t.test('DELETE /api/suppliers/:id successfully deletes unreferenced supplier & cascades payment methods', async () => {
      const res = await request(app)
        .delete(`/api/suppliers/${unreferencedSupplierId}`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.deleted, true);
      assert.equal(res.body.data.id, unreferencedSupplierId);

      // Verify supplier is removed from DB
      const deletedSup = await prisma.supplier.findUnique({
        where: { id: unreferencedSupplierId },
      });
      assert.equal(deletedSup, null, 'Supplier should be permanently deleted');

      // Verify cascaded payment methods are cleaned up
      const pms = await prisma.supplierPaymentMethod.findMany({
        where: { supplierId: unreferencedSupplierId },
      });
      assert.equal(pms.length, 0, 'Payment methods must cascade delete');
    });

    await t.test('Audit log is recorded with SUPPLIER_DELETE action', async () => {
      const auditLog = await prisma.auditLog.findFirst({
        where: {
          entity: 'Supplier',
          entityId: unreferencedSupplierId,
          action: 'SUPPLIER_DELETE',
        },
      });

      assert.ok(auditLog, 'SUPPLIER_DELETE audit log entry must be created');
      assert.equal(auditLog.status, 'SUCCESS');
    });

    // Cleanup referenced test records
    await prisma.product.deleteMany({ where: { id: testProductId } }).catch(() => {});
    await prisma.marketplaceCategory.deleteMany({ where: { id: testCategoryId } }).catch(() => {});
    await prisma.supplier.deleteMany({ where: { id: referencedSupplierId } }).catch(() => {});
  });
});
