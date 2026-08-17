-- Make telegramId optional to support guest users without Telegram
ALTER TABLE "users" ALTER COLUMN "telegramId" DROP NOT NULL;
