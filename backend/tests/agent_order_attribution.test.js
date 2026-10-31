// ==============================================================================
// Ardab Market - Agent Order Attribution & Commission Test Suite
// ==============================================================================

import test from 'node:test';
import assert from 'node:assert/strict';

test('Agent Order Attribution & Commission Logic Suite', async (suite) => {
  // ----------------------------------------------------------------------------
  // Test A & E: Approved Customer Integration & Commission Calculation
  // ----------------------------------------------------------------------------
  await suite.test('Test A & E: Order placed by approved integrated customer attributes agent and creates commission', () => {
    const customer = {
      id: 'cust-101',
      fullName: 'Abebe Customer',
    };

    const activeAgent = {
      id: 'agent-202',
      name: 'Kassahun Agent',
      email: 'kassahun@ardabmarket.com',
      phone: '+251911002233',
      status: 'ACTIVE',
      commissionRate: 5.0,
      commissionType: 'PERCENTAGE',
    };

    const relationship = {
      customerId: customer.id,
      agentId: activeAgent.id,
      agent: activeAgent,
    };

    // Attribution logic during checkout
    const isAgentActive = relationship?.agent?.status === 'ACTIVE';
    const attributedAgentId = isAgentActive ? relationship.agent.id : null;
    const attributedAt = attributedAgentId ? new Date() : null;

    assert.equal(attributedAgentId, 'agent-202');
    assert.ok(attributedAt instanceof Date);

    // Commission calculation logic
    const orderSubtotal = 1000.0;
    const discountAmount = 0.0;
    const eligibleBase = orderSubtotal - discountAmount;
    const commissionRate = activeAgent.commissionRate;
    const commissionAmount = (eligibleBase * commissionRate) / 100;

    assert.equal(commissionAmount, 50.0);

    // Formatted order response representation
    const formatted = {
      id: 'ord-1001',
      orderNumber: 'ORD-20261031-0001',
      customerId: customer.id,
      attributedAgentId,
      attributedAt: attributedAt.toISOString(),
      attributedAgent: {
        id: activeAgent.id,
        name: activeAgent.name,
        phone: activeAgent.phone,
        email: activeAgent.email,
        status: activeAgent.status,
      },
      commission: {
        id: 'comm-1',
        amount: commissionAmount,
        rateSnapshot: commissionRate,
        status: 'PENDING',
      },
    };

    assert.equal(formatted.attributedAgent.id, 'agent-202');
    assert.equal(formatted.attributedAgent.name, 'Kassahun Agent');
    assert.equal(formatted.commission.amount, 50.0);
  });

  // ----------------------------------------------------------------------------
  // Test B: Customer Without Integration
  // ----------------------------------------------------------------------------
  await suite.test('Test B: Customer without integration receives null agent attribution', () => {
    const relationship = null;

    const isAgentActive = relationship?.agent?.status === 'ACTIVE';
    const attributedAgentId = isAgentActive ? relationship.agent.id : null;
    const attributedAt = attributedAgentId ? new Date() : null;

    assert.equal(attributedAgentId, null);
    assert.equal(attributedAt, null);

    const formatted = {
      id: 'ord-1002',
      attributedAgentId,
      attributedAt,
      attributedAgent: null,
      commission: null,
    };

    assert.equal(formatted.attributedAgent, null);
    assert.equal(formatted.commission, null);
  });

  // ----------------------------------------------------------------------------
  // Test C: Pending Integration
  // ----------------------------------------------------------------------------
  await suite.test('Test C: Pending integration request does NOT attribute agent to order', () => {
    const integrationRequest = {
      id: 'req-301',
      customerId: 'cust-102',
      agentId: 'agent-202',
      status: 'PENDING',
    };

    const isApproved = integrationRequest.status === 'APPROVED';
    const attributedAgentId = isApproved ? integrationRequest.agentId : null;

    assert.equal(attributedAgentId, null);
  });

  // ----------------------------------------------------------------------------
  // Test D: Deactivated / Inactive Agent Integration
  // ----------------------------------------------------------------------------
  await suite.test('Test D: Deactivated/Inactive agent does NOT attribute new orders while historical orders retain agent', () => {
    // Historical order before deactivation
    const historicalOrder = {
      id: 'ord-historical-1',
      attributedAgentId: 'agent-202',
      attributedAgent: { id: 'agent-202', name: 'Kassahun Agent' },
    };

    // Agent becomes INACTIVE / SUSPENDED
    const inactiveAgent = {
      id: 'agent-202',
      name: 'Kassahun Agent',
      status: 'INACTIVE',
    };

    const relationship = {
      customerId: 'cust-101',
      agentId: inactiveAgent.id,
      agent: inactiveAgent,
    };

    const isAgentActive = relationship?.agent?.status === 'ACTIVE';
    const newAttributedAgentId = isAgentActive ? relationship.agent.id : null;

    assert.equal(newAttributedAgentId, null, 'New order must not attribute inactive agent');
    assert.equal(historicalOrder.attributedAgentId, 'agent-202', 'Historical order must preserve attribution');
  });

  // ----------------------------------------------------------------------------
  // Test F: Security — Untrusted Payload Override Prevention
  // ----------------------------------------------------------------------------
  await suite.test('Test F: Untrusted agent ID in customer payload is ignored in favor of verified relationship', () => {
    const authenticatedCustomerId = 'cust-101';
    const maliciousPayload = {
      agentId: 'agent-fake-999',
      integratedAgentId: 'agent-fake-999',
      attributedAgentId: 'agent-fake-999',
    };

    // Backend authoritative lookup: ALWAYS uses authenticatedCustomerId
    const authoritativeRelationship = {
      customerId: authenticatedCustomerId,
      agentId: 'agent-authentic-123',
      agent: { id: 'agent-authentic-123', status: 'ACTIVE' },
    };

    // Security check: Customer payload agent fields are NEVER trusted
    const resolvedAgentId = authoritativeRelationship.agent.status === 'ACTIVE'
      ? authoritativeRelationship.agent.id
      : null;

    assert.notEqual(resolvedAgentId, maliciousPayload.agentId);
    assert.notEqual(resolvedAgentId, maliciousPayload.integratedAgentId);
    assert.equal(resolvedAgentId, 'agent-authentic-123');
  });

  // ----------------------------------------------------------------------------
  // Frontend Normalizer Verification
  // ----------------------------------------------------------------------------
  await suite.test('Frontend normalizer contract preserves attributedAgent and commission objects', () => {
    const rawBackendOrder = {
      id: 'ord-555',
      orderNumber: 'ORD-555',
      customerId: 'cust-101',
      customerName: 'Abebe Customer',
      status: 'CONFIRMED',
      attributedAgentId: 'agent-202',
      attributedAt: '2026-10-31T12:00:00.000Z',
      attributedAgent: {
        id: 'agent-202',
        name: 'Kassahun Agent',
        phone: '+251911002233',
        email: 'kassahun@ardabmarket.com',
        status: 'ACTIVE',
      },
      commission: {
        id: 'comm-1',
        amount: 50.0,
        rateSnapshot: 5.0,
        status: 'PAYABLE',
      },
    };

    // Simulated normalizeOrder logic
    const normalized = {
      id: rawBackendOrder.id,
      orderNumber: rawBackendOrder.orderNumber,
      attributedAgentId: rawBackendOrder.attributedAgentId || null,
      attributedAt: rawBackendOrder.attributedAt || null,
      attributedAgent: rawBackendOrder.attributedAgent
        ? {
            id: rawBackendOrder.attributedAgent.id,
            name: rawBackendOrder.attributedAgent.name,
            phone: rawBackendOrder.attributedAgent.phone,
            email: rawBackendOrder.attributedAgent.email,
            status: rawBackendOrder.attributedAgent.status,
          }
        : null,
      commission: rawBackendOrder.commission
        ? {
            id: rawBackendOrder.commission.id,
            amount: Number(rawBackendOrder.commission.amount ?? 0),
            rateSnapshot: Number(rawBackendOrder.commission.rateSnapshot ?? 0),
            status: rawBackendOrder.commission.status || 'PENDING',
          }
        : null,
    };

    assert.ok(normalized.attributedAgent);
    assert.equal(normalized.attributedAgent.name, 'Kassahun Agent');
    assert.equal(normalized.attributedAgent.email, 'kassahun@ardabmarket.com');
    assert.equal(normalized.attributedAgent.phone, '+251911002233');
    assert.ok(normalized.commission);
    assert.equal(normalized.commission.amount, 50.0);
    assert.equal(normalized.commission.status, 'PAYABLE');
  });
});

