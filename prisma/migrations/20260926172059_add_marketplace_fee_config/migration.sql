-- CreateEnum
CREATE TYPE "MarketplaceType" AS ENUM ('MERCADO_LIVRE', 'SHOPEE');

-- CreateTable
CREATE TABLE "marketplace_fee_configs" (
    "id" TEXT NOT NULL,
    "marketplace" "MarketplaceType" NOT NULL,
    "commissionPercent" DOUBLE PRECISION NOT NULL,
    "commissionCapValue" DOUBLE PRECISION,
    "fixedFeeValue" DOUBLE PRECISION,
    "fixedFeeThreshold" DOUBLE PRECISION,
    "lowValueFeeTiers" JSONB,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "marketplace_fee_configs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "marketplace_fee_configs_marketplace_key" ON "marketplace_fee_configs"("marketplace");
