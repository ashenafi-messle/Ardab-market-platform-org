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
  console.log(`[SEED] Sub Admin seeded: ${subAdmin.email} (${subAdmin.id})`);

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
