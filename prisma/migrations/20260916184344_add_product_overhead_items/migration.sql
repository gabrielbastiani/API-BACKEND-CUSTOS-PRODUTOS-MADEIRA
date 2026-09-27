/*
  Warnings:

  - You are about to alter the column `marginPercent` on the `products` table. The data in that column could be lost. The data in that column will be cast from `Decimal(6,2)` to `DoublePrecision`.
  - You are about to alter the column `overheadPercent` on the `products` table. The data in that column could be lost. The data in that column will be cast from `Decimal(6,2)` to `DoublePrecision`.

*/
-- AlterTable
ALTER TABLE "products" ALTER COLUMN "marginPercent" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "overheadPercent" SET DATA TYPE DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "product_overhead_items" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_overhead_items_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "product_overhead_items" ADD CONSTRAINT "product_overhead_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
