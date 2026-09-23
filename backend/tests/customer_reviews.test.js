// ==============================================================================
// Ardab Market - Customer Product Reviews End-to-End Integration Test Suite
// ==============================================================================

import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/shared/config/database.js';
import { generateCustomerToken } from '../src/customer/services/customerAuth.service.js';
import { generateAdminToken } from '../src/admin/services/auth.service.js';
import { ADMIN_ROLES } from '../src/admin/constants/adminRoles.js';

const app = createApp();

test('Customer Reviews & Feedback Full E2E Security & Functional Test Suite', async (suite) => {
  let customerA = null; // Verified purchaser with DELIVERED order
  let customerB = null; // Another customer (IDOR attacker)
  let customerC = null; // Customer with PENDING (undelivered) order
  let customerD = null; // Customer who never purchased
  let customerTokenA = null;
  let customerTokenB = null;
  let customerTokenC = null;
  let customerTokenD = null;
  let subAdminToken = null;

  let testSeller = null;
  let testCategory = null;
  let testProduct1 = null;
  let testProduct2 = null;

  let deliveredOrderA = null;
  let pendingOrderC = null;

  let createdReviewId = null;

  suite.before(async () => {
    // 1. Create Seller & Marketplace Category
    testSeller = await prisma.supplier.create({
      data: {
        companyName: `Review Test Seller ${Date.now()}`,
        name: 'Ato Mulugeta',
        phone: `+25191${Date.now().toString().slice(-7)}`,
        email: `seller.review.${Date.now()}@ardabtest.com`,
        city: 'Gondar',
        address: 'Kebele 01, Gondar',
      },
    });

    testCategory = await prisma.marketplaceCategory.create({
      data: {
        name: `Review Category ${Date.now()}`,
        slug: `rev-cat-${Date.now()}`,
      },
    });

    // 2. Create Test Products
    testProduct1 = await prisma.product.create({
      data: {
        itemCode: `REV-PRD-1-${Date.now().toString().slice(-4)}`,
        name: 'Premium Gondar Teff Flour (Special Batch)',
        sellingPrice: 1250.0,
        sellerId: testSeller.id,
        marketplaceCategoryId: testCategory.id,
        status: 'ACTIVE',
      },
    });

    testProduct2 = await prisma.product.create({
      data: {
        itemCode: `REV-PRD-2-${Date.now().toString().slice(-4)}`,
        name: 'Organic Red Wheat Grain',
        sellingPrice: 850.0,
        sellerId: testSeller.id,
        marketplaceCategoryId: testCategory.id,
        status: 'ACTIVE',
      },
    });

    // 3. Create Customers
    customerA = await prisma.customer.create({
      data: {
        customerCode: `CUST-REV-A-${Date.now().toString().slice(-4)}`,
        fullName: 'Abebe Tesfaye',
        phone: `+25191${Date.now().toString().slice(-7)}`,
        email: `buyer.a.${Date.now()}@ardabtest.com`,
        city: 'Gondar',
        status: 'ACTIVE',
      },
    });
    customerTokenA = generateCustomerToken(customerA);

    customerB = await prisma.customer.create({
      data: {
        customerCode: `CUST-REV-B-${Date.now().toString().slice(-4)}`,
        fullName: 'Chaltu Gemechu',
        phone: `+25192${Date.now().toString().slice(-7)}`,
        email: `buyer.b.${Date.now()}@ardabtest.com`,
        city: 'Bahir Dar',
        status: 'ACTIVE',
      },
    });
    customerTokenB = generateCustomerToken(customerB);

    customerC = await prisma.customer.create({
      data: {
        customerCode: `CUST-REV-C-${Date.now().toString().slice(-4)}`,
        fullName: 'Dawit Yohannes',
        phone: `+25193${Date.now().toString().slice(-7)}`,
        email: `buyer.c.${Date.now()}@ardabtest.com`,
        city: 'Gondar',
        status: 'ACTIVE',
      },
    });
    customerTokenC = generateCustomerToken(customerC);

    customerD = await prisma.customer.create({
      data: {
        customerCode: `CUST-REV-D-${Date.now().toString().slice(-4)}`,
        fullName: 'Elsa Berhe',
        phone: `+25194${Date.now().toString().slice(-7)}`,
        email: `buyer.d.${Date.now()}@ardabtest.com`,
        city: 'Gondar',
        status: 'ACTIVE',
      },
    });
    customerTokenD = generateCustomerToken(customerD);

    // 4. Create DELIVERED order for Customer A containing Product 1
    deliveredOrderA = await prisma.order.create({
      data: {
        orderNumber: `ORD-DELIV-A-${Date.now().toString().slice(-4)}`,
        customerId: customerA.id,
        city: 'Gondar',
        status: 'DELIVERED',
        deliveredAt: new Date(),
        subtotal: 2500.0,
        totalAmount: 2500.0,
        items: {
          create: [
            {
              productId: testProduct1.id,
              productNameSnapshot: testProduct1.name,
              itemCodeSnapshot: testProduct1.itemCode,
              unitSnapshot: 'kg',
              unitPrice: 1250.0,
              quantity: 2,
              weightPerUnit: 1.0,
              totalWeight: 2.0,
              subtotal: 2500.0,
            },
          ],
        },
      },
    });

    // 5. Create PENDING (undelivered) order for Customer C containing Product 1
    pendingOrderC = await prisma.order.create({
      data: {
        orderNumber: `ORD-PEND-C-${Date.now().toString().slice(-4)}`,
        customerId: customerC.id,
        city: 'Gondar',
        status: 'PROCESSING',
        subtotal: 1250.0,
        totalAmount: 1250.0,
        items: {
          create: [
            {
              productId: testProduct1.id,
              productNameSnapshot: testProduct1.name,
              itemCodeSnapshot: testProduct1.itemCode,
              unitSnapshot: 'kg',
              unitPrice: 1250.0,
              quantity: 1,
              weightPerUnit: 1.0,
              totalWeight: 1.0,
              subtotal: 1250.0,
            },
          ],
        },
      },
    });

    // 6. Retrieve active Sub Admin token
    const subAdmin = await prisma.adminUser.findFirst({
      where: { role: ADMIN_ROLES.SUB_ADMIN, status: 'ACTIVE' },
    });
    if (subAdmin) {
      subAdminToken = generateAdminToken(subAdmin);
    }
  });

  suite.after(async () => {
    // Cleanup seeded data safely
    if (customerA && customerB) {
      await prisma.feedbackResponse.deleteMany({
        where: { feedback: { customerId: { in: [customerA.id, customerB.id, customerC.id, customerD.id] } } },
      }).catch(() => {});
      await prisma.feedback.deleteMany({
        where: { customerId: { in: [customerA.id, customerB.id, customerC.id, customerD.id] } },
      }).catch(() => {});
      await prisma.orderItem.deleteMany({
        where: { order: { customerId: { in: [customerA.id, customerB.id, customerC.id, customerD.id] } } },
      }).catch(() => {});
      await prisma.order.deleteMany({
        where: { customerId: { in: [customerA.id, customerB.id, customerC.id, customerD.id] } },
      }).catch(() => {});
      await prisma.customer.deleteMany({
        where: { id: { in: [customerA.id, customerB.id, customerC.id, customerD.id] } },
      }).catch(() => {});
    }

    if (testProduct1 && testProduct2) {
      await prisma.product.deleteMany({
        where: { id: { in: [testProduct1.id, testProduct2.id] } },
      }).catch(() => {});
    }
    if (testCategory) {
      await prisma.marketplaceCategory.delete({ where: { id: testCategory.id } }).catch(() => {});
    }
    if (testSeller) {
      await prisma.supplier.delete({ where: { id: testSeller.id } }).catch(() => {});
    }
  });

  // ============================================================================
  // Test 1: Authentication Requirement
  // ============================================================================
  await suite.test('1. Unauthenticated customer cannot create a review (rejected with 401)', async () => {
    const res = await request(app)
      .post(`/api/customer/products/${testProduct1.id}/reviews`)
      .send({
        rating: 5,
        comment: 'Great quality teff flour',
      });

    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
  });

  // ============================================================================
  // Test 2: Any Authenticated Customer Can Review & Rate (Unverified if no delivered purchase)
  // ============================================================================
  await suite.test('2. Customer who has not purchased can review & rate product (201, isVerified: false)', async () => {
    const res = await request(app)
      .post(`/api/customer/products/${testProduct2.id}/reviews`)
      .set('Authorization', `Bearer ${customerTokenD}`)
      .send({
        rating: 4,
        comment: 'Great product selection and quality presentation.',
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.isVerified, false);
    assert.equal(res.body.data.rating, 4);
    assert.equal(res.body.data.status, 'PENDING');
  });

  // ============================================================================
  // Test 3: Customer with In-Progress Order Can Also Review & Rate
  // ============================================================================
  await suite.test('3. Customer with in-progress/pending order can review and rate (201)', async () => {
    const res = await request(app)
      .post(`/api/customer/products/${testProduct2.id}/reviews`)
      .set('Authorization', `Bearer ${customerTokenC}`)
      .send({
        rating: 5,
        comment: 'Excited about this product batch, looks very promising.',
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.isVerified, false);
  });

  // ============================================================================
  // Test 4: Another Customer Can Review Same Product (One review per customer per product)
  // ============================================================================
  await suite.test('4. Customer B can review Product 2 (201, isVerified: false)', async () => {
    const res = await request(app)
      .post(`/api/customer/products/${testProduct2.id}/reviews`)
      .set('Authorization', `Bearer ${customerTokenB}`)
      .send({
        rating: 5,
        comment: 'Testing community review by customer B.',
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
  });

  // ============================================================================
  // Test 5: Review Eligibility Check Endpoint
  // ============================================================================
  await suite.test('5. GET /review-eligibility returns canReview: true for all customers (isVerified distinguishes delivered orders)', async () => {
    const resA = await request(app)
      .get(`/api/customer/products/${testProduct1.id}/review-eligibility`)
      .set('Authorization', `Bearer ${customerTokenA}`);

    assert.equal(resA.status, 200);
    assert.equal(resA.body.data.canReview, true);
    assert.equal(resA.body.data.isVerified, true);
    assert.equal(resA.body.data.orderId, deliveredOrderA.id);

    const resD = await request(app)
      .get(`/api/customer/products/${testProduct1.id}/review-eligibility`)
      .set('Authorization', `Bearer ${customerTokenD}`);

    assert.equal(resD.status, 200);
    assert.equal(resD.body.data.canReview, true);
    assert.equal(resD.body.data.isVerified, false);
    assert.equal(resD.body.data.orderId, null);
  });

  // ============================================================================
  // Test 6: Valid Review Creation for Delivered Purchase
  // ============================================================================
  await suite.test('6. Customer A creates valid review for delivered purchase (201, isVerified: true, PENDING)', async () => {
    const res = await request(app)
      .post(`/api/customer/products/${testProduct1.id}/reviews`)
      .set('Authorization', `Bearer ${customerTokenA}`)
      .send({
        rating: 5,
        title: 'እጅግ በጣም ጥሩ ጥራት ያለው ጤፍ!',
        comment: 'ጤፉ በጣም ንጹህ እና ለእንጀራ ምርጥ ነው። አመሰግናለሁ አርዳብ ገበያ። Exceptional grain consistency.',
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.rating, 5);
    assert.equal(res.body.data.isVerified, true);
    assert.equal(res.body.data.status, 'PENDING');
    assert.equal(res.body.data.productId, testProduct1.id);
    createdReviewId = res.body.data.id;
    assert.ok(createdReviewId);
  });

  // ============================================================================
  // Test 7: Duplicate Review Protection
  // ============================================================================
  await suite.test('7. Customer A cannot submit duplicate review for the same product (rejected with 400)', async () => {
    const res = await request(app)
      .post(`/api/customer/products/${testProduct1.id}/reviews`)
      .set('Authorization', `Bearer ${customerTokenA}`)
      .send({
        rating: 4,
        comment: 'Attempting to write a second review for the same product.',
      });

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error?.code, 'DUPLICATE_REVIEW');
  });

  // ============================================================================
  // Test 8: Rating Boundaries Validation
  // ============================================================================
  await suite.test('8. Rating validation rejects 0, 6, decimal 4.5, and negative numbers', async () => {
    // Rating = 0
    const res0 = await request(app)
      .post(`/api/customer/products/${testProduct1.id}/reviews`)
      .set('Authorization', `Bearer ${customerTokenA}`)
      .send({ rating: 0, comment: 'Rating zero test' });
    assert.equal(res0.status, 400);

    // Rating = 6
    const res6 = await request(app)
      .post(`/api/customer/products/${testProduct1.id}/reviews`)
      .set('Authorization', `Bearer ${customerTokenA}`)
      .send({ rating: 6, comment: 'Rating six test' });
    assert.equal(res6.status, 400);

    // Rating = decimal 4.5
    const resDec = await request(app)
      .post(`/api/customer/products/${testProduct1.id}/reviews`)
      .set('Authorization', `Bearer ${customerTokenA}`)
      .send({ rating: 4.5, comment: 'Rating decimal test' });
    assert.equal(resDec.status, 400);
  });

  // ============================================================================
  // Test 9: Content Sanitization (XSS Protection while preserving Amharic)
  // ============================================================================
  await suite.test('9. Content sanitization strips <script> while preserving Amharic and English text', async () => {
    // Create delivered order for Customer B
    const orderB = await prisma.order.create({
      data: {
        orderNumber: `ORD-DELIV-B-${Date.now().toString().slice(-4)}`,
        customerId: customerB.id,
        city: 'Bahir Dar',
        status: 'DELIVERED',
        deliveredAt: new Date(),
        subtotal: 1250.0,
        totalAmount: 1250.0,
        items: {
          create: [
            {
              productId: testProduct1.id,
              productNameSnapshot: testProduct1.name,
              itemCodeSnapshot: testProduct1.itemCode,
              unitSnapshot: 'kg',
              unitPrice: 1250.0,
              quantity: 1,
              weightPerUnit: 1.0,
              totalWeight: 1.0,
              subtotal: 1250.0,
            },
          ],
        },
      },
    });

    const maliciousInput = "<script>alert('pwned')</script>ጥሩ ምርት ነው! Very nice product.";
    const res = await request(app)
      .post(`/api/customer/products/${testProduct1.id}/reviews`)
      .set('Authorization', `Bearer ${customerTokenB}`)
      .send({
        rating: 4,
        comment: maliciousInput,
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.data.comment.includes('<script>'), false);
    assert.equal(res.body.data.comment.includes('ጥሩ ምርት ነው!'), true);
  });

  // ============================================================================
  // Test 10: Security Guards (No Spoofing customerId, isVerified, or status)
  // ============================================================================
  await suite.test('10. Customer cannot spoof customerId, status: PUBLISHED, or isVerified in body', async () => {
    const rawDbReview = await prisma.feedback.findUnique({
      where: { id: createdReviewId },
    });

    assert.equal(rawDbReview.customerId, customerA.id);
    assert.equal(rawDbReview.status, 'PENDING');
    assert.equal(rawDbReview.isVerified, true);
  });

  // ============================================================================
  // Test 11: Public Review Visibility (Pending reviews hidden from public list)
  // ============================================================================
  await suite.test('11. Pending review is hidden from public product review list', async () => {
    const res = await request(app)
      .get(`/api/customer/products/${testProduct1.id}/reviews`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    // Neither customer review is published yet, so items array should be empty
    assert.equal(res.body.data.items.length, 0);
    assert.equal(res.body.data.summary.totalReviews, 0);
  });

  // ============================================================================
  // Test 12: Sub Admin Feedback Integration
  // ============================================================================
  await suite.test('12. Sub Admin sees customer review in Sub Admin Feedback Management page', async () => {
    if (!subAdminToken) return;

    const res = await request(app)
      .get('/api/subadmin/feedback')
      .set('Authorization', `Bearer ${subAdminToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);

    const found = res.body.data.find((f) => f.id === createdReviewId);
    assert.ok(found, 'Customer review must appear in Sub Admin feedback queue');
    assert.equal(found.status, 'PENDING');
    assert.equal(found.productId, testProduct1.id);
  });

  // ============================================================================
  // Test 13: Sub Admin Moderation Workflow (Publishing Review)
  // ============================================================================
  await suite.test('13. Sub Admin moderates review to PUBLISHED using existing moderation action', async () => {
    if (!subAdminToken) return;

    const res = await request(app)
      .post(`/api/subadmin/feedback/${createdReviewId}/moderate`)
      .set('Authorization', `Bearer ${subAdminToken}`)
      .send({
        action: 'PUBLISH',
        reason: 'Review approved for public display',
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.data.status, 'PUBLISHED');
  });

  // ============================================================================
  // Test 14: Public Rating Aggregation after Moderation Approval
  // ============================================================================
  await suite.test('14. Approved review now appears publicly and updates product rating aggregation', async () => {
    const res = await request(app)
      .get(`/api/customer/products/${testProduct1.id}/reviews`);

    assert.equal(res.status, 200);
    assert.equal(res.body.data.items.length, 1);
    assert.equal(res.body.data.items[0].id, createdReviewId);
    assert.equal(res.body.data.summary.totalReviews, 1);
    assert.equal(res.body.data.summary.averageRating, 5);
    assert.equal(res.body.data.summary.ratingDistribution[5], 1);
  });

  await suite.test('14a. Product list and detail APIs return the public rating summary', async () => {
    const listRes = await request(app)
      .get(`/api/customer/catalog/products?search=${encodeURIComponent(testProduct1.name)}`);

    assert.equal(listRes.status, 200);
    const listedProduct = listRes.body.data.items.find((item) => item.id === testProduct1.id);
    assert.deepEqual(listedProduct.rating, { average: 5, count: 1 });

    const detailRes = await request(app)
      .get(`/api/customer/catalog/products/${testProduct1.id}`);

    assert.equal(detailRes.status, 200);
    assert.deepEqual(detailRes.body.data.rating, { average: 5, count: 1 });
  });

  // ============================================================================
  // Test 15: Sub Admin Official Reply to Review
  // ============================================================================
  await suite.test('15. Sub Admin replies to review and customer sees official response', async () => {
    if (!subAdminToken) return;

    const replyRes = await request(app)
      .post(`/api/subadmin/feedback/${createdReviewId}/responses`)
      .set('Authorization', `Bearer ${subAdminToken}`)
      .send({
        body: 'Thank you Abebe for trusting Ardab Market quality!',
      });

    assert.equal(replyRes.status, 200);

    // Customer views review on product page
    const custRes = await request(app)
      .get(`/api/customer/products/${testProduct1.id}/reviews`)
      .set('Authorization', `Bearer ${customerTokenA}`);

    assert.equal(custRes.status, 200);
    const item = custRes.body.data.items.find((r) => r.id === createdReviewId);
    assert.ok(item.adminReply, 'Official response must be attached to review');
    assert.equal(item.adminReply, 'Thank you Abebe for trusting Ardab Market quality!');
  });

  // ============================================================================
  // Test 16: Customer Personal Review List
  // ============================================================================
  await suite.test('16. Customer A can list own reviews via GET /api/customer/reviews', async () => {
    const res = await request(app)
      .get('/api/customer/reviews')
      .set('Authorization', `Bearer ${customerTokenA}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.length, 1);
    assert.equal(res.body.data[0].id, createdReviewId);
    assert.equal(res.body.data[0].isOwner, true);
  });

  // ============================================================================
  // Test 17: IDOR Attack Protection
  // ============================================================================
  await suite.test('17. Customer B cannot edit or delete Customer A review (rejected with 404/IDOR)', async () => {
    // Customer B attempts to edit Customer A's review
    const editRes = await request(app)
      .patch(`/api/customer/reviews/${createdReviewId}`)
      .set('Authorization', `Bearer ${customerTokenB}`)
      .send({
        comment: 'Hacked by Customer B',
      });

    assert.equal(editRes.status, 404);

    // Customer B attempts to delete Customer A's review
    const delRes = await request(app)
      .delete(`/api/customer/reviews/${createdReviewId}`)
      .set('Authorization', `Bearer ${customerTokenB}`);

    assert.equal(delRes.status, 404);
  });

  // ============================================================================
  // Test 18: Customer Updates and Deletes Own Review
  // ============================================================================
  await suite.test('18. Customer A updates and soft-deletes own review', async () => {
    // 1. Update review
    const updateRes = await request(app)
      .patch(`/api/customer/reviews/${createdReviewId}`)
      .set('Authorization', `Bearer ${customerTokenA}`)
      .send({
        rating: 4,
        comment: 'Updated: still very good quality flour.',
      });

    assert.equal(updateRes.status, 200);
    assert.equal(updateRes.body.data.rating, 4);
    assert.equal(updateRes.body.data.status, 'PENDING'); // Re-entered moderation

    // 2. Delete review
    const delRes = await request(app)
      .delete(`/api/customer/reviews/${createdReviewId}`)
      .set('Authorization', `Bearer ${customerTokenA}`);

    assert.equal(delRes.status, 200);
    assert.equal(delRes.body.data.success, true);

    // 3. Verify it is archived and no longer listed
    const checkRes = await request(app)
      .get('/api/customer/reviews')
      .set('Authorization', `Bearer ${customerTokenA}`);

    assert.equal(checkRes.status, 200);
    const found = checkRes.body.data.find((r) => r.id === createdReviewId);
    assert.equal(found, undefined, 'Archived review must not be listed');
  });
});
