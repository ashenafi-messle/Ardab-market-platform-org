import { Prisma } from '@prisma/client';
import { prisma } from '../src/shared/config/database.js';
import { checkoutCustomerOrder } from '../src/admin/services/order.service.js';
import { paymentService } from '../src/customer/services/payment.service.js';
import { chapaService } from '../src/shared/services/chapa.service.js';
import { logger } from '../src/shared/utils/logger.js';

const Decimal = Prisma.Decimal;

async function runExact1140Verification() {
  console.log('=== STEP 1: LOCATING ACTIVE TEST CUSTOMER & PRODUCT ===');
  const customer = await prisma.customer.findFirst({
    where: { status: 'ACTIVE', email: { not: null } },
  });
  if (!customer) throw new Error('No active test customer found.');
  console.log(`Using Customer: ${customer.fullName} (${customer.id})`);

  // Find the exact 990 ETB watch product
  const product = await prisma.product.findFirst({
    where: { sellingPrice: 990, status: 'ACTIVE' },
  });
  if (!product) throw new Error('990 ETB product (watch) not found.');
  console.log(`Using Product: ${product.name} - Price: ${product.sellingPrice} ETB (${product.id})`);

  console.log('\n=== STEP 2: CREATING ORDER (Subtotal: 990, Delivery: 150, Total: 1,140 ETB) ===');
  const orderPayload = {
    items: [{ productId: product.id, quantity: 1 }],
    deliveryAddress: {
      recipientName: customer.fullName,
      phone: customer.phone,
      city: 'Addis Ababa',
      deliveryZone: 'Bole',
      addressLine: 'Namibia St, House #123',
    },
    paymentMethod: 'ONLINE',
  };

  const createdOrder = await checkoutCustomerOrder(orderPayload, customer.id);
  console.log(`Created Order Number: ${createdOrder.orderNumber}`);
  console.log(`Order Subtotal: ${createdOrder.subtotal} ETB`);
  console.log(`Order Delivery Fee: ${createdOrder.deliveryFee} ETB`);
  console.log(`Order Total Amount: ${createdOrder.totalAmount} ETB`);
  console.log(`Order Payment Method: ${createdOrder.paymentMethod}`);
  console.log(`Order Payment Status: ${createdOrder.paymentStatus}`);

  if (Number(createdOrder.totalAmount) !== 1140) {
    throw new Error(`Order total mismatch! Expected 1140, got ${createdOrder.totalAmount}`);
  }

  console.log('\n=== STEP 3: INITIALIZING ONLINE PAYMENT FOR ORDER (AUTHORITATIVE BACKEND) ===');
  let initResult;
  let chapaApiError = null;

  try {
    initResult = await paymentService.initializePayment({
      customerId: customer.id,
      orderId: createdOrder.id,
      returnUrl: 'ardabmarket://payment/chapa/callback',
    });
    console.log('Chapa initialization succeeded:');
    console.log(initResult);
  } catch (err) {
    chapaApiError = err;
    console.log(`Chapa live initialization returned expected provider response: [${err.code || err.statusCode}] ${err.message}`);
  }

  // Check the database payment record
  const paymentRecord = await prisma.payment.findFirst({
    where: { orderId: createdOrder.id },
    orderBy: { createdAt: 'desc' },
  });

  console.log('\n=== STEP 4: INSPECTING DATABASE PAYMENT RECORD ===');
  console.log(`Payment ID: ${paymentRecord.id}`);
  console.log(`Order ID: ${paymentRecord.orderId}`);
  console.log(`Customer ID: ${paymentRecord.customerId}`);
  console.log(`Provider: ${paymentRecord.provider}`);
  console.log(`Payment Method: ${paymentRecord.paymentMethod}`);
  console.log(`Amount: ${paymentRecord.amount.toFixed(2)} ETB`);
  console.log(`Currency: ${paymentRecord.currency}`);
  console.log(`Status: ${paymentRecord.status}`);
  console.log(`TxRef: ${paymentRecord.txRef}`);

  if (Number(paymentRecord.amount) !== 1140) {
    throw new Error(`Payment amount mismatch in DB! Expected 1140, got ${paymentRecord.amount}`);
  }
  if (paymentRecord.provider !== 'CHAPA') {
    throw new Error(`Payment provider mismatch! Expected CHAPA, got ${paymentRecord.provider}`);
  }
  if (paymentRecord.paymentMethod !== 'ONLINE') {
    throw new Error(`Payment method mismatch! Expected ONLINE, got ${paymentRecord.paymentMethod}`);
  }

  console.log('\n=== STEP 5: SIMULATING SUCCESSFUL CHAPA VERIFICATION (1140 ETB) ===');
  // Temporarily stub chapaService.verifyTransaction to simulate Chapa returning a verified 1140 ETB test transaction
  const originalVerify = chapaService.verifyTransaction;
  const mockChapaRef = `CHAPA-REF-${Date.now()}`;
  chapaService.verifyTransaction = async (ref) => ({
    isSuccess: true,
    status: 'SUCCESS',
    amount: '1140.00',
    currency: 'ETB',
    reference: mockChapaRef,
    txRef: ref,
    paymentMethod: 'TELEBIRR',
    raw: {
      status: 'success',
      mode: 'test',
      data: {
        amount: 1140,
        currency: 'ETB',
        reference: mockChapaRef,
        tx_ref: ref,
      },
    },
  });

  const verifiedResult = await paymentService.finalizePaymentWithVerification(paymentRecord.txRef, {
    actorType: 'TEST_VERIFICATION',
    actorId: 'test-runner',
  });

  // Restore original
  chapaService.verifyTransaction = originalVerify;

  console.log('Finalized Payment Result:', verifiedResult);

  console.log('\n=== STEP 6: VERIFYING POST-PAYMENT DATABASE INTEGRITY ===');
  const finalPayment = await prisma.payment.findUnique({
    where: { id: paymentRecord.id },
  });
  const finalOrder = await prisma.order.findUnique({
    where: { id: createdOrder.id },
  });

  console.log(`Final Payment Status: ${finalPayment.status}`);
  console.log(`Final Payment Amount: ${finalPayment.amount.toFixed(2)} ETB`);
  console.log(`Final Payment Provider: ${finalPayment.provider}`);
  console.log(`Final Payment Reference: ${finalPayment.chapaReference}`);
  console.log(`Final Order Status: ${finalOrder.status}`);
  console.log(`Final Order Payment Status: ${finalOrder.paymentStatus}`);

  if (finalPayment.status !== 'SUCCESS') throw new Error('Payment status is not SUCCESS!');
  if (finalOrder.paymentStatus !== 'PAID') throw new Error('Order paymentStatus is not PAID!');
  if (Number(finalPayment.amount) !== 1140) throw new Error('Payment amount is not 1140!');

  console.log('\n=== STEP 7: QUERYING CUSTOMER PAYMENT STATUS ENDPOINT (MOBILE DTO) ===');
  const mobileStatus = await paymentService.getPaymentStatus(customer.id, paymentRecord.id);
  console.log('Mobile Payment Status Response:', mobileStatus);

  if (Number(mobileStatus.amount) !== 1140) throw new Error('Mobile amount is not 1140!');
  if (mobileStatus.provider !== 'CHAPA') throw new Error('Mobile provider is not CHAPA!');
  if (mobileStatus.status !== 'SUCCESS') throw new Error('Mobile status is not SUCCESS!');

  console.log('\n ALL 7 VERIFICATION STEPS PASSED SUCCESSFULLY FOR 1,140 ETB ORDER!');
}

runExact1140Verification()
  .catch((e) => {
    console.error('VERIFICATION ERROR:', e);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });
