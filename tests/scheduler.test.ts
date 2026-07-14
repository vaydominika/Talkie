import { describe, expect, it } from "vitest";
import { scheduleReview } from "@/lib/scheduler";
const fresh = { state: "NEW" as const, intervalDays: 0, easeFactor: 2.5, learningStep: 0, lapses: 0, successfulReviews: 0, totalReviews: 0 };
describe("scheduler", () => { it("moves new cards through learning before review", () => { const first = scheduleReview(fresh, "GOOD", new Date("2025-01-01")); expect(first.state).toBe("LEARNING"); const second = scheduleReview(first, "GOOD", new Date("2025-01-01")); expect(second.state).toBe("REVIEW"); expect(second.intervalDays).toBe(2); }); it("records a lapse for failed review cards", () => { const failed = scheduleReview({ ...fresh, state: "REVIEW" as const, intervalDays: 5 }, "AGAIN"); expect(failed.state).toBe("RELEARNING"); expect(failed.lapses).toBe(1); }); });

describe("review ratings",()=>{it("schedules hard, good, and easy at increasing intervals",()=>{const review={...fresh,state:"REVIEW" as const,intervalDays:10};expect(scheduleReview(review,"HARD").intervalDays).toBe(12);expect(scheduleReview(review,"GOOD").intervalDays).toBe(25);expect(scheduleReview(review,"EASY").intervalDays).toBe(27)})});
