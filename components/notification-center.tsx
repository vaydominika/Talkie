import { prisma } from "@/lib/prisma";
import { NotificationMenu, type NotificationMenuProps } from "@/components/notification-menu";

export async function NotificationCenter({ userId }: { userId: string }) {
  const now = new Date();
  const [notifications, friendRequests, groupInvites, timerInvites, commitmentRequests, outgoingRequests, sentGroupInvites, sentTimerInvites, unread] = await Promise.all([
    prisma.notification.findMany({ where: { userId }, include: { actor: { select: { name: true, username: true } } }, orderBy: { createdAt: "desc" }, take: 20 }),
    prisma.friendRequest.findMany({ where: { recipientId: userId, status: "PENDING" }, include: { sender: { select: { name: true, username: true } } }, orderBy: { createdAt: "desc" } }),
    prisma.groupInvitation.findMany({ where: { inviteeId: userId, status: "PENDING", expiresAt: { gt: now } }, include: { inviter: { select: { name: true, username: true } }, group: { select: { name: true } } }, orderBy: { createdAt: "desc" } }),
    prisma.groupTimerInvitation.findMany({ where: { inviteeId: userId, status: "PENDING", expiresAt: { gt: now } }, include: { inviter: { select: { name: true, username: true } }, room: { include: { group: { select: { name: true } } } } }, orderBy: { createdAt: "desc" } }),
    prisma.friendCommitment.findMany({ where: { status: "PENDING", requestedById: { not: userId }, OR: [{ userAId: userId }, { userBId: userId }] }, include: { requestedBy: { select: { name: true, username: true } } }, orderBy: { createdAt: "desc" } }),
    prisma.friendRequest.findMany({ where: { senderId: userId, status: "PENDING" }, include: { recipient: { select: { name: true, username: true } } }, orderBy: { createdAt: "desc" } }),
    prisma.groupInvitation.findMany({ where: { inviterId: userId, status: "PENDING", expiresAt: { gt: now } }, include: { invitee: { select: { name: true, username: true } }, group: { select: { name: true } } }, orderBy: { createdAt: "desc" } }),
    prisma.groupTimerInvitation.findMany({ where: { inviterId: userId, status: "PENDING", expiresAt: { gt: now } }, include: { invitee: { select: { name: true, username: true } }, room: { include: { group: { select: { name: true } } } } }, orderBy: { createdAt: "desc" } }),
    prisma.notification.count({ where: { userId, readAt: null } }),
  ]);

  const props: NotificationMenuProps = {
    now: now.toISOString(),
    unread,
    friendRequests: friendRequests.map(item => ({ id: item.id, person: person(item.sender) })),
    groupInvites: groupInvites.map(item => ({ id: item.id, person: person(item.inviter), group: item.group.name })),
    timerInvites: timerInvites.map(item => ({ id: item.id, person: person(item.inviter), group: item.room.group.name })),
    commitmentRequests: commitmentRequests.map(item => ({
      id: item.id,
      person: person(item.requestedBy),
      ownTarget: item.userAId === userId ? item.targetDaysA : item.targetDaysB,
      friendTarget: item.userAId === userId ? item.targetDaysB : item.targetDaysA,
    })),
    sent: [
      ...outgoingRequests.map(item => ({ id: item.id, kind: "friend" as const, label: `Friend request to ${person(item.recipient)}` })),
      ...sentGroupInvites.map(item => ({ id: item.id, kind: "group" as const, label: `${item.group.name} invitation to ${person(item.invitee)}` })),
      ...sentTimerInvites.map(item => ({ id: item.id, kind: "timer" as const, label: `${item.room.group.name} timer invitation to ${person(item.invitee)}` })),
    ],
    activity: notifications.map(item => ({ id: item.id, type: item.type, actor: item.actor ? person(item.actor) : "Talkie", read: Boolean(item.readAt), createdAt: item.createdAt.toISOString() })),
  };

  return <NotificationMenu {...props} />;
}

function person(value: { name: string | null; username: string | null }) {
  const name = value.name?.trim();
  return name && value.username ? `${name} (@${value.username})` : name || (value.username ? `@${value.username}` : "Talkie user");
}
