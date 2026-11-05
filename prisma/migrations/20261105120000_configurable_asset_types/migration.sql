-- Preserve all existing asset type values while allowing company-managed options.
ALTER TABLE "Asset" ALTER COLUMN "type" TYPE TEXT USING "type"::text;
CREATE TABLE "AssetTypeDefinition" (
  "companyId" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "nameKey" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AssetTypeDefinition_pkey" PRIMARY KEY ("companyId", "key"),
  CONSTRAINT "AssetTypeDefinition_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "AssetTypeDefinition_companyId_nameKey_key" ON "AssetTypeDefinition"("companyId", "nameKey");
INSERT INTO "AssetTypeDefinition" ("companyId", "key", "name", "nameKey")
SELECT c.id, v.key, v.name, lower(v.name) FROM "Company" c
CROSS JOIN (VALUES ('VEHICLE', 'Vehicle'), ('EQUIPMENT', 'Equipment'), ('TOOL', 'Tool'), ('TECHNOLOGY', 'Technology')) AS v(key, name);
CREATE INDEX "AssetRequest_status_createdAt_id_idx" ON "AssetRequest"("status", "createdAt", "id");
DROP TYPE "AssetType";
