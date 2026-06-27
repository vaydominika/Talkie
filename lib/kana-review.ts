export type KanaAttempt = { id: string; kana: string; expected: string; answer: string; correct: boolean; usedHint: boolean; at: number; source?: "sprint" | "flashcards" };
const key = "talkie-kana-attempts";

export function getKanaAttempts(): KanaAttempt[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(window.localStorage.getItem(key) ?? "[]") as KanaAttempt[]; } catch { return []; }
}

export function saveKanaAttempt(attempt: KanaAttempt) {
  const next = [attempt, ...getKanaAttempts()].slice(0, 200);
  window.localStorage.setItem(key, JSON.stringify(next));
}
