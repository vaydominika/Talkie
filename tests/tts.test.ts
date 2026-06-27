import { describe, expect, it } from "vitest";
import { speechLocale, supportedSpeechLocale, ttsCacheKey } from "@/app/api/tts/route";

describe("tts route helpers", () => {
  it("normalizes known language aliases", () => {
    expect(speechLocale("de")).toBe("de-DE");
    expect(speechLocale("ja")).toBe("ja-JP");
    expect(speechLocale("de-DE")).toBe("de-DE");
  });

  it("canonicalizes supported Azure speech locales", () => {
    expect(supportedSpeechLocale("de")).toBe("de-DE");
    expect(supportedSpeechLocale("de-De")).toBe("de-DE");
    expect(supportedSpeechLocale("ja-jp")).toBe("ja-JP");
  });

  it("builds stable cache keys from text, locale, and voice", () => {
    const key = ttsCacheKey("Hallo", "de-DE", "de-DE-KatjaNeural");

    expect(key).toBe(ttsCacheKey("Hallo", "de-DE", "de-DE-KatjaNeural"));
    expect(key).not.toBe(ttsCacheKey("Hallo", "ja-JP", "ja-JP-NanamiNeural"));
  });
});
