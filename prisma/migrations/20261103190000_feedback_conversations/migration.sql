CREATE TYPE "FeedbackStatus" AS ENUM ('TODO', 'IN_PROGRESS', 'DONE');
CREATE TABLE "FeedbackManager" (
  "userId" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FeedbackManager_pkey" PRIMARY KEY ("userId"),
  CONSTRAINT "FeedbackManager_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE "FeedbackRequest" (
  "id" TEXT NOT NULL, "companyId" TEXT NOT NULL, "createdById" TEXT, "createdByName" TEXT NOT NULL,
  "clientId" TEXT NOT NULL, "title" TEXT NOT NULL, "pagePath" TEXT,
  "status" "FeedbackStatus" NOT NULL DEFAULT 'TODO', "version" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FeedbackRequest_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "FeedbackRequest_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "FeedbackRequest_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "FeedbackRequest_createdById_clientId_key" ON "FeedbackRequest"("createdById", "clientId");
CREATE INDEX "FeedbackRequest_companyId_status_createdAt_id_idx" ON "FeedbackRequest"("companyId", "status", "createdAt", "id");
CREATE INDEX "FeedbackRequest_createdById_createdAt_id_idx" ON "FeedbackRequest"("createdById", "createdAt", "id");
CREATE INDEX "FeedbackRequest_status_createdAt_id_idx" ON "FeedbackRequest"("status", "createdAt", "id");
CREATE TABLE "FeedbackMessage" (
  "id" TEXT NOT NULL, "requestId" TEXT NOT NULL, "authorId" TEXT, "authorName" TEXT NOT NULL,
  "fromTeam" BOOLEAN NOT NULL DEFAULT false, "clientId" TEXT NOT NULL, "body" TEXT NOT NULL,
  "kind" TEXT NOT NULL DEFAULT 'MESSAGE', "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FeedbackMessage_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "FeedbackMessage_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "FeedbackRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "FeedbackMessage_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "FeedbackMessage_authorId_clientId_key" ON "FeedbackMessage"("authorId", "clientId");
CREATE INDEX "FeedbackMessage_requestId_createdAt_id_idx" ON "FeedbackMessage"("requestId", "createdAt", "id");
