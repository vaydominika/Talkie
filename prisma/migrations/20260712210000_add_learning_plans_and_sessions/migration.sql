CREATE TYPE "ReviewRating" AS ENUM ('AGAIN','HARD','GOOD','EASY');
CREATE TYPE "FocusSessionResult" AS ENUM ('COMPLETED','RESET','SKIPPED');
CREATE TYPE "StudyPlanItemType" AS ENUM ('DUE_REVIEW','WEAK_WORDS','LESSON','LISTENING','FREE_FOCUS');
CREATE TYPE "StudyPlanItemStatus" AS ENUM ('PENDING','COMPLETED','REMOVED');

ALTER TABLE "FlashcardReviewState" RENAME TO "LegacyFlashcardReviewState";
ALTER INDEX "FlashcardReviewState_pkey" RENAME TO "LegacyFlashcardReviewState_pkey";
ALTER INDEX "FlashcardReviewState_userId_dueAt_idx" RENAME TO "LegacyFlashcardReviewState_userId_dueAt_idx";
ALTER TABLE "LegacyFlashcardReviewState" RENAME CONSTRAINT "FlashcardReviewState_userId_fkey" TO "LegacyFlashcardReviewState_userId_fkey";
CREATE TABLE "FlashcardReviewState" (
 "id" TEXT NOT NULL, "userId" TEXT NOT NULL, "vocabularyEntryId" TEXT NOT NULL,
 "state" "CardState" NOT NULL DEFAULT 'NEW', "dueAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "intervalDays" INTEGER NOT NULL DEFAULT 0, "easeFactor" DOUBLE PRECISION NOT NULL DEFAULT 2.5,
 "learningStep" INTEGER NOT NULL DEFAULT 0, "lapses" INTEGER NOT NULL DEFAULT 0,
 "successfulReviews" INTEGER NOT NULL DEFAULT 0, "totalReviews" INTEGER NOT NULL DEFAULT 0,
 "lastRating" "ReviewRating", "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "FlashcardReviewState_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "FlashcardReviewState_userId_vocabularyEntryId_key" ON "FlashcardReviewState"("userId","vocabularyEntryId");
CREATE INDEX "FlashcardReviewState_userId_dueAt_idx" ON "FlashcardReviewState"("userId","dueAt");
ALTER TABLE "FlashcardReviewState" ADD CONSTRAINT "FlashcardReviewState_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FlashcardReviewState" ADD CONSTRAINT "FlashcardReviewState_vocabularyEntryId_fkey" FOREIGN KEY ("vocabularyEntryId") REFERENCES "VocabularyEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "StudyPlan" (
 "id" TEXT NOT NULL, "userId" TEXT NOT NULL, "dateKey" TEXT NOT NULL, "timezone" TEXT NOT NULL,
 "durationMinutes" INTEGER NOT NULL, "languageId" TEXT, "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "StudyPlan_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "StudyPlan_userId_dateKey_key" ON "StudyPlan"("userId","dateKey");
ALTER TABLE "StudyPlan" ADD CONSTRAINT "StudyPlan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudyPlan" ADD CONSTRAINT "StudyPlan_languageId_fkey" FOREIGN KEY ("languageId") REFERENCES "Language"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE TABLE "StudyPlanItem" (
 "id" TEXT NOT NULL, "planId" TEXT NOT NULL, "type" "StudyPlanItemType" NOT NULL, "title" TEXT NOT NULL,
 "description" TEXT, "href" TEXT, "referenceId" TEXT, "estimatedMinutes" INTEGER NOT NULL, "position" INTEGER NOT NULL,
 "status" "StudyPlanItemStatus" NOT NULL DEFAULT 'PENDING', "metadata" JSONB,
 CONSTRAINT "StudyPlanItem_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "StudyPlanItem_planId_position_key" ON "StudyPlanItem"("planId","position");
ALTER TABLE "StudyPlanItem" ADD CONSTRAINT "StudyPlanItem_planId_fkey" FOREIGN KEY ("planId") REFERENCES "StudyPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "FocusStudySession" (
 "id" TEXT NOT NULL, "sessionKey" TEXT NOT NULL, "userId" TEXT NOT NULL, "dateKey" TEXT NOT NULL, "timezone" TEXT NOT NULL,
 "startedAt" TIMESTAMP(3) NOT NULL, "endedAt" TIMESTAMP(3), "focusedSeconds" INTEGER NOT NULL DEFAULT 0,
 "result" "FocusSessionResult", "languageId" TEXT, "groupId" TEXT, "planItemId" TEXT, "lessonId" TEXT, "destination" TEXT,
 "recapNote" TEXT, "effort" INTEGER, "recapDismissed" BOOLEAN NOT NULL DEFAULT false,
 CONSTRAINT "FocusStudySession_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "FocusStudySession_userId_sessionKey_key" ON "FocusStudySession"("userId","sessionKey");
CREATE INDEX "FocusStudySession_userId_dateKey_startedAt_idx" ON "FocusStudySession"("userId","dateKey","startedAt");
ALTER TABLE "FocusStudySession" ADD CONSTRAINT "FocusStudySession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FocusStudySession" ADD CONSTRAINT "FocusStudySession_languageId_fkey" FOREIGN KEY ("languageId") REFERENCES "Language"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FocusStudySession" ADD CONSTRAINT "FocusStudySession_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FocusStudySession" ADD CONSTRAINT "FocusStudySession_planItemId_fkey" FOREIGN KEY ("planItemId") REFERENCES "StudyPlanItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FocusStudySession" ADD CONSTRAINT "FocusStudySession_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PersonalTimerState" ADD COLUMN "activePlanItemId" TEXT;
ALTER TABLE "PersonalTimerState" ADD COLUMN "activeLanguageId" TEXT;
ALTER TABLE "PersonalTimerState" ADD COLUMN "activeGroupId" TEXT;
ALTER TABLE "PersonalTimerState" ADD COLUMN "activeLessonId" TEXT;
ALTER TABLE "PersonalTimerState" ADD COLUMN "activeDestination" TEXT;
ALTER TABLE "PersonalTimerState" ADD COLUMN "plannedMinutes" INTEGER;
