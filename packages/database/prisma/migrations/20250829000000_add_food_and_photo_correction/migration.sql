-- CreateTable
CREATE TABLE "foods" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "aliases" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "category" TEXT,
    "cuisine" TEXT,
    "country" TEXT,
    "servingSizeG" DECIMAL(6,1),
    "kcalPer100g" DECIMAL(7,2) NOT NULL,
    "proteinPer100g" DECIMAL(6,2) NOT NULL,
    "fatPer100g" DECIMAL(6,2) NOT NULL,
    "carbsPer100g" DECIMAL(6,2) NOT NULL,
    "fiberPer100g" DECIMAL(6,2),
    "source" TEXT,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "foods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "photo_corrections" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "foodId" UUID,
    "photoId" TEXT,
    "imageUrl" TEXT,
    "aiPredictionName" TEXT,
    "aiConfidence" DECIMAL(3,2),
    "userCorrection" TEXT NOT NULL,
    "finalFoodName" TEXT NOT NULL,
    "finalPortionG" INTEGER,
    "finalCalories" INTEGER,
    "finalProteinG" INTEGER,
    "finalCarbsG" INTEGER,
    "finalFatG" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "photo_corrections_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "foods_normalizedName_key" ON "foods"("normalizedName");

-- CreateIndex
CREATE INDEX "foods_normalizedName_idx" ON "foods"("normalizedName");

-- CreateIndex
CREATE INDEX "foods_cuisine_idx" ON "foods"("cuisine");

-- CreateIndex
CREATE INDEX "foods_aliases_idx" ON "foods" USING GIN ("aliases");

-- CreateIndex
CREATE INDEX "photo_corrections_userId_createdAt_idx" ON "photo_corrections"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "photo_corrections" ADD CONSTRAINT "photo_corrections_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "photo_corrections" ADD CONSTRAINT "photo_corrections_foodId_fkey" FOREIGN KEY ("foodId") REFERENCES "foods"("id") ON DELETE SET NULL ON UPDATE CASCADE;
