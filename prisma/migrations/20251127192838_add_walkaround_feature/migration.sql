-- CreateTable
CREATE TABLE "Walkaround" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "startTime" DATETIME NOT NULL,
    "endTime" DATETIME,
    "audioUrl" TEXT,
    "transcript" TEXT,
    "summary" TEXT,
    "reportUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'IN_PROGRESS',
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Walkaround_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Card" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Walkaround_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WalkaroundPhoto" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "walkaroundId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "thumbnailUrl" TEXT,
    "timestamp" DATETIME NOT NULL,
    "location" TEXT,
    "caption" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WalkaroundPhoto_walkaroundId_fkey" FOREIGN KEY ("walkaroundId") REFERENCES "Walkaround" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Walkaround_projectId_idx" ON "Walkaround"("projectId");

-- CreateIndex
CREATE INDEX "Walkaround_userId_idx" ON "Walkaround"("userId");

-- CreateIndex
CREATE INDEX "Walkaround_status_idx" ON "Walkaround"("status");

-- CreateIndex
CREATE INDEX "WalkaroundPhoto_walkaroundId_idx" ON "WalkaroundPhoto"("walkaroundId");
