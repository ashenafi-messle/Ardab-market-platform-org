// ==============================================================================
// Ardab Market - Security & Super Admin Management Integration Test Suite
// ==============================================================================

import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/shared/config/database.js';
import { generateAdminToken } from '../src/admin/services/auth.service.js';
import { ADMIN_ROLES } from '../src/admin/constants/adminRoles.js';

const app = createApp();

// Retrieve seeded admins from database
let seededSuperAdmin = await prisma.adminUser.findUnique({
  where: { email: 'admin@ardabmarket.com' },
});
if (!seededSuperAdmin) {
  seededSuperAdmin = await prisma.adminUser.findFirst({
    where: { role: ADMIN_ROLES.SUPER_ADMIN },
  });
}

let seededSubAdmin = await prisma.adminUser.findUnique({
  where: { email: 'ashurack664@gmail.com' },
});
if (!seededSubAdmin) {
  seededSubAdmin = await prisma.adminUser.findFirst({
    where: { role: ADMIN_ROLES.SUB_ADMIN },
  });
}

const superAdminToken = generateAdminToken({
  id: seededSuperAdmin ? seededSuperAdmin.id : 'superadmin-test-id',
  email: seededSuperAdmin ? seededSuperAdmin.email : 'admin@ardabmarket.com',
  name: seededSuperAdmin ? seededSuperAdmin.name : 'Super Admin',
  role: ADMIN_ROLES.SUPER_ADMIN,
});

const subAdminToken = generateAdminToken({
  id: seededSubAdmin ? seededSubAdmin.id : 'subadmin-test-id',
  email: seededSubAdmin ? seededSubAdmin.email : 'subadmin@ardabmarket.com',
  name: seededSubAdmin ? seededSubAdmin.name : 'Sub Admin',
  role: ADMIN_ROLES.SUB_ADMIN,
});

const dispatcherToken = generateAdminToken({
  id: 'dispatcher-test-id',
  email: 'dispatcher@ardabmarket.com',
  name: 'Dispatcher User',
  role: ADMIN_ROLES.DISPATCHER,
});

