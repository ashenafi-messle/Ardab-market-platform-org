// ==============================================================================
// Neon PostgreSQL & Prisma CRUD & Transaction Integration Tests
// ==============================================================================

import test from 'node:test';
import assert from 'node:assert/strict';
import { prisma, disconnectPrisma } from '../src/shared/config/database.js';

test('Database Integration: CRUD & Transaction Suite', async (t) => {
  const testEmail = `integration_test_${Date.now()}@ardabmarket.com`;
  let createdUserId = null;

  t.after(async () => {
    // Ensure clean cleanup of the test record
    if (createdUserId) {
      await prisma.adminUser.deleteMany({ where: { email: testEmail } });
    }
    await disconnectPrisma();
  });

  await t.test('1. CREATE: Insert test admin record into Neon PostgreSQL', async () => {
    const user = await prisma.adminUser.create({
      data: {
        email: testEmail,
        name: 'Integration Tester',
        passwordHash: '$2a$10$FakeHashForIntegrationTestingOnly1234567890',
        role: 'SUPER_ADMIN',
        status: 'ACTIVE',
        assignedCities: ['Gondar'],
      },
    });

    assert.ok(user.id);
    assert.equal(user.email, testEmail);
    assert.equal(user.role, 'SUPER_ADMIN');
    createdUserId = user.id;
  });

  await t.test('2. READ: Query newly created record by email index', async () => {
    const user = await prisma.adminUser.findUnique({
      where: { email: testEmail },
    });

    assert.ok(user);
    assert.equal(user.id, createdUserId);
    assert.equal(user.name, 'Integration Tester');
  });

  await t.test('3. UPDATE: Modify admin attributes and verify updated timestamp', async () => {
    const updated = await prisma.adminUser.update({
      where: { id: createdUserId },
      data: {
        phone: '+251 91 999 8888',
        assignedCities: ['Gondar', 'Addis Ababa'],
      },
    });

    assert.equal(updated.phone, '+251 91 999 8888');
    assert.deepEqual(updated.assignedCities, ['Gondar', 'Addis Ababa']);
  });

  await t.test('4. TRANSACTION (Commit): Atomically create session and audit log', async () => {
    const tokenHash = `test_token_hash_${Date.now()}`;

    const [session, auditLog] = await prisma.$transaction([
      prisma.adminSession.create({
        data: {
          adminId: createdUserId,
          tokenHash,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      }),
      prisma.auditLog.create({
        data: {
          adminId: createdUserId,
          adminEmail: testEmail,
          action: 'INTEGRATION_TEST_ACTION',
          entity: 'AdminUser',
          entityId: createdUserId,
        },
      }),
    ]);

    assert.ok(session.id);
    assert.equal(session.tokenHash, tokenHash);
    assert.ok(auditLog.id);
    assert.equal(auditLog.action, 'INTEGRATION_TEST_ACTION');
  });

  await t.test('5. TRANSACTION (Rollback): Verify atomicity rollback on failed operation', async () => {
    const doomedTokenHash = `rollback_token_${Date.now()}`;

    let threw = false;
    try {
      await prisma.$transaction(async (tx) => {
        await tx.adminSession.create({
          data: {
            adminId: createdUserId,
            tokenHash: doomedTokenHash,
            expiresAt: new Date(Date.now() + 10000),
          },
        });
        // Intentionally throw to trigger transaction rollback
        throw new Error('Intentional transaction abort for atomicity verification');
      });
    } catch {
      threw = true;
    }

    assert.ok(threw, 'Expected transaction to fail and throw');

    // Verify session was rolled back and never persisted
    const session = await prisma.adminSession.findUnique({
      where: { tokenHash: doomedTokenHash },
    });
    assert.equal(session, null, 'Doomed session must NOT exist in database after rollback');
  });

  await t.test('6. DELETE: Remove test admin and verify cascade', async () => {
    await prisma.adminUser.delete({
      where: { id: createdUserId },
    });

    const deletedUser = await prisma.adminUser.findUnique({
      where: { id: createdUserId },
    });
    assert.equal(deletedUser, null);

    // Verify associated sessions were cascade deleted
    const remainingSessions = await prisma.adminSession.findMany({
      where: { adminId: createdUserId },
    });
    assert.equal(remainingSessions.length, 0);

    createdUserId = null; // Mark cleaned up
  });
});
