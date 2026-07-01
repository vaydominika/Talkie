import { describe, expect, it } from "vitest";
import { getActiveWeakVocabularyIds, getWeekKey, isWeakAttempt, summarizeWeakWords } from "@/lib/vocabulary-review";

const attempt = (
  vocabularyEntryId: string,
  correct: boolean,
  usedHint: boolean,
  createdAt: string,
) => ({
  vocabularyEntryId,
  displayForm: vocabularyEntryId,
  correct,
  usedHint,
  createdAt: new Date(createdAt),
});

describe("vocabulary review weak words", () => {
  it("treats hint-used and incorrect attempts as weak", () => {
    expect(isWeakAttempt({ correct: true, usedHint: true })).toBe(true);
    expect(isWeakAttempt({ correct: false, usedHint: false })).toBe(true);
    expect(isWeakAttempt({ correct: false, usedHint: true })).toBe(true);
    expect(isWeakAttempt({ correct: true, usedHint: false })).toBe(false);
  });

  it("carries unresolved weak words forward across weeks", () => {
    const active = getActiveWeakVocabularyIds(
      [attempt("rain", false, false, "2026-06-22T12:00:00")],
      new Date("2026-07-01T12:00:00"),
    );

    expect(active.has("rain")).toBe(true);
  });

  it("clears a weak word after a clean correct answer", () => {
    const active = getActiveWeakVocabularyIds(
      [
        attempt("water", true, true, "2026-06-22T12:00:00"),
        attempt("water", true, false, "2026-07-01T12:00:00"),
      ],
      new Date("2026-07-01T12:00:00"),
    );

    expect(active.has("water")).toBe(false);
  });

  it("calculates severity from misses and hints since the last clear", () => {
    const [summary] = summarizeWeakWords(
      [
        attempt("eat", false, false, "2026-06-22T12:00:00"),
        attempt("eat", true, false, "2026-06-23T12:00:00"),
        attempt("eat", true, true, "2026-07-01T12:00:00"),
        attempt("eat", false, true, "2026-07-01T12:05:00"),
      ],
      new Date("2026-07-01T12:00:00"),
    );

    expect(summary).toMatchObject({
      vocabularyEntryId: "eat",
      missedCount: 1,
      hintUsedCount: 2,
      severity: 4,
      carriedOver: false,
      cleared: false,
    });
  });

  it("uses Monday as the start of the review week", () => {
    expect(getWeekKey(new Date("2026-07-01T12:00:00"))).toBe("2026-06-29");
  });
});
