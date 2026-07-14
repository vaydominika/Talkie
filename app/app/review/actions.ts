"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { scheduleReview, type Rating } from "@/lib/scheduler";
import { recordQuestEvent, userTimezone } from "@/lib/learning-loop";
import { summarizeWeakWords } from "@/lib/vocabulary-review";

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

  const prior=await prisma.vocabularyReviewAttempt.findMany({where:{userId:session.user.id,vocabularyEntryId},orderBy:{createdAt:"desc"},take:20});
  const wasWeak=summarizeWeakWords(prior).some(item=>item.vocabularyEntryId===vocabularyEntryId&&!item.cleared);
  const attempt=await prisma.vocabularyReviewAttempt.create({
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
  const timezone=await userTimezone(session.user.id);await recordQuestEvent(session.user.id,timezone,{key:`review:${attempt.id}`,type:"REVIEW",at:attempt.createdAt});if(wasWeak&&correct&&!usedHint)await recordQuestEvent(session.user.id,timezone,{key:`weak-cleared:${attempt.id}`,type:"WEAK_CLEARED",at:attempt.createdAt});
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

export async function saveVocabularyPracticePreference(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const vocabularyEntryId = String(formData.get("wordId") ?? "");
  const enabled = formData.get("enabled") === "true";

  if (!vocabularyEntryId) throw new Error("Missing word");

  const word = await prisma.vocabularyEntry.findFirst({
    where: {
      id: vocabularyEntryId,
      OR: [
        { userId: session.user.id, groupId: null },
        { group: { members: { some: { userId: session.user.id } } } },
      ],
    },
    select: { id: true },
  });
  if (!word) throw new Error("Vocabulary word not found");

  await prisma.vocabularyPracticePreference.upsert({
    where: {
      userId_vocabularyEntryId: {
        userId: session.user.id,
        vocabularyEntryId,
      },
    },
    create: {
      userId: session.user.id,
      vocabularyEntryId,
      enabled,
    },
    update: { enabled },
  });
}

export async function rateVocabularyReview(formData: FormData) {
  const session = await auth(); if (!session?.user?.id) throw new Error("Unauthorized");
  const vocabularyEntryId=String(formData.get("wordId")??""); const rating=String(formData.get("rating")??"") as Rating;
  if(!["AGAIN","HARD","GOOD","EASY"].includes(rating))throw new Error("Invalid rating");
  const word=await prisma.vocabularyEntry.findFirst({where:{id:vocabularyEntryId,OR:[{userId:session.user.id,groupId:null},{group:{members:{some:{userId:session.user.id}}}}]},select:{id:true}});if(!word)throw new Error("Word not found");
  const current=await prisma.flashcardReviewState.findUnique({where:{userId_vocabularyEntryId:{userId:session.user.id,vocabularyEntryId}}});
  const next=scheduleReview(current?{state:current.state,intervalDays:current.intervalDays,easeFactor:current.easeFactor,learningStep:current.learningStep,lapses:current.lapses,successfulReviews:current.successfulReviews,totalReviews:current.totalReviews}:{state:"NEW",intervalDays:0,easeFactor:2.5,learningStep:0,lapses:0,successfulReviews:0,totalReviews:0},rating);
  await prisma.flashcardReviewState.upsert({where:{userId_vocabularyEntryId:{userId:session.user.id,vocabularyEntryId}},update:{...next,lastRating:rating},create:{userId:session.user.id,vocabularyEntryId,...next,lastRating:rating}});
  await recordQuestEvent(session.user.id,await userTimezone(session.user.id),{key:`rating:${vocabularyEntryId}:${next.totalReviews}`,type:"REVIEW",amount:0});
  revalidatePath("/app/dashboard");
  return { dueAt: next.dueAt.toISOString(), intervalDays: next.intervalDays, state: next.state };
}
