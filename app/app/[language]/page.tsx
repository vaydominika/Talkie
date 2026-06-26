import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { LanguageTabs } from "@/components/language-tabs";
import { matchesLanguageSlug } from "@/lib/language-route";
import { prisma } from "@/lib/prisma";
import { importGroupVocabularyToProfileAction, importProfileVocabularyToGroupAction } from "../groups/actions";
import { resetVocabularyReviewAttempts, saveVocabularyReviewAttempt } from "../review/actions";
import { addPersonalVocabulary, addPersonalVocabularyBulk, deletePersonalVocabulary, updatePersonalVocabulary } from "../vocabulary/actions";

export default async function LanguagePage({ params }: { params: Promise<{ language: string }> }) {
  const session = await auth();
  if (!session?.user?.id) notFound();

  const { language: requestedLanguage } = await params;
  const languages = await prisma.language.findMany({
    where: { sidebarVisible: true },
    include: {
      tabs: {
        where: { status: "PUBLISHED" },
        orderBy: { position: "asc" },
        select: { id: true, title: true, slug: true, type: true, content: true },
      },
    },
  });
  const language = languages.find((item) => matchesLanguageSlug(item, requestedLanguage));
  if (!language) notFound();
  const currentLanguage = language;

  const [words, grammar, media, groupMemberships, reviewAttempts] = await Promise.all([
    prisma.vocabularyEntry.findMany({
      where: {
        languageId: currentLanguage.id,
        userId: session.user.id,
        groupId: null,
      },
      take: 50,
      include: { translations: true, japanese: true },
      orderBy: { displayForm: "asc" },
    }),
    prisma.grammarPoint.findMany({
      where: { languageId: currentLanguage.id, status: "PUBLISHED" },
      include: { level: true },
      orderBy: { title: "asc" },
    }),
    prisma.mediaAsset.findMany({
      where: { languageId: currentLanguage.id, kind: "STROKE_ORDER", targetKey: { not: null } },
    }),
    prisma.groupMember.findMany({
      where: {
        userId: session.user.id,
        group: {
          languages: {
            some: {
              languageId: currentLanguage.id,
            },
          },
        },
      },
      include: {
        group: {
          select: {
            id: true,
            name: true,
            allowMemberImports: true,
            vocabulary: {
              where: { languageId: currentLanguage.id },
              select: { id: true, displayForm: true, languageId: true },
            },
          },
        },
      },
      orderBy: { joinedAt: "desc" },
    }),
    prisma.vocabularyReviewAttempt.findMany({
      where: { userId: session.user.id, languageId: currentLanguage.id, groupId: null },
      orderBy: { createdAt: "desc" },
      take: 500,
    }),
  ]);

  const strokeOrderImages = Object.fromEntries(media.map((asset) => [asset.targetKey!, asset.url]));
  const personalKeys = new Set(words.map((word) => word.displayForm.toLowerCase().trim()));
  const groupSyncTargets = groupMemberships.map((membership) => ({
    id: membership.group.id,
    name: membership.group.name,
    wordCount: membership.group.vocabulary.length,
    mineToGroupCount: words.filter(
      (word) => !membership.group.vocabulary.some((groupWord) => groupWord.displayForm.toLowerCase().trim() === word.displayForm.toLowerCase().trim()),
    ).length,
    groupToMineCount: membership.group.vocabulary.filter((word) => !personalKeys.has(word.displayForm.toLowerCase().trim())).length,
    canImportToGroup:
      membership.role === "OWNER" ||
      membership.role === "ADMIN" ||
      membership.group.allowMemberImports,
  }));

  return (
    <>
      <h1 className="text-3xl font-semibold">{currentLanguage.name}</h1>
      <p className="mt-1 text-muted-foreground">
        {currentLanguage.nativeName} · Learn, review vocabulary, and study grammar.
      </p>
      <div className="mt-6">
        <LanguageTabs
          language={currentLanguage.name}
          languageCode={currentLanguage.code}
          tabs={currentLanguage.tabs}
          words={words}
          grammar={grammar}
          addWord={addPersonalVocabulary}
          addWordsBulk={addPersonalVocabularyBulk}
          updateWord={updatePersonalVocabulary}
          deleteWord={deletePersonalVocabulary}
          languageId={currentLanguage.id}
          groupSyncTargets={groupSyncTargets}
          reviewAttempts={reviewAttempts}
          saveAttemptAction={saveVocabularyReviewAttempt}
          resetAttemptsAction={resetVocabularyReviewAttempts}
          importGroupVocabularyToProfileAction={importGroupVocabularyToProfileAction}
          importProfileVocabularyToGroupAction={importProfileVocabularyToGroupAction}
          strokeOrderImages={strokeOrderImages}
        />
      </div>
    </>
  );
}
