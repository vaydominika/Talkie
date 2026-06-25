import { ContentStatus, LanguageTabType, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const coreTabs = [
  { title: "Learning", slug: "learning", type: LanguageTabType.LEARNING, position: 0 },
  { title: "Flashcards", slug: "flashcards", type: LanguageTabType.FLASHCARDS, position: 1 },
  { title: "Vocabulary", slug: "vocabulary", type: LanguageTabType.VOCABULARY, position: 2 },
  { title: "Grammar", slug: "grammar", type: LanguageTabType.GRAMMAR, position: 3 },
] as const;

async function main() {
  const languages = await prisma.language.findMany({ include: { tabs: true }, orderBy: { sidebarPosition: "asc" } });

  for (const language of languages) {
    await prisma.$transaction(async (tx) => {
      const tabs = await tx.languageTab.findMany({ where: { languageId: language.id } });
      for (const tab of tabs) {
        await tx.languageTab.update({ where: { id: tab.id }, data: { position: tab.position + 100 } });
      }

      for (const tab of coreTabs) {
        const existing = await tx.languageTab.findUnique({
          where: { languageId_slug: { languageId: language.id, slug: tab.slug } },
        });

        if (existing) {
          await tx.languageTab.update({
            where: { id: existing.id },
            data: { title: tab.title, type: tab.type, position: tab.position, status: ContentStatus.PUBLISHED },
          });
        } else {
          await tx.languageTab.create({
            data: {
              languageId: language.id,
              title: tab.title,
              slug: tab.slug,
              type: tab.type,
              position: tab.position,
              status: ContentStatus.PUBLISHED,
            },
          });
        }
      }

      const customTabs = tabs
        .filter((tab) => !coreTabs.some((coreTab) => coreTab.slug === tab.slug))
        .sort((a, b) => a.position - b.position);
      for (const [index, tab] of customTabs.entries()) {
        await tx.languageTab.update({ where: { id: tab.id }, data: { position: 10 + index } });
      }
    });
  }

  const result = await prisma.language.findMany({
    select: {
      code: true,
      name: true,
      tabs: { select: { title: true, slug: true, type: true, position: true }, orderBy: { position: "asc" } },
    },
    orderBy: { sidebarPosition: "asc" },
  });
  console.log(JSON.stringify(result, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