test('Security & Super Admin Control Center Test Suite', async (t) => {
  let createdSuperAdminId = null;
  const testSuperAdminEmail = `test.superadmin.${Date.now()}@ardabtest.com`;
  let testAlertId = null;
  let testSessionId = null;
  let testIpRuleId = null;

  // ----------------------------------------------------------------------------
  // 1. RBAC & Access Control
  // ----------------------------------------------------------------------------
  await t.test('1. RBAC Authorization & Privilege Escalation Prevention', async (t2) => {
    await t2.test('GET /api/subadmin/security/statistics rejects unauthenticated requests (401)', async () => {
      const res = await request(app).get('/api/subadmin/security/statistics');
      assert.strictEqual(res.statusCode, 401);
    });

    await t2.test('POST /api/subadmin/security/super-admins blocks unauthorized role (403 for DISPATCHER)', async () => {
      const res = await request(app)
        .post('/api/subadmin/security/super-admins')
        .set('Authorization', `Bearer ${dispatcherToken}`)
        .send({
          name: 'Hacker Admin',
          email: 'hacker@example.com',
        });
      assert.strictEqual(res.statusCode, 403);
    });

    await t2.test('GET /api/subadmin/security/statistics allows authorized Sub Admin (200)', async () => {
      const res = await request(app)
        .get('/api/subadmin/security/statistics')
        .set('Authorization', `Bearer ${subAdminToken}`);
      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body.success, true);
      assert.ok(typeof res.body.data.activeSuperAdmins === 'number');
      assert.ok(typeof res.body.data.activeSessions === 'number');
      assert.ok(typeof res.body.data.openAlerts === 'number');
    });
  });

  // ----------------------------------------------------------------------------
  // 2. Super Admin Account Provisioning
  // ----------------------------------------------------------------------------
  await t.test('2. Super Admin Account Creation & Validation', async (t2) => {
    await t2.test('POST /api/subadmin/security/super-admins validates required fields', async () => {
      const res = await request(app)
        .post('/api/subadmin/security/super-admins')
        .set('Authorization', `Bearer ${subAdminToken}`)
        .send({
          name: '',
          email: 'not-an-email',
        });
      assert.strictEqual(res.statusCode, 400);
    });

    await t2.test('POST /api/subadmin/security/super-admins creates Super Admin with role SUPER_ADMIN', async () => {
      const res = await request(app)
        .post('/api/subadmin/security/super-admins')
        .set('Authorization', `Bearer ${subAdminToken}`)
        .send({
          name: 'Solomon Tesfaye',
          email: testSuperAdminEmail,
          phone: '+251 91 123 4567',
          assignedCities: ['Gondar', 'Bahir Dar'],
          initialPassword: 'TempPassword@2026',
        });

      assert.strictEqual(res.statusCode, 201);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.data.role, 'SUPER_ADMIN');
      assert.strictEqual(res.body.data.status, 'ACTIVE');
      assert.strictEqual(res.body.data.email, testSuperAdminEmail);
      assert.strictEqual(res.body.data.passwordHash, undefined); // Password hash must NEVER leak
      assert.strictEqual(res.body.data.initialPassword, 'TempPassword@2026');

      createdSuperAdminId = res.body.data.id;
    });

    await t2.test('POST /api/subadmin/security/super-admins rejects duplicate email (409 Conflict)', async () => {
      const res = await request(app)
        .post('/api/subadmin/security/super-admins')
        .set('Authorization', `Bearer ${subAdminToken}`)
        .send({
          name: 'Duplicate Solomon',
          email: testSuperAdminEmail,
        });
      assert.strictEqual(res.statusCode, 409);
    });

    await t2.test('Creation records AuditLog and SecurityEvent in database', async () => {
      const audit = await prisma.auditLog.findFirst({
        where: { entityId: createdSuperAdminId },
      });
      assert.ok(audit, 'AuditLog entry must be recorded');
      assert.strictEqual(audit.action, 'CREATE_SUPER_ADMIN_ACCOUNT');

      const secEvent = await prisma.securityEvent.findFirst({
        where: { targetId: createdSuperAdminId },
      });
      assert.ok(secEvent, 'SecurityEvent must be recorded');
      assert.strictEqual(secEvent.eventType, 'ADMIN_CREATED');
    });
  });

  // ----------------------------------------------------------------------------
  // 3. Super Admin Listing, Safeguards, and Status Management
  // ----------------------------------------------------------------------------
  await t.test('3. Super Admin Lifecycle & Last-Active Safeguards', async (t2) => {
    await t2.test('GET /api/subadmin/security/super-admins lists only SUPER_ADMIN accounts', async () => {
      const res = await request(app)
        .get('/api/subadmin/security/super-admins')
        .set('Authorization', `Bearer ${subAdminToken}`);

      assert.strictEqual(res.statusCode, 200);
      assert.ok(Array.isArray(res.body.data));
      res.body.data.forEach((admin) => {
        assert.strictEqual(admin.role, 'SUPER_ADMIN');
        assert.strictEqual(admin.passwordHash, undefined);
      });
    });

    await t2.test('GET /api/subadmin/security/super-admins/:id returns details', async () => {
      const res = await request(app)
        .get(`/api/subadmin/security/super-admins/${createdSuperAdminId}`)
        .set('Authorization', `Bearer ${subAdminToken}`);

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body.data.id, createdSuperAdminId);
      assert.strictEqual(res.body.data.passwordHash, undefined);
    });

    await t2.test('PATCH /api/subadmin/security/super-admins/:id updates account details', async () => {
      const res = await request(app)
        .patch(`/api/subadmin/security/super-admins/${createdSuperAdminId}`)
        .set('Authorization', `Bearer ${subAdminToken}`)
        .send({
          name: 'Solomon Tesfaye (Updated)',
          phone: '+251 92 999 8888',
        });

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body.data.name, 'Solomon Tesfaye (Updated)');
    });

    await t2.test('PATCH /api/subadmin/security/super-admins/:id/status toggles status to SUSPENDED', async () => {
      const res = await request(app)
        .patch(`/api/subadmin/security/super-admins/${createdSuperAdminId}/status`)
        .set('Authorization', `Bearer ${subAdminToken}`)
        .send({ reason: 'Audit investigation review' });

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body.data.status, 'SUSPENDED');
    });

    await t2.test('PATCH /api/subadmin/security/super-admins/:id/status toggles status back to ACTIVE', async () => {
      const res = await request(app)
        .patch(`/api/subadmin/security/super-admins/${createdSuperAdminId}/status`)
        .set('Authorization', `Bearer ${subAdminToken}`);

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body.data.status, 'ACTIVE');
    });

    await t2.test('POST /api/subadmin/security/super-admins/:id/reset-password issues temp password', async () => {
      const res = await request(app)
        .post(`/api/subadmin/security/super-admins/${createdSuperAdminId}/reset-password`)
        .set('Authorization', `Bearer ${subAdminToken}`);

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body.data.success, true);
      assert.ok(res.body.data.tempPassword.length >= 8);
    });

    await t2.test('Prevent self-suspension of active account (400)', async () => {
      if (seededSuperAdmin) {
        const res = await request(app)
          .patch(`/api/subadmin/security/super-admins/${seededSuperAdmin.id}/status`)
          .set('Authorization', `Bearer ${superAdminToken}`)
          .send({ reason: 'Attempting self lockout' });
        assert.strictEqual(res.statusCode, 400);
        const errMsg = res.body.error?.message || res.body.message || '';
        assert.match(errMsg, /Cannot suspend your own|last active/i);
      }
    });
  });

  // ----------------------------------------------------------------------------
  // 4. Platform Security Events & Detection
  // ----------------------------------------------------------------------------
  await t.test('4. Security Event Ingestion & Redaction', async (t2) => {
    await t2.test('POST /api/subadmin/security/events records event and redacts sensitive metadata', async () => {
      const res = await request(app)
        .post('/api/subadmin/security/events')
        .set('Authorization', `Bearer ${subAdminToken}`)
        .send({
          eventType: 'LOGIN_FAILED',
          severity: 'HIGH',
          source: 'CUSTOMER_WEB',
          actorEmail: 'test.user@ardabtest.com',
          metadata: {
            password: 'SuperSecretPassword123!',
            token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
            attemptCount: 3,
            city: 'Gondar',
          },
        });

      assert.strictEqual(res.statusCode, 201);
      assert.strictEqual(res.body.data.eventType, 'LOGIN_FAILED');
      assert.strictEqual(res.body.data.metadata.password, '[REDACTED]');
      assert.strictEqual(res.body.data.metadata.token, '[REDACTED]');
      assert.strictEqual(res.body.data.metadata.attemptCount, 3);
    });

    await t2.test('GET /api/subadmin/security/events returns paginated event stream', async () => {
      const res = await request(app)
        .get('/api/subadmin/security/events?limit=10')
        .set('Authorization', `Bearer ${subAdminToken}`);

      assert.strictEqual(res.statusCode, 200);
      assert.ok(Array.isArray(res.body.data));
      assert.ok(res.body.pagination.total >= 1);
    });

    await t2.test('GET /api/subadmin/security/failed-logins returns failed logins list', async () => {
      const res = await request(app)
        .get('/api/subadmin/security/failed-logins')
        .set('Authorization', `Bearer ${subAdminToken}`);

      assert.strictEqual(res.statusCode, 200);
      assert.ok(Array.isArray(res.body.data));
      assert.ok(res.body.data.length >= 1);
    });
  });

  // ----------------------------------------------------------------------------
  // 5. Security Alerts Triage
  // ----------------------------------------------------------------------------
  await t.test('5. Security Alerts Lifecycle', async (t2) => {
    // Create a test alert directly in db
    const alert = await prisma.securityAlert.create({
      data: {
        alertType: 'TEST_INTRUSION_ALERT',
        severity: 'CRITICAL',
        title: 'Test Intrusion Alert',
        description: 'Automated test alert description',
        status: 'OPEN',
        source: 'API',
        ipAddress: '197.156.98.99',
      },
    });
    testAlertId = alert.id;

    await t2.test('GET /api/subadmin/security/alerts lists active security alerts', async () => {
      const res = await request(app)
        .get('/api/subadmin/security/alerts')
        .set('Authorization', `Bearer ${subAdminToken}`);

      assert.strictEqual(res.statusCode, 200);
      assert.ok(Array.isArray(res.body.data));
      const found = res.body.data.find((a) => a.id === testAlertId);
      assert.ok(found, 'Created alert must be present');
      assert.strictEqual(found.status, 'OPEN');
      assert.strictEqual(found.resolved, false);
    });

    await t2.test('PATCH /api/subadmin/security/alerts/:id updates alert status to RESOLVED', async () => {
      const res = await request(app)
        .patch(`/api/subadmin/security/alerts/${testAlertId}`)
        .set('Authorization', `Bearer ${subAdminToken}`)
        .send({
          status: 'RESOLVED',
          action: 'RESOLVE',
          resolutionNotes: 'False positive confirmed after IP inspection.',
        });

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body.data.status, 'RESOLVED');
      assert.strictEqual(res.body.data.resolved, true);

      // Verify audit history created
      const history = await prisma.securityAlertHistory.findFirst({
        where: { alertId: testAlertId },
      });
      assert.ok(history, 'SecurityAlertHistory entry must be created');
      assert.strictEqual(history.newStatus, 'RESOLVED');
    });
  });

  // ----------------------------------------------------------------------------
  // 6. Active Sessions & Revocation
  // ----------------------------------------------------------------------------
  await t.test('6. Session Management', async (t2) => {
    // Create a temporary active session for testing
    const session = await prisma.adminSession.create({
      data: {
        adminId: seededSubAdmin ? seededSubAdmin.id : createdSuperAdminId,
        tokenHash: `test-token-hash-${Date.now()}`,
        ipAddress: '197.156.98.50',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0)',
        status: 'ACTIVE',
        expiresAt: new Date(Date.now() + 3600 * 1000),
      },
    });
    testSessionId = session.id;

    await t2.test('GET /api/subadmin/security/sessions lists active sessions', async () => {
      const res = await request(app)
        .get('/api/subadmin/security/sessions')
        .set('Authorization', `Bearer ${subAdminToken}`);

      assert.strictEqual(res.statusCode, 200);
      assert.ok(Array.isArray(res.body.data));
      const found = res.body.data.find((s) => s.id === testSessionId);
      assert.ok(found, 'Session must be in active sessions list');
    });

    await t2.test('POST /api/subadmin/security/sessions/:id/revoke revokes session', async () => {
      const res = await request(app)
        .post(`/api/subadmin/security/sessions/${testSessionId}/revoke`)
        .set('Authorization', `Bearer ${subAdminToken}`);

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body.data.status, 'REVOKED');

      const inDb = await prisma.adminSession.findUnique({
        where: { id: testSessionId },
      });
      assert.strictEqual(inDb.status, 'REVOKED');
    });
  });

  // ----------------------------------------------------------------------------
  // 7. IP Firewall Rules
  // ----------------------------------------------------------------------------
  await t.test('7. IP Firewall Rules Management', async (t2) => {
    const testIp = `197.156.${Math.floor(Math.random() * 200)}.${Math.floor(Math.random() * 200)}`;

    await t2.test('POST /api/subadmin/security/ip-rules creates new firewall rule', async () => {
      const res = await request(app)
        .post('/api/subadmin/security/ip-rules')
        .set('Authorization', `Bearer ${subAdminToken}`)
        .send({
          ipAddress: testIp,
          reason: 'Automated test firewall rule',
          status: 'BLOCKED',
        });

      assert.strictEqual(res.statusCode, 201);
      assert.strictEqual(res.body.data.ipAddress, testIp);
      assert.strictEqual(res.body.data.status, 'BLOCKED');
      testIpRuleId = res.body.data.id;
    });

    await t2.test('GET /api/subadmin/security/ip-rules lists firewall rules', async () => {
      const res = await request(app)
        .get('/api/subadmin/security/ip-rules')
        .set('Authorization', `Bearer ${subAdminToken}`);

      assert.strictEqual(res.statusCode, 200);
      assert.ok(Array.isArray(res.body.data));
      const found = res.body.data.find((r) => r.id === testIpRuleId);
      assert.ok(found);
    });

    await t2.test('DELETE /api/subadmin/security/ip-rules/:id removes firewall rule', async () => {
      const res = await request(app)
        .delete(`/api/subadmin/security/ip-rules/${testIpRuleId}`)
        .set('Authorization', `Bearer ${subAdminToken}`);

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body.data.success, true);

      const inDb = await prisma.ipBlockRule.findUnique({
        where: { id: testIpRuleId },
      });
      assert.strictEqual(inDb, null);
    });
  });

  // ----------------------------------------------------------------------------
  // 8. Audit Logs
  // ----------------------------------------------------------------------------
  await t.test('8. Security Audit Logs Retrieval', async (t2) => {
    const res = await request(app)
      .get('/api/subadmin/security/audit-logs')
      .set('Authorization', `Bearer ${subAdminToken}`);

    assert.strictEqual(res.statusCode, 200);
    assert.ok(Array.isArray(res.body.data));
    assert.ok(res.body.data.length >= 1);
  });

  // ----------------------------------------------------------------------------
  // 9. Teardown
  // ----------------------------------------------------------------------------
  await t.test('9. Test Data Cleanup', async () => {
    if (testAlertId) {
      await prisma.securityAlertHistory.deleteMany({ where: { alertId: testAlertId } });
      await prisma.securityAlert.deleteMany({ where: { id: testAlertId } });
    }
    if (testSessionId) {
      await prisma.adminSession.deleteMany({ where: { id: testSessionId } });
    }
    if (createdSuperAdminId) {
      await prisma.auditLog.deleteMany({ where: { entityId: createdSuperAdminId } });
      await prisma.securityEvent.deleteMany({ where: { targetId: createdSuperAdminId } });
      await prisma.adminUser.deleteMany({ where: { id: createdSuperAdminId } });
    }
    await prisma.securityEvent.deleteMany({ where: { actorEmail: 'test.user@ardabtest.com' } });
  });
});
