ALTER TABLE "DailyStudyRecord" ADD COLUMN "focusSessions" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "PersonalTimerState" ADD COLUMN "focusSessionId" TEXT;
ALTER TABLE "GroupTimerRoom" ADD COLUMN "focusSessionId" TEXT;
ALTER TABLE "GroupTimerParticipant" ADD COLUMN "lastCountedFocusSessionId" TEXT;
