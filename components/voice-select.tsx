"use client";

import { useEffect, useMemo, useState } from "react";

const localeFallbacks: Record<string, string> = {
  de: "de-DE",
  en: "en-US",
  es: "es-ES",
  fr: "fr-FR",
  it: "it-IT",
  ja: "ja-JP",
};

function normalizedLocale(locale?: string | null) {
  if (!locale) return "";
  return locale.includes("-") ? locale : localeFallbacks[locale.toLowerCase()] ?? locale;
}

export function VoiceSelect({
  name = "speechVoiceName",
  locale,
  defaultValue,
}: {
  name?: string;
  locale?: string | null;
  defaultValue?: string | null;
}) {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [value, setValue] = useState(defaultValue ?? "");

  useEffect(() => {
    if (!("speechSynthesis" in window)) return;
    const loadVoices = () => setVoices(window.speechSynthesis.getVoices());
    loadVoices();
    window.speechSynthesis.addEventListener("voiceschanged", loadVoices);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", loadVoices);
  }, []);

  const matchingVoices = useMemo(() => {
    const selectedLocale = normalizedLocale(locale).toLowerCase();
    const baseLocale = selectedLocale.split("-")[0];
    if (!selectedLocale) return voices;
    return voices.filter((voice) => {
      const voiceLocale = voice.lang.toLowerCase();
      return voiceLocale === selectedLocale || voiceLocale.startsWith(`${baseLocale}-`);
    });
  }, [locale, voices]);

  const preview = () => {
    if (!("speechSynthesis" in window) || !value) return;
    const voice = voices.find((item) => item.name === value);
    const utterance = new SpeechSynthesisUtterance("Guten Tag. Ich lerne Deutsch.");
    if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang;
    } else if (locale) {
      utterance.lang = normalizedLocale(locale);
    }
    utterance.rate = 0.9;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };

  return (
    <label className="block text-sm font-medium">
      Voice
      <div className="mt-1 flex gap-2">
        <select
          name={name}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          className="h-10 min-w-0 flex-1 rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-rose-300"
        >
          <option value="">Auto voice</option>
          {matchingVoices.map((voice) => (
            <option key={`${voice.name}-${voice.lang}`} value={voice.name}>
              {voice.name} ({voice.lang})
            </option>
          ))}
        </select>
        <button type="button" onClick={preview} className="rounded-md border px-3 text-sm font-medium hover:bg-muted">
          Preview
        </button>
      </div>
      <span className="mt-1 block text-xs text-muted-foreground">
        Voice list depends on this browser and device.
      </span>
    </label>
  );
}
