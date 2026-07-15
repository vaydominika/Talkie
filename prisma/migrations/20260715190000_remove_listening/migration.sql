DROP TABLE "ListeningActivity";

DELETE FROM "QuestEvent" WHERE "type" = 'LISTENING';
DELETE FROM "DailyQuest" WHERE "type" = 'LISTENING_ROUNDS';
DELETE FROM "StudyPlanItem" WHERE "type" = 'LISTENING';

ALTER TYPE "StudyPlanItemType" RENAME TO "StudyPlanItemType_old";
CREATE TYPE "StudyPlanItemType" AS ENUM ('DUE_REVIEW', 'WEAK_WORDS', 'LESSON', 'FREE_FOCUS');
ALTER TABLE "StudyPlanItem" ALTER COLUMN "type" TYPE "StudyPlanItemType" USING ("type"::text::"StudyPlanItemType");
DROP TYPE "StudyPlanItemType_old";

ALTER TYPE "QuestType" RENAME TO "QuestType_old";
CREATE TYPE "QuestType" AS ENUM ('DUE_REVIEWS', 'WEAK_WORDS', 'LESSON_PROGRESS', 'ACCURACY', 'FOCUS_MINUTES');
ALTER TABLE "DailyQuest" ALTER COLUMN "type" TYPE "QuestType" USING ("type"::text::"QuestType");
DROP TYPE "QuestType_old";

UPDATE "WeeklyReflection"
SET "metrics" = ("metrics" - 'listening') ||
  CASE
    WHEN "metrics"->>'needsAttention' = 'Listening practice'
      THEN jsonb_build_object('needsAttention', 'Goal consistency')
    ELSE '{}'::jsonb
  END;
