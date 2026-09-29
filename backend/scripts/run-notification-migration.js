import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { prisma } from '../src/shared/config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function run() {
  console.log('--- Applying Customer Push Notifications Migration ---');
  const sqlPath = path.join(__dirname, '../prisma/migrations/20260929150000_add_customer_push_notifications/migration.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  // Split migration statements cleanly or execute via $executeRawUnsafe
  try {
    // Neon PostgreSQL handles multi-statement query via direct connection
    await prisma.$executeRawUnsafe(sql);
    console.log('Migration executed successfully on Neon PostgreSQL! 🚀');

    // Verify tables exist
    const result = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('notifications', 'notification_recipients', 'customer_push_tokens', 'notification_deliveries', 'customer_notification_preferences');
    `;
    console.log('Verified database tables in public schema:', result);
  } catch (error) {
    console.error('Error applying migration:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

run();
