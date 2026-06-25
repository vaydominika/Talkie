import { Prisma, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const SOURCE = "beginner-vocabulary-v1";

type JapaneseWord = {
  displayForm: string;
  reading: string;
  meaning: string;
  partOfSpeech: string;
  category: string;
  romaji?: string;
};

type GermanWord = {
  displayForm: string;
  meaning: string;
  partOfSpeech: string;
  category: string;
  article?: "der" | "die" | "das";
  plural?: string;
};

const japaneseWords: JapaneseWord[] = [
  { displayForm: "こんにちは", reading: "こんにちは", romaji: "konnichiwa", meaning: "hello", partOfSpeech: "expression", category: "greetings" },
  { displayForm: "おはよう", reading: "おはよう", romaji: "ohayou", meaning: "good morning", partOfSpeech: "expression", category: "greetings" },
  { displayForm: "こんばんは", reading: "こんばんは", romaji: "konbanwa", meaning: "good evening", partOfSpeech: "expression", category: "greetings" },
  { displayForm: "ありがとう", reading: "ありがとう", romaji: "arigatou", meaning: "thank you", partOfSpeech: "expression", category: "greetings" },
  { displayForm: "すみません", reading: "すみません", romaji: "sumimasen", meaning: "excuse me; sorry", partOfSpeech: "expression", category: "greetings" },
  { displayForm: "はい", reading: "はい", romaji: "hai", meaning: "yes", partOfSpeech: "adverb", category: "greetings" },
  { displayForm: "いいえ", reading: "いいえ", romaji: "iie", meaning: "no", partOfSpeech: "adverb", category: "greetings" },
  { displayForm: "一", reading: "いち", romaji: "ichi", meaning: "one", partOfSpeech: "number", category: "numbers" },
  { displayForm: "二", reading: "に", romaji: "ni", meaning: "two", partOfSpeech: "number", category: "numbers" },
  { displayForm: "三", reading: "さん", romaji: "san", meaning: "three", partOfSpeech: "number", category: "numbers" },
  { displayForm: "四", reading: "よん", romaji: "yon", meaning: "four", partOfSpeech: "number", category: "numbers" },
  { displayForm: "五", reading: "ご", romaji: "go", meaning: "five", partOfSpeech: "number", category: "numbers" },
  { displayForm: "母", reading: "はは", romaji: "haha", meaning: "my mother", partOfSpeech: "noun", category: "family" },
  { displayForm: "父", reading: "ちち", romaji: "chichi", meaning: "my father", partOfSpeech: "noun", category: "family" },
  { displayForm: "兄", reading: "あに", romaji: "ani", meaning: "my older brother", partOfSpeech: "noun", category: "family" },
  { displayForm: "姉", reading: "あね", romaji: "ane", meaning: "my older sister", partOfSpeech: "noun", category: "family" },
  { displayForm: "家族", reading: "かぞく", romaji: "kazoku", meaning: "family", partOfSpeech: "noun", category: "family" },
  { displayForm: "水", reading: "みず", romaji: "mizu", meaning: "water", partOfSpeech: "noun", category: "food and drinks" },
  { displayForm: "お茶", reading: "おちゃ", romaji: "ocha", meaning: "tea", partOfSpeech: "noun", category: "food and drinks" },
  { displayForm: "ご飯", reading: "ごはん", romaji: "gohan", meaning: "rice; meal", partOfSpeech: "noun", category: "food and drinks" },
  { displayForm: "パン", reading: "パン", romaji: "pan", meaning: "bread", partOfSpeech: "noun", category: "food and drinks" },
  { displayForm: "魚", reading: "さかな", romaji: "sakana", meaning: "fish", partOfSpeech: "noun", category: "food and drinks" },
  { displayForm: "肉", reading: "にく", romaji: "niku", meaning: "meat", partOfSpeech: "noun", category: "food and drinks" },
  { displayForm: "家", reading: "いえ", romaji: "ie", meaning: "house; home", partOfSpeech: "noun", category: "home" },
  { displayForm: "部屋", reading: "へや", romaji: "heya", meaning: "room", partOfSpeech: "noun", category: "home" },
  { displayForm: "机", reading: "つくえ", romaji: "tsukue", meaning: "desk", partOfSpeech: "noun", category: "home" },
  { displayForm: "椅子", reading: "いす", romaji: "isu", meaning: "chair", partOfSpeech: "noun", category: "home" },
  { displayForm: "本", reading: "ほん", romaji: "hon", meaning: "book", partOfSpeech: "noun", category: "school and work" },
  { displayForm: "学校", reading: "がっこう", romaji: "gakkou", meaning: "school", partOfSpeech: "noun", category: "school and work" },
  { displayForm: "先生", reading: "せんせい", romaji: "sensei", meaning: "teacher", partOfSpeech: "noun", category: "school and work" },
  { displayForm: "学生", reading: "がくせい", romaji: "gakusei", meaning: "student", partOfSpeech: "noun", category: "school and work" },
  { displayForm: "仕事", reading: "しごと", romaji: "shigoto", meaning: "work; job", partOfSpeech: "noun", category: "school and work" },
  { displayForm: "駅", reading: "えき", romaji: "eki", meaning: "station", partOfSpeech: "noun", category: "travel" },
  { displayForm: "電車", reading: "でんしゃ", romaji: "densha", meaning: "train", partOfSpeech: "noun", category: "travel" },
  { displayForm: "車", reading: "くるま", romaji: "kuruma", meaning: "car", partOfSpeech: "noun", category: "travel" },
  { displayForm: "空港", reading: "くうこう", romaji: "kuukou", meaning: "airport", partOfSpeech: "noun", category: "travel" },
  { displayForm: "ホテル", reading: "ホテル", romaji: "hoteru", meaning: "hotel", partOfSpeech: "noun", category: "travel" },
  { displayForm: "今日", reading: "きょう", romaji: "kyou", meaning: "today", partOfSpeech: "noun", category: "time" },
  { displayForm: "明日", reading: "あした", romaji: "ashita", meaning: "tomorrow", partOfSpeech: "noun", category: "time" },
  { displayForm: "昨日", reading: "きのう", romaji: "kinou", meaning: "yesterday", partOfSpeech: "noun", category: "time" },
  { displayForm: "朝", reading: "あさ", romaji: "asa", meaning: "morning", partOfSpeech: "noun", category: "time" },
  { displayForm: "夜", reading: "よる", romaji: "yoru", meaning: "night", partOfSpeech: "noun", category: "time" },
  { displayForm: "食べる", reading: "たべる", romaji: "taberu", meaning: "to eat", partOfSpeech: "verb", category: "common verbs" },
  { displayForm: "飲む", reading: "のむ", romaji: "nomu", meaning: "to drink", partOfSpeech: "verb", category: "common verbs" },
  { displayForm: "行く", reading: "いく", romaji: "iku", meaning: "to go", partOfSpeech: "verb", category: "common verbs" },
  { displayForm: "来る", reading: "くる", romaji: "kuru", meaning: "to come", partOfSpeech: "verb", category: "common verbs" },
  { displayForm: "見る", reading: "みる", romaji: "miru", meaning: "to see; to watch", partOfSpeech: "verb", category: "common verbs" },
  { displayForm: "聞く", reading: "きく", romaji: "kiku", meaning: "to listen; to ask", partOfSpeech: "verb", category: "common verbs" },
  { displayForm: "買う", reading: "かう", romaji: "kau", meaning: "to buy", partOfSpeech: "verb", category: "common verbs" },
  { displayForm: "大きい", reading: "おおきい", romaji: "ookii", meaning: "big", partOfSpeech: "adjective", category: "common adjectives" },
  { displayForm: "小さい", reading: "ちいさい", romaji: "chiisai", meaning: "small", partOfSpeech: "adjective", category: "common adjectives" },
  { displayForm: "新しい", reading: "あたらしい", romaji: "atarashii", meaning: "new", partOfSpeech: "adjective", category: "common adjectives" },
  { displayForm: "古い", reading: "ふるい", romaji: "furui", meaning: "old", partOfSpeech: "adjective", category: "common adjectives" },
  { displayForm: "良い", reading: "いい", romaji: "ii", meaning: "good", partOfSpeech: "adjective", category: "common adjectives" },
  { displayForm: "悪い", reading: "わるい", romaji: "warui", meaning: "bad", partOfSpeech: "adjective", category: "common adjectives" },
];

const germanWords: GermanWord[] = [
  { displayForm: "Hallo", meaning: "hello", partOfSpeech: "expression", category: "greetings" },
  { displayForm: "Guten Morgen", meaning: "good morning", partOfSpeech: "expression", category: "greetings" },
  { displayForm: "Guten Abend", meaning: "good evening", partOfSpeech: "expression", category: "greetings" },
  { displayForm: "Danke", meaning: "thank you", partOfSpeech: "expression", category: "greetings" },
  { displayForm: "Entschuldigung", meaning: "excuse me; sorry", partOfSpeech: "expression", category: "greetings" },
  { displayForm: "ja", meaning: "yes", partOfSpeech: "adverb", category: "greetings" },
  { displayForm: "nein", meaning: "no", partOfSpeech: "adverb", category: "greetings" },
  { displayForm: "eins", meaning: "one", partOfSpeech: "number", category: "numbers" },
  { displayForm: "zwei", meaning: "two", partOfSpeech: "number", category: "numbers" },
  { displayForm: "drei", meaning: "three", partOfSpeech: "number", category: "numbers" },
  { displayForm: "vier", meaning: "four", partOfSpeech: "number", category: "numbers" },
  { displayForm: "fünf", meaning: "five", partOfSpeech: "number", category: "numbers" },
  { displayForm: "die Mutter", meaning: "mother", partOfSpeech: "noun", category: "family", article: "die", plural: "Mütter" },
  { displayForm: "der Vater", meaning: "father", partOfSpeech: "noun", category: "family", article: "der", plural: "Väter" },
  { displayForm: "der Bruder", meaning: "brother", partOfSpeech: "noun", category: "family", article: "der", plural: "Brüder" },
  { displayForm: "die Schwester", meaning: "sister", partOfSpeech: "noun", category: "family", article: "die", plural: "Schwestern" },
  { displayForm: "die Familie", meaning: "family", partOfSpeech: "noun", category: "family", article: "die", plural: "Familien" },
  { displayForm: "das Wasser", meaning: "water", partOfSpeech: "noun", category: "food and drinks", article: "das" },
  { displayForm: "der Tee", meaning: "tea", partOfSpeech: "noun", category: "food and drinks", article: "der", plural: "Tees" },
  { displayForm: "der Kaffee", meaning: "coffee", partOfSpeech: "noun", category: "food and drinks", article: "der", plural: "Kaffees" },
  { displayForm: "das Brot", meaning: "bread", partOfSpeech: "noun", category: "food and drinks", article: "das", plural: "Brote" },
  { displayForm: "der Fisch", meaning: "fish", partOfSpeech: "noun", category: "food and drinks", article: "der", plural: "Fische" },
  { displayForm: "das Fleisch", meaning: "meat", partOfSpeech: "noun", category: "food and drinks", article: "das" },
  { displayForm: "das Haus", meaning: "house", partOfSpeech: "noun", category: "home", article: "das", plural: "Häuser" },
  { displayForm: "das Zimmer", meaning: "room", partOfSpeech: "noun", category: "home", article: "das", plural: "Zimmer" },
  { displayForm: "der Tisch", meaning: "table", partOfSpeech: "noun", category: "home", article: "der", plural: "Tische" },
  { displayForm: "der Stuhl", meaning: "chair", partOfSpeech: "noun", category: "home", article: "der", plural: "Stühle" },
  { displayForm: "das Bett", meaning: "bed", partOfSpeech: "noun", category: "home", article: "das", plural: "Betten" },
  { displayForm: "das Buch", meaning: "book", partOfSpeech: "noun", category: "school and work", article: "das", plural: "Bücher" },
  { displayForm: "die Schule", meaning: "school", partOfSpeech: "noun", category: "school and work", article: "die", plural: "Schulen" },
  { displayForm: "der Lehrer", meaning: "teacher", partOfSpeech: "noun", category: "school and work", article: "der", plural: "Lehrer" },
  { displayForm: "der Student", meaning: "student", partOfSpeech: "noun", category: "school and work", article: "der", plural: "Studenten" },
  { displayForm: "die Arbeit", meaning: "work; job", partOfSpeech: "noun", category: "school and work", article: "die", plural: "Arbeiten" },
  { displayForm: "der Bahnhof", meaning: "train station", partOfSpeech: "noun", category: "travel", article: "der", plural: "Bahnhöfe" },
  { displayForm: "der Zug", meaning: "train", partOfSpeech: "noun", category: "travel", article: "der", plural: "Züge" },
  { displayForm: "das Auto", meaning: "car", partOfSpeech: "noun", category: "travel", article: "das", plural: "Autos" },
  { displayForm: "der Flughafen", meaning: "airport", partOfSpeech: "noun", category: "travel", article: "der", plural: "Flughäfen" },
  { displayForm: "das Hotel", meaning: "hotel", partOfSpeech: "noun", category: "travel", article: "das", plural: "Hotels" },
  { displayForm: "heute", meaning: "today", partOfSpeech: "adverb", category: "time" },
  { displayForm: "morgen", meaning: "tomorrow", partOfSpeech: "adverb", category: "time" },
  { displayForm: "gestern", meaning: "yesterday", partOfSpeech: "adverb", category: "time" },
  { displayForm: "der Morgen", meaning: "morning", partOfSpeech: "noun", category: "time", article: "der", plural: "Morgen" },
  { displayForm: "die Nacht", meaning: "night", partOfSpeech: "noun", category: "time", article: "die", plural: "Nächte" },
  { displayForm: "essen", meaning: "to eat", partOfSpeech: "verb", category: "common verbs" },
  { displayForm: "trinken", meaning: "to drink", partOfSpeech: "verb", category: "common verbs" },
  { displayForm: "gehen", meaning: "to go", partOfSpeech: "verb", category: "common verbs" },
  { displayForm: "kommen", meaning: "to come", partOfSpeech: "verb", category: "common verbs" },
  { displayForm: "sehen", meaning: "to see", partOfSpeech: "verb", category: "common verbs" },
  { displayForm: "hören", meaning: "to hear; to listen", partOfSpeech: "verb", category: "common verbs" },
  { displayForm: "kaufen", meaning: "to buy", partOfSpeech: "verb", category: "common verbs" },
  { displayForm: "groß", meaning: "big; tall", partOfSpeech: "adjective", category: "common adjectives" },
  { displayForm: "klein", meaning: "small", partOfSpeech: "adjective", category: "common adjectives" },
  { displayForm: "neu", meaning: "new", partOfSpeech: "adjective", category: "common adjectives" },
  { displayForm: "alt", meaning: "old", partOfSpeech: "adjective", category: "common adjectives" },
  { displayForm: "gut", meaning: "good", partOfSpeech: "adjective", category: "common adjectives" },
  { displayForm: "schlecht", meaning: "bad", partOfSpeech: "adjective", category: "common adjectives" },
];

async function ensureLevel(code: string, name: string, rank: number) {
  return prisma.proficiencyLevel.upsert({
    where: { code },
    create: { code, name, rank },
    update: { name, rank },
  });
}

async function ensureLanguage(code: string, name: string, nativeName: string, sidebarPosition: number) {
  return prisma.language.upsert({
    where: { code },
    create: { code, name, nativeName, sidebarPosition, sidebarVisible: true },
    update: { name, nativeName, sidebarPosition, sidebarVisible: true },
  });
}

function metadata(category: string): Prisma.InputJsonObject {
  return { source: SOURCE, level: "beginner", category, addToFlashcards: true };
}

async function ensureTranslation(entryId: string, text: string) {
  const existing = await prisma.vocabularyTranslation.findFirst({ where: { entryId, text } });
  if (!existing) await prisma.vocabularyTranslation.create({ data: { entryId, text } });
}

async function upsertBaseEntry({
  languageId,
  levelId,
  displayForm,
  definition,
  partOfSpeech,
  category,
}: {
  languageId: string;
  levelId: string;
  displayForm: string;
  definition: string;
  partOfSpeech: string;
  category: string;
}) {
  const existing = await prisma.vocabularyEntry.findFirst({ where: { languageId, displayForm } });
  if (existing) {
    const sourceMetadata = existing.sourceMetadata as { source?: string } | null;
    const shouldRefresh = sourceMetadata?.source === SOURCE;
    const entry = await prisma.vocabularyEntry.update({
      where: { id: existing.id },
      data: {
        levelId: existing.levelId ?? levelId,
        partOfSpeech: existing.partOfSpeech ?? partOfSpeech,
        definition: shouldRefresh ? definition : existing.definition,
        sourceMetadata: shouldRefresh || !existing.sourceMetadata ? metadata(category) : existing.sourceMetadata,
      },
    });
    await ensureTranslation(entry.id, definition);
    return { entry, created: false };
  }

  const entry = await prisma.vocabularyEntry.create({
    data: {
      languageId,
      levelId,
      displayForm,
      definition,
      partOfSpeech,
      sourceMetadata: metadata(category),
      translations: { create: { text: definition } },
    },
  });
  return { entry, created: true };
}

async function importJapanese(languageId: string, levelId: string) {
  let created = 0;
  for (const word of japaneseWords) {
    const { entry, created: wasCreated } = await upsertBaseEntry({
      languageId,
      levelId,
      displayForm: word.displayForm,
      definition: word.meaning,
      partOfSpeech: word.partOfSpeech,
      category: word.category,
    });
    await prisma.japaneseVocabularyMetadata.upsert({
      where: { entryId: entry.id },
      create: { entryId: entry.id, kana: word.reading, romaji: word.romaji ?? null, jlpt: "N5" },
      update: { kana: word.reading, romaji: word.romaji ?? null, jlpt: "N5" },
    });
    if (wasCreated) created += 1;
  }
  return created;
}

async function importGerman(languageId: string, levelId: string) {
  let created = 0;
  for (const word of germanWords) {
    const { entry, created: wasCreated } = await upsertBaseEntry({
      languageId,
      levelId,
      displayForm: word.displayForm,
      definition: word.meaning,
      partOfSpeech: word.partOfSpeech,
      category: word.category,
    });
    if (word.article || word.plural) {
      await prisma.germanVocabularyMetadata.upsert({
        where: { entryId: entry.id },
        create: { entryId: entry.id, article: word.article ?? null, plural: word.plural ?? null },
        update: { article: word.article ?? null, plural: word.plural ?? null },
      });
    }
    if (wasCreated) created += 1;
  }
  return created;
}

async function main() {
  const [n5, a1] = await Promise.all([ensureLevel("N5", "JLPT N5", 1), ensureLevel("A1", "CEFR A1", 1)]);
  const [ja, de] = await Promise.all([
    ensureLanguage("ja", "Japanese", "日本語", 1),
    ensureLanguage("de", "German", "Deutsch", 2),
  ]);

  const [createdJapanese, createdGerman] = await Promise.all([importJapanese(ja.id, n5.id), importGerman(de.id, a1.id)]);

  const [totalJapanese, totalGerman] = await Promise.all([
    prisma.vocabularyEntry.count({ where: { languageId: ja.id, sourceMetadata: { path: ["source"], equals: SOURCE } } }),
    prisma.vocabularyEntry.count({ where: { languageId: de.id, sourceMetadata: { path: ["source"], equals: SOURCE } } }),
  ]);

  console.log(JSON.stringify({ source: SOURCE, createdJapanese, createdGerman, totalJapanese, totalGerman }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
