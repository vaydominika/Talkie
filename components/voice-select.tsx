"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
        <Select
          name={name}
          value={value}
          onValueChange={setValue}
        >
          <SelectTrigger className="min-w-0 flex-1"><SelectValue placeholder="Auto voice"/></SelectTrigger><SelectContent>
          {matchingVoices.map((voice) => (
            <SelectItem key={`${voice.name}-${voice.lang}`} value={voice.name}>
              {voice.name} ({voice.lang})
            </SelectItem>
          ))}
          </SelectContent>
        </Select>
        <Button type="button" variant="outline" onClick={preview}>
          Preview
        </Button>
      </div>
      <span className="mt-1 block text-xs text-muted-foreground">
        Voice list depends on this browser and device.
      </span>
    </label>
  );
}
