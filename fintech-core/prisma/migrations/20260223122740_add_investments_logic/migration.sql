/*
  Warnings:

  - You are about to alter the column `balance` on the `Account` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `Decimal(18,2)`.
  - You are about to alter the column `balance` on the `BusinessUnit` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `Decimal(18,2)`.
  - You are about to alter the column `amount` on the `Investment` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `Decimal(18,2)`.
  - You are about to alter the column `amount` on the `JournalEntry` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `Decimal(18,2)`.

*/
-- CreateEnum
CREATE TYPE "BusinessUnitStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- DropForeignKey
ALTER TABLE "Investment" DROP CONSTRAINT "Investment_portfolioId_fkey";

-- DropForeignKey
ALTER TABLE "JournalEntry" DROP CONSTRAINT "JournalEntry_accountId_fkey";

-- DropForeignKey
ALTER TABLE "Portfolio" DROP CONSTRAINT "Portfolio_userId_fkey";

-- AlterTable
ALTER TABLE "Account" ALTER COLUMN "balance" SET DATA TYPE DECIMAL(18,2);

-- AlterTable
ALTER TABLE "BusinessUnit" ALTER COLUMN "balance" SET DATA TYPE DECIMAL(18,2);

-- AlterTable
ALTER TABLE "Investment" ALTER COLUMN "amount" SET DATA TYPE DECIMAL(18,2);

-- AlterTable
ALTER TABLE "JournalEntry" ALTER COLUMN "amount" SET DATA TYPE DECIMAL(18,2);

-- CreateIndex
CREATE INDEX "JournalEntry_transactionId_idx" ON "JournalEntry"("transactionId");

-- AddForeignKey
ALTER TABLE "Portfolio" ADD CONSTRAINT "Portfolio_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Investment" ADD CONSTRAINT "Investment_portfolioId_fkey" FOREIGN KEY ("portfolioId") REFERENCES "Portfolio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalEntry" ADD CONSTRAINT "JournalEntry_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;
