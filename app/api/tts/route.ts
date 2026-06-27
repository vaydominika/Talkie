import { createHash } from "crypto";
import * as sdk from "microsoft-cognitiveservices-speech-sdk";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

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

const SUPPORTED_VOICES: Record<string, string> = {
  "de-DE": "de-DE-KatjaNeural",
  "ja-JP": "ja-JP-NanamiNeural",
};

const supportedLocaleLookup = new Map(Object.keys(SUPPORTED_VOICES).map((locale) => [locale.toLowerCase(), locale]));

const MAX_TEXT_LENGTH = 300;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_CACHE_ENTRIES = 100;

type CachedAudio = {
  audio: Buffer;
  expiresAt: number;
};

const audioCache = new Map<string, CachedAudio>();

export function speechLocale(locale: string) {
  return locale.includes("-") ? locale : localeFallbacks[locale.toLowerCase()] ?? locale;
}

export function supportedSpeechLocale(locale: string) {
  const normalizedLocale = speechLocale(locale);
  const lowerLocale = normalizedLocale.toLowerCase();
  const baseLocale = lowerLocale.split("-")[0];

  return supportedLocaleLookup.get(lowerLocale) ?? Object.keys(SUPPORTED_VOICES).find((supportedLocale) => supportedLocale.toLowerCase().startsWith(`${baseLocale}-`)) ?? null;
}

export function ttsCacheKey(text: string, locale: string, voice: string) {
  return createHash("sha256").update(JSON.stringify({ text, locale, voice })).digest("hex");
}

function getCachedAudio(key: string) {
  const cached = audioCache.get(key);
  if (!cached) return null;

  if (cached.expiresAt <= Date.now()) {
    audioCache.delete(key);
    return null;
  }

  audioCache.delete(key);
  audioCache.set(key, cached);
  return cached.audio;
}

function setCachedAudio(key: string, audio: Buffer) {
  audioCache.set(key, {
    audio,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });

  while (audioCache.size > MAX_CACHE_ENTRIES) {
    const oldestKey = audioCache.keys().next().value;
    if (!oldestKey) break;
    audioCache.delete(oldestKey);
  }
}

function audioResponse(audio: Buffer) {
  return new Response(new Uint8Array(audio), {
    headers: {
      "Cache-Control": "private, max-age=86400",
      "Content-Type": "audio/mpeg",
    },
  });
}

async function resolveVoice(locale: string) {
  const supportedLocale = supportedSpeechLocale(locale);

  if (supportedLocale) {
    return { locale: supportedLocale, voice: SUPPORTED_VOICES[supportedLocale] };
  }

  let matchedVoice: string | undefined;
  let matchedLang: string | undefined;

  const dbLanguage = await prisma.language.findFirst({
    where: {
      OR: [
        { speechLocale: { mode: "insensitive", equals: locale } },
        { code: { mode: "insensitive", equals: locale.split("-")[0] } },
      ],
    },
  });

  if (dbLanguage?.speechVoiceName && dbLanguage.speechLocale) {
    matchedVoice = dbLanguage.speechVoiceName;
    matchedLang = dbLanguage.speechLocale;
  }

  return matchedVoice && matchedLang ? { locale: matchedLang, voice: matchedVoice } : null;
}

function synthesizeSpeech(text: string, locale: string, voice: string, key: string, region: string) {
  return new Promise<Buffer>((resolve, reject) => {
    const speechConfig = sdk.SpeechConfig.fromSubscription(key, region);
    speechConfig.speechSynthesisLanguage = locale;
    speechConfig.speechSynthesisVoiceName = voice;
    speechConfig.speechSynthesisOutputFormat = sdk.SpeechSynthesisOutputFormat.Audio16Khz128KBitRateMonoMp3;

    const synthesizer = new sdk.SpeechSynthesizer(speechConfig);

    synthesizer.speakTextAsync(
      text,
      (result) => {
        synthesizer.close();

        if (result.reason === sdk.ResultReason.SynthesizingAudioCompleted && result.audioData.byteLength > 0) {
          resolve(Buffer.from(result.audioData));
          return;
        }

        const cancellation = sdk.CancellationDetails.fromResult(result);
        reject(new Error(cancellation.errorDetails || `Azure synthesis ended with reason ${result.reason}.`));
      },
      (error) => {
        synthesizer.close();
        reject(new Error(String(error)));
      },
    );
  });
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as {
    text?: unknown;
    locale?: unknown;
  } | null;

  if (typeof body?.text !== "string" || !body.text.trim()) {
    return Response.json({ error: "Missing TTS text." }, { status: 400 });
  }

  if (typeof body.locale !== "string" || !body.locale.trim()) {
    return Response.json({ error: "Missing TTS language code." }, { status: 400 });
  }

  const text = body.text.trim().slice(0, MAX_TEXT_LENGTH);
  const locale = speechLocale(body.locale.trim());
  const resolvedVoice = await resolveVoice(locale);

  if (!resolvedVoice) {
    return Response.json({ error: `Unsupported TTS language code: ${locale}` }, { status: 400 });
  }

  const azureKey = process.env.AZURE_SPEECH_KEY;
  const azureRegion = process.env.AZURE_SPEECH_REGION;

  if (!azureKey || !azureRegion) {
    return Response.json({ error: "Azure Speech configuration is missing." }, { status: 500 });
  }

  const key = ttsCacheKey(text, resolvedVoice.locale, resolvedVoice.voice);
  const cachedAudio = getCachedAudio(key);
  if (cachedAudio) return audioResponse(cachedAudio);

  try {
    const audio = await synthesizeSpeech(text, resolvedVoice.locale, resolvedVoice.voice, azureKey, azureRegion);
    setCachedAudio(key, audio);
    return audioResponse(audio);
  } catch (error) {
    console.error("Azure Speech synthesis failed:", error);
    return Response.json({ error: "Azure Speech synthesis failed." }, { status: 502 });
  }
}
