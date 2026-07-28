-- Custom asset status dropdown options
CREATE TABLE "AssetStatusDefinition" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "baseStatus" "AssetStatus" NOT NULL DEFAULT 'AVAILABLE',
  "color" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "AssetStatusDefinition_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AssetStatusDefinition_companyId_name_key" ON "AssetStatusDefinition"("companyId", "name");
CREATE INDEX "AssetStatusDefinition_companyId_isActive_idx" ON "AssetStatusDefinition"("companyId", "isActive");
CREATE INDEX "AssetStatusDefinition_baseStatus_idx" ON "AssetStatusDefinition"("baseStatus");

ALTER TABLE "AssetStatusDefinition"
  ADD CONSTRAINT "AssetStatusDefinition_companyId_fkey"
  FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Asset" ADD COLUMN "statusDefinitionId" TEXT;
CREATE INDEX "Asset_statusDefinitionId_idx" ON "Asset"("statusDefinitionId");

ALTER TABLE "Asset"
  ADD CONSTRAINT "Asset_statusDefinitionId_fkey"
  FOREIGN KEY ("statusDefinitionId") REFERENCES "AssetStatusDefinition"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Configurable recipient rules for new asset issue notifications
CREATE TABLE "AssetIssueNotificationSetting" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "notifyAdmins" BOOLEAN NOT NULL DEFAULT true,
  "notifyStaff" BOOLEAN NOT NULL DEFAULT false,
  "recipientUserIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "AssetIssueNotificationSetting_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AssetIssueNotificationSetting_companyId_key" ON "AssetIssueNotificationSetting"("companyId");

ALTER TABLE "AssetIssueNotificationSetting"
  ADD CONSTRAINT "AssetIssueNotificationSetting_companyId_fkey"
  FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
