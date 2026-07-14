"use server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { dateKey, safeTimezone } from "@/lib/timer";
import { revalidatePath } from "next/cache";
import { recordQuestEvent } from "@/lib/learning-loop";

export async function saveListeningRound(formData: FormData) {
  const session=await auth(); if(!session?.user?.id)throw new Error("Unauthorized");
  const languageId=String(formData.get("languageId")??""); const sourceText=String(formData.get("sourceText")??"").trim().slice(0,1000); const sourceType=String(formData.get("sourceType")??"USER_TEXT");const completionKey=String(formData.get("completionKey")??"").slice(0,1500);
  const language=await prisma.language.findFirst({where:{id:languageId,users:{some:{userId:session.user.id}}}}); if(!language||!sourceText)throw new Error("Listening content is required.");
  const profile=await prisma.userProfile.findUnique({where:{userId:session.user.id}}); const timezone=safeTimezone(profile?.timezone);
  const timer=await prisma.personalTimerState.findUnique({where:{userId:session.user.id}});const focus=timer?.focusSessionId?await prisma.focusStudySession.findUnique({where:{userId_sessionKey:{userId:session.user.id,sessionKey:timer.focusSessionId}}}):null;
  const activity=await prisma.listeningActivity.upsert({where:{userId_completionKey:{userId:session.user.id,completionKey}},update:{},create:{userId:session.user.id,languageId,dateKey:dateKey(new Date(),timezone),timezone,sourceType,sourceText,completionKey,planItemId:timer?.activePlanItemId??null,focusSessionId:focus?.id??null}});await recordQuestEvent(session.user.id,timezone,{key:`listening:${activity.id}`,type:"LISTENING",at:activity.completedAt,metadata:{languageId}});
  revalidatePath("/app/dashboard"); revalidatePath("/app/listening");
}
