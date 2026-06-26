import { NextRequest } from "next/server";
import { EdgeTTS } from "node-edge-tts";
import { promises as fs } from "fs";
import path from "path";
import os from "os";
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

function speechLocale(locale?: string | null) {
  if (!locale) return "en-US";
  return locale.includes("-") ? locale : localeFallbacks[locale.toLowerCase()] ?? locale;
}

const SUPPORTED_VOICES: Record<string, string> = {
  "de-DE": "de-DE-KatjaNeural",
  "ja-JP": "ja-JP-NanamiNeural",
};

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as {
    text?: string;
    locale?: string | null;
  } | null;

  const text = body?.text?.trim().slice(0, 300);
  const locale = speechLocale(body?.locale);

  if (!text) {
    return Response.json({ error: "Missing TTS text." }, { status: 400 });
  }

  // Attempt to find a matching language configuration from the database first
  // to support custom languages configured via the admin panel!
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

  // If no DB language configuration was found, fall back to our hardcoded defaults
  if (!matchedVoice || !matchedLang) {
    for (const [lang, voice] of Object.entries(SUPPORTED_VOICES)) {
      if (locale.toLowerCase() === lang.toLowerCase() || locale.toLowerCase().startsWith(lang.toLowerCase().split("-")[0])) {
        matchedVoice = voice;
        matchedLang = lang;
        break;
      }
    }
  }

  if (!matchedVoice || !matchedLang) {
    return Response.json({ error: `Unsupported language/locale: ${locale}` }, { status: 400 });
  }

  const tempFilePath = path.join(os.tmpdir(), `tts-${crypto.randomUUID()}.mp3`);

  try {
    const tts = new EdgeTTS({
      voice: matchedVoice,
      lang: matchedLang,
    });

    await tts.ttsPromise(text, tempFilePath);
    const audioBuffer = await fs.readFile(tempFilePath);

    return new Response(audioBuffer, {
      headers: {
        "Cache-Control": "private, max-age=86400",
        "Content-Type": "audio/mpeg",
      },
    });
  } catch (error) {
    console.error("Edge TTS synthesis failed:", error);
    return Response.json({ error: "TTS synthesis failed." }, { status: 500 });
  } finally {
    try {
      await fs.unlink(tempFilePath);
    } catch {
      // ignore
    }
  }
}


