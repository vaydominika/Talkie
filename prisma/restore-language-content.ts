import { ContentStatus, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const japaneseWords = [
  ["こんにちは", "こんにちは", "konnichiwa", "hello", "expression"],
  ["私", "わたし", "watashi", "I; me", "pronoun"],
  ["学生", "がくせい", "gakusei", "student", "noun"],
  ["先生", "せんせい", "sensei", "teacher", "noun"],
  ["日本", "にほん", "nihon", "Japan", "noun"],
  ["水", "みず", "mizu", "water", "noun"],
  ["食べる", "たべる", "taberu", "to eat", "verb"],
  ["飲む", "のむ", "nomu", "to drink", "verb"],
  ["大きい", "おおきい", "ookii", "big", "adjective"],
  ["小さい", "ちいさい", "chiisai", "small", "adjective"],
] as const;

const germanWords = [
  ["Hallo", "hello", "expression", null, null],
  ["ich", "I", "pronoun", null, null],
  ["der Student", "student", "noun", "der", "Studenten"],
  ["die Lehrerin", "teacher", "noun", "die", "Lehrerinnen"],
  ["das Wasser", "water", "noun", "das", null],
  ["essen", "to eat", "verb", null, null],
  ["trinken", "to drink", "verb", null, null],
  ["groß", "big", "adjective", null, null],
  ["klein", "small", "adjective", null, null],
  ["gehen", "to go", "verb", null, null],
] as const;

const japaneseTabs = [
  ["Learning", "learning", "LEARNING", 0],
  ["Flashcards", "flashcards", "FLASHCARDS", 1],
  ["Vocabulary", "vocabulary", "VOCABULARY", 2],
  ["Grammar", "grammar", "GRAMMAR", 3],
] as const;

const germanTabs = [
  ["Learning", "learning", "LEARNING", 0],
  ["Flashcards", "flashcards", "FLASHCARDS", 1],
  ["Vocabulary", "vocabulary", "VOCABULARY", 2],
  ["Grammar", "grammar", "GRAMMAR", 3],
] as const;

async function ensureLevel(code: string, name: string, rank: number) {
  return prisma.proficiencyLevel.upsert({
    where: { code },
    create: { code, name, rank },
    update: { name, rank },
  });
}

async function ensureLanguage({
  code,
  name,
  nativeName,
  sidebarPosition,
}: {
  code: string;
  name: string;
  nativeName: string;
  sidebarPosition: number;
}) {
  return prisma.language.upsert({
    where: { code },
    create: { code, name, nativeName, sidebarVisible: true, sidebarPosition },
    update: { name, nativeName, sidebarVisible: true, sidebarPosition },
  });
}

async function nextFreeTabPosition(languageId: string) {
  const tabs = await prisma.languageTab.findMany({
    where: { languageId },
    select: { position: true },
    orderBy: { position: "asc" },
  });
  const used = new Set(tabs.map((tab) => tab.position));
  let position = 0;
  while (used.has(position)) position += 1;
  return position;
}

async function ensureTab(
  languageId: string,
  [title, slug, type, position]: readonly [string, string, "LEARNING" | "FLASHCARDS" | "VOCABULARY" | "GRAMMAR" | "CUSTOM", number],
) {
  const existing = await prisma.languageTab.findUnique({ where: { languageId_slug: { languageId, slug } } });
  if (existing) {
    return prisma.languageTab.update({
      where: { id: existing.id },
      data: { title, type, position, status: ContentStatus.PUBLISHED },
    });
  }

  const occupied = await prisma.languageTab.findUnique({ where: { languageId_position: { languageId, position } } });
  return prisma.languageTab.create({
    data: {
      languageId,
      title,
      slug,
      type,
      position: occupied ? await nextFreeTabPosition(languageId) : position,
      status: ContentStatus.PUBLISHED,
    },
  });
}

async function ensureTranslation(entryId: string, text: string) {
  const existing = await prisma.vocabularyTranslation.findFirst({ where: { entryId, text } });
  return existing ?? prisma.vocabularyTranslation.create({ data: { entryId, text } });
}

async function ensureJapaneseVocabulary(languageId: string, levelId: string) {
  for (const [displayForm, kana, romaji, definition, partOfSpeech] of japaneseWords) {
    const sourceMetadata = {
      restoredFrom: "original-hard-coded-seed",
      examples: [{ targetText: `${displayForm}。`, translation: definition }],
      flashcards: [
        { direction: "target-native", prompt: displayForm, answer: definition, alternatives: [] },
        { direction: "native-target", prompt: definition, answer: kana, alternatives: [displayForm] },
      ],
    };
    const existing = await prisma.vocabularyEntry.findFirst({ where: { languageId, displayForm } });
    const entry = existing
      ? await prisma.vocabularyEntry.update({
          where: { id: existing.id },
          data: { levelId, definition, partOfSpeech, sourceMetadata },
        })
      : await prisma.vocabularyEntry.create({
          data: { languageId, levelId, displayForm, definition, partOfSpeech, sourceMetadata },
        });

    await ensureTranslation(entry.id, definition);
    await prisma.japaneseVocabularyMetadata.upsert({
      where: { entryId: entry.id },
      create: { entryId: entry.id, kana, romaji, jlpt: "N5" },
      update: { kana, romaji, jlpt: "N5" },
    });
  }
}

async function ensureGermanVocabulary(languageId: string, levelId: string) {
  for (const [displayForm, definition, partOfSpeech, article, plural] of germanWords) {
    const sourceMetadata = {
      restoredFrom: "original-hard-coded-seed",
      flashcards: [
        { direction: "target-native", prompt: displayForm, answer: definition, alternatives: [] },
        { direction: "native-target", prompt: definition, answer: displayForm, alternatives: [] },
      ],
    };
    const existing = await prisma.vocabularyEntry.findFirst({ where: { languageId, displayForm } });
    const entry = existing
      ? await prisma.vocabularyEntry.update({
          where: { id: existing.id },
          data: { levelId, definition, partOfSpeech, sourceMetadata },
        })
      : await prisma.vocabularyEntry.create({
          data: { languageId, levelId, displayForm, definition, partOfSpeech, sourceMetadata },
        });

    await ensureTranslation(entry.id, definition);
    await prisma.germanVocabularyMetadata.upsert({
      where: { entryId: entry.id },
      create: { entryId: entry.id, article, plural },
      update: { article, plural },
    });
  }
}

async function ensureCourse(languageId: string, levelId: string, slug: string, title: string, intro: string) {
  const course = await prisma.course.upsert({
    where: { slug },
    create: { languageId, levelId, slug, title, description: intro, status: ContentStatus.PUBLISHED },
    update: { languageId, levelId, title, description: intro, status: ContentStatus.PUBLISHED },
  });

  for (const unitNumber of [1, 2, 3]) {
    const unitTitle =
      unitNumber === 1
        ? "Unit 1: Getting started"
        : unitNumber === 2
          ? "Unit 2: Everyday words"
          : "Unit 3: Put it together";
    const unit = await prisma.courseUnit.upsert({
      where: { courseId_position: { courseId: course.id, position: unitNumber } },
      create: { courseId: course.id, position: unitNumber, title: unitTitle },
      update: { title: unitTitle },
    });

    for (const lessonNumber of [1, 2, 3]) {
      const lesson = await prisma.lesson.upsert({
        where: { unitId_position: { unitId: unit.id, position: lessonNumber } },
        create: { unitId: unit.id, position: lessonNumber, title: `${title} lesson ${lessonNumber}` },
        update: { title: `${title} lesson ${lessonNumber}` },
      });

      const blocks = [
        ["HEADING", `Welcome to lesson ${lessonNumber}`],
        ["RICH_TEXT", intro],
        ["CHECKPOINT", "Review the key ideas before continuing."],
      ] as const;

      for (const [index, [blockType, content]] of blocks.entries()) {
        const position = index + 1;
        await prisma.lessonBlock.upsert({
          where: { lessonId_position: { lessonId: lesson.id, position } },
          create: { lessonId: lesson.id, position, title: blockType, content },
          update: { title: blockType, content },
        });
      }
    }
  }

  return course;
}

async function ensureGrammar(languageId: string, levelId: string, titles: readonly string[]) {
  for (const title of titles) {
    const summary = `A practical introduction to ${title}.`;
    const explanation = `Use ${title} to make simple, clear sentences.`;
    const sourceMetadata = {
      restoredFrom: "original-hard-coded-seed",
      pattern: title,
      exercise: {
        type: "MULTIPLE_CHOICE",
        prompt: `Choose the correct form for ${title}.`,
        answer: "Correct answer",
        alternatives: ["Correct answer", "Common error", "Another distractor"],
      },
    };
    const existing = await prisma.grammarPoint.findFirst({ where: { languageId, title } });
    if (existing) {
      await prisma.grammarPoint.update({
        where: { id: existing.id },
        data: { levelId, summary, explanation, sourceMetadata, status: ContentStatus.PUBLISHED },
      });
    } else {
      await prisma.grammarPoint.create({
        data: { languageId, levelId, title, summary, explanation, sourceMetadata, status: ContentStatus.PUBLISHED },
      });
    }
  }
}

async function main() {
  const [n5, n4, n3, n2, n1, a1, a2, b1, b2, c1, c2] = await Promise.all([
    ensureLevel("N5", "N5", 0),
    ensureLevel("N4", "N4", 1),
    ensureLevel("N3", "N3", 2),
    ensureLevel("N2", "N2", 3),
    ensureLevel("N1", "N1", 4),
    ensureLevel("A1", "A1", 0),
    ensureLevel("A2", "A2", 1),
    ensureLevel("B1", "B1", 2),
    ensureLevel("B2", "B2", 3),
    ensureLevel("C1", "C1", 4),
    ensureLevel("C2", "C2", 5),
  ]);
  void [n4, n3, n2, n1, a2, b1, b2, c1, c2];

  const ja = await ensureLanguage({ code: "ja", name: "Japanese", nativeName: "日本語", sidebarPosition: 1 });
  const de = await ensureLanguage({ code: "de", name: "German", nativeName: "Deutsch", sidebarPosition: 2 });

  for (const tab of japaneseTabs) await ensureTab(ja.id, tab);
  for (const tab of germanTabs) await ensureTab(de.id, tab);

  await ensureJapaneseVocabulary(ja.id, n5.id);
  await ensureGermanVocabulary(de.id, a1.id);

  await ensureCourse(
    ja.id,
    n5.id,
    "japanese-n5-foundations",
    "Japanese N5 foundations",
    "Start reading and using everyday Japanese.",
  );
  await ensureCourse(
    de.id,
    a1.id,
    "german-a1-foundations",
    "German A1 foundations",
    "Build a practical foundation for everyday German.",
  );

  await ensureGrammar(ja.id, n5.id, ["は: topic marker", "です: polite copula", "を: object marker"]);
  await ensureGrammar(de.id, a1.id, ["Nominative articles", "Accusative articles", "Present-tense verb endings"]);

  console.log("Restored Japanese and German hard-coded content idempotently.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
