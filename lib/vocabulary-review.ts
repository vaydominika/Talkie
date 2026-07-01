export type VocabularyAttempt = {
  id: string;
  wordId: string;
  displayForm: string;
  prompt: string;
  expected: string;
  answer: string;
  direction: "target-native" | "native-target";
  correct: boolean;
  usedHint: boolean;
  at: number;
};

export type ReviewAttemptLike = {
  vocabularyEntryId: string;
  displayForm: string;
  correct: boolean;
  usedHint: boolean;
  createdAt: Date | string | number;
};

export type WeakWordSummary = {
  vocabularyEntryId: string;
  displayForm: string;
  missedCount: number;
  hintUsedCount: number;
  severity: number;
  firstWeakAt: Date;
  lastAttemptAt: Date;
  carriedOver: boolean;
  cleared: boolean;
};

const key = "talkie-vocabulary-attempts";

export function getVocabularyAttempts(): VocabularyAttempt[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(key) ?? "[]") as VocabularyAttempt[];
  } catch {
    return [];
  }
}

export function saveVocabularyAttempt(attempt: VocabularyAttempt) {
  const next = [attempt, ...getVocabularyAttempts()].slice(0, 300);
  window.localStorage.setItem(key, JSON.stringify(next));
}

export function isWeakAttempt(attempt: Pick<ReviewAttemptLike, "correct" | "usedHint">) {
  return attempt.usedHint || !attempt.correct;
}

export function isCleanCorrectAttempt(attempt: Pick<ReviewAttemptLike, "correct" | "usedHint">) {
  return attempt.correct && !attempt.usedHint;
}

export function weekStartsAt(dateInput: Date | string | number) {
  const date = new Date(dateInput);
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const day = start.getDay();
  const daysSinceMonday = day === 0 ? 6 : day - 1;
  start.setDate(start.getDate() - daysSinceMonday);
  return start;
}

export function getWeekKey(dateInput: Date | string | number) {
  const start = weekStartsAt(dateInput);
  const month = String(start.getMonth() + 1).padStart(2, "0");
  const day = String(start.getDate()).padStart(2, "0");
  return `${start.getFullYear()}-${month}-${day}`;
}

export function formatWeekLabel(weekKey: string) {
  const start = new Date(`${weekKey}T00:00:00`);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return `${start.toLocaleDateString(undefined, { month: "short", day: "numeric" })} - ${end.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  })}`;
}

export function summarizeWeakWords(attempts: ReviewAttemptLike[], now: Date = new Date()) {
  const currentWeekKey = getWeekKey(now);
  const summaries = new Map<string, WeakWordSummary>();
  const sorted = [...attempts].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  for (const attempt of sorted) {
    const attemptedAt = new Date(attempt.createdAt);
    if (isCleanCorrectAttempt(attempt)) {
      const current = summaries.get(attempt.vocabularyEntryId);
      if (current) {
        summaries.set(attempt.vocabularyEntryId, {
          ...current,
          lastAttemptAt: attemptedAt,
          cleared: true,
        });
      }
      continue;
    }

    if (!isWeakAttempt(attempt)) continue;

    const current = summaries.get(attempt.vocabularyEntryId);
    const missedCount = (current?.cleared ? 0 : current?.missedCount ?? 0) + (attempt.correct ? 0 : 1);
    const hintUsedCount = (current?.cleared ? 0 : current?.hintUsedCount ?? 0) + (attempt.usedHint ? 1 : 0);
    summaries.set(attempt.vocabularyEntryId, {
      vocabularyEntryId: attempt.vocabularyEntryId,
      displayForm: attempt.displayForm,
      missedCount,
      hintUsedCount,
      severity: missedCount * 2 + hintUsedCount,
      firstWeakAt: current?.cleared || !current ? attemptedAt : current.firstWeakAt,
      lastAttemptAt: attemptedAt,
      carriedOver: getWeekKey(current?.cleared || !current ? attemptedAt : current.firstWeakAt) !== currentWeekKey,
      cleared: false,
    });
  }

  return [...summaries.values()].sort((a, b) => {
    if (a.cleared !== b.cleared) return a.cleared ? 1 : -1;
    if (a.severity !== b.severity) return b.severity - a.severity;
    return b.lastAttemptAt.getTime() - a.lastAttemptAt.getTime();
  });
}

export function getActiveWeakVocabularyIds(attempts: ReviewAttemptLike[], now: Date = new Date()) {
  return new Set(summarizeWeakWords(attempts, now).filter((summary) => !summary.cleared).map((summary) => summary.vocabularyEntryId));
}
