// ==============================================================================
// Ardab Market - Customers Module Realistic Demonstration Seed Script
// ==============================================================================

import { prisma } from '../src/shared/config/database.js';
import { generateNextCustomerCode } from '../src/admin/services/customerCode.service.js';

async function seedCustomers() {
  console.log('Seeding realistic customer profiles into Neon PostgreSQL...');

  const customerData = [
    {
      fullName: 'Almaz Tadesse',
      phone: '+251911448821',
      email: 'almaz.tadesse@ardabmarket.com',
      city: 'Gondar',
      deliveryZone: 'Arada Central',
      status: 'ACTIVE',
      verificationStatus: 'VERIFIED',
      orders: [
        {
          orderNumber: 'ORD-GD-1001',
          city: 'Gondar',
          status: 'DELIVERED',
          subtotal: 18500,
          deliveryFee: 200,
          totalAmount: 18700,
          paymentMethod: 'TELEBIRR',
          paymentStatus: 'PAID',
        },
        {
          orderNumber: 'ORD-GD-1002',
          city: 'Gondar',
          status: 'DELIVERED',
          subtotal: 35000,
          deliveryFee: 300,
          totalAmount: 35300,
          paymentMethod: 'CBE_BIRR',
          paymentStatus: 'PAID',
        },
        {
          orderNumber: 'ORD-GD-1003',
          city: 'Gondar',
          status: 'DELIVERED',
          subtotal: 30000,
          deliveryFee: 500,
          totalAmount: 30500,
          paymentMethod: 'TELEBIRR',
          paymentStatus: 'PAID',
        },
      ],
      scores: [
        { type: 'ACCOUNT_REGISTRATION', points: 50, source: 'LOYALTY' },
        { type: 'ORDER_COMPLETED', points: 30, source: 'ORDER' },
        { type: 'ORDER_COMPLETED', points: 50, source: 'ORDER' },
        { type: 'ORDER_COMPLETED', points: 40, source: 'ORDER' },
        { type: 'REVIEW_SUBMITTED', points: 20, source: 'REVIEW' },
      ],
      addresses: [
        {
          label: 'Home',
          recipientName: 'Almaz Tadesse',
          phone: '+251911448821',
          city: 'Gondar',
          deliveryZone: 'Arada Central',
          addressLine: 'Near Fasil Ghebbi, House #204',
          isDefault: true,
        },
        {
          label: 'Office',
          recipientName: 'Almaz Tadesse',
          phone: '+251911448821',
          city: 'Gondar',
          deliveryZone: 'Maraki Corridor',
          addressLine: 'Commercial Bank Tower, 4th Floor',
          isDefault: false,
        },
      ],
      activities: [
        { action: 'CUSTOMER_REGISTERED', description: 'Customer registered account via mobile checkout', actor: 'Customer' },
        { action: 'ORDER_DELIVERED', description: 'Order ORD-GD-1003 successfully delivered by Ardab Fleet', actor: 'System' },
        { action: 'REVIEW_SUBMITTED', description: 'Customer submitted 5-star rating for Magna White Teff', actor: 'Customer' },
      ],
    },
    {
      fullName: 'Solomon Mengistu',
      phone: '+251923341109',
      email: 'solomon.m@ardabmarket.com',
      city: 'Bahir Dar',
      deliveryZone: 'Kebele 04 Lakefront',
      status: 'ACTIVE',
      verificationStatus: 'VERIFIED',
      orders: [
        {
          orderNumber: 'ORD-BD-2001',
          city: 'Bahir Dar',
          status: 'DELIVERED',
          subtotal: 12400,
          deliveryFee: 150,
          totalAmount: 12550,
          paymentMethod: 'TELEBIRR',
          paymentStatus: 'PAID',
        },
      ],
      scores: [
        { type: 'ACCOUNT_REGISTRATION', points: 50, source: 'LOYALTY' },
        { type: 'ORDER_COMPLETED', points: 20, source: 'ORDER' },
      ],
      addresses: [
        {
          label: 'Home',
          recipientName: 'Solomon Mengistu',
          phone: '+251923341109',
          city: 'Bahir Dar',
          deliveryZone: 'Kebele 04 Lakefront',
          addressLine: 'Bole Road, Near Palm Palace Hotel #12',
          isDefault: true,
        },
      ],
      activities: [
        { action: 'CUSTOMER_REGISTERED', description: 'Customer registered account via mobile platform', actor: 'Customer' },
        { action: 'ORDER_PLACED', description: 'Order ORD-BD-2001 placed for Simien Highlands Butter', actor: 'Customer' },
      ],
    },
    {
      fullName: 'Hiwot Assefa',
      phone: '+251918890012',
      email: 'hiwot.assefa@ardabmarket.com',
      city: 'Addis Ababa',
      deliveryZone: 'Bole Commercial Hub',
      status: 'ACTIVE',
      verificationStatus: 'PENDING',
      orders: [],
      scores: [
        { type: 'ACCOUNT_REGISTRATION', points: 50, source: 'LOYALTY' },
      ],
      addresses: [
        {
          label: 'Residence',
          recipientName: 'Hiwot Assefa',
          phone: '+251918890012',
          city: 'Addis Ababa',
          deliveryZone: 'Bole Commercial Hub',
          addressLine: 'Atlas Area, House 450, Bole Sub-City',
          isDefault: true,
        },
      ],
      activities: [
        { action: 'CUSTOMER_REGISTERED', description: 'New customer account created', actor: 'Customer' },
      ],
    },
    {
      fullName: 'Kassahun Bekele',
      phone: '+251934567890',
      email: 'kassahun.b@ardabmarket.com',
      city: 'Gondar',
      deliveryZone: 'Maraki Campus Zone',
      status: 'SUSPENDED',
      verificationStatus: 'PENDING',
      orders: [
        {
          orderNumber: 'ORD-GD-3001',
          city: 'Gondar',
          status: 'CANCELLED',
          subtotal: 8000,
          deliveryFee: 200,
          totalAmount: 8200,
          paymentMethod: 'CASH_ON_DELIVERY',
          paymentStatus: 'FAILED',
        },
      ],
      scores: [
        { type: 'ACCOUNT_REGISTRATION', points: 50, source: 'LOYALTY' },
        { type: 'ORDER_CANCELLED', points: -15, source: 'PENALTY' },
      ],
      addresses: [
        {
          label: 'Apartment',
          recipientName: 'Kassahun Bekele',
          phone: '+251934567890',
          city: 'Gondar',
          deliveryZone: 'Maraki Campus Zone',
          addressLine: 'University Main Gate, Row #12',
          isDefault: true,
        },
      ],
      activities: [
        { action: 'CUSTOMER_REGISTERED', description: 'Customer registered account', actor: 'Customer' },
        { action: 'STATUS_CHANGED', description: 'Account suspended by Super Admin due to non-delivery verification', actor: 'Super Admin' },
      ],
    },
  ];

  for (const item of customerData) {
    const existing = await prisma.customer.findFirst({
      where: { phone: item.phone },
    });

    if (existing) {
      console.log(`Customer ${item.fullName} (${item.phone}) already exists. Skipping.`);
      continue;
    }

    const customerCode = await generateNextCustomerCode(prisma);

    const customer = await prisma.customer.create({
      data: {
        customerCode,
        fullName: item.fullName,
        phone: item.phone,
        email: item.email,
        city: item.city,
        deliveryZone: item.deliveryZone,
        status: item.status,
        verificationStatus: item.verificationStatus,
        lastActivityAt: new Date(),
      },
    });

    console.log(`Created customer: ${customer.fullName} [${customer.customerCode}]`);

    // Create Addresses
    for (const addr of item.addresses) {
      await prisma.customerAddress.create({
        data: {
          ...addr,
          customerId: customer.id,
        },
      });
    }

    // Create Orders
    for (const order of item.orders) {
      await prisma.order.create({
        data: {
          ...order,
          customerId: customer.id,
        },
      });
    }

    // Create Score Events
    for (const score of item.scores) {
      await prisma.customerScoreEvent.create({
        data: {
          ...score,
          customerId: customer.id,
        },
      });
    }

    // Create Activities
    for (const act of item.activities) {
      await prisma.customerActivity.create({
        data: {
          ...act,
          customerId: customer.id,
        },
      });
    }
  }

  console.log('Customer seed complete!');
  process.exit(0);
}

seedCustomers().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
