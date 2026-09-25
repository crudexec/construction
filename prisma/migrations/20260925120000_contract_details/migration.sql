BEGIN;
ALTER TABLE "VendorContract"
  ADD COLUMN "estimateReference" TEXT,
  ADD COLUMN "title" TEXT,
  ADD COLUMN "description" TEXT,
  ADD COLUMN "originalValueIsManual" BOOLEAN NOT NULL DEFAULT false;
COMMIT;
