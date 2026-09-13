-- CreateEnum
CREATE TYPE "UnitOfMeasure" AS ENUM ('MM', 'CM', 'M', 'M2', 'M3', 'UNIDADE', 'GRAMA', 'KG', 'ML', 'LITRO');

-- CreateTable
CREATE TABLE "suppliers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contact" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "raw_materials" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "supplierId" TEXT,
    "purchaseUnit" "UnitOfMeasure" NOT NULL,
    "purchaseQty" DECIMAL(12,4) NOT NULL,
    "purchasePrice" DECIMAL(12,2) NOT NULL,
    "usageUnit" "UnitOfMeasure" NOT NULL,
    "conversionFactor" DECIMAL(12,6) NOT NULL,
    "stockQty" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "minStockAlert" DECIMAL(12,4),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "raw_materials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "labor_rates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "hourlyRate" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "labor_rates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "marginPercent" DECIMAL(6,2) NOT NULL DEFAULT 0,
    "overheadPercent" DECIMAL(6,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_materials" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "rawMaterialId" TEXT NOT NULL,
    "quantityUsed" DECIMAL(12,4) NOT NULL,
    "wastePercent" DECIMAL(6,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_materials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_labors" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "laborRateId" TEXT NOT NULL,
    "hoursSpent" DECIMAL(8,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_labors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_cost_snapshots" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "materialsCost" DECIMAL(12,2) NOT NULL,
    "laborCost" DECIMAL(12,2) NOT NULL,
    "overheadCost" DECIMAL(12,2) NOT NULL,
    "subtotalCost" DECIMAL(12,2) NOT NULL,
    "marginValue" DECIMAL(12,2) NOT NULL,
    "finalPrice" DECIMAL(12,2) NOT NULL,
    "breakdown" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_cost_snapshots_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "raw_materials" ADD CONSTRAINT "raw_materials_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_materials" ADD CONSTRAINT "product_materials_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_materials" ADD CONSTRAINT "product_materials_rawMaterialId_fkey" FOREIGN KEY ("rawMaterialId") REFERENCES "raw_materials"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_labors" ADD CONSTRAINT "product_labors_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_labors" ADD CONSTRAINT "product_labors_laborRateId_fkey" FOREIGN KEY ("laborRateId") REFERENCES "labor_rates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_cost_snapshots" ADD CONSTRAINT "product_cost_snapshots_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
