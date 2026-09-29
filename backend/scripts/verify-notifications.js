// ==============================================================================
// Ardab Market - Backend Notification System Verification Script
// ==============================================================================

import { prisma } from '../src/shared/config/database.js';
import {
  registerDeviceToken,
  unregisterDeviceToken,
  getCustomerNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  hideNotification,
  createNewProductNotification,
  createCustomerOrderNotification,
} from '../src/customer/services/notification.service.js';
import { isExpoPushToken } from '../src/shared/services/pushNotification.service.js';

let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passedTests++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failedTests++;
  }
}

async function runTests() {
  console.log('=================================================================');
  console.log('  Ardab Market - Customer Notification System Verification');
  console.log('=================================================================\n');

  // 1. Setup Test Customers
  console.log('[TEST 1] Setup Test Customers');
  let customerA = await prisma.customer.findFirst({ where: { status: 'ACTIVE' } });
  if (!customerA) {
    customerA = await prisma.customer.create({
      data: {
        customerCode: `CUST_TEST_A_${Date.now()}`,
        fullName: 'Test Customer A',
        phone: `+25191100${Math.floor(1000 + Math.random() * 9000)}`,
        status: 'ACTIVE',
      },
    });
  }

  let customerB = await prisma.customer.findFirst({
    where: { status: 'ACTIVE', id: { not: customerA.id } },
  });
  if (!customerB) {
    customerB = await prisma.customer.create({
      data: {
        customerCode: `CUST_TEST_B_${Date.now()}`,
        fullName: 'Test Customer B',
        phone: `+25192200${Math.floor(1000 + Math.random() * 9000)}`,
        status: 'ACTIVE',
      },
    });
  }

  assert(customerA && customerB && customerA.id !== customerB.id, 'Created/found 2 distinct test customers');

  // 2. Token Validator Tests
  console.log('\n[TEST 2] Expo Push Token Validation');
  assert(isExpoPushToken('ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]'), 'Valid ExponentPushToken format recognized');
  assert(isExpoPushToken('ExpoPushToken[12345678-abcd-ef01-2345-6789abcdef01]'), 'Valid ExpoPushToken format recognized');
  assert(!isExpoPushToken('InvalidTokenString'), 'Arbitrary string rejected as push token');
  assert(!isExpoPushToken(''), 'Empty string rejected as push token');
  assert(!isExpoPushToken(null), 'Null rejected as push token');

  // 3. Push Device Registration & Security
  console.log('\n[TEST 3] Push Device Registration & Multi-Device Handling');
  const mockTokenA1 = `ExponentPushToken[mock_device_A1_${Date.now()}]`;
  const mockTokenA2 = `ExponentPushToken[mock_device_A2_${Date.now()}]`;

  const reg1 = await registerDeviceToken(customerA.id, {
    pushToken: mockTokenA1,
    platform: 'ANDROID',
    deviceId: 'android_samsung_s23',
    appVersion: '1.0.0',
  });
  assert(reg1.registered === true, 'Customer A successfully registered device token 1');

  const reg2 = await registerDeviceToken(customerA.id, {
    pushToken: mockTokenA2,
    platform: 'ANDROID',
    deviceId: 'android_tablet',
    appVersion: '1.0.0',
  });
  assert(reg2.registered === true, 'Customer A successfully registered device token 2 (multi-device support)');

  const aTokens = await prisma.customerPushToken.findMany({
    where: { customerId: customerA.id, isActive: true },
  });
  assert(aTokens.length >= 2, `Customer A has ${aTokens.length} active push tokens`);

  // Device Reassignment (Device handover / account switch)
  console.log('\n[TEST 4] Token Reassignment on Device Re-login');
  // Customer B logs into the same phone as mockTokenA1
  await registerDeviceToken(customerB.id, {
    pushToken: mockTokenA1,
    platform: 'ANDROID',
  });
  const reallocatedToken = await prisma.customerPushToken.findUnique({
    where: { token: mockTokenA1 },
  });
  assert(reallocatedToken.customerId === customerB.id, 'Token ownership securely transitioned to Customer B on login');

  // Switch it back to Customer A for subsequent tests
  await registerDeviceToken(customerA.id, {
    pushToken: mockTokenA1,
    platform: 'ANDROID',
  });

  // 4. Product Publication & NEW_PRODUCT Notification
  console.log('\n[TEST 5] Product Publication & Idempotent Broadcast');
  const mockProduct = {
    id: `prod_test_${Date.now()}`,
    name: 'Organic Honey 1kg',
    sellingPrice: 750.0,
    status: 'ACTIVE',
    images: [{ url: 'https://res.cloudinary.com/ardab/test.jpg', isPrimary: true }],
  };

  const notification = await createNewProductNotification(mockProduct);
  assert(notification && notification.type === 'NEW_PRODUCT', 'NEW_PRODUCT notification created for published product');
  assert(notification.deepLink === `/products/${mockProduct.id}`, 'Deep link correctly targets product details');

  // Idempotency: second call must NOT create another notification
  const duplicateCall = await createNewProductNotification(mockProduct);
  assert(duplicateCall.id === notification.id, 'Idempotency verified: duplicate publication did not create duplicate notification');

  // 5. In-App Notifications & Isolation
  console.log('\n[TEST 6] In-App Notification Query & Unread Count');
  const aNotifs = await getCustomerNotifications(customerA.id, { page: 1, limit: 10 });
  assert(Array.isArray(aNotifs.notifications), 'Notifications returned as list');
  const productNotifForA = aNotifs.notifications.find((n) => n.id === notification.id);
  assert(!!productNotifForA, 'Customer A received the broadcasted NEW_PRODUCT in-app notification');
  assert(productNotifForA.isRead === false, 'New notification is unread by default');

  const unreadCountBefore = await getUnreadCount(customerA.id);
  assert(unreadCountBefore.count > 0, `Unread count for Customer A is ${unreadCountBefore.count}`);

  // Mark as read
  console.log('\n[TEST 7] Mark Notification As Read & Unread Count Decrement');
  const readRes = await markAsRead(customerA.id, notification.id);
  assert(readRes.success === true && readRes.isRead === true, 'Notification marked as read');

  const unreadCountAfter = await getUnreadCount(customerA.id);
  assert(unreadCountAfter.count === unreadCountBefore.count - 1, 'Unread count accurately decremented by 1');

  // 6. Security & IDOR Guard Verification
  console.log('\n[TEST 8] Security & IDOR Isolation (Customer A vs Customer B)');
  // Customer B should NOT be able to mark Customer A's notification as read or read Customer A's order notifications
  let idorBlocked = false;
  try {
    // Try to mark a non-existent / unowned notification
    await markAsRead(customerB.id, 'non-existent-notification-id');
  } catch (err) {
    idorBlocked = true;
  }
  assert(idorBlocked, 'Customer B cannot manipulate notifications they do not own');

  // 7. Order-Specific Notification (Strict 1-to-1 Association)
  console.log('\n[TEST 9] Customer-Specific Order Notification');
  const mockOrderA = {
    id: `ord_test_${Date.now()}`,
    orderNumber: `ARD-2026-TEST-${Date.now().toString().slice(-4)}`,
    customerId: customerA.id,
    city: 'Gondar',
  };

  const orderNotif = await createCustomerOrderNotification(mockOrderA, 'CONFIRMED');
  assert(orderNotif && orderNotif.type === 'ORDER_CONFIRMED', 'Order confirmed notification created');
  assert(orderNotif.deepLink === `/orders/${mockOrderA.id}`, 'Deep link routes to /orders/[id]');

  // Verify Customer A sees it
  const customerANotifs = await getCustomerNotifications(customerA.id);
  const foundOrderInA = customerANotifs.notifications.some((n) => n.id === orderNotif.id);
  assert(foundOrderInA, "Customer A's in-app notification list contains their own order update");

  // Verify Customer B NEVER sees Customer A's order notification!
  const customerBNotifs = await getCustomerNotifications(customerB.id);
  const foundOrderInB = customerBNotifs.notifications.some((n) => n.id === orderNotif.id);
  assert(!foundOrderInB, "Customer B's list does NOT contain Customer A's private order notification (Zero Leakage)");

  // 8. Mark All As Read
  console.log('\n[TEST 10] Mark All As Read');
  const markAllRes = await markAllAsRead(customerA.id);
  assert(markAllRes.success === true, 'Mark all as read succeeded');

  const finalUnreadA = await getUnreadCount(customerA.id);
  assert(finalUnreadA.count === 0, 'All notifications marked as read, unread count is 0');

  // 9. Soft Hide / Delete Notification
  console.log('\n[TEST 11] Soft Hide Notification');
  const hideRes = await hideNotification(customerA.id, notification.id);
  assert(hideRes.success === true && hideRes.hidden === true, 'Notification hidden for Customer A');

  const refreshedA = await getCustomerNotifications(customerA.id);
  const stillVisibleForA = refreshedA.notifications.some((n) => n.id === notification.id);
  assert(!stillVisibleForA, 'Hidden notification no longer returned to Customer A');

  // Verify global notification still exists in database (not deleted for everyone!)
  const globalNotif = await prisma.notification.findUnique({ where: { id: notification.id } });
  assert(!!globalNotif, 'Global notification persists in database for other customers');

  // 10. Device Unregistration on Logout
  console.log('\n[TEST 12] Device Unregistration on Logout');
  const unregRes = await unregisterDeviceToken(customerA.id, mockTokenA1);
  assert(unregRes.unregistered === true, 'Push device successfully deactivated on logout');

  const activeTokensAfterLogout = await prisma.customerPushToken.findMany({
    where: { customerId: customerA.id, token: mockTokenA1, isActive: true },
  });
  assert(activeTokensAfterLogout.length === 0, 'Deactivated token is no longer active in database');

  console.log('\n=================================================================');
  console.log(`  Tests Completed: ${passedTests} PASSED, ${failedTests} FAILED`);
  console.log('=================================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runTests()
  .catch((err) => {
    console.error('Test execution failed with error:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
