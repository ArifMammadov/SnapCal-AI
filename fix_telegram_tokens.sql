ALTER TABLE "telegram_start_tokens" RENAME COLUMN "telegram_id" TO "telegramId";
ALTER TABLE "telegram_start_tokens" ADD COLUMN IF NOT EXISTS "usedAt" TIMESTAMP(3);
ALTER TABLE "telegram_start_tokens" RENAME COLUMN "expires_at" TO "expiresAt";
ALTER TABLE "telegram_start_tokens" RENAME COLUMN "created_at" TO "createdAt";
