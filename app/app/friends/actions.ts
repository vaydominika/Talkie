"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { dateKey, shiftDateKey } from "@/lib/timer";
import { userTimezone, weekStartKey } from "@/lib/learning-loop";
import { revalidatePath } from "next/cache";
import { canonicalFriendPair } from "@/lib/friends";
import { isUniqueConstraintError, validateUsername } from "@/lib/usernames";

async function userId() { const session = await auth(); if (!session?.user?.id) throw new Error("Unauthorized"); return session.user.id; }
function code() { return crypto.randomUUID().replaceAll("-", "").slice(0, 10).toUpperCase(); }
function refresh() { revalidatePath("/app/friends"); revalidatePath("/app"); }
export async function initializeFriendCode(){const id=await userId();await prisma.user.updateMany({where:{id,friendCode:null},data:{friendCode:code()}});refresh();}

export type FriendProfileState = {
  status: "idle" | "error" | "success";
  message?: string;
  username: string;
};

export async function updateFriendProfile(_previousState: FriendProfileState, formData: FormData): Promise<FriendProfileState> {
  const id = await userId();
  const submittedUsername = String(formData.get("username") ?? "").trim();
  const result = validateUsername(submittedUsername);
  if (result.error) return { status: "error", message: result.error, username: submittedUsername };

  const username = result.username!;
  const owner = await prisma.user.findFirst({
    where: { id: { not: id }, username: { equals: username, mode: "insensitive" } },
    select: { id: true },
  });
  if (owner) return { status: "error", message: "That username is already taken.", username: submittedUsername };

  try {
    await prisma.user.update({ where: { id }, data: { username, friendCode: String(formData.get("regenerate")) === "true" ? code() : undefined, friendDiscoverable: formData.get("friendDiscoverable") === "on", friendActivityVisible: formData.get("friendActivityVisible") === "on", friendNudgesEnabled: formData.get("friendNudgesEnabled") === "on" } });
  } catch (error) {
    if (isUniqueConstraintError(error, "username") || isUniqueConstraintError(error)) {
      return { status: "error", message: "That username is already taken.", username: submittedUsername };
    }
    return { status: "error", message: "The friend profile could not be saved. Try again.", username: submittedUsername };
  }
  refresh();
  return { status: "success", message: "Friend profile saved.", username };
}

export async function regenerateFriendCode() { const id = await userId(); await prisma.user.update({ where: { id }, data: { friendCode: code() } }); refresh(); }

export async function sendFriendRequest(formData: FormData) {
  const senderId = await userId(); const recipientId = String(formData.get("recipientId") ?? "");
  if (!recipientId || recipientId === senderId) throw new Error("Choose another user.");
  const blocked = await prisma.userBlock.findFirst({ where: { OR: [{ blockerId: senderId, blockedId: recipientId }, { blockerId: recipientId, blockedId: senderId }] } });
  if (blocked) throw new Error("Friend request unavailable.");
  const [a, b] = canonicalFriendPair(senderId, recipientId);const pairKey=`${a}:${b}`;
  if (await prisma.friendConnection.findUnique({ where: { userAId_userBId: { userAId: a, userBId: b } } })) return;
  await prisma.$transaction(async tx=>{const existing=await tx.friendRequest.findUnique({where:{pairKey}});if(existing?.status==="PENDING"){if(existing.senderId===senderId)return;await tx.friendRequest.update({where:{id:existing.id},data:{status:"ACCEPTED",resolvedAt:new Date()}});await tx.friendConnection.upsert({where:{userAId_userBId:{userAId:a,userBId:b}},update:{},create:{userAId:a,userBId:b}});await tx.notification.createMany({data:[{userId:senderId,actorId:recipientId,type:"FRIEND_ACCEPTED"},{userId:recipientId,actorId:senderId,type:"FRIEND_ACCEPTED"}]});return;}await tx.friendRequest.upsert({where:{pairKey},update:{senderId,recipientId,status:"PENDING",resolvedAt:null,createdAt:new Date()},create:{senderId,recipientId,pairKey}});await tx.notification.create({data:{userId:recipientId,actorId:senderId,type:"FRIEND_REQUEST"}});},{isolationLevel:"Serializable"});refresh();
}

