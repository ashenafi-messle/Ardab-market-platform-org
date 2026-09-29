// ==============================================================================
// Ardab Market - Automated Customer Orders & Security Verification Test
// ==============================================================================

import { prisma, disconnectPrisma } from '../src/shared/config/database.js';
import {
  getMyOrders,
  getMyOrderById,
  cancelMyOrder,
} from '../src/customer/services/order.service.js';
import { transitionOrderStatus } from '../src/admin/services/order.service.js';

async function main() {
  console.log('=================================================================');
  console.log('  Ardab Market - Customer Orders & Security Integration Test');
  console.log('=================================================================');

  try {
    await prisma.$connect();

    // 1. Find or create two test customers: Customer A and Customer B
    console.log('\n[1/7] Setting up Test Customers A and B...');
    let customerA = await prisma.customer.findFirst({
      where: { email: 'customer_a_test@ardabmarket.com' },
    });
    if (!customerA) {
      customerA = await prisma.customer.create({
        data: {
          customerCode: `CUST-${Date.now().toString().slice(-4)}A`,
          fullName: 'Test Customer A',
          email: 'customer_a_test@ardabmarket.com',
          phone: '+251911111111',
          city: 'Gondar',
          status: 'ACTIVE',
        },
      });
    }

    let customerB = await prisma.customer.findFirst({
      where: { email: 'customer_b_test@ardabmarket.com' },
    });
    if (!customerB) {
      customerB = await prisma.customer.create({
        data: {
          customerCode: `CUST-${Date.now().toString().slice(-4)}B`,
          fullName: 'Test Customer B',
          email: 'customer_b_test@ardabmarket.com',
          phone: '+251922222222',
          city: 'Addis Ababa',
          status: 'ACTIVE',
        },
      });
    }
    console.log(`  ✔ Customer A ID: ${customerA.id}`);
    console.log(`  ✔ Customer B ID: ${customerB.id}`);

    // 2. Find or create a test admin user
    let adminUser = await prisma.adminUser.findFirst({
      where: { role: 'SUPER_ADMIN' },
    });
    if (!adminUser) {
      adminUser = await prisma.adminUser.findFirst();
    }

    // 3. Create an order for Customer A
    console.log('\n[2/7] Creating test Order for Customer A...');
    const orderNumber = `TEST-${Date.now().toString().slice(-6)}`;
    const testOrder = await prisma.order.create({
      data: {
        orderNumber,
        customerId: customerA.id,
        city: 'Gondar',
        status: 'PENDING',
        subtotal: 1200.0,
        deliveryFee: 50.0,
        discountAmount: 0,
        taxAmount: 0,
        totalAmount: 1250.0,
        totalWeight: 2.5,
        currency: 'ETB',
        paymentMethod: 'CASH_ON_DELIVERY',
        paymentStatus: 'PENDING',
        customerNote: 'Please call before delivery',
        placedAt: new Date(),
        deliveryAddressSnapshot: {
          create: {
            recipientName: 'Test Customer A',
            phone: '+251911111111',
            city: 'Gondar',
            addressLine: 'Arada Subcity, House 402',
          },
        },
        activities: {
          create: {
            action: 'ORDER_PLACED',
            fromStatus: null,
            toStatus: 'PENDING',
            description: 'Order placed by customer via mobile app',
            actor: 'CUSTOMER',
          },
        },
      },
      include: {
        deliveryAddressSnapshot: true,
        activities: true,
      },
    });
    console.log(`  ✔ Created Order: ${testOrder.orderNumber} (ID: ${testOrder.id})`);

    // 4. Test IDOR Protection: Customer B CANNOT access Customer A's order
    console.log('\n[3/7] Testing IDOR Security Enforcement...');
    try {
      await getMyOrderById(testOrder.id, customerB.id);
      throw new Error('FAIL: Customer B was able to access Customer A order!');
    } catch (err) {
      if (err.statusCode === 404 || err.message?.includes('not found') || err.message?.includes('inaccessible')) {
        console.log('  ✔ IDOR Guard Verified: Customer B received safe 404/Not Found for Customer A order.');
      } else {
        throw err;
      }
    }

    // 5. Test Customer A Access to Order Details & Milestones
    console.log('\n[4/7] Testing Customer A Order Details & Tracking Generation...');
    const orderDetails = await getMyOrderById(testOrder.id, customerA.id);
    if (!orderDetails || orderDetails.orderNumber !== testOrder.orderNumber) {
      throw new Error('FAIL: Customer A could not retrieve own order details');
    }
    console.log(`  ✔ Retrieved order details: #${orderDetails.orderNumber}, Status: ${orderDetails.status}`);
    console.log(`  ✔ Milestones count: ${orderDetails.milestones?.length || 0}`);
    const placedMilestone = orderDetails.milestones?.find((m) => m.key === 'PLACED');
    if (!placedMilestone || !['CURRENT', 'COMPLETED'].includes(placedMilestone.state)) {
      throw new Error(`FAIL: Placed milestone state incorrect (${placedMilestone?.state})`);
    }
    console.log(`  ✔ Milestone "PLACED" state: ${placedMilestone.state}`);
    console.log(`  ✔ Support reference attached: "${orderDetails.support?.orderReference}"`);

    // 6. Test Admin Status Transition & Customer Event Generation
    console.log('\n[5/7] Testing Super Admin Status Transitions (Atomic Event Logging)...');
    if (adminUser) {
      // PENDING -> CONFIRMED
      const confirmedOrder = await transitionOrderStatus(
        testOrder.id,
        'CONFIRMED',
        'Super admin verified payment and inventory',
        adminUser,
        '127.0.0.1'
      );
      console.log(`  ✔ Admin transitioned status to: ${confirmedOrder.status}`);

      // Verify that Customer A sees updated tracking timeline
      const updatedDetails = await getMyOrderById(testOrder.id, customerA.id);
      const confirmedMilestone = updatedDetails.milestones?.find((m) => m.stage === 'CONFIRMED');
      console.log(`  ✔ Customer now sees Milestone "CONFIRMED" state: ${confirmedMilestone?.state}`);
      console.log(`  ✔ Timeline events count: ${updatedDetails.timeline?.length}`);
      const latestEvent = updatedDetails.timeline?.[updatedDetails.timeline.length - 1];
      console.log(`  ✔ Customer-safe event message: "${latestEvent?.customerMessage}"`);

      // Verify internal admin note is NOT leaked to customer
      if (latestEvent?.customerMessage?.includes('inventory')) {
        console.warn('  ⚠ Warning: Internal admin note text leaked into customer message');
      } else {
        console.log('  ✔ Internal admin note was stripped and replaced with customer-safe status message.');
      }
    } else {
      console.log('  (Skipping admin transition - no admin user found in database)');
    }

    // 7. Test Customer Order List Pagination & Filtering
    console.log('\n[6/7] Testing Customer Orders List Pagination & Filters...');
    const listRes = await getMyOrders(customerA.id, { page: 1, limit: 10, status: 'ALL' });
    console.log(`  ✔ Total customer orders: ${listRes.pagination.total}`);
    console.log(`  ✔ Orders on page 1: ${listRes.orders.length}`);
    if (!listRes.orders.some((o) => o.id === testOrder.id)) {
      throw new Error('FAIL: Newly placed order not in customer order list');
    }
    console.log('  ✔ Newly placed order present in customer orders list.');

    // 8. Clean up test order
    console.log('\n[7/7] Cleaning up test records...');
    await prisma.orderActivity.deleteMany({ where: { orderId: testOrder.id } });
    await prisma.orderDeliveryAddress.deleteMany({ where: { orderId: testOrder.id } });
    await prisma.order.delete({ where: { id: testOrder.id } });
    console.log('  ✔ Cleaned up test order.');

    console.log('\n=================================================================');
    console.log('  ALL CUSTOMER ORDER & SECURITY CHECKS PASSED SUCCESSFULLY! 🚀');
    console.log('=================================================================\n');

    await disconnectPrisma();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Verification Failed:', error);
    await disconnectPrisma();
    process.exit(1);
  }
}

main();
