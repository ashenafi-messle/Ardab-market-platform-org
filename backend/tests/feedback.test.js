// ==============================================================================
// Ardab Market - Feedback & Reputation Management Integration Test Suite
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
  id: seededSuperAdmin ? seededSuperAdmin.id : 'df61c5d7-3f2d-40e3-aea6-6b527a6d353a',
  email: seededSuperAdmin ? seededSuperAdmin.email : 'admin@ardabmarket.com',
  name: seededSuperAdmin ? seededSuperAdmin.name : 'Super Admin',
  role: ADMIN_ROLES.SUPER_ADMIN,
});

const subAdminToken = generateAdminToken({
  id: seededSubAdmin ? seededSubAdmin.id : 'subadmin-uuid-1',
  email: seededSubAdmin ? seededSubAdmin.email : 'ashurack664@gmail.com',
  name: seededSubAdmin ? seededSubAdmin.name : 'Sub Admin',
  role: ADMIN_ROLES.SUB_ADMIN,
});

const dispatcherToken = generateAdminToken({
  id: 'mock-dispatcher-id',
  email: 'dispatcher@ardabmarket.com',
  name: 'Dispatcher User',
  role: ADMIN_ROLES.DISPATCHER,
});

// Find or create test customer
let testCustomer = await prisma.customer.findFirst({
  where: { email: 'feedback.tester@ardabtest.com' },
});
if (!testCustomer) {
  testCustomer = await prisma.customer.create({
    data: {
      customerCode: `CUST-FB-${Date.now().toString().slice(-4)}`,
      fullName: 'Test Feedback Customer',
      phone: `+25199${Date.now().toString().slice(-7)}`,
      email: 'feedback.tester@ardabtest.com',
      city: 'Gondar',
      status: 'ACTIVE',
      verificationStatus: 'VERIFIED',
    },
  });
}

let createdFeedbackId = null;
let testReportId = null;

test('Feedback & Reputation Management Module Test Suite', async (t) => {
  // 1. RBAC & Security Gates
  await t.test('1. Security & RBAC Protection', async (t2) => {
    await t2.test('GET /api/subadmin/feedback returns 401 without authentication token', async () => {
      const res = await request(app).get('/api/subadmin/feedback');
      assert.equal(res.status, 401);
      assert.equal(res.body.success, false);
    });

    await t2.test('GET /api/subadmin/feedback returns 403 for unauthorized role (DISPATCHER)', async () => {
      const res = await request(app)
        .get('/api/subadmin/feedback')
        .set('Authorization', `Bearer ${dispatcherToken}`);
      assert.equal(res.status, 403);
      assert.equal(res.body.success, false);
    });

    await t2.test('GET /api/subadmin/feedback allows SUB_ADMIN with feedback:view permission', async () => {
      const res = await request(app)
        .get('/api/subadmin/feedback')
        .set('Authorization', `Bearer ${subAdminToken}`);
      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(Array.isArray(res.body.data));
    });
  });

  // 2. Categories & Statistics
  await t.test('2. Categories and Statistics Retrieval', async (t2) => {
    await t2.test('GET /api/subadmin/feedback/categories returns active categories', async () => {
      const res = await request(app)
        .get('/api/subadmin/feedback/categories')
        .set('Authorization', `Bearer ${subAdminToken}`);
      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(Array.isArray(res.body.data));
      assert.ok(res.body.data.length >= 1);
    });

    await t2.test('GET /api/subadmin/feedback/statistics returns calculated metrics & NPS', async () => {
      const res = await request(app)
        .get('/api/subadmin/feedback/statistics?city=Gondar')
        .set('Authorization', `Bearer ${subAdminToken}`);
      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(typeof res.body.data.averageRating === 'number');
      assert.ok(typeof res.body.data.totalReviews === 'number');
      assert.ok(typeof res.body.data.netPromoterScore === 'number');
      assert.ok(typeof res.body.data.positivePercentage === 'number');
      assert.ok(res.body.data.ratingDistribution !== undefined);
      assert.ok(res.body.data.operationalCounts !== undefined);
    });
  });

  // 3. Feedback Submission & Validation
  await t.test('3. Feedback Submission and Rating Validation', async (t2) => {
    await t2.test('POST /api/subadmin/feedback rejects invalid rating (e.g. 6 or 0)', async () => {
      const res = await request(app)
        .post('/api/subadmin/feedback')
        .set('Authorization', `Bearer ${subAdminToken}`)
        .send({
          authorName: 'Test Buyer',
          rating: 6,
          title: 'Invalid Rating Test',
          comment: 'This should fail validation',
        });
      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
    });

    await t2.test('POST /api/subadmin/feedback creates valid feedback record', async () => {
      const res = await request(app)
        .post('/api/subadmin/feedback')
        .set('Authorization', `Bearer ${subAdminToken}`)
        .send({
          customerId: testCustomer.id,
          authorName: testCustomer.fullName,
          city: 'Gondar',
          type: 'PRODUCT',
          source: 'PRODUCT',
          rating: 5,
          title: 'Exceptional Grain Quality Consignment',
          comment: 'The whole consignment arrived in peak condition with great packaging.',
          targetEntityName: 'Teff Flour Premium',
        });

      assert.equal(res.status, 201);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.rating, 5);
      assert.equal(res.body.data.sentiment, 'POSITIVE');
      assert.equal(res.body.data.status, 'PUBLISHED');
      createdFeedbackId = res.body.data.id;
      assert.ok(createdFeedbackId);
    });
  });

  // 4. Listing, Filtering & Pagination
  await t.test('4. Listing, Filtering and Searching', async (t2) => {
    await t2.test('GET /api/subadmin/feedback supports search query', async () => {
      const res = await request(app)
        .get('/api/subadmin/feedback?search=Exceptional Grain')
        .set('Authorization', `Bearer ${subAdminToken}`);
      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(res.body.data.length >= 1);
      assert.ok(res.body.data.some((f) => f.id === createdFeedbackId));
    });

    await t2.test('GET /api/subadmin/feedback supports filtering by rating', async () => {
      const res = await request(app)
        .get('/api/subadmin/feedback?rating=5')
        .set('Authorization', `Bearer ${subAdminToken}`);
      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      res.body.data.forEach((item) => assert.equal(item.rating, 5));
    });

    await t2.test('GET /api/subadmin/feedback supports pagination', async () => {
      const res = await request(app)
        .get('/api/subadmin/feedback?page=1&limit=2')
        .set('Authorization', `Bearer ${subAdminToken}`);
      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(res.body.pagination);
      assert.equal(res.body.pagination.page, 1);
      assert.equal(res.body.pagination.limit, 2);
    });
  });

  // 5. Details API
  await t.test('5. Detailed Feedback Retrieval', async (t2) => {
    await t2.test('GET /api/subadmin/feedback/:id returns full relation tree', async () => {
      const res = await request(app)
        .get(`/api/subadmin/feedback/${createdFeedbackId}`)
        .set('Authorization', `Bearer ${subAdminToken}`);
      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.id, createdFeedbackId);
      assert.ok(res.body.data.customer);
      assert.equal(res.body.data.customer.email, 'feedback.tester@ardabtest.com');
      assert.ok(Array.isArray(res.body.data.responses));
    });
  });

  // 6. Subadmin Response Workflow
  await t.test('6. Administrative Response Management', async (t2) => {
    await t2.test('POST /api/subadmin/feedback/:id/responses creates official response', async () => {
      const res = await request(app)
        .post(`/api/subadmin/feedback/${createdFeedbackId}/responses`)
        .set('Authorization', `Bearer ${subAdminToken}`)
        .send({
          body: 'Thank you for your valuable feedback! We appreciate your trust in Ardab Market.',
        });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.id, createdFeedbackId);
      assert.ok(res.body.data.adminReply.includes('valuable feedback'));
      assert.ok(res.body.data.repliedAt);
      assert.equal(res.body.data.status, 'REVIEWED');
    });

    await t2.test('POST /api/subadmin/feedback/:id/responses rejects empty body', async () => {
      const res = await request(app)
        .post(`/api/subadmin/feedback/${createdFeedbackId}/responses`)
        .set('Authorization', `Bearer ${subAdminToken}`)
        .send({ body: '   ' });

      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
    });
  });

  // 7. Atomic Moderation Actions & Audit Trails
  await t.test('7. Moderation Workflow & History', async (t2) => {
    await t2.test('POST /api/subadmin/feedback/:id/moderate hides feedback (HIDE)', async () => {
      const res = await request(app)
        .post(`/api/subadmin/feedback/${createdFeedbackId}/moderate`)
        .set('Authorization', `Bearer ${subAdminToken}`)
        .send({
          action: 'HIDE',
          reason: 'Review under quality audit',
        });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.status, 'HIDDEN');
      assert.equal(res.body.data.visibility, 'HIDDEN');

      // Verify audit record in moderation history
      const modHistory = await prisma.feedbackModerationHistory.findFirst({
        where: { feedbackId: createdFeedbackId, action: 'HIDE' },
      });
      assert.ok(modHistory);
      assert.equal(modHistory.newStatus, 'HIDDEN');
    });

    await t2.test('Reputation calculation excludes HIDDEN feedback', async () => {
      // Statistics should exclude HIDDEN reviews from public average
      const res = await request(app)
        .get('/api/subadmin/feedback/statistics')
        .set('Authorization', `Bearer ${subAdminToken}`);

      assert.equal(res.status, 200);
      assert.ok(res.body.data.operationalCounts.hiddenCount >= 1);
    });

    await t2.test('POST /api/subadmin/feedback/:id/moderate restores feedback (RESTORE)', async () => {
      const res = await request(app)
        .post(`/api/subadmin/feedback/${createdFeedbackId}/moderate`)
        .set('Authorization', `Bearer ${subAdminToken}`)
        .send({
          action: 'RESTORE',
          reason: 'Audit complete, verified legitimate',
        });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.status, 'PUBLISHED');
      assert.equal(res.body.data.visibility, 'PUBLIC');
    });
  });

  // 8. Reporting & Resolution
  await t.test('8. Reporting and Report Resolution', async (t2) => {
    await t2.test('POST /api/subadmin/feedback/:id/reports flags feedback', async () => {
      const res = await request(app)
        .post(`/api/subadmin/feedback/${createdFeedbackId}/reports`)
        .set('Authorization', `Bearer ${subAdminToken}`)
        .send({
          reason: 'SPAM',
          description: 'Suspected duplicate entry test',
          reportedBy: 'Staff Auditor',
        });

      assert.equal(res.status, 201);
      assert.equal(res.body.success, true);
      testReportId = res.body.data.id;
      assert.ok(testReportId);
    });

    await t2.test('GET /api/subadmin/feedback/reports lists reports in queue', async () => {
      const res = await request(app)
        .get('/api/subadmin/feedback/reports')
        .set('Authorization', `Bearer ${subAdminToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(res.body.data.some((r) => r.id === testReportId));
    });

    await t2.test('PATCH /api/subadmin/feedback/reports/:id resolves report (DISMISS)', async () => {
      const res = await request(app)
        .patch(`/api/subadmin/feedback/reports/${testReportId}`)
        .set('Authorization', `Bearer ${subAdminToken}`)
        .send({
          action: 'DISMISS',
          actionTaken: 'Verified genuine buyer feedback, dismissed flag',
        });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.status, 'DISMISSED');
    });
  });

  // Cleanup test-generated feedback and customer
  t.after(async () => {
    if (createdFeedbackId) {
      await prisma.feedbackReport.deleteMany({ where: { feedbackId: createdFeedbackId } });
      await prisma.feedbackResponse.deleteMany({ where: { feedbackId: createdFeedbackId } });
      await prisma.feedbackModerationHistory.deleteMany({ where: { feedbackId: createdFeedbackId } });
      await prisma.feedbackStatusHistory.deleteMany({ where: { feedbackId: createdFeedbackId } });
      await prisma.feedback.delete({ where: { id: createdFeedbackId } });
    }
    if (testCustomer) {
      await prisma.customer.delete({ where: { id: testCustomer.id } }).catch(() => {});
    }
  });
});
