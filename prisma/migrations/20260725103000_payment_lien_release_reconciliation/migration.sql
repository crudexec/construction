CREATE TABLE "ContractPaymentLienRelease" (
  "id" TEXT NOT NULL,
  "paymentId" TEXT NOT NULL,
  "lienReleaseId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ContractPaymentLienRelease_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ContractPaymentLienRelease_paymentId_lienReleaseId_key"
  ON "ContractPaymentLienRelease"("paymentId", "lienReleaseId");

CREATE INDEX "ContractPaymentLienRelease_paymentId_idx"
  ON "ContractPaymentLienRelease"("paymentId");

CREATE INDEX "ContractPaymentLienRelease_lienReleaseId_idx"
  ON "ContractPaymentLienRelease"("lienReleaseId");

ALTER TABLE "ContractPaymentLienRelease"
  ADD CONSTRAINT "ContractPaymentLienRelease_paymentId_fkey"
  FOREIGN KEY ("paymentId") REFERENCES "ContractPayment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ContractPaymentLienRelease"
  ADD CONSTRAINT "ContractPaymentLienRelease_lienReleaseId_fkey"
  FOREIGN KEY ("lienReleaseId") REFERENCES "LienRelease"("id") ON DELETE CASCADE ON UPDATE CASCADE;
