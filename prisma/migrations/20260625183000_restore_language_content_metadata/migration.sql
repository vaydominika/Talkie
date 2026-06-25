-- Preserve metadata that existed in the original hard-coded Japanese/German seed.
-- This migration is additive only: nullable columns, no deletes, no rewrites.

ALTER TABLE "VocabularyEntry"
ADD COLUMN "partOfSpeech" TEXT,
ADD COLUMN "sourceMetadata" JSONB;

ALTER TABLE "JapaneseVocabularyMetadata"
ADD COLUMN "romaji" TEXT,
ADD COLUMN "jlpt" TEXT;

ALTER TABLE "GermanVocabularyMetadata"
ADD COLUMN "plural" TEXT;

ALTER TABLE "GrammarPoint"
ADD COLUMN "sourceMetadata" JSONB;
