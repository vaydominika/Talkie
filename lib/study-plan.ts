import { languageHref } from "@/lib/language-route";
import { prisma } from "@/lib/prisma";
import { summarizeWeakWords } from "@/lib/vocabulary-review";
import type { StudyPlanItemType } from "@prisma/client";

export type StudyPlanReplacement = {
  id: string;
  type: StudyPlanItemType;
  title: string;
  description: string;
  context: string;
  href: string | null;
  referenceId: string | null;
  metadata: Record<string, string> | null;
};

function reviewCandidate(
  mode: "due" | "weak",
  language: { id: string; code: string; name: string; nativeName: string },
  group: { id: string; name: string } | null,
  count: number,
): StudyPlanReplacement {
  const type = mode === "due" ? "DUE_REVIEW" : "WEAK_WORDS";
  const label = mode === "due" ? "due" : "weak";
  return {
    id: `${mode}:${group?.id ?? "personal"}:${language.id}`,
    type,
    title: mode === "due" ? `Review ${count} due ${language.name} ${count === 1 ? "word" : "words"}` : `Revisit ${count} weak ${language.name} ${count === 1 ? "word" : "words"}`,
    description: mode === "due" ? "Work through vocabulary scheduled for today." : "Clear recent misses and hint-used answers.",
    context: group?.name ?? "Personal vocabulary",
    href: group ? `/app/groups/${group.id}?tab=review&mode=${label}&languageId=${language.id}` : `${languageHref(language)}?mode=${label}`,
    referenceId: null,
    metadata: { languageId: language.id, ...(group ? { groupId: group.id } : {}) },
  };
}

export async function getStudyPlanReplacementOptions(userId: string, now = new Date()): Promise<StudyPlanReplacement[]> {
  const [dueStates, attempts, lessons, languages] = await Promise.all([
    prisma.flashcardReviewState.findMany({
      where: {
        userId,
        dueAt: { lte: now },
        state: { notIn: ["SUSPENDED", "BURIED"] },
        vocabularyEntry: { OR: [{ userId, groupId: null }, { group: { members: { some: { userId } } } }] },
      },
      include: { vocabularyEntry: { include: { language: true, group: { select: { id: true, name: true } } } } },
    }),
    prisma.vocabularyReviewAttempt.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 500 }),
    prisma.lesson.findMany({
      where: { unit: { course: { status: "PUBLISHED", language: { users: { some: { userId } } } } }, progress: { none: { userId, completedAt: { not: null } } } },
      include: { unit: { include: { course: { include: { language: true } } } } },
      orderBy: [{ unit: { position: "asc" } }, { position: "asc" }],
    }),
    prisma.language.findMany({ where: { users: { some: { userId } } }, orderBy: { name: "asc" } }),
  ]);

  const options: StudyPlanReplacement[] = [];
  const dueGroups = new Map<string, typeof dueStates>();
  for (const state of dueStates) {
    const word = state.vocabularyEntry;
    const key = `${word.groupId ?? "personal"}:${word.languageId}`;
    dueGroups.set(key, [...(dueGroups.get(key) ?? []), state]);
  }
  for (const group of dueGroups.values()) {
    const word = group[0].vocabularyEntry;
    options.push(reviewCandidate("due", word.language, word.group, group.length));
  }

  const weakIds = summarizeWeakWords(attempts).filter((item) => !item.cleared).map((item) => item.vocabularyEntryId);
  if (weakIds.length) {
    const weakWords = await prisma.vocabularyEntry.findMany({
      where: { id: { in: weakIds }, OR: [{ userId, groupId: null }, { group: { members: { some: { userId } } } }] },
      include: { language: true, group: { select: { id: true, name: true } } },
    });
    const weakGroups = new Map<string, typeof weakWords>();
    for (const word of weakWords) {
      const key = `${word.groupId ?? "personal"}:${word.languageId}`;
      weakGroups.set(key, [...(weakGroups.get(key) ?? []), word]);
    }
    for (const group of weakGroups.values()) options.push(reviewCandidate("weak", group[0].language, group[0].group, group.length));
  }

  const lessonLanguages = new Set<string>();
  for (const lesson of lessons) {
    const language = lesson.unit.course.language;
    if (lessonLanguages.has(language.id)) continue;
    lessonLanguages.add(language.id);
    options.push({
      id: `lesson:${lesson.id}`,
      type: "LESSON",
      title: lesson.title,
      description: `Continue ${lesson.unit.course.title}.`,
      context: language.name,
      href: `/app/lessons/${lesson.id}`,
      referenceId: lesson.id,
      metadata: { languageId: language.id },
    });
  }

  for (const language of languages) {
    options.push({
      id: `listening:${language.id}`,
      type: "LISTENING",
      title: `${language.name} listening`,
      description: "Listen, repeat, and shadow a short phrase.",
      context: language.name,
      href: `/app/listening?language=${language.id}`,
      referenceId: language.id,
      metadata: { languageId: language.id },
    });
  }

  options.push({
    id: "free-focus",
    type: "FREE_FOCUS",
    title: "Open focus",
    description: "Use this time for the work that matters most today.",
    context: "Any activity",
    href: null,
    referenceId: null,
    metadata: null,
  });
  return options;
}
