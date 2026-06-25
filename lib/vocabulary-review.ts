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
