-- CreateTable
CREATE TABLE "Folder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT NOT NULL DEFAULT '#6366f1',
    "parentId" TEXT,
    "cardId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Folder_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Folder_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Folder" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TaskInteraction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "taskId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "metadata" TEXT,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TaskInteraction_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BidRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "location" TEXT,
    "timeline" TEXT,
    "requirements" TEXT,
    "deadline" DATETIME,
    "budget" REAL,
    "shareToken" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "companyId" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "BidRequest_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "BidRequest_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Bid" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bidRequestId" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "contactName" TEXT NOT NULL,
    "contactEmail" TEXT NOT NULL,
    "contactPhone" TEXT,
    "licenseNumber" TEXT,
    "insuranceInfo" TEXT,
    "totalAmount" REAL,
    "notes" TEXT,
    "timeline" TEXT,
    "warranty" TEXT,
    "paymentTerms" TEXT,
    "lineItems" TEXT,
    "hasUploadedFile" BOOLEAN NOT NULL DEFAULT false,
    "fileName" TEXT,
    "fileUrl" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "status" TEXT NOT NULL DEFAULT 'SUBMITTED',
    "submittedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Bid_bidRequestId_fkey" FOREIGN KEY ("bidRequestId") REFERENCES "BidRequest" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BidDocument" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bidRequestId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BidDocument_bidRequestId_fkey" FOREIGN KEY ("bidRequestId") REFERENCES "BidRequest" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "BidDocument_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BidView" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bidRequestId" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "viewedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BidView_bidRequestId_fkey" FOREIGN KEY ("bidRequestId") REFERENCES "BidRequest" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "NotificationPreference" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "emailNewLead" BOOLEAN NOT NULL DEFAULT true,
    "emailProjectUpdate" BOOLEAN NOT NULL DEFAULT true,
    "emailTaskAssigned" BOOLEAN NOT NULL DEFAULT true,
    "emailTaskCompleted" BOOLEAN NOT NULL DEFAULT true,
    "emailBidReceived" BOOLEAN NOT NULL DEFAULT true,
    "emailBidStatusChange" BOOLEAN NOT NULL DEFAULT true,
    "pushNewLead" BOOLEAN NOT NULL DEFAULT false,
    "pushProjectUpdate" BOOLEAN NOT NULL DEFAULT true,
    "pushTaskAssigned" BOOLEAN NOT NULL DEFAULT true,
    "pushTaskCompleted" BOOLEAN NOT NULL DEFAULT false,
    "pushBidReceived" BOOLEAN NOT NULL DEFAULT true,
    "pushBidStatusChange" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "NotificationPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TeamInvite" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'STAFF',
    "token" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "invitedById" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "isAccepted" BOOLEAN NOT NULL DEFAULT false,
    "acceptedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TeamInvite_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TeamInvite_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Company" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "appName" TEXT NOT NULL DEFAULT 'BuildFlow CRM',
    "logo" TEXT,
    "website" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zipCode" TEXT,
    "country" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Company" ("address", "city", "country", "createdAt", "currency", "email", "id", "logo", "name", "phone", "state", "updatedAt", "website", "zipCode") SELECT "address", "city", "country", "createdAt", "currency", "email", "id", "logo", "name", "phone", "state", "updatedAt", "website", "zipCode" FROM "Company";
