// ==============================================================================
// Admin Authentication & Authorization Integration Tests
// ==============================================================================

import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import express from 'express';
import { createApp } from '../src/app.js';
import { generateAdminToken, verifyAdminToken } from '../src/admin/services/auth.service.js';
import { adminAuthMiddleware } from '../src/admin/middleware/adminAuth.middleware.js';
import { requireRole, requirePermission } from '../src/admin/middleware/adminPermission.middleware.js';
import { ADMIN_ROLES } from '../src/admin/constants/adminRoles.js';
import { ADMIN_PERMISSIONS } from '../src/admin/constants/adminPermissions.js';
import { errorMiddleware } from '../src/shared/middleware/error.middleware.js';

const app = createApp();

test('Admin Auth API Validation', async (t) => {
  await t.test('POST /api/auth/login rejects empty payload with 400', async () => {
    const res = await request(app).post('/api/auth/login').send({});

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'VALIDATION_ERROR');
    assert.ok(Array.isArray(res.body.error.details));
  });

  await t.test('POST /api/auth/login rejects invalid email format', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'not-an-email',
      password: 'password123',
    });

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'VALIDATION_ERROR');
  });

  await t.test('POST /api/auth/login rejects password shorter than 6 characters', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'admin@ardabmarket.com',
      password: '123',
    });

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'VALIDATION_ERROR');
  });
});

test('JWT Signing and Verification', async (t) => {
  const payload = {
    id: 'admin-uuid-1',
    email: 'admin@ardabmarket.com',
    role: ADMIN_ROLES.SUPER_ADMIN,
    name: 'Test Super Admin',
  };

  const token = generateAdminToken(payload);
  assert.equal(typeof token, 'string');
  assert.ok(token.length > 20);

  const decoded = verifyAdminToken(token);
  assert.equal(decoded.id, payload.id);
  assert.equal(decoded.email, payload.email);
  assert.equal(decoded.role, payload.role);
  assert.equal(decoded.name, payload.name);
});

test('Admin Authorization Middleware Guards', async (t) => {
  // Test mini app for isolated middleware verification
  const testApp = express();
  testApp.use(express.json());

  // Protected Super Admin route
  testApp.get(
    '/test-superadmin-only',
    adminAuthMiddleware,
    requireRole(ADMIN_ROLES.SUPER_ADMIN),
    (req, res) => res.json({ success: true, user: req.user })
  );

  // Protected Permission route
  testApp.get(
    '/test-permission-check',
    adminAuthMiddleware,
    requirePermission(ADMIN_PERMISSIONS.PRODUCTS_CREATE),
    (req, res) => res.json({ success: true, message: 'Permission granted' })
  );

  testApp.use(errorMiddleware);

  const superAdminToken = generateAdminToken({
    id: 'adm-1',
    email: 'super@ardab.com',
    role: ADMIN_ROLES.SUPER_ADMIN,
    name: 'Super Admin',
  });

  const subAdminToken = generateAdminToken({
    id: 'adm-2',
    email: 'sub@ardab.com',
    role: ADMIN_ROLES.SUB_ADMIN,
    name: 'Sub Admin',
  });

  await t.test('Rejects request without Authorization header with 401', async () => {
    const res = await request(testApp).get('/test-superadmin-only');
    assert.equal(res.status, 401);
    assert.equal(res.body.error.code, 'TOKEN_MISSING');
  });

  await t.test('Rejects request with malformed token with 401', async () => {
    const res = await request(testApp)
      .get('/test-superadmin-only')
      .set('Authorization', 'Bearer invalid_garbage_token');
    assert.equal(res.status, 401);
    assert.equal(res.body.error.code, 'INVALID_TOKEN');
  });

  await t.test('Allows Super Admin to access Super Admin route', async () => {
    const res = await request(testApp)
      .get('/test-superadmin-only')
      .set('Authorization', `Bearer ${superAdminToken}`);
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.user.role, ADMIN_ROLES.SUPER_ADMIN);
  });

  await t.test('Denies Sub Admin from accessing Super Admin route with 403', async () => {
    const res = await request(testApp)
      .get('/test-superadmin-only')
      .set('Authorization', `Bearer ${subAdminToken}`);
    assert.equal(res.status, 403);
    assert.equal(res.body.error.code, 'ROLE_FORBIDDEN');
  });

  await t.test('Allows user with products:create permission', async () => {
    const res = await request(testApp)
      .get('/test-permission-check')
      .set('Authorization', `Bearer ${superAdminToken}`);
    assert.equal(res.status, 200);
    assert.equal(res.body.message, 'Permission granted');
  });

  await t.test('Denies Sub Admin from products:create permission with 403', async () => {
    const res = await request(testApp)
      .get('/test-permission-check')
      .set('Authorization', `Bearer ${subAdminToken}`);
    assert.equal(res.status, 403);
    assert.equal(res.body.error.code, 'INSUFFICIENT_PERMISSIONS');
  });
});

test('Live Database Authentication (Seeded Accounts)', async (t) => {
  let superAdminJwt = null;

  await t.test('Super Admin login against Neon PostgreSQL', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'admin@ardabmarket.com',
      password: 'admin123',
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.token);
    assert.equal(res.body.data.user.email, 'admin@ardabmarket.com');
    assert.equal(res.body.data.user.role, 'SUPER_ADMIN');
    assert.equal(res.body.data.user.passwordHash, undefined, 'passwordHash must never be exposed');
    superAdminJwt = res.body.data.token;
  });

  await t.test('Sub Admin login against Neon PostgreSQL', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'subadmin@ardabmarket.com',
      password: 'subadmin123',
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.token);
    assert.equal(res.body.data.user.email, 'subadmin@ardabmarket.com');
    assert.equal(res.body.data.user.role, 'SUB_ADMIN');
  });

  await t.test('Login rejection with invalid password', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'admin@ardabmarket.com',
      password: 'incorrectPassword123',
    });

    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'INVALID_CREDENTIALS');
  });

  await t.test('GET /api/auth/me returns authenticated admin profile', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${superAdminJwt}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.user.email, 'admin@ardabmarket.com');
    assert.equal(res.body.data.user.passwordHash, undefined);
  });
});
