import { describe, expect, it } from "vitest";
import { dateKey, displayedRemaining, isStaleStoppedTimer, oppositePhase, safeTimezone, secondsForPhase, shiftDateKey, wholeSecondEnd } from "@/lib/timer";

describe("timer helpers", () => {
  it("calculates durations and phase transitions", () => {
    expect(secondsForPhase("FOCUS", 25, 5)).toBe(1500);
    expect(secondsForPhase("BREAK", 25, 5)).toBe(300);
    expect(oppositePhase("FOCUS")).toBe("BREAK");
  });

  it("uses canonical remaining time while running", () => {
    const now = new Date("2026-07-12T10:00:00.000Z");
    expect(displayedRemaining({ isRunning: true, remainingSeconds: 1500, endsAt: new Date("2026-07-12T10:00:42.100Z") }, now)).toBe(43);
    expect(displayedRemaining({ isRunning: false, remainingSeconds: 91, endsAt: null }, now)).toBe(91);
  });

  it("derives local date keys across UTC midnight", () => {
    const instant = new Date("2026-07-12T22:30:00.000Z");
    expect(dateKey(instant, "Europe/Budapest")).toBe("2026-07-13");
    expect(shiftDateKey("2026-01-01", -1)).toBe("2025-12-31");
  });

  it("falls back for invalid timezones", () => {
    expect(safeTimezone("not/a-zone")).toBe("UTC");
  });

  it("resets a stopped timer after the user's local day changes", () => {
    const now = new Date("2026-07-15T08:00:00.000Z");
    expect(isStaleStoppedTimer({ isRunning: false, updatedAt: new Date("2026-07-14T20:00:00.000Z") }, "Europe/Budapest", now)).toBe(true);
    expect(isStaleStoppedTimer({ isRunning: false, updatedAt: new Date("2026-07-15T06:00:00.000Z") }, "Europe/Budapest", now)).toBe(false);
    expect(isStaleStoppedTimer({ isRunning: true, updatedAt: new Date("2026-07-14T20:00:00.000Z") }, "Europe/Budapest", now)).toBe(false);
  });

  it("carries fractional reconciliation time into the next credit", () => {
    const start = new Date("2026-07-12T10:00:00.250Z");
    const firstEnd = wholeSecondEnd(start, new Date("2026-07-12T10:00:02.700Z"));
    const secondEnd = wholeSecondEnd(firstEnd, new Date("2026-07-12T10:00:04.800Z"));
    expect(firstEnd.toISOString()).toBe("2026-07-12T10:00:02.250Z");
    expect(secondEnd.toISOString()).toBe("2026-07-12T10:00:04.250Z");
  });
});
