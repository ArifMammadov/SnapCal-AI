-- CreateTable
CREATE TABLE "telegram_start_tokens" (
    "id" UUID NOT NULL,
    "token" TEXT NOT NULL,
    "telegramId" BIGINT NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "usedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "telegram_start_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "telegram_start_tokens_token_key" ON "telegram_start_tokens"("token");

-- CreateIndex
CREATE INDEX "telegram_start_tokens_token_idx" ON "telegram_start_tokens"("token");
