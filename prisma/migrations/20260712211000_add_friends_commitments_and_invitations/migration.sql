CREATE TYPE "FriendRequestStatus" AS ENUM ('PENDING','ACCEPTED','DECLINED','CANCELED');
CREATE TYPE "NotificationType" AS ENUM ('FRIEND_REQUEST','FRIEND_ACCEPTED','COMMITMENT_REQUEST','COMMITMENT_ACCEPTED','COMMITMENT_COMPLETE','NUDGE','GROUP_INVITATION','GROUP_TIMER_INVITATION');
CREATE TYPE "CommitmentStatus" AS ENUM ('PENDING','ACTIVE','COMPLETED','DECLINED','CANCELED');
CREATE TYPE "InvitationStatus" AS ENUM ('PENDING','ACCEPTED','DECLINED','CANCELED','EXPIRED');
ALTER TABLE "User" ADD COLUMN "username" TEXT, ADD COLUMN "friendCode" TEXT,
 ADD COLUMN "friendDiscoverable" BOOLEAN NOT NULL DEFAULT true,
 ADD COLUMN "friendActivityVisible" BOOLEAN NOT NULL DEFAULT true,
 ADD COLUMN "friendNudgesEnabled" BOOLEAN NOT NULL DEFAULT true;
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
CREATE UNIQUE INDEX "User_friendCode_key" ON "User"("friendCode");

