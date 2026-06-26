-- CreateTable
CREATE TABLE "GroupLanguage" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "languageId" TEXT NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GroupLanguage_pkey" PRIMARY KEY ("id")
);

-- Backfill languages already represented by group vocabulary.
INSERT INTO "GroupLanguage" ("id", "groupId", "languageId")
SELECT md5(random()::text || clock_timestamp()::text || "groupId" || "languageId"), "groupId", "languageId"
FROM (
    SELECT DISTINCT "groupId", "languageId"
    FROM "VocabularyEntry"
    WHERE "groupId" IS NOT NULL
) AS existing_group_languages;

-- CreateIndex
CREATE UNIQUE INDEX "GroupLanguage_groupId_languageId_key" ON "GroupLanguage"("groupId", "languageId");

-- AddForeignKey
ALTER TABLE "GroupLanguage" ADD CONSTRAINT "GroupLanguage_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupLanguage" ADD CONSTRAINT "GroupLanguage_languageId_fkey" FOREIGN KEY ("languageId") REFERENCES "Language"("id") ON DELETE CASCADE ON UPDATE CASCADE;
