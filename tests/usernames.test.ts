import { describe, expect, it } from "vitest";
import { isUniqueConstraintError, validateUsername } from "@/lib/usernames";

describe("username validation", () => {
  it("normalizes valid usernames", () => {
    expect(validateUsername("  Szili_7 ")).toEqual({ username: "szili_7" });
  });

  it("rejects characters that would otherwise be silently removed", () => {
    expect(validateUsername("szili-name")).toEqual({ error: "Use only letters, numbers, and underscores." });
  });

  it("enforces username length", () => {
    expect(validateUsername("ab")).toEqual({ error: "Username must be at least 3 characters." });
    expect(validateUsername("a".repeat(25))).toEqual({ error: "Username must be 24 characters or fewer." });
  });
});

describe("unique constraint detection", () => {
  it("identifies the field reported by Prisma", () => {
    const error = { code: "P2002", meta: { target: ["username"] } };
    expect(isUniqueConstraintError(error, "username")).toBe(true);
    expect(isUniqueConstraintError(error, "email")).toBe(false);
  });
});
