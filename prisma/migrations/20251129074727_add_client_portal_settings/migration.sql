-- CreateTable
CREATE TABLE "ClientPortalSettings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "showProgress" BOOLEAN NOT NULL DEFAULT true,
    "showTimeline" BOOLEAN NOT NULL DEFAULT true,
    "showBudgetSummary" BOOLEAN NOT NULL DEFAULT false,
    "showProjectDescription" BOOLEAN NOT NULL DEFAULT true,
    "showTeamMembers" BOOLEAN NOT NULL DEFAULT true,
    "showTasks" BOOLEAN NOT NULL DEFAULT true,
    "showTaskAssignees" BOOLEAN NOT NULL DEFAULT false,
    "showTaskDueDates" BOOLEAN NOT NULL DEFAULT true,
    "showCompletedTasks" BOOLEAN NOT NULL DEFAULT true,
    "hideInternalTasks" BOOLEAN NOT NULL DEFAULT true,
    "showDocuments" BOOLEAN NOT NULL DEFAULT true,
    "allowedFileTypes" TEXT,
    "hideInternalDocuments" BOOLEAN NOT NULL DEFAULT true,
    "showEstimates" BOOLEAN NOT NULL DEFAULT true,
    "showEstimateDetails" BOOLEAN NOT NULL DEFAULT false,
    "showInvoices" BOOLEAN NOT NULL DEFAULT false,
    "showPayments" BOOLEAN NOT NULL DEFAULT false,
    "showMessages" BOOLEAN NOT NULL DEFAULT true,
    "showActivityFeed" BOOLEAN NOT NULL DEFAULT true,
    "hideInternalMessages" BOOLEAN NOT NULL DEFAULT true,
    "showPhotos" BOOLEAN NOT NULL DEFAULT true,
    "showWalkarounds" BOOLEAN NOT NULL DEFAULT false,
    "customWelcomeMessage" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ClientPortalSettings_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Card" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "ClientPortalSettings_projectId_key" ON "ClientPortalSettings"("projectId");

-- CreateIndex
CREATE INDEX "ClientPortalSettings_projectId_idx" ON "ClientPortalSettings"("projectId");
