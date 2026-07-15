import { describe, expect, it } from "vitest";
import { remainingWeekDateKeys, weekStartKey } from "@/lib/learning-loop";

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
});
