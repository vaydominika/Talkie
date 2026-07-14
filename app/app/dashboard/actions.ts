"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { dateKey } from "@/lib/timer";
import { remainingWeekDateKeys, userTimezone, weekStartKey } from "@/lib/learning-loop";
import { languageHref } from "@/lib/language-route";
import { revalidatePath } from "next/cache";
import { getStudyPlanReplacementOptions } from "@/lib/study-plan";
import { Prisma } from "@prisma/client";

async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session.user.id;
}

export async function generateStudyPlan(formData: FormData) {
  const userId = await requireUser();
  const timezone = await userTimezone(userId);
  const key = dateKey(new Date(), timezone);
  const durationMinutes = Math.max(5, Math.min(240, Number(formData.get("durationMinutes")) || 30));
  const languageId = String(formData.get("languageId") ?? "") || null;
  if(languageId&&!await prisma.userLanguage.findUnique({where:{userId_languageId:{userId,languageId}}}))throw new Error("Choose a language in your library.");
  const [languages, due, attempts, lesson] = await Promise.all([
    prisma.language.findMany({ where: { users: { some: { userId } }, ...(languageId ? { id: languageId } : {}) }, select: { id: true, code: true, name: true, nativeName: true } }),
    prisma.flashcardReviewState.findMany({ where: { userId, dueAt: { lte: new Date() }, vocabularyEntry:{...(languageId?{languageId}:{}),OR:[{userId,groupId:null},{group:{members:{some:{userId}}}}]} }, include: { vocabularyEntry: { include: { language: true } } }, take: 30 }),
    prisma.vocabularyReviewAttempt.findMany({ where: { userId, ...(languageId ? { languageId } : {}) }, orderBy: { createdAt: "desc" }, take: 300 }),
    prisma.lesson.findFirst({ where: { unit: { course: { status: "PUBLISHED", ...(languageId ? { languageId } : {}) } }, progress: { none: { userId, completedAt: { not: null } } } }, include: { unit: { include: { course: { include: { language: true } } } } }, orderBy: [{ unit: { position: "asc" } }, { position: "asc" }] }),
  ]);
  const selectedLanguageId=languageId&&languages.some(item=>item.id===languageId)?languageId:null;
  const weakIds = new Set<string>();
  const latest = new Map<string, (typeof attempts)[number]>();
  for (const attempt of attempts) if (!latest.has(attempt.vocabularyEntryId)) latest.set(attempt.vocabularyEntryId, attempt);
  for (const attempt of latest.values()) if (!attempt.correct || attempt.usedHint) weakIds.add(attempt.vocabularyEntryId);
  const primaryLanguage = languages.find(item=>item.id===attempts[0]?.languageId) ?? due[0]?.vocabularyEntry.language ?? languages[0];
  const items: { type: "DUE_REVIEW" | "WEAK_WORDS" | "LESSON" | "LISTENING" | "FREE_FOCUS"; title: string; description: string; href: string | null; referenceId?: string; estimatedMinutes: number; metadata?:Record<string,string> }[] = [];
  let remaining = durationMinutes;
  if (due.length) {
    const budget=Math.min(remaining,Math.max(5,Math.min(20,Math.ceil(due.length/2)))); const bySpace=new Map<string,typeof due>();for(const item of due){const space=`${item.vocabularyEntry.groupId??"personal"}:${item.vocabularyEntry.languageId}`;bySpace.set(space,[...(bySpace.get(space)??[]),item]);}
    const groups=[...bySpace.values()];let used=0;for(const [groupIndex,group] of groups.entries()){const minutes=groupIndex===groups.length-1?Math.max(1,budget-used):Math.max(1,Math.round(budget*group.length/due.length));used+=minutes;const word=group[0].vocabularyEntry;const href=word.groupId?`/app/groups/${word.groupId}?tab=review&mode=due&languageId=${word.languageId}`:`${languageHref(word.language)}?mode=due`;items.push({type:"DUE_REVIEW",title:`Review ${Math.min(group.length,minutes*2)} due ${word.language.name} words`,description:"Scheduled vocabulary ready for review.",href,estimatedMinutes:minutes,metadata:{languageId:word.languageId,...(word.groupId?{groupId:word.groupId}:{})}});}
    remaining -= Math.min(budget,used);
  }
  if (weakIds.size && remaining >= 5) {
    const minutes = Math.min(remaining, 10);
    const weakSource=[...latest.values()].find(attempt=>weakIds.has(attempt.vocabularyEntryId));const weakHref=weakSource?.groupId?`/app/groups/${weakSource.groupId}?tab=review&mode=weak&languageId=${weakSource.languageId}`:primaryLanguage?`${languageHref(primaryLanguage)}?mode=weak`:"/app/review?mode=weak";
    items.push({ type: "WEAK_WORDS", title: `Revisit ${Math.min(weakIds.size, 10)} weak words`, description: "Clear recent misses and hint-used answers.", href:weakHref, estimatedMinutes: minutes,metadata:primaryLanguage?{languageId:primaryLanguage.id,...(weakSource?.groupId?{groupId:weakSource.groupId}:{})}:undefined });
    remaining -= minutes;
  }
  if (lesson && remaining >= 5) {
    const minutes = Math.min(remaining, 15);
    items.push({ type: "LESSON", title: lesson.title, description: `Continue ${lesson.unit.course.title}.`, href: `/app/lessons/${lesson.id}`, referenceId: lesson.id, estimatedMinutes: minutes,metadata:{languageId:lesson.unit.course.languageId} });
    remaining -= minutes;
  }
  if (primaryLanguage && remaining >= 5) {
    const minutes = Math.min(remaining, 10);
    items.push({ type: "LISTENING", title: `${primaryLanguage.name} listening`, description: "Listen, repeat, and shadow a short phrase.", href: `/app/listening?language=${primaryLanguage.id}`, referenceId: primaryLanguage.id, estimatedMinutes: minutes,metadata:{languageId:primaryLanguage.id} });
    remaining -= minutes;
  }
  if (remaining > 0 || !items.length) items.push({ type: "FREE_FOCUS", title: "Open focus", description: "Use this time for the work that matters most today.", href: null, estimatedMinutes: Math.max(5, remaining || durationMinutes) });
  await prisma.studyPlan.deleteMany({ where: { userId, dateKey: key } });
  await prisma.studyPlan.create({ data: { userId, dateKey: key, timezone, durationMinutes, languageId:selectedLanguageId, items: { create: items.map((item, position) => ({ ...item, position })) } } });
  revalidatePath("/app/dashboard");
}

