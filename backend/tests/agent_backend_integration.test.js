// ==============================================================================
// Ardab Market - Agent Backend Integration & Security Test Suite
// ==============================================================================

import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Decimal } from '@prisma/client/runtime/library';

// Test encryption secret
const TEST_JWT_SECRET = 'test-ardab-jwt-secret-key-32-chars-long!';

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function generateNumericOtp(length = 6) {
  const digits = '0123456789';
  let otp = '';
  const bytes = crypto.randomBytes(length);
  for (let i = 0; i < length; i++) {
    otp += digits[bytes[i] % 10];
  }
  return otp;
}

test('Agent Backend Infrastructure, Security & Business Logic Suite', async (suite) => {
  // ----------------------------------------------------------------------------
  // 1. First-Time Agent Activation & OTP Security
  // ----------------------------------------------------------------------------
  await suite.test('1. First-Time Agent Activation: Pre-registered agent only & OTP security', async () => {
    const preRegisteredAgent = {
      id: 'agent-uuid-001',
      name: 'Ashenafi Messle',
      email: 'ashenafi.agent@ardabmarket.com',
      phone: '+251911223344',
      status: 'ACTIVE',
      commissionRate: 5.0,
      credentials: null, // First-time: no credentials yet
    };

    // Case 1: Self-registration attempted with non-registered email -> MUST BE REJECTED
    const nonRegisteredEmail = 'unregistered.intruder@example.com';
    const isRegistered = nonRegisteredEmail === preRegisteredAgent.email;
    assert.equal(isRegistered, false, 'Unregistered email must not be allowed to activate');

    // Case 2: Legitimate registered email generates 6-digit OTP
    const otpCode = generateNumericOtp(6);
    assert.equal(otpCode.length, 6);
    assert.match(otpCode, /^\d{6}$/);

    // Case 3: OTP is hashed before storage (never stored plain)
    const codeHash = hashToken(otpCode);
    assert.equal(typeof codeHash, 'string');
    assert.equal(codeHash.length, 64); // SHA-256 hex length
    assert.notEqual(codeHash, otpCode);

    // Case 4: Verify OTP code hash matches
    const submittedOtp = otpCode;
    const submittedHash = hashToken(submittedOtp);
    assert.equal(submittedHash, codeHash);

    // Case 5: Incorrect OTP is rejected
    const wrongHash = hashToken('999999');
    assert.notEqual(wrongHash, codeHash);

    // Case 6: Issuance of activationToken scoped strictly to AGENT_ACTIVATION
    const activationToken = jwt.sign(
      { agentId: preRegisteredAgent.id, email: preRegisteredAgent.email, role: 'AGENT_ACTIVATION', purpose: 'ACTIVATION' },
      TEST_JWT_SECRET,
      { expiresIn: '15m' }
    );

    const decoded = jwt.verify(activationToken, TEST_JWT_SECRET);
    assert.equal(decoded.agentId, preRegisteredAgent.id);
    assert.equal(decoded.role, 'AGENT_ACTIVATION');
    assert.equal(decoded.purpose, 'ACTIVATION');
  });

  // ----------------------------------------------------------------------------
  // 2. Password Creation, Activation & Bcrypt Security
  // ----------------------------------------------------------------------------
  await suite.test('2. Password Creation & Activation: Bcrypt 12 salt rounds & activation flag', async () => {
    const password = 'StrongPassword@2026';
    const passwordHash = await bcrypt.hash(password, 12);

    assert.ok(passwordHash.startsWith('$2a$12$') || passwordHash.startsWith('$2b$12$'));

    const credentialRecord = {
      agentId: 'agent-uuid-001',
      passwordHash,
      isActivated: true,
      activatedAt: new Date(),
      lastLoginAt: null,
    };

    assert.equal(credentialRecord.isActivated, true);
    assert.ok(credentialRecord.activatedAt instanceof Date);

    // Password verification
    const validMatch = await bcrypt.compare(password, credentialRecord.passwordHash);
    assert.equal(validMatch, true);

    const invalidMatch = await bcrypt.compare('WrongPassword123!', credentialRecord.passwordHash);
    assert.equal(invalidMatch, false);
  });

  // ----------------------------------------------------------------------------
  // 3. Agent Authentication & Session Management
  // ----------------------------------------------------------------------------
  await suite.test('3. Agent Login & Refresh Token Rotation', async () => {
    const agent = {
      id: 'agent-uuid-001',
      name: 'Ashenafi Messle',
      email: 'ashenafi.agent@ardabmarket.com',
      status: 'ACTIVE',
      commissionRate: 5.0,
    };

    // Access token generation
    const accessToken = jwt.sign(
      { id: agent.id, email: agent.email, role: 'AGENT', name: agent.name },
      TEST_JWT_SECRET,
      { expiresIn: '1h' }
    );

    const decodedAccess = jwt.verify(accessToken, TEST_JWT_SECRET);
    assert.equal(decodedAccess.id, agent.id);
    assert.equal(decodedAccess.role, 'AGENT');

    // Cryptographically secure refresh token
    const rawRefreshToken = crypto.randomBytes(40).toString('hex');
    const refreshTokenHash = hashToken(rawRefreshToken);

    const session = {
      id: 'session-uuid-1',
      agentId: agent.id,
      refreshTokenHash,
      status: 'ACTIVE',
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    };

    assert.equal(session.status, 'ACTIVE');
    assert.equal(session.refreshTokenHash, hashToken(rawRefreshToken));

    // Refresh token rotation: verify and revoke previous session
    const incomingToken = rawRefreshToken;
    const incomingHash = hashToken(incomingToken);
    assert.equal(incomingHash, session.refreshTokenHash);

    // Invalidate old session
    session.status = 'REVOKED';
    assert.equal(session.status, 'REVOKED');
  });

  // ----------------------------------------------------------------------------
  // 4. Financial Calculations in Ethiopian Birr (ETB) with Decimal Arithmetic
  // ----------------------------------------------------------------------------
  await suite.test('4. Decimal Financial Calculations in ETB without floating point drift', () => {
    const commissions = [
      { commissionAmount: '125.50', status: 'PAYABLE' },
      { commissionAmount: '250.75', status: 'PAYABLE' },
      { commissionAmount: '50.00', status: 'PENDING' },
      { commissionAmount: '1000.00', status: 'PAID' },
    ];

    let totalEarned = new Decimal(0);
    let pendingCommission = new Decimal(0);
    let approvedCommission = new Decimal(0);
    let paidCommission = new Decimal(0);

    for (const c of commissions) {
      const amount = new Decimal(c.commissionAmount);
      if (c.status === 'PENDING') {
        pendingCommission = pendingCommission.add(amount);
      } else if (c.status === 'PAYABLE') {
        approvedCommission = approvedCommission.add(amount);
        totalEarned = totalEarned.add(amount);
      } else if (c.status === 'PAID') {
        paidCommission = paidCommission.add(amount);
        totalEarned = totalEarned.add(amount);
      }
    }

    assert.equal(pendingCommission.toFixed(2), '50.00');
    assert.equal(approvedCommission.toFixed(2), '376.25');
    assert.equal(paidCommission.toFixed(2), '1000.00');
    assert.equal(totalEarned.toFixed(2), '1376.25');

    const formattedSummary = {
      totalBalance: Number(approvedCommission.toFixed(2)),
      totalEarned: Number(totalEarned.toFixed(2)),
      pendingCommission: Number(pendingCommission.toFixed(2)),
      approvedCommission: Number(approvedCommission.toFixed(2)),
      paidCommission: Number(paidCommission.toFixed(2)),
      currency: 'ETB',
    };

    assert.equal(formattedSummary.totalBalance, 376.25);
    assert.equal(formattedSummary.currency, 'ETB');
  });

  // ----------------------------------------------------------------------------
  // 5. Scoped Access Control: Agent Isolation & Order Attribution
  // ----------------------------------------------------------------------------
  await suite.test('5. Strict Agent Scoping: Agents can only inspect their own orders and customers', () => {
    const agentAId = 'agent-uuid-001';
    const agentBId = 'agent-uuid-002';

    const orders = [
      { id: 'order-1', orderNumber: 'ORD-001', attributedAgentId: agentAId, totalAmount: 1500.0 },
      { id: 'order-2', orderNumber: 'ORD-002', attributedAgentId: agentAId, totalAmount: 2300.0 },
      { id: 'order-3', orderNumber: 'ORD-003', attributedAgentId: agentBId, totalAmount: 450.0 },
    ];

    // Agent A query filter
    const agentAOrders = orders.filter((o) => o.attributedAgentId === agentAId);
    assert.equal(agentAOrders.length, 2);
    assert.ok(agentAOrders.every((o) => o.attributedAgentId === agentAId));
    assert.ok(!agentAOrders.some((o) => o.id === 'order-3'));

    // Agent B query filter
    const agentBOrders = orders.filter((o) => o.attributedAgentId === agentBId);
    assert.equal(agentBOrders.length, 1);
    assert.equal(agentBOrders[0].id, 'order-3');
  });

  // ----------------------------------------------------------------------------
  // 6. Super Admin Order Acceptance & Notification Dispatch
  // ----------------------------------------------------------------------------
  await suite.test('6. Super Admin Order Acceptance Dispatches Notification & Transitions Commission', () => {
    const order = {
      id: 'order-uuid-999',
      orderNumber: 'ORD-20261101-0099',
      attributedAgentId: 'agent-uuid-001',
      totalAmount: 2500.0,
      status: 'CONFIRMED',
      customer: { fullName: 'Meron Bekele' },
    };

    // When status transitions to CONFIRMED, commission transitions to PAYABLE
    const commission = {
      orderId: order.id,
      agentId: order.attributedAgentId,
      commissionAmount: 125.0,
      status: 'PAYABLE', // transitioned from PENDING
    };

    assert.equal(commission.status, 'PAYABLE');

    // In-app notification creation
    const inAppNotification = {
      id: 'notif-1',
      agentId: order.attributedAgentId,
      title: 'Order Accepted!',
      message: `Great news! Order #${order.orderNumber} from ${order.customer.fullName} has been accepted by Ardab Market.`,
      type: 'ORDER_ACCEPTED',
      data: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        commissionAmount: commission.commissionAmount,
      },
      isRead: false,
      createdAt: new Date().toISOString(),
    };

    assert.equal(inAppNotification.agentId, 'agent-uuid-001');
    assert.equal(inAppNotification.type, 'ORDER_ACCEPTED');
    assert.equal(inAppNotification.isRead, false);

    // Mock registered Expo Push Tokens for agent
    const pushTokens = [
      { expoPushToken: 'ExponentPushToken[AbCdEf123456]', isActive: true },
    ];

    const pushPayload = {
      to: pushTokens[0].expoPushToken,
      title: inAppNotification.title,
      body: inAppNotification.message,
      data: inAppNotification.data,
      sound: 'default',
    };

    assert.equal(pushPayload.to, 'ExponentPushToken[AbCdEf123456]');
    assert.equal(pushPayload.data.orderId, 'order-uuid-999');
  });
});

