// ==============================================================================
// Ardab Market - Development Database Seeder
// ==============================================================================
// WARNING: This seed script is strictly intended for DEVELOPMENT & TESTING.
// NEVER seed production databases with default development credentials.

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const env = process.env.NODE_ENV || 'development';
  console.log(`[SEED] Starting database seed in environment: ${env}`);

  if (env === 'production') {
    console.error('[SEED] ABORT: Seeding with default credentials is not permitted in production.');
    process.exit(1);
  }

  const saltRounds = 10;

  // 1. Super Admin Dev Account
  const superAdminPassword = await bcrypt.hash('admin123', saltRounds);
  const superAdmin = await prisma.adminUser.upsert({
    where: { email: 'admin@ardabmarket.com' },
    update: {
      passwordHash: superAdminPassword,
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
    },
    create: {
      email: 'admin@ardabmarket.com',
      name: 'Abebe Bekele',
      passwordHash: superAdminPassword,
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
      phone: '+251 91 123 4567',
      assignedCities: ['All Cities'],
    },
  });
  console.log(`[SEED] Super Admin seeded: ${superAdmin.email} (${superAdmin.id})`);

  // 2. Sub Admin Dev Account
  const subAdminPassword = await bcrypt.hash('subadmin123', saltRounds);
  const subAdmin = await prisma.adminUser.upsert({
    where: { email: 'ashurack664@gmail.com' },
    update: {
      passwordHash: subAdminPassword,
      role: 'SUB_ADMIN',
      status: 'ACTIVE',
    },
    create: {
      email: 'ashurack664@gmail.com',
      name: 'Eden Tilahun',
      passwordHash: subAdminPassword,
      role: 'SUB_ADMIN',
      status: 'ACTIVE',
      phone: '+251 92 345 6789',
      assignedCities: ['Gondar', 'Bahir Dar'],
    },
  });
  // 3. Marketplace Categories
  const categoriesData = [
    {
      name: 'Grains & Cereals',
      slug: 'grains-cereals',
      icon: 'bi-boxes',
      description: 'Teff, wheat, barley, maize, and indigenous cereal crops',
    },
    {
      name: 'Coffee & Spices',
      slug: 'coffee-spices',
      icon: 'bi-cup-hot',
      description: 'Yirgacheffe, Sidama, Harar specialty coffees and authentic Ethiopian spices',
    },
    {
      name: 'Honey & Natural Sweeteners',
      slug: 'honey-sweeteners',
      icon: 'bi-droplet',
      description: 'Pure organic highland honey, white honey, and bee products',
    },
    {
      name: 'Edible Oils & Seeds',
      slug: 'edible-oils-seeds',
      icon: 'bi-moisture',
      description: 'Nug oil, sesame seeds, sunflower seeds, and flaxseed',
    },
    {
      name: 'Pulses & Legumes',
      slug: 'pulses-legumes',
      icon: 'bi-circle-square',
      description: 'Chickpeas, red lentils, faba beans, and field peas',
    },
    {
      name: 'Fresh Dairy & Butter',
      slug: 'fresh-dairy-butter',
      icon: 'bi-egg',
      description: 'Traditional spiced butter (kibe), artisanal cheeses, and fresh dairy products',
    },
  ];

  const seededCategories = [];
  for (const cat of categoriesData) {
    const category = await prisma.marketplaceCategory.upsert({
      where: { slug: cat.slug },
      update: { name: cat.name, icon: cat.icon, description: cat.description, isActive: true },
      create: { name: cat.name, slug: cat.slug, icon: cat.icon, description: cat.description, isActive: true },
    });
    seededCategories.push(category);
    console.log(`[SEED] Marketplace Category seeded: ${category.name} (${category.slug})`);
  }

  // 4. Assign categories to existing active suppliers
  const suppliers = await prisma.supplier.findMany({
    where: { status: 'ACTIVE' },
    select: { id: true, companyName: true },
  });

  for (const supplier of suppliers) {
    for (const cat of seededCategories) {
      await prisma.sellerMarketplaceCategory.upsert({
        where: {
          sellerId_categoryId: {
            sellerId: supplier.id,
            categoryId: cat.id,
          },
        },
        update: {},
        create: {
          sellerId: supplier.id,
          categoryId: cat.id,
        },
      });
    }
    console.log(`[SEED] Assigned ${seededCategories.length} categories to supplier: ${supplier.companyName}`);
  }

  console.log('[SEED] Seeding completed successfully.');
}

main()
  .catch((e) => {
    console.error('[SEED] Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
