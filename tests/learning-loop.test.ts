import { describe, expect, it } from "vitest";
import { remainingWeekDateKeys, weekStartKey } from "@/lib/learning-loop";
import { splitListeningPhrases } from "@/lib/listening";

describe("learning loop", () => {
  it("uses Monday week boundaries", () => {
    expect(weekStartKey("2026-07-12")).toBe("2026-07-06");
    expect(weekStartKey("2026-07-13")).toBe("2026-07-13");
  });

  it("creates target snapshots from the effective day through Sunday", () => {
    expect(remainingWeekDateKeys("2026-07-15", "2026-07-13")).toEqual([
      "2026-07-15", "2026-07-16", "2026-07-17", "2026-07-18", "2026-07-19",
    ]);
    expect(remainingWeekDateKeys("2026-07-10", "2026-07-13")).toEqual([
      "2026-07-13", "2026-07-14", "2026-07-15", "2026-07-16", "2026-07-17", "2026-07-18", "2026-07-19",
    ]);
  });

  it("splits Latin and Japanese listening phrases", () => {
    expect(splitListeningPhrases("Hallo! Wie geht es?\n元気です。 次です。")).toEqual([
      "Hallo!", "Wie geht es?", "元気です。", "次です。",
    ]);
  });
});
