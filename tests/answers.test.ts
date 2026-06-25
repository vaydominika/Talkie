import { describe, expect, it } from "vitest";
import { matchesAnswer, normalizeAnswer } from "@/lib/answers";
describe("answers", () => { it("normalizes unicode and punctuation", () => expect(normalizeAnswer(" ＨＡＬＬＯ! ")).toBe("hallo")); it("accepts configured alternatives only", () => { expect(matchesAnswer("watashi", "わたし", ["watashi"])).toBe(true); expect(matchesAnswer("you", "I")).toBe(false); }); });
