import { prisma } from "@/lib/prisma";
import { dateKey, safeTimezone, shiftDateKey } from "@/lib/timer";

export type StudyDay = {
  dateKey: string;
  label: string;
  status: "complete" | "partial" | "empty" | "future";
  focusedSeconds: number;
  wordCount: number;
  targetMinutes: number;
  focusSessions: number;
  isToday: boolean;
};

export async function getStudyWeek(userId: string, now = new Date()): Promise<StudyDay[]> {
  const profile = await prisma.userProfile.findUnique({ where: { userId } });
  const timezone = safeTimezone(profile?.timezone);
  const todayKey = dateKey(now, timezone);
  const [year, month, day] = todayKey.split("-").map(Number);
  const todayUtc = new Date(Date.UTC(year, month - 1, day));
  const weekday = todayUtc.getUTCDay() || 7;
  const mondayKey = shiftDateKey(todayKey, -(weekday - 1));
  const keys = Array.from({ length: 7 }, (_, index) => shiftDateKey(mondayKey, index));
  const [records, attempts] = await Promise.all([
    prisma.dailyStudyRecord.findMany({ where: { userId, dateKey: { in: keys } } }),
    prisma.vocabularyReviewAttempt.findMany({
      where: { userId, createdAt: { gte: new Date(todayUtc.getTime() - 8 * 86_400_000), lte: new Date(todayUtc.getTime() + 8 * 86_400_000) } },
      select: { vocabularyEntryId: true, createdAt: true },
    }),
  ]);
  const recordsByKey = new Map(records.map((record) => [record.dateKey, record]));
  const wordsByKey = new Map<string, Set<string>>();
  for (const attempt of attempts) {
    const key = dateKey(attempt.createdAt, timezone);
    if (!keys.includes(key)) continue;
    const words = wordsByKey.get(key) ?? new Set<string>();
    words.add(attempt.vocabularyEntryId);
    wordsByKey.set(key, words);
  }
  const labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  return keys.map((key, index) => {
    const record = recordsByKey.get(key);
    const focusedSeconds = record?.focusedSeconds ?? 0;
    const targetMinutes = (record?.targetMinutes ?? profile?.dailyMinutes ?? 15) + (record?.carryOverMinutes ?? 0);
    const status = key > todayKey ? "future" : focusedSeconds >= targetMinutes * 60 ? "complete" : focusedSeconds > 0 ? "partial" : "empty";
    return { dateKey: key, label: labels[index], status, focusedSeconds, targetMinutes, focusSessions: record?.focusSessions ?? 0, wordCount: wordsByKey.get(key)?.size ?? 0, isToday: key === todayKey };
  });
}
