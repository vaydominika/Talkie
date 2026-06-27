"use server";

import { ContentStatus, LanguageTabType, TestQuestionType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { isAdminEmail } from "@/lib/admin";
import { languageHref } from "@/lib/language-route";
import { prisma } from "@/lib/prisma";

const text = (formData: FormData, key: string) => String(formData.get(key) ?? "").trim();

const integer = (formData: FormData, key: string, fallback = 0) => {
  const value = Number.parseInt(String(formData.get(key) ?? ""), 10);
  return Number.isFinite(value) ? value : fallback;
};

const htmlToText = (html: string) =>
  html
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export async function ensureAdmin() {
  const session = await auth();
  if (session?.user.role !== "ADMIN" && !isAdminEmail(session?.user.email)) redirect("/app/dashboard");
}

async function refreshLanguage(languageId?: string) {
  revalidatePath("/app/admin");
  if (!languageId) return;
  const language = await prisma.language.findUnique({ where: { id: languageId } });
  if (language) {
    revalidatePath(`/app/admin/languages/${language.code}`);
    revalidatePath(languageHref(language));
  }
}

export async function createLanguage(formData: FormData) {
  await ensureAdmin();
  const code = text(formData, "code").toLowerCase();
  const name = text(formData, "name");
  const nativeName = text(formData, "nativeName") || name;
  const speechProvider = text(formData, "speechProvider") || "azure";
  const speechLocale = text(formData, "speechLocale");
  const speechVoiceName = text(formData, "speechVoiceName");
  if (!code || !name) return;
  const language = await prisma.language.create({
    data: {
      code,
      name,
      nativeName,
      speechProvider: speechProvider || null,
      speechLocale: speechLocale || null,
      speechVoiceName: speechVoiceName || null,
      sidebarVisible: formData.get("sidebarVisible") === "on",
      sidebarPosition: integer(formData, "sidebarPosition"),
    },
  });
  revalidatePath("/app/admin");
  redirect(`/app/admin/languages/${language.code}`);
}

export async function updateLanguage(formData: FormData) {
  await ensureAdmin();
  const id = text(formData, "id");
  if (!id) return;
  const language = await prisma.language.update({
    where: { id },
    data: {
      code: text(formData, "code").toLowerCase(),
      name: text(formData, "name"),
      nativeName: text(formData, "nativeName"),
      speechProvider: text(formData, "speechProvider") || null,
      speechLocale: text(formData, "speechLocale") || null,
      speechVoiceName: text(formData, "speechVoiceName") || null,
      sidebarVisible: formData.get("sidebarVisible") === "on",
      sidebarPosition: integer(formData, "sidebarPosition"),
    },
  });
  await refreshLanguage(language.id);
}

export async function createTab(formData: FormData) {
  await ensureAdmin();
  const languageId = text(formData, "languageId");
  const title = text(formData, "title");
  const slug = text(formData, "slug").toLowerCase().replace(/[^a-z0-9-]/g, "-");
  if (!languageId || !title || !slug) return;
  const nextPosition = await prisma.languageTab.count({ where: { languageId } });
  await prisma.languageTab.create({
    data: {
      languageId,
      title,
      slug,
      type: text(formData, "type") as LanguageTabType,
      status: text(formData, "status") as ContentStatus,
      position: integer(formData, "position", nextPosition),
      content: { note: text(formData, "content") },
    },
  });
  await refreshLanguage(languageId);
}

export async function updateTab(formData: FormData) {
  await ensureAdmin();
  const id = text(formData, "id");
  if (!id) return;
  const tab = await prisma.languageTab.update({
    where: { id },
    data: {
      title: text(formData, "title"),
      slug: text(formData, "slug").toLowerCase().replace(/[^a-z0-9-]/g, "-"),
      type: text(formData, "type") as LanguageTabType,
      status: text(formData, "status") as ContentStatus,
      content: { note: text(formData, "content") },
    },
  });
  await refreshLanguage(tab.languageId);
}

export async function createVocabulary(formData: FormData) {
  await ensureAdmin();
  const languageId = text(formData, "languageId");
  const displayForm = text(formData, "displayForm");
  const definition = text(formData, "definition");
  const pronunciation = text(formData, "pronunciation");
  const kana = text(formData, "kana");
  const romaji = text(formData, "romaji");
  const article = text(formData, "article");
  const plural = text(formData, "plural");
  const partOfSpeech = text(formData, "partOfSpeech");
  const addToFlashcards = formData.get("addToFlashcards") === "on";
  if (!languageId || !displayForm || !definition) return;
  const language = await prisma.language.findUnique({ where: { id: languageId } });
  if (!language) return;
  const duplicate = await prisma.vocabularyEntry.findFirst({
    where: {
      languageId,
      userId: null,
      groupId: null,
      displayForm: { equals: displayForm, mode: "insensitive" },
    },
  });
  if (duplicate) throw new Error(`Template vocabulary already contains "${displayForm}".`);
  await prisma.vocabularyEntry.create({
    data: {
      languageId,
      displayForm,
      definition,
      pronunciation: pronunciation || null,
      partOfSpeech: partOfSpeech || null,
      sourceMetadata: { addToFlashcards, template: true },
      translations: { create: { text: definition } },
      japanese: language.code === "ja" && kana ? { create: { kana, romaji: romaji || null } } : undefined,
      german: language.code === "de" && (article || plural) ? { create: { article: article || null, plural: plural || null } } : undefined,
    },
  });
  await refreshLanguage(languageId);
}

export async function createGrammarLesson(formData: FormData) {
  await ensureAdmin();
  const languageId = text(formData, "languageId");
  const title = text(formData, "title");
  const summary = text(formData, "summary");
  const html = text(formData, "richContent");
  if (!languageId || !title) return;
  await prisma.grammarPoint.create({
    data: {
      languageId,
      title,
      summary: summary || htmlToText(html).slice(0, 180),
      explanation: htmlToText(html),
      richContent: { html },
      status: text(formData, "status") as ContentStatus,
    },
  });
  await refreshLanguage(languageId);
}

export async function updateGrammarLesson(formData: FormData) {
  await ensureAdmin();
  const id = text(formData, "id");
  const html = text(formData, "richContent");
  if (!id) return;
  const lesson = await prisma.grammarPoint.update({
    where: { id },
    data: {
      title: text(formData, "title"),
      summary: text(formData, "summary"),
      explanation: htmlToText(html),
      richContent: { html },
      status: text(formData, "status") as ContentStatus,
    },
  });
  await refreshLanguage(lesson.languageId);
}

export async function createMedia(formData: FormData) {
  await ensureAdmin();
  const languageId = text(formData, "languageId");
  const url = text(formData, "url");
  const kind = text(formData, "kind") || "STROKE_ORDER";
  const targetKey = text(formData, "targetKey");
  if (!url) return;
  const language = languageId ? await prisma.language.findUnique({ where: { id: languageId }, select: { code: true } }) : null;
  if (kind === "STROKE_ORDER" && language?.code !== "ja") {
    throw new Error("Stroke-order images are only supported for Japanese kana and kanji.");
  }
  if (kind === "STROKE_ORDER" && !targetKey) {
    throw new Error("Stroke-order images need a kana or kanji target key.");
  }
  await prisma.mediaAsset.create({
    data: {
      languageId: languageId || null,
      url,
      altText: text(formData, "altText"),
      kind,
      targetKey: targetKey || null,
      metadata: { note: text(formData, "note") },
    },
  });
  await refreshLanguage(languageId || undefined);
}

export async function createLessonTest(formData: FormData) {
  await ensureAdmin();
  const lessonId = text(formData, "lessonId");
  const prompt = text(formData, "prompt");
  const answer = text(formData, "answer");
  if (!lessonId || !prompt || !answer) return;
  const lesson = await prisma.lesson.findUnique({ where: { id: lessonId }, include: { unit: { include: { course: true } } } });
  await prisma.lessonTest.upsert({
    where: { lessonId },
    create: {
      lessonId,
      title: text(formData, "title") || "Lesson gate",
      requiredScore: integer(formData, "requiredScore", 80),
      unlockNextLesson: formData.get("unlockNextLesson") === "on",
      status: text(formData, "status") as ContentStatus,
      questions: {
        create: {
          position: 0,
          type: text(formData, "type") as TestQuestionType,
          prompt,
          answer: { value: answer },
          options: text(formData, "options")
            ? { choices: text(formData, "options").split("\n").map((option) => option.trim()).filter(Boolean) }
            : undefined,
        },
      },
    },
    update: {
      title: text(formData, "title") || "Lesson gate",
      requiredScore: integer(formData, "requiredScore", 80),
      unlockNextLesson: formData.get("unlockNextLesson") === "on",
      status: text(formData, "status") as ContentStatus,
      questions: {
        create: {
          position: Date.now(),
          type: text(formData, "type") as TestQuestionType,
          prompt,
          answer: { value: answer },
          options: text(formData, "options")
            ? { choices: text(formData, "options").split("\n").map((option) => option.trim()).filter(Boolean) }
            : undefined,
        },
      },
    },
  });
  await refreshLanguage(lesson?.unit.course.languageId);
}
