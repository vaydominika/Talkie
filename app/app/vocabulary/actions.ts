"use server";

import { auth } from "@/auth";
import { languageHref } from "@/lib/language-route";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

async function currentUserId() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session.user.id;
}

async function revalidateVocabularyLanguage(languageId: string) {
  const language = await prisma.language.findUnique({
    where: { id: languageId },
    select: { code: true, name: true, nativeName: true },
  });
  if (language) revalidatePath(languageHref(language));
  revalidatePath("/app/vocabulary");
  revalidatePath("/app/dashboard");
}

export async function addPersonalVocabulary(formData: FormData) {
  const userId = await currentUserId();
  const id = String(formData.get("id") ?? crypto.randomUUID());
  const languageId = String(formData.get("languageId") ?? "");
  const word = String(formData.get("word") ?? "").trim();
  const meaning = String(formData.get("meaning") ?? "").trim();
  const addToFlashcards = formData.get("addToFlashcards") !== "off";

  if (!languageId || !word || !meaning) throw new Error("All fields are required");

  const existing = await prisma.vocabularyEntry.findFirst({
    where: {
      userId,
      groupId: null,
      languageId,
      displayForm: { equals: word, mode: "insensitive" },
    },
  });
  if (existing) return;

  await prisma.vocabularyEntry.create({
    data: {
      id,
      languageId,
      userId,
      displayForm: word,
      definition: meaning,
      sourceMetadata: { addToFlashcards },
      translations: { create: { text: meaning } },
    },
  });
  await revalidateVocabularyLanguage(languageId);
}

function parseBulkVocabulary(raw: FormDataEntryValue | null) {
  const parsed = JSON.parse(String(raw ?? "[]")) as unknown;
  if (!Array.isArray(parsed)) throw new Error("JSON must be an array of words.");

  return parsed
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const record = item as Record<string, unknown>;
      const word = String(record.word ?? record.displayForm ?? "").trim();
      const translationList = Array.isArray(record.translations)
        ? record.translations.map((translation) =>
            typeof translation === "string" ? translation : String((translation as Record<string, unknown>)?.text ?? ""),
          )
        : [];
      const meaning = String(record.meaning ?? record.definition ?? translationList[0] ?? "").trim();
      if (!word || !meaning) return null;
      return { word, meaning };
    })
    .filter((item): item is { word: string; meaning: string } => Boolean(item));
}

export async function addPersonalVocabularyBulk(formData: FormData) {
  const userId = await currentUserId();
  const languageId = String(formData.get("languageId") ?? "");
  const entries = parseBulkVocabulary(formData.get("vocabularyJson"));

  if (!languageId) throw new Error("Missing language.");
  if (entries.length === 0) throw new Error("No valid words found.");

  const existing = await prisma.vocabularyEntry.findMany({
    where: { userId, groupId: null, languageId },
    select: { displayForm: true },
  });
  const seen = new Set(existing.map((word) => word.displayForm.toLowerCase().trim()));

  for (const entry of entries) {
    const key = entry.word.toLowerCase().trim();
    if (seen.has(key)) continue;
    await prisma.vocabularyEntry.create({
      data: {
        id: crypto.randomUUID(),
        languageId,
        userId,
        displayForm: entry.word,
        definition: entry.meaning,
        sourceMetadata: { addToFlashcards: true, bulkJson: true },
        translations: { create: { text: entry.meaning } },
      },
    });
    seen.add(key);
  }

  await revalidateVocabularyLanguage(languageId);
}

export async function updatePersonalVocabulary(formData: FormData) {
  const userId = await currentUserId();
  const wordId = String(formData.get("wordId") ?? "");
  const word = String(formData.get("word") ?? "").trim();
  const meaning = String(formData.get("meaning") ?? "").trim();
  if (!wordId || !word || !meaning) throw new Error("All fields are required");

  const existingWord = await prisma.vocabularyEntry.findFirst({
    where: { id: wordId, userId, groupId: null },
    select: { id: true, languageId: true },
  });
  if (!existingWord) throw new Error("Vocabulary word not found");

  const duplicate = await prisma.vocabularyEntry.findFirst({
    where: {
      userId,
      groupId: null,
      languageId: existingWord.languageId,
      id: { not: wordId },
      displayForm: { equals: word, mode: "insensitive" },
    },
  });
  if (duplicate) throw new Error("This word already exists");

  await prisma.$transaction([
    prisma.vocabularyEntry.update({
      where: { id: wordId },
      data: { displayForm: word, definition: meaning },
    }),
    prisma.vocabularyTranslation.deleteMany({ where: { entryId: wordId } }),
    prisma.vocabularyTranslation.create({ data: { entryId: wordId, text: meaning } }),
  ]);
  await revalidateVocabularyLanguage(existingWord.languageId);
}

export async function deletePersonalVocabulary(formData: FormData) {
  const userId = await currentUserId();
  const wordId = String(formData.get("wordId") ?? "");
  if (!wordId) throw new Error("Missing word");

  const word = await prisma.vocabularyEntry.findFirst({
    where: { id: wordId, userId, groupId: null },
    select: { languageId: true },
  });
  if (!word) return;

  await prisma.vocabularyEntry.deleteMany({ where: { id: wordId, userId, groupId: null } });
  await revalidateVocabularyLanguage(word.languageId);
}
