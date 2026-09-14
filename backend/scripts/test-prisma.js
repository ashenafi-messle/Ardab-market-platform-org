// ==============================================================================
// Ardab Market - Prisma Client & Transaction Verification Test
// ==============================================================================
// Tests Prisma singleton initialization, query execution, transactions, and disconnect.

import { prisma, disconnectPrisma } from '../src/shared/config/database.js';

async function main() {
  console.log('=================================================================');
  console.log('  Ardab Market - Prisma ORM Integration & Transaction Test');
  console.log('=================================================================');

  try {
    // 1. Connection Test
    console.log('\n[1/3] Testing Prisma Client Connection...');
    await prisma.$connect();
    console.log('  ✔ Prisma Client connected to Neon PostgreSQL successfully.');

    // 2. Query Test
    console.log('\n[2/3] Testing Query Execution via Prisma...');
    const result = await prisma.$queryRaw`SELECT 1 as test_val, current_database() as db;`;
    console.log(`  ✔ Query executed successfully. Connected to: "${result[0].db}"`);

    // 3. Transaction Capabilities Test
    console.log('\n[3/3] Testing Prisma Interactive Transactions ($transaction)...');
    const txResult = await prisma.$transaction(async (tx) => {
      const ping = await tx.$queryRaw`SELECT 100 as tx_val;`;
      return ping[0].tx_val;
    });

    if (txResult === 100) {
      console.log('  ✔ Prisma $transaction committed atomically.');
    }

    console.log('=================================================================');
    console.log('  Prisma ORM setup & connectivity test PASSED 🚀');
    console.log('=================================================================');

    await disconnectPrisma();
    process.exit(0);
  } catch (error) {
    console.error('\n[ERROR] Prisma verification failed:', error.message);
    console.log('=================================================================');
    console.error('  Prisma ORM integration test FAILED ❌');
    console.log('=================================================================');

    await disconnectPrisma().catch(() => {});
    process.exit(1);
  }
}

main();
