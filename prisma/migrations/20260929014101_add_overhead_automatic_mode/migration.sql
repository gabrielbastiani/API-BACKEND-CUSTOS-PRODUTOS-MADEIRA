-- CreateEnum
CREATE TYPE "OverheadMode" AS ENUM ('MANUAL', 'AUTOMATIC');

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "overheadMode" "OverheadMode" NOT NULL DEFAULT 'MANUAL';

-- CreateTable
CREATE TABLE "workshop_settings" (
    "id" TEXT NOT NULL,
    "monthlyProductiveHours" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workshop_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fixed_costs" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "monthlyValue" DECIMAL(12,2) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fixed_costs_pkey" PRIMARY KEY ("id")
);
