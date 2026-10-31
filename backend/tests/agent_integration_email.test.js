// ==============================================================================
// Ardab Market - Agent Integration & Approval Email Notification Test Suite
// ==============================================================================

import test from 'node:test';
import assert from 'node:assert/strict';
import { ApiResponse } from '../src/shared/utils/apiResponse.js';
import { getAgentIntegrationApprovedTemplate } from '../src/shared/services/email/email.templates.js';
import { EmailService } from '../src/shared/services/email/email.service.js';
import { sendAgentApprovalEmailSafely } from '../src/admin/services/agentIntegration.service.js';

test('Agent Integration & Approval Email Notification Suite', async (suite) => {
  // ----------------------------------------------------------------------------
  // 1. ApiResponse.paginated Hardening (Fix for HTTP 500 RangeError)
  // ----------------------------------------------------------------------------
  await suite.test('ApiResponse.paginated handles integer status code normally', () => {
    let capturedStatus = null;
    let capturedBody = null;
    const mockRes = {
      status(code) {
        if (typeof code !== 'number') throw new RangeError('Invalid status code: ' + code);
        capturedStatus = code;
        return this;
      },
      json(data) {
        capturedBody = data;
        return this;
      },
    };

    ApiResponse.paginated(mockRes, [{ id: 'req-1' }], { total: 1, page: 1, limit: 15 }, 'Retrieved', 200);

    assert.equal(capturedStatus, 200);
    assert.equal(capturedBody.success, true);
    assert.equal(capturedBody.data.length, 1);
    assert.equal(capturedBody.pagination.total, 1);
  });

  await suite.test('ApiResponse.paginated safely recovers when meta object is passed as 5th argument', () => {
    let capturedStatus = null;
    let capturedBody = null;
    const mockRes = {
      status(code) {
        if (typeof code !== 'number' || code < 100 || code > 599) {
          throw new RangeError('Invalid status code: ' + code);
        }
        capturedStatus = code;
        return this;
      },
      json(data) {
        capturedBody = data;
        return this;
      },
    };

    // This exact call pattern previously crashed with RangeError [ERR_HTTP_INVALID_STATUS_CODE]: Invalid status code: [object Object]
    assert.doesNotThrow(() => {
      ApiResponse.paginated(
        mockRes,
        [{ id: 'req-1' }],
        { total: 1, page: 1, limit: 15 },
        'Integration requests retrieved.',
        { pendingTotal: 4 } // Passed as 5th arg
      );
    });

    assert.equal(capturedStatus, 200);
    assert.equal(capturedBody.success, true);
    assert.equal(capturedBody.pendingTotal, 4);
    assert.equal(capturedBody.meta?.pendingTotal, 4);
  });

  // ----------------------------------------------------------------------------
  // 2. Email Template Branding & Content Verification
  // ----------------------------------------------------------------------------
  await suite.test('getAgentIntegrationApprovedTemplate renders required brand slogan and attributes', () => {
    const { htmlContent, textContent } = getAgentIntegrationApprovedTemplate({
      agentName: 'Abebe Bikila',
      customerName: 'Almaz Ayana',
      customerCode: 'CUST-00921',
      approvedAt: new Date('2026-10-31T12:00:00Z'),
    });

    // Brand and platform requirements
    assert.match(htmlContent, /Quality and Trust, Delivered to Your Door!/);
    assert.match(htmlContent, /Ardab Market &mdash; Powered by Ardab Tech Solutions S\.C\./);
    assert.match(htmlContent, /Abebe Bikila/);
    assert.match(htmlContent, /Almaz Ayana/);
    assert.match(htmlContent, /CUST-00921/);
    assert.match(htmlContent, /Customer Integration Approved/);
    assert.match(htmlContent, /commission policy/);

    // Text version requirements
    assert.match(textContent, /Ardab Market — Customer Integration Request Approved/);
    assert.match(textContent, /Hello Abebe Bikila/);
    assert.match(textContent, /Customer: Almaz Ayana/);
    assert.match(textContent, /Customer Code: CUST-00921/);
    assert.match(textContent, /Quality and Trust, Delivered to Your Door!/);
    assert.match(textContent, /Powered by Ardab Tech Solutions S\.C\./);
  });

  await suite.test('getAgentIntegrationApprovedTemplate provides graceful fallback when customer details omitted', () => {
    const { htmlContent, textContent } = getAgentIntegrationApprovedTemplate({
      agentName: 'Dawit Agent',
    });

    assert.match(htmlContent, /Valued Customer/);
    assert.match(textContent, /Customer: Valued Customer/);
    assert.match(htmlContent, /Quality and Trust, Delivered to Your Door!/);
  });

  // ----------------------------------------------------------------------------
  // 3. Email Service Dispatch (Simulated / Test Mode)
  // ----------------------------------------------------------------------------
  await suite.test('EmailService.sendAgentIntegrationApprovedEmail sends email via configured provider', async () => {
    const result = await EmailService.sendAgentIntegrationApprovedEmail({
      toEmail: 'agent.abebe@ardabmarket.com',
      agentName: 'Abebe Bikila',
      customerName: 'Almaz Ayana',
      customerCode: 'CUST-00921',
      approvedAt: new Date(),
    });

    assert.equal(result.success, true);
    assert.ok(result.messageId);
  });

  // ----------------------------------------------------------------------------
  // 4. Safe Post-Commit Delivery Resilience
  // ----------------------------------------------------------------------------
  await suite.test('sendAgentApprovalEmailSafely handles missing agent email gracefully', async () => {
    const res = await sendAgentApprovalEmailSafely({
      agentEmail: null,
      agentName: 'Nameless Agent',
      customerName: 'Customer X',
    });

    assert.equal(res.success, false);
    assert.equal(res.status, 'SKIPPED_NO_EMAIL');
  });

  await suite.test('sendAgentApprovalEmailSafely delivers email and reports DELIVERED status in test mode', async () => {
    const res = await sendAgentApprovalEmailSafely({
      agentEmail: 'verified.agent@ardabmarket.com',
      agentName: 'Verified Agent',
      customerName: 'Loyal Customer',
      customerCode: 'CUST-8812',
      approvedAt: new Date(),
    });

    assert.equal(res.success, true);
    assert.equal(res.status, 'DELIVERED');
    assert.ok(res.messageId);
  });
});

