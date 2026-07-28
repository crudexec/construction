ALTER TABLE "ContractPayment"
  ADD COLUMN "earlyPayDiscountPercent" DOUBLE PRECISION,
  ADD COLUMN "acaAmountRequesting" DOUBLE PRECISION,
  ADD COLUMN "hasAcaDiscrepancy" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "acaDiscrepancyNote" TEXT;

CREATE TABLE "ContractPaymentCostAllocation" (
  "id" TEXT NOT NULL,
  "paymentId" TEXT NOT NULL,
  "costCodeId" TEXT NOT NULL,
  "amount" DOUBLE PRECISION NOT NULL,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ContractPaymentCostAllocation_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ContractPaymentCostAllocation_paymentId_idx" ON "ContractPaymentCostAllocation"("paymentId");
CREATE INDEX "ContractPaymentCostAllocation_costCodeId_idx" ON "ContractPaymentCostAllocation"("costCodeId");

ALTER TABLE "ContractPaymentCostAllocation"
  ADD CONSTRAINT "ContractPaymentCostAllocation_paymentId_fkey"
  FOREIGN KEY ("paymentId") REFERENCES "ContractPayment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ContractPaymentCostAllocation"
  ADD CONSTRAINT "ContractPaymentCostAllocation_costCodeId_fkey"
  FOREIGN KEY ("costCodeId") REFERENCES "CostCode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
