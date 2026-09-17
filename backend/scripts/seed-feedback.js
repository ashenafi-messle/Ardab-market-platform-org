// ==============================================================================
// Ardab Market - Seed Initial Feedback Records
// ==============================================================================

import { prisma } from '../src/shared/config/database.js';

async function seedFeedback() {
  console.log('[SEED] Seeding Feedback & Reputation data...');

  const customers = await prisma.customer.findMany({ take: 5 });
  const products = await prisma.product.findMany({ take: 5 });
  const suppliers = await prisma.supplier.findMany({ take: 5 });
  const categories = await prisma.feedbackCategory.findMany();

  const catMap = {};
  categories.forEach((c) => {
    catMap[c.name] = c.id;
  });

  const sampleFeedback = [
    {
      authorName: 'Dawit Mengistu',
      authorRole: 'CUSTOMER',
      city: 'Gondar',
      type: 'PRODUCT',
      source: 'PRODUCT',
      rating: 5,
      title: 'Premium Teff Consignment Freshness',
      comment: 'The Magna Teff batch delivered to our bakery in Gondar was exceptionally clean, pest-free, and milled to perfect grade. Truly five-star quality.',
      targetEntityName: products[0]?.name || 'Magna Teff Grade 1',
      sentiment: 'POSITIVE',
      status: 'PUBLISHED',
      visibility: 'PUBLIC',
      isVerified: true,
      customerId: customers[0]?.id || null,
      productId: products[0]?.id || null,
      categoryId: catMap['Product Quality'] || null,
    },
    {
      authorName: 'Genet Alemu',
      authorRole: 'CUSTOMER',
      city: 'Bahir Dar',
      type: 'DELIVERY',
      source: 'DELIVERY',
      rating: 4,
      title: 'Prompt Delivery with Minor Gate Delay',
      comment: 'Driver arrived with the refrigerated truck on schedule. Unloading was smooth, although we waited 10 minutes at the warehouse entrance.',
      targetEntityName: 'Run #ARD-TRP-202609-001',
      sentiment: 'POSITIVE',
      status: 'REVIEWED',
      visibility: 'PUBLIC',
      isVerified: true,
      customerId: customers[1]?.id || null,
      categoryId: catMap['Delivery Runs'] || null,
      adminResponse: 'Thank you Genet! We have optimized warehouse check-in protocols at the Bahir Dar hub to eliminate entrance delays.',
    },
    {
      authorName: 'Yonas Tadesse',
      authorRole: 'CUSTOMER',
      city: 'Addis Ababa',
      type: 'PLATFORM',
      source: 'PLATFORM',
      rating: 5,
      title: 'Seamless Order & Telebirr Payment Settlement',
      comment: 'Placing wholesale orders through the platform is seamless. Real-time invoice generation and Telebirr instant settlement works flawlessly.',
      targetEntityName: 'Ardab Marketplace Web App',
      sentiment: 'POSITIVE',
      status: 'PUBLISHED',
      visibility: 'PUBLIC',
      isVerified: true,
      customerId: customers[2]?.id || null,
      categoryId: catMap['Platform & App'] || null,
    },
    {
      authorName: 'Mulugeta Belete',
      authorRole: 'SUPPLIER',
      city: 'Gondar',
      type: 'SUPPLIER',
      source: 'SELLER',
      rating: 4,
      title: 'Accurate Weighing at Aggregation Hub',
      comment: 'Digital scale calibration at the central Gondar collection depot was completely transparent. Settlement was credited into CBE Birr within 2 hours.',
      targetEntityName: suppliers[0]?.companyName || 'Gondar Highland Producers Coop',
      sentiment: 'POSITIVE',
      status: 'PUBLISHED',
      visibility: 'PUBLIC',
      isVerified: true,
      sellerId: suppliers[0]?.id || null,
      categoryId: catMap['Supplier Handover'] || null,
      adminResponse: 'We appreciate your partnership Mulugeta. Fair weighing and rapid settlement remain our core operational priorities.',
    },
    {
      authorName: 'Tigist Haile',
      authorRole: 'CUSTOMER',
      city: 'Gondar',
      type: 'PRODUCT',
      source: 'PRODUCT',
      rating: 3,
      title: 'Slight Packaging Tear on Sesame Sack',
      comment: 'The sesame seeds inside were dry and intact, but the outer jute sack had a small puncture during transit. Please reinforce bundling.',
      targetEntityName: products[1]?.name || 'Humera Sesame Extra Clean',
      sentiment: 'NEUTRAL',
      status: 'REVIEWED',
      visibility: 'PUBLIC',
      isVerified: true,
      customerId: customers[0]?.id || null,
      productId: products[1]?.id || null,
      categoryId: catMap['Product Quality'] || null,
      adminResponse: 'Thank you Tigist. We have added double-layered lining for all Humera Sesame consignments dispatched from Gondar.',
    },
    {
      authorName: 'Ephrem Kebede',
      authorRole: 'CUSTOMER',
      city: 'Bahir Dar',
      type: 'CUSTOMER_SERVICE',
      source: 'SUPPORT',
      rating: 5,
      title: 'Helpful Customer Support for Rescheduled Consignment',
      comment: 'Subadmin agent Eden was very polite and quickly updated our delivery drop-off point when our storage warehouse changed on short notice.',
      targetEntityName: 'Customer Support Desk',
      sentiment: 'POSITIVE',
      status: 'RESOLVED',
      visibility: 'PUBLIC',
      isVerified: true,
      categoryId: catMap['Customer Service'] || null,
    },
    {
      authorName: 'Anonymous Buyer',
      authorRole: 'CUSTOMER',
      city: 'Gondar',
      type: 'PLATFORM',
      source: 'PLATFORM',
      rating: 2,
      title: 'Search Filter Reset Bug',
      comment: 'Whenever I switch tabs on mobile, my price filter resets. Please fix this bug in the next platform update.',
      targetEntityName: 'Ardab Mobile Web Experience',
      sentiment: 'NEGATIVE',
      status: 'FLAGGED',
      visibility: 'PUBLIC',
      isVerified: false,
      isAnonymous: true,
      categoryId: catMap['Platform & App'] || null,
    },
  ];

  let count = 0;
  for (const item of sampleFeedback) {
    const existing = await prisma.feedback.findFirst({
      where: { title: item.title, authorName: item.authorName },
    });

    if (!existing) {
      const { adminResponse, ...data } = item;
      const created = await prisma.feedback.create({ data });

      if (adminResponse) {
        await prisma.feedbackResponse.create({
          data: {
            feedbackId: created.id,
            responderType: 'SUBADMIN',
            responderName: 'Eden Tilahun',
            body: adminResponse,
          },
        });
      }
      count++;
    }
  }

  console.log(`[SEED] Seeded ${count} new feedback items.`);
}

seedFeedback()
  .catch((err) => {
    console.error('[SEED] Error seeding feedback:', err);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
