-- CreateTable
CREATE TABLE "material_suppliers" (
    "id" TEXT NOT NULL,
    "rawMaterialId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "purchaseUnit" "UnitOfMeasure" NOT NULL,
    "purchaseQty" DECIMAL(12,4) NOT NULL,
    "purchasePrice" DECIMAL(12,2) NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "material_suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "price_history" (
    "id" TEXT NOT NULL,
    "materialSupplierId" TEXT NOT NULL,
    "purchaseUnit" "UnitOfMeasure" NOT NULL,
    "purchaseQty" DECIMAL(12,4) NOT NULL,
    "purchasePrice" DECIMAL(12,2) NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "price_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "material_suppliers_rawMaterialId_supplierId_key" ON "material_suppliers"("rawMaterialId", "supplierId");

-- AddForeignKey
ALTER TABLE "material_suppliers" ADD CONSTRAINT "material_suppliers_rawMaterialId_fkey" FOREIGN KEY ("rawMaterialId") REFERENCES "raw_materials"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_suppliers" ADD CONSTRAINT "material_suppliers_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_history" ADD CONSTRAINT "price_history_materialSupplierId_fkey" FOREIGN KEY ("materialSupplierId") REFERENCES "material_suppliers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- MigrateData: copia cada raw_material com supplierId preenchido para material_suppliers, marcando como padrão
INSERT INTO "material_suppliers" (
    "id", "rawMaterialId", "supplierId", "purchaseUnit", "purchaseQty", "purchasePrice", "isDefault", "createdAt", "updatedAt"
)
SELECT
    gen_random_uuid(),
    "id",
    "supplierId",
    "purchaseUnit",
    "purchaseQty",
    "purchasePrice",
    true,
    "createdAt",
    "updatedAt"
FROM "raw_materials"
WHERE "supplierId" IS NOT NULL;

-- MigrateData: registra o preço atual como primeiro ponto do histórico
INSERT INTO "price_history" (
    "id", "materialSupplierId", "purchaseUnit", "purchaseQty", "purchasePrice", "recordedAt"
)
SELECT
    gen_random_uuid(),
    "id",
    "purchaseUnit",
    "purchaseQty",
    "purchasePrice",
    "createdAt"
FROM "material_suppliers";

-- DropForeignKey
ALTER TABLE "raw_materials" DROP CONSTRAINT "raw_materials_supplierId_fkey";

-- AlterTable
ALTER TABLE "raw_materials" DROP COLUMN "purchasePrice",
DROP COLUMN "purchaseQty",
DROP COLUMN "purchaseUnit",
DROP COLUMN "supplierId";