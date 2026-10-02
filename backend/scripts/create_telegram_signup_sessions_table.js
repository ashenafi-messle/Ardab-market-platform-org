import { prisma, disconnectPrisma } from '../src/shared/config/database.js';

async function main() {
  console.log('--- Applying TelegramSignupSession DDL safely ---');

  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      CREATE TYPE "TelegramSignupStatus" AS ENUM ('PENDING_BOT_START', 'BOT_STARTED', 'OTP_SENT', 'VERIFIED', 'EXPIRED', 'FAILED');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `);
  console.log('✔ Enum TelegramSignupStatus ensured');

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "telegram_signup_sessions" (
      "id" TEXT NOT NULL,
      "phone" TEXT NOT NULL,
      "city" TEXT NOT NULL DEFAULT 'Gondar',
      "tokenHash" TEXT NOT NULL,
      "telegramChatId" TEXT,
      "telegramUserId" TEXT,
      "telegramUsername" TEXT,
      "otpHash" TEXT,
      "otpExpiresAt" TIMESTAMP(3),
      "otpAttempts" INTEGER NOT NULL DEFAULT 0,
      "status" "TelegramSignupStatus" NOT NULL DEFAULT 'PENDING_BOT_START',
      "expiresAt" TIMESTAMP(3) NOT NULL,
      "verifiedAt" TIMESTAMP(3),
      "lastResentAt" TIMESTAMP(3),
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

      CONSTRAINT "telegram_signup_sessions_pkey" PRIMARY KEY ("id")
    );
  `);
  console.log('✔ Table telegram_signup_sessions ensured');

  const indexes = [
    'CREATE UNIQUE INDEX IF NOT EXISTS "telegram_signup_sessions_tokenHash_key" ON "telegram_signup_sessions"("tokenHash")',
    'CREATE INDEX IF NOT EXISTS "telegram_signup_sessions_tokenHash_idx" ON "telegram_signup_sessions"("tokenHash")',
    'CREATE INDEX IF NOT EXISTS "telegram_signup_sessions_phone_idx" ON "telegram_signup_sessions"("phone")',
    'CREATE INDEX IF NOT EXISTS "telegram_signup_sessions_telegramChatId_idx" ON "telegram_signup_sessions"("telegramChatId")',
    'CREATE INDEX IF NOT EXISTS "telegram_signup_sessions_status_idx" ON "telegram_signup_sessions"("status")',
    'CREATE INDEX IF NOT EXISTS "telegram_signup_sessions_expiresAt_idx" ON "telegram_signup_sessions"("expiresAt")',
  ];

  for (const idxSql of indexes) {
    await prisma.$executeRawUnsafe(idxSql);
  }
  console.log('✔ All indexes on telegram_signup_sessions ensured');

  console.log('All migrations for telegram_signup_sessions applied successfully! 🚀');
  await disconnectPrisma();
}

main().catch((err) => {
  console.error('Error applying DDL:', err);
  process.exit(1);
});
