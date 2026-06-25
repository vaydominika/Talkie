import { notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { LanguageTabs } from "@/components/language-tabs";
import { languageHref, matchesLanguageSlug } from "@/lib/language-route";
import { prisma } from "@/lib/prisma";

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

  async function addWord(formData: FormData) {
    "use server";
    const userSession = await auth();
    if (!userSession?.user?.id) return;

    const id = String(formData.get("id") ?? "");
    const word = String(formData.get("word") ?? "").trim();
    const meaning = String(formData.get("meaning") ?? "").trim();
    const addToFlashcards = formData.get("addToFlashcards") === "on";
    if (!id || !word || !meaning) return;
    await prisma.vocabularyEntry.create({
      data: {
        id,
        languageId: currentLanguage.id,
        userId: userSession.user.id,
        displayForm: word,
        definition: meaning,
        sourceMetadata: { addToFlashcards },
        translations: { create: { text: meaning } },
      },
    });
    revalidatePath(languageHref(currentLanguage));
  }

  const [words, grammar, media] = await Promise.all([
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
  ]);

  const strokeOrderImages = Object.fromEntries(media.map((asset) => [asset.targetKey!, asset.url]));

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
          addWord={addWord}
          strokeOrderImages={strokeOrderImages}
        />
      </div>
    </>
  );
}