export async function respondFriendRequest(formData: FormData) {
  const id = await userId(); const requestId = String(formData.get("requestId") ?? ""); const accept = String(formData.get("decision")) === "accept";
  const request = await prisma.friendRequest.findFirst({ where: { id: requestId, recipientId: id, status: "PENDING" } }); if (!request) throw new Error("Request not found.");
  const [a, b] = canonicalFriendPair(request.senderId, request.recipientId);
  await prisma.$transaction(async tx=>{const claimed=await tx.friendRequest.updateMany({where:{id:request.id,status:"PENDING"},data:{status:accept?"ACCEPTED":"DECLINED",resolvedAt:new Date()}});if(!claimed.count)return;if(accept){await tx.friendConnection.upsert({where:{userAId_userBId:{userAId:a,userBId:b}},update:{},create:{userAId:a,userBId:b}});await tx.friendRequest.updateMany({where:{senderId:id,recipientId:request.senderId,status:"PENDING"},data:{status:"ACCEPTED",resolvedAt:new Date()}});await tx.notification.create({data:{userId:request.senderId,actorId:id,type:"FRIEND_ACCEPTED"}});}});refresh();
}
export async function cancelFriendRequest(formData: FormData) { const id=await userId(); await prisma.friendRequest.updateMany({where:{id:String(formData.get("requestId")??""),senderId:id,status:"PENDING"},data:{status:"CANCELED",resolvedAt:new Date()}}); refresh(); }

export async function removeFriend(formData: FormData) { const id = await userId(); const friendId = String(formData.get("friendId") ?? ""); const [a,b] = canonicalFriendPair(id,friendId); await prisma.friendConnection.deleteMany({ where: { userAId:a,userBId:b } }); refresh(); }
export async function blockFriend(formData: FormData) { const id = await userId(); const blockedId = String(formData.get("friendId") ?? ""); const [a,b] = canonicalFriendPair(id,blockedId); await prisma.$transaction([prisma.userBlock.upsert({ where:{ blockerId_blockedId:{blockerId:id,blockedId}},update:{},create:{blockerId:id,blockedId}}),prisma.friendConnection.deleteMany({where:{userAId:a,userBId:b}}),prisma.friendRequest.deleteMany({where:{OR:[{senderId:id,recipientId:blockedId},{senderId:blockedId,recipientId:id}]}})]); refresh(); }
export async function unblockFriend(formData: FormData) { const id=await userId(); await prisma.userBlock.deleteMany({where:{blockerId:id,blockedId:String(formData.get("friendId")??"")}}); refresh(); }

export async function nudgeFriend(formData: FormData) {
  const id = await userId(); const friendId = String(formData.get("friendId") ?? ""); const timezone = await userTimezone(id); const key = dateKey(new Date(), timezone);
  const [a,b]=canonicalFriendPair(id,friendId); if(!await prisma.friendConnection.findUnique({where:{userAId_userBId:{userAId:a,userBId:b}}}))throw new Error("Friend not found.");
  const recipient=await prisma.user.findUnique({where:{id:friendId},select:{friendNudgesEnabled:true}}); if(!recipient?.friendNudgesEnabled)return;
  try{await prisma.$transaction(async tx=>{await tx.friendNudge.create({data:{senderId:id,recipientId:friendId,dateKey:key}});await tx.notification.create({ data: { userId: friendId, actorId: id, type: "NUDGE", payload: { dateKey: key } } });});}catch(error){if(!(error instanceof Error&&"code" in error&&(error as {code?:string}).code==="P2002"))throw error;}refresh();
}

