"use client";

import { FormEvent, useMemo, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { kanaGroups, type KanaItem } from "@/lib/kana";
import { saveKanaAttempt } from "@/lib/kana-review";

const normalize = (value: string) => value.toLowerCase().trim().replace(/[^a-z]/g, "");
const expected = (romaji: string) => romaji.split(" (")[0];
const shuffle = <T,>(items: T[]) => [...items].sort(() => Math.random() - 0.5);

export function KanaFlashcards() {
  const allKana = useMemo(() => kanaGroups.hiragana.flatMap((group) => group.items), []);
  const [ordered, setOrdered] = useState(false);
  const [deck, setDeck] = useState(allKana);
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [hint, setHint] = useState(false);
  const [status, setStatus] = useState<"idle" | "correct" | "wrong">("idle");
  const item = deck[index];
  const next = () => { setAnswer(""); setHint(false); setStatus("idle"); };
  const changeOrder = (nextOrdered: boolean) => { setOrdered(nextOrdered); setDeck(nextOrdered ? allKana : shuffle(allKana)); setIndex(0); setAnswer(""); setHint(false); setStatus("idle"); };
  const submit = (event: FormEvent<HTMLFormElement>) => { if (!item) return; event.preventDefault(); const correct = normalize(answer) === normalize(expected(item.romaji)); setStatus(correct ? "correct" : "wrong"); saveKanaAttempt({ id: crypto.randomUUID(), kana: item.kana, expected: item.romaji, answer, correct, usedHint: hint, at: Date.now() }); window.setTimeout(() => { if (correct) { setDeck((current) => current.filter((_, cardIndex) => cardIndex !== index)); setIndex((current) => current >= deck.length - 1 ? 0 : current); } else { setDeck((current) => [...current, item]); setIndex((current) => (current + 1) % deck.length); } next(); }, 500); };

  if (!item) return <section className="mx-auto max-w-md rounded-2xl border bg-[#fbfaf4] p-8 text-center shadow-sm dark:bg-stone-950"><h2 className="font-serif text-3xl">Sprint complete.</h2><p className="mt-2 text-sm text-muted-foreground">You cleared every selected kana.</p><button onClick={() => changeOrder(ordered)} className="mt-6 rounded-md bg-rose-600 px-4 py-2 text-sm font-medium text-white">Start again</button></section>;
  return <section className="mx-auto max-w-md rounded-2xl border bg-[#fbfaf4] p-6 text-center shadow-sm dark:bg-stone-950"><div className="flex justify-center gap-2"><button onClick={() => changeOrder(false)} className={`rounded-full px-3 py-1.5 text-sm ${!ordered ? "bg-rose-600 text-white" : "border border-stone-500 text-stone-200"}`}>Random</button><button onClick={() => changeOrder(true)} className={`rounded-full px-3 py-1.5 text-sm ${ordered ? "bg-rose-600 text-white" : "border border-stone-500 text-stone-200"}`}>Ordered</button></div><p className="mt-10 text-8xl text-stone-900 dark:text-stone-100">{item.kana}</p><form onSubmit={submit} className="mt-8"><div className="relative"><input value={answer} onChange={(event) => { setAnswer(event.target.value); setStatus("idle"); }} autoFocus autoComplete="off" spellCheck={false} className={`h-14 w-full rounded-lg border bg-white px-4 text-center font-mono text-xl text-stone-900 outline-none transition focus:ring-2 ${status === "correct" ? "border-[#82946d] bg-[#e5ebdf] focus:ring-[#a8b99a]" : status === "wrong" ? "border-rose-500 bg-rose-50 focus:ring-rose-300" : "focus:ring-rose-300"}`} /><button type="button" onClick={() => setHint((value) => !value)} aria-label="Toggle answer" className="absolute right-2 top-2 rounded p-2 text-stone-500 hover:bg-stone-100">{hint ? <EyeOff size={19} /> : <Eye size={19} />}</button></div>{hint && <p className="mt-2 animate-answer-reveal font-mono text-sm text-rose-700">{item.romaji}</p>}<p className={`mt-3 min-h-5 text-sm font-medium ${status === "correct" ? "text-[#4a5b3b]" : status === "wrong" ? "text-rose-600" : "text-transparent"}`}>{status === "correct" ? "Correct" : "Try again"}</p></form><p className="mt-8 text-xs text-muted-foreground">Press Enter to check and move to the next prompt.</p></section>;
}
