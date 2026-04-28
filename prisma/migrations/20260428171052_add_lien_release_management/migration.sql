DO $$
BEGIN
  CREATE TYPE "LienReleaseType" AS ENUM (
    'CONDITIONAL_PROGRESS',
    'UNCONDITIONAL_PROGRESS',
    'CONDITIONAL_FINAL',
    'UNCONDITIONAL_FINAL'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "LienReleaseStatus" AS ENUM (
    'DRAFT',
    'REQUESTED',
    'SUBMITTED',
    'UNDER_REVIEW',
    'APPROVED',
    'REJECTED',
    'VOID'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TYPE "DocumentTemplateType" ADD VALUE IF NOT EXISTS 'LIEN_RELEASE';

CREATE TABLE IF NOT EXISTS "LienRelease" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "vendorId" TEXT NOT NULL,
  "contractId" TEXT,
  "projectId" TEXT,
  "type" "LienReleaseType" NOT NULL,
  "status" "LienReleaseStatus" NOT NULL DEFAULT 'DRAFT',
  "title" TEXT,
  "amount" DOUBLE PRECISION,
  "throughDate" TIMESTAMP(3),
  "effectiveDate" TIMESTAMP(3),
  "externalPaymentRef" TEXT,
  "externalSource" TEXT,
  "requestedAt" TIMESTAMP(3),
  "submittedAt" TIMESTAMP(3),
  "reviewedAt" TIMESTAMP(3),
  "approvedAt" TIMESTAMP(3),
  "rejectedAt" TIMESTAMP(3),
  "requestedById" TEXT,
  "submittedByVendor" BOOLEAN NOT NULL DEFAULT false,
  "reviewedById" TEXT,
  "approvedById" TEXT,
  "rejectionReason" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "LienRelease_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "LienReleaseDocument" (
  "id" TEXT NOT NULL,
  "lienReleaseId" TEXT NOT NULL,
  "fileName" TEXT NOT NULL,
  "originalName" TEXT NOT NULL,
  "fileSize" INTEGER NOT NULL,
  "mimeType" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "uploadedById" TEXT,
  "uploadedByVendor" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "LienReleaseDocument_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "LienReleaseEvent" (
  "id" TEXT NOT NULL,
  "lienReleaseId" TEXT NOT NULL,
  "actorUserId" TEXT,
  "actorVendorId" TEXT,
  "eventType" TEXT NOT NULL,
  "message" TEXT,
  "metadata" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "LienReleaseEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "LienRelease_companyId_status_idx" ON "LienRelease"("companyId", "status");
CREATE INDEX IF NOT EXISTS "LienRelease_vendorId_status_idx" ON "LienRelease"("vendorId", "status");
CREATE INDEX IF NOT EXISTS "LienRelease_contractId_idx" ON "LienRelease"("contractId");
CREATE INDEX IF NOT EXISTS "LienRelease_projectId_idx" ON "LienRelease"("projectId");
CREATE INDEX IF NOT EXISTS "LienRelease_throughDate_idx" ON "LienRelease"("throughDate");
CREATE INDEX IF NOT EXISTS "LienReleaseDocument_lienReleaseId_idx" ON "LienReleaseDocument"("lienReleaseId");
CREATE INDEX IF NOT EXISTS "LienReleaseEvent_lienReleaseId_createdAt_idx" ON "LienReleaseEvent"("lienReleaseId", "createdAt");

DO $$
BEGIN
  ALTER TABLE "LienRelease"
    ADD CONSTRAINT "LienRelease_companyId_fkey"
    FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "LienRelease"
    ADD CONSTRAINT "LienRelease_vendorId_fkey"
    FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "LienRelease"
    ADD CONSTRAINT "LienRelease_contractId_fkey"
    FOREIGN KEY ("contractId") REFERENCES "VendorContract"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "LienRelease"
    ADD CONSTRAINT "LienRelease_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "Card"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "LienRelease"
    ADD CONSTRAINT "LienRelease_requestedById_fkey"
    FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "LienRelease"
    ADD CONSTRAINT "LienRelease_reviewedById_fkey"
    FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "LienRelease"
    ADD CONSTRAINT "LienRelease_approvedById_fkey"
    FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "LienReleaseDocument"
    ADD CONSTRAINT "LienReleaseDocument_lienReleaseId_fkey"
    FOREIGN KEY ("lienReleaseId") REFERENCES "LienRelease"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "LienReleaseDocument"
    ADD CONSTRAINT "LienReleaseDocument_uploadedById_fkey"
    FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "LienReleaseEvent"
    ADD CONSTRAINT "LienReleaseEvent_lienReleaseId_fkey"
    FOREIGN KEY ("lienReleaseId") REFERENCES "LienRelease"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "LienReleaseEvent"
    ADD CONSTRAINT "LienReleaseEvent_actorUserId_fkey"
    FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "LienReleaseEvent"
    ADD CONSTRAINT "LienReleaseEvent_actorVendorId_fkey"
    FOREIGN KEY ("actorVendorId") REFERENCES "Vendor"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
