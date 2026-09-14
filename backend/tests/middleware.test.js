// ==============================================================================
// Middleware & Utility Tests
// ==============================================================================

import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { getPaginationParams, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '../src/shared/utils/pagination.js';

const app = createApp();

test('Middleware and Infrastructure', async (t) => {
  await t.test('404 Handler returns standard JSON structure', async () => {
    const res = await request(app).get('/api/v1/non-existent-endpoint');

    assert.equal(res.status, 404);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'RESOURCE_NOT_FOUND');
    assert.ok(res.body.error.message.includes('not found'));
  });

  await t.test('Request ID is propagated from incoming header', async () => {
    const customId = 'custom-test-correlation-id-999';
    const res = await request(app)
      .get('/api/health')
      .set('X-Request-ID', customId);

    assert.equal(res.headers['x-request-id'], customId);
  });

  await t.test('Request ID is generated if not provided', async () => {
    const res = await request(app).get('/api/health');
    assert.ok(res.headers['x-request-id']);
    assert.ok(res.headers['x-request-id'].length >= 10);
  });

  await t.test('Malformed JSON payload returns 400 MALFORMED_JSON', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send('{"bad_json": ');

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'MALFORMED_JSON');
  });
});

test('Pagination Utility', async (t) => {
  await t.test('Applies safe default values', () => {
    const { page, pageSize, skip, take, formatMeta } = getPaginationParams({});
    assert.equal(page, 1);
    assert.equal(pageSize, DEFAULT_PAGE_SIZE);
    assert.equal(skip, 0);
    assert.equal(take, DEFAULT_PAGE_SIZE);

    const meta = formatMeta(250);
    assert.equal(meta.total, 250);
    assert.equal(meta.totalPages, 10);
  });

  await t.test('Clamps excessive page size to MAX_PAGE_SIZE (100)', () => {
    const { pageSize, take } = getPaginationParams({ pageSize: '500' });
    assert.equal(pageSize, MAX_PAGE_SIZE);
    assert.equal(take, MAX_PAGE_SIZE);
  });

  await t.test('Correctly calculates skip for page 3 with 20 items', () => {
    const { page, pageSize, skip } = getPaginationParams({ page: '3', pageSize: '20' });
    assert.equal(page, 3);
    assert.equal(pageSize, 20);
    assert.equal(skip, 40);
  });
});
