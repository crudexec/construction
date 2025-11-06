-- CreateTable
CREATE TABLE "ProjectTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "title" TEXT,
    "projectDescription" TEXT,
    "contactName" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "projectAddress" TEXT,
    "projectCity" TEXT,
    "projectState" TEXT,
    "projectZipCode" TEXT,
    "projectSize" REAL,
    "projectSizeUnit" TEXT,
    "budget" REAL,
    "timeline" TEXT,
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "customFields" TEXT,
    "companyId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ProjectTemplate_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProjectTemplateCategory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT NOT NULL DEFAULT '#6366f1',
    "order" INTEGER NOT NULL DEFAULT 0,
    "templateId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ProjectTemplateCategory_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ProjectTemplate" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProjectTemplateTask" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "daysFromStart" INTEGER,
    "categoryId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ProjectTemplateTask_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ProjectTemplateCategory" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProjectTemplateFolder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT NOT NULL DEFAULT '#6366f1',
    "parentId" TEXT,
    "templateId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ProjectTemplateFolder_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ProjectTemplate" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProjectTemplateFolder_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "ProjectTemplateFolder" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProjectTemplateBudget" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "quantity" REAL NOT NULL DEFAULT 1,
    "unit" TEXT,
    "isExpense" BOOLEAN NOT NULL DEFAULT true,
    "templateId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ProjectTemplateBudget_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ProjectTemplate" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "ProjectTemplate_companyId_idx" ON "ProjectTemplate"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectTemplate_companyId_name_key" ON "ProjectTemplate"("companyId", "name");

-- CreateIndex
CREATE INDEX "ProjectTemplateCategory_templateId_idx" ON "ProjectTemplateCategory"("templateId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectTemplateCategory_templateId_name_key" ON "ProjectTemplateCategory"("templateId", "name");

-- CreateIndex
CREATE INDEX "ProjectTemplateTask_categoryId_idx" ON "ProjectTemplateTask"("categoryId");

-- CreateIndex
CREATE INDEX "ProjectTemplateFolder_templateId_idx" ON "ProjectTemplateFolder"("templateId");

-- CreateIndex
CREATE INDEX "ProjectTemplateFolder_parentId_idx" ON "ProjectTemplateFolder"("parentId");

-- CreateIndex
CREATE INDEX "ProjectTemplateBudget_templateId_idx" ON "ProjectTemplateBudget"("templateId");