export async function updateStudyPlanItem(formData: FormData) {
  const userId = await requireUser();
  const itemId = String(formData.get("itemId") ?? "");
  const command = String(formData.get("command") ?? "complete");
  const item = await prisma.studyPlanItem.findFirst({ where: { id: itemId, plan: { userId } } });
  if (!item) throw new Error("Plan item not found");
  if (command === "up" || command === "down") {
    const target=await prisma.studyPlanItem.findFirst({where:{planId:item.planId,position:command==="up"?{lt:item.position}:{gt:item.position}},orderBy:{position:command==="up"?"desc":"asc"}});
    if(target)await prisma.$transaction([prisma.studyPlanItem.update({where:{id:item.id},data:{position:-1}}),prisma.studyPlanItem.update({where:{id:target.id},data:{position:item.position}}),prisma.studyPlanItem.update({where:{id:item.id},data:{position:target.position}})]);
  } else if (command === "replace") {
    const candidateId=String(formData.get("candidateId")??"");
    const candidate=(await getStudyPlanReplacementOptions(userId)).find(option=>option.id===candidateId);
    if(!candidate)throw new Error("That activity is no longer available. Choose another replacement.");
    await prisma.studyPlanItem.update({where:{id:item.id},data:{type:candidate.type,title:candidate.title,description:candidate.description,href:candidate.href,referenceId:candidate.referenceId,metadata:candidate.metadata??Prisma.JsonNull,status:"PENDING"}});
  }
  else if (command === "remove") await prisma.studyPlanItem.update({ where: { id: item.id }, data: { status: "REMOVED" } });
  else if (command === "restore") await prisma.studyPlanItem.update({ where: { id: item.id }, data: { status: "PENDING" } });
  else await prisma.studyPlanItem.update({ where: { id: item.id }, data: { status: item.status === "COMPLETED" ? "PENDING" : "COMPLETED" } });
  revalidatePath("/app/dashboard");
}

export async function acceptWeeklyTarget(formData: FormData) {
  const userId = await requireUser();
  const reflectionId = String(formData.get("reflectionId") ?? "");
  const minutes = Math.max(1, Math.min(240, Number(formData.get("minutes")) || 15));
  const reflection = await prisma.weeklyReflection.findFirst({ where: { id: reflectionId, userId } });
  if (!reflection) throw new Error("Reflection not found");
  const timezone=await userTimezone(userId);const today=dateKey(new Date(),timezone);const effectiveMonday=reflection.effectiveMonday??weekStartKey(today);const remainingDates=remainingWeekDateKeys(today,effectiveMonday);
  await prisma.$transaction(async tx=>{await tx.weeklyReflection.update({ where: { id: reflection.id }, data: { acceptedDailyMinutes: minutes, acceptedAt: new Date(),effectiveMonday } });await tx.weeklyGoalSchedule.upsert({where:{userId_effectiveMonday:{userId,effectiveMonday}},update:{dailyMinutes:minutes},create:{userId,effectiveMonday,dailyMinutes:minutes}});await tx.userProfile.upsert({ where: { userId }, update: { dailyMinutes: minutes }, create: { userId, dailyMinutes: minutes,timezone } });for(const dateKey of remainingDates)await tx.dailyStudyRecord.upsert({where:{userId_dateKey:{userId,dateKey}},update:{targetMinutes:minutes},create:{userId,dateKey,timezone,targetMinutes:minutes}})});
  revalidatePath("/app/dashboard");
}

export async function reopenFocusRecap(formData: FormData) {
  const userId=await requireUser(); await prisma.focusStudySession.updateMany({where:{id:String(formData.get("sessionId")??""),userId,endedAt:{not:null}},data:{recapDismissed:false}}); revalidatePath("/app/dashboard");
}
