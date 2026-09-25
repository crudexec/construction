BEGIN;
ALTER TABLE "WorkOrder" ADD COLUMN "assetId" TEXT,
  ADD COLUMN "sourceData" JSONB, ADD COLUMN "sourceCreatedByName" TEXT;
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_assetId_fkey"
  FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "WorkOrder_assetId_idx" ON "WorkOrder"("assetId");
ALTER TABLE "InventoryMaterial" ADD COLUMN "sourceData" JSONB;
CREATE TABLE "AssetServiceEntry" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "assetId" TEXT NOT NULL,
  "sourceId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "performedDate" TIMESTAMP(3) NOT NULL,
  "cost" DOUBLE PRECISION,
  "recordedByName" TEXT,
  "workOrderId" TEXT,
  "sourceData" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL,
  "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AssetServiceEntry_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "AssetServiceEntry_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "AssetServiceEntry_assetId_sourceId_key" ON "AssetServiceEntry"("assetId", "sourceId");
CREATE INDEX "AssetServiceEntry_assetId_performedDate_idx" ON "AssetServiceEntry"("assetId", "performedDate");
CREATE INDEX "AssetServiceEntry_workOrderId_idx" ON "AssetServiceEntry"("workOrderId");
COMMIT;
