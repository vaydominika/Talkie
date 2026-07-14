import type { PrismaClient } from "@prisma/client";

export type Row = Record<string, unknown>;

export const DATABASE_TRANSFER_TABLES = [
  "User",
  "UserProfile",
  "UserPreference",
  "DailyStudyRecord",
  "PersonalTimerState",
  "Account",
  "FriendRequest",
  "FriendConnection",
  "UserBlock",
  "FriendNudge",
  "Notification",
  "FriendCommitment",
  "Language",
  "LanguageTab",
  "MediaAsset",
  "ProficiencyLevel",
  "Course",
  "CourseUnit",
  "Lesson",
  "LessonBlock",
  "LessonTest",
  "LessonTestQuestion",
  "Group",
  "GroupTimerRoom",
  "GroupInvitation",
  "GroupTimerInvitation",
  "GroupMember",
  "GroupTimerParticipant",
  "GroupTimerProposal",
  "GroupTimerVote",
  "StudyPlan",
  "StudyPlanItem",
  "FocusStudySession",
  "ListeningActivity",
  "DailyQuestSet",
  "DailyQuest",
  "QuestEvent",
  "WeeklyReflection",
  "WeeklyGoalSchedule",
  "GroupLanguage",
  "UserLanguage",
  "VocabularyEntry",
  "VocabularyTranslation",
  "JapaneseVocabularyMetadata",
  "GermanVocabularyMetadata",
  "GrammarPoint",
  "LessonProgress",
  "FlashcardReviewState",
  "LessonTestAttempt",
  "VocabularyReviewAttempt",
  "VocabularyPracticePreference",
] as const;

export type DatabaseTransferTable = (typeof DATABASE_TRANSFER_TABLES)[number];

export type DatabaseExport = {
  exportedAt: string;
  tables: Partial<Record<DatabaseTransferTable, Row[]>>;
};

const JSON_COLUMNS = new Set([
  "LanguageTab.content",
  "MediaAsset.metadata",
  "VocabularyEntry.sourceMetadata",
  "GrammarPoint.richContent",
  "GrammarPoint.sourceMetadata",
  "LessonTestQuestion.answer",
  "LessonTestQuestion.options",
  "LessonTestAttempt.answers",
  "GroupTimerProposal.payload",
  "GroupTimerProposal.requiredUserIds",
  "StudyPlanItem.metadata",
  "Notification.payload",
  "DailyQuest.metadata",
  "QuestEvent.metadata",
  "WeeklyReflection.metrics",
]);

const ENUM_COLUMNS = new Map<string, string>([
  ["User.role", "Role"],
  ["LanguageTab.type", "LanguageTabType"],
  ["LanguageTab.status", "ContentStatus"],
  ["Course.status", "ContentStatus"],
  ["GrammarPoint.status", "ContentStatus"],
  ["LessonTest.status", "ContentStatus"],
  ["LessonTestQuestion.type", "TestQuestionType"],
  ["FlashcardReviewState.state", "CardState"],
  ["GroupMember.role", "GroupRole"],
  ["PersonalTimerState.phase", "TimerPhase"],
  ["GroupTimerRoom.phase", "TimerPhase"],
  ["GroupTimerProposal.kind", "TimerProposalKind"],
  ["GroupTimerProposal.status", "TimerProposalStatus"],
  ["FlashcardReviewState.lastRating", "ReviewRating"],
  ["FocusStudySession.result", "FocusSessionResult"],
  ["StudyPlanItem.type", "StudyPlanItemType"],
  ["StudyPlanItem.status", "StudyPlanItemStatus"],
  ["FriendRequest.status", "FriendRequestStatus"],
  ["Notification.type", "NotificationType"],
  ["FriendCommitment.status", "CommitmentStatus"],
  ["GroupInvitation.status", "InvitationStatus"],
  ["GroupTimerInvitation.status", "InvitationStatus"],
  ["DailyQuest.type", "QuestType"],
]);

