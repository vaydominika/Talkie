CREATE TABLE "ListeningActivity" (
 "id" TEXT NOT NULL,"userId" TEXT NOT NULL,"languageId" TEXT NOT NULL,"dateKey" TEXT NOT NULL,"timezone" TEXT NOT NULL,
 "sourceType" TEXT NOT NULL,"sourceText" TEXT NOT NULL,"completionKey" TEXT NOT NULL,"planItemId" TEXT,"focusSessionId" TEXT,
 "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,CONSTRAINT "ListeningActivity_pkey" PRIMARY KEY("id")
);
CREATE UNIQUE INDEX "ListeningActivity_userId_completionKey_key" ON "ListeningActivity"("userId","completionKey");
CREATE INDEX "ListeningActivity_userId_dateKey_idx" ON "ListeningActivity"("userId","dateKey");
ALTER TABLE "ListeningActivity" ADD CONSTRAINT "ListeningActivity_userId_fkey" FOREIGN KEY("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ListeningActivity" ADD CONSTRAINT "ListeningActivity_languageId_fkey" FOREIGN KEY("languageId") REFERENCES "Language"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ListeningActivity" ADD CONSTRAINT "ListeningActivity_planItemId_fkey" FOREIGN KEY("planItemId") REFERENCES "StudyPlanItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ListeningActivity" ADD CONSTRAINT "ListeningActivity_focusSessionId_fkey" FOREIGN KEY("focusSessionId") REFERENCES "FocusStudySession"("id") ON DELETE SET NULL ON UPDATE CASCADE;
