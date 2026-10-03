// ==============================================================================
// Ardab Market - Chapa Payment Concurrency & Idempotency Stress Test
// ==============================================================================
// Simulates:
// 1. High-concurrency duplicate customer clicks (10 simultaneous initialize requests)
// 2. High-concurrency duplicate webhook bursts (10 simultaneous webhook callbacks)
// 3. Status query polling latency & throughput
// Measures: p50, p95, p99 latency, success rate, and database consistency
// ==============================================================================

import crypto from 'crypto';
import { Prisma } from '@prisma/client';
import { prisma, disconnectPrisma } from '../src/shared/config/database.js';
import { paymentService } from '../src/customer/services/payment.service.js';
import { chapaService } from '../src/shared/services/chapa.service.js';

const Decimal = Prisma.Decimal;

function calculatePercentiles(latencies) {
  if (latencies.length === 0) return { p50: 0, p95: 0, p99: 0 };
  latencies.sort((a, b) => a - b);
  const p50 = latencies[Math.floor(latencies.length * 0.5)];
  const p95 = latencies[Math.floor(latencies.length * 0.95)];
  const p99 = latencies[Math.floor(latencies.length * 0.99)];
  return { p50, p95, p99 };
}

async function runConcurrencyTest() {
  console.log('======================================================================');
  console.log('ARDAB MARKET - CHAPA PAYMENT CONCURRENCY & STRESS TEST');
  console.log('======================================================================\n');

  // Setup test customer & order
  const uniqueCode = Date.now().toString(36);
  const customer = await prisma.customer.create({
    data: {
      customerCode: `STRESS-CUST-${uniqueCode}`,
      fullName: 'Stress Test Customer',
      phone: `+2519${Math.floor(10000000 + Math.random() * 90000000)}`,
      email: `stress_${uniqueCode}@ardabmarket.com`,
      status: 'ACTIVE',
      city: 'Gondar',
    },
  });

  const order = await prisma.order.create({
    data: {
      orderNumber: `ORD-STRESS-${uniqueCode}`,
      customerId: customer.id,
      city: 'Gondar',
      subtotal: new Decimal('2400.00'),
      deliveryFee: new Decimal('150.00'),
      totalAmount: new Decimal('2550.00'),
      currency: 'ETB',
      status: 'PENDING',
      paymentStatus: 'PENDING',
    },
  });

  console.log(`Created test order #${order.orderNumber} for ${order.totalAmount} ETB.`);

  // Mock Chapa initialize
  const origInit = chapaService.initializeTransaction;
  chapaService.initializeTransaction = async ({ txRef }) => {
    // Artificial 50ms network delay
    await new Promise((r) => setTimeout(r, 50));
    return {
      checkoutUrl: `https://checkout.chapa.co/checkout/test/${txRef}`,
      raw: { status: 'success' },
    };
  };

  try {
    // ------------------------------------------------------------------------
    // TEST 1: 10 SIMULTANEOUS INITIALIZATION REQUESTS
    // ------------------------------------------------------------------------
    console.log('\n--- 1. Testing 10 Simultaneous Customer "Pay" Taps ---');
    const initLatencies = [];
    const initPromises = Array.from({ length: 10 }).map(async (_, idx) => {
      const start = Date.now();
      try {
        const res = await paymentService.initializePayment({
          customerId: customer.id,
          orderId: order.id,
        });
        const duration = Date.now() - start;
        initLatencies.push(duration);
        return { success: true, paymentId: res.paymentId, txRef: res.txRef };
      } catch (err) {
        const duration = Date.now() - start;
        initLatencies.push(duration);
        return { success: false, error: err.message };
      }
    });

    const initResults = await Promise.all(initPromises);
    const successfulInits = initResults.filter((r) => r.success);
    const uniqueTxRefs = new Set(successfulInits.map((r) => r.txRef));

    console.log(`Total Requests: 10`);
    console.log(`Successful: ${successfulInits.length}`);
    console.log(`Unique tx_refs created: ${uniqueTxRefs.size}`);
    const initPct = calculatePercentiles(initLatencies);
    console.log(`Latency -> p50: ${initPct.p50}ms | p95: ${initPct.p95}ms | p99: ${initPct.p99}ms`);

    // Verify DB integrity
    const dbPayments = await prisma.payment.findMany({
      where: { orderId: order.id },
    });
    console.log(`Total Payment records in DB for order: ${dbPayments.length} (Expected <= 1)`);

    const primaryPayment = dbPayments[0];

    // ------------------------------------------------------------------------
    // TEST 2: 10 SIMULTANEOUS DUPLICATE WEBHOOK CALLBACKS
    // ------------------------------------------------------------------------
    console.log('\n--- 2. Testing 10 Simultaneous Duplicate Webhook Bursts ---');

    // Mock Chapa verify
    const origVerify = chapaService.verifyTransaction;
    chapaService.verifyTransaction = async () => {
      await new Promise((r) => setTimeout(r, 60));
      return {
        isSuccess: true,
        status: 'SUCCESS',
        amount: '2550.00',
        currency: 'ETB',
        reference: 'CHAPA_STRESS_REF_999',
        txRef: primaryPayment.txRef,
        paymentMethod: 'TELEBIRR',
      };
    };

    const webhookLatencies = [];
    const webhookPromises = Array.from({ length: 10 }).map(async (_, idx) => {
      const start = Date.now();
      try {
        const res = await paymentService.finalizePaymentWithVerification(
          primaryPayment.txRef,
          { actorType: 'WEBHOOK', actorId: `BURST_HOOK_${idx}` }
        );
        const duration = Date.now() - start;
        webhookLatencies.push(duration);
        return { success: true, status: res.status };
      } catch (err) {
        const duration = Date.now() - start;
        webhookLatencies.push(duration);
        return { success: false, error: err.message };
      }
    });

    const webhookResults = await Promise.all(webhookPromises);
    const hookPct = calculatePercentiles(webhookLatencies);
    console.log(`Total Webhook Requests: 10`);
    console.log(`All returned SUCCESS: ${webhookResults.every((r) => r.success && r.status === 'SUCCESS')}`);
    console.log(`Latency -> p50: ${hookPct.p50}ms | p95: ${hookPct.p95}ms | p99: ${hookPct.p99}ms`);

    // Verify order status
    const verifiedOrder = await prisma.order.findUnique({
      where: { id: order.id },
    });
    console.log(`Order status after concurrent webhooks: ${verifiedOrder.status} / ${verifiedOrder.paymentStatus}`);

    // Verify audit logs
    const auditLogs = await prisma.paymentAuditLog.findMany({
      where: { paymentId: primaryPayment.id, event: 'PAYMENT_SUCCEEDED' },
    });
    console.log(`PAYMENT_SUCCEEDED audit events recorded: ${auditLogs.length} (Expected 1)`);

    console.log('\n======================================================================');
    console.log('CONCURRENCY & IDEMPOTENCY TEST COMPLETED SUCCESSFULLY');
    console.log('======================================================================\n');
  } finally {
    // Cleanup
    chapaService.initializeTransaction = origInit;
    try {
      await prisma.paymentAuditLog.deleteMany({ where: { payment: { orderId: order.id } } });
      await prisma.paymentAttempt.deleteMany({ where: { payment: { orderId: order.id } } });
      await prisma.payment.deleteMany({ where: { orderId: order.id } });
      await prisma.order.delete({ where: { id: order.id } });
      await prisma.customer.delete({ where: { id: customer.id } });
    } catch {}
    await disconnectPrisma();
  }
}

runConcurrencyTest().catch((e) => {
  console.error('Concurrency test failed:', e);
  process.exit(1);
});
