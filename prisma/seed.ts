import { ContentStatus, PrismaClient, TestQuestionType } from "@prisma/client";

const prisma = new PrismaClient();

const japaneseWords = [
  ["こんにちは", "こんにちは", "hello"],
  ["私", "わたし", "I; me"],
  ["学生", "がくせい", "student"],
  ["先生", "せんせい", "teacher"],
  ["日本", "にほん", "Japan"],
  ["水", "みず", "water"],
  ["食べる", "たべる", "to eat"],
  ["飲む", "のむ", "to drink"],
  ["大きい", "おおきい", "big"],
  ["小さい", "ちいさい", "small"],
] as const;

const germanWords = [
  ["Hallo", "hello", ""],
  ["ich", "I", ""],
  ["Student", "student", "der"],
  ["Lehrerin", "teacher", "die"],
  ["Wasser", "water", "das"],
  ["essen", "to eat", ""],
  ["trinken", "to drink", ""],
  ["groß", "big", ""],
  ["klein", "small", ""],
  ["gehen", "to go", ""],
] as const;

async function resetContent() {
  await prisma.lessonTestAttempt.deleteMany();
  await prisma.lessonTestQuestion.deleteMany();
  await prisma.lessonTest.deleteMany();
  await prisma.lessonProgress.deleteMany();
  await prisma.lessonBlock.deleteMany();
  await prisma.lesson.deleteMany();
  await prisma.courseUnit.deleteMany();
  await prisma.course.deleteMany();
  await prisma.languageTab.deleteMany();
  await prisma.mediaAsset.deleteMany();
  await prisma.grammarPoint.deleteMany();
  await prisma.vocabularyTranslation.deleteMany();
  await prisma.japaneseVocabularyMetadata.deleteMany();
  await prisma.germanVocabularyMetadata.deleteMany();
  await prisma.vocabularyEntry.deleteMany();
  await prisma.proficiencyLevel.deleteMany();
  await prisma.language.deleteMany();
}

async function main() {
  await resetContent();

  const [n5, a1] = await Promise.all([
    prisma.proficiencyLevel.create({ data: { code: "N5", name: "JLPT N5", rank: 1 } }),
    prisma.proficiencyLevel.create({ data: { code: "A1", name: "CEFR A1", rank: 1 } }),
  ]);

  const ja = await prisma.language.create({
    data: {
      code: "ja",
      name: "Japanese",
      nativeName: "日本語",
      sidebarPosition: 1,
      tabs: {
        create: [
          { title: "Learning", slug: "learning", type: "LEARNING", position: 0, status: "PUBLISHED" },
          { title: "Flashcards", slug: "flashcards", type: "FLASHCARDS", position: 1, status: "PUBLISHED" },
          { title: "Vocabulary", slug: "vocabulary", type: "VOCABULARY", position: 2, status: "PUBLISHED" },
          { title: "Grammar", slug: "grammar", type: "GRAMMAR", position: 3, status: "PUBLISHED" },
        ],
      },
    },
  });

  const de = await prisma.language.create({
    data: {
      code: "de",
      name: "German",
      nativeName: "Deutsch",
      sidebarPosition: 2,
      tabs: {
        create: [
          { title: "Learning", slug: "learning", type: "LEARNING", position: 0, status: "PUBLISHED" },
          { title: "Flashcards", slug: "flashcards", type: "FLASHCARDS", position: 1, status: "PUBLISHED" },
          { title: "Vocabulary", slug: "vocabulary", type: "VOCABULARY", position: 2, status: "PUBLISHED" },
          { title: "Grammar", slug: "grammar", type: "GRAMMAR", position: 3, status: "PUBLISHED" },
        ],
      },
    },
  });

  for (const [displayForm, kana, definition] of japaneseWords) {
    await prisma.vocabularyEntry.create({
      data: {
        languageId: ja.id,
        levelId: n5.id,
        displayForm,
        definition,
        translations: { create: { text: definition } },
        japanese: { create: { kana } },
      },
    });
  }

  for (const [displayForm, definition, article] of germanWords) {
    await prisma.vocabularyEntry.create({
      data: {
        languageId: de.id,
        levelId: a1.id,
        displayForm,
        definition,
        translations: { create: { text: definition } },
        german: article ? { create: { article } } : undefined,
      },
    });
  }

  await prisma.grammarPoint.createMany({
    data: [
      {
        languageId: ja.id,
        levelId: n5.id,
        title: "は as a topic marker",
        summary: "Use は to mark what the sentence is about.",
        explanation: "は points to the topic. It is written は but pronounced wa when used as a particle.",
        richContent: { html: "<h3>は marks the topic</h3><p>私は学生です。= I am a student.</p>" },
        status: ContentStatus.PUBLISHED,
      },
      {
        languageId: de.id,
        levelId: a1.id,
        title: "Nominative articles",
        summary: "German nouns use der, die, or das in the nominative case.",
        explanation: "Use nominative articles for the subject of the sentence.",
        richContent: { html: "<h3>Articles name the noun's gender</h3><p>Der Tisch ist groß.</p>" },
        status: ContentStatus.PUBLISHED,
      },
    ],
  });

  const japaneseCourse = await prisma.course.create({
    data: {
      languageId: ja.id,
      levelId: n5.id,
      slug: "japanese-n5-foundations",
      title: "Japanese N5 foundations",
      description: "Start reading kana and building simple Japanese sentences.",
      status: ContentStatus.PUBLISHED,
      units: {
        create: [
          {
            title: "Kana and first sentences",
            position: 1,
            lessons: {
              create: [
                {
                  title: "Meet kana",
                  position: 1,
                  blocks: {
                    create: [
                      { position: 1, title: "Goal", content: "Recognize basic kana and type their romaji." },
                      { position: 2, title: "Practice", content: "Use the Japanese learning tab for kana sprint practice." },
                    ],
                  },
                },
                {
                  title: "Simple introductions",
                  position: 2,
                  blocks: {
                    create: [
                      { position: 1, title: "Pattern", content: "私は学生です。means “I am a student.”" },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
    include: { units: { include: { lessons: true } } },
  });

  await prisma.course.create({
    data: {
      languageId: de.id,
      levelId: a1.id,
      slug: "german-a1-foundations",
      title: "German A1 foundations",
      description: "Build a practical base for everyday German.",
      status: ContentStatus.PUBLISHED,
      units: {
        create: [
          {
            title: "First words",
            position: 1,
            lessons: {
              create: [
                {
                  title: "Articles and nouns",
                  position: 1,
                  blocks: { create: [{ position: 1, title: "Goal", content: "Learn der, die, and das with common nouns." }] },
                },
              ],
            },
          },
        ],
      },
    },
  });

  const firstJapaneseLesson = japaneseCourse.units[0]?.lessons[0];
  if (firstJapaneseLesson) {
    await prisma.lessonTest.create({
      data: {
        lessonId: firstJapaneseLesson.id,
        title: "Kana checkpoint",
        requiredScore: 80,
        unlockNextLesson: true,
        status: ContentStatus.PUBLISHED,
        questions: {
          create: [
            {
              position: 1,
              type: TestQuestionType.SHORT_ANSWER,
              prompt: "What is the romaji for あ?",
              answer: { value: "a" },
            },
          ],
        },
      },
    });
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
