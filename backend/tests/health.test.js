// ==============================================================================
// Health Check Integration Tests
// ==============================================================================

import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../src/app.js';

const app = createApp();

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