const TIMESTAMP_COLUMNS = new Set([
  "User.emailVerified",
  "MediaAsset.createdAt",
  "LessonProgress.completedAt",
  "LessonTestAttempt.createdAt",
  "FlashcardReviewState.dueAt",
  "VocabularyReviewAttempt.createdAt",
  "VocabularyPracticePreference.updatedAt",
  "Group.createdAt",
  "GroupMember.joinedAt",
  "GroupLanguage.addedAt",
  "UserLanguage.joinedAt",
  "DailyStudyRecord.createdAt",
  "DailyStudyRecord.updatedAt",
  "DailyStudyRecord.questSetCompletedAt",
  "PersonalTimerState.phaseStartedAt",
  "PersonalTimerState.endsAt",
  "PersonalTimerState.creditedUntil",
  "PersonalTimerState.updatedAt",
  "GroupTimerRoom.phaseStartedAt",
  "GroupTimerRoom.endsAt",
  "GroupTimerRoom.updatedAt",
  "GroupTimerParticipant.joinedAt",
  "GroupTimerParticipant.lastSeenAt",
  "GroupTimerParticipant.creditedUntil",
  "GroupTimerProposal.expiresAt",
  "GroupTimerProposal.createdAt",
  "GroupTimerProposal.resolvedAt",
  "GroupTimerVote.createdAt",
  "FlashcardReviewState.updatedAt",
  "FocusStudySession.startedAt",
  "FocusStudySession.endedAt",
  "StudyPlan.generatedAt",
  "FriendRequest.createdAt",
  "FriendRequest.resolvedAt",
  "FriendConnection.createdAt",
  "UserBlock.createdAt",
  "Notification.readAt",
  "Notification.createdAt",
  "FriendCommitment.acceptedAt",
  "FriendCommitment.resolvedAt",
  "FriendCommitment.createdAt",
  "FriendNudge.createdAt",
  "GroupInvitation.expiresAt",
  "GroupInvitation.createdAt",
  "GroupInvitation.resolvedAt",
  "GroupTimerInvitation.expiresAt",
  "GroupTimerInvitation.createdAt",
  "GroupTimerInvitation.resolvedAt",
  "ListeningActivity.completedAt",
  "DailyQuest.completedAt",
  "DailyQuest.createdAt",
  "DailyQuestSet.completedAt",
  "DailyQuestSet.createdAt",
  "QuestEvent.occurredAt",
  "WeeklyReflection.acceptedAt",
  "WeeklyReflection.createdAt",
  "WeeklyGoalSchedule.createdAt",
]);

function quoteIdentifier(identifier: string) {
  return `"${identifier.replaceAll('"', '""')}"`;
}

function placeholderFor(table: DatabaseTransferTable, column: string, index: number) {
  const placeholder = `$${index}`;
  const field = `${table}.${column}`;
  if (JSON_COLUMNS.has(field)) return `${placeholder}::jsonb`;

  const enumType = ENUM_COLUMNS.get(field);
  if (enumType) return `${placeholder}::${quoteIdentifier(enumType)}`;
  return TIMESTAMP_COLUMNS.has(field) ? `${placeholder}::timestamp` : placeholder;
}

function valueFor(table: DatabaseTransferTable, column: string, value: unknown) {
  if (value === undefined) return null;
  if (JSON_COLUMNS.has(`${table}.${column}`) && value !== null) return JSON.stringify(value);
  return value;
}

export async function createDatabaseExport(prisma: PrismaClient) {
  const data: DatabaseExport = {
    exportedAt: new Date().toISOString(),
    tables: {},
  };

  for (const table of DATABASE_TRANSFER_TABLES) {
    data.tables[table] = await prisma.$queryRawUnsafe<Row[]>(`SELECT * FROM ${quoteIdentifier(table)}`);
  }

  return data;
}

export function databaseExportFileName(date = new Date()) {
  const stamp = date.toISOString().replace(/[:.]/g, "-");
  return `talkie-db-${stamp}.json`;
}

async function clearDestination(prisma: PrismaClient) {
  for (const table of [...DATABASE_TRANSFER_TABLES].reverse()) {
    await prisma.$executeRawUnsafe(`DELETE FROM ${quoteIdentifier(table)}`);
  }
}

async function insertRows(prisma: PrismaClient, table: DatabaseTransferTable, rows: Row[]) {
  for (const row of rows) {
    const columns = Object.keys(row);
    if (columns.length === 0) continue;

    const columnSql = columns.map(quoteIdentifier).join(", ");
    const placeholderSql = columns.map((column, index) => placeholderFor(table, column, index + 1)).join(", ");
    const values = columns.map((column) => valueFor(table, column, row[column]));

    await prisma.$executeRawUnsafe(
      `INSERT INTO ${quoteIdentifier(table)} (${columnSql}) VALUES (${placeholderSql})`,
      ...values,
    );
  }
}

export async function importDatabaseExport(prisma: PrismaClient, data: DatabaseExport) {
  await prisma.$transaction(
    async (tx) => {
      await clearDestination(tx as PrismaClient);

      for (const table of DATABASE_TRANSFER_TABLES) {
        await insertRows(tx as PrismaClient, table, data.tables[table] ?? []);
      }
    },
    { timeout: 120_000 },
  );
}

export function parseDatabaseExport(raw: string) {
  const parsed = JSON.parse(raw) as Partial<DatabaseExport>;
  if (!parsed || typeof parsed !== "object" || !parsed.tables || typeof parsed.tables !== "object") {
    throw new Error("Invalid database export file.");
  }
  return parsed as DatabaseExport;
}
