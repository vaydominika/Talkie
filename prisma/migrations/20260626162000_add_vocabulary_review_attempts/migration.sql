-- CreateTable
CREATE TABLE "VocabularyReviewAttempt" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "vocabularyEntryId" TEXT NOT NULL,
    "languageId" TEXT NOT NULL,
    "groupId" TEXT,
    "displayForm" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "expected" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "correct" BOOLEAN NOT NULL,
    "usedHint" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VocabularyReviewAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VocabularyReviewAttempt_userId_languageId_createdAt_idx" ON "VocabularyReviewAttempt"("userId", "languageId", "createdAt");

-- CreateIndex
CREATE INDEX "VocabularyReviewAttempt_userId_groupId_createdAt_idx" ON "VocabularyReviewAttempt"("userId", "groupId", "createdAt");

-- AddForeignKey
ALTER TABLE "VocabularyReviewAttempt" ADD CONSTRAINT "VocabularyReviewAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VocabularyReviewAttempt" ADD CONSTRAINT "VocabularyReviewAttempt_vocabularyEntryId_fkey" FOREIGN KEY ("vocabularyEntryId") REFERENCES "VocabularyEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VocabularyReviewAttempt" ADD CONSTRAINT "VocabularyReviewAttempt_languageId_fkey" FOREIGN KEY ("languageId") REFERENCES "Language"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VocabularyReviewAttempt" ADD CONSTRAINT "VocabularyReviewAttempt_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;
