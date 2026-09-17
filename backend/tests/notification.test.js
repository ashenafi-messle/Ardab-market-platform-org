// ==============================================================================
// Ardab Market - Notifications & Operational Alerts Test Suite
// ==============================================================================

import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/shared/config/database.js';
import { generateAdminToken } from '../src/admin/services/auth.service.js';
import { ADMIN_ROLES } from '../src/admin/constants/adminRoles.js';

const app = createApp();

const seededSuperAdmin = await prisma.adminUser.findUnique({
  where: { email: 'admin@ardabmarket.com' },
});

const superAdminToken = generateAdminToken({
  id: seededSuperAdmin ? seededSuperAdmin.id : 'super-admin-id',
  email: 'admin@ardabmarket.com',
  name: seededSuperAdmin ? seededSuperAdmin.name : 'Super Admin',
  role: ADMIN_ROLES.SUPER_ADMIN,
});

test('Notifications & Operational Alerts Module', async (suite) => {
  let testNotificationId = null;

  // Cleanup helper
  suite.after(async () => {
    if (testNotificationId) {
      await prisma.notification.deleteMany({
        where: { id: testNotificationId },
      });
    }
  });

  await suite.test('1. Create Notification (Operational Alert)', async () => {
    const payload = {
      type: 'OPERATIONAL_ALERT',
      category: 'ORDER',
      title: 'Test Urgent Alert',
      message: 'This is a test urgent alert.',
      severity: 'CRITICAL',
      priority: 'URGENT',
      isAlert: true,
    };

    const res = await request(app)
      .post('/api/admin/notifications')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send(payload);

    assert.equal(res.status, 201, `Failed to create notification. Msg: ${res.body.message}`);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.id);
    assert.equal(res.body.data.title, payload.title);
    assert.equal(res.body.data.isAlert, true);
    assert.equal(res.body.data.isRead, false); // For the creator/recipient

    testNotificationId = res.body.data.id;
  });

  await suite.test('2. Get Notification Summary Metrics', async () => {
    const res = await request(app)
      .get('/api/admin/notifications/summary')
      .set('Authorization', `Bearer ${superAdminToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    const summary = res.body.data;
    assert.ok(typeof summary.total === 'number');
    assert.ok(typeof summary.unreadCount === 'number');
    assert.ok(typeof summary.alertCount === 'number');
    assert.ok(typeof summary.criticalCount === 'number');
    assert.ok(Array.isArray(summary.recentAlerts));
  });

  await suite.test('3. List Notifications', async () => {
    const res = await request(app)
      .get('/api/admin/notifications?tab=ALERTS')
      .set('Authorization', `Bearer ${superAdminToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(Array.isArray(res.body.data));
    assert.ok(res.body.data.some((n) => n.id === testNotificationId));
  });

  await suite.test('4. Mark Notification as Read', async () => {
    const res = await request(app)
      .patch(`/api/admin/notifications/${testNotificationId}/read`)
      .set('Authorization', `Bearer ${superAdminToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.isRead, true);
  });

  await suite.test('5. Acknowledge Operational Alert', async () => {
    const payload = {
      notes: 'Investigated and resolved.',
    };

    const res = await request(app)
      .post(`/api/admin/notifications/${testNotificationId}/acknowledge`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send(payload);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.isAcknowledged, true);
    assert.equal(res.body.data.acknowledgementNotes, payload.notes);
  });

  await suite.test('6. Mark All As Read', async () => {
    const res = await request(app)
      .post('/api/admin/notifications/mark-all-read')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ category: 'ALL' });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(typeof res.body.data.updatedCount === 'number');
  });
});
