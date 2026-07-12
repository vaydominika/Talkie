CREATE TYPE "TimerPhase" AS ENUM ('FOCUS', 'BREAK');
CREATE TYPE "TimerProposalKind" AS ENUM ('START', 'PAUSE', 'RESET', 'SKIP', 'SETTINGS');
CREATE TYPE "TimerProposalStatus" AS ENUM ('PENDING', 'APPROVED', 'DECLINED', 'EXPIRED');

ALTER TABLE "UserProfile" ADD COLUMN "timezone" TEXT NOT NULL DEFAULT 'UTC';

CREATE TABLE "DailyStudyRecord" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "dateKey" TEXT NOT NULL,
  "timezone" TEXT NOT NULL,
  "focusedSeconds" INTEGER NOT NULL DEFAULT 0,
  "targetMinutes" INTEGER NOT NULL,
  "carryOverMinutes" INTEGER NOT NULL DEFAULT 0,
  "carryPromptResponse" TEXT,
  "completionShown" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DailyStudyRecord_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "DailyStudyRecord_userId_dateKey_key" ON "DailyStudyRecord"("userId", "dateKey");
CREATE INDEX "DailyStudyRecord_userId_dateKey_idx" ON "DailyStudyRecord"("userId", "dateKey");
ALTER TABLE "DailyStudyRecord" ADD CONSTRAINT "DailyStudyRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "PersonalTimerState" (
  "id" TEXT NOT NULL, "userId" TEXT NOT NULL, "focusMinutes" INTEGER NOT NULL DEFAULT 25,
  "breakMinutes" INTEGER NOT NULL DEFAULT 5, "autoStart" BOOLEAN NOT NULL DEFAULT false,
  "phase" "TimerPhase" NOT NULL DEFAULT 'FOCUS', "isRunning" BOOLEAN NOT NULL DEFAULT false,
  "remainingSeconds" INTEGER NOT NULL DEFAULT 1500, "phaseStartedAt" TIMESTAMP(3), "endsAt" TIMESTAMP(3),
  "creditedUntil" TIMESTAMP(3), "version" INTEGER NOT NULL DEFAULT 0, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PersonalTimerState_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PersonalTimerState_userId_key" ON "PersonalTimerState"("userId");
ALTER TABLE "PersonalTimerState" ADD CONSTRAINT "PersonalTimerState_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "GroupTimerRoom" (
  "id" TEXT NOT NULL, "groupId" TEXT NOT NULL, "focusMinutes" INTEGER NOT NULL DEFAULT 25,
  "breakMinutes" INTEGER NOT NULL DEFAULT 5, "autoStart" BOOLEAN NOT NULL DEFAULT false,
  "phase" "TimerPhase" NOT NULL DEFAULT 'FOCUS', "isRunning" BOOLEAN NOT NULL DEFAULT false,
  "remainingSeconds" INTEGER NOT NULL DEFAULT 1500, "phaseStartedAt" TIMESTAMP(3), "endsAt" TIMESTAMP(3),
  "version" INTEGER NOT NULL DEFAULT 0, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "GroupTimerRoom_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "GroupTimerRoom_groupId_key" ON "GroupTimerRoom"("groupId");
ALTER TABLE "GroupTimerRoom" ADD CONSTRAINT "GroupTimerRoom_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "GroupTimerParticipant" (
  "id" TEXT NOT NULL, "roomId" TEXT NOT NULL, "userId" TEXT NOT NULL,
  "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "creditedUntil" TIMESTAMP(3), CONSTRAINT "GroupTimerParticipant_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "GroupTimerParticipant_roomId_userId_key" ON "GroupTimerParticipant"("roomId", "userId");
CREATE INDEX "GroupTimerParticipant_userId_lastSeenAt_idx" ON "GroupTimerParticipant"("userId", "lastSeenAt");
ALTER TABLE "GroupTimerParticipant" ADD CONSTRAINT "GroupTimerParticipant_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "GroupTimerRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GroupTimerParticipant" ADD CONSTRAINT "GroupTimerParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "GroupTimerProposal" (
  "id" TEXT NOT NULL, "roomId" TEXT NOT NULL, "proposerId" TEXT NOT NULL,
  "kind" "TimerProposalKind" NOT NULL, "payload" JSONB, "requiredUserIds" JSONB NOT NULL,
  "status" "TimerProposalStatus" NOT NULL DEFAULT 'PENDING', "baseVersion" INTEGER NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolvedAt" TIMESTAMP(3), CONSTRAINT "GroupTimerProposal_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "GroupTimerProposal_roomId_status_expiresAt_idx" ON "GroupTimerProposal"("roomId", "status", "expiresAt");
ALTER TABLE "GroupTimerProposal" ADD CONSTRAINT "GroupTimerProposal_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "GroupTimerRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GroupTimerProposal" ADD CONSTRAINT "GroupTimerProposal_proposerId_fkey" FOREIGN KEY ("proposerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "GroupTimerVote" (
  "id" TEXT NOT NULL, "proposalId" TEXT NOT NULL, "userId" TEXT NOT NULL,
  "approved" BOOLEAN NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "GroupTimerVote_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "GroupTimerVote_proposalId_userId_key" ON "GroupTimerVote"("proposalId", "userId");
ALTER TABLE "GroupTimerVote" ADD CONSTRAINT "GroupTimerVote_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "GroupTimerProposal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GroupTimerVote" ADD CONSTRAINT "GroupTimerVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
