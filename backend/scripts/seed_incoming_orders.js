// ==============================================================================
// Ardab Market - Seed Realistic Incoming Orders Script
// ==============================================================================

import { prisma } from '../src/shared/config/database.js';
import { generateNextOrderNumber } from '../src/admin/services/orderCode.service.js';

async function seedIncomingOrders() {
  console.log('Seeding realistic incoming customer orders into Neon PostgreSQL...');

  // 1. Fetch existing customers
  const customers = await prisma.customer.findMany();
  if (customers.length === 0) {
    console.error('No customers found. Run customer seeds first.');
    return;
  }

  // 2. Fetch existing products
  const products = await prisma.product.findMany({
    include: { seller: true },
  });
  if (products.length === 0) {
    console.error('No products found.');
    return;
  }

  const almaz = customers.find((c) => c.fullName.includes('Almaz')) || customers[0];
  const solomon = customers.find((c) => c.fullName.includes('Solomon')) || customers[0];
  const hiwot = customers.find((c) => c.fullName.includes('Hiwot')) || customers[0];
  const kassahun = customers.find((c) => c.fullName.includes('Kassahun')) || customers[0];

  const p1 = products[0];
  const p2 = products.length > 1 ? products[1] : products[0];
  const p3 = products.length > 2 ? products[2] : products[0];

  const ordersToCreate = [
    {
      customer: hiwot,
      city: 'Addis Ababa',
      deliveryZone: 'Bole Subcity',
      neighborhood: 'Atlas',
      addressLine: 'Cameroon Street, Next to Edna Mall, Building 4A',
      status: 'PENDING',
      paymentMethod: 'TELEBIRR',
      paymentStatus: 'PAID',
      customerNote: 'Please ring doorbell upon arrival at gate.',
      items: [
        { product: p1, quantity: 4 },
        { product: p2, quantity: 2 },
      ],
    },
    {
      customer: almaz,
      city: 'Gondar',
      deliveryZone: 'Arada Central',
      neighborhood: 'Piazza',
      addressLine: 'Near Fasil Ghebbi Historic Square, House 214',
      status: 'PENDING',
      paymentMethod: 'CBE_BIRR',
      paymentStatus: 'PENDING',
      customerNote: 'Please confirm consignment weight with driver.',
      items: [
        { product: p1, quantity: 5 },
      ],
    },
    {
      customer: solomon,
      city: 'Bahir Dar',
      deliveryZone: 'Lake Shore / Kebele 03',
      neighborhood: 'Lake Tana Vista',
      addressLine: 'Near Blue Nile Falls Viewpoint Road, Villa 12',
      status: 'CONFIRMED',
      paymentMethod: 'TELEBIRR',
      paymentStatus: 'PAID',
      customerNote: 'Early morning delivery preferred.',
      items: [
        { product: p2, quantity: 3 },
        { product: p3, quantity: 2 },
      ],
    },
    {
      customer: kassahun,
      city: 'Gondar',
      deliveryZone: 'Maraki University Zone',
      neighborhood: 'Maraki Campus East',
      addressLine: 'University Staff Residential Quarters, Block C',
      status: 'PROCESSING',
      paymentMethod: 'CASH_ON_DELIVERY',
      paymentStatus: 'PENDING',
      customerNote: 'Consignment for student cafeteria supply.',
      items: [
        { product: p1, quantity: 10 },
        { product: p3, quantity: 5 },
      ],
    },
    {
      customer: almaz,
      city: 'Gondar',
      deliveryZone: 'Azezo Logistics Hub',
      neighborhood: 'Airport Gate',
      addressLine: 'Azezo Main Highway, Storehouse 8',
      status: 'READY_FOR_DELIVERY',
      paymentMethod: 'TELEBIRR',
      paymentStatus: 'PAID',
      customerNote: 'Staged for Trip #TRIP-GD-401.',
      items: [
        { product: p2, quantity: 8 },
      ],
    },
  ];

  for (const o of ordersToCreate) {
    const orderNumber = await generateNextOrderNumber();

    let subtotal = 0;
    let totalWeight = 0;

    const itemsData = o.items.map(({ product, quantity }) => {
      const unitPrice = Number(product.sellingPrice);
      const weightPerUnit = Number(product.weight);
      const itemSubtotal = unitPrice * quantity;
      const itemWeight = weightPerUnit * quantity;

      subtotal += itemSubtotal;
      totalWeight += itemWeight;

      return {
        productId: product.id,
        productNameSnapshot: product.name,
        itemCodeSnapshot: product.itemCode,
        unitSnapshot: product.unit,
        unitPrice,
        quantity,
        weightPerUnit,
        totalWeight: itemWeight,
        subtotal: itemSubtotal,
        sellerIdSnapshot: product.sellerId,
        sellerNameSnapshot: product.seller?.companyName || product.seller?.name || 'Direct Hub',
      };
    });

    // Delivery fee
    let deliveryFee = 150;
    if (totalWeight > 50) {
      deliveryFee += (totalWeight - 50) * 5;
    }

    const totalAmount = subtotal + deliveryFee;

    const createdOrder = await prisma.order.create({
      data: {
        orderNumber,
        customerId: o.customer.id,
        city: o.city,
        deliveryZone: o.deliveryZone,
        deliveryAddress: o.addressLine,
        status: o.status,
        subtotal,
        deliveryFee,
        totalAmount,
        totalWeight,
        currency: 'ETB',
        paymentMethod: o.paymentMethod,
        paymentStatus: o.paymentStatus,
        customerNote: o.customerNote,
        placedAt: new Date(),
        confirmedAt: o.status !== 'PENDING' ? new Date() : null,
        processingAt: o.status === 'PROCESSING' || o.status === 'READY_FOR_DELIVERY' ? new Date() : null,
        readyAt: o.status === 'READY_FOR_DELIVERY' ? new Date() : null,
        items: {
          create: itemsData,
        },
        deliveryAddressSnapshot: {
          create: {
            recipientName: o.customer.fullName,
            phone: o.customer.phone,
            city: o.city,
            deliveryZone: o.deliveryZone,
            neighborhood: o.neighborhood,
            addressLine: o.addressLine,
          },
        },
        activities: {
          create: [
            {
              action: 'Order Placed',
              fromStatus: null,
              toStatus: 'PENDING',
              description: 'Customer placed order via mobile app.',
              actor: 'Customer',
            },
            ...(o.status !== 'PENDING'
              ? [
                  {
                    action: 'Order Confirmed',
                    fromStatus: 'PENDING',
                    toStatus: 'CONFIRMED',
                    description: 'Super Admin reviewed and approved incoming order.',
                    actor: 'Super Admin',
                  },
                ]
              : []),
            ...(o.status === 'PROCESSING' || o.status === 'READY_FOR_DELIVERY'
              ? [
                  {
                    action: 'Hub Processing Started',
                    fromStatus: 'CONFIRMED',
                    toStatus: 'PROCESSING',
                    description: 'Order sent to warehouse hub for item consignment packing.',
                    actor: 'Super Admin',
                  },
                ]
              : []),
            ...(o.status === 'READY_FOR_DELIVERY'
              ? [
                  {
                    action: 'Marked Ready for Delivery',
                    fromStatus: 'PROCESSING',
                    toStatus: 'READY_FOR_DELIVERY',
                    description: 'Order packed and staged at dock for fleet loading.',
                    actor: 'Super Admin',
                  },
                ]
              : []),
          ],
        },
      },
    });

    console.log(
      `✓ Created [${createdOrder.orderNumber}] ${o.customer.fullName} (${o.city}) - Status: ${o.status}, Total: ${totalAmount} ETB, Weight: ${totalWeight} kg`
    );
  }

  console.log('Finished seeding incoming orders.');
  await prisma.$disconnect();
}

seedIncomingOrders().catch(async (e) => {
  console.error('Error seeding orders:', e);
  await prisma.$disconnect();
  process.exit(1);
});
