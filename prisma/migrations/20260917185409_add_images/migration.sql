-- CreateEnum
CREATE TYPE "ImageOwnerType" AS ENUM ('RAW_MATERIAL', 'SUPPLIER', 'PRODUCT');

-- CreateTable
CREATE TABLE "images" (
    "id" TEXT NOT NULL,
    "ownerType" "ImageOwnerType" NOT NULL,
    "ownerId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "images_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "images_ownerType_ownerId_idx" ON "images"("ownerType", "ownerId");