export async function createCommitment(formData: FormData) {
  const id = await userId(); const friendId = String(formData.get("friendId") ?? ""); const myTarget = Math.max(1,Math.min(7,Number(formData.get("myTarget"))||4));const friendTarget=Math.max(1,Math.min(7,Number(formData.get("friendTarget"))||myTarget)); const timezone=await userTimezone(id); const nextWeek=shiftDateKey(weekStartKey(dateKey(new Date(),timezone)),7); const [a,b]=canonicalFriendPair(id,friendId);const targetDaysA=id===a?myTarget:friendTarget;const targetDaysB=id===b?myTarget:friendTarget;
  if(!await prisma.friendConnection.findUnique({where:{userAId_userBId:{userAId:a,userBId:b}}}))throw new Error("Friend not found.");
  const commitment=await prisma.friendCommitment.upsert({where:{userAId_userBId_weekStart:{userAId:a,userBId:b,weekStart:nextWeek}},update:{targetDaysA,targetDaysB,status:"PENDING",requestedById:id,acceptedAt:null,resolvedAt:null},create:{userAId:a,userBId:b,requestedById:id,targetDaysA,targetDaysB,weekStart:nextWeek}});
  await prisma.notification.create({data:{userId:friendId,actorId:id,type:"COMMITMENT_REQUEST",payload:{commitmentId:commitment.id,targetDaysA,targetDaysB}}}); refresh();
}
export async function respondCommitment(formData: FormData) { const id=await userId(); const commitmentId=String(formData.get("commitmentId")??""); const accept=String(formData.get("decision"))==="accept"; const item=await prisma.friendCommitment.findFirst({where:{id:commitmentId,OR:[{userAId:id},{userBId:id}],status:"PENDING",requestedById:{not:id}}}); if(!item)throw new Error("Commitment not found.");const ownTarget=Math.max(1,Math.min(7,Number(formData.get("ownTarget"))||(id===item.userAId?item.targetDaysA:item.targetDaysB))); await prisma.$transaction(async tx=>{const claimed=await tx.friendCommitment.updateMany({where:{id:item.id,status:"PENDING"},data:{...(id===item.userAId?{targetDaysA:ownTarget}:{targetDaysB:ownTarget}),status:accept?"ACTIVE":"DECLINED",acceptedAt:accept?new Date():null,resolvedAt:accept?null:new Date()}});if(!claimed.count)throw new Error("Commitment was already answered.");if(accept)await tx.notification.create({data:{userId:item.requestedById,actorId:id,type:"COMMITMENT_ACCEPTED",payload:{commitmentId:item.id}}});}); refresh(); }

export async function updateCommitment(formData: FormData) {
  const id = await userId();
  const commitmentId = String(formData.get("commitmentId") ?? "");
  const item = await prisma.friendCommitment.findFirst({
    where: { id: commitmentId, OR: [{ userAId: id }, { userBId: id }], status: { in: ["PENDING", "ACTIVE"] } },
  });
  if (!item) throw new Error("Commitment not found.");
  if (item.status === "PENDING" && item.requestedById !== id) throw new Error("Answer this proposal before changing it.");

  const myTarget = Math.max(1, Math.min(7, Number(formData.get("myTarget")) || 4));
  const friendTarget = Math.max(1, Math.min(7, Number(formData.get("friendTarget")) || myTarget));
  const friendId = item.userAId === id ? item.userBId : item.userAId;
  const targetDaysA = item.userAId === id ? myTarget : friendTarget;
  const targetDaysB = item.userBId === id ? myTarget : friendTarget;

  await prisma.$transaction([
    prisma.friendCommitment.update({
      where: { id: item.id },
      data: { targetDaysA, targetDaysB, status: "PENDING", requestedById: id, acceptedAt: null, resolvedAt: null },
    }),
    prisma.notification.create({
      data: { userId: friendId, actorId: id, type: "COMMITMENT_REQUEST", payload: { commitmentId: item.id, targetDaysA, targetDaysB } },
    }),
  ]);
  refresh();
}

export async function cancelCommitment(formData: FormData) {
  const id = await userId();
  await prisma.friendCommitment.updateMany({
    where: { id: String(formData.get("commitmentId") ?? ""), OR: [{ userAId: id }, { userBId: id }], status: { not: "CANCELED" } },
    data: { status: "CANCELED", resolvedAt: new Date() },
  });
  refresh();
}

