-- Create billing-specific enums for subcontractor contract payments
CREATE TYPE "ContractPaymentPMStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
CREATE TYPE "ContractPaymentAPStatus" AS ENUM ('PROCESSING', 'WAITING_ON_LIEN_RELEASES', 'PAID');
CREATE TYPE "ContractPaymentAttachmentKind" AS ENUM ('CONDITIONAL_LIEN_RELEASE', 'UNCONDITIONAL_LIEN_RELEASE', 'GENERAL_ATTACHMENT');

-- Expand contract payments to support pay applications and approvals
ALTER TABLE "ContractPayment"
ADD COLUMN "submittedBy" TEXT,
ADD COLUMN "billingPeriodDate" TIMESTAMP(3),
ADD COLUMN "clientName" TEXT,
ADD COLUMN "amountComplete" DOUBLE PRECISION,
ADD COLUMN "lessRetention" DOUBLE PRECISION,
ADD COLUMN "subtotal" DOUBLE PRECISION,
ADD COLUMN "currentBilling" DOUBLE PRECISION,
ADD COLUMN "earlyPayDiscount" DOUBLE PRECISION,
ADD COLUMN "amountRequesting" DOUBLE PRECISION,
ADD COLUMN "currentRetention" DOUBLE PRECISION,
ADD COLUMN "paidToDateOverride" DOUBLE PRECISION,
ADD COLUMN "paidToDateAdjustment" DOUBLE PRECISION,
ADD COLUMN "maxPayment" DOUBLE PRECISION,
ADD COLUMN "amountApproved" DOUBLE PRECISION,
ADD COLUMN "pmStatus" "ContractPaymentPMStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN "apStatus" "ContractPaymentAPStatus" NOT NULL DEFAULT 'PROCESSING',
ADD COLUMN "conditionalAmount" DOUBLE PRECISION,
ADD COLUMN "unconditionalAmount" DOUBLE PRECISION,
ADD COLUMN "expectedLienReleaseCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Backfill existing payments so historical records remain visible
UPDATE "ContractPayment"
SET
  "amountApproved" = "amount",
  "amountRequesting" = "amount",
  "maxPayment" = "amount",
  "submittedBy" = 'Legacy Payment',
  "billingPeriodDate" = "paymentDate",
  "pmStatus" = 'APPROVED',
  "apStatus" = 'PAID',
  "updatedAt" = COALESCE("createdAt", CURRENT_TIMESTAMP)
WHERE "amountApproved" IS NULL;

-- Attachments uploaded against payment rows
CREATE TABLE "ContractPaymentAttachment" (
  "id" TEXT NOT NULL,
  "paymentId" TEXT NOT NULL,
  "fileName" TEXT NOT NULL,
  "originalName" TEXT NOT NULL,
  "fileSize" INTEGER NOT NULL,
  "mimeType" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "kind" "ContractPaymentAttachmentKind" NOT NULL,
  "uploadedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ContractPaymentAttachment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ContractPaymentAttachment_paymentId_idx" ON "ContractPaymentAttachment"("paymentId");
CREATE INDEX "ContractPaymentAttachment_kind_idx" ON "ContractPaymentAttachment"("kind");

ALTER TABLE "ContractPaymentAttachment"
ADD CONSTRAINT "ContractPaymentAttachment_paymentId_fkey"
FOREIGN KEY ("paymentId") REFERENCES "ContractPayment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ContractPaymentAttachment"
ADD CONSTRAINT "ContractPaymentAttachment_uploadedById_fkey"
FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
