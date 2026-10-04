/*
  Warnings:

  - A unique constraint covering the columns `[sequenceNumber]` on the table `quotes` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "quotes" ADD COLUMN     "sequenceNumber" SERIAL NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "quotes_sequenceNumber_key" ON "quotes"("sequenceNumber");
