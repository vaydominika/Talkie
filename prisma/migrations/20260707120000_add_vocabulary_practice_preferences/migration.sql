-- CreateTable
CREATE TABLE "VocabularyPracticePreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "vocabularyEntryId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VocabularyPracticePreference_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VocabularyPracticePreference_userId_vocabularyEntryId_key" ON "VocabularyPracticePreference"("userId", "vocabularyEntryId");

-- CreateIndex
CREATE INDEX "VocabularyPracticePreference_userId_enabled_idx" ON "VocabularyPracticePreference"("userId", "enabled");

-- AddForeignKey
ALTER TABLE "VocabularyPracticePreference" ADD CONSTRAINT "VocabularyPracticePreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VocabularyPracticePreference" ADD CONSTRAINT "VocabularyPracticePreference_vocabularyEntryId_fkey" FOREIGN KEY ("vocabularyEntryId") REFERENCES "VocabularyEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
