"use client";

import { Loader2, Volume2 } from "lucide-react";
import { ButtonHTMLAttributes, useState } from "react";
import { cn } from "@/lib/utils";

const localeFallbacks: Record<string, string> = {
  de: "de-DE",
  en: "en-US",
  es: "es-ES",
  fr: "fr-FR",
  it: "it-IT",
  ja: "ja-JP",
  ko: "ko-KR",
  pt: "pt-PT",
  zh: "zh-CN",
};

function speechLocale(locale?: string | null) {
  if (!locale) return "en-US";
  return locale.includes("-") ? locale : localeFallbacks[locale.toLowerCase()] ?? locale;
}

function bestVoice(locale: string, voiceName?: string | null) {
  if (!("speechSynthesis" in window)) return null;
  const voices = window.speechSynthesis.getVoices();
  const lowerLocale = locale.toLowerCase();
  const baseLocale = lowerLocale.split("-")[0];

  return (
    voices.find((voice) => voiceName && voice.name === voiceName) ??
    voices.find((voice) => voice.lang.toLowerCase() === lowerLocale && voice.localService) ??
    voices.find((voice) => voice.lang.toLowerCase() === lowerLocale) ??
    voices.find((voice) => voice.lang.toLowerCase().startsWith(`${baseLocale}-`) && voice.localService) ??
    voices.find((voice) => voice.lang.toLowerCase().startsWith(`${baseLocale}-`)) ??
    null
  );
}

export function SpeakButton({
  text,
  locale,
  provider,
  voiceName,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  text: string;
  locale?: string | null;
  provider?: string | null;
  voiceName?: string | null;
}) {
  const [loading, setLoading] = useState(false);

  const speakInBrowser = () => {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const lang = speechLocale(locale);
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = 0.9;
    utterance.voice = bestVoice(lang, voiceName);
    window.speechSynthesis.speak(utterance);
  };

  const speak = async () => {
    // Prevent duplicate or overlapping playback by stopping any playing/loading audio
    if (activeAudioStopCallback) {
      activeAudioStopCallback();
    }

    setLoading(true);
    let localAudioUrl: string | null = null;
    let localAudio: HTMLAudioElement | null = null;
    let isStopped = false;

    const stopThisAudio = () => {
      isStopped = true;
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      if (localAudio) {
        localAudio.pause();
      }
      if (localAudioUrl) {
        URL.revokeObjectURL(localAudioUrl);
        localAudioUrl = null;
      }
      if (activeAudioStopCallback === stopThisAudio) {
        activeAudioStopCallback = null;
      }
      setLoading(false);
    };

    activeAudioStopCallback = stopThisAudio;

    try {
      const response = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          locale: speechLocale(locale),
        }),
      });
      if (isStopped) return;
      if (!response.ok) throw new Error("TTS request failed");
      localAudioUrl = URL.createObjectURL(await response.blob());
      localAudio = new Audio(localAudioUrl);

      const cleanup = (clearActiveAudio = true) => {
        if (localAudioUrl) {
          URL.revokeObjectURL(localAudioUrl);
          localAudioUrl = null;
        }
        if (clearActiveAudio && activeAudioStopCallback === stopThisAudio) {
          activeAudioStopCallback = null;
        }
        setLoading(false);
      };

      localAudio.addEventListener("ended", () => cleanup(), { once: true });
      localAudio.addEventListener("error", () => {
        cleanup(false);
        speakInBrowser();
      }, { once: true });

      await localAudio.play();
    } catch {
      if (localAudioUrl) {
        URL.revokeObjectURL(localAudioUrl);
        localAudioUrl = null;
      }
      if (activeAudioStopCallback === stopThisAudio) {
        activeAudioStopCallback = null;
      }
      setLoading(false);
      if (!isStopped) {
        speakInBrowser();
      }
    }
  };

  return (
    <button
      {...props}
      type="button"
      onClick={speak}
      disabled={loading || props.disabled}
      aria-label={`Play pronunciation for ${text}`}
      className={cn(
        "inline-flex h-7 w-7 items-center justify-center rounded-full border text-muted-foreground transition hover:bg-muted hover:text-foreground dark:text-stone-400 dark:hover:text-stone-200 dark:border-stone-800",
        className,
      )}
    >
      {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <Volume2 className="h-3.5 w-3.5" aria-hidden />}
    </button>
  );
}

// Global/Module-level reference to stop the active audio and reset its button state
let activeAudioStopCallback: (() => void) | null = null;