CREATE TABLE "FriendRequest" ("id" TEXT NOT NULL,"senderId" TEXT NOT NULL,"recipientId" TEXT NOT NULL,"pairKey" TEXT NOT NULL,"status" "FriendRequestStatus" NOT NULL DEFAULT 'PENDING',"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"resolvedAt" TIMESTAMP(3),CONSTRAINT "FriendRequest_pkey" PRIMARY KEY("id"));
CREATE UNIQUE INDEX "FriendRequest_pairKey_key" ON "FriendRequest"("pairKey");
CREATE UNIQUE INDEX "FriendRequest_senderId_recipientId_key" ON "FriendRequest"("senderId","recipientId");
CREATE INDEX "FriendRequest_recipientId_status_idx" ON "FriendRequest"("recipientId","status");
CREATE TABLE "FriendConnection" ("id" TEXT NOT NULL,"userAId" TEXT NOT NULL,"userBId" TEXT NOT NULL,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,CONSTRAINT "FriendConnection_pkey" PRIMARY KEY("id"));
CREATE UNIQUE INDEX "FriendConnection_userAId_userBId_key" ON "FriendConnection"("userAId","userBId");
CREATE INDEX "FriendConnection_userBId_idx" ON "FriendConnection"("userBId");
CREATE TABLE "UserBlock" ("id" TEXT NOT NULL,"blockerId" TEXT NOT NULL,"blockedId" TEXT NOT NULL,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,CONSTRAINT "UserBlock_pkey" PRIMARY KEY("id"));
CREATE UNIQUE INDEX "UserBlock_blockerId_blockedId_key" ON "UserBlock"("blockerId","blockedId");
CREATE TABLE "Notification" ("id" TEXT NOT NULL,"userId" TEXT NOT NULL,"actorId" TEXT,"type" "NotificationType" NOT NULL,"payload" JSONB,"readAt" TIMESTAMP(3),"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,CONSTRAINT "Notification_pkey" PRIMARY KEY("id"));
CREATE INDEX "Notification_userId_readAt_createdAt_idx" ON "Notification"("userId","readAt","createdAt");
CREATE TABLE "FriendCommitment" ("id" TEXT NOT NULL,"userAId" TEXT NOT NULL,"userBId" TEXT NOT NULL,"requestedById" TEXT NOT NULL,"targetDaysA" INTEGER NOT NULL,"targetDaysB" INTEGER NOT NULL,"weekStart" TEXT NOT NULL,"status" "CommitmentStatus" NOT NULL DEFAULT 'PENDING',"acceptedAt" TIMESTAMP(3),"resolvedAt" TIMESTAMP(3),"jointlySucceeded" BOOLEAN,"streakWeeks" INTEGER NOT NULL DEFAULT 0,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,CONSTRAINT "FriendCommitment_pkey" PRIMARY KEY("id"));
CREATE UNIQUE INDEX "FriendCommitment_userAId_userBId_weekStart_key" ON "FriendCommitment"("userAId","userBId","weekStart");
CREATE INDEX "FriendCommitment_userAId_status_idx" ON "FriendCommitment"("userAId","status"); CREATE INDEX "FriendCommitment_userBId_status_idx" ON "FriendCommitment"("userBId","status");
CREATE TABLE "FriendNudge" ("id" TEXT NOT NULL,"senderId" TEXT NOT NULL,"recipientId" TEXT NOT NULL,"dateKey" TEXT NOT NULL,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,CONSTRAINT "FriendNudge_pkey" PRIMARY KEY("id"));
CREATE UNIQUE INDEX "FriendNudge_senderId_recipientId_dateKey_key" ON "FriendNudge"("senderId","recipientId","dateKey"); CREATE INDEX "FriendNudge_recipientId_createdAt_idx" ON "FriendNudge"("recipientId","createdAt");
CREATE TABLE "GroupInvitation" ("id" TEXT NOT NULL,"inviterId" TEXT NOT NULL,"inviteeId" TEXT NOT NULL,"groupId" TEXT NOT NULL,"dedupeKey" TEXT,"status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',"expiresAt" TIMESTAMP(3) NOT NULL,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"resolvedAt" TIMESTAMP(3),CONSTRAINT "GroupInvitation_pkey" PRIMARY KEY("id"));
CREATE UNIQUE INDEX "GroupInvitation_dedupeKey_key" ON "GroupInvitation"("dedupeKey");
CREATE INDEX "GroupInvitation_inviteeId_status_expiresAt_idx" ON "GroupInvitation"("inviteeId","status","expiresAt"); CREATE INDEX "GroupInvitation_inviterId_status_idx" ON "GroupInvitation"("inviterId","status");
CREATE TABLE "GroupTimerInvitation" ("id" TEXT NOT NULL,"inviterId" TEXT NOT NULL,"inviteeId" TEXT NOT NULL,"roomId" TEXT NOT NULL,"dedupeKey" TEXT,"status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',"expiresAt" TIMESTAMP(3) NOT NULL,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"resolvedAt" TIMESTAMP(3),CONSTRAINT "GroupTimerInvitation_pkey" PRIMARY KEY("id"));
CREATE UNIQUE INDEX "GroupTimerInvitation_dedupeKey_key" ON "GroupTimerInvitation"("dedupeKey");
CREATE INDEX "GroupTimerInvitation_inviteeId_status_expiresAt_idx" ON "GroupTimerInvitation"("inviteeId","status","expiresAt"); CREATE INDEX "GroupTimerInvitation_inviterId_status_idx" ON "GroupTimerInvitation"("inviterId","status");

ALTER TABLE "FriendRequest" ADD CONSTRAINT "FriendRequest_senderId_fkey" FOREIGN KEY("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE; ALTER TABLE "FriendRequest" ADD CONSTRAINT "FriendRequest_recipientId_fkey" FOREIGN KEY("recipientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FriendConnection" ADD CONSTRAINT "FriendConnection_userAId_fkey" FOREIGN KEY("userAId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE; ALTER TABLE "FriendConnection" ADD CONSTRAINT "FriendConnection_userBId_fkey" FOREIGN KEY("userBId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserBlock" ADD CONSTRAINT "UserBlock_blockerId_fkey" FOREIGN KEY("blockerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE; ALTER TABLE "UserBlock" ADD CONSTRAINT "UserBlock_blockedId_fkey" FOREIGN KEY("blockedId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE; ALTER TABLE "Notification" ADD CONSTRAINT "Notification_actorId_fkey" FOREIGN KEY("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FriendCommitment" ADD CONSTRAINT "FriendCommitment_userAId_fkey" FOREIGN KEY("userAId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE; ALTER TABLE "FriendCommitment" ADD CONSTRAINT "FriendCommitment_userBId_fkey" FOREIGN KEY("userBId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE; ALTER TABLE "FriendCommitment" ADD CONSTRAINT "FriendCommitment_requestedById_fkey" FOREIGN KEY("requestedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FriendNudge" ADD CONSTRAINT "FriendNudge_senderId_fkey" FOREIGN KEY("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE; ALTER TABLE "FriendNudge" ADD CONSTRAINT "FriendNudge_recipientId_fkey" FOREIGN KEY("recipientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GroupInvitation" ADD CONSTRAINT "GroupInvitation_inviterId_fkey" FOREIGN KEY("inviterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE; ALTER TABLE "GroupInvitation" ADD CONSTRAINT "GroupInvitation_inviteeId_fkey" FOREIGN KEY("inviteeId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE; ALTER TABLE "GroupInvitation" ADD CONSTRAINT "GroupInvitation_groupId_fkey" FOREIGN KEY("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GroupTimerInvitation" ADD CONSTRAINT "GroupTimerInvitation_inviterId_fkey" FOREIGN KEY("inviterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE; ALTER TABLE "GroupTimerInvitation" ADD CONSTRAINT "GroupTimerInvitation_inviteeId_fkey" FOREIGN KEY("inviteeId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE; ALTER TABLE "GroupTimerInvitation" ADD CONSTRAINT "GroupTimerInvitation_roomId_fkey" FOREIGN KEY("roomId") REFERENCES "GroupTimerRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;
