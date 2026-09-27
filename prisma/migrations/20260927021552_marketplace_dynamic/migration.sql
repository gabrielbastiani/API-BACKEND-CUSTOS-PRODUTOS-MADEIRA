/*
  Warnings:

  - You are about to drop the `marketplace_fee_configs` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "marketplace_fee_configs";

-- DropEnum
DROP TYPE "MarketplaceType";

-- CreateTable
CREATE TABLE "marketplaces" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "commissionPercent" DOUBLE PRECISION NOT NULL,
    "commissionCapValue" DOUBLE PRECISION,
    "fixedFeeValue" DOUBLE PRECISION,
    "lowValueFeeTiers" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "marketplaces_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "marketplaces_name_key" ON "marketplaces"("name");

-- CreateIndex
CREATE UNIQUE INDEX "marketplaces_slug_key" ON "marketplaces"("slug");
