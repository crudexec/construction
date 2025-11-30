-- CreateTable
CREATE TABLE "DailyLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cardId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "weatherCondition" TEXT,
    "temperature" REAL,
    "weatherNotes" TEXT,
    "workCompleted" TEXT NOT NULL,
    "materialsUsed" TEXT,
    "equipment" TEXT,
    "workersOnSite" INTEGER NOT NULL DEFAULT 0,
    "workerDetails" TEXT,
    "issues" TEXT,
    "delays" TEXT,
    "safetyIncidents" TEXT,
    "photos" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DailyLog_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DailyLog_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "DailyLog_cardId_date_idx" ON "DailyLog"("cardId", "date");

-- CreateIndex
CREATE INDEX "DailyLog_authorId_idx" ON "DailyLog"("authorId");