DROP TABLE "Company";
ALTER TABLE "new_Company" RENAME TO "Company";
CREATE TABLE "new_Document" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "folderId" TEXT,
    "isShared" BOOLEAN NOT NULL DEFAULT false,
    "shareLink" TEXT,
    "shareLinkExpiry" DATETIME,
    "cardId" TEXT NOT NULL,
    "uploaderId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Document_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Document_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "Folder" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Document_uploaderId_fkey" FOREIGN KEY ("uploaderId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Document" ("cardId", "createdAt", "fileName", "fileSize", "folderId", "id", "isShared", "mimeType", "name", "shareLink", "shareLinkExpiry", "updatedAt", "uploaderId", "url", "version") SELECT "cardId", "createdAt", "fileName", "fileSize", "folderId", "id", "isShared", "mimeType", "name", "shareLink", "shareLinkExpiry", "updatedAt", "uploaderId", "url", "version" FROM "Document";
DROP TABLE "Document";
ALTER TABLE "new_Document" RENAME TO "Document";
CREATE UNIQUE INDEX "Document_shareLink_key" ON "Document"("shareLink");
CREATE INDEX "Document_cardId_idx" ON "Document"("cardId");
CREATE INDEX "Document_folderId_idx" ON "Document"("folderId");
CREATE INDEX "Document_shareLink_idx" ON "Document"("shareLink");
CREATE TABLE "new_Message" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "content" TEXT NOT NULL,
    "isInternal" BOOLEAN NOT NULL DEFAULT false,
    "isFromClient" BOOLEAN NOT NULL DEFAULT false,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" DATETIME,
    "clientName" TEXT,
    "clientEmail" TEXT,
    "cardId" TEXT NOT NULL,
    "senderId" TEXT,
    "parentId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Message_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Message_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Message" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Message" ("cardId", "content", "createdAt", "id", "isInternal", "parentId", "senderId", "updatedAt") SELECT "cardId", "content", "createdAt", "id", "isInternal", "parentId", "senderId", "updatedAt" FROM "Message";
DROP TABLE "Message";
ALTER TABLE "new_Message" RENAME TO "Message";
CREATE INDEX "Message_cardId_idx" ON "Message"("cardId");
CREATE INDEX "Message_senderId_idx" ON "Message"("senderId");
CREATE INDEX "Message_isFromClient_idx" ON "Message"("isFromClient");
CREATE INDEX "Message_isRead_idx" ON "Message"("isRead");
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
INSERT INTO "new_Task" ("assigneeId", "cardId", "categoryId", "completedAt", "createdAt", "creatorId", "description", "dueDate", "id", "isRecurring", "priority", "recurringPattern", "status", "title", "updatedAt") SELECT "assigneeId", "cardId", "categoryId", "completedAt", "createdAt", "creatorId", "description", "dueDate", "id", "isRecurring", "priority", "recurringPattern", "status", "title", "updatedAt" FROM "Task";
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

-- CreateIndex
CREATE INDEX "Folder_cardId_idx" ON "Folder"("cardId");

-- CreateIndex
CREATE INDEX "Folder_parentId_idx" ON "Folder"("parentId");

-- CreateIndex
CREATE UNIQUE INDEX "Folder_cardId_name_parentId_key" ON "Folder"("cardId", "name", "parentId");

-- CreateIndex
CREATE INDEX "TaskInteraction_taskId_idx" ON "TaskInteraction"("taskId");

-- CreateIndex
CREATE INDEX "TaskInteraction_action_idx" ON "TaskInteraction"("action");

-- CreateIndex
CREATE INDEX "TaskInteraction_timestamp_idx" ON "TaskInteraction"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "BidRequest_shareToken_key" ON "BidRequest"("shareToken");

-- CreateIndex
CREATE INDEX "BidRequest_companyId_idx" ON "BidRequest"("companyId");

-- CreateIndex
CREATE INDEX "BidRequest_creatorId_idx" ON "BidRequest"("creatorId");

-- CreateIndex
CREATE INDEX "BidRequest_shareToken_idx" ON "BidRequest"("shareToken");

-- CreateIndex
CREATE INDEX "BidRequest_deadline_idx" ON "BidRequest"("deadline");

-- CreateIndex
CREATE INDEX "Bid_bidRequestId_idx" ON "Bid"("bidRequestId");

-- CreateIndex
CREATE INDEX "Bid_status_idx" ON "Bid"("status");

-- CreateIndex
CREATE INDEX "Bid_submittedAt_idx" ON "Bid"("submittedAt");

-- CreateIndex
CREATE INDEX "BidDocument_bidRequestId_idx" ON "BidDocument"("bidRequestId");

-- CreateIndex
CREATE INDEX "BidView_bidRequestId_idx" ON "BidView"("bidRequestId");

-- CreateIndex
CREATE INDEX "BidView_viewedAt_idx" ON "BidView"("viewedAt");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationPreference_userId_key" ON "NotificationPreference"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "TeamInvite_token_key" ON "TeamInvite"("token");

-- CreateIndex
CREATE INDEX "TeamInvite_token_idx" ON "TeamInvite"("token");

-- CreateIndex
CREATE INDEX "TeamInvite_email_idx" ON "TeamInvite"("email");

-- CreateIndex
CREATE INDEX "TeamInvite_companyId_idx" ON "TeamInvite"("companyId");
