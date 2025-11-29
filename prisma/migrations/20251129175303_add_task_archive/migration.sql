-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Task" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "dueDate" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'TODO',
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "recurringPattern" TEXT,
    "cardId" TEXT NOT NULL,
    "categoryId" TEXT,
    "assigneeId" TEXT,
    "creatorId" TEXT NOT NULL,
    "completedAt" DATETIME,
    "archivedAt" DATETIME,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "shareToken" TEXT,
    "isShareable" BOOLEAN NOT NULL DEFAULT false,
    "sharedAt" DATETIME,
    "sharedBy" TEXT,
    CONSTRAINT "Task_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Task_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "TaskCategory" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Task_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Task_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Task" ("assigneeId", "cardId", "categoryId", "completedAt", "createdAt", "creatorId", "description", "dueDate", "id", "isRecurring", "isShareable", "priority", "recurringPattern", "shareToken", "sharedAt", "sharedBy", "status", "title", "updatedAt") SELECT "assigneeId", "cardId", "categoryId", "completedAt", "createdAt", "creatorId", "description", "dueDate", "id", "isRecurring", "isShareable", "priority", "recurringPattern", "shareToken", "sharedAt", "sharedBy", "status", "title", "updatedAt" FROM "Task";
DROP TABLE "Task";
ALTER TABLE "new_Task" RENAME TO "Task";
CREATE UNIQUE INDEX "Task_shareToken_key" ON "Task"("shareToken");
CREATE INDEX "Task_cardId_idx" ON "Task"("cardId");
CREATE INDEX "Task_categoryId_idx" ON "Task"("categoryId");
CREATE INDEX "Task_assigneeId_idx" ON "Task"("assigneeId");
CREATE INDEX "Task_status_idx" ON "Task"("status");
CREATE INDEX "Task_dueDate_idx" ON "Task"("dueDate");
CREATE INDEX "Task_shareToken_idx" ON "Task"("shareToken");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
