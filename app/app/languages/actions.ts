"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

type TemplateVocabularyEntry = Awaited<ReturnType<typeof getTemplateVocabulary>>[number];

async function getTemplateVocabulary(languageId: string) {
  return prisma.vocabularyEntry.findMany({
    where: { languageId, userId: null, groupId: null },
    include: { translations: true, japanese: true, german: true },
    orderBy: { displayForm: "asc" },
  });
}

function vocabularyKey(entry: { displayForm: string }) {
  return entry.displayForm.toLowerCase().trim();
}

function copiedTemplateVocabularyData(entry: TemplateVocabularyEntry, userId: string) {
  return {
    id: crypto.randomUUID(),
    userId,
    groupId: null,
    languageId: entry.languageId,
    levelId: entry.levelId,
    displayForm: entry.displayForm,
    definition: entry.definition,
    pronunciation: entry.pronunciation,
    partOfSpeech: entry.partOfSpeech,
    sourceMetadata: {
      ...(typeof entry.sourceMetadata === "object" && entry.sourceMetadata ? entry.sourceMetadata : {}),
      templateVocabularyId: entry.id,
      importedFromTemplate: true,
    },
    translations: { create: entry.translations.map((translation) => ({ text: translation.text })) },
    japanese: entry.japanese
      ? {
          create: {
            kana: entry.japanese.kana,
            romaji: entry.japanese.romaji,
            jlpt: entry.japanese.jlpt,
          },
        }
      : undefined,
    german: entry.german
      ? {
          create: {
            article: entry.german.article,
            plural: entry.german.plural,
          },
        }
      : undefined,
  };
}

async function copyTemplateVocabularyToProfile(userId: string, languageId: string) {
  const [templateVocabulary, existingVocabulary] = await Promise.all([
    getTemplateVocabulary(languageId),
    prisma.vocabularyEntry.findMany({
      where: { userId, languageId, groupId: null },
      select: { displayForm: true },
    }),
  ]);
  const existingKeys = new Set(existingVocabulary.map(vocabularyKey));

  for (const entry of templateVocabulary) {
    const key = vocabularyKey(entry);
    if (existingKeys.has(key)) continue;
    await prisma.vocabularyEntry.create({ data: copiedTemplateVocabularyData(entry, userId) });
    existingKeys.add(key);
  }
}

export async function addLanguageToProfile(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const languageId = String(formData.get("languageId") ?? "");
  if (!languageId) throw new Error("Language ID is required");

  // Check if already in profile
  const existing = await prisma.userLanguage.findUnique({
    where: {
      userId_languageId: {
        userId: session.user.id,
        languageId,
      },
    },
  });

  if (!existing) {
    await prisma.userLanguage.create({
      data: {
        userId: session.user.id,
        languageId,
      },
    });
  }

  await copyTemplateVocabularyToProfile(session.user.id, languageId);

  revalidatePath("/app/languages");
  revalidatePath("/app/dashboard");
  revalidatePath("/app/layout");
}

export async function removeLanguageFromProfile(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const languageId = String(formData.get("languageId") ?? "");
  if (!languageId) throw new Error("Language ID is required");

  // Delete UserLanguage
  await prisma.userLanguage.deleteMany({
    where: {
      userId: session.user.id,
      languageId,
    },
  });

  // Delete user's private vocabulary for that language
  await prisma.vocabularyEntry.deleteMany({
    where: {
      userId: session.user.id,
      languageId,
      groupId: null,
    },
  });

  revalidatePath("/app/languages");
  revalidatePath("/app/dashboard");
  revalidatePath("/app/layout");
}
