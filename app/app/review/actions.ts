"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function saveVocabularyReviewAttempt(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const vocabularyEntryId = String(formData.get("wordId") ?? "");
  const languageId = String(formData.get("languageId") ?? "");
  const groupId = String(formData.get("groupId") ?? "") || null;
  const displayForm = String(formData.get("displayForm") ?? "");
  const prompt = String(formData.get("prompt") ?? "");
  const expected = String(formData.get("expected") ?? "");
  const answer = String(formData.get("answer") ?? "");
  const direction = String(formData.get("direction") ?? "");
  const correct = formData.get("correct") === "true";
  const usedHint = formData.get("usedHint") === "true";

  if (!vocabularyEntryId || !languageId || !displayForm || !prompt || !expected || !direction) {
    throw new Error("Missing attempt data");
  }

  await prisma.vocabularyReviewAttempt.create({
    data: {
      userId: session.user.id,
      vocabularyEntryId,
      languageId,
      groupId,
      displayForm,
      prompt,
      expected,
      answer,
      direction,
      correct,
      usedHint,
    },
  });
}

export async function resetVocabularyReviewAttempts(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const languageId = String(formData.get("languageId") ?? "");
  const groupIdValue = String(formData.get("groupId") ?? "");
  const groupId = groupIdValue || null;

  if (!languageId) throw new Error("Missing language");

  await prisma.vocabularyReviewAttempt.deleteMany({
    where: {
      userId: session.user.id,
      languageId,
      groupId,
    },
  });

  revalidatePath("/app/review");
  revalidatePath("/app/dashboard");
}

