import { prisma } from "@/lib/prisma";
import { dateKey, shiftDateKey } from "@/lib/timer";

export type GoalDay={dateKey:string;focusedSeconds:number;targetMinutes:number;carryOverMinutes:number};
export function canonicalFriendPair(a:string,b:string){return a<b?[a,b] as const:[b,a] as const}
export function goalComplete(item:GoalDay){return item.focusedSeconds>=(item.targetMinutes+item.carryOverMinutes)*60}
export function goalStreak(records:GoalDay[]){const sorted=[...records].sort((a,b)=>b.dateKey.localeCompare(a.dateKey));if(!sorted.length)return 0;let streak=0;let expected=sorted[0].dateKey;for(const item of sorted){if(item.dateKey!==expected||!goalComplete(item))break;streak+=1;expected=shiftDateKey(expected,-1)}return streak}
export function completedCommitmentDays(records:GoalDay[],weekStart:string){const end=shiftDateKey(weekStart,6);return records.filter(item=>item.dateKey>=weekStart&&item.dateKey<=end&&goalComplete(item)).length}

export async function reconcileFriendCommitments(userId:string,timezone:string,now=new Date()){
 await prisma.$transaction([prisma.groupInvitation.updateMany({where:{OR:[{inviteeId:userId},{inviterId:userId}],status:"PENDING",expiresAt:{lte:now}},data:{status:"EXPIRED",resolvedAt:now,dedupeKey:null}}),prisma.groupTimerInvitation.updateMany({where:{OR:[{inviteeId:userId},{inviterId:userId}],status:"PENDING",expiresAt:{lte:now}},data:{status:"EXPIRED",resolvedAt:now,dedupeKey:null}})]);
 const today=dateKey(now,timezone); const items=await prisma.friendCommitment.findMany({where:{status:"ACTIVE",OR:[{userAId:userId},{userBId:userId}]},include:{userA:{select:{dailyStudyRecords:true}},userB:{select:{dailyStudyRecords:true}}}});
 for(const item of items){if(shiftDateKey(item.weekStart,6)>=today)continue;const success=completedCommitmentDays(item.userA.dailyStudyRecords,item.weekStart)>=item.targetDaysA&&completedCommitmentDays(item.userB.dailyStudyRecords,item.weekStart)>=item.targetDaysB;const previous=await prisma.friendCommitment.findUnique({where:{userAId_userBId_weekStart:{userAId:item.userAId,userBId:item.userBId,weekStart:shiftDateKey(item.weekStart,-7)}}});const streak=success?(previous?.jointlySucceeded?previous.streakWeeks+1:1):0;await prisma.$transaction(async tx=>{const claimed=await tx.friendCommitment.updateMany({where:{id:item.id,status:"ACTIVE"},data:{status:"COMPLETED",resolvedAt:now,jointlySucceeded:success,streakWeeks:streak}});if(claimed.count&&success)await tx.notification.createMany({data:[{userId:item.userAId,type:"COMMITMENT_COMPLETE",payload:{commitmentId:item.id,streak}},{userId:item.userBId,type:"COMMITMENT_COMPLETE",payload:{commitmentId:item.id,streak}}]});});}
}