async function requireFriend(aId:string,bId:string){const[a,b]=canonicalFriendPair(aId,bId);const [friend,blocked]=await Promise.all([prisma.friendConnection.findUnique({where:{userAId_userBId:{userAId:a,userBId:b}}}),prisma.userBlock.findFirst({where:{OR:[{blockerId:aId,blockedId:bId},{blockerId:bId,blockedId:aId}]}})]);if(!friend||blocked)throw new Error("Friend invitation unavailable.");}
export async function inviteFriendToGroup(formData:FormData){const inviterId=await userId();const inviteeId=String(formData.get("friendId")??"");const groupId=String(formData.get("groupId")??"");await requireFriend(inviterId,inviteeId);if(!await prisma.groupMember.findUnique({where:{groupId_userId:{groupId,userId:inviterId}}}))throw new Error("Group unavailable.");if(await prisma.groupMember.findUnique({where:{groupId_userId:{groupId,userId:inviteeId}}}))return;await prisma.$transaction(async tx=>{const key=`${inviterId}:${inviteeId}:${groupId}`;const invitation=await tx.groupInvitation.upsert({where:{dedupeKey:key},update:{expiresAt:new Date(Date.now()+7*86400000)},create:{inviterId,inviteeId,groupId,dedupeKey:key,expiresAt:new Date(Date.now()+7*86400000)}});await tx.notification.create({data:{userId:inviteeId,actorId:inviterId,type:"GROUP_INVITATION",payload:{invitationId:invitation.id,groupId}}});});refresh();}
export async function respondGroupInvitation(formData:FormData){const inviteeId=await userId();const invitationId=String(formData.get("invitationId")??"");const accept=String(formData.get("decision"))==="accept";await prisma.$transaction(async tx=>{const item=await tx.groupInvitation.findFirst({where:{id:invitationId,inviteeId,status:"PENDING"}});if(!item)throw new Error("Invitation unavailable.");if(item.expiresAt<=new Date()){await tx.groupInvitation.update({where:{id:item.id},data:{status:"EXPIRED",resolvedAt:new Date(),dedupeKey:null}});throw new Error("Invitation expired.");}await requireFriend(item.inviterId,inviteeId);if(!await tx.groupMember.findUnique({where:{groupId_userId:{groupId:item.groupId,userId:item.inviterId}}}))throw new Error("Inviter is no longer in this group.");if(accept)await tx.groupMember.upsert({where:{groupId_userId:{groupId:item.groupId,userId:inviteeId}},update:{},create:{groupId:item.groupId,userId:inviteeId}});await tx.groupInvitation.update({where:{id:item.id},data:{status:accept?"ACCEPTED":"DECLINED",resolvedAt:new Date(),dedupeKey:null}});});refresh();}
export async function cancelGroupInvitation(formData:FormData){const inviterId=await userId();await prisma.groupInvitation.updateMany({where:{id:String(formData.get("invitationId")??""),inviterId,status:"PENDING"},data:{status:"CANCELED",resolvedAt:new Date(),dedupeKey:null}});refresh();}
export async function cancelGroupTimerInvitation(formData:FormData){const inviterId=await userId();await prisma.groupTimerInvitation.updateMany({where:{id:String(formData.get("invitationId")??""),inviterId,status:"PENDING"},data:{status:"CANCELED",resolvedAt:new Date(),dedupeKey:null}});refresh();}
export async function inviteFriendToGroupTimer(formData:FormData){const inviterId=await userId();const inviteeId=String(formData.get("friendId")??"");await requireFriend(inviterId,inviteeId);const participant=await prisma.groupTimerParticipant.findFirst({where:{userId:inviterId,lastSeenAt:{gt:new Date(Date.now()-120000)}},include:{room:true}});if(!participant)throw new Error("Join an active group timer first.");if(!await prisma.groupMember.findUnique({where:{groupId_userId:{groupId:participant.room.groupId,userId:inviteeId}}}))throw new Error("Your friend must already belong to this group.");const key=`${inviterId}:${inviteeId}:${participant.roomId}`;const invitation=await prisma.groupTimerInvitation.upsert({where:{dedupeKey:key},update:{expiresAt:new Date(Date.now()+3600000)},create:{inviterId,inviteeId,roomId:participant.roomId,dedupeKey:key,expiresAt:new Date(Date.now()+3600000)}});await prisma.notification.create({data:{userId:inviteeId,actorId:inviterId,type:"GROUP_TIMER_INVITATION",payload:{invitationId:invitation.id,groupId:participant.room.groupId}}});refresh();}
export async function respondGroupTimerInvitation(formData:FormData){const inviteeId=await userId();const id=String(formData.get("invitationId")??"");const accept=String(formData.get("decision"))==="accept";await prisma.$transaction(async tx=>{const item=await tx.groupTimerInvitation.findFirst({where:{id,inviteeId,status:"PENDING"},include:{room:true}});if(!item||item.expiresAt<=new Date())throw new Error("Timer invitation unavailable.");await requireFriend(item.inviterId,inviteeId);if(!await tx.groupMember.findUnique({where:{groupId_userId:{groupId:item.room.groupId,userId:inviteeId}}}))throw new Error("Group membership required.");if(accept){await tx.groupTimerParticipant.deleteMany({where:{userId:inviteeId}});await tx.groupTimerParticipant.create({data:{userId:inviteeId,roomId:item.roomId,creditedUntil:new Date()}});}await tx.groupTimerInvitation.update({where:{id:item.id},data:{status:accept?"ACCEPTED":"DECLINED",resolvedAt:new Date(),dedupeKey:null}});});refresh();}
export async function markNotificationsRead() { const id=await userId(); await prisma.notification.updateMany({where:{userId:id,readAt:null},data:{readAt:new Date()}}); refresh(); }
export async function markNotificationsUnread() { const id=await userId(); await prisma.notification.updateMany({where:{userId:id,readAt:{not:null}},data:{readAt:null}}); refresh(); }
