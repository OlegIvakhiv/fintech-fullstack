/*
  Warnings:

  - You are about to alter the column `balance` on the `Account` table. The data in that column could be lost. The data in that column will be cast from `Decimal(18,2)` to `Decimal(18,8)`.
  - You are about to alter the column `balance` on the `BusinessUnit` table. The data in that column could be lost. The data in that column will be cast from `Decimal(18,2)` to `Decimal(18,8)`.
  - You are about to alter the column `totalPoolValue` on the `BusinessUnitROI` table. The data in that column could be lost. The data in that column will be cast from `Decimal(18,2)` to `Decimal(18,8)`.
  - You are about to alter the column `totalDistributed` on the `BusinessUnitROI` table. The data in that column could be lost. The data in that column will be cast from `Decimal(18,2)` to `Decimal(18,8)`.
  - You are about to alter the column `amount` on the `Investment` table. The data in that column could be lost. The data in that column will be cast from `Decimal(18,2)` to `Decimal(18,8)`.
  - You are about to alter the column `amount` on the `JournalEntry` table. The data in that column could be lost. The data in that column will be cast from `Decimal(18,2)` to `Decimal(18,8)`.
  - You are about to alter the column `amount` on the `WithdrawalRequest` table. The data in that column could be lost. The data in that column will be cast from `Decimal(18,2)` to `Decimal(18,8)`.

*/
-- AlterTable
ALTER TABLE "Account" ALTER COLUMN "balance" SET DATA TYPE DECIMAL(18,8);

-- AlterTable
ALTER TABLE "BusinessUnit" ALTER COLUMN "balance" SET DATA TYPE DECIMAL(18,8);

-- AlterTable
ALTER TABLE "BusinessUnitROI" ALTER COLUMN "totalPoolValue" SET DATA TYPE DECIMAL(18,8),
ALTER COLUMN "totalDistributed" SET DATA TYPE DECIMAL(18,8);

-- AlterTable
ALTER TABLE "Investment" ALTER COLUMN "amount" SET DATA TYPE DECIMAL(18,8);

-- AlterTable
ALTER TABLE "JournalEntry" ALTER COLUMN "amount" SET DATA TYPE DECIMAL(18,8);

-- AlterTable
ALTER TABLE "WithdrawalRequest" ALTER COLUMN "amount" SET DATA TYPE DECIMAL(18,8);
