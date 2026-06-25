-- CreateEnum
CREATE TYPE "LanguageTabType" AS ENUM ('LEARNING', 'VOCABULARY', 'GRAMMAR', 'CUSTOM');

-- CreateEnum
CREATE TYPE "TestQuestionType" AS ENUM ('MULTIPLE_CHOICE', 'SHORT_ANSWER', 'MATCH_PAIRS', 'WORD_ORDER', 'FILL_BLANK');

-- AlterTable
ALTER TABLE "GrammarPoint" ADD COLUMN     "richContent" JSONB;

-- AlterTable
ALTER TABLE "Language" ADD COLUMN     "sidebarPosition" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "sidebarVisible" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "LanguageTab" (
    "id" TEXT NOT NULL,
    "languageId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "type" "LanguageTabType" NOT NULL DEFAULT 'CUSTOM',
    "position" INTEGER NOT NULL DEFAULT 0,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "content" JSONB,

    CONSTRAINT "LanguageTab_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaAsset" (
    "id" TEXT NOT NULL,
    "languageId" TEXT,
    "url" TEXT NOT NULL,
    "altText" TEXT,
    "kind" TEXT NOT NULL DEFAULT 'IMAGE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MediaAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LessonTest" (
    "id" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "requiredScore" INTEGER NOT NULL DEFAULT 80,
    "unlockNextLesson" BOOLEAN NOT NULL DEFAULT false,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',

    CONSTRAINT "LessonTest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LessonTestQuestion" (
    "id" TEXT NOT NULL,
    "testId" TEXT NOT NULL,
    "type" "TestQuestionType" NOT NULL,
    "prompt" TEXT NOT NULL,
    "explanation" TEXT,
    "answer" JSONB NOT NULL,
    "options" JSONB,
    "position" INTEGER NOT NULL,

    CONSTRAINT "LessonTestQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LessonTestAttempt" (
    "id" TEXT NOT NULL,
    "testId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "passed" BOOLEAN NOT NULL,
    "answers" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LessonTestAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LanguageTab_languageId_slug_key" ON "LanguageTab"("languageId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "LanguageTab_languageId_position_key" ON "LanguageTab"("languageId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "LessonTest_lessonId_key" ON "LessonTest"("lessonId");

-- CreateIndex
CREATE UNIQUE INDEX "LessonTestQuestion_testId_position_key" ON "LessonTestQuestion"("testId", "position");

-- CreateIndex
CREATE INDEX "LessonTestAttempt_userId_testId_idx" ON "LessonTestAttempt"("userId", "testId");

-- AddForeignKey
ALTER TABLE "LanguageTab" ADD CONSTRAINT "LanguageTab_languageId_fkey" FOREIGN KEY ("languageId") REFERENCES "Language"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaAsset" ADD CONSTRAINT "MediaAsset_languageId_fkey" FOREIGN KEY ("languageId") REFERENCES "Language"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonTest" ADD CONSTRAINT "LessonTest_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonTestQuestion" ADD CONSTRAINT "LessonTestQuestion_testId_fkey" FOREIGN KEY ("testId") REFERENCES "LessonTest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonTestAttempt" ADD CONSTRAINT "LessonTestAttempt_testId_fkey" FOREIGN KEY ("testId") REFERENCES "LessonTest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonTestAttempt" ADD CONSTRAINT "LessonTestAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
