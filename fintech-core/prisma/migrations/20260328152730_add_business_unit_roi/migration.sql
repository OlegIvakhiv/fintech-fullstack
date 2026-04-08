-- AlterTable
ALTER TABLE "BusinessUnit" ADD COLUMN     "annualROI" DOUBLE PRECISION,
ADD COLUMN     "lastROIUpdate" TIMESTAMP(3),
ADD COLUMN     "monthlyROI" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "WithdrawalRequest" ALTER COLUMN "withdrawalType" DROP DEFAULT;

-- CreateTable
CREATE TABLE "BusinessUnitROI" (
    "id" SERIAL NOT NULL,
    "businessUnitId" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "monthlyROI" DOUBLE PRECISION NOT NULL,
    "totalPoolValue" DECIMAL(18,2) NOT NULL,
    "totalDistributed" DECIMAL(18,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessUnitROI_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BusinessUnitROI_businessUnitId_month_year_key" ON "BusinessUnitROI"("businessUnitId", "month", "year");

-- AddForeignKey
ALTER TABLE "BusinessUnitROI" ADD CONSTRAINT "BusinessUnitROI_businessUnitId_fkey" FOREIGN KEY ("businessUnitId") REFERENCES "BusinessUnit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
