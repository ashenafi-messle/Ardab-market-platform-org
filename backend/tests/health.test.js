// ==============================================================================
// Health Check Integration Tests
// ==============================================================================

import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../src/app.js';

const FRONTEND_ORIGIN = process.env.CORS_ORIGIN?.split(',')[0].trim() || 'http://localhost:3000';

const app = createApp();

test('CORS preflight allows configured frontend auth requests', async () => {
  for (const [path, method] of [['/api/auth/login', 'POST'], ['/api/auth/me', 'GET']]) {
    const response = await request(app)
      .options(path)
      .set('Origin', FRONTEND_ORIGIN)
      .set('Access-Control-Request-Method', method)
      .set('Access-Control-Request-Headers', 'Authorization, Content-Type');

    assert.equal(response.statusCode, 204);
    assert.equal(response.headers['access-control-allow-origin'], FRONTEND_ORIGIN);
    assert.equal(response.headers['access-control-allow-credentials'], 'true');
    assert.match(response.headers['access-control-allow-methods'], new RegExp(method));
    assert.match(response.headers['access-control-allow-methods'], /OPTIONS/);
    assert.match(response.headers['access-control-allow-headers'], /Authorization/i);
    assert.match(response.headers['access-control-allow-headers'], /Content-Type/i);
  }
});

test('Health Endpoints', async (t) => {
  await t.test('GET /api/health returns structured health response', async () => {
    const res = await request(app).get('/api/health');

    // Either 200 (if DB connected) or 503 (if DB offline in local test runner)
    assert.ok([200, 503].includes(res.status), `Expected 200 or 503, got ${res.status}`);
    assert.equal(typeof res.body, 'object');

    if (res.status === 200) {
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.api, 'ok');
      assert.ok(['connected', 'ok'].includes(res.body.data.database));
    } else {
      assert.equal(res.body.success, false);
      assert.equal(res.body.error.code, 'SERVICE_UNAVAILABLE');
      assert.equal(res.body.data.api, 'ok');
      assert.equal(res.body.data.database, 'unreachable');
    }

    // Verify correlation ID is set
    assert.ok(res.headers['x-request-id']);
  });

  await t.test('GET /api/admin/health returns admin health response', async () => {
    const res = await request(app).get('/api/admin/health');
    assert.ok([200, 503].includes(res.status));
    assert.equal(typeof res.body, 'object');
  });

  await t.test('GET /api/v1/health returns health response for versioned route', async () => {
    const res = await request(app).get('/api/v1/health');
    assert.ok([200, 503].includes(res.status));
  });

  await t.test('GET /api/health/live returns process liveness', async () => {
    const res = await request(app).get('/api/health/live');
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.status, 'alive');
  });

  await t.test('GET /api/health/ready returns readiness probe', async () => {
    const res = await request(app).get('/api/health/ready');
    assert.ok([200, 503].includes(res.status), `Expected 200 or 503, got ${res.status}`);
    assert.equal(typeof res.body, 'object');
  });
});
